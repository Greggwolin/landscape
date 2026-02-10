"""
Land Development Cash Flow Service

Calculates complete cash flow projections for Land Development projects.
Port of TypeScript engine (src/lib/financial-engine/cashflow/) to Django.

Uses numpy-financial for IRR/NPV calculations to match Excel methodology.

Key Features:
- Monthly period generation from project start date
- Cost allocation with S-curve timing and inflation
- Revenue calculation from parcel sales with price escalation
- Revenue deductions (commissions, transaction costs, subdivision costs)
- Financial metrics: IRR, NPV, equity multiple, peak equity

Session: Land Dev Cash Flow Consolidation
"""

from decimal import Decimal
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from typing import Any, Dict, List, Optional, Tuple
from django.db import connection

import numpy_financial as npf
import numpy as np

from apps.calculations.engines.debt_service_engine import (
    DebtServiceEngine,
    RevolverLoanParams,
    TermLoanParams,
    PeriodCosts,
)
from apps.calculations.engines.lotbank_engine import (
    LotbankEngine,
    LotbankParams,
    LotbankProduct,
)
from apps.financial.models_debt import Loan

class LandDevCashFlowService:
    """
    Calculates cash flow projections for Land Development projects.

    This mirrors the TypeScript engine but runs in Python with numpy-financial.
    The frontend now fetches pre-calculated results instead of running calculations.
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        self._project_config: Optional[Dict] = None
        self._dcf_assumptions: Optional[Dict] = None

    def calculate(
        self,
        container_ids: Optional[List[int]] = None,
        include_financing: bool = False,
    ) -> Dict[str, Any]:
        """
        Main entry point. Returns monthly cash flow projections.

        Args:
            container_ids: Optional filter for specific villages/phases (division_ids)
            include_financing: Optional flag to include debt financing section

        Returns:
            {
                'projectId': int,
                'periods': [...],           # Monthly periods with labels
                'sections': [...],          # Revenue, Costs sections with rows
                'summary': {...},           # Aggregate metrics (IRR, NPV, etc.)
                'periodType': 'month',
                'startDate': date,
                'endDate': date,
                'totalPeriods': int,
                'discountRate': float,
            }
        """
        # Step 1: Load project configuration and DCF assumptions
        project_config = self._get_project_config()
        dcf_assumptions = self._get_dcf_assumptions()
        hold_period_months = self._get_dcf_hold_period_months()

        # Step 2: Determine required periods
        required_periods = self._determine_required_periods(container_ids)

        # Step 2b: Extend periods to cover loan terms when financing is included
        if include_financing:
            # Debt-tab schedules should align to the DCF sale horizon.
            # Ensure we have at least the hold window, then prevent extending past it.
            if hold_period_months:
                required_periods = max(required_periods, hold_period_months)
            required_periods = self._extend_periods_for_loans(
                required_periods, project_config['start_date'], container_ids
            )
            if hold_period_months:
                required_periods = min(required_periods, hold_period_months)

        # Step 3: Generate monthly periods
        periods = self._generate_periods(
            project_config['start_date'],
            required_periods
        )

        # Step 4: Get cost data
        cost_schedule = self._generate_cost_schedule(
            required_periods,
            container_ids,
            dcf_assumptions.get('cost_inflation_rate')
        )

        # Step 5: Get revenue data (absorption schedule)
        absorption_schedule = self._generate_absorption_schedule(
            project_config['start_date'],
            container_ids,
            dcf_assumptions.get('price_growth_rate'),
            dcf_assumptions.get('cost_inflation_rate')
        )

        # Step 6: Build sections for display
        sections = self._build_sections(
            cost_schedule,
            absorption_schedule,
            required_periods
        )

        if include_financing:
            financing_section = self._build_financing_section(
                cost_schedule,
                absorption_schedule,
                periods,
                container_ids,
            )
            if financing_section:
                sections.append(financing_section)

        # Step 6b: Add lotbank sections when analysis_type = 'LOTBANK'
        lotbank_sections = self._build_lotbank_sections(
            absorption_schedule,
            periods,
            container_ids,
        )
        if lotbank_sections:
            sections.extend(lotbank_sections)

        # Step 7: Calculate summary metrics
        summary = self._calculate_summary_metrics(
            sections,
            periods,
            absorption_schedule,
            cost_schedule,
            dcf_assumptions.get('discount_rate')
        )

        # Step 8: Return complete schedule
        return {
            'projectId': self.project_id,
            'periodType': 'month',
            'startDate': periods[0]['startDate'].isoformat() if periods else None,
            'endDate': periods[-1]['endDate'].isoformat() if periods else None,
            'totalPeriods': len(periods),
            'discountRate': dcf_assumptions.get('discount_rate'),
            'periods': [self._format_period(p) for p in periods],
            'sections': sections,
            'summary': summary,
            'generatedAt': date.today().isoformat(),
        }

    # =========================================================================
    # PROJECT CONFIGURATION
    # =========================================================================

    def _get_project_config(self) -> Dict[str, Any]:
        """Fetch project configuration from database."""
        if self._project_config:
            return self._project_config

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    project_id,
                    project_name,
                    analysis_start_date
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()

            if not row:
                raise ValueError(f"Project {self.project_id} not found")

            # Parse start date
            start_date = row[2]
            if start_date is None:
                start_date = date(2025, 1, 1)  # Default to Jan 1, 2025
            elif isinstance(start_date, str):
                start_date = date.fromisoformat(start_date.split('T')[0])

            self._project_config = {
                'project_id': row[0],
                'project_name': row[1],
                'start_date': start_date,
            }

        return self._project_config

    def _get_dcf_assumptions(self) -> Dict[str, Any]:
        """
        Fetch DCF assumptions from tbl_dcf_analysis and look up actual rates
        from growth rate sets tables.
        """
        if self._dcf_assumptions:
            return self._dcf_assumptions

        with connection.cursor() as cursor:
            # Get DCF analysis record
            cursor.execute("""
                SELECT
                    hold_period_years,
                    discount_rate,
                    selling_costs_pct,
                    price_growth_set_id,
                    cost_inflation_set_id
                FROM landscape.tbl_dcf_analysis
                WHERE project_id = %s
                LIMIT 1
            """, [self.project_id])
            row = cursor.fetchone()

            if row:
                hold_period_years = int(row[0]) if row[0] else None
                discount_rate = float(row[1]) if row[1] else 0.10
                selling_costs_pct = float(row[2]) if row[2] else 0.0
                price_growth_set_id = row[3]
                cost_inflation_set_id = row[4]
            else:
                hold_period_years = None
                discount_rate = 0.10
                selling_costs_pct = 0.0
                price_growth_set_id = None
                cost_inflation_set_id = None

                # Try to get cost_inflation_set_id from project settings
                cursor.execute("""
                    SELECT cost_inflation_set_id, price_inflation_set_id
                    FROM landscape.tbl_project_settings
                    WHERE project_id = %s
                """, [self.project_id])
                settings_row = cursor.fetchone()
                if settings_row:
                    cost_inflation_set_id = settings_row[0]
                    price_growth_set_id = settings_row[1]

            # Look up actual rates from growth rate sets
            price_growth_rate = 0.0
            cost_inflation_rate = 0.0

            if price_growth_set_id:
                cursor.execute("""
                    SELECT
                        CASE
                            WHEN COUNT(st.step_id) = 1 THEN MAX(st.rate)
                            ELSE MAX(CASE WHEN st.step_number = 1 THEN st.rate END)
                        END AS current_rate
                    FROM landscape.core_fin_growth_rate_sets grs
                    LEFT JOIN landscape.core_fin_growth_rate_steps st ON st.set_id = grs.set_id
                    WHERE grs.set_id = %s
                    GROUP BY grs.set_id
                """, [price_growth_set_id])
                rate_row = cursor.fetchone()
                if rate_row and rate_row[0]:
                    price_growth_rate = float(rate_row[0])

            if cost_inflation_set_id:
                cursor.execute("""
                    SELECT
                        CASE
                            WHEN COUNT(st.step_id) = 1 THEN MAX(st.rate)
                            ELSE MAX(CASE WHEN st.step_number = 1 THEN st.rate END)
                        END AS current_rate
                    FROM landscape.core_fin_growth_rate_sets grs
                    LEFT JOIN landscape.core_fin_growth_rate_steps st ON st.set_id = grs.set_id
                    WHERE grs.set_id = %s
                    GROUP BY grs.set_id
                """, [cost_inflation_set_id])
                rate_row = cursor.fetchone()
                if rate_row and rate_row[0]:
                    cost_inflation_rate = float(rate_row[0])

            self._dcf_assumptions = {
                'hold_period_years': hold_period_years,
                'discount_rate': discount_rate,
                'price_growth_rate': price_growth_rate,
                'cost_inflation_rate': cost_inflation_rate,
                'selling_costs_pct': selling_costs_pct,
                'price_growth_set_id': price_growth_set_id,
                'cost_inflation_set_id': cost_inflation_set_id,
            }

        return self._dcf_assumptions

    def _get_dcf_hold_period_months(self) -> Optional[int]:
        """Resolve DCF hold horizon as months for schedule cutoff."""
        assumptions = self._get_dcf_assumptions()
        hold_years = assumptions.get('hold_period_years')
        if hold_years is None:
            return None
        try:
            hold_months = int(hold_years) * 12
        except (TypeError, ValueError):
            return None
        return hold_months if hold_months > 0 else None

    # =========================================================================
    # PERIOD GENERATION
    # =========================================================================

    def _determine_required_periods(self, container_ids: Optional[List[int]]) -> int:
        """Determine how many periods are needed based on project data."""
        with connection.cursor() as cursor:
            # Get max period from budget items
            if container_ids:
                cursor.execute("""
                    SELECT MAX(COALESCE(end_period, start_period + COALESCE(periods_to_complete, 1) - 1)) as max_period
                    FROM landscape.core_fin_fact_budget
                    WHERE project_id = %s
                      AND division_id = ANY(%s)
                """, [self.project_id, container_ids])
            else:
                cursor.execute("""
                    SELECT MAX(COALESCE(end_period, start_period + COALESCE(periods_to_complete, 1) - 1)) as max_period
                    FROM landscape.core_fin_fact_budget
                    WHERE project_id = %s
                """, [self.project_id])

            budget_row = cursor.fetchone()
            max_budget_period = int(budget_row[0]) if budget_row and budget_row[0] else 0

            # Get max period from parcel sales
            if container_ids:
                cursor.execute("""
                    SELECT MAX(p.sale_period) as max_period
                    FROM landscape.tbl_parcel p
                    LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
                    LEFT JOIN landscape.tbl_division d_phase
                      ON ph.phase_name = d_phase.display_name
                      AND ph.project_id = d_phase.project_id
                      AND d_phase.tier = 2
                    WHERE p.project_id = %s
                      AND d_phase.division_id = ANY(%s)
                      AND p.sale_period IS NOT NULL
                """, [self.project_id, container_ids])
            else:
                cursor.execute("""
                    SELECT MAX(sale_period) as max_period
                    FROM landscape.tbl_parcel
                    WHERE project_id = %s
                      AND sale_period IS NOT NULL
                """, [self.project_id])

            parcel_row = cursor.fetchone()
            max_sale_period = int(parcel_row[0]) if parcel_row and parcel_row[0] else 0

        # Return max of both, minimum 1
        return max(max_budget_period, max_sale_period, 1)

    def _generate_periods(self, start_date: date, period_count: int) -> List[Dict]:
        """Generate monthly period objects."""
        periods = []
        for i in range(period_count):
            period_start = start_date + relativedelta(months=i)
            period_end = period_start + relativedelta(months=1, days=-1)

            periods.append({
                'periodIndex': i,
                'periodSequence': i + 1,
                'startDate': period_start,
                'endDate': period_end,
                'label': period_start.strftime('%b %Y'),
                'periodType': 'month',
            })

        return periods

    def _format_period(self, period: Dict) -> Dict:
        """Format period for API response."""
        return {
            'periodIndex': period['periodIndex'],
            'periodSequence': period['periodSequence'],
            'startDate': period['startDate'].isoformat(),
            'endDate': period['endDate'].isoformat(),
            'label': period['label'],
            'periodType': period['periodType'],
        }

    # =========================================================================
    # COST SCHEDULE
    # =========================================================================

    def _generate_cost_schedule(
        self,
        period_count: int,
        container_ids: Optional[List[int]],
        cost_inflation_rate: Optional[float]
    ) -> Dict[str, Any]:
        """
        Generate cost schedule from budget items.

        Returns dict with:
        - categorySummary: costs grouped by activity/category
        - totalCosts: sum of all costs
        - periodTotals: costs by period
        """
        with connection.cursor() as cursor:
            # Fetch budget items
            if container_ids:
                cursor.execute("""
                    SELECT
                        b.fact_id,
                        b.project_id,
                        b.division_id as container_id,
                        CASE
                            WHEN d.tier = 1 THEN COALESCE(pc.tier_1_label, 'Area') || ' ' || d.display_name
                            WHEN d.tier = 2 THEN COALESCE(pc.tier_2_label, 'Phase') || ' ' || d.display_name
                            WHEN d.tier = 3 THEN COALESCE(pc.tier_3_label, 'Parcel') || ' ' || d.display_name
                            ELSE d.display_name
                        END as container_label,
                        COALESCE(c.category_name, 'Uncategorized') as description,
                        b.notes,
                        b.activity,
                        b.qty,
                        b.rate,
                        b.amount,
                        b.start_period,
                        b.periods_to_complete,
                        b.end_period,
                        b.timing_method,
                        b.curve_id,
                        b.curve_steepness,
                        b.escalation_rate
                    FROM landscape.core_fin_fact_budget b
                    LEFT JOIN landscape.core_unit_cost_category c ON b.category_id = c.category_id
                    LEFT JOIN landscape.tbl_division d ON b.division_id = d.division_id
                    LEFT JOIN landscape.tbl_project_config pc ON b.project_id = pc.project_id
                    WHERE b.project_id = %s
                      AND b.division_id = ANY(%s)
                      AND b.amount > 0
                    ORDER BY b.activity, b.fact_id
                """, [self.project_id, container_ids])
            else:
                cursor.execute("""
                    SELECT
                        b.fact_id,
                        b.project_id,
                        b.division_id as container_id,
                        CASE
                            WHEN d.tier = 1 THEN COALESCE(pc.tier_1_label, 'Area') || ' ' || d.display_name
                            WHEN d.tier = 2 THEN COALESCE(pc.tier_2_label, 'Phase') || ' ' || d.display_name
                            WHEN d.tier = 3 THEN COALESCE(pc.tier_3_label, 'Parcel') || ' ' || d.display_name
                            ELSE d.display_name
                        END as container_label,
                        COALESCE(c.category_name, 'Uncategorized') as description,
                        b.notes,
                        b.activity,
                        b.qty,
                        b.rate,
                        b.amount,
                        b.start_period,
                        b.periods_to_complete,
                        b.end_period,
                        b.timing_method,
                        b.curve_id,
                        b.curve_steepness,
                        b.escalation_rate
                    FROM landscape.core_fin_fact_budget b
                    LEFT JOIN landscape.core_unit_cost_category c ON b.category_id = c.category_id
                    LEFT JOIN landscape.tbl_division d ON b.division_id = d.division_id
                    LEFT JOIN landscape.tbl_project_config pc ON b.project_id = pc.project_id
                    WHERE b.project_id = %s
                      AND b.amount > 0
                    ORDER BY b.activity, b.fact_id
                """, [self.project_id])

            columns = [col[0] for col in cursor.description]
            budget_items = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Group by category and distribute across periods
        category_summary = {}
        period_totals = [0.0] * period_count
        total_costs = 0.0

        for item in budget_items:
            category = self._get_category_from_activity(
                item.get('activity'),
                item.get('description')
            )

            if category not in category_summary:
                category_summary[category] = {
                    'total': 0.0,
                    'items': [],
                }

            # Distribute budget item across periods
            amount = float(item.get('amount') or 0)
            start_period = int(item.get('start_period') or 1)
            periods_to_complete = int(item.get('periods_to_complete') or 1)

            # Apply inflation if configured
            # Note: escalation_rate in DB is stored as percentage (3 = 3%), convert to decimal
            item_inflation = item.get('escalation_rate')
            if item_inflation is not None:
                item_inflation = float(item_inflation) / 100.0  # Convert 3 -> 0.03
            elif cost_inflation_rate:
                item_inflation = cost_inflation_rate

            # Create period values for this item
            period_values = self._distribute_budget_item(
                amount,
                start_period,
                periods_to_complete,
                period_count,
                item.get('timing_method'),
                item.get('curve_steepness'),
                item_inflation
            )

            # Add to category
            category_summary[category]['total'] += amount
            category_summary[category]['items'].append({
                'factId': item.get('fact_id'),
                'description': item.get('description'),
                'containerId': item.get('container_id'),
                'containerLabel': item.get('container_label'),
                'totalAmount': amount,
                'periods': period_values,
            })

            # Add to period totals
            for pv in period_values:
                idx = pv['periodIndex']
                if 0 <= idx < period_count:
                    period_totals[idx] += pv['amount']

            total_costs += amount

        # Fetch and add acquisition costs from tbl_acquisition
        # These are separate from budget items (e.g., $104M land purchase)
        acquisition_costs = self._fetch_acquisition_costs(container_ids, period_count)
        if acquisition_costs:
            acq_category = 'Land Acquisition'
            if acq_category not in category_summary:
                category_summary[acq_category] = {
                    'total': 0.0,
                    'items': [],
                }

            category_summary[acq_category]['total'] += acquisition_costs['totalAmount']
            category_summary[acq_category]['items'].append({
                'factId': -1,  # Synthetic ID for acquisition
                'description': acquisition_costs['description'],
                'containerId': None,
                'containerLabel': 'Project-level',
                'totalAmount': acquisition_costs['totalAmount'],
                'periods': acquisition_costs['periods'],
            })

            # Add to period totals
            for pv in acquisition_costs['periods']:
                idx = pv['periodIndex']
                if 0 <= idx < period_count:
                    period_totals[idx] += pv['amount']

            total_costs += acquisition_costs['totalAmount']

        return {
            'categorySummary': category_summary,
            'totalCosts': total_costs,
            'periodTotals': period_totals,
        }

    def _fetch_acquisition_costs(
        self,
        container_ids: Optional[List[int]],
        period_count: int
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch acquisition costs from tbl_acquisition.
        These are land purchase costs separate from budget items.

        When filtered by container, allocates proportionally by acres.
        """
        with connection.cursor() as cursor:
            # Fetch acquisition records
            cursor.execute("""
                SELECT
                    acquisition_id,
                    project_id,
                    event_date,
                    event_type,
                    description,
                    COALESCE(amount, 0) as amount,
                    COALESCE(is_applied_to_purchase, true) as is_applied_to_purchase,
                    notes
                FROM landscape.tbl_acquisition
                WHERE project_id = %s
                  AND is_applied_to_purchase = true
                  AND amount > 0
                ORDER BY event_date, acquisition_id
            """, [self.project_id])

            columns = [col[0] for col in cursor.description]
            acquisitions = [dict(zip(columns, row)) for row in cursor.fetchall()]

            if not acquisitions:
                return None

            # Calculate total acquisition amount
            total_acquisition = sum(float(acq['amount']) for acq in acquisitions)

            if total_acquisition <= 0:
                return None

            # Determine allocation proportion based on acres when filtered
            allocation_proportion = 1.0  # Default to 100% if no filter

            if container_ids and len(container_ids) > 0:
                # Calculate acres proportion
                cursor.execute("""
                    WITH project_acres AS (
                        SELECT COALESCE(SUM(acres_gross), 0) as total_acres
                        FROM landscape.tbl_parcel
                        WHERE project_id = %s
                    ),
                    filtered_acres AS (
                        SELECT COALESCE(SUM(p.acres_gross), 0) as filtered_acres
                        FROM landscape.tbl_parcel p
                        LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
                        LEFT JOIN landscape.tbl_division d_phase
                          ON ph.phase_name = d_phase.display_name
                          AND ph.project_id = d_phase.project_id
                          AND d_phase.tier = 2
                        WHERE p.project_id = %s
                          AND d_phase.division_id = ANY(%s)
                    )
                    SELECT
                        (SELECT total_acres FROM project_acres) as total_acres,
                        (SELECT filtered_acres FROM filtered_acres) as filtered_acres
                """, [self.project_id, self.project_id, container_ids])

                row = cursor.fetchone()
                if row:
                    total_acres = float(row[0]) if row[0] else 0
                    filtered_acres = float(row[1]) if row[1] else 0
                    if total_acres > 0:
                        allocation_proportion = filtered_acres / total_acres

            # Calculate allocated acquisition amount
            allocated_amount = total_acquisition * allocation_proportion

            if allocated_amount <= 0:
                return None

            # Acquisition costs are placed at period 1 (project start)
            periods = [{
                'periodIndex': 0,
                'periodSequence': 1,
                'amount': allocated_amount,
                'source': 'acquisition',
            }]

            description = 'Land Acquisition'
            if allocation_proportion < 1:
                description = f"Land Acquisition ({round(allocation_proportion * 100)}% allocation)"

            return {
                'totalAmount': allocated_amount,
                'description': description,
                'periods': periods,
            }

    def _get_category_from_activity(self, activity: Optional[str], description: Optional[str]) -> str:
        """Map activity to standardized category."""
        # Check for contingency first
        if description and 'contingency' in description.lower():
            return 'Contingency'

        if not activity:
            return 'Other Costs'

        # Map database activities to display categories
        category_map = {
            # Standard activities
            'Acquisition': 'Land Acquisition',
            'Land Acquisition': 'Land Acquisition',
            'Planning & Engineering': 'Planning & Engineering',
            'Planning': 'Planning & Engineering',
            'Engineering': 'Planning & Engineering',
            'Improvements': 'Development Costs',
            'Improvement': 'Development Costs',
            'Development': 'Development Costs',
            'Operations': 'Operating Costs',
            'Operating': 'Operating Costs',
            'Financing': 'Financing Costs',
            'Finance': 'Financing Costs',
            'Disposition': 'Disposition Costs',
            'Sales': 'Disposition Costs',
        }

        return category_map.get(activity, 'Development Costs')

    def _distribute_budget_item(
        self,
        amount: float,
        start_period: int,
        periods_to_complete: int,
        max_periods: int,
        timing_method: Optional[str],
        curve_steepness: Optional[float],
        inflation_rate: Optional[float]
    ) -> List[Dict]:
        """
        Distribute a budget item across periods.

        Supports:
        - 'lump': All in first period
        - 'distributed': Even distribution
        - 'curve': S-curve distribution
        """
        period_values = []

        if periods_to_complete <= 0:
            periods_to_complete = 1

        end_period = min(start_period + periods_to_complete - 1, max_periods)
        actual_periods = end_period - start_period + 1

        if actual_periods <= 0:
            return period_values

        method = (timing_method or 'distributed').lower()

        if method == 'lump' or actual_periods == 1:
            # All in first period
            inflated = self._apply_inflation(amount, start_period, inflation_rate)
            period_values.append({
                'periodIndex': start_period - 1,
                'periodSequence': start_period,
                'amount': inflated,
                'source': 'budget',
            })

        elif method == 'curve':
            # S-curve distribution
            steepness = curve_steepness or 0.5
            weights = self._calculate_scurve_weights(actual_periods, steepness)

            for i, weight in enumerate(weights):
                period_seq = start_period + i
                period_amount = amount * weight
                inflated = self._apply_inflation(period_amount, period_seq, inflation_rate)

                period_values.append({
                    'periodIndex': period_seq - 1,
                    'periodSequence': period_seq,
                    'amount': inflated,
                    'source': 'budget',
                })

        else:  # distributed
            per_period = amount / actual_periods
            for i in range(actual_periods):
                period_seq = start_period + i
                inflated = self._apply_inflation(per_period, period_seq, inflation_rate)

                period_values.append({
                    'periodIndex': period_seq - 1,
                    'periodSequence': period_seq,
                    'amount': inflated,
                    'source': 'budget',
                })

        return period_values

    def _calculate_scurve_weights(self, period_count: int, steepness: float) -> List[float]:
        """Calculate S-curve distribution weights."""
        if period_count <= 1:
            return [1.0]

        # Ensure steepness is a float
        steepness = float(steepness) if isinstance(steepness, Decimal) else steepness

        # Use logistic function for S-curve
        weights = []
        for i in range(period_count):
            # Map i to range [-6, 6] for logistic function
            x = (i / (period_count - 1)) * 12 - 6
            # Adjust steepness (0.5 = moderate, higher = steeper)
            x *= steepness * 2
            weight = 1 / (1 + np.exp(-x))
            weights.append(weight)

        # Calculate incremental weights (difference between cumulative values)
        incremental = [weights[0]]
        for i in range(1, len(weights)):
            incremental.append(weights[i] - weights[i-1])

        # Normalize to sum to 1
        total = sum(incremental)
        if total > 0:
            incremental = [w / total for w in incremental]

        return incremental

    def _apply_inflation(
        self,
        amount: float,
        period_sequence: int,
        annual_rate: Optional[float]
    ) -> float:
        """Apply inflation to an amount based on period."""
        if not annual_rate or annual_rate == 0:
            return float(amount)

        # Ensure we're working with floats
        amount = float(amount) if isinstance(amount, Decimal) else amount
        annual_rate = float(annual_rate) if isinstance(annual_rate, Decimal) else annual_rate

        # Convert annual rate to monthly compounding
        months_from_start = period_sequence - 1
        factor = (1 + annual_rate) ** (months_from_start / 12)
        return amount * factor

    # =========================================================================
    # REVENUE SCHEDULE (ABSORPTION)
    # =========================================================================

    def _generate_absorption_schedule(
        self,
        start_date: date,
        container_ids: Optional[List[int]],
        price_growth_rate: Optional[float],
        cost_inflation_rate: Optional[float]
    ) -> Dict[str, Any]:
        """
        Generate absorption schedule from parcel sales.

        Returns dict with period sales, totals for gross/net revenue, deductions.
        """
        with connection.cursor() as cursor:
            # Fetch parcels with sale data
            if container_ids:
                cursor.execute("""
                    SELECT
                        p.parcel_id,
                        p.parcel_code,
                        p.project_id,
                        p.area_id,
                        p.phase_id,
                        p.family_name,
                        p.density_code,
                        p.type_code,
                        p.product_code,
                        p.units_total,
                        p.acres_gross,
                        p.lot_width,
                        p.lot_depth,
                        p.lot_area,
                        p.sale_period,
                        p.custom_sale_date,
                        psa.gross_parcel_price,
                        psa.net_sale_proceeds,
                        psa.total_transaction_costs,
                        psa.improvement_offset_total,
                        COALESCE(psa.price_uom, lup.unit_of_measure) AS price_uom,
                        psa.commission_amount,
                        psa.legal_amount,
                        psa.closing_cost_amount,
                        psa.title_insurance_amount
                    FROM landscape.tbl_parcel p
                    LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON p.parcel_id = psa.parcel_id
                    LEFT JOIN LATERAL (
                        SELECT unit_of_measure
                        FROM landscape.land_use_pricing lup
                        WHERE lup.project_id = p.project_id
                          AND lup.lu_type_code = p.type_code
                          AND (lup.product_code = p.product_code OR lup.product_code IS NULL)
                        ORDER BY lup.product_code NULLS LAST
                        LIMIT 1
                    ) lup ON TRUE
                    LEFT JOIN landscape.tbl_phase ph ON p.phase_id = ph.phase_id
                    LEFT JOIN landscape.tbl_division d_phase
                      ON ph.phase_name = d_phase.display_name
                      AND ph.project_id = d_phase.project_id
                      AND d_phase.tier = 2
                    WHERE p.project_id = %s
                      AND d_phase.division_id = ANY(%s)
                      AND (p.units_total > 0 OR p.acres_gross > 0)
                    ORDER BY p.sale_period ASC NULLS LAST, p.parcel_code ASC
                """, [self.project_id, container_ids])
            else:
                cursor.execute("""
                    SELECT
                        p.parcel_id,
                        p.parcel_code,
                        p.project_id,
                        p.area_id,
                        p.phase_id,
                        p.family_name,
                        p.density_code,
                        p.type_code,
                        p.product_code,
                        p.units_total,
                        p.acres_gross,
                        p.lot_width,
                        p.lot_depth,
                        p.lot_area,
                        p.sale_period,
                        p.custom_sale_date,
                        psa.gross_parcel_price,
                        psa.net_sale_proceeds,
                        psa.total_transaction_costs,
                        psa.improvement_offset_total,
                        COALESCE(psa.price_uom, lup.unit_of_measure) AS price_uom,
                        psa.commission_amount,
                        psa.legal_amount,
                        psa.closing_cost_amount,
                        psa.title_insurance_amount
                    FROM landscape.tbl_parcel p
                    LEFT JOIN landscape.tbl_parcel_sale_assumptions psa ON p.parcel_id = psa.parcel_id
                    LEFT JOIN LATERAL (
                        SELECT unit_of_measure
                        FROM landscape.land_use_pricing lup
                        WHERE lup.project_id = p.project_id
                          AND lup.lu_type_code = p.type_code
                          AND (lup.product_code = p.product_code OR lup.product_code IS NULL)
                        ORDER BY lup.product_code NULLS LAST
                        LIMIT 1
                    ) lup ON TRUE
                    WHERE p.project_id = %s
                      AND (p.units_total > 0 OR p.acres_gross > 0)
                    ORDER BY p.sale_period ASC NULLS LAST, p.parcel_code ASC
                """, [self.project_id])

            columns = [col[0] for col in cursor.description]
            parcels = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Process each parcel into sales
        parcel_sales = []
        for parcel in parcels:
            sale = self._calculate_parcel_sale(parcel, start_date, price_growth_rate)
            if sale:
                parcel_sales.append(sale)

        # Group by period
        period_sales_map = {}
        for sale in parcel_sales:
            period_seq = sale['salePeriod']
            if period_seq not in period_sales_map:
                period_sales_map[period_seq] = {
                    'periodIndex': period_seq - 1,
                    'periodSequence': period_seq,
                    'parcels': [],
                    'totalUnits': 0,
                    'totalGrossRevenue': 0.0,
                    'totalNetRevenue': 0.0,
                }

            ps = period_sales_map[period_seq]
            ps['parcels'].append(sale)
            ps['totalUnits'] += sale['units']
            ps['totalGrossRevenue'] += sale['grossRevenue']
            ps['totalNetRevenue'] += sale['netRevenue']

        period_sales = sorted(period_sales_map.values(), key=lambda x: x['periodSequence'])

        # Calculate totals
        total_units = sum(s['units'] for s in parcel_sales)
        total_gross_revenue = sum(s['grossRevenue'] for s in parcel_sales)
        total_net_revenue = sum(s['netRevenue'] for s in parcel_sales)
        total_commissions = sum(s['commissions'] for s in parcel_sales)
        total_closing_costs = sum(s['closingCosts'] for s in parcel_sales)
        total_subdivision_costs = sum(s['subdivisionCosts'] for s in parcel_sales)

        return {
            'projectId': self.project_id,
            'totalUnits': total_units,
            'totalParcels': len(parcel_sales),
            'periodSales': period_sales,
            'totalGrossRevenue': total_gross_revenue,
            'totalNetRevenue': total_net_revenue,
            'totalCommissions': total_commissions,
            'totalClosingCosts': total_closing_costs,
            'totalSubdivisionCosts': total_subdivision_costs,
        }

    def _calculate_parcel_sale(
        self,
        parcel: Dict,
        project_start_date: date,
        price_growth_rate: Optional[float]
    ) -> Optional[Dict]:
        """Calculate revenue for a single parcel sale."""
        sale_period = parcel.get('sale_period')
        if not sale_period:
            return None

        units = float(parcel.get('units_total') or 0)
        acres = float(parcel.get('acres_gross') or 0)
        if units == 0 and acres == 0:
            return None

        # Use precalculated values if available
        gross_price = parcel.get('gross_parcel_price')
        net_proceeds = parcel.get('net_sale_proceeds')

        if gross_price is not None and net_proceeds is not None:
            gross_revenue = float(gross_price)
            net_revenue = float(net_proceeds)

            # Apply price growth/escalation if configured
            # Price grows from project start based on sale period
            if price_growth_rate and price_growth_rate > 0:
                # Calculate years from project start (period 1 = month 0)
                years_from_start = (sale_period - 1) / 12
                escalation_factor = (1 + price_growth_rate) ** years_from_start
                gross_revenue = gross_revenue * escalation_factor
                net_revenue = net_revenue * escalation_factor

            # Get deduction breakdown from database values
            commissions = float(parcel.get('commission_amount') or 0)

            legal = float(parcel.get('legal_amount') or 0)
            closing = float(parcel.get('closing_cost_amount') or 0)
            title = float(parcel.get('title_insurance_amount') or 0)
            closing_costs = legal + closing + title

            # Also escalate deductions if price is escalated
            if price_growth_rate and price_growth_rate > 0:
                years_from_start = (sale_period - 1) / 12
                escalation_factor = (1 + price_growth_rate) ** years_from_start
                commissions = commissions * escalation_factor
                closing_costs = closing_costs * escalation_factor

            uom = (parcel.get('price_uom') or 'EA').replace('$/', '').upper()
            subdivision_costs = float(parcel.get('improvement_offset_total') or 0) if uom == 'FF' else 0
            # Subdivision costs (improvement offsets) are cost-based, not price-based
            # so they don't get price escalation

            return {
                'parcelId': parcel['parcel_id'],
                'parcelCode': parcel['parcel_code'],
                'containerId': parcel.get('phase_id'),
                'salePeriod': sale_period,
                'grossRevenue': gross_revenue,
                'netRevenue': net_revenue,
                'commissions': commissions,
                'closingCosts': closing_costs,
                'subdivisionCosts': subdivision_costs,
                'units': int(units) if units else 1,
            }

        # Fallback: calculate from pricing table (minimal implementation)
        # In practice, parcels should have precalculated values
        return None

    # =========================================================================
    # SECTION BUILDING
    # =========================================================================

    def _build_sections(
        self,
        cost_schedule: Dict,
        absorption_schedule: Dict,
        period_count: int
    ) -> List[Dict]:
        """Build section/row structure for grid display."""
        sections = []
        sort_order = 1

        # Cost sections (grouped by category)
        category_order = [
            'Land Acquisition',
            'Planning & Engineering',
            'Development Costs',
            'Improvement Costs',
            'Operating Costs',
            'Financing Costs',
            'Disposition Costs',
            'Contingency',
            'Other Costs',
        ]

        for category in category_order:
            if category not in cost_schedule['categorySummary']:
                continue

            cat_data = cost_schedule['categorySummary'][category]

            line_items = []
            for item in cat_data['items']:
                line_items.append({
                    'lineId': f"cost-{item['factId']}",
                    'category': 'cost',
                    'subcategory': category,
                    'description': item['description'],
                    'containerId': item.get('containerId'),
                    'containerLabel': item.get('containerLabel'),
                    'periods': [
                        {**pv, 'amount': -pv['amount']}  # Costs are negative
                        for pv in item['periods']
                    ],
                    'total': -item['totalAmount'],  # Costs are negative
                    'sourceType': 'budget',
                })

            # Calculate section subtotals
            subtotals = self._calculate_subtotals(line_items, period_count)

            sections.append({
                'sectionId': f"cost-{category.lower().replace(' ', '-').replace('&', 'and')}",
                'sectionName': category.upper(),
                'lineItems': line_items,
                'subtotals': subtotals,
                'sectionTotal': -cat_data['total'],
                'sortOrder': sort_order,
            })
            sort_order += 1

        # Revenue sections
        # Group by container (phase)
        revenue_by_container = {}
        for period_sale in absorption_schedule['periodSales']:
            for parcel in period_sale['parcels']:
                container_id = parcel.get('containerId')
                if container_id not in revenue_by_container:
                    revenue_by_container[container_id] = {
                        'grossRevenue': 0.0,
                        'netRevenue': 0.0,
                        'commissions': 0.0,
                        'closingCosts': 0.0,
                        'subdivisionCosts': 0.0,
                        'periodValues': {},
                    }

                rbc = revenue_by_container[container_id]
                rbc['grossRevenue'] += parcel['grossRevenue']
                rbc['netRevenue'] += parcel['netRevenue']
                rbc['commissions'] += parcel['commissions']
                rbc['closingCosts'] += parcel['closingCosts']
                rbc['subdivisionCosts'] += parcel['subdivisionCosts']

                period_idx = period_sale['periodIndex']
                if period_idx not in rbc['periodValues']:
                    rbc['periodValues'][period_idx] = {
                        'gross': 0.0,
                        'net': 0.0,
                        'commissions': 0.0,
                        'closingCosts': 0.0,
                        'subdivisionCosts': 0.0,
                    }
                pv = rbc['periodValues'][period_idx]
                pv['gross'] += parcel['grossRevenue']
                pv['net'] += parcel['netRevenue']
                pv['commissions'] += parcel['commissions']
                pv['closingCosts'] += parcel['closingCosts']
                pv['subdivisionCosts'] += parcel['subdivisionCosts']

        # Fetch container labels
        container_labels = self._fetch_container_labels(list(revenue_by_container.keys()))

        # Gross Revenue section
        gross_line_items = []
        for container_id, data in revenue_by_container.items():
            periods = [
                {
                    'periodIndex': idx,
                    'periodSequence': idx + 1,
                    'amount': vals['gross'],
                    'source': 'absorption',
                }
                for idx, vals in sorted(data['periodValues'].items())
            ]

            gross_line_items.append({
                'lineId': f"revenue-gross-{container_id or 'project'}",
                'category': 'revenue',
                'subcategory': 'Parcel Sales',
                'description': container_labels.get(container_id, 'Project Level'),
                'containerId': container_id,
                'containerLabel': container_labels.get(container_id),
                'periods': periods,
                'total': data['grossRevenue'],
                'sourceType': 'parcel',
            })

        gross_subtotals = self._calculate_subtotals(gross_line_items, period_count)
        sections.append({
            'sectionId': 'revenue-gross',
            'sectionName': 'GROSS REVENUE',
            'lineItems': gross_line_items,
            'subtotals': gross_subtotals,
            'sectionTotal': absorption_schedule['totalGrossRevenue'],
            'sortOrder': sort_order,
        })
        sort_order += 1

        # Revenue Deductions section
        deduction_line_items = []

        # Aggregate deductions by period
        period_deductions = {}
        for container_id, data in revenue_by_container.items():
            for period_idx, vals in data['periodValues'].items():
                if period_idx not in period_deductions:
                    period_deductions[period_idx] = {'commissions': 0.0, 'closingCosts': 0.0, 'subdivisionCosts': 0.0}
                period_deductions[period_idx]['commissions'] += vals['commissions']
                period_deductions[period_idx]['closingCosts'] += vals['closingCosts']
                period_deductions[period_idx]['subdivisionCosts'] += vals['subdivisionCosts']

        # Commissions
        if absorption_schedule['totalCommissions'] > 0:
            comm_periods = [
                {
                    'periodIndex': idx,
                    'periodSequence': idx + 1,
                    'amount': -vals['commissions'],
                    'source': 'calculated',
                }
                for idx, vals in sorted(period_deductions.items())
                if vals['commissions'] > 0
            ]
            deduction_line_items.append({
                'lineId': 'revenue-deduction-commissions',
                'category': 'revenue',
                'subcategory': 'Revenue Deductions',
                'description': 'Commissions',
                'periods': comm_periods,
                'total': -absorption_schedule['totalCommissions'],
                'sourceType': 'calculated',
            })

        # Transaction Costs (closing costs)
        if absorption_schedule['totalClosingCosts'] > 0:
            closing_periods = [
                {
                    'periodIndex': idx,
                    'periodSequence': idx + 1,
                    'amount': -vals['closingCosts'],
                    'source': 'calculated',
                }
                for idx, vals in sorted(period_deductions.items())
                if vals['closingCosts'] > 0
            ]
            deduction_line_items.append({
                'lineId': 'revenue-deduction-transaction-costs',
                'category': 'revenue',
                'subcategory': 'Revenue Deductions',
                'description': 'Transaction Costs',
                'periods': closing_periods,
                'total': -absorption_schedule['totalClosingCosts'],
                'sourceType': 'calculated',
            })

        # Subdivision Costs
        if absorption_schedule['totalSubdivisionCosts'] > 0:
            subdiv_periods = [
                {
                    'periodIndex': idx,
                    'periodSequence': idx + 1,
                    'amount': -vals['subdivisionCosts'],
                    'source': 'calculated',
                }
                for idx, vals in sorted(period_deductions.items())
                if vals['subdivisionCosts'] > 0
            ]
            deduction_line_items.append({
                'lineId': 'revenue-deduction-subdivision',
                'category': 'revenue',
                'subcategory': 'Revenue Deductions',
                'description': 'Subdivision Costs',
                'periods': subdiv_periods,
                'total': -absorption_schedule['totalSubdivisionCosts'],
                'sourceType': 'calculated',
            })

        total_deductions = (
            absorption_schedule['totalCommissions'] +
            absorption_schedule['totalClosingCosts'] +
            absorption_schedule['totalSubdivisionCosts']
        )
        deduction_subtotals = self._calculate_subtotals(deduction_line_items, period_count)

        sections.append({
            'sectionId': 'revenue-deductions',
            'sectionName': 'REVENUE DEDUCTIONS',
            'lineItems': deduction_line_items,
            'subtotals': deduction_subtotals,
            'sectionTotal': -total_deductions,
            'sortOrder': sort_order,
        })
        sort_order += 1

        # Net Revenue section
        net_line_items = []
        for container_id, data in revenue_by_container.items():
            periods = [
                {
                    'periodIndex': idx,
                    'periodSequence': idx + 1,
                    'amount': vals['net'],
                    'source': 'calculated',
                }
                for idx, vals in sorted(data['periodValues'].items())
            ]

            net_line_items.append({
                'lineId': f"revenue-net-{container_id or 'project'}",
                'category': 'revenue',
                'subcategory': 'Net Revenue',
                'description': container_labels.get(container_id, 'Project Level'),
                'containerId': container_id,
                'containerLabel': container_labels.get(container_id),
                'periods': periods,
                'total': data['netRevenue'],
                'sourceType': 'calculated',
            })

        net_subtotals = self._calculate_subtotals(net_line_items, period_count)
        sections.append({
            'sectionId': 'revenue-net',
            'sectionName': 'NET REVENUE',
            'lineItems': net_line_items,
            'subtotals': net_subtotals,
            'sectionTotal': absorption_schedule['totalNetRevenue'],
            'sortOrder': sort_order,
        })

        return sections

    # =========================================================================
    # FINANCING SECTION
    # =========================================================================

    def _build_financing_section(
        self,
        cost_schedule: Dict,
        absorption_schedule: Dict,
        periods: List[Dict],
        container_ids: Optional[List[int]],
    ) -> Optional[Dict]:
        """Build financing section from loan schedules (revolvers and term loans)."""
        revolver_loans = self._fetch_loans(structure_type='REVOLVER', container_ids=container_ids)
        term_loans = self._fetch_loans(structure_type='TERM', container_ids=container_ids)

        if not revolver_loans and not term_loans:
            return None

        period_data = self._build_period_costs_for_financing(
            cost_schedule,
            absorption_schedule,
            periods,
        )

        engine = DebtServiceEngine()
        line_items = []
        period_count = len(periods)

        for loan in revolver_loans:
            if loan.takes_out_loan_id:
                raise NotImplementedError(
                    f"Loan {loan.loan_id} has takes_out_loan_id; take-out logic not implemented."
                )

            params = self._build_revolver_params(loan, periods)
            revolver_result = engine.calculate_revolver(params, period_data)

            period_amounts = []
            total_amount = 0.0
            for period in revolver_result.periods:
                amount = (
                    period.cost_draw
                    - period.accrued_interest
                    + period.interest_reserve_draw
                    - period.release_payments
                    - period.origination_cost
                )
                if amount != 0:
                    period_amounts.append({
                        'periodIndex': period.period_index,
                        'periodSequence': period.period_index + 1,
                        'amount': amount,
                        'source': 'calculated',
                    })
                total_amount += amount

            line_items.append({
                'lineId': f"financing-loan-{loan.loan_id}",
                'category': 'financing',
                'subcategory': 'Debt Service',
                'description': loan.loan_name,
                'periods': period_amounts,
                'total': total_amount,
                'sourceType': 'debt',
            })

        for loan in term_loans:
            if loan.takes_out_loan_id:
                raise NotImplementedError(
                    f"Loan {loan.loan_id} has takes_out_loan_id; take-out logic not implemented."
                )

            params = self._build_term_params(loan, periods)
            term_result = engine.calculate_term(params, period_count)
            initial_net_proceeds = self._resolve_net_loan_proceeds(loan, params.loan_amount)

            period_amounts = []
            total_amount = 0.0
            for period in term_result.periods:
                amount = 0.0
                if period.period_index == params.loan_start_period:
                    amount += initial_net_proceeds

                amount -= period.scheduled_payment
                if period.is_balloon and period.balloon_amount:
                    amount -= period.balloon_amount

                if amount != 0:
                    period_amounts.append({
                        'periodIndex': period.period_index,
                        'periodSequence': period.period_index + 1,
                        'amount': amount,
                        'source': 'calculated',
                    })
                total_amount += amount

            line_items.append({
                'lineId': f"financing-loan-{loan.loan_id}",
                'category': 'financing',
                'subcategory': 'Debt Service',
                'description': loan.loan_name,
                'periods': period_amounts,
                'total': total_amount,
                'sourceType': 'debt',
            })

        subtotals = self._calculate_subtotals(line_items, period_count)
        section_total = sum(item['total'] for item in line_items)

        return {
            'sectionId': 'financing',
            'sectionName': 'FINANCING',
            'lineItems': line_items,
            'subtotals': subtotals,
            'sectionTotal': section_total,
            'sortOrder': 99,
        }

    def _build_revolver_params(self, loan: Loan, periods: List[Dict]) -> RevolverLoanParams:
        """Translate Loan model to revolver parameters for calculation engine."""
        loan_term_months = self._normalize_term_months(loan.loan_term_months, loan.loan_term_years)
        loan_start_period = self._get_period_index_for_date(periods, loan.loan_start_date)

        closing_costs = (
            float(loan.closing_costs_appraisal or 0)
            + float(loan.closing_costs_legal or 0)
            + float(loan.closing_costs_other or 0)
        )

        return RevolverLoanParams(
            loan_to_cost_pct=float(loan.loan_to_cost_pct or 0) / 100.0,
            interest_rate_annual=float(loan.interest_rate_pct or 0) / 100.0,
            origination_fee_pct=float(loan.origination_fee_pct or 0) / 100.0,
            interest_reserve_inflator=float(loan.interest_reserve_inflator or 1.0),
            repayment_acceleration=float(loan.repayment_acceleration or 1.0),
            release_price_pct=float(loan.release_price_pct or 0) / 100.0,
            release_price_minimum=float(loan.minimum_release_amount or 0),
            closing_costs=closing_costs,
            loan_start_period=loan_start_period,
            loan_term_months=loan_term_months or len(periods),
            draw_trigger_type=loan.draw_trigger_type,
        )

    def _build_term_params(self, loan: Loan, periods: List[Dict]) -> TermLoanParams:
        """Translate Loan model to term parameters for calculation engine."""
        loan_term_months = self._normalize_term_months(loan.loan_term_months, loan.loan_term_years)
        loan_start_period = self._get_period_index_for_date(periods, loan.loan_start_date)

        amort_months = self._normalize_term_months(loan.amortization_months, loan.amortization_years)

        return TermLoanParams(
            loan_amount=float(loan.loan_amount or loan.commitment_amount or 0),
            interest_rate_annual=float(loan.interest_rate_pct or 0) / 100.0,
            amortization_months=amort_months or 0,
            interest_only_months=int(loan.interest_only_months or 0),
            loan_term_months=loan_term_months or len(periods),
            origination_fee_pct=float(loan.origination_fee_pct or 0) / 100.0,
            loan_start_period=loan_start_period,
            payment_frequency=loan.payment_frequency or 'MONTHLY',
        )

    @staticmethod
    def _resolve_net_loan_proceeds(loan: Loan, loan_amount: float) -> float:
        if loan.net_loan_proceeds is not None:
            return float(loan.net_loan_proceeds)

        origination_fee = loan_amount * (float(loan.origination_fee_pct or 0) / 100.0)
        interest_reserve = float(loan.interest_reserve_amount or 0)
        closing_costs = (
            float(loan.closing_costs_appraisal or 0)
            + float(loan.closing_costs_legal or 0)
            + float(loan.closing_costs_other or 0)
        )
        return loan_amount - origination_fee - interest_reserve - closing_costs

    def _build_period_costs_for_financing(
        self,
        cost_schedule: Dict,
        absorption_schedule: Dict,
        periods: List[Dict],
    ) -> List[PeriodCosts]:
        """Build PeriodCosts inputs for the debt service engine."""
        period_count = len(periods)
        period_totals = cost_schedule.get('periodTotals', [])

        phase_ids = set()
        for period_sale in absorption_schedule.get('periodSales', []):
            for parcel in period_sale.get('parcels', []):
                phase_id = parcel.get('containerId')
                if phase_id:
                    phase_ids.add(phase_id)

        phase_to_division = self._fetch_phase_division_mapping(list(phase_ids))

        lots_by_period: Dict[int, Dict[int, int]] = {}
        total_lots_by_division: Dict[int, int] = {}

        for period_sale in absorption_schedule.get('periodSales', []):
            period_idx = period_sale.get('periodIndex')
            if period_idx is None:
                continue
            for parcel in period_sale.get('parcels', []):
                phase_id = parcel.get('containerId')
                division_id = phase_to_division.get(phase_id)
                if division_id is None:
                    continue
                units = int(parcel.get('units') or 0)
                if units <= 0:
                    continue
                lots_by_period.setdefault(period_idx, {})
                lots_by_period[period_idx][division_id] = lots_by_period[period_idx].get(division_id, 0) + units
                total_lots_by_division[division_id] = total_lots_by_division.get(division_id, 0) + units

        total_costs_by_division: Dict[int, float] = {}
        for category in cost_schedule.get('categorySummary', {}).values():
            for item in category.get('items', []):
                container_id = item.get('containerId')
                if container_id is None:
                    continue
                total_costs_by_division[container_id] = total_costs_by_division.get(container_id, 0.0) + float(
                    item.get('totalAmount') or 0
                )

        total_costs_overall = float(cost_schedule.get('totalCosts') or 0)
        total_lots_overall = sum(total_lots_by_division.values())
        default_cost_per_lot = total_costs_overall / total_lots_overall if total_lots_overall else 0.0

        cost_per_lot_by_division: Dict[int, float] = {}
        for division_id, lot_count in total_lots_by_division.items():
            if lot_count <= 0:
                cost_per_lot_by_division[division_id] = 0.0
                continue
            total_cost = total_costs_by_division.get(division_id)
            if total_cost is None or total_cost == 0:
                cost_per_lot_by_division[division_id] = default_cost_per_lot
            else:
                cost_per_lot_by_division[division_id] = total_cost / lot_count

        period_data: List[PeriodCosts] = []
        for idx in range(period_count):
            period = periods[idx]
            period_data.append(
                PeriodCosts(
                    period_index=idx,
                    date=period['endDate'].isoformat() if period.get('endDate') else '',
                    total_costs=float(period_totals[idx]) if idx < len(period_totals) else 0.0,
                    lots_sold_by_product=lots_by_period.get(idx, {}),
                    cost_per_lot_by_product=cost_per_lot_by_division,
                )
            )

        return period_data

    def _fetch_phase_division_mapping(self, phase_ids: List[int]) -> Dict[int, int]:
        """Map phase_id to division_id (tier 2) for product grouping."""
        if not phase_ids:
            return {}

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT ph.phase_id, d.division_id
                FROM landscape.tbl_phase ph
                LEFT JOIN landscape.tbl_division d
                  ON ph.phase_name = d.display_name
                  AND ph.project_id = d.project_id
                  AND d.tier = 2
                WHERE ph.phase_id = ANY(%s)
            """, [phase_ids])

            return {row[0]: row[1] for row in cursor.fetchall() if row[1] is not None}

    def _extend_periods_for_loans(
        self,
        required_periods: int,
        start_date: date,
        container_ids: Optional[List[int]],
    ) -> int:
        """Ensure enough periods to cover all loan terms when financing is included."""
        all_loans = list(Loan.objects.filter(project_id=self.project_id))
        if container_ids:
            scoped_ids = set(
                LoanContainer.objects.filter(
                    loan__project_id=self.project_id,
                    division_id__in=container_ids,
                ).values_list('loan_id', flat=True)
            )
            # Include unscoped loans (no container assignment) plus scoped ones
            unscoped = [l for l in all_loans if not LoanContainer.objects.filter(loan_id=l.loan_id).exists()]
            scoped = [l for l in all_loans if l.loan_id in scoped_ids]
            all_loans = unscoped + scoped

        if not all_loans:
            return required_periods

        # Generate a minimal set of periods for date mapping
        temp_periods = self._generate_periods(start_date, max(required_periods, 1))

        for loan in all_loans:
            term_months = self._normalize_term_months(loan.loan_term_months, loan.loan_term_years) or 0
            loan_start = self._get_period_index_for_date(temp_periods, loan.loan_start_date)
            min_periods = loan_start + term_months + 1
            if min_periods > required_periods:
                required_periods = min_periods
                # Regenerate temp periods for subsequent date lookups
                temp_periods = self._generate_periods(start_date, required_periods)

        return required_periods

    def _fetch_loans(self, structure_type: str, container_ids: Optional[List[int]]) -> List[Loan]:
        """Fetch loans for project, optionally filtered by container assignments."""
        loans = Loan.objects.filter(project_id=self.project_id, structure_type=structure_type)
        if container_ids:
            loans = loans.filter(loan_containers__division_id__in=container_ids).distinct()
        return list(loans)

    @staticmethod
    def _get_period_index_for_date(periods: List[Dict], target_date: Optional[date]) -> int:
        """Map a date to the first period index whose endDate >= target_date."""
        if not target_date:
            return 0
        for idx, period in enumerate(periods):
            end_date = period.get('endDate')
            if end_date and end_date >= target_date:
                return idx
        return max(len(periods) - 1, 0)

    @staticmethod
    def _normalize_term_months(months: Optional[int], years: Optional[int]) -> Optional[int]:
        if months:
            return int(months)
        if years:
            return int(years) * 12
        return None

    def _calculate_subtotals(self, line_items: List[Dict], period_count: int) -> List[Dict]:
        """Calculate subtotals for a set of line items."""
        period_totals = [0.0] * period_count

        for item in line_items:
            for pv in item.get('periods', []):
                idx = pv['periodIndex']
                if 0 <= idx < period_count:
                    period_totals[idx] += pv['amount']

        return [
            {
                'periodIndex': i,
                'periodSequence': i + 1,
                'amount': period_totals[i],
                'source': 'calculated',
            }
            for i in range(period_count)
            if period_totals[i] != 0
        ]

    def _fetch_container_labels(self, container_ids: List[Optional[int]]) -> Dict[int, str]:
        """Fetch phase names for container IDs."""
        valid_ids = [cid for cid in container_ids if cid is not None]
        if not valid_ids:
            return {}

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT phase_id, phase_name
                FROM landscape.tbl_phase
                WHERE phase_id = ANY(%s)
            """, [valid_ids])

            return {row[0]: row[1] for row in cursor.fetchall()}

    # =========================================================================
    # LOTBANK SECTION
    # =========================================================================

    def _build_lotbank_sections(
        self,
        absorption_schedule: Dict,
        periods: List[Dict],
        container_ids: Optional[List[int]],
    ) -> List[Dict]:
        """
        Build lotbank sections when project analysis_type = 'LOTBANK'.

        Returns a list of sections (OPTION_DEPOSITS, DEPOSIT_CREDITS,
        MANAGEMENT_FEES, DEFAULT_PROVISION, UNDERWRITING_FEE) or empty
        list if the project is not a lotbank deal.
        """
        # Check if this project is a lotbank deal
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT analysis_type,
                       lotbank_management_fee_pct,
                       lotbank_default_provision_pct,
                       lotbank_underwriting_fee
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()

        if not row or (row[0] or '').upper() != 'LOTBANK':
            return []

        management_fee_pct = float(row[1]) if row[1] else 0.0
        default_provision_pct = float(row[2]) if row[2] else 0.0
        underwriting_fee = float(row[3]) if row[3] else 0.0

        # Fetch product-level lotbank params from containers (divisions)
        products = self._build_lotbank_products(absorption_schedule, periods, container_ids)
        if not products:
            return []

        num_periods = len(periods)
        params = LotbankParams(
            products=products,
            management_fee_pct=management_fee_pct,
            default_provision_pct=default_provision_pct,
            underwriting_fee=underwriting_fee,
            num_periods=num_periods,
        )

        engine = LotbankEngine()
        result = engine.calculate(params)

        sections = []

        # ── OPTION DEPOSITS section (P0 inflow) ────────────────────
        deposit_line_items = []
        if result.initial_deposit_received > 0:
            deposit_line_items.append({
                'lineId': 'lotbank-option-deposits',
                'category': 'lotbank',
                'subcategory': 'Option Deposits',
                'description': 'Builder Option Deposits Received',
                'periods': [{
                    'periodIndex': 0,
                    'periodSequence': 1,
                    'amount': result.initial_deposit_received,
                    'source': 'calculated',
                }],
                'total': result.initial_deposit_received,
                'sourceType': 'lotbank',
            })
            subtotals = self._calculate_subtotals(deposit_line_items, num_periods)
            sections.append({
                'sectionId': 'lotbank-option-deposits',
                'sectionName': 'OPTION DEPOSITS',
                'lineItems': deposit_line_items,
                'subtotals': subtotals,
                'sectionTotal': result.initial_deposit_received,
                'sortOrder': 93,
            })

        # ── DEPOSIT CREDITS section (ongoing outflows) ──────────────
        credit_line_items = []
        for product in products:
            period_amounts = []
            product_total = 0.0
            for lp in result.periods:
                for pd in lp.product_details:
                    if pd.product_id == product.product_id and pd.deposit_credit > 0:
                        amount = -pd.deposit_credit  # negative = outflow
                        period_amounts.append({
                            'periodIndex': lp.period,
                            'periodSequence': lp.period + 1,
                            'amount': amount,
                            'source': 'calculated',
                        })
                        product_total += amount

            if period_amounts:
                credit_line_items.append({
                    'lineId': f'lotbank-deposit-credit-{product.product_id}',
                    'category': 'lotbank',
                    'subcategory': 'Deposit Credits',
                    'description': f'Deposit Credit — Product {product.product_id}',
                    'periods': period_amounts,
                    'total': product_total,
                    'sourceType': 'lotbank',
                })

        if credit_line_items:
            credit_total = sum(item['total'] for item in credit_line_items)
            subtotals = self._calculate_subtotals(credit_line_items, num_periods)
            sections.append({
                'sectionId': 'lotbank-deposit-credits',
                'sectionName': 'DEPOSIT CREDITS',
                'lineItems': credit_line_items,
                'subtotals': subtotals,
                'sectionTotal': credit_total,
                'sortOrder': 94,
            })

        # ── UNDERWRITING FEE section (P0 inflow to lotbanker) ───────
        if underwriting_fee > 0:
            uw_line_items = [{
                'lineId': 'lotbank-underwriting-fee',
                'category': 'lotbank',
                'subcategory': 'Underwriting Fee',
                'description': 'Lotbank Underwriting Fee',
                'periods': [{
                    'periodIndex': 0,
                    'periodSequence': 1,
                    'amount': -underwriting_fee,  # negative = outflow (cost to project)
                    'source': 'calculated',
                }],
                'total': -underwriting_fee,
                'sourceType': 'lotbank',
            }]
            subtotals = self._calculate_subtotals(uw_line_items, num_periods)
            sections.append({
                'sectionId': 'lotbank-underwriting-fee',
                'sectionName': 'UNDERWRITING FEE',
                'lineItems': uw_line_items,
                'subtotals': subtotals,
                'sectionTotal': -underwriting_fee,
                'sortOrder': 95,
            })

        # ── MANAGEMENT FEES section (ongoing outflows) ──────────────
        if result.total_management_fees > 0:
            fee_periods = []
            fee_total = 0.0
            for lp in result.periods:
                if lp.management_fee > 0:
                    amount = -lp.management_fee  # negative = outflow
                    fee_periods.append({
                        'periodIndex': lp.period,
                        'periodSequence': lp.period + 1,
                        'amount': amount,
                        'source': 'calculated',
                    })
                    fee_total += amount

            mgmt_line_items = [{
                'lineId': 'lotbank-management-fees',
                'category': 'lotbank',
                'subcategory': 'Management Fees',
                'description': 'Lotbank Management Fees',
                'periods': fee_periods,
                'total': fee_total,
                'sourceType': 'lotbank',
            }]
            subtotals = self._calculate_subtotals(mgmt_line_items, num_periods)
            sections.append({
                'sectionId': 'lotbank-management-fees',
                'sectionName': 'MANAGEMENT FEES',
                'lineItems': mgmt_line_items,
                'subtotals': subtotals,
                'sectionTotal': fee_total,
                'sortOrder': 96,
            })

        # ── DEFAULT PROVISION section (ongoing outflows) ────────────
        if result.total_default_provision > 0:
            prov_periods = []
            prov_total = 0.0
            for lp in result.periods:
                if lp.default_provision > 0:
                    amount = -lp.default_provision  # negative = outflow
                    prov_periods.append({
                        'periodIndex': lp.period,
                        'periodSequence': lp.period + 1,
                        'amount': amount,
                        'source': 'calculated',
                    })
                    prov_total += amount

            prov_line_items = [{
                'lineId': 'lotbank-default-provision',
                'category': 'lotbank',
                'subcategory': 'Default Provision',
                'description': 'Builder Default Provision',
                'periods': prov_periods,
                'total': prov_total,
                'sourceType': 'lotbank',
            }]
            subtotals = self._calculate_subtotals(prov_line_items, num_periods)
            sections.append({
                'sectionId': 'lotbank-default-provision',
                'sectionName': 'DEFAULT PROVISION',
                'lineItems': prov_line_items,
                'subtotals': subtotals,
                'sectionTotal': prov_total,
                'sortOrder': 97,
            })

        return sections

    def _build_lotbank_products(
        self,
        absorption_schedule: Dict,
        periods: List[Dict],
        container_ids: Optional[List[int]],
    ) -> List[LotbankProduct]:
        """
        Build LotbankProduct list from container-level lotbank params
        and the absorption schedule.

        Reads option_deposit_pct, option_deposit_cap_pct, retail_lot_price,
        premium_pct from tbl_division for each division. Derives
        lots_remaining_by_period from the absorption schedule.
        """
        # Fetch divisions with lotbank fields
        with connection.cursor() as cursor:
            sql = """
                SELECT division_id, display_name,
                       option_deposit_pct, option_deposit_cap_pct,
                       retail_lot_price, premium_pct
                FROM landscape.tbl_division
                WHERE project_id = %s
                  AND tier = 1
                  AND option_deposit_pct IS NOT NULL
                  AND retail_lot_price IS NOT NULL
            """
            params_list = [self.project_id]
            if container_ids:
                sql += " AND division_id = ANY(%s)"
                params_list.append(container_ids)
            cursor.execute(sql, params_list)
            rows = cursor.fetchall()

        if not rows:
            return []

        # Build division-level lot count and lots_sold_by_period from absorption
        num_periods = len(periods)
        products = []

        for row in rows:
            div_id, div_name, dep_pct, cap_pct, price, prem_pct = row

            # Calculate total lot count and lots sold per period for this division
            total_lots = 0
            lots_sold_by_period = [0] * num_periods

            for period_sale in absorption_schedule.get('periodSales', []):
                period_idx = period_sale.get('periodIndex')
                if period_idx is None or period_idx >= num_periods:
                    continue
                for parcel in period_sale.get('parcels', []):
                    parcel_div_id = parcel.get('containerId')
                    if parcel_div_id == div_id:
                        units = int(parcel.get('units') or 0)
                        lots_sold_by_period[period_idx] += units

            # Total lots = sum of all lots sold over all periods
            total_lots = sum(lots_sold_by_period)
            if total_lots <= 0:
                continue

            # Derive lots_remaining: start with total_lots, subtract cumulative sales
            lots_remaining = []
            remaining = total_lots
            for sold in lots_sold_by_period:
                remaining -= sold
                lots_remaining.append(remaining)

            products.append(LotbankProduct(
                product_id=div_id,
                lot_count=total_lots,
                retail_lot_price=float(price),
                deposit_pct=float(dep_pct),
                deposit_cap_pct=float(cap_pct),
                premium_pct=float(prem_pct) if prem_pct else 0.0,
                lots_remaining_by_period=lots_remaining,
            ))

        return products

    # =========================================================================
    # SUMMARY METRICS
    # =========================================================================

    def _calculate_summary_metrics(
        self,
        sections: List[Dict],
        periods: List[Dict],
        absorption_schedule: Dict,
        cost_schedule: Dict,
        discount_rate: Optional[float]
    ) -> Dict[str, Any]:
        """Calculate IRR, NPV, equity multiple, peak equity, etc."""

        # Revenue summary
        total_gross_revenue = absorption_schedule['totalGrossRevenue']
        total_commissions = absorption_schedule['totalCommissions']
        total_closing_costs = absorption_schedule['totalClosingCosts']
        total_subdivision_costs = absorption_schedule['totalSubdivisionCosts']
        total_deductions = total_commissions + total_closing_costs + total_subdivision_costs
        total_net_revenue = absorption_schedule['totalNetRevenue']

        # Cost summary by category
        costs_by_category = {
            'acquisition': 0.0,
            'planning': 0.0,
            'development': 0.0,
            'soft': 0.0,
            'financing': 0.0,
            'contingency': 0.0,
            'other': 0.0,
        }

        for category, data in cost_schedule['categorySummary'].items():
            cat_upper = category.upper()
            if 'ACQUISITION' in cat_upper:
                costs_by_category['acquisition'] += data['total']
            elif 'PLANNING' in cat_upper or 'ENGINEERING' in cat_upper:
                costs_by_category['planning'] += data['total']
            elif 'IMPROVEMENT' in cat_upper or 'DEVELOPMENT' in cat_upper:
                costs_by_category['development'] += data['total']
            elif 'FINANCING' in cat_upper:
                costs_by_category['financing'] += data['total']
            elif 'CONTINGENCY' in cat_upper:
                costs_by_category['contingency'] += data['total']
            else:
                costs_by_category['other'] += data['total']

        total_costs = cost_schedule['totalCosts']

        # Gross profit
        gross_profit = total_net_revenue - total_costs
        gross_margin = gross_profit / total_net_revenue if total_net_revenue > 0 else 0

        # Build net cash flow array for IRR/NPV
        period_count = len(periods)
        net_cash_flows = self._build_net_cash_flow_array(sections, period_count)

        # Aggregate to annual for IRR (to match Excel methodology)
        annual_cash_flows = self._aggregate_to_annual(net_cash_flows, periods)

        # Calculate IRR using numpy-financial
        irr = None
        if len(annual_cash_flows) >= 2:
            try:
                irr_result = npf.irr(annual_cash_flows)
                if not np.isnan(irr_result):
                    irr = float(irr_result)
            except Exception:
                pass

        # Calculate NPV if discount rate provided
        npv = None
        if discount_rate and discount_rate > 0:
            try:
                # Convert annual rate to monthly for discounting
                monthly_rate = (1 + discount_rate) ** (1/12) - 1
                npv_result = npf.npv(monthly_rate, net_cash_flows)
                if not np.isnan(npv_result):
                    npv = float(npv_result)
            except Exception:
                pass

        # Equity analysis
        total_cash_in = sum(cf for cf in net_cash_flows if cf > 0)
        total_cash_out = abs(sum(cf for cf in net_cash_flows if cf < 0))
        equity_multiple = total_cash_in / total_cash_out if total_cash_out > 0 else None

        # Peak equity and payback
        cumulative = []
        running_sum = 0
        peak_equity = 0
        payback_period = None

        for i, cf in enumerate(net_cash_flows):
            running_sum += cf
            cumulative.append(running_sum)
            if running_sum < peak_equity:
                peak_equity = running_sum
            if payback_period is None and running_sum >= 0:
                payback_period = i

        return {
            'totalGrossRevenue': round(total_gross_revenue, 2),
            'totalRevenueDeductions': round(total_deductions, 2),
            'totalNetRevenue': round(total_net_revenue, 2),
            'totalSubdivisionCosts': round(total_subdivision_costs, 2),
            'totalCommissions': round(total_commissions, 2),
            'totalTransactionCosts': round(total_closing_costs, 2),
            'totalCosts': round(total_costs, 2),
            'costsByCategory': costs_by_category,
            'grossProfit': round(gross_profit, 2),
            'grossMargin': round(gross_margin, 6),
            'irr': round(irr, 6) if irr is not None else None,
            'npv': round(npv, 2) if npv is not None else None,
            'equityMultiple': round(equity_multiple, 4) if equity_multiple is not None else None,
            'peakEquity': round(abs(peak_equity), 2),
            'paybackPeriod': payback_period,
            'totalCashIn': round(total_cash_in, 2),
            'totalCashOut': round(total_cash_out, 2),
            'netCashFlow': round(total_cash_in - total_cash_out, 2),
            'cumulativeCashFlow': [round(c, 2) for c in cumulative],
        }

    def _build_net_cash_flow_array(self, sections: List[Dict], period_count: int) -> List[float]:
        """Build net cash flow array from sections."""
        cash_flows = [0.0] * period_count

        for section in sections:
            # Include costs and net revenue (not gross revenue or deductions separately)
            for item in section.get('lineItems', []):
                # Skip gross revenue and individual deductions - we use net revenue
                if item.get('subcategory') == 'Parcel Sales':
                    continue
                if item.get('subcategory') == 'Revenue Deductions':
                    continue

                for pv in item.get('periods', []):
                    idx = pv['periodIndex']
                    if 0 <= idx < period_count:
                        cash_flows[idx] += pv['amount']

        return cash_flows

    def _aggregate_to_annual(self, monthly_cash_flows: List[float], periods: List[Dict]) -> List[float]:
        """
        Aggregate monthly cash flows to annual for IRR calculation.

        Groups by calendar year based on period start dates.
        """
        if not monthly_cash_flows:
            return []

        yearly_totals = {}

        for i, cf in enumerate(monthly_cash_flows):
            if i < len(periods):
                # Get year from period's start date
                start_date = periods[i].get('startDate')
                if isinstance(start_date, str):
                    year = int(start_date[:4])
                else:
                    year = start_date.year
                yearly_totals[year] = yearly_totals.get(year, 0) + cf

        sorted_years = sorted(yearly_totals.keys())
        return [yearly_totals[year] for year in sorted_years]
