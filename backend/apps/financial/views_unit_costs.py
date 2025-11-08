"""ViewSets for unit cost templates, categories, and planning standards."""

from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models_benchmarks import (
    UnitCostCategory,
    UnitCostTemplate,
    TemplateBenchmarkLink,
    PlanningStandard,
    BenchmarkAISuggestion,
)
from .serializers_unit_costs import (
    UnitCostCategorySerializer,
    StageGroupedCategoriesSerializer,
    UnitCostTemplateListSerializer,
    UnitCostTemplateDetailSerializer,
    UnitCostTemplateWriteSerializer,
    PlanningStandardSerializer,
)


class UnitCostCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Expose unit cost categories with template counts for UI filters."""

    serializer_class = UnitCostCategorySerializer
    queryset = UnitCostCategory.objects.filter(is_active=True)

    def get_queryset(self):
        """Apply filters and annotate template counts."""
        qs = super().get_queryset()
        cost_scope = self.request.query_params.get('cost_scope')
        cost_type = self.request.query_params.get('cost_type')
        development_stage = self.request.query_params.get('development_stage')
        project_type_code = self.request.query_params.get('project_type_code')

        if cost_scope:
            qs = qs.filter(cost_scope=cost_scope)
        if cost_type:
            qs = qs.filter(cost_type=cost_type)
        if development_stage:
            qs = qs.filter(development_stage=development_stage)

        template_filter = Q(templates__is_active=True)
        if project_type_code:
            template_filter &= Q(templates__project_type_code__iexact=project_type_code)

        return qs.annotate(
            template_count=Count('templates', filter=template_filter, distinct=True)
        ).order_by('development_stage', 'sort_order', 'category_name')

    @action(detail=False, methods=['get'], url_path='by-stage')
    def by_stage(self, request):
        """
        Get all categories grouped by development stage.

        Returns:
            {
                "stage1_entitlements": [...],
                "stage2_engineering": [...],
                "stage3_development": [...]
            }
        """
        project_type_code = request.query_params.get('project_type_code')

        # Build template filter
        template_filter = Q(templates__is_active=True)
        if project_type_code:
            template_filter &= Q(templates__project_type_code__iexact=project_type_code)

        # Get categories annotated with template counts
        categories = UnitCostCategory.objects.filter(is_active=True).annotate(
            template_count=Count('templates', filter=template_filter, distinct=True)
        ).order_by('development_stage', 'sort_order', 'category_name')

        # Group by stage
        grouped = {
            'stage1_entitlements': [],
            'stage2_engineering': [],
            'stage3_development': []
        }

        for cat in categories:
            stage = cat.development_stage
            if stage in grouped:
                serialized = UnitCostCategorySerializer(cat).data
                grouped[stage].append(serialized)

        return Response(grouped)


class UnitCostTemplateViewSet(viewsets.ModelViewSet):
    """Full CRUD for unit cost templates, including AI ingestion."""

    queryset = UnitCostTemplate.objects.select_related('category', 'created_from_project')

    def get_queryset(self):
        qs = self.queryset
        include_inactive = self.request.query_params.get('include_inactive') == 'true'
        if not include_inactive:
            qs = qs.filter(is_active=True)

        category_id = self.request.query_params.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)

        # Filter by development stage (via category relationship)
        development_stage = self.request.query_params.get('development_stage')
        if development_stage:
            qs = qs.filter(category__development_stage=development_stage)

        project_type_code = self.request.query_params.get('project_type_code')
        if project_type_code:
            qs = qs.filter(project_type_code__iexact=project_type_code)

        geography = self.request.query_params.get('geography')
        if geography:
            qs = qs.filter(market_geography__icontains=geography)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(item_name__icontains=search)

        return qs.annotate(
            has_benchmarks=Exists(
                TemplateBenchmarkLink.objects.filter(template_id=OuterRef('template_id'))
            )
        ).order_by('item_name')

    @action(detail=False, methods=['get'], url_path='by-stage')
    def by_stage(self, request):
        """
        Get templates filtered by development stage.

        Query params:
            ?stage=stage1_entitlements
            ?stage=stage2_engineering
            ?stage=stage3_development
            ?project_type_code=LAND (optional)
            ?search=keyword (optional)
        """
        stage = request.query_params.get('stage')

        if not stage:
            return Response(
                {'error': 'stage parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get templates for this stage via category relationship
        qs = self.get_queryset().filter(category__development_stage=stage)

        serializer = UnitCostTemplateListSerializer(qs, many=True)
        return Response(serializer.data)

    def get_serializer_class(self):
        if self.action == 'list':
            return UnitCostTemplateListSerializer
        if self.action in {'create', 'update', 'partial_update', 'from_ai'}:
            return UnitCostTemplateWriteSerializer
        return UnitCostTemplateDetailSerializer

    def perform_destroy(self, instance):
        """Soft delete templates by toggling is_active."""
        instance.is_active = False
        instance.updated_at = timezone.now()
        instance.save(update_fields=['is_active', 'updated_at'])

    @action(detail=False, methods=['post'], url_path='from-ai')
    def from_ai(self, request):
        """
        Accept an AI-generated suggestion and persist as a template.

        Expects the same payload as POST /templates plus optional suggestion_id.
        """
        data = request.data.copy()
        suggestion_id = data.pop('suggestion_id', None)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        template = serializer.save(created_from_ai=True)

        if suggestion_id:
            reviewer = None
            if request.user and request.user.is_authenticated:
                reviewer = getattr(request.user, 'username', None) or str(request.user)
            BenchmarkAISuggestion.objects.filter(
                suggestion_id=suggestion_id
            ).update(
                status='accepted',
                reviewed_at=timezone.now(),
                reviewed_by=reviewer,
                created_benchmark_id=template.template_id,
            )

        detail = UnitCostTemplateDetailSerializer(template, context=self.get_serializer_context())
        return Response(detail.data, status=status.HTTP_201_CREATED)


class PlanningStandardView(APIView):
    """Retrieve and update the global planning defaults."""

    def get(self, request):
        standard = PlanningStandard.objects.filter(is_active=True).order_by('standard_id').first()
        if not standard:
            return Response({'standard': None})
        serializer = PlanningStandardSerializer(standard)
        return Response({'standard': serializer.data})

    def put(self, request):
        standard = PlanningStandard.objects.filter(is_active=True).order_by('standard_id').first()
        if not standard:
            return Response({'error': 'No planning standard configured'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PlanningStandardSerializer(standard, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'standard': serializer.data})
