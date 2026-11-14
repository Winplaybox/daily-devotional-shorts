// Appends the latest analytics report to durable history files.
// Usage: node scripts/analytics-history.mjs <report.json> <history-dir>
import fs from 'node:fs';
import path from 'node:path';
import {
  buildSnapshot, detectMilestones, mergeDailyHistory, parseCsv, toCsv,
} from '../src/youtube/analytics-history.js';

const [reportPath, historyDir = 'history'] = process.argv.slice(2);
if (!reportPath) throw new Error('Usage: analytics-history.mjs <report.json> <history-dir>');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
fs.mkdirSync(historyDir, { recursive: true });

const dailyPath = path.join(historyDir, 'daily.csv');
const snapshotPath = path.join(historyDir, 'snapshots.csv');
const milestonePath = path.join(historyDir, 'milestones.json');
const dailyColumns = ['day', 'views', 'engagedViews', 'estimatedMinutesWatched', 'averageViewDuration', 'subscribersGained', 'subscribersLost'];

const existing = fs.existsSync(dailyPath) ? parseCsv(fs.readFileSync(dailyPath, 'utf8')) : [];
const daily = mergeDailyHistory(existing, report.daily || []);
fs.writeFileSync(dailyPath, toCsv(daily, dailyColumns));

const endDay = report.range.endDate;
const snapshot = buildSnapshot(daily, endDay, {
  currentSubscribers: report.channel?.currentSubscribers ?? null,
  shortsViews90d: report.monetizationProgress?.fullPartner?.shortsViews90d?.current ?? null,
});
const flat = {
  day: snapshot.day,
  currentSubscribers: snapshot.currentSubscribers,
  views7: snapshot.window7.views, views28: snapshot.window28.views, views90: snapshot.window90.views,
  watchHours7: snapshot.window7.watchHours.toFixed(2), watchHours28: snapshot.window28.watchHours.toFixed(2), watchHours90: snapshot.window90.watchHours.toFixed(2),
  netSubscribers28: snapshot.window28.netSubscribers, shortsViews90d: snapshot.shortsViews90d,
};
const snapColumns = Object.keys(flat);
const snaps = (fs.existsSync(snapshotPath) ? parseCsv(fs.readFileSync(snapshotPath, 'utf8')) : []).filter((row) => row.day !== flat.day);
snaps.push(flat);
snaps.sort((a, b) => a.day.localeCompare(b.day));
fs.writeFileSync(snapshotPath, toCsv(snaps, snapColumns));

const previousLog = fs.existsSync(milestonePath) ? JSON.parse(fs.readFileSync(milestonePath, 'utf8')) : [];
const log = detectMilestones(previousLog, snapshot);
fs.writeFileSync(milestonePath, JSON.stringify(log, null, 2) + '\n');
const fresh = log.length - previousLog.length;
console.log(`[HISTORY] ${daily.length} daily rows, snapshot ${flat.day}, ${fresh} new milestone(s).`);
for (const entry of log.slice(previousLog.length)) console.log(`[MILESTONE] ${entry.kind} >= ${entry.goal} reached ${entry.reachedOn} (analysis pending)`);
