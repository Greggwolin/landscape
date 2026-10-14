"""
Tests for reading a cost estimate and comparing it with the cost library.

Rows are modelled on the CopperNail estimate uploaded to Red Valley Ranch on
2026-09-29, and the library rows on what the Red Valley library held that day.
"""

from apps.knowledge.services.cost_estimate_reader import (
    compare_with_library,
    normalize_uom,
    read_rows,
)

SHEET = [
    [None, "Property Name:", "Red Valley Ranch", None, None, None, None],
    [None, "Description", None, "Unit", "Unit Price", "Quantity", "Total", None, None],
    [None, "Earthwork", None, None, None, None, None],
    [None, "Roadway Excavation", None, "CY", 5.5, 6900, 37950],
    [None, "Mobilization", None, "LS", 25000, 1, 25000],
    [None, None, "Subtotal", None, None, None, 62950],
    [None, "Paving", None, None, None, None, None],
    [None, '4" AC on 10" ABC', None, "SY", 48, 15311.1, 734932.8],
    [None, "Striping - 4\" Solid Line", None, "LFS", 2, 2650, 5300],
    [None, "Install Survey Marker MAG Stdd Det 120-1A", None, "EA", 275, None, 0],
    [None, "CONSTRUCTION STAKING", None, None, None, None, None],
    [None, "Major Arterial", None, "LS", 48000, 1, 48000],
    [None, "DUST CONTROL", None, None, None, None, None],
    [None, "Item 1", None, "LS", 9500, 1, 9500, None, "Inspection"],
    [None, "Item 2", None, None, 0, None, 0],
    [None, "TESTING", None, None, None, None, None],
    [None, "Roadways", None, "LF", 25000, 1, 25000],
    [None, "Total Direct Construction Cost", None, None, None, None, 936391.46],
]

LIBRARY = [
    {"item_id": 1, "item_name": "Mobilization", "default_uom_code": "LS", "typical_mid_value": 12500},
    {"item_id": 2, "item_name": '5" AC on 7" ABC', "default_uom_code": "SY", "typical_mid_value": 68},
    {"item_id": 3, "item_name": "Survey Markers", "default_uom_code": "EA", "typical_mid_value": 275},
    {"item_id": 4, "item_name": "Construction Staking", "default_uom_code": "LS", "typical_mid_value": 35000},
]


def _lines():
    return read_rows(SHEET, "Sheet1")


def test_priced_rows_are_read_and_totals_and_headings_are_not():
    names = [l.name for l in _lines()]
    assert "Earthwork – Roadway Excavation" in names
    assert '4" AC on 10" ABC' in names
    assert not any("Subtotal" in n or "Total" in n for n in names)
    assert "Earthwork" not in names and "Paving" not in names


def test_a_placeholder_row_takes_its_name_from_the_section_and_note():
    assert "Dust Control – Inspection" in [l.name for l in _lines()]


def test_an_unpriced_placeholder_is_skipped():
    assert not any(l.description == "Item 2" for l in _lines())


def test_a_bare_name_carries_its_section():
    assert "Construction Staking – Major Arterial" in [l.name for l in _lines()]


def test_units_are_normalised():
    assert normalize_uom("LFS") == "LF"
    striping = next(l for l in _lines() if "Striping" in l.name)
    assert striping.uom == "LF"


def test_a_lump_sum_written_in_linear_feet_is_flagged():
    roads = next(l for l in _lines() if l.name.endswith("Roadways"))
    assert any("lump sum" in c for c in roads.checks)


def test_different_sizes_are_never_the_same_item():
    """4\" AC on 10\" ABC is not 5\" AC on 7\" ABC, however alike the words."""
    res = {r["name"]: r for r in compare_with_library(_lines(), LIBRARY)}
    assert res['4" AC on 10" ABC']["status"] == "new"


def test_same_item_same_price_is_already_in_the_library():
    res = {r["name"]: r for r in compare_with_library(_lines(), LIBRARY)}
    assert res["Install Survey Marker MAG Stdd Det 120-1A"]["status"] == "in_library"


def test_same_item_other_price_is_reported_with_both_prices():
    res = {r["name"]: r for r in compare_with_library(_lines(), LIBRARY)}
    mob = res["Earthwork – Mobilization"]
    assert mob["status"] == "different_price"
    assert mob["unit_price"] == 25000 and mob["match"]["unit_price"] == 12500


def test_a_different_unit_is_never_a_match():
    lib = [{"item_id": 9, "item_name": "Roadway Excavation", "default_uom_code": "LS", "typical_mid_value": 5.5}]
    res = {r["name"]: r for r in compare_with_library(_lines(), lib)}
    assert res["Earthwork – Roadway Excavation"]["status"] == "new"
