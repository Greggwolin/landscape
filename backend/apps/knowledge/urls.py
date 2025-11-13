"""
Knowledge API URLs
"""

from django.urls import path
from .views import session_views

urlpatterns = [
    # Session management
    path('sessions/start/', session_views.start_session, name='knowledge-session-start'),
    path('sessions/<uuid:session_id>/end/', session_views.end_session, name='knowledge-session-end'),
    path('sessions/<uuid:session_id>/context/', session_views.get_session_context, name='knowledge-session-context'),
]
