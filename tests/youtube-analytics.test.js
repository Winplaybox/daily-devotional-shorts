import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessDailyCoverage,
  assessMetricCoverage,
  buildAnalyticsQueries,
  buildAnalyticsSummary,
  getAnalyticsDateRange,
  queryAnalyticsReport,
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
    { startDate: '2026-03-08', endDate: '2026-03-08' },
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
  assert.equal(queries.trafficSources.sort, undefined);
  assert.match(queries.revenue.metrics, /estimatedRevenue/);
});


test('analytics report failures identify the failing report and preserve HTTP status', async () => {
  const apiError = new Error('The query is not supported.');
  apiError.response = {
    status: 400,
    data: { error: { message: 'The query is not supported.' } },
  };
  const analytics = {
    reports: {
      query: async () => { throw apiError; },
    },
  };

  await assert.rejects(
    queryAnalyticsReport(analytics, 'trafficSources', { dimensions: 'insightTrafficSourceType' }),
    (error) => {
      assert.match(error.message, /trafficSources/);
      assert.match(error.message, /HTTP 400/);
      assert.equal(error.response.status, 400);
      return true;
    },
  );
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


test('analytics totals preserve unavailable values instead of converting them to zero', () => {
  const summary = buildAnalyticsSummary({
    daily: [{
      views: null,
      engagedViews: null,
      estimatedMinutesWatched: null,
      subscribersGained: null,
      subscribersLost: null,
      averageViewDuration: null,
      averageViewPercentage: null,
    }],
    videos: [{ video: 'unknown', creatorContentType: 'SHORTS', views: null, engagedViews: null }],
    trafficSources: [],
    revenue: null,
    currentSubscribers: '0',
  });

  assert.equal(summary.totalViews, null);
  assert.equal(summary.engagedViews, null);
  assert.equal(summary.watchHours, null);
  assert.equal(summary.subscribersGained, null);
  assert.equal(summary.subscribersLost, null);
  assert.equal(summary.netSubscribers, null);
  assert.equal(summary.averageViewDurationSeconds, null);
  assert.equal(summary.averageViewPercentage, null);
  assert.equal(summary.currentSubscribers, 0);
  assert.equal(summary.topShorts.length, 0);
  assert.equal(summary.weakShorts.length, 0);
});

test('analytics parser treats whitespace and non-scalar values as unavailable', () => {
  const summary = buildAnalyticsSummary({
    daily: [{
      views: '  ',
      engagedViews: ' ',
      estimatedMinutesWatched: ' ',
      subscribersGained: ' ',
      subscribersLost: ' ',
      averageViewDuration: ' ',
      averageViewPercentage: ' ',
    }],
    videos: [
      { video: 'blank', creatorContentType: 'SHORTS', views: ' ', engagedViews: ' ' },
      { video: 'fallback', creatorContentType: 'SHORTS', views: '4', engagedViews: ' ' },
    ],
    trafficSources: [{ insightTrafficSourceType: 'SHORTS', views: '  ' }],
    revenue: null,
    currentSubscribers: ' ',
  });

  assert.equal(summary.totalViews, null);
  assert.equal(summary.engagedViews, null);
  assert.equal(summary.watchHours, null);
  assert.equal(summary.subscribersGained, null);
  assert.equal(summary.subscribersLost, null);
  assert.equal(summary.netSubscribers, null);
  assert.equal(summary.averageViewDurationSeconds, null);
  assert.equal(summary.averageViewPercentage, null);
  assert.equal(summary.currentSubscribers, null);
  assert.equal(summary.shortsFeedViews, null);
  assert.deepEqual(summary.topShorts.map((row) => row.video), ['fallback']);
  assert.deepEqual(summary.weakShorts.map((row) => row.video), ['fallback']);

  const coverage = assessMetricCoverage([{ views: '  ' }, { views: '0' }], ['views']);
  assert.deepEqual(coverage.views, {
    availableRows: 1,
    missingRows: 1,
    totalRows: 2,
    coveragePercent: 50,
  });
});

test('analytics totals preserve real zero values', () => {
  const summary = buildAnalyticsSummary({
    daily: [{
      views: '0',
      engagedViews: '0',
      estimatedMinutesWatched: '0',
      subscribersGained: '0',
      subscribersLost: '0',
      averageViewDuration: null,
      averageViewPercentage: null,
    }],
    videos: [],
    trafficSources: [],
    revenue: 0,
    currentSubscribers: '0',
  });

  assert.equal(summary.totalViews, 0);
  assert.equal(summary.engagedViews, 0);
  assert.equal(summary.watchHours, 0);
  assert.equal(summary.subscribersGained, 0);
  assert.equal(summary.subscribersLost, 0);
  assert.equal(summary.netSubscribers, 0);
  assert.equal(summary.estimatedRevenue, 0);
});

test('daily coverage reports absent, duplicate and unexpected dates without inventing zeros', () => {
  const coverage = assessDailyCoverage([
    { day: '2026-11-01', views: '10' },
    { day: '20261103', views: '0' },
    { day: '2026-11-03', views: '2' },
    { day: '2026-11-04', views: '4' },
  ], {
    startDate: '2026-11-01',
    endDate: '2026-11-03',
  });

  assert.equal(coverage.expectedDays, 3);
  assert.equal(coverage.returnedDays, 2);
  assert.deepEqual(coverage.noRowDates, ['2026-11-02']);
  assert.deepEqual(coverage.duplicateDates, ['2026-11-03']);
  assert.deepEqual(coverage.unexpectedDates, ['2026-11-04']);
  assert.equal(coverage.coveragePercent, 66.7);
});

test('metric coverage exposes partial and unavailable metric rows', () => {
  const coverage = assessMetricCoverage([
    { views: '10', estimatedMinutesWatched: null },
    { views: null, estimatedMinutesWatched: '0' },
    { views: '0', estimatedMinutesWatched: '5' },
  ], ['views', 'estimatedMinutesWatched', 'subscribersGained']);

  assert.deepEqual(coverage.views, {
    availableRows: 2,
    missingRows: 1,
    totalRows: 3,
    coveragePercent: 66.7,
  });
  assert.deepEqual(coverage.estimatedMinutesWatched, {
    availableRows: 2,
    missingRows: 1,
    totalRows: 3,
    coveragePercent: 66.7,
  });
  assert.deepEqual(coverage.subscribersGained, {
    availableRows: 0,
    missingRows: 3,
    totalRows: 3,
    coveragePercent: 0,
  });
});

test('daily coverage rejects malformed or reversed date ranges', () => {
  assert.throws(() => assessDailyCoverage([], { startDate: '2026-02-30', endDate: '2026-03-01' }), RangeError);
  assert.throws(() => assessDailyCoverage([], { startDate: '2026-11-03', endDate: '2026-11-01' }), RangeError);
});


test('daily coverage reports invalid and missing day values', () => {
  const coverage = assessDailyCoverage([
    { day: '2026-02-30', views: '1' },
    { day: 'not-a-date', views: '2' },
    { views: '3' },
    { day: '20261101', views: '0' },
  ], {
    startDate: '2026-11-01',
    endDate: '2026-11-01',
  });

  assert.equal(coverage.returnedDays, 1);
  assert.equal(coverage.invalidDayRows, 3);
  assert.deepEqual(coverage.invalidDayValues, ['2026-02-30', 'not-a-date', '(missing)']);
});

test('Short ranking falls back to views when engaged views are blank or unavailable', () => {
  const summary = buildAnalyticsSummary({
    daily: [],
    videos: [
      { video: 'fallback', creatorContentType: 'SHORTS', views: '8', engagedViews: '' },
      { video: 'unavailable', creatorContentType: 'SHORTS', views: null, engagedViews: null },
    ],
    trafficSources: [],
  });

  assert.equal(summary.topShorts.length, 1);
  assert.equal(summary.topShorts[0].video, 'fallback');
  assert.equal(summary.weakShorts[0].video, 'fallback');
});
