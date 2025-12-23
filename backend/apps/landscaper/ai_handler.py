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
        "description": """Update a project field. Use when user asks to change data or you can infer missing data.

tbl_project fields:
- Location: city, state, county, zip_code, project_address, street_address
- Also: jurisdiction_city, jurisdiction_state, jurisdiction_county (jurisdiction-specific)
- Market: market, submarket, market_velocity_annual
- Sizing: acres_gross, target_units
- Financial: price_range_low, price_range_high, discount_rate_pct
- Other: project_name, description, project_type

tbl_parcel fields: parcel_name, lot_count, net_acres, gross_acres, avg_lot_price, absorption_rate
tbl_phase fields: phase_name, phase_number, lot_count, budget_amount""",
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
    },
    {
        "name": "get_field_schema",
        "description": """Get metadata about available fields including data types, valid values, and whether they're editable.
Use this to understand what fields exist and their constraints before updating.
Returns field_name, display_name, description, data_type, is_editable, valid_values, unit_of_measure, and field_group.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "table_name": {
                    "type": "string",
                    "description": "Filter by table (e.g., tbl_project, tbl_parcel, tbl_phase). Omit for all tables."
                },
                "field_group": {
                    "type": "string",
                    "description": "Filter by field group (e.g., Location, Financial, Size, Market, Timing)"
                },
                "field_name": {
                    "type": "string",
                    "description": "Search for specific field by name (partial match)"
                }
            },
            "required": []
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Document Reading Tools
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_project_documents",
        "description": """List all documents uploaded to this project.
Returns doc_id, doc_name, doc_type, extraction_status, and assertion_count for each document.
Use this to see what documents are available before reading their content.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "status_filter": {
                    "type": "string",
                    "description": "Filter by extraction status: 'indexed' (completed), 'pending', 'failed', or 'all' (default)"
                }
            },
            "required": []
        }
    },
    {
        "name": "get_document_content",
        "description": """Get the extracted content from a document.
Use this to read OMs, rent rolls, reports, and other uploaded files.
Returns structured extraction data including property info, unit types, units, and leases.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "doc_id": {
                    "type": "integer",
                    "description": "Document ID to retrieve content from (get from get_project_documents)"
                },
                "max_length": {
                    "type": "integer",
                    "description": "Maximum characters to return (default 50000)"
                }
            },
            "required": ["doc_id"]
        }
    },
    {
        "name": "get_document_assertions",
        "description": """Get structured data assertions extracted from documents.
Assertions are key-value pairs like unit types, financial figures, dates, etc.
Each assertion has a confidence score and links back to the source document.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "doc_id": {
                    "type": "integer",
                    "description": "Filter to assertions from a specific document. If omitted, returns all project assertions."
                },
                "subject_type": {
                    "type": "string",
                    "description": "Filter by assertion type (e.g., 'unit_type', 'unit', 'lease', 'property')"
                }
            },
            "required": []
        }
    },
    {
        "name": "ingest_document",
        "description": """Auto-populate project fields from a document.
Reads the document content and uses OM field mapping to identify and populate empty project fields.
Useful for quickly populating property data from an Offering Memorandum or similar document.

Examples of fields that can be auto-populated:
- Property: address, city, state, county, year_built, total_units, parking
- Pricing: asking_price, price_per_unit, cap_rate
- Income: current_rent, market_rent, occupancy_rate
- Expenses: operating_expenses, management_fee, taxes

By default, only populates empty fields. Set overwrite_existing=true to update all fields.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "doc_id": {
                    "type": "integer",
                    "description": "Document ID to extract data from"
                },
                "overwrite_existing": {
                    "type": "boolean",
                    "description": "If true, overwrite fields that already have values. Default is false (only populate empty fields)."
                },
                "field_filter": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of field names to limit ingestion to (e.g., ['total_units', 'year_built'])"
                }
            },
            "required": ["doc_id"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Operating Expense Tools
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "update_operating_expenses",
        "description": """Add or update operating expenses for the project.
Use this to populate the Operations tab with expense line items extracted from OMs or entered manually.

Each expense maps to the Chart of Accounts (tbl_opex_accounts) automatically based on the label.
Supported expense categories: taxes, insurance, utilities, repairs/maintenance, management, other.

Examples of expense labels that are recognized:
- Taxes: "Property Taxes", "Real Estate Taxes", "Insurance"
- Utilities: "Water & Sewer", "Electricity", "Gas", "Trash"
- Maintenance: "Repairs & Maintenance", "Landscaping", "Pest Control", "Pool Maintenance"
- Management: "Property Management", "Management Fee", "Administrative", "Payroll"
- Other: "Advertising", "Professional Services", "Security"

After using this tool, the data will appear in the Operations tab.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "expenses": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {
                                "type": "string",
                                "description": "Expense name (e.g., 'Property Taxes', 'Insurance', 'Water & Sewer')"
                            },
                            "annual_amount": {
                                "type": "number",
                                "description": "Annual expense amount in dollars"
                            },
                            "expense_type": {
                                "type": "string",
                                "description": "Override type: CAM, TAXES, INSURANCE, MANAGEMENT, UTILITIES, REPAIRS, OTHER"
                            },
                            "escalation_rate": {
                                "type": "number",
                                "description": "Annual escalation rate as decimal (default 0.03 = 3%)"
                            },
                            "is_recoverable": {
                                "type": "boolean",
                                "description": "Whether expense is recoverable from tenants (default false)"
                            }
                        },
                        "required": ["label", "annual_amount"]
                    },
                    "description": "List of operating expenses to add/update"
                },
                "source_document": {
                    "type": "string",
                    "description": "Optional document name where expenses were extracted from (for activity logging)"
                }
            },
            "required": ["expenses"]
        }
    }
]


