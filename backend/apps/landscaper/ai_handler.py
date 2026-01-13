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
# Platform Knowledge Integration
# ─────────────────────────────────────────────────────────────────────────────

# Primary triggers - explicit valuation/appraisal terminology
PRIMARY_METHODOLOGY_TRIGGERS = {
    # Core valuation terms
    'value', 'valuation', 'appraisal', 'appraise', 'worth',
    'market value', 'investment value', 'assessed value',

    # Approaches to value
    'income approach', 'cost approach', 'sales comparison',
    'comparable', 'comps', 'adjustment', 'adjust for',

    # Income metrics
    'cap rate', 'capitalization', 'noi', 'net operating income',
    'gross rent multiplier', 'grm', 'gim',
    'discount rate', 'yield', 'dcf', 'discounted cash flow',
    'irr', 'npv', 'cash on cash', 'cash-on-cash',

    # Revenue/Expense
    'potential gross', 'effective gross', 'pgi', 'egi',
    'vacancy', 'collection loss', 'credit loss',
    'operating expense', 'expense ratio', 'oer',
    'replacement reserve', 'capex',

    # Cost approach
    'replacement cost', 'reproduction cost',
    'depreciation', 'physical deterioration',
    'functional obsolescence', 'external obsolescence',

    # Other methodology
    'highest and best use', 'hbu',
    'reconciliation', 'reconcile',
    'market rent', 'contract rent', 'loss to lease',
    'absorption', 'stabilized', 'proforma',

    # General appraisal
    'methodology', 'appraisal', 'underwriting',
    'rent roll', 'tenant mix', 'lease rollover',
}

# Secondary triggers - contextual questions that benefit from methodology
SECONDARY_METHODOLOGY_TRIGGERS = {
    'how do i', 'how should i', 'what is a good',
    'is this reasonable', 'does this make sense',
    'reasonable', 'makes sense',
    'typical', 'standard', 'normal range',
    'missing', 'forgot', 'need to add',
    'validate', 'verify', 'check',
    'what should', 'how much should',
    'should i use', 'what to use',
}

# Context terms that activate secondary triggers
SECONDARY_CONTEXT_TERMS = {
    'property', 'building', 'unit', 'rent', 'expense',
    'income', 'cost', 'price', 'rate', 'ratio',
    'noi', 'cap', 'value', 'lease', 'tenant',
    'management', 'vacancy', 'tax', 'insurance',
    'reserve', 'budget', 'fee', 'occupancy',
}

# Task types that always trigger platform knowledge retrieval
METHODOLOGY_TASK_TYPES = {
    'om_extraction', 'rent_roll_analysis', 'expense_analysis',
    'valuation', 'underwriting', 'proforma',
}


def _needs_platform_knowledge(message: str, task_type: Optional[str] = None) -> bool:
    """
    Detect if message or task requires appraisal methodology knowledge.

    Two modes:
    1. User question contains valuation-related terms (primary triggers)
    2. Contextual question about property/financial data (secondary triggers)
    3. Task involves data that should be validated against standards
    """
    message_lower = message.lower()

    # Check primary triggers - explicit valuation questions
    if any(trigger in message_lower for trigger in PRIMARY_METHODOLOGY_TRIGGERS):
        return True

    # Check secondary triggers - require additional context
    if any(trigger in message_lower for trigger in SECONDARY_METHODOLOGY_TRIGGERS):
        # Only fire if also discussing property/financial data
        if any(term in message_lower for term in SECONDARY_CONTEXT_TERMS):
            return True

    # Check task context - always retrieve for certain task types
    if task_type and task_type in METHODOLOGY_TASK_TYPES:
        return True

    return False


def _get_platform_knowledge_context(
    query: str,
    property_type: Optional[str] = None,
    max_chunks: int = 5
) -> str:
    """
    Retrieve relevant platform knowledge and format for system prompt injection.

    Returns formatted context string, or empty string if no relevant knowledge found.
    """
    try:
        from apps.knowledge.services.platform_knowledge_retriever import get_platform_knowledge_retriever

        retriever = get_platform_knowledge_retriever()
        chunks = retriever.retrieve(
            query=query,
            property_type=property_type,
            max_chunks=max_chunks,
            similarity_threshold=0.65
        )

        if not chunks:
            return ""

        # Format chunks for system prompt
        context_parts = [
            "\n<platform_knowledge>",
            "The following excerpts from authoritative appraisal texts inform this response:\n"
        ]

        for chunk in chunks:
            source = chunk['source']
            context_parts.append(
                f"[{source['document_title']}, "
                f"Ch. {source['chapter_number']}: {source['chapter_title']}, "
                f"p. {source['page']}]"
            )
            context_parts.append(chunk['content'])
            context_parts.append("")  # blank line between chunks

        context_parts.append("</platform_knowledge>")

        return "\n".join(context_parts)

    except Exception as e:
        logger.warning(f"Failed to retrieve platform knowledge: {e}")
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# User Knowledge Integration
# ─────────────────────────────────────────────────────────────────────────────

def _get_user_knowledge_context(
    query: str,
    user_id: int,
    project_id: Optional[int] = None,
    organization_id: Optional[int] = None,
    property_type: Optional[str] = None,
    market: Optional[str] = None,
    max_per_type: int = 3
) -> str:
    """
    Retrieve relevant user knowledge and format for system prompt injection.

    Retrieves from:
    1. Past assumptions the user has made (Entity-Fact)
    2. Comparable facts from prior projects (Entity-Fact)

    Returns formatted context string, or empty string if no relevant knowledge found.
    """
    try:
        from apps.knowledge.services.user_knowledge_retriever import get_user_knowledge_retriever

        retriever = get_user_knowledge_retriever(
            organization_id=organization_id,
            user_id=user_id,
        )

        predicates_to_check = [
            'vacancy_rate',
            'management_fee',
            'cap_rate',
            'expense_ratio',
            'replacement_reserves_pct',
        ]

        assumption_stats = {}
        for predicate in predicates_to_check:
            stats = retriever.get_assumption_stats(
                predicate=predicate,
                property_type=property_type,
                msa=market,
            )
            if stats:
                assumption_stats[predicate] = stats

        comparables = retriever.get_comparable_facts(
            comp_type='sale',
            property_type=property_type,
            msa=market,
            limit=max_per_type,
        )

        if not assumption_stats and not comparables:
            return ""

        context_parts = ["\n<user_knowledge>"]
        context_parts.append(retriever.format_for_prompt(assumption_stats, comparables))
        context_parts.append("</user_knowledge>")

        return "\n".join(context_parts)

    except Exception as e:
        logger.warning(f"Failed to retrieve user knowledge: {e}")
        return ""


