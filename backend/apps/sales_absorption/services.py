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
    def get_benchmarks_for_parcel(project_id: int, lu_type_code: str, product_code: str) -> Dict:
        """
        Fetch benchmarks using hierarchy: product > project > global

        Returns dict with benchmark values for:
        - improvement_offset
        - legal
        - commission
        - closing
        - title_insurance
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

        # Improvement offset
        imp_benchmark = SaleBenchmark.objects.filter(
            scope_level='product',
            project_id=project_id,
            lu_type_code=lu_type_code,
            product_code=product_code,
            benchmark_type='improvement_offset',
            is_active=True
        ).first()

        if not imp_benchmark:
            imp_benchmark = SaleBenchmark.objects.filter(
                scope_level='project',
                project_id=project_id,
                benchmark_type='improvement_offset',
                is_active=True
            ).first()

        if not imp_benchmark:
            imp_benchmark = SaleBenchmark.objects.filter(
                scope_level='global',
                benchmark_type='improvement_offset',
                is_active=True
            ).first()

        if imp_benchmark:
            benchmarks['improvement_offset'] = {
                'amount_per_uom': float(imp_benchmark.amount_per_uom) if imp_benchmark.amount_per_uom else 0,
                'uom': imp_benchmark.uom_code,
                'source': imp_benchmark.scope_level,
                'description': imp_benchmark.description
            }

        return benchmarks

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
        benchmarks = SaleCalculationService.get_benchmarks_for_parcel(
            project_id=parcel_data['project_id'],
            lu_type_code=parcel_data['type_code'],
            product_code=parcel_data.get('product_code', '')
        )

        # Apply overrides if provided
        if overrides:
            improvement_offset_per_uom = Decimal(str(overrides.get('improvement_offset_per_uom',
                benchmarks.get('improvement_offset', {}).get('amount_per_uom', 0))))
            improvement_offset_source = 'manual_override' if 'improvement_offset_per_uom' in overrides else \
                f"benchmark_{benchmarks.get('improvement_offset', {}).get('source', 'global')}"

            legal_pct = Decimal(str(overrides.get('legal_pct',
                benchmarks.get('legal', {}).get('rate', 0))))
            legal_fixed = None
            commission_pct = Decimal(str(overrides.get('commission_pct',
                benchmarks.get('commission', {}).get('rate', 0))))
            commission_fixed = None
            closing_pct = Decimal(str(overrides.get('closing_cost_pct',
                benchmarks.get('closing', {}).get('rate', 0))))
            closing_fixed = None
            title_pct = Decimal(str(overrides.get('title_insurance_pct',
                benchmarks.get('title_insurance', {}).get('rate', 0))))
            title_fixed = None
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

        # Calculate improvement offset total
        raw_uom = pricing_data['unit_of_measure']
        # Normalize UOM: strip $/prefix if present (e.g., '$/FF' -> 'FF')
        uom = raw_uom.replace('$/', '') if raw_uom else 'EA'
        benchmark_uom = benchmarks.get('improvement_offset', {}).get('uom', uom)

        # Apply cost inflation to improvement offset if rate is provided
        sale_period = parcel_data.get('sale_period')
        if cost_inflation_rate and sale_period and improvement_offset_per_uom:
            inflated_offset_per_uom = calculate_inflated_price_from_periods(
                base_price=improvement_offset_per_uom,
                growth_rate=Decimal(str(cost_inflation_rate)),
                periods=int(sale_period)
            )
        else:
            inflated_offset_per_uom = improvement_offset_per_uom

        # Only apply improvement offset if the benchmark UOM matches the pricing UOM (after normalization)
        if inflated_offset_per_uom and benchmark_uom == uom:
            if uom == 'FF':
                improvement_offset_total = inflated_offset_per_uom * Decimal(str(parcel_data.get('lot_width', 0))) * Decimal(str(parcel_data.get('units_total', 0)))
            elif uom in ['EA', 'UN']:
                improvement_offset_total = inflated_offset_per_uom * Decimal(str(parcel_data.get('units_total', 0)))
            elif uom == 'SF':
                improvement_offset_total = inflated_offset_per_uom * Decimal(str(parcel_data.get('acres_gross', 0))) * Decimal('43560')
            elif uom == 'AC':
                improvement_offset_total = inflated_offset_per_uom * Decimal(str(parcel_data.get('acres_gross', 0)))
            else:  # $$$
                improvement_offset_total = Decimal('0')
        else:
            # UOM mismatch or no offset - don't apply improvement offset
            improvement_offset_total = Decimal('0')

        # Gross sale proceeds (after improvement offset)
        gross_sale_proceeds = Decimal(str(gross_parcel_price)) - improvement_offset_total

        # Transaction costs - use fixed amounts if available, otherwise calculate as percentage
        legal_amount = Decimal(str(legal_fixed)) if legal_fixed else (gross_sale_proceeds * legal_pct)
        commission_amount = Decimal(str(commission_fixed)) if commission_fixed else (gross_sale_proceeds * commission_pct)
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
