"""
Landscaper AI Handler

Provides AI-powered responses for real estate project analysis.
Currently uses stub responses with placeholder data.
Will integrate with Claude API in future phase.
"""

from typing import Dict, List, Any


# ─────────────────────────────────────────────────────────────────────────────
# System Prompts by Project Type
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPTS = {
    'land_development': """You are Landscaper, an AI assistant specialized in land development real estate analysis.

Your expertise includes:
- Land acquisition and pricing analysis
- Development budgets and cost estimation
- Absorption rate forecasting and market velocity
- Lot pricing strategies and builder negotiations
- Infrastructure costs (grading, utilities, streets)
- Entitlement and zoning considerations
- Phase-by-phase development planning

When analyzing projects:
- Focus on land basis and development margin
- Consider absorption rates from comparable subdivisions
- Analyze builder takedown schedules
- Review infrastructure cost benchmarks
- Evaluate entitlement risk and timeline""",

    'multifamily': """You are Landscaper, an AI assistant specialized in multifamily real estate analysis.

Your expertise includes:
- Rent roll analysis and income optimization
- Operating expense benchmarking
- Cap rate analysis and valuation
- Unit mix optimization
- Renovation ROI analysis
- Market rent comparables
- NOI projections and stabilization

When analyzing properties:
- Focus on rent per square foot and rent growth
- Analyze operating expense ratios
- Review comparable sales and cap rates
- Consider renovation potential and value-add opportunities
- Evaluate occupancy trends and lease terms""",

    'office': """You are Landscaper, an AI assistant specialized in office real estate analysis.

Your expertise includes:
- Lease analysis and tenant creditworthiness
- Operating expense reconciliation
- Market rent analysis by class
- TI/LC cost analysis
- Vacancy and absorption trends
- Building class comparisons

When analyzing properties:
- Focus on lease rollover exposure
- Analyze rent per RSF vs market
- Review operating expense pass-throughs
- Consider tenant improvement costs
- Evaluate parking ratios and amenities""",

    'retail': """You are Landscaper, an AI assistant specialized in retail real estate analysis.

Your expertise includes:
- Tenant sales performance (PSF analysis)
- Lease structures (percentage rent, CAM)
- Anchor tenant analysis
- Trade area demographics
- Retail occupancy cost ratios
- E-commerce impact assessment

When analyzing properties:
- Focus on tenant sales and occupancy costs
- Analyze anchor tenant credit and sales
- Review lease structures and renewal options
- Consider trade area competition
- Evaluate parking and visibility""",

    'industrial': """You are Landscaper, an AI assistant specialized in industrial real estate analysis.

Your expertise includes:
- Clear height and loading dock analysis
- Industrial rent benchmarking
- Truck court and circulation
- Power and infrastructure requirements
- Lease terms and tenant credit
- Last-mile logistics considerations

When analyzing properties:
- Focus on rent per SF and clear heights
- Analyze loading capacity and dock doors
- Review tenant credit and lease terms
- Consider location for logistics
- Evaluate building specifications""",

    'default': """You are Landscaper, an AI assistant specialized in real estate development analysis.

Your expertise spans multiple property types including:
- Land development and lot sales
- Multifamily apartments
- Office buildings
- Retail centers
- Industrial/warehouse

You can help with:
- Financial feasibility analysis
- Market research and comparables
- Budget analysis and cost estimation
- Cash flow projections
- Investment return calculations"""
}


def get_system_prompt(project_type: str) -> str:
    """Get the appropriate system prompt based on project type."""
    type_lower = (project_type or '').lower()

    # Map project type codes to categories
    type_map = {
        'land': 'land_development',
        'mf': 'multifamily',
        'multifamily': 'multifamily',
        'off': 'office',
        'office': 'office',
        'ret': 'retail',
        'retail': 'retail',
        'ind': 'industrial',
        'industrial': 'industrial',
    }

    category = type_map.get(type_lower, 'default')
    return SYSTEM_PROMPTS.get(category, SYSTEM_PROMPTS['default'])


