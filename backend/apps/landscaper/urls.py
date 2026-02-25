"""URL routing for Landscaper AI app."""

from django.urls import path
from .views import (
    ChatMessageViewSet,
    VarianceView,
    ActivityFeedViewSet,
    ExtractionMappingViewSet,
    ExtractionLogViewSet,
    # Mutation management views
    PendingMutationsView,
    ConfirmMutationView,
    RejectMutationView,
    ConfirmBatchView,
    # Thread-based chat views
    ChatThreadViewSet,
    ThreadMessageViewSet,
    # Global chat (non-project contexts)
    GlobalChatViewSet,
)
from .views_scenario import (
    ScenarioLogListCreateView,
    ScenarioLogDetailView,
)
from .views_instructions import (
    InstructionListCreateView,
    InstructionDetailView,
    KpiDefinitionListCreateView,
    KpiDefinitionDetailView,
    KpiDefinitionByTypeView,
)
from .views_help import HelpChatView
from .views import (
    IntakeStartView,
    IntakeMappingSuggestionsView,
    IntakeLockMappingView,
    IntakeExtractedValuesView,
    IntakeCommitValuesView,
    IntakeReExtractView,
    # Override management views (Phase 6)
    OverrideListView,
    OverrideToggleView,
    OverrideRevertView,
)