def _needs_user_knowledge(message: str) -> bool:
    """
    Detect if message would benefit from user's historical knowledge.

    Triggers on:
    1. Questions about assumptions/values
    2. Comparison questions ("what did I use before")
    3. Validation questions ("is this reasonable")
    4. Document references ("based on the OM", "from the rent roll")
    """
    message_lower = message.lower()

    # Past experience triggers
    past_triggers = {
        'what did i use', 'what have i used', 'my previous',
        'last time', 'in the past', 'typically use',
        'usually use', 'normally use', 'my standard',
        'based on my', 'from my', 'my projects',
    }

    # Document reference triggers
    doc_triggers = {
        'from the om', 'in the om', 'based on the om',
        'from the rent roll', 'in the rent roll',
        'from the appraisal', 'in the appraisal',
        'from the document', 'uploaded document',
        'from the t12', 'in the t-12', 't12 shows',
        'from the financials', 'the proforma',
    }

    # Comparable triggers
    comp_triggers = {
        'comparable', 'comps', 'similar properties',
        'other deals', 'recent sales', 'what sold',
        'market comps', 'rental comps',
    }

    # Validation triggers (benefit from seeing what user did before)
    validation_triggers = {
        'is this reasonable', 'does this make sense',
        'am i missing', 'should i add',
        'typical for', 'normal for',
    }

    # Check all trigger groups
    if any(trigger in message_lower for trigger in past_triggers):
        return True
    if any(trigger in message_lower for trigger in doc_triggers):
        return True
    if any(trigger in message_lower for trigger in comp_triggers):
        return True
    if any(trigger in message_lower for trigger in validation_triggers):
        return True

    return False


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Model to use for responses
CLAUDE_MODEL = "claude-sonnet-4-20250514"
ANTHROPIC_TIMEOUT_SECONDS = 60

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
        "description": """List all documents uploaded to this project, prioritized by readiness for extraction.

Returns for each document:
- doc_id: ID to use with get_document_content
- doc_name, doc_type, extraction_status
- has_content: True if document has readable content
- recommended: True if extraction is complete and ready to read
- embedding_count: Number of text chunks available

Documents are sorted with recommended (completed extraction) documents first.
Duplicates by name are automatically removed, keeping the best version.

To extract data from documents:
1. Call this tool to see available documents
2. Pick a document with recommended=True or has_content=True
3. Use get_document_content with that doc_id to read the content
4. Parse the content and use update_rental_comps or update_operating_expenses to save data""",
        "input_schema": {
            "type": "object",
            "properties": {
                "status_filter": {
                    "type": "string",
                    "description": "Filter by extraction status: 'completed', 'pending', 'failed', or 'all' (default)"
                }
            },
            "required": []
        }
    },
    {
        "name": "get_document_content",
        "description": """Get the full text content from a document.
Use this to read OMs, rent rolls, reports, and other uploaded files.

Returns the document's text content which can include:
- Rental comparable data (property names, addresses, unit types, rents, square footage)
- Operating expense data (line items, amounts, categories)
- Property information (address, units, year built, amenities)
- Financial data (cap rates, prices, income, expenses)

The content comes from extraction or from document embeddings.
Parse the returned text to extract structured data, then use update_rental_comps or update_operating_expenses to save it.

IMPORTANT: Use the 'focus' parameter when extracting specific data types to ensure the relevant section is included even in large documents.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "doc_id": {
                    "type": "integer",
                    "description": "Document ID to retrieve content from (get from get_project_documents)"
                },
                "doc_type": {
                    "type": "string",
                    "description": "Document type hint (e.g., 'om', 'rent_roll', 't12') if doc_id is unknown"
                },
                "doc_name": {
                    "type": "string",
                    "description": "Document name hint (e.g., 'Vincent Village OM') if doc_id is unknown"
                },
                "max_length": {
                    "type": "integer",
                    "description": "Maximum characters to return (default 50000)"
                },
                "focus": {
                    "type": "string",
                    "enum": ["rental_comps", "operating_expenses"],
                    "description": "Focus on specific content type. Use 'rental_comps' when extracting comparable properties, 'operating_expenses' for T-12/expense data."
                }
            },
            "required": []
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
                            "per_unit": {
                                "type": "number",
                                "description": "Per-unit annual amount (if provided)"
                            },
                            "per_sf": {
                                "type": "number",
                                "description": "Per-SF annual amount (if provided)"
                            },
                            "unit_amount": {
                                "type": "number",
                                "description": "Alias for per_unit (if provided)"
                            },
                            "amount_per_sf": {
                                "type": "number",
                                "description": "Alias for per_sf (if provided)"
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
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Rental Comparables Tools
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "update_rental_comps",
        "description": """Add or update rental comparables for the project.
Use this to populate the Comparable Rentals section with nearby properties from OMs or market research.

Each comparable represents a competing property with its unit mix and asking rents.
The data will appear in the Comparable Rentals map and table on the Property tab.

Required fields for each comp:
- property_name: Name of the comparable property (e.g., "Charter Oaks")
- unit_type: Descriptive unit type (e.g., "1BR/1BA", "2BR/2BA", "Studio")
- bedrooms, bathrooms: Numeric bed/bath count
- avg_sqft: Average unit size in square feet
- asking_rent: Monthly asking rent in dollars

Optional fields:
- address: Street address for mapping
- latitude, longitude: Coordinates for map display
- distance_miles: Distance from subject property
- year_built: Year the property was built
- total_units: Total unit count in the property
- effective_rent: Effective rent after concessions
- notes: Additional notes (renovations, amenities, etc.)

Example usage:
"Add the six rental comps from the Lynn Villa OM to the project"
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "comps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "property_name": {
                                "type": "string",
                                "description": "Name of the comparable property"
                            },
                            "address": {
                                "type": "string",
                                "description": "Street address"
                            },
                            "latitude": {
                                "type": "number",
                                "description": "Latitude coordinate"
                            },
                            "longitude": {
                                "type": "number",
                                "description": "Longitude coordinate"
                            },
                            "distance_miles": {
                                "type": "number",
                                "description": "Distance from subject property in miles"
                            },
                            "year_built": {
                                "type": "integer",
                                "description": "Year the property was built"
                            },
                            "total_units": {
                                "type": "integer",
                                "description": "Total units in the property"
                            },
                            "unit_type": {
                                "type": "string",
                                "description": "Unit type descriptor (e.g., '1BR/1BA', 'Studio')"
                            },
                            "bedrooms": {
                                "type": "number",
                                "description": "Number of bedrooms"
                            },
                            "bathrooms": {
                                "type": "number",
                                "description": "Number of bathrooms"
                            },
                            "avg_sqft": {
                                "type": "integer",
                                "description": "Average square footage"
                            },
                            "asking_rent": {
                                "type": "number",
                                "description": "Monthly asking rent in dollars"
                            },
                            "effective_rent": {
                                "type": "number",
                                "description": "Effective rent after concessions"
                            },
                            "notes": {
                                "type": "string",
                                "description": "Notes about the property (renovations, amenities, etc.)"
                            }
                        },
                        "required": ["property_name", "unit_type", "bedrooms", "bathrooms", "avg_sqft", "asking_rent"]
                    },
                    "description": "List of rental comparable properties to add/update"
                },
                "source_document": {
                    "type": "string",
                    "description": "Optional document name where comps were extracted from (for activity logging)"
                }
            },
            "required": ["comps"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Project Contacts Tools
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "update_project_contacts",
        "description": """Add or update contacts associated with the project.
Use this to populate broker info, buyer/seller contacts, lenders, attorneys, etc.

Each contact has a role:
- listing_broker: Listing broker/agent representing seller
- buyer_broker: Buyer's broker/agent
- mortgage_broker: Mortgage/debt broker
- seller: Property seller/owner
- buyer: Property buyer
- lender: Lending institution
- title: Title company
- escrow: Escrow company
- attorney: Legal counsel
- property_manager: Property management company
- other: Other contact type

Required fields:
- contact_role: One of the roles above
- contact_name: Full name of the person

Optional but recommended:
- contact_title: Job title (e.g., "Senior Managing Director")
- contact_email: Email address
- contact_phone: Phone number
- company_name: Company/firm name
- license_number: Professional license (e.g., "CA DRE #01308753")
- is_primary: True if this is the primary contact for this role

Example: Extract broker contacts from an OM and save them to the project.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "contacts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "contact_role": {
                                "type": "string",
                                "enum": ["listing_broker", "buyer_broker", "mortgage_broker", "seller", "buyer", "lender", "title", "escrow", "attorney", "property_manager", "other"],
                                "description": "Role of the contact on this project"
                            },
                            "contact_name": {
                                "type": "string",
                                "description": "Full name of the contact person"
                            },
                            "contact_title": {
                                "type": "string",
                                "description": "Job title (e.g., 'Senior Managing Director')"
                            },
                            "contact_email": {
                                "type": "string",
                                "description": "Email address"
                            },
                            "contact_phone": {
                                "type": "string",
                                "description": "Phone number"
                            },
                            "company_name": {
                                "type": "string",
                                "description": "Company or firm name"
                            },
                            "license_number": {
                                "type": "string",
                                "description": "Professional license number (e.g., 'CA DRE #01308753')"
                            },
                            "is_primary": {
                                "type": "boolean",
                                "description": "True if this is the primary contact for this role"
                            },
                            "address_line1": {
                                "type": "string",
                                "description": "Street address line 1"
                            },
                            "city": {
                                "type": "string",
                                "description": "City"
                            },
                            "state": {
                                "type": "string",
                                "description": "State"
                            },
                            "zip": {
                                "type": "string",
                                "description": "ZIP code"
                            },
                            "notes": {
                                "type": "string",
                                "description": "Additional notes about this contact"
                            }
                        },
                        "required": ["contact_role", "contact_name"]
                    },
                    "description": "List of contacts to add/update for the project"
                },
                "source_document": {
                    "type": "string",
                    "description": "Document name where contacts were extracted from (for audit trail)"
                }
            },
            "required": ["contacts"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Financial Assumptions Tools - Acquisition
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_acquisition",
        "description": """Get property acquisition assumptions for the project.

Returns acquisition data including:
- purchase_price, price_per_unit, price_per_sf
- acquisition_date, hold_period_years, exit_cap_rate, sale_date
- closing_costs_pct, due_diligence_days, earnest_money
- sale_costs_pct, broker_commission_pct
- legal_fees, financing_fees, third_party_reports
- depreciation_basis, land_pct, improvement_pct
- is_1031_exchange, grm

Returns {exists: false} if no acquisition record exists for this project.""",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "update_acquisition",
        "description": """Update property acquisition assumptions for the project.
Creates a new record if none exists (upsert pattern).

Available fields:
- purchase_price: Total purchase price in dollars
- price_per_unit: Price per unit (calculated or entered)
- price_per_sf: Price per square foot
- acquisition_date: Date of acquisition (YYYY-MM-DD)
- hold_period_years: Expected hold period in years
- exit_cap_rate: Exit cap rate as decimal (e.g., 0.05 for 5%)
- sale_date: Expected sale date (YYYY-MM-DD)
- closing_costs_pct: Closing costs as decimal (e.g., 0.02 for 2%)
- due_diligence_days: Due diligence period in days
- earnest_money: Earnest money deposit in dollars
- sale_costs_pct: Disposition costs as decimal
- broker_commission_pct: Broker commission as decimal
- legal_fees, financing_fees, third_party_reports: Costs in dollars
- depreciation_basis: Depreciable basis in dollars
- land_pct: Land allocation percentage as decimal
- improvement_pct: Improvement allocation percentage as decimal
- is_1031_exchange: Boolean for 1031 exchange status
- grm: Gross rent multiplier""",
        "input_schema": {
            "type": "object",
            "properties": {
                "purchase_price": {"type": "number", "description": "Total purchase price in dollars"},
                "price_per_unit": {"type": "number", "description": "Price per unit"},
                "price_per_sf": {"type": "number", "description": "Price per square foot"},
                "acquisition_date": {"type": "string", "description": "Acquisition date (YYYY-MM-DD)"},
                "hold_period_years": {"type": "number", "description": "Hold period in years"},
                "exit_cap_rate": {"type": "number", "description": "Exit cap rate as decimal (0.05 = 5%)"},
                "sale_date": {"type": "string", "description": "Expected sale date (YYYY-MM-DD)"},
                "closing_costs_pct": {"type": "number", "description": "Closing costs as decimal"},
                "due_diligence_days": {"type": "integer", "description": "Due diligence period in days"},
                "earnest_money": {"type": "number", "description": "Earnest money deposit"},
                "sale_costs_pct": {"type": "number", "description": "Sale/disposition costs as decimal"},
                "broker_commission_pct": {"type": "number", "description": "Broker commission as decimal"},
                "legal_fees": {"type": "number", "description": "Legal fees in dollars"},
                "financing_fees": {"type": "number", "description": "Financing fees in dollars"},
                "third_party_reports": {"type": "number", "description": "Third party reports cost"},
                "depreciation_basis": {"type": "number", "description": "Depreciable basis"},
                "land_pct": {"type": "number", "description": "Land allocation as decimal"},
                "improvement_pct": {"type": "number", "description": "Improvement allocation as decimal"},
                "is_1031_exchange": {"type": "boolean", "description": "1031 exchange status"},
                "grm": {"type": "number", "description": "Gross rent multiplier"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Financial Assumptions Tools - Revenue Rent
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_revenue_rent",
        "description": """Get rent revenue assumptions for the project.

Returns rent data including:
- current_rent_psf, in_place_rent_psf, market_rent_psf
- occupancy_pct, stabilized_occupancy_pct
- annual_rent_growth_pct, rent_growth_years_1_3_pct, rent_growth_stabilized_pct
- rent_loss_to_lease_pct
- lease_up_months, free_rent_months
- ti_allowance_per_unit, renewal_probability_pct

Returns {exists: false} if no rent revenue record exists for this project.""",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "update_revenue_rent",
        "description": """Update rent revenue assumptions for the project.
Creates a new record if none exists (upsert pattern).

Available fields:
- current_rent_psf: Current rent per square foot (REQUIRED for new records)
- in_place_rent_psf: In-place rent PSF
- market_rent_psf: Market rent PSF
- occupancy_pct: Current occupancy as decimal (REQUIRED, e.g., 0.95 for 95%)
- stabilized_occupancy_pct: Stabilized occupancy target
- annual_rent_growth_pct: Annual rent growth as decimal (REQUIRED, e.g., 0.03 for 3%)
- rent_growth_years_1_3_pct: Rent growth years 1-3
- rent_growth_stabilized_pct: Stabilized rent growth rate
- rent_loss_to_lease_pct: Loss to lease as decimal
- lease_up_months: Lease-up period in months
- free_rent_months: Free rent concession in months
- ti_allowance_per_unit: Tenant improvement allowance per unit
- renewal_probability_pct: Renewal probability as decimal""",
        "input_schema": {
            "type": "object",
            "properties": {
                "current_rent_psf": {"type": "number", "description": "Current rent per square foot"},
                "in_place_rent_psf": {"type": "number", "description": "In-place rent PSF"},
                "market_rent_psf": {"type": "number", "description": "Market rent PSF"},
                "occupancy_pct": {"type": "number", "description": "Current occupancy as decimal (0.95 = 95%)"},
                "stabilized_occupancy_pct": {"type": "number", "description": "Stabilized occupancy target"},
                "annual_rent_growth_pct": {"type": "number", "description": "Annual rent growth as decimal"},
                "rent_growth_years_1_3_pct": {"type": "number", "description": "Rent growth years 1-3"},
                "rent_growth_stabilized_pct": {"type": "number", "description": "Stabilized rent growth"},
                "rent_loss_to_lease_pct": {"type": "number", "description": "Loss to lease as decimal"},
                "lease_up_months": {"type": "integer", "description": "Lease-up period in months"},
                "free_rent_months": {"type": "number", "description": "Free rent months"},
                "ti_allowance_per_unit": {"type": "number", "description": "TI allowance per unit"},
                "renewal_probability_pct": {"type": "number", "description": "Renewal probability as decimal"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Financial Assumptions Tools - Revenue Other
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_revenue_other",
        "description": """Get other (non-rent) revenue assumptions for the project.

Returns other income data including:
- other_income_per_unit_monthly, income_category
- parking_income_per_space, parking_spaces, reserved_parking_premium
- pet_fee_per_pet, pet_penetration_pct
- laundry_income_per_unit, storage_income_per_unit
- application_fees_annual, late_fees_annual
- utility_reimbursements_annual
- furnished_unit_premium_pct, short_term_rental_income
- ancillary_services_income, vending_income
- package_locker_fees, ev_charging_fees, other_miscellaneous

Returns {exists: false} if no other revenue record exists for this project.""",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "update_revenue_other",
        "description": """Update other (non-rent) revenue assumptions for the project.
Creates a new record if none exists (upsert pattern).

Available fields:
- other_income_per_unit_monthly: Total other income per unit per month
- income_category: Category label for the income
- parking_income_per_space: Monthly income per parking space
- parking_spaces: Number of parking spaces
- reserved_parking_premium: Premium for reserved spaces
- pet_fee_per_pet: Monthly pet fee
- pet_penetration_pct: Pet ownership rate as decimal
- laundry_income_per_unit: Monthly laundry income per unit
- storage_income_per_unit: Monthly storage income per unit
- application_fees_annual: Annual application fee income
- late_fees_annual: Annual late fee income
- utility_reimbursements_annual: Annual utility reimbursements (RUBS)
- furnished_unit_premium_pct: Furnished unit rent premium
- short_term_rental_income: Short-term rental income
- ancillary_services_income: Ancillary services income
- vending_income: Vending machine income
- package_locker_fees: Package locker fees
- ev_charging_fees: EV charging income
- other_miscellaneous: Other miscellaneous income""",
        "input_schema": {
            "type": "object",
            "properties": {
                "other_income_per_unit_monthly": {"type": "number", "description": "Other income per unit monthly"},
                "income_category": {"type": "string", "description": "Income category label"},
                "parking_income_per_space": {"type": "number", "description": "Parking income per space"},
                "parking_spaces": {"type": "integer", "description": "Number of parking spaces"},
                "reserved_parking_premium": {"type": "number", "description": "Reserved parking premium"},
                "pet_fee_per_pet": {"type": "number", "description": "Pet fee per pet"},
                "pet_penetration_pct": {"type": "number", "description": "Pet penetration as decimal"},
                "laundry_income_per_unit": {"type": "number", "description": "Laundry income per unit"},
                "storage_income_per_unit": {"type": "number", "description": "Storage income per unit"},
                "application_fees_annual": {"type": "number", "description": "Annual application fees"},
                "late_fees_annual": {"type": "number", "description": "Annual late fees"},
                "utility_reimbursements_annual": {"type": "number", "description": "Annual utility reimbursements"},
                "furnished_unit_premium_pct": {"type": "number", "description": "Furnished unit premium"},
                "short_term_rental_income": {"type": "number", "description": "Short-term rental income"},
                "ancillary_services_income": {"type": "number", "description": "Ancillary services income"},
                "vending_income": {"type": "number", "description": "Vending income"},
                "package_locker_fees": {"type": "number", "description": "Package locker fees"},
                "ev_charging_fees": {"type": "number", "description": "EV charging fees"},
                "other_miscellaneous": {"type": "number", "description": "Other miscellaneous income"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Financial Assumptions Tools - Vacancy
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_vacancy_assumptions",
        "description": """Get vacancy and loss assumptions for the project.

Returns vacancy data including:
- vacancy_loss_pct, physical_vacancy_pct, economic_vacancy_pct
- collection_loss_pct, bad_debt_pct
- concession_cost_pct, turnover_vacancy_days
- market_vacancy_rate_pct, submarket_vacancy_rate_pct
- competitive_set_vacancy_pct
- seasonal_vacancy_adjustment (JSON), lease_up_absorption_curve (JSON)

Returns {exists: false} if no vacancy record exists for this project.""",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "update_vacancy_assumptions",
        "description": """Update vacancy and loss assumptions for the project.
Creates a new record if none exists (upsert pattern).

Available fields:
- vacancy_loss_pct: Total vacancy loss as decimal (REQUIRED, e.g., 0.05 for 5%)
- collection_loss_pct: Collection loss as decimal (REQUIRED, e.g., 0.01 for 1%)
- physical_vacancy_pct: Physical vacancy rate
- economic_vacancy_pct: Economic vacancy rate
- bad_debt_pct: Bad debt allowance
- concession_cost_pct: Concession costs as decimal
- turnover_vacancy_days: Days vacant during turnover
- market_vacancy_rate_pct: Market vacancy rate
- submarket_vacancy_rate_pct: Submarket vacancy rate
- competitive_set_vacancy_pct: Competitive set vacancy""",
        "input_schema": {
            "type": "object",
            "properties": {
                "vacancy_loss_pct": {"type": "number", "description": "Vacancy loss as decimal (0.05 = 5%)"},
                "collection_loss_pct": {"type": "number", "description": "Collection loss as decimal"},
                "physical_vacancy_pct": {"type": "number", "description": "Physical vacancy rate"},
                "economic_vacancy_pct": {"type": "number", "description": "Economic vacancy rate"},
                "bad_debt_pct": {"type": "number", "description": "Bad debt allowance"},
                "concession_cost_pct": {"type": "number", "description": "Concession costs as decimal"},
                "turnover_vacancy_days": {"type": "integer", "description": "Turnover vacancy days"},
                "market_vacancy_rate_pct": {"type": "number", "description": "Market vacancy rate"},
                "submarket_vacancy_rate_pct": {"type": "number", "description": "Submarket vacancy rate"},
                "competitive_set_vacancy_pct": {"type": "number", "description": "Competitive set vacancy"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Rent Roll Tools - Unit Types
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_unit_types",
        "description": """Get unit type mix for a multifamily property.

Returns an array of unit types with:
- unit_type_code: Type identifier (e.g., '1BR', '2BR-A', 'Studio')
- unit_type_name: Display name
- bedrooms, bathrooms: Bed/bath count
- avg_square_feet: Average unit size
- market_rent, current_rent_avg: Rent figures
- total_units, unit_count: Count of units
- concessions_avg: Average concessions
- notes, other_features: Additional info

Returns {count: 0, records: []} if no unit types exist.""",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "update_unit_types",
        "description": """Add or update unit types for a multifamily property.
Upserts by project_id + unit_type_code (creates if not exists, updates if exists).

Each record in the array should have:
- unit_type_code: REQUIRED - Type identifier (e.g., '1BR', '2BR', 'Studio')
- unit_type_name: Display name for the type
- bedrooms: Number of bedrooms (0 for studio)
- bathrooms: Number of bathrooms
- avg_square_feet: Average square footage
- market_rent: Market rent amount
- current_rent_avg: Current average rent
- total_units or unit_count: Number of units of this type
- concessions_avg: Average concession amount
- notes: Additional notes

Example: Extract unit mix from an OM and populate the unit types.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "records": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "unit_type_code": {"type": "string", "description": "Type code (e.g., '1BR', '2BR-A')"},
                            "unit_type_name": {"type": "string", "description": "Display name"},
                            "bedrooms": {"type": "number", "description": "Number of bedrooms"},
                            "bathrooms": {"type": "number", "description": "Number of bathrooms"},
                            "avg_square_feet": {"type": "integer", "description": "Average square feet"},
                            "market_rent": {"type": "number", "description": "Market rent"},
                            "current_rent_avg": {"type": "number", "description": "Current average rent"},
                            "total_units": {"type": "integer", "description": "Total units of this type"},
                            "unit_count": {"type": "integer", "description": "Unit count (alias for total_units)"},
                            "concessions_avg": {"type": "number", "description": "Average concessions"},
                            "notes": {"type": "string", "description": "Notes"},
                            "other_features": {"type": "string", "description": "Other features"}
                        },
                        "required": ["unit_type_code"]
                    },
                    "description": "Array of unit types to add/update"
                },
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": ["records"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Rent Roll Tools - Individual Units
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_units",
        "description": """Get individual unit details for a multifamily property.

Returns an array of units with:
- unit_number: Unit identifier (e.g., '101', 'A-101')
- unit_type: Unit type code
- building_name: Building identifier
- floor_number: Floor level
- bedrooms, bathrooms, square_feet: Unit specs
- market_rent, current_rent: Rent figures
- occupancy_status: 'occupied', 'vacant', 'down'
- lease_start_date, lease_end_date: Current lease dates
- renovation_status, renovation_cost, renovation_date: Renovation info
- is_section8, is_manager: Special unit flags

Returns {count: 0, records: []} if no units exist.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "building_name": {"type": "string", "description": "Filter by building name"},
                "unit_type": {"type": "string", "description": "Filter by unit type"},
                "occupancy_status": {"type": "string", "description": "Filter by status (occupied/vacant/down)"},
                "limit": {"type": "integer", "description": "Max records to return (default 500)"}
            },
            "required": []
        }
    },
    {
        "name": "update_units",
        "description": """Add or update individual units for a multifamily property.
Upserts by project_id + unit_number (creates if not exists, updates if exists).

Each record in the array should have:
- unit_number: REQUIRED - Unit identifier (e.g., '101', 'A-101')
- unit_type: REQUIRED for new units - Unit type code
- square_feet: REQUIRED for new units - Unit size
- building_name: Building identifier
- floor_number: Floor level
- bedrooms, bathrooms: Unit specs
- market_rent, current_rent: Rent amounts
- occupancy_status: 'occupied', 'vacant', 'down'
- lease_start_date, lease_end_date: Lease dates (YYYY-MM-DD)
- renovation_status: 'none', 'planned', 'in_progress', 'complete'
- renovation_cost, renovation_date: Renovation details
- is_section8, is_manager: Special unit flags
- has_balcony, has_patio, view_type: Amenities

Example: Import unit-level rent roll from a document.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "records": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "unit_number": {"type": "string", "description": "Unit number (e.g., '101')"},
                            "unit_type": {"type": "string", "description": "Unit type code"},
                            "building_name": {"type": "string", "description": "Building name"},
                            "floor_number": {"type": "integer", "description": "Floor number"},
                            "bedrooms": {"type": "number", "description": "Bedrooms"},
                            "bathrooms": {"type": "number", "description": "Bathrooms"},
                            "square_feet": {"type": "integer", "description": "Square feet"},
                            "market_rent": {"type": "number", "description": "Market rent"},
                            "current_rent": {"type": "number", "description": "Current rent"},
                            "occupancy_status": {"type": "string", "description": "occupied/vacant/down"},
                            "lease_start_date": {"type": "string", "description": "Lease start (YYYY-MM-DD)"},
                            "lease_end_date": {"type": "string", "description": "Lease end (YYYY-MM-DD)"},
                            "renovation_status": {"type": "string", "description": "none/planned/in_progress/complete"},
                            "renovation_cost": {"type": "number", "description": "Renovation cost"},
                            "renovation_date": {"type": "string", "description": "Renovation date"},
                            "is_section8": {"type": "boolean", "description": "Section 8 unit"},
                            "is_manager": {"type": "boolean", "description": "Manager unit"},
                            "has_balcony": {"type": "boolean", "description": "Has balcony"},
                            "has_patio": {"type": "boolean", "description": "Has patio"},
                            "view_type": {"type": "string", "description": "View type"}
                        },
                        "required": ["unit_number"]
                    },
                    "description": "Array of units to add/update"
                },
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": ["records"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Rent Roll Tools - Leases
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_leases",
        "description": """Get lease records for a property.

Returns an array of leases with:
- lease_id: Unique identifier
- tenant_name: Tenant/resident name
- suite_number: Unit/suite identifier
- floor_number: Floor level
- lease_status: 'active', 'expired', 'pending', 'terminated'
- lease_type: 'standard', 'month_to_month', 'corporate', etc.
- lease_commencement_date, lease_expiration_date: Lease dates
- lease_term_months: Term length
- leased_sf: Leased square footage
- security_deposit_amount: Deposit held
- renewal_options: Option details
- notes: Additional information

Returns {count: 0, records: []} if no leases exist.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "lease_status": {"type": "string", "description": "Filter by status (active/expired/pending)"},
                "limit": {"type": "integer", "description": "Max records to return (default 500)"}
            },
            "required": []
        }
    },
    {
        "name": "update_leases",
        "description": """Add or update lease records for a property.
