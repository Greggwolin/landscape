"""
Budget Category API Views

Endpoints for budget category management and completion tracking.
"""

from django.db import connection
from django.db.models import Count, Sum, Q, Prefetch
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models_budget_categories import BudgetCategory, CategoryCompletionStatus
from .models import BudgetItem
from .serializers_budget_categories import (
    BudgetCategorySerializer,
    QuickAddCategorySerializer,
    IncompleteCategorySerializer,
    CategoryDismissReminderSerializer,
    CategoryMarkCompleteSerializer,
)


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for budget category CRUD operations.

    Endpoints:
    - GET    /api/budget/categories/           - List categories
    - POST   /api/budget/categories/           - Create category (full)
    - POST   /api/budget/categories/quick-add/ - Quick-add category (minimal)
    - GET    /api/budget/categories/{id}/      - Get category details
    - PUT    /api/budget/categories/{id}/      - Update category
    - PATCH  /api/budget/categories/{id}/      - Partial update
    - DELETE /api/budget/categories/{id}/      - Delete category
    - GET    /api/budget/categories/incomplete/ - Get incomplete categories
    - POST   /api/budget/categories/{id}/dismiss-reminder/ - Dismiss reminder
    - POST   /api/budget/categories/{id}/mark-complete/    - Mark complete
    """

    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'category_id'

    def get_queryset(self):
        """
        Filter categories based on query parameters.

        Query params:
        - project_id: Filter by project
        - level: Filter by level (1-4)
        - parent_id: Filter by parent
        - is_template: Filter templates
        - is_incomplete: Filter incomplete categories
        - is_active: Filter active/inactive
        """
        queryset = BudgetCategory.objects.all()

        # Filter by project
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by level
        level = self.request.query_params.get('level')
        if level:
            queryset = queryset.filter(level=level)

        # Filter by parent
        parent_id = self.request.query_params.get('parent_id')
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)

        # Filter by template status
        is_template = self.request.query_params.get('is_template')
        if is_template is not None:
            queryset = queryset.filter(is_template=is_template.lower() == 'true')

        # Filter by completion status
        is_incomplete = self.request.query_params.get('is_incomplete')
        if is_incomplete is not None:
            queryset = queryset.filter(is_incomplete=is_incomplete.lower() == 'true')

        # Filter by active status (default: active only)
        is_active = self.request.query_params.get('is_active', 'true')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.select_related('parent', 'project').order_by('level', 'sort_order', 'name')

    def get_serializer_context(self):
        """Add context for serializers"""
        context = super().get_serializer_context()

        # Only include usage count if explicitly requested (expensive query)
        include_usage = self.request.query_params.get('include_usage_count', 'false')
        context['include_usage_count'] = include_usage.lower() == 'true'

        return context

    @action(detail=False, methods=['post'], url_path='quick-add')
    def quick_add(self, request):
        """
        Quick-add category with minimal fields.

        Required:
        - name: Category name
        - level: Hierarchy level (1-4)
        - project_id: Project ID

        Optional:
        - parent_id: Parent category ID (recommended for L2-4)

        Auto-generated:
        - code: Generated from name and parent
        - is_incomplete: Set to True
        - created_from: Set to 'budget_quick_add'
        """
        serializer = QuickAddCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()

        # Return full category data
        output_serializer = BudgetCategorySerializer(category)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='incomplete')
    def incomplete(self, request):
        """
        Get incomplete categories for a project.

        Uses the database function get_incomplete_categories_for_project()
        to return categories that:
        1. Are marked incomplete
        2. Are actively used in budget
        3. Haven't been dismissed (or dismissal expired)

        Query params:
        - project_id (required): Project ID to check

        Returns:
        - List of incomplete categories with usage counts and missing fields
        """
        project_id = request.query_params.get('project_id')

        if not project_id:
            return Response(
                {'error': 'project_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project_id = int(project_id)
        except ValueError:
            return Response(
                {'error': 'project_id must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Call database function
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM landscape.get_incomplete_categories_for_project(%s)",
                [project_id]
            )

            columns = [col[0] for col in cursor.description]
            results = [
                dict(zip(columns, row))
                for row in cursor.fetchall()
            ]

        # Serialize results
        serializer = IncompleteCategorySerializer(results, many=True)

        return Response({
            'project_id': project_id,
            'count': len(results),
            'categories': serializer.data
        })

    @action(detail=True, methods=['post'], url_path='dismiss-reminder')
    def dismiss_reminder(self, request, category_id=None):
        """
        Dismiss reminders for this category.

        Request body:
        - days (optional): Number of days to dismiss (default 7, max 30)

        Effect:
        - Sets reminder_dismissed_at to current timestamp
        - Category won't show reminders for specified days
        """
        category = self.get_object()

        serializer = CategoryDismissReminderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        days = serializer.validated_data.get('days', 7)
        category.dismiss_reminders(days=days)

        return Response({
            'message': f'Reminders dismissed for {days} days',
            'category_id': category.category_id,
            'reminder_dismissed_at': category.reminder_dismissed_at,
        })

    @action(detail=True, methods=['post'], url_path='mark-complete')
    def mark_complete(self, request, category_id=None):
        """
        Mark category as complete.

        Request body:
        - force (optional): Force complete even if fields missing (default False)

        Effect:
        - Sets is_incomplete = False
        - Clears reminder timestamps
        - Deletes completion status records

        Validation:
        - By default, requires all optional fields filled
        - Use force=true to skip validation
        """
        category = self.get_object()

        serializer = CategoryMarkCompleteSerializer(
            data=request.data,
            context={'category': category}
        )
        serializer.is_valid(raise_exception=True)

        # Check if category is already complete
        if not category.is_incomplete:
            return Response({
                'message': 'Category is already marked complete',
                'category_id': category.category_id,
            })

        # Mark complete
        category.mark_complete()

        return Response({
            'message': 'Category marked complete',
            'category_id': category.category_id,
            'is_incomplete': category.is_incomplete,
        })

    @action(detail=True, methods=['post'], url_path='update-completion-status')
    def update_completion_status(self, request, category_id=None):
        """
        Manually trigger update of completion status records.

        This is normally handled automatically by the database trigger,
        but this endpoint can be used to force a refresh.
        """
        category = self.get_object()
        category.update_completion_status()

        # Get updated missing fields
        missing_fields = category.get_missing_fields()

        # Check if category is now complete
        is_complete = len(missing_fields) == 0

        if is_complete and category.is_incomplete:
            category.mark_complete()

        return Response({
            'category_id': category.category_id,
            'is_incomplete': category.is_incomplete,
            'missing_fields': missing_fields,
            'is_complete': is_complete,
        })

    @action(detail=False, methods=['get'], url_path='with-usage')
    def with_usage(self, request):
        """
        Get categories with project usage statistics.

        Returns hierarchical tree with usage counts and budget amounts per category.

        Query params:
        - project_id (required): Project to calculate usage for
        - activity (optional): Filter to specific activity
        - include_unused (optional, default=true): Include categories with 0 usage

        Response includes:
        - categories: List of categories with usage_count and budget_amount
        - summary: Aggregate statistics (total categories, used, incomplete, total budget)
        """
        project_id = request.query_params.get('project_id')
        activity = request.query_params.get('activity')
        include_unused = request.query_params.get('include_unused', 'true').lower() == 'true'

        if not project_id:
            return Response(
                {'error': 'project_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project_id = int(project_id)
        except ValueError:
            return Response(
                {'error': 'project_id must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build base queryset - active categories only
        categories = BudgetCategory.objects.filter(is_active=True)

        # Filter by activity if specified
        if activity:
            categories = categories.filter(
                lifecycle_stages__activity=activity
            )

        # Count usage from budget facts using all 4 level FKs
        # Use raw SQL for efficiency since we need to check 4 different columns
        usage_sql = """
            SELECT
                cat_id,
                COUNT(*) as usage_count,
                COALESCE(SUM(amount), 0) as budget_amount
            FROM (
                SELECT UNNEST(ARRAY[
                    category_l1_id,
                    category_l2_id,
                    category_l3_id,
                    category_l4_id
                ]) AS cat_id,
                amount
                FROM landscape.core_fin_fact_budget
                WHERE project_id = %s
            ) cat_usage
            WHERE cat_id IS NOT NULL
            GROUP BY cat_id
        """

        with connection.cursor() as cursor:
            cursor.execute(usage_sql, [project_id])
            usage_data = {row[0]: {'count': row[1], 'amount': row[2]} for row in cursor.fetchall()}

        # Annotate categories with usage data
        categories_list = []
        for category in categories.prefetch_related('lifecycle_stages', 'parent', 'children'):
            usage = usage_data.get(category.category_id, {'count': 0, 'amount': 0})

            # Skip unused categories if requested
            if not include_unused and usage['count'] == 0:
                continue

            category_data = {
                'category_id': category.category_id,
                'level': category.level,
                'code': category.code,
                'name': category.name,
                'description': category.description,
                'icon': category.icon,
                'color': category.color,
                'activities': [ls.activity for ls in category.lifecycle_stages.all()],
                'usage_count': usage['count'],
                'budget_amount': float(usage['amount']),
                'is_incomplete': category.is_incomplete,
                'parent_category': {
                    'category_id': category.parent.category_id,
                    'name': category.parent.name,
                } if category.parent else None,
                'children': [],  # Will be populated in tree building
            }
            categories_list.append(category_data)

        # Build hierarchical tree structure
        category_map = {cat['category_id']: cat for cat in categories_list}
        root_categories = []

        for cat_data in categories_list:
            if cat_data['parent_category']:
                parent_id = cat_data['parent_category']['category_id']
                if parent_id in category_map:
                    category_map[parent_id]['children'].append(cat_data)
            else:
                root_categories.append(cat_data)

        # Calculate summary statistics
        total_count = len(categories_list)
        used_count = sum(1 for cat in categories_list if cat['usage_count'] > 0)
        incomplete_count = sum(1 for cat in categories_list if cat['is_incomplete'])
        total_budget = sum(cat['budget_amount'] for cat in categories_list)

        return Response({
            'categories': root_categories,
            'summary': {
                'total_categories': total_count,
                'used_categories': used_count,
                'incomplete_categories': incomplete_count,
                'total_budget': total_budget,
            }
        })

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete category (set is_active=False).

        Only allows deletion if:
        1. Category has no active children
        2. Category is not referenced in budget items
        """
        category = self.get_object()

        # Check for active children
        if category.children.filter(is_active=True).exists():
            return Response(
                {'error': 'Cannot delete category with active children. Delete children first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for budget item references
        if category.has_budget_items():
            return Response(
                {'error': 'Cannot delete category referenced in budget items. Archive instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Soft delete
        category.is_active = False
        category.save()

        return Response(status=status.HTTP_204_NO_CONTENT)


__all__ = ['BudgetCategoryViewSet']
