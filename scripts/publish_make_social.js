import fs from 'node:fs/promises';
import path from 'node:path';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function uploadToSupabase(videoPath, runKey) {
  const baseUrl = required('SUPABASE_URL').replace(/\\/$/, '');
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const bucket = process.env.SUPABASE_SOCIAL_BUCKET || 'social-publishing';
  const safeKey = runKey.replace(/[^a-zA-Z0-9_-]/g, '-');
  const objectPath = `pavitra-panchang/${safeKey}/pavitra-panchang-40s.mp4`;
  const bytes = await fs.readFile(videoPath);
  const endpoint = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase Storage upload failed (${response.status}): ${detail.slice(0, 800)}`);
  }
  return `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
}

async function main() {
  const videoPath = process.env.META_VIDEO_PATH || 'out/pavitra-panchang-40s.mp4';
  const metadataPath = process.env.PANCHANG_METADATA_PATH || 'out/daily_props.json';
  await fs.access(videoPath);
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  const sourceRunId = required('SOURCE_RUN_ID');
  const sourceRunNumber = required('SOURCE_RUN_NUMBER');
  const runKey = `panchang-${sourceRunId}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`;
  const videoUrl = await uploadToSupabase(videoPath, runKey);

  const title = String(metadata.yt_title || metadata.title || 'आज का पंचांग | Pavitra Panchang 365');
  const youtubeDescription = String(metadata.yt_description || metadata.description || '');
  const tags = Array.isArray(metadata.yt_tags) ? metadata.yt_tags : [];
  const caption = String(process.env.MAKE_SOCIAL_CAPTION || youtubeDescription).slice(0, 2200);
  const publishDate = String(metadata.date || metadata.panchang_date || process.env.PANCHANG_DATE || '');
  const payload = {
    event_id: runKey,
    source: 'github-actions',
    project: 'Pavitra Panchang 365',
    source_run_id: sourceRunId,
    source_run_number: Number(sourceRunNumber),
    panchang_date: publishDate,
    edition: '40s',
    video_url: videoUrl,
    video_filename: path.basename(videoPath),
    mime_type: 'video/mp4',
    title,
    caption,
    description: youtubeDescription,
    hashtags: tags.filter((tag) => typeof tag === 'string').slice(0, 30),
    platforms: ['instagram_reels', 'facebook_reels', 'pinterest_video_pin'],
    requested_at: new Date().toISOString(),
    publish_mode: process.env.MAKE_SOCIAL_PUBLISH_MODE || 'publish_now',
  };

  const webhookUrl = required('MAKE_SOCIAL_WEBHOOK_URL');
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.MAKE_SOCIAL_WEBHOOK_API_KEY) {
    headers['x-make-apikey'] = process.env.MAKE_SOCIAL_WEBHOOK_API_KEY;
  }
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Make webhook rejected the publishing event (${response.status}): ${body.slice(0, 800)}`);
  }
  console.log(JSON.stringify({
    accepted: true,
    event_id: runKey,
    source_run_number: Number(sourceRunNumber),
    video_url: videoUrl,
    make_response: body.slice(0, 300),
    note: 'Make accepted the webhook. Final platform publishing must be confirmed in the Make scenario execution log.',
  }, null, 2));
}

main().catch((error) => {
  console.error('[MAKE SOCIAL PUBLISHER] Failed:', error.message);
  process.exitCode = 1;
});
