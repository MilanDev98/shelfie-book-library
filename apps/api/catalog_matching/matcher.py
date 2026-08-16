from dataclasses import dataclass
from enum import StrEnum

from catalog_matching.models import CatalogBook
from catalog_matching.normalization import author_similarity, text_similarity

CONFIDENT_SCORE = 0.88
CONFIDENT_TITLE_SCORE = 0.85
CONFIDENT_AUTHOR_SCORE = 0.70
CONFIDENT_MARGIN = 0.04
NOT_FOUND_SCORE = 0.62
NOT_FOUND_TITLE_SCORE = 0.55
REASONABLE_DISTANCE = 0.12
MAX_CANDIDATES = 3


class MatchStatus(StrEnum):
    MATCHED = "matched"
    NOT_FOUND = "not_found"
    NOT_SURE = "not_sure"


class CatalogNotInitializedError(RuntimeError):
    """Raised when matching is attempted before the catalog is imported."""


@dataclass(frozen=True, slots=True)
class MatchCandidate:
    book: CatalogBook
    score: float
    title_score: float
    author_score: float
    title_source: str

    def to_dict(self) -> dict[str, object]:
        return {
            "catalog_id": self.book.catalog_id,
            "title": self.book.title,
            "author": self.book.author,
            "edition": self.book.edition,
            "score": self.score,
            "title_score": self.title_score,
            "author_score": self.author_score,
            "title_source": self.title_source,
        }


@dataclass(frozen=True, slots=True)
class MatchResult:
    status: MatchStatus
    match: MatchCandidate | None = None
    candidates: tuple[MatchCandidate, ...] = ()

    def to_dict(self) -> dict[str, object]:
        return {
            "status": self.status.value,
            "match": self.match.to_dict() if self.match else None,
            "candidates": [candidate.to_dict() for candidate in self.candidates],
        }


class CatalogMatcher:
    def match(self, title: str, author: str = "") -> MatchResult:
        if not title.strip():
            return MatchResult(status=MatchStatus.NOT_FOUND)

        books = tuple(CatalogBook.objects.all())
        if not books:
            raise CatalogNotInitializedError(
                "The catalog database is empty. Run `python manage.py import_catalog` first."
            )

        ranked = sorted(
            (self._score_book(book, title, author) for book in books),
            key=lambda candidate: (-candidate.score, candidate.book.catalog_id),
        )
        best = ranked[0]

        if best.score < NOT_FOUND_SCORE or best.title_score < NOT_FOUND_TITLE_SCORE:
            return MatchResult(status=MatchStatus.NOT_FOUND)

        reasonable = tuple(
            candidate
            for candidate in ranked[:MAX_CANDIDATES]
            if candidate.score >= best.score - REASONABLE_DISTANCE
            and candidate.title_score >= NOT_FOUND_TITLE_SCORE
        )
        second_score = ranked[1].score if len(ranked) > 1 else 0.0
        margin = best.score - second_score

        if (
            author.strip()
            and best.score >= CONFIDENT_SCORE
            and best.title_score >= CONFIDENT_TITLE_SCORE
            and best.author_score >= CONFIDENT_AUTHOR_SCORE
            and margin >= CONFIDENT_MARGIN
        ):
            return MatchResult(status=MatchStatus.MATCHED, match=best)

        return MatchResult(status=MatchStatus.NOT_SURE, candidates=reasonable or (best,))

    @staticmethod
    def _score_book(book: CatalogBook, title: str, author: str) -> MatchCandidate:
        title_options: list[tuple[str, str, float]] = [(book.title, "canonical", 1.0)]
        title_options.extend((value, "alternate", 0.94) for value in book.alternate_titles)
        title_options.extend((value, "contained", 0.82) for value in book.contained_titles)

        title_score, title_source = max(
            (
                (text_similarity(title, option) * source_weight, source)
                for option, source, source_weight in title_options
            ),
            key=lambda scored: scored[0],
        )
        author_score = author_similarity(author, (book.author, *book.author_aliases))
        score = (
            (0.75 * title_score) + (0.25 * author_score)
            if author.strip()
            else title_score
        )

        return MatchCandidate(
            book=book,
            score=round(score, 4),
            title_score=round(title_score, 4),
            author_score=round(author_score, 4),
            title_source=title_source,
        )


def match_catalog(title: str, author: str = "") -> MatchResult:
    """Query the catalog database and return a deterministic match result."""
    return CatalogMatcher().match(title=title, author=author)
