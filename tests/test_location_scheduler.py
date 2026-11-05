import unittest
from datetime import date

from engine.location_registry import resolve_location, select_daily_locations
from engine.location_scheduler import build_location_jobs


class LocationRegistryTests(unittest.TestCase):
    def test_resolves_city_and_timezone(self):
        location = resolve_location("miraroad")
        self.assertEqual(location.city, "Mira Road")
        self.assertEqual(location.timezone, "Asia/Kolkata")

    def test_unknown_location_fails_closed(self):
        with self.assertRaises(ValueError):
            resolve_location("not-a-city")

    def test_empty_explicit_location_fails_closed(self):
        with self.assertRaises(ValueError):
            resolve_location("")

    def test_daily_jobs_are_location_scoped_and_deterministic(self):
        jobs = build_location_jobs(date(2026, 11, 7), ["miraroad", "ujjain"])
        self.assertEqual([job["job_id"] for job in jobs], [
            "panchang-2026-11-07-miraroad",
            "panchang-2026-11-07-ujjain",
        ])
        self.assertEqual(jobs[0]["location"]["city"], "Mira Road")
        self.assertEqual(jobs[1]["location"]["city"], "Ujjain")

    def test_dynamic_count_respects_calendar_selection(self):
        jobs = build_location_jobs(date(2026, 11, 7), ["mumbai", "delhi", "varanasi"], max_jobs=2)
        self.assertEqual(len(jobs), 2)

    def test_hybrid_default_has_multiple_active_regions(self):
        locations = select_daily_locations()
        self.assertGreaterEqual(len(locations), 8)
        self.assertGreater(len({item.state for item in locations}), 4)


if __name__ == "__main__":
    unittest.main()