def get_landscaper_response(
    messages: List[Dict[str, str]],
    project_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate AI response to user message.

    Currently uses stub responses. Will integrate with Claude API in future.

    Args:
        messages: List of previous messages in format:
                  [{'role': 'user'|'assistant', 'content': str}, ...]
        project_context: Dict containing project info:
                         {'project_id': int, 'project_name': str, 'project_type': str}

    Returns:
        Dict with:
        - content: str (response text)
        - metadata: dict (confidence, suggested_values, system_prompt, etc.)
    """

    project_name = project_context.get('project_name', 'your project')
    project_type = project_context.get('project_type', '')
    last_user_message = _get_last_user_message(messages)

    # Get context-aware system prompt
    system_prompt = get_system_prompt(project_type)

    # Generate contextual placeholder response
    response_content = _generate_stub_response(last_user_message, project_name, project_type)

    # Optionally generate some sample advice data
    suggested_values = _generate_stub_advice(last_user_message, project_type)

    return {
        'content': response_content,
        'metadata': {
            'confidence_level': 'placeholder',
            'suggested_values': suggested_values,
            'model': 'stub-phase6',
            'system_prompt_category': project_type or 'default',
            'note': 'Real AI integration coming soon'
        }
    }


def _get_last_user_message(messages: List[Dict[str, str]]) -> str:
    """Extract the most recent user message."""
    for msg in reversed(messages):
        if msg.get('role') == 'user':
            return msg.get('content', '')
    return ''


def _generate_stub_response(user_message: str, project_name: str, project_type: str = '') -> str:
    """
    Generate a contextual placeholder response.

    In Phase 7+, this will be replaced with actual Claude API calls.
    """

    user_lower = user_message.lower()
    type_lower = (project_type or '').lower()

    # Project type specific intro
    type_labels = {
        'land': 'land development',
        'mf': 'multifamily',
        'off': 'office',
        'ret': 'retail',
        'ind': 'industrial',
    }
    type_label = type_labels.get(type_lower, 'real estate')

    # Context-aware responses based on keywords
    if any(word in user_lower for word in ['land', 'acre', 'price', 'lot']):
        return f"""I'm analyzing land costs for {project_name}.

**Placeholder Response:**
Based on typical market data for your area, residential land typically trades between $50,000-$120,000 per acre depending on:
• Entitlement status
• Infrastructure proximity
• Market velocity
• Zoning flexibility

*Note: This is a placeholder response. Real AI integration will provide project-specific analysis based on your actual data and current market conditions.*

**Next Steps:**
• Type questions about your project
• All messages are saved to your project history
• Manual AI suggestions can be entered via the Advice panel"""

    elif any(word in user_lower for word in ['rent', 'lease', 'tenant', 'unit']):
        if type_lower == 'mf':
            return f"""I'm analyzing the rent roll for {project_name}.

**Placeholder Response:**
Key metrics I typically analyze for multifamily:
• Average rent per unit type
• Rent per square foot vs market
• Occupancy rate and trends
• Lease expiration schedule
• Loss to lease analysis

*Note: Placeholder response. Real integration will analyze your actual rent roll data.*

**Available Analysis:**
• Market rent comparison
• Unit mix optimization
• Renovation ROI projections"""
        else:
            return f"""I'm analyzing lease data for {project_name}.

**Placeholder Response:**
Lease analysis typically includes:
• Base rent and escalations
• Tenant creditworthiness
• Lease term and options
• Operating expense pass-throughs

*Note: Placeholder response. Real integration will analyze your lease abstracts.*"""

    elif any(word in user_lower for word in ['budget', 'cost', 'expense']):
        return f"""I'm reviewing budget assumptions for {project_name}.

**Placeholder Response:**
Key budget considerations for {type_label}:
• Hard costs by category
• Soft costs (design, permits, legal)
• Contingencies (typically 5-10%)
• Timeline impacts on cost escalation

*Note: This is a placeholder. Real AI will analyze your actual budget items and suggest optimizations based on historical data.*

**How I Can Help:**
• Ask about specific budget categories
• Request benchmark comparisons
• Get timeline-based cost projections"""

    elif any(word in user_lower for word in ['market', 'absorption', 'velocity', 'sales', 'comp']):
        return f"""I'm analyzing market dynamics for {project_name}.

**Placeholder Response:**
Market analysis for {type_label} typically includes:
• Historical absorption rates
• Current inventory levels
• Price trends over 12-24 months
• Competitor activity

*Note: Placeholder response. Real integration will pull live market data and provide actionable insights.*

**Available Analysis:**
• Absorption rate forecasting
• Pricing strategy recommendations
• Comparable sales analysis"""

    elif any(word in user_lower for word in ['noi', 'cap rate', 'value', 'valuation']):
        return f"""I'm analyzing valuation metrics for {project_name}.

**Placeholder Response:**
Key valuation considerations:
• Net Operating Income (NOI)
• Market cap rates by submarket
• Comparable sales analysis
• Growth rate assumptions

*Note: Placeholder response. Real integration will calculate valuations based on your actual financials.*

**Available Analysis:**
• Cap rate sensitivity
• IRR projections
• Comparable value reconciliation"""

    else:
        # Generic response for unrecognized queries
        return f"""I'm Landscaper AI, analyzing {project_name} ({type_label}).

**Placeholder Response:**
This is a demonstration of the chat interface. Real AI integration is coming soon.

**What I Can Do (When Fully Integrated):**
• Analyze project budgets and suggest optimizations
• Provide market intelligence and absorption forecasts
• Recommend pricing strategies based on comps
• Flag unusual assumptions or risks
• Calculate variances between my suggestions and your decisions

**Current Functionality:**
✓ Messages save to your project history
✓ Chat persists across sessions
✓ Variance tracking UI is ready
✓ Manual advice entry available

**Your Message:**
"{user_message[:100]}{'...' if len(user_message) > 100 else ''}"

*Ask me anything about {project_name} - responses will be saved for future reference!*"""


def _generate_stub_advice(user_message: str, project_type: str = '') -> Dict[str, Any]:
    """
    Generate sample advice data for demonstration.

    In Phase 7+, this will be real AI-generated suggestions.
    Returns float values (not Decimal) for JSON serialization.
    """

    user_lower = user_message.lower()
    type_lower = (project_type or '').lower()

    # Land development specific advice
    if type_lower == 'land' or 'land' in user_lower or 'acre' in user_lower:
        return {
            'land_price_per_acre': {
                'value': 75000.00,
                'confidence': 'medium',
                'stage': 'ACQUISITION',
                'notes': 'Based on comparable land sales in the area'
            }
        }

    # Multifamily specific advice
    if type_lower == 'mf' or 'rent' in user_lower:
        return {
            'market_rent_psf': {
                'value': 2.15,
                'confidence': 'high',
                'stage': 'OPERATIONS',
                'notes': 'Based on comparable Class B properties'
            }
        }

    # General development advice
    if 'grading' in user_lower:
        return {
            'grading_cost_per_sf': {
                'value': 2.50,
                'confidence': 'high',
                'stage': 'PLANNING'
            }
        }
    elif 'contingency' in user_lower:
        return {
            'contingency_percent': {
                'value': 7.5,
                'confidence': 'high',
                'stage': 'PLANNING'
            }
        }

    # No specific advice for this query
    return {}
