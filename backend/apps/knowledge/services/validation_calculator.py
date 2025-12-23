"""
Validation Calculator - Performs in-memory calculations on extracted inputs
and compares results to document-stated outputs.

This service validates extraction accuracy by recalculating derived metrics
from input fields and comparing them to values stated in source documents.
"""

from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)

# Tolerance thresholds for comparisons
MATCH_TOLERANCE_PCT = 1.0  # Within 1% is a match
REVIEW_THRESHOLD_PCT = 5.0  # Over 5% requires review


@dataclass
class FieldComparison:
    """Comparison result for a single field."""
    field_key: str
    calculated: Optional[float]
    document_stated: Optional[float]
    delta: Optional[float]
    delta_pct: Optional[float]
    match: bool
    review_required: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            'field_key': self.field_key,
            'calculated': self.calculated,
            'document_stated': self.document_stated,
            'delta': round(self.delta, 2) if self.delta is not None else None,
            'delta_pct': round(self.delta_pct, 2) if self.delta_pct is not None else None,
            'match': self.match,
            'review_required': self.review_required,
        }


@dataclass
class ValidationResult:
    """Complete validation calculation result."""
    calculated_outputs: Dict[str, Optional[float]]
    comparisons: List[FieldComparison] = field(default_factory=list)
    all_match: bool = True
    review_required_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'calculated_outputs': {
                k: round(v, 2) if v is not None else None
                for k, v in self.calculated_outputs.items()
            },
            'comparisons': [c.to_dict() for c in self.comparisons],
            'all_match': self.all_match,
            'review_required_count': self.review_required_count,
        }


