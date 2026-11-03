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

  for (const cmd of pythonCmds) {
    try {
      execSync(`${cmd} engine/panchang_engine.py`, { stdio: 'inherit' });
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
async function renderRemotionVideo(data, outVideoPath) {
  console.log('[2/3] Rendering 15s animated Short with Remotion (Native 2D Vector Motifs)...');

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
  });

  console.log(`Video render complete with Native 2D Vector Art: ${outVideoPath}`);
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

async function uploadToYouTube(yt, videoPath, metadata) {
  console.log('[3/3] Uploading Short to YouTube...');
  try {
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
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    console.log(`\n==========================================================`);
    console.log(`🎉 Successfully published to YouTube Shorts!`);
    console.log(`URL: https://youtube.com/shorts/${res.data.id}`);
    console.log(`==========================================================\n`);
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
