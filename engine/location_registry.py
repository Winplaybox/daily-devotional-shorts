"""Curated India Panchang calculation locations.

Coordinates are city-centre reference points, not neighbourhood-level coordinates.
Add custom locations through PANCHANG_CUSTOM_LOCATIONS_JSON; never silently fall
back to a different city when a requested location cannot be resolved.
"""
from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from typing import Iterable


@dataclass(frozen=True)
class PanchangLocation:
    location_id: str
    city: str
    district: str
    state: str
    latitude: float
    longitude: float
    timezone: str = "Asia/Kolkata"
    timezone_offset_hours: float = 5.5
    active: bool = True
    source: str = "curated-city-centre"

    def to_dict(self) -> dict:
        return asdict(self)


# Representative city-centre reference coordinates. These are defaults for
# regional coverage; operators can override them with verified coordinates.
INDIA_CITY_LOCATIONS = (
    PanchangLocation("mumbai", "Mumbai", "Mumbai", "Maharashtra", 19.0760, 72.8777),
    PanchangLocation("miraroad", "Mira Road", "Thane", "Maharashtra", 19.2813, 72.8694),
    PanchangLocation("delhi", "New Delhi", "New Delhi", "Delhi", 28.6139, 77.2090),
    PanchangLocation("ujjain", "Ujjain", "Ujjain", "Madhya Pradesh", 23.1765, 75.7885),
    PanchangLocation("varanasi", "Varanasi", "Varanasi", "Uttar Pradesh", 25.3176, 82.9739),
    PanchangLocation("ahmedabad", "Ahmedabad", "Ahmedabad", "Gujarat", 23.0225, 72.5714),
    PanchangLocation("jaipur", "Jaipur", "Jaipur", "Rajasthan", 26.9124, 75.7873),
    PanchangLocation("bengaluru", "Bengaluru", "Bengaluru Urban", "Karnataka", 12.9716, 77.5946),
    PanchangLocation("hyderabad", "Hyderabad", "Hyderabad", "Telangana", 17.3850, 78.4867),
    PanchangLocation("kolkata", "Kolkata", "Kolkata", "West Bengal", 22.5726, 88.3639),
    PanchangLocation("chennai", "Chennai", "Chennai", "Tamil Nadu", 13.0827, 80.2707),
    PanchangLocation("pune", "Pune", "Pune", "Maharashtra", 18.5204, 73.8567),
)


def _custom_locations() -> list[PanchangLocation]:
    raw = os.getenv("PANCHANG_CUSTOM_LOCATIONS_JSON", "").strip()
    if not raw:
        return []
    try:
        values = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("PANCHANG_CUSTOM_LOCATIONS_JSON must be valid JSON") from exc
    if not isinstance(values, list):
        raise ValueError("Custom locations must be a JSON array")
    result = []
    for item in values:
        if not isinstance(item, dict):
            raise ValueError("Each custom location must be an object")
        required = ("location_id", "city", "state", "latitude", "longitude")
        missing = [key for key in required if key not in item]
        if missing:
            raise ValueError(f"Custom location missing fields: {', '.join(missing)}")
        result.append(PanchangLocation(
            location_id=str(item["location_id"]).strip().lower(),
            city=str(item["city"]).strip(),
            district=str(item.get("district", item["city"])).strip(),
            state=str(item["state"]).strip(),
            latitude=float(item["latitude"]),
            longitude=float(item["longitude"]),
            timezone=str(item.get("timezone", "Asia/Kolkata")),
            timezone_offset_hours=float(item.get("timezone_offset_hours", 5.5)),
            active=bool(item.get("active", True)),
            source="custom",
        ))
    return result


def get_location_registry() -> dict[str, PanchangLocation]:
    locations = list(INDIA_CITY_LOCATIONS) + _custom_locations()
    registry: dict[str, PanchangLocation] = {}
    for location in locations:
        if not location.location_id or location.location_id in registry:
            raise ValueError(f"Duplicate or empty location_id: {location.location_id!r}")
        if not (-90 <= location.latitude <= 90 and -180 <= location.longitude <= 180):
            raise ValueError(f"Invalid coordinates for {location.location_id}")
        if not location.city or not location.state:
            raise ValueError(f"Location {location.location_id} needs city and state")
        registry[location.location_id] = location
    return registry


def resolve_location(location_id: str) -> PanchangLocation:
    key = (location_id or "").strip().lower()
    if not key:
        raise ValueError("A location_id is required; no global default location is allowed")
    location = get_location_registry().get(key)
    if location is None or not location.active:
        raise ValueError(f"Unknown or inactive Panchang location: {key}")
    return location


def select_daily_locations(location_ids: Iterable[str] | None = None) -> list[PanchangLocation]:
    """Hybrid selection: requested IDs first; otherwise active curated + custom cities."""
    registry = get_location_registry()
    if location_ids is None:
        ids = [key for key, value in registry.items() if value.active]
    else:
        ids = [str(value).strip().lower() for value in location_ids if str(value).strip()]
    if not ids:
        raise ValueError("The daily location selection is empty")
    selected = []
    seen = set()
    for key in ids:
        if key in seen:
            continue
        selected.append(resolve_location(key))
        seen.add(key)
    return selected
