import unittest
from datetime import date

from engine.publish_buffer import resolve_target_date


class PublishBufferTests(unittest.TestCase):
    def test_three_day_buffer_uses_calendar_days(self):
        self.assertEqual(
            resolve_target_date(3, "Asia/Kolkata", date(2026, 11, 6)),
            date(2026, 11, 9),
        )

    def test_month_and_year_rollover(self):
        self.assertEqual(
            resolve_target_date(3, "Asia/Kolkata", date(2026, 12, 30)),
            date(2027, 1, 2),
        )

    def test_dst_zone_uses_local_calendar_date(self):
        self.assertEqual(
            resolve_target_date(3, "America/New_York", date(2026, 3, 7)),
            date(2026, 3, 10),
        )

    def test_unknown_timezone_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unknown IANA timezone"):
            resolve_target_date(3, "Mars/Olympus", date(2026, 11, 6))

    def test_negative_buffer_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "non-negative"):
            resolve_target_date(-1, "Asia/Kolkata", date(2026, 11, 6))


if __name__ == "__main__":
    unittest.main()
