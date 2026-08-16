from io import StringIO
from typing import ClassVar

from django.core.management import call_command
from django.test import TestCase

from catalog_matching.matcher import (
    CatalogMatcher,
    CatalogNotInitializedError,
    MatchStatus,
)
from catalog_matching.models import CatalogBook


class CatalogImportTests(TestCase):
    def test_imports_the_repository_catalog(self) -> None:
        call_command("import_catalog", verbosity=0)

        self.assertGreaterEqual(CatalogBook.objects.count(), 100)
        self.assertTrue(CatalogBook.objects.filter(catalog_id="B001").exists())

    def test_repeat_import_is_safe_and_unchanged(self) -> None:
        call_command("import_catalog", verbosity=0)
        initial_count = CatalogBook.objects.count()
        output = StringIO()

        call_command("import_catalog", stdout=output, verbosity=0)

        self.assertEqual(CatalogBook.objects.count(), initial_count)
        self.assertIn(f"created=0 updated=0 unchanged={initial_count}", output.getvalue())


class CatalogMatcherTests(TestCase):
    matcher: ClassVar[CatalogMatcher]

    @classmethod
    def setUpTestData(cls) -> None:
        call_command("import_catalog", verbosity=0)
        cls.matcher = CatalogMatcher()

    def assert_matched(self, title: str, author: str, catalog_id: str) -> None:
        result = self.matcher.match(title=title, author=author)

        self.assertEqual(result.status, MatchStatus.MATCHED)
        self.assertIsNotNone(result.match)
        assert result.match is not None
        self.assertEqual(result.match.book.catalog_id, catalog_id)

    def test_matches_a_database_only_record(self) -> None:
        CatalogBook.objects.create(
            catalog_id="DB999",
            title="The Database-Only Book",
            author="Ada Query",
        )

        self.assert_matched("The Database Only Book", "Ada Query", "DB999")

    def test_empty_database_has_clear_initialization_error(self) -> None:
        CatalogBook.objects.all().delete()

        with self.assertRaisesMessage(
            CatalogNotInitializedError,
            "python manage.py import_catalog",
        ):
            self.matcher.match("Dune", "Frank Herbert")

    def test_normalizes_case_punctuation_apostrophes_and_spacing(self) -> None:
        self.assert_matched(
            "  HARRY POTTER AND THE PHILOSOPHER’S   STONE  ",
            "j.k. rowling",
            "B001",
        )

    def test_matches_an_alternate_title(self) -> None:
        self.assert_matched("Nineteen Eighty Four", "George Orwell", "B064")

    def test_matches_author_initials(self) -> None:
        self.assert_matched("The Fellowship of the Ring", "JRR Tolkien", "B012")

    def test_matches_accent_and_reversed_author_name(self) -> None:
        self.assert_matched(
            "One Hundred Years of Solitude",
            "Marquez, Gabriel Garcia",
            "B109",
        )

    def test_same_title_is_resolved_by_author(self) -> None:
        self.assert_matched("The Alchemist", "Paulo Coelho", "B107")

    def test_same_title_without_author_is_not_sure(self) -> None:
        result = self.matcher.match(title="Home")

        self.assertEqual(result.status, MatchStatus.NOT_SURE)
        self.assertEqual(
            {candidate.book.catalog_id for candidate in result.candidates},
            {"B161", "B162"},
        )

    def test_two_editions_are_not_silently_collapsed(self) -> None:
        result = self.matcher.match(title="The Hobbit", author="J. R. R. Tolkien")

        self.assertEqual(result.status, MatchStatus.NOT_SURE)
        self.assertEqual(
            {candidate.book.catalog_id for candidate in result.candidates},
            {"B009", "B010"},
        )

    def test_individual_volume_beats_omnibus_containment(self) -> None:
        self.assert_matched("The Fellowship of the Ring", "J. R. R. Tolkien", "B012")

        result = self.matcher.match("The Fellowship of the Ring", "J. R. R. Tolkien")
        self.assertIsNotNone(result.match)
        assert result.match is not None
        self.assertNotEqual(result.match.book.catalog_id, "B011")

    def test_contained_volume_surfaces_omnibus_without_false_confidence(self) -> None:
        result = self.matcher.match("The Silver Chair", "C. S. Lewis")

        self.assertEqual(result.status, MatchStatus.NOT_SURE)
        self.assertEqual(result.candidates[0].book.catalog_id, "B016")
        self.assertEqual(result.candidates[0].title_source, "contained")

    def test_substring_title_does_not_override_exact_title(self) -> None:
        self.assert_matched("Dune", "Frank Herbert", "B081")

    def test_small_title_typo_can_still_match(self) -> None:
        self.assert_matched("Farenheit 451", "Ray Bradbury", "B067")

    def test_unknown_book_is_not_found(self) -> None:
        result = self.matcher.match(
            title="Unrelated Quantum Gardening Manual",
            author="Nobody Known",
        )

        self.assertEqual(result.status, MatchStatus.NOT_FOUND)
        self.assertIsNone(result.match)
        self.assertEqual(result.candidates, ())

    def test_missing_title_is_not_found(self) -> None:
        result = self.matcher.match(title="", author="George Orwell")

        self.assertEqual(result.status, MatchStatus.NOT_FOUND)

    def test_missing_author_never_becomes_confident(self) -> None:
        result = self.matcher.match(title="1984")

        self.assertEqual(result.status, MatchStatus.NOT_SURE)
        self.assertEqual(result.candidates[0].book.catalog_id, "B064")
