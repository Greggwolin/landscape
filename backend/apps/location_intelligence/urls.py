"""URL routing for Location Intelligence API."""

from django.urls import path
from . import views

urlpatterns = [
    # Ring demographics by coordinates
    path(
        "demographics/",
        views.get_demographics,
        name="location-intelligence-demographics"
    ),

    # Project-specific demographics (cached)
    path(
        "demographics/project/<int:project_id>/",
        views.get_project_demographics,
        name="location-intelligence-project-demographics-get"
    ),
    path(
        "demographics/project/<int:project_id>/cache/",
        views.cache_project_demographics,
        name="location-intelligence-project-demographics-cache"
    ),
    path(
        "demographics/project/<int:project_id>/delete/",
        views.delete_project_demographics,
        name="location-intelligence-project-demographics-delete"
    ),

    # Stats/health check
    path(
        "stats/",
        views.get_stats,
        name="location-intelligence-stats"
    ),

    # POIs from OpenStreetMap
    path(
        "pois/",
        views.get_pois,
        name="location-intelligence-pois"
    ),

    # Reverse geocoding
    path(
        "reverse-geocode/",
        views.get_reverse_geocode,
        name="location-intelligence-reverse-geocode"
    ),

    # User map points
    path(
        "points/",
        views.user_points_list,
        name="location-intelligence-points"
    ),
    path(
        "points/<uuid:point_id>/",
        views.user_point_detail,
        name="location-intelligence-point-detail"
    ),
]
