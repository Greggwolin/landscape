"""
Budget Variance API Views

REST API endpoints for budget variance calculations and reconciliation.

Endpoints:
- GET /api/budget/variance/<project_id>/ - Project variance summary
- GET /api/budget/variance/<project_id>/category/<category_id>/ - Category detail
- POST /api/budget/reconcile/<project_id>/category/<category_id>/ - Reconcile variance

Created: 2025-11-03
Phase: 2 (API Endpoints)
"""

from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from apps.financial.models_budget_categories import BudgetCategory
from apps.financial.models import BudgetItem
from apps.financial.services.variance_calculator import BudgetVarianceCalculator


@api_view(['GET'])
def get_project_variance_summary(request, project_id):
    """
    Get variance summary for all categories in a project.

    Query Parameters:
        - min_variance_pct: Filter to categories with abs(variance_pct) >= this value (default: 5.0)
        - levels: Comma-separated list of levels to include (e.g., "1,2,3,4")

    Response:
        {
            "project_id": 123,
            "project_name": "Scottsdale Multifamily",
            "total_categories": 15,
            "categories_with_variance": 8,
            "total_variance_amount": 125000.50,
            "variances": [
                {
                    "category_id": 45,
                    "category_level": 2,
                    "category_name": "Due Diligence",
                    "category_breadcrumb": "Acquisition > Due Diligence",
                    "parent_amount": 500000.00,
                    "children_amount": 450000.00,
                    "variance_amount": 50000.00,
                    "variance_pct": 10.00,
                    "is_reconciled": false,
                    "has_children": true,
                    "child_categories": [46, 47, 48]
                },
                ...
            ]
        }
    """
    # Validate project exists
    project = get_object_or_404(Project, project_id=project_id)

    # Parse query parameters
    min_variance_pct = request.GET.get('min_variance_pct', '5.0')
    try:
        min_variance_pct = Decimal(min_variance_pct)
    except:
        min_variance_pct = Decimal('5.0')

    levels = request.GET.get('levels')
    if levels:
        try:
            levels = [int(l.strip()) for l in levels.split(',')]
        except:
            levels = None

    # Calculate variance
    calculator = BudgetVarianceCalculator(project_id)
    variances = calculator.get_variance_report(
        min_variance_pct=min_variance_pct,
        levels=levels
    )

    # Calculate summary statistics
    total_variance_amount = sum(
        abs(v.variance_amount) for v in variances
    )

    return Response({
        'project_id': project_id,
        'project_name': project.project_name,
        'total_categories': len(variances),
        'categories_with_variance': len([v for v in variances if not v.is_reconciled]),
        'total_variance_amount': float(total_variance_amount),
        'variances': [
            {
                'category_id': v.category_id,
                'category_level': v.category_level,
                'category_name': v.category_name,
                'category_breadcrumb': v.category_breadcrumb,
                'parent_amount': float(v.parent_amount),
                'children_amount': float(v.children_amount),
                'variance_amount': float(v.variance_amount),
                'variance_pct': float(v.variance_pct) if v.variance_pct else None,
                'is_reconciled': v.is_reconciled,
                'has_children': v.has_children,
                'child_categories': v.child_categories,
            }
            for v in variances
        ]
    })


