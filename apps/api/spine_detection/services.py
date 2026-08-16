from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from tempfile import TemporaryDirectory
from time import perf_counter

from django.core.files.uploadedfile import UploadedFile

from spine_detection.types import DetectorResult, SpineDetector


@lru_cache(maxsize=1)
def get_detector() -> SpineDetector:
    from spine_detection.providers.owlv2 import OwlV2Detector

    return OwlV2Detector(allow_download=False)


def analyze_uploaded_image(
    upload: UploadedFile[bytes],
    *,
    prompt: str,
    threshold: float,
) -> tuple[DetectorResult, float]:
    """Copy an upload to an isolated temporary path and remove it after inference."""
    started = perf_counter()
    with TemporaryDirectory(prefix="shelfie-detection-") as temporary_directory:
        image_path = Path(temporary_directory) / "shelf-image"
        with image_path.open("wb") as destination:
            for chunk in upload.chunks():
                destination.write(chunk)

        result = get_detector().detect(image_path, prompt, threshold)

    return result, round((perf_counter() - started) * 1000, 2)
