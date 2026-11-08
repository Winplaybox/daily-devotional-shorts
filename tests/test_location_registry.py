import json
import os
import unittest
from unittest.mock import patch

from engine.location_registry import get_location_registry


class LocationRegistryTimezoneTests(unittest.TestCase):
    def _custom_registry(self, **overrides):
        location = {
            "location_id": "custom-timezone-test",
            "city": "Test City",
            "state": "Test State",
            "latitude": 0.0,
            "longitude": 0.0,
            "timezone": "Asia/Kolkata",
            "timezone_offset_hours": 5.5,
        }
        location.update(overrides)
        return patch.dict(
            os.environ,
            {"PANCHANG_CUSTOM_LOCATIONS_JSON": json.dumps([location])},
        )

    def test_builtin_locations_have_valid_iana_timezones_and_bounded_offsets(self):
        registry = get_location_registry()
        self.assertTrue(registry)
        for location in registry.values():
            self.assertTrue(location.timezone)
            self.assertGreaterEqual(location.timezone_offset_hours, -14)
            self.assertLessEqual(location.timezone_offset_hours, 14)

    def test_accepts_valid_dst_iana_timezone(self):
        with self._custom_registry(
            timezone="America/New_York",
            timezone_offset_hours=-5,
        ):
            registry = get_location_registry()
        self.assertEqual(registry["custom-timezone-test"].timezone, "America/New_York")

    def test_rejects_unknown_iana_timezone(self):
        with self._custom_registry(timezone="Mars/Olympus_Mons"):
            with self.assertRaisesRegex(ValueError, "Invalid IANA timezone"):
                get_location_registry()

    def test_rejects_empty_or_whitespace_padded_timezone(self):
        for timezone_name in ("", " Asia/Kolkata "):
            with self.subTest(timezone=timezone_name):
                with self._custom_registry(timezone=timezone_name):
                    with self.assertRaisesRegex(ValueError, "valid IANA timezone|Invalid IANA timezone"):
                        get_location_registry()

    def test_rejects_non_finite_timezone_offsets(self):
        for offset in ("nan", "inf", "-inf"):
            with self.subTest(offset=offset):
                with self._custom_registry(timezone_offset_hours=offset):
                    with self.assertRaisesRegex(ValueError, "timezone_offset_hours"):
                        get_location_registry()

    def test_rejects_out_of_range_and_boolean_timezone_offsets(self):
        for offset in (-14.1, 14.1, True):
            with self.subTest(offset=offset):
                with self._custom_registry(timezone_offset_hours=offset):
                    with self.assertRaisesRegex(ValueError, "timezone_offset_hours"):
                        get_location_registry()


if __name__ == "__main__":
    unittest.main()
