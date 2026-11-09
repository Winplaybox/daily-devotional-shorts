import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  "🎉 YouTube upload and schedule verified!",
  "🎉 YouTube upload and schedule verified!",
  "🎉 YouTube upload and schedule verified!",
].join("\n");

test("Make workflow invokes the existing YouTube source-run verifier entrypoint", () => {
  const workflowPath = path.join(repositoryRoot, ".github", "workflows", "make-social-publisher.yml");
  const verifierPath = path.join(repositoryRoot, "src", "social", "source-run-verifier.js");
  const workflow = readFileSync(workflowPath, "utf8");

  assert.equal(existsSync(verifierPath), true);
  assert.match(workflow, /run:\s*node\s+src\/social\/source-run-verifier\.js/);
  assert.doesNotMatch(workflow, /scripts\/verify-youtube-source-run\.js/);
});

test("accepts only a successful canonical publisher run on main", () => {
  assert.equal(validatePublisherRunMetadata(validRun, "Winplaybox/daily-devotional-shorts"), true);
  assert.throws(() => validatePublisherRunMetadata({ ...validRun, path: ".github/workflows/other.yml" }), /canonical/);
  assert.throws(() => validatePublisherRunMetadata({ ...validRun, head_branch: "feature" }), /main branch/);
  assert.throws(() => validatePublisherRunMetadata({ ...validRun, conclusion: "failure" }), /successfully/);
  assert.throws(() => validatePublisherRunMetadata({ ...validRun, event: "pull_request" }), /scheduled or manually/);
  assert.throws(() => validatePublisherRunMetadata(validRun, "someone/else"), /different repository/);
});

test("counts exactly three YouTube upload read-back confirmations", () => {
  assert.equal(countVerifiedUploadOutcomes(threeUploads), 3);
  assert.equal(assertThreeVerifiedUploadOutcomes(threeUploads), 3);
  assert.throws(() => assertThreeVerifiedUploadOutcomes(threeUploads.split("\n").slice(0, 2).join("\n")), /found 2/);
  assert.throws(() => assertThreeVerifiedUploadOutcomes(threeUploads + "\n" + threeUploads), /found 6/);
});

test("counts idempotently reused uploads only when their deterministic slot tag is present", () => {
  const mixed = [
    "🎉 YouTube upload and schedule verified!",
    "🎉 YouTube upload and schedule verified!",
    "[IDEMPOTENCY] Existing upload found for pp365_job_20261110_evening; skipping duplicate.",
  ].join("\n");
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
