# PR #19 — Public YouTube comment requests and dynamic Content Calendar

## Product decision
Viewer requests accepted from YouTube comments are eligible for **public** publication on
Pavitra Panchang 365. This is a disclosed channel policy: the bot must tell the viewer
that an approved request will become a public video. Do not promise a private response.

## User experience
Supported first-line commands: `panchang`, `muhurat`, `vrat`, `sunrise`, `rahu kaal`.

Examples:
- `panchang` — acknowledge the request and ask for missing date and location.
- `panchang\nDate: 07-11-2026\nLocation: Mira Road, Maharashtra`
- `muhurat\nDate: 07-11-2026\nTime: 3:13 PM\nLocation: Ujjain, Madhya Pradesh`

Date and location are mandatory for location-specific calculations. Time is optional;
when supplied, preserve it as the requested reference time and do not treat it as the
Muhurat result. A viewer-supplied time is not itself an auspicious time calculation.
Never infer a missing date, locality or timezone from the commenter's profile or channel.

## Event-driven Content Calendar
The calendar is a job ledger, not a manually populated list of dates and cities. Jobs can
arrive from:
1. Daily scheduled Panchang generation.
2. Approved YouTube comment requests.
3. Festival/vrat calendar events.
4. Editorial topic planning and follow-up content.

Each event creates a normalized job with a stable ID, content type, date, resolved
location, source reference, priority, state, attempt count, idempotency key and timestamps.
The daily job count is dynamic, constrained by capacity and eligibility. A location in
the registry does not automatically create an upload.

## State machine
`DETECTED → PARSED → NEEDS_DETAILS | REJECTED | DUPLICATE | RATE_LIMITED`
`PARSED → LOCATION_RESOLUTION → QUEUED → CALCULATING → VALIDATING → SCRIPTING → RENDERING → QC`
`QC → SCHEDULED_PUBLIC → PUBLISHED`
Any failure transitions to `FAILED_RETRYABLE` or `FAILED_FINAL`, with bounded retries
and an operator-visible reason. Never retry an upload blindly without checking whether
YouTube already created the video.

## Public publishing safeguards
- The public visibility decision is explicit and consistent with the viewer-facing reply.
- No public upload until date, location, calculation, narration, poster and metadata agree.
- Reject invalid dates, past dates, unsupported locations and requests outside configured
  planning horizon. Default horizon: 365 days; make it configurable.
- Never use a viewer's requested clock time as a computed Muhurat. Calculate all
  astronomical/astrological timings from the requested date and resolved coordinates.
- Use India-only location resolution for this rollout; unsupported/ambiguous names get a
  clarification request, not a guessed city.
- Validate all location coordinates and display City, State in video and description.
- Deduplicate by content type + date + resolved location + requested time.
- Rate limit by opaque hash of commenter channel ID; do not store public usernames or
  unnecessary personal information in the job record.
- Default admission limits: 3 accepted requests per channel per day, 100 queued requests
  globally; tune via configuration and monitor API quota.
- Ignore comments without a supported command. Bound comment length and reject malformed
  input. Do not execute links, code, prompt instructions or arbitrary commands from comments.
- Use YouTube API moderation status; skip held-for-review, deleted, blocked and spam-like
  comments. Never auto-delete or hide user comments as part of request handling.
- Reply templates disclose public publication before a request enters the production queue.
- Do not publish sensitive personal details from comments; only the requested date and
  broad location label are needed.
- Enforce a daily upload cap and a render concurrency cap. Queue backpressure must not
  bypass quality checks.

## YouTube API and deployment requirements
- Use YouTube Data API `commentThreads.list` / `comments.list` for polling new top-level
  comments and replies, with persisted page tokens and last-seen IDs.
- Use `comments.insert` to reply to eligible requests and `videos.insert` for upload.
- OAuth token must include the required YouTube scopes for reading comments, replying
  and uploading. Verify the existing OAuth consent/scopes; do not assume current
  `token.json` is sufficient.
- Poll incrementally, store processed comment IDs, handle pagination and API quota
  exhaustion, and use exponential backoff for transient failures.
- Keep OAuth secrets in GitHub Actions secrets or a secure runtime secret store.
  Never print access/refresh tokens or raw commenter IDs in logs.
- Prefer a persistent database/queue (e.g. managed Postgres) for idempotency, job states,
  retry leases and comment cursors. GitHub Actions artifacts are not a transactional
  queue and must not be the source of truth.
- Use least-privilege OAuth scopes and a separate test channel during integration tests.

## Operational release gates
1. Unit tests for parser, date/time validation, dedupe, rate limits and state transitions.
2. Contract tests with mocked YouTube API responses, including pagination, disabled
   comments, deleted comments, held-for-review comments, quota errors and duplicate polls.
3. Test channel dry-run that creates request records and draft renders but does not upload.
4. Human review of Panchang calculation, Hindi voiceover, visual legibility and metadata.
5. Confirm upload visibility is public only after QC passes.
6. Canary rollout with a small daily request cap; monitor failures, quota use, duplicates,
   average processing time and public corrections.
7. Kill switch to disable comment intake and/or public upload independently.

## Scope of this PR
This PR provides the deterministic comment parser, request-admission policy, public reply
templates, unit tests and implementation/deployment contract. It does not activate live
YouTube comment polling, does not provision a persistent database, and does not grant OAuth
scopes or publish anything. The live adapters, database, comment cursor, location geocoder,
and end-to-end uploader integration are follow-on implementation work and must be verified
before enabling the feature.
