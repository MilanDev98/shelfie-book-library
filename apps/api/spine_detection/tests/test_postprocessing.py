from django.test import SimpleTestCase

from spine_detection.postprocessing import select_detections
from spine_detection.types import DetectionBox


def box(
    x_min: float,
    y_min: float,
    x_max: float,
    y_max: float,
    score: float,
) -> DetectionBox:
    return DetectionBox(x_min, y_min, x_max, y_max, score, "book spine")


class DetectionPostprocessingTests(SimpleTestCase):
    def test_applies_class_agnostic_nms(self) -> None:
        selected, truncated = select_detections(
            [
                box(10, 10, 30, 100, 0.9),
                box(11, 11, 31, 101, 0.8),
                box(40, 10, 60, 100, 0.7),
            ],
            image_width=100,
            image_height=120,
            nms_iou_threshold=0.5,
            max_detections=12,
        )

        self.assertEqual([item.score for item in selected], [0.9, 0.7])
        self.assertFalse(truncated)

    def test_clamps_sorts_and_caps_boxes(self) -> None:
        selected, truncated = select_detections(
            [
                box(60, 70, 90, 130, 0.95),
                box(50, -5, 70, 40, 0.8),
                box(10, 0, 30, 40, 0.9),
            ],
            image_width=100,
            image_height=100,
            nms_iou_threshold=0.5,
            max_detections=2,
        )

        self.assertTrue(truncated)
        self.assertEqual([(item.x_min, item.y_min) for item in selected], [(10, 0.0), (60, 70)])

    def test_discards_boxes_with_no_area_after_clamping(self) -> None:
        selected, truncated = select_detections(
            [box(-10, 0, -2, 50, 0.9)],
            image_width=100,
            image_height=100,
            nms_iou_threshold=0.5,
            max_detections=12,
        )

        self.assertEqual(selected, ())
        self.assertFalse(truncated)
