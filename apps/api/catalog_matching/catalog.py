import csv
from dataclasses import dataclass
from pathlib import Path

REQUIRED_COLUMNS = (
    "id",
    "title",
    "author",
    "alternate_titles",
    "author_aliases",
    "edition",
    "contained_titles",
    "source_images",
)


class CatalogValidationError(ValueError):
    """Raised when catalog.csv cannot be used safely by the matcher."""


@dataclass(frozen=True, slots=True)
class CatalogRecord:
    catalog_id: str
    title: str
    author: str
    alternate_titles: tuple[str, ...]
    author_aliases: tuple[str, ...]
    edition: str
    contained_titles: tuple[str, ...]
    source_images: tuple[str, ...]


def default_catalog_path() -> Path:
    """Return the repository-root catalog path from the API package."""
    return Path(__file__).resolve().parents[3] / "catalog.csv"


def _split_values(value: str) -> tuple[str, ...]:
    return tuple(part.strip() for part in value.split("|") if part.strip())


def read_catalog_csv(path: Path | None = None) -> tuple[CatalogRecord, ...]:
    """Read and validate catalog import records from CSV."""
    catalog_path = path or default_catalog_path()

    try:
        handle = catalog_path.open(encoding="utf-8", newline="")
    except FileNotFoundError as error:
        raise CatalogValidationError(f"Catalog file not found: {catalog_path}") from error

    with handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != list(REQUIRED_COLUMNS):
            raise CatalogValidationError(
                "Catalog columns must be exactly: " + ", ".join(REQUIRED_COLUMNS)
            )

        books: list[CatalogRecord] = []
        seen_ids: set[str] = set()

        for line_number, row in enumerate(reader, start=2):
            catalog_id = row["id"].strip()
            title = row["title"].strip()
            author = row["author"].strip()

            if not catalog_id or not title or not author:
                raise CatalogValidationError(
                    f"Catalog row {line_number} requires id, title, and author"
                )
            if catalog_id in seen_ids:
                raise CatalogValidationError(f"Duplicate catalog id: {catalog_id}")

            seen_ids.add(catalog_id)
            books.append(
                CatalogRecord(
                    catalog_id=catalog_id,
                    title=title,
                    author=author,
                    alternate_titles=_split_values(row["alternate_titles"]),
                    author_aliases=_split_values(row["author_aliases"]),
                    edition=row["edition"].strip(),
                    contained_titles=_split_values(row["contained_titles"]),
                    source_images=_split_values(row["source_images"]),
                )
            )

    if len(books) < 100:
        raise CatalogValidationError("Catalog must contain at least 100 books")

    return tuple(books)
