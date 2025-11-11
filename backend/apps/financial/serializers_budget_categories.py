"""
Budget Category Serializers

Serializers for budget category hierarchy and completion tracking.
"""

from rest_framework import serializers
from .models_budget_categories import BudgetCategory, CategoryCompletionStatus


class CategoryCompletionStatusSerializer(serializers.ModelSerializer):
    """Serializer for completion status records"""

    class Meta:
        model = CategoryCompletionStatus
        fields = ['missing_field', 'created_at']


class BudgetCategorySerializer(serializers.ModelSerializer):
    """
    Full budget category serializer with all fields.

    Includes completion tracking for quick-add workflow.
    """

    parent_id = serializers.IntegerField(
        source='parent.category_id',
        read_only=True,
        allow_null=True
    )
    parent_name = serializers.CharField(
        source='parent.name',
        read_only=True,
        allow_null=True
    )
    project_id = serializers.IntegerField(
        source='project.project_id',
        read_only=True,
        allow_null=True
    )

    # Computed fields
    path = serializers.SerializerMethodField()
    code_path = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()
    is_complete_computed = serializers.SerializerMethodField()
    should_remind = serializers.SerializerMethodField()
    has_children = serializers.SerializerMethodField()
    usage_count = serializers.SerializerMethodField()

    class Meta:
        model = BudgetCategory
        fields = [
            'category_id',
            'parent_id',
            'parent_name',
            'level',
            'code',
            'name',
            'description',
            'project_id',
            'is_template',
            'template_name',
            'project_type_code',
            'sort_order',
            'icon',
            'color',
            # Completion tracking
            'is_incomplete',
            'created_from',
            'reminder_dismissed_at',
            'last_reminded_at',
            # Metadata
            'is_active',
            'created_at',
            'updated_at',
            'created_by',
            # Computed
            'path',
            'code_path',
            'missing_fields',
            'is_complete_computed',
            'should_remind',
            'has_children',
            'usage_count',
        ]
        read_only_fields = [
            'category_id',
            'created_at',
            'updated_at',
        ]

    def get_path(self, obj):
        """Get full category path (breadcrumb)"""
        return obj.get_path()

    def get_code_path(self, obj):
        """Get full code path"""
        return obj.get_code_path()

    def get_missing_fields(self, obj):
        """Get list of missing fields"""
        return obj.get_missing_fields()

    def get_is_complete_computed(self, obj):
        """Check if category is complete"""
        return obj.is_complete()

    def get_should_remind(self, obj):
        """Check if category should show reminders"""
        return obj.should_remind()

    def get_has_children(self, obj):
        """Check if category has children"""
        return obj.children.filter(is_active=True).exists()

    def get_usage_count(self, obj):
        """
        Get usage count in budget items.
        Expensive query - only include when needed.
        """
        # Only compute if requested in context
        if not self.context.get('include_usage_count', False):
            return None

        from .models import BudgetItem
        from django.db.models import Q

        return BudgetItem.objects.filter(
            Q(category_l1_id=obj.pk) |
            Q(category_l2_id=obj.pk) |
            Q(category_l3_id=obj.pk) |
            Q(category_l4_id=obj.pk),
            is_active=True
        ).count()


