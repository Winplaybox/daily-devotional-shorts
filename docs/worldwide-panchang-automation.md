# Worldwide Panchang Automation — PR #20

## Goal
Extend public viewer-requested Panchang from India-only resolution to a worldwide,
location-specific workflow. The request's city/locality, country/region, coordinates,
IANA timezone and target local date become immutable job inputs.

## Worldwide calculation contract
A Panchang job must carry:
- Gregorian local civil date at the requested location.
- Latitude and longitude from a trusted geocoder or curated override.
- IANA timezone (e.g. `America/New_York`, `Europe/London`, `Asia/Kolkata`).
- UTC offset resolved for the target date, not a fixed global offset.
- Geocoder identity, coordinate precision and resolution timestamp.
- Calculation engine/version, ayanamsha and tradition/profile configuration.
- Source request/comment ID and idempotency key.

The existing calculator currently accepts a numeric UTC offset. `engine/world_time.py`
resolves the date-specific IANA offset, but this is not by itself a complete global
astronomical validation. Before worldwide public release, refactor calculation internals
to use timezone-aware instants and verify sunrise/sunset and day boundaries across DST,
date-line, polar and high-latitude cases. Do not claim global accuracy until those tests pass.

## Implemented in this PR
- YouTube Data API comment-thread polling using the repository's existing googleapis dependency.
- Follow-up replies are read as part of the originating thread to collect missing fields.
- Supabase/PostgREST durable storage adapter for cursors, processed comments and request jobs.
- SQL schema for request queue, unique idempotency key, public visibility and operational indexes.
- Worldwide Open-Meteo geocoding adapter returning coordinates and IANA timezone; ambiguous matches are rejected.
- IANA timezone/date offset resolver using Python zoneinfo.
- Scheduled GitHub Actions comment intake workflow (15-minute cadence).

## Required configuration
GitHub Actions secrets:
- `CLIENT_SECRET_JSON`
- `TOKEN_JSON` (must have scopes for reading channel comments and replying)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REQUEST_HASH_SALT` (long random secret)

Apply `db/supabase/panchang-automation.sql` to a private Supabase project. Disable public/anon/authenticated access with RLS/policies; service-role key stays server-side.

## Critical release blockers
This PR does **not** enable public video uploads. The existing calculator still uses a fixed numeric offset and approximate solar/lunar routines. The next phase must:
1. Refactor and test timezone-aware astronomical calculation for the requested local civil date.
2. Add sunrise-based tithi/nakshatra boundary calculations and validate transition times against trusted ephemeris sources.
3. Integrate the request queue with the location-aware engine, voiceover, poster, renderer and per-job output paths.
4. Add an idempotent upload worker that persists the YouTube video ID before replying to the viewer.
5. Verify YouTube OAuth scopes, API quota and actual channel identity in a dry-run/test channel.
6. Add human-review or canary gates, corrections workflow, queue dead-letter handling and operational alerts.

## Accuracy and tradition
"Panchang" is tradition-dependent. The product must expose a documented calculation profile (e.g. ayanamsha, sunrise convention, amanta/purnimanta month convention, location precision and festival rules). Different regional traditions can produce legitimate differences. The UI/video should identify its profile and avoid claiming one universal result where traditions differ.

## Public publication policy
Every accepted viewer request is intended for public visibility. The system must disclose that in its request reply. Upload is permitted only after all automated quality gates pass; ambiguous or disputed calculations are held for review, not published.
