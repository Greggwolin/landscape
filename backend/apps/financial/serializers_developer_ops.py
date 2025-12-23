"""
Serializers for Developer Operations models.
"""

from rest_framework import serializers
from .models_developer_ops import DeveloperFee, ManagementOverhead


class DeveloperFeeSerializer(serializers.ModelSerializer):
    """Serializer for DeveloperFee model."""

    fee_type_display = serializers.CharField(
        source='get_fee_type_display',
        read_only=True
    )
    basis_type_display = serializers.CharField(
        source='get_basis_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = DeveloperFee
        fields = [
            'id',
            'project_id',
            'fee_type',
            'fee_type_display',
            'fee_description',
            'basis_type',
            'basis_type_display',
            'basis_value',
            'calculated_amount',
            'payment_timing',
            'status',
            'status_display',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ManagementOverheadSerializer(serializers.ModelSerializer):
    """Serializer for ManagementOverhead model."""

    frequency_display = serializers.CharField(
        source='get_frequency_display',
        read_only=True
    )
    container_level_display = serializers.CharField(
        source='get_container_level_display',
        read_only=True
    )
    # Computed total based on frequency and duration
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = ManagementOverhead
        fields = [
            'id',
            'project_id',
            'item_name',
            'amount',
            'frequency',
            'frequency_display',
            'start_period',
            'duration_periods',
            'container_level',
            'container_level_display',
            'container_id',
            'notes',
            'total_amount',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_total_amount(self, obj):
        """Calculate total amount based on frequency and duration."""
        if obj.frequency == 'one_time':
            return float(obj.amount)
        return float(obj.amount) * obj.duration_periods


class DeveloperFeeSummarySerializer(serializers.Serializer):
    """Summary serializer for developer fees totals."""

    total_fees = serializers.DecimalField(max_digits=15, decimal_places=2)
    fees_by_type = serializers.DictField()
    pending_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = serializers.DecimalField(max_digits=15, decimal_places=2)


class ManagementOverheadSummarySerializer(serializers.Serializer):
    """Summary serializer for management overhead totals."""

    total_overhead = serializers.DecimalField(max_digits=15, decimal_places=2)
    monthly_overhead = serializers.DecimalField(max_digits=15, decimal_places=2)
    items_count = serializers.IntegerField()
