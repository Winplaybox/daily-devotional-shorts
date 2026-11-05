import unittest
from engine.world_time import resolve_local_day

class WorldTimeTests(unittest.TestCase):
    def test_iana_zone_for_india(self):
        result = resolve_local_day("2026-11-07", "Asia/Kolkata")
        self.assertEqual(result["utc_offset_seconds"], 19800)

    def test_dst_offset_is_resolved_for_target_date(self):
        winter = resolve_local_day("2026-01-15", "America/New_York")
        summer = resolve_local_day("2026-07-15", "America/New_York")
        self.assertEqual(winter["utc_offset_seconds"], -18000)
        self.assertEqual(summer["utc_offset_seconds"], -14400)

    def test_rejects_unknown_timezone(self):
        with self.assertRaises(ValueError):
            resolve_local_day("2026-11-07", "Mars/Olympus")

if __name__ == "__main__":
    unittest.main()
