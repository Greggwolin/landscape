"""
UOM Calculation Service

Provides calculation services using the UOM calculation registry.
"""

from typing import Dict, List, Optional
from .models import UOMCalculationFormula


class UOMCalculationService:
    """Service for UOM-based calculations using the formula registry."""

    @staticmethod
    def get_all_formulas() -> List[UOMCalculationFormula]:
        """Get all UOM formulas from the registry."""
        return list(UOMCalculationFormula.objects.all())

    @staticmethod
    def get_formula(uom_code: str) -> Optional[UOMCalculationFormula]:
        """Get a specific formula by UOM code."""
        try:
            return UOMCalculationFormula.objects.get(uom_code=uom_code)
        except UOMCalculationFormula.DoesNotExist:
            return None

    @staticmethod
    def get_available_uoms(parcel_data: dict) -> List[Dict[str, str]]:
        """
        Get list of available UOMs based on parcel data.

        Args:
            parcel_data: Dictionary containing parcel fields (lot_width, units, acres, etc.)

        Returns:
            List of dicts with uom_code, formula_name, and description for available UOMs
        """
        all_formulas = UOMCalculationFormula.objects.all()
        available = []

        for formula in all_formulas:
            if formula.can_calculate(parcel_data):
                available.append({
                    'uom_code': formula.uom_code,
                    'formula_name': formula.formula_name,
                    'description': formula.description or '',
                })

        return available

    @staticmethod
    def calculate_gross_value(
        uom_code: str,
        parcel_data: dict,
        inflated_price: float
    ) -> float:
        """
        Calculate gross value using the specified UOM formula.

        Args:
            uom_code: The UOM code (FF, EA, SF, AC, UN, $$$)
            parcel_data: Dictionary with parcel fields (lot_width, units, acres)
            inflated_price: The inflated price per unit

        Returns:
            Calculated gross value

        Raises:
            ValueError: If UOM not found or calculation fails
        """
        formula = UOMCalculationService.get_formula(uom_code)

        if not formula:
            raise ValueError(f"UOM formula not found: {uom_code}")

        return formula.calculate(parcel_data, inflated_price)

    @staticmethod
    def validate_uom_for_parcel(uom_code: str, parcel_data: dict) -> tuple[bool, str]:
        """
        Validate if a UOM can be used for a parcel.

        Args:
            uom_code: The UOM code to validate
            parcel_data: Dictionary with parcel fields

        Returns:
            Tuple of (is_valid, error_message)
        """
        formula = UOMCalculationService.get_formula(uom_code)

        if not formula:
            return False, f"UOM formula not found: {uom_code}"

        if not formula.can_calculate(parcel_data):
            missing_fields = [
                field for field in formula.required_fields
                if field not in parcel_data or parcel_data[field] is None or parcel_data[field] == 0
            ]
            return False, f"Missing required fields: {', '.join(missing_fields)}"

        return True, ""


