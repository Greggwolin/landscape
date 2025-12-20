"""
Landscaper AI Handler

Provides AI-powered responses for real estate project analysis.
Uses Claude API (Anthropic) with context-aware system prompts and tool use.
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
MAX_TOKENS = 2048


# ─────────────────────────────────────────────────────────────────────────────
# Tool Definitions for Field Updates
# ─────────────────────────────────────────────────────────────────────────────

LANDSCAPER_TOOLS = [
    {
        "name": "update_project_field",
        "description": """Update any field on the project. Use this when:
- User explicitly asks to change project data
- You can infer missing data from context (e.g., county from address, state from city)
- You notice data inconsistencies that should be corrected
- You want to populate empty fields with reasonable defaults based on the conversation

Common fields you can update (use these exact field names):
- tbl_project: project_name, project_address, jurisdiction_city, jurisdiction_state, jurisdiction_county, county, location_lat, location_lon, project_type, description, acres_gross, target_units, price_range_low, price_range_high
- tbl_parcel: parcel_name, lot_count, net_acres, gross_acres, avg_lot_size_sf, avg_lot_price, absorption_rate
- tbl_phase: phase_name, phase_number, lot_count, budget_amount

You can also use friendly aliases: city (maps to jurisdiction_city), state (maps to jurisdiction_state), address (maps to project_address), total_acres (maps to acres_gross), total_units (maps to target_units)""",
        "input_schema": {
            "type": "object",
            "properties": {
                "table": {
                    "type": "string",
                    "description": "Table name (e.g., tbl_project, tbl_project_details, tbl_assumptions)"
                },
                "field": {
                    "type": "string",
                    "description": "Field/column name to update"
                },
                "value": {
                    "type": "string",
                    "description": "New value (will be cast to appropriate type)"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why this update is being made"
                }
            },
            "required": ["table", "field", "value", "reason"]
        }
    },
    {
        "name": "bulk_update_fields",
        "description": """Update multiple fields at once. Use when you need to make several related updates,
