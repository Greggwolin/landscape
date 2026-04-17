"""
Modal tools — open structured editing interfaces in the user's browser.

These tools do NOT modify data. They return metadata that the frontend interprets
to open the appropriate editing modal.
"""

from ..tool_executor import register_tool


VALID_MODALS = [
    'operating_statement', 'rent_roll', 'property_details', 'budget',
    'sales_comps', 'cost_approach', 'income_approach', 'reconciliation',
    'loan_inputs', 'equity_structure', 'land_use', 'parcels',
    'sales_absorption', 'renovation', 'acquisition', 'contacts',
    'project_details',
]


@register_tool('open_input_modal')
def open_input_modal(modal_name: str = None, context: dict = None, **kwargs):
    """
    Open an editing modal in the user's interface.

    Use this tool when the user wants to directly edit data in a structured form
    rather than through conversation. Available modals:

    - operating_statement: Full P&L operating statement grid
    - rent_roll: Unit-level rent roll with lease details
    - property_details: Physical property description and floor plans
    - budget: Development budget line items
    - sales_comps: Sales comparison adjustment matrix
    - cost_approach: Cost approach inputs (Marshall & Swift)
    - income_approach: Income capitalization inputs
    - reconciliation: Value reconciliation weights and narrative
    - loan_inputs: Debt structure and loan terms
    - equity_structure: Equity waterfall tiers
    - land_use: Land use taxonomy and product mix
    - parcels: Parcel inventory grid
    - sales_absorption: Sales schedule and absorption rates
    - renovation: Renovation scope and costs
    - acquisition: Acquisition assumptions and pricing
    - contacts: Project contacts
    - project_details: Project profile and settings

    Args:
        modal_name: One of the modal keys listed above
        context: Optional dict with context for the modal (e.g., {"tab": "details"})
    """
    # tool_input comes via **kwargs from execute_tool() — extract params from it
    tool_input = kwargs.get('tool_input', {})
    modal_name = modal_name or tool_input.get('modal_name')
    context = context or tool_input.get('context')

    if not modal_name:
        return {
            'success': False,
            'error': 'modal_name is required',
        }

    if modal_name not in VALID_MODALS:
        return {
            'success': False,
            'error': f'Unknown modal: {modal_name}. Valid options: {", ".join(VALID_MODALS)}',
        }

    return {
        'success': True,
        'action': 'open_modal',
        'modal_name': modal_name,
        'context': context or {},
        'message': f'Opening {modal_name.replace("_", " ").title()} for editing.',
    }
