"""
Budget Variance Calculator

Calculates variance between parent category amounts and child category amounts.
Architecture: Independent Assumptions with Calculated Variance

Variance = Direct items in parent category - Sum of items in child categories

Example:
  - L1 "Acquisition" has 2 direct items totaling $500K
  - L2 "Due Diligence" (child of Acquisition) has items totaling $100K
  - L2 "Land Purchase" (child of Acquisition) has items totaling $350K
  - Variance = $500K - ($100K + $350K) = $50K

Created: 2025-11-03
Phase: 1 (Backend Variance Calculator)
"""

from decimal import Decimal
from typing import Dict, List, Optional, NamedTuple
from django.db.models import Sum, Q
from apps.financial.models_budget_categories import BudgetCategory


class VarianceResult(NamedTuple):
    """
    Result of variance calculation for a category.

    Attributes:
        category_id: The category ID
        category_level: Category hierarchy level (1-4)
        category_name: Category display name
        category_breadcrumb: Full category path
        parent_amount: Total amount of direct items in this category
        children_amount: Sum of amounts in immediate child categories
        variance_amount: parent_amount - children_amount
        variance_pct: variance_amount / parent_amount * 100 (if parent_amount != 0)
        is_reconciled: True if variance is within threshold (±1%)
        has_children: True if this category has child categories
        child_categories: List of child category IDs
    """
    category_id: int
    category_level: int
    category_name: str
    category_breadcrumb: str
    parent_amount: Decimal
    children_amount: Decimal
    variance_amount: Decimal
    variance_pct: Optional[Decimal]
    is_reconciled: bool
    has_children: bool
    child_categories: List[int]


