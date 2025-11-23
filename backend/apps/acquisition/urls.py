"""
URL routing for acquisition app.
"""

from django.urls import path
from .views import AcquisitionEventViewSet, PropertyAcquisitionViewSet

urlpatterns = [
    # Acquisition Ledger endpoints
    path('projects/<int:project_pk>/acquisition/ledger/',
         AcquisitionEventViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='acquisition-ledger-list'),
    path('projects/<int:project_pk>/acquisition/ledger/<int:pk>/',
         AcquisitionEventViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='acquisition-ledger-detail'),

    # Property Acquisition Assumptions endpoints
    path('projects/<int:project_pk>/assumptions/acquisition/',
         PropertyAcquisitionViewSet.as_view({'get': 'list', 'post': 'create', 'patch': 'partial_update'}),
         name='property-acquisition'),
]
