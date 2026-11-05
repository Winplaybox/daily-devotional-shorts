/**
 * Parse explicit YouTube comment commands into validated Panchang request drafts.
 * Parsing is deliberately conservative: no inferred location, date or time.
 */

const COMMANDS = new Set(["panchang", "muhurat", "vrat", "sunrise", "rahu kaal"]);

function normalizeLines(text) {
  return String(text || "").replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
}

function parseDate(value) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (date.getUTCFullYear() !== Number(yyyy) || date.getUTCMonth() !== Number(mm) - 1 || date.getUTCDate() !== Number(dd)) return null;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseTime(value) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minute > 59 || hour > 23 || (meridiem && (hour < 1 || hour > 12))) return null;
  if (meridiem) hour = (hour % 12) + (meridiem === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parsePanchangComment(commentText) {
  const lines = normalizeLines(commentText);
  if (!lines.length) return { matched: false, reason: "empty" };

  const first = lines[0].toLowerCase().replace(/^#/, "").trim();
  if (!COMMANDS.has(first)) return { matched: false, reason: "no-command" };

  const fields = {};
  for (const line of lines.slice(1)) {
    const match = line.match(/^(date|time|location|city|state)\s*:\s*(.+)$/i);
    if (match) fields[match[1].toLowerCase()] = match[2].trim();
  }

  const dateText = fields.date || null;
  const timeText = fields.time || null;
  const date = dateText ? parseDate(dateText) : null;
  const time = timeText ? parseTime(timeText) : null;
  const locationText = fields.location || [fields.city, fields.state].filter(Boolean).join(", ") || null;

  const errors = [];
  if (dateText && !date) errors.push("invalid-date");
  if (timeText && !time) errors.push("invalid-time");
  if (date && !locationText) errors.push("missing-location");
  if (locationText && !date) errors.push("missing-date");

  return {
    matched: true,
    command: first,
    request: {
      contentType: first,
      date,
      time,
      locationText,
      requestedByComment: true,
    },
    missing: [
      ...(!date ? ["date"] : []),
      ...(!locationText ? ["location"] : []),
    ],
    errors,
    readyForResolution: Boolean(date && locationText && errors.length === 0),
  };
}

export function validateRequestWindow(request, now = new Date(), maxDaysAhead = 365) {
  if (!request?.date) return { valid: false, reason: "date-required" };
  const requested = new Date(`${request.date}T00:00:00.000Z`);
  if (Number.isNaN(requested.getTime())) return { valid: false, reason: "invalid-date" };
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Math.floor((requested - today) / 86400000);
  if (days < 0) return { valid: false, reason: "past-date" };
  if (days > maxDaysAhead) return { valid: false, reason: "date-too-far" };
  return { valid: true, daysAhead: days };
}

export function makeRequestKey(request, resolvedLocationId) {
  if (!request?.date || !resolvedLocationId || !request?.contentType) {
    throw new Error("date, contentType and resolvedLocationId are required for deduplication");
  }
  return [request.contentType, request.date, resolvedLocationId, request.time || "all-day"].join(":").toLowerCase();
}

export function buildPublicRequestReply({ status, missing = [], videoUrl = null }) {
  if (status === "needs-details") {
    const details = missing.length ? missing.join(" and ") : "date and location";
    return `Panchang request received 🙏 Please reply with the ${details}. Example: Date: 07-11-2026\\nLocation: Mira Road, Maharashtra. Approved requests are generated as public videos on this channel.`;
  }
  if (status === "queued") {
    return "Your Panchang request has been accepted and added to the generation queue. If approved, the resulting video will be published publicly on this channel. 🙏";
  }
  if (status === "published" && videoUrl) {
    return `Your requested Panchang video is now public: ${videoUrl} 🙏`;
  }
  if (status === "rejected") {
    return "Sorry, we could not process this request. Please check the date and location details and try again. 🙏";
  }
  throw new Error("Unsupported reply status");
}
