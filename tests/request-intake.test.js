import test from "node:test";
import assert from "node:assert/strict";
import { parsePanchangComment, validateRequestWindow, makeRequestKey } from "../src/request-parser.js";
import { assessCommentRequest, finalizeResolvedRequest } from "../src/request-policy.js";

test("bare panchang command asks for date and location", () => {
  const parsed = parsePanchangComment("panchang");
  assert.equal(parsed.matched, true);
  assert.deepEqual(parsed.missing, ["date", "location"]);
  assert.equal(parsed.readyForResolution, false);
});

test("parses date, time and locality without inventing missing values", () => {
  const parsed = parsePanchangComment("panchang\nDate: 07-11-2026\nTime: 3:13 PM\nLocation: Mira Road, Maharashtra");
  assert.equal(parsed.request.date, "2026-11-07");
  assert.equal(parsed.request.time, "15:13");
  assert.equal(parsed.request.locationText, "Mira Road, Maharashtra");
  assert.equal(parsed.readyForResolution, true);
});

test("rejects impossible calendar dates and malformed times", () => {
  assert.ok(parsePanchangComment("panchang\nDate: 31-02-2026\nLocation: Mumbai").errors.includes("invalid-date"));
  assert.ok(parsePanchangComment("panchang\nDate: 07-11-2026\nTime: 29:90\nLocation: Mumbai").errors.includes("invalid-time"));
});

test("rejects past dates and dates beyond request horizon", () => {
  const now = new Date("2026-11-06T00:00:00Z");
  assert.equal(validateRequestWindow({ date: "2026-11-05" }, now).reason, "past-date");
  assert.equal(validateRequestWindow({ date: "2028-01-01" }, now).reason, "date-too-far");
});

test("requires explicit command and enforces per-viewer daily limits", () => {
  const parsed = parsePanchangComment("panchang\nDate: 07-11-2026\nLocation: Mira Road, Maharashtra");
  assert.equal(assessCommentRequest({ parsed, commentText: "x", channelKey: "hash", dailyCount: 3 }).reason, "daily-request-limit");
  assert.equal(parsePanchangComment("hello everyone").matched, false);
});

test("queues public video only after trusted location resolution", () => {
  const parsed = parsePanchangComment("panchang\nDate: 07-11-2026\nLocation: Mira Road, Maharashtra");
  const admission = assessCommentRequest({ parsed, commentText: "panchang", channelKey: "opaque-key", now: new Date("2026-11-06T00:00:00Z") });
  assert.equal(admission.status, "awaiting-location-resolution");
  const resolved = finalizeResolvedRequest({ admission, resolvedLocation: {
    location_id: "miraroad", city: "Mira Road", state: "Maharashtra", country: "India",
    latitude: 19.2813, longitude: 72.8694,
  }});
  assert.equal(resolved.publishVisibility, "public");
  assert.equal(resolved.status, "queued");
});

test("deduplicates the same content, date, location and time", () => {
  const key = makeRequestKey({ contentType: "panchang", date: "2026-11-07" }, "miraroad");
  const result = finalizeResolvedRequest({
    admission: { accepted: true, request: { contentType: "panchang", date: "2026-11-07" } },
    resolvedLocation: { location_id: "miraroad", city: "Mira Road", state: "Maharashtra", latitude: 19.28, longitude: 72.87 },
    existingKeys: new Set([key]),
  });
  assert.equal(result.status, "duplicate");
});
