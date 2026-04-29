from rest_framework import serializers

from .models import Artifact, ArtifactVersion


class ArtifactListSerializer(serializers.ModelSerializer):
    """Lightweight artifact rep for panel lists (Pinned / Recent sections)."""

    class Meta:
        model = Artifact
        fields = [
            'artifact_id',
            'project_id',
            'thread_id',
            'tool_name',
            'title',
            'pinned_label',
            'edit_target_json',
            'created_at',
            'last_edited_at',
            'created_by_user_id',
            'is_archived',
        ]
        read_only_fields = fields


class ArtifactDetailSerializer(serializers.ModelSerializer):
    """Full artifact rep including the block document and source pointers."""

    class Meta:
        model = Artifact
        fields = [
            'artifact_id',
            'project_id',
            'thread_id',
            'tool_name',
            'params_json',
            'current_state_json',
            'source_pointers_json',
            'edit_target_json',
            'title',
            'pinned_label',
            'created_at',
            'last_edited_at',
            'created_by_user_id',
            'is_archived',
        ]
        read_only_fields = [
            'artifact_id',
            'project_id',
            'thread_id',
            'tool_name',
            'params_json',
            'current_state_json',
            'source_pointers_json',
            'edit_target_json',
            'created_at',
            'last_edited_at',
            'created_by_user_id',
        ]


class ArtifactPatchSerializer(serializers.ModelSerializer):
    """PATCH-only fields for the panel: pin/unpin, archive."""

    pinned_label = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=False
    )
    is_archived = serializers.BooleanField(required=False)
    title = serializers.CharField(max_length=255, required=False)

    class Meta:
        model = Artifact
        fields = ['pinned_label', 'is_archived', 'title']


class ArtifactVersionSerializer(serializers.ModelSerializer):
    """Single version log entry."""

    summary = serializers.SerializerMethodField()

    class Meta:
        model = ArtifactVersion
        fields = [
            'version_id',
            'artifact_id',
            'version_seq',
            'edited_at',
            'edited_by_user_id',
            'edit_source',
            'summary',
        ]
        read_only_fields = fields

    def get_summary(self, obj):
        from .summaries import summarize_diff
        return summarize_diff(obj.edit_source, obj.state_diff_json)


class RestoreActionSerializer(serializers.Serializer):
    """Body for POST /api/artifacts/<id>/restore/."""

    target = serializers.JSONField()
