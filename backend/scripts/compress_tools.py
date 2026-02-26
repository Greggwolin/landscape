#!/usr/bin/env python3
"""
Compress LANDSCAPER_TOOLS definitions for the full-context agent refactor.

Compression rules:
- Description: first sentence only, max 100 chars
- Parameter descriptions: removed unless essential (enums, complex types)
- Keep: name, type, required, enum, minimum, maximum, items schema
- Remove: examples, field lists, workflow guidance, redundant prose
"""

import sys
import os
import re
import json
import textwrap

# Django setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.landscaper.ai_handler import LANDSCAPER_TOOLS


# Manual override descriptions for tools where first-sentence is bad
DESCRIPTION_OVERRIDES = {
    "update_project_field": "Update a single project field value.",
    "bulk_update_fields": "Update multiple project fields at once.",
    "get_cashflow_results": "Get cash flow / DCF assumptions and results.",
    "compute_cashflow_expression": "Evaluate a math expression against cash flow results.",
    "update_cashflow_assumption": "Update a cashflow/DCF assumption field. Always set confirm=true.",
    "get_project_fields": "Get current project field values from specified tables.",
    "get_field_schema": "Get the database schema for a project table.",
    "get_project_documents": "List all uploaded documents for this project.",
    "get_document_content": "Get extracted text content from a document.",
    "get_document_page": "Get a specific page from a document.",
    "get_document_assertions": "Get AI-extracted assertions from a document.",
    "get_document_media_summary": "Get summary of images/tables in a document.",
    "ingest_document": "Trigger AI extraction pipeline on an uploaded document.",
    "analyze_rent_roll_columns": "Analyze uploaded rent roll columns for mapping.",
    "confirm_column_mapping": "Confirm column mapping and extract rent roll data.",
    "compute_rent_roll_delta": "Compute differences between extracted and existing rent roll data.",
    "update_operating_expenses": "Create or update operating expense line items.",
    "update_rental_comps": "Bulk update rental comparable properties.",
    "update_project_contacts": "Update project contact assignments.",
    "get_acquisition": "Get acquisition/purchase details for this project.",
    "update_acquisition": "Update acquisition/purchase fields.",
    "get_revenue_rent": "Get rent revenue assumptions.",
    "update_revenue_rent": "Update rent revenue assumptions.",
    "get_revenue_other": "Get other income line items.",
    "update_revenue_other": "Update other income line items.",
    "get_vacancy_assumptions": "Get vacancy and collection loss assumptions.",
    "update_vacancy_assumptions": "Update vacancy and collection loss assumptions.",
    "get_unit_types": "Get unit type mix (floorplans) for this project.",
    "update_unit_types": "Create or update unit type definitions.",
    "get_units": "Get individual units with lease data.",
    "update_units": "Create or update individual units.",
    "delete_units": "Delete units. Requires confirmation phase.",
    "get_leases": "Get lease records for this project.",
    "update_leases": "Create or update lease records.",
    "get_sales_comparables": "Get sales comparable properties.",
    "update_sales_comparable": "Create or update a sales comparable.",
    "delete_sales_comparable": "Delete a sales comparable by ID.",
    "get_sales_comp_adjustments": "Get adjustment grid for sales comparables.",
    "update_sales_comp_adjustment": "Update a sales comp adjustment value.",
    "get_rental_comparables": "Get rental comparable properties.",
    "update_rental_comparable": "Create or update a rental comparable.",
    "delete_rental_comparable": "Delete a rental comparable by ID.",
    "get_loans": "Get loan/debt structure for this project.",
    "update_loan": "Create or update a loan record.",
    "delete_loan": "Delete a loan by ID.",
    "get_equity_structure": "Get equity structure (GP/LP splits, promote).",
    "update_equity_structure": "Update equity structure fields.",
    "get_waterfall_tiers": "Get equity waterfall tier definitions.",
    "update_waterfall_tiers": "Update equity waterfall tiers.",
    "get_budget_categories": "Get budget category tree.",
    "update_budget_category": "Create or update a budget category.",
    "get_budget_items": "Get budget line items with optional filters.",
    "update_budget_item": "Create or update a budget line item.",
    "delete_budget_item": "Delete a budget item by ID.",
    "get_areas": "Get area (level 1) containers for this project.",
    "update_area": "Create or update an area container.",
    "delete_area": "Delete an area container by ID.",
    "get_phases": "Get phase (level 2) containers for this project.",
    "update_phase": "Create or update a phase container.",
    "delete_phase": "Delete a phase container by ID.",
    "get_parcels": "Get parcel (level 3) containers for this project.",
    "update_parcel": "Create or update a parcel record.",
    "delete_parcel": "Delete a parcel by ID.",
    "get_milestones": "Get project milestones/timeline events.",
    "update_milestone": "Create or update a milestone.",
    "delete_milestone": "Delete a milestone by ID.",
    "get_land_use_families": "Get land use families (level 1 taxonomy).",
    "update_land_use_family": "Create or update a land use family.",
    "get_land_use_types": "Get land use types (level 2 taxonomy).",
    "update_land_use_type": "Create or update a land use type.",
    "get_residential_products": "Get residential products (level 3 taxonomy).",
    "update_residential_product": "Create or update a residential product.",
    "get_measures": "Get measure definitions (units of measurement).",
    "update_measure": "Create or update a measure definition.",
    "get_picklist_values": "Get picklist/dropdown values for a field.",
    "update_picklist_value": "Create or update a picklist value.",
    "delete_picklist_value": "Delete a picklist value by ID.",
    "get_benchmarks": "Get benchmark data (IREM, market, custom).",
    "update_benchmark": "Create or update a benchmark record.",
    "delete_benchmark": "Delete a benchmark by ID.",
    "get_cost_library_items": "Get cost library items for budgeting.",
    "update_cost_library_item": "Create or update a cost library item.",
    "delete_cost_library_item": "Delete a cost library item by ID.",
    "get_report_templates": "Get available report templates.",
    "get_dms_templates": "Get document management system templates.",
    "update_template": "Update a report or DMS template.",
    "get_cre_tenants": "Get commercial tenants for this project.",
    "update_cre_tenant": "Create or update a commercial tenant.",
    "delete_cre_tenant": "Delete a commercial tenant by ID.",
    "get_cre_spaces": "Get commercial spaces/suites for this project.",
    "update_cre_space": "Create or update a commercial space.",
    "delete_cre_space": "Delete a commercial space by ID.",
    "get_cre_leases": "Get commercial lease records.",
    "update_cre_lease": "Create or update a commercial lease.",
    "delete_cre_lease": "Delete a commercial lease by ID.",
    "get_cre_properties": "Get commercial property records.",
    "update_cre_property": "Create or update a commercial property.",
    "get_cre_rent_roll": "Get commercial rent roll summary.",
    "get_competitive_projects": "Get competitive/comparable development projects.",
    "update_competitive_project": "Create or update a competitive project.",
    "delete_competitive_project": "Delete a competitive project by ID.",
    "get_absorption_benchmarks": "Get absorption rate benchmarks.",
    "get_market_assumptions": "Get market growth and trend assumptions.",
    "update_market_assumptions": "Update market growth and trend assumptions.",
    "get_absorption_schedule": "Get lot/unit absorption schedule.",
    "update_absorption_schedule": "Create or update absorption schedule entries.",
    "delete_absorption_schedule": "Delete an absorption schedule entry.",
    "get_parcel_sale_events": "Get planned parcel sale events.",
    "update_parcel_sale_event": "Create or update a parcel sale event.",
    "delete_parcel_sale_event": "Delete a parcel sale event by ID.",
    "get_extraction_results": "Get document extraction results for review.",
    "update_extraction_result": "Accept or reject an extraction result.",
    "get_extraction_corrections": "Get user corrections to extraction results.",
    "log_extraction_correction": "Log a user correction to an extraction result.",
    "get_knowledge_entities": "Get knowledge graph entities for this project.",
    "get_knowledge_facts": "Get knowledge graph facts (subject-predicate-object).",
    "get_knowledge_insights": "Get AI-generated insights for this project.",
    "acknowledge_insight": "Mark an insight as acknowledged/dismissed.",
    "analyze_loss_to_lease": "Analyze loss-to-lease between contract and market rents.",
    "calculate_year1_buyer_noi": "Calculate Year 1 buyer NOI projection.",
    "check_income_analysis_availability": "Check what income analysis data is available.",
    "whatif_compute": "Apply a what-if adjustment to a field.",
    "whatif_compound": "Apply multiple what-if adjustments at once.",
    "whatif_reset": "Reset what-if adjustments (all or specific fields).",
    "whatif_attribute": "Attach a note/attribution to a what-if adjustment.",
    "whatif_status": "Get current what-if overlay status.",
    "scenario_save": "Save current what-if state as a named scenario.",
    "scenario_load": "Load a saved scenario into the what-if overlay.",
    "scenario_log_query": "Log a natural language scenario query for analytics.",
    "whatif_commit": "Commit all what-if adjustments to the database.",
    "whatif_commit_selective": "Commit specific what-if adjustments to the database.",
    "whatif_undo": "Undo the last what-if adjustment.",
    "scenario_replay": "Replay a saved scenario's adjustments step by step.",
    "scenario_compare": "Compare two scenarios side by side.",
    "scenario_diff": "Get detailed diff between two scenarios.",
    "scenario_branch": "Create a new scenario branching from an existing one.",
    "scenario_apply_cross_project": "Apply a scenario to a different project.",
    "get_kpi_definitions": "Get KPI definitions and thresholds.",
    "update_kpi_definitions": "Update KPI definitions and thresholds.",
    "ic_start_session": "Start an Investment Committee review session.",
    "ic_challenge_next": "Get the next IC challenge question.",
    "ic_respond_challenge": "Submit a response to an IC challenge.",
    "sensitivity_grid": "Run sensitivity analysis grid on two variables.",
    "query_platform_knowledge": "Search the platform knowledge base via RAG.",
    "search_irem_benchmarks": "Search IREM expense benchmarks by property type.",
    # Contact tools
    "search_cabinet_contacts": "Search contacts in the cabinet by name/company/email.",
    "get_project_contacts_v2": "Get all contacts assigned to this project with roles.",
    "get_contact_roles": "Get available contact role definitions.",
    "create_cabinet_contact": "Create a new contact in the cabinet.",
    "assign_contact_to_project": "Assign an existing contact to this project with a role.",
    "remove_contact_from_project": "Remove a contact's role assignment from this project.",
    "extract_and_save_contacts": "Extract contacts from document content and save to project.",
    # HBU tools
    "get_hbu_scenarios": "Get H&BU analysis scenarios for this project.",
    "create_hbu_scenario": "Create a new H&BU analysis scenario.",
    "update_hbu_scenario": "Update an existing H&BU scenario.",
    "compare_hbu_scenarios": "Compare and rank H&BU scenarios by productivity metric.",
    "generate_hbu_narrative": "Gather context for generating H&BU narratives.",
    "get_hbu_conclusion": "Get the maximally productive H&BU conclusion.",
    "add_hbu_comparable_use": "Add a comparable use to an H&BU scenario.",
    # Property attribute tools
    "get_property_attributes": "Get site and improvement attributes for this project.",
    "update_property_attributes": "Update property attributes (core fields and JSONB).",
    "get_attribute_definitions": "Get configurable property attribute definitions.",
    "update_site_attribute": "Update a single site attribute by code.",
    "update_improvement_attribute": "Update a single improvement attribute by code.",
    "calculate_remaining_economic_life": "Calculate remaining economic life and depreciation.",
    "get_zoning_info": "Get zoning, FAR, and site coverage data.",
    # Alpha feedback
    "log_alpha_feedback": "Log user feedback (bug, suggestion, question).",
    # Draft tools
    "create_analysis_draft": "Create a new analysis draft for conversational underwriting.",
    "update_analysis_draft": "Update an existing analysis draft with new inputs.",
    "run_draft_calculations": "Run financial calculations on a draft's inputs.",
    "convert_draft_to_project": "Convert a draft into a full Landscape project.",
}


