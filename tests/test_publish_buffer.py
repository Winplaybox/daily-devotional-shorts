import unittest
from datetime import date, datetime, timezone

from engine.publish_buffer import local_calendar_date, parse_date_override, resolve_target_date


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


    def test_leap_year_boundary(self):
        self.assertEqual(
            resolve_target_date(1, "Asia/Kolkata", date(2024, 2, 28)),
            date(2024, 2, 29),
        )
        self.assertEqual(
            resolve_target_date(2, "Asia/Kolkata", date(2024, 2, 28)),
            date(2024, 3, 1),
        )

    def test_zero_day_buffer_returns_the_same_local_date(self):
        self.assertEqual(
            resolve_target_date(0, "Asia/Kolkata", date(2026, 11, 6)),
            date(2026, 11, 6),
        )

    def test_buffer_must_be_a_non_negative_integer(self):
        for value in (True, 1.5, "3", -1):
            with self.subTest(value=value):
                with self.assertRaisesRegex(ValueError, "non-negative integer"):
                    resolve_target_date(value, "Asia/Kolkata", date(2026, 11, 6))

    def test_local_calendar_date_uses_iana_offset_before_and_after_dst_transition(self):
        before = datetime(2026, 3, 8, 4, 30, tzinfo=timezone.utc)
        after = datetime(2026, 3, 8, 7, 30, tzinfo=timezone.utc)
        self.assertEqual(local_calendar_date("America/New_York", before), date(2026, 3, 7))
        self.assertEqual(local_calendar_date("America/New_York", after), date(2026, 3, 8))

    def test_local_calendar_date_uses_india_offset_across_utc_midnight(self):
        instant = datetime(2026, 11, 6, 20, 0, tzinfo=timezone.utc)
        self.assertEqual(local_calendar_date("Asia/Kolkata", instant), date(2026, 11, 7))

    def test_local_calendar_date_rejects_naive_instants(self):
        with self.assertRaisesRegex(ValueError, "timezone-aware"):
            local_calendar_date("Asia/Kolkata", datetime(2026, 11, 6, 20, 0))

    def test_manual_override_requires_a_valid_iso_calendar_date(self):
        self.assertEqual(parse_date_override(" 2026-11-09 "), date(2026, 11, 9))
        for value in ("20261109", "2026-2-9", "2026-02-30", "2026-W45-1", ""):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    parse_date_override(value)


if __name__ == "__main__":
    unittest.main()
