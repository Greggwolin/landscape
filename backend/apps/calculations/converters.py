"""
ORM to Pydantic conversion layer for financial calculation engine.

Converts Django ORM models to Pydantic models expected by the Python financial engine.
"""

from decimal import Decimal
from typing import List, Dict, Optional
from datetime import date, datetime
from apps.projects.models import Project
from apps.financial.models import BudgetItem, ActualItem
from apps.multifamily.models import MultifamilyUnit, MultifamilyLease


def convert_project_to_property_data(project: Project) -> Dict:
    """
    Convert Django Project model to PropertyData for financial engine.
    
    Args:
        project: Django Project instance
        
    Returns:
        Dictionary compatible with financial_engine.models.PropertyData
    """
    return {
        'property_id': project.project_id,
        'property_name': project.project_name,
        'property_type': project.property_type_code or 'unknown',
        'acquisition_date': project.start_date,
        'analysis_start_date': project.analysis_start_date,
        'analysis_end_date': project.analysis_end_date,
        'discount_rate': float(project.discount_rate_pct or 0.10),
        'metadata': {
            'development_type': project.development_type,
            'acres': float(project.acres_gross) if project.acres_gross else None,
            'location': {
                'city': project.jurisdiction_city,
                'state': project.jurisdiction_state,
                'county': project.jurisdiction_county,
            }
        }
    }


def convert_budget_items_to_cashflows(budget_items: List[BudgetItem]) -> List[Dict]:
    """
    Convert budget items to cash flow data for financial engine.
    
    Args:
        budget_items: List of BudgetItem instances
        
    Returns:
        List of cash flow dictionaries
    """
    cashflows = []
    
    for item in budget_items:
        cashflow = {
            'period': item.fiscal_period,
            'fiscal_year': item.fiscal_year,
            'category': item.category,
            'subcategory': item.subcategory,
            'amount': float(item.budgeted_amount or 0),
            'description': item.line_item_name,
            'is_revenue': item.category in ['REVENUE', 'INCOME', 'SALES'],
            'container_id': item.container_id,
            'project_id': item.project_id,
        }
        cashflows.append(cashflow)
    
    return cashflows


def convert_multifamily_to_income_property(
    project: Project,
    units: List[MultifamilyUnit],
    leases: List[MultifamilyLease]
) -> Dict:
    """
    Convert multifamily units and leases to income property data.
    
    Args:
        project: Project instance
        units: List of MultifamilyUnit instances
        leases: List of MultifamilyLease instances
        
    Returns:
        Dictionary compatible with income property calculations
    """
    total_units = len(units)
    occupied_units = len([u for u in units if any(
        l.unit_id == u.unit_id and l.lease_status == 'ACTIVE' for l in leases
    )])
    
    total_market_rent = sum(float(u.market_rent or 0) for u in units)
    total_actual_rent = sum(
        float(l.base_rent_monthly or 0) 
        for l in leases 
        if l.lease_status == 'ACTIVE'
    )
    
    return {
        'property_id': project.project_id,
        'property_name': project.project_name,
        'property_type': 'multifamily',
        'total_units': total_units,
        'occupied_units': occupied_units,
        'occupancy_rate': (occupied_units / total_units) if total_units > 0 else 0,
        'market_rent_annual': total_market_rent * 12,
        'actual_rent_annual': total_actual_rent * 12,
        'loss_to_vacancy': (total_market_rent - total_actual_rent) * 12,
        'units': [
            {
                'unit_id': u.unit_id,
                'unit_number': u.unit_number,
                'unit_type': u.unit_type,
                'square_feet': u.square_feet,
                'market_rent': float(u.market_rent or 0),
                'is_occupied': any(
                    l.unit_id == u.unit_id and l.lease_status == 'ACTIVE' 
                    for l in leases
                ),
            }
            for u in units
        ],
        'leases': [
            {
                'lease_id': l.lease_id,
                'unit_id': l.unit_id,
                'resident_name': l.resident_name,
                'start_date': l.lease_start_date.isoformat() if l.lease_start_date else None,
                'end_date': l.lease_end_date.isoformat() if l.lease_end_date else None,
                'monthly_rent': float(l.base_rent_monthly or 0),
            }
            for l in leases
        ]
    }


