"""Serializers for Market Intelligence application."""

from rest_framework import serializers
from .models import AIIngestionHistory, RentComparable, MarketRateAnalysis, MarketCompetitiveProject, MarketMacroData, ExpenseComparable


class AIIngestionHistorySerializer(serializers.ModelSerializer):
    """Serializer for AIIngestionHistory model."""

    class Meta:
        model = AIIngestionHistory
        fields = [
            'ingestion_id',
            'doc_id',
            'ingestion_date',
            'model_used',
            'confidence_score',
            'extracted_data',
            'validation_status',
            'created_at',
        ]
        read_only_fields = ['ingestion_id', 'ingestion_date', 'created_at']


class RentComparableSerializer(serializers.ModelSerializer):
    """Serializer for Rent Comparable model."""

    rent_per_sf = serializers.SerializerMethodField()

    class Meta:
        model = RentComparable
        fields = [
            'comparable_id',
            'project',
            'property_name',
            'address',
            'distance_miles',
            'year_built',
            'total_units',
            'unit_type',
            'bedrooms',
            'bathrooms',
            'avg_sqft',
            'asking_rent',
            'effective_rent',
            'rent_per_sf',
            'concessions',
            'amenities',
            'notes',
            'data_source',
            'as_of_date',
            'is_active',
            'latitude',
            'longitude',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['comparable_id', 'project', 'rent_per_sf', 'created_at', 'updated_at']

    def get_rent_per_sf(self, obj):
        """Calculate rent per square foot."""
        if obj.asking_rent and obj.avg_sqft and obj.avg_sqft > 0:
            return round(float(obj.asking_rent) / obj.avg_sqft, 2)
        return None


class MarketRateAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for Market Rate Analysis model."""

    total_adjustment_pct = serializers.SerializerMethodField()

    class Meta:
        model = MarketRateAnalysis
        fields = [
            'analysis_id',
            'project',
            'unit_type',
            'bedrooms',
            'bathrooms',
            'subject_sqft',
            'comp_count',
            'min_rent',
            'max_rent',
            'avg_rent',
            'median_rent',
            'avg_rent_per_sf',
            'location_adjustment',
            'condition_adjustment',
            'amenity_adjustment',
            'size_adjustment_per_sf',
            'total_adjustment_pct',
            'recommended_market_rent',
            'recommended_rent_per_sf',
            'confidence_level',
            'analysis_notes',
            'analyzed_by',
            'analysis_date',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['analysis_id', 'analysis_date', 'created_at', 'updated_at']

    def get_total_adjustment_pct(self, obj):
        """Calculate total percentage adjustment."""
        total = (
            float(obj.location_adjustment or 0) +
            float(obj.condition_adjustment or 0) +
            float(obj.amenity_adjustment or 0)
        )
        return round(total, 3)


class MarketReportSerializer(serializers.Serializer):
    """Serializer for market reports."""

    location = serializers.CharField()
    data_type = serializers.CharField()
    metrics = serializers.JSONField()
    date_range = serializers.DictField(required=False)


class MarketCompetitiveProjectSerializer(serializers.ModelSerializer):
    """Serializer for Competitive Land Development Projects."""

    class Meta:
        model = MarketCompetitiveProject
        fields = [
            'id',
            'project',
            'comp_name',
            'comp_address',
            'latitude',
            'longitude',
            'total_units',
            'price_min',
            'price_max',
            'absorption_rate_monthly',
            'status',
            'data_source',
            'source_url',
            'notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MarketMacroDataSerializer(serializers.ModelSerializer):
    """Serializer for Market Macro-Economic Data."""

    class Meta:
        model = MarketMacroData
        fields = [
            'id',
            'project',
            'population_growth_rate',
            'employment_trend',
            'household_formation_rate',
            'building_permits_annual',
            'median_income',
            'data_year',
            'data_source',
            'source_url',
            'notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExpenseComparableSerializer(serializers.ModelSerializer):
    """Serializer for Expense Comparable model."""

    opex_per_unit = serializers.SerializerMethodField()
    opex_per_sf = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseComparable
        fields = [
            'comparable_id', 'project',
            'property_name', 'address', 'distance_miles',
            'year_built', 'total_units', 'total_sqft',
            'expenses', 'total_opex', 'opex_per_unit', 'opex_per_sf',
            'data_source', 'as_of_date', 'notes', 'is_active',
            'latitude', 'longitude',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['comparable_id', 'project', 'opex_per_unit', 'opex_per_sf', 'created_at', 'updated_at']

    def get_opex_per_unit(self, obj):
        if obj.total_opex and obj.total_units and obj.total_units > 0:
            return round(float(obj.total_opex) / obj.total_units, 2)
        return None

    def get_opex_per_sf(self, obj):
        if obj.total_opex and obj.total_sqft and obj.total_sqft > 0:
            return round(float(obj.total_opex) / obj.total_sqft, 2)
        return None

    def validate_expenses(self, value):
        """Ensure expenses is a dict of string keys to numeric values."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("expenses must be a JSON object")
        for k, v in value.items():
            if not isinstance(k, str):
                raise serializers.ValidationError(f"Expense key must be a string, got {type(k)}")
            if v is not None and not isinstance(v, (int, float)):
                raise serializers.ValidationError(f"Expense value for '{k}' must be numeric or null")
        return value

    def create(self, validated_data):
        """Auto-calculate total_opex from expenses on create."""
        expenses = validated_data.get('expenses', {})
        validated_data['total_opex'] = sum(v for v in expenses.values() if isinstance(v, (int, float)))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Auto-calculate total_opex from expenses on update."""
        expenses = validated_data.get('expenses', instance.expenses)
        if expenses:
            validated_data['total_opex'] = sum(v for v in expenses.values() if isinstance(v, (int, float)))
        return super().update(instance, validated_data)
