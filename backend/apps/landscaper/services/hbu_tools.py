"""
H&BU (Highest & Best Use) Tools for Landscaper AI

Provides AI tools for generating and managing Highest & Best Use analyses.
Implements the four-test framework:
1. Legally Permissible - Zoning, entitlements, restrictions
2. Physically Possible - Site constraints, size, topography, utilities
3. Economically Feasible - Positive return above land cost
4. Maximally Productive - Highest residual value among feasible uses
"""

import json
import logging
from typing import Dict, List, Any, Optional
from decimal import Decimal
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


# =============================================================================
# H&BU Tool Definitions (for LANDSCAPER_TOOLS)
# =============================================================================

HBU_TOOLS = [
    {
        "name": "get_hbu_scenarios",
        "description": """Get all H&BU (Highest & Best Use) analysis scenarios for this project.

Returns scenarios including:
- scenario_name, scenario_type (as_vacant, as_improved, alternative)
- Four test results: legal_permissible, physical_possible, economic_feasible
- Economic metrics: development_cost, stabilized_value, residual_land_value, irr_pct
- Ranking: is_maximally_productive, productivity_rank
- Conclusion: conclusion_use_type, conclusion_summary

Use this to understand the current H&BU analysis state before creating or updating scenarios.
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "scenario_type": {
                    "type": "string",
                    "enum": ["as_vacant", "as_improved", "alternative"],
                    "description": "Filter by scenario type"
                }
            },
            "required": []
        }
    },
    {
        "name": "create_hbu_scenario",
        "description": """Create a new H&BU analysis scenario.

Scenario types:
- as_vacant: Analyzes the site as if vacant (no improvements)
- as_improved: Analyzes with current or proposed improvements
- alternative: Alternative use for feasibility comparison

Required fields:
- scenario_name: Descriptive name (e.g., "200-Unit Garden Apartments")
- scenario_type: One of the types above

Optional fields for each test:
- legal_permissible, legal_zoning_code, legal_narrative
- physical_possible, physical_narrative
- economic_feasible, economic_development_cost, economic_stabilized_value, economic_residual_land_value, economic_irr_pct
- conclusion_use_type, conclusion_density, conclusion_summary

Example: "Create an H&BU scenario for 150-unit townhome development"
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "scenario_name": {
                    "type": "string",
                    "description": "Descriptive name for this scenario"
                },
                "scenario_type": {
                    "type": "string",
                    "enum": ["as_vacant", "as_improved", "alternative"],
                    "description": "Type of scenario"
                },
                "legal_permissible": {
                    "type": "boolean",
                    "description": "Does this use pass the legally permissible test?"
                },
                "legal_zoning_code": {
                    "type": "string",
                    "description": "Current zoning code (e.g., 'R-3', 'C-2')"
                },
                "legal_permitted_uses": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of permitted uses under current zoning"
                },
                "legal_requires_variance": {
                    "type": "boolean",
                    "description": "Does this use require a zoning variance?"
                },
                "legal_variance_type": {
                    "type": "string",
                    "description": "Type of variance required if any"
                },
                "legal_narrative": {
                    "type": "string",
                    "description": "Narrative explaining legal permissibility"
                },
                "physical_possible": {
                    "type": "boolean",
                    "description": "Does this use pass the physically possible test?"
                },
                "physical_site_adequate": {
                    "type": "boolean",
                    "description": "Is site size adequate?"
                },
                "physical_topography_suitable": {
                    "type": "boolean",
                    "description": "Is topography suitable?"
                },
                "physical_utilities_available": {
                    "type": "boolean",
                    "description": "Are utilities available?"
                },
                "physical_access_adequate": {
                    "type": "boolean",
                    "description": "Is access adequate?"
                },
                "physical_constraints": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "List of physical constraints"
                },
                "physical_narrative": {
                    "type": "string",
                    "description": "Narrative explaining physical possibility"
                },
                "economic_feasible": {
                    "type": "boolean",
                    "description": "Does this use pass the economically feasible test?"
                },
                "economic_development_cost": {
                    "type": "number",
                    "description": "Total development cost"
                },
                "economic_stabilized_value": {
                    "type": "number",
                    "description": "Stabilized value upon completion"
                },
                "economic_residual_land_value": {
                    "type": "number",
                    "description": "Residual land value (stabilized - development cost - profit)"
                },
                "economic_profit_margin_pct": {
                    "type": "number",
                    "description": "Profit margin as percentage"
                },
                "economic_irr_pct": {
                    "type": "number",
                    "description": "Internal rate of return as percentage"
                },
                "economic_narrative": {
                    "type": "string",
                    "description": "Narrative explaining economic feasibility"
                },
                "conclusion_use_type": {
                    "type": "string",
                    "description": "The use type (e.g., 'Garden Apartments', 'Townhomes')"
                },
                "conclusion_density": {
                    "type": "string",
                    "description": "Proposed density (e.g., '24 DU/AC', '150 units')"
                },
                "conclusion_summary": {
                    "type": "string",
                    "description": "Brief summary of conclusion"
                }
            },
            "required": ["scenario_name", "scenario_type"]
        }
    },
    {
        "name": "update_hbu_scenario",
        "description": """Update an existing H&BU analysis scenario.

Use this to update test results, economic metrics, or narratives for a scenario.

Requires hbu_id to identify the scenario to update.
All other fields are optional - only provided fields will be updated.
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "hbu_id": {
                    "type": "integer",
                    "description": "ID of the H&BU scenario to update"
                },
                "scenario_name": {"type": "string"},
                "legal_permissible": {"type": "boolean"},
                "legal_zoning_code": {"type": "string"},
                "legal_permitted_uses": {"type": "array", "items": {"type": "string"}},
                "legal_requires_variance": {"type": "boolean"},
                "legal_variance_type": {"type": "string"},
                "legal_narrative": {"type": "string"},
                "physical_possible": {"type": "boolean"},
                "physical_site_adequate": {"type": "boolean"},
                "physical_topography_suitable": {"type": "boolean"},
                "physical_utilities_available": {"type": "boolean"},
                "physical_access_adequate": {"type": "boolean"},
                "physical_constraints": {"type": "array", "items": {"type": "object"}},
                "physical_narrative": {"type": "string"},
                "economic_feasible": {"type": "boolean"},
                "economic_development_cost": {"type": "number"},
                "economic_stabilized_value": {"type": "number"},
                "economic_residual_land_value": {"type": "number"},
                "economic_profit_margin_pct": {"type": "number"},
                "economic_irr_pct": {"type": "number"},
                "economic_narrative": {"type": "string"},
                "conclusion_use_type": {"type": "string"},
                "conclusion_density": {"type": "string"},
                "conclusion_summary": {"type": "string"},
                "conclusion_full_narrative": {"type": "string"},
                "status": {
                    "type": "string",
                    "enum": ["draft", "ai_generated", "user_reviewed", "final"]
                }
            },
            "required": ["hbu_id"]
        }
    },
    {
        "name": "compare_hbu_scenarios",
        "description": """Compare H&BU scenarios and determine the maximally productive use.

Ranks all economically feasible scenarios (excluding as_vacant) by the specified metric.
The highest-ranked scenario is marked as the H&BU conclusion.

Metrics:
- residual_land_value: Highest residual land value (default)
- irr: Highest internal rate of return
- profit_margin: Highest profit margin percentage

Returns rankings with metric values and identifies the winner.
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "comparison_metric": {
                    "type": "string",
                    "enum": ["residual_land_value", "irr", "profit_margin"],
                    "description": "Metric to use for comparison (default: residual_land_value)"
                }
            },
            "required": []
        }
    },
    {
        "name": "generate_hbu_narrative",
        "description": """Generate professional appraisal-style narratives for an H&BU scenario.

Uses project data, zoning information, and economic analysis to draft narratives for:
- Legal permissibility analysis
- Physical possibility analysis
- Economic feasibility analysis
- Conclusion summary

This tool gathers context from the project and generates draft narratives.
The scenario must already exist - use create_hbu_scenario first.
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "hbu_id": {
                    "type": "integer",
                    "description": "ID of the H&BU scenario to generate narratives for"
                }
            },
            "required": ["hbu_id"]
        }
    },
    {
        "name": "get_hbu_conclusion",
        "description": """Get the H&BU conclusion (maximally productive scenario) for this project.

Returns the scenario marked as is_maximally_productive=true, which represents
the final H&BU determination for the property.

If no conclusion has been set, returns an error suggesting to run compare_hbu_scenarios.
""",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "add_hbu_comparable_use",
        "description": """Add a comparable use to an H&BU scenario for feasibility comparison.

Use this when analyzing multiple potential uses within a single H&BU analysis.
Each comparable use is evaluated against the four tests.

Example uses to add:
- "200-Unit Garden Apartments at 24 DU/AC"
- "150-Unit Townhomes at 12 DU/AC"
- "Office Development at 0.5 FAR"
""",
        "input_schema": {
            "type": "object",
            "properties": {
                "hbu_id": {
                    "type": "integer",
                    "description": "H&BU analysis to add this use to"
                },
                "use_name": {
                    "type": "string",
                    "description": "Name of the use (e.g., '200-Unit Garden Apartments')"
                },
                "use_category": {
                    "type": "string",
                    "description": "Category: Residential, Commercial, Industrial, Mixed-Use"
                },
                "is_legally_permissible": {"type": "boolean"},
                "is_physically_possible": {"type": "boolean"},
                "is_economically_feasible": {"type": "boolean"},
                "proposed_density": {
                    "type": "string",
                    "description": "Proposed density (e.g., '24 DU/AC', '0.5 FAR')"
                },
                "development_cost": {"type": "number"},
                "stabilized_value": {"type": "number"},
                "residual_land_value": {"type": "number"},
                "irr_pct": {"type": "number"},
                "notes": {"type": "string"}
            },
            "required": ["hbu_id", "use_name"]
        }
    }
]


# =============================================================================
# Tool Handler Functions
# =============================================================================

def handle_get_hbu_scenarios(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get all H&BU scenarios for a project."""
    scenario_type = tool_input.get('scenario_type')

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT
                    hbu_id,
                    scenario_name,
                    scenario_type,
                    legal_permissible,
                    legal_zoning_code,
                    legal_narrative,
                    physical_possible,
                    physical_narrative,
                    economic_feasible,
                    economic_development_cost,
                    economic_stabilized_value,
                    economic_residual_land_value,
                    economic_profit_margin_pct,
                    economic_irr_pct,
                    economic_narrative,
                    is_maximally_productive,
                    productivity_rank,
                    productivity_metric,
                    conclusion_use_type,
                    conclusion_density,
                    conclusion_summary,
                    status,
                    updated_at
                FROM landscape.tbl_hbu_analysis
                WHERE project_id = %s
            """
            params = [project_id]

            if scenario_type:
                sql += " AND scenario_type = %s"
                params.append(scenario_type)

            sql += " ORDER BY productivity_rank NULLS LAST, scenario_name"

            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            scenarios = []
            for row in cursor.fetchall():
                scenario = dict(zip(columns, row))
                # Convert Decimal to float for JSON serialization
                for key in ['economic_development_cost', 'economic_stabilized_value',
                            'economic_residual_land_value', 'economic_profit_margin_pct',
                            'economic_irr_pct']:
                    if scenario.get(key) is not None:
                        scenario[key] = float(scenario[key])
                scenarios.append(scenario)

        # Summary stats
        summary = {
            'total_scenarios': len(scenarios),
            'feasible_count': sum(1 for s in scenarios if s.get('economic_feasible')),
            'has_conclusion': any(s.get('is_maximally_productive') for s in scenarios),
        }

        return {
            'success': True,
            'scenarios': scenarios,
            'summary': summary
        }
    except Exception as e:
        logger.error(f"Error getting H&BU scenarios: {e}")
        return {'success': False, 'error': str(e)}


def handle_create_hbu_scenario(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Create a new H&BU scenario."""
    scenario_name = tool_input.get('scenario_name', '').strip()
    scenario_type = tool_input.get('scenario_type')

    if not scenario_name:
        return {'success': False, 'error': 'scenario_name is required'}
    if scenario_type not in ('as_vacant', 'as_improved', 'alternative'):
        return {'success': False, 'error': 'scenario_type must be as_vacant, as_improved, or alternative'}

    try:
        with connection.cursor() as cursor:
            # Build insert with provided fields
            fields = ['project_id', 'scenario_name', 'scenario_type', 'status']
            values = [project_id, scenario_name, scenario_type, 'draft']
            placeholders = ['%s', '%s', '%s', '%s']

            # Add optional fields if provided
            optional_fields = [
                'legal_permissible', 'legal_zoning_code', 'legal_permitted_uses',
                'legal_requires_variance', 'legal_variance_type', 'legal_narrative',
                'physical_possible', 'physical_site_adequate', 'physical_topography_suitable',
                'physical_utilities_available', 'physical_access_adequate',
                'physical_constraints', 'physical_narrative',
                'economic_feasible', 'economic_development_cost', 'economic_stabilized_value',
                'economic_residual_land_value', 'economic_profit_margin_pct',
                'economic_irr_pct', 'economic_narrative',
                'conclusion_use_type', 'conclusion_density', 'conclusion_summary'
            ]

            for field in optional_fields:
                if field in tool_input and tool_input[field] is not None:
                    fields.append(field)
                    value = tool_input[field]
                    # Convert lists/dicts to JSON
                    if isinstance(value, (list, dict)):
                        value = json.dumps(value)
                    values.append(value)
                    placeholders.append('%s')

            sql = f"""
                INSERT INTO landscape.tbl_hbu_analysis ({', '.join(fields)})
                VALUES ({', '.join(placeholders)})
                RETURNING hbu_id
            """

            cursor.execute(sql, values)
            hbu_id = cursor.fetchone()[0]

        return {
            'success': True,
            'hbu_id': hbu_id,
            'message': f'Created H&BU scenario "{scenario_name}" (ID: {hbu_id})'
        }
    except Exception as e:
        logger.error(f"Error creating H&BU scenario: {e}")
        return {'success': False, 'error': str(e)}


def handle_update_hbu_scenario(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Update an existing H&BU scenario."""
    hbu_id = tool_input.get('hbu_id')

    if not hbu_id:
        return {'success': False, 'error': 'hbu_id is required'}

    try:
        with connection.cursor() as cursor:
            # Verify ownership
            cursor.execute("""
                SELECT scenario_name FROM landscape.tbl_hbu_analysis
                WHERE hbu_id = %s AND project_id = %s
            """, [hbu_id, project_id])
            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'H&BU scenario {hbu_id} not found for this project'}

            # Build update
            updates = []
            values = []

            updatable_fields = [
                'scenario_name', 'legal_permissible', 'legal_zoning_code',
                'legal_permitted_uses', 'legal_requires_variance', 'legal_variance_type',
                'legal_narrative', 'physical_possible', 'physical_site_adequate',
                'physical_topography_suitable', 'physical_utilities_available',
                'physical_access_adequate', 'physical_constraints', 'physical_narrative',
                'economic_feasible', 'economic_development_cost', 'economic_stabilized_value',
                'economic_residual_land_value', 'economic_profit_margin_pct',
                'economic_irr_pct', 'economic_narrative', 'economic_feasibility_threshold',
                'productivity_narrative', 'conclusion_use_type', 'conclusion_density',
                'conclusion_summary', 'conclusion_full_narrative', 'status'
            ]

            for field in updatable_fields:
                if field in tool_input and tool_input[field] is not None:
                    updates.append(f"{field} = %s")
                    value = tool_input[field]
                    if isinstance(value, (list, dict)):
                        value = json.dumps(value)
                    values.append(value)

            if not updates:
                return {'success': False, 'error': 'No fields provided to update'}

            # Add updated_at
            updates.append("updated_at = CURRENT_TIMESTAMP")

            sql = f"""
                UPDATE landscape.tbl_hbu_analysis
                SET {', '.join(updates)}
                WHERE hbu_id = %s AND project_id = %s
            """
            values.extend([hbu_id, project_id])

            cursor.execute(sql, values)

        return {
            'success': True,
            'hbu_id': hbu_id,
            'message': f'Updated H&BU scenario {hbu_id}'
        }
    except Exception as e:
        logger.error(f"Error updating H&BU scenario: {e}")
        return {'success': False, 'error': str(e)}


def handle_compare_hbu_scenarios(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Compare and rank H&BU scenarios."""
    metric = tool_input.get('comparison_metric', 'residual_land_value')

    if metric not in ('residual_land_value', 'irr', 'profit_margin'):
        metric = 'residual_land_value'

    # Map metric to field
    metric_field = {
        'residual_land_value': 'economic_residual_land_value',
        'irr': 'economic_irr_pct',
        'profit_margin': 'economic_profit_margin_pct'
    }[metric]

    try:
        with connection.cursor() as cursor:
            # Get feasible scenarios (excluding as_vacant)
            cursor.execute(f"""
                SELECT hbu_id, scenario_name, scenario_type, {metric_field}
                FROM landscape.tbl_hbu_analysis
                WHERE project_id = %s
                  AND economic_feasible = true
                  AND scenario_type != 'as_vacant'
                  AND {metric_field} IS NOT NULL
                ORDER BY {metric_field} DESC
            """, [project_id])

            scenarios = cursor.fetchall()

            if not scenarios:
                return {
                    'success': False,
                    'error': 'No economically feasible scenarios to compare. Create scenarios with economic_feasible=true first.'
                }

            # Reset all rankings
            cursor.execute("""
                UPDATE landscape.tbl_hbu_analysis
                SET is_maximally_productive = false,
                    productivity_rank = NULL,
                    productivity_metric = NULL
                WHERE project_id = %s
            """, [project_id])

            # Apply new rankings
            rankings = []
            for rank, (hbu_id, name, stype, value) in enumerate(scenarios, 1):
                cursor.execute("""
                    UPDATE landscape.tbl_hbu_analysis
                    SET is_maximally_productive = %s,
                        productivity_rank = %s,
                        productivity_metric = %s
                    WHERE hbu_id = %s
                """, [rank == 1, rank, metric, hbu_id])

                rankings.append({
                    'rank': rank,
                    'hbu_id': hbu_id,
                    'scenario_name': name,
                    'scenario_type': stype,
                    'metric_value': float(value) if value else 0
                })

            winner = rankings[0] if rankings else None

        return {
            'success': True,
            'comparison_metric': metric,
            'rankings': rankings,
            'winner': winner,
            'message': f'Ranked {len(rankings)} scenarios by {metric}. Winner: {winner["scenario_name"] if winner else "None"}'
        }
    except Exception as e:
        logger.error(f"Error comparing H&BU scenarios: {e}")
        return {'success': False, 'error': str(e)}


def handle_generate_hbu_narrative(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Generate narrative context for H&BU analysis (returns context for LLM to use)."""
    hbu_id = tool_input.get('hbu_id')

    if not hbu_id:
        return {'success': False, 'error': 'hbu_id is required'}

    try:
        with connection.cursor() as cursor:
            # Get scenario details
            cursor.execute("""
                SELECT h.*, p.project_name, p.project_address, p.city, p.state,
                       p.acres_gross, p.current_zoning, p.proposed_zoning,
                       p.project_type_code, p.property_subtype
                FROM landscape.tbl_hbu_analysis h
                JOIN landscape.tbl_project p ON p.project_id = h.project_id
                WHERE h.hbu_id = %s AND h.project_id = %s
            """, [hbu_id, project_id])

            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()

            if not row:
                return {'success': False, 'error': f'H&BU scenario {hbu_id} not found'}

            scenario = dict(zip(columns, row))

            # Get income approach data if available
            cursor.execute("""
                SELECT selected_cap_rate, direct_cap_value, dcf_value
                FROM landscape.tbl_income_approach
                WHERE project_id = %s
            """, [project_id])
            income_row = cursor.fetchone()
            income_data = None
            if income_row:
                income_data = {
                    'cap_rate': float(income_row[0]) if income_row[0] else None,
                    'direct_cap_value': float(income_row[1]) if income_row[1] else None,
                    'dcf_value': float(income_row[2]) if income_row[2] else None
                }

            # Get cost approach data if available
            cursor.execute("""
                SELECT total_land_value, total_replacement_cost, indicated_value
                FROM landscape.tbl_cost_approach
                WHERE project_id = %s
            """, [project_id])
            cost_row = cursor.fetchone()
            cost_data = None
            if cost_row:
                cost_data = {
                    'land_value': float(cost_row[0]) if cost_row[0] else None,
                    'replacement_cost': float(cost_row[1]) if cost_row[1] else None,
                    'indicated_value': float(cost_row[2]) if cost_row[2] else None
                }

        # Build context for narrative generation
        context = {
            'project': {
                'name': scenario.get('project_name'),
                'address': scenario.get('project_address'),
                'city': scenario.get('city'),
                'state': scenario.get('state'),
                'acres': float(scenario.get('acres_gross')) if scenario.get('acres_gross') else None,
                'current_zoning': scenario.get('current_zoning'),
                'proposed_zoning': scenario.get('proposed_zoning'),
                'property_type': scenario.get('project_type_code'),
                'subtype': scenario.get('property_subtype'),
            },
            'scenario': {
                'name': scenario.get('scenario_name'),
                'type': scenario.get('scenario_type'),
                'legal_zoning_code': scenario.get('legal_zoning_code'),
                'legal_permissible': scenario.get('legal_permissible'),
                'physical_possible': scenario.get('physical_possible'),
                'economic_feasible': scenario.get('economic_feasible'),
                'development_cost': float(scenario.get('economic_development_cost')) if scenario.get('economic_development_cost') else None,
                'stabilized_value': float(scenario.get('economic_stabilized_value')) if scenario.get('economic_stabilized_value') else None,
                'residual_land_value': float(scenario.get('economic_residual_land_value')) if scenario.get('economic_residual_land_value') else None,
                'irr': float(scenario.get('economic_irr_pct')) if scenario.get('economic_irr_pct') else None,
            },
            'income_approach': income_data,
            'cost_approach': cost_data,
        }

        return {
            'success': True,
            'hbu_id': hbu_id,
            'context': context,
            'message': 'Context gathered for narrative generation. Use this data to draft professional H&BU narratives.'
        }
    except Exception as e:
        logger.error(f"Error generating H&BU narrative context: {e}")
        return {'success': False, 'error': str(e)}


def handle_get_hbu_conclusion(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get the H&BU conclusion for this project."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    hbu_id,
                    scenario_name,
                    scenario_type,
                    legal_permissible,
                    legal_zoning_code,
                    legal_narrative,
                    physical_possible,
                    physical_narrative,
                    economic_feasible,
                    economic_development_cost,
                    economic_stabilized_value,
                    economic_residual_land_value,
                    economic_irr_pct,
                    economic_narrative,
                    productivity_metric,
                    productivity_narrative,
                    conclusion_use_type,
                    conclusion_density,
                    conclusion_summary,
                    conclusion_full_narrative,
                    status
                FROM landscape.tbl_hbu_analysis
                WHERE project_id = %s AND is_maximally_productive = true
                ORDER BY productivity_rank
                LIMIT 1
            """, [project_id])

            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()

            if not row:
                return {
                    'success': False,
                    'error': 'No H&BU conclusion set. Use compare_hbu_scenarios to determine the maximally productive use.'
                }

            conclusion = dict(zip(columns, row))

            # Convert Decimals
            for key in ['economic_development_cost', 'economic_stabilized_value',
                        'economic_residual_land_value', 'economic_irr_pct']:
                if conclusion.get(key) is not None:
                    conclusion[key] = float(conclusion[key])

        return {
            'success': True,
            'conclusion': conclusion
        }
    except Exception as e:
        logger.error(f"Error getting H&BU conclusion: {e}")
        return {'success': False, 'error': str(e)}


def handle_add_hbu_comparable_use(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Add a comparable use to an H&BU scenario."""
    hbu_id = tool_input.get('hbu_id')
    use_name = tool_input.get('use_name', '').strip()

    if not hbu_id:
        return {'success': False, 'error': 'hbu_id is required'}
    if not use_name:
        return {'success': False, 'error': 'use_name is required'}

    try:
        with connection.cursor() as cursor:
            # Verify H&BU belongs to this project
            cursor.execute("""
                SELECT scenario_name FROM landscape.tbl_hbu_analysis
                WHERE hbu_id = %s AND project_id = %s
            """, [hbu_id, project_id])
            if not cursor.fetchone():
                return {'success': False, 'error': f'H&BU scenario {hbu_id} not found for this project'}

            # Build insert
            fields = ['hbu_id', 'use_name']
            values = [hbu_id, use_name]
            placeholders = ['%s', '%s']

            optional_fields = [
                'use_category', 'is_legally_permissible', 'is_physically_possible',
                'is_economically_feasible', 'proposed_density', 'development_cost',
                'stabilized_value', 'residual_land_value', 'irr_pct', 'notes'
            ]

            for field in optional_fields:
                if field in tool_input and tool_input[field] is not None:
                    fields.append(field)
                    values.append(tool_input[field])
                    placeholders.append('%s')

            sql = f"""
                INSERT INTO landscape.tbl_hbu_comparable_use ({', '.join(fields)})
                VALUES ({', '.join(placeholders)})
                RETURNING comparable_use_id
            """

            cursor.execute(sql, values)
            comparable_use_id = cursor.fetchone()[0]

        return {
            'success': True,
            'comparable_use_id': comparable_use_id,
            'message': f'Added comparable use "{use_name}" to H&BU analysis {hbu_id}'
        }
    except Exception as e:
        logger.error(f"Error adding H&BU comparable use: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# Tool Registry
# =============================================================================

HBU_TOOL_HANDLERS = {
    'get_hbu_scenarios': handle_get_hbu_scenarios,
    'create_hbu_scenario': handle_create_hbu_scenario,
    'update_hbu_scenario': handle_update_hbu_scenario,
    'compare_hbu_scenarios': handle_compare_hbu_scenarios,
    'generate_hbu_narrative': handle_generate_hbu_narrative,
    'get_hbu_conclusion': handle_get_hbu_conclusion,
    'add_hbu_comparable_use': handle_add_hbu_comparable_use,
}
