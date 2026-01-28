"""URL routing for Map Features API (draw tools)."""

from django.urls import path
from . import views

urlpatterns = [
    # Map features - list by project
    path(
        "features/<int:project_id>/",
        views.map_features_list,
        name="map-features-list"
    ),

    # Map features - create
    path(
        "features/",
        views.map_features_create,
        name="map-features-create"
    ),

    # Map features - detail (get, update, delete)
    path(
        "features/<uuid:feature_id>/",
        views.map_feature_detail,
        name="map-feature-detail"
    ),
]
