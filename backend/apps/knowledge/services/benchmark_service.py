"""
Benchmark Query Service for IREM and other industry benchmarks.

Provides structured queries against opex_benchmark table for expense
validation and comparison. Used by Landscaper for benchmark-related queries.
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal
from django.db.models import Q
from apps.knowledge.models import OpexBenchmark


class BenchmarkService:
    """
    Query IREM and other benchmarks for expense validation.
    """

    def get_benchmark(
        self,
        expense_category: str,
        expense_subcategory: Optional[str] = None,
        property_type: str = 'multifamily',
        source: str = 'IREM',
        source_year: Optional[int] = None,
        geographic_scope: str = 'national',
    ) -> Optional[Dict[str, Any]]:
        """
        Get a single benchmark value.
        If source_year not specified, returns most recent.
        """
        query = OpexBenchmark.objects.filter(
            source=source,
            property_type=property_type,
            expense_category=expense_category,
            geographic_scope=geographic_scope,
        )

        if expense_subcategory:
            query = query.filter(expense_subcategory=expense_subcategory)
        else:
            query = query.filter(expense_subcategory__isnull=True)

        if source_year:
            query = query.filter(source_year=source_year)
        else:
            query = query.order_by('-source_year')

        benchmark = query.first()

        if not benchmark:
            return None

        return {
            'source': benchmark.source,
            'source_year': benchmark.source_year,
            'report_name': benchmark.report_name,
            'expense_category': benchmark.expense_category,
            'expense_subcategory': benchmark.expense_subcategory,
            'property_type': benchmark.property_type,
            'property_subtype': benchmark.property_subtype,
            'per_unit_amount': float(benchmark.per_unit_amount) if benchmark.per_unit_amount else None,
            'per_sf_amount': float(benchmark.per_sf_amount) if benchmark.per_sf_amount else None,
            'pct_of_egi': float(benchmark.pct_of_egi) if benchmark.pct_of_egi else None,
            'pct_of_gpi': float(benchmark.pct_of_gpi) if benchmark.pct_of_gpi else None,
            'sample_size': benchmark.sample_size,
            'notes': benchmark.notes,
        }

    def compare_to_benchmark(
        self,
        actual_value: float,
        value_type: str,  # 'per_unit', 'pct_of_egi', 'pct_of_gpi'
        expense_category: str,
        expense_subcategory: Optional[str] = None,
        property_type: str = 'multifamily',
    ) -> Dict[str, Any]:
        """
        Compare an actual expense value to IREM benchmark.
        Returns variance and assessment.
        """
        benchmark = self.get_benchmark(
            expense_category=expense_category,
            expense_subcategory=expense_subcategory,
            property_type=property_type,
        )

        if not benchmark:
            return {
                'has_benchmark': False,
                'message': f"No benchmark available for {expense_category}"
            }

        # Get benchmark value based on type
        if value_type == 'per_unit':
            benchmark_value = benchmark['per_unit_amount']
        elif value_type == 'pct_of_egi':
            benchmark_value = benchmark['pct_of_egi']
        elif value_type == 'pct_of_gpi':
            benchmark_value = benchmark['pct_of_gpi']
        else:
            return {'has_benchmark': False, 'message': f"Unknown value_type: {value_type}"}

        if benchmark_value is None:
            return {
                'has_benchmark': False,
                'message': f"Benchmark exists but no {value_type} data available"
            }

        # Calculate variance
        actual = float(actual_value)
        variance = actual - benchmark_value
        variance_pct = (variance / benchmark_value * 100) if benchmark_value != 0 else 0

        # Assess
        if abs(variance_pct) <= 10:
            assessment = 'within_range'
            message = f"Your {expense_category} is within 10% of IREM benchmark."
        elif variance_pct > 10:
            assessment = 'above_benchmark'
            message = f"Your {expense_category} is {variance_pct:.1f}% above IREM benchmark."
        else:
            assessment = 'below_benchmark'
            message = f"Your {expense_category} is {abs(variance_pct):.1f}% below IREM benchmark."

        return {
            'has_benchmark': True,
            'actual_value': actual,
            'benchmark_value': benchmark_value,
            'variance': variance,
            'variance_pct': round(variance_pct, 1),
            'assessment': assessment,
            'message': message,
            'source': benchmark['source'],
            'source_year': benchmark['source_year'],
            'sample_size': benchmark['sample_size'],
            'notes': benchmark.get('notes'),
        }

    def get_all_benchmarks_for_category(
        self,
        expense_category: str,
        property_type: str = 'multifamily',
    ) -> List[Dict[str, Any]]:
        """
        Get all years of benchmark data for a category.
        Useful for trend analysis.
        """
        benchmarks = OpexBenchmark.objects.filter(
            expense_category=expense_category,
            expense_subcategory__isnull=True,
            property_type=property_type,
            geographic_scope='national',
        ).order_by('-source_year')

        return [
            {
                'source': b.source,
                'source_year': b.source_year,
                'per_unit_amount': float(b.per_unit_amount) if b.per_unit_amount else None,
                'pct_of_egi': float(b.pct_of_egi) if b.pct_of_egi else None,
                'pct_of_gpi': float(b.pct_of_gpi) if b.pct_of_gpi else None,
                'sample_size': b.sample_size,
                'notes': b.notes,
            }
            for b in benchmarks
        ]

    def get_expense_summary(
        self,
        source: str = 'IREM',
        source_year: int = 2024,
        property_type: str = 'multifamily',
    ) -> Dict[str, Any]:
        """
        Get complete expense breakdown for a year.
        """
        benchmarks = OpexBenchmark.objects.filter(
            source=source,
            source_year=source_year,
            property_type=property_type,
            geographic_scope='national',
        ).order_by('expense_category', 'expense_subcategory')

        result: Dict[str, Any] = {
            'source': source,
            'source_year': source_year,
            'property_type': property_type,
            'categories': {}
        }

        for b in benchmarks:
            cat = b.expense_category
            subcat = b.expense_subcategory

            if cat not in result['categories']:
                result['categories'][cat] = {
                    'total': None,
                    'subcategories': {}
                }

            data = {
                'per_unit_amount': float(b.per_unit_amount) if b.per_unit_amount else None,
                'pct_of_egi': float(b.pct_of_egi) if b.pct_of_egi else None,
                'sample_size': b.sample_size,
            }

            if subcat:
                result['categories'][cat]['subcategories'][subcat] = data
            else:
                result['categories'][cat]['total'] = data

        return result

    def search_benchmarks(
        self,
        query: str,
        property_type: str = 'multifamily',
        source_year: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search benchmarks by keyword in category/subcategory names.
        Used for natural language queries like "what about R&M?"
        """
        query_lower = query.lower()

        # Map common terms to expense categories
        category_aliases = {
            'r&m': 'repairs_maintenance',
            'repairs': 'repairs_maintenance',
            'maintenance': 'repairs_maintenance',
            'management': 'management_fee',
            'management fee': 'management_fee',
            'utilities': 'utilities',
            'electric': 'electricity',
            'electricity': 'electricity',
            'water': 'water_sewer',
            'sewer': 'water_sewer',
            'gas': 'gas',
            'trash': 'trash',
            'garbage': 'trash',
            'insurance': 'insurance',
            'taxes': 'real_estate_taxes',
            'property tax': 'real_estate_taxes',
            'real estate tax': 'real_estate_taxes',
            'administrative': 'administrative',
            'admin': 'administrative',
            'payroll': 'payroll',
            'advertising': 'advertising',
            'marketing': 'advertising',
            'security': 'security',
            'professional': 'professional_fees',
            'legal': 'professional_fees',
            'grounds': 'grounds_maintenance',
            'landscaping': 'grounds_maintenance',
            'total': 'total_opex',
            'opex': 'total_opex',
            'operating expense': 'total_opex',
            'noi': 'noi',
            'net operating income': 'noi',
        }

        # Find matching category
        target_category = None
        target_subcategory = None

        for alias, mapped in category_aliases.items():
            if alias in query_lower:
                # Check if it's a subcategory or main category
                if mapped in ['repairs_maintenance', 'management_fee', 'advertising',
                              'professional_fees', 'other_admin', 'payroll',
                              'grounds_maintenance', 'security', 'electricity',
                              'water_sewer', 'gas', 'trash', 'real_estate_taxes', 'insurance']:
                    target_subcategory = mapped
                else:
                    target_category = mapped
                break

        # Build query
        filters = Q(property_type=property_type, geographic_scope='national')

        if source_year:
            filters &= Q(source_year=source_year)

        if target_subcategory:
            filters &= Q(expense_subcategory=target_subcategory)
        elif target_category:
            filters &= Q(expense_category=target_category, expense_subcategory__isnull=True)

        benchmarks = OpexBenchmark.objects.filter(filters).order_by('-source_year')[:5]

        return [
            {
                'source': b.source,
                'source_year': b.source_year,
                'expense_category': b.expense_category,
                'expense_subcategory': b.expense_subcategory,
                'per_unit_amount': float(b.per_unit_amount) if b.per_unit_amount else None,
                'pct_of_egi': float(b.pct_of_egi) if b.pct_of_egi else None,
                'pct_of_gpi': float(b.pct_of_gpi) if b.pct_of_gpi else None,
                'sample_size': b.sample_size,
                'notes': b.notes,
            }
            for b in benchmarks
        ]


# Singleton instance
_benchmark_service: Optional[BenchmarkService] = None


def get_benchmark_service() -> BenchmarkService:
    """Get singleton BenchmarkService instance."""
    global _benchmark_service
    if _benchmark_service is None:
        _benchmark_service = BenchmarkService()
    return _benchmark_service
