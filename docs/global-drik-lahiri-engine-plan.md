# PR #21 — Global Drik Ganita + Lahiri Calculation and Publishing Design

## Status and scope

This change defines the implementation contract for the next calculation and publishing phase. It does not claim that the current approximate calculator is globally validated, and it does not enable public publishing. The branch is based on the worldwide automation foundation (PR #20); merge PR #19/#20 in the intended dependency order and rebase this branch before merging.

## Default calculation profile

- System: Drik Ganita (explicitly versioned implementation).
- Ayanamsha: Lahiri / Chitra Paksha.
- Reference day: local civil date with sunrise-based Panchang day assignment.
- Timezone: IANA timezone; resolve each event as a timezone-aware instant. Never use a fixed numeric offset as the source of truth.
- Location: geocoded latitude/longitude with source, precision, and resolution metadata. No silent Ujjain fallback.
- Regional conventions: profile overrides for Amanta/Purnimanta month, observance rules, festival rules, and regional naming. Preserve the selected profile in every output.
- Output: event instants in UTC plus local ISO-8601 values and display strings, with calculation version and provenance.

Ayanamsha and tradition choices are configuration, not hidden constants. A result must identify its profile; do not claim one universal Panchang where regional traditions legitimately differ.

## Calculation-engine requirements

1. Replace float-offset date arithmetic with timezone-aware instants using Python `zoneinfo` and explicit UTC conversion.
2. Keep astronomy separate from calendar/tradition policy:
   - apparent geocentric solar and lunar longitudes;
   - ayanamsha conversion;
   - tithi, nakshatra, yoga, karana intervals and exact transition instants;
   - sunrise/sunset and solar noon for the requested coordinates/date;
   - day/night muhurta divisions derived from local sunrise/sunset.
3. Use a documented ephemeris implementation and version. The current in-repository Meeus approximations are not sufficient evidence for a world-class global accuracy claim. Compare calculations against a trusted ephemeris (e.g. Swiss Ephemeris/JPL-derived reference) and published Panchang references for a controlled validation corpus.
4. Do not clamp polar sunrise/sunset calculations into plausible-looking times. Return explicit polar-day, polar-night, or no-event states where applicable.
5. Handle DST gaps/folds, date-line locations, leap days, historical timezone changes, and locations with unusual civil-time transitions.
6. Find event boundaries with a bracketed root-finding method; do not linearly guess a transition from a coarse sample.
7. Keep uncertainty/tolerance and source comparison results in machine-readable validation reports.

## Required validation corpus / release gates

- India: Virar/Mumbai, Ujjain, Varanasi, Delhi; dates around tithi/nakshatra/yoga changes.
- DST: New York and London in both standard and daylight time.
- Southern hemisphere: Sydney and Auckland.
- Date-line: Honolulu and Kiritimati.
- High latitude: Tromsø and locations with seasonal no-sunrise/no-sunset.
- Historical and future timezone transitions.
- Compare sunrise/sunset, tithi boundaries, nakshatra boundaries, yoga, karana, and local-day assignment against reference outputs with documented tolerances.
- Tests must include exact boundary instants and one instant on each side of a transition.
- Public publishing stays disabled until all required validation checks pass and an operator explicitly enables it.

## Queue-to-video worker contract

Each request job is immutable and carries:
- request ID/idempotency key, source comment ID and privacy-safe viewer key;
- content type, requested local date, optional requested local time;
- resolved locality, country, coordinates, IANA timezone and geocoder provenance;
- calculation profile ID/version and regional convention overrides;
- requested visibility (public, subject to policy) and creation timestamp.

Worker states:
`queued -> leased -> calculated -> narrated -> rendered -> qc_passed -> upload_pending -> uploaded -> replied`

Failure states:
`retryable_failed`, `needs_clarification`, `review_required`, `dead_letter`, `cancelled`.

Requirements:
- lease jobs with expiry and heartbeat; prevent two workers from processing the same job;
- idempotent artifacts and uploads; persist YouTube video ID before replying;
- per-job isolated output paths and metadata;
- retry with bounded exponential backoff; dead-letter after configured attempts;
- never publish when calculations are ambiguous, invalid, incomplete, or outside validated geographic limits;
- automated QC checks date/location/profile consistency, required fields, narration duration, audio presence, video dimensions, and poster/text overflow;
- public upload requires a release gate and a kill switch.

## Scheduling policy

- Calculate and render ahead of the target local date where possible.
- Daily Panchang Short target: after the requested location's sunrise, unless the operator chooses another editorial release time.
- Muhurat is editorial context, not a substitute for audience-time optimization. Do not call an upload time universally auspicious or promise performance.
- If a selected traditional window has already passed, do not relabel a later time as equivalent.
- Store `publish_at` as an absolute UTC instant and retain the intended local time, timezone, and rationale.

## YouTube community publishing

The documented YouTube Data API supports video upload and comment operations; do not assume it supports creating Community posts, polls, or reading poll votes. Keep Community post/poll creation behind a separate adapter and only enable it if an officially supported API or an explicitly authorized provider is available. Otherwise produce ready-to-publish post assets/text for a human operator. Never automate browser actions in a way that violates platform terms.

## Viewer request flow

- A comment command must explicitly include a date and city/locality plus country/region. Never infer exact location from the viewer's account.
- A time is optional for an all-day Panchang request and required only for a specific-time question.
- Reply asking for missing details; follow-up replies from the same commenter may complete the request.
- Explain that accepted requests may become public videos before queue admission.
- Poll comments on channel videos only where API permissions allow. Do not claim Community-post comments or poll votes are covered by the same endpoint.
- Apply per-viewer, per-day and global queue limits; use UTC storage timestamps and clearly define the viewer-local quota policy.

## 6 November 2026 Virar validation run

A one-off run must be a dry-run first:
1. Resolve Virar, Maharashtra to verified coordinates and `Asia/Kolkata`.
2. Calculate using the pinned Drik Ganita + Lahiri profile.
3. Compare the complete output and transition instants against at least two trusted references.
4. Generate JSON, narration and render artifacts without uploading.
5. Review the result and only then schedule/publish with explicit approval.

The previously discussed approximate times are not certified calculation outputs. Do not publish them as verified until this run passes the validation gates. Since the target date may be at or near the current local date, reject any scheduled publish instant that is already in the past; do not silently convert it to immediate public release.

## Acceptance criteria

- No fixed-offset-only calculations or silent default location.
- Deterministic output for identical inputs and pinned engine/profile versions.
- Boundary tests and global validation corpus pass.
- Queue worker is lease-safe and idempotent.
- Upload is disabled by default and requires QC plus explicit opt-in.
- Public replies include the actual published video URL only after the video ID is persisted.
- Community publishing capability is accurately represented; unsupported endpoints remain disabled.
