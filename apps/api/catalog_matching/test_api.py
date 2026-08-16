from typing import ClassVar

from django.core.management import call_command
from django.test import TestCase

from catalog_matching.models import CatalogBook


class CatalogMatchApiTests(TestCase):
    endpoint: ClassVar[str] = "/api/v1/catalog/match"

    @classmethod
    def setUpTestData(cls) -> None:
        call_command("import_catalog", verbosity=0)

    def test_returns_a_confident_match(self) -> None:
        response = self.client.post(
            self.endpoint,
            {"title": "Dune", "author": "Frank Herbert"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "matched")
        self.assertEqual(payload["match"]["catalog_id"], "B081")
        self.assertEqual(payload["candidates"], [])

    def test_returns_not_sure_with_safe_candidates(self) -> None:
        response = self.client.post(
            self.endpoint,
            {"title": "The Hobbit", "author": "J. R. R. Tolkien"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "not_sure")
        self.assertIsNone(payload["match"])
        self.assertEqual(
            {candidate["catalog_id"] for candidate in payload["candidates"]},
            {"B009", "B010"},
        )
        self.assertEqual(
            set(payload["candidates"][0]),
            {
                "catalog_id",
                "title",
                "author",
                "edition",
                "score",
                "title_score",
                "author_score",
                "title_source",
            },
        )

    def test_returns_not_found(self) -> None:
        response = self.client.post(
            self.endpoint,
            {"title": "Unrelated Quantum Gardening Manual", "author": "Nobody Known"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "not_found", "match": None, "candidates": []},
        )

    def test_author_is_optional_but_cannot_produce_a_confident_match(self) -> None:
        response = self.client.post(
            self.endpoint,
            {"title": "1984"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "not_sure")

    def test_rejects_a_missing_title(self) -> None:
        response = self.client.post(
            self.endpoint,
            {"author": "Frank Herbert"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("title", response.json())

    def test_rejects_a_blank_title(self) -> None:
        response = self.client.post(
            self.endpoint,
            {"title": "   ", "author": "Frank Herbert"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("title", response.json())

    def test_reports_an_uninitialized_catalog(self) -> None:
        CatalogBook.objects.all().delete()

        response = self.client.post(
            self.endpoint,
            {"title": "Dune", "author": "Frank Herbert"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "catalog_not_initialized")


class CatalogLookupApiTests(TestCase):
    endpoint: ClassVar[str] = "/api/v1/catalog"

    @classmethod
    def setUpTestData(cls) -> None:
        call_command("import_catalog", verbosity=0)

    def test_lists_catalog_books_with_the_default_limit(self) -> None:
        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 170)
        self.assertEqual(len(payload["results"]), 10)
        self.assertEqual(
            set(payload["results"][0]),
            {"catalog_id", "title", "author", "edition"},
        )

    def test_searches_titles_authors_and_aliases(self) -> None:
        title_response = self.client.get(f"{self.endpoint}?q=Dune&limit=5")
        alias_response = self.client.get(f"{self.endpoint}?q=Joanne%20Rowling&limit=10")

        self.assertEqual(title_response.status_code, 200)
        self.assertIn("B081", {book["catalog_id"] for book in title_response.json()["results"]})
        self.assertEqual(alias_response.status_code, 200)
        self.assertGreater(alias_response.json()["count"], 0)

    def test_rejects_an_invalid_limit(self) -> None:
        response = self.client.get(f"{self.endpoint}?limit=51")

        self.assertEqual(response.status_code, 400)
        self.assertIn("limit", response.json())


class CatalogDetailApiTests(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        call_command("import_catalog", verbosity=0)

    def test_returns_one_books_full_safe_catalog_details(self) -> None:
        response = self.client.get("/api/v1/catalog/B081")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "catalog_id": "B081",
                "title": "Dune",
                "author": "Frank Herbert",
                "edition": "Standard edition",
                "alternate_titles": ["Dune Book One"],
                "author_aliases": ["Herbert Frank"],
                "contained_titles": [],
            },
        )

    def test_returns_a_clear_404_for_an_unknown_catalog_id(self) -> None:
        response = self.client.get("/api/v1/catalog/UNKNOWN")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json(),
            {
                "error": {
                    "code": "catalog_book_not_found",
                    "message": "Catalog book `UNKNOWN` was not found.",
                }
            },
        )
