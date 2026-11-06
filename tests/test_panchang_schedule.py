import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from engine.panchang_engine import compute_scheduled_publish_time


class CatchupPublishScheduleTests(unittest.TestCase):
    def test_explicit_utc_override_is_preserved(self):
        with patch.dict(os.environ, {"PANCHANG_PUBLISH_AT": "2099-11-06T13:30:00Z"}):
            self.assertEqual(
                compute_scheduled_publish_time("morning", datetime(2099, 11, 6).date()),
                "2099-11-06T13:30:00.000Z",
            )

    def test_override_without_timezone_is_rejected(self):
        with patch.dict(os.environ, {"PANCHANG_PUBLISH_AT": "2099-11-06T19:00:00"}):
            with self.assertRaisesRegex(ValueError, "include Z or an explicit UTC offset"):
                compute_scheduled_publish_time("morning", datetime(2099, 11, 6).date())

    def test_override_inside_processing_buffer_is_rejected(self):
        too_soon = datetime.now(timezone.utc).replace(microsecond=0)
        with patch.dict(os.environ, {"PANCHANG_PUBLISH_AT": too_soon.isoformat()}):
            with self.assertRaisesRegex(ValueError, "at least 30 minutes"):
                compute_scheduled_publish_time("morning", too_soon.date())


if __name__ == "__main__":
    unittest.main()
