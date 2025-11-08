"""URL routing for the Sales & Absorption module."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BenchmarkAbsorptionVelocityViewSet,
    BenchmarkMarketTimingViewSet,
    ClosingEventViewSet,
    ParcelAbsorptionProfileViewSet,
    ParcelSaleEventViewSet,
    ProjectAbsorptionAssumptionsViewSet,
    ProjectPricingAssumptionViewSet,
    ProjectTimingAssumptionsViewSet,
    annual_inventory_gauge,
    parcel_product_types,
    parcels_with_sales,
)

router = DefaultRouter()
router.register(r'benchmarks/market-timing', BenchmarkMarketTimingViewSet, basename='benchmark-market-timing')
router.register(r'benchmarks/absorption-velocity', BenchmarkAbsorptionVelocityViewSet, basename='benchmark-absorption-velocity')
router.register(r'parcel-sales', ParcelSaleEventViewSet, basename='parcel-sale-event')
router.register(r'closings', ClosingEventViewSet, basename='closing-event')
router.register(r'parcel-absorption-profiles', ParcelAbsorptionProfileViewSet, basename='parcel-absorption-profile')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'projects/<int:project_id>/timing-assumptions/',
        ProjectTimingAssumptionsViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='project-timing-assumptions-list',
    ),
    path(
        'projects/<int:project_id>/timing-assumptions/<int:pk>/',
        ProjectTimingAssumptionsViewSet.as_view(
            {'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}
        ),
        name='project-timing-assumptions-detail',
    ),
    path(
        'projects/<int:project_id>/absorption-assumptions/',
        ProjectAbsorptionAssumptionsViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='project-absorption-assumptions-list',
    ),
    path(
        'projects/<int:project_id>/absorption-assumptions/<int:pk>/',
        ProjectAbsorptionAssumptionsViewSet.as_view(
            {'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}
        ),
        name='project-absorption-assumptions-detail',
    ),
    path(
        'projects/<int:project_id>/parcel-sales/',
        ParcelSaleEventViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='project-parcel-sales-list',
    ),
    path(
        'parcel-sales/<int:sale_event_id>/closings/',
        ClosingEventViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='project-closing-events-list',
    ),
    path(
        'projects/<int:project_id>/inventory-gauge/',
        annual_inventory_gauge,
        name='project-inventory-gauge',
    ),
    path(
        'projects/<int:project_id>/parcels-with-sales/',
        parcels_with_sales,
        name='project-parcels-with-sales',
    ),
    path(
        'projects/<int:project_id>/parcel-product-types/',
        parcel_product_types,
        name='project-parcel-product-types',
    ),
    path(
        'projects/<int:project_id>/pricing-assumptions/',
        ProjectPricingAssumptionViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='project-pricing-assumptions-list',
    ),
    path(
        'projects/<int:project_id>/pricing-assumptions/<int:pk>/',
        ProjectPricingAssumptionViewSet.as_view(
            {'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}
        ),
        name='project-pricing-assumptions-detail',
    ),
]
