"""Serializers for Land Use application."""

from rest_framework import serializers
from .models import InventoryItem, Family, Type


class FamilySerializer(serializers.ModelSerializer):
    """Serializer for Family lookup model."""

    class Meta:
        model = Family
        fields = ['family_id', 'name', 'description', 'is_active']
        read_only_fields = ['family_id']


class TypeSerializer(serializers.ModelSerializer):
    """Serializer for Type lookup model."""

    class Meta:
        model = Type
        fields = ['type_id', 'name', 'description', 'is_active']
        read_only_fields = ['type_id']


class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for InventoryItem model."""

    container_code = serializers.CharField(source='container.container_code', read_only=True)
    family_name = serializers.CharField(source='family.name', read_only=True)
    type_name = serializers.CharField(source='type.name', read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            'item_id',
            'container_id',
            'container_code',
            'family_id',
            'family_name',
            'type_id',
            'type_name',
            'data_values',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['item_id', 'created_at', 'updated_at']
