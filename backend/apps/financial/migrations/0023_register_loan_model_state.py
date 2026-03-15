"""
Migration 0023: Register Loan model in migration state.

The tbl_loan table was created outside of Django migrations (via raw SQL).
This migration registers the Loan model in Django's migration state so that
subsequent migrations (0044+) can reference it via AddField operations.

No DDL is executed — the table already exists on the database.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0022_add_vertical_construction_categories'),
        ('projects', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Loan',
            fields=[
                ('loan_id', models.BigAutoField(primary_key=True, serialize=False)),
                ('project', models.ForeignKey(
                    db_column='project_id',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='loans',
                    to='projects.project',
                )),
                ('loan_name', models.CharField(max_length=255)),
                ('loan_type', models.CharField(max_length=50)),
                ('structure_type', models.CharField(default='TERM', max_length=20)),
                ('lender_name', models.CharField(blank=True, max_length=255, null=True)),
                ('seniority', models.IntegerField(default=1)),
                ('status', models.CharField(blank=True, default='active', max_length=20, null=True)),
                ('commitment_amount', models.DecimalField(blank=True, decimal_places=2, default=0, max_digits=15, null=True)),
                ('loan_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('loan_to_cost_pct', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('loan_to_value_pct', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('commitment_sizing_method', models.CharField(blank=True, default='MANUAL', max_length=30, null=True)),
                ('ltv_basis_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('ltc_basis_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('calculated_commitment_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('governing_constraint', models.CharField(blank=True, max_length=10, null=True)),
                ('net_loan_proceeds', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('interest_rate_pct', models.DecimalField(blank=True, decimal_places=3, max_digits=6, null=True)),
                ('interest_rate_decimal', models.DecimalField(blank=True, decimal_places=5, max_digits=6, null=True)),
                ('interest_type', models.CharField(blank=True, default='Fixed', max_length=50, null=True)),
                ('interest_index', models.CharField(blank=True, max_length=50, null=True)),
                ('index_rate_pct', models.DecimalField(blank=True, decimal_places=3, max_digits=6, null=True)),
                ('interest_spread_bps', models.IntegerField(blank=True, null=True)),
                ('rate_floor_pct', models.DecimalField(blank=True, decimal_places=3, max_digits=6, null=True)),
                ('rate_cap_pct', models.DecimalField(blank=True, decimal_places=3, max_digits=6, null=True)),
                ('rate_reset_frequency', models.CharField(blank=True, max_length=20, null=True)),
                ('interest_calculation', models.CharField(blank=True, default='SIMPLE', max_length=50, null=True)),
                ('interest_payment_method', models.CharField(blank=True, default='paid_current', max_length=50, null=True)),
                ('loan_start_date', models.DateField(blank=True, null=True)),
                ('loan_maturity_date', models.DateField(blank=True, null=True)),
                ('loan_term_months', models.IntegerField(blank=True, null=True)),
                ('loan_term_years', models.IntegerField(blank=True, null=True)),
                ('amortization_months', models.IntegerField(blank=True, null=True)),
                ('amortization_years', models.IntegerField(blank=True, null=True)),
                ('interest_only_months', models.IntegerField(blank=True, default=0, null=True)),
                ('payment_frequency', models.CharField(blank=True, default='MONTHLY', max_length=50, null=True)),
                ('commitment_date', models.DateField(blank=True, null=True)),
                ('origination_fee_pct', models.DecimalField(blank=True, decimal_places=4, max_digits=5, null=True)),
                ('exit_fee_pct', models.DecimalField(blank=True, decimal_places=3, max_digits=5, null=True)),
                ('unused_fee_pct', models.DecimalField(blank=True, decimal_places=4, max_digits=5, null=True)),
                ('commitment_fee_pct', models.DecimalField(blank=True, decimal_places=3, max_digits=5, null=True)),
                ('extension_fee_bps', models.IntegerField(blank=True, null=True)),
                ('extension_fee_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('prepayment_penalty_years', models.IntegerField(blank=True, null=True)),
                ('closing_costs_appraisal', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('closing_costs_legal', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('closing_costs_other', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('interest_reserve_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('interest_reserve_funded_upfront', models.BooleanField(blank=True, default=False, null=True)),
                ('interest_reserve_inflator', models.DecimalField(blank=True, decimal_places=2, default=1.0, max_digits=5, null=True)),
                ('reserve_requirements', models.JSONField(blank=True, default=dict)),
                ('replacement_reserve_per_unit', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('tax_insurance_escrow_months', models.IntegerField(blank=True, null=True)),
                ('initial_reserve_months', models.IntegerField(blank=True, null=True)),
                ('covenants', models.JSONField(blank=True, default=dict)),
                ('loan_covenant_dscr_min', models.DecimalField(blank=True, decimal_places=3, max_digits=5, null=True)),
                ('loan_covenant_ltv_max', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('loan_covenant_occupancy_min', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('covenant_test_frequency', models.CharField(blank=True, default='Quarterly', max_length=20, null=True)),
                ('guarantee_type', models.CharField(blank=True, max_length=50, null=True)),
                ('guarantor_name', models.CharField(blank=True, max_length=200, null=True)),
                ('recourse_carveout_provisions', models.TextField(blank=True, null=True)),
                ('recourse_type', models.CharField(blank=True, default='FULL', max_length=30, null=True)),
                ('extension_options', models.IntegerField(blank=True, default=0, null=True)),
                ('extension_option_years', models.IntegerField(blank=True, null=True)),
                ('draw_trigger_type', models.CharField(blank=True, default='COST_INCURRED', max_length=50, null=True)),
                ('commitment_balance', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('drawn_to_date', models.DecimalField(blank=True, decimal_places=2, default=0, max_digits=15, null=True)),
                ('is_construction_loan', models.BooleanField(blank=True, default=False, null=True)),
                ('release_price_pct', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('minimum_release_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('repayment_acceleration', models.DecimalField(blank=True, decimal_places=2, default=1.0, max_digits=5, null=True)),
                ('collateral_basis_type', models.CharField(blank=True, default='PROJECT_COST', max_length=30, null=True)),
                ('takes_out_loan', models.ForeignKey(
                    blank=True,
                    db_column='takes_out_loan_id',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='refinanced_by',
                    to='financial.loan',
                )),
                ('can_participate_in_profits', models.BooleanField(blank=True, default=False, null=True)),
                ('profit_participation_tier', models.IntegerField(blank=True, null=True)),
                ('profit_participation_pct', models.DecimalField(blank=True, decimal_places=3, max_digits=6, null=True)),
                ('monthly_payment', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('annual_debt_service', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.TextField(blank=True, null=True)),
                ('updated_by', models.TextField(blank=True, null=True)),
            ],
            options={
                'db_table': 'tbl_loan',
                'managed': False,
            },
        ),
    ]
