import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { normalizeGoogleOAuthToken } from './oauth-token.js';

export function getAnalyticsDateRange(now = new Date(), days = 28) {
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new RangeError('ANALYTICS_DAYS must be an integer between 1 and 90.');
  }
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
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
  return auth;
}

function rowsToObjects(report) {
  const headers = (report.columnHeaders || []).map((header) => header.name);
  return (report.rows || []).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]])),
  );
}

async function main() {
  const days = Number(process.env.ANALYTICS_DAYS || 28);
  const range = getAnalyticsDateRange(new Date(), days);
  const auth = loadOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const analytics = google.youtubeAnalytics({ version: 'v2', auth });

  const channelResponse = await youtube.channels.list({
    part: ['id', 'snippet'],
    mine: true,
  });
  const channel = channelResponse.data.items?.[0];
  if (!channel) throw new Error('OAuth token did not resolve to a YouTube channel.');

  const base = { ids: 'channel==MINE', ...range };
  const [dailyResponse, videosResponse] = await Promise.all([
    analytics.reports.query({
      ...base,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,estimatedRevenue',
      dimensions: 'day',
      sort: 'day',
    }),
    analytics.reports.query({
      ...base,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,likes,comments,shares',
      dimensions: 'video',
      sort: '-views',
      maxResults: 200,
    }),
  ]);

  const videoRows = rowsToObjects(videosResponse.data);
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

  const report = {
    schemaVersion: '1.0.0',
    source: 'YouTube Analytics API v2 + YouTube Data API v3',
    generatedAt: new Date().toISOString(),
    channel: { id: channel.id, title: channel.snippet?.title || '' },
    range,
    days,
    daily: rowsToObjects(dailyResponse.data),
    topVideos: videoRows.map((row) => ({
      ...row,
      ...(metadata.get(row.video) || {}),
      url: row.video ? `https://www.youtube.com/watch?v=${row.video}` : null,
    })),
    notes: [
      'YouTube Analytics data can be delayed; the report ends yesterday in UTC.',
      'Video rows include all channel videos returned by the API, not Shorts-only filtering.',
      'estimatedRevenue is reported only when the channel/account is eligible and the metric is available.',
    ],
  };

  const outputDir = path.resolve(process.env.ANALYTICS_OUTPUT_DIR || 'out/analytics');
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = `${range.startDate}_to_${range.endDate}`;
  const jsonPath = path.join(outputDir, `youtube-analytics-${stamp}.json`);
  const csvPath = path.join(outputDir, `youtube-analytics-videos-${stamp}.csv`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
  const columns = ['video', 'title', 'publishedAt', 'duration', 'views', 'estimatedMinutesWatched', 'averageViewDuration', 'subscribersGained', 'likes', 'comments', 'shares', 'url'];
  const csv = [
    columns.join(','),
    ...report.topVideos.map((row) =>
      columns.map((column) => {
        const value = row[column] ?? '';
        return `"${String(value).replaceAll('"', '""')}"`;
      }).join(','),
    ),
  ].join('\n');
  fs.writeFileSync(csvPath, csv + '\n');
  console.log(`[ANALYTICS] Channel: ${report.channel.title} (${channel.id})`);
  console.log(`[ANALYTICS] Range: ${range.startDate} to ${range.endDate}`);
  console.log(`[ANALYTICS] Daily rows: ${report.daily.length}; video rows: ${report.topVideos.length}`);
  console.log(`[ANALYTICS] Wrote ${jsonPath} and ${csvPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.error?.message || error.message;
    console.error(`[ANALYTICS] Failed${status ? ` (HTTP ${status})` : ''}: ${detail}`);
    if (status === 403) {
      console.error('[ANALYTICS] Confirm yt-analytics.readonly is granted to this OAuth token and YouTube Analytics API is enabled.');
    }
    process.exitCode = 1;
  });
}
