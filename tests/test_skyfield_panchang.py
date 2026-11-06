import unittest
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from engine.skyfield_panchang import Location, SkyfieldPanchangAstronomy

class LocationValidationTests(unittest.TestCase):
    def test_rejects_invalid_coordinates(self):
        with self.assertRaises(ValueError):
            Location("Bad", 91, 0, "Asia/Kolkata").validate()

    def test_rejects_unknown_timezone(self):
        with self.assertRaises(Exception):
            Location("Bad", 19, 72, "Mars/Olympus").validate()

class SkyfieldEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            cls.engine = SkyfieldPanchangAstronomy()
        except Exception as exc:
            raise unittest.SkipTest(f"Skyfield ephemeris unavailable: {exc}")

    def test_sidereal_longitudes_are_normalized(self):
        instant = datetime(2026, 11, 6, 12, tzinfo=timezone.utc)
        values = self.engine.sidereal_longitudes(instant)
        self.assertEqual(set(values), {"sun", "moon"})
        self.assertTrue(all(0 <= value < 360 for value in values.values()))

    def test_panchang_indices_are_in_range(self):
        instant = datetime(2026, 11, 6, 12, tzinfo=timezone.utc)
        angles = self.engine.panchang_angles(instant)
        self.assertTrue(0 <= int(angles["tithi_phase"] // 12) < 30)
        self.assertTrue(0 <= int(angles["nakshatra_longitude"] // (360 / 27)) < 27)
        self.assertTrue(0 <= int(angles["yoga_longitude"] // (360 / 27)) < 27)

    def test_solar_event_presence_checks_do_not_coerce_skyfield_time(self):
        from unittest.mock import patch
        from skyfield.timelib import Time

        location = Location("Virar, Maharashtra, India", 19.4559, 72.8114, "Asia/Kolkata")
        events, states = self.engine.ts.from_datetimes([
            datetime(2026, 11, 6, 1, tzinfo=timezone.utc),
            datetime(2026, 11, 6, 12, tzinfo=timezone.utc),
        ]), [True, False]
        with patch("engine.skyfield_panchang.almanac.find_discrete", return_value=(events, states)):
            result = self.engine.sunrise_sunset(date(2026, 11, 6), location)
        self.assertEqual(result["status"], "normal")
        self.assertIsNotNone(result["sunrise_utc"])
        self.assertIsNotNone(result["sunset_utc"])

    def test_virar_sunrise_and_sunset_are_localized(self):
        location = Location("Virar, Maharashtra, India", 19.4559, 72.8114, "Asia/Kolkata")
        result = self.engine.sunrise_sunset(date(2026, 11, 6), location)
        self.assertIn(result["status"], {"normal", "polar_day_or_no_sunset", "polar_night_or_no_sunrise"})
        self.assertTrue(result["sunrise_utc"] is None or result["sunrise_utc"].endswith("+00:00"))
        self.assertTrue(result["sunset_utc"] is None or result["sunset_utc"].endswith("+00:00"))
        self.assertTrue(result["sunrise_local"] is None or result["sunrise_local"].endswith("+05:30"))
        self.assertTrue(result["sunset_local"] is None or result["sunset_local"].endswith("+05:30"))

if __name__ == "__main__":
    unittest.main()
