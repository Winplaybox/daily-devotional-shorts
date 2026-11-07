# YouTube Analytics report

The read-only report covers the last 1–90 completed calendar days in the YouTube Analytics API reporting timezone: America/Los_Angeles (Pacific Time). The API interprets startDate/endDate in Pacific Time, so the date resolver uses that timezone rather than the GitHub runner's UTC date.

## Reported metrics

- Channel views, engaged views, estimated watch hours, average view duration, average view percentage, subscribers gained/lost and current subscriber count.
- Per-video views, engaged views, watch time, average view duration/percentage, likes, comments and shares.
- Shorts are isolated using YouTube's creatorContentType=SHORTS dimension; the report includes top and weakest Shorts by engaged views.
- Traffic-source report includes Shorts-feed-origin views as a separate source.
- Estimated revenue is queried only when the existing OAuth token already includes yt-analytics-monetary.readonly. This change does not request new OAuth scopes.

## Metric limitations

- averageViewPercentage is a playback average, not the full audience-retention curve.
- The Shorts traffic-source row identifies views referred from the Shorts feed. It does not provide shown-in-feed impressions or the Studio "Stayed to watch" / "Swiped away" percentages. Those must be taken from YouTube Studio's Shorts analytics export.
- A video is included in Shorts rankings only when YouTube classifies it as creatorContentType=SHORTS; the report does not guess from duration.
- Revenue can remain unavailable if the token lacks the monetary scope or the channel is not eligible for revenue reporting.

## Safety

This report uses read-only Analytics and Data API requests. It does not upload, edit, schedule or delete videos, change the publishing workflow, alter credentials or change the approved 90-day editorial allocation.
