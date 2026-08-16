from __future__ import annotations

from typing import Any, cast

from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response

from catalog_matching.matcher import CatalogNotInitializedError, MatchStatus, match_catalog
from spine_detection.openrouter import VisionProviderError
from spine_detection.recognition import detect_and_read
from spine_detection.serializers import AnalyzeShelfRequestSerializer
from spine_detection.services import analyze_uploaded_image
from spine_detection.types import DetectorInferenceError, DetectorUnavailableError


class AnalyzeShelfView(GenericAPIView[Any]):
    """Detect local book-spine regions without persisting images or results."""

    parser_classes = [MultiPartParser, FormParser]
    serializer_class = AnalyzeShelfRequestSerializer

    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload: UploadedFile[bytes] = serializer.validated_data["image"]
        prompt = cast(str, serializer.validated_data["prompt"])
        threshold = cast(float, serializer.validated_data["threshold"])

        try:
            result, total_ms = analyze_uploaded_image(
                upload,
                prompt=prompt,
                threshold=threshold,
            )
        except DetectorUnavailableError as error:
            return Response(
                {"error": {"code": "detector_unavailable", "message": str(error)}},
                status=503,
            )
        except DetectorInferenceError as error:
            return Response(
                {"error": {"code": "detection_failed", "message": str(error)}},
                status=500,
            )

        detections = [
            {
                "id": index,
                "label": box.label,
                "score": round(box.score, 4),
                "box": {
                    "x_min": round(box.x_min, 2),
                    "y_min": round(box.y_min, 2),
                    "x_max": round(box.x_max, 2),
                    "y_max": round(box.y_max, 2),
                },
            }
            for index, box in enumerate(result.boxes, start=1)
        ]

        return Response(
            {
                "status": "completed",
                "model": result.model_id,
                "device": result.device,
                "prompt": prompt,
                "threshold": threshold,
                "image": {"width": result.image_width, "height": result.image_height},
                "detection_count": len(detections),
                "detections": detections,
                "truncated": result.truncated,
                "timings_ms": {
                    "model_load": result.timings.model_load_ms,
                    "preprocess": result.timings.preprocess_ms,
                    "inference": result.timings.inference_ms,
                    "postprocess": result.timings.postprocess_ms,
                    "total": total_ms,
                },
                "persisted": False,
            }
        )


class ReadShelfView(GenericAPIView[Any]):
    """Detect book spines locally, then read their text through OpenRouter."""

    parser_classes = [MultiPartParser, FormParser]
    serializer_class = AnalyzeShelfRequestSerializer

    def post(self, request: Request, *args: object, **kwargs: object) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload: UploadedFile[bytes] = serializer.validated_data["image"]
        try:
            result, readings, total_ms = detect_and_read(
                upload,
                prompt=cast(str, serializer.validated_data["prompt"]),
                threshold=cast(float, serializer.validated_data["threshold"]),
            )
        except DetectorUnavailableError as error:
            return Response(
                {"error": {"code": "detector_unavailable", "message": str(error)}}, status=503
            )
        except DetectorInferenceError as error:
            return Response(
                {"error": {"code": "detection_failed", "message": str(error)}}, status=500
            )
        except VisionProviderError as error:
            status_code = 504 if error.code == "vision_provider_timeout" else 502
            return Response(
                {"error": {"code": error.code, "message": str(error)}}, status=status_code
            )

        books: list[dict[str, object]] = []
        try:
            for item in readings:
                catalog_match = (
                    match_catalog(item.title, item.author or "").to_dict()
                    if item.title
                    else {
                        "status": MatchStatus.NOT_FOUND.value,
                        "match": None,
                        "candidates": [],
                    }
                )
                books.append(
                    {
                        "id": item.id,
                        "title": item.title,
                        "author": item.author,
                        "readable": item.readable,
                        "catalog": catalog_match,
                    }
                )
        except CatalogNotInitializedError as error:
            return Response(
                {"error": {"code": "catalog_not_initialized", "message": str(error)}},
                status=503,
            )

        return Response(
            {
                "status": "completed",
                "model": result.model_id,
                "vision_model": settings.OPENROUTER_VISION_MODEL,
                "detection_count": len(result.boxes),
                "truncated": result.truncated,
                "books": books,
                "timings_ms": {
                    "model_load": result.timings.model_load_ms,
                    "preprocess": result.timings.preprocess_ms,
                    "inference": result.timings.inference_ms,
                    "postprocess": result.timings.postprocess_ms,
                    "total": total_ms,
                },
                "persisted": False,
            }
        )
