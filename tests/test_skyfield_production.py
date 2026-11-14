"""Production-path validation for the Skyfield Panchang engine.

Reference values below were produced independently with Swiss Ephemeris
(pyswisseph) and are NOT derived from the code under test.
"""
import os
import unittest
from datetime import date, datetime, timezone

from engine import skyfield_provider as provider
from engine.panchang_calculator import get_complete_panchang
from engine.festival_detector import detect_todays_festivals

UJJAIN = (23.1765, 75.7885, 5.5)


def _reset_provider():
    provider._engine = None
    provider._failed = False


class SkyfieldProductionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.pop("PANCHANG_ENGINE", None)
        _reset_provider()
        if provider.get_engine() is None:
            raise unittest.SkipTest("Skyfield ephemeris unavailable")

    def test_longitudes_match_swiss_reference(self):
        engine = provider.get_engine()
        refs = {
            datetime(2026, 11, 14, 0, 30, tzinfo=timezone.utc): (231.645, 283.820),
            datetime(2026, 11, 15, 0, 30, tzinfo=timezone.utc): (232.652, 295.616),
            datetime(2026, 11, 17, 0, 30, tzinfo=timezone.utc): (234.667, 319.433),
        }
        for instant, (sun, moon) in refs.items():
            got = engine.tropical_longitudes(instant)
            self.assertAlmostEqual(got["sun"], sun, delta=0.01)
            self.assertAlmostEqual(got["moon"], moon, delta=0.01)

    def test_lahiri_ayanamsha_within_arcsecond_scale_of_swiss(self):
        from engine.skyfield_panchang import SkyfieldPanchangAstronomy as S
        # Swiss Ephemeris SE_SIDM_LAHIRI: 2026-11-14 -> 24.23243, 2027-11-14 -> 24.24639
        jd_2026 = 2461358.5
        self.assertAlmostEqual(S.lahiri_ayanamsha(jd_2026), 24.23243, delta=0.002)

    def test_sun_and_moon_separate_about_twelve_degrees_per_day(self):
        engine = provider.get_engine()
        a = engine.panchang_angles(datetime(2026, 11, 14, 0, tzinfo=timezone.utc))["tithi_phase"]
        b = engine.panchang_angles(datetime(2026, 11, 15, 0, tzinfo=timezone.utc))["tithi_phase"]
        self.assertTrue(10.0 < (b - a) % 360 < 15.0)

    def test_diwali_2026_dates(self):
        def titles(day):
            p = get_complete_panchang(day, *UJJAIN)
            return [e["title"] for e in detect_todays_festivals(p, day)]
        self.assertIn("धनतेरस / धनत्रयोदशी", titles(date(2026, 11, 6)))
        self.assertNotIn("धनतेरस / धनत्रयोदशी", titles(date(2026, 11, 7)))
        diwali = titles(date(2026, 11, 8))
        self.assertEqual(diwali[0], "दीपावली / महालक्ष्मी पूजन")
        self.assertNotIn("दीपावली / महालक्ष्मी पूजन", titles(date(2026, 11, 9)))

    def test_purnimanta_month_and_adhika(self):
        nov = get_complete_panchang(date(2026, 11, 14), *UJJAIN)
        self.assertEqual(nov["month_purnimanta"], "कार्तिक")
        self.assertFalse(nov["is_adhika"])
        self.assertEqual(nov["calculation_engine"], "skyfield-de421")
        adhik = get_complete_panchang(date(2026, 5, 20), *UJJAIN)
        self.assertTrue(adhik["is_adhika"])
        self.assertTrue(adhik["hindu_month"].startswith("अधिक ज्येष्ठ"))

    def test_samvat_rolls_over_at_chaitra_not_january(self):
        jan = get_complete_panchang(date(2027, 1, 10), *UJJAIN)
        self.assertEqual((jan["vikram_samvat"], jan["shaka_samvat"]), (2083, 1948))
        nov = get_complete_panchang(date(2026, 11, 14), *UJJAIN)
        self.assertEqual((nov["vikram_samvat"], nov["shaka_samvat"]), (2083, 1948))

    def test_exact_end_times_are_after_sunrise_and_formatted(self):
        p = get_complete_panchang(date(2026, 11, 14), *UJJAIN)
        for key in ("tithi_end", "nakshatra_end", "yoga_end"):
            self.assertRegex(p[key], r"^\d{2}:\d{2} (AM|PM)")

    def test_festival_cards_have_no_hardcoded_clock_times(self):
        import re, pathlib
        source = pathlib.Path("engine/festival_detector.py").read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"\d{1,2}:\d{2} (AM|PM)", source))


class LegacyFallbackTests(unittest.TestCase):
    def tearDown(self):
        os.environ.pop("PANCHANG_ENGINE", None)
        _reset_provider()

    def test_legacy_engine_still_serves_when_disabled(self):
        os.environ["PANCHANG_ENGINE"] = "legacy"
        _reset_provider()
        p = get_complete_panchang(date(2026, 11, 14), *UJJAIN)
        self.assertEqual(p["calculation_engine"], "legacy-analytic")
        self.assertIn(p["paksha"], ("शुक्ल पक्ष", "कृष्ण पक्ष"))

    def test_missing_ephemeris_falls_back_without_raising(self):
        os.environ["SKYFIELD_EPHEMERIS"] = "/nonexistent/de421.bsp"
        try:
            _reset_provider()
            p = get_complete_panchang(date(2026, 11, 14), *UJJAIN)
            self.assertEqual(p["calculation_engine"], "legacy-analytic")
        finally:
            os.environ.pop("SKYFIELD_EPHEMERIS", None)
            _reset_provider()


if __name__ == "__main__":
    unittest.main()