class BudgetVarianceCalculator:
    """
    Calculate budget variance between parent and child categories.

    Uses taxonomy-based grouping where categories are organizational,
    not parent-child budget items.

    Key Concepts:
    - Parent amount = Sum of budget items directly assigned to this category
    - Children amount = Sum of budget items in immediate child categories
    - Variance = parent_amount - children_amount
    - Each category level stores independent assumptions
    """

    # Variance reconciliation threshold (±1%)
    RECONCILIATION_THRESHOLD = Decimal('0.01')

    def __init__(self, project_id: int):
        """
        Initialize calculator for a specific project.

        Args:
            project_id: The project to calculate variance for
        """
        self.project_id = project_id

    def calculate_category_variance(
        self,
        category_id: int,
        category_level: int
    ) -> Optional[VarianceResult]:
        """
        Calculate variance for a single category.

        Args:
            category_id: The category to calculate variance for
            category_level: The hierarchy level (1-4)

        Returns:
            VarianceResult or None if category not found or has no items
        """
        from apps.financial.models import BudgetItem

        # Get the category
        try:
            category = BudgetCategory.objects.get(
                category_id=category_id,
                level=category_level
            )
        except BudgetCategory.DoesNotExist:
            return None

        # Get child categories (immediate children only, not all descendants)
        child_categories = list(
            category.children.filter(is_active=True).values_list('category_id', flat=True)
        )
        has_children = len(child_categories) > 0

        # Calculate parent amount (direct items in this category at this level)
        parent_filter = self._build_category_filter(category_level, category_id)
        parent_amount = BudgetItem.objects.filter(
            project_id=self.project_id,
            **parent_filter
        ).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        # Calculate children amount (sum of items in immediate child categories)
        children_amount = Decimal('0.00')
        if has_children:
            # Build filter for all immediate children
            # Since children are always at level+1, we know which field to use
            child_level = category_level + 1
            if child_level <= 4:
                child_filter_field = f'category_l{child_level}_id__in'
                children_amount = BudgetItem.objects.filter(
                    project_id=self.project_id,
                    **{child_filter_field: child_categories}
                ).aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00')

        # Calculate variance
        variance_amount = parent_amount - children_amount

        # Calculate variance percentage
        variance_pct = None
        if parent_amount != 0:
            variance_pct = (variance_amount / parent_amount * Decimal('100.00')).quantize(Decimal('0.01'))

        # Check if reconciled (within threshold)
        is_reconciled = False
        if parent_amount != 0:
            abs_variance_pct = abs(variance_amount / parent_amount)
            is_reconciled = abs_variance_pct <= self.RECONCILIATION_THRESHOLD
        elif variance_amount == 0:
            # Both zero - considered reconciled
            is_reconciled = True

        return VarianceResult(
            category_id=category_id,
            category_level=category_level,
            category_name=category.name,
            category_breadcrumb=category.get_path(),
            parent_amount=parent_amount,
            children_amount=children_amount,
            variance_amount=variance_amount,
            variance_pct=variance_pct,
            is_reconciled=is_reconciled,
            has_children=has_children,
            child_categories=child_categories
        )

    def get_variance_report(
        self,
        min_variance_pct: Optional[Decimal] = None,
        levels: Optional[List[int]] = None
    ) -> List[VarianceResult]:
        """
        Get variance report for all categories in the project.

        Args:
            min_variance_pct: Only include categories with abs(variance_pct) >= this value
            levels: Only include specific levels (e.g., [1, 2] for L1 and L2)

        Returns:
            List of VarianceResult objects sorted by variance amount (descending)
        """
        from apps.financial.models import BudgetItem

        # Get all categories used in this project's budget
        level_filters = []
        for level in range(1, 5):
            if levels is None or level in levels:
                level_filters.append(Q(**{f'category_l{level}_id__isnull': False}))

        if not level_filters:
            return []

        # Get distinct category IDs at each level
        budget_items = BudgetItem.objects.filter(
            project_id=self.project_id
        ).filter(
            Q(*level_filters, _connector=Q.OR)
        )

        # Collect all unique categories
        categories_to_check: Dict[tuple, None] = {}  # Use dict as ordered set
        for level in range(1, 5):
            if levels is None or level in levels:
                category_ids = budget_items.filter(
                    **{f'category_l{level}_id__isnull': False}
                ).values_list(f'category_l{level}_id', flat=True).distinct()

                for cat_id in category_ids:
                    categories_to_check[(level, cat_id)] = None

        # Calculate variance for each category
        results: List[VarianceResult] = []
        for (level, cat_id) in categories_to_check.keys():
            variance = self.calculate_category_variance(cat_id, level)
            if variance is None:
                continue

            # Filter by minimum variance percentage if specified
            if min_variance_pct is not None:
                if variance.variance_pct is None:
                    continue
                if abs(variance.variance_pct) < min_variance_pct:
                    continue

            results.append(variance)

        # Sort by absolute variance amount (descending)
        results.sort(key=lambda x: abs(x.variance_amount), reverse=True)

        return results

    def get_category_hierarchy_variance(
        self,
        category_id: int,
        category_level: int
    ) -> Dict[str, any]:
        """
        Get variance for a category and all its descendants.

        Useful for drill-down analysis.

        Args:
            category_id: The parent category
            category_level: The hierarchy level

        Returns:
            Dict with parent variance and children variances
        """
        parent_variance = self.calculate_category_variance(category_id, category_level)
        if parent_variance is None:
            return None

        # Get all child variances
        child_variances = []
        if parent_variance.has_children:
            for child_id in parent_variance.child_categories:
                child_variance = self.calculate_category_variance(
                    child_id,
                    category_level + 1
                )
                if child_variance:
                    child_variances.append(child_variance)

        return {
            'parent': {
                'category_id': parent_variance.category_id,
                'category_level': parent_variance.category_level,
                'category_name': parent_variance.category_name,
                'category_breadcrumb': parent_variance.category_breadcrumb,
                'parent_amount': float(parent_variance.parent_amount),
                'children_amount': float(parent_variance.children_amount),
                'variance_amount': float(parent_variance.variance_amount),
                'variance_pct': float(parent_variance.variance_pct) if parent_variance.variance_pct else None,
                'is_reconciled': parent_variance.is_reconciled,
            },
            'children': [
                {
                    'category_id': cv.category_id,
                    'category_level': cv.category_level,
                    'category_name': cv.category_name,
                    'category_breadcrumb': cv.category_breadcrumb,
                    'parent_amount': float(cv.parent_amount),
                    'children_amount': float(cv.children_amount),
                    'variance_amount': float(cv.variance_amount),
                    'variance_pct': float(cv.variance_pct) if cv.variance_pct else None,
                    'is_reconciled': cv.is_reconciled,
                }
                for cv in child_variances
            ]
        }

    def _build_category_filter(self, level: int, category_id: int) -> dict:
        """
        Build filter dict for querying items at a specific category level.

        Args:
            level: Category level (1-4)
            category_id: Category ID

        Returns:
            Dict suitable for BudgetItem.objects.filter(**result)
        """
        return {f'category_l{level}_id': category_id}
