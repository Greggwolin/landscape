"""
Dynamic Columns Serializers
"""

from rest_framework import serializers
from .models import DynamicColumnDefinition, DynamicColumnValue


class DynamicColumnDefinitionSerializer(serializers.ModelSerializer):
    """Serializer for dynamic column definitions."""

    class Meta:
        model = DynamicColumnDefinition
        fields = [
            'id', 'project', 'table_name', 'column_key', 'display_label',
            'data_type', 'format_pattern', 'source', 'is_active',
            'is_proposed', 'display_order', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DynamicColumnValueSerializer(serializers.ModelSerializer):
    """Serializer for dynamic column values."""

    value = serializers.SerializerMethodField()
    column_key = serializers.CharField(source='column_definition.column_key', read_only=True)

    class Meta:
        model = DynamicColumnValue
        fields = ['id', 'column_definition', 'column_key', 'row_id', 'value', 'confidence']

    def get_value(self, obj):
        return obj.value


class DynamicColumnsWithValuesSerializer(serializers.Serializer):
    """Returns column definitions + values for a specific table/rows."""

    columns = DynamicColumnDefinitionSerializer(many=True)
    values = serializers.DictField()  # {row_id: {column_key: value}}


class BulkValueUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating dynamic column values."""

    # Expected format: {column_key: {row_id: value}}
    updates = serializers.DictField(
        child=serializers.DictField(),
        help_text="Dict of {column_key: {row_id: value}}"
    )


class AcceptColumnSerializer(serializers.Serializer):
    """Serializer for accepting a proposed column."""

    display_label = serializers.CharField(
        required=False,
        help_text="Optional new display label for the column"
    )
    data_type = serializers.ChoiceField(
        choices=DynamicColumnDefinition.DataType.choices,
        required=False,
        help_text="Optional data type override"
    )
