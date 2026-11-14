"""Seven-day Panchang dataset for the weekly long-form guide.

Pure data: every value comes from the same production calculator as the daily
Shorts (Skyfield with legacy fallback). Nothing here is generated or guessed.

Usage: python -m engine.weekly_data --start 2026-11-16 --out out/weekly_data.json
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import date, datetime, timedelta
from pathlib import Path

from engine.festival_detector import detect_todays_festivals
from engine.panchang_calculator import get_complete_panchang

GENERIC_PREFIX = "दैनिक पंचांग"


def _location() -> tuple[float, float, float, str]:
    lat = float(os.getenv("PANCHANG_LAT") or "23.1765")
    lon = float(os.getenv("PANCHANG_LON") or "75.7885")
    tz = float(os.getenv("PANCHANG_TZ") or "5.5")
    name = os.getenv("PANCHANG_LOCATION") or "Ujjain, Madhya Pradesh, India (India reference)"
    return lat, lon, tz, name


def build_day(day: date, lat: float, lon: float, tz: float) -> dict:
    p = get_complete_panchang(day, lat=lat, lon=lon, tz=tz)
    events = [e for e in detect_todays_festivals(p, day) if not str(e.get("title", "")).startswith(GENERIC_PREFIX)]
    tithi_in_paksha = p["tithi_in_paksha"]
    paksha = p["paksha"]
    return {
        "date": day.isoformat(),
        "date_display": p["date_display"],
        "weekday": p["weekday"],
        "weekday_en": p["weekday_en"],
        "paksha": paksha,
        "tithi": p["tithi_clean"],
        "tithi_end": p.get("tithi_end"),
        "nakshatra": p["nakshatra_clean"],
        "nakshatra_end": p.get("nakshatra_end"),
        "yoga": str(p["yoga_name"]).split(" ")[0],
        "karana": str(p["karana_name"]).split(" ")[0],
        "month": p["hindu_month_clean"],
        "sunrise": p["sunrise"],
        "sunset": p["sunset"],
        "moonrise": p.get("moonrise"),
        "rahu_kaal": p["rahu_kaal"],
        "abhijit": p["abhijit"],
        "is_purnima": paksha == "शुक्ल पक्ष" and tithi_in_paksha == 15,
        "is_amavasya": paksha == "कृष्ण पक्ष" and tithi_in_paksha == 15,
        "is_ekadashi": tithi_in_paksha == 11,
        "events": [
            {"title": e["title"], "priority": int(e.get("priority", 0)), "religion": e.get("religion", "")}
            for e in events
        ],
        "engine": p.get("calculation_engine"),
    }


def build_week(start: date) -> dict:
    if start.weekday() != 0:
        raise ValueError("Weekly guide must start on a Monday.")
    lat, lon, tz, name = _location()
    days = [build_day(start + timedelta(days=i), lat, lon, tz) for i in range(7)]
    return {
        "week_start": start.isoformat(),
        "week_end": (start + timedelta(days=6)).isoformat(),
        "location_name": name,
        "timezone_offset_hours": tz,
        "days": days,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", required=True, help="Monday YYYY-MM-DD")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    week = build_week(datetime.strptime(args.start, "%Y-%m-%d").date())
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(week, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[WEEKLY] Wrote {out} ({week['week_start']} to {week['week_end']}, engine={week['days'][0]['engine']})")


if __name__ == "__main__":
    main()
