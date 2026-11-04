# Pavitra Panchang 365 — Shorts Production Engine

A data-first Remotion pipeline for original Hindi Panchang explainers and daily Shorts.

## Output

Each successful run creates two review-ready videos:

- `out/pavitra-panchang-40s.mp4`
- `out/pavitra-panchang-60s.mp4`

Both use the same maroon / antique-gold poster design. The information layout remains static; only decorative artwork moves. Each version receives its own traditional Hindi narration track and soft devotional ambience.

## Local setup (Windows / macOS / Linux)

1. Install Node.js 20+, Python 3.11+, and FFmpeg.
2. Clone the repository and run `npm ci`.
3. Set `GEMINI_API_KEY` in your shell for Hindi TTS.
4. Set the Panchang reference coordinates and timezone as described below.
5. Run `npm run check`.
6. Run `npm start`.
7. Review both MP4 files in `out/` before publishing.

The pipeline fails closed if the astronomical Panchang engine fails. It does not ask a generative model to invent dates or muhurat timings.

## Environment configuration

Use the following variables locally or as GitHub Actions repository variables:

- `PANCHANG_LAT`: calculation reference latitude (default 23.1765)
- `PANCHANG_LON`: calculation reference longitude (default 75.7885)
- `PANCHANG_TZ`: fixed UTC offset in hours (default 5.5)
- `PANCHANG_LOCATION`: internal reference label (default Ujjain, India)
- `PANCHANG_TIMEZONE_LABEL`: label for metadata (default IST)
- `GEMINI_API_KEY`: Google AI key for narration generation

The current calculator accepts a fixed UTC offset, not an IANA timezone database. Daylight-saving regions require a correct date-specific offset. Sunrise, sunset, Rahu Kaal and muhurat are reference-location dependent. The video therefore discloses that local timings may differ. Do not market one reference calculation as universal local time.

## YouTube scheduling and safety

The default pipeline renders only. Code pushes and PR merges never trigger the publisher.

To enable scheduled uploads:
1. Add repository variable `AUTO_PUBLISH=true` in Settings → Secrets and variables → Actions → Variables.
2. Add `CLIENT_SECRET_JSON`, `TOKEN_JSON`, and `GEMINI_API_KEY` as Actions secrets.
3. First run the workflow manually with `publish=false`, download and review both MP4s, and confirm the OAuth token belongs to the intended YouTube channel.
4. Then manually dispatch with `publish=true` to test a real scheduled upload. Once enabled, the daily cron also uploads and schedules automatically.

The 40-second edition is scheduled at the selected Panchang slot; the 60-second edition is scheduled six hours later. Missed publishing slots roll forward to the same slot on the next day. OAuth files must never be committed.

## GitHub Actions

- `Validate Panchang Shorts` runs JavaScript syntax, TypeScript and Python compilation checks on pull requests.
- `Daily Shorts Publisher` runs one daily batch at 06:00 IST and can also be started manually.
- Each batch renders both 40-second and 60-second versions. Scheduled workflow runs do not upload unless `AUTO_PUBLISH=true` is deliberately configured in the workflow.

## Monetization-readiness principles

Automation is a production aid, not a monetization shortcut. Avoid interchangeable daily videos. Each upload should add distinct viewer value: explain a Panchang concept, interpret a verified festival observance, answer a viewer question, compare a tradition across regions, or explain why timings differ by location. Include original narration and meaningful editorial context, verify sources, and keep an archive of calculation inputs and sources.

YouTube's monetization review can reject repetitive, mass-produced or low-value template content even when it is technically original. Read the current [YouTube channel monetization policies](https://support.google.com/youtube/answer/1311392) before scaling.

## Quality checks

- `npm run check`: Node syntax and TypeScript checks
- CI also compiles the Python engine
- Inspect both MP4s for Devanagari rendering, timing accuracy, audio intelligibility, subtitle synchronization and visual overflow
- Review every daily calculation against a trusted Panchang for the selected reference location before publishing
