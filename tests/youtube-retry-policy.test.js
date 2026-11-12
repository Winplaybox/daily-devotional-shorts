import test from "node:test";
import assert from "node:assert/strict";
import { isRetryableReadError, retryReadOnlyRequest, writeOnce } from "../src/youtube/retry-policy.js";

test("retries transient read-only failures with capped exponential backoff", async () => {
  let calls = 0;
  const delays = [];
  const result = await retryReadOnlyRequest(async () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error("temporary backend error"), { response: { status: 503 } });
    return "ok";
  }, {
    maxAttempts: 4,
    baseDelayMs: 100,
    maxDelayMs: 250,
    sleep: async (milliseconds) => delays.push(milliseconds),
  });

  assert.equal(result, "ok");
  assert.equal(calls, 3);
  assert.deepEqual(delays, [100, 200]);
});

test("disables Gaxios transport retries so the bounded wrapper owns every read attempt", async () => {
  const receivedOptions = [];
  let calls = 0;
  const result = await retryReadOnlyRequest(async (requestOptions) => {
    receivedOptions.push(requestOptions);
    calls += 1;
    if (calls === 1) throw Object.assign(new Error("temporary read failure"), { response: { status: 503 } });
    return "ok";
  }, {
    maxAttempts: 2,
    baseDelayMs: 0,
    maxDelayMs: 0,
    sleep: async () => {},
  });

  assert.equal(result, "ok");
  assert.equal(calls, 2);
  assert.deepEqual(receivedOptions, [{ retry: false }, { retry: false }]);
});

test("does not retry a permanent YouTube upload-limit error", async () => {
  let calls = 0;
  const error = Object.assign(new Error("upload quota exceeded"), {
    response: { status: 403, data: { error: { errors: [{ reason: "uploadLimitExceeded" }] } } },
  });

  await assert.rejects(() => retryReadOnlyRequest(async () => {
    calls += 1;
    throw error;
  }, { sleep: async () => assert.fail("permanent errors must not sleep") }), /upload quota exceeded/);

  assert.equal(calls, 1);
  assert.equal(isRetryableReadError(error), false);
});

test("retries a documented 403 rate-limit response but not arbitrary 403 responses", () => {
  const rateLimit = { response: { status: 403, data: { error: { errors: [{ reason: "userRateLimitExceeded" }] } } } };
  const forbidden = { response: { status: 403, data: { error: { errors: [{ reason: "forbidden" }] } } } };
  assert.equal(isRetryableReadError(rateLimit), true);
  assert.equal(isRetryableReadError(forbidden), false);
});

test("stops after the configured attempt budget", async () => {
  let calls = 0;
  const delays = [];
  await assert.rejects(() => retryReadOnlyRequest(async () => {
    calls += 1;
    throw Object.assign(new Error("still unavailable"), { response: { status: 429 } });
  }, {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    sleep: async (milliseconds) => delays.push(milliseconds),
  }), /still unavailable/);

  assert.equal(calls, 3);
  assert.deepEqual(delays, [100, 200]);
});


test("executes non-idempotent writes once with transport retries explicitly disabled", async () => {
  let calls = 0;
  let receivedOptions;
  const transientFailure = Object.assign(new Error("ambiguous write outcome"), {
    response: { status: 503 },
  });

  await assert.rejects(() => writeOnce(async (options) => {
    calls += 1;
    receivedOptions = options;
    throw transientFailure;
  }, { part: ["snippet"], retry: true }), /ambiguous write outcome/);

  assert.equal(calls, 1);
  assert.equal(receivedOptions.retry, false);
  assert.deepEqual(receivedOptions.part, ["snippet"]);
});
