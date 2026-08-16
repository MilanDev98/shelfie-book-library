from typing import ClassVar

from django.core.management import call_command
from django.test import TestCase

from library.models import SavedBook


class SavedBookApiTests(TestCase):
    endpoint: ClassVar[str] = "/api/v1/library/books"

    @classmethod
    def setUpTestData(cls) -> None:
        call_command("import_catalog", verbosity=0)

    def save(self, *catalog_ids: str):
        return self.client.post(
            self.endpoint,
            {"catalog_ids": list(catalog_ids)},
            content_type="application/json",
        )

    def test_bulk_save_creates_confirmed_catalog_books(self) -> None:
        response = self.save("B081", "B064")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            {book["catalog_id"] for book in payload["created"]},
            {"B081", "B064"},
        )
        self.assertEqual(payload["already_saved"], [])
        self.assertEqual(SavedBook.objects.count(), 2)

    def test_repeating_bulk_save_returns_already_saved_outcomes(self) -> None:
        self.assertEqual(self.save("B081").status_code, 200)

        response = self.save("B081")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["created"], [])
        self.assertEqual(
            [book["catalog_id"] for book in response.json()["already_saved"]],
            ["B081"],
        )
        self.assertEqual(SavedBook.objects.count(), 1)

    def test_list_returns_saved_books_newest_first(self) -> None:
        self.assertEqual(self.save("B081", "B064").status_code, 200)

        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 2)
        self.assertEqual(
            [book["catalog_id"] for book in payload["results"]],
            ["B064", "B081"],
        )

    def test_delete_removes_one_saved_book(self) -> None:
        self.assertEqual(self.save("B081", "B064").status_code, 200)

        response = self.client.delete(f"{self.endpoint}/B081")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(SavedBook.objects.filter(catalog_book_id="B081").exists())
        self.assertTrue(SavedBook.objects.filter(catalog_book_id="B064").exists())

    def test_missing_catalog_ids_returns_structured_validation_error(self) -> None:
        response = self.client.post(self.endpoint, {}, content_type="application/json")

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "invalid_request")
        self.assertIn("catalog_ids", payload["error"]["details"])

    def test_unknown_catalog_id_returns_structured_not_found_error(self) -> None:
        response = self.save("UNKNOWN")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "catalog_books_not_found")
        self.assertEqual(response.json()["error"]["details"], {"catalog_ids": ["UNKNOWN"]})

    def test_delete_unknown_saved_book_returns_structured_not_found_error(self) -> None:
        response = self.client.delete(f"{self.endpoint}/UNKNOWN")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "saved_book_not_found")
