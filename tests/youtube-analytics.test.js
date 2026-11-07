import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnalyticsQueries,
  buildAnalyticsSummary,
  getAnalyticsDateRange,
} from '../src/youtube/analytics-report.js';

test('analytics date range uses completed Pacific Time days', () => {
  assert.deepEqual(
    getAnalyticsDateRange(new Date('2026-11-06T18:00:00.000Z'), 28),
    { startDate: '2026-10-09', endDate: '2026-11-05' },
  );
});

test('analytics date range does not include a partial Pacific day near UTC midnight', () => {
  assert.deepEqual(
    getAnalyticsDateRange(new Date('2026-11-07T03:00:00.000Z'), 28),
    { startDate: '2026-10-09', endDate: '2026-11-05' },
  );
});

test('analytics date range handles Pacific DST and month/year boundaries', () => {
  assert.deepEqual(
    getAnalyticsDateRange(new Date('2026-01-01T03:00:00.000Z'), 1),
    { startDate: '2025-12-30', endDate: '2025-12-30' },
  );
  assert.deepEqual(
    getAnalyticsDateRange(new Date('2026-03-09T07:00:00.000Z'), 1),
    { startDate: '2026-03-07', endDate: '2026-03-07' },
  );
});

test('analytics date range rejects unsupported windows', () => {
  assert.throws(() => getAnalyticsDateRange(new Date(), 0), RangeError);
  assert.throws(() => getAnalyticsDateRange(new Date(), 91), RangeError);
});

test('analytics queries include Shorts classification, retention and traffic sources', () => {
  const queries = buildAnalyticsQueries({ startDate: '2026-10-09', endDate: '2026-11-05' });
  assert.match(queries.daily.metrics, /engagedViews/);
  assert.match(queries.daily.metrics, /averageViewPercentage/);
  assert.equal(queries.videos.dimensions, 'video,creatorContentType');
  assert.match(queries.videos.metrics, /averageViewPercentage/);
  assert.equal(queries.trafficSources.dimensions, 'insightTrafficSourceType');
  assert.match(queries.trafficSources.metrics, /estimatedMinutesWatched/);
  assert.match(queries.revenue.metrics, /estimatedRevenue/);
});

test('analytics summary separates Shorts, computes watch hours and ranks top/weak Shorts', () => {
  const summary = buildAnalyticsSummary({
    daily: [
      { views: '300', engagedViews: '180', estimatedMinutesWatched: '90', subscribersGained: '5', subscribersLost: '1', averageViewDuration: '18', averageViewPercentage: '90' },
      { views: '100', engagedViews: '50', estimatedMinutesWatched: '30', subscribersGained: '2', subscribersLost: '0', averageViewDuration: '12', averageViewPercentage: '60' },
    ],
    videos: [
      { video: 'top', creatorContentType: 'SHORTS', views: '200', engagedViews: '150' },
      { video: 'weak', creatorContentType: 'SHORTS', views: '20', engagedViews: '5' },
      { video: 'long', creatorContentType: 'VIDEO_ON_DEMAND', views: '1000', engagedViews: '700' },
    ],
    trafficSources: [
      { insightTrafficSourceType: 'SHORTS', views: '240' },
      { insightTrafficSourceType: 'YT_SEARCH', views: '30' },
    ],
    revenue: null,
    currentSubscribers: '146',
  });

  assert.equal(summary.totalViews, 400);
  assert.equal(summary.engagedViews, 230);
  assert.equal(summary.watchHours, 2);
  assert.equal(summary.subscribersGained, 7);
  assert.equal(summary.subscribersLost, 1);
  assert.equal(summary.netSubscribers, 6);
  assert.equal(summary.currentSubscribers, 146);
  assert.equal(summary.averageViewDurationSeconds, 16.5);
  assert.equal(summary.averageViewPercentage, 82.5);
  assert.equal(summary.shortsFeedViews, 240);
  assert.equal(summary.shortsCount, 2);
  assert.equal(summary.topShorts[0].video, 'top');
  assert.equal(summary.weakShorts[0].video, 'weak');
  assert.equal(summary.estimatedRevenue, null);
});
