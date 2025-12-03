from django.urls import path
from . import views

urlpatterns = [
    path('tier/', views.user_tier_settings, name='user-tier'),
]
