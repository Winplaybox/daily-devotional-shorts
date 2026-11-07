import pathlib
import unittest

from engine.publish_location import validate_production_location


class ProductionLocationValidationTests(unittest.TestCase):
    def test_accepts_explicit_locality_state_country_and_valid_coordinates(self):
        result = validate_production_location(
            explicitly_configured="true",
            latitude="19.4559",
            longitude="72.8114",
            location_label="Virar West, Maharashtra, India",
        )
        self.assertEqual(result["latitude"], 19.4559)
        self.assertEqual(result["longitude"], 72.8114)
        self.assertEqual(result["location"], "Virar West, Maharashtra, India")

    def test_rejects_unconfigured_reference_fallback(self):
        with self.assertRaisesRegex(ValueError, "review renders only"):
            validate_production_location(
                explicitly_configured="false",
                latitude="23.1765",
                longitude="75.7885",
                location_label="Ujjain, Madhya Pradesh, India (India reference)",
            )

    def test_rejects_invalid_or_out_of_range_coordinates(self):
        for latitude, longitude in [("north", "72.8"), ("91", "72.8"), ("19.4", "181")]:
            with self.subTest(latitude=latitude, longitude=longitude):
                with self.assertRaises(ValueError):
                    validate_production_location(
                        explicitly_configured="true",
                        latitude=latitude,
                        longitude=longitude,
                        location_label="Virar West, Maharashtra, India",
                    )

    def test_requires_locality_region_and_country(self):
        with self.assertRaisesRegex(ValueError, "locality/city, region/state and country"):
            validate_production_location(
                explicitly_configured="true",
                latitude="19.4559",
                longitude="72.8114",
                location_label="Virar, India",
            )

    def test_publisher_workflow_runs_location_guard_only_for_public_uploads(self):
        workflow = pathlib.Path(".github/workflows/daily-shorts-publisher.yml").read_text(encoding="utf-8")
        self.assertIn("PANCHANG_LOCATION_CONFIGURED:", workflow)
        self.assertIn("vars.PANCHANG_LAT", workflow)
        self.assertIn("vars.PANCHANG_LON", workflow)
        self.assertIn("vars.PANCHANG_LOCATION", workflow)
        self.assertIn("if: env.REQUEST_UPLOAD == 'true' && env.AUTO_PUBLISH == 'true'", workflow)
        self.assertIn("run: python -m engine.publish_location", workflow)


if __name__ == "__main__":
    unittest.main()
