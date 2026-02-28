"""
Serializers for user-facing Landscaper onboarding data.
"""

from rest_framework import serializers
from django.core.validators import MaxLengthValidator

from .models import UserLandscaperProfile


ROLE_OPTIONS = {
    'appraiser': 'Appraiser',
    'land_developer': 'Land Developer',
    'cre_investor_multifamily': 'CRE Investor (Multifamily)',
}

AI_PROFICIENCY_OPTIONS = ['expert', 'comfortable', 'novice', 'new']
COMMUNICATION_TONE_OPTIONS = ['casual', 'formal']
PRIMARY_TOOL_OPTIONS = ['argus', 'excel', 'both', 'other', 'none']


class UserLandscaperProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    custom_instructions = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        validators=[MaxLengthValidator(4000)],
    )

    class Meta:
        model = UserLandscaperProfile
        fields = [
            'profile_id',
            'user_id',
            'survey_completed_at',
            'role_primary',
            'role_property_type',
            'ai_proficiency',
            'communication_tone',
            'primary_tool',
            'markets_text',
            'compiled_instructions',
            'custom_instructions',
            'onboarding_chat_history',
            'interaction_insights',
            'document_insights',
            'tos_accepted_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'profile_id',
            'user_id',
            'compiled_instructions',
            'interaction_insights',
            'document_insights',
            'created_at',
            'updated_at',
        ]

    def validate_role_primary(self, value):
        if value and value not in ROLE_OPTIONS:
            raise serializers.ValidationError(f"Invalid role_primary '{value}'")
        return value

    def validate_ai_proficiency(self, value):
        if value and value not in AI_PROFICIENCY_OPTIONS:
            raise serializers.ValidationError(
                f"Invalid ai_proficiency '{value}'. Must be one of {AI_PROFICIENCY_OPTIONS}"
            )
        return value

    def validate_communication_tone(self, value):
        if value and value not in COMMUNICATION_TONE_OPTIONS:
            raise serializers.ValidationError(
                f"Invalid communication_tone '{value}'. Must be one of {COMMUNICATION_TONE_OPTIONS}"
            )
        return value

    def validate_primary_tool(self, value):
        if value and value not in PRIMARY_TOOL_OPTIONS:
            raise serializers.ValidationError(
                f"Invalid primary_tool '{value}'. Must be one of {PRIMARY_TOOL_OPTIONS}"
            )
        return value

    def validate_markets_text(self, value):
        if value and len(value.strip()) == 0:
            raise serializers.ValidationError("markets_text cannot be empty if provided")
        return value
