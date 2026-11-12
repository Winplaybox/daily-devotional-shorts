import test from "node:test";
import assert from "node:assert/strict";
import { buildPublishJobTag, findExistingUploadByJobTag } from "../src/youtube/publish-idempotency.js";

test("builds a stable date-and-slot job tag", () => {
  assert.equal(buildPublishJobTag("2026-11-10", "afternoon"), "pp365_job_20261110_afternoon");
});

test("rejects invalid dates and slots", () => {
  assert.throws(() => buildPublishJobTag("10-11-2026", "morning"), /YYYY-MM-DD/);
  assert.throws(() => buildPublishJobTag("2026-11-10", "night"), /Unsupported publish slot/);
});

test("finds an existing upload by its metadata tag and disables nested Gaxios retries", async () => {
  const existing = { id: "video-123", snippet: { title: "Daily Panchang", tags: ["pp365_job_20261110_morning"] } };
  let playlistOptions;
  let videoOptions;
  const yt = {
    playlistItems: {
      list: async (options) => {
        playlistOptions = options;
        return { data: { items: [{ contentDetails: { videoId: "video-123" } }] } };
      },
    },
    videos: {
      list: async (options) => {
        videoOptions = options;
        return { data: { items: [existing] } };
      },
    },
  };
  const result = await findExistingUploadByJobTag(yt, "uploads-1", "pp365_job_20261110_morning");
  assert.equal(result.id, "video-123");
  assert.equal(playlistOptions.retry, false);
  assert.equal(videoOptions.retry, false);
});

test("returns null when no matching job tag exists", async () => {
  const yt = {
    playlistItems: { list: async () => ({ data: { items: [{ contentDetails: { videoId: "video-1" } }] } }) },
    videos: { list: async () => ({ data: { items: [{ id: "video-1", snippet: { tags: ["other"] } }] } }) },
  };
  assert.equal(await findExistingUploadByJobTag(yt, "uploads-1", "pp365_job_20261110_morning"), null);
});

test("fails closed if the channel uploads playlist is missing", async () => {
  const yt = { playlistItems: { list() {} }, videos: { list() {} } };
  await assert.rejects(() => findExistingUploadByJobTag(yt, null, "job"), /no uploads playlist/);
});

test("falls back to an exact title match when YouTube drops the job tag", async () => {
  const yt = {
    playlistItems: { list: async () => ({ data: { items: [{ contentDetails: { videoId: "v1" } }, { contentDetails: { videoId: "v2" } }] } }) },
    videos: { list: async () => ({ data: { items: [
      { id: "v1", snippet: { title: "Other title", tags: [] } },
      { id: "v2", snippet: { title: "आज का पंचांग 12 नवंबर" } },
    ] } }) },
  };
  const result = await findExistingUploadByJobTag(yt, "uploads-1", "pp365_job_20261112_morning", { title: "आज का पंचांग 12 नवंबर" });
  assert.equal(result.id, "v2");
  assert.equal(await findExistingUploadByJobTag(yt, "uploads-1", "pp365_job_20261112_morning", { title: "missing" }), null);
  assert.equal(await findExistingUploadByJobTag(yt, "uploads-1", "pp365_job_20261112_morning"), null);
});
