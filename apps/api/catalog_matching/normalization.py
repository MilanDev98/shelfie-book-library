import re
import unicodedata
from difflib import SequenceMatcher

_APOSTROPHE_BETWEEN_WORDS = re.compile(r"(?<=\w)['’](?=\w)")
_NON_ALPHANUMERIC = re.compile(r"[^\w]+", flags=re.UNICODE)
_WHITESPACE = re.compile(r"\s+")


def normalize_text(value: str) -> str:
    """Normalize OCR/VLM text while preserving letters and numbers."""
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    without_accents = "".join(
        character for character in decomposed if not unicodedata.combining(character)
    )
    without_apostrophes = _APOSTROPHE_BETWEEN_WORDS.sub("", without_accents)
    with_words = without_apostrophes.replace("&", " and ")
    without_punctuation = _NON_ALPHANUMERIC.sub(" ", with_words)
    return _WHITESPACE.sub(" ", without_punctuation).strip()


def author_variants(value: str) -> frozenset[str]:
    """Return comparable author forms, including initials and reversed order."""
    raw_parts = [part.strip() for part in value.split(",", maxsplit=1)]
    ordered_values = {value}
    if len(raw_parts) == 2 and all(raw_parts):
        ordered_values.add(f"{raw_parts[1]} {raw_parts[0]}")

    variants: set[str] = set()
    for ordered_value in ordered_values:
        normalized = normalize_text(ordered_value)
        if not normalized:
            continue
        variants.add(normalized)

        tokens = normalized.split()
        leading_initials: list[str] = []
        remaining_tokens = list(tokens)
        while remaining_tokens and len(remaining_tokens[0]) == 1:
            leading_initials.append(remaining_tokens.pop(0))
        if leading_initials and remaining_tokens:
            variants.add(" ".join(["".join(leading_initials), *remaining_tokens]))

        trailing_initials: list[str] = []
        reversed_tokens = list(reversed(tokens))
        while reversed_tokens and len(reversed_tokens[0]) == 1:
            trailing_initials.append(reversed_tokens.pop(0))
        if trailing_initials and reversed_tokens:
            surname_tokens = list(reversed(reversed_tokens))
            variants.add(" ".join([*surname_tokens, "".join(reversed(trailing_initials))]))

    return frozenset(variants)


def text_similarity(left: str, right: str) -> float:
    """Compare normalized text using order-aware and token-aware signals."""
    normalized_left = normalize_text(left)
    normalized_right = normalize_text(right)
    if not normalized_left or not normalized_right:
        return 0.0
    if normalized_left == normalized_right:
        return 1.0

    left_tokens = normalized_left.split()
    right_tokens = normalized_right.split()
    sequence_score = SequenceMatcher(None, normalized_left, normalized_right).ratio()
    sorted_score = SequenceMatcher(
        None,
        " ".join(sorted(left_tokens)),
        " ".join(sorted(right_tokens)),
    ).ratio()
    left_set = set(left_tokens)
    right_set = set(right_tokens)
    token_score = len(left_set & right_set) / len(left_set | right_set)

    return max(sequence_score, sorted_score, token_score)


def author_similarity(query: str, names: tuple[str, ...]) -> float:
    query_variants = author_variants(query)
    if not query_variants:
        return 0.0

    best_score = 0.0
    for name in names:
        for query_variant in query_variants:
            for name_variant in author_variants(name):
                best_score = max(best_score, text_similarity(query_variant, name_variant))
    return best_score