def compress_description(name, desc):
    """Get compressed description for a tool."""
    if name in DESCRIPTION_OVERRIDES:
        return DESCRIPTION_OVERRIDES[name]
    if not desc:
        return ""
    desc = desc.strip()
    # First sentence
    match = re.match(r'^([^.!?\n]+[.!?])', desc)
    if match:
        return match.group(1).strip()
    # First line
    first_line = desc.split('\n')[0].strip()
    if len(first_line) > 100:
        first_line = first_line[:97] + "..."
    return first_line


def compress_param(name, pdef):
    """Compress a single parameter definition."""
    result = {}

    # Always keep type
    if "type" in pdef:
        result["type"] = pdef["type"]

    # Always keep enum
    if "enum" in pdef:
        result["enum"] = pdef["enum"]

    # Keep constraints
    for k in ("minimum", "maximum"):
        if k in pdef:
            result[k] = pdef[k]

    # Keep items for arrays (compressed)
    if "items" in pdef:
        result["items"] = compress_items(pdef["items"])

    # Keep additionalProperties for objects
    if pdef.get("type") == "object" and "additionalProperties" in pdef:
        result["additionalProperties"] = pdef["additionalProperties"]

    # Only keep description if it contains essential info not in the name
    # (mainly for complex parameters where the name isn't self-explanatory)

    return result


