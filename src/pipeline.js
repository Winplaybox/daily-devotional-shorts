import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { google } from 'googleapis';

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
async function getDailyPanchangData() {
  console.log('[1/3] Running Real-Time Astronomical Panchang Engine (Python)...');
  const propsPath = path.join(OUT_DIR, 'daily_props.json');

  const pythonCmds = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  let engineSuccess = false;

  const dateIdx = process.argv.indexOf('--date');
  const dateArg = process.env.PANCHANG_DATE || (dateIdx !== -1 ? process.argv[dateIdx + 1] : '');
  const dateParam = dateArg ? ` --date ${dateArg}` : '';
  const slotIdx = process.argv.indexOf('--slot');
  const slotArg = process.env.SLOT || (slotIdx !== -1 ? process.argv[slotIdx + 1] : 'morning');

  for (const cmd of pythonCmds) {
    try {
      execSync(`${cmd} engine/panchang_engine.py --slot ${slotArg}${dateParam}`, { stdio: 'inherit' });
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

export async function generateHindiNarration(data, durationSeconds = 60) {
  const sourcePath = path.join(OUT_DIR, `narration_source_${durationSeconds}.wav`);
  const narrationPath = path.resolve(`./public/narration${durationSeconds}.wav`);
  const { ffmpeg } = getBinaryPaths();

  // Always generate duration-specific narration text
  const text = buildHindiNarration(data, durationSeconds);
  const apiKey = process.env.GEMINI_API_KEY;
  let generated = false;

  if (apiKey) {
    try {
      console.log(`[TTS] Trying Gemini TTS for ${durationSeconds}s...`);
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Speak the following Hindi Panchang narration clearly, warmly and naturally in a calm devotional presenter style. Do not add, omit or translate any information. Text: ' + text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          }
        })
      });

      if (!response.ok) {
        const detail = await response.text();
        console.warn(`[TTS] Gemini returned HTTP ${response.status}; trying Edge TTS fallback. ` + detail.slice(0, 300));
      } else {
        const result = await response.json();
        const part = result.candidates?.[0]?.content?.parts?.find(x => x.inlineData?.data);
        if (!part) throw new Error('Gemini TTS returned no audio data.');
        const pcm = Buffer.from(part.inlineData.data, 'base64');
        const mime = part.inlineData.mimeType || 'audio/pcm;rate=24000';
        const rate = Number(mime.match(/rate=(\d+)/)?.[1] || 24000);
        const wavHeader = Buffer.alloc(44);
        wavHeader.write('RIFF', 0); wavHeader.writeUInt32LE(36 + pcm.length, 4);
        wavHeader.write('WAVE', 8); wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16); wavHeader.writeUInt16LE(1, 20);
        wavHeader.writeUInt16LE(1, 22); wavHeader.writeUInt32LE(rate, 24);
        wavHeader.writeUInt32LE(rate * 2, 28); wavHeader.writeUInt16LE(2, 32);
        wavHeader.writeUInt16LE(16, 34); wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(pcm.length, 40);
        fs.writeFileSync(sourcePath, Buffer.concat([wavHeader, pcm]));
        generated = true;
        console.log(`[TTS] Gemini narration generated successfully for ${durationSeconds}s.`);
      }
    } catch (error) {
      console.warn(`[TTS] Gemini failed for ${durationSeconds}s; trying Edge TTS fallback. ` + error.message);
    }
  }

  if (!generated) {
    const mp3Path = path.join(OUT_DIR, `narration_edge_${durationSeconds}.mp3`);
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const voice = process.env.EDGE_TTS_VOICE || 'hi-IN-SwaraNeural';
    const ttsRate = durationSeconds === 40 ? '+18%' : '+20%';
    try {
      execSync(`${python} -m edge_tts --voice "${voice}" --rate="${ttsRate}" --text ${JSON.stringify(text)} --write-media "${mp3Path}"`, {
        stdio: 'inherit',
        maxBuffer: 10 * 1024 * 1024,
      });
      execSync(`${ffmpeg} -y -i "${mp3Path}" -ar 24000 -ac 1 "${sourcePath}"`, { stdio: 'inherit' });
      console.log(`[TTS] Edge TTS fallback generated Hindi narration for ${durationSeconds}s using ${voice} at rate ${ttsRate}.`);
    } catch (error) {
      throw new Error(`TTS generation failed for ${durationSeconds}s. Details: ` + error.message);
    }
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
  oauth2Client.setCredentials({
    access_token: tokenData.access_token || tokenData.token,
    refresh_token: tokenData.refresh_token,
    scope: tokenData.scope || (Array.isArray(tokenData.scopes) ? tokenData.scopes.join(' ') : undefined),
    token_type: tokenData.token_type || 'Bearer',
    expiry_date: tokenData.expiry_date,
  });

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

async function uploadToYouTube(yt, videoPath, metadata, publishAt) {
  console.log('[3/3] Uploading Short to YouTube (Scheduled Mode)...');
  try {
    const rawPublishAt = publishAt || metadata.publish_at || metadata.publishAt;
    
    // Default to at least 30 minutes in future so YouTube can process 4K Ultra HD
    const targetPublishAt = new Date(rawPublishAt || Date.now() + 30 * 60 * 1000);
    if (!Number.isFinite(targetPublishAt.getTime())) throw new Error('Invalid YouTube publishAt timestamp.');
    if (targetPublishAt.getTime() < Date.now() + 5 * 60 * 1000) throw new Error('Scheduled publish time must be at least 5 minutes in the future.');
    const publishAtIso = targetPublishAt.toISOString();

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
          tags: metadata.yt_tags,
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
    console.log(`\n==========================================================`);
    console.log(`🎉 Successfully uploaded and scheduled on YouTube!`);
    console.log(`URL: https://youtube.com/shorts/${videoId}`);
    if (statusConfig.publishAt) {
      console.log(`Status: Scheduled (Private until ${statusConfig.publishAt})`);
    }
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
    const hasToken = Boolean(token && (token.access_token || token.refresh_token || token.token));
    return hasClient && hasToken;
  } catch (e) {
    return false;
  }
}

async function run() {
  try {
    const data = await getDailyPanchangData();
    console.log(`Topic: [${data.religion}] ${data.title}`);

    fs.mkdirSync(path.resolve('./public'), { recursive: true });
    const outputs = [];
    for (const durationSeconds of [40, 60]) {
      await generateHindiNarration(data, durationSeconds);
      const videoPath = path.join(OUT_DIR, 'pavitra-panchang-' + durationSeconds + 's.mp4');
      await renderRemotionVideo(data, videoPath, durationSeconds);
      outputs.push(videoPath);
    }
    // Publishing requires both an explicit run request and the repository-level opt-in.
    const uploadRequested = process.env.REQUEST_UPLOAD === 'true';
    const autoPublishEnabled = process.env.AUTO_PUBLISH === 'true';
    if (uploadRequested && autoPublishEnabled) {
      if (!hasValidCredentials()) throw new Error('Publishing requested but YouTube OAuth files are missing or invalid.');
      const yt = await getYouTubeClient();
      const channel = await yt.channels.list({ part: ['snippet'], mine: true, maxResults: 1 });
      if (!channel.data.items?.length) throw new Error('OAuth token did not resolve to a YouTube channel.');
      console.log('[YOUTUBE] Authenticated channel: ' + channel.data.items[0].snippet.title);
      const firstPublishAt = new Date(data.publish_at);
      if (!Number.isFinite(firstPublishAt.getTime())) throw new Error('Panchang engine returned invalid publish_at.');
      const secondPublishAt = new Date(firstPublishAt.getTime() + 12 * 60 * 60 * 1000);
      await uploadToYouTube(yt, outputs[0], data, firstPublishAt.toISOString());
      await uploadToYouTube(yt, outputs[1], data, secondPublishAt.toISOString());
    } else {
      console.log('\n[REVIEW] Render completed. YouTube upload was not requested or AUTO_PUBLISH is disabled.');
      for (const videoPath of outputs) console.log('[REVIEW] ' + videoPath);
      console.log('[REVIEW] Enable repository variable AUTO_PUBLISH=true and use workflow_dispatch with publish=true after reviewing the outputs.');
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
