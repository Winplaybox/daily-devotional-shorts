import fs from "node:fs";
import path from "node:path";

const VALID_STATUSES = new Set([
  "pending",
  "upload_verified",
  "reused",
  "failed",
  "not_attempted",
]);

/**
 * A durable, artifact-friendly snapshot of the three slot outcomes.
 * "upload_verified" means YouTube API read-back succeeded; it does not mean
 * the scheduled video has become publicly visible.
 */
export function createPublishLedger({ panchangDate = null, slots, createdAt = new Date().toISOString() }) {
  if (panchangDate !== null && !/^\\d{4}-\\d{2}-\\d{2}$/.test(String(panchangDate))) {
    throw new TypeError("panchangDate must use YYYY-MM-DD or be null.");
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new TypeError("At least one publish slot is required.");
  }

  const seen = new Set();
  const normalizedSlots = slots.map((slot) => {
    if (!slot || typeof slot.slot !== "string" || !slot.slot.trim()) {
      throw new TypeError("Each publish slot must have a non-empty slot name.");
    }
    if (seen.has(slot.slot)) throw new TypeError("Duplicate publish slot: " + slot.slot);
    seen.add(slot.slot);
    if (!Number.isFinite(slot.durationSeconds) || slot.durationSeconds <= 0) {
      throw new TypeError("Invalid duration for publish slot: " + slot.slot);
    }
    return {
      slot: slot.slot,
      durationSeconds: slot.durationSeconds,
      publishAt: slot.publishAt ?? null,
      status: "pending",
      videoId: null,
      url: null,
      privacyStatus: null,
      error: null,
      reason: null,
      blockedBy: null,
    };
  });

  return {
    schemaVersion: 1,
    panchangDate,
    createdAt,
    updatedAt: createdAt,
    slots: normalizedSlots,
  };
}

export function updatePublishLedgerSlot(ledger, slotName, updates, updatedAt = new Date().toISOString()) {
  if (!ledger || !Array.isArray(ledger.slots) || !updates || typeof updates !== "object") {
    throw new TypeError("A valid ledger and slot update are required.");
  }
  if (!VALID_STATUSES.has(updates.status)) {
    throw new TypeError("Unsupported publish ledger status: " + updates.status);
  }
  const allowedFields = new Set([
    "status", "videoId", "url", "privacyStatus", "publishAt", "error", "reason", "blockedBy",
  ]);
  for (const key of Object.keys(updates)) {
    if (!allowedFields.has(key)) throw new TypeError("Unsupported publish ledger field: " + key);
  }

  let found = false;
  const slots = ledger.slots.map((entry) => {
    if (entry.slot !== slotName) return entry;
    found = true;
    return { ...entry, ...updates };
  });
  if (!found) throw new Error("Publish ledger does not contain slot: " + slotName);
  return { ...ledger, updatedAt, slots };
}

export function markPendingSlotsNotAttempted(ledger, reason, updatedAt = new Date().toISOString()) {
  return {
    ...ledger,
    updatedAt,
    slots: ledger.slots.map((entry) => entry.status === "pending"
      ? { ...entry, status: "not_attempted", reason: String(reason).slice(0, 300) }
      : entry),
  };
}

export function markRemainingSlotsNotAttempted(ledger, failedSlot, reason, updatedAt = new Date().toISOString()) {
  const failedIndex = ledger.slots.findIndex((entry) => entry.slot === failedSlot);
  if (failedIndex < 0) throw new Error("Publish ledger does not contain slot: " + failedSlot);
  return {
    ...ledger,
    updatedAt,
    slots: ledger.slots.map((entry, index) => index > failedIndex && entry.status === "pending"
      ? { ...entry, status: "not_attempted", reason: String(reason).slice(0, 300), blockedBy: failedSlot }
      : entry),
  };
}

export function serializePublishError(error) {
  const responseData = error?.response?.data;
  const apiError = responseData?.error ?? responseData ?? {};
  const httpStatus = Number(error?.response?.status ?? error?.status);
  const message = String(error?.message ?? "Unknown publish error")
    .replace(/Bearer\\s+[^\\s]+/gi, "Bearer [REDACTED]")
    .replace(/(access_token|refresh_token|client_secret)\\s*[:=]\\s*[^,\\s]+/gi, "$1=[REDACTED]")
    .slice(0, 500);

  return {
    name: String(error?.name ?? "Error").slice(0, 80),
    code: error?.code === undefined || error?.code === null ? null : String(error.code).slice(0, 80),
    httpStatus: Number.isFinite(httpStatus) ? httpStatus : null,
    reason: apiError?.errors?.[0]?.reason ?? apiError?.status ?? null,
    message,
  };
}

export function writePublishLedger(filePath, ledger) {
  if (typeof filePath !== "string" || !filePath) throw new TypeError("A ledger file path is required.");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = filePath + "." + process.pid + ".tmp";
  fs.writeFileSync(temporaryPath, JSON.stringify(ledger, null, 2) + "\\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(temporaryPath, filePath);
  return filePath;
}
