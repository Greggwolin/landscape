"""
URL routing for feedback API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TesterFeedbackViewSet

router = DefaultRouter()
router.register(r'feedback', TesterFeedbackViewSet, basename='feedback')

urlpatterns = [
    path('', include(router.urls)),
]