# Project-scoped endpoints
urlpatterns = [
    # Chat endpoints
    path(
        'projects/<int:project_id>/landscaper/chat/',
        ChatMessageViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='landscaper-chat'
    ),

    # Variance analysis endpoint
    path(
        'projects/<int:project_id>/landscaper/variances/',
        VarianceView.as_view(),
        name='landscaper-variances'
    ),

    # Activity feed endpoints
    path(
        'projects/<int:project_id>/landscaper/activities/',
        ActivityFeedViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='landscaper-activities'
    ),
    path(
        'projects/<int:project_id>/landscaper/activities/<int:pk>/mark-read/',
        ActivityFeedViewSet.as_view({
            'post': 'mark_read',
        }),
        name='landscaper-activity-mark-read'
    ),
    path(
        'projects/<int:project_id>/landscaper/activities/mark-all-read/',
        ActivityFeedViewSet.as_view({
            'post': 'mark_all_read',
        }),
        name='landscaper-activities-mark-all-read'
    ),

    # ========================================================================
    # Extraction Mapping Admin Endpoints (not project-scoped)
    # ========================================================================

    # Extraction mappings CRUD
    path(
        'landscaper/mappings/',
        ExtractionMappingViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='extraction-mappings'
    ),
    path(
        'landscaper/mappings/<int:pk>/',
        ExtractionMappingViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='extraction-mapping-detail'
    ),

    # Mapping utilities
    path(
        'landscaper/mappings/stats/',
        ExtractionMappingViewSet.as_view({
            'get': 'stats',
        }),
        name='extraction-mappings-stats'
    ),
    path(
        'landscaper/mappings/bulk-toggle/',
        ExtractionMappingViewSet.as_view({
            'post': 'bulk_toggle',
        }),
        name='extraction-mappings-bulk-toggle'
    ),
    path(
        'landscaper/mappings/document-types/',
        ExtractionMappingViewSet.as_view({
            'get': 'document_types',
        }),
        name='extraction-mappings-document-types'
    ),
    path(
        'landscaper/mappings/target-tables/',
        ExtractionMappingViewSet.as_view({
            'get': 'target_tables',
        }),
        name='extraction-mappings-target-tables'
    ),

    # Extraction logs
    path(
        'landscaper/logs/',
        ExtractionLogViewSet.as_view({
            'get': 'list',
        }),
        name='extraction-logs'
    ),
    path(
        'landscaper/logs/<int:pk>/',
        ExtractionLogViewSet.as_view({
            'get': 'retrieve',
        }),
        name='extraction-log-detail'
    ),
    path(
        'landscaper/logs/<int:pk>/review/',
        ExtractionLogViewSet.as_view({
            'post': 'review',
        }),
        name='extraction-log-review'
    ),

    # ========================================================================
    # Mutation Management Endpoints (Level 2 Autonomy)
    # ========================================================================

    # Get pending mutations for a project
    path(
        'landscaper/projects/<int:project_id>/mutations/pending/',
        PendingMutationsView.as_view(),
        name='pending-mutations'
    ),

    # Confirm a single mutation
    path(
        'landscaper/mutations/<str:mutation_id>/confirm/',
        ConfirmMutationView.as_view(),
        name='confirm-mutation'
    ),

    # Reject a single mutation
    path(
        'landscaper/mutations/<str:mutation_id>/reject/',
        RejectMutationView.as_view(),
        name='reject-mutation'
    ),

    # Confirm all mutations in a batch
    path(
        'landscaper/mutations/batch/<str:batch_id>/confirm/',
        ConfirmBatchView.as_view(),
        name='confirm-batch'
    ),

    # ========================================================================
    # Thread-based Chat Endpoints (New Thread System)
    # ========================================================================

    # Thread CRUD
    path(
        'landscaper/threads/',
        ChatThreadViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='landscaper-threads'
    ),
    path(
        'landscaper/threads/new/',
        ChatThreadViewSet.as_view({
            'post': 'start_new',
        }),
        name='landscaper-threads-new'
    ),
    path(
        'landscaper/threads/<uuid:pk>/',
        ChatThreadViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
        }),
        name='landscaper-thread-detail'
    ),
    path(
        'landscaper/threads/<uuid:pk>/close/',
        ChatThreadViewSet.as_view({
            'post': 'close',
        }),
        name='landscaper-thread-close'
    ),

    # Thread messages
    path(
        'landscaper/threads/<uuid:thread_id>/messages/',
        ThreadMessageViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='landscaper-thread-messages'
    ),

    # ========================================================================
    # Global Chat Endpoints (Non-Project Contexts: DMS, Admin, Benchmarks)
    # ========================================================================

    path(
        'landscaper/global/chat/',
        GlobalChatViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='landscaper-global-chat'
    ),

    # ========================================================================
    # Help Landscaper Endpoint (Global Platform Training Assistant)
    # ========================================================================

    path(
        'landscaper/help/chat/',
        HelpChatView.as_view(),
        name='help-chat'
    ),

    # ========================================================================
    # Scenario Log Endpoints (What-If Scenario Management)
    # ========================================================================

    # List/Create scenarios for a project
    path(
        'landscaper/projects/<int:project_id>/scenarios/',
        ScenarioLogListCreateView.as_view(),
        name='landscaper-scenarios'
    ),

    # Detail/Update/Delete a specific scenario
    path(
        'landscaper/projects/<int:project_id>/scenarios/<int:scenario_log_id>/',
        ScenarioLogDetailView.as_view(),
        name='landscaper-scenario-detail'
    ),

    # ========================================================================
    # Custom Instructions Endpoints (Phase 6)
    # ========================================================================

    # List/Create instructions
    path(
        'landscaper/instructions/',
        InstructionListCreateView.as_view(),
        name='landscaper-instructions'
    ),

    # Update/Delete a specific instruction
    path(
        'landscaper/instructions/<int:instruction_id>/',
        InstructionDetailView.as_view(),
        name='landscaper-instruction-detail'
    ),

    # ========================================================================
    # KPI Definition Endpoints (Phase 6)
    # ========================================================================

    # List/Create KPI definitions
    path(
        'landscaper/kpi-definitions/',
        KpiDefinitionListCreateView.as_view(),
        name='landscaper-kpi-definitions'
    ),

    # Update/Delete a specific KPI definition
    path(
        'landscaper/kpi-definitions/<int:kpi_id>/',
        KpiDefinitionDetailView.as_view(),
        name='landscaper-kpi-definition-detail'
    ),

    # Get KPIs by project type (convenience endpoint)
    path(
        'landscaper/kpi-definitions/by-type/<str:type_code>/',
        KpiDefinitionByTypeView.as_view(),
        name='landscaper-kpi-definitions-by-type'
    ),

    # ========================================================================
    # Intake Session Endpoints (Intelligence v1)
    # ========================================================================

    path(
        'intake/start/',
        IntakeStartView.as_view(),
        name='intake-start'
    ),
    path(
        'intake/<uuid:intake_uuid>/mapping_suggestions/',
        IntakeMappingSuggestionsView.as_view(),
        name='intake-mapping-suggestions'
    ),
    path(
        'intake/<uuid:intake_uuid>/lock_mapping/',
        IntakeLockMappingView.as_view(),
        name='intake-lock-mapping'
    ),
    path(
        'intake/<uuid:intake_uuid>/extracted_values/',
        IntakeExtractedValuesView.as_view(),
        name='intake-extracted-values'
    ),
    path(
        'intake/<uuid:intake_uuid>/commit_values/',
        IntakeCommitValuesView.as_view(),
        name='intake-commit-values'
    ),
    path(
        'intake/<uuid:intake_uuid>/re_extract/',
        IntakeReExtractView.as_view(),
        name='intake-re-extract'
    ),

    # ========================================================================
    # Override Management Endpoints (Phase 6 — Red Dot Governance)
    # ========================================================================

    # List overrides for a project (includes overriddenFieldKeys for red dots)
    path(
        'landscaper/projects/<int:project_id>/overrides/',
        OverrideListView.as_view(),
        name='landscaper-overrides'
    ),

    # Toggle an override on
    path(
        'landscaper/projects/<int:project_id>/overrides/toggle/',
        OverrideToggleView.as_view(),
        name='landscaper-override-toggle'
    ),

    # Revert an override
    path(
        'landscaper/overrides/<int:override_id>/revert/',
        OverrideRevertView.as_view(),
        name='landscaper-override-revert'
    ),
]
