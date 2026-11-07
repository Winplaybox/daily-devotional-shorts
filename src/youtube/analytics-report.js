import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import { normalizeGoogleOAuthToken } from './oauth-token.js';

const ANALYTICS_TIME_ZONE = 'America/Los_Angeles';
const MONETARY_SCOPE = 'yt-analytics-monetary.readonly';

export function getAnalyticsDateRange(now = new Date(), days = 28, timeZone = ANALYTICS_TIME_ZONE) {
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new RangeError('ANALYTICS_DAYS must be an integer between 1 and 90.');
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const end = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) - 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function buildAnalyticsQueries(range) {
  const base = { ids: 'channel==MINE', ...range };
  return {
    daily: {
      ...base,
      metrics: 'views,engagedViews,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost',
      dimensions: 'day',
      sort: 'day',
    },
    videos: {
      ...base,
      metrics: 'views,engagedViews,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares',
      dimensions: 'video,creatorContentType',
      sort: '-views',
      maxResults: 200,
    },
    trafficSources: {
      ...base,
      metrics: 'views,estimatedMinutesWatched',
      dimensions: 'insightTrafficSourceType',
      sort: '-views',
      maxResults: 50,
    },
    revenue: {
      ...base,
      metrics: 'estimatedRevenue',
      dimensions: 'day',
      sort: 'day',
    },
  };
}

function loadOAuthClient() {
  const clientPath = process.env.CLIENT_SECRET_FILE || './client_secret.json';
  const tokenPath = process.env.TOKEN_FILE || './token.json';
  if (!fs.existsSync(clientPath) || !fs.existsSync(tokenPath)) {
    throw new Error('OAuth files are missing. Expected client_secret.json and token.json.');
  }
  const rawClient = JSON.parse(fs.readFileSync(clientPath, 'utf8'));
  const config = rawClient.installed || rawClient.web || rawClient;
  if (!config.client_id || !config.client_secret) {
    throw new Error('OAuth client JSON is missing client_id/client_secret.');
  }
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const normalizedToken = normalizeGoogleOAuthToken(token);
  const auth = new google.auth.OAuth2(
    config.client_id,
    config.client_secret,
    (config.redirect_uris || [])[0] || 'http://localhost',
  );
  auth.setCredentials(normalizedToken);
  return { auth, token: normalizedToken };
}

function rowsToObjects(report) {
  const headers = (report.columnHeaders || []).map((header) => header.name);
  return (report.rows || []).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]])),
  );
}

