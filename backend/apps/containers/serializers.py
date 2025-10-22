"""
Serializers for Container models.

Provides recursive serialization for hierarchical container trees.
"""

from rest_framework import serializers
from .models import Container, ContainerType


class RecursiveField(serializers.Serializer):
    """
    Custom field for recursive serialization.
    Used to serialize container children recursively.
    """

    def to_representation(self, value):
        serializer = self.parent.parent.__class__(value, context=self.context)
        return serializer.data


class ContainerSerializer(serializers.ModelSerializer):
    """
    Serializer for Container model with recursive children.

    Matches Next.js API response format:
    {
        container_id: int,
        project_id: int,
        parent_container_id: int | null,
        container_level: int,
        container_code: str,
        display_name: str,
        sort_order: int | null,
        attributes: dict,
        is_active: bool,
        created_at: str,
        updated_at: str,
        children: ContainerSerializer[]
    }
    """

    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    parent_container_id = serializers.IntegerField(
        source='parent_container.container_id',
        allow_null=True,
        read_only=True
    )
    children = RecursiveField(many=True, read_only=True)

    class Meta:
        model = Container
        fields = [
            'container_id',
            'project_id',
            'parent_container_id',
            'container_level',
            'container_code',
            'display_name',
            'sort_order',
            'attributes',
            'is_active',
            'created_at',
            'updated_at',
            'children',
        ]
        read_only_fields = ['container_id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """
        Add aggregated data from inventory items and children.

        Matches Next.js behavior where attributes contain:
        - Direct inventory data (units_total, acres_gross)
        - Aggregated child data
        - Family and type names from inventory
        """
        data = super().to_representation(instance)

        # If attributes exist, ensure they're properly formatted
        if data['attributes'] is None:
            data['attributes'] = {}

        # Convert datetime fields to ISO strings
        if data['created_at']:
            data['created_at'] = instance.created_at.isoformat()
        if data['updated_at']:
            data['updated_at'] = instance.updated_at.isoformat()

        return data


class ContainerCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new containers.

    Validates:
    - Level 1 must not have parent
    - Level 2/3 must have parent
    - Parent must be exactly 1 level above
    - Container code is unique within project
    """

    project_id = serializers.IntegerField(write_only=True)
    parent_container_id = serializers.IntegerField(
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Container
        fields = [
            'project_id',
            'parent_container_id',
            'container_level',
            'container_code',
            'display_name',
            'sort_order',
            'attributes',
        ]

    def validate_display_name(self, value):
        """Ensure display_name is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("display_name is required")
        return value

    def validate_container_level(self, value):
        """Ensure container_level is 1, 2, or 3."""
        if value not in [1, 2, 3]:
            raise serializers.ValidationError("container_level must be 1, 2, or 3")
        return value

    def validate(self, data):
        """
        Validate parent-child relationships.

        Rules:
        - Level 1: no parent allowed
        - Level 2/3: parent required
        - Parent must be exactly 1 level above
        - Parent must belong to same project
        """
        container_level = data.get('container_level')
        parent_id = data.get('parent_container_id')
        project_id = data.get('project_id')

        # Level 1 cannot have parent
        if container_level == 1 and parent_id is not None:
            raise serializers.ValidationError({
                'parent_container_id': 'Level 1 containers cannot have a parent'
            })

        # Level 2/3 must have parent
        if container_level in [2, 3] and parent_id is None:
            raise serializers.ValidationError({
                'parent_container_id': f'Level {container_level} containers must have a parent'
            })

        # Validate parent exists and is correct level
        if parent_id is not None:
            try:
                parent = Container.objects.get(container_id=parent_id)
            except Container.DoesNotExist:
                raise serializers.ValidationError({
                    'parent_container_id': 'Parent container does not exist'
                })

            # Parent must belong to same project
            if parent.project_id != project_id:
                raise serializers.ValidationError({
                    'parent_container_id': 'Parent container belongs to different project'
                })

            # Parent must be exactly 1 level above
            if parent.container_level != container_level - 1:
                raise serializers.ValidationError({
                    'parent_container_id': f'Parent must be level {container_level - 1}, got {parent.container_level}'
                })

        # Check for duplicate container_code within project
        container_code = data.get('container_code')
        if container_code:
            exists = Container.objects.filter(
                project_id=project_id,
                container_code=container_code
            ).exists()
            if exists:
                raise serializers.ValidationError({
                    'container_code': 'Container code already exists in project'
                })

        return data

    def create(self, validated_data):
        """Create container with proper foreign key references."""
        from apps.projects.models import Project

        project_id = validated_data.pop('project_id')
        parent_id = validated_data.pop('parent_container_id', None)

        project = Project.objects.get(project_id=project_id)
        parent = Container.objects.get(container_id=parent_id) if parent_id else None

        container = Container.objects.create(
            project=project,
            parent_container=parent,
            **validated_data
        )

        return container


class ContainerTypeSerializer(serializers.ModelSerializer):
    """Serializer for ContainerType lookup table."""

    class Meta:
        model = ContainerType
        fields = [
            'container_type_id',
            'type_code',
            'type_name',
            'description',
            'is_active',
        ]
