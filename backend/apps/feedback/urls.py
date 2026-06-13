"""
URL routing for feedback and changelog API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChangelogViewSet
from .views_canonical import (
    CanonicalFeedbackListView,
    CanonicalFeedbackDetailView,
)
from .views_dashboard import feedback_dashboard_data

router = DefaultRouter()
router.register(r'changelog', ChangelogViewSet, basename='changelog')

urlpatterns = [
    # Canonical feedback endpoints — back tbl_feedback directly. The
    # tester_feedback ViewSet (+ submit / check-duplicate) was retired in
    # LSCMD-FBUNIFY-0613-qz. Explicit paths are registered BEFORE the router
    # include; the `<int:pk>` converter never matches the `dashboard-data` slug.
    path('feedback/dashboard-data/', feedback_dashboard_data, name='feedback-dashboard-data'),
    path('feedback/', CanonicalFeedbackListView.as_view(), name='feedback-list'),
    path('feedback/<int:pk>/', CanonicalFeedbackDetailView.as_view(), name='feedback-detail'),

    # Router-generated URLs (changelog)
    path('', include(router.urls)),
]
