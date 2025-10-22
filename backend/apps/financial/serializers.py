"""
Serializers for Financial models.

Provides serialization for budget and actual financial data with rollup support.
"""

from rest_framework import serializers
from .models import BudgetItem, ActualItem
from decimal import Decimal


class BudgetItemSerializer(serializers.ModelSerializer):
    """
    Serializer for BudgetItem model.

    Supports:
    - Direct budget entries
    - Hierarchical rollups
    - Category aggregations
    """

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    container_id = serializers.IntegerField(
        source='container.container_id',
        allow_null=True,
        read_only=True
    )
    parent_budget_item_id = serializers.IntegerField(
        source='parent_budget_item.budget_item_id',
        allow_null=True,
        read_only=True
    )
    children_total = serializers.SerializerMethodField()

    class Meta:
        model = BudgetItem
        fields = [
            'budget_item_id',
            'project_id',
            'container_id',
            'category',
            'subcategory',
            'line_item_name',
            'account_code',
            'fiscal_year',
            'fiscal_period',
            'period_type',
            'budgeted_amount',
            'variance_amount',
            'is_rollup',
            'parent_budget_item_id',
            'children_total',
            'notes',
            'attributes',
            'is_active',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        ]
        read_only_fields = [
            'budget_item_id',
            'created_at',
            'updated_at',
            'children_total',
        ]

    def get_children_total(self, obj):
        """Get sum of all child budget items."""
        if obj.is_rollup:
            return float(obj.get_children_total())
        return None


class BudgetItemCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating budget items.

    Validates:
    - Project exists
    - Container belongs to project (if provided)
    - Parent budget item exists (if provided)
    - Fiscal year is valid
    """

    project_id = serializers.IntegerField(write_only=True)
    container_id = serializers.IntegerField(
        write_only=True,
        required=False,
        allow_null=True
    )
    parent_budget_item_id = serializers.IntegerField(
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = BudgetItem
        fields = [
            'project_id',
            'container_id',
            'parent_budget_item_id',
            'category',
            'subcategory',
            'line_item_name',
            'account_code',
            'fiscal_year',
            'fiscal_period',
            'period_type',
            'budgeted_amount',
            'is_rollup',
            'notes',
            'attributes',
            'created_by',
        ]

    def validate_line_item_name(self, value):
        """Ensure line_item_name is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("line_item_name is required")
        return value

    def validate_category(self, value):
        """Validate category is from allowed list."""
        allowed_categories = [
            'Revenue',
            'OpEx',
            'CapEx',
            'Financing',
            'Disposition',
            'Other',
        ]
        if value not in allowed_categories:
            raise serializers.ValidationError(
                f"category must be one of: {', '.join(allowed_categories)}"
            )
        return value

    def validate_fiscal_year(self, value):
        """Ensure fiscal year is reasonable (1900-2100)."""
        if not 1900 <= value <= 2100:
            raise serializers.ValidationError(
                "fiscal_year must be between 1900 and 2100"
            )
        return value

    def validate_fiscal_period(self, value):
        """Ensure fiscal period is 1-12 if provided."""
        if value is not None and not 1 <= value <= 12:
            raise serializers.ValidationError(
                "fiscal_period must be between 1 and 12"
            )
        return value

    def validate(self, data):
        """
        Cross-field validation.

        - Container must belong to project
        - Parent budget item must belong to same project
        """
        project_id = data.get('project_id')
        container_id = data.get('container_id')
        parent_id = data.get('parent_budget_item_id')

        # Validate container belongs to project
        if container_id:
            from apps.containers.models import Container
            try:
                container = Container.objects.get(container_id=container_id)
                if container.project_id != project_id:
                    raise serializers.ValidationError({
                        'container_id': 'Container does not belong to this project'
                    })
            except Container.DoesNotExist:
                raise serializers.ValidationError({
                    'container_id': 'Container does not exist'
                })

        # Validate parent belongs to same project
        if parent_id:
            try:
                parent = BudgetItem.objects.get(budget_item_id=parent_id)
                if parent.project_id != project_id:
                    raise serializers.ValidationError({
                        'parent_budget_item_id': 'Parent budget item belongs to different project'
                    })
            except BudgetItem.DoesNotExist:
                raise serializers.ValidationError({
                    'parent_budget_item_id': 'Parent budget item does not exist'
                })

        return data

    def create(self, validated_data):
        """Create budget item with proper foreign key references."""
        from apps.projects.models import Project
        from apps.containers.models import Container

        project_id = validated_data.pop('project_id')
        container_id = validated_data.pop('container_id', None)
        parent_id = validated_data.pop('parent_budget_item_id', None)

        project = Project.objects.get(project_id=project_id)
        container = Container.objects.get(container_id=container_id) if container_id else None
        parent = BudgetItem.objects.get(budget_item_id=parent_id) if parent_id else None

        budget_item = BudgetItem.objects.create(
            project=project,
            container=container,
            parent_budget_item=parent,
            **validated_data
        )

        return budget_item


class BudgetRollupSerializer(serializers.Serializer):
    """
    Serializer for budget rollup aggregations.

    Returns budget totals grouped by category, subcategory, or custom grouping.
    """

    category = serializers.CharField()
    subcategory = serializers.CharField(allow_null=True)
    total_budgeted = serializers.DecimalField(max_digits=15, decimal_places=2)
    item_count = serializers.IntegerField()


class ActualItemSerializer(serializers.ModelSerializer):
    """Serializer for ActualItem model."""

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    container_id = serializers.IntegerField(
        source='container.container_id',
        allow_null=True,
        read_only=True
    )
    budget_item_id = serializers.IntegerField(
        source='budget_item.budget_item_id',
        allow_null=True,
        read_only=True
    )

    class Meta:
        model = ActualItem
        fields = [
            'actual_item_id',
            'project_id',
            'container_id',
            'budget_item_id',
            'category',
            'subcategory',
            'line_item_name',
            'account_code',
            'fiscal_year',
            'fiscal_period',
            'transaction_date',
            'actual_amount',
            'budgeted_amount',
            'variance_amount',
            'variance_pct',
            'notes',
            'attributes',
            'is_active',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        ]
        read_only_fields = [
            'actual_item_id',
            'variance_amount',
            'variance_pct',
            'created_at',
            'updated_at',
        ]


class VarianceReportSerializer(serializers.Serializer):
    """
    Serializer for budget vs actual variance reports.

    Combines budget and actual data with variance calculations.
    """

    category = serializers.CharField()
    subcategory = serializers.CharField(allow_null=True)
    line_item_name = serializers.CharField()
    fiscal_year = serializers.IntegerField()
    fiscal_period = serializers.IntegerField(allow_null=True)
    budgeted_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    actual_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    variance_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    variance_pct = serializers.DecimalField(max_digits=10, decimal_places=2)
