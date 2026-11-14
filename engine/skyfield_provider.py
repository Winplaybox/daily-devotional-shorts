"""Production bridge from the Skyfield astronomy module to the Panchang calculator.

Failure-safe by design: any problem (missing ephemeris, unsupported date) makes
``skyfield_elements`` return ``None`` so the caller keeps the legacy analytic
result instead of breaking the daily publish.

Set PANCHANG_ENGINE=legacy to disable. Ephemeris resolution order:
SKYFIELD_EPHEMERIS -> bundled skyfield-data de421.bsp -> Skyfield download.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

log = logging.getLogger("panchang.skyfield")
_engine = None
_failed = False
MEAN_SYNODIC_RATE_DEG_PER_DAY = 12.190749  # mean Moon-Sun elongation rate


def _resolve_ephemeris() -> str | None:
    configured = os.getenv("SKYFIELD_EPHEMERIS")
    if configured:
        return configured
    try:
        import skyfield_data  # type: ignore

        candidate = Path(skyfield_data.get_skyfield_data_path()) / "de421.bsp"
        if candidate.exists():
            return str(candidate)
    except Exception:  # noqa: BLE001 - optional dependency
        pass
    return None


def get_engine():
    global _engine, _failed
    if _engine is not None or _failed:
        return _engine
    if os.getenv("PANCHANG_ENGINE", "skyfield").strip().lower() == "legacy":
        _failed = True
        return None
    try:
        from .skyfield_panchang import SkyfieldPanchangAstronomy

        _engine = SkyfieldPanchangAstronomy(_resolve_ephemeris())
    except Exception as exc:  # noqa: BLE001
        _failed = True
        log.warning("Skyfield unavailable, using legacy Panchang engine: %s", exc)
        print(f"[PANCHANG] Skyfield unavailable, using legacy engine: {exc}", flush=True)
    return _engine


def _signed_phase(angle: float) -> float:
    return angle - 360.0 if angle > 180.0 else angle


def lunation_new_moons(engine, instant: datetime) -> tuple[datetime, datetime]:
    """Previous and next new moon (UTC) around ``instant`` via Newton iteration."""
    def refine(guess: datetime) -> datetime:
        t = guess
        for _ in range(8):
            p = _signed_phase(engine.panchang_angles(t)["tithi_phase"])
            if abs(p) < 1e-4:
                break
            t = t - timedelta(days=p / MEAN_SYNODIC_RATE_DEG_PER_DAY)
        return t

    phase = engine.panchang_angles(instant)["tithi_phase"]
    prev_guess = instant - timedelta(days=phase / MEAN_SYNODIC_RATE_DEG_PER_DAY)
    next_guess = instant + timedelta(days=(360.0 - phase) / MEAN_SYNODIC_RATE_DEG_PER_DAY)
    return refine(prev_guess), refine(next_guess)


def lunar_month(engine, instant: datetime) -> dict:
    """Amanta/Purnimanta month indices (0=Chaitra) and Adhika flag.

    Amanta month = sidereal sun rashi at the preceding new moon + 1. A lunation
    whose start and end share the same rashi has no sankranti and is Adhika.
    """
    prev_nm, next_nm = lunation_new_moons(engine, instant)
    rashi_prev = int(engine.sidereal_longitudes(prev_nm)["sun"] // 30) % 12
    rashi_next = int(engine.sidereal_longitudes(next_nm)["sun"] // 30) % 12
    adhika = rashi_prev == rashi_next
    amanta = (rashi_prev + 1) % 12
    krishna = engine.panchang_angles(instant)["tithi_phase"] >= 180.0
    purnimanta = (amanta + 1) % 12 if krishna else amanta
    return {"amanta_index": amanta, "purnimanta_index": purnimanta, "adhika": adhika}


def skyfield_elements(sunrise_local: datetime, tz_hours: float, light: bool = False) -> dict | None:
    """Panchang elements at an instant plus (unless ``light``) month and limb end times."""
    engine = get_engine()
    if engine is None:
        return None
    try:
        zone = timezone(timedelta(hours=tz_hours))
        at = sunrise_local.replace(tzinfo=zone)
        angles = engine.panchang_angles(at)
        month = None if light else lunar_month(engine, at)
        ends = {}
        for key, name, seg in () if light else (
            ("tithi_end", "tithi_phase", 12.0),
            ("nakshatra_end", "nakshatra_longitude", 360.0 / 27.0),
            ("yoga_end", "yoga_longitude", 360.0 / 27.0),
        ):
            ends[key] = engine.next_boundary(at, name, seg, max_hours=80).astimezone(zone)
        sidereal = engine.sidereal_longitudes(at)
        return {
            "tithi_phase": angles["tithi_phase"],
            "nakshatra_longitude": angles["nakshatra_longitude"],
            "yoga_longitude": angles["yoga_longitude"],
            "sun_sidereal": sidereal["sun"],
            "month": month,
            "ends": ends,
            "engine": "skyfield-de421",
        }
    except Exception as exc:  # noqa: BLE001
        log.warning("Skyfield calculation failed, using legacy: %s", exc)
        print(f"[PANCHANG] Skyfield calculation failed, using legacy: {exc}", flush=True)
        return None
