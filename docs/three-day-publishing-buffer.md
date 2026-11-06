# Three-day automatic YouTube publishing buffer

The daily publisher runs at 06:00 IST and resolves one exact Panchang/publication date three local calendar days ahead. It renders both Shorts from that same Panchang payload, then schedules them as private YouTube uploads for:

- 40-second edition: 07:00 IST on the target date
- 60-second edition: 19:00 IST on the target date

The date resolver uses `PANCHANG_SCHEDULE_TIMEZONE` (default `Asia/Kolkata`) and `PANCHANG_PUBLISH_BUFFER_DAYS` (default `3`). A manually supplied `panchang_date` is an explicit one-off target-date override and does not receive the buffer a second time.

## Location and Panchang accuracy

The existing repository variables `PANCHANG_LAT`, `PANCHANG_LON`, `PANCHANG_TZ`, `PANCHANG_LOCATION`, and `PANCHANG_TIMEZONE_LABEL` remain the source of truth. No city or coordinates are hard-coded by this feature. Scheduled publishing fails closed if latitude, longitude, or the location label is absent.

The Python Panchang engine receives the resolved target date once. Both the 40s and 60s editions are rendered from that same payload, preventing the evening upload from accidentally calculating tomorrow's Panchang a second time. The upload slots remain fixed at 07:00 and 19:00 IST (12 hours apart).

## Safety and validation

The feature is introduced on a feature branch and must pass PR validation before merge. A PR run does not invoke the scheduled publisher because GitHub scheduled events run only on the default branch; the manual dispatch input still defaults to `publish=false`. Do not merge until CI passes and both rendered artifacts have been reviewed against a trusted Panchang for the configured location/date. Production scheduling remains the existing default-branch behavior and is not newly enabled by the PR itself.
