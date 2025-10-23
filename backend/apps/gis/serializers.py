"""Serializers for GIS application."""

from rest_framework import serializers


class GeoJSONSerializer(serializers.Serializer):
    """Serializer for GeoJSON data."""
    
    type = serializers.CharField()
    features = serializers.ListField()
    
    
class BoundarySerializer(serializers.Serializer):
    """Serializer for project boundaries."""
    
    boundary_type = serializers.CharField()
    geojson = serializers.JSONField()
    metadata = serializers.JSONField(required=False)
