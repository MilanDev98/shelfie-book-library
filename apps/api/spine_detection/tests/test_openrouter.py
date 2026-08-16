import json
from typing import Self
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from spine_detection.openrouter import (
    VisionProviderError,
    parse_spine_readings,
    read_spines,
)


def provider_payload(books: object) -> dict[str, object]:
    return {
        "choices": [
            {
                "message": {
                    "content": json.dumps({"books": books}),
                }
            }
        ]
    }


class SpineReadingParsingTests(SimpleTestCase):
    def test_preserves_provider_order_as_detection_order(self) -> None:
        readings = parse_spine_readings(
            provider_payload(
                [
                    {"id": 2, "title": "Dune", "author": "Frank Herbert", "readable": True},
                    {"id": 1, "title": "1984", "author": "George Orwell", "readable": True},
                ]
            ),
            (1, 2),
        )

        self.assertEqual([reading.id for reading in readings], [1, 2])

    def test_missing_spine_becomes_an_unreadable_review_item(self) -> None:
        readings = parse_spine_readings(
            provider_payload(
                [{"id": 1, "title": "Dune", "author": "Frank Herbert", "readable": True}]
            ),
            (1, 2),
        )

        self.assertEqual(readings[1].id, 2)
        self.assertIsNone(readings[1].title)
        self.assertFalse(readings[1].readable)

    def test_readable_requires_a_nonempty_title(self) -> None:
        readings = parse_spine_readings(
            provider_payload([{"id": 1, "title": "  ", "author": "Someone", "readable": True}]),
            (1,),
        )

        self.assertFalse(readings[0].readable)
        self.assertIsNone(readings[0].title)

    def test_rejects_duplicate_or_unknown_spine_ids(self) -> None:
        duplicate = provider_payload(
            [
                {"id": 1, "title": "Dune", "author": None, "readable": True},
                {"id": 1, "title": "Dune", "author": None, "readable": True},
            ]
        )
        unknown = provider_payload(
            [{"id": 9, "title": "Dune", "author": None, "readable": True}]
        )

        with self.assertRaisesMessage(VisionProviderError, "duplicate or unknown"):
            parse_spine_readings(duplicate, (1, 2))
        with self.assertRaisesMessage(VisionProviderError, "duplicate or unknown"):
            parse_spine_readings(unknown, (1, 2))

    def test_rejects_malformed_json_shape(self) -> None:
        with self.assertRaisesMessage(VisionProviderError, "malformed"):
            parse_spine_readings({"choices": []}, (1,))

    @override_settings(OPENROUTER_API_KEY="")
    def test_zero_crops_skip_provider_configuration(self) -> None:
        self.assertEqual(read_spines([]), [])

    @override_settings(
        OPENROUTER_API_KEY="test-key",
        OPENROUTER_VISION_MODEL="test/model",
    )
    def test_provider_request_bounds_output_and_sends_only_crops(self) -> None:
        class FakeResponse:
            def __enter__(self) -> Self:
                return self

            def __exit__(self, *args: object) -> None:
                return None

            def read(self) -> bytes:
                return json.dumps(provider_payload([
                    {"id": 1, "title": "Dune", "author": "Frank Herbert", "readable": True}
                ])).encode("utf-8")

        with patch("spine_detection.openrouter.urlopen", return_value=FakeResponse()) as request:
            readings = read_spines([(1, b"jpeg-crop")])

        sent_request = request.call_args.args[0]
        sent_body = json.loads(sent_request.data.decode("utf-8"))
        self.assertEqual(sent_body["model"], "test/model")
        self.assertEqual(sent_body["max_tokens"], 1000)
        self.assertEqual(sent_body["response_format"]["type"], "json_schema")
        response_schema = sent_body["response_format"]["json_schema"]
        self.assertTrue(response_schema["strict"])
        self.assertEqual(
            response_schema["schema"]["properties"]["books"]["items"]["required"],
            ["id", "title", "author", "readable"],
        )
        image_parts = [
            part
            for part in sent_body["messages"][0]["content"]
            if part["type"] == "image_url"
        ]
        self.assertEqual(len(image_parts), 1)
        self.assertEqual(readings[0].title, "Dune")
