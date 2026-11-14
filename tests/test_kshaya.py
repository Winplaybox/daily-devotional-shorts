import unittest, datetime
from engine.panchang_calculator import get_complete_panchang
from engine.festival_detector import detect_todays_festivals

def titles(d):
    p = get_complete_panchang(d, lat=23.1765, lon=75.7885, tz=5.5)
    return [m["title"] for m in detect_todays_festivals(p, d)]

class Kshaya(unittest.TestCase):
    def test_dev_uthani_on_kshaya_day(self):
        self.assertTrue(any("देवउठनी" in t for t in titles(datetime.date(2026, 11, 20))))
    def test_not_next_day(self):
        self.assertFalse(any("देवउठनी" in t for t in titles(datetime.date(2026, 11, 21))))

class Festivals(unittest.TestCase):
    def test_karwa_chauth_2026(self):
        self.assertTrue(any("करवा" in t for t in titles(datetime.date(2026, 10, 29))))
        self.assertFalse(any("करवा" in t for t in titles(datetime.date(2026, 10, 28))))
    def test_holi_2027(self):
        self.assertTrue(any("होलिका" in t for t in titles(datetime.date(2027, 3, 21))))
        self.assertTrue(any("होली (" in t for t in titles(datetime.date(2027, 3, 22))))
        self.assertFalse(any("होली (" in t for t in titles(datetime.date(2027, 3, 21))))
