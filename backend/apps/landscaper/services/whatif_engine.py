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
import math
import re
from datetime import date
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
            # 1. DCF / growth assumptions. The DCF hold period is the
            # canonical planning horizon; tbl_project has no
            # total_project_months column in the live schema.
            cursor.execute("""
                SELECT hold_period_years, discount_rate, selling_costs_pct,
                       price_growth_set_id, cost_inflation_set_id
                FROM landscape.tbl_dcf_analysis
                WHERE project_id = %s
                LIMIT 1
            """, [self.project_id])
            row = cursor.fetchone()
            if row:
                hold_period_years = int(row[0]) if row[0] else None
                result['tbl_dcf_analysis'] = {
                    'hold_period_years': hold_period_years,
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
                hold_period_years = None
                result['tbl_dcf_analysis'] = {
                    'hold_period_years': None,
                    'discount_rate': 0.10,
                    'selling_costs_pct': 0.0,
                    'price_growth_rate': 0.0,
                    'cost_inflation_rate': 0.0,
                }

            # 2. Project config
            cursor.execute("""
                SELECT analysis_start_date, analysis_end_date,
                       acres_gross, total_units, target_units
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            if row:
                total_project_months = self._derive_total_project_months(
                    hold_period_years=hold_period_years,
                    analysis_start_date=row[0],
                    analysis_end_date=row[1],
                )
                result['tbl_project'] = {
                    'analysis_start_date': str(row[0]) if row[0] else None,
                    'analysis_end_date': str(row[1]) if row[1] else None,
                    'total_project_months': total_project_months,
                    'total_acres': float(row[2]) if row[2] else None,
                    'total_lots': int(row[3] or row[4] or 0) or None,
                }

            # 3. Budget totals by category type
            cursor.execute("""
                SELECT
                    COALESCE(NULLIF(b.activity, ''), c.category_name, 'Uncategorized') AS category_type,
                    SUM(b.amount) as total
                FROM landscape.core_fin_fact_budget b
                LEFT JOIN landscape.core_unit_cost_category c ON c.category_id = b.category_id
                WHERE b.project_id = %s
                  AND b.amount IS NOT NULL
                GROUP BY COALESCE(NULLIF(b.activity, ''), c.category_name, 'Uncategorized')
            """, [self.project_id])
            budget_by_type = {}
            for row in cursor.fetchall():
                budget_by_type[row[0]] = float(row[1]) if row[1] else 0.0
            result['budget_summary'] = budget_by_type
            result['total_costs'] = sum(budget_by_type.values())

            cursor.execute("""
                SELECT
                    b.fact_id,
                    COALESCE(NULLIF(b.activity, ''), c.category_name, 'Uncategorized') AS category,
                    b.amount,
                    b.start_period,
                    b.periods_to_complete,
                    b.end_period,
                    b.escalation_rate
                FROM landscape.core_fin_fact_budget b
                LEFT JOIN landscape.core_unit_cost_category c ON c.category_id = b.category_id
                WHERE b.project_id = %s
                  AND b.amount IS NOT NULL
                  AND b.amount <> 0
                ORDER BY b.start_period NULLS LAST, b.fact_id
            """, [self.project_id])
            cost_columns = [col[0] for col in cursor.description]
            cost_schedule = [
                {key: self._json_safe(value) for key, value in dict(zip(cost_columns, row)).items()}
                for row in cursor.fetchall()
            ]

            # 4. Revenue summary (aggregated parcel sales)
            cursor.execute("""
                SELECT
                    COUNT(*) as parcel_count,
                    SUM(COALESCE(s.gross_sale_proceeds, s.gross_parcel_price, 0)) as total_gross_revenue,
                    SUM(COALESCE(s.net_sale_proceeds, s.gross_sale_proceeds, s.gross_parcel_price, 0)) as total_net_revenue,
                    SUM(COALESCE(s.commission_amount, 0)) as total_commissions,
                    SUM(
                        COALESCE(s.legal_amount, 0) +
                        COALESCE(s.closing_cost_amount, 0) +
                        COALESCE(s.title_insurance_amount, 0)
                    ) as total_transaction_costs
                FROM landscape.tbl_parcel p
                LEFT JOIN landscape.tbl_parcel_sale_assumptions s ON s.parcel_id = p.parcel_id
                WHERE p.project_id = %s
            """, [self.project_id])
            row = cursor.fetchone()
            if row:
                total_gross = float(row[1]) if row[1] else 0.0
                total_net = float(row[2]) if row[2] else 0.0
                total_commissions = float(row[3]) if row[3] else 0.0
                total_transaction_costs = float(row[4]) if row[4] else 0.0
                result['revenue_summary'] = {
                    'parcel_count': int(row[0]) if row[0] else 0,
                    'total_gross_revenue': total_gross,
                    'total_net_revenue': total_net,
                    'avg_commission_pct': total_commissions / total_gross if total_gross else 0.0,
                    'avg_transaction_cost_pct': total_transaction_costs / total_gross if total_gross else 0.0,
                }
            else:
                result['revenue_summary'] = {
                    'parcel_count': 0,
                    'total_gross_revenue': 0.0,
                    'total_net_revenue': 0.0,
                    'avg_commission_pct': 0.0,
                    'avg_transaction_cost_pct': 0.0,
                }

            cursor.execute("""
                SELECT
                    s.assumption_id,
                    p.parcel_id,
                    p.parcel_code,
                    p.phase_id,
                    p.sale_period,
                    p.custom_sale_date,
                    p.units_total,
                    p.acres_gross,
                    COALESCE(s.gross_sale_proceeds, s.gross_parcel_price, 0) AS gross_revenue,
                    COALESCE(s.net_sale_proceeds, s.gross_sale_proceeds, s.gross_parcel_price, 0) AS net_revenue,
                    COALESCE(s.commission_amount, 0) AS commissions,
                    COALESCE(s.legal_amount, 0) +
                        COALESCE(s.closing_cost_amount, 0) +
                        COALESCE(s.title_insurance_amount, 0) AS transaction_costs,
                    COALESCE(s.improvement_offset_total, 0) AS subdivision_costs
                FROM landscape.tbl_parcel p
                LEFT JOIN landscape.tbl_parcel_sale_assumptions s ON s.parcel_id = p.parcel_id
                WHERE p.project_id = %s
                  AND p.sale_period IS NOT NULL
                  AND COALESCE(s.net_sale_proceeds, s.gross_sale_proceeds, s.gross_parcel_price, 0) <> 0
                ORDER BY p.sale_period, p.parcel_id
            """, [self.project_id])
            sale_columns = [col[0] for col in cursor.description]
            parcel_sales = [
                {key: self._json_safe(value) for key, value in dict(zip(sale_columns, row)).items()}
                for row in cursor.fetchall()
            ]

            cursor.execute("""
                SELECT units_per_period, total_units, start_period, periods_to_complete
                FROM landscape.tbl_absorption_schedule
                WHERE project_id = %s
                ORDER BY
                    CASE WHEN LOWER(COALESCE(scenario_name, '')) = 'base case' THEN 0 ELSE 1 END,
                    absorption_id
                LIMIT 1
            """, [self.project_id])
            row = cursor.fetchone()
            absorption_summary = {
                'units_per_period': float(row[0]) if row and row[0] is not None else None,
                'total_units': float(row[1]) if row and row[1] is not None else None,
                'start_period': int(row[2]) if row and row[2] is not None else None,
                'periods_to_complete': int(row[3]) if row and row[3] is not None else None,
            }

        land_model = {
            'discount_rate': result.get('tbl_dcf_analysis', {}).get('discount_rate', 0.10),
            'hold_period_years': result.get('tbl_dcf_analysis', {}).get('hold_period_years'),
            'analysis_start_date': result.get('tbl_project', {}).get('analysis_start_date'),
            'total_project_months': result.get('tbl_project', {}).get('total_project_months'),
            'cost_schedule': cost_schedule,
            'parcel_sales': parcel_sales,
            'absorption_summary': absorption_summary,
        }
        land_model['total_project_months'] = land_model['total_project_months'] or self._derive_horizon_from_model(land_model)
        result['tbl_project']['total_project_months'] = land_model['total_project_months']
        result['land_model'] = land_model
        result['_baseline_land_model'] = copy.deepcopy(land_model)
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

    @staticmethod
    def _derive_total_project_months(
        hold_period_years: Optional[int],
        analysis_start_date: Any = None,
        analysis_end_date: Any = None,
    ) -> Optional[int]:
        """Derive the project horizon from real fields in priority order."""
        if hold_period_years:
            try:
                months = int(hold_period_years) * 12
                if months > 0:
                    return months
            except (TypeError, ValueError):
                pass

        start = WhatIfEngine._coerce_date(analysis_start_date)
        end = WhatIfEngine._coerce_date(analysis_end_date)
        if start and end and end >= start:
            return max((end.year - start.year) * 12 + (end.month - start.month) + 1, 1)
        return None

    @staticmethod
    def _coerce_date(value: Any) -> Optional[date]:
        if value is None:
            return None
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return date.fromisoformat(value.split("T")[0])
            except ValueError:
                return None
        return None

    @classmethod
    def _derive_horizon_from_model(cls, model: Dict[str, Any]) -> int:
        max_period = 1
        for item in model.get('cost_schedule', []):
            start = int(item.get('start_period') or 1)
            duration = int(item.get('periods_to_complete') or 1)
            explicit_end = item.get('end_period')
            end = int(explicit_end) if explicit_end else start + duration - 1
            max_period = max(max_period, end)
        for sale in model.get('parcel_sales', []):
            max_period = max(max_period, int(sale.get('sale_period') or 1))
        absorption = model.get('absorption_summary', {})
        if absorption.get('start_period') and absorption.get('periods_to_complete'):
            max_period = max(
                max_period,
                int(absorption['start_period']) + int(absorption['periods_to_complete']) - 1,
            )
        return max_period

    @staticmethod
    def _json_safe(value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, date):
            return value.isoformat()
        return value

    @staticmethod
    def _pct_or_ratio_factor(value: Any, unit: str = "") -> Optional[float]:
        try:
            raw = float(value)
        except (TypeError, ValueError):
            return None

        unit = (unit or "").lower()
        if unit == 'pct':
            factor = 1 + (raw / 100.0 if abs(raw) > 1 else raw)
        elif unit == 'ratio':
            factor = raw
        elif -100 < raw < 100 and raw != 0:
            # Scenario prompts often pass -10 for "10% below plan".
            factor = 1 + raw / 100.0 if raw < 0 else raw
        else:
            factor = raw
        return factor if factor > 0 else None

    @staticmethod
    def _append_adjustment(assumptions: Dict[str, Any], adjustment: Dict[str, Any]) -> None:
        assumptions.setdefault('_scenario_adjustments', []).append(adjustment)

    def _refresh_land_revenue_summary(self, assumptions: Dict[str, Any]) -> None:
        sales = assumptions.get('land_model', {}).get('parcel_sales', [])
        gross = sum(float(s.get('gross_revenue') or 0) for s in sales)
        net = sum(float(s.get('net_revenue') or 0) for s in sales)
        commissions = sum(float(s.get('commissions') or 0) for s in sales)
        transaction_costs = sum(float(s.get('transaction_costs') or 0) for s in sales)
        assumptions['revenue_summary'] = {
            **assumptions.get('revenue_summary', {}),
            'total_gross_revenue': gross,
            'total_net_revenue': net,
            'avg_commission_pct': commissions / gross if gross else 0.0,
            'avg_transaction_cost_pct': transaction_costs / gross if gross else 0.0,
        }

    def _apply_land_model_override(
        self,
        assumptions: Dict[str, Any],
        override: Override,
    ) -> bool:
        model = assumptions.get('land_model')
        if not isinstance(model, dict):
            return False

        field = (override.field or '').lower()
        table = (override.table or '').lower()
        label = (override.label or '').lower()
        unit = override.unit or ''

        absorption_velocity_like = (
            field in ('units_per_period', 'absorption_rate', 'absorption_velocity')
            or 'absorption_velocity' in field
            or 'absorption_rate' in field
        )
        if absorption_velocity_like:
            absorption = model.setdefault('absorption_summary', {})
            old_rate = absorption.get('units_per_period') or override.original_value
            try:
                old_rate = float(old_rate)
            except (TypeError, ValueError):
                old_rate = None
            if not old_rate or old_rate <= 0:
                return False

            try:
                raw_rate = float(override.override_value)
            except (TypeError, ValueError):
                return False

            if field == 'units_per_period':
                new_rate = raw_rate
            else:
                factor = self._pct_or_ratio_factor(raw_rate, unit)
                if factor is None:
                    return False
                new_rate = old_rate * factor

            if new_rate <= 0:
                return False

            start_period = absorption.get('start_period') or self._first_sale_period(model)
            stretch = old_rate / new_rate
            for sale in model.get('parcel_sales', []):
                sale_period = int(sale.get('sale_period') or start_period or 1)
                if start_period and sale_period >= start_period:
                    sale['sale_period'] = max(
                        int(start_period),
                        int(round(int(start_period) + (sale_period - int(start_period)) * stretch)),
                    )
            absorption['units_per_period'] = new_rate
            if absorption.get('total_units'):
                absorption['periods_to_complete'] = int(math.ceil(float(absorption['total_units']) / new_rate))
            model['total_project_months'] = max(
                int(model.get('total_project_months') or 1),
                self._derive_horizon_from_model(model),
            )
            self._append_adjustment(assumptions, {
                'type': 'absorption_velocity',
                'field': override.field,
                'from': old_rate,
                'to': new_rate,
                'timing_stretch': stretch,
            })
            return True

        date_like = (
            field in ('sale_date', 'closing_date', 'custom_sale_date')
            or unit.lower() == 'date'
            or self._coerce_date(override.override_value) is not None
        )
        if date_like:
            delay = self._sale_delay_months(model, override)
            if delay is None or delay <= 0:
                return False
            shifted = self._shift_land_sales(model, override.record_id, delay)
            if shifted:
                self._append_adjustment(assumptions, {
                    'type': 'sale_delay',
                    'field': override.field,
                    'delay_months': delay,
                    'record_id': str(override.record_id) if override.record_id else None,
                })
            return shifted

        price_like = (
            table in ('tbl_parcel_sale_assumptions', 'land_use_pricing', 'market_assumptions')
            or any(token in field for token in ('price', 'revenue', 'proceeds'))
            or 'price' in label
        )
        if price_like:
            factor = self._price_factor_from_override(model, override)
            if factor is None:
                return False
            record_id = str(override.record_id) if override.record_id else None
            for sale in model.get('parcel_sales', []):
                if record_id and not self._sale_matches_record(sale, record_id):
                    continue
                for key in ('gross_revenue', 'net_revenue', 'commissions', 'transaction_costs'):
                    sale[key] = float(sale.get(key) or 0) * factor
            self._refresh_land_revenue_summary(assumptions)
            self._append_adjustment(assumptions, {
                'type': 'sale_price',
                'field': override.field,
                'factor': factor,
                'record_id': record_id,
            })
            return True

        cost_like = any(token in field for token in ('cost', 'budget', 'amount')) or 'cost' in label
        if cost_like:
            factor = self._cost_factor_from_override(model, override)
            if factor is None:
                return False
            for item in model.get('cost_schedule', []):
                item['amount'] = float(item.get('amount') or 0) * factor
            assumptions['total_costs'] = sum(float(i.get('amount') or 0) for i in model.get('cost_schedule', []))
            self._append_adjustment(assumptions, {
                'type': 'cost',
                'field': override.field,
                'factor': factor,
            })
            return True

        delay_like = (
            'delay' in field
            or 'sale_period' in field
            or any(token in label for token in ('walk', 'sit', 'delay', 'takedown'))
        )
        if delay_like:
            try:
                delay = int(round(float(override.override_value)))
            except (TypeError, ValueError):
                return False
            if unit == 'years':
                delay *= 12
            if delay <= 0:
                return False
            shifted = self._shift_land_sales(model, override.record_id, delay)
            if shifted:
                self._append_adjustment(assumptions, {
                    'type': 'sale_delay',
                    'field': override.field,
                    'delay_months': delay,
                })
            return shifted

        return False

    def _shift_land_sales(
        self,
        model: Dict[str, Any],
        record_id: Optional[str],
        delay_months: int,
    ) -> bool:
        record = str(record_id) if record_id else None
        first_period = self._first_sale_period(model)
        shifted = False
        for sale in model.get('parcel_sales', []):
            if record:
                if not self._sale_matches_record(sale, record):
                    continue
            elif int(sale.get('sale_period') or 0) != first_period:
                continue
            sale['sale_period'] = int(sale.get('sale_period') or first_period or 1) + delay_months
            shifted = True
        if shifted:
            model['total_project_months'] = max(
                int(model.get('total_project_months') or 1),
                self._derive_horizon_from_model(model),
            )
        return shifted

    @staticmethod
    def _sale_matches_record(sale: Dict[str, Any], record_id: str) -> bool:
        return any(
            str(sale.get(key)) == record_id
            for key in ('assumption_id', 'parcel_id')
            if sale.get(key) is not None
        )

    def _sale_delay_months(self, model: Dict[str, Any], override: Override) -> Optional[int]:
        target = self._coerce_date(override.override_value)
        label_dates = self._dates_from_label(override.label)
        if len(label_dates) >= 2:
            return self._month_diff(label_dates[0], label_dates[-1])

        label_delay = self._months_from_label(override.label)
        if label_delay:
            return label_delay

        if target:
            record_id = str(override.record_id) if override.record_id else None
            for sale in model.get('parcel_sales', []):
                if record_id and not self._sale_matches_record(sale, record_id):
                    continue
                current = self._coerce_date(sale.get('custom_sale_date'))
                if current:
                    return self._month_diff(current, target)
                current_period = int(sale.get('sale_period') or 0)
                target_period = self._period_for_date(model, target)
                if current_period and target_period:
                    return target_period - current_period
                if record_id:
                    break
        return None

    def _price_factor_from_override(self, model: Dict[str, Any], override: Override) -> Optional[float]:
        unit = (override.unit or '').lower()
        field = (override.field or '').lower()

        if unit == 'currency':
            label_factor = self._pct_factor_from_label(override.label)
            if label_factor is not None:
                return label_factor

            target_amount = self._float_or_none(override.override_value)
            if target_amount and any(token in field for token in ('revenue', 'proceeds')):
                current_total = sum(
                    float(s.get('gross_revenue') or 0)
                    for s in model.get('parcel_sales', [])
                )
                if current_total > 0:
                    return target_amount / current_total

            return None

        return self._pct_or_ratio_factor(override.override_value, unit)

    def _cost_factor_from_override(self, model: Dict[str, Any], override: Override) -> Optional[float]:
        label_factor = self._pct_factor_from_label(override.label)
        if label_factor is not None:
            return label_factor

        unit = (override.unit or '').lower()
        if unit == 'currency':
            target_amount = self._float_or_none(override.override_value)
            current_total = sum(
                float(item.get('amount') or 0)
                for item in model.get('cost_schedule', [])
            )
            if target_amount and current_total > 0:
                return target_amount / current_total
            return None

        return self._pct_or_ratio_factor(override.override_value, unit)

    @staticmethod
    def _float_or_none(value: Any) -> Optional[float]:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _pct_factor_from_label(label: str) -> Optional[float]:
        match = re.search(r'([+-])\s*(\d+(?:\.\d+)?)\s*%', label or '')
        if match:
            value = float(match.group(2)) / 100.0
            return 1 + value if match.group(1) == '+' else 1 - value
        match = re.search(
            r'(\d+(?:\.\d+)?)\s*%\s*(below|lower|reduction|less|under|down)',
            label or '',
            flags=re.IGNORECASE,
        )
        if match:
            return 1 - float(match.group(1)) / 100.0
        match = re.search(
            r'(\d+(?:\.\d+)?)\s*%\s*(above|higher|increase|more|up|over)',
            label or '',
            flags=re.IGNORECASE,
        )
        if match:
            return 1 + float(match.group(1)) / 100.0
        match = re.search(
            r'(increase|more|up|over|above|higher)\s*(?:by\s*)?(\d+(?:\.\d+)?)\s*%',
            label or '',
            flags=re.IGNORECASE,
        )
        if match:
            return 1 + float(match.group(2)) / 100.0
        match = re.search(
            r'(decrease|reduction|reduce|less|under|below|lower|down)\s*(?:by\s*)?(\d+(?:\.\d+)?)\s*%',
            label or '',
            flags=re.IGNORECASE,
        )
        if match:
            return 1 - float(match.group(2)) / 100.0
        return None

    @staticmethod
    def _dates_from_label(label: str) -> List[date]:
        dates: List[date] = []
        for match in re.findall(r'\b(20\d{2})-(\d{1,2})(?:-(\d{1,2}))?\b', label or ''):
            year, month, day = match
            try:
                dates.append(date(int(year), int(month), int(day or 1)))
            except ValueError:
                continue
        return dates

    @staticmethod
    def _months_from_label(label: str) -> Optional[int]:
        match = re.search(r'\b(\d+(?:\.\d+)?)\s*(months?|mos?|yrs?|years?)\b', label or '', flags=re.IGNORECASE)
        if not match:
            return None
        value = float(match.group(1))
        unit = match.group(2).lower()
        if unit.startswith('y') or unit.startswith('yr'):
            value *= 12
        return int(round(value))

    @staticmethod
    def _month_diff(start: date, end: date) -> int:
        return (end.year - start.year) * 12 + (end.month - start.month)

    def _period_for_date(self, model: Dict[str, Any], value: date) -> Optional[int]:
        start = self._coerce_date(model.get('analysis_start_date'))
        if not start:
            return None
        return self._month_diff(start, value) + 1

    @staticmethod
    def _first_sale_period(model: Dict[str, Any]) -> Optional[int]:
        periods = [
            int(s.get('sale_period'))
            for s in model.get('parcel_sales', [])
            if s.get('sale_period') is not None
        ]
        return min(periods) if periods else None

    def _compute_land_model_metrics(self, model: Dict[str, Any]) -> Dict[str, Any]:
        import numpy_financial as npf

        period_count = max(
            int(model.get('total_project_months') or 1),
            self._derive_horizon_from_model(model),
        )
        cash_flows = [0.0] * period_count

        total_costs = 0.0
        for item in model.get('cost_schedule', []):
            amount = float(item.get('amount') or 0)
            total_costs += amount
            start = max(int(item.get('start_period') or 1), 1)
            duration = max(int(item.get('periods_to_complete') or 1), 1)
            end = min(start + duration - 1, period_count)
            active_periods = max(end - start + 1, 1)
            monthly_amount = amount / active_periods
            for period in range(start, end + 1):
                cash_flows[period - 1] -= monthly_amount

        total_net_revenue = 0.0
        total_gross_revenue = 0.0
        for sale in model.get('parcel_sales', []):
            period = int(sale.get('sale_period') or period_count)
            if period < 1:
                period = 1
            if period > period_count:
                cash_flows.extend([0.0] * (period - period_count))
                period_count = period
            net = float(sale.get('net_revenue') or 0)
            gross = float(sale.get('gross_revenue') or 0)
            total_net_revenue += net
            total_gross_revenue += gross
            cash_flows[period - 1] += net

        annual_cash_flows = [
            sum(cash_flows[i:i + 12])
            for i in range(0, len(cash_flows), 12)
        ]
        irr = None
        if len(annual_cash_flows) >= 2:
            try:
                irr_result = npf.irr(annual_cash_flows)
                if not np.isnan(irr_result):
                    irr = float(irr_result)
            except Exception:
                pass

        discount_rate = float(model.get('discount_rate') or 0.10)
        npv = None
        if discount_rate > 0:
            try:
                monthly_rate = (1 + discount_rate) ** (1 / 12) - 1
                npv_result = npf.npv(monthly_rate, cash_flows)
                if not np.isnan(npv_result):
                    npv = float(npv_result)
            except Exception:
                pass

        total_cash_in = sum(cf for cf in cash_flows if cf > 0)
        total_cash_out = abs(sum(cf for cf in cash_flows if cf < 0))
        total_profit = total_net_revenue - total_costs
        cumulative = []
        running = 0.0
        peak_equity = 0.0
        for cf in cash_flows:
            running += cf
            cumulative.append(running)
            peak_equity = min(peak_equity, running)

        return {
            'irr': irr,
            'npv': npv,
            'equity_multiple': total_cash_in / total_cash_out if total_cash_out else None,
            'total_profit': total_profit,
            'gross_margin': total_profit / total_net_revenue if total_net_revenue else None,
            'total_costs': total_costs,
            'total_net_revenue': total_net_revenue,
            'total_gross_revenue': total_gross_revenue,
            'peak_equity': abs(peak_equity),
            'discount_rate': discount_rate,
            'total_project_months': len(cash_flows),
        }

    @staticmethod
    def _calibrate_land_shadow_metrics(
        service_base: Dict[str, Any],
        shadow_base: Dict[str, Any],
        shadow_computed: Dict[str, Any],
    ) -> Dict[str, Any]:
        calibrated = {}
        for key, computed_value in shadow_computed.items():
            base_value = shadow_base.get(key)
            service_value = service_base.get(key)
            if isinstance(computed_value, (int, float)) and isinstance(base_value, (int, float)):
                if key in ('equity_multiple', 'gross_margin') and isinstance(service_value, (int, float)) and base_value:
                    calibrated[key] = service_value * (computed_value / base_value)
                elif isinstance(service_value, (int, float)):
                    delta = computed_value - base_value
                    calibrated[key] = service_value + delta
                else:
                    calibrated[key] = computed_value
            else:
                calibrated[key] = computed_value

        if calibrated.get('total_net_revenue'):
            calibrated['gross_margin'] = (
                calibrated.get('total_profit', 0) / calibrated['total_net_revenue']
            )
        service_irr = service_base.get('irr')
        service_npv = service_base.get('npv')
        calibrated_npv = calibrated.get('npv')
        if (
            isinstance(service_irr, (int, float))
            and isinstance(service_npv, (int, float))
            and isinstance(calibrated_npv, (int, float))
            and service_npv
        ):
            calibrated['irr'] = service_irr * (calibrated_npv / service_npv)
        return calibrated

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
            'units_per_period': ('land_model', 'units_per_period'),
            'periods_to_complete': ('land_model', 'periods_to_complete'),
        }

        if field in FIELD_ROUTING:
            target_table, target_field = FIELD_ROUTING[field]
            if target_table == 'land_model':
                if self._apply_land_model_override(assumptions, override):
                    return
            if target_table in assumptions:
                if isinstance(assumptions[target_table], dict):
                    assumptions[target_table][target_field] = value
                    return

        if self._apply_land_model_override(assumptions, override):
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
            from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService
            service = LandDevCashFlowService(self.project_id)
            result = service.calculate(include_financing=False)
            summary = result.get('summary', {})
            service_metrics = {
                'irr': summary.get('irr'),
                'npv': summary.get('npv'),
                'equity_multiple': summary.get('equityMultiple'),
                'total_profit': summary.get('grossProfit'),
                'gross_margin': summary.get('grossMargin'),
                'total_costs': summary.get('totalCosts', assumptions.get('total_costs', 0)),
                'total_net_revenue': summary.get(
                    'totalNetRevenue',
                    assumptions.get('revenue_summary', {}).get('total_net_revenue', 0),
                ),
                'peak_equity': summary.get('peakEquity'),
                'discount_rate': assumptions.get('tbl_dcf_analysis', {}).get('discount_rate', 0.10),
            }

            adjustments = assumptions.get('_scenario_adjustments') or []
            if not adjustments:
                return {
                    **service_metrics,
                    'scenario_adjustments': [],
                    'source': 'LandDevCashFlowService base case',
                }

            baseline_model = assumptions.get('_baseline_land_model')
            current_model = assumptions.get('land_model')
            if not baseline_model or not current_model:
                return self._compute_land_dev_metrics_simplified(assumptions)

            baseline_shadow = self._compute_land_model_metrics(baseline_model)
            computed_shadow = self._compute_land_model_metrics(current_model)
            calibrated = self._calibrate_land_shadow_metrics(
                service_metrics,
                baseline_shadow,
                computed_shadow,
            )
            calibrated['scenario_adjustments'] = adjustments
            calibrated['source'] = 'LandDevCashFlowService base case + patched shadow schedule'
            return calibrated
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

    # ------------------------------------------------------------------
    # Phase 5: Scenario Operations
    # ------------------------------------------------------------------

    def replay_scenario(
        self,
        scenario_data: Dict[str, Any],
        thread_id: str,
    ) -> Dict[str, Any]:
        """
        Replay saved overrides against the CURRENT database state.

        Creates a fresh shadow with current baseline, applies saved overrides,
        and computes metrics. Deltas reflect impact on current state, not
        the historical baseline from when the scenario was originally saved.

        Returns the same format as compute_shadow_metrics() plus replay metadata.
        """
        saved_overrides = scenario_data.get('overrides', {})
        if not saved_overrides:
            return {
                'success': True,
                'message': 'Scenario has no overrides (baseline checkpoint).',
                'overrides_replayed': 0,
            }

        shadow = self.create_shadow(thread_id)

        skipped = []
        for key, ov_data in saved_overrides.items():
            try:
                shadow = self.apply_override(
                    shadow,
                    field=ov_data.get('field', ''),
                    table=ov_data.get('table', ''),
                    new_value=ov_data.get('override_value'),
                    label=ov_data.get('label', ''),
                    unit=ov_data.get('unit', ''),
                    record_id=ov_data.get('record_id'),
                )
            except Exception as e:
                skipped.append({'key': key, 'error': str(e)})

        results = self.compute_shadow_metrics(shadow)

        return {
            'success': True,
            'overrides_replayed': len(saved_overrides) - len(skipped),
            'skipped': skipped,
            'shadow': shadow,
            **results,
        }

    def compare_scenarios(
        self,
        scenario_data_a: Dict[str, Any],
        scenario_data_b: Dict[str, Any],
        name_a: str = 'Scenario A',
        name_b: str = 'Scenario B',
    ) -> Dict[str, Any]:
        """
        Compare two scenarios side-by-side.

        Replays each scenario's overrides against the current DB independently,
        then produces a comparison with baseline, A metrics, B metrics, and deltas.
        """
        # Get current baseline
        project_type = self._get_project_type()
        baseline_assumptions = self._load_all_assumptions(project_type)
        baseline_metrics = self._compute_metrics(baseline_assumptions, project_type)

        # Compute scenario A metrics
        metrics_a = self._replay_and_compute(
            baseline_assumptions, scenario_data_a, project_type
        )

        # Compute scenario B metrics
        metrics_b = self._replay_and_compute(
            baseline_assumptions, scenario_data_b, project_type
        )

        # Compute deltas
        delta_a_vs_baseline = self._compute_deltas(baseline_metrics, metrics_a)
        delta_b_vs_baseline = self._compute_deltas(baseline_metrics, metrics_b)
        delta_a_vs_b = self._compute_deltas(metrics_a, metrics_b)

        # Build override summaries
        overrides_a = scenario_data_a.get('overrides', {})
        overrides_b = scenario_data_b.get('overrides', {})
        summary_a = [
            {
                'field': ov.get('field'),
                'label': ov.get('label', ov.get('field')),
                'value': ov.get('override_value'),
                'unit': ov.get('unit', ''),
            }
            for ov in overrides_a.values()
        ]
        summary_b = [
            {
                'field': ov.get('field'),
                'label': ov.get('label', ov.get('field')),
                'value': ov.get('override_value'),
                'unit': ov.get('unit', ''),
            }
            for ov in overrides_b.values()
        ]

        return {
            'baseline': baseline_metrics,
            name_a: {
                'metrics': metrics_a,
                'delta_vs_baseline': delta_a_vs_baseline,
                'overrides': summary_a,
                'overrides_count': len(overrides_a),
            },
            name_b: {
                'metrics': metrics_b,
                'delta_vs_baseline': delta_b_vs_baseline,
                'overrides': summary_b,
                'overrides_count': len(overrides_b),
            },
            'delta_a_vs_b': delta_a_vs_b,
        }

    def diff_scenario(
        self,
        scenario_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Diff a saved scenario against the current database state.

        Shows which overrides would still be different from current DB values
        and which have been absorbed (i.e., the DB already matches the override).
        """
        overrides = scenario_data.get('overrides', {})
        if not overrides:
            return {'still_different': [], 'absorbed': [], 'total': 0}

        still_different = []
        absorbed = []

        for key, ov_data in overrides.items():
            field = ov_data.get('field', '')
            table = ov_data.get('table', '')
            record_id = ov_data.get('record_id')
            override_value = ov_data.get('override_value')
            original_value = ov_data.get('original_value')

            # Read current DB value
            current = self._read_field_value(table, field, record_id)

            entry = {
                'key': key,
                'field': field,
                'label': ov_data.get('label', field),
                'original_value': original_value,
                'override_value': override_value,
                'current_db_value': current,
            }

            if self._values_roughly_equal(current, override_value):
                entry['status'] = 'absorbed'
                absorbed.append(entry)
            else:
                entry['status'] = 'different'
                still_different.append(entry)

        return {
            'still_different': still_different,
            'absorbed': absorbed,
            'total': len(overrides),
            'different_count': len(still_different),
            'absorbed_count': len(absorbed),
        }

    def _replay_and_compute(
        self,
        baseline_assumptions: Dict[str, Any],
        scenario_data: Dict[str, Any],
        project_type: str,
    ) -> Dict[str, Any]:
        """Replay overrides onto baseline assumptions and compute metrics."""
        patched = copy.deepcopy(baseline_assumptions)
        overrides = scenario_data.get('overrides', {})
        for key, ov_data in overrides.items():
            override = Override(**ov_data) if isinstance(ov_data, dict) else ov_data
            self._apply_single_override(patched, override)
        return self._compute_metrics(patched, project_type)

    def _read_field_value(
        self,
        table: str,
        field: str,
        record_id: Optional[str] = None,
    ) -> Any:
        """Read a single field value from the database."""
        try:
            with connection.cursor() as cursor:
                if record_id:
                    # Try PK-based lookup
                    pk_map = {
                        'tbl_parcel': 'parcel_id',
                        'tbl_phase': 'phase_id',
                        'tbl_operating_expenses': 'opex_id',
                    }
                    pk_field = pk_map.get(table)
                    if pk_field:
                        cursor.execute(f"""
                            SELECT {field} FROM landscape.{table}
                            WHERE {pk_field} = %s LIMIT 1
                        """, [record_id])
                    else:
                        cursor.execute(f"""
                            SELECT {field} FROM landscape.{table}
                            WHERE project_id = %s LIMIT 1
                        """, [self.project_id])
                else:
                    # Project-scoped lookup
                    lookup = 'project_id'
                    cursor.execute(f"""
                        SELECT {field} FROM landscape.{table}
                        WHERE {lookup} = %s LIMIT 1
                    """, [self.project_id])
                row = cursor.fetchone()
                return row[0] if row else None
        except Exception as e:
            logger.warning(f"_read_field_value {table}.{field}: {e}")
            return None

    @staticmethod
    def _values_roughly_equal(a: Any, b: Any) -> bool:
        """Compare two values allowing for float/Decimal imprecision."""
        if a is None and b is None:
            return True
        if a is None or b is None:
            return False
        try:
            return abs(float(a) - float(b)) < 1e-8
        except (ValueError, TypeError):
            return str(a).strip() == str(b).strip()
