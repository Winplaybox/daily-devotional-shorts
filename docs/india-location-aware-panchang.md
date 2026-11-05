# India-wide, location-aware Panchang architecture

## Decision
The engine has no single India-wide calculation location. Each video job must carry one
explicit location with city, district, state, latitude, longitude, IANA timezone and
date-specific UTC offset. No location may be inferred from the machine running the job.

## Hybrid location strategy
- Curated representative Indian cities are the default coverage pool.
- Operators may add verified custom cities using `PANCHANG_CUSTOM_LOCATIONS_JSON`.
- A daily content-calendar row may select a subset using `PANCHANG_LOCATION_IDS`.
- The number of daily location videos is dynamic: it is the number of eligible location
  jobs in that date's content calendar, optionally capped by `--max-jobs`.
- No extra upload is created merely because a city exists in the registry.

## Per-video data contract
Every job has a stable `job_id`, `panchang_date`, and complete `location` object.
The same location object must flow unchanged through calculation, poster, narration,
YouTube title/description and audit record. Never combine astronomical timings from
different locations.

## Example
```json
{
  "job_id": "panchang-2026-11-07-miraroad",
  "panchang_date": "2026-11-07",
  "location": {
    "location_id": "miraroad",
    "city": "Mira Road",
    "state": "Maharashtra",
    "latitude": 19.2813,
    "longitude": 72.8694,
    "timezone": "Asia/Kolkata",
    "timezone_offset_hours": 5.5
  }
}
```

Coordinates in the bundled registry are city-centre reference points. They must be
verified before public rollout and may be overridden by custom entries with trusted
coordinates. For neighbourhood-specific Muhurat, use locality coordinates rather
than a state/city centroid.

## Safety and correctness gates
1. Reject missing/unknown/inactive location IDs; do not fall back to Ujjain.
2. Validate coordinate ranges and required location labels.
3. Use the selected location's sunrise to anchor the sunrise-based Panchang day.
4. Keep IANA timezone as canonical metadata; resolve a date-specific offset for the
   calculation library. The current calculator accepts a numeric offset, so this PR
   uses the configured India offset and does not claim multi-timezone support.
5. Persist location ID, coordinates, date, calculation version and source metadata
   with each output for reproducibility.
6. Show `City, State` on the poster and state it in narration/description.
7. Do not publish a job if the location is missing or if poster/narration metadata
   differs from the calculation input.

## Current scope
This PR introduces the location registry, deterministic job manifest and unit tests.
The subsequent integration step must fan the manifest out into independent render/upload
jobs, pass each location to `generate_daily_payload`, and ensure each output has a
unique video ID and schedule. Do not enable nationwide auto-publishing until that
fan-out, end-to-end validation and YouTube duplicate-content review are complete.
