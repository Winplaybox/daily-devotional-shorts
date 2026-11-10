import fs from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { validateRenderedVideoMetadata } from './video/render-qc.js';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { google } from 'googleapis';
import { normalizeGoogleOAuthToken } from './youtube/oauth-token.js';
import { buildPublishJobTag, findExistingUploadByJobTag } from './youtube/publish-idempotency.js';
import { buildAfternoonNarration } from './editorial/slot-content.js';

import { fileURLToPath } from 'url';

const OUT_DIR = path.resolve('./out');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

let cachedFfmpeg = null;
let cachedFfprobe = null;

export function getBinaryPaths() {
  if (cachedFfmpeg && cachedFfprobe) return { ffmpeg: cachedFfmpeg, ffprobe: cachedFfprobe };
  try {
    const out = execSync('static_ffmpeg_paths', { encoding: 'utf8' });
    const mFfmpeg = out.match(/FFMPEG=(.+)/);
    const mFfprobe = out.match(/FFPROBE=(.+)/);
    if (mFfmpeg && fs.existsSync(mFfmpeg[1].trim())) cachedFfmpeg = `"${mFfmpeg[1].trim()}"`;
    if (mFfprobe && fs.existsSync(mFfprobe[1].trim())) cachedFfprobe = `"${mFfprobe[1].trim()}"`;
  } catch (e) {}
  if (!cachedFfmpeg) cachedFfmpeg = 'ffmpeg';
  if (!cachedFfprobe) cachedFfprobe = 'ffprobe';
  return { ffmpeg: cachedFfmpeg, ffprobe: cachedFfprobe };
}

function validateRenderedVideo(videoPath, expectedDurationSeconds) {
  if (!fs.existsSync(videoPath)) throw new Error(`Rendered video is missing: ${videoPath}`);
  const fileSize = fs.statSync(videoPath).size;
  const { ffprobe } = getBinaryPaths();
  const output = execSync(`${ffprobe} -v error -show_entries format=duration:stream=codec_type,width,height -of json "${videoPath}"`, { encoding: 'utf8' });
  const result = validateRenderedVideoMetadata({
    fileSize,
    probe: JSON.parse(output),
    expectedDurationSeconds,
  });
  console.log(`[QC] Passed: ${videoPath} (${result.width}x${result.height}, ${result.durationSeconds.toFixed(2)}s, audio present, ${result.fileSize} bytes)`);
  return result;
}

