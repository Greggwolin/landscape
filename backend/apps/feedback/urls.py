"""
URL routing for feedback and changelog API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TesterFeedbackViewSet,
    FeedbackSubmitView,
    FeedbackCheckDuplicateView,
    ChangelogViewSet,
)
from .views_dashboard import feedback_dashboard_data

router = DefaultRouter()
router.register(r'feedback', TesterFeedbackViewSet, basename='feedback')
router.register(r'changelog', ChangelogViewSet, basename='changelog')

urlpatterns = [
    # Custom feedback endpoints — registered BEFORE the router include so
    # they win against the ViewSet's default `<pk>` route. Without this,
    # `feedback/dashboard-data/` (and any other non-numeric slug) matches
    # TesterFeedbackViewSet.retrieve() and hits its JWT-auth wall.
    path('feedback/submit/', FeedbackSubmitView.as_view(), name='feedback-submit'),
    path('feedback/check-duplicate/', FeedbackCheckDuplicateView.as_view(), name='feedback-check-duplicate'),
    path('feedback/dashboard-data/', feedback_dashboard_data, name='feedback-dashboard-data'),

    # Router-generated URLs
    path('', include(router.urls)),
]
