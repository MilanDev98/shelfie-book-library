from pathlib import Path

from PIL import Image, ImageOps


def open_upright_rgb_image(path: Path) -> Image.Image:
    """Load an image with its EXIF display orientation applied."""
    with Image.open(path) as source:
        return ImageOps.exif_transpose(source).convert("RGB")
