const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429]);
const RETRYABLE_API_REASONS = new Set([
  "backendError",
  "internalError",
  "rateLimitExceeded",
  "userRateLimitExceeded",
]);
const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ETIMEDOUT",
]);

function getApiReason(error) {
  const data = error?.response?.data;
  return data?.error?.errors?.[0]?.reason
    ?? data?.errors?.[0]?.reason
    ?? data?.error?.status
    ?? null;
}

/**
 * Retry only idempotent/read-only YouTube API requests. Upload inserts and
 * other writes must never be blindly retried because their outcome can be
 * ambiguous and a second request could create a duplicate video.
 */
export function isRetryableReadError(error) {
  const status = Number(error?.response?.status ?? error?.status);
  const reason = getApiReason(error);
  return RETRYABLE_HTTP_STATUSES.has(status)
    || (Number.isInteger(status) && status >= 500 && status <= 599)
    || RETRYABLE_API_REASONS.has(reason)
    || RETRYABLE_NETWORK_CODES.has(String(error?.code ?? ""));
}

export async function retryReadOnlyRequest(operation, options = {}) {
  if (typeof operation !== "function") {
    throw new TypeError("A read-only request function is required.");
  }

  const maxAttempts = options.maxAttempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError("maxAttempts must be a positive integer.");
  }
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
    throw new TypeError("baseDelayMs must be a non-negative number.");
  }
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < 0) {
    throw new TypeError("maxDelayMs must be a non-negative number.");
  }
  if (typeof sleep !== "function") {
    throw new TypeError("sleep must be a function.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // Disable Gaxios' internal retry loop so this helper owns the complete attempt budget.
      return await operation({ retry: false });
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryableReadError(error)) throw error;
      const delayMs = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
      await sleep(delayMs);
    }
  }

  throw new Error("Read-only request exhausted its retry budget.");
}


/**
 * Execute a non-idempotent API write once and explicitly disable Gaxios retries.
 * This protects uploads and other POST writes from ambiguous replay after a timeout.
 */
export function writeOnce(operation, requestOptions = {}) {
  if (typeof operation !== "function") {
    throw new TypeError("A write request function is required.");
  }
  if (!requestOptions || typeof requestOptions !== "object" || Array.isArray(requestOptions)) {
    throw new TypeError("Write request options must be an object.");
  }
  return operation({ ...requestOptions, retry: false });
}
