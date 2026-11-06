/**
 * Normalize Google OAuth token JSON from the supported local and CI formats.
 * Never log the returned credentials.
 */
export function normalizeGoogleOAuthToken(raw) {
  const candidates = [
    raw,
    raw?.tokens,
    raw?.credentials,
    raw?.oauth2?.credentials,
    raw?.token && typeof raw.token === 'object' ? raw.token : null,
  ].filter(Boolean);
  const token = candidates.find((item) =>
    typeof item === 'object' &&
    (item.access_token || item.refresh_token || (typeof item.token === 'string' && item.token))
  );
  if (!token) {
    throw new Error('Google OAuth token JSON has no usable access_token or refresh_token. Confirm TOKEN_JSON contains the Google OAuth token object, not a Make.com API key.');
  }
  return {
    access_token: token.access_token || (typeof token.token === 'string' ? token.token : undefined),
    refresh_token: token.refresh_token,
    scope: token.scope || (Array.isArray(token.scopes) ? token.scopes.join(' ') : undefined),
    token_type: token.token_type || 'Bearer',
    expiry_date: token.expiry_date || token.expiryDate,
  };
}
