/**
 * YouTube-native idempotency for scheduled Panchang Shorts.
 * A deterministic video tag survives GitHub Actions retries without new secrets.
 */
const VALID_SLOTS = new Set(["morning", "afternoon", "evening"]);

export function buildPublishJobTag(panchangDate, slot) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(panchangDate))) {
    throw new Error("Panchang date must use YYYY-MM-DD for the publish job key.");
  }
  if (!VALID_SLOTS.has(slot)) {
    throw new Error(`Unsupported publish slot for idempotency key: ${slot}`);
  }
  return `pp365_job_${panchangDate.replaceAll("-", "")}_${slot}`;
}

/**
 * Finds an earlier upload for this date+slot. The deterministic tag is the
 * primary key; YouTube does not always return tags on read-back, so an exact
 * title match (titles carry the date and slot) is the fallback key.
 */
export async function findExistingUploadByJobTag(yt, uploadsPlaylistId, jobTag, { title } = {}) {
  if (!yt?.playlistItems?.list || !yt?.videos?.list) {
    throw new Error("YouTube client does not support upload-history lookup.");
  }
  if (!uploadsPlaylistId) {
    throw new Error("Authenticated YouTube channel has no uploads playlist; refusing an unsafe upload.");
  }

  let pageToken;
  do {
    const page = await yt.playlistItems.list({
      part: ["contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      ...(pageToken ? { pageToken } : {}),
    });
    const ids = (page.data.items || [])
      .map((item) => item.contentDetails?.videoId)
      .filter(Boolean);

    for (let offset = 0; offset < ids.length; offset += 50) {
      const batch = ids.slice(offset, offset + 50);
      const videos = await yt.videos.list({
        part: ["snippet", "status"],
        id: batch,
        maxResults: batch.length,
      });
      const items = videos.data.items || [];
      const match = items.find((video) =>
        Array.isArray(video.snippet?.tags) && video.snippet.tags.includes(jobTag)
      ) || (title ? items.find((video) => video.snippet?.title === title) : undefined);
      if (match) return match;
    }
    pageToken = page.data.nextPageToken || undefined;
  } while (pageToken);
  return null;
}
