"""
Income Approach Data Service

Aggregates Income Approach data from multiple existing tables.
Does NOT duplicate fields that exist elsewhere in the schema.

Source Tables:
- tbl_income_approach: Going-in cap rate, NOI basis, sensitivity intervals
- tbl_cre_dcf_analysis: Hold period, discount rate, terminal cap, selling costs
- tbl_project_assumption: Vacancy, credit loss, management fee, reserves
- core_fin_growth_rate_sets/steps: Income and expense growth rates

Session: QK-16
"""

from decimal import Decimal
from typing import Any, Dict, Optional
from django.db import connection


class IncomeApproachDataService:
    """
    Aggregates Income Approach data from multiple existing tables.
    Does NOT duplicate fields that exist elsewhere in the schema.
    """

    # Default values for assumptions
    DEFAULTS = {
        # DCF Parameters
        'hold_period_years': 10,
        'discount_rate': 0.085,
        'terminal_cap_rate': 0.0575,
        'selling_costs_pct': 0.02,

        # Income Assumptions
        'vacancy_rate': 0.05,
        'credit_loss_rate': 0.01,
        'other_income': 0,

        # Expense Assumptions
        'management_fee_pct': 0.03,
        'replacement_reserves_per_unit': 300,

        # Growth Rates
        'income_growth_rate': 0.03,
        'expense_growth_rate': 0.03,

        # Capitalization
        'selected_cap_rate': 0.0525,
        'stabilized_vacancy_rate': 0.05,
        'cap_rate_interval': 0.005,
        'discount_rate_interval': 0.005,
        'noi_capitalization_basis': 'forward_12',
        'market_cap_rate_method': 'comp_sales',
    }

    def __init__(self, project_id: int):
        self.project_id = project_id

    def _decimal_to_float(self, value: Any, default: float = 0.0) -> float:
        """Convert Decimal or other numeric types to float."""
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def get_dcf_parameters(self) -> Dict[str, Any]:
        """
        Pull DCF params from tbl_cre_dcf_analysis.
        Falls back to tbl_project_assumption for exit cap rate.
        """
        with connection.cursor() as cursor:
            # Try tbl_cre_dcf_analysis first (via cre_property)
            cursor.execute("""
                SELECT
                    dcf.hold_period_years,
                    dcf.discount_rate,
                    dcf.terminal_cap_rate,
                    dcf.selling_costs_pct
                FROM landscape.tbl_cre_dcf_analysis dcf
                JOIN landscape.tbl_cre_property cp ON cp.cre_property_id = dcf.cre_property_id
                WHERE cp.project_id = %s
                ORDER BY dcf.created_at DESC
                LIMIT 1
            """, [self.project_id])
            row = cursor.fetchone()

            if row:
                return {
                    'hold_period_years': row[0] or self.DEFAULTS['hold_period_years'],
                    'discount_rate': self._decimal_to_float(row[1], self.DEFAULTS['discount_rate']),
                    'terminal_cap_rate': self._decimal_to_float(row[2], self.DEFAULTS['terminal_cap_rate']),
                    'selling_costs_pct': self._decimal_to_float(row[3], self.DEFAULTS['selling_costs_pct']),
                }

            # Fallback to project assumptions for exit cap rate
            cursor.execute("""
                SELECT assumption_value
                FROM landscape.tbl_project_assumption
                WHERE project_id = %s AND assumption_key = 'cap_rate_exit'
            """, [self.project_id])
            exit_cap_row = cursor.fetchone()

            return {
                'hold_period_years': self.DEFAULTS['hold_period_years'],
                'discount_rate': self.DEFAULTS['discount_rate'],
                'terminal_cap_rate': self._decimal_to_float(
                    exit_cap_row[0] if exit_cap_row else None,
                    self.DEFAULTS['terminal_cap_rate']
                ),
                'selling_costs_pct': self.DEFAULTS['selling_costs_pct'],
            }

    def get_vacancy_assumptions(self) -> Dict[str, Any]:
        """
        Pull vacancy/credit loss from tbl_project_assumption.
        Keys: physical_vacancy_pct, bad_debt_pct
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT assumption_key, assumption_value
                FROM landscape.tbl_project_assumption
                WHERE project_id = %s
                  AND assumption_key IN ('physical_vacancy_pct', 'bad_debt_pct', 'loss_to_lease_pct')
            """, [self.project_id])
            rows = cursor.fetchall()

            result = {
                'vacancy_rate': self.DEFAULTS['vacancy_rate'],
                'credit_loss_rate': self.DEFAULTS['credit_loss_rate'],
                'loss_to_lease_pct': 0.0,
            }

            for key, value in rows:
                if key == 'physical_vacancy_pct':
                    result['vacancy_rate'] = self._decimal_to_float(value, self.DEFAULTS['vacancy_rate'])
                elif key == 'bad_debt_pct':
                    result['credit_loss_rate'] = self._decimal_to_float(value, self.DEFAULTS['credit_loss_rate'])
                elif key == 'loss_to_lease_pct':
                    result['loss_to_lease_pct'] = self._decimal_to_float(value, 0.0)

            return result

    def get_growth_rates(self) -> Dict[str, Any]:
        """
        Pull from core_fin_growth_rate_sets and core_fin_growth_rate_steps.
        Uses 'revenue' card_type for income growth and 'cost' for expense growth.
        """
        with connection.cursor() as cursor:
            # Get income (revenue) growth rate
            cursor.execute("""
                SELECT s.rate
                FROM landscape.core_fin_growth_rate_steps s
                JOIN landscape.core_fin_growth_rate_sets gs ON gs.set_id = s.set_id
                WHERE gs.project_id = %s
                  AND gs.card_type = 'revenue'
                  AND gs.is_default = true
                ORDER BY s.step_number
                LIMIT 1
            """, [self.project_id])
            income_row = cursor.fetchone()

            # Get expense (cost) growth rate
            cursor.execute("""
                SELECT s.rate
                FROM landscape.core_fin_growth_rate_steps s
                JOIN landscape.core_fin_growth_rate_sets gs ON gs.set_id = s.set_id
                WHERE gs.project_id = %s
                  AND gs.card_type = 'cost'
                  AND gs.is_default = true
                ORDER BY s.step_number
                LIMIT 1
            """, [self.project_id])
            expense_row = cursor.fetchone()

            return {
                'income_growth_rate': self._decimal_to_float(
                    income_row[0] if income_row else None,
                    self.DEFAULTS['income_growth_rate']
                ),
                'expense_growth_rate': self._decimal_to_float(
                    expense_row[0] if expense_row else None,
                    self.DEFAULTS['expense_growth_rate']
                ),
            }

    def get_operating_assumptions(self) -> Dict[str, Any]:
        """
        Pull management fee, reserves from tbl_project_assumption and tbl_debt_facility.
        """
        with connection.cursor() as cursor:
            # Get management fee and replacement reserves from project assumptions
            cursor.execute("""
                SELECT assumption_key, assumption_value
                FROM landscape.tbl_project_assumption
                WHERE project_id = %s
                  AND assumption_key IN ('management_fee_pct', 'replacement_reserve_pct', 'capex_per_unit')
            """, [self.project_id])
            assumption_rows = cursor.fetchall()

            result = {
                'management_fee_pct': self.DEFAULTS['management_fee_pct'],
                'replacement_reserves_per_unit': self.DEFAULTS['replacement_reserves_per_unit'],
                'other_income': self.DEFAULTS['other_income'],
            }

            for key, value in assumption_rows:
                if key == 'management_fee_pct':
                    result['management_fee_pct'] = self._decimal_to_float(value, self.DEFAULTS['management_fee_pct'])
                elif key == 'replacement_reserve_pct':
                    # This might be per-unit value stored with this key
                    result['replacement_reserves_per_unit'] = self._decimal_to_float(
                        value, self.DEFAULTS['replacement_reserves_per_unit']
                    )
                elif key == 'capex_per_unit':
                    # Alternative key for reserves
                    result['replacement_reserves_per_unit'] = self._decimal_to_float(
                        value, self.DEFAULTS['replacement_reserves_per_unit']
                    )

            # Also check tbl_debt_facility for replacement reserves
            cursor.execute("""
                SELECT replacement_reserve_per_unit
                FROM landscape.tbl_debt_facility
                WHERE project_id = %s AND replacement_reserve_per_unit IS NOT NULL
                LIMIT 1
            """, [self.project_id])
            facility_row = cursor.fetchone()

            if facility_row and facility_row[0]:
                result['replacement_reserves_per_unit'] = self._decimal_to_float(
                    facility_row[0], result['replacement_reserves_per_unit']
                )

            return result

    def get_capitalization_params(self) -> Dict[str, Any]:
        """
        Pull cap rate from tbl_income_approach (original + migration 046 fields)
        and tbl_project_assumption.
        """
        with connection.cursor() as cursor:
            # First check tbl_income_approach for existing data
            # Try to include migration 046 fields if they exist
            try:
                cursor.execute("""
                    SELECT
                        selected_cap_rate,
                        market_cap_rate_method,
                        cap_rate_justification,
                        noi_capitalization_basis,
                        stabilized_vacancy_rate,
                        cap_rate_interval,
                        discount_rate_interval
                    FROM landscape.tbl_income_approach
                    WHERE project_id = %s
                """, [self.project_id])
                income_row = cursor.fetchone()
                has_migration_046 = True
            except Exception:
                # Migration 046 not yet applied - fall back to original columns
                cursor.execute("""
                    SELECT
                        selected_cap_rate,
                        market_cap_rate_method,
                        cap_rate_justification
                    FROM landscape.tbl_income_approach
                    WHERE project_id = %s
                """, [self.project_id])
                income_row = cursor.fetchone()
                has_migration_046 = False

            # Also get going-in cap rate from project assumptions
            cursor.execute("""
                SELECT assumption_value
                FROM landscape.tbl_project_assumption
                WHERE project_id = %s AND assumption_key = 'cap_rate_going_in'
            """, [self.project_id])
            cap_assumption_row = cursor.fetchone()

            # Determine cap rate: prefer income_approach, fallback to assumption
            if income_row and income_row[0]:
                cap_rate = self._decimal_to_float(income_row[0], self.DEFAULTS['selected_cap_rate'])
                method = income_row[1] or self.DEFAULTS['market_cap_rate_method']
                justification = income_row[2] or ''
                # Migration 046 fields (columns 3-6) - only if migration applied
                if has_migration_046 and len(income_row) >= 7:
                    noi_basis = income_row[3] or self.DEFAULTS['noi_capitalization_basis']
                    stab_vacancy = self._decimal_to_float(income_row[4], self.DEFAULTS['stabilized_vacancy_rate'])
                    cap_interval = self._decimal_to_float(income_row[5], self.DEFAULTS['cap_rate_interval'])
                    disc_interval = self._decimal_to_float(income_row[6], self.DEFAULTS['discount_rate_interval'])
                else:
                    noi_basis = self.DEFAULTS['noi_capitalization_basis']
                    stab_vacancy = self.DEFAULTS['stabilized_vacancy_rate']
                    cap_interval = self.DEFAULTS['cap_rate_interval']
                    disc_interval = self.DEFAULTS['discount_rate_interval']
            elif cap_assumption_row:
                cap_rate = self._decimal_to_float(cap_assumption_row[0], self.DEFAULTS['selected_cap_rate'])
                method = 'direct_entry'
                justification = 'From project assumptions'
                noi_basis = self.DEFAULTS['noi_capitalization_basis']
                stab_vacancy = self.DEFAULTS['stabilized_vacancy_rate']
                cap_interval = self.DEFAULTS['cap_rate_interval']
                disc_interval = self.DEFAULTS['discount_rate_interval']
            else:
                cap_rate = self.DEFAULTS['selected_cap_rate']
                method = self.DEFAULTS['market_cap_rate_method']
                justification = ''
                noi_basis = self.DEFAULTS['noi_capitalization_basis']
                stab_vacancy = self.DEFAULTS['stabilized_vacancy_rate']
                cap_interval = self.DEFAULTS['cap_rate_interval']
                disc_interval = self.DEFAULTS['discount_rate_interval']

            return {
                'selected_cap_rate': cap_rate,
                'market_cap_rate_method': method,
                'cap_rate_justification': justification,
                # Migration 046 fields (use defaults if migration not applied)
                'noi_capitalization_basis': noi_basis,
                'stabilized_vacancy_rate': stab_vacancy,
                'cap_rate_interval': cap_interval,
                'discount_rate_interval': disc_interval,
            }

    def get_all_assumptions(self) -> Dict[str, Any]:
        """Aggregate all assumptions into single response."""
        dcf = self.get_dcf_parameters()
        vacancy = self.get_vacancy_assumptions()
        growth = self.get_growth_rates()
        operating = self.get_operating_assumptions()
        cap = self.get_capitalization_params()

        return {
            **dcf,
            **vacancy,
            **growth,
            **operating,
            **cap,
        }

    def update_dcf_parameters(self, updates: Dict[str, Any]) -> bool:
        """
        Update DCF parameters in tbl_cre_dcf_analysis.
        Creates record if it doesn't exist.
        """
        with connection.cursor() as cursor:
            # Find or create cre_property for this project
            cursor.execute("""
                SELECT cre_property_id
                FROM landscape.tbl_cre_property
                WHERE project_id = %s
                LIMIT 1
            """, [self.project_id])
            prop_row = cursor.fetchone()

            if not prop_row:
                # Create a CRE property record
                cursor.execute("""
                    INSERT INTO landscape.tbl_cre_property (project_id, created_at, updated_at)
                    VALUES (%s, NOW(), NOW())
                    RETURNING cre_property_id
                """, [self.project_id])
                prop_row = cursor.fetchone()

            cre_property_id = prop_row[0]

            # Update or insert DCF analysis
            set_clauses = []
            values = []

            field_mapping = {
                'hold_period_years': 'hold_period_years',
                'discount_rate': 'discount_rate',
                'terminal_cap_rate': 'terminal_cap_rate',
                'selling_costs_pct': 'selling_costs_pct',
            }

            for key, col in field_mapping.items():
                if key in updates:
                    set_clauses.append(f"{col} = %s")
                    values.append(updates[key])

            if not set_clauses:
                return False

            # Try update first
            cursor.execute(f"""
                UPDATE landscape.tbl_cre_dcf_analysis
                SET {', '.join(set_clauses)}, updated_at = NOW()
                WHERE cre_property_id = %s
                RETURNING dcf_analysis_id
            """, values + [cre_property_id])

            if cursor.fetchone() is None:
                # Insert if no existing record
                columns = [field_mapping[k] for k in updates.keys() if k in field_mapping]
                placeholders = ', '.join(['%s'] * len(columns))
                cursor.execute(f"""
                    INSERT INTO landscape.tbl_cre_dcf_analysis
                    (cre_property_id, {', '.join(columns)}, created_at, updated_at)
                    VALUES (%s, {placeholders}, NOW(), NOW())
                """, [cre_property_id] + [updates[k] for k in updates.keys() if k in field_mapping])

            return True

    def update_project_assumption(self, key: str, value: Any) -> bool:
        """
        Update or insert a project assumption in tbl_project_assumption.
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.tbl_project_assumption
                (project_id, assumption_key, assumption_value, assumption_type, scope, created_at, updated_at)
                VALUES (%s, %s, %s, 'user_input', 'project', NOW(), NOW())
                ON CONFLICT (project_id, assumption_key) WHERE scope = 'project' AND scope_id IS NULL
                DO UPDATE SET assumption_value = EXCLUDED.assumption_value, updated_at = NOW()
            """, [self.project_id, key, str(value)])
            return True

    def _check_migration_046_applied(self, cursor) -> bool:
        """Check if migration 046 columns exist in tbl_income_approach."""
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'landscape'
            AND table_name = 'tbl_income_approach'
            AND column_name = 'noi_capitalization_basis'
        """)
        return cursor.fetchone() is not None

    def update_capitalization_params(self, updates: Dict[str, Any]) -> bool:
        """
        Update capitalization parameters in tbl_income_approach.
        Creates record if it doesn't exist.
        Includes both original fields and migration 046 fields (if migration applied).
        """
        with connection.cursor() as cursor:
            # Check if migration 046 was applied
            has_migration_046 = self._check_migration_046_applied(cursor)

            # Check if record exists
            cursor.execute("""
                SELECT income_approach_id
                FROM landscape.tbl_income_approach
                WHERE project_id = %s
            """, [self.project_id])
            existing = cursor.fetchone()

            # Map of input keys to DB columns
            # Original fields (always available)
            field_mapping = {
                'selected_cap_rate': 'selected_cap_rate',
                'market_cap_rate_method': 'market_cap_rate_method',
                'cap_rate_justification': 'cap_rate_justification',
            }

            # Migration 046 fields (only if migration applied)
            if has_migration_046:
                field_mapping.update({
                    'noi_capitalization_basis': 'noi_capitalization_basis',
                    'stabilized_vacancy_rate': 'stabilized_vacancy_rate',
                    'cap_rate_interval': 'cap_rate_interval',
                    'discount_rate_interval': 'discount_rate_interval',
                })

            # Filter to only fields that exist in DB
            db_updates = {field_mapping[k]: v for k, v in updates.items() if k in field_mapping}

            if not db_updates:
                return False

            if existing:
                # Update existing record
                set_clauses = [f"{col} = %s" for col in db_updates.keys()]
                values = list(db_updates.values())
                cursor.execute(f"""
                    UPDATE landscape.tbl_income_approach
                    SET {', '.join(set_clauses)}, updated_at = NOW()
                    WHERE project_id = %s
                """, values + [self.project_id])
            else:
                # Insert new record
                columns = list(db_updates.keys())
                placeholders = ', '.join(['%s'] * len(columns))
                cursor.execute(f"""
                    INSERT INTO landscape.tbl_income_approach
                    (project_id, {', '.join(columns)}, created_at, updated_at)
                    VALUES (%s, {placeholders}, NOW(), NOW())
                """, [self.project_id] + list(db_updates.values()))

            return True

    def update_growth_rate(self, card_type: str, rate: float) -> bool:
        """
        Update growth rate in core_fin_growth_rate_steps for the default set.
        card_type should be 'revenue' for income or 'cost' for expense.
        """
        with connection.cursor() as cursor:
            # Find the default set for this project and card_type
            cursor.execute("""
                SELECT set_id
                FROM landscape.core_fin_growth_rate_sets
                WHERE project_id = %s AND card_type = %s AND is_default = true
                LIMIT 1
            """, [self.project_id, card_type])
            set_row = cursor.fetchone()

            if not set_row:
                # Create a default set if it doesn't exist
                cursor.execute("""
                    INSERT INTO landscape.core_fin_growth_rate_sets
                    (project_id, card_type, set_name, is_default, created_at, updated_at)
                    VALUES (%s, %s, %s, true, NOW(), NOW())
                    RETURNING set_id
                """, [self.project_id, card_type, f'{card_type.title()} Growth'])
                set_row = cursor.fetchone()

            set_id = set_row[0]

            # Update or insert the first step
            cursor.execute("""
                INSERT INTO landscape.core_fin_growth_rate_steps
                (set_id, step_number, from_period, rate, created_at)
                VALUES (%s, 1, 1, %s, NOW())
                ON CONFLICT (set_id, step_number)
                DO UPDATE SET rate = EXCLUDED.rate
            """, [set_id, rate])

            return True

    def save_assumption(self, field: str, value: Any) -> bool:
        """
        Route a single assumption update to the appropriate table.
        """
        # DCF parameters -> tbl_cre_dcf_analysis
        dcf_fields = ['hold_period_years', 'discount_rate', 'terminal_cap_rate', 'selling_costs_pct']
        if field in dcf_fields:
            return self.update_dcf_parameters({field: value})

        # Cap rate params + migration 046 UI fields -> tbl_income_approach
        income_approach_fields = [
            'selected_cap_rate', 'market_cap_rate_method', 'cap_rate_justification',
            # Migration 046 fields
            'noi_capitalization_basis', 'stabilized_vacancy_rate',
            'cap_rate_interval', 'discount_rate_interval',
        ]
        if field in income_approach_fields:
            return self.update_capitalization_params({field: value})

        # Growth rates -> core_fin_growth_rate_sets
        if field == 'income_growth_rate':
            return self.update_growth_rate('revenue', float(value))
        if field == 'expense_growth_rate':
            return self.update_growth_rate('cost', float(value))

        # Vacancy/credit loss -> tbl_project_assumption
        assumption_mapping = {
            'vacancy_rate': 'physical_vacancy_pct',
            'credit_loss_rate': 'bad_debt_pct',
            'management_fee_pct': 'management_fee_pct',
            'replacement_reserves_per_unit': 'replacement_reserve_pct',
        }
        if field in assumption_mapping:
            return self.update_project_assumption(assumption_mapping[field], value)

        # Other income - could be stored in tbl_project_assumption
        if field == 'other_income':
            return self.update_project_assumption('other_income', value)

        return False
