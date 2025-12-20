"""
Landscaper AI Handler

Provides AI-powered responses for real estate project analysis.
Uses Claude API (Anthropic) with context-aware system prompts.
"""

import logging
from typing import Dict, List, Any, Optional

import anthropic
from decouple import config

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Model to use for responses
CLAUDE_MODEL = "claude-sonnet-4-20250514"

# Maximum tokens for response
MAX_TOKENS = 1024


# ─────────────────────────────────────────────────────────────────────────────
# System Prompts by Project Type
# ─────────────────────────────────────────────────────────────────────────────

BASE_INSTRUCTIONS = """
You are having a conversation about a specific real estate project. Keep responses concise and actionable.

Guidelines:
- Be direct and specific to the project context provided
- Use bullet points for lists
- Cite specific numbers when discussing financials
- If you don't have enough data to answer precisely, say so and explain what you'd need
- Format currency as $X,XXX and percentages as X.X%
- Keep responses under 300 words unless detailed analysis is requested
"""

SYSTEM_PROMPTS = {
    'land_development': f"""You are Landscaper, an AI assistant specialized in land development real estate analysis.

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
- Evaluate entitlement risk and timeline
{BASE_INSTRUCTIONS}""",

    'multifamily': f"""You are Landscaper, an AI assistant specialized in multifamily real estate analysis.

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
- Evaluate occupancy trends and lease terms
{BASE_INSTRUCTIONS}""",

    'office': f"""You are Landscaper, an AI assistant specialized in office real estate analysis.

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
- Evaluate parking ratios and amenities
{BASE_INSTRUCTIONS}""",

    'retail': f"""You are Landscaper, an AI assistant specialized in retail real estate analysis.

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
- Evaluate parking and visibility
{BASE_INSTRUCTIONS}""",

    'industrial': f"""You are Landscaper, an AI assistant specialized in industrial real estate analysis.

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
- Evaluate building specifications
{BASE_INSTRUCTIONS}""",

    'default': f"""You are Landscaper, an AI assistant specialized in real estate development analysis.

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
- Investment return calculations
{BASE_INSTRUCTIONS}"""
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


def _build_project_context_message(project_context: Dict[str, Any]) -> str:
    """Build a context message with project details for Claude."""
    project_name = project_context.get('project_name', 'Unknown Project')
    project_type = project_context.get('project_type', '')

    # Get additional context if available
    budget_summary = project_context.get('budget_summary', {})
    market_data = project_context.get('market_data', {})

    context_parts = [
        f"**Current Project: {project_name}**",
    ]

    if project_type:
        type_labels = {
            'land': 'Land Development',
            'mf': 'Multifamily',
            'off': 'Office',
            'ret': 'Retail',
            'ind': 'Industrial',
        }
        context_parts.append(f"Type: {type_labels.get(project_type.lower(), project_type)}")

    # Add budget context if available
    if budget_summary:
        if budget_summary.get('total_budget'):
            context_parts.append(f"Total Budget: ${budget_summary['total_budget']:,.0f}")
        if budget_summary.get('total_actual'):
            context_parts.append(f"Total Actual: ${budget_summary['total_actual']:,.0f}")

    # Add market data if available
    if market_data:
        if market_data.get('absorption_rate'):
            context_parts.append(f"Absorption Rate: {market_data['absorption_rate']} lots/month")
        if market_data.get('avg_lot_price'):
            context_parts.append(f"Avg Lot Price: ${market_data['avg_lot_price']:,.0f}")

    return "\n".join(context_parts)


def _get_anthropic_client() -> Optional[anthropic.Anthropic]:
    """Get Anthropic client, returns None if API key not configured."""
    api_key = config('ANTHROPIC_API_KEY', default='')
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set, falling back to stub responses")
        return None

    try:
        return anthropic.Anthropic(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to create Anthropic client: {e}")
        return None


def get_landscaper_response(
    messages: List[Dict[str, str]],
    project_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate AI response to user message using Claude API.

    Args:
        messages: List of previous messages in format:
                  [{'role': 'user'|'assistant', 'content': str}, ...]
        project_context: Dict containing project info:
                         {'project_id': int, 'project_name': str, 'project_type': str,
                          'budget_summary': {...}, 'market_data': {...}}

    Returns:
        Dict with:
        - content: str (response text)
        - metadata: dict (model, tokens used, etc.)
    """
    project_type = project_context.get('project_type', '')
    system_prompt = get_system_prompt(project_type)

    # Add project context to system prompt
    project_context_msg = _build_project_context_message(project_context)
    full_system = f"{system_prompt}\n\n---\n{project_context_msg}"

    # Try Claude API first
    client = _get_anthropic_client()
    if client:
        try:
            # Convert messages to Claude format
            claude_messages = []
            for msg in messages:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                if role in ('user', 'assistant') and content:
                    claude_messages.append({
                        'role': role,
                        'content': content
                    })

            # Make API call
            response = client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=MAX_TOKENS,
                system=full_system,
                messages=claude_messages
            )

            # Extract response content
            response_content = ""
            if response.content:
                for block in response.content:
                    if hasattr(block, 'text'):
                        response_content += block.text

            return {
                'content': response_content,
                'metadata': {
                    'model': CLAUDE_MODEL,
                    'input_tokens': response.usage.input_tokens,
                    'output_tokens': response.usage.output_tokens,
                    'stop_reason': response.stop_reason,
                    'system_prompt_category': project_type or 'default',
                }
            }

        except anthropic.APIConnectionError as e:
            logger.error(f"Claude API connection error: {e}")
            return _generate_fallback_response(messages, project_context, str(e))
        except anthropic.RateLimitError as e:
            logger.error(f"Claude API rate limit: {e}")
            return _generate_fallback_response(messages, project_context, "Rate limit exceeded")
        except anthropic.APIStatusError as e:
            logger.error(f"Claude API status error: {e.status_code} - {e.message}")
            return _generate_fallback_response(messages, project_context, str(e.message))
        except Exception as e:
            logger.error(f"Unexpected error calling Claude API: {e}")
            return _generate_fallback_response(messages, project_context, str(e))

    # Fallback to stub response if no API key
    return _generate_fallback_response(messages, project_context, "API key not configured")


def _generate_fallback_response(
    messages: List[Dict[str, str]],
    project_context: Dict[str, Any],
    error_reason: str
) -> Dict[str, Any]:
    """Generate a fallback response when Claude API is unavailable."""
    project_name = project_context.get('project_name', 'your project')
    last_user_message = _get_last_user_message(messages)

    response_content = f"""I apologize, but I'm currently unable to provide a full AI-powered response.

**Reason:** {error_reason}

**Your Question:**
"{last_user_message[:200]}{'...' if len(last_user_message) > 200 else ''}"

**What I Can Tell You:**
I'm Landscaper, your AI assistant for analyzing {project_name}. Once the connection is restored, I can help with:
• Budget analysis and cost optimization
• Market intelligence and absorption forecasts
• Pricing strategies based on comparables
• Risk assessment and flagging unusual assumptions

**In the meantime:**
• Your message has been saved to your project history
• Try again in a few moments
• Check that the API key is properly configured"""

    return {
        'content': response_content,
        'metadata': {
            'model': 'fallback',
            'error': error_reason,
            'system_prompt_category': project_context.get('project_type', 'default'),
        }
    }


def _get_last_user_message(messages: List[Dict[str, str]]) -> str:
    """Extract the most recent user message."""
    for msg in reversed(messages):
        if msg.get('role') == 'user':
            return msg.get('content', '')
    return ''
