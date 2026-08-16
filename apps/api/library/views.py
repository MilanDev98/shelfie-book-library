from __future__ import annotations

from typing import cast

from django.db import transaction
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog_matching.models import CatalogBook
from library.models import SavedBook
from library.serializers import BulkSaveRequestSerializer, SavedBookSerializer


def _error(code: str, message: str, *, details: object | None = None) -> Response:
    payload: dict[str, object] = {"code": code, "message": message}
    if details is not None:
        payload["details"] = details
    return Response({"error": payload}, status=400)


def _not_found(code: str, message: str, *, details: object | None = None) -> Response:
    payload: dict[str, object] = {"code": code, "message": message}
    if details is not None:
        payload["details"] = details
    return Response({"error": payload}, status=404)


def _saved_books_queryset():
    return SavedBook.objects.select_related("catalog_book").order_by("-saved_at", "-id")


class SavedBookListCreateView(APIView):
    """List saved books or idempotently save confirmed catalog books in bulk."""

    def get(self, request: Request) -> Response:
        saved_books = _saved_books_queryset()
        return Response(
            {
                "count": saved_books.count(),
                "results": SavedBookSerializer(saved_books, many=True).data,
            }
        )

    def post(self, request: Request) -> Response:
        serializer = BulkSaveRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return _error(
                "invalid_request",
                "Provide a non-empty list of unique catalog IDs.",
                details=serializer.errors,
            )

        catalog_ids = cast(list[str], serializer.validated_data["catalog_ids"])
        catalog_books = {
            book.catalog_id: book
            for book in CatalogBook.objects.filter(catalog_id__in=catalog_ids)
        }
        missing_ids = [catalog_id for catalog_id in catalog_ids if catalog_id not in catalog_books]
        if missing_ids:
            return _not_found(
                "catalog_books_not_found",
                "One or more catalog IDs were not found.",
                details={"catalog_ids": missing_ids},
            )

        created: list[SavedBook] = []
        already_saved: list[SavedBook] = []
        with transaction.atomic():
            for catalog_id in catalog_ids:
                saved_book, was_created = SavedBook.objects.get_or_create(
                    catalog_book=catalog_books[catalog_id]
                )
                (created if was_created else already_saved).append(saved_book)

        return Response(
            {
                "created": SavedBookSerializer(
                    _saved_books_queryset().filter(id__in=[item.id for item in created]),
                    many=True,
                ).data,
                "already_saved": SavedBookSerializer(
                    _saved_books_queryset().filter(id__in=[item.id for item in already_saved]),
                    many=True,
                ).data,
            },
            status=200,
        )


class SavedBookDeleteView(APIView):
    """Delete one saved book using its stable catalog ID."""

    def delete(self, request: Request, catalog_id: str) -> Response:
        try:
            saved_book = SavedBook.objects.get(catalog_book_id=catalog_id)
        except SavedBook.DoesNotExist:
            return _not_found(
                "saved_book_not_found",
                f"Catalog book `{catalog_id}` is not saved in the library.",
                details={"catalog_id": catalog_id},
            )

        saved_book.delete()
        return Response(status=204)
