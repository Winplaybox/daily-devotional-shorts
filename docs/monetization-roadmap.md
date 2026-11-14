# Pavitra Panchang 365 — Monetization roadmap and milestone tracking

## What YouTube actually requires (verify in YouTube Studio → Earn)

| Tier | Subscribers | Plus either |
|---|---|---|
| Early access (fan funding) | 500 | 3,000 public long-form watch hours **or** 3M public Shorts views, in the last 90 days (and 3 public uploads in 90 days) |
| Full Partner Program (ads) | 1,000 | 4,000 public long-form watch hours **or** 10M public Shorts views, in the last 90 days |

Shorts watch time does **not** count toward the watch-hour route; Shorts views count only toward the
Shorts-view route. YouTube decides eligibility after review; nothing in this repo can grant it.
`1k subs + 4,000 hours + 10M Shorts views within 28 days` is not an achievable planning assumption
for a new channel; the 90-day window above is the real clock.

## What the automation now does

- `PANCHANG_PUBLISH_BUFFER_DAYS=1`, `PANCHANG_DAILY_SLOTS=morning,evening` (set `morning,afternoon,evening` to restore three).
- Daily 06:00 IST run + 12:00 IST idempotent retry (already-uploaded slots are skipped).
- Skyfield (JPL DE421) is the Panchang source; the legacy analytic engine is an automatic fallback.
- Festival dates use the correct observance kaal (Pradosh / Nishita), Purnimanta months and Adhika Maas.
- `YouTube Analytics Report` runs daily for 90 days and commits durable history to the
  `analytics-data` branch: `daily.csv`, `snapshots.csv` (rolling 7/28/90-day windows) and `milestones.json`.
- Each report includes `monetizationProgress` (distance to both tiers, from verified API numbers only).

## Milestone protocol

`milestones.json` logs every 100 / 500 / 1,000 subscribers, 10k / 100k / 1M rolling-90-day views and every
500 rolling-90-day watch hours, with the performance at that moment and `analysisPending: true`.
A milestone is closed only after recording: what worked, what failed, audience behaviour,
strategy change, and the next measurable target.

## Honest levers for growth (original, policy-compliant)

1. Hook-first Shorts (first 1–3 s state the single most useful fact: Rahu Kaal, Abhijit, tomorrow's tithi).
2. Two distinct Shorts per day, not three near-identical ones.
3. One weekly long-form "Saptahik Panchang" guide for watch hours (planned in `weekly-plan.js`; production automation is the next work item).
4. Reply to real comments within 24 h; turn recurring questions into the next explainer.
5. Never use sub4sub, view bots, purchased engagement or bulk reused templates — these cause demonetization or termination.
