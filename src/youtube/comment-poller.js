/**
 * YouTube comment intake worker. Run on a scheduled server/worker with durable
 * Supabase storage. Does not upload videos; it admits validated requests only.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { google } from "googleapis";
import { parsePanchangComment, buildPublicRequestReply } from "../request-parser.js";
import { assessCommentRequest, finalizeResolvedRequest } from "../request-policy.js";
import {
  getPollCursor, setPollCursor, hasProcessedComment, markCommentProcessed,
  countViewerRequests, countQueuedRequests, insertRequest,
} from "../storage/supabase-store.js";
import { resolveWorldwideLocation } from "../location/worldwide-resolver.js";

function viewerKey(authorChannelId) {
  if (!authorChannelId) return null;
  return createHash("sha256").update(`${process.env.REQUEST_HASH_SALT || "configure-a-long-random-salt"}:${authorChannelId}`).digest("hex");
}

async function youtubeClient() {
  const clientSecret = JSON.parse(await readFile(process.env.CLIENT_SECRET_PATH || "./client_secret.json", "utf8"));
  const token = JSON.parse(await readFile(process.env.TOKEN_PATH || "./token.json", "utf8"));
  const conf = clientSecret.installed || clientSecret.web || clientSecret;
  const oauth = new google.auth.OAuth2(conf.client_id, conf.client_secret, conf.redirect_uris?.[0] || "http://localhost");
  oauth.setCredentials(token);
  const yt = google.youtube({ version: "v3", auth: oauth });
  const channel = await yt.channels.list({ part: ["id"], mine: true, maxResults: 1 });
  const channelId = channel.data.items?.[0]?.id;
  if (!channelId) throw new Error("OAuth account has no accessible YouTube channel");
  return { yt, channelId };
}

async function reply(yt, parentId, text) {
  await yt.comments.insert({
    part: ["snippet"],
    requestBody: { snippet: { parentId, textOriginal: text } },
  });
}

function getText(comment) {
  return comment?.snippet?.textOriginal || comment?.snippet?.textDisplay || "";
}

export async function pollYouTubeRequests({ maxPages = 3, pageSize = 50 } = {}) {
  const { yt, channelId } = await youtubeClient();
  const lastPoll = await getPollCursor();
  let pageToken;
  let processed = 0;
  let newestSeen = lastPoll;
  let stop = false;

  for (let page = 0; page < maxPages && !stop; page++) {
    const response = await yt.commentThreads.list({
      part: ["snippet", "replies"],
      allThreadsRelatedToChannelId: channelId,
      moderationStatus: "published",
      order: "time",
      maxResults: Math.min(100, Math.max(1, pageSize)),
      pageToken,
      textFormat: "plainText",
    });
    const threads = response.data.items || [];
    if (!threads.length) break;

    for (const thread of threads) {
      const root = thread.snippet?.topLevelComment;
      if (!root?.id) continue;
      const rootText = getText(root);
      const authorId = root.snippet?.authorChannelId?.value;
      if (authorId === channelId) continue;

      // Follow-up comments in the same thread may supply missing date/location.
      let combinedText = rootText;
      const replies = thread.replies?.comments || [];
      for (const child of replies) {
        if (child.snippet?.authorChannelId?.value === authorId) combinedText += `\n${getText(child)}`;
      }

      const parsed = parsePanchangComment(combinedText);
      if (!parsed.matched) continue;
      if (await hasProcessedComment(root.id)) continue;

      const hash = viewerKey(authorId);
      if (!hash) {
        await markCommentProcessed(root.id, "missing-author-channel");
        continue;
      }
      const now = new Date();
      const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
      const [dailyCount, queuedCount] = await Promise.all([
        countViewerRequests(hash, since),
        countQueuedRequests(),
      ]);
      const admission = assessCommentRequest({
        parsed, commentText: combinedText, channelKey: hash, dailyCount, queuedCount, now,
      });

      if (!admission.accepted) {
        if (admission.status === "needs-details") {
          await reply(yt, root.id, buildPublicRequestReply({ status: "needs-details", missing: admission.missing || parsed.missing }));
          // Keep incomplete threads eligible for another poll so replies can complete them.
          continue;
        }
        await markCommentProcessed(root.id, admission.reason || admission.status);
        continue;
      }

      let location;
      try {
        location = await resolveWorldwideLocation(parsed.request.locationText);
      } catch (error) {
        await reply(yt, root.id, "I couldn't uniquely identify that place. Please reply with City, State/Region, Country. Panchang timings are calculated for the selected location. 🙏");
        await markCommentProcessed(root.id, "location-clarification-required");
        continue;
      }

      const finalized = finalizeResolvedRequest({ admission, resolvedLocation: location });
      if (!finalized.accepted) {
        await markCommentProcessed(root.id, finalized.reason || finalized.status);
        continue;
      }
      const saved = await insertRequest({
        request_key: finalized.requestKey,
        source: "youtube_comment",
        source_comment_id: root.id,
        viewer_hash: hash,
        content_type: finalized.request.contentType,
        requested_date: finalized.request.date,
        requested_time: finalized.request.time,
        location_name: `${location.city}, ${location.admin1 || location.country}`,
        country_code: location.country_code,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
        status: "queued",
        visibility: "public",
        request_payload: finalized,
      });
      if (saved) {
        await reply(yt, root.id, buildPublicRequestReply({ status: "queued" }));
        processed++;
      } else {
        await reply(yt, root.id, "This request is already in our processing queue or has already been handled. 🙏");
      }
      await markCommentProcessed(root.id, saved ? "queued" : "duplicate");
    }

    pageToken = response.data.nextPageToken;
    if (!pageToken) break;
  }

  newestSeen = new Date().toISOString();
  await setPollCursor("channel-comments", newestSeen);
  return { processed, polledAt: newestSeen };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  pollYouTubeRequests().then((result) => {
    console.log(JSON.stringify(result));
  }).catch((error) => {
    console.error("[comment-poller] failed:", error.message);
    process.exitCode = 1;
  });
}