export function getAudioDuration(filePath) {
  const { ffprobe } = getBinaryPaths();
  try {
    const out = execSync(`${ffprobe} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' });
    const dur = parseFloat(out.trim());
    return isNaN(dur) ? 0 : dur;
  } catch (e) {
    return 0;
  }
}

// Step 1: Real-Time Astronomical Panchang & Festival Engine
async function getDailyPanchangData(slot = 'morning') {
  console.log('[1/3] Running Real-Time Astronomical Panchang Engine (Python)...');
  const propsPath = path.join(OUT_DIR, `daily_props_${slot}.json`);

  const pythonCmds = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  let engineSuccess = false;

  const dateIdx = process.argv.indexOf('--date');
  const dateArg = process.env.PANCHANG_DATE || (dateIdx !== -1 ? process.argv[dateIdx + 1] : '');
  const dateParam = dateArg ? ` --date ${dateArg}` : '';
  const slotIdx = process.argv.indexOf('--slot');
  const slotArg = slot || process.env.SLOT || (slotIdx !== -1 ? process.argv[slotIdx + 1] : 'morning');
  if (!['morning', 'afternoon', 'evening'].includes(slotArg)) {
    throw new Error(`Unsupported publishing slot: ${slotArg}`);
  }
  process.env.PANCHANG_PUBLISH_SLOT = slotArg;

  for (const cmd of pythonCmds) {
    try {
      execSync(`${cmd} engine/panchang_engine.py --slot ${slotArg}${dateParam} --out ${JSON.stringify(propsPath)}`, { stdio: 'inherit' });
      if (fs.existsSync(propsPath)) {
        engineSuccess = true;
        break;
      }
    } catch (e) {
      // try next command
    }
  }

  if (engineSuccess && fs.existsSync(propsPath)) {
    const content = fs.readFileSync(propsPath, 'utf8');
    const data = JSON.parse(content);
    console.log(`[SUCCESS] Real-Time Engine Active: [${data.religion}] ${data.title} (Theme: ${data.theme || 'temple'})`);
    return data;
  }

  // Panchang timings are factual data: never replace a failed calculation with generative guesses.
  throw new Error('Panchang calculation failed. Fix the Python engine or its inputs; AI-generated timing fallback is disabled to prevent fabricated religious timings.');
}

function cleanHindiString(str) {
  if (!str) return '';
  return String(str).replace(/\s*\([A-Za-z0-9\s,\-–]+\)/g, '').replace(/दिशा/g, '').trim();
}

function formatVoiceTime(t) {
  if (!t || t === 'उपलब्ध नहीं' || t === '—') return '';
  return String(t).replace(' AM', ' प्रातः').replace(' PM', ' सायं').replace(' – ', ' से ');
}

export function buildHindiNarration(data, durationSeconds = 60) {
  const p = data.panchang_raw || {};
  const meta = data.date_meta || p.date_meta || {};
  const c1 = data.card_1_essence || p.card_1_essence || {};
  const c2 = data.card_2_nature || p.card_2_nature || {};
  const c3 = data.card_3_muhurat || p.card_3_muhurat || {};
  const c4 = data.card_4_cultural || p.card_4_cultural || {};

  // Formatted date and weekday
  const dateStr = data.dateDisplay || p.date_display || data.date || '';
  const weekday = meta.day_of_week_hi || p.weekday || '';
  const dateGreeting = weekday && dateStr ? `${dateStr}, ${weekday}` : (dateStr || weekday);

  // The afternoon slot has its own Choghadiya/muhurat editorial brief. Do not
  // reuse the generic morning narration for a differently titled publication.
  if (durationSeconds === 40 && String(data.slot || '').toLowerCase() === 'afternoon') {
    return buildAfternoonNarration(data, dateGreeting);
  }

  // Month & Paksha & Tithi
  const rawMonth = p.hindu_month_clean || meta.month_amanta || p.hindu_month || '';
  const month = cleanHindiString(rawMonth);
  const rawPaksha = meta.paksha || p.paksha || '';
  const paksha = cleanHindiString(rawPaksha);
  const rawTithi = c1.tithi?.raw_name || p.tithi_clean || p.tithi_name || '';
  const tithi = cleanHindiString(rawTithi);

  // Nakshatra, Yoga, Karana
  const rawNakshatra = c1.nakshatra?.name || p.nakshatra_clean || p.nakshatra_name || '';
  const nakshatra = cleanHindiString(rawNakshatra);
  const rawYoga = c1.yoga?.name || p.yoga_name || '';
  const yoga = cleanHindiString(rawYoga);
  const rawKarana = c1.karana?.first || p.karana_name || '';
  const karana = cleanHindiString(rawKarana);

  // Timings
  const sunrise = c2.solar?.sunrise || p.sunrise || '';
  const sunset = c2.solar?.sunset || p.sunset || '';
  const moonrise = c2.lunar?.moonrise || p.moonrise || '';
  const moonset = c2.lunar?.moonset || p.moonset || '';

  // Auspicious
  const abhijit = p.abhijit_range || p.abhijit || (c3.auspicious?.find(x => x.name?.toLowerCase().includes('abhijit'))?.display) || '';
  const amritKaal = p.amrit_kaal_range || p.amrit_kaal || (c3.auspicious?.find(x => x.name?.toLowerCase().includes('amrit'))?.display) || '';
  const brahma = p.brahma_range || p.brahma || (c3.auspicious?.find(x => x.name?.toLowerCase().includes('brahma'))?.display) || '';

  // Inauspicious
  const rahuKaal = p.rahu_kaal_range || p.rahu_kaal || (c3.inauspicious?.find(x => x.name?.toLowerCase().includes('rahu'))?.display) || '';
  const yamaganda = p.yamaganda_range || p.yamaganda || (c3.inauspicious?.find(x => x.name?.toLowerCase().includes('yama'))?.display) || '';

  // Disha Shool
  const rawDisha = c4.disha_shool?.direction || (p.disha_shool ? p.disha_shool.split(' ')[0] : '');
  const disha = cleanHindiString(rawDisha);

  // Festivals / Vrats
  const festivals = Array.isArray(c4.festivals) ? c4.festivals : [];
  let festivalText = '';
  if (festivals.length > 0 && festivals[0].name) {
    festivalText = `आज का विशेष पर्व ${festivals[0].name} है।`;
  } else if (data.title && !data.title.toLowerCase().includes('पंचांग')) {
    festivalText = `आज ${data.title} का पावन दिन है।`;
  }

  if (durationSeconds === 40) {
    // --- 40-SECOND NARRATION STRUCTURE ---
    // 0-4s: Greeting and date
    // 4-11s: Maas, Paksha, Tithi and Nakshatra
    // 11-18s: Sunrise, sunset and important daily timings
    // 18-27s: Important Shubh Muhurat and Rahu Kaal
    // 27-34s: Vrat, festival or special Panchang info
    // 34-40s: Directional guidance and closing
    const parts = [];
    parts.push(`नमस्कार। दैनिक पंचांग 365 में आज ${dateGreeting} का पंचांग।`);

    let calendarPart = '';
    const calTokens = [];
    if (month && month !== 'उपलब्ध नहीं') calTokens.push(`${month} माह`);
    if (paksha && paksha !== 'उपलब्ध नहीं') calTokens.push(paksha);
    if (tithi && tithi !== 'उपलब्ध नहीं') calTokens.push(`${tithi} तिथि`);

    if (calTokens.length > 0) {
      calendarPart = `आज ${calTokens.join(', ')} है`;
      if (nakshatra && nakshatra !== 'उपलब्ध नहीं') calendarPart += `, तथा नक्षत्र ${nakshatra} रहेगा।`;
      else calendarPart += '।';
    } else if (nakshatra && nakshatra !== 'उपलब्ध नहीं') {
      calendarPart = `आज नक्षत्र ${nakshatra} रहेगा।`;
    }
    if (calendarPart) parts.push(calendarPart);

    if (sunrise && sunset && sunrise !== 'उपलब्ध नहीं' && sunset !== 'उपलब्ध नहीं') {
      parts.push(`सूर्योदय ${formatVoiceTime(sunrise)} और सूर्यास्त ${formatVoiceTime(sunset)} पर होगा।`);
    }

    let muhuratPart = '';
    if (abhijit && abhijit !== 'उपलब्ध नहीं') {
      muhuratPart += `शुभ अभिजीत मुहूर्त ${formatVoiceTime(abhijit)} तक है। `;
    }
    if (rahuKaal && rahuKaal !== 'उपलब्ध नहीं') {
      muhuratPart += `अशुभ राहुकाल ${formatVoiceTime(rahuKaal)} रहेगा।`;
    }
    if (muhuratPart) parts.push(muhuratPart.trim());

    if (festivalText) {
      parts.push(festivalText);
    } else {
      parts.push('आज का दिन धार्मिक कार्यों और ईश्वर आराधना के लिए उत्तम है।');
    }

    if (disha && disha !== 'उपलब्ध नहीं') {
      parts.push(`आज ${disha} दिशा में दिशा शूल रहेगा।`);
    }
    parts.push('आपका दिन मंगलमय हो। जय श्री राम।');

    return parts.join(' ');
  }

  // --- 60-SECOND NARRATION STRUCTURE ---
  // 0-5s: Greeting and date
  // 5-15s: Maas, Paksha, Tithi, Nakshatra, Yoga
  // 15-25s: Sunrise, sunset and Choghadiya highlights
  // 25-38s: Shubh Muhurat and important auspicious timings
  // 38-48s: Rahu Kaal, Yamaganda and other relevant timings
  // 48-55s: Festival, vrat and Disha Shool
  // 55-60s: Short devotional closing
  const parts = [];
  parts.push(`नमस्कार। दैनिक पंचांग 365 में आपका स्वागत है। आज ${dateGreeting} का संपूर्ण वैदिक पंचांग जानिए।`);

  let calPart = '';
  const cal60Tokens = [];
  if (month && month !== 'उपलब्ध नहीं') cal60Tokens.push(`${month} माह`);
  if (paksha && paksha !== 'उपलब्ध नहीं') cal60Tokens.push(paksha);
  if (tithi && tithi !== 'उपलब्ध नहीं') cal60Tokens.push(`${tithi} तिथि`);

  if (cal60Tokens.length > 0) {
    calPart = `आज ${cal60Tokens.join(', ')} है।`;
  }
  if (nakshatra && nakshatra !== 'उपलब्ध नहीं') {
    calPart += ` नक्षत्र ${nakshatra} रहेगा`;
    if (yoga && yoga !== 'उपलब्ध नहीं') {
      calPart += `, तथा योग ${yoga}`;
      if (karana && karana !== 'उपलब्ध नहीं') {
        calPart += ` और करण ${karana} है।`;
      } else {
        calPart += ' है।';
      }
    } else if (karana && karana !== 'उपलब्ध नहीं') {
      calPart += ` तथा करण ${karana} है।`;
    } else {
      calPart += '।';
    }
  }
  if (calPart) parts.push(calPart.trim());

  let timingPart = '';
  if (sunrise && sunset && sunrise !== 'उपलब्ध नहीं' && sunset !== 'उपलब्ध नहीं') {
    timingPart = `सूर्योदय प्रातः ${formatVoiceTime(sunrise)} और सूर्यास्त सायं ${formatVoiceTime(sunset)} पर होगा।`;
  }
  if (moonrise && moonset && moonrise !== 'उपलब्ध नहीं' && moonset !== 'उपलब्ध नहीं') {
    timingPart += ` चन्द्रोदय ${formatVoiceTime(moonrise)} तथा चन्द्रास्त ${formatVoiceTime(moonset)} पर होगा।`;
  }
  if (timingPart) parts.push(timingPart.trim());

  let shubhPart = '';
  if (abhijit && abhijit !== 'उपलब्ध नहीं') {
    shubhPart += `दिन का सबसे शुभ अभिजीत मुहूर्त ${formatVoiceTime(abhijit)} रहेगा। `;
  }
  if (brahma && brahma !== 'उपलब्ध नहीं') {
    shubhPart += `ब्रह्म मुहूर्त ${formatVoiceTime(brahma)} तक है, जिसमें शुभ संकल्प सिद्ध होते हैं।`;
  }
  if (shubhPart) parts.push(shubhPart.trim());

  let ashubhPart = '';
  if (rahuKaal && rahuKaal !== 'उपलब्ध नहीं') {
    ashubhPart += `अशुभ समय में राहुकाल ${formatVoiceTime(rahuKaal)} रहेगा`;
    if (yamaganda && yamaganda !== 'उपलब्ध नहीं') {
      ashubhPart += `, तथा यमगण्ड काल ${formatVoiceTime(yamaganda)} तक रहेगा। इस दौरान नए कार्य टालें।`;
    } else {
      ashubhPart += '। इस दौरान नए कार्य टालें।';
    }
  }
  if (ashubhPart) parts.push(ashubhPart.trim());

  let culturalPart = '';
  if (festivalText) {
    culturalPart += festivalText + ' ';
  }
  if (disha && disha !== 'उपलब्ध नहीं') {
    culturalPart += `आज ${disha} दिशा में दिशा शूल रहेगा, यात्रा से पूर्व उपाय अवश्य करें।`;
  }
  if (culturalPart) parts.push(culturalPart.trim());

  parts.push('दैनिक पंचांग से जुड़े रहने के लिए सब्सक्राइब करें। आपका दिन मंगलमय हो। ॐ नमो भगवते वासुदेवाय नमः।');

  return parts.join(' ');
}

const HINDI_TTS_VOICES = new Set(['hi-IN-SwaraNeural', 'hi-IN-MadhurNeural']);

export function resolveHindiTtsVoice(configuredVoice = '') {
  const candidate = String(configuredVoice || '').trim();
  return HINDI_TTS_VOICES.has(candidate) ? candidate : 'hi-IN-SwaraNeural';
}

export function buildHindiTtsArgs({ configuredVoice = '', text, rate, outputPath }) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TypeError('Hindi TTS text must be a non-empty string.');
  }
  if (typeof outputPath !== 'string' || !outputPath.trim()) {
    throw new TypeError('Hindi TTS outputPath must be a non-empty string.');
  }
  if (!['+18%', '+20%'].includes(rate)) {
    throw new TypeError('Hindi TTS rate must be one of the configured safe rates.');
  }

  // Return argv rather than a shell command: narration text can contain
  // punctuation and must never be interpreted as shell syntax.
  return [
    '-m', 'edge_tts',
    '--voice', resolveHindiTtsVoice(configuredVoice),
    `--rate=${rate}`,
    '--text', text,
    '--write-media', outputPath,
  ];
}

export async function generateHindiNarration(data, durationSeconds = 60) {
  const sourcePath = path.join(OUT_DIR, `narration_source_${durationSeconds}.wav`);
  const narrationPath = path.resolve(`./public/narration${durationSeconds}.wav`);
  const { ffmpeg } = getBinaryPaths();

  // Always generate duration-specific narration text
  const text = buildHindiNarration(data, durationSeconds);
  // Hindi narration uses a Hindi-only Edge voice. Gemini TTS previously
  // returned English speech for Hindi-script input when its language was
  // inferred; do not allow that silent language fallback in production.
  const mp3Path = path.join(OUT_DIR, `narration_edge_${durationSeconds}.mp3`);
  const python = process.platform === 'win32' ? 'python' : 'python3';
  const ttsRate = durationSeconds === 40 ? '+18%' : '+20%';
  const ttsArgs = buildHindiTtsArgs({
    configuredVoice: process.env.EDGE_TTS_VOICE,
    text,
    rate: ttsRate,
    outputPath: mp3Path,
  });
  const voice = ttsArgs[3];
  try {
    execFileSync(python, ttsArgs, {
      stdio: 'inherit',
      maxBuffer: 10 * 1024 * 1024,
    });
    execSync(`${ffmpeg} -y -i "${mp3Path}" -ar 24000 -ac 1 "${sourcePath}"`, { stdio: 'inherit' });
    console.log(`[TTS] Hindi narration generated using ${voice} at rate ${ttsRate}.`);
  } catch (error) {
    throw new Error(`Hindi TTS generation failed for ${durationSeconds}s using ${voice}. Details: ` + error.message);
  }

  // Measure actual audio duration and adjust tempo gracefully if needed
  const rawDuration = getAudioDuration(sourcePath);
  console.log(`[TTS] Measured raw audio duration for ${durationSeconds}s: ${rawDuration.toFixed(2)}s`);

  let tempo = 1.0;
  const targetSec = durationSeconds === 40 ? 36.5 : 55.0;
  const maxSafeSec = durationSeconds === 40 ? 37.8 : 56.8;
  const minSafeSec = durationSeconds === 40 ? 30.0 : 46.0;

  if (rawDuration > maxSafeSec) {
    tempo = rawDuration / targetSec;
  } else if (rawDuration > 0 && rawDuration < minSafeSec) {
    tempo = rawDuration / targetSec;
  }

  console.log(`[TTS] Calculated tempo adjustment for ${durationSeconds}s: ${tempo.toFixed(3)}x (target: ${targetSec}s)`);

  const afParts = [];
  if (Math.abs(tempo - 1.0) > 0.01) {
    afParts.push(`atempo=${tempo.toFixed(3)}`);
  }
  afParts.push('loudnorm=I=-16:TP=-1.5:LRA=10');

  // No truncation: speech runs to its natural completion, with audio normalized
  execSync(`${ffmpeg} -y -i "${sourcePath}" -af "${afParts.join(',')}" -ar 48000 -ac 2 "${narrationPath}"`, { stdio: 'inherit' });
  const finalDuration = getAudioDuration(narrationPath);
  console.log(`[TTS] Final narration prepared for ${durationSeconds}s: ${finalDuration.toFixed(2)}s (file: ${narrationPath})`);
}

// Step 2: Render a static Panchang poster with artwork-only motion, Hindi narration and soft ambient music.
async function renderRemotionVideo(data, outVideoPath, durationSeconds = 60) {
  console.log('[2/3] Rendering ' + durationSeconds + 's vertical Short at 1080x1920...');

  const bundleLocation = await bundle({
    entryPoint: path.resolve('./src/index.ts'),
    webpackOverride: (config) => config,
  });

  const inputProps = {
    ...data,
    narrationFile: 'narration' + durationSeconds + '.wav',
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'DailyShort' + durationSeconds,
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outVideoPath,
    inputProps,
    scale: 1, // Native 1080x1920 keeps Shorts render time and file size practical
  });

  console.log('Video render complete (' + durationSeconds + 's, 1080x1920): ' + outVideoPath);
}

// Step 3: YouTube API Upload
async function getYouTubeClient() {
  const credentials = JSON.parse(fs.readFileSync('./client_secret.json', 'utf8'));
  const conf = credentials.installed || credentials.web || credentials;
  const client_id = conf.client_id;
  const client_secret = conf.client_secret;
  const redirect_uri = (Array.isArray(conf.redirect_uris) && conf.redirect_uris[0]) || 'http://localhost';

  if (!client_id || !client_secret) {
    throw new Error('client_secret.json missing client_id or client_secret');
  }

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

  const TOKEN_PATH = './token.json';
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('token.json missing! Run "npm run auth" to authenticate.');
  }

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  oauth2Client.setCredentials(normalizeGoogleOAuthToken(tokenData));

  return google.youtube({ version: 'v3', auth: oauth2Client });
}

// Step 3: Playlist Automation & YouTube API Upload
async function ensurePlaylist(yt, title, description) {
  if (!title) return null;
  try {
    const listRes = await yt.playlists.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
    });

    const items = listRes.data.items || [];
    const targetTitle = title.trim().toLowerCase();
    const existing = items.find(
      (p) => p.snippet && p.snippet.title && p.snippet.title.trim().toLowerCase() === targetTitle
    );

    if (existing) {
      console.log(`[PLAYLIST] Found existing playlist: "${title}" (ID: ${existing.id})`);
      return existing.id;
    }

    console.log(`[PLAYLIST] Creating new playlist: "${title}"...`);
    const createRes = await yt.playlists.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description: description || `दैनिक वैदिक पंचांग, शुभ मुहूर्त, राहुकाल और धार्मिक पर्वों के विशेष वीडियो। @PavitraPanchang365`,
          defaultLanguage: 'hi',
        },
        status: {
          privacyStatus: 'public',
        },
      },
    });

    console.log(`[PLAYLIST] Created playlist: "${title}" (ID: ${createRes.data.id})`);
    return createRes.data.id;
  } catch (err) {
    console.warn(`[WARN] Playlist operation skipped: ${err.message}`);
    return null;
  }
}

async function addVideoToPlaylist(yt, playlistId, videoId) {
  if (!playlistId || !videoId) return;
  try {
    await yt.playlistItems.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      },
    });
    console.log(`[PLAYLIST] Successfully added video ${videoId} to playlist ${playlistId}`);
  } catch (err) {
    console.warn(`[WARN] Could not add video to playlist: ${err.message}`);
  }
}

async function uploadToYouTube(yt, videoPath, metadata, publishAt, publishContext) {
  console.log('[3/3] Uploading Short to YouTube (Scheduled Mode)...');
  try {
    const rawPublishAt = publishAt || metadata.publish_at || metadata.publishAt;
    
    // Default to at least 30 minutes in future so YouTube can process 4K Ultra HD
    const targetPublishAt = new Date(rawPublishAt || Date.now() + 30 * 60 * 1000);
    if (!Number.isFinite(targetPublishAt.getTime())) throw new Error('Invalid YouTube publishAt timestamp.');
    if (targetPublishAt.getTime() < Date.now() + 5 * 60 * 1000) throw new Error('Scheduled publish time must be at least 5 minutes in the future.');
    const publishAtIso = targetPublishAt.toISOString();
    const jobTag = buildPublishJobTag(publishContext.panchangDate, publishContext.slot);
    const tags = [...new Set([...(Array.isArray(metadata.yt_tags) ? metadata.yt_tags : []), jobTag])];

    // Search the channel's uploads playlist before inserting. Retries must
    // reuse an existing upload rather than create a second scheduled Short.
    const existing = await findExistingUploadByJobTag(yt, publishContext.uploadsPlaylistId, jobTag);
    if (existing) {
      if (existing.snippet?.channelId !== publishContext.channelId) {
        throw new Error(`Idempotency key ${jobTag} was found on an unexpected YouTube channel.`);
      }
      if (existing.snippet?.title !== metadata.yt_title) {
        throw new Error(`Idempotency key ${jobTag} exists with a different title; refusing duplicate upload.`);
      }
      if (existing.status?.privacyStatus === "private") {
        const existingPublishAt = Date.parse(existing.status?.publishAt || "");
        if (!Number.isFinite(existingPublishAt) || Math.abs(existingPublishAt - targetPublishAt.getTime()) > 60_000) {
          throw new Error(`Existing video for ${jobTag} has a different or unverifiable schedule; manual reconciliation required.`);
        }
      } else if (existing.status?.privacyStatus !== "public" || targetPublishAt.getTime() > Date.now()) {
        throw new Error(`Existing video for ${jobTag} has unexpected privacy status; refusing duplicate upload.`);
      }
      console.log(`[IDEMPOTENCY] Existing upload found for ${jobTag}; skipping duplicate. URL: https://youtube.com/shorts/${existing.id}`);
      return { videoId: existing.id, url: `https://youtube.com/shorts/${existing.id}`, skipped: true };
    }

    console.log(`[SCHEDULE] Video will publish at: ${publishAtIso}`);
    console.log(`[SCHEDULE] Privacy: private until the scheduled publish time.`);

    const statusConfig = {
      privacyStatus: 'private', // Required by YouTube API for scheduled uploads
      publishAt: publishAtIso,
      selfDeclaredMadeForKids: false,
    };

    const res = await yt.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: metadata.yt_title,
          description: metadata.yt_description,
          tags,
          categoryId: '22',
          defaultLanguage: 'hi',
        },
        status: statusConfig,
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    const videoId = res.data.id;
    if (!videoId) throw new Error('YouTube upload response did not include a video ID.');

    // Read the uploaded video back from YouTube so a successful HTTP upload
    // cannot be mistaken for a successfully scheduled publication.
    const verification = await yt.videos.list({
      part: ['snippet', 'status'],
      id: [videoId],
      maxResults: 1,
    });
    const uploaded = verification.data.items?.[0];
    if (!uploaded) throw new Error(`YouTube accepted upload ${videoId}, but the video could not be read back for verification.`);
    if (uploaded.status?.privacyStatus !== 'private') {
      throw new Error(`YouTube video ${videoId} is not private while awaiting its scheduled publish time.`);
    }
    const actualPublishAt = Date.parse(uploaded.status?.publishAt || '');
    const expectedPublishAt = Date.parse(publishAtIso);
    if (!Number.isFinite(actualPublishAt) || Math.abs(actualPublishAt - expectedPublishAt) > 60_000) {
      throw new Error(`YouTube video ${videoId} was uploaded but its scheduled publishAt could not be verified.`);
    }
    if (uploaded.snippet?.title !== metadata.yt_title) {
      throw new Error(`YouTube video ${videoId} title does not match the requested metadata.`);
    }
    if (uploaded.snippet?.channelId !== publishContext.channelId) {
      throw new Error(`YouTube video ${videoId} is on an unexpected destination channel.`);
    }
    if (!Array.isArray(uploaded.snippet?.tags) || !uploaded.snippet.tags.includes(jobTag)) {
      throw new Error(`YouTube video ${videoId} is missing its idempotency tag after upload read-back.`);
    }

    console.log(`\n==========================================================`);
    console.log(`[UPLOAD VERIFIED] ${jobTag}: YouTube upload and schedule verified!`);
    console.log(`URL: https://youtube.com/shorts/${videoId}`);
    console.log(`Title: ${uploaded.snippet.title}`);
    console.log(`Status: Private until ${uploaded.status.publishAt}`);
    console.log(`==========================================================\n`);

    // Playlist Automation: Add video to its respective themed playlist
    if (metadata.playlist_name) {
      const playlistId = await ensurePlaylist(yt, metadata.playlist_name);
      if (playlistId) {
        await addVideoToPlaylist(yt, playlistId, videoId);
      }
    }
  } catch (uploadErr) {
    console.error('[ERROR] YouTube upload request failed:', uploadErr.message);
    if (uploadErr.response && uploadErr.response.data) {
      console.error('Details:', JSON.stringify(uploadErr.response.data, null, 2));
    }
    throw uploadErr;
  }
}

