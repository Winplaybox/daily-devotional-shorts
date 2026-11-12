const DEFAULT_MAX_ATTEMPTS = 12;
const DEFAULT_INTERVAL_MS = 15_000;

export function getVideoProcessingState(video) {
  const rawStatus = video?.processingDetails?.processingStatus;
  const status = typeof rawStatus === "string" && rawStatus.trim()
    ? rawStatus.trim().toLowerCase()
    : "unavailable";

  if (status === "succeeded") {
    return { status, ready: true, terminal: false, reason: null };
  }

  const terminal = status === "failed" || status === "terminated";
  const reason = terminal
    ? (video?.processingDetails?.processingFailureReason || "no failure reason supplied")
    : null;

  return { status, ready: false, terminal, reason };
}

/**
 * Reads an uploaded video until YouTube confirms processing succeeded.
 * A tag or exact title must also match, so a successful response for an
 * unrelated video can never satisfy the slot's verification gate.
 */
export async function readBackUntilProcessingReady(yt, videoId, {
  jobTag,
  title,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (!yt?.videos?.list) {
    throw new Error("YouTube client does not support video processing read-back.");
  }
  if (typeof videoId !== "string" || !videoId.trim()) {
    throw new Error("A YouTube video ID is required for processing verification.");
  }
  if ((!jobTag || typeof jobTag !== "string") && (!title || typeof title !== "string")) {
    throw new Error("A YouTube job tag or exact title is required for processing verification.");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("Processing read-back maxAttempts must be a positive integer.");
  }
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new Error("Processing read-back intervalMs must be a non-negative number.");
  }

  let lastVideo = null;
  let lastState = getVideoProcessingState(null);
  let identityMatched = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await yt.videos.list({
      part: ["snippet", "status", "processingDetails"],
      id: [videoId],
      maxResults: 1,
    });
    lastVideo = response?.data?.items?.[0] || null;

    if (lastVideo) {
      const tagMatched = Boolean(jobTag)
        && Array.isArray(lastVideo.snippet?.tags)
        && lastVideo.snippet.tags.includes(jobTag);
      const titleMatched = Boolean(title) && lastVideo.snippet?.title === title;
      identityMatched = tagMatched || titleMatched;
      lastState = getVideoProcessingState(lastVideo);

      if (lastState.terminal) {
        throw new Error(
          `YouTube video ${videoId} processing ${lastState.status}: ${lastState.reason}.`,
        );
      }
      if (identityMatched && lastState.ready) return lastVideo;
    }

    if (attempt < maxAttempts) await sleep(intervalMs);
  }

  if (!lastVideo) {
    throw new Error(`YouTube video ${videoId} could not be read back for processing verification.`);
  }
  if (!identityMatched) {
    throw new Error(`YouTube video ${videoId} read-back did not match the expected job tag or exact title.`);
  }
  throw new Error(
    `YouTube video ${videoId} processing is not ready after ${maxAttempts} read-back checks (processingStatus=${lastState.status}).`,
  );
}
