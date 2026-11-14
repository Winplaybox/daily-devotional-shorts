// Pure scheduling/timing helpers for the weekly long-form pipeline.

const IST_OFFSET_MIN = 330;
const DAY_MS = 86_400_000;

/** Next Monday (strictly after today) as YYYY-MM-DD in IST, or an explicit Monday override. */
export function resolveWeekStart(now = new Date(), override = '') {
  if (override) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) throw new Error('WEEK_START must be YYYY-MM-DD.');
    const d = new Date(`${override}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== override) throw new Error('WEEK_START is not a real date.');
    if (d.getUTCDay() !== 1) throw new Error('WEEK_START must be a Monday.');
    return override;
  }
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  const todayUtcMidnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  const weekday = new Date(todayUtcMidnight).getUTCDay(); // 0=Sun..6=Sat
  const daysAhead = ((8 - weekday) % 7) || 7;
  return new Date(todayUtcMidnight + daysAhead * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Publish on the Sunday before the week starts at 18:00 IST. If that moment is
 * already (nearly) past - e.g. a late manual run - publish 60 minutes from now.
 */
export function resolveWeeklyPublishAt(weekStart, now = new Date(), override = '') {
  if (override) {
    const parsed = new Date(override);
    if (Number.isNaN(parsed.getTime())) throw new Error('WEEKLY_PUBLISH_AT must be an ISO-8601 timestamp.');
    return parsed;
  }
  const mondayUtc = Date.parse(`${weekStart}T00:00:00Z`);
  const sunday1800Ist = mondayUtc - DAY_MS + 18 * 3_600_000 - IST_OFFSET_MIN * 60_000;
  const earliest = now.getTime() + 30 * 60_000;
  return new Date(sunday1800Ist >= earliest ? sunday1800Ist : now.getTime() + 60 * 60_000);
}

/**
 * Cumulative scene timing. Frame starts are rounded from cumulative seconds so
 * audio and picture cannot drift apart by more than a frame over the video.
 */
export function computeSceneTiming(durationsSeconds, { gapSeconds = 0.45, tailSeconds = 1.2, fps = 30 } = {}) {
  const startsSeconds = [];
  let cursor = 0;
  durationsSeconds.forEach((duration, i) => {
    startsSeconds.push(cursor);
    cursor += duration + (i === durationsSeconds.length - 1 ? tailSeconds : gapSeconds);
  });
  const startFrames = startsSeconds.map((s) => Math.round(s * fps));
  const totalFrames = Math.round(cursor * fps);
  const frames = startFrames.map((start, i) => (i === startFrames.length - 1 ? totalFrames : startFrames[i + 1]) - start);
  return { startsSeconds, frames, totalFrames, totalSeconds: cursor };
}