function hasValidCredentials() {
  if (!fs.existsSync('./client_secret.json') || !fs.existsSync('./token.json')) return false;
  try {
    const rawSecret = fs.readFileSync('./client_secret.json', 'utf8').trim();
    const rawToken = fs.readFileSync('./token.json', 'utf8').trim();
    if (!rawSecret || !rawToken) return false;

    const secret = JSON.parse(rawSecret);
    const token = JSON.parse(rawToken);
    const conf = secret.installed || secret.web || secret;

    const hasClient = Boolean(conf && conf.client_id && conf.client_secret);
    normalizeGoogleOAuthToken(token);
    return hasClient;
  } catch (e) {
    return false;
  }
}

async function run() {
  try {
    const slotPlan = [
      { slot: 'morning', durationSeconds: 40 },
      { slot: 'afternoon', durationSeconds: 40 },
      { slot: 'evening', durationSeconds: 60 },
    ];
    fs.mkdirSync(path.resolve('./public'), { recursive: true });
    const outputs = [];

    // Each slot gets its own calculation payload, narration, metadata and schedule.
    for (const item of slotPlan) {
      const data = await getDailyPanchangData(item.slot);
      console.log(`Topic: [${item.slot}] [${data.religion}] ${data.title}`);
      await generateHindiNarration(data, item.durationSeconds);
      const outputName = item.slot === 'morning' ? 'pavitra-panchang-40s.mp4' : item.slot === 'evening' ? 'pavitra-panchang-60s.mp4' : 'pavitra-panchang-afternoon-40s.mp4';
      const videoPath = path.join(OUT_DIR, outputName);
      await renderRemotionVideo(data, videoPath, item.durationSeconds);
      validateRenderedVideo(videoPath, item.durationSeconds);
      outputs.push({ ...item, data, videoPath });
    }

    // Publishing requires both an explicit run request and the repository-level opt-in.
    const uploadRequested = process.env.REQUEST_UPLOAD === 'true';
    const autoPublishEnabled = process.env.AUTO_PUBLISH === 'true';
    if (uploadRequested && autoPublishEnabled) {
      if (!hasValidCredentials()) throw new Error('Publishing requested but YouTube OAuth files are missing or invalid.');
      const yt = await getYouTubeClient();
      const channel = await yt.channels.list({ part: ['snippet', 'contentDetails'], mine: true, maxResults: 1 });
      if (!channel.data.items?.length) throw new Error('OAuth token did not resolve to a YouTube channel.');
      const authenticatedChannel = channel.data.items[0];
      const channelId = authenticatedChannel.id;
      const uploadsPlaylistId = authenticatedChannel.contentDetails?.relatedPlaylists?.uploads;
      if (!channelId || !uploadsPlaylistId) throw new Error('Authenticated YouTube channel is missing its channel ID or uploads playlist.');
      console.log('[YOUTUBE] Authenticated channel: ' + authenticatedChannel.snippet.title);

      for (const output of outputs) {
        const publishAt = new Date(output.data.publish_at);
        if (!Number.isFinite(publishAt.getTime())) {
          throw new Error(`Panchang engine returned invalid publish_at for ${output.slot}.`);
        }
        await uploadToYouTube(yt, output.videoPath, output.data, publishAt.toISOString(), {
          channelId,
          uploadsPlaylistId,
          slot: output.slot,
          panchangDate: process.env.PANCHANG_DATE,
        });
      }
    } else {
      console.log('\n[REVIEW] All three slots rendered. YouTube upload was not requested or AUTO_PUBLISH is disabled.');
      for (const output of outputs) console.log(`[REVIEW] ${output.slot}: ${output.videoPath} -> ${output.data.publish_at}`);
      console.log('[REVIEW] Publishing remains gated by REQUEST_UPLOAD and AUTO_PUBLISH.');
    }

    console.log('Daily automation workflow finished successfully.');
  } catch (err) {
    console.error('Pipeline failed:', err);
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  run();
}
