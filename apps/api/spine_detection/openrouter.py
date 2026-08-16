from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any, cast
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class VisionProviderError(RuntimeError):
    """Raised when the hosted vision provider cannot return usable JSON."""

    def __init__(self, message: str, *, code: str = "vision_provider_failed") -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True, slots=True)
class SpineReading:
    id: int
    title: str | None
    author: str | None
    readable: bool


def _malformed_response(
    message: str = "OpenRouter returned malformed book-reading JSON.",
) -> VisionProviderError:
    return VisionProviderError(message, code="vision_provider_malformed_response")


def parse_spine_readings(payload: object, expected_ids: tuple[int, ...]) -> list[SpineReading]:
    """Validate provider JSON and preserve every detected spine for human review."""
    try:
        payload_dict = cast(dict[str, Any], payload)
        choices = payload_dict["choices"]
        if not isinstance(choices, list) or not choices:
            raise _malformed_response()
        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise _malformed_response()
        message = first_choice.get("message")
        if not isinstance(message, dict):
            raise _malformed_response()
        content = message.get("content")
        if not isinstance(content, str):
            raise _malformed_response()
        decoded = json.loads(content)
        if not isinstance(decoded, dict):
            raise _malformed_response()
        raw_books = decoded.get("books")
        if not isinstance(raw_books, list):
            raise _malformed_response()
    except VisionProviderError:
        raise
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
        raise _malformed_response() from error

    expected = set(expected_ids)
    readings_by_id: dict[int, SpineReading] = {}
    for raw_item in raw_books:
        if not isinstance(raw_item, dict):
            raise _malformed_response()
        item = cast(dict[str, Any], raw_item)
        try:
            spine_id = int(item["id"])
        except (KeyError, TypeError, ValueError) as error:
            raise _malformed_response() from error
        if spine_id not in expected or spine_id in readings_by_id:
            raise _malformed_response(
                "OpenRouter returned duplicate or unknown book-spine identifiers."
            )

        readable_value = item.get("readable")
        if not isinstance(readable_value, bool):
            raise _malformed_response()
        title_value = item.get("title")
        author_value = item.get("author")
        title = (
            title_value.strip()
            if isinstance(title_value, str) and title_value.strip()
            else None
        )
        author = (
            author_value.strip()
            if isinstance(author_value, str) and author_value.strip()
            else None
        )
        readings_by_id[spine_id] = SpineReading(
            id=spine_id,
            title=title,
            author=author,
            readable=readable_value and title is not None,
        )

    return [
        readings_by_id.get(
            spine_id,
            SpineReading(id=spine_id, title=None, author=None, readable=False),
        )
        for spine_id in expected_ids
    ]


def read_spines(crops: list[tuple[int, bytes]]) -> list[SpineReading]:
    if not crops:
        return []
    if not settings.OPENROUTER_API_KEY:
        raise VisionProviderError("OPENROUTER_API_KEY is not configured.")

    content: list[dict[str, object]] = [{"type": "text", "text": (
        "Read every numbered book-spine crop exactly once. Return JSON only: "
        '{"books":[{"id":1,"title":null,"author":null,"readable":false}]}. '
        "Use the supplied spine IDs. Use null when title or author cannot be read. Do not guess."
    )}]
    for spine_id, crop in crops:
        encoded = base64.b64encode(crop).decode("ascii")
        content.extend([
            {"type": "text", "text": f"Spine {spine_id}"},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}"}},
        ])

    response_schema = {
        "type": "object",
        "properties": {
            "books": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "title": {"type": ["string", "null"]},
                        "author": {"type": ["string", "null"]},
                        "readable": {"type": "boolean"},
                    },
                    "required": ["id", "title", "author", "readable"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["books"],
        "additionalProperties": False,
    }
    body = json.dumps({
        "model": settings.OPENROUTER_VISION_MODEL,
        "messages": [{"role": "user", "content": content}],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "book_spine_readings",
                "strict": True,
                "schema": response_schema,
            },
        },
        "max_tokens": 1000,
        "temperature": 0,
    }).encode("utf-8")
    request = Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            raw_payload = response.read().decode("utf-8")
    except TimeoutError as error:
        raise VisionProviderError(
            "OpenRouter timed out while reading the detected book spines.",
            code="vision_provider_timeout",
        ) from error
    except HTTPError as error:
        raise VisionProviderError(
            "OpenRouter could not complete the book-reading request."
        ) from error
    except URLError as error:
        if isinstance(error.reason, TimeoutError):
            raise VisionProviderError(
                "OpenRouter timed out while reading the detected book spines.",
                code="vision_provider_timeout",
            ) from error
        raise VisionProviderError(
            "OpenRouter could not complete the book-reading request."
        ) from error

    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as error:
        raise _malformed_response() from error
    return parse_spine_readings(payload, tuple(spine_id for spine_id, _ in crops))