class ValidationCalculator:
    """
    Calculates derived outputs from extracted inputs and compares
    to document-stated values.

    Input dict structure:
    {
        'total_units': int,
        'asking_price': float,
        'rentable_sf': float,
        'current_vacancy_rate': float (as percentage, e.g., 5.0 for 5%),
        'units': [
            {'unit_number': str, 'current_rent': float, 'market_rent': float, ...},
            ...
        ],
        'unit_types': [
            {'unit_type_name': str, 'unit_count': int, 'market_rent': float, ...},
            ...
        ],
        'opex': [
            {'category': str, 'amount': float},
            ...
        ],
        'other_income': [
            {'category': str, 'amount': float},
            ...
        ],
    }
    """

    def __init__(self, inputs: Dict[str, Any]):
        self.inputs = inputs
        self._calculated: Dict[str, Optional[float]] = {}

    def calculate_all(self) -> Dict[str, Optional[float]]:
        """
        Calculate all derived outputs from inputs.

        Returns:
            Dict with calculated values for each output field
        """
        self._calculated = {
            'current_gpr': self._calculate_gpr(),
            'current_egi': None,  # Calculated after GPR
            'current_opex': self._calculate_opex(),
            'current_noi': None,  # Calculated after EGI and OpEx
            'price_per_unit': self._calculate_price_per_unit(),
            'price_per_sf': self._calculate_price_per_sf(),
            'cap_rate_current': None,  # Calculated after NOI
            'grm_current': None,  # Calculated after GPR
        }

        # Calculate EGI (depends on GPR)
        self._calculated['current_egi'] = self._calculate_egi()

        # Calculate NOI (depends on EGI and OpEx)
        self._calculated['current_noi'] = self._calculate_noi()

        # Calculate cap rate (depends on NOI)
        self._calculated['cap_rate_current'] = self._calculate_cap_rate()

        # Calculate GRM (depends on GPR)
        self._calculated['grm_current'] = self._calculate_grm()

        return self._calculated

    def _calculate_gpr(self) -> Optional[float]:
        """
        Calculate Gross Potential Rent.

        Priority:
        1. Sum of (unit current_rent × 12) from rent roll
        2. Sum of (unit_count × market_rent × 12) from unit types
        """
        # Try rent roll first (individual units)
        units = self.inputs.get('units', [])
        if units:
            total_monthly = 0.0
            for unit in units:
                rent = self._to_float(unit.get('current_rent') or unit.get('market_rent'))
                if rent:
                    total_monthly += rent
            if total_monthly > 0:
                return total_monthly * 12

        # Fall back to unit types
        unit_types = self.inputs.get('unit_types', [])
        if unit_types:
            total_monthly = 0.0
            for ut in unit_types:
                count = self._to_int(ut.get('unit_count'))
                rent = self._to_float(ut.get('market_rent') or ut.get('current_rent_avg'))
                if count and rent:
                    total_monthly += count * rent
            if total_monthly > 0:
                return total_monthly * 12

        # If we have total_units and avg rent, try that
        total_units = self._to_int(self.inputs.get('total_units'))
        avg_rent = self._to_float(self.inputs.get('avg_rent') or self.inputs.get('avg_unit_rent'))
        if total_units and avg_rent:
            return total_units * avg_rent * 12

        return None

    def _calculate_egi(self) -> Optional[float]:
        """
        Calculate Effective Gross Income.

        EGI = GPR × (1 - vacancy_rate) + total_other_income
        """
        gpr = self._calculated.get('current_gpr')
        if gpr is None:
            return None

        # Get vacancy rate (as decimal)
        vacancy_rate = self._to_float(self.inputs.get('current_vacancy_rate'))
        if vacancy_rate is None:
            vacancy_rate = 0.0
        elif vacancy_rate > 1:
            # Convert from percentage to decimal if > 1
            vacancy_rate = vacancy_rate / 100

        # Calculate rental income after vacancy
        rental_income = gpr * (1 - vacancy_rate)

        # Add other income
        other_income = self._calculate_other_income()

        return rental_income + (other_income or 0)

    def _calculate_other_income(self) -> Optional[float]:
        """Calculate total other income from array."""
        other_income = self.inputs.get('other_income', [])
        if not other_income:
            # Try direct field
            return self._to_float(self.inputs.get('income_total_other'))

        total = 0.0
        for item in other_income:
            amount = self._to_float(item.get('amount'))
            if amount:
                total += amount

        return total if total > 0 else None

    def _calculate_opex(self) -> Optional[float]:
        """Calculate total operating expenses from array."""
        opex = self.inputs.get('opex', [])
        if not opex:
            # Try direct field
            return self._to_float(self.inputs.get('current_opex'))

        total = 0.0
        for item in opex:
            amount = self._to_float(item.get('amount'))
            if amount:
                total += amount

        return total if total > 0 else None

    def _calculate_noi(self) -> Optional[float]:
        """
        Calculate Net Operating Income.

        NOI = EGI - OpEx
        """
        egi = self._calculated.get('current_egi')
        opex = self._calculated.get('current_opex')

        if egi is None:
            return None

        return egi - (opex or 0)

    def _calculate_price_per_unit(self) -> Optional[float]:
        """Calculate price per unit."""
        asking_price = self._to_float(
            self.inputs.get('asking_price') or self.inputs.get('acquisition_price')
        )
        total_units = self._to_int(self.inputs.get('total_units'))

        if asking_price and total_units and total_units > 0:
            return asking_price / total_units

        return None

    def _calculate_price_per_sf(self) -> Optional[float]:
        """Calculate price per square foot."""
        asking_price = self._to_float(
            self.inputs.get('asking_price') or self.inputs.get('acquisition_price')
        )
        rentable_sf = self._to_float(self.inputs.get('rentable_sf'))

        if asking_price and rentable_sf and rentable_sf > 0:
            return asking_price / rentable_sf

        return None

    def _calculate_cap_rate(self) -> Optional[float]:
        """
        Calculate current cap rate.

        Cap Rate = (NOI / Price) × 100
        """
        noi = self._calculated.get('current_noi')
        asking_price = self._to_float(
            self.inputs.get('asking_price') or self.inputs.get('acquisition_price')
        )

        if noi and asking_price and asking_price > 0:
            return (noi / asking_price) * 100

        return None

    def _calculate_grm(self) -> Optional[float]:
        """
        Calculate Gross Rent Multiplier.

        GRM = Price / GPR
        """
        gpr = self._calculated.get('current_gpr')
        asking_price = self._to_float(
            self.inputs.get('asking_price') or self.inputs.get('acquisition_price')
        )

        if gpr and asking_price and gpr > 0:
            return asking_price / gpr

        return None

    def compare_to_document(
        self,
        document_outputs: Dict[str, Any]
    ) -> ValidationResult:
        """
        Compare calculated outputs to document-stated values.

        Args:
            document_outputs: Dict with document-stated output values

        Returns:
            ValidationResult with per-field comparisons
        """
        # Ensure calculations are done
        if not self._calculated:
            self.calculate_all()

        comparisons = []
        all_match = True
        review_count = 0

        for field_key, calculated in self._calculated.items():
            doc_value = self._to_float(document_outputs.get(field_key))

            comparison = self._compare_values(field_key, calculated, doc_value)
            comparisons.append(comparison)

            if not comparison.match:
                all_match = False
            if comparison.review_required:
                review_count += 1

        return ValidationResult(
            calculated_outputs=self._calculated,
            comparisons=comparisons,
            all_match=all_match,
            review_required_count=review_count,
        )

    def _compare_values(
        self,
        field_key: str,
        calculated: Optional[float],
        document_stated: Optional[float]
    ) -> FieldComparison:
        """Compare a calculated value to document-stated value."""
        # Handle missing values
        if calculated is None or document_stated is None:
            return FieldComparison(
                field_key=field_key,
                calculated=calculated,
                document_stated=document_stated,
                delta=None,
                delta_pct=None,
                match=calculated is None and document_stated is None,
                review_required=calculated is not None or document_stated is not None,
            )

        # Calculate delta
        delta = abs(calculated - document_stated)

        # Calculate percentage delta (based on document value)
        if document_stated != 0:
            delta_pct = (delta / abs(document_stated)) * 100
        else:
            delta_pct = 100.0 if calculated != 0 else 0.0

        # Determine match and review status
        match = delta_pct <= MATCH_TOLERANCE_PCT
        review_required = delta_pct > REVIEW_THRESHOLD_PCT

        return FieldComparison(
            field_key=field_key,
            calculated=calculated,
            document_stated=document_stated,
            delta=delta,
            delta_pct=delta_pct,
            match=match,
            review_required=review_required,
        )

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        """Safely convert value to float."""
        if value is None:
            return None
        try:
            if isinstance(value, str):
                # Remove currency formatting
                value = value.replace('$', '').replace(',', '').strip()
                if value.endswith('%'):
                    value = value[:-1]
            return float(value)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _to_int(value: Any) -> Optional[int]:
        """Safely convert value to int."""
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value = value.replace(',', '').strip()
            return int(float(value))
        except (ValueError, TypeError):
            return None


def validate_extraction(
    inputs: Dict[str, Any],
    document_outputs: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Convenience function to validate extracted data.

    Args:
        inputs: Extracted input values
        document_outputs: Optional document-stated outputs to compare against

    Returns:
        Dict with calculated values and optional comparisons
    """
    calculator = ValidationCalculator(inputs)
    calculated = calculator.calculate_all()

    if document_outputs:
        result = calculator.compare_to_document(document_outputs)
        return result.to_dict()

    return {
        'calculated_outputs': {
            k: round(v, 2) if v is not None else None
            for k, v in calculated.items()
        }
    }
