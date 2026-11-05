# Native YouTube Analytics integration

This repository uses the existing Google OAuth client and token. No third-party analytics vendor is required.

## OAuth scope requirement

The existing authorization script now requests:

- `youtube`, `youtube.upload`, `youtube.readonly`, `youtube.force-ssl`
- `yt-analytics.readonly` for channel and video reporting

Adding a scope to the code does not expand an already-issued refresh token. Re-authorize once on the trusted local Windows machine:

1. Pull the latest branch after it is merged.
2. Run `npm ci`.
3. Run `npm run auth:fresh` and approve the additional Google Analytics read-only permission.
4. Confirm the refreshed `token.json` scope includes `https://www.googleapis.com/auth/yt-analytics.readonly`.
5. Update the GitHub Actions `TOKEN_JSON` secret with the new token JSON. Keep `CLIENT_SECRET_JSON` unchanged unless the OAuth client itself changed.
6. Keep the same updated `token.json` locally. Never commit either OAuth file or paste its contents into chat.

The report workflow deliberately fails before calling the API if the scope is absent. It never prints credential values.

## Reports

Run locally with `npm run analytics:report`; set `ANALYTICS_DAYS=7` (1-90) to change the reporting window.

The report uses YouTube Analytics API v2 and YouTube Data API v3 to produce:
- Daily channel views, estimated minutes watched, average view duration, subscriber gains/losses, and estimated revenue (if available).
- Up to 200 top video rows with views, watch time, average view duration, subscriber gains, likes, comments and shares, plus title, publish date and duration.

Files are written to `out/analytics/` as JSON and CSV. GitHub Actions runs daily at 09:30 IST and retains the report artifact for 90 days. Manual dispatch supports a 1-90 day window.

YouTube Analytics has reporting latency. The default report ends yesterday in UTC. Revenue is conditional on channel/account eligibility and API availability. Video results are not filtered to Shorts-only; duration is included so a later reporting layer can classify formats explicitly.

## Safety and operating boundaries

- This workflow is read-only with respect to the YouTube channel: it does not upload, edit, schedule, or delete videos.
- It uses the existing OAuth secrets and does not add a database or external analytics vendor.
- Reports are GitHub Actions artifacts in this first integration slice; no Supabase schema is assumed or modified.
