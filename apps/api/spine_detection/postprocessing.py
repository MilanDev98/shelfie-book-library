from statistics import median

from spine_detection.types import DetectionBox


def _intersection_over_union(left: DetectionBox, right: DetectionBox) -> float:
    intersection_width = max(0.0, min(left.x_max, right.x_max) - max(left.x_min, right.x_min))
    intersection_height = max(0.0, min(left.y_max, right.y_max) - max(left.y_min, right.y_min))
    intersection = intersection_width * intersection_height
    left_area = max(0.0, left.x_max - left.x_min) * max(0.0, left.y_max - left.y_min)
    right_area = max(0.0, right.x_max - right.x_min) * max(0.0, right.y_max - right.y_min)
    union = left_area + right_area - intersection
    return intersection / union if union > 0 else 0.0


def _reading_order(boxes: list[DetectionBox]) -> list[DetectionBox]:
    if not boxes:
        return []

    heights = [box.y_max - box.y_min for box in boxes]
    row_height = max(1.0, median(heights) * 0.75)

    return sorted(
        boxes,
        key=lambda box: (
            round(((box.y_min + box.y_max) / 2) / row_height),
            box.x_min,
        ),
    )


def select_detections(
    boxes: list[DetectionBox],
    *,
    image_width: int,
    image_height: int,
    nms_iou_threshold: float,
    max_detections: int,
) -> tuple[tuple[DetectionBox, ...], bool]:
    """Clamp boxes, apply class-agnostic NMS, cap results, and sort in reading order."""
    valid: list[DetectionBox] = []
    for box in boxes:
        clamped = DetectionBox(
            x_min=max(0.0, min(float(image_width), box.x_min)),
            y_min=max(0.0, min(float(image_height), box.y_min)),
            x_max=max(0.0, min(float(image_width), box.x_max)),
            y_max=max(0.0, min(float(image_height), box.y_max)),
            score=box.score,
            label=box.label,
        )
        if clamped.x_max > clamped.x_min and clamped.y_max > clamped.y_min:
            valid.append(clamped)

    kept: list[DetectionBox] = []
    for candidate in sorted(valid, key=lambda box: box.score, reverse=True):
        if all(
            _intersection_over_union(candidate, selected) <= nms_iou_threshold
            for selected in kept
        ):
            kept.append(candidate)

    truncated = len(kept) > max_detections
    limited = kept[:max_detections]
    return tuple(_reading_order(limited)), truncated