class QuickAddCategorySerializer(serializers.ModelSerializer):
    """
    Minimal serializer for quick-add category creation.

    Only requires: name, level
    Optional: parent_id

    Auto-sets:
    - is_incomplete = True
    - created_from = 'budget_quick_add'
    - code (auto-generated from name)
    """

    parent_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='Parent category ID (required for L2-4)'
    )

    class Meta:
        model = BudgetCategory
        fields = [
            'name',
            'level',
            'parent_id',
            'project_id',
            # Read-only outputs
            'category_id',
            'code',
            'is_incomplete',
            'created_from',
        ]
        read_only_fields = [
            'category_id',
            'code',
            'is_incomplete',
            'created_from',
        ]

    def validate(self, data):
        """Validate quick-add data"""
        level = data.get('level')
        parent_id = data.get('parent_id')

        # Level validation
        if level not in [1, 2, 3, 4]:
            raise serializers.ValidationError({
                'level': 'Level must be between 1 and 4'
            })

        # Parent validation for L2-4 (optional in quick-add, but recommended)
        if level > 1 and not parent_id:
            # Allow this in quick-add, but will be flagged as incomplete
            pass

        # If parent provided, validate it
        if parent_id:
            try:
                parent = BudgetCategory.objects.get(category_id=parent_id)
                if parent.level != level - 1:
                    raise serializers.ValidationError({
                        'parent_id': f'Parent level ({parent.level}) must be {level - 1} for level {level} category'
                    })
                if not parent.is_active:
                    raise serializers.ValidationError({
                        'parent_id': 'Parent category is not active'
                    })
            except BudgetCategory.DoesNotExist:
                raise serializers.ValidationError({
                    'parent_id': f'Parent category {parent_id} does not exist'
                })

        return data

    def create(self, validated_data):
        """Create category with quick-add defaults"""
        import re

        # Extract parent_id from validated data
        parent_id = validated_data.pop('parent_id', None)
        if parent_id:
            validated_data['parent_id'] = parent_id

        # Auto-generate code from name
        name = validated_data['name']
        base_code = re.sub(r'[^a-zA-Z0-9]+', '_', name.upper()).strip('_')

        # Add parent prefix if exists
        if parent_id:
            parent = BudgetCategory.objects.get(category_id=parent_id)
            code = f"{parent.code}_{base_code}"
        else:
            code = base_code

        # Ensure unique code
        original_code = code
        counter = 1
        while BudgetCategory.objects.filter(
            code=code,
            project_id=validated_data.get('project_id'),
            level=validated_data['level']
        ).exists():
            code = f"{original_code}_{counter}"
            counter += 1

        validated_data['code'] = code

        # Set quick-add defaults
        validated_data['is_incomplete'] = True
        validated_data['created_from'] = 'budget_quick_add'
        validated_data['is_template'] = False
        validated_data['is_active'] = True

        # Create category
        category = BudgetCategory.objects.create(**validated_data)

        # Create completion status records
        category.update_completion_status()

        return category


class IncompleteCategorySerializer(serializers.Serializer):
    """
    Serializer for incomplete category reminders.

    Used by get_incomplete_categories_for_project() function.
    """

    category_id = serializers.IntegerField()
    category_name = serializers.CharField()
    category_code = serializers.CharField()
    category_level = serializers.IntegerField()
    parent_name = serializers.CharField()
    usage_count = serializers.IntegerField()
    missing_fields = serializers.ListField(child=serializers.CharField())
    created_at = serializers.DateTimeField()
    last_reminded_at = serializers.DateTimeField(allow_null=True)
    days_since_created = serializers.IntegerField()

    # Add edit URL for convenience
    admin_url = serializers.SerializerMethodField()

    def get_admin_url(self, obj):
        """Generate admin panel URL for this category"""
        category_id = obj.get('category_id') if isinstance(obj, dict) else obj.category_id
        return f"/admin/preferences?category_id={category_id}"


class CategoryDismissReminderSerializer(serializers.Serializer):
    """Serializer for dismissing reminders"""

    days = serializers.IntegerField(
        default=7,
        min_value=1,
        max_value=30,
        help_text='Number of days to dismiss reminders (1-30)'
    )


class CategoryMarkCompleteSerializer(serializers.Serializer):
    """Serializer for manually marking category complete"""

    force = serializers.BooleanField(
        default=False,
        help_text='Force mark complete even if fields still missing'
    )

    def validate(self, data):
        """Validate that category can be marked complete"""
        category = self.context.get('category')

        if not data.get('force', False):
            missing_fields = category.get_missing_fields()
            if missing_fields:
                raise serializers.ValidationError({
                    'missing_fields': f'Cannot mark complete. Still missing: {", ".join(missing_fields)}'
                })

        return data


__all__ = [
    'BudgetCategorySerializer',
    'QuickAddCategorySerializer',
    'IncompleteCategorySerializer',
    'CategoryCompletionStatusSerializer',
    'CategoryDismissReminderSerializer',
    'CategoryMarkCompleteSerializer',
]