def convert_absorption_schedule_to_revenue(absorption_data) -> List[Dict]:
    """
    Convert absorption schedule to revenue projections.
    
    Args:
        absorption_data: Absorption schedule data from database
        
    Returns:
        List of period-by-period revenue projections
    """
    revenues = []
    
    if not absorption_data:
        return revenues
    
    for item in absorption_data:
        start_period = item.get('start_period', 1)
        periods = item.get('periods_to_complete', 12)
        units_per_period = float(item.get('units_per_period', 0))
        base_price = float(item.get('base_price_per_unit', 0))
        escalation = float(item.get('price_escalation_pct', 0))
        
        for period in range(start_period, start_period + periods):
            # Calculate escalated price
            escalation_factor = (1 + escalation) ** (period - start_period)
            period_price = base_price * escalation_factor
            period_revenue = units_per_period * period_price
            
            revenues.append({
                'period': period,
                'units_sold': units_per_period,
                'price_per_unit': period_price,
                'revenue': period_revenue,
                'revenue_stream': item.get('revenue_stream_name'),
                'category': item.get('revenue_category'),
            })
    
    return revenues


def prepare_irr_calculation_data(
    project: Project,
    budget_items: List[BudgetItem],
    actual_items: Optional[List[ActualItem]] = None
) -> Dict:
    """
    Prepare data for IRR calculation.
    
    Args:
        project: Project instance
        budget_items: List of budget items
        actual_items: Optional list of actual items
        
    Returns:
        Dictionary with cash flows for IRR calculation
    """
    # Combine budget and actual data
    cashflows = convert_budget_items_to_cashflows(budget_items)
    
    if actual_items:
        for item in actual_items:
            cashflows.append({
                'period': item.fiscal_period,
                'fiscal_year': item.fiscal_year,
                'category': item.category,
                'amount': float(item.actual_amount or 0),
                'description': item.line_item_name,
                'is_actual': True,
            })
    
    # Group by period
    period_cashflows = {}
    for cf in cashflows:
        period = cf.get('period', 0)
        if period not in period_cashflows:
            period_cashflows[period] = {'inflows': 0, 'outflows': 0}
        
        amount = cf['amount']
        if cf.get('is_revenue', False):
            period_cashflows[period]['inflows'] += amount
        else:
            period_cashflows[period]['outflows'] += amount
    
    # Create ordered cash flow array
    max_period = max(period_cashflows.keys()) if period_cashflows else 0
    cash_flow_array = []
    
    for period in range(0, max_period + 1):
        cf = period_cashflows.get(period, {'inflows': 0, 'outflows': 0})
        net_cashflow = cf['inflows'] - cf['outflows']
        cash_flow_array.append(net_cashflow)
    
    return {
        'project_id': project.project_id,
        'project_name': project.project_name,
        'cash_flows': cash_flow_array,
        'discount_rate': float(project.discount_rate_pct or 0.10),
        'periods': len(cash_flow_array),
    }


def prepare_npv_calculation_data(
    project: Project,
    budget_items: List[BudgetItem],
    discount_rate: Optional[float] = None
) -> Dict:
    """
    Prepare data for NPV calculation.
    
    Args:
        project: Project instance
        budget_items: List of budget items
        discount_rate: Optional override for discount rate
        
    Returns:
        Dictionary with cash flows for NPV calculation
    """
    irr_data = prepare_irr_calculation_data(project, budget_items)
    irr_data['discount_rate'] = discount_rate or irr_data['discount_rate']
    
    return irr_data