@api_view(['GET'])
def get_category_variance_detail(request, project_id, category_id):
    """
    Get detailed variance information for a specific category.

    Includes variance for the category and all its immediate children.

    Response:
        {
            "parent": {
                "category_id": 45,
                "category_level": 2,
                "category_name": "Due Diligence",
                "category_breadcrumb": "Acquisition > Due Diligence",
                "parent_amount": 500000.00,
                "children_amount": 450000.00,
                "variance_amount": 50000.00,
                "variance_pct": 10.00,
                "is_reconciled": false
            },
            "children": [
                {
                    "category_id": 46,
                    "category_level": 3,
                    "category_name": "Environmental",
                    "category_breadcrumb": "Acquisition > Due Diligence > Environmental",
                    "parent_amount": 150000.00,
                    "children_amount": 140000.00,
                    "variance_amount": 10000.00,
                    "variance_pct": 6.67,
                    "is_reconciled": false
                },
                ...
            ]
        }
    """
    # Validate project exists
    project = get_object_or_404(Project, project_id=project_id)

    # Get category to determine level
    category = get_object_or_404(BudgetCategory, category_id=category_id)

    # Calculate variance
    calculator = BudgetVarianceCalculator(project_id)
    result = calculator.get_category_hierarchy_variance(
        category_id,
        category.level
    )

    if result is None:
        return Response(
            {'error': 'Category not found or has no budget items'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response(result)


@api_view(['POST'])
def reconcile_category_variance(request, project_id, category_id):
    """
    Reconcile variance for a category using one of three methods.

    Request Body:
        {
            "method": "parent_to_children" | "children_to_parent" | "add_contingency",
            "notes": "Optional reconciliation notes"
        }

    Methods:
        - parent_to_children: Distribute parent amount to children proportionally
        - children_to_parent: Update parent to match sum of children
        - add_contingency: Create a contingency line item for the variance

    Response:
        {
            "success": true,
            "method": "parent_to_children",
            "items_updated": 5,
            "variance_before": 50000.00,
            "variance_after": 0.00,
            "audit_trail": [
                {
                    "fact_id": 123,
                    "category_name": "Environmental",
                    "amount_before": 100000.00,
                    "amount_after": 110000.00,
                    "change": 10000.00
                },
                ...
            ]
        }
    """
    # Validate project exists
    project = get_object_or_404(Project, project_id=project_id)

    # Get category to determine level
    category = get_object_or_404(BudgetCategory, category_id=category_id)

    # Parse request data
    method = request.data.get('method')
    notes = request.data.get('notes', '')

    if method not in ['parent_to_children', 'children_to_parent', 'add_contingency']:
        return Response(
            {'error': 'Invalid method. Must be one of: parent_to_children, children_to_parent, add_contingency'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Calculate current variance
    calculator = BudgetVarianceCalculator(project_id)
    variance = calculator.calculate_category_variance(category_id, category.level)

    if variance is None:
        return Response(
            {'error': 'Category not found or has no budget items'},
            status=status.HTTP_404_NOT_FOUND
        )

    if variance.is_reconciled:
        return Response(
            {'message': 'Category is already reconciled (variance within ±1%)'},
            status=status.HTTP_200_OK
        )

    # Perform reconciliation
    audit_trail = []
    items_updated = 0

    with transaction.atomic():
        if method == 'parent_to_children':
            # Distribute parent variance to children proportionally
            items_updated, audit_trail = _reconcile_parent_to_children(
                project_id, category, variance
            )

        elif method == 'children_to_parent':
            # Update parent items to match children total
            items_updated, audit_trail = _reconcile_children_to_parent(
                project_id, category, variance
            )

        elif method == 'add_contingency':
            # Create contingency line item
            items_updated, audit_trail = _reconcile_add_contingency(
                project_id, category, variance, notes
            )

    # Recalculate variance after reconciliation
    variance_after = calculator.calculate_category_variance(category_id, category.level)

    return Response({
        'success': True,
        'method': method,
        'items_updated': items_updated,
        'variance_before': float(variance.variance_amount),
        'variance_after': float(variance_after.variance_amount if variance_after else 0),
        'audit_trail': audit_trail
    })


# Helper functions for reconciliation methods

def _reconcile_parent_to_children(project_id, category, variance):
    """
    Distribute parent variance to children proportionally.

    Returns:
        Tuple of (items_updated, audit_trail)
    """
    from apps.financial.models import BudgetItem

    if not variance.has_children or variance.children_amount == 0:
        return 0, []

    audit_trail = []
    items_updated = 0

    # Get all items in child categories
    child_level = category.level + 1
    child_filter_field = f'category_l{child_level}_id__in'

    child_items = BudgetItem.objects.filter(
        project_id=project_id,
        **{child_filter_field: variance.child_categories}
    )

    # Calculate proportional adjustment
    adjustment_factor = variance.parent_amount / variance.children_amount

    for item in child_items:
        amount_before = item.amount or Decimal('0.00')
        amount_after = (amount_before * adjustment_factor).quantize(Decimal('0.01'))
        change = amount_after - amount_before

        # Update amount (will trigger database trigger to recalculate if needed)
        BudgetItem.objects.filter(budget_item_id=item.budget_item_id).update(
            amount=amount_after
        )

        audit_trail.append({
            'fact_id': item.budget_item_id,
            'category_name': item.line_item_name,
            'amount_before': float(amount_before),
            'amount_after': float(amount_after),
            'change': float(change)
        })
        items_updated += 1

    return items_updated, audit_trail


def _reconcile_children_to_parent(project_id, category, variance):
    """
    Update parent items to match sum of children.

    Distributes the adjustment proportionally across parent items.

    Returns:
        Tuple of (items_updated, audit_trail)
    """
    from apps.financial.models import BudgetItem

    if variance.parent_amount == 0:
        return 0, []

    audit_trail = []
    items_updated = 0

    # Get all items in parent category
    parent_filter_field = f'category_l{category.level}_id'
    parent_items = BudgetItem.objects.filter(
        project_id=project_id,
        **{parent_filter_field: category.category_id}
    )

    # Calculate proportional adjustment to match children total
    adjustment_factor = variance.children_amount / variance.parent_amount

    for item in parent_items:
        amount_before = item.amount or Decimal('0.00')
        amount_after = (amount_before * adjustment_factor).quantize(Decimal('0.01'))
        change = amount_after - amount_before

        # Update amount
        BudgetItem.objects.filter(budget_item_id=item.budget_item_id).update(
            amount=amount_after
        )

        audit_trail.append({
            'fact_id': item.budget_item_id,
            'category_name': item.line_item_name,
            'amount_before': float(amount_before),
            'amount_after': float(amount_after),
            'change': float(change)
        })
        items_updated += 1

    return items_updated, audit_trail


def _reconcile_add_contingency(project_id, category, variance, notes):
    """
    Create a contingency line item for the variance amount.

    Returns:
        Tuple of (items_updated, audit_trail)
    """
    from apps.financial.models import BudgetItem
    from apps.financial.models_budget_categories import BudgetCategory

    # Create contingency line item in parent category
    contingency_item = BudgetItem.objects.create(
        project_id=project_id,
        **{f'category_l{category.level}_id': category.category_id},
        category='Contingency',
        line_item_name=f'{category.name} - Variance Contingency',
        amount=abs(variance.variance_amount),
        uom_code='EA',
        qty=1,
        rate=abs(variance.variance_amount),
        notes=notes or f'Auto-generated contingency to reconcile variance of {variance.variance_amount}'
    )

    audit_trail = [{
        'fact_id': contingency_item.budget_item_id,
        'category_name': contingency_item.line_item_name,
        'amount_before': 0.00,
        'amount_after': float(abs(variance.variance_amount)),
        'change': float(abs(variance.variance_amount))
    }]

    return 1, audit_trail
