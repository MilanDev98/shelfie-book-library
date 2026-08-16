from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

_FORMAT_RULES: dict[str, tuple[frozenset[str], frozenset[str]]] = {
    "JPEG": (frozenset({"image/jpeg"}), frozenset({".jpg", ".jpeg"})),
    "PNG": (frozenset({"image/png"}), frozenset({".png"})),
    "WEBP": (frozenset({"image/webp"}), frozenset({".webp"})),
}


class AnalyzeShelfRequestSerializer(serializers.Serializer[dict[str, object]]):
    image = serializers.FileField()
    prompt = serializers.CharField(
        max_length=80,
        trim_whitespace=True,
        required=False,
        default=settings.SPINE_DETECTOR_DEFAULT_PROMPT,
    )
    threshold = serializers.FloatField(
        min_value=0.05,
        max_value=0.95,
        required=False,
        default=settings.SPINE_DETECTOR_DEFAULT_THRESHOLD,
    )

    def validate_image(self, value: UploadedFile[bytes]) -> UploadedFile[bytes]:
        max_bytes = settings.SPINE_IMAGE_MAX_UPLOAD_BYTES
        max_pixels = settings.SPINE_IMAGE_MAX_PIXELS
        if value.size is None or value.size > max_bytes:
            raise serializers.ValidationError(
                f"Image must be {max_bytes} bytes or smaller."
            )

        try:
            with Image.open(value) as image:
                image_format = image.format or ""
                width, height = image.size
                if width * height > max_pixels:
                    raise serializers.ValidationError(
                        f"Image must contain {max_pixels} pixels or fewer."
                    )
                image.verify()
        except serializers.ValidationError:
            raise
        except (Image.DecompressionBombError, UnidentifiedImageError, OSError, ValueError) as error:
            raise serializers.ValidationError("Upload a valid JPEG, PNG, or WebP image.") from error
        finally:
            value.seek(0)

        rule = _FORMAT_RULES.get(image_format)
        if rule is None:
            raise serializers.ValidationError("Upload a JPEG, PNG, or WebP image.")

        allowed_mimes, allowed_extensions = rule
        extension = Path(value.name or "").suffix.casefold()
        content_type = value.content_type or ""
        if content_type not in allowed_mimes or extension not in allowed_extensions:
            raise serializers.ValidationError(
                "Image content, MIME type, and filename extension must agree."
            )

        return value
