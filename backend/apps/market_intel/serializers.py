"""Serializers for Market Intelligence application."""

from rest_framework import serializers
from .models import AIIngestionHistory, RentComparable, MarketRateAnalysis, MarketCompetitiveProject, MarketMacroData


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
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['comparable_id', 'created_at', 'updated_at']

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
