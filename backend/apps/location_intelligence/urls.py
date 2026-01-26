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
]
