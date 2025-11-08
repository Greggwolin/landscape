"""Serializers for absorption velocity benchmarks."""

from rest_framework import serializers
from .models_absorption import BmkAbsorptionVelocity, LandscaperAbsorptionDetail


class AbsorptionVelocitySerializer(serializers.ModelSerializer):
    """CRUD serializer for absorption velocity benchmarks."""

    class Meta:
        model = BmkAbsorptionVelocity
        fields = '__all__'


class LandscaperAbsorptionDetailSerializer(serializers.ModelSerializer):
    """Expose Landscaper intelligence detail records."""

    class Meta:
        model = LandscaperAbsorptionDetail
        fields = '__all__'


class AbsorptionVelocitySummarySerializer(serializers.Serializer):
    """Lightweight projection for tile listing."""

    absorption_velocity_id = serializers.IntegerField()
    velocity_annual = serializers.IntegerField()
    market_geography = serializers.CharField(allow_null=True, required=False)
    project_scale = serializers.CharField(allow_null=True, required=False)
    detail_count = serializers.IntegerField()
    data_sources = serializers.ListField(child=serializers.CharField())
    last_updated = serializers.DateTimeField()

