from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase
from PIL import Image

from spine_detection.images import open_upright_rgb_image


class UprightImageTests(SimpleTestCase):
    def test_applies_exif_orientation_before_detection_and_cropping(self) -> None:
        with TemporaryDirectory(prefix="shelfie-image-test-") as directory:
            path = Path(directory) / "rotated.jpg"
            image = Image.new("RGB", (40, 20), color="white")
            exif = image.getexif()
            exif[274] = 6
            image.save(path, format="JPEG", exif=exif)

            upright = open_upright_rgb_image(path)

        self.assertEqual(upright.size, (20, 40))
        self.assertIsNone(upright.getexif().get(274))
