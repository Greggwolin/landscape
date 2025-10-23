"""Serializers for Market Intelligence application."""

from rest_framework import serializers
from .models import AIIngestionHistory


class AIIngestionHistorySerializer(serializers.ModelSerializer):
    """Serializer for AIIngestionHistory model."""
    
    class Meta:
        model = AIIngestionHistory
        fields = [
            'ingestion_id',
            'doc_id',
            'ingestion_date',
            'model_used',
            'confidence_score',
            'extracted_data',
            'validation_status',
            'created_at',
        ]
        read_only_fields = ['ingestion_id', 'ingestion_date', 'created_at']


class MarketReportSerializer(serializers.Serializer):
    """Serializer for market reports."""
    
    location = serializers.CharField()
    data_type = serializers.CharField()
    metrics = serializers.JSONField()
    date_range = serializers.DictField(required=False)
