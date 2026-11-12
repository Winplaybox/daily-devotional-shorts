import test from "node:test";
import assert from "node:assert/strict";
import { buildPublishJobTag, findExistingUploadByJobTag } from "../src/youtube/publish-idempotency.js";
import { getVideoProcessingState, readBackUntilProcessingReady } from "../src/youtube/upload-verification.js";

test("builds a stable date-and-slot job tag", () => {
  assert.equal(buildPublishJobTag("2026-11-10", "afternoon"), "pp365_job_20261110_afternoon");
});

test("rejects invalid dates and slots", () => {
  assert.throws(() => buildPublishJobTag("10-11-2026", "morning"), /YYYY-MM-DD/);
  assert.throws(() => buildPublishJobTag("2026-11-10", "night"), /Unsupported publish slot/);
});

test("finds an existing upload by its metadata tag", async () => {
  const existing = { id: "video-123", snippet: { title: "Daily Panchang", tags: ["pp365_job_20261110_morning"] } };
  const yt = {
    playlistItems: { list: async () => ({ data: { items: [{ contentDetails: { videoId: "video-123" } }] } }) },
    videos: { list: async () => ({ data: { items: [existing] } }) },
  };
  const result = await findExistingUploadByJobTag(yt, "uploads-1", "pp365_job_20261110_morning");
  assert.equal(result.id, "video-123");
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


test("only succeeded YouTube processing state is considered ready", () => {
  assert.deepEqual(getVideoProcessingState({ processingDetails: { processingStatus: "succeeded" } }), {
    status: "succeeded",
    ready: true,
    terminal: false,
    reason: null,
  });
  assert.equal(getVideoProcessingState({ processingDetails: { processingStatus: "processing" } }).ready, false);
  assert.equal(getVideoProcessingState({}).status, "unavailable");
  assert.equal(getVideoProcessingState({ processingDetails: { processingStatus: "failed" } }).terminal, true);
});

test("waits for YouTube processing to succeed before returning a verified read-back", async () => {
  const responses = [
    { data: { items: [{ id: "v-ready", snippet: { title: "Daily Panchang", tags: ["job-tag"] }, processingDetails: { processingStatus: "processing" } }] } },
    { data: { items: [{ id: "v-ready", snippet: { title: "Daily Panchang", tags: ["job-tag"] }, processingDetails: { processingStatus: "succeeded" } }] } },
  ];
  let calls = 0;
  let sleeps = 0;
  const yt = {
    videos: {
      list: async (args) => {
        assert.deepEqual(args.part, ["snippet", "status", "processingDetails"]);
        assert.deepEqual(args.id, ["v-ready"]);
        calls += 1;
        return responses.shift();
      },
    },
  };
  const result = await readBackUntilProcessingReady(yt, "v-ready", {
    jobTag: "job-tag",
    title: "Daily Panchang",
    maxAttempts: 3,
    intervalMs: 0,
    sleep: async () => { sleeps += 1; },
  });
  assert.equal(result.id, "v-ready");
  assert.equal(calls, 2);
  assert.equal(sleeps, 1);
});

test("fails immediately when YouTube reports terminal processing failure", async () => {
  const yt = {
    videos: {
      list: async () => ({ data: { items: [{
        id: "v-failed",
        snippet: { title: "Daily Panchang", tags: ["job-tag"] },
        processingDetails: { processingStatus: "failed", processingFailureReason: "codec" },
      }] } }),
    },
  };
  await assert.rejects(
    () => readBackUntilProcessingReady(yt, "v-failed", { jobTag: "job-tag", maxAttempts: 3, sleep: async () => {} }),
    /processing failed: codec/,
  );
});

test("fails closed when YouTube processing remains pending after bounded read-back", async () => {
  let calls = 0;
  const yt = {
    videos: {
      list: async () => {
        calls += 1;
        return { data: { items: [{
          id: "v-pending",
          snippet: { title: "Daily Panchang", tags: ["job-tag"] },
          processingDetails: { processingStatus: "processing" },
        }] } };
      },
    },
  };
  await assert.rejects(
    () => readBackUntilProcessingReady(yt, "v-pending", { jobTag: "job-tag", maxAttempts: 2, intervalMs: 0, sleep: async () => {} }),
    /processing is not ready after 2 read-back checks/,
  );
  assert.equal(calls, 2);
});

test("fails closed when a processed video does not match the expected tag or exact title", async () => {
  const yt = {
    videos: {
      list: async () => ({ data: { items: [{
        id: "v-wrong",
        snippet: { title: "Different title", tags: ["other-tag"] },
        processingDetails: { processingStatus: "succeeded" },
      }] } }),
    },
  };
  await assert.rejects(
    () => readBackUntilProcessingReady(yt, "v-wrong", { jobTag: "job-tag", title: "Daily Panchang", maxAttempts: 1, sleep: async () => {} }),
    /did not match the expected job tag or exact title/,
  );
});

test("fails closed when YouTube does not return the uploaded video", async () => {
  const yt = { videos: { list: async () => ({ data: { items: [] } }) } };
  await assert.rejects(
    () => readBackUntilProcessingReady(yt, "v-missing", { jobTag: "job-tag", maxAttempts: 1, sleep: async () => {} }),
    /could not be read back for processing verification/,
  );
});
