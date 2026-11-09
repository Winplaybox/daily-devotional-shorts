import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePanchangDate } from "../scripts/publish_make_social.js";
import {
  assertThreeVerifiedUploadOutcomes,
  countVerifiedUploadOutcomes,
  validatePublisherRunMetadata,
  verifyPublisherSourceRun,
} from "../src/social/source-run-verifier.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const validRun = {
  path: ".github/workflows/daily-shorts-publisher.yml",
  head_branch: "main",
  conclusion: "success",
  event: "schedule",
  run_number: 12,
  repository: { full_name: "Winplaybox/daily-devotional-shorts" },
};

const threeUploads = [
  "[UPLOAD VERIFIED] pp365_job_20261110_morning: YouTube upload and schedule verified!",
  "[UPLOAD VERIFIED] pp365_job_20261110_afternoon: YouTube upload and schedule verified!",
  "[UPLOAD VERIFIED] pp365_job_20261110_evening: YouTube upload and schedule verified!",
].join("\\n");

test("Make workflow invokes the existing YouTube source-run verifier entrypoint", () => {
  const workflowPath = path.join(repositoryRoot, ".github", "workflows", "make-social-publisher.yml");
  const verifierPath = path.join(repositoryRoot, "src", "social", "source-run-verifier.js");
  const workflow = readFileSync(workflowPath, "utf8");

  assert.equal(existsSync(verifierPath), true);
  assert.match(workflow, /run:\s*node\s+src\/social\/source-run-verifier\.js/);
  assert.doesNotMatch(workflow, /scripts\/verify-youtube-source-run\.js/);
});

test("Make workflow consumes the morning metadata artifact produced by the publisher", () => {
  const workflowPath = path.join(repositoryRoot, ".github", "workflows", "make-social-publisher.yml");
  const pipelinePath = path.join(repositoryRoot, "src", "pipeline.js");
  const workflow = readFileSync(workflowPath, "utf8");
  const pipeline = readFileSync(pipelinePath, "utf8");

  assert.match(pipeline, /daily_props_\$\{slot\}\.json/);
  assert.match(workflow, /test -s out\/daily_props_morning\.json/);
  assert.match(workflow, /PANCHANG_METADATA_PATH:\s*out\/daily_props_morning\.json/);
  assert.doesNotMatch(workflow, /out\/daily_props\.json/);
});

test("social payload date resolves from the publisher's canonical date metadata", () => {
  assert.equal(resolvePanchangDate({ date_meta: { gregorian_date: "2026-11-10" } }), "2026-11-10");
  assert.equal(resolvePanchangDate({ date: "2026-11-09", date_meta: { gregorian_date: "2026-11-10" } }), "2026-11-09");
  assert.equal(resolvePanchangDate({}, "2026-11-12"), "2026-11-12");
  assert.throws(() => resolvePanchangDate({}), /valid Gregorian date/);
  assert.throws(() => resolvePanchangDate({ date_meta: { gregorian_date: "2026-99-99" } }), /valid Gregorian date/);
});

test("Panchang date validation occurs before the external Supabase upload", () => {
  const publisherScript = readFileSync(path.join(repositoryRoot, "scripts", "publish_make_social.js"), "utf8");
  const dateValidation = publisherScript.indexOf("const publishDate = resolvePanchangDate(metadata);");
  const storageUpload = publisherScript.indexOf("const videoUrl = await uploadToSupabase(videoPath, runKey);");

  assert.notEqual(dateValidation, -1);
  assert.notEqual(storageUpload, -1);
  assert.ok(dateValidation < storageUpload, "invalid Panchang metadata must fail before an external storage write");
});

test("accepts only a successful canonical publisher run on main", () => {
  assert.equal(validatePublisherRunMetadata(validRun, "Winplaybox/daily-devotional-shorts"), true);
  assert.throws(() => validatePublisherRunMetadata({ ...validRun, path: ".github/workflows/other.yml" }), /canonical/);
  assert.throws(() => validatePublisherRunMetadata({ ...validRun, head_branch: "feature" }), /main branch/);
  assert.throws(() => validatePublisherRunMetadata({ ...validRun, conclusion: "failure" }), /successfully/);
  assert.throws(() => validatePublisherRunMetadata({ ...validRun, event: "pull_request" }), /scheduled or manually/);
  assert.throws(() => validatePublisherRunMetadata(validRun, "someone/else"), /different repository/);
});

