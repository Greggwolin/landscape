"""
Service layer for financial calculations using the Python engine.

Bridges Django ORM and the Python financial calculation engine.
"""

from typing import Dict, List, Optional
from decimal import Decimal
from pathlib import Path
import pandas as pd
import calendar
from datetime import date
from apps.projects.models import Project
from apps.financial.models import BudgetItem, ActualItem
from apps.multifamily.models import MultifamilyUnit, MultifamilyLease
from .converters import (
    prepare_irr_calculation_data,
    prepare_npv_calculation_data,
    convert_budget_items_to_cashflows,
    convert_multifamily_to_income_property,
)

# Import Python financial engine
try:
    from financial_engine.core.metrics import InvestmentMetrics
    from financial_engine.core.cashflow import CashFlowEngine
    PYTHON_ENGINE_AVAILABLE = True
except ImportError:
    PYTHON_ENGINE_AVAILABLE = False
    print("Warning: Python financial engine not available")

# Import Python waterfall engine
try:
    from financial_engine.waterfall import (
        WaterfallEngine,
        WaterfallTierConfig,
        WaterfallSettings,
        CashFlow as WaterfallCashFlow,
        HurdleMethod,
        ReturnOfCapital,
    )
    from financial_engine.waterfall.runtime import build_project_engine
    WATERFALL_ENGINE_AVAILABLE = True
except ImportError:
    WATERFALL_ENGINE_AVAILABLE = False
    print("Warning: Python waterfall engine not available")


