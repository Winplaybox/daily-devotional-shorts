import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { google } from 'googleapis';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable missing.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const OUT_DIR = path.resolve('./out');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function getPanchangDetails() {
  console.log('[1/4] Fetching dynamic Panchang data via Gemini 2.5 Flash...');
  const prompt = `
  You are an expert Indian multi-religion panchang and festival engine.
  Target date: Current date in India (IST).
  Rotate intelligently between Hindu, Islamic, Sikh, Christian, and Jain celebrations or daily tithi.
  Output STRICTLY valid JSON with this schema:
  {
    "religion": "SANATANA DHARMA / ISLAM / SIKHISM / CHRISTIANITY / JAINISM",
    "title": "Festival / Day Name in Hindi",
    "dateDisplay": "Date and Day in Hindi",
    "label1": "Key timing 1 label in Hindi",
    "val1": "Key timing 1 value",
    "label2": "Key timing 2 label in Hindi",
    "val2": "Key timing 2 value",
    "label3": "Main auspicious timing/muhurat label in Hindi",
    "val3": "Main timing range",
    "footer": "Total duration or greeting in Hindi",
    "image_prompt": "Hyper-realistic 8k octane render prompt of the sacred visual, golden hour volumetric lighting, intricate details, strictly NO text, vertical 9:16 composition",
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

async function generateBackgroundArt(prompt, savePath) {
  console.log('[2/4] Generating 8K background art via Google Imagen 3...');
  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: '9:16',
      outputMimeType: 'image/jpeg',
    },
  });

  const b64 = response.generatedImages[0].image.imageBytes;
  fs.writeFileSync(savePath, Buffer.from(b64, 'base64'));
  console.log(`Artwork saved to: ${savePath}`);
}

async function renderRemotionVideo(data, bgPath, outVideoPath) {
  console.log('[3/4] Rendering 15s animated Short with Remotion...');

  // Local image ko read karke valid Data URI banayein
  const imgBuffer = fs.readFileSync(bgPath);
  const base64Image = imgBuffer.toString('base64');
  const bgDataUrl = `data:image/jpeg;base64,${base64Image}`;

  const bundleLocation = await bundle({
    entryPoint: path.resolve('./src/index.ts'),
    webpackOverride: (config) => config,
  });

  const inputProps = {
    ...data,
    bgImageUrl: bgDataUrl, // Override default Unsplash image
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

async function getYouTubeClient() {
  const credentials = JSON.parse(fs.readFileSync('./client_secret.json'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const TOKEN_PATH = './token.json';
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('token.json missing! Pehle local environment par authenticate karein.');
  }

  oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
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

async function run() {
  try {
    const data = await getPanchangDetails();
    console.log(`Topic: [${data.religion}] ${data.title}`);

    const bgPath = path.join(OUT_DIR, 'art_bg.jpg');
    const videoPath = path.join(OUT_DIR, 'final_short.mp4');

    await generateBackgroundArt(data.image_prompt, bgPath);
    await renderRemotionVideo(data, bgPath, videoPath);

    const yt = await getYouTubeClient();
    await uploadToYouTube(yt, videoPath, data);

    console.log('Daily automation workflow finished successfully.');
  } catch (err) {
    console.error('Pipeline failed:', err);
    process.exit(1);
  }
}

run();
