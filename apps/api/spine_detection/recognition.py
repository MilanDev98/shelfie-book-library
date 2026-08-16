from __future__ import annotations

from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from time import perf_counter

from django.core.files.uploadedfile import UploadedFile

from spine_detection.images import open_upright_rgb_image
from spine_detection.openrouter import SpineReading, read_spines
from spine_detection.services import get_detector
from spine_detection.types import DetectorResult


def detect_and_read(
    upload: UploadedFile[bytes], *, prompt: str, threshold: float
) -> tuple[DetectorResult, list[SpineReading], float]:
    started = perf_counter()
    with TemporaryDirectory(prefix="shelfie-recognition-") as directory:
        path = Path(directory) / "shelf-image"
        with path.open("wb") as destination:
            for chunk in upload.chunks():
                destination.write(chunk)
        result = get_detector().detect(path, prompt, threshold)
        image = open_upright_rgb_image(path)
        crops: list[tuple[int, bytes]] = []
        for index, box in enumerate(result.boxes, start=1):
            crop = image.crop((int(box.x_min), int(box.y_min), int(box.x_max), int(box.y_max)))
            buffer = BytesIO()
            crop.save(buffer, format="JPEG", quality=85)
            crops.append((index, buffer.getvalue()))
        readings = read_spines(crops)
    return result, readings, round((perf_counter() - started) * 1000, 2)
