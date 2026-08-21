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

    superseded_by_artifact_id = serializers.SerializerMethodField()

    def get_superseded_by_artifact_id(self, obj):
        """The live artifact that replaced this one, when this one is archived.

        Dedup keeps ONE canonical artifact per (project, dedup_key): re-running
        a tool archives the previous one and writes a new one. Nothing stops the
        archived copy being opened again afterwards — a chat thread still points
        at the artifact IT created, so following that thread renders a snapshot
        that may be several builder versions behind.

        That is not cosmetic. An archived budget artifact carries the refs it had
        when it was written, so the all-or-nothing editability rule correctly
        makes the whole table read-only, and a read-only table has no dropdowns
        to open. The symptom reads as "the picklists don't populate".

        Returning the successor lets the client follow it instead of rendering a
        superseded snapshot as though it were current.
        """
        if not obj.is_archived or not obj.dedup_key:
            return None
        live = (Artifact.objects
                .filter(project_id=obj.project_id, dedup_key=obj.dedup_key,
                        is_archived=False)
                .order_by('-artifact_id')
                .values_list('artifact_id', flat=True)
                .first())
        return live

    class Meta:
        model = Artifact
        fields = [
            'superseded_by_artifact_id',
            'is_archived',
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
    """PATCH-only fields for the panel: pin/unpin, archive, view state.

    ``params_json`` is intentionally PATCH-allowed so the pin path can
    snapshot the user's current view state (visible columns, sort, etc.)
    alongside the pinned_label write — the next open then restores the
    same view. (LSCMD-PIN-SAVES-VIEW-0519)
    """

    pinned_label = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=False
    )
    is_archived = serializers.BooleanField(required=False)
    title = serializers.CharField(max_length=255, required=False)
    params_json = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = Artifact
        fields = ['pinned_label', 'is_archived', 'title', 'params_json']


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
