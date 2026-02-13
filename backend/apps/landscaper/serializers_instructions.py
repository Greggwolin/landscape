"""
Serializers for Landscaper Custom Instructions and KPI Definitions.

Phase 6 of What-If Engine: Custom Instructions + KPI Definitions.

Tables use raw SQL, so these are plain Serializers (not ModelSerializer).
"""

from rest_framework import serializers


# =============================================================================
# INSTRUCTION SERIALIZERS
# =============================================================================

class InstructionSerializer(serializers.Serializer):
    """Read serializer for tbl_landscaper_instructions."""
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    project_id = serializers.IntegerField(allow_null=True, read_only=True)
    instruction_type = serializers.CharField(read_only=True)
    instruction_text = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class InstructionCreateSerializer(serializers.Serializer):
    """Write serializer for creating/updating instructions."""
    instruction_type = serializers.ChoiceField(
        choices=['communication', 'kpi_definition', 'summary_preference', 'units', 'custom'],
        default='custom',
    )
    instruction_text = serializers.CharField(min_length=1, max_length=5000)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)


# =============================================================================
# KPI DEFINITION SERIALIZERS
# =============================================================================

class KpiDefinitionSerializer(serializers.Serializer):
    """Read serializer for tbl_landscaper_kpi_definition."""
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    project_type_code = serializers.CharField(read_only=True)
    kpi_key = serializers.CharField(read_only=True)
    display_label = serializers.CharField(read_only=True)
    display_order = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class KpiDefinitionCreateSerializer(serializers.Serializer):
    """Write serializer for adding/updating KPI definitions."""
    project_type_code = serializers.ChoiceField(
        choices=['LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'],
    )
    kpi_key = serializers.CharField(min_length=1, max_length=100)
    display_label = serializers.CharField(min_length=1, max_length=200)
    display_order = serializers.IntegerField(default=0)
    is_active = serializers.BooleanField(default=True)


class KpiDefinitionUpdateSerializer(serializers.Serializer):
    """Partial-update serializer for KPI definitions."""
    display_label = serializers.CharField(required=False, max_length=200)
    display_order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)
