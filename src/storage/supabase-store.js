/**
 * Supabase/PostgREST persistence adapter for durable request and polling state.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-side secret only).
 */
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

function config() {
  for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);
  return {
    base: process.env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1",
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function request(table, { method = "GET", query = "", body, prefer = "return=representation" } = {}) {
  const c = config();
  const response = await fetch(`${c.base}/${table}${query ? `?${query}` : ""}`, {
    method,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${table} failed (${response.status}): ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : [];
}

export async function getPollCursor(cursorName = "channel-comments") {
  const rows = await request("automation_cursors", { query: `name=eq.${encodeURIComponent(cursorName)}&select=name,cursor_value&limit=1` });
  return rows[0]?.cursor_value || null;
}

export async function setPollCursor(cursorName, cursorValue) {
  return request("automation_cursors", {
    method: "POST",
    query: "on_conflict=name",
    prefer: "resolution=merge-duplicates,return=representation",
    body: { name: cursorName, cursor_value: cursorValue, updated_at: new Date().toISOString() },
  });
}

export async function hasProcessedComment(commentId) {
  const rows = await request("processed_youtube_comments", {
    query: `comment_id=eq.${encodeURIComponent(commentId)}&select=comment_id&limit=1`,
  });
  return rows.length > 0;
}

export async function markCommentProcessed(commentId, outcome) {
  return request("processed_youtube_comments", {
    method: "POST",
    query: "on_conflict=comment_id",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: { comment_id: commentId, outcome, processed_at: new Date().toISOString() },
  });
}

export async function countViewerRequests(viewerHash, sinceIso) {
  const rows = await request("panchang_requests", {
    query: `viewer_hash=eq.${encodeURIComponent(viewerHash)}&created_at=gte.${encodeURIComponent(sinceIso)}&select=id`,
  });
  return rows.length;
}

export async function countQueuedRequests() {
  const rows = await request("panchang_requests", {
    query: "status=in.(queued,location_resolved,calculating,rendering,quality_check)&select=id",
  });
  return rows.length;
}

export async function insertRequest(job) {
  const rows = await request("panchang_requests", {
    method: "POST",
    query: "on_conflict=request_key",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: job,
  });
  return rows[0] || null;
}

export async function updateRequestByKey(requestKey, patch) {
  return request("panchang_requests", {
    method: "PATCH",
    query: `request_key=eq.${encodeURIComponent(requestKey)}`,
    body: { ...patch, updated_at: new Date().toISOString() },
  });
}

export async function listDueJobs(limit = 5) {
  return request("panchang_requests", {
    query: `status=eq.queued&order=priority.desc,created_at.asc&limit=${Math.max(1, Math.min(25, limit))}`,
  });
}
