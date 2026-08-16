from django.core.management.base import BaseCommand, CommandError

from spine_detection.providers.owlv2 import OwlV2Detector
from spine_detection.types import DetectorUnavailableError


class Command(BaseCommand):
    help = "Download and load the configured OWLv2 detector on CPU."

    def handle(self, *args: object, **options: object) -> None:
        detector = OwlV2Detector(allow_download=True)
        try:
            load_ms = detector.warm()
        except DetectorUnavailableError as error:
            raise CommandError(str(error)) from error

        self.stdout.write(
            self.style.SUCCESS(
                f"OWLv2 detector ready on CPU: {detector.model_id} ({load_ms:.2f} ms)"
            )
        )
