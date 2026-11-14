import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeDailyHistory, rollingWindow, buildSnapshot, detectMilestones, parseCsv, toCsv,
} from '../src/youtube/analytics-history.js';
import { classifyShorts, isoDurationSeconds, buildMonetizationProgress, buildAnalyticsFallbackQueries } from '../src/youtube/analytics-report.js';

const day = (d, views, minutes = 0, gained = 0, lost = 0) => ({ day: d, views, estimatedMinutesWatched: minutes, subscribersGained: gained, subscribersLost: lost });

test('daily history upserts by day and stays sorted (idempotent re-runs)', () => {
  const first = mergeDailyHistory([], [day('2026-11-02', 10), day('2026-11-01', 5)]);
  const again = mergeDailyHistory(first, [day('2026-11-02', 12)]);
  assert.deepEqual(again.map((r) => [r.day, r.views]), [['2026-11-01', 5], ['2026-11-02', 12]]);
});

test('rolling windows include exactly N days ending on the end day', () => {
  const rows = mergeDailyHistory([], Array.from({ length: 10 }, (_, i) => day(`2026-11-${String(i + 1).padStart(2, '0')}`, 100, 60, 2, 1)));
  const w7 = rollingWindow(rows, '2026-11-10', 7);
  assert.equal(w7.rowsAvailable, 7);
  assert.equal(w7.views, 700);
  assert.equal(w7.watchHours, 7);
  assert.equal(w7.netSubscribers, 7);
});

test('milestones are logged once with performance snapshot and pending analysis', () => {
  const rows = mergeDailyHistory([], [day('2026-11-20', 120_000, 60 * 600, 300, 10)]);
  const snap = buildSnapshot(rows, '2026-11-20', { currentSubscribers: 520 });
  const log = detectMilestones([], snap);
  const ids = log.map((e) => e.id);
  assert.ok(ids.includes('subs-100') && ids.includes('subs-500'));
  assert.ok(!ids.includes('subs-1000'));
  assert.ok(ids.includes('views90-10000') && ids.includes('views90-100000'));
  assert.ok(ids.includes('hours90-500'));
  assert.ok(log.every((e) => e.analysisPending === true && e.performance));
  assert.equal(detectMilestones(log, snap).length, log.length, 'second run adds nothing');
});

test('csv round trip keeps quotes and commas', () => {
  const rows = [{ a: 'x,"y"', b: '2' }];
  assert.deepEqual(parseCsv(toCsv(rows, ['a', 'b'])), rows);
});

test('Shorts classification prefers the API value and labels inferred rows', () => {
  const api = classifyShorts([{ video: 'a', creatorContentType: 'SHORTS' }, { video: 'b', creatorContentType: 'VIDEO_ON_DEMAND' }]);
  assert.equal(api.method, 'api-creatorContentType');
  const inferred = classifyShorts([{ video: 'a', duration: 'PT45S' }, { video: 'b', duration: 'PT8M10S' }]);
  assert.equal(inferred.method, 'inferred-from-duration');
  assert.equal(inferred.rows[0].creatorContentType, 'SHORTS');
  assert.equal(inferred.rows[0].shortsClassification, 'inferred-from-duration');
  assert.equal(inferred.rows[1].creatorContentType, undefined);
  assert.equal(isoDurationSeconds('PT1M5S'), 65);
});

test('fallback video queries try content type before dropping it', () => {
  const fallbacks = buildAnalyticsFallbackQueries({ startDate: 'a', endDate: 'b' }).videos;
  assert.equal(fallbacks[0].dimensions, 'video,creatorContentType');
  assert.equal(fallbacks[1].dimensions, 'video');
});

test('monetization progress reports distance without claiming eligibility', () => {
  const p = buildMonetizationProgress({ subscribers: 250, shortsViews90d: 1_500_000, longFormWatchHours90d: 600 });
  assert.equal(p.earlyAccess.subscribers.percent, 50);
  assert.equal(p.earlyAccess.shortsViews90d.percent, 50);
  assert.equal(p.fullPartner.longFormWatchHours90d.percent, 15);
  assert.equal(buildMonetizationProgress().fullPartner.subscribers.percent, null);
});