Upserts by lease_id if provided, otherwise by project_id + suite_number + lease_commencement_date.

Each record in the array should have:
- tenant_name: REQUIRED - Tenant/resident name
- lease_commencement_date: REQUIRED - Lease start date (YYYY-MM-DD)
- lease_expiration_date: REQUIRED - Lease end date (YYYY-MM-DD)
- lease_term_months: REQUIRED - Term in months
- leased_sf: REQUIRED - Leased square footage
- suite_number: Unit/suite number
- floor_number: Floor level
- lease_status: 'active', 'expired', 'pending', 'terminated'
- lease_type: 'standard', 'month_to_month', 'corporate', etc.
- tenant_contact, tenant_email, tenant_phone: Contact info
- security_deposit_amount: Deposit amount
- renewal options: number_of_renewal_options, renewal_option_term_months
- notes: Additional notes

Example: Import lease abstract data from a document.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "records": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "lease_id": {"type": "integer", "description": "Existing lease ID (for updates)"},
                            "tenant_name": {"type": "string", "description": "Tenant name"},
                            "suite_number": {"type": "string", "description": "Unit/suite number"},
                            "floor_number": {"type": "integer", "description": "Floor number"},
                            "lease_status": {"type": "string", "description": "active/expired/pending/terminated"},
                            "lease_type": {"type": "string", "description": "standard/month_to_month/corporate"},
                            "lease_commencement_date": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                            "lease_expiration_date": {"type": "string", "description": "End date (YYYY-MM-DD)"},
                            "lease_term_months": {"type": "integer", "description": "Term in months"},
                            "leased_sf": {"type": "number", "description": "Leased square feet"},
                            "tenant_contact": {"type": "string", "description": "Contact name"},
                            "tenant_email": {"type": "string", "description": "Email"},
                            "tenant_phone": {"type": "string", "description": "Phone"},
                            "security_deposit_amount": {"type": "number", "description": "Security deposit"},
                            "number_of_renewal_options": {"type": "integer", "description": "Number of renewal options"},
                            "renewal_option_term_months": {"type": "integer", "description": "Renewal term months"},
                            "notes": {"type": "string", "description": "Notes"}
                        },
                        "required": ["tenant_name", "lease_commencement_date", "lease_expiration_date", "lease_term_months", "leased_sf"]
                    },
                    "description": "Array of leases to add/update"
                },
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": ["records"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Comparables Tools - Sales Comparables
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_sales_comparables",
        "description": """Get sales comparables for the project.

Returns an array of sales comps with:
- comparable_id: Unique identifier
- comp_number: Comp number/order
- property_name, address, city, state, zip: Location info
- sale_date, sale_price: Transaction details
- price_per_unit, price_per_sf: Pricing metrics
- cap_rate, grm: Return metrics
- year_built, units, building_sf: Property details
- distance_from_subject: Distance from subject property
- unit_mix: JSON object with unit mix breakdown
- notes: Additional information
- latitude, longitude: Coordinates

Returns {count: 0, records: []} if no sales comparables exist.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max records to return (default 100)"}
            },
            "required": []
        }
    },
    {
        "name": "update_sales_comparable",
        "description": """Add or update a sales comparable.
Upserts by comparable_id if provided, otherwise by project_id + property_name.

Fields:
- property_name: Property name (REQUIRED for new comps)
- comp_number: Comp order/number
- address, city, state, zip: Location
- sale_date: Sale date (YYYY-MM-DD)
- sale_price: Sale price in dollars
- price_per_unit, price_per_sf: Per-unit and per-SF pricing
- cap_rate: Cap rate (string, e.g., "5.5%")
- grm: Gross rent multiplier
- year_built: Year built
- units, unit_count: Number of units
- building_sf: Building square footage
- distance_from_subject: Distance from subject
- unit_mix: JSON object with unit mix details
- latitude, longitude: Coordinates
- notes: Additional notes

