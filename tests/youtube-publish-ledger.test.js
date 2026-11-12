import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createPublishLedger,
  markPendingSlotsNotAttempted,
  markRemainingSlotsNotAttempted,
  serializePublishError,
  updatePublishLedgerSlot,
  writePublishLedger,
} from "../src/youtube/publish-ledger.js";

const slotPlan = [
  { slot: "morning", durationSeconds: 40, publishAt: "2026-11-15T01:30:00.000Z" },
  { slot: "afternoon", durationSeconds: 40, publishAt: "2026-11-15T07:00:00.000Z" },
  { slot: "evening", durationSeconds: 60, publishAt: "2026-11-15T13:30:00.000Z" },
];

test("creates a pending ledger with the exact slot schedule", () => {
  const ledger = createPublishLedger({
    panchangDate: "2026-11-15",
    slots: slotPlan,
    createdAt: "2026-11-12T03:00:00.000Z",
  });

  assert.equal(ledger.panchangDate, "2026-11-15");
  assert.deepEqual(ledger.slots.map(({ slot, status, publishAt }) => ({ slot, status, publishAt })), [
    { slot: "morning", status: "pending", publishAt: "2026-11-15T01:30:00.000Z" },
    { slot: "afternoon", status: "pending", publishAt: "2026-11-15T07:00:00.000Z" },
    { slot: "evening", status: "pending", publishAt: "2026-11-15T13:30:00.000Z" },
  ]);
});

test("records verified uploads and marks later slots not attempted after a failure", () => {
  let ledger = createPublishLedger({ panchangDate: "2026-11-15", slots: slotPlan });
  ledger = updatePublishLedgerSlot(ledger, "morning", {
    status: "upload_verified",
    videoId: "video-1",
    privacyStatus: "private",
    publishAt: slotPlan[0].publishAt,
  });
  ledger = updatePublishLedgerSlot(ledger, "afternoon", {
    status: "failed",
    error: { reason: "uploadLimitExceeded", httpStatus: 403 },
  });
  ledger = markRemainingSlotsNotAttempted(ledger, "afternoon", "publisher stopped after prior slot failure");

  assert.equal(ledger.slots[0].status, "upload_verified");
  assert.equal(ledger.slots[1].status, "failed");
  assert.equal(ledger.slots[2].status, "not_attempted");
  assert.equal(ledger.slots[2].blockedBy, "afternoon");
});

test("marks every pending slot not attempted when publishing preflight fails", () => {
  const ledger = createPublishLedger({ panchangDate: "2026-11-15", slots: slotPlan });
  const result = markPendingSlotsNotAttempted(ledger, "OAuth preflight failed");
  assert.deepEqual(result.slots.map((entry) => entry.status), ["not_attempted", "not_attempted", "not_attempted"]);
});

test("serializes quota failures without storing raw response payloads", () => {
  const error = Object.assign(new Error("YouTube upload quota exceeded"), {
    code: 403,
    response: { status: 403, data: { error: { errors: [{ reason: "uploadLimitExceeded" }] } } },
  });
  const result = serializePublishError(error);
  assert.equal(result.httpStatus, 403);
  assert.equal(result.reason, "uploadLimitExceeded");
  assert.equal(result.message, "YouTube upload quota exceeded");
  assert.equal("response" in result, false);
});

test("writes a JSON ledger atomically to the artifact directory", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pp365-ledger-"));
  try {
    const filePath = path.join(directory, "out", "publish-ledger.json");
    const ledger = createPublishLedger({ panchangDate: "2026-11-15", slots: slotPlan });
    assert.equal(writePublishLedger(filePath, ledger), filePath);
    const stored = JSON.parse(fs.readFileSync(filePath, "utf8"));
    assert.equal(stored.schemaVersion, 1);
    assert.equal(stored.slots.length, 3);
    assert.equal(fs.existsSync(filePath + "." + process.pid + ".tmp"), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
