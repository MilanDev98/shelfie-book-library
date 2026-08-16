from rest_framework import serializers

from library.models import SavedBook


class SavedBookSerializer(serializers.ModelSerializer[SavedBook]):
    catalog_id = serializers.CharField(source="catalog_book.catalog_id", read_only=True)
    title = serializers.CharField(source="catalog_book.title", read_only=True)
    author = serializers.CharField(source="catalog_book.author", read_only=True)
    edition = serializers.CharField(source="catalog_book.edition", read_only=True)

    class Meta:
        model = SavedBook
        fields = ["id", "catalog_id", "title", "author", "edition", "saved_at"]
        read_only_fields = fields


class BulkSaveRequestSerializer(serializers.Serializer[dict[str, object]]):
    catalog_ids = serializers.ListField(
        child=serializers.CharField(max_length=16, trim_whitespace=True, allow_blank=False),
        allow_empty=False,
        max_length=100,
    )

    def validate_catalog_ids(self, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise serializers.ValidationError("catalog_ids must not contain duplicates.")
        return value
