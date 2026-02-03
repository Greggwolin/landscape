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

router = DefaultRouter()
router.register(r'feedback', TesterFeedbackViewSet, basename='feedback')
router.register(r'changelog', ChangelogViewSet, basename='changelog')

urlpatterns = [
    # Router-generated URLs
    path('', include(router.urls)),

    # Custom feedback endpoints
    path('feedback/submit/', FeedbackSubmitView.as_view(), name='feedback-submit'),
    path('feedback/check-duplicate/', FeedbackCheckDuplicateView.as_view(), name='feedback-check-duplicate'),
]
