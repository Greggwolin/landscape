"""
URL routing for acquisition app.
"""

from django.urls import path
from .views import (
    AcquisitionEventViewSet,
    PropertyAcquisitionViewSet,
    AcquisitionCategoriesView,
    AcquisitionPriceSummaryView,
    UpdateAskingPriceView,
)

urlpatterns = [
    # Acquisition Categories (for dropdowns)
    path('acquisition/categories/',
         AcquisitionCategoriesView.as_view(),
         name='acquisition-categories'),

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

    # Acquisition Price Summary (asking price vs calculated total)
    path('projects/<int:project_pk>/acquisition/price-summary/',
         AcquisitionPriceSummaryView.as_view(),
         name='acquisition-price-summary'),
    path('projects/<int:project_pk>/acquisition/asking-price/',
         UpdateAskingPriceView.as_view(),
         name='update-asking-price'),
]
