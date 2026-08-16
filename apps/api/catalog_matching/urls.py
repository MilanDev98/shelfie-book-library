from django.urls import path

from catalog_matching.views import catalog_detail, catalog_lookup, catalog_match

urlpatterns = [
    path("catalog", catalog_lookup, name="catalog-lookup"),
    path("catalog/match", catalog_match, name="catalog-match"),
    path("catalog/<str:catalog_id>", catalog_detail, name="catalog-detail"),
]
