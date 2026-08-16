from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from PIL import Image

from spine_detection.types import (
    DetectionBox,
    DetectorInferenceError,
    DetectorResult,
    DetectorTimings,
    DetectorUnavailableError,
)


def image_upload(
    *,
    name: str = "shelf.png",
    image_format: str = "PNG",
    content_type: str = "image/png",
    size: tuple[int, int] = (120, 80),
) -> SimpleUploadedFile:
    buffer = BytesIO()
    Image.new("RGB", size, color="white").save(buffer, format=image_format)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


class FakeDetector:
    image_path: Path | None = None
    prompt: str | None = None
    threshold: float | None = None

    def detect(self, image_path: Path, prompt: str, threshold: float) -> DetectorResult:
        self.image_path = image_path
        self.prompt = prompt
        self.threshold = threshold
        if not image_path.exists():
            raise AssertionError("Temporary image must exist during detection")
        return DetectorResult(
            model_id="google/owlv2-base-patch16-ensemble",
            device="cpu",
            image_width=120,
            image_height=80,
            boxes=(
                DetectionBox(10.0, 5.0, 30.0, 75.0, 0.91234, "book spine"),
            ),
            truncated=False,
            timings=DetectorTimings(12.0, 3.0, 25.0, 2.0),
        )


class UnavailableDetector:
    def detect(self, image_path: Path, prompt: str, threshold: float) -> DetectorResult:
        raise DetectorUnavailableError("Run `python manage.py warm_detector` first.")


class FailingDetector:
    def detect(self, image_path: Path, prompt: str, threshold: float) -> DetectorResult:
        raise DetectorInferenceError("The local detector could not process this image.")


class AnalyzeShelfApiTests(SimpleTestCase):
    endpoint = "/api/v1/analyze"

    def test_detects_with_safe_defaults_and_removes_the_temporary_file(self) -> None:
        detector = FakeDetector()
        with patch("spine_detection.services.get_detector", return_value=detector):
            response = self.client.post(self.endpoint, {"image": image_upload()})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "completed")
        self.assertEqual(payload["model"], "google/owlv2-base-patch16-ensemble")
        self.assertEqual(payload["device"], "cpu")
        self.assertEqual(payload["prompt"], "book spine")
        self.assertEqual(payload["threshold"], 0.3)
        self.assertEqual(payload["image"], {"width": 120, "height": 80})
        self.assertEqual(payload["detection_count"], 1)
        self.assertEqual(
            payload["detections"][0],
            {
                "id": 1,
                "label": "book spine",
                "score": 0.9123,
                "box": {"x_min": 10.0, "y_min": 5.0, "x_max": 30.0, "y_max": 75.0},
            },
        )
        self.assertEqual(payload["timings_ms"]["inference"], 25.0)
        self.assertGreaterEqual(payload["timings_ms"]["total"], 0)
        self.assertFalse(payload["persisted"])
        self.assertIsNotNone(detector.image_path)
        assert detector.image_path is not None
        self.assertFalse(detector.image_path.exists())

    def test_accepts_a_custom_prompt_and_threshold(self) -> None:
        detector = FakeDetector()
        with patch("spine_detection.services.get_detector", return_value=detector):
            response = self.client.post(
                self.endpoint,
                {
                    "image": image_upload(),
                    "prompt": "upright book",
                    "threshold": "0.45",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(detector.prompt, "upright book")
        self.assertEqual(detector.threshold, 0.45)

    def test_accepts_a_valid_webp_upload(self) -> None:
        detector = FakeDetector()
        with patch("spine_detection.services.get_detector", return_value=detector):
            response = self.client.post(
                self.endpoint,
                {
                    "image": image_upload(
                        name="shelf.webp",
                        image_format="WEBP",
                        content_type="image/webp",
                    )
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "completed")

    def test_rejects_a_missing_image(self) -> None:
        response = self.client.post(self.endpoint, {})

        self.assertEqual(response.status_code, 400)
        self.assertIn("image", response.json())

    def test_rejects_an_unsupported_or_invalid_file(self) -> None:
        upload = SimpleUploadedFile("shelf.txt", b"not an image", content_type="text/plain")

        response = self.client.post(self.endpoint, {"image": upload})

        self.assertEqual(response.status_code, 400)
        self.assertIn("valid JPEG, PNG, or WebP", str(response.json()["image"][0]))

    def test_rejects_mismatched_content_and_metadata(self) -> None:
        response = self.client.post(
            self.endpoint,
            {"image": image_upload(name="shelf.jpg", content_type="image/jpeg")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("must agree", str(response.json()["image"][0]))

    @override_settings(SPINE_IMAGE_MAX_UPLOAD_BYTES=10)
    def test_rejects_an_oversized_image(self) -> None:
        response = self.client.post(self.endpoint, {"image": image_upload()})

        self.assertEqual(response.status_code, 400)
        self.assertIn("10 bytes or smaller", str(response.json()["image"][0]))

    @override_settings(SPINE_IMAGE_MAX_PIXELS=100)
    def test_rejects_an_image_with_too_many_pixels(self) -> None:
        response = self.client.post(
            self.endpoint,
            {"image": image_upload(size=(11, 10))},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("100 pixels or fewer", str(response.json()["image"][0]))

    def test_rejects_an_out_of_range_threshold(self) -> None:
        response = self.client.post(
            self.endpoint,
            {"image": image_upload(), "threshold": "0.99"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("threshold", response.json())

    def test_returns_a_clean_provider_unavailable_error(self) -> None:
        with patch(
            "spine_detection.services.get_detector",
            return_value=UnavailableDetector(),
        ):
            response = self.client.post(self.endpoint, {"image": image_upload()})

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "detector_unavailable")

    def test_returns_a_clean_inference_error(self) -> None:
        with patch(
            "spine_detection.services.get_detector",
            return_value=FailingDetector(),
        ):
            response = self.client.post(self.endpoint, {"image": image_upload()})

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["error"]["code"], "detection_failed")
