from django.urls import path

from spine_detection.views import AnalyzeShelfView, ReadShelfView

urlpatterns = [
    path("analyze", AnalyzeShelfView.as_view(), name="analyze-shelf"),
    path("analyze/read", ReadShelfView.as_view(), name="read-shelf"),
]
