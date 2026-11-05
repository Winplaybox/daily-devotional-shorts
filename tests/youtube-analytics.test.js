import test from 'node:test';
import assert from 'node:assert/strict';
import { getAnalyticsDateRange } from '../src/youtube/analytics-report.js';

test('analytics date range includes the requested number of completed UTC days', () => {
  assert.deepEqual(
    getAnalyticsDateRange(new Date('2026-11-06T18:00:00.000Z'), 28),
    { startDate: '2026-10-09', endDate: '2026-11-05' },
  );
});

test('analytics date range handles month and year boundaries', () => {
  assert.deepEqual(
    getAnalyticsDateRange(new Date('2026-01-01T03:00:00.000Z'), 1),
    { startDate: '2025-12-31', endDate: '2025-12-31' },
  );
});

test('analytics date range rejects unsupported windows', () => {
  assert.throws(() => getAnalyticsDateRange(new Date(), 0), RangeError);
  assert.throws(() => getAnalyticsDateRange(new Date(), 91), RangeError);
});
