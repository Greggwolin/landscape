from apps.landscaper.tool_registry import get_tools_for_page
from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS


def test_budget_rollup_schema_advertises_category_breakdowns():
    schema = next(tool for tool in LANDSCAPER_TOOLS if tool["name"] == "get_budget_rollup")

    description = schema["description"].lower()

    assert "budget category rollup" in description
    assert "budget by category" in description
    assert "biggest budget categories" in description
    assert "get_budget_items" in description


def test_budget_rollup_is_gated_for_land_and_income_property_projects():
    land_tools = get_tools_for_page("budget", project_type_code="land")
    income_tools = get_tools_for_page("budget", project_type_code="mf")

    assert "get_budget_rollup" in land_tools
    assert "get_budget_rollup" in income_tools
