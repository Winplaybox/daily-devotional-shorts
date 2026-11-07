import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from engine.panchang_engine import compute_scheduled_publish_time


class CatchupPublishScheduleTests(unittest.TestCase):
    def test_explicit_utc_override_is_applied_only_to_selected_slot(self):
        env = {
            "PANCHANG_PUBLISH_AT": "2099-11-06T10:15:00Z",
            "PANCHANG_PUBLISH_OVERRIDE_SLOT": "morning",
        }
        target_date = datetime(2099, 11, 6).date()
        with patch.dict(os.environ, env):
            self.assertEqual(compute_scheduled_publish_time("morning", target_date), "2099-11-06T10:15:00.000Z")
            self.assertEqual(compute_scheduled_publish_time("afternoon", target_date), "2099-11-06T07:00:00.000Z")
            self.assertEqual(compute_scheduled_publish_time("evening", target_date), "2099-11-06T13:30:00.000Z")

    def test_override_without_timezone_is_rejected(self):
        with patch.dict(os.environ, {"PANCHANG_PUBLISH_AT": "2099-11-06T19:00:00", "PANCHANG_PUBLISH_OVERRIDE_SLOT": "morning"}):
            with self.assertRaisesRegex(ValueError, "include Z or an explicit UTC offset"):
                compute_scheduled_publish_time("morning", datetime(2099, 11, 6).date())

    def test_override_inside_processing_buffer_is_rejected(self):
        too_soon = datetime.now(timezone.utc).replace(microsecond=0)
        with patch.dict(os.environ, {"PANCHANG_PUBLISH_AT": too_soon.isoformat(), "PANCHANG_PUBLISH_OVERRIDE_SLOT": "morning"}):
            with self.assertRaisesRegex(ValueError, "at least 30 minutes"):
                compute_scheduled_publish_time("morning", too_soon.date())


if __name__ == "__main__":
    unittest.main()
