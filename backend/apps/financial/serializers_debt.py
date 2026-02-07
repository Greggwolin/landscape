"""
Serializers for unified debt/loan models.
"""

from django.db import transaction
from rest_framework import serializers

from .models_debt import (
    Loan,
    LoanContainer,
    LoanFinanceStructure,
    DebtDrawSchedule,
)


class LoanContainerSerializer(serializers.ModelSerializer):
    loan_id = serializers.IntegerField(source='loan.loan_id', read_only=True)

    class Meta:
        model = LoanContainer
        fields = [
            'loan_container_id',
            'loan_id',
            'division_id',
            'allocation_pct',
            'collateral_type',
            'created_at',
        ]
        read_only_fields = ['loan_container_id', 'created_at']


class LoanFinanceStructureSerializer(serializers.ModelSerializer):
    loan_id = serializers.IntegerField(source='loan.loan_id', read_only=True)

    class Meta:
        model = LoanFinanceStructure
        fields = [
            'loan_fs_id',
            'loan_id',
            'finance_structure_id',
            'contribution_pct',
            'created_at',
        ]
        read_only_fields = ['loan_fs_id', 'created_at']


class LoanListSerializer(serializers.ModelSerializer):
    # Return numeric values for JS arithmetic (not Decimal strings)
    commitment_amount = serializers.FloatField()
    loan_amount = serializers.FloatField(allow_null=True)
    interest_rate_pct = serializers.FloatField(allow_null=True)

    class Meta:
        model = Loan
        fields = [
            'loan_id',
            'loan_name',
            'loan_type',
            'structure_type',
            'lender_name',
            'commitment_amount',
            'loan_amount',
            'interest_rate_pct',
            'seniority',
            'status',
            'loan_start_date',
            'loan_maturity_date',
            'loan_term_months',
            'amortization_months',
            'interest_only_months',
            'interest_type',
            'payment_frequency',
            'origination_fee_pct',
        ]


class LoanDetailSerializer(serializers.ModelSerializer):
    containers = LoanContainerSerializer(
        many=True,
        read_only=True,
        source='loan_containers'
    )
    finance_structures = LoanFinanceStructureSerializer(
        many=True,
        read_only=True,
        source='loan_finance_structures'
    )
    takes_out_loan = LoanListSerializer(read_only=True)

    class Meta:
        model = Loan
        fields = '__all__'
        read_only_fields = ['loan_id']


class LoanCreateUpdateSerializer(serializers.ModelSerializer):
    container_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    finance_structure_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Loan
        fields = '__all__'
        read_only_fields = ['loan_id', 'created_at', 'updated_at']

    def _sync_containers(self, loan, container_ids):
        LoanContainer.objects.filter(loan=loan).delete()
        if not container_ids:
            return
        LoanContainer.objects.bulk_create(
            [LoanContainer(loan=loan, division_id=division_id) for division_id in container_ids]
        )

    def _sync_finance_structures(self, loan, finance_structure_ids):
        LoanFinanceStructure.objects.filter(loan=loan).delete()
        if not finance_structure_ids:
            return
        LoanFinanceStructure.objects.bulk_create(
            [
                LoanFinanceStructure(loan=loan, finance_structure_id=fs_id)
                for fs_id in finance_structure_ids
            ]
        )

    @transaction.atomic
    def create(self, validated_data):
        container_ids = validated_data.pop('container_ids', None)
        finance_structure_ids = validated_data.pop('finance_structure_ids', None)
        loan = super().create(validated_data)
        if container_ids is not None:
            self._sync_containers(loan, container_ids)
        if finance_structure_ids is not None:
            self._sync_finance_structures(loan, finance_structure_ids)
        return loan

    @transaction.atomic
    def update(self, instance, validated_data):
        container_ids = validated_data.pop('container_ids', None)
        finance_structure_ids = validated_data.pop('finance_structure_ids', None)
        loan = super().update(instance, validated_data)
        if container_ids is not None:
            self._sync_containers(loan, container_ids)
        if finance_structure_ids is not None:
            self._sync_finance_structures(loan, finance_structure_ids)
        return loan


class DebtDrawScheduleSerializer(serializers.ModelSerializer):
    period_start_date = serializers.DateField(source='period.period_start_date', read_only=True)
    period_end_date = serializers.DateField(source='period.period_end_date', read_only=True)

    class Meta:
        model = DebtDrawSchedule
        fields = '__all__'
        read_only_fields = ['draw_id', 'created_at', 'updated_at']


class DebtBalanceSummarySerializer(serializers.Serializer):
    loan_id = serializers.IntegerField()
    project_id = serializers.IntegerField()
    loan_name = serializers.CharField()
    loan_type = serializers.CharField()
    structure_type = serializers.CharField()
    commitment_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    interest_rate_pct = serializers.DecimalField(max_digits=6, decimal_places=3, required=False, allow_null=True)
    seniority = serializers.IntegerField()
    period_id = serializers.IntegerField()
    period_start_date = serializers.DateField()
    period_end_date = serializers.DateField()
    draw_amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    cumulative_drawn = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    available_remaining = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    beginning_balance = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    interest_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    cumulative_interest = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    principal_payment = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    ending_balance = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    utilization_pct = serializers.DecimalField(max_digits=7, decimal_places=2, required=False, allow_null=True)
