"""
Serializers for Financial models.

Provides serialization for budget and actual financial data with rollup support.
"""

from rest_framework import serializers
from .models import BudgetItem, ActualItem
from .models_finance_structure import (
    FinanceStructure,
    CostAllocation,
    SaleSettlement,
    ParticipationPayment,
)
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
    finance_structure_id = serializers.IntegerField(
        source='finance_structure.finance_structure_id',
        allow_null=True,
        read_only=True
    )
    parent_budget_item_id = serializers.IntegerField(
        source='parent_budget_item.budget_item_id',
        allow_null=True,
        read_only=True
    )
    category_l1_id = serializers.IntegerField(
        source='category_l1.category_id',
        allow_null=True,
        read_only=True
    )
    category_l2_id = serializers.IntegerField(
        source='category_l2.category_id',
        allow_null=True,
        read_only=True
    )
    category_l3_id = serializers.IntegerField(
        source='category_l3.category_id',
        allow_null=True,
        read_only=True
    )
    category_l4_id = serializers.IntegerField(
        source='category_l4.category_id',
        allow_null=True,
        read_only=True
    )
    children_total = serializers.SerializerMethodField()

    class Meta:
        model = BudgetItem
        fields = [
            # IDs and References
            'budget_item_id',
            'project_id',
            'container_id',
            'finance_structure_id',

            # Classification (Legacy)
            'category',
            'subcategory',
            'line_item_name',
            'account_code',

            # Category Hierarchy
            'category_l1_id',
            'category_l2_id',
            'category_l3_id',
            'category_l4_id',

            # Time Period
            'fiscal_year',
            'fiscal_period',
            'period_type',
            'start_period',
            'periods_to_complete',
            'end_period',

            # Financial Values
            'qty',
            'rate',
            'uom_code',
            'budgeted_amount',
            'variance_amount',
            'vendor_name',
            'vendor_contact_id',

            # STANDARD MODE: Timing & Escalation
            'escalation_rate',
            'escalation_method',
            'start_date',
            'end_date',
            'timing_method',
            'curve_profile',
            'curve_steepness',
            'curve_id',

            # STANDARD MODE: Cost Controls
            'contingency_pct',
            'confidence_level',
            'contract_number',
            'purchase_order',
            'is_committed',

            # STANDARD MODE: Classification
            'scope_override',
            'cost_type',
            'tax_treatment',
            'internal_memo',

            # DETAIL MODE: Advanced Timing / CPM
            'baseline_start_date',
            'baseline_end_date',
            'actual_start_date',
            'actual_end_date',
            'percent_complete',
            'status',
            'is_critical',
            'float_days',
            'early_start_date',
            'late_finish_date',
            'milestone_id',

            # DETAIL MODE: Financial Controls
            'budget_version',
            'version_as_of_date',
            'funding_id',
            'funding_draw_pct',
            'draw_schedule',
            'retention_pct',
            'payment_terms',
            'invoice_frequency',
            'cost_allocation',
            'is_reimbursable',

            # DETAIL MODE: Period Allocation
            'allocation_method',
            'cf_start_flag',
            'cf_distribution',
            'allocated_total',
            'allocation_variance',

            # DETAIL MODE: Documentation & Audit
            'bid_date',
            'bid_amount',
            'bid_variance',
            'change_order_count',
            'change_order_total',
            'approval_status',
            'approved_by',
            'approval_date',
            'document_count',
            'last_modified_by',
            'last_modified_date',

            # Hierarchy
            'is_rollup',
            'parent_budget_item_id',
            'children_total',

            # Metadata
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


# ============================================================================
# Finance Structure Serializers
# ============================================================================


class CostAllocationSerializer(serializers.ModelSerializer):
    """
    Serializer for CostAllocation model.

    Represents allocation of a cost pool to a specific container.
    """

    container_code = serializers.CharField(
        source='container.container_code',
        read_only=True
    )
    container_name = serializers.CharField(
        source='container.display_name',
        read_only=True
    )

    class Meta:
        model = CostAllocation
        fields = [
            'allocation_id',
            'finance_structure_id',
            'container_id',
            'container_code',
            'container_name',
            'allocation_percentage',
            'allocation_basis',
            'allocated_budget_amount',
            'spent_to_date',
            'cost_to_complete',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'allocation_id',
            'created_at',
            'updated_at',
        ]


class FinanceStructureSerializer(serializers.ModelSerializer):
    """
    Serializer for FinanceStructure model.

    Supports:
    - Capital cost pools (one-time infrastructure costs)
    - Operating obligation pools (recurring costs like ground leases)
    - Nested cost allocations
    - Budget tracking and calculations
    """

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    cost_allocations = CostAllocationSerializer(many=True, read_only=True)
    total_allocated_percentage = serializers.SerializerMethodField()
    spent_to_date = serializers.SerializerMethodField()
    remaining_budget = serializers.SerializerMethodField()

    class Meta:
        model = FinanceStructure
        fields = [
            'finance_structure_id',
            'project_id',
            'structure_code',
            'structure_name',
            'description',
            'structure_type',
            'total_budget_amount',
            'budget_category',
            'is_recurring',
            'recurrence_frequency',
            'annual_amount',
            'allocation_method',
            'is_active',
            'cost_allocations',
            'total_allocated_percentage',
            'spent_to_date',
            'remaining_budget',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        ]
        read_only_fields = [
            'finance_structure_id',
            'created_at',
            'updated_at',
            'cost_allocations',
            'total_allocated_percentage',
            'spent_to_date',
            'remaining_budget',
        ]

    def get_total_allocated_percentage(self, obj):
        """Get sum of allocation percentages across all containers."""
        return float(obj.get_total_allocated_percentage())

    def get_spent_to_date(self, obj):
        """Get total spent from budget items linked to this structure."""
        return float(obj.get_spent_to_date())

    def get_remaining_budget(self, obj):
        """Get unspent budget remaining."""
        return float(obj.get_remaining_budget())


class FinanceStructureCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating finance structures.

    Validates:
    - Project exists
    - Structure code is unique within project
    - Budget amounts are positive
    - Recurrence fields are required for recurring obligations
    """

    project_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = FinanceStructure
        fields = [
            'project_id',
            'structure_code',
            'structure_name',
            'description',
            'structure_type',
            'total_budget_amount',
            'budget_category',
            'is_recurring',
            'recurrence_frequency',
            'annual_amount',
            'allocation_method',
            'created_by',
        ]

    def validate_structure_code(self, value):
        """Ensure structure_code is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("structure_code is required")
        return value.strip()

    def validate_total_budget_amount(self, value):
        """Ensure budget amount is positive."""
        if value is not None and value < 0:
            raise serializers.ValidationError("total_budget_amount must be positive")
        return value

    def validate_annual_amount(self, value):
        """Ensure annual amount is positive."""
        if value is not None and value < 0:
            raise serializers.ValidationError("annual_amount must be positive")
        return value

    def validate(self, data):
        """Cross-field validation."""
        structure_type = data.get('structure_type')
        is_recurring = data.get('is_recurring', False)

        # Validate recurring obligation requires frequency and amount
        if is_recurring:
            if not data.get('recurrence_frequency'):
                raise serializers.ValidationError({
                    'recurrence_frequency': 'Required for recurring obligations'
                })
            if not data.get('annual_amount'):
                raise serializers.ValidationError({
                    'annual_amount': 'Required for recurring obligations'
                })

        # Validate capital cost pool requires total budget
        if structure_type == 'capital_cost_pool' and not data.get('total_budget_amount'):
            raise serializers.ValidationError({
                'total_budget_amount': 'Required for capital cost pools'
            })

        return data

    def create(self, validated_data):
        """Create finance structure with proper foreign key references."""
        from apps.projects.models import Project

        project_id = validated_data.pop('project_id')
        project = Project.objects.get(project_id=project_id)

        finance_structure = FinanceStructure.objects.create(
            project=project,
            **validated_data
        )

        return finance_structure


class ParticipationPaymentSerializer(serializers.ModelSerializer):
    """Serializer for ParticipationPayment model."""

    class Meta:
        model = ParticipationPayment
        fields = [
            'payment_id',
            'settlement_id',
            'project_id',
            'payment_date',
            'payment_period',
            'homes_closed_count',
            'gross_home_sales',
            'participation_base',
            'participation_amount',
            'less_base_allocation',
            'net_participation_payment',
            'cumulative_homes_closed',
            'cumulative_participation_paid',
            'payment_status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'payment_id',
            'created_at',
            'updated_at',
        ]


class SaleSettlementSerializer(serializers.ModelSerializer):
    """
    Serializer for SaleSettlement model.

    Tracks sale transactions with cost-to-complete adjustments
    and participation structures.
    """

    container_code = serializers.CharField(
        source='container.container_code',
        read_only=True
    )
    container_name = serializers.CharField(
        source='container.display_name',
        read_only=True
    )
    participation_payments = ParticipationPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = SaleSettlement
        fields = [
            'settlement_id',
            'project_id',
            'container_id',
            'container_code',
            'container_name',
            'sale_date',
            'buyer_name',
            'buyer_entity',
            'list_price',
            'allocated_cost_to_complete',
            'other_adjustments',
            'net_proceeds',
            'settlement_type',
            'settlement_notes',
            'cost_allocation_detail',
            'has_participation',
            'participation_rate',
            'participation_basis',
            'participation_minimum',
            'participation_target_price',
            'settlement_status',
            'participation_payments',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        ]
        read_only_fields = [
            'settlement_id',
            'created_at',
            'updated_at',
            'participation_payments',
        ]


class CostAllocationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating cost allocations."""

    class Meta:
        model = CostAllocation
        fields = [
            'finance_structure_id',
            'container_id',
            'allocation_percentage',
            'allocation_basis',
            'allocated_budget_amount',
        ]

    def validate_allocation_percentage(self, value):
        """Ensure percentage is between 0 and 100."""
        if not 0 <= value <= 100:
            raise serializers.ValidationError(
                "allocation_percentage must be between 0 and 100"
            )
        return value
