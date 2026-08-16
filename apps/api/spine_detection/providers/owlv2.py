from pathlib import Path
from threading import Lock
from time import perf_counter
from typing import Any

from django.conf import settings
from PIL import Image

from spine_detection.postprocessing import select_detections
from spine_detection.types import (
    DetectionBox,
    DetectorInferenceError,
    DetectorResult,
    DetectorTimings,
    DetectorUnavailableError,
)


class OwlV2Detector:
    """Lazy, process-cached OWLv2 detector forced to PyTorch CPU inference."""

    _load_lock = Lock()
    _inference_lock = Lock()

    def __init__(self, *, allow_download: bool) -> None:
        self.model_id = settings.SPINE_DETECTOR_MODEL_ID
        self.cache_dir = settings.SPINE_DETECTOR_CACHE_DIR
        self.allow_download = allow_download
        self._processor: Any | None = None
        self._model: Any | None = None

    def _ensure_loaded(self) -> tuple[Any, Any, float]:
        if self._processor is not None and self._model is not None:
            return self._processor, self._model, 0.0

        with self._load_lock:
            if self._processor is not None and self._model is not None:
                return self._processor, self._model, 0.0

            started = perf_counter()
            try:
                import torch
                from transformers import Owlv2ForObjectDetection, Owlv2Processor

                local_only = not self.allow_download
                processor = Owlv2Processor.from_pretrained(
                    self.model_id,
                    cache_dir=self.cache_dir,
                    local_files_only=local_only,
                    use_fast=False,
                )
                model = Owlv2ForObjectDetection.from_pretrained(
                    self.model_id,
                    cache_dir=self.cache_dir,
                    local_files_only=local_only,
                    use_safetensors=True,
                )
                model.to(torch.device("cpu"))
                model.eval()
            except (ImportError, OSError) as error:
                raise DetectorUnavailableError(
                    "The local OWLv2 provider is unavailable. Install API dependencies and run "
                    "`python manage.py warm_detector` before calling /api/v1/analyze."
                ) from error

            self._processor = processor
            self._model = model
            load_ms = round((perf_counter() - started) * 1000, 2)
            return processor, model, load_ms

    def warm(self) -> float:
        """Download if allowed, load on CPU, and return load duration in milliseconds."""
        _, _, load_ms = self._ensure_loaded()
        return load_ms

    def detect(self, image_path: Path, prompt: str, threshold: float) -> DetectorResult:
        try:
            import torch

            processor, model, load_ms = self._ensure_loaded()
            with Image.open(image_path) as source:
                image = source.convert("RGB")
            image_width, image_height = image.size

            preprocess_started = perf_counter()
            inputs = processor(text=[[prompt]], images=image, return_tensors="pt")
            inputs = inputs.to(torch.device("cpu"))
            preprocess_ms = round((perf_counter() - preprocess_started) * 1000, 2)

            inference_started = perf_counter()
            with self._inference_lock, torch.inference_mode():
                outputs = model(**inputs)
            inference_ms = round((perf_counter() - inference_started) * 1000, 2)

            postprocess_started = perf_counter()
            processed = processor.post_process_grounded_object_detection(
                outputs=outputs,
                threshold=threshold,
                target_sizes=[(image_height, image_width)],
                text_labels=[[prompt]],
            )[0]
            raw_boxes = [
                DetectionBox(
                    x_min=float(coordinates[0]),
                    y_min=float(coordinates[1]),
                    x_max=float(coordinates[2]),
                    y_max=float(coordinates[3]),
                    score=float(score),
                    label=str(label),
                )
                for coordinates, score, label in zip(
                    processed["boxes"].tolist(),
                    processed["scores"].tolist(),
                    processed["text_labels"],
                    strict=True,
                )
            ]
            boxes, truncated = select_detections(
                raw_boxes,
                image_width=image_width,
                image_height=image_height,
                nms_iou_threshold=settings.SPINE_DETECTOR_NMS_IOU_THRESHOLD,
                max_detections=settings.SPINE_DETECTOR_MAX_DETECTIONS,
            )
            postprocess_ms = round((perf_counter() - postprocess_started) * 1000, 2)
        except DetectorUnavailableError:
            raise
        except Exception as error:
            raise DetectorInferenceError(
                "The local detector could not process this image."
            ) from error

        return DetectorResult(
            model_id=self.model_id,
            device="cpu",
            image_width=image_width,
            image_height=image_height,
            boxes=boxes,
            truncated=truncated,
            timings=DetectorTimings(
                model_load_ms=load_ms,
                preprocess_ms=preprocess_ms,
                inference_ms=inference_ms,
                postprocess_ms=postprocess_ms,
            ),
        )
