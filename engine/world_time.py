"""IANA timezone validation and per-date UTC offset resolution for worldwide jobs."""
from __future__ import annotations
from datetime import date, datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

def resolve_local_day(target_date: str, timezone_name: str) -> dict:
    try:
        day = date.fromisoformat(target_date)
        zone = ZoneInfo(timezone_name)
    except (ValueError, ZoneInfoNotFoundError) as exc:
        raise ValueError(f"Invalid date or IANA timezone: {target_date!r}, {timezone_name!r}") from exc

    # Panchang calculations use the offset applicable to the local civil day.
    # Noon is used to avoid DST transition ambiguity around 00:00 in most zones.
    local_noon = datetime.combine(day, time(12, 0), tzinfo=zone)
    offset = local_noon.utcoffset()
    if offset is None:
        raise ValueError(f"Could not resolve UTC offset for {timezone_name}")
    return {
        "local_date": day.isoformat(),
        "timezone": timezone_name,
        "utc_offset_seconds": int(offset.total_seconds()),
        "utc_offset_hours": offset.total_seconds() / 3600,
        "local_noon_iso": local_noon.isoformat(),
    }
