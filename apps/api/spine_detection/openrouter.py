from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class VisionProviderError(RuntimeError):
    """Raised when the hosted vision provider cannot return usable JSON."""


@dataclass(frozen=True, slots=True)
class SpineReading:
    id: int
    title: str | None
    author: str | None
    readable: bool


def read_spines(crops: list[tuple[int, bytes]]) -> list[SpineReading]:
    if not settings.OPENROUTER_API_KEY:
        raise VisionProviderError("OPENROUTER_API_KEY is not configured.")

    content: list[dict[str, object]] = [{"type": "text", "text": (
        "Read each numbered book-spine crop. Return JSON only: "
        '{"books":[{"id":1,"title":null,"author":null,"readable":false}]}. '
        "Use null when title or author cannot be read. Do not guess."
    )}]
    for spine_id, crop in crops:
        encoded = base64.b64encode(crop).decode("ascii")
        content.extend([
            {"type": "text", "text": f"Spine {spine_id}"},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}"}},
        ])

    body = json.dumps({
        "model": settings.OPENROUTER_VISION_MODEL,
        "messages": [{"role": "user", "content": content}],
        "response_format": {"type": "json_object"},
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
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise VisionProviderError(
            "OpenRouter could not complete the book-reading request."
        ) from error

    try:
        raw = json.loads(payload["choices"][0]["message"]["content"])["books"]
        return [
            SpineReading(
                id=int(item["id"]),
                title=item.get("title") if isinstance(item.get("title"), str) else None,
                author=item.get("author") if isinstance(item.get("author"), str) else None,
                readable=bool(item.get("readable")),
            )
            for item in raw
            if isinstance(item, dict)
        ]
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise VisionProviderError("OpenRouter returned malformed book-reading JSON.") from error
