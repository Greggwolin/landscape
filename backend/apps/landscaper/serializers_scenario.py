"""
Serializers for Scenario Log and Assumption Snapshot.

These are plain Serializers (not ModelSerializer) since the underlying
tables use raw SQL, not Django ORM models.
"""
from rest_framework import serializers


class AssumptionSnapshotSerializer(serializers.Serializer):
    """Normalized override row from tbl_assumption_snapshot."""
    snapshotId = serializers.IntegerField(source='snapshot_id', read_only=True)
    scenarioLogId = serializers.IntegerField(source='scenario_log_id', read_only=True)
    field = serializers.CharField()
    tableName = serializers.CharField(source='table_name')
    recordId = serializers.CharField(source='record_id', allow_null=True)
    originalValue = serializers.JSONField(source='original_value', allow_null=True)
    overrideValue = serializers.JSONField(source='override_value', allow_null=True)
    label = serializers.CharField(allow_null=True, allow_blank=True)
    unit = serializers.CharField(allow_null=True, allow_blank=True)
    appliedAt = serializers.DateTimeField(source='applied_at', read_only=True)


class ScenarioLogSerializer(serializers.Serializer):
    """Read serializer for tbl_scenario_log rows."""
    scenarioLogId = serializers.IntegerField(source='scenario_log_id', read_only=True)
    projectId = serializers.IntegerField(source='project_id', read_only=True)
    threadId = serializers.UUIDField(source='thread_id', allow_null=True, read_only=True)
    scenarioName = serializers.CharField(source='scenario_name', allow_null=True)
    description = serializers.CharField(allow_null=True, allow_blank=True)
    status = serializers.CharField(read_only=True)
    source = serializers.CharField(read_only=True)
    tags = serializers.ListField(child=serializers.CharField(), allow_null=True)
    overridesCount = serializers.IntegerField(source='overrides_count', read_only=True)
    overridesSummary = serializers.ListField(source='overrides_summary', read_only=True)
    metrics = serializers.JSONField(read_only=True, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    committedAt = serializers.DateTimeField(source='committed_at', read_only=True, allow_null=True)


class ScenarioLogCreateSerializer(serializers.Serializer):
    """Write serializer for creating a scenario (user-triggered snapshot)."""
    scenario_name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list,
    )
    source = serializers.ChoiceField(
        choices=['landscaper_chat', 'user_manual'],
        default='user_manual',
    )
