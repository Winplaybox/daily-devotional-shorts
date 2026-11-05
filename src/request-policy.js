/**
 * Pure request-admission policy. Persistent storage, YouTube polling and publishing
 * are adapters supplied by the deployment layer; this module never uploads itself.
 */
import { makeRequestKey, validateRequestWindow } from "./request-parser.js";

export const DEFAULT_REQUEST_LIMITS = Object.freeze({
  maxRequestsPerChannelPerDay: 3,
  maxQueuedRequests: 100,
  maxDaysAhead: 365,
  maxLocationTextLength: 120,
  maxCommentLength: 1000,
});

export function assessCommentRequest({ parsed, commentText, channelKey, dailyCount = 0,
  queuedCount = 0, existingKeys = new Set(), now = new Date(), limits = DEFAULT_REQUEST_LIMITS }) {
  if (!parsed?.matched) return { accepted: false, status: "ignored", reason: "no-command" };
  if (String(commentText || "").length > limits.maxCommentLength) {
    return { accepted: false, status: "rejected", reason: "comment-too-long" };
  }
  if (parsed.errors?.length) return { accepted: false, status: "needs-details", reason: parsed.errors[0], missing: parsed.missing };
  if (!parsed.readyForResolution) return { accepted: false, status: "needs-details", reason: "missing-fields", missing: parsed.missing };
  if (!channelKey) return { accepted: false, status: "rejected", reason: "missing-requester-key" };
  if (String(parsed.request.locationText || "").length > limits.maxLocationTextLength) {
    return { accepted: false, status: "rejected", reason: "location-too-long" };
  }
  const window = validateRequestWindow(parsed.request, now, limits.maxDaysAhead);
  if (!window.valid) return { accepted: false, status: "rejected", reason: window.reason };
  if (dailyCount >= limits.maxRequestsPerChannelPerDay) return { accepted: false, status: "rate-limited", reason: "daily-request-limit" };
  if (queuedCount >= limits.maxQueuedRequests) return { accepted: false, status: "rate-limited", reason: "queue-capacity" };

  // Location must be resolved against a trusted India location provider/registry first.
  return { accepted: true, status: "awaiting-location-resolution", request: parsed.request, channelKey };
}

export function finalizeResolvedRequest({ admission, resolvedLocation, existingKeys = new Set() }) {
  if (!admission?.accepted) return admission || { accepted: false, status: "rejected", reason: "not-admitted" };
  if (!resolvedLocation?.location_id || !resolvedLocation?.city || !resolvedLocation?.state ||
      !Number.isFinite(resolvedLocation.latitude) || !Number.isFinite(resolvedLocation.longitude)) {
    return { accepted: false, status: "needs-details", reason: "location-not-resolved" };
  }
  if (resolvedLocation.country && resolvedLocation.country !== "India") {
    return { accepted: false, status: "rejected", reason: "outside-supported-region" };
  }
  const key = makeRequestKey(admission.request, resolvedLocation.location_id);
  if (existingKeys.has(key)) return { accepted: false, status: "duplicate", reason: "duplicate-request", requestKey: key };
  return {
    accepted: true,
    status: "queued",
    requestKey: key,
    publishVisibility: "public",
    request: admission.request,
    location: resolvedLocation,
    workflow: ["calculate", "validate", "script", "render", "quality-check", "public-publish"],
  };
}