class SaleCalculationService:
    """Service for calculating net sale proceeds with benchmark hierarchy"""

    @staticmethod
    def get_benchmarks_for_parcel(project_id: int, lu_type_code: str, product_code: str,
                                  pricing_uom: str = None) -> Dict:
        """
        Fetch benchmarks using hierarchy: product > project > global

        Returns dict with benchmark values for:
        - improvement_offset
        - legal
        - commission
        - closing
        - title_insurance

        ``pricing_uom`` (CB14): when given, the improvement-offset benchmark is
        resolved BY UNIT OF MEASURE — an offset applies only to parcels priced in
        its unit (per FF to front-foot parcels, per unit to unit parcels, …). If
        no offset benchmark matches the parcel's UOM, ``improvement_offset`` is
        omitted and ``improvement_offset_absent`` records whether an offset
        exists in a different unit (``'wrong_uom'``) or not at all (``'none'``),
        so the caller can report an honest state instead of a silent $0.
        """
        from .models import SaleBenchmark

        benchmarks = {}

        # Transaction cost types
        cost_types = ['legal', 'commission', 'closing', 'title_insurance']

        for cost_type in cost_types:
            # Try product-level
            benchmark = SaleBenchmark.objects.filter(
                scope_level='product',
                project_id=project_id,
                lu_type_code=lu_type_code,
                product_code=product_code,
                benchmark_type=cost_type,
                is_active=True
            ).first()

            if not benchmark:
                # Try project-level
                benchmark = SaleBenchmark.objects.filter(
                    scope_level='project',
                    project_id=project_id,
                    benchmark_type=cost_type,
                    is_active=True
                ).first()

            if not benchmark:
                # Use global default
                benchmark = SaleBenchmark.objects.filter(
                    scope_level='global',
                    benchmark_type=cost_type,
                    is_active=True
                ).first()

            if benchmark:
                benchmarks[cost_type] = {
                    'rate': float(benchmark.rate_pct) if benchmark.rate_pct else 0,
                    'fixed_amount': float(benchmark.fixed_amount) if benchmark.fixed_amount else None,
                    'source': benchmark.scope_level,
                    'description': benchmark.description
                }

        # Improvement offset — resolved BY UNIT OF MEASURE (CB14). An offset
        # benchmark applies only to parcels priced in its unit, so each scope
        # tier (product > project > global) is filtered to the parcel's UOM.
        def _offset_qs(**scope):
            qs = SaleBenchmark.objects.filter(
                benchmark_type='improvement_offset', is_active=True, **scope)
            if pricing_uom:
                qs = qs.filter(uom_code=pricing_uom)
            return qs

        imp_benchmark = (
            _offset_qs(scope_level='product', project_id=project_id,
                       lu_type_code=lu_type_code, product_code=product_code).first()
            or _offset_qs(scope_level='project', project_id=project_id).first()
            or _offset_qs(scope_level='global').first()
        )

        if imp_benchmark:
            benchmarks['improvement_offset'] = {
                'amount_per_uom': float(imp_benchmark.amount_per_uom) if imp_benchmark.amount_per_uom else 0,
                'uom': imp_benchmark.uom_code,
                'source': imp_benchmark.scope_level,
                'description': imp_benchmark.description
            }
        elif pricing_uom:
            # No offset matches this parcel's UOM. Distinguish "an offset exists
            # but in a different unit" from "no offset configured at all" so the
            # caller never conflates unknown with a deliberate zero.
            any_offset = SaleBenchmark.objects.filter(
                benchmark_type='improvement_offset', is_active=True).exists()
            benchmarks['improvement_offset_absent'] = 'wrong_uom' if any_offset else 'none'

        return benchmarks

    @staticmethod
    def resolve_offset_status(project_id, lu_type_code, product_code, pricing_uom,
                              lot_width, units_total, acres_gross):
        """Offset-resolution status for a parcel WITHOUT computing the amount (CB15).

        Lets the sales schedule show WHY a parcel has no offset — unknown, not a
        silent $0 — deterministically, using the same UOM-filtered lookup and
        availability checks as calculate_sale_proceeds. Returns one of:
        'applied' | 'no_offset_benchmark_for_uom' | 'no_offset_benchmark' |
        'frontage_unavailable' | 'units_unavailable' | 'area_unavailable' |
        'unsupported_uom'."""
        uom = (pricing_uom or 'EA').replace('$/', '')
        bm = SaleCalculationService.get_benchmarks_for_parcel(
            project_id, lu_type_code, product_code or '', pricing_uom=uom)
        offset = bm.get('improvement_offset')
        if not offset or not offset.get('amount_per_uom'):
            return ('no_offset_benchmark_for_uom'
                    if bm.get('improvement_offset_absent') == 'wrong_uom'
                    else 'no_offset_benchmark')
        u = uom.upper()
        if u == 'FF':
            return 'applied' if (lot_width and units_total) else 'frontage_unavailable'
        if u in ('EA', 'UN', 'UNIT'):
            return 'applied' if units_total else 'units_unavailable'
        if u in ('SF', 'AC'):
            return 'applied' if acres_gross else 'area_unavailable'
        return 'unsupported_uom'

    @staticmethod
    def calculate_sale_proceeds(
        parcel_data: dict,
        pricing_data: dict,
        sale_date: str,
        overrides: Optional[Dict] = None,
        cost_inflation_rate: Optional[float] = None
    ) -> Dict:
        """
        Calculate complete sale proceeds with all deductions

        Args:
            parcel_data: Dict with parcel fields (lot_width, units_total, acres_gross, type_code, product_code, project_id, sale_period)
            pricing_data: Dict with pricing fields (price_per_unit, unit_of_measure, growth_rate, pricing_effective_date)
            sale_date: Date of sale (YYYY-MM-DD string)
            overrides: Dict of user overrides (optional)
            cost_inflation_rate: Annual cost inflation rate for improvement offset escalation (e.g., 0.03 for 3%)

        Returns:
            Dict with complete calculation breakdown
        """
        from decimal import Decimal
        from datetime import datetime
        from .utils import calculate_inflated_price, calculate_inflated_price_from_periods

        # Check if we have sale_period (more accurate for monthly compounding)
        if 'sale_period' in parcel_data and parcel_data['sale_period']:
            # Use period-based calculation (matches Excel FV function exactly)
            inflated_price = calculate_inflated_price_from_periods(
                base_price=Decimal(str(pricing_data['price_per_unit'])),
                growth_rate=Decimal(str(pricing_data['growth_rate'])),
                periods=int(parcel_data['sale_period'])
            )
        else:
            # Fallback to date-based calculation with monthly compounding
            sale_date_obj = datetime.strptime(sale_date, '%Y-%m-%d').date()
            base_date = datetime.strptime(pricing_data['pricing_effective_date'], '%Y-%m-%d').date()

            inflated_price = calculate_inflated_price(
                base_price=Decimal(str(pricing_data['price_per_unit'])),
                growth_rate=Decimal(str(pricing_data['growth_rate'])),
                base_date=base_date,
                closing_date=sale_date_obj
            )

        # Get UOM calculation
        parcel_calc_data = {
            'lot_width': float(parcel_data.get('lot_width') or 0),
            'units': int(parcel_data.get('units_total') or 0),
            'acres': float(parcel_data.get('acres_gross') or 0)
        }

        gross_parcel_price = UOMCalculationService.calculate_gross_value(
            uom_code=pricing_data['unit_of_measure'],
            parcel_data=parcel_calc_data,
            inflated_price=float(inflated_price)
        )

        # Get benchmarks
        # Normalize the parcel's pricing UOM so the improvement offset resolves
        # by unit of measure (CB14).
        _raw_uom = pricing_data.get('unit_of_measure')
        _pricing_uom = (_raw_uom.replace('$/', '') if _raw_uom else 'EA')
        benchmarks = SaleCalculationService.get_benchmarks_for_parcel(
            project_id=parcel_data['project_id'],
            lu_type_code=parcel_data['type_code'],
            product_code=parcel_data.get('product_code', ''),
            pricing_uom=_pricing_uom,
        )

        # Apply overrides if provided
        if overrides:
            improvement_offset_per_uom = Decimal(str(overrides.get('improvement_offset_per_uom',
                benchmarks.get('improvement_offset', {}).get('amount_per_uom', 0))))
            improvement_offset_source = 'manual_override' if 'improvement_offset_per_uom' in overrides else \
                f"benchmark_{benchmarks.get('improvement_offset', {}).get('source', 'global')}"

            # CB13: a benchmark's fixed_amount SURVIVES an override of another
            # cost — an override replaces only the cost it names. The prior code
            # set legal/closing/title _fixed to None here, so any override (e.g.
            # commission) silently dropped the fixed legal/closing/title
            # benchmarks (~$50k/parcel).
            if 'legal_pct' in overrides:
                legal_fixed = None
                legal_pct = Decimal(str(overrides['legal_pct']))
            else:
                legal_fixed = benchmarks.get('legal', {}).get('fixed_amount')
                legal_pct = Decimal(str(benchmarks.get('legal', {}).get('rate', 0))) if not legal_fixed else Decimal('0')
            commission_pct = Decimal(str(overrides.get('commission_pct',
                benchmarks.get('commission', {}).get('rate', 0))))
            # CB9: a user-typed commission dollar amount is a FIXED override —
            # honored to the cent, exactly like a benchmark fixed_amount. This is
            # what lets an edited commission survive a recalc: commission_pct is
            # numeric(5,4) in the DB, too coarse to round-trip the dollars, so
            # the amount itself is the source of truth when overridden.
            _commission_amount_override = overrides.get('commission_amount')
            commission_fixed = (Decimal(str(_commission_amount_override))
                                if _commission_amount_override is not None else None)
            if 'closing_cost_pct' in overrides:
                closing_fixed = None
                closing_pct = Decimal(str(overrides['closing_cost_pct']))
            else:
                closing_fixed = benchmarks.get('closing', {}).get('fixed_amount')
                closing_pct = Decimal(str(benchmarks.get('closing', {}).get('rate', 0))) if not closing_fixed else Decimal('0')
            if 'title_insurance_pct' in overrides:
                title_fixed = None
                title_pct = Decimal(str(overrides['title_insurance_pct']))
            else:
                title_fixed = benchmarks.get('title_insurance', {}).get('fixed_amount')
                title_pct = Decimal(str(benchmarks.get('title_insurance', {}).get('rate', 0))) if not title_fixed else Decimal('0')
            custom_costs = overrides.get('custom_transaction_costs', [])
        else:
            improvement_offset_per_uom = Decimal(str(benchmarks.get('improvement_offset', {}).get('amount_per_uom', 0)))
            improvement_offset_source = f"benchmark_{benchmarks.get('improvement_offset', {}).get('source', 'global')}"

            # Check for fixed amounts first, then fall back to percentages
            legal_fixed = benchmarks.get('legal', {}).get('fixed_amount')
            legal_pct = Decimal(str(benchmarks.get('legal', {}).get('rate', 0))) if not legal_fixed else Decimal('0')

            commission_fixed = benchmarks.get('commission', {}).get('fixed_amount')
            commission_pct = Decimal(str(benchmarks.get('commission', {}).get('rate', 0))) if not commission_fixed else Decimal('0')

            closing_fixed = benchmarks.get('closing', {}).get('fixed_amount')
            closing_pct = Decimal(str(benchmarks.get('closing', {}).get('rate', 0))) if not closing_fixed else Decimal('0')

            title_fixed = benchmarks.get('title_insurance', {}).get('fixed_amount')
            title_pct = Decimal(str(benchmarks.get('title_insurance', {}).get('rate', 0))) if not title_fixed else Decimal('0')

            custom_costs = []

        # Improvement offset — resolve by UNIT OF MEASURE (CB14).
        #
        # An offset denominated per FRONT FOOT applies ONLY to parcels priced in
        # front feet; per UNIT only to parcels priced in units; per ACRE only to
        # acres. The benchmark's uom_code and the parcel's pricing UOM must AGREE
        # before any multiplication — a rate in feet must never be multiplied by
        # a count of doors. Two facts the old code conflated with a silent $0:
        #   * UNKNOWN — no offset benchmark matches this parcel's UOM (or the
        #     benchmark can't declare its own unit, or a per-FF offset has no
        #     derivable frontage). Refused, with an explicit status; NOT a zero
        #     that reads as a deliberate assumption.
        #   * ZERO — no offset is configured at all.
        # The wrong-unit multiplication is made impossible here, at the point of
        # multiplication, not merely discouraged.
        raw_uom = pricing_data['unit_of_measure']
        uom = raw_uom.replace('$/', '') if raw_uom else 'EA'
        offset_bm = benchmarks.get('improvement_offset', {})
        # No fallback to the parcel's UOM: a benchmark that cannot state its own
        # unit cannot be safely applied. That fallback is exactly what let a
        # $/FF rate be multiplied by a unit count.
        benchmark_uom = offset_bm.get('uom')

        # Escalate the per-uom rate to the sale period (unit-agnostic).
        sale_period = parcel_data.get('sale_period')
        if cost_inflation_rate and sale_period and improvement_offset_per_uom:
            inflated_offset_per_uom = calculate_inflated_price_from_periods(
                base_price=improvement_offset_per_uom,
                growth_rate=Decimal(str(cost_inflation_rate)),
                periods=int(sale_period)
            )
        else:
            inflated_offset_per_uom = improvement_offset_per_uom

        _lot_w = Decimal(str(parcel_data.get('lot_width') or 0))
        _units = Decimal(str(parcel_data.get('units_total') or 0))
        _acres = Decimal(str(parcel_data.get('acres_gross') or 0))

        improvement_offset_total = Decimal('0')
        if not improvement_offset_per_uom:
            # No offset applies to this parcel's UOM. Distinguish "an offset
            # exists but in a different unit" (unknown for this UOM) from
            # "none configured at all" — never conflate unknown with a zero.
            improvement_offset_status = (
                'no_offset_benchmark_for_uom'
                if benchmarks.get('improvement_offset_absent') == 'wrong_uom'
                else 'no_offset_benchmark'
            )
        elif not benchmark_uom:
            improvement_offset_status = 'benchmark_missing_uom'
        elif benchmark_uom != uom:
            # Unit mismatch: refuse rather than multiply by the wrong denominator.
            improvement_offset_status = 'no_offset_benchmark_for_uom'
        elif uom.upper() == 'FF':
            frontage = _lot_w * _units
            if frontage <= 0:
                improvement_offset_status = 'frontage_unavailable'
            else:
                improvement_offset_total = inflated_offset_per_uom * frontage
                improvement_offset_status = 'applied'
        elif uom.upper() in ('EA', 'UN', 'UNIT'):
            if _units <= 0:
                improvement_offset_status = 'units_unavailable'
            else:
                improvement_offset_total = inflated_offset_per_uom * _units
                improvement_offset_status = 'applied'
        elif uom.upper() == 'SF':
            if _acres <= 0:
                improvement_offset_status = 'area_unavailable'
            else:
                improvement_offset_total = inflated_offset_per_uom * _acres * Decimal('43560')
                improvement_offset_status = 'applied'
        elif uom.upper() == 'AC':
            if _acres <= 0:
                improvement_offset_status = 'area_unavailable'
            else:
                improvement_offset_total = inflated_offset_per_uom * _acres
                improvement_offset_status = 'applied'
        else:
            improvement_offset_status = 'unsupported_uom'

        if improvement_offset_status != 'applied':
            # Surface WHY there is no offset (never a silent $0). The recalc
            # response carries improvement_offset_status; the persisted
            # improvement_offset_source records the reason for the schedule.
            improvement_offset_total = Decimal('0')
            improvement_offset_source = improvement_offset_status

        # Gross sale proceeds (after improvement offset)
        gross_sale_proceeds = Decimal(str(gross_parcel_price)) - improvement_offset_total

        # Transaction costs - use fixed amounts if available, otherwise calculate as percentage
        legal_amount = Decimal(str(legal_fixed)) if legal_fixed else (gross_sale_proceeds * legal_pct)
        # `is not None` (not truthiness) so an explicit $0 commission override is
        # honored rather than silently reverting to the benchmark percentage.
        commission_amount = Decimal(str(commission_fixed)) if commission_fixed is not None else (gross_sale_proceeds * commission_pct)
        # When commission is a fixed dollar override, express the pct off the
        # actual gross so the stored commission_pct stays consistent with the
        # amount (the amount is the source of truth; pct is display / back-compat).
        if commission_fixed is not None:
            commission_pct = (commission_amount / gross_sale_proceeds
                              if gross_sale_proceeds else Decimal('0'))
        closing_amount = Decimal(str(closing_fixed)) if closing_fixed else (gross_sale_proceeds * closing_pct)
        title_amount = Decimal(str(title_fixed)) if title_fixed else (gross_sale_proceeds * title_pct)

        # Custom costs
        custom_total = sum(Decimal(str(cost['amount'])) for cost in custom_costs)

        total_transaction_costs = legal_amount + commission_amount + closing_amount + title_amount + custom_total

        # Net sale proceeds
        net_sale_proceeds = gross_sale_proceeds - total_transaction_costs

        # Net per UOM
        if uom == 'FF' and parcel_data.get('lot_width') and parcel_data.get('units_total'):
            net_proceeds_per_uom = net_sale_proceeds / (Decimal(str(parcel_data['lot_width'])) * Decimal(str(parcel_data['units_total'])))
        elif uom in ['EA', 'UN'] and parcel_data.get('units_total'):
            net_proceeds_per_uom = net_sale_proceeds / Decimal(str(parcel_data['units_total']))
        elif uom == 'SF' and parcel_data.get('acres_gross'):
            net_proceeds_per_uom = net_sale_proceeds / (Decimal(str(parcel_data['acres_gross'])) * Decimal('43560'))
        elif uom == 'AC' and parcel_data.get('acres_gross'):
            net_proceeds_per_uom = net_sale_proceeds / Decimal(str(parcel_data['acres_gross']))
        else:
            net_proceeds_per_uom = net_sale_proceeds

        return {
            'sale_date': sale_date,
            'base_price_per_unit': float(pricing_data['price_per_unit']),
            'price_uom': pricing_data['unit_of_measure'],
            'inflation_rate': float(pricing_data['growth_rate']),
            'inflated_price_per_unit': float(inflated_price),
            'gross_parcel_price': float(gross_parcel_price),

            'improvement_offset_per_uom': float(improvement_offset_per_uom),
            'improvement_offset_total': float(improvement_offset_total),
            'improvement_offset_source': improvement_offset_source,
            'improvement_offset_status': improvement_offset_status,

            'gross_sale_proceeds': float(gross_sale_proceeds),

            'legal_pct': float(legal_pct),
            'legal_amount': float(legal_amount),
            'legal_is_fixed': legal_fixed is not None,
            'commission_pct': float(commission_pct),
            'commission_amount': float(commission_amount),
            'commission_is_fixed': commission_fixed is not None,
            'closing_cost_pct': float(closing_pct),
            'closing_cost_amount': float(closing_amount),
            'closing_cost_is_fixed': closing_fixed is not None,
            'title_insurance_pct': float(title_pct),
            'title_insurance_amount': float(title_amount),
            'title_insurance_is_fixed': title_fixed is not None,

            'custom_transaction_costs': custom_costs,

            'total_transaction_costs': float(total_transaction_costs),
            'net_sale_proceeds': float(net_sale_proceeds),
            'net_proceeds_per_uom': float(net_proceeds_per_uom),

            'benchmarks': benchmarks
        }