test("requires one distinct YouTube upload read-back confirmation for each daily slot", () => {
  assert.equal(countVerifiedUploadOutcomes(threeUploads), 3);
  assert.equal(assertThreeVerifiedUploadOutcomes(threeUploads), 3);
  assert.throws(
    () => assertThreeVerifiedUploadOutcomes(threeUploads.split("\\n").slice(0, 2).join("\\n")),
    /found 2 distinct slot tags/,
  );

  const repeatedMorning = [
    "[UPLOAD VERIFIED] pp365_job_20261110_morning: YouTube upload and schedule verified!",
    "[UPLOAD VERIFIED] pp365_job_20261110_morning: YouTube upload and schedule verified!",
    "[UPLOAD VERIFIED] pp365_job_20261110_morning: YouTube upload and schedule verified!",
  ].join("\\n");
  assert.equal(countVerifiedUploadOutcomes(repeatedMorning), 1);
  assert.throws(() => assertThreeVerifiedUploadOutcomes(repeatedMorning), /found 1 distinct slot tags/);

  const mixedDates = [
    "[UPLOAD VERIFIED] pp365_job_20261110_morning: YouTube upload and schedule verified!",
    "[UPLOAD VERIFIED] pp365_job_20261110_afternoon: YouTube upload and schedule verified!",
    "[UPLOAD VERIFIED] pp365_job_20261111_evening: YouTube upload and schedule verified!",
  ].join("\\n");
  assert.throws(() => assertThreeVerifiedUploadOutcomes(mixedDates), /one Panchang date/);

  // Repeated log fragments for the same three deterministic slot tags do not inflate the count.
  assert.equal(assertThreeVerifiedUploadOutcomes(threeUploads + "\\n" + threeUploads), 3);
});

test("publisher success logs include the deterministic date-and-slot tag", () => {
  const pipeline = readFileSync(path.join(repositoryRoot, "src", "pipeline.js"), "utf8");
  assert.match(pipeline, /\\[UPLOAD VERIFIED\\] \\$\\{jobTag\\}: YouTube upload and schedule verified!/);
});

test("counts idempotently reused uploads only when their deterministic slot tag is present", () => {
  const mixed = [
    "[UPLOAD VERIFIED] pp365_job_20261110_morning: YouTube upload and schedule verified!",
    "[UPLOAD VERIFIED] pp365_job_20261110_afternoon: YouTube upload and schedule verified!",
    "[IDEMPOTENCY] Existing upload found for pp365_job_20261110_evening; skipping duplicate.",
  ].join("\\n");
  assert.equal(assertThreeVerifiedUploadOutcomes(mixed), 3);
  assert.equal(countVerifiedUploadOutcomes("[IDEMPOTENCY] Existing upload found for arbitrary-job; skipping duplicate."), 0);
});

test("verifies run metadata, successful publisher job and read-back log before allowing distribution", async () => {
  const responses = [
    { ok: true, json: async () => validRun },
    { ok: true, json: async () => ({ jobs: [{ id: 456, name: "render-and-publish", conclusion: "success" }] }) },
  ];
  let logRead = false;
  const result = await verifyPublisherSourceRun({
    repository: "Winplaybox/daily-devotional-shorts",
    runId: "123456",
    expectedRunNumber: "12",
    token: "test-token",
    fetchImpl: async () => responses.shift(),
    readLogs: async () => { logRead = true; return threeUploads; },
  });
  assert.equal(logRead, true);
  assert.deepEqual(result, {
    runId: "123456",
    runNumber: 12,
    event: "schedule",
    jobId: 456,
    verifiedUploads: 3,
  });
});

test("rejects a mismatched run number before reading logs", async () => {
  let logRead = false;
  const responses = [{ ok: true, json: async () => validRun }];
  await assert.rejects(
    () => verifyPublisherSourceRun({
      repository: "Winplaybox/daily-devotional-shorts",
      runId: "123456",
      expectedRunNumber: "99",
      token: "test-token",
      fetchImpl: async () => responses.shift(),
      readLogs: async () => { logRead = true; return threeUploads; },
    }),
    /does not match/,
  );
  assert.equal(logRead, false);
});
