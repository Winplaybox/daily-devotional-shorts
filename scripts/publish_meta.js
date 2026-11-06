import fs from 'node:fs';

const VERSION = process.env.META_GRAPH_API_VERSION || 'v25.0';
const BASE = 'https://graph.facebook.com/' + VERSION;
const need = (key) => {
  const value = process.env[key] && process.env[key].trim();
  if (!value) throw new Error('Missing environment variable: ' + key);
  return value;
};
const json = async (url, options = {}) => {
  const response = await fetch(url, options);
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok || data.error) throw new Error('HTTP ' + response.status + ': ' + (data.error?.message || raw.slice(0, 500)));
  return data;
};
const post = (endpoint, params, token) => json(BASE + '/' + endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ ...params, access_token: token }),
});
const get = (endpoint, params, token) => json(BASE + '/' + endpoint + '?' + new URLSearchParams({ ...params, access_token: token }));

async function storeVideo(file, runKey) {
  const root = need('SUPABASE_URL').replace(/\/+$/, '');
  const key = need('SUPABASE_SERVICE_ROLE_KEY');
  const bucket = process.env.SUPABASE_BUCKET || 'meta-publishing';
  const object = 'pavitra-panchang/' + runKey + '/pavitra-panchang-40s.mp4';
  const encoded = object.split('/').map(encodeURIComponent).join('/');
  const bytes = fs.readFileSync(file);
  const uploaded = await json(root + '/storage/v1/object/' + encodeURIComponent(bucket) + '/' + encoded, {
    method: 'POST',
    headers: { apikey: key, authorization: 'Bearer ' + key, 'content-type': 'video/mp4', 'x-upsert': 'true' },
    body: bytes,
  });
  const url = root + '/storage/v1/object/public/' + encodeURIComponent(bucket) + '/' + encoded;
  const check = await fetch(url, { method: 'HEAD' });
  if (!check.ok) throw new Error('Supabase media URL is not public/reachable. Make bucket "' + bucket + '" public.');
  return url;
}

async function instagram(url, caption, token, igId) {
  console.log('[Instagram] Creating Reel container');
  const container = await post(igId + '/media', { media_type: 'REELS', video_url: url, caption, share_to_feed: 'true' }, token);
  if (!container.id) throw new Error('Instagram did not return container ID');
  let status = '';
  for (let i = 0; i < 36; i++) {
    const state = await get(container.id, { fields: 'status_code,status' }, token);
    status = state.status_code || '';
    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error('Instagram container ' + status + ': ' + (state.status || ''));
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  if (status !== 'FINISHED') throw new Error('Instagram processing timed out after six minutes');
  const result = await post(igId + '/media_publish', { creation_id: container.id }, token);
  if (!result.id) throw new Error('Instagram publish response missing media ID');
  return result.id;
}

async function facebook(url, caption, token, pageId) {
  console.log('[Facebook] Starting Page Reel upload');
  const start = await post(pageId + '/video_reels', { upload_phase: 'start' }, token);
  if (!start.video_id || !start.upload_url) throw new Error('Facebook did not return video_id/upload_url');
  const uploaded = await json(start.upload_url, {
    method: 'POST',
    headers: { authorization: 'OAuth ' + token, file_url: url },
  });
  if (uploaded.success !== true) throw new Error('Facebook hosted video upload failed');
  const finish = await post(pageId + '/video_reels', {
    video_id: start.video_id, upload_phase: 'finish', video_state: 'PUBLISHED', description: caption,
  }, token);
  if (finish.success !== true) throw new Error('Facebook did not confirm publishing');
  return start.video_id;
}

async function main() {
  const file = process.env.META_VIDEO_PATH || 'out/pavitra-panchang-40s.mp4';
  if (!fs.existsSync(file) || !fs.statSync(file).size) throw new Error('Missing or empty 40-second MP4: ' + file);
  const token = need('META_PAGE_ACCESS_TOKEN');
  const pageId = need('META_PAGE_ID');
  const igId = need('META_IG_USER_ID');
  const caption = process.env.META_CAPTION || 'आज का संपूर्ण वैदिक पंचांग 🙏\\nतिथि, नक्षत्र, शुभ मुहूर्त और दैनिक पंचांग की जानकारी के लिए जुड़े रहें।\\n#PavitraPanchang365 #Panchang #DailyPanchang';
  const runKey = process.env.META_RUN_KEY || 'manual-' + Date.now();
  const url = await storeVideo(file, runKey);
  console.log('[Supabase] Uploaded video for Meta ingestion');
  const outcomes = await Promise.allSettled([
    instagram(url, caption, token, igId),
    facebook(url, caption, token, pageId),
  ]);
  const names = ['Instagram', 'Facebook'];
  let failed = 0;
  outcomes.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') console.log('[' + names[i] + '] Published ID: ' + outcome.value);
    else { failed++; console.error('[' + names[i] + '] FAILED: ' + outcome.reason?.message); }
  });
  if (failed) throw new Error(failed + ' Meta platform(s) failed. Check logs before retrying to avoid duplicate posts.');
  console.log('[Meta] Both publishing attempts completed successfully.');
}

main().catch(error => { console.error('[Meta] ' + error.message); process.exitCode = 1; });
