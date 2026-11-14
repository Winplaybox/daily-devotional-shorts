// Weekly long-form "Saptahik Panchang" guide: data -> scenes -> per-scene Hindi
// narration (Kokoro -> Gemini -> Edge) -> 1920x1080 Remotion render -> QC -> scheduled upload.
import fs from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import {
  OUT_DIR, getBinaryPaths, synthesizeSceneAudio, validateRenderedVideo,
  getYouTubeClient, hasValidCredentials, uploadToYouTube,
} from './pipeline.js';
import { buildWeeklyScenes, buildWeeklyMetadata } from './longform/weekly-script.js';
import { resolveWeekStart, resolveWeeklyPublishAt, computeSceneTiming } from './longform/timing.js';

const FPS = 30;
const GAP_SECONDS = 0.45;
const MIN_SECONDS = 180;
const MAX_SECONDS = 720;

function runWeeklyData(weekStart) {
  const dataPath = path.join(OUT_DIR, 'weekly_data.json');
  const pythonCmds = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  for (const cmd of pythonCmds) {
    try {
      execFileSync(cmd, ['-m', 'engine.weekly_data', '--start', weekStart, '--out', dataPath], { stdio: 'inherit' });
      if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch {
      // try next interpreter
    }
  }
  throw new Error('Weekly Panchang calculation failed; refusing to publish without verified data.');
}

function makeSilence(ffmpeg, seconds, outPath) {
  execSync(`${ffmpeg} -y -f lavfi -i anullsrc=r=48000:cl=stereo -t ${seconds} "${outPath}"`, { stdio: 'ignore' });
}

async function run() {
  const weekStart = resolveWeekStart(new Date(), process.env.WEEK_START || '');
  console.log(`[WEEKLY] Building weekly guide for the week starting ${weekStart}`);
  const week = runWeeklyData(weekStart);
  const scenes = buildWeeklyScenes(week);
  const { ffmpeg } = getBinaryPaths();
  const sceneDir = path.join(OUT_DIR, 'weekly_scenes');
  fs.mkdirSync(sceneDir, { recursive: true });

  const durations = [];
  let ttsLabel = '';
  for (const scene of scenes) {
    const wavPath = path.join(sceneDir, `${scene.id}.wav`);
    const { label, seconds } = await synthesizeSceneAudio(scene.narration, scene.id, wavPath);
    ttsLabel = label;
    durations.push(seconds);
    console.log(`[WEEKLY][TTS] ${scene.id}: ${seconds.toFixed(1)}s (${label})`);
  }

  const timing = computeSceneTiming(durations, { gapSeconds: GAP_SECONDS, fps: FPS });
  if (timing.totalSeconds < MIN_SECONDS || timing.totalSeconds > MAX_SECONDS) {
    throw new Error(`Weekly guide is ${timing.totalSeconds.toFixed(0)}s; expected ${MIN_SECONDS}-${MAX_SECONDS}s. Check the script/TTS output.`);
  }

  // One continuous narration track: scene audio + fixed silence gaps (+ tail).
  const gapPath = path.join(sceneDir, 'gap.wav');
  const tailPath = path.join(sceneDir, 'tail.wav');
  makeSilence(ffmpeg, GAP_SECONDS, gapPath);
  makeSilence(ffmpeg, 1.2, tailPath);
  const listPath = path.join(sceneDir, 'concat.txt');
  const lines = [];
  scenes.forEach((scene, i) => {
    lines.push(`file '${path.resolve(sceneDir, `${scene.id}.wav`)}'`);
    lines.push(`file '${path.resolve(i === scenes.length - 1 ? tailPath : gapPath)}'`);
  });
  fs.writeFileSync(listPath, lines.join('\n'));
  const publicDir = path.resolve('./public');
  fs.mkdirSync(publicDir, { recursive: true });
  const narrationPath = path.join(publicDir, 'weekly_narration.wav');
  execSync(`${ffmpeg} -y -f concat -safe 0 -i "${listPath}" -ar 48000 -ac 2 "${narrationPath}"`, { stdio: 'ignore' });

  const inputProps = {
    scenes: scenes.map((scene, i) => ({ id: scene.id, kind: scene.kind, display: scene.display, frames: timing.frames[i] })),
    narrationFile: 'weekly_narration.wav',
    totalFrames: timing.totalFrames,
  };
  console.log(`[WEEKLY] Rendering ${timing.totalSeconds.toFixed(1)}s (${timing.totalFrames} frames) at 1920x1080...`);
  const serveUrl = await bundle({ entryPoint: path.resolve('./src/index.ts'), webpackOverride: (config) => config });
  const composition = await selectComposition({ serveUrl, id: 'WeeklyGuide', inputProps });
  const videoPath = path.join(OUT_DIR, 'pavitra-panchang-weekly.mp4');
  await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: videoPath, inputProps, crf: 23 });
  const thumbPath = path.join(OUT_DIR, 'pavitra-panchang-weekly-thumb.jpg');
  await renderStill({ composition, serveUrl, output: thumbPath, inputProps, frame: Math.min(45, timing.frames[0] - 1), imageFormat: 'jpeg', jpegQuality: 88 });
  validateRenderedVideo(videoPath, timing.totalSeconds, { width: 1920, height: 1080 });

  const metadata = buildWeeklyMetadata(week, scenes, timing.startsSeconds);
  fs.writeFileSync(path.join(OUT_DIR, 'weekly_metadata.json'), JSON.stringify({ week_start: weekStart, tts: ttsLabel, ...metadata }, null, 2));
  const publishAt = resolveWeeklyPublishAt(weekStart, new Date(), process.env.WEEKLY_PUBLISH_AT || '');

  if (process.env.REQUEST_UPLOAD === 'true' && process.env.AUTO_PUBLISH === 'true') {
    if (!hasValidCredentials()) throw new Error('Publishing requested but YouTube OAuth files are missing or invalid.');
    const yt = await getYouTubeClient();
    const channel = await yt.channels.list({ part: ['snippet', 'contentDetails'], mine: true, maxResults: 1 });
    const own = channel.data.items?.[0];
    if (!own?.id || !own.contentDetails?.relatedPlaylists?.uploads) throw new Error('Could not resolve the authenticated YouTube channel.');
    const result = await uploadToYouTube(yt, videoPath, metadata, publishAt.toISOString(), {
      channelId: own.id,
      uploadsPlaylistId: own.contentDetails.relatedPlaylists.uploads,
      slot: 'weekly',
      panchangDate: weekStart,
    });
    if (result && !result.skipped) {
      try {
        await yt.thumbnails.set({ videoId: result.videoId, media: { body: fs.createReadStream(thumbPath) } });
        console.log('[WEEKLY] Custom thumbnail set.');
      } catch (error) {
        console.warn(`[WEEKLY][WARN] Thumbnail not set (channel may need phone verification): ${error.message}`);
      }
    }
  } else {
    console.log(`[WEEKLY][REVIEW] Rendered ${videoPath}; upload not requested. Would publish at ${publishAt.toISOString()}.`);
  }
  console.log('Weekly long-form workflow finished successfully.');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  run().catch((error) => {
    console.error('Weekly pipeline failed:', error);
    process.exit(1);
  });
}
