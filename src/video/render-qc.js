export function validateRenderedVideoMetadata({ fileSize, probe, expectedDurationSeconds, expectedWidth = 1080, expectedHeight = 1920 }) {
  if (!Number.isFinite(fileSize) || fileSize <= 0) throw new Error("Rendered video file is missing or empty.");
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audio = streams.find((stream) => stream.codec_type === "audio");
  if (!video) throw new Error("Rendered video has no video stream.");
  if (!audio) throw new Error("Rendered video has no audio stream.");
  if (Number(video.width) !== expectedWidth || Number(video.height) !== expectedHeight) {
    throw new Error(`Rendered video must be ${expectedWidth}x${expectedHeight}; received ${video.width}x${video.height}.`);
  }
  const duration = Number(probe?.format?.duration);
  if (!Number.isFinite(duration) || Math.abs(duration - expectedDurationSeconds) > 2) {
    throw new Error(`Rendered video duration ${duration}s is outside the expected ${expectedDurationSeconds}s tolerance.`);
  }
  return { durationSeconds: duration, width: expectedWidth, height: expectedHeight, hasAudio: true, fileSize };
}
