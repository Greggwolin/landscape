"""
Serializers for Portfolio models.

Provides serialization for portfolio CRUD, member management,
waterfall tier configuration, and cached result retrieval.
"""

from rest_framework import serializers
from .models_portfolio import (
    Portfolio,
    PortfolioMember,
    PortfolioWaterfallTier,
    PortfolioResult,
)


class PortfolioWaterfallTierSerializer(serializers.ModelSerializer):
    """Serializer for fund-level waterfall tier configuration."""

    class Meta:
        model = PortfolioWaterfallTier
        fields = [
            'tier_id', 'tier_number', 'tier_name',
            'hurdle_type', 'hurdle_rate',
            'lp_split_pct', 'gp_split_pct',
            'created_at',
        ]
        read_only_fields = ['tier_id', 'created_at']


class PortfolioMemberSerializer(serializers.ModelSerializer):
    """
    Serializer for portfolio member (cloned project).

    Includes computed fields from the linked project for display.
    """

    project_name = serializers.CharField(
        source='project.project_name',
        read_only=True
    )
    project_type_code = serializers.CharField(
        source='project.project_type_code',
        read_only=True
    )
    total_units = serializers.IntegerField(
        source='project.total_units',
        read_only=True
    )
    acquisition_price = serializers.DecimalField(
        source='project.acquisition_price',
        max_digits=15,
        decimal_places=2,
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = PortfolioMember
        fields = [
            'member_id', 'portfolio_id', 'project_id', 'source_project_id',
            'date_offset_months', 'size_scalar', 'size_low', 'size_high',
            'acquisition_date', 'sort_order', 'is_template',
            'created_at',
            # Computed from project
            'project_name', 'project_type_code', 'total_units', 'acquisition_price',
        ]
        read_only_fields = [
            'member_id', 'created_at',
            'project_name', 'project_type_code', 'total_units', 'acquisition_price',
        ]


class PortfolioSerializer(serializers.ModelSerializer):
    """
    Portfolio serializer with nested members and waterfall tiers.

    List view returns summary only. Detail view includes full nested data.
    """

    members = PortfolioMemberSerializer(many=True, read_only=True)
    waterfall_tiers = PortfolioWaterfallTierSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    total_units = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = [
            'portfolio_id', 'portfolio_name', 'description',
            'lp_ownership_pct', 'gp_ownership_pct',
            'fund_equity_total', 'leverage_target_pct',
            'is_active',
            'created_at', 'updated_at',
            # Nested
            'members', 'waterfall_tiers',
            # Computed
            'member_count', 'total_units',
        ]
        read_only_fields = ['portfolio_id', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        """Count of non-template members (cloned projects only)."""
        return obj.members.filter(is_template=False).count()

    def get_total_units(self, obj):
        """Sum of total_units across all non-template member projects."""
        total = 0
        for member in obj.members.filter(is_template=False):
            if member.project and member.project.total_units:
                total += member.project.total_units
        return total


class PortfolioListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for portfolio list views (no nested data)."""

    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = [
            'portfolio_id', 'portfolio_name', 'description',
            'lp_ownership_pct', 'gp_ownership_pct',
            'is_active',
            'created_at', 'updated_at',
            'member_count',
        ]
        read_only_fields = ['portfolio_id', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.members.filter(is_template=False).count()


class PortfolioResultSerializer(serializers.ModelSerializer):
    """
    Serializer for cached portfolio results.

    Returns scalar metrics by default. result_json is excluded from list views
    to minimize payload. Use detail view or get_portfolio_cashflow_detail
    Landscaper tool for period-by-period data.
    """

    class Meta:
        model = PortfolioResult
        fields = [
            'result_id', 'portfolio_id', 'run_id',
            'consolidated_irr', 'consolidated_emx',
            'total_equity_deployed', 'peak_equity', 'total_debt_peak',
            'gp_irr', 'gp_emx', 'gp_total_distributions', 'gp_promote_earned',
            'lp_irr', 'lp_emx', 'lp_total_distributions',
            'run_date',
        ]
        read_only_fields = ['result_id', 'run_id', 'run_date']


class PortfolioResultDetailSerializer(PortfolioResultSerializer):
    """Extended result serializer including full result_json for detail views."""

    class Meta(PortfolioResultSerializer.Meta):
        fields = PortfolioResultSerializer.Meta.fields + ['result_json']
