from apps.landscaper.tool_registry import get_tools_for_page
from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS


def test_budget_rollup_schema_advertises_category_breakdowns():
    schema = next(tool for tool in LANDSCAPER_TOOLS if tool["name"] == "get_budget_rollup")

    description = schema["description"].lower()

    assert "budget rollup" in description
    assert "cost category" in description
    assert "budget by category" in description
    assert "percent of total" in description
    assert "top-two concentration" in description
    assert "biggest budget categories" in description
    assert "get_budget_items" in description


def test_budget_rollup_schema_advertises_the_hierarchy_grouping():
    """The level rollup has to be FINDABLE, or the model never asks for it.

    A budget line can hang off any level, so "budget by phase" must reach the
    same tool rather than being answered from line items the model groups
    itself. The rolling-up behaviour is advertised too: a phase total that
    includes its parcel-level lines is the whole point.
    """
    schema = next(tool for tool in LANDSCAPER_TOOLS if tool["name"] == "get_budget_rollup")

    description = schema["description"].lower()
    properties = schema["input_schema"]["properties"]

    assert "budget by phase" in description
    assert "rolls deeper lines up" in description
    assert properties["group_by"]["enum"] == ["category", "level"]
    assert properties["level"]["enum"] == [1, 2, 3]


def test_budget_rollup_is_gated_for_land_and_income_property_projects():
    land_tools = get_tools_for_page("budget", project_type_code="land")
    income_tools = get_tools_for_page("budget", project_type_code="mf")

    assert "get_budget_rollup" in land_tools
    assert "get_budget_rollup" in income_tools
