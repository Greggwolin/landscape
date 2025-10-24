"""
Scenario Management Serializers
Feature: SCENARIO-001
Created: 2025-10-24

Serializers for scenario models.
"""

from rest_framework import serializers
from django.utils import timezone
from .models_scenario import Scenario, ScenarioComparison


class ScenarioSerializer(serializers.ModelSerializer):
    """Serializer for Scenario model"""

    color_class = serializers.SerializerMethodField()
    clone_count = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Scenario
        fields = [
            'scenario_id', 'project', 'scenario_name', 'scenario_type',
            'scenario_code', 'is_active', 'is_locked', 'display_order',
            'description', 'color_hex', 'color_class',
            'variance_method', 'revenue_variance_pct', 'cost_variance_pct',
            'absorption_variance_pct', 'start_date_offset_months',
            'created_by', 'created_at', 'updated_at',
            'cloned_from', 'clone_count', 'can_delete'
        ]
        read_only_fields = ['scenario_id', 'created_at', 'updated_at', 'scenario_code']

    def get_color_class(self, obj):
        return obj.get_color_class()

    def get_clone_count(self, obj):
        return obj.clones.count()

    def get_can_delete(self, obj):
        """Base scenario and locked scenarios cannot be deleted"""
        return not obj.is_locked and obj.scenario_type != 'base'

    def create(self, validated_data):
        """Auto-generate scenario_code on creation"""
        project_id = validated_data['project'].project_id
        name_prefix = validated_data['scenario_name'][:10].upper().replace(' ', '-')
        timestamp = int(timezone.now().timestamp())

        validated_data['scenario_code'] = f"PROJ{project_id}-{name_prefix}-{timestamp}"

        return super().create(validated_data)


class ScenarioComparisonSerializer(serializers.ModelSerializer):
    """Serializer for ScenarioComparison model"""

    scenarios = serializers.SerializerMethodField()

    class Meta:
        model = ScenarioComparison
        fields = [
            'comparison_id', 'project', 'comparison_name',
            'scenario_ids', 'scenarios', 'comparison_type',
            'scenario_probabilities', 'comparison_results',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['comparison_id', 'created_at', 'updated_at']

    def get_scenarios(self, obj):
        """Include full scenario details for each ID"""
        scenarios = Scenario.objects.filter(
            scenario_id__in=obj.scenario_ids
        ).order_by('display_order')
        return ScenarioSerializer(scenarios, many=True).data

    def validate_scenario_probabilities(self, value):
        """Ensure probabilities sum to 100 if provided"""
        if value and sum(value) != 100:
            raise serializers.ValidationError(
                "Scenario probabilities must sum to 100.00"
            )
        return value
