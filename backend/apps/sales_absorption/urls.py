"""URL routing for the Sales & Absorption module."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .batch_recalc import batch_recalculate_assumptions
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
    assign_parcel_to_phase,
    calculate_sale_preview,
    create_sale_phase,
    get_all_uoms,
    get_available_uoms,
    global_sale_benchmarks,
    parcel_product_types,
    parcel_sale_assumptions,
    parcel_sale_benchmarks,
    parcels_with_sales,
    recalculate_sfd_parcels,
    sale_benchmarks,
    save_parcel_overrides,
    update_parcel_sale_date,
    update_sale_benchmark,
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
    # Sale Phase Management Endpoints
    path(
        'projects/<int:project_id>/sale-phases/',
        create_sale_phase,
        name='create-sale-phase',
    ),
    path(
        'projects/<int:project_id>/parcel-sale-phase/',
        assign_parcel_to_phase,
        name='assign-parcel-to-phase',
    ),
    path(
        'projects/<int:project_id>/parcel-sales/overrides/',
        save_parcel_overrides,
        name='save-parcel-overrides',
    ),
    path(
        'projects/<int:project_id>/parcel-sales/date/',
        update_parcel_sale_date,
        name='update-parcel-sale-date',
    ),
    # UOM Calculation Registry Endpoints
    path(
        'uoms/',
        get_all_uoms,
        name='get-all-uoms',
    ),
    path(
        'projects/<int:project_id>/parcels/<int:parcel_id>/available-uoms/',
        get_available_uoms,
        name='get-available-uoms',
    ),
    # Sale Calculation Endpoints
    path(
        'sale-benchmarks/global/',
        global_sale_benchmarks,
        name='global-sale-benchmarks',
    ),
    path(
        'sale-benchmarks/<int:benchmark_id>/',
        update_sale_benchmark,
        name='update-sale-benchmark',
    ),
    path(
        'projects/<int:project_id>/sale-benchmarks/',
        sale_benchmarks,
        name='sale-benchmarks',
    ),
    path(
        'projects/<int:project_id>/recalculate-sfd/',
        recalculate_sfd_parcels,
        name='recalculate-sfd-parcels',
    ),
    path(
        'projects/<int:project_id>/parcels/<int:parcel_id>/sale-benchmarks/',
        parcel_sale_benchmarks,
        name='parcel-sale-benchmarks',
    ),
    path(
        'projects/<int:project_id>/parcels/<int:parcel_id>/calculate-sale/',
        calculate_sale_preview,
        name='calculate-sale-preview',
    ),
    path(
        'projects/<int:project_id>/parcels/<int:parcel_id>/sale-assumptions/',
        parcel_sale_assumptions,
        name='parcel-sale-assumptions',
    ),
    path(
        'projects/<int:project_id>/batch-recalculate-assumptions/',
        batch_recalculate_assumptions,
        name='batch-recalculate-assumptions',
    ),
]
