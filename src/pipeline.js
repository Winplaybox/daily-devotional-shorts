import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { google } from 'googleapis';

const OUT_DIR = path.resolve('./out');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Download image from URL to local buffer/file
async function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download image. Status: ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(destPath);
      });
    }).on('error', reject);
  });
}

// Step 1: Real-Time Astronomical Panchang & Festival Engine
async function getDailyPanchangData() {
  console.log('[1/4] Running Real-Time Astronomical Panchang Engine (Python)...');
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
    console.log(`[SUCCESS] Real-Time Engine Active: [${data.religion}] ${data.title}`);
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
      "bgImageUrl": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1080&q=80",
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

// Step 2: Prepare Background Artwork
async function prepareBackgroundArt(data, savePath) {
  console.log('[2/4] Preparing Divine 8K Background Artwork...');

  if (data.bgImageUrl && data.bgImageUrl.startsWith('http')) {
    try {
      console.log(`Downloading high-resolution sacred artwork...`);
      await downloadImage(data.bgImageUrl, savePath);
      console.log(`Artwork cached to: ${savePath}`);
      return;
    } catch (err) {
      console.warn('Could not download background from URL, falling back to local default:', err.message);
    }
  }

  // If local art already exists or fallback
  if (!fs.existsSync(savePath)) {
    // Write 1x1 fallback or copy from public
    const fallbackUrl = 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1080&q=80';
    await downloadImage(fallbackUrl, savePath);
  }
}

// Step 3: Render Remotion Short
async function renderRemotionVideo(data, bgPath, outVideoPath) {
  console.log('[3/4] Rendering 15s animated Short with Remotion...');

  const imgBuffer = fs.readFileSync(bgPath);
  const base64Image = imgBuffer.toString('base64');
  const bgDataUrl = `data:image/jpeg;base64,${base64Image}`;

  const bundleLocation = await bundle({
    entryPoint: path.resolve('./src/index.ts'),
    webpackOverride: (config) => config,
  });

  const inputProps = {
    ...data,
    bgImageUrl: bgDataUrl,
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

  console.log(`Video render complete with Divine 8K Artwork: ${outVideoPath}`);
}

// Step 4: YouTube API Upload
async function getYouTubeClient() {
  const credentials = JSON.parse(fs.readFileSync('./client_secret.json', 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const TOKEN_PATH = './token.json';
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('token.json missing! Run "npm run auth" to authenticate.');
  }

  oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  return google.youtube({ version: 'v3', auth: oauth2Client });
}

async function uploadToYouTube(yt, videoPath, metadata) {
  console.log('[4/4] Uploading Short to YouTube...');
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

  console.log(`Successfully published! URL: https://youtube.com/shorts/${res.data.id}`);
}

function hasValidCredentials() {
  if (!fs.existsSync('./client_secret.json') || !fs.existsSync('./token.json')) return false;
  try {
    const secret = JSON.parse(fs.readFileSync('./client_secret.json', 'utf8'));
    const token = JSON.parse(fs.readFileSync('./token.json', 'utf8'));
    return Boolean((secret.installed || secret.web) && (token.access_token || token.refresh_token));
  } catch (e) {
    return false;
  }
}

async function run() {
  try {
    const data = await getDailyPanchangData();
    console.log(`Topic: [${data.religion}] ${data.title}`);

    const bgPath = path.join(OUT_DIR, 'art_bg.jpg');
    const videoPath = path.join(OUT_DIR, 'final_short.mp4');

    await prepareBackgroundArt(data, bgPath);
    await renderRemotionVideo(data, bgPath, videoPath);

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
