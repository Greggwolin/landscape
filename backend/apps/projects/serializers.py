"""
Serializers for Project models.

Converts Django ORM models to/from JSON for the REST API.
"""

from rest_framework import serializers
from .models import Project, AnalysisTypeConfig, ANALYSIS_TYPE_CHOICES
from .primary_measure import sync_primary_measure_on_legacy_update
from .models_user import UserPreference


# Valid analysis type codes
VALID_ANALYSIS_TYPES = [code for code, _ in ANALYSIS_TYPE_CHOICES]


class ProjectSerializer(serializers.ModelSerializer):
    """
    Main serializer for Project model.
    """

    market_velocity_annual = serializers.IntegerField(required=False, allow_null=True)
    velocity_override_reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    analysis_type = serializers.ChoiceField(
        choices=ANALYSIS_TYPE_CHOICES,
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Analysis type: VALUATION, INVESTMENT, DEVELOPMENT, or FEASIBILITY"
    )
    analysis_perspective = serializers.ChoiceField(
        choices=[('INVESTMENT', 'Investment'), ('DEVELOPMENT', 'Development')],
        required=False,
        allow_blank=True,
        allow_null=True
    )
    analysis_purpose = serializers.ChoiceField(
        choices=[('VALUATION', 'Valuation'), ('UNDERWRITING', 'Underwriting')],
        required=False,
        allow_blank=True,
        allow_null=True
    )
    value_add_enabled = serializers.BooleanField(required=False)

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = [
            'project_id',
            'created_at',
            'updated_at',
            'last_calculated_at',
            'ai_last_reviewed',
        ]

    def validate_analysis_type(self, value):
        """Validate analysis_type is one of the new codes."""
        if value and value not in VALID_ANALYSIS_TYPES:
            raise serializers.ValidationError(
                f"Invalid analysis_type '{value}'. Must be one of: {', '.join(VALID_ANALYSIS_TYPES)}"
            )
        return value

    def create(self, validated_data):
        instance = super().create(validated_data)
        for column in ('total_units', 'acres_gross'):
            if column in validated_data:
                sync_primary_measure_on_legacy_update(
                    project_id=instance.project_id,
                    table='tbl_project',
                    column=column,
                    value=validated_data.get(column)
                )
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        for column in ('total_units', 'acres_gross'):
            if column in validated_data:
                sync_primary_measure_on_legacy_update(
                    project_id=instance.project_id,
                    table='tbl_project',
                    column=column,
                    value=validated_data.get(column)
                )
        return instance


class ProjectListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing projects.

    Excludes related data for performance.
    """

    class Meta:
        model = Project
        fields = [
            'project_id',
            'project_name',
            'project_type_code',
            'project_type',
            'analysis_type',
            'analysis_perspective',
            'analysis_purpose',
            'value_add_enabled',
            'property_subtype',
            'property_class',
            'jurisdiction_city',
            'jurisdiction_county',
            'jurisdiction_state',
            'acres_gross',
            'primary_count',
            'primary_count_type',
            'primary_area',
            'primary_area_type',
            'location_lat',
            'location_lon',
            'is_active',
            'analysis_mode',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['project_id', 'created_at', 'updated_at']


class UserPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for UserPreference model.
    Handles CRUD operations for user preferences with flexible JSON storage.
    """

    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserPreference
        fields = [
            'id',
            'user_id',
            'user_email',
            'preference_key',
            'preference_value',
            'scope_type',
            'scope_id',
            'created_at',
            'updated_at',
            'last_accessed_at',
        ]
        read_only_fields = ['id', 'user_id', 'user_email', 'created_at', 'updated_at', 'last_accessed_at']

    def validate_preference_key(self, value):
        """Validate preference key format."""
        if not value or len(value) > 255:
            raise serializers.ValidationError("preference_key must be between 1 and 255 characters")
        return value

    def validate_scope_type(self, value):
        """Validate scope type is in allowed choices."""
        if value not in dict(UserPreference.SCOPE_CHOICES):
            raise serializers.ValidationError(f"Invalid scope_type: {value}")
        return value

    def validate(self, data):
        """Cross-field validation."""
        scope_type = data.get('scope_type', UserPreference.SCOPE_GLOBAL)
        scope_id = data.get('scope_id')

        # If scope is not global, scope_id must be provided
        if scope_type != UserPreference.SCOPE_GLOBAL and not scope_id:
            raise serializers.ValidationError({
                'scope_id': f'scope_id is required when scope_type is {scope_type}'
            })

        return data


class UserPreferenceListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing user preferences.
    """

    class Meta:
        model = UserPreference
        fields = [
            'id',
            'preference_key',
            'preference_value',
            'scope_type',
            'scope_id',
            'updated_at',
        ]


class UserPreferenceBulkSerializer(serializers.Serializer):
    """
    Serializer for bulk preference operations.
    Allows setting multiple preferences at once.
    """

    preferences = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        help_text="List of preference objects to set"
    )

    def validate_preferences(self, value):
        """Validate each preference in the list."""
        required_keys = {'preference_key', 'preference_value'}
        optional_keys = {'scope_type', 'scope_id'}

        for pref in value:
            pref_keys = set(pref.keys())

            # Check required keys
            if not required_keys.issubset(pref_keys):
                missing = required_keys - pref_keys
                raise serializers.ValidationError(f"Missing required keys: {missing}")

            # Check for extra keys
            allowed_keys = required_keys | optional_keys
            extra = pref_keys - allowed_keys
            if extra:
                raise serializers.ValidationError(f"Unexpected keys: {extra}")

        return value


# ========================================================================
# Analysis Type Config Serializers
# ========================================================================

class AnalysisTypeConfigSerializer(serializers.ModelSerializer):
    """
    Full serializer for AnalysisTypeConfig.
    Used for detail views and configuration management.
    """
    tiles = serializers.SerializerMethodField()

    class Meta:
        model = AnalysisTypeConfig
        fields = [
            'config_id',
            'analysis_type',
            'analysis_perspective',
            'analysis_purpose',
            'tile_valuation',
            'tile_capitalization',
            'tile_returns',
            'tile_development_budget',
            'requires_capital_stack',
            'requires_comparable_sales',
            'requires_income_approach',
            'requires_cost_approach',
            'available_reports',
            'landscaper_context',
            'tiles',  # Computed field
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['config_id', 'created_at', 'updated_at', 'tiles']

    def get_tiles(self, obj):
        """Return list of visible tiles for this analysis type."""
        return obj.get_visible_tiles()


class AnalysisTypeConfigListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing analysis type configs.
    """
    tiles = serializers.SerializerMethodField()

    class Meta:
        model = AnalysisTypeConfig
        fields = [
            'analysis_type',
            'analysis_perspective',
            'analysis_purpose',
            'tile_valuation',
            'tile_capitalization',
            'tile_returns',
            'tile_development_budget',
            'tiles',
        ]

    def get_tiles(self, obj):
        """Return list of visible tiles for this analysis type."""
        return obj.get_visible_tiles()


class AnalysisTypeTilesSerializer(serializers.Serializer):
    """
    Response serializer for the tiles endpoint.
    """
    analysis_type = serializers.CharField()
    tiles = serializers.ListField(child=serializers.CharField())


class AnalysisTypeLandscaperContextSerializer(serializers.Serializer):
    """
    Response serializer for Landscaper context endpoint.
    """
    analysis_type = serializers.CharField()
    context = serializers.CharField(allow_null=True)
    required_inputs = serializers.DictField()
