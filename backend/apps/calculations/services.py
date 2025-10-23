"""
Service layer for financial calculations using the Python engine.

Bridges Django ORM and the Python financial calculation engine.
"""

from typing import Dict, List, Optional
from decimal import Decimal
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


class CalculationService:
    """Service for performing financial calculations."""
    
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
