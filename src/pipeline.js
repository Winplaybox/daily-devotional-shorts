import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { google } from 'googleapis';

const OUT_DIR = path.resolve('./out');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Step 1: Real-Time Astronomical Panchang & Festival Engine
async function getDailyPanchangData() {
  console.log('[1/3] Running Real-Time Astronomical Panchang Engine (Python)...');
  const propsPath = path.join(OUT_DIR, 'daily_props.json');

  const pythonCmds = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  let engineSuccess = false;

  const slotArg = process.env.SLOT || (process.argv.includes('--slot') ? process.argv[process.argv.indexOf('--slot') + 1] : 'auto');

  for (const cmd of pythonCmds) {
    try {
      execSync(`${cmd} engine/panchang_engine.py --slot ${slotArg}`, { stdio: 'inherit' });
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


function formatForVoice(value, fallback = 'जानकारी उपलब्ध नहीं') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function buildHindiNarration(data, durationSeconds = 60) {
  const p = data.panchang_raw || data;
  const date = formatForVoice(data.dateDisplay || p.date_display || data.date);
  const title = formatForVoice(data.title, 'आज का पंचांग');
  if (durationSeconds === 40) {
    return [
      'नमस्कार। आप देख रहे हैं पवित्र पंचांग तीन सौ पैंसठ।',
      date, 'का', title, '.',
      'आज की तिथि है', formatForVoice(p.tithi_name), 'और पक्ष है', formatForVoice(p.paksha), '.',
      'नक्षत्र है', formatForVoice(p.nakshatra_name), 'तथा योग है', formatForVoice(p.yoga_name), '.',
      'सूर्योदय', formatForVoice(p.sunrise), 'और सूर्यास्त', formatForVoice(p.sunset), 'पर होगा।',
      'राहुकाल', formatForVoice(p.rahu_kaal), 'है।',
      'समय गणना स्थान के अनुसार बदल सकता है। स्थानीय पंचांग से पुष्टि करें।',
      'आपका दिन मंगलमय हो। जय श्री राम।'
    ].join(' ');
  }
  return [
    'नमस्कार। आप देख रहे हैं पवित्र पंचांग तीन सौ पैंसठ।',
    'आइए जानते हैं', date, 'का', title, '.',
    'हिंदू मास', formatForVoice(p.hindu_month), 'और पक्ष', formatForVoice(p.paksha), 'है।',
    'आज की तिथि है', formatForVoice(p.tithi_name), '.',
    'नक्षत्र है', formatForVoice(p.nakshatra_name), ', योग है', formatForVoice(p.yoga_name), 'और करण है', formatForVoice(p.karana_name), '.',
    'सूर्योदय', formatForVoice(p.sunrise), 'और सूर्यास्त', formatForVoice(p.sunset), 'का समय है।',
    'ब्रह्म मुहूर्त', formatForVoice(p.brahma), 'और अभिजीत मुहूर्त', formatForVoice(p.abhijit), 'है।',
    'राहुकाल', formatForVoice(p.rahu_kaal), 'तथा यमगण्ड', formatForVoice(p.yamaganda), 'का ध्यान रखें।',
    'अमृत चौघड़िया', formatForVoice(p.amrit_choghadiya), 'और शुभ चौघड़िया', formatForVoice(p.shubh_choghadiya), 'है।',
    'ये समय निर्धारित गणना स्थान और समयक्षेत्र के अनुसार हैं। अपने स्थान के लिए स्थानीय पंचांग से पुष्टि अवश्य करें।',
    'आपका दिन मंगलमय हो। जय श्री राम।'
  ].join(' ');
}
async function generateHindiNarration(data, durationSeconds = 60) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required to generate Hindi narration.');
  const text = buildHindiNarration(data, durationSeconds);
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
    throw new Error(`Gemini TTS failed (${response.status}): ${detail.slice(0, 1000)}`);
  }
  const result = await response.json();
  const part = result.candidates?.[0]?.content?.parts?.find(x => x.inlineData?.data);
  if (!part) throw new Error('Gemini TTS returned no audio data.');
  const pcm = Buffer.from(part.inlineData.data, 'base64');
  const mime = part.inlineData.mimeType || 'audio/pcm;rate=24000';
  const rate = Number(mime.match(/rate=(\d+)/)?.[1] || 24000);
  const channels = 1;
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0); wavHeader.writeUInt32LE(36 + pcm.length, 4);
  wavHeader.write('WAVE', 8); wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(channels, 22); wavHeader.writeUInt32LE(rate, 24);
  wavHeader.writeUInt32LE(rate * channels * 2, 28); wavHeader.writeUInt16LE(channels * 2, 32);
  wavHeader.writeUInt16LE(16, 34); wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcm.length, 40);
  const rawPath = path.join(OUT_DIR, 'narration_raw.wav');
  fs.writeFileSync(rawPath, Buffer.concat([wavHeader, pcm]));
  const narrationPath = path.resolve('./public/narration' + durationSeconds + '.wav');
  execSync(`ffmpeg -y -i "${rawPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=10,apad,atrim=0:${durationSeconds}" -ar 48000 -ac 2 "${narrationPath}"`, { stdio: 'inherit' });
  console.log('[TTS] Hindi narration generated for ' + durationSeconds + ' seconds.');
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

async function uploadToYouTube(yt, videoPath, metadata) {
  console.log('[3/3] Uploading Short to YouTube (Scheduled Mode)...');
  try {
    const rawPublishAt = process.env.PUBLISH_AT || process.env.SCHEDULE_TIME || metadata.publish_at || metadata.publishAt;
    
    // Default to at least 30 minutes in future so YouTube can process 4K Ultra HD
    const targetPublishAt = rawPublishAt ? new Date(rawPublishAt) : new Date(Date.now() + 30 * 60 * 1000);
    const publishAtIso = targetPublishAt.toISOString();

    console.log(`[SCHEDULE] 4K Video will automatically publish at: ${publishAtIso}`);
    console.log(`[SCHEDULE] Privacy: private (YouTube processes 4K Ultra HD & releases at scheduled time)`);

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
    console.log(`🎉 Successfully published to YouTube Shorts!`);
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
    // Review-first: publishing is never triggered just because OAuth credentials exist.
    if (process.env.AUTO_PUBLISH === 'true' && hasValidCredentials()) {
      const yt = await getYouTubeClient();
      for (const videoPath of outputs) await uploadToYouTube(yt, videoPath, data);
    } else {
      console.log('\n[REVIEW] Both MP4s rendered; no YouTube upload was attempted.');
      for (const videoPath of outputs) console.log('[REVIEW] ' + videoPath);
      console.log('[REVIEW] Set AUTO_PUBLISH=true only after manually reviewing both MP4s.');
    }

    console.log('Daily automation workflow finished successfully.');
  } catch (err) {
    console.error('Pipeline failed:', err);
    process.exit(1);
  }
}

run();