class CalculationService:
    """Service for performing financial calculations."""
    
    @staticmethod
    def _period_to_date(fiscal_year: Optional[int], period: Optional[int]) -> date:
        """Convert fiscal year + period to a period-end date (last day of month)."""
        fy = fiscal_year or date.today().year
        month = period or 1
        try:
            last_day = calendar.monthrange(fy, month)[1]
            return date(fy, month, last_day)
        except Exception:
            return date(fy, 1, 1)

    @staticmethod
    def _load_projection_cashflows(project_id: int):
        """Fallback to budget/actual projection when summary table is empty."""
        try:
            projection = CalculationService.generate_cashflow_projection(project_id, include_actuals=True)
        except Exception:
            return []

        rows = []
        for idx, entry in enumerate(sorted(projection.get('projection', []), key=lambda x: (x.get('fiscal_year') or 0, x.get('period') or 0)), start=1):
            fy = entry.get('fiscal_year')
            period = entry.get('period')
            dt = CalculationService._period_to_date(fy, period)
            rows.append((idx, dt, entry.get('net_cashflow', 0)))
        return rows

    @staticmethod
    def _fetch_cashflows_from_django_service(project_id: int):
        """
        Fetch cash flows from the Django LandDevCashFlowService.

        Returns list of (period_id, period_date, net_cash_flow) tuples.
        Net cash flow is negative for costs (contributions) and positive for revenue (distributions).
        """
        from datetime import datetime
        from collections import defaultdict
        from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService

        try:
            service = LandDevCashFlowService(project_id)
            cf_data = service.calculate()

            summary = cf_data.get('summary', {})
            periods = cf_data.get('periods', [])
            sections = cf_data.get('sections', [])

            # Validate totals
            total_costs = summary.get('totalCosts', 0)
            total_net_revenue = summary.get('totalNetRevenue', 0)
            print(f"[waterfall] Django engine: costs=${total_costs:,.2f}, net_revenue=${total_net_revenue:,.2f}")

            if not periods:
                return []

            # Parse the sections to get per-period costs and revenue
            # Cost sections: Development Costs, Planning & Engineering, Land Acquisition
            # Revenue section: NET REVENUE (to avoid double-counting gross + deductions)
            # Note: Django service returns uppercase section names (e.g., 'DEVELOPMENT COSTS')
            cost_section_names = {'development costs', 'planning & engineering', 'land acquisition'}
            revenue_section_names = {'net revenue'}

            period_costs = defaultdict(float)
            period_revenue = defaultdict(float)

            for section in sections:
                sname = section.get('sectionName', '').lower()
                is_cost = sname in cost_section_names
                is_revenue = sname in revenue_section_names

                if is_cost or is_revenue:
                    for line_item in section.get('lineItems', []):
                        for period_data in line_item.get('periods', []):
                            ps = period_data.get('periodSequence')
                            if ps is None:
                                continue
                            # Costs are stored as negative, revenue as positive
                            amt = period_data.get('amount', 0)
                            if is_cost:
                                # Store as positive for aggregation, will negate later
                                period_costs[ps] += abs(amt)
                            if is_revenue:
                                period_revenue[ps] += abs(amt)

            # Get period dates from response
            period_dates = {}
            for p in periods:
                ps = p.get('periodSequence', 0)
                end_date_str = p.get('endDate', '')
                if end_date_str:
                    try:
                        period_dates[ps] = datetime.fromisoformat(end_date_str.replace('Z', '+00:00')).date()
                    except ValueError:
                        pass

            # Build output: net_cf = revenue - costs (negative = contribution, positive = distribution)
            if not period_costs and not period_revenue:
                return []

            max_period = max(
                max(period_costs.keys()) if period_costs else 0,
                max(period_revenue.keys()) if period_revenue else 0,
                len(periods)
            )

            rows = []
            for period_seq in range(1, max_period + 1):
                costs = period_costs.get(period_seq, 0)
                revenue = period_revenue.get(period_seq, 0)
                net_cf = revenue - costs  # negative when costs > revenue (contribution)

                # Get date
                if period_seq in period_dates:
                    period_date = period_dates[period_seq]
                else:
                    # Fallback to calculated date
                    from dateutil.relativedelta import relativedelta
                    from datetime import date
                    period_date = date(2025, 1, 31) + relativedelta(months=period_seq - 1)

                rows.append((period_seq, period_date, net_cf))

            # Log summary
            total_contrib = sum(r[2] for r in rows if r[2] < 0)
            total_dist = sum(r[2] for r in rows if r[2] > 0)
            print(f"[waterfall] Parsed {len(rows)} periods: contributions=${abs(total_contrib):,.0f}, distributions=${total_dist:,.0f}")

            return rows

        except Exception as e:
            import traceback
            print(f"[waterfall] Error fetching from Django service: {e}")
            traceback.print_exc()
            return []

    @staticmethod
    def calculate_irr(project_id: int) -> Dict:
        """
        Calculate IRR for a project.
        
        Args:
            project_id: Project ID
            
        Returns:
            Dictionary with IRR calculation results
        """
        project = Project.objects.get(project_id=project_id)
        budget_items = BudgetItem.objects.filter(project_id=project_id, is_active=True)
        actual_items = ActualItem.objects.filter(project_id=project_id, is_active=True)
        
        data = prepare_irr_calculation_data(project, list(budget_items), list(actual_items))
        
        if PYTHON_ENGINE_AVAILABLE:
            try:
                metrics = InvestmentMetrics()
                irr = metrics.calculate_irr(data['cash_flows'])
                
                return {
                    'project_id': project_id,
                    'project_name': project.project_name,
                    'irr': float(irr) if irr is not None else None,
                    'periods': len(data['cash_flows']),
                    'total_investment': sum(cf for cf in data['cash_flows'] if cf < 0),
                    'total_return': sum(cf for cf in data['cash_flows'] if cf > 0),
                    'engine': 'python',
                }
            except Exception as e:
                return {
                    'error': str(e),
                    'project_id': project_id,
                    'engine': 'python',
                }
        else:
            # Fallback calculation
            return {
                'project_id': project_id,
                'project_name': project.project_name,
                'irr': None,
                'error': 'Python calculation engine not available',
                'engine': 'fallback',
            }
    
    @staticmethod
    def calculate_npv(project_id: int, discount_rate: Optional[float] = None) -> Dict:
        """
        Calculate NPV for a project.
        
        Args:
            project_id: Project ID
            discount_rate: Optional override for discount rate
            
        Returns:
            Dictionary with NPV calculation results
        """
        project = Project.objects.get(project_id=project_id)
        budget_items = BudgetItem.objects.filter(project_id=project_id, is_active=True)
        
        data = prepare_npv_calculation_data(project, list(budget_items), discount_rate)
        
        if PYTHON_ENGINE_AVAILABLE:
            try:
                metrics = InvestmentMetrics()
                npv = metrics.calculate_npv(data['cash_flows'], data['discount_rate'])
                
                return {
                    'project_id': project_id,
                    'project_name': project.project_name,
                    'npv': float(npv) if npv is not None else None,
                    'discount_rate': data['discount_rate'],
                    'periods': len(data['cash_flows']),
                    'engine': 'python',
                }
            except Exception as e:
                return {
                    'error': str(e),
                    'project_id': project_id,
                    'engine': 'python',
                }
        else:
            return {
                'project_id': project_id,
                'project_name': project.project_name,
                'npv': None,
                'error': 'Python calculation engine not available',
                'engine': 'fallback',
            }
    
    @staticmethod
    def calculate_project_metrics(project_id: int) -> Dict:
        """
        Calculate comprehensive metrics for a project.
        
        Args:
            project_id: Project ID
            
        Returns:
            Dictionary with all project metrics
        """
        project = Project.objects.get(project_id=project_id)
        budget_items = BudgetItem.objects.filter(project_id=project_id, is_active=True)
        actual_items = ActualItem.objects.filter(project_id=project_id, is_active=True)
        
        # Get budget summary
        total_budget = sum(float(item.budgeted_amount or 0) for item in budget_items)
        total_actual = sum(float(item.actual_amount or 0) for item in actual_items)
        variance = total_actual - total_budget
        
        # Calculate IRR and NPV
        irr_result = CalculationService.calculate_irr(project_id)
        npv_result = CalculationService.calculate_npv(project_id)
        
        return {
            'project_id': project_id,
            'project_name': project.project_name,
            'budget_summary': {
                'total_budget': total_budget,
                'total_actual': total_actual,
                'variance': variance,
                'variance_pct': (variance / total_budget * 100) if total_budget > 0 else 0,
            },
            'investment_metrics': {
                'irr': irr_result.get('irr'),
                'npv': npv_result.get('npv'),
                'discount_rate': float(project.discount_rate_pct or 0.10),
            },
            'status': 'complete',
        }
    
    @staticmethod
    def generate_cashflow_projection(
        project_id: int,
        periods: int = 120,
        include_actuals: bool = True
    ) -> Dict:
        """
        Generate period-by-period cash flow projection.
        
        Args:
            project_id: Project ID
            periods: Number of periods to project
            include_actuals: Include actual data where available
            
        Returns:
            Dictionary with cash flow projection
        """
        project = Project.objects.get(project_id=project_id)
        budget_items = BudgetItem.objects.filter(project_id=project_id, is_active=True)
        
        cashflows = convert_budget_items_to_cashflows(list(budget_items))
        
        if include_actuals:
            actual_items = ActualItem.objects.filter(project_id=project_id, is_active=True)
            for item in actual_items:
                cashflows.append({
                    'period': item.fiscal_period,
                    'fiscal_year': item.fiscal_year,
                    'category': item.category,
                    'amount': float(item.actual_amount or 0),
                    'is_actual': True,
                })
        
        # Organize by period
        period_data = {}
        for cf in cashflows:
            period = cf.get('period', 0)
            if period not in period_data:
                period_data[period] = {
                    'period': period,
                    'fiscal_year': cf.get('fiscal_year'),
                    'inflows': 0,
                    'outflows': 0,
                    'net_cashflow': 0,
                    'categories': {},
                }
            
            amount = cf['amount']
            category = cf.get('category', 'Other')
            
            if cf.get('is_revenue', False):
                period_data[period]['inflows'] += amount
            else:
                period_data[period]['outflows'] += amount
            
            if category not in period_data[period]['categories']:
                period_data[period]['categories'][category] = 0
            period_data[period]['categories'][category] += amount
        
        # Calculate net cash flow and cumulative
        cumulative = 0
        projection = []
        
        for period in sorted(period_data.keys()):
            data = period_data[period]
            net = data['inflows'] - data['outflows']
            cumulative += net
            
            data['net_cashflow'] = net
            data['cumulative_cashflow'] = cumulative
            projection.append(data)
        
        return {
            'project_id': project_id,
            'project_name': project.project_name,
            'total_periods': len(projection),
            'projection': projection,
            'summary': {
                'total_inflows': sum(p['inflows'] for p in projection),
                'total_outflows': sum(p['outflows'] for p in projection),
                'net_cashflow': cumulative,
            },
        }

    # ========================================================================
    # WATERFALL CALCULATIONS
    # ========================================================================

    @staticmethod
    def calculate_waterfall(
        tiers: List[Dict],
        settings: Dict,
        cash_flows: List[Dict],
    ) -> Dict:
        """
        Calculate waterfall distribution using Python engine.

        Args:
            tiers: List of tier configurations
            settings: Waterfall settings
            cash_flows: List of cash flows

        Returns:
            Dictionary with waterfall calculation results
        """
        if not WATERFALL_ENGINE_AVAILABLE:
            return {
                'error': 'Python waterfall engine not available',
                'engine': 'unavailable',
            }

        from datetime import datetime
        from decimal import Decimal

        try:
            # Convert tiers to WaterfallTierConfig objects
            tier_configs = [
                WaterfallTierConfig(
                    tier_number=t['tier_number'],
                    tier_name=t.get('tier_name', f"Tier {t['tier_number']}"),
                    irr_hurdle=Decimal(str(t['irr_hurdle'])) if t.get('irr_hurdle') is not None else None,
                    emx_hurdle=Decimal(str(t['emx_hurdle'])) if t.get('emx_hurdle') is not None else None,
                    promote_percent=Decimal(str(t.get('promote_percent', 0))),
                    lp_split_pct=Decimal(str(t['lp_split_pct'])),
                    gp_split_pct=Decimal(str(t['gp_split_pct'])),
                )
                for t in tiers
            ]

            # Convert settings to WaterfallSettings object
            hurdle_method_map = {
                'IRR': HurdleMethod.IRR,
                'EMx': HurdleMethod.EMX,
                'IRR_EMx': HurdleMethod.IRR_EMX,
            }
            return_of_capital_map = {
                'LP First': ReturnOfCapital.LP_FIRST,
                'Pari Passu': ReturnOfCapital.PARI_PASSU,
            }

            waterfall_settings = WaterfallSettings(
                hurdle_method=hurdle_method_map.get(settings.get('hurdle_method', 'IRR'), HurdleMethod.IRR),
                num_tiers=settings.get('num_tiers', 3),
                return_of_capital=return_of_capital_map.get(settings.get('return_of_capital', 'Pari Passu'), ReturnOfCapital.PARI_PASSU),
                gp_catch_up=settings.get('gp_catch_up', True),
                lp_ownership=Decimal(str(settings.get('lp_ownership', 0.90))),
                preferred_return_pct=Decimal(str(settings.get('preferred_return_pct', 8))),
            )

            # Convert cash flows to WaterfallCashFlow objects
            waterfall_cash_flows = []
            for cf in cash_flows:
                cf_date = cf['date']
                if isinstance(cf_date, str):
                    cf_date = datetime.strptime(cf_date, '%Y-%m-%d').date()
                waterfall_cash_flows.append(
                    WaterfallCashFlow(
                        period_id=cf['period_id'],
                        date=cf_date,
                        amount=Decimal(str(cf['amount'])),
                    )
                )

            # Run waterfall calculation
            engine = WaterfallEngine(
                tiers=tier_configs,
                settings=waterfall_settings,
                cash_flows=waterfall_cash_flows,
            )
            result = engine.calculate()

            # Convert result to serializable format
            return CalculationService._serialize_waterfall_result(result)

        except Exception as e:
            return {
                'error': str(e),
                'engine': 'python',
            }

    @staticmethod
    def _serialize_waterfall_result(result) -> Dict:
        """Convert WaterfallResult to JSON-serializable dictionary."""

        def decimal_to_float(val):
            if val is None:
                return None
            return float(val)

        period_results = []
        for pr in result.period_results:
            period_results.append({
                'period_id': pr.period_id,
                'date': pr.date.isoformat(),
                'net_cash_flow': decimal_to_float(pr.net_cash_flow),
                'cumulative_cash_flow': decimal_to_float(pr.cumulative_cash_flow),
                'lp_contribution': decimal_to_float(pr.lp_contribution),
                'gp_contribution': decimal_to_float(pr.gp_contribution),
                'tier1_lp_dist': decimal_to_float(pr.tier1_lp_dist),
                'tier1_gp_dist': decimal_to_float(pr.tier1_gp_dist),
                'tier2_lp_dist': decimal_to_float(pr.tier2_lp_dist),
                'tier2_gp_dist': decimal_to_float(pr.tier2_gp_dist),
                'tier3_lp_dist': decimal_to_float(pr.tier3_lp_dist),
                'tier3_gp_dist': decimal_to_float(pr.tier3_gp_dist),
                'tier4_lp_dist': decimal_to_float(pr.tier4_lp_dist),
                'tier4_gp_dist': decimal_to_float(pr.tier4_gp_dist),
                'tier5_lp_dist': decimal_to_float(pr.tier5_lp_dist),
                'tier5_gp_dist': decimal_to_float(pr.tier5_gp_dist),
                'lp_irr': decimal_to_float(pr.lp_irr),
                'gp_irr': decimal_to_float(pr.gp_irr),
                'lp_emx': decimal_to_float(pr.lp_emx),
                'gp_emx': decimal_to_float(pr.gp_emx),
                # Capital account balances (what's still owed)
                'lp_capital_tier1': decimal_to_float(pr.lp_capital_tier1),
                'gp_capital_tier1': decimal_to_float(pr.gp_capital_tier1),
                'lp_capital_tier2': decimal_to_float(pr.lp_capital_tier2),
                # Cumulative accrued returns (compounded interest only, less paid down)
                # These are the "Accrued Pref" and "Accrued Hurdle" values for the UI
                'cumulative_accrued_pref': decimal_to_float(pr.cumulative_accrued_pref),
                'cumulative_accrued_hurdle': decimal_to_float(pr.cumulative_accrued_hurdle),
            })

        def serialize_partner_summary(ps):
            return {
                'partner_id': ps.partner_id,
                'partner_type': ps.partner_type,
                'partner_name': ps.partner_name,
                'preferred_return': decimal_to_float(ps.preferred_return),
                'return_of_capital': decimal_to_float(ps.return_of_capital),
                'excess_cash_flow': decimal_to_float(ps.excess_cash_flow),
                'promote': decimal_to_float(ps.promote),
                'total_distributions': decimal_to_float(ps.total_distributions),
                'total_contributions': decimal_to_float(ps.total_contributions),
                'total_profit': decimal_to_float(ps.total_profit),
                'irr': decimal_to_float(ps.irr),
                'equity_multiple': decimal_to_float(ps.equity_multiple),
                'tier1': decimal_to_float(ps.tier1),
                'tier2': decimal_to_float(ps.tier2),
                'tier3': decimal_to_float(ps.tier3),
                'tier4': decimal_to_float(ps.tier4),
                'tier5': decimal_to_float(ps.tier5),
            }

        return {
            'period_results': period_results,
            'lp_summary': serialize_partner_summary(result.lp_summary),
            'gp_summary': serialize_partner_summary(result.gp_summary),
            'project_summary': {
                'total_equity': decimal_to_float(result.project_summary.total_equity),
                'lp_equity': decimal_to_float(result.project_summary.lp_equity),
                'gp_equity': decimal_to_float(result.project_summary.gp_equity),
                'total_distributed': decimal_to_float(result.project_summary.total_distributed),
                'lp_distributed': decimal_to_float(result.project_summary.lp_distributed),
                'gp_distributed': decimal_to_float(result.project_summary.gp_distributed),
                'project_irr': decimal_to_float(result.project_summary.project_irr),
                'project_emx': decimal_to_float(result.project_summary.project_emx),
            },
            'success': True,
            'engine': 'python',
        }

    @staticmethod
    def calculate_project_waterfall(project_id: int, hurdle_method: str = 'IRR') -> Dict:
        """
        Calculate waterfall distribution for a project using database configuration.

        Args:
            project_id: Project ID
            hurdle_method: Hurdle method - 'IRR', 'EMx', or 'IRR_EMx' (default: 'IRR')

        Returns:
            Dictionary with waterfall calculation results
        """
        if not WATERFALL_ENGINE_AVAILABLE:
            return {
                'error': 'Python waterfall engine not available',
                'engine': 'unavailable',
            }

        from django.db import connection

        try:
            # Load tier configuration from database (authoritative tables)
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        tier_number,
                        tier_name,
                        COALESCE(irr_threshold_pct, hurdle_rate) AS irr_hurdle,
                        equity_multiple_threshold AS emx_hurdle,
                        lp_split_pct,
                        gp_split_pct
                    FROM landscape.tbl_waterfall_tier
                    WHERE project_id = %s
                      AND (is_active IS NULL OR is_active = TRUE)
                    ORDER BY COALESCE(display_order, tier_number)
                """, [project_id])
                tier_rows = cursor.fetchall()

            if not tier_rows:
                return {
                    'error': f'No waterfall tiers found for project {project_id}',
                    'project_id': project_id,
                }

            # Convert to tier dicts with sensible defaults for EMx mode
            # Default EMx thresholds when not set in database:
            # - Tier 1: 1.0x (return of capital)
            # - Tier 2: 1.5x (typical promote hurdle)
            # - Tier 3+: None (residual tiers)
            default_emx_thresholds = {1: 1.0, 2: 1.5}

            tiers = []
            for row in tier_rows:
                tier_num = row[0]
                emx_from_db = float(row[3]) if row[3] else None
                # Apply default EMx if not set and not a residual tier
                emx_value = emx_from_db if emx_from_db is not None else default_emx_thresholds.get(tier_num)

                tiers.append({
                    'tier_number': tier_num,
                    'tier_name': row[1] or f"Tier {tier_num}",
                    'irr_hurdle': float(row[2]) if row[2] else None,
                    'emx_hurdle': emx_value,
                    'promote_percent': 0,  # Calculate from splits
                    'lp_split_pct': float(row[4]) if row[4] else 90,
                    'gp_split_pct': float(row[5]) if row[5] else 10,
                })

            # Fetch cash flows from Django LandDevCashFlowService (authoritative source)
            # Uses pre-computed allocations from tbl_budget_timing + parcel sales
            cf_rows = CalculationService._fetch_cashflows_from_django_service(project_id)

            if not cf_rows:
                # Fallback to pre-populated summary table if exists
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT
                            cs.period_id,
                            cp.period_end_date,
                            cs.net_cash_flow
                        FROM landscape.tbl_cashflow_summary cs
                        JOIN landscape.tbl_calculation_period cp
                          ON cp.project_id = cs.project_id
                         AND cp.period_id = cs.period_id
                        WHERE cs.project_id = %s
                        ORDER BY cp.period_end_date
                    """, [project_id])
                    cf_rows = cursor.fetchall()

            if not cf_rows:
                return {
                    'error': f'No cash flows found for project {project_id}',
                    'project_id': project_id,
                }

            cash_flows = [
                {
                    'period_id': row[0],
                    'date': row[1].isoformat() if hasattr(row[1], 'isoformat') else str(row[1]),
                    'amount': float(row[2]),
                }
                for row in cf_rows
            ]

            # Convert database tiers to WaterfallTierConfig objects
            tier_configs = [
                WaterfallTierConfig(
                    tier_number=t['tier_number'],
                    tier_name=t['tier_name'],
                    irr_hurdle=Decimal(str(t['irr_hurdle'])) if t['irr_hurdle'] else None,
                    emx_hurdle=Decimal(str(t['emx_hurdle'])) if t['emx_hurdle'] else None,
                    lp_split_pct=Decimal(str(t['lp_split_pct'])),
                    gp_split_pct=Decimal(str(t['gp_split_pct'])),
                )
                for t in tiers
            ]

            # Map string hurdle_method to enum
            hurdle_method_map = {
                'IRR': HurdleMethod.IRR,
                'EMx': HurdleMethod.EMX,
                'IRR_EMx': HurdleMethod.IRR_EMX,
            }
            resolved_hurdle_method = hurdle_method_map.get(hurdle_method, HurdleMethod.IRR)

            # Build settings from database (with defaults)
            waterfall_settings = WaterfallSettings(
                hurdle_method=resolved_hurdle_method,
                num_tiers=len(tiers),
                return_of_capital=ReturnOfCapital.PARI_PASSU,
                gp_catch_up=True,  # Enable GP catch-up to match Excel model
                lp_ownership=Decimal('0.90'),
                preferred_return_pct=Decimal('8'),
            )

            # Build cash flows
            waterfall_cash_flows = [
                WaterfallCashFlow(
                    period_id=cf['period_id'],
                    date=cf['date'] if isinstance(cf['date'], date) else date.fromisoformat(str(cf['date'])),
                    amount=Decimal(str(cf['amount'])),
                )
                for cf in cash_flows
            ]

            # Create engine with database tiers (not hardcoded)
            from financial_engine.waterfall import WaterfallEngine
            engine = WaterfallEngine(
                tiers=tier_configs,
                settings=waterfall_settings,
                cash_flows=waterfall_cash_flows,
            )
            result = engine.calculate()

            # Serialize result and include tier configuration
            serialized = CalculationService._serialize_waterfall_result(result)
            serialized['tier_config'] = tiers  # Include database tier config for UI
            return serialized

        except Exception as e:
            return {
                'error': str(e),
                'project_id': project_id,
                'engine': 'python',
            }
