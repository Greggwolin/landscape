"""ViewSets for unit cost items, categories, and planning standards.

Renamed from "templates" to "items" in migration 0018 to eliminate confusion
with page templates. These ViewSets handle individual cost line items.
"""

from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models_benchmarks import (
    CategoryTagLibrary,
    CategoryActivity,
    UnitCostCategory,
    UnitCostItem,  # Renamed from UnitCostTemplate in migration 0018
    ItemBenchmarkLink,  # Renamed from TemplateBenchmarkLink in migration 0018
    PlanningStandard,
    BenchmarkAISuggestion,
)
from .serializers_unit_costs import (
    CategoryTagLibrarySerializer,
    UnitCostCategorySerializer,
    UnitCostCategoryHierarchySerializer,
    UnitCostItemListSerializer,  # Renamed from UnitCostTemplateListSerializer
    UnitCostItemDetailSerializer,  # Renamed from UnitCostTemplateDetailSerializer
    UnitCostItemWriteSerializer,  # Renamed from UnitCostTemplateWriteSerializer
    PlanningStandardSerializer,
)


class CategoryTagLibraryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing category tags."""

    queryset = CategoryTagLibrary.objects.all()
    serializer_class = CategoryTagLibrarySerializer
    permission_classes = [AllowAny]  # Allow unauthenticated access for admin UI

    def get_queryset(self):
        """Filter tags by context and active status."""
        qs = super().get_queryset()
        tag_context = self.request.query_params.get('tag_context')
        is_system_default = self.request.query_params.get('is_system_default')
        is_active = self.request.query_params.get('is_active', 'true')

        if tag_context:
            qs = qs.filter(tag_context__icontains=tag_context)
        if is_system_default is not None:
            qs = qs.filter(is_system_default=(is_system_default.lower() == 'true'))
        if is_active.lower() == 'true':
            qs = qs.filter(is_active=True)

        return qs.order_by('display_order', 'tag_name')


class UnitCostCategoryViewSet(viewsets.ModelViewSet):
    """Full CRUD for unit cost categories with lifecycle stages and tag-based filtering."""

    serializer_class = UnitCostCategorySerializer
    queryset = UnitCostCategory.objects.filter(is_active=True)
    permission_classes = [AllowAny]  # Allow unauthenticated access for admin UI

    def perform_update(self, serializer):
        """Custom update to handle activities many-to-many relationship."""
        from django.db import connection

        instance = serializer.save()

        # Handle activities update if provided in request data
        if 'activities' in self.request.data:
            new_stages = self.request.data.get('activities', [])

            # Clear existing activities
            CategoryActivity.objects.filter(category_id=instance.category_id).delete()

            # Add new activities using raw SQL (table has no id column)
            if new_stages:
                with connection.cursor() as cursor:
                    for stage in new_stages:
                        cursor.execute(
                            """
                            INSERT INTO landscape.core_category_activitys
                            (category_id, activity, sort_order, created_at, updated_at)
                            VALUES (%s, %s, 0, NOW(), NOW())
                            ON CONFLICT (category_id, activity) DO NOTHING
                            """,
                            [instance.category_id, stage]
                        )

            instance.updated_at = timezone.now()
            instance.save(update_fields=['updated_at'])

    def perform_destroy(self, instance):
        """Soft delete categories by toggling is_active."""
        instance.is_active = False
        instance.updated_at = timezone.now()
        instance.save(update_fields=['is_active', 'updated_at'])

    def get_queryset(self):
        """Apply filters and annotate item counts."""
        qs = super().get_queryset()
        activity = self.request.query_params.get('activity')
        tag = self.request.query_params.get('tag')
        parent_id = self.request.query_params.get('parent')
        project_type_code = self.request.query_params.get('project_type_code')

        # Filter by lifecycle stage (using pivot table)
        if activity:
            qs = qs.filter(
                category_id__in=CategoryActivity.objects.filter(
                    activity=activity
                ).values_list('category_id', flat=True)
            )

        # Filter by tag (categories containing this tag)
        if tag:
            qs = qs.filter(tags__contains=[tag])

        # Filter by parent (for hierarchy navigation)
        if parent_id:
            if parent_id.lower() == 'null':
                qs = qs.filter(parent__isnull=True)
            else:
                qs = qs.filter(parent_id=parent_id)

        # Build item filter
        item_filter = Q(items__is_active=True)
        if project_type_code:
            item_filter &= Q(items__project_type_code__iexact=project_type_code)

        return qs.annotate(
            item_count=Count('items', filter=item_filter, distinct=True)
        ).order_by('sort_order', 'category_name')

    @action(detail=False, methods=['get'])
    def hierarchy(self, request):
        """
        Return categories as nested hierarchy.

        Query params:
            ?activity=Development (optional)
        """
        activity = request.query_params.get('activity')

        queryset = UnitCostCategory.objects.filter(parent__isnull=True, is_active=True)
        if activity:
            # Filter by lifecycle stage using pivot table
            queryset = queryset.filter(
                category_id__in=CategoryActivity.objects.filter(
                    activity=activity
                ).values_list('category_id', flat=True)
            )

        queryset = queryset.order_by('sort_order', 'category_name')
        serializer = UnitCostCategoryHierarchySerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-tag')
    def by_tag(self, request):
        """
        Get categories filtered by tag.

        Query params:
            ?tag=Hard (required)
            ?activity=Development (optional)
        """
        tag = request.query_params.get('tag')
        if not tag:
            return Response(
                {'error': 'tag parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        activity = request.query_params.get('activity')

        queryset = UnitCostCategory.objects.filter(
            tags__contains=[tag],
            is_active=True
        )

        if activity:
            # Filter by lifecycle stage using pivot table
            queryset = queryset.filter(
                category_id__in=CategoryActivity.objects.filter(
                    activity=activity
                ).values_list('category_id', flat=True)
            )

        queryset = queryset.order_by('sort_order', 'category_name')

        # Annotate with item counts
        project_type_code = request.query_params.get('project_type_code')
        item_filter = Q(items__is_active=True)
        if project_type_code:
            item_filter &= Q(items__project_type_code__iexact=project_type_code)

        queryset = queryset.annotate(
            item_count=Count('items', filter=item_filter, distinct=True)
        )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add-tag')
    def add_tag(self, request, pk=None):
        """Add a tag to this category."""
        category = self.get_object()
        tag_name = request.data.get('tag_name')

        if not tag_name:
            return Response(
                {'error': 'tag_name required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        category.add_tag(tag_name)
        serializer = self.get_serializer(category)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='remove-tag')
    def remove_tag(self, request, pk=None):
        """Remove a tag from this category."""
        category = self.get_object()
        tag_name = request.data.get('tag_name')

        if not tag_name:
            return Response(
                {'error': 'tag_name required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        category.remove_tag(tag_name)
        serializer = self.get_serializer(category)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='deletion-impact')
    def deletion_impact(self, request, pk=None):
        """Get impact analysis before deleting a category."""
        category = self.get_object()

        # Get child categories
        children = UnitCostCategory.objects.filter(
            parent_id=category.category_id,
            is_active=True
        ).values('category_id', 'category_name')

        # Get item count
        item_count = UnitCostItem.objects.filter(
            category_id=category.category_id,
            is_active=True
        ).count()

        # Get project usage count (if budget items reference this category)
        # This would require checking core_budget_item table
        project_usage_count = 0  # Placeholder

        return Response({
            'category_id': category.category_id,
            'category_name': category.category_name,
            'child_categories': list(children),
            'item_count': item_count,
            'project_usage_count': project_usage_count,
        })


class UnitCostItemViewSet(viewsets.ModelViewSet):
    """Full CRUD for unit cost items, with lifecycle and tag-based filtering.

    Renamed from UnitCostTemplateViewSet in migration 0018.
    """

    queryset = UnitCostItem.objects.select_related('category', 'created_from_project')
    permission_classes = [AllowAny]  # Allow unauthenticated access for admin UI

    def get_queryset(self):
        qs = self.queryset
        include_inactive = self.request.query_params.get('include_inactive') == 'true'
        if not include_inactive:
            qs = qs.filter(is_active=True)

        category_id = self.request.query_params.get('category_id')
        if category_id:
            qs = qs.filter(category_id=category_id)

        # Filter by lifecycle stage (via category pivot table)
        activity = self.request.query_params.get('activity')
        if activity:
            qs = qs.filter(
                category_id__in=CategoryActivity.objects.filter(
                    activity=activity
                ).values_list('category_id', flat=True)
            )

        # Filter by tag (via category relationship)
        tag = self.request.query_params.get('tag')
        if tag:
            qs = qs.filter(category__tags__contains=[tag])

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
                ItemBenchmarkLink.objects.filter(item_id=OuterRef('item_id'))
            )
        ).order_by('item_name')

    def get_serializer_class(self):
        if self.action == 'list':
            return UnitCostItemListSerializer
        if self.action in {'create', 'update', 'partial_update', 'from_ai'}:
            return UnitCostItemWriteSerializer
        return UnitCostItemDetailSerializer

    def perform_destroy(self, instance):
        """Soft delete items by toggling is_active."""
        instance.is_active = False
        instance.updated_at = timezone.now()
        instance.save(update_fields=['is_active', 'updated_at'])

    @action(detail=False, methods=['post'], url_path='from-ai')
    def from_ai(self, request):
        """
        Accept an AI-generated suggestion and persist as an item.

        Expects the same payload as POST /items plus optional suggestion_id.
        """
        data = request.data.copy()
        suggestion_id = data.pop('suggestion_id', None)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(created_from_ai=True)

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
                created_benchmark_id=item.item_id,
            )

        detail = UnitCostItemDetailSerializer(item, context=self.get_serializer_context())
        return Response(detail.data, status=status.HTTP_201_CREATED)


# Backward compatibility alias
UnitCostTemplateViewSet = UnitCostItemViewSet


class PlanningStandardView(APIView):
    """Retrieve and update the global planning defaults."""

    permission_classes = [AllowAny]  # Allow unauthenticated access for admin UI

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
