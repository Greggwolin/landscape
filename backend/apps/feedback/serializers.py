"""
Serializers for the changelog API.

The tester_feedback serializers were retired in LSCMD-FBUNIFY-0613-qz; the
canonical feedback endpoint (apps.feedback.views_canonical) serializes
landscape.tbl_feedback rows by hand from raw SQL, so only the changelog
serializers remain here.
"""

from rest_framework import serializers
from .models import Changelog


class ChangelogSerializer(serializers.ModelSerializer):
    """Serializer for changelog entries."""

    class Meta:
        model = Changelog
        fields = [
            'changelog_id',
            'version',
            'deployed_at',
            'auto_generated_notes',
            'published_notes',
            'is_published',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['changelog_id', 'created_at', 'updated_at']


class ChangelogPublicSerializer(serializers.ModelSerializer):
    """Public serializer for changelog - only shows published entries."""

    class Meta:
        model = Changelog
        fields = [
            'changelog_id',
            'version',
            'deployed_at',
            'published_notes',
        ]
        read_only_fields = fields
