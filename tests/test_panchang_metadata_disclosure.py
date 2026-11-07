import unittest

from engine.panchang_engine import generate_seo_metadata


class PanchangMetadataDisclosureTests(unittest.TestCase):
    def setUp(self):
        self.event = {
            "title": "दैनिक पंचांग",
            "label1": "तिथि",
            "val1": "शुक्ल पक्ष",
            "label2": "नक्षत्र",
            "val2": "रोहिणी",
            "label3": "योग",
            "val3": "सिद्धि",
            "footer": "स्थानीय समय देखें",
        }
        self.panchang = {
            "date_display": "7 नवम्बर 2026",
            "sunrise": "06:40 AM",
            "sunset": "05:55 PM",
            "tithi_name": "द्वादशी",
            "paksha": "शुक्ल पक्ष",
            "nakshatra_name": "रोहिणी",
            "yoga_name": "सिद्धि",
            "karana_name": "बव",
            "rahu_kaal": "10:30 AM से 12:00 PM",
            "abhijit": "11:45 AM से 12:30 PM",
            "brahma": "04:45 AM से 05:30 AM",
            "godhuli": "05:45 PM से 06:10 PM",
            "location_name": "Virar West, Maharashtra, India",
            "timezone_label": "IST",
        }

    def test_description_discloses_reference_location_and_timezone(self):
        description = generate_seo_metadata(self.event, self.panchang)["yt_description"]
        self.assertIn("Virar West, Maharashtra, India", description)
        self.assertIn("IST", description)

    def test_description_discloses_regional_variation_and_local_confirmation(self):
        description = generate_seo_metadata(self.event, self.panchang)["yt_description"]
        self.assertIn("अन्य शहरों और क्षेत्रीय परंपराओं में अंतर हो सकता है", description)
        self.assertIn("स्थानीय पंचांग/परंपरा से पुष्टि करें", description)

    def test_description_discloses_synthetic_tts_narration(self):
        description = generate_seo_metadata(self.event, self.panchang)["yt_description"]
        self.assertIn("डिजिटल टेक्स्ट-टू-स्पीच (TTS)", description)


    def test_description_does_not_claim_unverified_precision_or_authenticity(self):
        description = generate_seo_metadata(self.event, self.panchang)["yt_description"]
        self.assertNotIn("सटीक दैनिक पंचांग", description)
        self.assertNotIn("प्रामाणिक दैनिक पंचांग", description)

    def test_description_does_not_claim_unverified_accuracy_or_non_ai_media(self):
        description = generate_seo_metadata(self.event, self.panchang)["yt_description"]
        self.assertNotIn("100% मौलिक वैदिक खगोलीय गणना", description)
        self.assertNotIn("No AI synthetic media used", description)
        self.assertNotIn("Self-Declared Non-AI", description)


if __name__ == "__main__":
    unittest.main()
