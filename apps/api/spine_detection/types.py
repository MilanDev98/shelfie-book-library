from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


@dataclass(frozen=True, slots=True)
class DetectionBox:
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    score: float
    label: str


@dataclass(frozen=True, slots=True)
class DetectorTimings:
    model_load_ms: float
    preprocess_ms: float
    inference_ms: float
    postprocess_ms: float


@dataclass(frozen=True, slots=True)
class DetectorResult:
    model_id: str
    device: str
    image_width: int
    image_height: int
    boxes: tuple[DetectionBox, ...]
    truncated: bool
    timings: DetectorTimings


class SpineDetector(Protocol):
    def detect(self, image_path: Path, prompt: str, threshold: float) -> DetectorResult: ...


class DetectorUnavailableError(RuntimeError):
    """Raised when local model code or cached weights are unavailable."""


class DetectorInferenceError(RuntimeError):
    """Raised when the local model cannot process an otherwise valid image."""
