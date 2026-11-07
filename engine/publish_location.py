"""Fail-closed validation for the location used by public Panchang uploads."""

from __future__ import annotations

import math
import os


def validate_production_location(*, explicitly_configured: str, latitude: str, longitude: str, location_label: str) -> dict[str, float | str]:
    """Require explicit, bounded coordinates and a locality/state/country label."""
    if str(explicitly_configured).strip().lower() != "true":
        raise ValueError(
            "Public YouTube publishing requires explicit PANCHANG_LAT, "
            "PANCHANG_LON and PANCHANG_LOCATION repository variables. "
            "The Ujjain India-reference fallback is for review renders only."
        )

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError) as exc:
        raise ValueError("PANCHANG_LAT and PANCHANG_LON must be numeric coordinates.") from exc

    if not math.isfinite(lat) or not -90 <= lat <= 90:
        raise ValueError("PANCHANG_LAT must be a finite value between -90 and 90.")
    if not math.isfinite(lon) or not -180 <= lon <= 180:
        raise ValueError("PANCHANG_LON must be a finite value between -180 and 180.")

    label = str(location_label or "").strip()
    parts = [part.strip() for part in label.split(",") if part.strip()]
    if len(parts) < 3:
        raise ValueError(
            "PANCHANG_LOCATION must identify locality/city, region/state and country; "
            "for example: 'Virar West, Maharashtra, India'."
        )

    return {"latitude": lat, "longitude": lon, "location": label}


def main() -> None:
    validate_production_location(
        explicitly_configured=os.getenv("PANCHANG_LOCATION_CONFIGURED", "false"),
        latitude=os.getenv("PANCHANG_LAT", ""),
        longitude=os.getenv("PANCHANG_LON", ""),
        location_label=os.getenv("PANCHANG_LOCATION", ""),
    )
    print("[LOCATION] Explicit production Panchang location validated.")


if __name__ == "__main__":
    main()
