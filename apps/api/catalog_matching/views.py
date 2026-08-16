from typing import cast

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from catalog_matching.matcher import CatalogNotInitializedError, match_catalog
from catalog_matching.models import CatalogBook
from catalog_matching.normalization import normalize_text
from catalog_matching.serializers import (
    CatalogLookupQuerySerializer,
    CatalogMatchRequestSerializer,
)


def _book_summary(book: CatalogBook) -> dict[str, str]:
    return {
        "catalog_id": book.catalog_id,
        "title": book.title,
        "author": book.author,
        "edition": book.edition,
    }


def _book_detail(book: CatalogBook) -> dict[str, object]:
    return {
        **_book_summary(book),
        "alternate_titles": cast(list[str], book.alternate_titles),
        "author_aliases": cast(list[str], book.author_aliases),
        "contained_titles": cast(list[str], book.contained_titles),
    }


def _book_matches_query(book: CatalogBook, query: str) -> bool:
    alternate_titles = cast(list[str], book.alternate_titles)
    author_aliases = cast(list[str], book.author_aliases)
    searchable_values = (
        book.catalog_id,
        book.title,
        book.author,
        book.edition,
        *alternate_titles,
        *author_aliases,
    )
    return any(query in normalize_text(value) for value in searchable_values)


@api_view(["POST"])
def catalog_match(request: Request) -> Response:
    """Match an extracted title and optional author against the persistent catalog."""
    serializer = CatalogMatchRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    title = cast(str, serializer.validated_data["title"])
    author = cast(str, serializer.validated_data["author"])

    try:
        result = match_catalog(title=title, author=author)
    except CatalogNotInitializedError as error:
        return Response(
            {
                "error": {
                    "code": "catalog_not_initialized",
                    "message": str(error),
                }
            },
            status=503,
        )

    return Response(result.to_dict())


@api_view(["GET"])
def catalog_lookup(request: Request) -> Response:
    """List or search safe catalog summaries for testing and correction workflows."""
    serializer = CatalogLookupQuerySerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    query = normalize_text(cast(str, serializer.validated_data["q"]))
    limit = cast(int, serializer.validated_data["limit"])

    books = tuple(CatalogBook.objects.all())
    matches = books if not query else tuple(
        book for book in books if _book_matches_query(book, query)
    )

    return Response(
        {
            "count": len(matches),
            "results": [_book_summary(book) for book in matches[:limit]],
        }
    )


@api_view(["GET"])
def catalog_detail(request: Request, catalog_id: str) -> Response:
    """Return the full public catalog fields for one canonical book."""
    try:
        book = CatalogBook.objects.get(catalog_id=catalog_id)
    except CatalogBook.DoesNotExist:
        return Response(
            {
                "error": {
                    "code": "catalog_book_not_found",
                    "message": f"Catalog book `{catalog_id}` was not found.",
                }
            },
            status=404,
        )

    return Response(_book_detail(book))
