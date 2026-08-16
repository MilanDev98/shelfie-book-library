from django.db import models


class CatalogBook(models.Model):
    """A canonical catalog entry imported from the repository CSV."""

    catalog_id = models.CharField(max_length=16, primary_key=True)
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    alternate_titles = models.JSONField(default=list, blank=True)
    author_aliases = models.JSONField(default=list, blank=True)
    edition = models.CharField(max_length=255, blank=True)
    contained_titles = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ("catalog_id",)

    def __str__(self) -> str:
        return f"{self.title} by {self.author}"
