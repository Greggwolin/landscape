"""
Landscaper AI Handler - Stubbed for Phase 6

TODO: Replace with real Anthropic API integration when budget allows.

For now, this returns placeholder responses to demonstrate
the chat interface and message persistence functionality.
"""

import random
from decimal import Decimal
from typing import Dict, List, Any


def get_landscaper_response(
    messages: List[Dict[str, str]],
    project_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate AI response to user message.

    PHASE 6 STUB: Returns placeholder responses with realistic formatting.

    Args:
        messages: List of previous messages in format:
                  [{'role': 'user'|'assistant', 'content': str}, ...]
        project_context: Dict containing project info:
                         {'project_id': int, 'project_name': str, ...}

    Returns:
        Dict with:
        - content: str (response text)
        - metadata: dict (confidence, suggested_values, etc.)
    """

    project_name = project_context.get('project_name', 'your project')
    last_user_message = _get_last_user_message(messages)

    # Generate contextual placeholder response
    response_content = _generate_stub_response(last_user_message, project_name)

    # Optionally generate some sample advice data
    suggested_values = _generate_stub_advice(last_user_message)

    return {
        'content': response_content,
        'metadata': {
            'confidence_level': 'placeholder',
            'suggested_values': suggested_values,
            'model': 'stub-phase6',
            'note': 'Real AI integration coming soon'
        }
    }


def _get_last_user_message(messages: List[Dict[str, str]]) -> str:
    """Extract the most recent user message."""
    for msg in reversed(messages):
        if msg.get('role') == 'user':
            return msg.get('content', '')
    return ''


def _generate_stub_response(user_message: str, project_name: str) -> str:
    """
    Generate a contextual placeholder response.

    In Phase 7+, this will be replaced with actual Claude API calls.
    """

    user_lower = user_message.lower()

    # Context-aware responses based on keywords
    if any(word in user_lower for word in ['land', 'acre', 'price', 'cost']):
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

    elif any(word in user_lower for word in ['budget', 'cost', 'expense']):
        return f"""I'm reviewing budget assumptions for {project_name}.

**Placeholder Response:**
Key budget considerations I'd typically analyze:
• Hard costs (grading, utilities, streets)
• Soft costs (design, permits, legal)
• Contingencies (typically 5-10%)
• Timeline impacts on cost escalation

*Note: This is a placeholder. Real AI will analyze your actual budget items and suggest optimizations based on historical data.*

**How I Can Help:**
• Ask about specific budget categories
• Request benchmark comparisons
• Get timeline-based cost projections"""

    elif any(word in user_lower for word in ['market', 'absorption', 'velocity', 'sales']):
        return f"""I'm analyzing market dynamics for {project_name}.

**Placeholder Response:**
Market analysis typically includes:
• Historical absorption rates for your area
• Current inventory levels
• Price trends over 12-24 months
• Competitor activity

*Note: Placeholder response. Real integration will pull live market data and provide actionable insights.*

**Available Analysis:**
• Absorption rate forecasting
• Pricing strategy recommendations
• Launch timing optimization"""

    else:
        # Generic response for unrecognized queries
        return f"""I'm Landscaper AI, analyzing {project_name}.

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


def _generate_stub_advice(user_message: str) -> Dict[str, Any]:
    """
    Generate sample advice data for demonstration.

    In Phase 7+, this will be real AI-generated suggestions.
    """

    user_lower = user_message.lower()

    # Return sample suggested values based on context
    if 'land' in user_lower or 'acre' in user_lower:
        return {
            'land_price_per_acre': {
                'value': Decimal('75000.00'),
                'confidence': 'medium',
                'stage': 'ACQUISITION'
            }
        }
    elif 'grading' in user_lower:
        return {
            'grading_cost_per_sf': {
                'value': Decimal('2.50'),
                'confidence': 'high',
                'stage': 'PLANNING'
            }
        }
    elif 'contingency' in user_lower:
        return {
            'contingency_percent': {
                'value': Decimal('7.5'),
                'confidence': 'high',
                'stage': 'PLANNING'
            }
        }

    # No specific advice for this query
    return {}
