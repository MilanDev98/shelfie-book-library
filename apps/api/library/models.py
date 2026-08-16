from django.db import models

from catalog_matching.models import CatalogBook


class SavedBook(models.Model):
    """A catalog book saved in Shelfie's current personal library."""

    catalog_book = models.OneToOneField(
        CatalogBook,
        on_delete=models.CASCADE,
        related_name="saved_library_item",
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-saved_at", "-id")

    def __str__(self) -> str:
        return f"Saved {self.catalog_book.title}"
