"""
Model Readiness Calculator - Determines if a project has sufficient data for reliable model outputs.

Uses the FieldRegistry to analyze which input fields are populated and calculates
a weighted readiness score based on field analytical tiers.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import logging

from .field_registry import get_registry, FieldMapping

logger = logging.getLogger(__name__)

# Tier weights for readiness calculation
TIER_WEIGHTS = {
    'critical': 10,
    'important': 5,
    'supporting': 2,
    'descriptive': 0,
}

# Confidence level thresholds
CONFIDENCE_THRESHOLDS = {
    'high': 90,
    'medium': 70,
    'low': 50,
}


@dataclass
class ReadinessResult:
    """Result of model readiness calculation."""
    readiness_score: float  # Percentage 0-100
    populated_count: int
    total_input_fields: int
    missing_critical: List[Dict[str, str]]  # [{field_key, label}, ...]
    missing_important: List[Dict[str, str]]  # Top 10
    can_run_model: bool
    confidence_level: str  # 'high', 'medium', 'low', 'insufficient'

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'readiness_score': round(self.readiness_score, 1),
            'populated_count': self.populated_count,
            'total_input_fields': self.total_input_fields,
            'missing_critical': self.missing_critical,
            'missing_important': self.missing_important,
            'can_run_model': self.can_run_model,
            'confidence_level': self.confidence_level,
        }


class ModelReadinessCalculator:
    """
    Calculates how ready a project is for reliable model outputs.

    Uses field analytical tiers to weight the importance of each field:
    - critical (10 points): Must have for model to run
    - important (5 points): Significantly improves accuracy
    - supporting (2 points): Adds context and refinement
    - descriptive (0 points): Nice to have, no impact on model
    """

    def __init__(self, property_type: str = 'multifamily'):
        self.property_type = property_type
        self.registry = get_registry()

    def calculate(
        self,
        populated_field_keys: List[str],
        property_type: Optional[str] = None
    ) -> ReadinessResult:
        """
        Calculate model readiness based on populated fields.

        Args:
            populated_field_keys: List of field_keys that have values
            property_type: Optional override for property type (for tier lookups)

        Returns:
            ReadinessResult with score and analysis
        """
        prop_type = property_type or self.property_type

        # Get all input fields from registry
        all_mappings = self.registry.get_all_mappings(prop_type)
        input_fields = [
            m for m in all_mappings.values()
            if m.field_role == 'input' and m.resolved
        ]

        if not input_fields:
            logger.warning(f"No input fields found for property type: {prop_type}")
            return ReadinessResult(
                readiness_score=0.0,
                populated_count=0,
                total_input_fields=0,
                missing_critical=[],
                missing_important=[],
                can_run_model=False,
                confidence_level='insufficient',
            )

        # Convert populated keys to a set for O(1) lookup
        populated_set = set(populated_field_keys)

        # Categorize fields and calculate scores
        max_possible_score = 0
        actual_score = 0
        missing_critical = []
        missing_important = []
        populated_count = 0

        for field in input_fields:
            # Get tier (check overrides first via get_analytical_tier)
            tier = self.registry.get_analytical_tier(field.field_key, prop_type)
            if tier is None:
                tier = field.analytical_tier_default

            weight = TIER_WEIGHTS.get(tier, 0)
            max_possible_score += weight

            if field.field_key in populated_set:
                actual_score += weight
                populated_count += 1
            else:
                # Track missing fields by tier
                field_info = {'field_key': field.field_key, 'label': field.label}
                if tier == 'critical':
                    missing_critical.append(field_info)
                elif tier == 'important':
                    missing_important.append(field_info)

        # Calculate readiness score as percentage
        if max_possible_score > 0:
            readiness_score = (actual_score / max_possible_score) * 100
        else:
            readiness_score = 100.0 if populated_count == len(input_fields) else 0.0

        # Determine if model can run (no missing critical fields)
        can_run_model = len(missing_critical) == 0

        # Determine confidence level
        if readiness_score >= CONFIDENCE_THRESHOLDS['high']:
            confidence_level = 'high'
        elif readiness_score >= CONFIDENCE_THRESHOLDS['medium']:
            confidence_level = 'medium'
        elif readiness_score >= CONFIDENCE_THRESHOLDS['low']:
            confidence_level = 'low'
        else:
            confidence_level = 'insufficient'

        return ReadinessResult(
            readiness_score=readiness_score,
            populated_count=populated_count,
            total_input_fields=len(input_fields),
            missing_critical=missing_critical,
            missing_important=missing_important[:10],  # Top 10 only
            can_run_model=can_run_model,
            confidence_level=confidence_level,
        )


def calculate_readiness(
    populated_field_keys: List[str],
    property_type: str = 'multifamily'
) -> Dict[str, Any]:
    """
    Convenience function to calculate model readiness.

    Args:
        populated_field_keys: List of field_keys that have values
        property_type: Property type for registry lookup

    Returns:
        Dictionary with readiness analysis
    """
    calculator = ModelReadinessCalculator(property_type)
    result = calculator.calculate(populated_field_keys, property_type)
    return result.to_dict()