function numeric(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumMetric(rows, key) {
  if (!rows.length) return null;
  return rows.reduce((total, row) => total + numeric(row[key]), 0);
}

function weightedAverage(rows, valueKey, weightKey) {
  const usable = rows.filter((row) =>
    row[valueKey] !== null && row[valueKey] !== undefined &&
    numeric(row[weightKey]) > 0 && Number.isFinite(Number(row[valueKey])),
  );
  if (!usable.length) return null;
  const weight = usable.reduce((total, row) => total + numeric(row[weightKey]), 0);
  return usable.reduce((total, row) => total + Number(row[valueKey]) * numeric(row[weightKey]), 0) / weight;
}

function shortScore(row) {
  return numeric(row.engagedViews ?? row.views);
}

export function buildAnalyticsSummary({ daily = [], videos = [], trafficSources = [], revenue = null, currentSubscribers = null }) {
  const shorts = videos.filter((row) => row.creatorContentType === 'SHORTS');
  const byEngagedViewsDesc = [...shorts].sort((a, b) => shortScore(b) - shortScore(a));
  const byEngagedViewsAsc = [...shorts].sort((a, b) => shortScore(a) - shortScore(b));
  const shortsFeed = trafficSources.find((row) => row.insightTrafficSourceType === 'SHORTS');
  const views = sumMetric(daily, 'views');
  const engagedViews = sumMetric(daily, 'engagedViews');
  const watchMinutes = sumMetric(daily, 'estimatedMinutesWatched');
  const gained = sumMetric(daily, 'subscribersGained');
  const lost = sumMetric(daily, 'subscribersLost');

  return {
    totalViews: views,
    engagedViews,
    engagedViewRatePct: views > 0 && engagedViews !== null ? (engagedViews / views) * 100 : null,
    watchHours: watchMinutes === null ? null : watchMinutes / 60,
    subscribersGained: gained,
    subscribersLost: lost,
    netSubscribers: gained === null || lost === null ? null : gained - lost,
    currentSubscribers: currentSubscribers === null || currentSubscribers === undefined ? null : numeric(currentSubscribers),
    averageViewDurationSeconds: weightedAverage(daily, 'averageViewDuration', 'views'),
    averageViewPercentage: weightedAverage(daily, 'averageViewPercentage', 'views'),
    shortsFeedViews: shortsFeed ? numeric(shortsFeed.views) : (trafficSources.length ? 0 : null),
    estimatedRevenue: revenue,
    shortsCount: shorts.length,
    topShorts: byEngagedViewsDesc.slice(0, 10),
    weakShorts: byEngagedViewsAsc.slice(0, 10),
  };
}

async function main() {
  const days = Number(process.env.ANALYTICS_DAYS || 28);
  const range = getAnalyticsDateRange(new Date(), days);
  const { auth, token } = loadOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const analytics = google.youtubeAnalytics({ version: 'v2', auth });

  const channelResponse = await youtube.channels.list({
    part: ['id', 'snippet', 'statistics'],
    mine: true,
  });
  const channel = channelResponse.data.items?.[0];
  if (!channel) throw new Error('OAuth token did not resolve to a YouTube channel.');

  const queries = buildAnalyticsQueries(range);
  const [dailyResponse, videosResponse, trafficResponse] = await Promise.all([
    analytics.reports.query(queries.daily),
    analytics.reports.query(queries.videos),
    analytics.reports.query(queries.trafficSources),
  ]);

  const daily = rowsToObjects(dailyResponse.data);
  const videoRows = rowsToObjects(videosResponse.data);
  const trafficSources = rowsToObjects(trafficResponse.data);
  const videoIds = videoRows.map((row) => row.video).filter(Boolean);
  const metadata = new Map();
  for (let index = 0; index < videoIds.length; index += 50) {
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds.slice(index, index + 50),
      maxResults: 50,
    });
    for (const item of response.data.items || []) {
      metadata.set(item.id, {
        title: item.snippet?.title || '',
        publishedAt: item.snippet?.publishedAt || null,
        duration: item.contentDetails?.duration || null,
      });
    }
  }

  const enrichVideo = (row) => ({
    ...row,
    ...(metadata.get(row.video) || {}),
    url: row.video ? 'https://www.youtube.com/watch?v=' + row.video : null,
  });
  const topVideos = videoRows.map(enrichVideo);
  const shorts = topVideos.filter((row) => row.creatorContentType === 'SHORTS');
  const hasMonetaryScope = String(token.scope || '').split(/\s+/).some((scope) => scope.includes(MONETARY_SCOPE));
  const notes = [
    'YouTube Analytics data can be delayed; the report ends on the last completed Pacific Time day.',
    'Shorts are classified using the creatorContentType dimension; unclassified videos are not guessed from duration.',
    'Average view percentage is an average playback metric, not the full audience-retention curve.',
    'The SHORTS traffic-source row reports views referred from the Shorts feed; it is not the shown-in-feed or viewed-versus-swiped rate.',
  ];

  let revenue = null;
  if (hasMonetaryScope) {
    try {
      const revenueResponse = await analytics.reports.query(queries.revenue);
      revenue = sumMetric(rowsToObjects(revenueResponse.data), 'estimatedRevenue');
    } catch (error) {
      notes.push('Revenue unavailable from the authorized API response: ' + (error?.response?.data?.error?.message || error.message));
    }
  } else {
    notes.push('Revenue omitted because TOKEN_JSON does not include yt-analytics-monetary.readonly; no additional scope was requested.');
  }

  const summary = buildAnalyticsSummary({
    daily,
    videos: shorts,
    trafficSources,
    revenue,
    currentSubscribers: channel.statistics?.subscriberCount ?? null,
  });
  const report = {
    schemaVersion: '1.1.0',
    source: 'YouTube Analytics API v2 + YouTube Data API v3',
    generatedAt: new Date().toISOString(),
    channel: {
      id: channel.id,
      title: channel.snippet?.title || '',
      currentSubscribers: channel.statistics?.subscriberCount ?? null,
    },
    range,
    reportingTimeZone: ANALYTICS_TIME_ZONE,
    days,
    summary,
    daily,
    trafficSources,
    topVideos,
    shorts,
    topShorts: summary.topShorts,
    weakShorts: summary.weakShorts,
    notes,
  };

  const outputDir = path.resolve(process.env.ANALYTICS_OUTPUT_DIR || 'out/analytics');
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = range.startDate + '_to_' + range.endDate;
  const jsonPath = path.join(outputDir, 'youtube-analytics-' + stamp + '.json');
  const csvPath = path.join(outputDir, 'youtube-analytics-videos-' + stamp + '.csv');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
  const columns = [
    'video', 'creatorContentType', 'title', 'publishedAt', 'duration', 'views',
    'engagedViews', 'estimatedMinutesWatched', 'averageViewDuration',
    'averageViewPercentage', 'subscribersGained', 'likes', 'comments', 'shares', 'url',
  ];
  const csv = [
    columns.join(','),
    ...topVideos.map((row) =>
      columns.map((column) => {
        const value = row[column] ?? '';
        return '"' + String(value).replaceAll('"', '""') + '"';
      }).join(','),
    ),
  ].join('\n');
  fs.writeFileSync(csvPath, csv + '\n');
  console.log('[ANALYTICS] Channel: ' + report.channel.title + ' (' + channel.id + ')');
  console.log('[ANALYTICS] Range: ' + range.startDate + ' to ' + range.endDate + ' (' + ANALYTICS_TIME_ZONE + ')');
  console.log('[ANALYTICS] Views: ' + (summary.totalViews ?? 'unavailable') + '; engaged views: ' + (summary.engagedViews ?? 'unavailable'));
  console.log('[ANALYTICS] Watch hours: ' + (summary.watchHours ?? 'unavailable') + '; net subscribers: ' + (summary.netSubscribers ?? 'unavailable'));
  console.log('[ANALYTICS] Shorts: ' + shorts.length + '; traffic sources: ' + trafficSources.length);
  console.log('[ANALYTICS] Wrote ' + jsonPath + ' and ' + csvPath);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.error?.message || error.message;
    console.error('[ANALYTICS] Failed' + (status ? ' (HTTP ' + status + ')' : '') + ': ' + detail);
    if (status === 403 || status === 401) {
      console.error('[ANALYTICS] Confirm yt-analytics.readonly is granted to this OAuth token and YouTube Analytics API is enabled.');
    }
    process.exitCode = 1;
  });
}
