"""Skyfield-backed geocentric astronomy primitives for Panchang calculations.

This is the first production-engine implementation slice. It deliberately emits
provenance and does not claim religious-calendar validation until reference
fixtures are approved. Install requirements-engine.txt and provide a local
JPL BSP file via SKYFIELD_EPHEMERIS (or allow Skyfield to download de421.bsp).
"""
from __future__ import annotations

import math
import os
from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from skyfield.api import load
from skyfield.framelib import ecliptic_frame
from skyfield import almanac

UTC = timezone.utc
AYANAMSHA_ID = "lahiri-chitra-paksha-polynomial-v1"
ENGINE_ID = "skyfield-geocentric-apparent-v1"
# Explicitly versioned legacy seed pending reference-fixture calibration.
# This is NOT a substitute for a validated Swiss/JPL Panchang reference series.
AYANAMSHA_J2000_DEG = 23.8569
PRECESSION_DEG_PER_CENTURY = 1.3963
ANGLE_EPSILON_DEG = 1e-7


@dataclass(frozen=True)
class Location:
    name: str
    latitude: float
    longitude: float
    timezone: str

    def validate(self) -> None:
        if not self.name.strip():
            raise ValueError("Location name is required")
        if not -90 <= self.latitude <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        if not -180 <= self.longitude <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        ZoneInfo(self.timezone)