def compress_items(items):
    """Compress array items schema."""
    if not isinstance(items, dict):
        return items

    result = {}
    if "type" in items:
        result["type"] = items["type"]

    if "properties" in items:
        props = {}
        for pname, pdef in items["properties"].items():
            p = {}
            if "type" in pdef:
                p["type"] = pdef["type"]
            if "enum" in pdef:
                p["enum"] = pdef["enum"]
            if "items" in pdef:
                p["items"] = compress_items(pdef["items"])
            props[pname] = p
        result["properties"] = props

    if "required" in items:
        result["required"] = items["required"]

    return result


def compress_tool(tool):
    """Compress a single tool definition."""
    name = tool["name"]
    desc = compress_description(name, tool.get("description", ""))
    schema = tool.get("input_schema", {})

    compressed_schema = {"type": "object"}

    if "properties" in schema and schema["properties"]:
        compressed_props = {}
        for pname, pdef in schema["properties"].items():
            compressed_props[pname] = compress_param(pname, pdef)
        compressed_schema["properties"] = compressed_props
    else:
        compressed_schema["properties"] = {}

    # Only include required if non-empty
    if schema.get("required"):
        compressed_schema["required"] = schema["required"]

    return {
        "name": name,
        "description": desc,
        "input_schema": compressed_schema,
    }


