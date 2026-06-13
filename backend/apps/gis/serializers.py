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


class ProjectOverlaySerializer(serializers.Serializer):
    """Input validation for site-plan image overlays (Phase 1: snap + pin).

    Backs landscape.tbl_project_overlay. ``corners`` is the four-corner quad
    MapLibre pins the image to: exactly 4 [lng, lat] pairs in TL, TR, BR, BL
    order. Used for both create (full) and PATCH (partial=True) — on partial
    updates DRF skips defaults, so only supplied fields are written.
    """

    title = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=255
    )
    source_uri = serializers.CharField(max_length=2048)
    corners = serializers.JSONField()
    opacity = serializers.FloatField(required=False, min_value=0.0, max_value=1.0)
    rotation_deg = serializers.FloatField(required=False, min_value=-360.0, max_value=360.0)

    def validate_corners(self, value):
        if not isinstance(value, list) or len(value) != 4:
            raise serializers.ValidationError(
                "corners must be an array of exactly 4 [lng, lat] pairs (TL, TR, BR, BL)"
            )
        for point in value:
            if not isinstance(point, (list, tuple)) or len(point) != 2:
                raise serializers.ValidationError("each corner must be a [lng, lat] pair")
            try:
                float(point[0])
                float(point[1])
            except (TypeError, ValueError):
                raise serializers.ValidationError("corner coordinates must be numeric")
        return value