like setting city, state, and county together, or updating multiple assumptions.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "updates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "table": {"type": "string"},
                            "field": {"type": "string"},
                            "value": {"type": "string"},
                            "reason": {"type": "string"}
                        },
                        "required": ["table", "field", "value", "reason"]
                    },
                    "description": "List of field updates to make"
                }
            },
            "required": ["updates"]
        }
    },
    {
        "name": "get_project_fields",
        "description": """Retrieve current values of specific project fields to check before updating.
Use this to verify current state before making changes.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "fields": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "table": {"type": "string"},
                            "field": {"type": "string"}
                        },
                        "required": ["table", "field"]
                    },
                    "description": "List of table.field pairs to retrieve"
                }
            },
            "required": ["fields"]
        }
    }
]


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

IMPORTANT - Field Updates:
- You have the ability to update project fields directly using tools
- When you can infer data (like county from city, or state from address), proactively update it
- When the user asks to change something, use the update tools
- Always explain what you updated in your response
- Example: "I noticed the address is in Thousand Oaks, CA - I've updated the county to Ventura County."
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
    project_id = project_context.get('project_id', '')

    # Get additional context if available
    budget_summary = project_context.get('budget_summary', {})
    market_data = project_context.get('market_data', {})
    project_details = project_context.get('project_details', {})

    context_parts = [
        f"**Current Project: {project_name}** (ID: {project_id})",
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

    # Add project details if available
    if project_details:
        if project_details.get('address'):
            context_parts.append(f"Address: {project_details['address']}")
        if project_details.get('city'):
            city_state = project_details['city']
            if project_details.get('state'):
                city_state += f", {project_details['state']}"
            context_parts.append(f"Location: {city_state}")
        if project_details.get('county'):
            context_parts.append(f"County: {project_details['county']}")
        if project_details.get('total_acres'):
            context_parts.append(f"Total Acres: {project_details['total_acres']}")
        if project_details.get('total_lots'):
            context_parts.append(f"Total Lots: {project_details['total_lots']}")

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
    project_context: Dict[str, Any],
    tool_executor: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Generate AI response to user message using Claude API with tool use.

    Args:
        messages: List of previous messages in format:
                  [{'role': 'user'|'assistant', 'content': str}, ...]
        project_context: Dict containing project info:
                         {'project_id': int, 'project_name': str, 'project_type': str,
                          'budget_summary': {...}, 'market_data': {...}, 'project_details': {...}}
        tool_executor: Optional callable to execute tool calls. If None, tools are disabled.

    Returns:
        Dict with:
        - content: str (response text)
        - metadata: dict (model, tokens used, etc.)
        - tool_calls: list (any tool calls made)
        - field_updates: list (any field updates that were executed)
    """
    project_type = project_context.get('project_type', '')
    system_prompt = get_system_prompt(project_type)

    # Add project context to system prompt
    project_context_msg = _build_project_context_message(project_context)
    full_system = f"{system_prompt}\n\n---\n{project_context_msg}"

    # Try Claude API first
    client = _get_anthropic_client()
    if not client:
        return _generate_fallback_response(messages, project_context, "API key not configured")

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

        # Make API call with tools if executor is provided
        api_kwargs = {
            'model': CLAUDE_MODEL,
            'max_tokens': MAX_TOKENS,
            'system': full_system,
            'messages': claude_messages
        }

        if tool_executor:
            api_kwargs['tools'] = LANDSCAPER_TOOLS

        response = client.messages.create(**api_kwargs)

        # Process response with potential tool use loop
        field_updates = []
        tool_calls_made = []
        final_content = ""
        total_input_tokens = response.usage.input_tokens
        total_output_tokens = response.usage.output_tokens

        # Handle tool use loop
        while response.stop_reason == "tool_use" and tool_executor:
            # Extract tool calls and text from response
            tool_use_blocks = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_use_blocks.append(block)
                elif hasattr(block, 'text'):
                    final_content += block.text

            # Execute each tool call
            tool_results = []
            for tool_block in tool_use_blocks:
                tool_name = tool_block.name
                tool_input = tool_block.input
                tool_id = tool_block.id

                logger.info(f"Executing tool: {tool_name} with input: {tool_input}")
                tool_calls_made.append({
                    'tool': tool_name,
                    'input': tool_input
                })

                # Execute the tool
                try:
                    result = tool_executor(
                        tool_name=tool_name,
                        tool_input=tool_input,
                        project_id=project_context.get('project_id')
                    )

                    # Track field updates
                    if tool_name in ('update_project_field', 'bulk_update_fields'):
                        if result.get('success'):
                            field_updates.extend(result.get('updates', []))

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": str(result)
                    })
                except Exception as e:
                    logger.error(f"Tool execution error: {e}")
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": f"Error executing tool: {str(e)}",
                        "is_error": True
                    })

            # Continue conversation with tool results
            claude_messages.append({
                "role": "assistant",
                "content": response.content
            })
            claude_messages.append({
                "role": "user",
                "content": tool_results
            })

            # Get next response
            response = client.messages.create(**{
                **api_kwargs,
                'messages': claude_messages
            })

            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

        # Extract final text content
        for block in response.content:
            if hasattr(block, 'text'):
                final_content += block.text

        return {
            'content': final_content,
            'metadata': {
                'model': CLAUDE_MODEL,
                'input_tokens': total_input_tokens,
                'output_tokens': total_output_tokens,
                'stop_reason': response.stop_reason,
                'system_prompt_category': project_type or 'default',
            },
            'tool_calls': tool_calls_made,
            'field_updates': field_updates
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
        },
        'tool_calls': [],
        'field_updates': []
    }


def _get_last_user_message(messages: List[Dict[str, str]]) -> str:
    """Extract the most recent user message."""
    for msg in reversed(messages):
        if msg.get('role') == 'user':
            return msg.get('content', '')
    return ''