def format_dict(d, indent=0):
    """Format a dict as Python code."""
    pad = "    " * indent
    inner_pad = "    " * (indent + 1)

    # For simple dicts (no nested dicts/lists), use single line if short enough
    simple = all(not isinstance(v, (dict, list)) for v in d.values())
    if simple and len(str(d)) < 80:
        pairs = []
        for k, v in d.items():
            pairs.append(f'"{k}": {json.dumps(v)}')
        return "{" + ", ".join(pairs) + "}"

    lines = ["{"]
    for k, v in d.items():
        if isinstance(v, dict):
            formatted_v = format_dict(v, indent + 1)
            lines.append(f'{inner_pad}"{k}": {formatted_v},')
        elif isinstance(v, list):
            formatted_v = format_list(v, indent + 1)
            lines.append(f'{inner_pad}"{k}": {formatted_v},')
        else:
            lines.append(f'{inner_pad}"{k}": {json.dumps(v)},')
    lines.append(f"{pad}}}")
    return "\n".join(lines)


def format_list(lst, indent=0):
    """Format a list as Python code."""
    if not lst:
        return "[]"

    # Simple list of strings
    if all(isinstance(x, str) for x in lst):
        if len(str(lst)) < 80:
            return json.dumps(lst)

    pad = "    " * indent
    inner_pad = "    " * (indent + 1)
    lines = ["["]
    for item in lst:
        if isinstance(item, dict):
            formatted = format_dict(item, indent + 1)
            lines.append(f"{inner_pad}{formatted},")
        else:
            lines.append(f"{inner_pad}{json.dumps(item)},")
    lines.append(f"{pad}]")
    return "\n".join(lines)


def main():
    compressed = [compress_tool(t) for t in LANDSCAPER_TOOLS]

    # Count tokens (rough estimate: 1 token ≈ 4 chars)
    total_chars = sum(len(json.dumps(t)) for t in compressed)
    est_tokens = total_chars // 4

    # Output as Python
    output_lines = [
        '"""',
        'Compressed Landscaper tool schemas.',
        '',
        'Generated by scripts/compress_tools.py — DO NOT EDIT MANUALLY.',
        f'Tool count: {len(compressed)}',
        f'Estimated tokens: ~{est_tokens:,}',
        '"""',
        '',
        '',
        'LANDSCAPER_TOOLS = [',
    ]

    for t in compressed:
        name = t["name"]
        desc = t["description"]
        schema = t["input_schema"]

        output_lines.append(f'    {{')
        output_lines.append(f'        "name": "{name}",')
        output_lines.append(f'        "description": {json.dumps(desc)},')

        # Format input_schema
        schema_str = format_dict(schema, 2)
        output_lines.append(f'        "input_schema": {schema_str},')
        output_lines.append(f'    }},')

    output_lines.append(']')
    output_lines.append('')

    result = '\n'.join(output_lines)

    # Fix JSON booleans/null to Python True/False/None
    result = result.replace(': true,', ': True,')
    result = result.replace(': true}', ': True}')
    result = result.replace(': false,', ': False,')
    result = result.replace(': false}', ': False}')
    result = result.replace(': null,', ': None,')
    result = result.replace(': null}', ': None}')

    # Write to file
    output_path = os.path.join(os.path.dirname(__file__), '..', 'apps', 'landscaper', 'tool_schemas.py')
    with open(output_path, 'w') as f:
        f.write(result)

    print(f"Compressed {len(compressed)} tools")
    print(f"Output: {output_path}")
    print(f"Total chars: {total_chars:,}")
    print(f"Estimated tokens: ~{est_tokens:,}")

    # Also print original size for comparison
    original_chars = sum(len(json.dumps(t)) for t in LANDSCAPER_TOOLS)
    original_tokens = original_chars // 4
    print(f"Original chars: {original_chars:,}")
    print(f"Original tokens: ~{original_tokens:,}")
    print(f"Compression ratio: {total_chars/original_chars:.1%}")


if __name__ == "__main__":
    main()
