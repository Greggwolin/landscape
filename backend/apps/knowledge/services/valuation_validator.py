"""
Valuation Validator - Passive completeness checking based on Appraisal of Real Estate methodology.

This service checks extracted/entered data against what the 14th Edition says
should be present for proper valuation of each property type.

Usage:
    from apps.knowledge.services.valuation_validator import ValuationValidator, PropertyType

    validator = ValuationValidator(PropertyType.MULTIFAMILY)
    gaps = validator.validate(project_data)

    for gap in gaps:
        print(f"[{gap.severity.value}] Missing: {gap.field}")
        print(f"  Reference: {gap.chapter_reference}")
        print(f"  Typical: {gap.typical_value}")
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum


class PropertyType(Enum):
    MULTIFAMILY = "multifamily"
    RETAIL = "retail"
    OFFICE = "office"
    INDUSTRIAL = "industrial"
    LAND = "land"
    SUBDIVISION = "subdivision"
    HOTEL = "hotel"
    SPECIAL_PURPOSE = "special-purpose"


class Severity(Enum):
    CRITICAL = "critical"      # Cannot proceed without this
    WARNING = "warning"        # Should have, can estimate
    INFO = "info"              # Nice to have


@dataclass
class ValidationGap:
    """Represents a missing or incomplete data element."""
    field: str
    description: str
    severity: Severity
    chapter_reference: str      # e.g., "Ch. 22: Income and Expense Analysis"
    typical_value: Optional[str] = None  # e.g., "2-4% of EGI"
    suggested_action: Optional[str] = None


class ValuationValidator:
    """
    Validates project data against appraisal methodology standards.

    Based on requirements from "The Appraisal of Real Estate, 14th Edition"
    published by the Appraisal Institute.
    """

    # Required elements by property type (from 14th Edition)
    # Format: (field_name, description, severity, chapter_reference, typical_value)
    INCOME_APPROACH_REQUIREMENTS: Dict[PropertyType, Dict[str, List[tuple]]] = {
        PropertyType.MULTIFAMILY: {
            'revenue': [
                ('rent_roll', 'Unit-level rent roll with current rents', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('market_rents', 'Market rent comparables or estimates', Severity.WARNING,
                 'Ch. 22: Income and Expense Analysis', None),
                ('vacancy_rate', 'Vacancy allowance', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', '5-7% for stabilized'),
                ('collection_loss', 'Collection/credit loss allowance', Severity.WARNING,
                 'Ch. 22: Income and Expense Analysis', '1-2% of PGI'),
                ('other_income', 'Other income (laundry, parking, fees)', Severity.INFO,
                 'Ch. 22: Income and Expense Analysis', None),
            ],
            'expenses': [
                ('real_estate_taxes', 'Real estate taxes', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('insurance', 'Property insurance', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('utilities', 'Utilities (if owner-paid)', Severity.WARNING,
                 'Ch. 22: Income and Expense Analysis', None),
                ('management_fee', 'Management fee', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', '3-6% of EGI'),
                ('repairs_maintenance', 'Repairs and maintenance', Severity.WARNING,
                 'Ch. 22: Income and Expense Analysis', None),
                ('replacement_reserves', 'Replacement reserves', Severity.WARNING,
                 'Ch. 22: Income and Expense Analysis', '$200-400/unit or 2-4% of EGI'),
                ('payroll', 'Payroll/on-site staff', Severity.INFO,
                 'Ch. 22: Income and Expense Analysis', None),
            ],
            'valuation': [
                ('cap_rate', 'Capitalization rate', Severity.CRITICAL,
                 'Ch. 23: Direct Capitalization', None),
                ('cap_rate_source', 'Cap rate derivation/source', Severity.WARNING,
                 'Ch. 23: Direct Capitalization', 'Market extraction preferred'),
            ]
        },

        PropertyType.RETAIL: {
            'revenue': [
                ('rent_roll', 'Tenant rent roll with lease terms', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('lease_expirations', 'Lease expiration schedule', Severity.CRITICAL,
                 'Ch. 26: Applications of Income Capitalization', None),
                ('cam_reimbursements', 'CAM reimbursements', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('percentage_rent', 'Percentage rent (if applicable)', Severity.INFO,
                 'Ch. 22: Income and Expense Analysis', None),
                ('vacancy_rate', 'Vacancy allowance', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('tenant_credit', 'Tenant credit quality assessment', Severity.WARNING,
                 'Ch. 26: Applications of Income Capitalization', None),
            ],
            'expenses': [
                ('cam_expenses', 'CAM expenses breakdown', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('real_estate_taxes', 'Real estate taxes', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('insurance', 'Property insurance', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('management_fee', 'Management fee', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', '3-5% of EGI'),
                ('leasing_commissions', 'Leasing commission reserve', Severity.WARNING,
                 'Ch. 26: Applications of Income Capitalization', None),
                ('tenant_improvements', 'TI allowance reserve', Severity.WARNING,
                 'Ch. 26: Applications of Income Capitalization', None),
            ],
            'valuation': [
                ('cap_rate', 'Capitalization rate', Severity.CRITICAL,
                 'Ch. 23: Direct Capitalization', None),
                ('tenant_rollover_analysis', 'Tenant rollover impact', Severity.WARNING,
                 'Ch. 26: Applications of Income Capitalization', None),
            ]
        },

        PropertyType.OFFICE: {
            'revenue': [
                ('rent_roll', 'Tenant rent roll with lease terms', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('lease_type', 'Lease type (gross, modified gross, NNN)', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('rentable_sf', 'Rentable square footage', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('usable_sf', 'Usable square footage', Severity.WARNING,
                 'Ch. 22: Income and Expense Analysis', None),
                ('loss_factor', 'Load/loss factor', Severity.WARNING,
                 'Ch. 22: Income and Expense Analysis', '10-20% typical'),
                ('expense_stops', 'Expense stops or base years', Severity.WARNING,
                 'Ch. 22: Income and Expense Analysis', None),
            ],
            'expenses': [
                ('operating_expenses', 'Full operating expense breakdown', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('management_fee', 'Management fee', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', '3-5% of EGI'),
                ('leasing_commissions', 'Leasing commission reserve', Severity.CRITICAL,
                 'Ch. 26: Applications of Income Capitalization', '$3-6/SF/year of term'),
                ('tenant_improvements', 'TI allowance reserve', Severity.CRITICAL,
                 'Ch. 26: Applications of Income Capitalization', '$20-60/SF new, $5-15/SF renewal'),
            ],
            'valuation': [
                ('cap_rate', 'Capitalization rate', Severity.CRITICAL,
                 'Ch. 23: Direct Capitalization', None),
                ('building_class', 'Building classification (A/B/C)', Severity.WARNING,
                 'Ch. 15: Market Analysis', None),
            ]
        },

        PropertyType.INDUSTRIAL: {
            'revenue': [
                ('rent_roll', 'Tenant rent roll with lease terms', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('lease_type', 'Lease type (NNN typical)', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('rentable_sf', 'Rentable/leasable square footage', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('clear_height', 'Clear height', Severity.WARNING,
                 'Ch. 13: Building Description', None),
                ('loading_docks', 'Loading dock count/configuration', Severity.WARNING,
                 'Ch. 13: Building Description', None),
            ],
            'expenses': [
                ('real_estate_taxes', 'Real estate taxes', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('insurance', 'Property insurance', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', None),
                ('management_fee', 'Management fee', Severity.CRITICAL,
                 'Ch. 22: Income and Expense Analysis', '2-4% of EGI'),
            ],
            'valuation': [
                ('cap_rate', 'Capitalization rate', Severity.CRITICAL,
                 'Ch. 23: Direct Capitalization', None),
            ]
        },

        PropertyType.LAND: {
            'physical': [
                ('site_size', 'Site size (acres/SF)', Severity.CRITICAL,
                 'Ch. 12: Land and Site Description', None),
                ('zoning', 'Zoning designation', Severity.CRITICAL,
                 'Ch. 12: Land and Site Description', None),
                ('entitled_density', 'Entitled density/units', Severity.CRITICAL,
                 'Ch. 12: Land and Site Description', None),
                ('topography', 'Topography description', Severity.WARNING,
                 'Ch. 12: Land and Site Description', None),
                ('utilities', 'Utility availability', Severity.CRITICAL,
                 'Ch. 12: Land and Site Description', None),
                ('access', 'Access/frontage', Severity.WARNING,
                 'Ch. 12: Land and Site Description', None),
            ],
            'valuation': [
                ('land_comps', 'Comparable land sales', Severity.CRITICAL,
                 'Ch. 17: Land and Site Valuation', None),
                ('hbu_analysis', 'Highest and best use conclusion', Severity.CRITICAL,
                 'Ch. 16: Highest and Best Use Analysis', None),
            ]
        },

        PropertyType.SUBDIVISION: {
            'physical': [
                ('total_lots', 'Total planned lots', Severity.CRITICAL,
                 'Ch. 17: Land and Site Valuation', None),
                ('lot_sizes', 'Lot size distribution', Severity.WARNING,
                 'Ch. 17: Land and Site Valuation', None),
                ('phases', 'Phasing plan', Severity.WARNING,
                 'Ch. 17: Land and Site Valuation', None),
            ],
            'market': [
                ('absorption_rate', 'Lot absorption rate', Severity.CRITICAL,
                 'Ch. 17: Land and Site Valuation', 'Lots/month or lots/year'),
                ('finished_lot_value', 'Finished lot value estimate', Severity.CRITICAL,
                 'Ch. 17: Land and Site Valuation', None),
                ('competing_subdivisions', 'Competitive subdivision analysis', Severity.WARNING,
                 'Ch. 15: Market Analysis', None),
            ],
            'costs': [
                ('development_budget', 'Development cost budget', Severity.CRITICAL,
                 'Ch. 17: Land and Site Valuation', None),
                ('soft_costs', 'Soft costs (engineering, permits, fees)', Severity.WARNING,
                 'Ch. 17: Land and Site Valuation', '15-25% of hard costs'),
                ('contingency', 'Contingency allowance', Severity.WARNING,
                 'Ch. 17: Land and Site Valuation', '5-10% of total costs'),
            ],
            'valuation': [
                ('discount_rate', 'Discount rate for DCF', Severity.CRITICAL,
                 'Ch. 25: Discounted Cash Flow Analysis', None),
                ('developer_profit', 'Developer profit margin', Severity.WARNING,
                 'Ch. 17: Land and Site Valuation', '10-20% of revenue'),
            ]
        },

        PropertyType.HOTEL: {
            'operations': [
                ('room_count', 'Total room count', Severity.CRITICAL,
                 'Ch. 35: Valuation with Personal Property', None),
                ('occupancy', 'Historical/projected occupancy', Severity.CRITICAL,
                 'Ch. 35: Valuation with Personal Property', None),
                ('adr', 'Average daily rate (ADR)', Severity.CRITICAL,
                 'Ch. 35: Valuation with Personal Property', None),
                ('revpar', 'RevPAR', Severity.CRITICAL,
                 'Ch. 35: Valuation with Personal Property', None),
                ('food_beverage', 'F&B revenue (if applicable)', Severity.WARNING,
                 'Ch. 35: Valuation with Personal Property', None),
            ],
            'expenses': [
                ('departmental_expenses', 'Departmental expenses', Severity.CRITICAL,
                 'Ch. 35: Valuation with Personal Property', None),
                ('undistributed_expenses', 'Undistributed operating expenses', Severity.CRITICAL,
                 'Ch. 35: Valuation with Personal Property', None),
                ('management_fee', 'Management fee', Severity.CRITICAL,
                 'Ch. 35: Valuation with Personal Property', '3-4% of revenue'),
                ('franchise_fee', 'Franchise fee (if flagged)', Severity.WARNING,
                 'Ch. 35: Valuation with Personal Property', '4-6% of room revenue'),
                ('ffe_reserve', 'FF&E reserve', Severity.CRITICAL,
                 'Ch. 35: Valuation with Personal Property', '4-5% of revenue'),
            ],
            'valuation': [
                ('cap_rate', 'Capitalization rate', Severity.CRITICAL,
                 'Ch. 23: Direct Capitalization', None),
                ('ffe_value', 'FF&E value allocation', Severity.WARNING,
                 'Ch. 35: Valuation with Personal Property', None),
            ]
        }
    }

    def __init__(self, property_type: PropertyType):
        """
        Initialize validator for a specific property type.

        Args:
            property_type: PropertyType enum value
        """
        self.property_type = property_type
        self.requirements = self.INCOME_APPROACH_REQUIREMENTS.get(property_type, {})

    @classmethod
    def from_string(cls, property_type_str: str) -> 'ValuationValidator':
        """
        Create validator from string property type.

        Args:
            property_type_str: String like 'multifamily', 'mf', 'retail', etc.

        Returns:
            ValuationValidator instance
        """
        # Map common abbreviations/variations
        type_map = {
            'mf': PropertyType.MULTIFAMILY,
            'multifamily': PropertyType.MULTIFAMILY,
            'multi-family': PropertyType.MULTIFAMILY,
            'apartment': PropertyType.MULTIFAMILY,
            'retail': PropertyType.RETAIL,
            'ret': PropertyType.RETAIL,
            'office': PropertyType.OFFICE,
            'off': PropertyType.OFFICE,
            'industrial': PropertyType.INDUSTRIAL,
            'ind': PropertyType.INDUSTRIAL,
            'warehouse': PropertyType.INDUSTRIAL,
            'land': PropertyType.LAND,
            'subdivision': PropertyType.SUBDIVISION,
            'sub': PropertyType.SUBDIVISION,
            'mpc': PropertyType.SUBDIVISION,
            'hotel': PropertyType.HOTEL,
            'htl': PropertyType.HOTEL,
            'hospitality': PropertyType.HOTEL,
            'special-purpose': PropertyType.SPECIAL_PURPOSE,
            'special': PropertyType.SPECIAL_PURPOSE,
        }

        prop_type = type_map.get(property_type_str.lower(), PropertyType.MULTIFAMILY)
        return cls(prop_type)

    def validate(self, project_data: Dict[str, Any]) -> List[ValidationGap]:
        """
        Validate project data against methodology requirements.

        Args:
            project_data: Dictionary with keys matching requirement field names
                         Values can be actual data or None/missing

        Returns:
            List of ValidationGap objects for missing/incomplete elements
        """
        gaps = []

        for category, requirements in self.requirements.items():
            for req in requirements:
                field = req[0]
                description = req[1]
                severity = req[2]
                chapter_ref = req[3]
                typical_value = req[4] if len(req) > 4 else None

                # Check if field exists and has value
                value = project_data.get(field)

                if self._is_empty(value):
                    gap = ValidationGap(
                        field=field,
                        description=description,
                        severity=severity,
                        chapter_reference=chapter_ref,
                        typical_value=typical_value,
                        suggested_action=self._suggest_action(field, severity, typical_value)
                    )
                    gaps.append(gap)

        # Sort by severity (critical first)
        severity_order = {Severity.CRITICAL: 0, Severity.WARNING: 1, Severity.INFO: 2}
        gaps.sort(key=lambda g: severity_order[g.severity])

        return gaps

    def _is_empty(self, value: Any) -> bool:
        """Check if a value should be considered empty/missing."""
        if value is None:
            return True
        if value == '':
            return True
        if isinstance(value, (list, dict)) and len(value) == 0:
            return True
        if isinstance(value, (int, float)) and value == 0:
            # 0 might be valid for some fields, but generally indicates missing
            return False  # Changed to False - 0 is a valid value
        return False

    def _suggest_action(
        self,
        field: str,
        severity: Severity,
        typical_value: Optional[str]
    ) -> str:
        """Generate suggested action for missing field."""
        if severity == Severity.CRITICAL:
            return f"Required for valuation. Please provide {field.replace('_', ' ')} data."
        elif severity == Severity.WARNING:
            if typical_value:
                return f"Recommended. If unavailable, can estimate using typical range: {typical_value}"
            return "Recommended for complete analysis. Can proceed without but results may be less reliable."
        else:
            return "Optional. Include if available for more complete analysis."

    def get_completeness_score(
        self,
        project_data: Dict[str, Any]
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate completeness score and breakdown by category.

        Returns:
            Tuple of (overall_score, category_scores)
            Scores are 0.0 to 1.0
        """
        category_scores = {}
        total_required = 0
        total_present = 0

        for category, requirements in self.requirements.items():
            cat_required = len(requirements)
            cat_present = sum(
                1 for req in requirements
                if not self._is_empty(project_data.get(req[0]))
            )

            category_scores[category] = cat_present / cat_required if cat_required > 0 else 1.0
            total_required += cat_required
            total_present += cat_present

        overall_score = total_present / total_required if total_required > 0 else 1.0

        return overall_score, category_scores

    def format_gaps_for_user(self, gaps: List[ValidationGap]) -> str:
        """
        Format gaps into user-friendly message.

        Args:
            gaps: List of ValidationGap objects

        Returns:
            Formatted string suitable for display to user
        """
        if not gaps:
            return "All required data elements are present."

        critical = [g for g in gaps if g.severity == Severity.CRITICAL]
        warnings = [g for g in gaps if g.severity == Severity.WARNING]
        info = [g for g in gaps if g.severity == Severity.INFO]

        lines = []

        if critical:
            lines.append("**Missing Required Data:**")
            for gap in critical:
                line = f"- {gap.description}"
                if gap.typical_value:
                    line += f" (typical: {gap.typical_value})"
                lines.append(line)
            lines.append("")

        if warnings:
            lines.append("**Recommended (can estimate if unavailable):**")
            for gap in warnings:
                line = f"- {gap.description}"
                if gap.typical_value:
                    line += f" - typical: {gap.typical_value}"
                lines.append(line)
            lines.append("")

        if info and len(info) <= 3:  # Only show info if few items
            lines.append("**Optional:**")
            for gap in info:
                lines.append(f"- {gap.description}")

        return "\n".join(lines)

    def format_gaps_for_prompt(self, gaps: List[ValidationGap]) -> str:
        """
        Format gaps for injection into AI system prompt.

        Args:
            gaps: List of ValidationGap objects

        Returns:
            Formatted string suitable for system prompt injection
        """
        if not gaps:
            return ""

        # Only include critical and warning for prompt
        significant_gaps = [
            g for g in gaps
            if g.severity in [Severity.CRITICAL, Severity.WARNING]
        ]

        if not significant_gaps:
            return ""

        lines = [
            "Based on appraisal methodology, the following data elements "
            "are missing or incomplete. Consider mentioning these to the user:"
        ]

        for gap in significant_gaps:
            line = f"- {gap.description}"
            if gap.typical_value:
                line += f" (typical: {gap.typical_value})"
            line += f" [Ref: {gap.chapter_reference}]"
            lines.append(line)

        return "\n".join(lines)

    def get_required_fields(self, severity_filter: Optional[Severity] = None) -> List[str]:
        """
        Get list of required field names.

        Args:
            severity_filter: Optional filter by severity level

        Returns:
            List of field names
        """
        fields = []
        for category, requirements in self.requirements.items():
            for req in requirements:
                if severity_filter is None or req[2] == severity_filter:
                    fields.append(req[0])
        return fields
