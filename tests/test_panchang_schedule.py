import os
import unittest
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from engine.panchang_engine import compute_scheduled_publish_time, generate_daily_payload


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


class SlotDatePayloadContractTests(unittest.TestCase):
    def test_each_slot_uses_its_intended_panchang_date_and_publish_date(self):
        target_date = date(2026, 11, 12)
        expected_publish_at = "2099-11-12T01:30:00.000Z"

        for slot in ("morning", "afternoon", "evening"):
            with self.subTest(slot=slot):
                calculation_dates = []
                festival_dates = []

                def fake_get_complete_panchang(calculation_date, **kwargs):
                    calculation_dates.append(calculation_date)
                    return {
                        "weekday": "गुरुवार",
                        "weekday_en": calculation_date.strftime("%A"),
                        "vikram_samvat": 2083,
                        "shaka_samvat": 1948,
                        "ayana": "दक्षिणायन",
                        "ritu": "शरद",
                        "hindu_month_clean": "कार्तिक",
                        "paksha": "शुक्ल पक्ष",
                        "tithi_number": 1,
                        "tithi_clean": "प्रतिपदा",
                        "nakshatra_clean": "रोहिणी",
                        "tithi_name": "प्रतिपदा",
                        "nakshatra_name": "रोहिणी",
                        "yoga_name": "सिद्धि",
                        "karana_name": "बव",
                        "sunrise": "06:00 AM",
                        "sunset": "06:00 PM",
                        "moonrise": "07:00 PM",
                        "moonset": "07:00 AM",
                        "day_length": "12h 0m",
                        "night_length": "12h 0m",
                        "abhijit": "12:00 PM से 12:30 PM",
                        "abhijit_range": "12:00 PM – 12:30 PM",
                        "amrit_kaal": "10:00 AM – 11:00 AM",
                        "brahma": "04:00 AM से 04:30 AM",
                        "brahma_range": "04:00 AM – 04:30 AM",
                        "rahu_kaal": "01:30 PM से 03:00 PM",
                        "rahu_kaal_range": "01:30 PM – 03:00 PM",
                        "yamaganda": "06:00 AM से 07:30 AM",
                        "yamaganda_range": "06:00 AM – 07:30 AM",
                        "gulika": "09:00 AM से 10:30 AM",
                        "gulika_range": "09:00 AM – 10:30 AM",
                        "choghadiya_day": [],
                        "choghadiya_auspicious": [],
                        "choghadiya_poster_items": [],
                        "disha_shool": "पश्चिम",
                        "amrit_choghadiya": "अमृत समय",
                        "shubh_choghadiya": "शुभ समय",
                        "date_display": calculation_date.strftime("%d %B %Y"),
                        "date_display_full": calculation_date.strftime("%d %B %Y"),
                        "tithi_ends_at": "दिनभर",
                        "nakshatra_ends_at": "दिनभर",
                        "nakshatra_lord": "चंद्र",
                        "yoga_ends_at": "दिनभर",
                        "sun_sign": "तुला",
                        "moon_sign": "वृषभ",
                    }

                def fake_detect_todays_festivals(panchang, calculation_date):
                    festival_dates.append(calculation_date)
                    return [{
                        "religion": "SANATANA DHARMA",
                        "title": "दैनिक पंचांग",
                        "label1": "तिथि",
                        "val1": "प्रतिपदा",
                        "label2": "नक्षत्र",
                        "val2": "रोहिणी",
                        "label3": "योग",
                        "val3": "सिद्धि",
                        "footer": "शुभ दिन",
                        "priority": 1,
                        "theme": "temple",
                    }]

                with (
                    patch.dict(os.environ, {
                        "PANCHANG_LAT": "23.1765",
                        "PANCHANG_LON": "75.7885",
                        "PANCHANG_TZ": "5.5",
                        "PANCHANG_LOCATION_MODE": "india_reference",
                        "PANCHANG_LOCATION": "",
                        "PANCHANG_TIMEZONE_LABEL": "IST",
                    }),
                    patch("engine.panchang_engine.get_complete_panchang", side_effect=fake_get_complete_panchang),
                    patch("engine.panchang_engine.detect_todays_festivals", side_effect=fake_detect_todays_festivals),
                    patch("engine.panchang_engine.generate_seo_metadata", return_value={}),
                    patch("engine.panchang_engine.get_target_playlist", return_value="Pavitra Panchang 365"),
                    patch("engine.panchang_engine.compute_scheduled_publish_time", return_value=expected_publish_at) as schedule_time,
                ):
                    payload = generate_daily_payload(target_date, slot=slot)

                expected_calculation_date = target_date + timedelta(days=1) if slot == "evening" else target_date
                self.assertEqual(calculation_dates, [expected_calculation_date])
                self.assertEqual(festival_dates, [expected_calculation_date])
                self.assertEqual(payload["date_meta"]["gregorian_date"], expected_calculation_date.isoformat())
                self.assertEqual(payload["publish_at"], expected_publish_at)
                schedule_time.assert_called_once_with(slot, target_date)

                if slot == "evening":
                    self.assertEqual(payload["title"], "कल का पंचांग (अग्रिम दर्शन)")
                elif slot == "afternoon":
                    self.assertTrue(payload["title"].startswith("आज का शुभ चौघड़िया"))


if __name__ == "__main__":
    unittest.main()
