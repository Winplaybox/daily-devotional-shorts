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

  // Fallback to Gemini if API key is provided and python engine failed
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (GEMINI_API_KEY) {
    console.log('[FALLBACK] Querying Gemini AI for Panchang...');
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `
    You are an expert Indian multi-religion panchang and festival engine.
    Target date: Current date in India (IST).
    Output STRICTLY valid JSON with schema:
    {
      "religion": "SANATANA DHARMA",
      "title": "Festival / Day Name in Hindi",
      "dateDisplay": "Date and Day in Hindi",
      "label1": "Key timing 1 label in Hindi",
      "val1": "Key timing 1 value",
      "label2": "Key timing 2 label in Hindi",
      "val2": "Key timing 2 value",
      "label3": "Main auspicious timing/muhurat label in Hindi",
      "val3": "Main timing range",
      "footer": "Total duration or greeting in Hindi",
      "theme": "temple",
      "yt_title": "SEO clicky YouTube Shorts Title with Hindi keywords and #Shorts",
      "yt_description": "Comprehensive description with hashtags, muhurat details, and devotional context",
      "yt_tags": ["Shorts", "Panchang", "Festival", "DailyMuhurat"]
    }
    Do not include markdown codeblocks or quotes.
    `;
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const cleaned = res.text.replace(/^```json/, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
  }

  throw new Error('Both Python real-time engine and Gemini fallback failed.');
}

// Step 2: Render Remotion Short with Native 2D Vector Animations
async function generateNarration(data) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required for Hindi narration.');
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const p = data.panchang_raw || {};
  const script = [
    'नमस्कार। प्रस्तुत है '+(data.dateDisplay || 'आज')+' का दैनिक पंचांग।',
    'आज का मास '+(p.hindu_month || 'उपलब्ध नहीं')+' और पक्ष '+(p.paksha || 'उपलब्ध नहीं')+' है।',
    'आज की तिथि '+(p.tithi_name || 'उपलब्ध नहीं')+' तथा नक्षत्र '+(p.nakshatra_name || 'उपलब्ध नहीं')+' है।',
    'योग '+(p.yoga_name || 'उपलब्ध नहीं')+' और करण '+(p.karana_name || 'उपलब्ध नहीं')+' है।',
    'सूर्योदय '+(p.sunrise || 'उपलब्ध नहीं')+' और सूर्यास्त '+(p.sunset || 'उपलब्ध नहीं')+' पर होगा।',
    'अभिजीत मुहूर्त '+(p.abhijit || 'उपलब्ध नहीं')+' है। ब्रह्म मुहूर्त '+(p.brahma || 'उपलब्ध नहीं')+' है।',
    'राहुकाल '+(p.rahu_kaal || 'उपलब्ध नहीं')+' है। अपने स्थानीय पंचांग और परंपरा के अनुसार समय की पुष्टि अवश्य करें।',
    'इसी तरह के दैनिक पंचांग के लिए Pavitra Panchang 365 को सब्सक्राइब करें। आपका दिन शुभ हो।'
  ].join(' ');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: 'Speak naturally in clear Hindi at a measured pace. Text: '+script }] }],
    config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } }
  });
  const audioPart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
  if (!audioPart) throw new Error('Gemini TTS returned no audio payload.');
  const pcm = Buffer.from(audioPart.inlineData.data, 'base64');
  const sampleRate = Number((audioPart.inlineData.mimeType || '').match(/rate=(\d+)/)?.[1] || 24000);
  const wav = Buffer.alloc(44);
  wav.write('RIFF',0); wav.writeUInt32LE(36+pcm.length,4); wav.write('WAVE',8);
  wav.write('fmt ',12); wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20);
  wav.writeUInt16LE(1,22); wav.writeUInt32LE(sampleRate,24); wav.writeUInt32LE(sampleRate*2,28);
  wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(pcm.length,40);
  fs.writeFileSync(path.resolve('./public/narration.wav'), Buffer.concat([wav,pcm]));
  console.log('[AUDIO] Hindi narration generated.');
}

async function renderRemotionVideo(data, outVideoPath) {
  await generateNarration(data);
  console.log('[2/3] Rendering 60s animated Short with Remotion (Native 2D Vector Motifs in 4K Ultra HD)...');

  const bundleLocation = await bundle({
    entryPoint: path.resolve('./src/index.ts'),
    webpackOverride: (config) => config,
  });

  const inputProps = {
    ...data,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'DailyShort',
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outVideoPath,
    inputProps,
    scale: 2, // 4K Ultra HD (2160x3840 from 1080x1920 base)
  });

  console.log(`Video render complete in 4K Ultra HD (2160x3840): ${outVideoPath}`);
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

    const videoPath = path.join(OUT_DIR, 'final_short.mp4');

    await renderRemotionVideo(data, videoPath);

    if (hasValidCredentials()) {
      const yt = await getYouTubeClient();
      await uploadToYouTube(yt, videoPath, data);
    } else {
      console.log('\n[INFO] Valid YouTube credentials not detected.');
      console.log('[INFO] Video successfully rendered to: out/final_short.mp4');
      console.log('[INFO] To publish automatically via GitHub Actions, add CLIENT_SECRET_JSON and TOKEN_JSON to GitHub Repository Secrets.\n');
    }

    console.log('Daily automation workflow finished successfully.');
  } catch (err) {
    console.error('Pipeline failed:', err);
    process.exit(1);
  }
}

run();
