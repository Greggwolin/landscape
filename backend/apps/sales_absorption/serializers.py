"""Serializers for Sales & Absorption models."""

from typing import Any, Dict
from decimal import Decimal
from datetime import date

from rest_framework import serializers

from .models import (
    BenchmarkAbsorptionVelocity,
    BenchmarkMarketTiming,
    ClosingEvent,
    ParcelAbsorptionProfile,
    ParcelSaleEvent,
    ProjectAbsorptionAssumption,
    ProjectPricingAssumption,
    ProjectTimingAssumption,
)
from .utils import (
    calculate_inflated_price,
    calculate_gross_value,
    calculate_net_proceeds,
    validate_closing_units,
    validate_closing_dates,
)


class BenchmarkMarketTimingSerializer(serializers.ModelSerializer):
    """CRUD serializer for market timing benchmarks."""

    class Meta:
        model = BenchmarkMarketTiming
        fields = "__all__"
        read_only_fields = ["benchmark_timing_id", "created_at", "updated_at", "last_updated"]

    def validate_duration_months(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Duration must be zero or a positive integer.")
        return value


class BenchmarkAbsorptionVelocitySerializer(serializers.ModelSerializer):
    """CRUD serializer for absorption velocity benchmarks."""

    class Meta:
        model = BenchmarkAbsorptionVelocity
        fields = "__all__"
        read_only_fields = ["benchmark_velocity_id", "created_at", "updated_at", "last_updated"]

    def validate_units_per_month(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Units per month must be greater than zero.")
        return value

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        min_months = attrs.get("builder_inventory_target_min_months")
        max_months = attrs.get("builder_inventory_target_max_months")
        if min_months is not None and max_months is not None and min_months > max_months:
            raise serializers.ValidationError("Minimum inventory target cannot exceed maximum target.")
        return attrs


class ProjectTimingAssumptionSerializer(serializers.ModelSerializer):
    """Serializer for project timing overrides."""

    class Meta:
        model = ProjectTimingAssumption
        fields = "__all__"
        read_only_fields = [
            "project_timing_id",
            "created_at",
            "updated_at",
            "project_id",
        ]

    def validate_duration_months_override(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Override duration must be greater than zero.")
        return value


class ProjectAbsorptionAssumptionSerializer(serializers.ModelSerializer):
    """Serializer for project absorption overrides."""

    class Meta:
        model = ProjectAbsorptionAssumption
        fields = "__all__"
        read_only_fields = [
            "project_absorption_id",
            "created_at",
            "updated_at",
            "project_id",
        ]

    def validate_units_per_month_override(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Override velocity must be greater than zero.")
        return value


class ClosingEventSerializer(serializers.ModelSerializer):
    """Serializer for closing (takedown) events."""

    class Meta:
        model = ClosingEvent
        fields = "__all__"
        read_only_fields = [
            "closing_id",
            "created_at",
            "updated_at",
            "sale_event",
        ]

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        lots_closed = attrs.get("lots_closed")
        net = attrs.get("net_proceeds")
        gross = attrs.get("gross_proceeds")
        if lots_closed is not None and lots_closed <= 0:
            raise serializers.ValidationError({"lots_closed": "Lots closed must be greater than zero."})
        if gross is not None and gross <= 0:
            raise serializers.ValidationError({"gross_proceeds": "Gross proceeds must be greater than zero."})
        if net is not None and net < 0:
            raise serializers.ValidationError({"net_proceeds": "Net proceeds cannot be negative."})
        return attrs


class ParcelSaleEventSerializer(serializers.ModelSerializer):
    """Serializer for parcel sale events with nested closing summary."""

    closings = ClosingEventSerializer(many=True, read_only=True)

    class Meta:
        model = ParcelSaleEvent
        fields = "__all__"
        read_only_fields = [
            "sale_event_id",
            "created_at",
            "updated_at",
        ]

    def validate_total_lots_contracted(self, value):
        if value <= 0:
            raise serializers.ValidationError("Total lots contracted must be greater than zero.")
        return value

    def validate_base_price_per_lot(self, value):
        if value <= 0:
            raise serializers.ValidationError("Base price per lot must be greater than zero.")
        return value

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        sale_type = attrs.get("sale_type")
        if sale_type not in {"single_closing", "multi_closing", "structured_sale", "bulk_assignment"}:
            raise serializers.ValidationError({"sale_type": "Invalid sale type."})
        return attrs


class CreateParcelSaleSerializer(serializers.Serializer):
    """Serializer for creating a parcel sale event with nested closings."""

    parcel_id = serializers.IntegerField(required=True)
    sale_type = serializers.ChoiceField(
        choices=["single_closing", "multi_closing"],
        required=True
    )
    buyer_entity = serializers.CharField(max_length=200, required=False, allow_blank=True)
    contract_date = serializers.DateField(required=False, allow_null=True)

    # Custom overrides (apply to all closings)
    commission_pct = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    closing_cost_per_unit = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    onsite_cost_pct = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )
    has_custom_overrides = serializers.BooleanField(default=False, required=False)

    # Nested closings array
    closings = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        min_length=1
    )

    def validate_closings(self, closings_data):
        """Validate closings array structure."""
        for closing in closings_data:
            if "closing_number" not in closing:
                raise serializers.ValidationError("Each closing must have a closing_number")
            if "closing_date" not in closing:
                raise serializers.ValidationError("Each closing must have a closing_date")
            if "units_closing" not in closing:
                raise serializers.ValidationError("Each closing must have units_closing")

            if closing["units_closing"] <= 0:
                raise serializers.ValidationError("units_closing must be greater than zero")

        return closings_data

    def validate(self, attrs):
        """Validate the complete payload including cross-field validation."""
        closings_data = attrs.get("closings", [])

        # Validate closing dates are in chronological order
        is_valid, error_msg = validate_closing_dates(closings_data)
        if not is_valid:
            raise serializers.ValidationError({"closings": error_msg})

        return attrs


class ParcelAbsorptionProfileSerializer(serializers.ModelSerializer):
    """Serializer for parcel absorption assumptions."""

    class Meta:
        model = ParcelAbsorptionProfile
        fields = "__all__"
        read_only_fields = [
            "absorption_profile_id",
            "created_at",
            "updated_at",
            "project_id",
            "parcel_id",
        ]

    def validate_absorption_velocity_override(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Override velocity must be greater than zero.")
        return value


class InventoryGaugeRowSerializer(serializers.Serializer):
    """Lightweight serializer for rows returned by the inventory gauge view."""

    project_id = serializers.IntegerField()
    year = serializers.IntegerField()
    lots_delivered = serializers.DecimalField(max_digits=12, decimal_places=2)
    lots_absorbed = serializers.DecimalField(max_digits=12, decimal_places=2)
    year_end_inventory = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProjectPricingAssumptionSerializer(serializers.ModelSerializer):
    """Serializer for project-level land use pricing assumptions."""

    inflated_value = serializers.SerializerMethodField()

    class Meta:
        model = ProjectPricingAssumption
        fields = [
            "id",
            "project_id",
            "lu_type_code",
            "product_code",
            "price_per_unit",
            "unit_of_measure",
            "growth_rate",
            "created_at",
            "updated_at",
            "inflated_value",  # Calculated field
        ]
        read_only_fields = ["id", "created_at", "updated_at", "inflated_value"]

    def get_inflated_value(self, obj):
        """
        Return base price (inflation is applied during sale calculation based on sale_period).

        The actual inflated price is calculated using the sale_period and monthly compounding
        when calculating sale proceeds. This field is just for reference.
        """
        return float(obj.price_per_unit) if obj.price_per_unit else 0.0

    def validate_price_per_unit(self, value):
        """Ensure price is non-negative (allow zero for non-saleable uses like parks)."""
        if value is not None and value < 0:
            raise serializers.ValidationError("Price per unit cannot be negative.")
        return value

    def validate_growth_rate(self, value):
        """Ensure growth rate is between 0 and 10%."""
        if value is not None and (value < 0 or value > 0.10):
            raise serializers.ValidationError("Growth rate must be between 0 and 0.10 (10%).")
        return value
