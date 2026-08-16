from rest_framework import serializers


class CatalogMatchRequestSerializer(serializers.Serializer[dict[str, object]]):
    title = serializers.CharField(max_length=255, trim_whitespace=True)
    author = serializers.CharField(
        max_length=255,
        trim_whitespace=True,
        allow_blank=True,
        required=False,
        default="",
    )


class CatalogLookupQuerySerializer(serializers.Serializer[dict[str, object]]):
    q = serializers.CharField(
        max_length=255,
        trim_whitespace=True,
        allow_blank=True,
        required=False,
        default="",
    )
    limit = serializers.IntegerField(min_value=1, max_value=50, required=False, default=10)