class SkyfieldPanchangAstronomy:
    def __init__(self, ephemeris_path: str | None = None):
        configured = ephemeris_path or os.getenv("SKYFIELD_EPHEMERIS")
        self.ephemeris_source = configured or "de421.bsp"
        self.eph = load(configured) if configured else load("de421.bsp")
        self.ts = load.timescale()
        self.earth = self.eph["earth"]
        self.sun = self.eph["sun"]
        self.moon = self.eph["moon"]

    @staticmethod
    def julian_centuries(jd: float) -> float:
        return (jd - 2451545.0) / 36525.0

    @classmethod
    def lahiri_ayanamsha(cls, jd: float) -> float:
        """Versioned Lahiri approximation; calibrate against approved fixtures."""
        t = cls.julian_centuries(jd)
        return (AYANAMSHA_J2000_DEG + PRECESSION_DEG_PER_CENTURY * t) % 360.0

    def _time(self, instant: datetime):
        if instant.tzinfo is None:
            raise ValueError("Astronomical instants must be timezone-aware")
        return self.ts.from_datetime(instant.astimezone(UTC))

    def tropical_longitudes(self, instant: datetime) -> dict[str, float]:
        t = self._time(instant)
        observer = self.earth.at(t)
        result = {}
        for name, body in (("sun", self.sun), ("moon", self.moon)):
            apparent = observer.observe(body).apparent()
            longitude, _, _ = apparent.frame_latlon(ecliptic_frame)
            result[name] = longitude.degrees % 360.0
        return result

    def sidereal_longitudes(self, instant: datetime) -> dict[str, float]:
        tropical = self.tropical_longitudes(instant)
        ayanamsha = self.lahiri_ayanamsha(self._time(instant).tt)
        return {key: (value - ayanamsha) % 360.0 for key, value in tropical.items()}

    def panchang_angles(self, instant: datetime) -> dict[str, float]:
        positions = self.sidereal_longitudes(instant)
        sun, moon = positions["sun"], positions["moon"]
        return {
            "tithi_phase": (moon - sun) % 360.0,
            "nakshatra_longitude": moon,
            "yoga_longitude": (sun + moon) % 360.0,
        }

    @staticmethod
    def _forward_delta(start: float, end: float) -> float:
        return (end - start) % 360.0

    def next_boundary(self, instant: datetime, angle_name: str,
                      segment_degrees: float, max_hours: int = 48) -> datetime:
        """Find next angular segment boundary using bracket scan + bisection."""
        if instant.tzinfo is None:
            raise ValueError("Boundary search requires an aware datetime")
        if angle_name not in {"tithi_phase", "nakshatra_longitude", "yoga_longitude"}:
            raise ValueError(f"Unsupported angle: {angle_name}")
        start_angle = self.panchang_angles(instant)[angle_name]
        target = (math.floor(start_angle / segment_degrees) + 1) * segment_degrees
        target %= 360.0

        def progress(at: datetime) -> float:
            current = self.panchang_angles(at)[angle_name]
            return self._forward_delta(start_angle, current)

        step = timedelta(minutes=10)
        lo = instant
        hi = instant + step
        limit = instant + timedelta(hours=max_hours)
        while hi <= limit:
            moved = progress(hi)
            if moved >= self._forward_delta(start_angle, target):
                break
            lo, hi = hi, hi + step
        else:
            raise RuntimeError(f"No {angle_name} boundary found within {max_hours} hours")

        for _ in range(45):
            mid = lo + (hi - lo) / 2
            if progress(mid) >= self._forward_delta(start_angle, target):
                hi = mid
            else:
                lo = mid
            if (hi - lo).total_seconds() <= 0.5:
                break
        return hi.astimezone(UTC)

    def sunrise_sunset(self, local_date: date, location: Location) -> dict:
        location.validate()
        zone = ZoneInfo(location.timezone)
        start = datetime.combine(local_date, time.min, tzinfo=zone)
        end = datetime.combine(local_date + timedelta(days=1), time.min, tzinfo=zone)
        t0, t1 = self._time(start), self._time(end)
        events, states = almanac.find_discrete(
            t0, t1, almanac.sunrise_sunset(self.eph, location.latitude, location.longitude)
        )
        sunrise = next((event for event, state in zip(events, states) if bool(state)), None)
        sunset = next((event for event, state in zip(events, states) if not bool(state)), None)
        return {
            "sunrise_utc": sunrise.utc_datetime().isoformat() if sunrise else None,
            "sunset_utc": sunset.utc_datetime().isoformat() if sunset else None,
            "sunrise_local": sunrise.astimezone(zone).isoformat() if sunrise else None,
            "sunset_local": sunset.astimezone(zone).isoformat() if sunset else None,
            "status": "normal" if sunrise and sunset else (
                "polar_day_or_no_sunset" if sunrise else "polar_night_or_no_sunrise"
            ),
        }

    def calculate(self, local_date: date, location: Location) -> dict:
        location.validate()
        zone = ZoneInfo(location.timezone)
        local_noon = datetime.combine(local_date, time(12), tzinfo=zone)
        positions = self.sidereal_longitudes(local_noon)
        angles = self.panchang_angles(local_noon)
        phase = angles["tithi_phase"]
        nak = angles["nakshatra_longitude"]
        yoga = angles["yoga_longitude"]
        return {
            "schema_version": "1.0.0",
            "engine": ENGINE_ID,
            "ephemeris": self.ephemeris_source,
            "calculation_profile": {
                "system": "Drik Ganita",
                "ayanamsha": "Lahiri / Chitra Paksha",
                "ayanamsha_implementation": AYANAMSHA_ID,
                "status": "reference_validation_required",
            },
            "date": local_date.isoformat(),
            "location": asdict(location),
            "reference_instant_local": local_noon.isoformat(),
            "reference_instant_utc": local_noon.astimezone(UTC).isoformat(),
            "positions_sidereal_degrees": positions,
            "ayanamsha_degrees": self.lahiri_ayanamsha(self._time(local_noon).tt),
            "panchang": {
                "tithi_index_0": int(phase // 12),
                "nakshatra_index_0": int(nak // (360 / 27)),
                "yoga_index_0": int(yoga // (360 / 27)),
                "karana_half_tithi_index_0": int(phase // 6),
                "angles_degrees": angles,
            },
            "solar_events": self.sunrise_sunset(local_date, location),
        }
