// Durable analytics history: daily rows, rolling 7/28/90-day windows and milestone log.
// Pure functions so the numbers can be unit-tested without touching YouTube or git.

export const SUBSCRIBER_MILESTONES = [100, 500, 1000, 5000, 10000, 100000];
export const VIEW_MILESTONES = [10_000, 100_000, 1_000_000, 10_000_000];
export const WATCH_HOUR_STEP = 500;

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Upsert report daily rows (keyed by day) into the stored history rows. */
export function mergeDailyHistory(existing = [], incoming = []) {
  const byDay = new Map(existing.map((row) => [row.day, row]));
  for (const row of incoming) {
    if (!row?.day) continue;
    byDay.set(row.day, {
      day: row.day,
      views: num(row.views),
      engagedViews: row.engagedViews === undefined ? '' : num(row.engagedViews),
      estimatedMinutesWatched: num(row.estimatedMinutesWatched),
      averageViewDuration: row.averageViewDuration === undefined ? '' : num(row.averageViewDuration),
      subscribersGained: num(row.subscribersGained),
      subscribersLost: num(row.subscribersLost),
    });
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function rollingWindow(rows, endDay, days) {
  const end = Date.parse(endDay + 'T00:00:00Z');
  const start = end - (days - 1) * 86_400_000;
  const inWindow = rows.filter((row) => {
    const t = Date.parse(row.day + 'T00:00:00Z');
    return t >= start && t <= end;
  });
  const sum = (key) => inWindow.reduce((total, row) => total + num(row[key]), 0);
  return {
    days,
    rowsAvailable: inWindow.length,
    views: sum('views'),
    watchHours: sum('estimatedMinutesWatched') / 60,
    subscribersGained: sum('subscribersGained'),
    netSubscribers: sum('subscribersGained') - sum('subscribersLost'),
  };
}

export function buildSnapshot(rows, endDay, { currentSubscribers = null, shortsViews90d = null } = {}) {
  return {
    day: endDay,
    currentSubscribers: currentSubscribers === null ? '' : num(currentSubscribers),
    window7: rollingWindow(rows, endDay, 7),
    window28: rollingWindow(rows, endDay, 28),
    window90: rollingWindow(rows, endDay, 90),
    shortsViews90d: shortsViews90d === null ? '' : num(shortsViews90d),
  };
}

/**
 * Detect newly reached milestones. A milestone is logged once, with the actual
 * performance at that moment, and flagged analysisPending so it is reviewed
 * (what worked / what failed / next target) rather than just celebrated.
 */
export function detectMilestones(previousLog = [], snapshot) {
  const reached = new Set(previousLog.map((entry) => entry.id));
  const lifetimeViews = snapshot.window90.views;
  const watchHours = snapshot.window90.watchHours;
  const candidates = [];
  const subs = snapshot.currentSubscribers === '' ? null : snapshot.currentSubscribers;
  if (subs !== null) {
    for (const goal of SUBSCRIBER_MILESTONES) candidates.push({ id: 'subs-' + goal, kind: 'subscribers', goal, value: subs });
  }
  for (const goal of VIEW_MILESTONES) candidates.push({ id: 'views90-' + goal, kind: 'views (rolling 90d)', goal, value: lifetimeViews });
  for (let goal = WATCH_HOUR_STEP; goal <= Math.max(watchHours, WATCH_HOUR_STEP); goal += WATCH_HOUR_STEP) {
    candidates.push({ id: 'hours90-' + goal, kind: 'watch hours (rolling 90d)', goal, value: watchHours });
  }
  const fresh = candidates
    .filter((candidate) => candidate.value >= candidate.goal && !reached.has(candidate.id))
    .map((candidate) => ({
      ...candidate,
      reachedOn: snapshot.day,
      performance: {
        views7: snapshot.window7.views,
        views28: snapshot.window28.views,
        views90: snapshot.window90.views,
        watchHours28: Math.round(snapshot.window28.watchHours * 10) / 10,
        netSubscribers28: snapshot.window28.netSubscribers,
      },
      analysisPending: true,
    }));
  return [...previousLog, ...fresh];
}

export function toCsv(rows, columns) {
  const escape = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  return [columns.join(','), ...rows.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\n') + '\n';
}

export function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const split = (line) => [...line.matchAll(/"((?:[^"]|"")*)"|([^,]+)/g)].map((m) => (m[1] ?? m[2]).replaceAll('""', '"'));
  const header = split(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(split(line).map((value, index) => [header[index], value])));
}
