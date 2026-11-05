"""Build a deterministic per-location Panchang job manifest."""
from __future__ import annotations

import json
import os
from datetime import date
from pathlib import Path

from engine.location_registry import select_daily_locations


def build_location_jobs(target_date: date, location_ids: list[str] | None = None,
                        max_jobs: int | None = None) -> list[dict]:
    locations = select_daily_locations(location_ids)
    if max_jobs is not None:
        if max_jobs < 1:
            raise ValueError("max_jobs must be at least 1")
        locations = locations[:max_jobs]
    jobs = []
    for location in locations:
        jobs.append({
            "job_id": f"panchang-{target_date.isoformat()}-{location.location_id}",
            "panchang_date": target_date.isoformat(),
            "location": location.to_dict(),
            "status": "queued",
        })
    return jobs


def write_manifest(target_date: date, output_path: str,
                   location_ids: list[str] | None = None,
                   max_jobs: int | None = None) -> list[dict]:
    jobs = build_location_jobs(target_date, location_ids, max_jobs)
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"date": target_date.isoformat(), "jobs": jobs},
                               ensure_ascii=False, indent=2), encoding="utf-8")
    return jobs


def configured_location_ids() -> list[str] | None:
    raw = os.getenv("PANCHANG_LOCATION_IDS", "").strip()
    return [part.strip() for part in raw.split(",") if part.strip()] if raw else None


if __name__ == "__main__":
    import argparse
    from datetime import date as date_type

    parser = argparse.ArgumentParser(description="Create India-wide Panchang location jobs")
    parser.add_argument("--date", required=True, help="Panchang date YYYY-MM-DD")
    parser.add_argument("--out", default="out/location_jobs.json")
    parser.add_argument("--max-jobs", type=int, default=None)
    args = parser.parse_args()
    jobs = write_manifest(date_type.fromisoformat(args.date), args.out,
                          configured_location_ids(), args.max_jobs)
    print(f"Created {len(jobs)} location jobs in {args.out}")
