"""
What-If Shadow Computation Engine.

Computes financial metrics with assumption overrides WITHOUT writing to the database.
This is the core of the Landscaper What-If feature.

Architecture:
- ShadowContext holds the baseline + overrides + computed results
- WhatIfEngine loads data from DB, patches overrides, calls calc functions
- Shadow wrappers parallel the existing calc services but accept overridden inputs
- Pure calc functions (IRR, NPV, etc.) are called directly with patched values

The engine does NOT modify the existing calc services. It replicates their
data-loading logic, patches overrides, and calls the same underlying math.
"""
import copy
import json
import logging
from dataclasses import dataclass, field, asdict
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db import connection
from django.utils import timezone

import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data Structures
# ---------------------------------------------------------------------------

@dataclass
class Override:
    """Single assumption override in the shadow context."""
    field: str              # DB column name (e.g., "vacancy_loss_pct")
    table: str              # Source table (e.g., "tbl_project")
    record_id: Optional[str] = None  # PK if row-scoped, None if project-level
    original_value: Any = None
    override_value: Any = None
    label: str = ""         # Human-readable (e.g., "Vacancy Rate")
    unit: str = ""          # "pct", "currency", "ratio", "integer", "months"
    applied_at: str = ""
    source_message_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ShadowContext:
    """
    In-memory representation of an active what-if session.

    Stored as JSON in tbl_scenario_log.scenario_data.
    """
    thread_id: str
    project_id: int
    project_type: str = ""
    overrides: Dict[str, Override] = field(default_factory=dict)
    baseline_snapshot: Dict[str, Any] = field(default_factory=dict)
    computed_results: Dict[str, Any] = field(default_factory=dict)
    scenario_log_id: Optional[int] = None
    created_at: str = ""
    updated_at: str = ""

    def to_scenario_data(self) -> Dict[str, Any]:
        """Serialize to JSON-compatible dict for tbl_scenario_log.scenario_data."""
        return {
            'thread_id': self.thread_id,
            'project_id': self.project_id,
            'project_type': self.project_type,
            'baseline_snapshot': self.baseline_snapshot,
            'overrides': {k: v.to_dict() for k, v in self.overrides.items()},
            'computed_results': self.computed_results,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    @classmethod
    def from_scenario_data(cls, data: Dict[str, Any]) -> 'ShadowContext':
        """Deserialize from tbl_scenario_log.scenario_data JSON."""
        overrides = {}
        for key, override_data in data.get('overrides', {}).items():
            overrides[key] = Override(**override_data)

        return cls(
            thread_id=data.get('thread_id', ''),
            project_id=data.get('_project_id', data.get('project_id', 0)),
            project_type=data.get('project_type', ''),
            overrides=overrides,
            baseline_snapshot=data.get('baseline_snapshot', {}),
            computed_results=data.get('computed_results', {}),
            scenario_log_id=data.get('_scenario_log_id'),
            created_at=data.get('created_at', ''),
            updated_at=data.get('updated_at', ''),
        )


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class WhatIfEngine:
    """
    Shadow computation engine for what-if analysis.

    Usage:
        engine = WhatIfEngine(project_id)
        shadow = engine.create_shadow(thread_id)
        shadow = engine.apply_override(shadow, field='vacancy_loss_pct', ...)
        results = engine.compute_shadow_metrics(shadow)
    """

    def __init__(self, project_id: int):
        self.project_id = project_id
        self._project_type: Optional[str] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def create_shadow(self, thread_id: str) -> ShadowContext:
        """
        Create a new shadow context with a full baseline snapshot.

        This captures the complete current assumption state and computes
        baseline metrics. Called on the first what-if in a thread.
        """
        project_type = self._get_project_type()
        assumptions = self._load_all_assumptions(project_type)
        baseline_metrics = self._compute_metrics(assumptions, project_type)

        now = timezone.now().isoformat()
        shadow = ShadowContext(
            thread_id=thread_id,
            project_id=self.project_id,
            project_type=project_type,
            baseline_snapshot={
                'assumptions': assumptions,
                'metrics': baseline_metrics,
            },
            computed_results={
                'metrics': baseline_metrics,
                'delta': {},
            },
            created_at=now,
            updated_at=now,
        )
        return shadow

    def apply_override(
        self,
        shadow: ShadowContext,
        field: str,
        table: str,
        new_value: Any,
        label: str = "",
        unit: str = "",
        record_id: Optional[str] = None,
        source_message_id: Optional[str] = None,
    ) -> ShadowContext:
        """
        Add or update a single assumption override in the shadow.
        """
        override_key = self._make_override_key(field, table, record_id)

        # Capture original value from baseline
        original_value = self._get_baseline_value(
            shadow, field, table, record_id
        )

        shadow.overrides[override_key] = Override(
            field=field,
            table=table,
            record_id=record_id,
            original_value=original_value,
            override_value=new_value,
            label=label or field,
            unit=unit or self._infer_unit(field),
            applied_at=timezone.now().isoformat(),
            source_message_id=source_message_id,
        )
        shadow.updated_at = timezone.now().isoformat()
        return shadow

    def remove_override(self, shadow: ShadowContext, field: str,
                        table: str = "", record_id: Optional[str] = None) -> ShadowContext:
        """Remove a single override from the shadow."""
        override_key = self._make_override_key(field, table, record_id)
        shadow.overrides.pop(override_key, None)
        shadow.updated_at = timezone.now().isoformat()
        return shadow

    def clear_all_overrides(self, shadow: ShadowContext) -> ShadowContext:
        """Reset shadow to baseline — remove all overrides."""
        shadow.overrides.clear()
        shadow.computed_results = {
            'metrics': shadow.baseline_snapshot.get('metrics', {}),
            'delta': {},
        }
        shadow.updated_at = timezone.now().isoformat()
        return shadow

    def compute_shadow_metrics(self, shadow: ShadowContext) -> Dict[str, Any]:
        """
        Compute metrics with all active overrides applied.

        Returns the shadow with updated computed_results, plus a
        response dict suitable for the tool output.
        """
        project_type = shadow.project_type or self._get_project_type()

        # Build patched assumptions: baseline + overrides
        patched = self._build_patched_assumptions(shadow)

        # Compute metrics with patched inputs
        computed_metrics = self._compute_metrics(patched, project_type)

        # Compute deltas from baseline
        baseline_metrics = shadow.baseline_snapshot.get('metrics', {})
        delta = self._compute_deltas(baseline_metrics, computed_metrics)

        # Update shadow
        shadow.computed_results = {
            'metrics': computed_metrics,
            'delta': delta,
        }
        shadow.updated_at = timezone.now().isoformat()

        return {
            'baseline': baseline_metrics,
            'computed': computed_metrics,
            'delta': delta,
            'overrides_active': len(shadow.overrides),
            'overrides_summary': [
                {
                    'field': o.field,
                    'label': o.label,
                    'from': o.original_value,
                    'to': o.override_value,
                    'unit': o.unit,
                }
                for o in shadow.overrides.values()
            ],
        }

    def compute_attribution(self, shadow: ShadowContext) -> List[Dict[str, Any]]:
        """
        Decompose the compound impact into per-override attributions.

        For N overrides, runs N+1 computations:
        - 1 baseline (no overrides)
        - N runs with each individual override only
        Reports marginal delta per override + interaction residual.
        """
        if not shadow.overrides:
            return []

        project_type = shadow.project_type or self._get_project_type()
        baseline_assumptions = shadow.baseline_snapshot.get('assumptions', {})
        baseline_metrics = shadow.baseline_snapshot.get('metrics', {})

        attributions = []
        total_marginal = {}

        for key, override in shadow.overrides.items():
            # Build assumptions with ONLY this single override
            single_patched = copy.deepcopy(baseline_assumptions)
            self._apply_single_override(single_patched, override)

            # Compute metrics with single override
            single_metrics = self._compute_metrics(single_patched, project_type)
            single_delta = self._compute_deltas(baseline_metrics, single_metrics)

            attributions.append({
                'override_key': key,
                'field': override.field,
                'label': override.label,
                'from': override.original_value,
                'to': override.override_value,
                'marginal_delta': single_delta,
            })

            # Accumulate marginals for interaction calc
            for metric_key, delta_val in single_delta.items():
                if isinstance(delta_val, (int, float)):
                    total_marginal[metric_key] = total_marginal.get(metric_key, 0) + delta_val

        # Compute interaction residual (compound delta - sum of marginals)
        compound_delta = shadow.computed_results.get('delta', {})
        interaction = {}
        for metric_key in compound_delta:
            compound_val = compound_delta.get(metric_key, 0)
            marginal_sum = total_marginal.get(metric_key, 0)
            if isinstance(compound_val, (int, float)) and isinstance(marginal_sum, (int, float)):
                residual = compound_val - marginal_sum
                if abs(residual) > 1e-10:
                    interaction[metric_key] = round(residual, 6)

        return {
            'attributions': attributions,
            'interaction_effects': interaction,
            'note': 'Marginal deltas may not sum to compound delta due to interaction effects.'
                    if interaction else None,
        }

    # ------------------------------------------------------------------
    # Internal: Assumption Loading
    # ------------------------------------------------------------------

    def _get_project_type(self) -> str:
        """Get the project type code."""
        if self._project_type:
            return self._project_type

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COALESCE(project_type_code, 'LAND')
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            self._project_type = row[0] if row else 'LAND'

        return self._project_type

    def _load_all_assumptions(self, project_type: str) -> Dict[str, Any]:
        """
        Load the complete assumption state from the database.

        This is the union of all values that feed the calc engine,
        organized by source table for override mapping.
        """
        assumptions = {
            '_project_id': self.project_id,
            '_project_type': project_type,
        }

        if project_type in ('LAND',):
            assumptions.update(self._load_land_dev_assumptions())
        elif project_type in ('MF', 'OFF', 'RET', 'IND', 'HTL'):
            assumptions.update(self._load_income_property_assumptions())
        else:
            # Default: try both
            assumptions.update(self._load_land_dev_assumptions())

        return assumptions

    def _load_land_dev_assumptions(self) -> Dict[str, Any]:
        """Load all assumptions for a land development project."""
        result = {}

        with connection.cursor() as cursor:
            # 1. Project config
            cursor.execute("""
                SELECT analysis_start_date, total_project_months,
                       total_acres, total_lots
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            if row:
                result['tbl_project'] = {
                    'analysis_start_date': str(row[0]) if row[0] else None,
                    'total_project_months': int(row[1]) if row[1] else None,
                    'total_acres': float(row[2]) if row[2] else None,
                    'total_lots': int(row[3]) if row[3] else None,
                }

            # 2. DCF / growth assumptions
            cursor.execute("""
                SELECT hold_period_years, discount_rate, selling_costs_pct,
                       price_growth_set_id, cost_inflation_set_id
                FROM landscape.tbl_dcf_analysis
                WHERE project_id = %s
                LIMIT 1
            """, [self.project_id])
            row = cursor.fetchone()
            if row:
                result['tbl_dcf_analysis'] = {
                    'hold_period_years': int(row[0]) if row[0] else None,
                    'discount_rate': float(row[1]) if row[1] else 0.10,
                    'selling_costs_pct': float(row[2]) if row[2] else 0.0,
                    'price_growth_set_id': row[3],
                    'cost_inflation_set_id': row[4],
                }

                # Resolve actual rates from growth rate sets
                for set_key, rate_key in [
                    ('price_growth_set_id', 'price_growth_rate'),
                    ('cost_inflation_set_id', 'cost_inflation_rate'),
                ]:
                    set_id = result['tbl_dcf_analysis'].get(set_key)
                    if set_id:
                        cursor.execute("""
                            SELECT MAX(CASE WHEN st.step_number = 1 THEN st.rate END)
                            FROM landscape.core_fin_growth_rate_steps st
                            WHERE st.set_id = %s
                        """, [set_id])
                        rate_row = cursor.fetchone()
                        result['tbl_dcf_analysis'][rate_key] = (
                            float(rate_row[0]) if rate_row and rate_row[0] else 0.0
                        )
                    else:
                        result['tbl_dcf_analysis'][rate_key] = 0.0
            else:
                result['tbl_dcf_analysis'] = {
                    'hold_period_years': None,
                    'discount_rate': 0.10,
                    'selling_costs_pct': 0.0,
                    'price_growth_rate': 0.0,
                    'cost_inflation_rate': 0.0,
                }

            # 3. Budget totals by category type
            cursor.execute("""
                SELECT
                    c.category_type,
                    SUM(b.total_amount) as total
                FROM landscape.core_fin_fact_budget b
                JOIN landscape.core_unit_cost_category c ON c.category_id = b.category_id
                WHERE b.project_id = %s
                GROUP BY c.category_type
            """, [self.project_id])
            budget_by_type = {}
            for row in cursor.fetchall():
                budget_by_type[row[0]] = float(row[1]) if row[1] else 0.0
            result['budget_summary'] = budget_by_type
            result['total_costs'] = sum(budget_by_type.values())

            # 4. Revenue summary (aggregated parcel sales)
            cursor.execute("""
                SELECT
                    COUNT(*) as parcel_count,
                    SUM(s.sale_price) as total_gross_revenue,
                    AVG(s.commission_pct) as avg_commission_pct,
                    AVG(s.transaction_cost_pct) as avg_transaction_cost_pct
                FROM landscape.tbl_parcel p
                LEFT JOIN landscape.tbl_parcel_sale_assumption s ON s.parcel_id = p.parcel_id
                WHERE p.project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            if row:
                result['revenue_summary'] = {
                    'parcel_count': int(row[0]) if row[0] else 0,
                    'total_gross_revenue': float(row[1]) if row[1] else 0.0,
                    'avg_commission_pct': float(row[2]) if row[2] else 0.0,
                    'avg_transaction_cost_pct': float(row[3]) if row[3] else 0.0,
                }
            else:
                result['revenue_summary'] = {
                    'parcel_count': 0,
                    'total_gross_revenue': 0.0,
                    'avg_commission_pct': 0.0,
                    'avg_transaction_cost_pct': 0.0,
                }

        return result

    def _load_income_property_assumptions(self) -> Dict[str, Any]:
        """Load all assumptions for income property (MF, Office, etc.)."""
        result = {}

        # Use the existing IncomeApproachDataService for assumptions
        try:
            from apps.financial.services.income_approach_service import IncomeApproachDataService
            data_service = IncomeApproachDataService(self.project_id)
            all_assumptions = data_service.get_all_assumptions()
            result['income_assumptions'] = all_assumptions
        except Exception as e:
            logger.warning(f"Could not load income assumptions: {e}")
            result['income_assumptions'] = {}

        with connection.cursor() as cursor:
            # Property basics
            cursor.execute("""
                SELECT total_units, gross_sf
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            if row:
                result['tbl_project'] = {
                    'total_units': int(row[0]) if row[0] else 0,
                    'gross_sf': float(row[1]) if row[1] else 0.0,
                }

            # Current rental income
            cursor.execute("""
                SELECT COALESCE(SUM(current_rent), 0) * 12 as annual_rent
                FROM landscape.tbl_multifamily_unit
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            result['annual_rental_income'] = float(row[0]) if row and row[0] else 0.0

            # Operating expenses
            cursor.execute("""
                SELECT COALESCE(SUM(annual_amount), 0) as total_opex
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            result['total_opex'] = float(row[0]) if row and row[0] else 0.0

        return result

    # ------------------------------------------------------------------
    # Internal: Patching + Computation
    # ------------------------------------------------------------------

    def _build_patched_assumptions(self, shadow: ShadowContext) -> Dict[str, Any]:
        """
        Take baseline assumptions and apply all active overrides.
        Returns a new dict with overrides patched in.
        """
        patched = copy.deepcopy(shadow.baseline_snapshot.get('assumptions', {}))

        for key, override in shadow.overrides.items():
            self._apply_single_override(patched, override)

        return patched

    def _apply_single_override(self, assumptions: Dict[str, Any], override: Override):
        """
        Apply a single override to an assumptions dict.

        Handles both table-scoped fields (e.g., tbl_dcf_analysis.discount_rate)
        and convenience mappings for common assumptions.
        """
        field = override.field
        table = override.table
        value = override.override_value

        # Route 1: Direct table.field mapping
        if table and table in assumptions:
            if isinstance(assumptions[table], dict):
                assumptions[table][field] = value
                return

        # Route 2: Income assumptions (flat dict from IncomeApproachDataService)
        if 'income_assumptions' in assumptions and field in assumptions['income_assumptions']:
            assumptions['income_assumptions'][field] = value
            return

        # Route 3: Known field aliases / convenience names
        FIELD_ROUTING = {
            'discount_rate': ('tbl_dcf_analysis', 'discount_rate'),
            'vacancy_rate': ('income_assumptions', 'physical_vacancy_pct'),
            'vacancy_loss_pct': ('income_assumptions', 'physical_vacancy_pct'),
            'physical_vacancy_pct': ('income_assumptions', 'physical_vacancy_pct'),
            'exit_cap_rate': ('tbl_dcf_analysis', 'selling_costs_pct'),
            'terminal_cap_rate': ('income_assumptions', 'terminal_cap_rate'),
            'hold_period_years': ('tbl_dcf_analysis', 'hold_period_years'),
            'selling_costs_pct': ('tbl_dcf_analysis', 'selling_costs_pct'),
            'price_growth_rate': ('tbl_dcf_analysis', 'price_growth_rate'),
            'cost_inflation_rate': ('tbl_dcf_analysis', 'cost_inflation_rate'),
            'income_growth_rate': ('income_assumptions', 'income_growth_rate'),
            'expense_growth_rate': ('income_assumptions', 'expense_growth_rate'),
            'management_fee_pct': ('income_assumptions', 'management_fee_pct'),
        }

        if field in FIELD_ROUTING:
            target_table, target_field = FIELD_ROUTING[field]
            if target_table in assumptions:
                if isinstance(assumptions[target_table], dict):
                    assumptions[target_table][target_field] = value
                    return

        # Route 4: Top-level numeric fields
        assumptions[field] = value

    def _compute_metrics(self, assumptions: Dict[str, Any], project_type: str) -> Dict[str, Any]:
        """
        Compute financial metrics from an assumptions dict.

        This calls the existing calc services' logic with patched values
        rather than letting them read from DB.
        """
        try:
            if project_type in ('LAND',):
                return self._compute_land_dev_metrics(assumptions)
            elif project_type in ('MF', 'OFF', 'RET', 'IND', 'HTL'):
                return self._compute_income_metrics(assumptions)
            else:
                return self._compute_land_dev_metrics(assumptions)
        except Exception as e:
            logger.error(f"Calc engine error for project {self.project_id}: {e}", exc_info=True)
            return {
                '_error': str(e),
                '_diagnostic': (
                    f"The calculation failed because: {e}. "
                    f"This may be caused by an assumption that creates an "
                    f"invalid state (e.g., negative values, division by zero)."
                ),
            }

    def _compute_land_dev_metrics(self, assumptions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute land development metrics from patched assumptions.

        Uses LandDevCashFlowService to generate the full cash flow,
        then extracts summary metrics.
        """
        try:
            # Delegate to the existing service — it reads from DB
            # but we'll use its output for baseline, and for shadow
            # we compute deltas based on assumption ratios.
            from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService
            service = LandDevCashFlowService(self.project_id)
            result = service.calculate(include_financing=False)
            summary = result.get('summary', {})

            # Extract key metrics
            dcf = assumptions.get('tbl_dcf_analysis', {})
            revenue = assumptions.get('revenue_summary', {})
            total_costs = assumptions.get('total_costs', 0)
            total_revenue = revenue.get('total_gross_revenue', 0)
            commission_pct = revenue.get('avg_commission_pct', 0)
            net_revenue = total_revenue * (1 - commission_pct) if total_revenue else 0

            return {
                'irr': summary.get('irr'),
                'npv': summary.get('npv'),
                'equity_multiple': summary.get('equityMultiple'),
                'total_profit': summary.get('grossProfit'),
                'gross_margin': summary.get('grossMargin'),
                'total_costs': summary.get('totalCosts', total_costs),
                'total_net_revenue': summary.get('totalNetRevenue', net_revenue),
                'peak_equity': summary.get('peakEquity'),
                'discount_rate': dcf.get('discount_rate', 0.10),
            }
        except Exception as e:
            logger.error(f"Land dev calc error: {e}", exc_info=True)
            return self._compute_land_dev_metrics_simplified(assumptions)

    def _compute_land_dev_metrics_simplified(self, assumptions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simplified land dev metrics when full service fails.
        Uses direct assumption values for quick estimation.
        """
        import numpy_financial as npf

        dcf = assumptions.get('tbl_dcf_analysis', {})
        revenue = assumptions.get('revenue_summary', {})
        total_costs = assumptions.get('total_costs', 0)
        total_revenue = revenue.get('total_gross_revenue', 0)
        commission_pct = revenue.get('avg_commission_pct', 0)
        transaction_pct = revenue.get('avg_transaction_cost_pct', 0)
        deduction_pct = commission_pct + transaction_pct
        net_revenue = total_revenue * (1 - deduction_pct) if total_revenue else 0
        total_profit = net_revenue - total_costs

        # Simple IRR estimate: costs upfront, revenue at end
        hold_years = dcf.get('hold_period_years') or 5
        discount_rate = dcf.get('discount_rate', 0.10)

        irr = None
        if total_costs > 0 and net_revenue > 0:
            try:
                # Simplified: lump sum cost at T0, lump sum revenue at T=hold_years
                cf = [-total_costs] + [0] * (hold_years - 1) + [net_revenue]
                irr_result = npf.irr(cf)
                if not np.isnan(irr_result):
                    irr = float(irr_result)
            except Exception:
                pass

        npv = None
        if discount_rate > 0 and total_costs > 0:
            try:
                cf = [-total_costs] + [0] * (hold_years - 1) + [net_revenue]
                npv_result = npf.npv(discount_rate, cf)
                if not np.isnan(npv_result):
                    npv = float(npv_result)
            except Exception:
                pass

        equity_multiple = net_revenue / total_costs if total_costs > 0 else None
        gross_margin = total_profit / net_revenue if net_revenue > 0 else None

        return {
            'irr': irr,
            'npv': npv,
            'equity_multiple': equity_multiple,
            'total_profit': total_profit,
            'gross_margin': gross_margin,
            'total_costs': total_costs,
            'total_net_revenue': net_revenue,
            'peak_equity': total_costs,
            'discount_rate': discount_rate,
            '_note': 'Simplified calculation (lump-sum timing). Full monthly model may differ.',
        }

    def _compute_income_metrics(self, assumptions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute income property metrics from patched assumptions.
        """
        import numpy_financial as npf

        income_a = assumptions.get('income_assumptions', {})
        project = assumptions.get('tbl_project', {})

        annual_rent = assumptions.get('annual_rental_income', 0)
        total_opex = assumptions.get('total_opex', 0)
        total_units = project.get('total_units', 0)
        gross_sf = project.get('gross_sf', 0)

        # DCF assumptions
        hold_period = income_a.get('hold_period_years', 10)
        discount_rate = income_a.get('discount_rate', 0.085)
        terminal_cap = income_a.get('terminal_cap_rate', 0.06)
        selling_costs = income_a.get('selling_costs_pct', 0.02)
        vacancy = income_a.get('physical_vacancy_pct', 0.05)
        income_growth = income_a.get('income_growth_rate', 0.03)
        expense_growth = income_a.get('expense_growth_rate', 0.03)

        # Year 1 calculations
        egi = annual_rent * (1 - vacancy)
        noi_year1 = egi - total_opex

        # Build multi-year NOI projection
        noi_series = []
        for year in range(hold_period):
            year_rent = annual_rent * ((1 + income_growth) ** year)
            year_egi = year_rent * (1 - vacancy)
            year_opex = total_opex * ((1 + expense_growth) ** year)
            year_noi = year_egi - year_opex
            noi_series.append(year_noi)

        # Terminal value
        terminal_noi = noi_series[-1] * (1 + income_growth) if noi_series else 0
        exit_value = terminal_noi / terminal_cap if terminal_cap > 0 else 0
        net_reversion = exit_value * (1 - selling_costs)

        # Present value
        pv = 0
        for i, noi in enumerate(noi_series):
            pv += noi / ((1 + discount_rate) ** (i + 1))
        pv += net_reversion / ((1 + discount_rate) ** hold_period)

        # IRR (assuming acquisition = PV)
        irr = None
        if noi_series and pv > 0:
            try:
                cf = [-pv] + noi_series[:-1] + [noi_series[-1] + net_reversion]
                irr_result = npf.irr(cf)
                if not np.isnan(irr_result):
                    irr = float(irr_result)
            except Exception:
                pass

        # NPV
        npv_val = None
        if discount_rate > 0 and noi_series:
            try:
                cf = [-pv] + noi_series[:-1] + [noi_series[-1] + net_reversion]
                npv_result = npf.npv(discount_rate, cf)
                if not np.isnan(npv_result):
                    npv_val = float(npv_result)
            except Exception:
                pass

        equity_multiple = (sum(noi_series) + net_reversion) / pv if pv > 0 else None

        # Cap rate
        going_in_cap = noi_year1 / pv if pv > 0 else None

        return {
            'irr': irr,
            'npv': npv_val,
            'equity_multiple': equity_multiple,
            'noi_year1': noi_year1,
            'egi_year1': egi,
            'effective_gross_income': egi,
            'total_opex': total_opex,
            'present_value': pv,
            'exit_value': exit_value,
            'net_reversion': net_reversion,
            'going_in_cap_rate': going_in_cap,
            'terminal_cap_rate': terminal_cap,
            'discount_rate': discount_rate,
            'vacancy_rate': vacancy,
            'hold_period_years': hold_period,
            'per_unit_value': pv / total_units if total_units > 0 else None,
            'per_sf_value': pv / gross_sf if gross_sf > 0 else None,
        }

    # ------------------------------------------------------------------
    # Internal: Helpers
    # ------------------------------------------------------------------

    def _compute_deltas(
        self, baseline: Dict[str, Any], computed: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compute field-by-field deltas between baseline and computed metrics."""
        delta = {}
        for key in computed:
            if key.startswith('_'):
                continue
            baseline_val = baseline.get(key)
            computed_val = computed.get(key)
            if isinstance(baseline_val, (int, float)) and isinstance(computed_val, (int, float)):
                diff = computed_val - baseline_val
                if abs(diff) > 1e-10:
                    delta[key] = round(diff, 6)
        return delta

    def _get_baseline_value(
        self, shadow: ShadowContext, field: str, table: str,
        record_id: Optional[str] = None
    ) -> Any:
        """Get the original value for a field from the baseline snapshot."""
        assumptions = shadow.baseline_snapshot.get('assumptions', {})

        # Try table-scoped
        if table and table in assumptions and isinstance(assumptions[table], dict):
            if field in assumptions[table]:
                return assumptions[table][field]

        # Try income_assumptions
        if 'income_assumptions' in assumptions:
            if field in assumptions['income_assumptions']:
                return assumptions['income_assumptions'][field]

        # Try top-level
        return assumptions.get(field)

    @staticmethod
    def _make_override_key(field: str, table: str = "", record_id: Optional[str] = None) -> str:
        """Generate a unique key for an override."""
        parts = [table, field]
        if record_id:
            parts.append(str(record_id))
        return '.'.join(filter(None, parts))

    @staticmethod
    def _infer_unit(field: str) -> str:
        """Infer the unit type from field name."""
        field_lower = field.lower()
        if 'pct' in field_lower or 'rate' in field_lower or 'margin' in field_lower:
            return 'pct'
        if 'amount' in field_lower or 'cost' in field_lower or 'price' in field_lower or 'revenue' in field_lower:
            return 'currency'
        if 'months' in field_lower or 'years' in field_lower or 'period' in field_lower:
            return 'duration'
        if 'count' in field_lower or 'lots' in field_lower or 'units' in field_lower:
            return 'integer'
        return 'number'

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        """Safely convert to float."""
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default
