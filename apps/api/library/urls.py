from django.urls import path

from library.views import SavedBookDeleteView, SavedBookListCreateView

urlpatterns = [
    path("library/books", SavedBookListCreateView.as_view(), name="saved-book-list-create"),
    path(
        "library/books/<str:catalog_id>",
        SavedBookDeleteView.as_view(),
        name="saved-book-delete",
    ),
]