# ─────────────────────────────────────────────────────────────────────────────
# System Prompts by Project Type
# ─────────────────────────────────────────────────────────────────────────────

BASE_INSTRUCTIONS = """
RESPONSE STYLE - Be concise:
- 1-2 sentences for routine updates
- Don't narrate your thinking or explain what you're checking
- Just do the task and confirm what you did
- Only ask questions if truly necessary

Good: "Updated the county to Ventura County based on the Thousand Oaks address."
Bad: "I need to check the current address first. Let me retrieve that information..."

DOCUMENT READING:
You have access to documents uploaded to this project. You can:
- List all project documents with get_project_documents
- Read extracted document content with get_document_content
- View structured assertions with get_document_assertions
- Auto-populate fields with ingest_document

When asked to read a document and populate fields:
1. Use get_project_documents to find the document
2. Use ingest_document to auto-populate fields from the document
3. Report what was updated and what was skipped

For manual extraction (more control):
1. Use get_document_content to read the document
2. Use bulk_update_fields to update specific fields
3. Report what you updated

FIELD UPDATES:
- Use tools to update fields when user asks or when you can infer missing data
- After updating, briefly confirm: "Updated [field] from [old] to [new]."
- If unsure about a field name, use get_field_schema to find the correct field
- Check is_editable before updating - don't attempt to update calculated fields (NOI, IRR)
- For fields with valid_values, only use allowed values

SCHEMA AWARENESS:
You have access to a complete field catalog via get_field_schema. Common field mappings:
- "city" → city or jurisdiction_city (tbl_project)
- "county" → county or jurisdiction_county (tbl_project)
- "state" → state or jurisdiction_state (tbl_project)
- "zip" → zip_code (tbl_project)
- "address" → project_address or street_address (tbl_project)
- "market" → market (tbl_project)
- "type" → project_type (tbl_project)

ANALYSIS RESPONSES:
- Use bullet points for lists
- Format currency as $X,XXX and percentages as X.X%
- Keep under 200 words unless detailed analysis is requested
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
                    elif tool_name == 'update_operating_expenses':
                        if result.get('success') or result.get('created', 0) > 0 or result.get('updated', 0) > 0:
                            field_updates.append({
                                'type': 'operating_expenses',
                                'created': result.get('created', 0),
                                'updated': result.get('updated', 0),
                                'summary': result.get('summary', '')
                            })

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
