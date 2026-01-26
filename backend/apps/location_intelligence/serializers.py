"""Serializers for Location Intelligence API."""

from rest_framework import serializers


class CoordinatesSerializer(serializers.Serializer):
    """Serializer for lat/lon coordinates."""
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lon = serializers.FloatField(min_value=-180, max_value=180)


class RingDemographicsSerializer(serializers.Serializer):
    """Serializer for a single ring's demographics."""
    radius_miles = serializers.FloatField()
    population = serializers.IntegerField(allow_null=True)
    households = serializers.IntegerField(allow_null=True)
    median_income = serializers.IntegerField(allow_null=True)
    median_age = serializers.FloatField(allow_null=True)
    median_home_value = serializers.IntegerField(allow_null=True)
    median_gross_rent = serializers.IntegerField(allow_null=True)
    owner_occupied_pct = serializers.FloatField(allow_null=True)
    block_groups_included = serializers.IntegerField(allow_null=True)
    total_land_area_sqmi = serializers.FloatField(allow_null=True)


class DemographicsResponseSerializer(serializers.Serializer):
    """Serializer for full demographics API response."""
    center = CoordinatesSerializer()
    rings = RingDemographicsSerializer(many=True)
    source = serializers.CharField()
    calculated_at = serializers.CharField()
    cached = serializers.BooleanField(required=False, default=False)


class BlockGroupStatsSerializer(serializers.Serializer):
    """Serializer for block group statistics."""
    block_groups = serializers.DictField(child=serializers.IntegerField())
    total_block_groups = serializers.IntegerField()
    demographics_loaded = serializers.IntegerField()
    acs_vintage = serializers.CharField(allow_null=True)