Example: Extract sales comps from an appraisal or OM.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "comparable_id": {"type": "integer", "description": "Existing comp ID (for updates)"},
                "property_name": {"type": "string", "description": "Property name"},
                "comp_number": {"type": "integer", "description": "Comp number"},
                "address": {"type": "string", "description": "Street address"},
                "city": {"type": "string", "description": "City"},
                "state": {"type": "string", "description": "State"},
                "zip": {"type": "string", "description": "ZIP code"},
                "sale_date": {"type": "string", "description": "Sale date (YYYY-MM-DD)"},
                "sale_price": {"type": "number", "description": "Sale price"},
                "price_per_unit": {"type": "number", "description": "Price per unit"},
                "price_per_sf": {"type": "number", "description": "Price per SF"},
                "cap_rate": {"type": "string", "description": "Cap rate (e.g., '5.5%')"},
                "grm": {"type": "number", "description": "Gross rent multiplier"},
                "year_built": {"type": "integer", "description": "Year built"},
                "units": {"type": "number", "description": "Number of units"},
                "unit_count": {"type": "integer", "description": "Unit count"},
                "building_sf": {"type": "string", "description": "Building SF"},
                "distance_from_subject": {"type": "string", "description": "Distance"},
                "unit_mix": {"type": "object", "description": "Unit mix breakdown"},
                "latitude": {"type": "number", "description": "Latitude"},
                "longitude": {"type": "number", "description": "Longitude"},
                "notes": {"type": "string", "description": "Notes"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_sales_comparable",
        "description": """Delete a sales comparable and its adjustments.

Requires comparable_id. This will also delete any adjustments associated with the comparable.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "comparable_id": {"type": "integer", "description": "Comparable ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["comparable_id"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Comparables Tools - Sales Comp Adjustments
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_sales_comp_adjustments",
        "description": """Get adjustments for a specific sales comparable.

Returns an array of adjustments with:
- adjustment_id: Unique identifier
- adjustment_type: Type of adjustment (e.g., 'Location', 'Age', 'Size')
- adjustment_pct: AI-suggested percentage adjustment
- adjustment_amount: Dollar amount adjustment
- justification: Explanation for the adjustment
- user_adjustment_pct: User-overridden percentage
- ai_accepted: Whether user accepted AI suggestion
- user_notes: User's notes
- last_modified_by: Who last modified

Requires comparable_id.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "comparable_id": {"type": "integer", "description": "Sales comparable ID"}
            },
            "required": ["comparable_id"]
        }
    },
    {
        "name": "update_sales_comp_adjustment",
        "description": """Add or update an adjustment for a sales comparable.
Upserts by comparable_id + adjustment_type.

Fields:
- comparable_id: REQUIRED - The sales comparable to adjust
- adjustment_type: REQUIRED - Type of adjustment (e.g., 'Location', 'Age', 'Size', 'Condition', 'Market Conditions')
- adjustment_pct: Percentage adjustment (e.g., -0.05 for -5%)
- adjustment_amount: Dollar amount adjustment
- justification: Explanation for the adjustment
- user_adjustment_pct: User override percentage
- ai_accepted: Whether user accepted AI suggestion (boolean)
- user_notes: User's notes

Example: Apply market-derived adjustments to sales comps.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "comparable_id": {"type": "integer", "description": "Sales comparable ID"},
                "adjustment_type": {"type": "string", "description": "Type of adjustment"},
                "adjustment_pct": {"type": "number", "description": "Percentage adjustment"},
                "adjustment_amount": {"type": "number", "description": "Dollar adjustment"},
                "justification": {"type": "string", "description": "Justification for adjustment"},
                "user_adjustment_pct": {"type": "number", "description": "User override percentage"},
                "ai_accepted": {"type": "boolean", "description": "User accepted AI suggestion"},
                "user_notes": {"type": "string", "description": "User notes"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": ["comparable_id", "adjustment_type"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Comparables Tools - Rental Comparables
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "get_rental_comparables",
        "description": """Get rental comparables for the project.

Returns an array of rental comps with:
- comparable_id: Unique identifier
- property_name, address: Location info
- distance_miles: Distance from subject
- year_built, total_units: Property details
- unit_type: Unit type (e.g., '1BR/1BA')
- bedrooms, bathrooms, avg_sqft: Unit specs
- asking_rent, effective_rent: Rent figures
- concessions: Concession details
- amenities: Property amenities
- notes, data_source, as_of_date: Metadata
- is_active: Whether comp is active

Can filter by unit_type and active_only.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "unit_type": {"type": "string", "description": "Filter by unit type"},
                "active_only": {"type": "boolean", "description": "Only active comps (default true)"},
                "limit": {"type": "integer", "description": "Max records to return (default 100)"}
            },
            "required": []
        }
    },
    {
        "name": "update_rental_comparable",
        "description": """Add or update a rental comparable.
Upserts by comparable_id, or by property_name + unit_type.

Fields:
- property_name: REQUIRED for new comps - Property name
- address: Street address
- distance_miles: Distance from subject in miles
- year_built: Year built
- total_units: Total unit count
- unit_type: Unit type descriptor (e.g., '1BR/1BA', '2BR/2BA')
- bedrooms, bathrooms: Bed/bath count
- avg_sqft: Average square footage
- asking_rent: Monthly asking rent
- effective_rent: Monthly effective rent (after concessions)
- concessions: Concession description
- amenities: Property amenities
- notes: Additional notes
- data_source: Source of data (e.g., 'CoStar', 'Site Visit')
- as_of_date: Date of data (YYYY-MM-DD)
- is_active: Whether comp should be included in analysis

Example: Extract rental comps from market study or OM.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "comparable_id": {"type": "integer", "description": "Existing comp ID (for updates)"},
                "property_name": {"type": "string", "description": "Property name"},
                "address": {"type": "string", "description": "Street address"},
                "distance_miles": {"type": "number", "description": "Distance in miles"},
                "year_built": {"type": "integer", "description": "Year built"},
                "total_units": {"type": "integer", "description": "Total units"},
                "unit_type": {"type": "string", "description": "Unit type (e.g., '1BR/1BA')"},
                "bedrooms": {"type": "number", "description": "Bedrooms"},
                "bathrooms": {"type": "number", "description": "Bathrooms"},
                "avg_sqft": {"type": "integer", "description": "Average square feet"},
                "asking_rent": {"type": "number", "description": "Monthly asking rent"},
                "effective_rent": {"type": "number", "description": "Monthly effective rent"},
                "concessions": {"type": "string", "description": "Concession details"},
                "amenities": {"type": "string", "description": "Property amenities"},
                "notes": {"type": "string", "description": "Notes"},
                "data_source": {"type": "string", "description": "Data source"},
                "as_of_date": {"type": "string", "description": "Data date (YYYY-MM-DD)"},
                "is_active": {"type": "boolean", "description": "Include in analysis"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_rental_comparable",
        "description": """Delete a rental comparable.

Requires comparable_id.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "comparable_id": {"type": "integer", "description": "Comparable ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["comparable_id"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────────
    # Capital Stack Tools
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "name": "get_debt_facilities",
        "description": """Retrieve debt facilities for a project.

Returns all debt facilities including:
- Basic info: facility_name, facility_type, lender_name
- Amounts: commitment_amount, loan_amount
- Rates: interest_rate, interest_rate_pct, rate_type
- Terms: loan_term_years, amortization_years, maturity_date
- Metrics: ltv_pct, dscr
- Covenants and reserve requirements (JSONB)

Optional: Pass facility_id to get a single facility.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "facility_id": {"type": "integer", "description": "Optional facility ID for single record"}
            },
            "required": []
        }
    },
    {
        "name": "update_debt_facility",
        "description": """Create or update a debt facility (MUTATION).

For updates, pass facility_id. For new facilities, omit facility_id.

CORE FIELDS:
- facility_name: REQUIRED - Descriptive name
- facility_type: CONSTRUCTION, PERMANENT, BRIDGE, MEZZANINE (uppercase)
- lender_name: Lending institution | is_construction_loan: Construction loan flag

LOAN AMOUNT & TERMS:
- commitment_amount: Total commitment | loan_amount: Actual loan
- loan_term_years: Term in years | amortization_years: Amort period
- maturity_date: Maturity (YYYY-MM-DD) | commitment_date: Commitment date
- ltv_pct: LTV % | dscr: Debt service coverage ratio

INTEREST RATE:
- interest_rate / interest_rate_pct: Rate (decimal or %)
- rate_type: fixed, floating, hybrid | index_name: SOFR, Prime, etc.
- spread_over_index_bps: Spread in basis points
- rate_floor_pct, rate_cap_pct: Rate collar | rate_reset_frequency: Reset freq

FEES:
- origination_fee_pct: Origination fee | commitment_fee_pct: Commitment/unused fee
- extension_fee_bps: Extension fee basis points | extension_fee_amount: Extension fee $
- exit_fee_pct: Exit/prepayment fee | prepayment_penalty_years: Penalty period

DRAWS & PAYMENTS:
- draw_trigger_type: percent_complete, cost_certification, milestone
- interest_calculation: SIMPLE, COMPOUNDED | payment_frequency: MONTHLY, QUARTERLY
- interest_payment_method: paid_current, accrued, reserved
- drawn_to_date: Amount drawn | commitment_balance: Remaining commitment
- monthly_payment: Monthly P&I | annual_debt_service: Annual debt service

COVENANTS:
- loan_covenant_dscr_min: Minimum DSCR | loan_covenant_ltv_max: Maximum LTV
- loan_covenant_occupancy_min: Minimum occupancy | covenant_test_frequency: Quarterly/etc
- covenants: JSONB object with detailed covenants

RESERVES:
- reserve_requirements: JSONB object | replacement_reserve_per_unit: Per-unit reserve
- tax_insurance_escrow_months: T&I escrow | initial_reserve_months: Initial reserve

GUARANTY:
- guarantee_type: Full recourse, limited, non-recourse
- guarantor_name: Guarantor name | recourse_carveout_provisions: Carveout details

EXTENSIONS:
- extension_options: Number of extension options | extension_option_years: Extension term

PROFIT PARTICIPATION:
- can_participate_in_profits: Has participation | profit_participation_tier: Tier #
- profit_participation_pct: Participation %

SCOPE:
- applies_to_finance_structures: Array of structure IDs
- applies_to_containers: Array of container IDs

Example: Extract loan terms from term sheet or commitment letter.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "facility_id": {"type": "integer", "description": "Existing facility ID (for updates)"},
                "facility_name": {"type": "string", "description": "Facility name"},
                "facility_type": {"type": "string", "description": "CONSTRUCTION, PERMANENT, BRIDGE, MEZZANINE (uppercase)"},
                "lender_name": {"type": "string", "description": "Lender name"},
                "is_construction_loan": {"type": "boolean", "description": "Is construction loan"},
                "commitment_amount": {"type": "number", "description": "Total commitment"},
                "loan_amount": {"type": "number", "description": "Loan amount"},
                "loan_term_years": {"type": "number", "description": "Loan term in years"},
                "amortization_years": {"type": "number", "description": "Amortization period"},
                "maturity_date": {"type": "string", "description": "Maturity date (YYYY-MM-DD)"},
                "commitment_date": {"type": "string", "description": "Commitment date (YYYY-MM-DD)"},
                "ltv_pct": {"type": "number", "description": "LTV percentage"},
                "dscr": {"type": "number", "description": "DSCR ratio"},
                "interest_rate": {"type": "number", "description": "Interest rate (decimal)"},
                "interest_rate_pct": {"type": "number", "description": "Interest rate (percentage)"},
                "rate_type": {"type": "string", "description": "fixed, floating, hybrid"},
                "index_name": {"type": "string", "description": "Index name (SOFR, Prime, etc.)"},
                "spread_over_index_bps": {"type": "integer", "description": "Spread over index in basis points"},
                "rate_floor_pct": {"type": "number", "description": "Interest rate floor %"},
                "rate_cap_pct": {"type": "number", "description": "Interest rate cap %"},
                "rate_reset_frequency": {"type": "string", "description": "Rate reset frequency"},
                "origination_fee_pct": {"type": "number", "description": "Origination fee %"},
                "commitment_fee_pct": {"type": "number", "description": "Commitment/unused fee %"},
                "unused_fee_pct": {"type": "number", "description": "Unused line fee %"},
                "extension_fee_bps": {"type": "integer", "description": "Extension fee basis points"},
                "extension_fee_amount": {"type": "number", "description": "Extension fee amount"},
                "exit_fee_pct": {"type": "number", "description": "Exit/prepayment fee %"},
                "prepayment_penalty_years": {"type": "integer", "description": "Prepayment penalty period (years)"},
                "draw_trigger_type": {"type": "string", "description": "percent_complete, cost_certification, milestone"},
                "interest_calculation": {"type": "string", "description": "SIMPLE, COMPOUNDED"},
                "payment_frequency": {"type": "string", "description": "MONTHLY, QUARTERLY, ANNUAL"},
                "interest_payment_method": {"type": "string", "description": "paid_current, accrued, reserved"},
                "drawn_to_date": {"type": "number", "description": "Amount drawn to date"},
                "commitment_balance": {"type": "number", "description": "Remaining commitment balance"},
                "monthly_payment": {"type": "number", "description": "Monthly principal & interest"},
                "annual_debt_service": {"type": "number", "description": "Annual debt service"},
                "loan_covenant_dscr_min": {"type": "number", "description": "Covenant minimum DSCR"},
                "loan_covenant_ltv_max": {"type": "number", "description": "Covenant maximum LTV"},
                "loan_covenant_occupancy_min": {"type": "number", "description": "Covenant minimum occupancy"},
                "covenant_test_frequency": {"type": "string", "description": "Quarterly, Monthly, Annual"},
                "covenants": {"type": "object", "description": "JSONB covenants object"},
                "reserve_requirements": {"type": "object", "description": "JSONB reserves object"},
                "replacement_reserve_per_unit": {"type": "number", "description": "Replacement reserve per unit"},
                "tax_insurance_escrow_months": {"type": "integer", "description": "T&I escrow months"},
                "initial_reserve_months": {"type": "integer", "description": "Initial reserve months"},
                "guarantee_type": {"type": "string", "description": "Full recourse, limited, non-recourse"},
                "guarantor_name": {"type": "string", "description": "Guarantor name"},
                "recourse_carveout_provisions": {"type": "string", "description": "Recourse carveout provisions"},
                "extension_options": {"type": "integer", "description": "Number of extension options"},
                "extension_option_years": {"type": "integer", "description": "Extension term (years per option)"},
                "can_participate_in_profits": {"type": "boolean", "description": "Has profit participation"},
                "profit_participation_tier": {"type": "integer", "description": "Profit participation tier"},
                "profit_participation_pct": {"type": "number", "description": "Profit participation %"},
                "applies_to_finance_structures": {"type": "array", "items": {"type": "integer"}, "description": "Finance structure IDs"},
                "applies_to_containers": {"type": "array", "items": {"type": "integer"}, "description": "Container IDs"},
                "notes": {"type": "string", "description": "Notes"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_debt_facility",
        "description": """Delete a debt facility (MUTATION).

Requires facility_id.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "facility_id": {"type": "integer", "description": "Facility ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["facility_id"]
        }
    },
    {
        "name": "get_equity_structure",
        "description": """Retrieve equity structure for a project.

Returns the project's equity structure including:
- Ownership splits: lp_ownership_pct, gp_ownership_pct
- Return targets: preferred_return_pct, equity_multiple_target, irr_target_pct
- Promote structure: gp_promote_after_pref, catch_up_pct
- Distribution frequency

Each project has ONE equity structure record.""",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "update_equity_structure",
        "description": """Create or update equity structure (MUTATION).

Creates if doesn't exist, updates if exists. Each project has ONE equity structure.

Key fields:
- lp_ownership_pct: LP ownership percentage (e.g., 90)
- gp_ownership_pct: GP ownership percentage (e.g., 10)
- preferred_return_pct: Preferred return rate (e.g., 8.0)
- gp_promote_after_pref: GP promote after pref return (e.g., 20.0)
- catch_up_pct: Catch-up percentage for GP
- equity_multiple_target: Target equity multiple (e.g., 2.0)
- irr_target_pct: Target IRR percentage
- distribution_frequency: quarterly, monthly, annual

Example: Extract equity terms from JV agreement or PPM.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "lp_ownership_pct": {"type": "number", "description": "LP ownership %"},
                "gp_ownership_pct": {"type": "number", "description": "GP ownership %"},
                "preferred_return_pct": {"type": "number", "description": "Preferred return %"},
                "gp_promote_after_pref": {"type": "number", "description": "GP promote after pref %"},
                "catch_up_pct": {"type": "number", "description": "Catch-up %"},
                "equity_multiple_target": {"type": "number", "description": "Target equity multiple"},
                "irr_target_pct": {"type": "number", "description": "Target IRR %"},
                "distribution_frequency": {"type": "string", "description": "quarterly, monthly, annual"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "get_waterfall_tiers",
        "description": """Retrieve waterfall tiers for a project.

Returns distribution waterfall tiers ordered by tier_number:
- tier_number, tier_name, tier_description
- hurdle_type: irr, equity_multiple, roi, none
- hurdle_rate: Threshold for tier (decimal)
- lp_split_pct, gp_split_pct: Split percentages for tier
- irr_threshold_pct, equity_multiple_threshold: Specific hurdles
- has_catch_up, catch_up_pct, catch_up_to_pct
- is_pari_passu, is_lookback_tier

Requires equity_structure to exist first.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "tier_id": {"type": "integer", "description": "Optional tier ID for single record"}
            },
            "required": []
        }
    },
    {
        "name": "update_waterfall_tiers",
        "description": """Create or update waterfall tiers (MUTATION).

Pass an array of tier objects in the 'records' field. Can create/update multiple tiers at once.
Requires equity_structure to exist first.

Each tier object in records can have:
- tier_id: Existing tier ID (for updates), omit for new tiers
- tier_number: REQUIRED for new tiers - Tier sequence (1, 2, 3...)
- tier_name: Descriptive name (e.g., "Return of Capital", "Pref Return", "First Promote")
- tier_description: Detailed description
- hurdle_type: irr, equity_multiple, roi, none
- hurdle_rate: Hurdle threshold (decimal, e.g., 0.08 for 8%)
- lp_split_pct: LP split for this tier (e.g., 80)
- gp_split_pct: GP split for this tier (e.g., 20)
- irr_threshold_pct: IRR hurdle (percentage)
- equity_multiple_threshold: EM hurdle (e.g., 1.5)
- has_catch_up: Enable GP catch-up
- catch_up_pct: Catch-up percentage
- is_pari_passu: Pari passu distribution
- is_active: Include in calculations
- display_order: Display sequence

Example: Extract waterfall tiers from JV agreement or PPM.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "records": {
                    "type": "array",
                    "description": "Array of tier objects to create/update",
                    "items": {
                        "type": "object",
                        "properties": {
                            "tier_id": {"type": "integer", "description": "Existing tier ID (for updates)"},
                            "tier_number": {"type": "integer", "description": "Tier sequence number"},
                            "tier_name": {"type": "string", "description": "Tier name"},
                            "tier_description": {"type": "string", "description": "Tier description"},
                            "hurdle_type": {"type": "string", "description": "irr, equity_multiple, roi, none"},
                            "hurdle_rate": {"type": "number", "description": "Hurdle threshold (decimal)"},
                            "lp_split_pct": {"type": "number", "description": "LP split %"},
                            "gp_split_pct": {"type": "number", "description": "GP split %"},
                            "irr_threshold_pct": {"type": "number", "description": "IRR threshold %"},
                            "equity_multiple_threshold": {"type": "number", "description": "EM threshold"},
                            "has_catch_up": {"type": "boolean", "description": "Has catch-up"},
                            "catch_up_pct": {"type": "number", "description": "Catch-up %"},
                            "catch_up_to_pct": {"type": "number", "description": "Catch-up to %"},
                            "is_pari_passu": {"type": "boolean", "description": "Pari passu"},
                            "is_lookback_tier": {"type": "boolean", "description": "Lookback tier"},
                            "is_active": {"type": "boolean", "description": "Include in calculations"},
                            "display_order": {"type": "integer", "description": "Display order"}
                        }
                    }
                },
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": ["records"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────────
    # Budget & Category Tools
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "name": "get_budget_categories",
        "description": """Retrieve budget cost categories (hierarchical classification system).

Categories are system-wide and form a classification hierarchy for budget line items.
Returns all active categories by default.

Optional filters:
- parent_id: Get children of a specific parent (use null for top-level)
- account_level: Filter by hierarchy level (1=top, 2=mid, 3=detail)
- active_only: Include inactive categories (default true)

Each category has:
- category_id, category_name, account_number
- parent_id: Parent category (null for top-level)
- account_level: Hierarchy depth
- sort_order: Display order within level
- property_types: Array of property types this applies to
- is_calculated: Whether amount is auto-calculated
- tags: JSON array of classification tags""",
        "input_schema": {
            "type": "object",
            "properties": {
                "parent_id": {"type": "integer", "description": "Filter to children of this parent (null for top-level)"},
                "account_level": {"type": "integer", "description": "Filter by level (1, 2, or 3)"},
                "active_only": {"type": "boolean", "description": "Only active categories (default true)"}
            },
            "required": []
        }
    },
    {
        "name": "update_budget_category",
        "description": """Create or update a budget cost category (MUTATION).

For updates, pass category_id. For new categories, omit category_id.

Key fields:
- category_name: REQUIRED for new categories - Display name
- parent_id: Parent category ID (null for top-level)
- account_number: Account code (e.g., '01', '01.01', '01.01.001')
- account_level: Hierarchy level (1=top, 2=mid, 3=detail)
- sort_order: Display order within level
- is_active: Whether category is active
- property_types: Array of property types (e.g., ['MF', 'LAND'])
- is_calculated: Whether amount is auto-calculated
- tags: JSON array of classification tags

Example: Create a new cost category for soft costs.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "category_id": {"type": "integer", "description": "Existing category ID (for updates)"},
                "category_name": {"type": "string", "description": "Category name"},
                "parent_id": {"type": "integer", "description": "Parent category ID"},
                "account_number": {"type": "string", "description": "Account code"},
                "account_level": {"type": "integer", "description": "Hierarchy level (1-3)"},
                "sort_order": {"type": "integer", "description": "Display order"},
                "is_active": {"type": "boolean", "description": "Is active"},
                "property_types": {"type": "array", "items": {"type": "string"}, "description": "Property types"},
                "is_calculated": {"type": "boolean", "description": "Auto-calculated"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Classification tags"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "get_budget_items",
        "description": """Retrieve budget line items for a project.

Returns all cost entries with category info, amounts, and timing.
Includes summary with total_amount.

Each item has:
- fact_id: Unique identifier
- category_id, category_name, account_level: Category info
- uom_code: Unit of measure (EA, SF, LF, AC, LOT, $$$, etc.)
- qty, rate, amount: Cost calculation
- start_date, end_date: Timing
- vendor_name, status, is_committed: Tracking info
- contingency_pct, escalation_rate: Adjustments
- notes, activity, confidence_code: Metadata

Optional filters:
- category_id: Filter to specific category
- limit: Max records (default 500)""",
        "input_schema": {
            "type": "object",
            "properties": {
                "category_id": {"type": "integer", "description": "Filter by category ID"},
                "limit": {"type": "integer", "description": "Max records (default 500)"}
            },
            "required": []
        }
    },
    {
        "name": "update_budget_item",
        "description": """Create or update a budget line item (MUTATION).

For updates, pass fact_id. For new items, omit fact_id.

CORE FIELDS:
- category_id: Cost category to assign
- uom_code: Unit of measure (EA, SF, LF, AC, LOT, $$$, HR, etc.)
- qty: Quantity | rate: Unit rate | amount: Total amount
- notes: Description/notes | internal_memo: Internal notes

TIMING:
- start_date, end_date: Planned timing (YYYY-MM-DD)
- start_period, periods_to_complete, end_period: Period-based timing
- timing_method: Timing calculation method
- baseline_start_date, baseline_end_date: Original schedule
- actual_start_date, actual_end_date: Actual dates

COST TRACKING:
- contingency_pct: Contingency % | contingency_mode: Mode for contingency
- escalation_rate: Annual escalation | escalation_method: Method
- cost_type: Cost classification | tax_treatment: Tax handling
- is_committed: Whether committed | is_reimbursable: If reimbursable

VENDOR/CONTRACT:
- vendor_name: Vendor name | contract_number: Contract # | purchase_order: PO #
- bid_date: Bid date | bid_amount: Bid amount | bid_variance: Variance from bid

SCHEDULE CONTROL:
- status: Status | percent_complete: % complete | is_critical: Critical path item
- float_days: Schedule float | early_start_date, late_finish_date: CPM dates

APPROVAL & VERSIONING:
- approval_status: Approval state | approved_by: Approver ID | approval_date: Date
- budget_version: Version label | version_as_of_date: Version date

FUNDING:
- funding_draw_pct: Draw % | draw_schedule: Draw timing | retention_pct: Retention %
- payment_terms: Payment terms | invoice_frequency: Invoice freq

ALLOCATION:
- cost_allocation: Allocation basis | allocation_method: Method
- allocated_total: Allocated amount | allocation_variance: Variance
- cf_start_flag: Cash flow start flag | cf_distribution: Distribution pattern

CHANGE ORDERS:
- change_order_count: # of COs | change_order_total: CO total amount
- document_count: # of documents

Example: Add a new soft cost line item from a bid document.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "fact_id": {"type": "integer", "description": "Existing item ID (for updates)"},
                "category_id": {"type": "integer", "description": "Cost category ID"},
                "uom_code": {"type": "string", "description": "Unit of measure (EA, SF, LF, AC, LOT, $$$)"},
                "qty": {"type": "number", "description": "Quantity"},
                "rate": {"type": "number", "description": "Unit rate"},
                "amount": {"type": "number", "description": "Total amount"},
                "notes": {"type": "string", "description": "Description/notes"},
                "internal_memo": {"type": "string", "description": "Internal notes (not shown externally)"},
                "vendor_name": {"type": "string", "description": "Vendor name"},
                "contract_number": {"type": "string", "description": "Contract number"},
                "purchase_order": {"type": "string", "description": "Purchase order number"},
                "start_date": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                "end_date": {"type": "string", "description": "End date (YYYY-MM-DD)"},
                "start_period": {"type": "integer", "description": "Start period number"},
                "periods_to_complete": {"type": "integer", "description": "Duration in periods"},
                "end_period": {"type": "integer", "description": "End period number"},
                "timing_method": {"type": "string", "description": "Timing calculation method"},
                "baseline_start_date": {"type": "string", "description": "Original planned start (YYYY-MM-DD)"},
                "baseline_end_date": {"type": "string", "description": "Original planned end (YYYY-MM-DD)"},
                "actual_start_date": {"type": "string", "description": "Actual start date (YYYY-MM-DD)"},
                "actual_end_date": {"type": "string", "description": "Actual end date (YYYY-MM-DD)"},
                "contingency_pct": {"type": "number", "description": "Contingency percentage"},
                "contingency_mode": {"type": "string", "description": "Contingency calculation mode"},
                "escalation_rate": {"type": "number", "description": "Annual escalation rate"},
                "escalation_method": {"type": "string", "description": "Escalation method"},
                "cost_type": {"type": "string", "description": "Cost type classification"},
                "tax_treatment": {"type": "string", "description": "Tax treatment (taxable/exempt/etc)"},
                "is_committed": {"type": "boolean", "description": "Is committed/contracted"},
                "is_reimbursable": {"type": "boolean", "description": "Is reimbursable cost"},
                "is_critical": {"type": "boolean", "description": "Critical path item"},
                "status": {"type": "string", "description": "Status (not_started/in_progress/completed/cancelled)"},
                "percent_complete": {"type": "number", "description": "Percent complete (0-100)"},
                "float_days": {"type": "integer", "description": "Schedule float in days"},
                "early_start_date": {"type": "string", "description": "CPM early start (YYYY-MM-DD)"},
                "late_finish_date": {"type": "string", "description": "CPM late finish (YYYY-MM-DD)"},
                "approval_status": {"type": "string", "description": "Approval status (pending/approved/rejected)"},
                "approved_by": {"type": "integer", "description": "Approver user ID"},
                "approval_date": {"type": "string", "description": "Approval date (YYYY-MM-DD)"},
                "budget_version": {"type": "string", "description": "Budget version label"},
                "version_as_of_date": {"type": "string", "description": "Version effective date (YYYY-MM-DD)"},
                "bid_date": {"type": "string", "description": "Bid date (YYYY-MM-DD)"},
                "bid_amount": {"type": "number", "description": "Bid amount"},
                "bid_variance": {"type": "number", "description": "Variance from bid amount"},
                "funding_draw_pct": {"type": "number", "description": "Funding draw percentage"},
                "draw_schedule": {"type": "string", "description": "Draw schedule type"},
                "retention_pct": {"type": "number", "description": "Retention percentage"},
                "payment_terms": {"type": "string", "description": "Payment terms (Net30/etc)"},
                "invoice_frequency": {"type": "string", "description": "Invoice frequency (monthly/etc)"},
                "cost_allocation": {"type": "string", "description": "Cost allocation basis"},
                "allocation_method": {"type": "string", "description": "Allocation method"},
                "allocated_total": {"type": "number", "description": "Allocated total amount"},
                "allocation_variance": {"type": "number", "description": "Allocation variance"},
                "cf_start_flag": {"type": "boolean", "description": "Cash flow start flag"},
                "cf_distribution": {"type": "string", "description": "Cash flow distribution pattern"},
                "change_order_count": {"type": "integer", "description": "Number of change orders"},
                "change_order_total": {"type": "number", "description": "Change order total amount"},
                "document_count": {"type": "integer", "description": "Number of attached documents"},
                "curve_profile": {"type": "string", "description": "S-curve profile (linear/front/back)"},
                "curve_steepness": {"type": "number", "description": "S-curve steepness (0.1-10)"},
                "activity": {"type": "string", "description": "Activity description"},
                "scenario_id": {"type": "integer", "description": "Scenario ID for versioning"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_budget_item",
        "description": """Delete a budget line item (MUTATION).

Requires fact_id. Verifies the item belongs to the current project before deleting.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "fact_id": {"type": "integer", "description": "Budget item ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["fact_id"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────────
    # Planning Hierarchy Tools (Area → Phase → Parcel, Milestones)
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "name": "get_areas",
        "description": """Retrieve planning areas for the project.

Areas are the top-level spatial containers (e.g., 'Planning Area 1', 'North Tract').
Each area can contain multiple phases.

Returns all areas with:
- area_id: Unique identifier
- area_alias: Display name
- area_no: Sequence number
- project_id: Parent project

Optional filters:
- area_id: Get specific area by ID""",
        "input_schema": {
            "type": "object",
            "properties": {
                "area_id": {"type": "integer", "description": "Filter to specific area"}
            },
            "required": []
        }
    },
    {
        "name": "update_area",
        "description": """Create or update a planning area (MUTATION).

For updates, pass area_id. For new areas, omit area_id.

Fields:
- area_alias: Display name (e.g., 'Planning Area 1', 'North Tract')
- area_no: Sequence number (auto-assigned if omitted on create)

Example: Create a new planning area for the west parcel.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "area_id": {"type": "integer", "description": "Existing area ID (for updates)"},
                "area_alias": {"type": "string", "description": "Area display name"},
                "area_no": {"type": "integer", "description": "Sequence number"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_area",
        "description": """Delete a planning area (MUTATION).

WARNING: This will CASCADE delete all phases and parcels within this area.
Requires area_id. Verifies the area belongs to the current project.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "area_id": {"type": "integer", "description": "Area ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["area_id"]
        }
    },
    {
        "name": "get_phases",
        "description": """Retrieve development phases for the project.

Phases are the second-level containers within areas, representing development timing.
Each phase can contain multiple parcels.

Returns all phases with:
- phase_id: Unique identifier
- area_id: Parent area
- phase_name, phase_no: Identification
- label, description: Display info
- phase_status: Current status
- phase_start_date, phase_completion_date: Timeline
- absorption_start_date: Sales start date

Optional filters:
- phase_id: Get specific phase by ID
- area_id: Filter to phases within an area""",
        "input_schema": {
            "type": "object",
            "properties": {
                "phase_id": {"type": "integer", "description": "Filter to specific phase"},
                "area_id": {"type": "integer", "description": "Filter to phases in this area"}
            },
            "required": []
        }
    },
    {
        "name": "update_phase",
        "description": """Create or update a development phase (MUTATION).

For updates, pass phase_id. For new phases, pass area_id and omit phase_id.

Fields:
- area_id: REQUIRED for new phases - Parent area
- phase_name: Display name (e.g., 'Phase 1A')
- phase_no: Sequence number (auto-assigned if omitted on create)
- label: Short label
- description: Longer description
- phase_status: Status (planning, approved, in_progress, completed)
- phase_start_date: Start date (YYYY-MM-DD)
- phase_completion_date: Completion date (YYYY-MM-DD)
- absorption_start_date: Sales start date (YYYY-MM-DD)

Example: Create phase 2A starting Q2 2025.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "phase_id": {"type": "integer", "description": "Existing phase ID (for updates)"},
                "area_id": {"type": "integer", "description": "Parent area ID (required for new phases)"},
                "phase_name": {"type": "string", "description": "Phase display name"},
                "phase_no": {"type": "integer", "description": "Sequence number"},
                "label": {"type": "string", "description": "Short label"},
                "description": {"type": "string", "description": "Phase description"},
                "phase_status": {"type": "string", "description": "Status (planning/approved/in_progress/completed)"},
                "phase_start_date": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                "phase_completion_date": {"type": "string", "description": "Completion date (YYYY-MM-DD)"},
                "absorption_start_date": {"type": "string", "description": "Sales start date (YYYY-MM-DD)"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_phase",
        "description": """Delete a development phase (MUTATION).

WARNING: This will CASCADE delete all parcels within this phase.
Requires phase_id. Verifies the phase belongs to the current project.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "phase_id": {"type": "integer", "description": "Phase ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["phase_id"]
        }
    },
    {
        "name": "get_parcels",
        "description": """Retrieve parcels/lots for the project.

Parcels are the lowest-level spatial containers (individual lots or units).
They belong to a phase and area.

Returns all parcels with key fields:
- parcel_id: Unique identifier
- phase_id, area_id: Parent containers
- parcel_name, parcel_code: Identification
- landuse_code, landuse_type: Land use classification
- acres_gross, lot_width, lot_depth, lot_area: Physical dimensions
- units_total: Number of units (for multi-unit parcels)
- lot_product: Product type (50' Lot, 60' Lot, etc.)
- family_name: Product family (Residential, Commercial)
- building_name, building_class: For vertical development
- rentable_sf, common_area_sf: Space metrics
- saledate, saleprice: Sale info

Optional filters:
- parcel_id: Get specific parcel
- phase_id: Filter to parcels in this phase
- area_id: Filter to parcels in this area
- limit: Max records (default 200)""",
        "input_schema": {
            "type": "object",
            "properties": {
                "parcel_id": {"type": "integer", "description": "Filter to specific parcel"},
                "phase_id": {"type": "integer", "description": "Filter to parcels in this phase"},
                "area_id": {"type": "integer", "description": "Filter to parcels in this area"},
                "limit": {"type": "integer", "description": "Max records (default 200)"}
            },
            "required": []
        }
    },
    {
        "name": "update_parcel",
        "description": """Create or update a parcel/lot (MUTATION).

For updates, pass parcel_id. For new parcels, pass phase_id and omit parcel_id.

Key fields:
- phase_id: REQUIRED for new parcels - Parent phase
- parcel_name: Display name (e.g., 'Lot 101')
- parcel_code: Unique code within project
- landuse_code, landuse_type: Land use classification
- lot_product: Product type (50' Lot, etc.)
- lot_width, lot_depth, lot_area: Dimensions
- acres_gross: Total acreage
- units_total: Unit count
- family_name: Product family
- density_code, type_code, product_code: Classification codes
- building_name, building_class: For buildings
- rentable_sf, common_area_sf: Space metrics
- year_built, year_renovated: Construction dates
- parking_spaces, parking_ratio: Parking
- saledate: Sale date (YYYY-MM-DD)
- saleprice: Sale price
- is_income_property: Is income producing
- property_metadata: JSONB for custom attributes
- description: Notes

Example: Add a new 50-foot lot to Phase 1A.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "parcel_id": {"type": "integer", "description": "Existing parcel ID (for updates)"},
                "phase_id": {"type": "integer", "description": "Parent phase ID (required for new parcels)"},
                "parcel_name": {"type": "string", "description": "Parcel display name"},
                "parcel_code": {"type": "string", "description": "Unique code"},
                "landuse_code": {"type": "string", "description": "Land use code"},
                "landuse_type": {"type": "string", "description": "Land use type"},
                "lot_product": {"type": "string", "description": "Product type"},
                "lot_width": {"type": "number", "description": "Lot width (ft)"},
                "lot_depth": {"type": "number", "description": "Lot depth (ft)"},
                "lot_area": {"type": "number", "description": "Lot area (sf)"},
                "acres_gross": {"type": "number", "description": "Gross acres"},
                "units_total": {"type": "integer", "description": "Total units"},
                "family_name": {"type": "string", "description": "Product family"},
                "density_code": {"type": "string", "description": "Density code"},
                "type_code": {"type": "string", "description": "Type code"},
                "product_code": {"type": "string", "description": "Product code"},
                "building_name": {"type": "string", "description": "Building name"},
                "building_class": {"type": "string", "description": "Building class"},
                "rentable_sf": {"type": "number", "description": "Rentable SF"},
                "common_area_sf": {"type": "number", "description": "Common area SF"},
                "year_built": {"type": "integer", "description": "Year built"},
                "year_renovated": {"type": "integer", "description": "Year renovated"},
                "parking_spaces": {"type": "integer", "description": "Parking spaces"},
                "parking_ratio": {"type": "number", "description": "Parking ratio"},
                "saledate": {"type": "string", "description": "Sale date (YYYY-MM-DD)"},
                "saleprice": {"type": "number", "description": "Sale price"},
                "is_income_property": {"type": "boolean", "description": "Is income property"},
                "property_metadata": {"type": "object", "description": "Custom attributes (JSON)"},
                "description": {"type": "string", "description": "Notes/description"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_parcel",
        "description": """Delete a parcel/lot (MUTATION).

Requires parcel_id. Verifies the parcel belongs to the current project.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "parcel_id": {"type": "integer", "description": "Parcel ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["parcel_id"]
        }
    },
    {
        "name": "get_milestones",
        "description": """Retrieve project milestones and timeline events.

Milestones track key dates and deliverables (entitlements, construction starts, completions).
Can be linked to phases and have predecessor dependencies.

Returns all milestones with:
- milestone_id: Unique identifier
- project_id, phase_id: Project and optional phase
- milestone_name: Display name
- milestone_type: Category (entitlement, construction, sales, financing, other)
- target_date: Planned date
- actual_date: Actual completion date
- status: Current status (pending, in_progress, completed, delayed)
- predecessor_milestone_id: Dependency
- notes: Additional notes
- source_doc_id: Source document reference
- confidence_score: Data confidence (0-1)
- created_by: Creator

Optional filters:
- milestone_id: Get specific milestone
- phase_id: Filter to milestones for a phase
- milestone_type: Filter by type
- status: Filter by status""",
        "input_schema": {
            "type": "object",
            "properties": {
                "milestone_id": {"type": "integer", "description": "Filter to specific milestone"},
                "phase_id": {"type": "integer", "description": "Filter to milestones for this phase"},
                "milestone_type": {"type": "string", "description": "Filter by type (entitlement/construction/sales/financing/other)"},
                "status": {"type": "string", "description": "Filter by status (pending/in_progress/completed/delayed)"}
            },
            "required": []
        }
    },
    {
        "name": "update_milestone",
        "description": """Create or update a project milestone (MUTATION).

For updates, pass milestone_id. For new milestones, omit milestone_id.

Fields:
- milestone_name: REQUIRED for new - Display name
- milestone_type: Type (entitlement, construction, sales, financing, other)
- phase_id: Optional phase linkage
- target_date: Planned date (YYYY-MM-DD)
- actual_date: Actual completion date (YYYY-MM-DD)
- status: Status (pending, in_progress, completed, delayed)
- predecessor_milestone_id: Dependency on another milestone
- notes: Additional notes
- source_doc_id: Source document ID
- confidence_score: Data confidence (0-1)
- created_by: Creator name

Example: Add entitlement approval milestone for Q1 2025.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "milestone_id": {"type": "integer", "description": "Existing milestone ID (for updates)"},
                "milestone_name": {"type": "string", "description": "Milestone display name"},
                "milestone_type": {"type": "string", "description": "Type (entitlement/construction/sales/financing/other)"},
                "phase_id": {"type": "integer", "description": "Optional phase ID"},
                "target_date": {"type": "string", "description": "Target date (YYYY-MM-DD)"},
                "actual_date": {"type": "string", "description": "Actual date (YYYY-MM-DD)"},
                "status": {"type": "string", "description": "Status (pending/in_progress/completed/delayed)"},
                "predecessor_milestone_id": {"type": "integer", "description": "Predecessor milestone ID"},
                "notes": {"type": "string", "description": "Additional notes"},
                "source_doc_id": {"type": "integer", "description": "Source document ID"},
                "confidence_score": {"type": "number", "description": "Confidence score (0-1)"},
                "created_by": {"type": "string", "description": "Creator name"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_milestone",
        "description": """Delete a project milestone (MUTATION).

Requires milestone_id. Verifies the milestone belongs to the current project.
Note: Milestones that are predecessors to other milestones may have dependencies.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "milestone_id": {"type": "integer", "description": "Milestone ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["milestone_id"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────────
    # System Administration Tools (Land Use, Measures, Picklists, Benchmarks, etc.)
    # ─────────────────────────────────────────────────────────────────────────────
    {
        "name": "get_land_use_families",
        "description": """Retrieve land use families (top-level classification).

Families are the highest level of the land use taxonomy: Residential, Commercial, Industrial, etc.
Each family contains multiple land use types.

Returns all families with:
- family_id: Unique identifier
- code: Short code (RES, COM, IND, etc.)
- name: Full name
- active: Whether family is active
- notes: Additional notes

Optional filters:
- family_id: Get specific family
- is_active: Filter by active status""",
        "input_schema": {
            "type": "object",
            "properties": {
                "family_id": {"type": "integer", "description": "Filter to specific family"},
                "is_active": {"type": "boolean", "description": "Filter by active status"}
            },
            "required": []
        }
    },
    {
        "name": "update_land_use_family",
        "description": """Create or update a land use family (MUTATION).

For updates, pass family_id. For new families, omit family_id.

Fields:
- code: REQUIRED for new - Short code (e.g., 'RES', 'COM')
- name: REQUIRED for new - Full name (e.g., 'Residential', 'Commercial')
- active: Whether family is active
- notes: Additional notes

Example: Create a new land use family for mixed-use developments.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "family_id": {"type": "integer", "description": "Existing family ID (for updates)"},
                "code": {"type": "string", "description": "Short code (e.g., 'RES')"},
                "name": {"type": "string", "description": "Full name (e.g., 'Residential')"},
                "active": {"type": "boolean", "description": "Whether active"},
                "notes": {"type": "string", "description": "Additional notes"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "get_land_use_types",
        "description": """Retrieve land use types (mid-level classification).

Types are the second level of the land use taxonomy, belonging to a family.
Examples: Single Family, Multifamily, Retail, Office, etc.

Returns all types with:
- type_id: Unique identifier
- family_id, family_name: Parent family
- code: Short code (SFD, MF, RET, etc.)
- name: Full name
- ord: Sort order
- active: Whether active

Optional filters:
- type_id: Get specific type
- family_id: Filter to types in a family
- is_active: Filter by active status""",
        "input_schema": {
            "type": "object",
            "properties": {
                "type_id": {"type": "integer", "description": "Filter to specific type"},
                "family_id": {"type": "integer", "description": "Filter to types in this family"},
                "is_active": {"type": "boolean", "description": "Filter by active status"}
            },
            "required": []
        }
    },
    {
        "name": "update_land_use_type",
        "description": """Create or update a land use type (MUTATION).

For updates, pass type_id. For new types, pass family_id and omit type_id.

Fields:
- family_id: REQUIRED for new - Parent family ID
- code: REQUIRED for new - Short code (e.g., 'SFD', 'MF')
- name: REQUIRED for new - Full name (e.g., 'Single Family Detached')
- ord: Sort order within family
- active: Whether active
- notes: Additional notes

Example: Add a new land use type for age-restricted housing.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "type_id": {"type": "integer", "description": "Existing type ID (for updates)"},
                "family_id": {"type": "integer", "description": "Parent family ID (required for new)"},
                "code": {"type": "string", "description": "Short code (e.g., 'SFD')"},
                "name": {"type": "string", "description": "Full name"},
                "ord": {"type": "integer", "description": "Sort order"},
                "active": {"type": "boolean", "description": "Whether active"},
                "notes": {"type": "string", "description": "Additional notes"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "get_residential_products",
        "description": """Retrieve residential lot products (leaf-level classification).

Products define specific lot configurations: 40x120, 50x130, Townhome, etc.
Used for land development projects to categorize lot types.

Returns all products with:
- product_id: Unique identifier
- code: Product code (e.g., '40x120', '50x130')
- lot_w_ft: Lot width in feet
- lot_d_ft: Lot depth in feet
- lot_area_sf: Lot area in square feet
- type_id, type_name: Parent land use type
- is_active: Whether active

Optional filters:
- product_id: Get specific product
- type_id / land_use_type_id: Filter to products of a type
- is_active: Filter by active status""",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {"type": "integer", "description": "Filter to specific product"},
                "land_use_type_id": {"type": "integer", "description": "Filter to products of this type"},
                "is_active": {"type": "boolean", "description": "Filter by active status"}
            },
            "required": []
        }
    },
    {
        "name": "update_residential_product",
        "description": """Create or update a residential lot product (MUTATION).

For updates, pass product_id. For new products, omit product_id.

Fields:
- code: REQUIRED for new - Product code (e.g., '40x120')
- lot_width / lot_w_ft: REQUIRED for new - Lot width in feet
- lot_depth / lot_d_ft: REQUIRED for new - Lot depth in feet
- type_id / land_use_type_id: Parent land use type ID
- lot_area_sf: Lot area (auto-calculated if not provided)
- is_active: Whether active

Example: Add a new 55-foot premium lot product.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {"type": "integer", "description": "Existing product ID (for updates)"},
                "code": {"type": "string", "description": "Product code (e.g., '55x120')"},
                "lot_width": {"type": "number", "description": "Lot width in feet"},
                "lot_depth": {"type": "number", "description": "Lot depth in feet"},
                "lot_area_sf": {"type": "integer", "description": "Lot area in SF"},
                "land_use_type_id": {"type": "integer", "description": "Parent type ID"},
                "is_active": {"type": "boolean", "description": "Whether active"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "get_measures",
        "description": """Retrieve measurement units (SF, AC, LF, EA, etc.).

Measures define units of measure for quantities in the system.
Used for budget items, cost library, and parcel metrics.

Returns all measures with:
- measure_id: Unique identifier
- measure_code: Short code (SF, AC, LF, EA, etc.)
- measure_name: Full name (Square Feet, Acres, etc.)
- measure_category: Category (area, length, count, currency, etc.)
- is_system: Whether system-defined
- property_types: Applicable property types (JSON)
- sort_order: Display order

Optional filters:
- measure_id: Get specific measure
- category: Filter by category""",
        "input_schema": {
            "type": "object",
            "properties": {
                "measure_id": {"type": "integer", "description": "Filter to specific measure"},
                "category": {"type": "string", "description": "Filter by category (area, length, count, etc.)"}
            },
            "required": []
        }
    },
    {
        "name": "update_measure",
        "description": """Create or update a measurement unit (MUTATION).

For updates, pass measure_id. For new measures, omit measure_id.

Fields:
- measure_code / abbreviation: REQUIRED for new - Short code (e.g., 'CY')
- measure_name / name: REQUIRED for new - Full name (e.g., 'Cubic Yards')
- measure_category / category: Category (area, length, volume, count, currency, etc.)
- property_types: Array of applicable property types
- sort_order: Display order
- is_system: Whether system-defined (default false)

Example: Add a new measure for cubic yards.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "measure_id": {"type": "integer", "description": "Existing measure ID (for updates)"},
                "abbreviation": {"type": "string", "description": "Short code (e.g., 'CY')"},
                "name": {"type": "string", "description": "Full name (e.g., 'Cubic Yards')"},
                "category": {"type": "string", "description": "Category (area, length, volume, count, etc.)"},
                "property_types": {"type": "array", "items": {"type": "string"}, "description": "Applicable property types"},
                "sort_order": {"type": "integer", "description": "Display order"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "get_picklist_values",
        "description": """Retrieve system picklist values.

Picklists provide dropdown options for various fields in the system.
Available types: ANALYSIS_TYPE, INFLATION_TYPE, LEASE_STATUS, LEASE_TYPE,
OWNERSHIP_TYPE, PHASE_STATUS, PROPERTY_CLASS, PROPERTY_SUBTYPE, PROPERTY_TYPE

If no picklist_name specified, returns list of available picklist types.

Returns values with:
- picklist_id: Unique identifier
- picklist_type: Which picklist this belongs to
- code: Value code
- name: Display name
- description: Value description
- sort_order: Display order
- is_active: Whether active""",
        "input_schema": {
            "type": "object",
            "properties": {
                "picklist_name": {"type": "string", "description": "Picklist type (e.g., 'PROPERTY_TYPE', 'PHASE_STATUS')"},
                "is_active": {"type": "boolean", "description": "Filter by active status"}
            },
            "required": []
        }
    },
    {
        "name": "update_picklist_value",
        "description": """Create or update a picklist value (MUTATION).

For updates, pass picklist_id. For new values, omit picklist_id.

Fields:
- picklist_type / picklist_name: REQUIRED for new - Which picklist
- code / value: REQUIRED for new - Value code
- name / display_label: REQUIRED for new - Display name
- description: Value description
- sort_order: Display order
- is_active: Whether active

Example: Add a new property subtype to the PROPERTY_SUBTYPE picklist.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "picklist_id": {"type": "integer", "description": "Existing value ID (for updates)"},
                "picklist_name": {"type": "string", "description": "Picklist type"},
                "value": {"type": "string", "description": "Value code"},
                "display_label": {"type": "string", "description": "Display name"},
                "description": {"type": "string", "description": "Description"},
                "sort_order": {"type": "integer", "description": "Display order"},
                "is_active": {"type": "boolean", "description": "Whether active"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_picklist_value",
        "description": """Delete a picklist value (MUTATION).

Requires picklist_id. Check for references before deleting.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "picklist_id": {"type": "integer", "description": "Picklist value ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["picklist_id"]
        }
    },
    {
        "name": "get_benchmarks",
        "description": """Retrieve global benchmark values.

Benchmarks provide market standards for comparison: cap rates, rent PSF,
construction costs, absorption rates, etc.

Returns benchmarks with:
- benchmark_id: Unique identifier
- category: Benchmark category
- subcategory: Optional subcategory
- benchmark_name: Name
- description: Description
- market_geography: Market/region
- property_type: Property type
- source_type: Data source type
- as_of_date: Effective date
- confidence_level: Data confidence
- is_active, is_global: Status flags

Optional filters:
- benchmark_id: Get specific benchmark
- category: Filter by category
- property_type: Filter by property type
- market: Filter by market/region""",
        "input_schema": {
            "type": "object",
            "properties": {
                "benchmark_id": {"type": "integer", "description": "Filter to specific benchmark"},
                "category": {"type": "string", "description": "Filter by category"},
                "property_type": {"type": "string", "description": "Filter by property type"},
                "market": {"type": "string", "description": "Filter by market/region"},
                "limit": {"type": "integer", "description": "Max records (default 100)"}
            },
            "required": []
        }
    },
    {
        "name": "update_benchmark",
        "description": """Create or update a global benchmark value (MUTATION).

For updates, pass benchmark_id. For new benchmarks, omit benchmark_id.

CORE FIELDS:
- benchmark_name / name: REQUIRED - Benchmark name
- category: REQUIRED - Primary category (e.g., "Operating Expense")
- subcategory: Optional sub-category (e.g., "Property Tax")
- description: Detailed description

MARKET & PROPERTY:
- market_geography / market: Market/region (e.g., "Phoenix MSA")
- property_type: Property type code (MF, OFF, RET, IND)

SOURCE & PROVENANCE:
- source_type: manual, extracted, api, imported
- source_document_id: Linked document ID (if extracted)
- source_project_id: Source project ID
- extraction_date: When extracted (YYYY-MM-DD)

EFFECTIVE DATE & INFLATION:
- as_of_date: Effective date (YYYY-MM-DD)
- cpi_index_value: CPI index at as_of_date (for inflation adjustment)

TRACKING:
- confidence_level: low, medium, high
- usage_count: Times used (auto-tracked)
- context_metadata: JSONB for additional context

STATUS:
- is_active: Whether active
- is_global: Whether globally applicable (vs. user-specific)

Example: Add Phoenix multifamily cap rate benchmark.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "benchmark_id": {"type": "integer", "description": "Existing benchmark ID (for updates)"},
                "benchmark_name": {"type": "string", "description": "Benchmark name"},
                "name": {"type": "string", "description": "Benchmark name (alias)"},
                "category": {"type": "string", "description": "Primary category"},
                "subcategory": {"type": "string", "description": "Sub-category"},
                "description": {"type": "string", "description": "Detailed description"},
                "market_geography": {"type": "string", "description": "Market/region"},
                "market": {"type": "string", "description": "Market (alias)"},
                "property_type": {"type": "string", "description": "Property type code"},
                "source_type": {"type": "string", "description": "manual, extracted, api, imported"},
                "source_document_id": {"type": "integer", "description": "Source document ID"},
                "source_project_id": {"type": "integer", "description": "Source project ID"},
                "extraction_date": {"type": "string", "description": "Extraction date (YYYY-MM-DD)"},
                "as_of_date": {"type": "string", "description": "Effective date (YYYY-MM-DD)"},
                "cpi_index_value": {"type": "number", "description": "CPI index value"},
                "confidence_level": {"type": "string", "description": "low, medium, high"},
                "usage_count": {"type": "integer", "description": "Times benchmark used"},
                "context_metadata": {"type": "object", "description": "JSONB additional context"},
                "is_active": {"type": "boolean", "description": "Whether active"},
                "is_global": {"type": "boolean", "description": "Whether globally applicable"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_benchmark",
        "description": """Delete a benchmark value (MUTATION).

Requires benchmark_id.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "benchmark_id": {"type": "integer", "description": "Benchmark ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["benchmark_id"]
        }
    },
    {
        "name": "get_cost_library_items",
        "description": """Retrieve cost library items.

The cost library provides standard unit costs for budgeting.
Items are categorized and include low/mid/high value ranges.

Returns items with:
- item_id: Unique identifier
- category_id, category_name: Cost category
- item_name: Item name
- default_uom_code: Unit of measure
- typical_low_value, typical_mid_value, typical_high_value: Cost range
- market_geography: Applicable market
- project_type_code: Applicable project type
- is_active: Whether active
- source: Cost source
- as_of_date: Date of cost data

Optional filters:
- item_id: Get specific item
- category_id: Filter by category
- is_active: Filter by active status
- limit: Max records (default 200)""",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "integer", "description": "Filter to specific item"},
                "category_id": {"type": "integer", "description": "Filter by category"},
                "is_active": {"type": "boolean", "description": "Filter by active status"},
                "limit": {"type": "integer", "description": "Max records (default 200)"}
            },
            "required": []
        }
    },
    {
        "name": "update_cost_library_item",
        "description": """Create or update a cost library item (MUTATION).

For updates, pass item_id. For new items, omit item_id.

CORE FIELDS:
- item_name / name: REQUIRED for new - Item name
- category_id: Cost category ID
- default_uom_code / unit_of_measure: Unit code (SF, LF, EA, etc.)
- quantity: Default quantity (if applicable)

COST RANGES:
- typical_mid_value / unit_cost: Mid-range cost
- typical_low_value: Low-range cost
- typical_high_value: High-range cost

MARKET & TYPE:
- market_geography: Applicable market (e.g., "Phoenix MSA")
- project_type_code: Project type (LAND, MF, OFF, RET, IND)

SOURCE & TRACKING:
- source: Cost source/vendor
- as_of_date: Date of cost data (YYYY-MM-DD)
- created_from_ai: Created by AI extraction
- created_from_project_id: Source project ID
- last_used_date: Last time this benchmark was used
- usage_count: Times used (auto-incremented)

STATUS:
- is_active: Whether active

Example: Add grading cost per acre for Phoenix market.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "integer", "description": "Existing item ID (for updates)"},
                "item_name": {"type": "string", "description": "Item name"},
                "name": {"type": "string", "description": "Item name (alias)"},
                "category_id": {"type": "integer", "description": "Cost category ID"},
                "default_uom_code": {"type": "string", "description": "Unit code (SF, LF, EA, etc.)"},
                "unit_of_measure": {"type": "string", "description": "Unit code (alias)"},
                "quantity": {"type": "number", "description": "Default quantity"},
                "typical_mid_value": {"type": "number", "description": "Mid-range cost"},
                "unit_cost": {"type": "number", "description": "Mid-range cost (alias)"},
                "typical_low_value": {"type": "number", "description": "Low-range cost"},
                "typical_high_value": {"type": "number", "description": "High-range cost"},
                "market_geography": {"type": "string", "description": "Market/region"},
                "project_type_code": {"type": "string", "description": "Project type (LAND, MF, etc.)"},
                "source": {"type": "string", "description": "Cost source/vendor"},
                "as_of_date": {"type": "string", "description": "Date of cost data (YYYY-MM-DD)"},
                "created_from_ai": {"type": "boolean", "description": "Created by AI extraction"},
                "created_from_project_id": {"type": "integer", "description": "Source project ID"},
                "last_used_date": {"type": "string", "description": "Last used date (YYYY-MM-DD)"},
                "usage_count": {"type": "integer", "description": "Times used"},
                "is_active": {"type": "boolean", "description": "Whether active"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": []
        }
    },
    {
        "name": "delete_cost_library_item",
        "description": """Delete a cost library item (MUTATION).

Requires item_id.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_id": {"type": "integer", "description": "Cost library item ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["item_id"]
        }
    },
    {
        "name": "get_report_templates",
        "description": """Retrieve report templates.

Templates define report configurations for generating project reports.

Returns templates with:
- template_id: Unique identifier
- template_name: Template name
- description: Description
- output_format: Format (pdf, excel, etc.)
- assigned_tabs: JSON array of assigned tabs
- sections: JSON array of report sections
- is_active: Whether active
- created_by: Creator

Optional filters:
- template_id: Get specific template
- report_type / output_format: Filter by format
- is_active: Filter by active status""",
        "input_schema": {
            "type": "object",
            "properties": {
                "template_id": {"type": "integer", "description": "Filter to specific template"},
                "report_type": {"type": "string", "description": "Filter by output format"},
                "is_active": {"type": "boolean", "description": "Filter by active status"}
            },
            "required": []
        }
    },
    {
        "name": "get_dms_templates",
        "description": """Retrieve DMS (Document Management System) templates.

Templates define document type configurations and extraction rules.

Returns templates with:
- template_id: Unique identifier
- template_name: Template name
- workspace_id: Workspace (if scoped)
- project_id: Project (if scoped)
- doc_type: Document type
- is_default: Whether default template
- doc_type_options: Available document types
- description: Description

Optional filters:
- template_id: Get specific template
- document_type / doc_type: Filter by document type
- is_default: Filter by default status""",
        "input_schema": {
            "type": "object",
            "properties": {
                "template_id": {"type": "integer", "description": "Filter to specific template"},
                "document_type": {"type": "string", "description": "Filter by document type"},
                "is_default": {"type": "boolean", "description": "Filter by default status"}
            },
            "required": []
        }
    },
    {
        "name": "update_template",
        "description": """Create or update a template (MUTATION).

Supports both report and DMS templates. Specify template_type.

For updates, pass template_id. For new templates, omit template_id.

Fields:
- template_type: REQUIRED - 'report' or 'dms'
- template_name: REQUIRED for new - Template name
- description: Description

For report templates:
- output_format: Format (pdf, excel, word)
- assigned_tabs: JSON array of tabs
- sections: JSON array of sections
- is_active: Whether active

For DMS templates:
- doc_type: Document type
- is_default: Whether default
- doc_type_options: Available doc types

Example: Create a new executive summary report template.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "template_id": {"type": "integer", "description": "Existing template ID (for updates)"},
                "template_type": {"type": "string", "description": "Type: 'report' or 'dms'"},
                "template_name": {"type": "string", "description": "Template name"},
                "description": {"type": "string", "description": "Description"},
                "output_format": {"type": "string", "description": "Report format (pdf/excel/word)"},
                "assigned_tabs": {"type": "array", "description": "Assigned tabs (JSON)"},
                "sections": {"type": "array", "description": "Report sections (JSON)"},
                "doc_type": {"type": "string", "description": "DMS document type"},
                "is_default": {"type": "boolean", "description": "Whether default template"},
                "is_active": {"type": "boolean", "description": "Whether active"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": ["template_type"]
        }
    },

    # ==========================================================================
    # PART 8: CRE, Market Intelligence, Sales & Knowledge Tools
    # ==========================================================================

    # ──────────────────────────────────────────────────────────────────────────
    # CRE (Commercial Real Estate) Tools
    # ──────────────────────────────────────────────────────────────────────────

    {
        "name": "get_cre_tenants",
        "description": """Retrieve commercial tenants (office/retail/industrial).

Returns tenant details including credit rating, industry, and contact information.
Tenants are linked to leases and spaces.

Use this for office, retail, or industrial properties - NOT multifamily.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "tenant_id": {"type": "integer", "description": "Get specific tenant by ID"}
            },
            "required": []
        }
    },
    {
        "name": "update_cre_tenant",
        "description": """Create or update a commercial tenant (MUTATION).

CORE FIELDS:
- tenant_name: REQUIRED for new - Company/trade name
- tenant_legal_name: Legal entity name | dba_name: Trade name / DBA

BUSINESS INFO:
- industry: Industry sector | naics_code: NAICS code (6-digit)
- business_type: Type (anchor, inline, pad, national, local)
- annual_revenue: Annual revenue | years_in_business: Years operating

CREDIT:
- credit_rating: Rating (AAA, AA, A, BBB, BB, B, CCC)
- creditworthiness: Credit assessment notes
- dun_bradstreet_number: D&B number for credit lookup

CONTACT:
- contact_name: Primary contact name | contact_title: Contact title
- email: Contact email | phone: Contact phone

GUARANTOR:
- guarantor_name: Personal/corporate guarantor
- guarantor_type: personal, corporate, limited

Example: Add Starbucks as a national retail tenant with AAA credit.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Tenant ID (for updates)"},
                "tenant_name": {"type": "string", "description": "Company name"},
                "tenant_legal_name": {"type": "string", "description": "Legal entity name"},
                "dba_name": {"type": "string", "description": "Trade name / DBA"},
                "industry": {"type": "string", "description": "Industry sector"},
                "naics_code": {"type": "string", "description": "NAICS industry code (6-digit)"},
                "business_type": {"type": "string", "description": "anchor, inline, pad, national, local"},
                "credit_rating": {"type": "string", "description": "Credit rating (AAA, AA, A, BBB, BB, B)"},
                "creditworthiness": {"type": "string", "description": "Credit assessment notes"},
                "dun_bradstreet_number": {"type": "string", "description": "D&B number"},
                "annual_revenue": {"type": "number", "description": "Annual revenue"},
                "years_in_business": {"type": "integer", "description": "Years in business"},
                "contact_name": {"type": "string", "description": "Primary contact name"},
                "contact_title": {"type": "string", "description": "Contact title"},
                "email": {"type": "string", "description": "Contact email"},
                "phone": {"type": "string", "description": "Contact phone"},
                "guarantor_name": {"type": "string", "description": "Guarantor name"},
                "guarantor_type": {"type": "string", "description": "personal, corporate, limited"},
                "reason": {"type": "string", "description": "Reason for change"}
            },
            "required": []
        }
    },
    {
        "name": "delete_cre_tenant",
        "description": "Delete a commercial tenant (MUTATION). WARNING: May affect linked leases.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Tenant ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["id"]
        }
    },
    {
        "name": "get_cre_spaces",
        "description": """Retrieve commercial spaces/suites for a CRE property.

Spaces are leasable units within a commercial building (suites, bays, pads).
Filter by property, floor, or status (available/leased).

Returns: space_number, floor, SF, type, status, availability date.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "space_id": {"type": "integer", "description": "Get specific space"},
                "cre_property_id": {"type": "integer", "description": "Filter by property"},
                "floor": {"type": "integer", "description": "Filter by floor number"},
                "status": {"type": "string", "description": "Filter by status (available, leased)"}
            },
            "required": []
        }
    },
    {
        "name": "update_cre_space",
        "description": """Create or update a commercial space (MUTATION).

CORE FIELDS:
- cre_property_id: Parent property (required)
- space_number: Suite/unit number | floor_number: Floor
- rentable_sf: Rentable SF | usable_sf: Usable SF

PHYSICAL:
- space_type: office, retail, warehouse, flex, restaurant
- frontage_ft: Storefront frontage (retail)
- ceiling_height_ft: Clear height (industrial/retail)
- number_of_offices: Office count | number_of_conference_rooms: Conf rooms
- has_kitchenette: Has kitchenette | has_private_restroom: Private restroom

STATUS:
- space_status: available, leased, under_construction, not_available
- available_date: When available (YYYY-MM-DD)

Example: Add Suite 200 with 5,000 RSF on floor 2, 15' ceilings.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Space ID (for updates)"},
                "cre_property_id": {"type": "integer", "description": "Property ID"},
                "space_number": {"type": "string", "description": "Suite/unit number"},
                "floor_number": {"type": "integer", "description": "Floor number"},
                "rentable_sf": {"type": "number", "description": "Rentable square feet"},
                "usable_sf": {"type": "number", "description": "Usable square feet"},
                "space_type": {"type": "string", "description": "office, retail, warehouse, flex, restaurant"},
                "frontage_ft": {"type": "number", "description": "Storefront frontage (feet)"},
                "ceiling_height_ft": {"type": "number", "description": "Clear ceiling height (feet)"},
                "number_of_offices": {"type": "integer", "description": "Number of private offices"},
                "number_of_conference_rooms": {"type": "integer", "description": "Number of conference rooms"},
                "has_kitchenette": {"type": "boolean", "description": "Has kitchenette"},
                "has_private_restroom": {"type": "boolean", "description": "Has private restroom"},
                "space_status": {"type": "string", "description": "available, leased, under_construction"},
                "available_date": {"type": "string", "description": "Available date (YYYY-MM-DD)"},
                "reason": {"type": "string", "description": "Reason for change"}
            },
            "required": []
        }
    },
    {
        "name": "delete_cre_space",
        "description": "Delete a commercial space (MUTATION).",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Space ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["id"]
        }
    },
    {
        "name": "get_cre_leases",
        "description": """Retrieve commercial leases with tenant and space details.

Leases link tenants to spaces with financial terms.
Returns full lease info: dates, rent, escalations, options, recoveries.

Filter by tenant, space, property, or status (active, expired, pending).""",
        "input_schema": {
            "type": "object",
            "properties": {
                "lease_id": {"type": "integer", "description": "Get specific lease"},
                "tenant_id": {"type": "integer", "description": "Filter by tenant"},
                "space_id": {"type": "integer", "description": "Filter by space"},
                "cre_property_id": {"type": "integer", "description": "Filter by property"},
                "status": {"type": "string", "description": "Filter by status"}
            },
            "required": []
        }
    },
    {
        "name": "update_cre_lease",
        "description": """Create or update a commercial lease (MUTATION).

CORE FIELDS:
- tenant_id: Link to tenant | space_id: Link to space
- cre_property_id: Property ID
- lease_number: Unique lease identifier
- lease_type: NNN, gross, modified_gross, percentage

KEY DATES:
- lease_execution_date: Signing date | lease_commencement_date: Start date
- rent_commencement_date: Rent start | lease_expiration_date: End date
- lease_term_months: Term duration

AREA:
- leased_sf: Square feet under lease

RENEWAL OPTIONS:
- number_of_options: Number of options | option_term_months: Option duration
- option_notice_months: Notice requirement

TERMINATION:
- early_termination_allowed: Allow early termination
- termination_notice_months: Required notice | termination_penalty_amount: Penalty $

SECURITY:
- security_deposit_amount: Deposit $ | security_deposit_months: Months of rent

SPECIAL RIGHTS:
- expansion_rights: Expansion rights | right_of_first_refusal: ROFR
- exclusive_use_clause: Exclusive use text
- co_tenancy_clause: Co-tenancy requirements
- radius_restriction: Radius restriction text

STATUS:
- lease_status: Active, Expired, Pending, Terminated

Example: Create 5-year NNN lease for Suite 200 with 2 renewal options.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Lease ID (for updates)"},
                "tenant_id": {"type": "integer", "description": "Tenant ID"},
                "space_id": {"type": "integer", "description": "Space ID"},
                "cre_property_id": {"type": "integer", "description": "Property ID"},
                "lease_number": {"type": "string", "description": "Unique lease identifier"},
                "lease_type": {"type": "string", "description": "NNN, gross, modified_gross, percentage"},
                "lease_status": {"type": "string", "description": "Active, Expired, Pending, Terminated"},
                "lease_execution_date": {"type": "string", "description": "Signing date (YYYY-MM-DD)"},
                "lease_commencement_date": {"type": "string", "description": "Lease start date (YYYY-MM-DD)"},
                "rent_commencement_date": {"type": "string", "description": "Rent start date (YYYY-MM-DD)"},
                "lease_expiration_date": {"type": "string", "description": "Lease end date (YYYY-MM-DD)"},
                "lease_term_months": {"type": "integer", "description": "Term in months"},
                "leased_sf": {"type": "number", "description": "Leased square feet"},
                "number_of_options": {"type": "integer", "description": "Number of renewal options"},
                "option_term_months": {"type": "integer", "description": "Months per option"},
                "option_notice_months": {"type": "integer", "description": "Option notice requirement (months)"},
                "early_termination_allowed": {"type": "boolean", "description": "Early termination allowed"},
                "termination_notice_months": {"type": "integer", "description": "Termination notice (months)"},
                "termination_penalty_amount": {"type": "number", "description": "Termination penalty amount"},
                "security_deposit_amount": {"type": "number", "description": "Security deposit amount"},
                "security_deposit_months": {"type": "number", "description": "Security deposit as months of rent"},
                "expansion_rights": {"type": "boolean", "description": "Has expansion rights"},
                "right_of_first_refusal": {"type": "boolean", "description": "Has ROFR"},
                "exclusive_use_clause": {"type": "string", "description": "Exclusive use clause text"},
                "co_tenancy_clause": {"type": "string", "description": "Co-tenancy clause text"},
                "radius_restriction": {"type": "string", "description": "Radius restriction text"},
                "notes": {"type": "string", "description": "Additional notes"},
                "reason": {"type": "string", "description": "Reason for change"}
            },
            "required": []
        }
    },
    {
        "name": "delete_cre_lease",
        "description": "Delete a commercial lease (MUTATION).",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Lease ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["id"]
        }
    },
    {
        "name": "get_cre_properties",
        "description": """Retrieve commercial properties for this project.

Commercial properties are office, retail, or industrial buildings.
Returns property details plus counts of spaces and active leases.

Filter by property type (office, retail, industrial, flex).""",
        "input_schema": {
            "type": "object",
            "properties": {
                "cre_property_id": {"type": "integer", "description": "Get specific property"},
                "property_type": {"type": "string", "description": "Filter by type"}
            },
            "required": []
        }
    },
    {
        "name": "update_cre_property",
        "description": """Create or update a commercial property (MUTATION).

CORE FIELDS:
- property_name: Building name
- property_type: office, retail, industrial, flex, mixed_use
- property_subtype: Class A/B/C, strip center, big box, etc.
- parcel_id: Link to land parcel (if applicable)

AREA METRICS:
- total_building_sf: Total building SF | rentable_sf: Rentable SF
- usable_sf: Usable SF | common_area_sf: Common area SF
- load_factor: Common area factor (e.g., 1.15)

BUILDING SPECS:
- year_built: Year constructed | year_renovated: Last renovation
- number_of_floors: Total floors | number_of_units: Total units/suites
- parking_spaces: Total parking | parking_ratio: Spaces per 1,000 SF

STATUS & PERFORMANCE:
- property_status: active, under_construction, planned, inactive
- stabilization_date: Expected stabilization date
- stabilized_occupancy_pct: Target occupancy %

ACQUISITION:
- acquisition_date: Purchase date | acquisition_price: Purchase price
- current_assessed_value: Tax assessed value

Example: Add 100,000 SF Class A office building built 2020 with 4.0/1,000 parking.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Property ID (for updates)"},
                "parcel_id": {"type": "integer", "description": "Linked parcel ID"},
                "property_name": {"type": "string", "description": "Building name"},
                "property_type": {"type": "string", "description": "office, retail, industrial, flex, mixed_use"},
                "property_subtype": {"type": "string", "description": "Subtype/class (Class A, strip center, etc.)"},
                "total_building_sf": {"type": "number", "description": "Total building SF"},
                "rentable_sf": {"type": "number", "description": "Rentable SF"},
                "usable_sf": {"type": "number", "description": "Usable SF"},
                "common_area_sf": {"type": "number", "description": "Common area SF"},
                "load_factor": {"type": "number", "description": "Load factor (e.g., 1.15)"},
                "year_built": {"type": "integer", "description": "Year built"},
                "year_renovated": {"type": "integer", "description": "Year renovated"},
                "number_of_floors": {"type": "integer", "description": "Number of floors"},
                "number_of_units": {"type": "integer", "description": "Number of units/suites"},
                "parking_spaces": {"type": "integer", "description": "Parking spaces"},
                "parking_ratio": {"type": "number", "description": "Parking ratio per 1,000 SF"},
                "property_status": {"type": "string", "description": "active, under_construction, planned, inactive"},
                "stabilization_date": {"type": "string", "description": "Stabilization date (YYYY-MM-DD)"},
                "stabilized_occupancy_pct": {"type": "number", "description": "Stabilized occupancy %"},
                "acquisition_date": {"type": "string", "description": "Acquisition date (YYYY-MM-DD)"},
                "acquisition_price": {"type": "number", "description": "Acquisition price"},
                "current_assessed_value": {"type": "number", "description": "Current assessed value"},
                "reason": {"type": "string", "description": "Reason for change"}
            },
            "required": []
        }
    },
    {
        "name": "get_cre_rent_roll",
        "description": """Get the full commercial rent roll for this project.

Comprehensive view of all spaces with current lease terms.
Includes: tenant, rent PSF, lease dates, recovery type, occupancy.

Returns summary stats: total SF, leased SF, occupancy %, avg rent.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "cre_property_id": {"type": "integer", "description": "Filter to specific property"},
                "include_vacant": {"type": "boolean", "description": "Include vacant spaces (default true)"},
                "as_of_date": {"type": "string", "description": "Rent roll as of date (YYYY-MM-DD)"}
            },
            "required": []
        }
    },

    # ──────────────────────────────────────────────────────────────────────────
    # Market Intelligence Tools
    # ──────────────────────────────────────────────────────────────────────────

    {
        "name": "get_competitive_projects",
        "description": """Retrieve competitive projects in the market.

Competitive projects are nearby developments that compete for the same buyers.
Includes: builder, total units, pricing, absorption rates.

Filter by city, builder, or status.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "comp_id": {"type": "integer", "description": "Get specific competitor"},
                "city": {"type": "string", "description": "Filter by city"},
                "builder": {"type": "string", "description": "Filter by builder name"},
                "status": {"type": "string", "description": "Filter by status"}
            },
            "required": []
        }
    },
    {
        "name": "update_competitive_project",
        "description": """Create or update a competitive project (MUTATION).

CORE FIELDS:
- comp_name: Project name (required for new)
- builder_name: Builder/developer name
- master_plan_name: Parent MPC name (if applicable)

LOCATION:
- comp_address: Full address | city: City | zip_code: ZIP
- latitude, longitude: Coordinates for mapping

PRODUCT:
- total_units: Total planned units/lots
- price_min, price_max: Price range
- absorption_rate_monthly: Monthly sales/lease velocity

STATUS:
- status: planning, under_construction, selling, sold_out, inactive
- effective_date: Data as-of date (YYYY-MM-DD)

DATA SOURCE:
- data_source: manual, zonda, costar, realpage, etc.
- source_url: Source URL for reference
- source_project_id: External system ID (for sync)
- notes: Additional notes

Example: Add Toll Brothers community with 150 lots, $350K-$500K.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Comp ID (for updates)"},
                "comp_name": {"type": "string", "description": "Project name"},
                "master_plan_name": {"type": "string", "description": "Parent MPC name"},
                "builder_name": {"type": "string", "description": "Builder name"},
                "comp_address": {"type": "string", "description": "Full address"},
                "city": {"type": "string", "description": "City"},
                "zip_code": {"type": "string", "description": "ZIP code"},
                "latitude": {"type": "number", "description": "Latitude"},
                "longitude": {"type": "number", "description": "Longitude"},
                "total_units": {"type": "integer", "description": "Total units/lots"},
                "price_min": {"type": "number", "description": "Minimum price"},
                "price_max": {"type": "number", "description": "Maximum price"},
                "absorption_rate_monthly": {"type": "number", "description": "Monthly absorption rate"},
                "status": {"type": "string", "description": "planning, under_construction, selling, sold_out"},
                "effective_date": {"type": "string", "description": "Data as-of date (YYYY-MM-DD)"},
                "data_source": {"type": "string", "description": "manual, zonda, costar, realpage"},
                "source_url": {"type": "string", "description": "Source URL"},
                "source_project_id": {"type": "string", "description": "External system ID"},
                "notes": {"type": "string", "description": "Additional notes"},
                "reason": {"type": "string", "description": "Reason for change"}
            },
            "required": []
        }
    },
    {
        "name": "delete_competitive_project",
        "description": "Delete a competitive project (MUTATION).",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Comp ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["id"]
        }
    },
    {
        "name": "get_absorption_benchmarks",
        "description": """Retrieve absorption velocity benchmarks.

Industry benchmarks for lot sales velocity by market and project scale.
Used to validate project absorption assumptions.

Filter by market geography or project scale.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "benchmark_id": {"type": "integer", "description": "Get specific benchmark"},
                "market": {"type": "string", "description": "Filter by market/metro"},
                "scale": {"type": "string", "description": "Filter by project scale"}
            },
            "required": []
        }
    },
    {
        "name": "get_market_assumptions",
        "description": """Get market assumptions for this project.

Project-specific pricing and velocity assumptions by land use type.
Includes: price per unit, monthly/annual velocity, escalation.

Filter by land use type code (e.g., SF50, SF60).""",
        "input_schema": {
            "type": "object",
            "properties": {
                "lu_type_code": {"type": "string", "description": "Filter by land use type code"}
            },
            "required": []
        }
    },
    {
        "name": "update_market_assumptions",
        "description": """Update market assumptions for a product type (MUTATION).

Fields:
- lu_type_code: REQUIRED - Land use type code (e.g., SF50)
- price_per_unit: Price per lot
- unit_of_measure: UOM for velocity
- dvl_per_year, dvl_per_month: Velocity
- inflation_type: Price escalation method

Example: Set 50' lots at $125,000 with 8 per month absorption.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "lu_type_code": {"type": "string", "description": "Land use type code"},
                "price_per_unit": {"type": "number", "description": "Price per unit"},
                "dvl_per_year": {"type": "number", "description": "Annual velocity"},
                "dvl_per_month": {"type": "number", "description": "Monthly velocity"},
                "reason": {"type": "string", "description": "Reason for change"}
            },
            "required": ["lu_type_code"]
        }
    },

    # ──────────────────────────────────────────────────────────────────────────
    # Sales & Absorption Tools
    # ──────────────────────────────────────────────────────────────────────────

    {
        "name": "get_absorption_schedule",
        "description": """Get the absorption schedule for this project.

Shows projected lot sales by period, phase, and product type.
Includes timing, units, pricing, and scenario information.

Returns totals: total units, total revenue.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "absorption_id": {"type": "integer", "description": "Get specific entry"},
                "phase_id": {"type": "integer", "description": "Filter by phase"},
                "parcel_id": {"type": "integer", "description": "Filter by parcel"},
                "scenario": {"type": "string", "description": "Filter by scenario name"}
            },
            "required": []
        }
    },
    {
        "name": "update_absorption_schedule",
        "description": """Create or update an absorption schedule entry (MUTATION).

LOCATION HIERARCHY:
- area_id: Planning area | phase_id: Phase | parcel_id: Parcel

REVENUE STREAM:
- revenue_stream_name: Stream label (e.g., "Phase 1A 50' Lots")
- revenue_category: lot_sales, lease_up, build_for_rent, etc.

PRODUCT CLASSIFICATION:
- lu_family_name: Land use family (Residential, Commercial)
- lu_type_code: Type code (SFD, MF, etc.)
- product_code: Product code (50', 60', etc.)

TIMING:
- start_period: Starting period number
- periods_to_complete: Duration in periods
- timing_method: ABSOLUTE, SEQUENTIAL, PREDECESSOR
- units_per_period: Velocity per period

VOLUME & PRICING:
- total_units: Total units to absorb
- base_price_per_unit: Base price per unit/lot
- price_escalation_pct: Annual price escalation %

SCENARIO:
- scenario_name: Base Case, Upside, Downside
- scenario_id: Link to scenario record
- probability_weight: Probability for weighted analysis (0.0-1.0)
- notes: Additional notes

Example: Add 50-lot Phase 2A absorption at $85K/lot, 4/month velocity.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Entry ID (for updates)"},
                "area_id": {"type": "integer", "description": "Area ID"},
                "phase_id": {"type": "integer", "description": "Phase ID"},
                "parcel_id": {"type": "integer", "description": "Parcel ID"},
                "revenue_stream_name": {"type": "string", "description": "Revenue stream name"},
                "revenue_category": {"type": "string", "description": "lot_sales, lease_up, build_for_rent"},
                "lu_family_name": {"type": "string", "description": "Land use family"},
                "lu_type_code": {"type": "string", "description": "Land use type code"},
                "product_code": {"type": "string", "description": "Product code"},
                "start_period": {"type": "integer", "description": "Start period"},
                "periods_to_complete": {"type": "integer", "description": "Duration in periods"},
                "timing_method": {"type": "string", "description": "ABSOLUTE, SEQUENTIAL, PREDECESSOR"},
                "units_per_period": {"type": "number", "description": "Units per period"},
                "total_units": {"type": "integer", "description": "Total units"},
                "base_price_per_unit": {"type": "number", "description": "Base price per unit"},
                "price_escalation_pct": {"type": "number", "description": "Annual price escalation %"},
                "scenario_name": {"type": "string", "description": "Scenario name"},
                "scenario_id": {"type": "integer", "description": "Scenario ID"},
                "probability_weight": {"type": "number", "description": "Probability weight (0.0-1.0)"},
                "notes": {"type": "string", "description": "Additional notes"},
                "reason": {"type": "string", "description": "Reason for change"}
            },
            "required": []
        }
    },
    {
        "name": "delete_absorption_schedule",
        "description": "Delete an absorption schedule entry (MUTATION).",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Entry ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["id"]
        }
    },
    {
        "name": "get_parcel_sale_events",
        "description": """Get lot sale contracts/events for this project.

Track actual lot sales to builders: contracts, closings, terms.
Includes buyer, lot count, pricing, deposit, status.

Filter by parcel, phase, buyer, or status.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "sale_event_id": {"type": "integer", "description": "Get specific event"},
                "parcel_id": {"type": "integer", "description": "Filter by parcel"},
                "phase_id": {"type": "integer", "description": "Filter by phase"},
                "status": {"type": "string", "description": "Filter by status"},
                "buyer": {"type": "string", "description": "Filter by buyer name"}
            },
            "required": []
        }
    },
    {
        "name": "update_parcel_sale_event",
        "description": """Create or update a lot sale event (MUTATION).

Fields:
- parcel_id, phase_id: Location
- buyer_entity: Buyer/builder name
- sale_type: bulk, takedown, finished_lot
- contract_date: Contract execution date
- total_lots_contracted: Number of lots
- base_price_per_lot: Price per lot
- deposit_amount, deposit_date: Earnest money
- commission_pct, closing_cost_per_unit: Costs
- sale_status: contracted, closed, cancelled

Example: Record Meritage 25-lot takedown at $115K/lot.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Event ID (for updates)"},
                "parcel_id": {"type": "integer", "description": "Parcel ID"},
                "phase_id": {"type": "integer", "description": "Phase ID"},
                "buyer_entity": {"type": "string", "description": "Buyer name"},
                "sale_type": {"type": "string", "description": "Sale type"},
                "contract_date": {"type": "string", "description": "Contract date"},
                "total_lots_contracted": {"type": "integer", "description": "Lot count"},
                "base_price_per_lot": {"type": "number", "description": "Price per lot"},
                "sale_status": {"type": "string", "description": "Status"},
                "reason": {"type": "string", "description": "Reason for change"}
            },
            "required": []
        }
    },
    {
        "name": "delete_parcel_sale_event",
        "description": "Delete a parcel sale event (MUTATION).",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "description": "Event ID to delete"},
                "reason": {"type": "string", "description": "Reason for deletion"}
            },
            "required": ["id"]
        }
    },

    # ──────────────────────────────────────────────────────────────────────────
    # Knowledge & Learning Tools
    # ──────────────────────────────────────────────────────────────────────────

    {
        "name": "get_extraction_results",
        "description": """Get AI extraction results for documents in this project.

Shows what AI extracted from documents with confidence scores.
Filter by status (pending_review, user_validated, rejected) or confidence.

Returns status breakdown across all extractions.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "extraction_id": {"type": "integer", "description": "Get specific extraction"},
                "doc_id": {"type": "integer", "description": "Filter by document"},
                "status": {"type": "string", "description": "Filter by status"},
                "min_confidence": {"type": "number", "description": "Minimum confidence (0-1)"},
                "target_table": {"type": "string", "description": "Filter by target table"}
            },
            "required": []
        }
    },
    {
        "name": "update_extraction_result",
        "description": """Update an extraction result status (MUTATION).

Use to validate or reject AI extractions.

Fields:
- extraction_id: REQUIRED
- status: pending_review, user_validated, rejected
- corrected_value: If correcting the extracted value
- rejection_reason: Why rejected

Example: Validate extraction #123 as correct.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "extraction_id": {"type": "integer", "description": "Extraction ID"},
                "status": {"type": "string", "description": "New status"},
                "corrected_value": {"type": "string", "description": "Corrected value if wrong"},
                "rejection_reason": {"type": "string", "description": "Why rejected"},
                "reason": {"type": "string", "description": "Reason for update"}
            },
            "required": ["extraction_id"]
        }
    },
    {
        "name": "get_extraction_corrections",
        "description": """Get AI extraction corrections (learning data).

Shows where users corrected AI extractions.
Used to improve future extraction accuracy.

Returns correction type breakdown.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "field_path": {"type": "string", "description": "Filter by field"},
                "correction_type": {"type": "string", "description": "Filter by type"},
                "limit": {"type": "integer", "description": "Max results (default 50)"}
            },
            "required": []
        }
    },
    {
        "name": "log_extraction_correction",
        "description": """Log a user correction to an AI extraction (MUTATION).

Feeds the learning system to improve future extractions.

Fields:
- extraction_id: REQUIRED - Which extraction was wrong
- field_path: REQUIRED - Which field was corrected
- ai_value: What AI extracted
- user_value: REQUIRED - Correct value from user
- correction_type: value_wrong, field_missed, etc.
- page_number: Where in document
- source_quote: Relevant text from document

Example: AI extracted cap rate 5.5%, correct is 5.75%.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "extraction_id": {"type": "integer", "description": "Extraction being corrected"},
                "field_path": {"type": "string", "description": "Field corrected"},
                "ai_value": {"type": "string", "description": "What AI extracted"},
                "user_value": {"type": "string", "description": "Correct value"},
                "correction_type": {"type": "string", "description": "Type of correction"},
                "page_number": {"type": "integer", "description": "Page in document"},
                "reason": {"type": "string", "description": "Additional context"}
            },
            "required": ["extraction_id", "field_path", "user_value"]
        }
    },
    {
        "name": "get_knowledge_entities",
        "description": """Get knowledge entities from the knowledge graph.

Entities are: properties, people, companies, markets.
These are extracted and linked by AI from documents.

Filter by type, subtype, or search by name.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_id": {"type": "integer", "description": "Get specific entity"},
                "entity_type": {"type": "string", "description": "Type: property, person, company, market"},
                "entity_subtype": {"type": "string", "description": "Subtype filter"},
                "search": {"type": "string", "description": "Search by name"}
            },
            "required": []
        }
    },
    {
        "name": "get_knowledge_facts",
        "description": """Get knowledge facts from the knowledge graph.

Facts are discrete pieces of information with provenance.
Examples: "Peoria Lakes has_cap_rate 5.5%", "John Smith works_for ABC Dev".

Filter by entity, predicate, or confidence.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "fact_id": {"type": "integer", "description": "Get specific fact"},
                "entity_id": {"type": "integer", "description": "Filter by subject entity"},
                "predicate": {"type": "string", "description": "Filter by predicate"},
                "source_type": {"type": "string", "description": "Filter by source type"},
                "is_current": {"type": "boolean", "description": "Only current facts (default true)"},
                "min_confidence": {"type": "number", "description": "Minimum confidence (0-1)"}
            },
            "required": []
        }
    },
    {
        "name": "get_knowledge_insights",
        "description": """Get AI-discovered insights.

Insights are: anomalies, trends, opportunities, risks, benchmark deviations.
Each has severity (info, low, medium, high, critical).

Filter by type, severity, or acknowledged status.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "insight_id": {"type": "integer", "description": "Get specific insight"},
                "entity_id": {"type": "integer", "description": "Filter by subject entity"},
                "insight_type": {"type": "string", "description": "Type: anomaly, trend, opportunity, risk"},
                "severity": {"type": "string", "description": "Severity level"},
                "acknowledged": {"type": "boolean", "description": "Filter by acknowledged status"}
            },
            "required": []
        }
    },
    {
        "name": "acknowledge_insight",
        "description": """Acknowledge an AI insight (MUTATION).

Mark insights as reviewed and record your action.

Fields:
- insight_id: REQUIRED
- user_action: REQUIRED - accepted, rejected, needs_review, fixed
- notes: Optional notes on action taken

Example: Acknowledge cap rate anomaly as "fixed" after updating assumption.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "insight_id": {"type": "integer", "description": "Insight ID"},
                "user_action": {"type": "string", "description": "Action: accepted, rejected, needs_review, fixed"},
                "notes": {"type": "string", "description": "Notes on action"},
                "reason": {"type": "string", "description": "Reason for acknowledgment"}
            },
            "required": ["insight_id", "user_action"]
        }
    },
    # ─────────────────────────────────────────────────────────────────────────
    # Income Analysis Tools - Loss to Lease & Year 1 Buyer NOI
    # ─────────────────────────────────────────────────────────────────────────
    {
        "name": "analyze_loss_to_lease",
        "description": """Calculate Loss to Lease for a multifamily property.

Loss to Lease is the gap between current in-place rents and market rents.
This analysis helps understand how much rental upside exists in the property.

Two calculation methods:
- simple: Annual gap = (Market Rent - Current Rent) × 12 for all units
  Best when lease dates are unavailable or for quick analysis.

- time_weighted: Present value of rent shortfall based on lease expirations
  Accounts for the fact that below-market leases persist until they expire.
  More accurate but requires lease end dates.

Returns:
- Total current vs market rent (monthly and annual)
- Gap percentage (how far below market)
- Units below/at/above market
- Unit-level details (if include_details=true)
- Lease expiration schedule (for time_weighted)

Use this when:
- User asks about rental upside or loss to lease
- Comparing in-place rents to market
- Evaluating value-add opportunities
- Assessing lease-up potential after acquisition""",
        "input_schema": {
            "type": "object",
            "properties": {
                "method": {
                    "type": "string",
                    "enum": ["simple", "time_weighted"],
                    "description": "Calculation method: 'simple' for annual gap, 'time_weighted' for PV based on lease expirations"
                },
                "discount_rate": {
                    "type": "number",
                    "description": "Annual discount rate for time-weighted PV (default 0.08 = 8%)"
                },
                "include_details": {
                    "type": "boolean",
                    "description": "Include unit-level breakdown in response (default false)"
                },
                "include_schedule": {
                    "type": "boolean",
                    "description": "Include lease expiration schedule (default true for time_weighted)"
                }
            },
            "required": []
        }
    },
    {
        "name": "calculate_year1_buyer_noi",
        "description": """Calculate realistic Year 1 NOI for a buyer.

This bridges the gap between two misleading broker metrics:
- Broker "Current NOI" = Actual Rents + Actual Expenses (historical, backward-looking)
- Broker "Proforma NOI" = Market Rents + Projected Expenses (aspirational, may never materialize)

Year 1 Buyer NOI = Actual Rents + Projected Expenses (realistic Day 1 cash flow)

Key insight: Buyers inherit the rent roll (actual in-place rents) but face
new expenses (taxes reassess on purchase price, insurance reprices,
new management company, etc.)

Returns:
- Gross Potential Rent (actual rent roll annualized)
- Vacancy and credit loss deductions
- Effective Gross Income
- Operating expenses (from proforma or T-12)
- Net Operating Income
- Comparison to broker current/proforma NOI
- Loss to Lease summary (if available)
- Per-unit and per-SF metrics

Use this when:
- User asks "what will my actual NOI be?"
- Evaluating broker's proforma vs reality
- Underwriting acquisition cash flow
- Comparing asking price to realistic income""",
        "input_schema": {
            "type": "object",
            "properties": {
                "vacancy_rate": {
                    "type": "number",
                    "description": "Vacancy rate as decimal (default 0.05 = 5%)"
                },
                "credit_loss_rate": {
                    "type": "number",
                    "description": "Credit/bad debt loss rate as decimal (default 0.02 = 2%)"
                },
                "expense_scenario": {
                    "type": "string",
                    "enum": ["proforma", "t12", "default"],
                    "description": "Which expense scenario to use (default 'proforma')"
                },
                "include_loss_to_lease": {
                    "type": "boolean",
                    "description": "Include Loss to Lease analysis in results (default true)"
                }
            },
            "required": []
        }
    },
    {
        "name": "check_income_analysis_availability",
        "description": """Check if Loss to Lease and Year 1 Buyer NOI analyses are available.

Returns data availability status and recommendations:
- Whether rent roll has current and market rents
- Whether lease dates exist for time-weighted analysis
- Whether proforma/T-12 expenses exist
- Whether rent gap is material (>5%)
- Which analyses can be performed

Use this to determine what income analyses to offer the user.""",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
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

RENTAL COMPARABLES:
When asked to populate rental comps, comparables, or comp data from a document:
1. Use get_project_documents to find the document (look for recommended=True)
2. Use get_document_content with focus='rental_comps' to read the comp section
3. Parse ALL comparable properties and their unit types from the content
4. Use update_rental_comps to insert the comps into the database
5. Each comp needs: property_name, unit_type, bedrooms, bathrooms, avg_sqft, asking_rent
6. ALWAYS call update_rental_comps tool - don't just describe the comps, actually save them!

IMPORTANT: Use focus='rental_comps' when calling get_document_content to ensure the rental comparables section is included. Large documents may have comps near the end.

OPERATING EXPENSES:
When asked to populate operating expenses from a document:
1. Use get_document_content with focus='operating_expenses' to read the T-12/expense section
2. Parse the expense line items from the content
3. Use update_operating_expenses to insert the line items into the database
4. ALWAYS call update_operating_expenses tool - don't just describe expenses, save them!

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
        try:
            return anthropic.Anthropic(api_key=api_key, timeout=ANTHROPIC_TIMEOUT_SECONDS)
        except TypeError:
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

    # Add platform knowledge if user query relates to valuation methodology
    last_user_message = _get_last_user_message(messages)
    if last_user_message and _needs_platform_knowledge(last_user_message):
        pk_context = _get_platform_knowledge_context(
            query=last_user_message,
            property_type=project_type,
            max_chunks=5
        )
        if pk_context:
            full_system += pk_context
            logger.info("Platform knowledge context added to system prompt")

    # Add user knowledge if query benefits from past experience
    user_id = project_context.get('user_id')
    if last_user_message and user_id and _needs_user_knowledge(last_user_message):
        uk_context = _get_user_knowledge_context(
            query=last_user_message,
            user_id=user_id,
            project_id=project_context.get('project_id'),
            organization_id=project_context.get('organization_id'),
            property_type=project_type,
            market=project_context.get('market'),
            max_per_type=3
        )
        if uk_context:
            full_system += uk_context
            logger.info("User knowledge context added to system prompt")

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
