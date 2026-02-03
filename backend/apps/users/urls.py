from django.urls import path
from .views import (
    LandscaperProfileView,
    LandscaperProfileCompileView,
    user_landscaper_document,
    user_tier_settings,
)

urlpatterns = [
    path('tier/', user_tier_settings, name='user-tier'),
    path('landscaper-profile/', LandscaperProfileView.as_view(), name='landscaper-profile'),
    path('landscaper-profile/compile/', LandscaperProfileCompileView.as_view(), name='landscaper-profile-compile'),
    path('landscaper-profile/document/', user_landscaper_document, name='landscaper-profile-document'),
]
