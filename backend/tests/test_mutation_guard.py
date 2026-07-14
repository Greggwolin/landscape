"""
Test the phantom-unit guard: strict UPDATE-only mode for narrow field updates.

Verifies that when the Landscaper sends a rent_roll_batch with only 1-2 fields
(e.g., market_rent), non-existent unit numbers are rejected — preventing
phantom unit creation.

Unlike the previous version of this file, these tests import and call the REAL
guard — ``apply_phantom_unit_guard`` extracted from
``apps.landscaper.services.mutation_service`` — instead of a hand-copied
replica. A regression in the real guard now surfaces here.

Run: pytest backend/tests/test_mutation_guard.py
"""

from apps.landscaper.services.mutation_service import (
    apply_phantom_unit_guard,
    _normalize_unit_number,
)


# ---------------------------------------------------------------------------
# Helper: build a normalized record the way mutation_service does, carrying the
# two fields the guard reads — `_provided_fields` and `_unit_number_canonical`.
# ---------------------------------------------------------------------------
def make_record(unit_number, *provided_fields):
    """Build a normalized guard-input record for `unit_number`, declaring which
    data fields were provided (their names, not values — the guard only counts
    them)."""
    return {
        "unit_number": unit_number,
        "_unit_number_canonical": _normalize_unit_number(unit_number),
        "_provided_fields": set(provided_fields),
    }


def kept_units(kept):
    """Unit numbers of the kept records, in order."""
    return [r["unit_number"] for r in kept]


def skipped_units(skipped):
    """Unit numbers of the skipped (phantom) records, in order."""
    return [r["unit_number"] for r in skipped]


# ---------------------------------------------------------------------------
# Test data: project 17's real unit numbers, canonicalized as the guard sees
# the existing DB set (set(existing_map.keys()) at the call site).
# ---------------------------------------------------------------------------
REAL_UNITS = [
    "101", "102", "103", "104", "105", "106", "107", "108", "109", "110",
    "111", "112", "113", "114", "115", "116", "117", "118",
    "201", "202", "203", "204", "205", "206", "207", "208", "209", "210",
    "211", "212", "213", "214", "215", "216", "217", "218",
    "219", "220", "221", "222", "223", "224", "225", "226", "227", "228",
    "229", "230", "231", "232", "233", "234", "235", "236",
    "301", "302", "303", "304", "305", "306", "307", "308", "309", "310",
    "311", "312", "313", "314", "315", "316", "317", "318",
    "319", "320", "321", "322", "323", "324", "325", "326", "327", "328",
    "329", "330", "331", "332", "333", "334", "335", "336",
    "401", "402", "403", "404", "405", "406", "407", "408", "409", "410",
    "411", "412", "413", "414", "415", "416", "417", "418",
    "419", "420", "421", "422", "423", "424", "425", "426", "427", "428",
    "429", "430", "431", "432", "433", "434", "435", "436",
    "437",  # 113 total
]

EXISTING = {_normalize_unit_number(u) for u in REAL_UNITS}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_narrow_update_blocks_all_phantoms():
    """
    THE BUG: Landscaper sends market_rent for 12 non-existent units.
    Old (broken) logic: 0% exist, <50% threshold not met → all INSERT → 12 phantoms.
    Guard: 1 field = narrow update → ALL blocked.
    """
    phantoms = ["237", "238", "239", "240", "241", "242",
                "243", "244", "245", "246", "247", "248"]
    records = [make_record(un, "market_rent") for un in phantoms]

    kept, skipped, is_narrow, is_majority = apply_phantom_unit_guard(records, EXISTING)

    assert is_narrow is True, "1 field should trigger narrow guard"
    assert len(kept) == 0, f"Should keep 0, got {kept_units(kept)}"
    assert len(skipped) == 12, f"Should skip all 12, got {len(skipped)}"


def test_narrow_update_keeps_real_units():
    """market_rent update on 10 real units → all kept."""
    records = [make_record(un, "market_rent") for un in REAL_UNITS[:10]]

    kept, skipped, is_narrow, is_majority = apply_phantom_unit_guard(records, EXISTING)

    assert is_narrow is True
    assert len(kept) == 10
    assert len(skipped) == 0


def test_narrow_update_mixed_real_and_phantom():
    """market_rent for 10 real + 5 phantom → phantoms filtered."""
    phantoms = ["FAKE-1", "FAKE-2", "FAKE-3", "FAKE-4", "FAKE-5"]
    records = [make_record(un, "market_rent") for un in REAL_UNITS[:10] + phantoms]

    kept, skipped, is_narrow, is_majority = apply_phantom_unit_guard(records, EXISTING)

    assert is_narrow is True
    assert kept_units(kept) == REAL_UNITS[:10]
    assert set(skipped_units(skipped)) == set(phantoms)


def test_two_fields_still_narrow():
    """market_rent + occupancy_status (2 fields) → still narrow → phantoms blocked."""
    records = [
        make_record("PHANTOM-1", "market_rent", "occupancy_status"),
        make_record(REAL_UNITS[0], "market_rent", "occupancy_status"),
    ]

    kept, skipped, is_narrow, is_majority = apply_phantom_unit_guard(records, EXISTING)

    assert is_narrow is True
    assert kept_units(kept) == [REAL_UNITS[0]]
    assert skipped_units(skipped) == ["PHANTOM-1"]


def test_three_fields_not_narrow_bulk_import_allowed():
    """3+ fields, empty project (0 exist) → neither guard fires → bulk import allowed."""
    records = [
        make_record("NEW-1", "market_rent", "bedrooms", "bathrooms"),
        make_record("NEW-2", "market_rent", "bedrooms", "bathrooms"),
    ]

    # Empty existing set = brand-new project. Under the real guard, majority-exist
    # is driven by the size of the existing DB set, so an empty project can never
    # trip it.
    kept, skipped, is_narrow, is_majority = apply_phantom_unit_guard(records, set())

    assert is_narrow is False, "3 fields = not narrow"
    assert is_majority is False, "empty project = not majority"
    assert len(kept) == 2
    assert len(skipped) == 0


def test_majority_existing_fallback():
    """3+ fields (not narrow), but the project already holds a majority of the
    requested count → majority guard fires and blocks phantoms."""
    phantoms = ["PHANTOM-A", "PHANTOM-B"]
    records = [
        make_record(un, "market_rent", "bedrooms", "bathrooms", "square_feet")
        for un in REAL_UNITS[:8] + phantoms
    ]

    # Existing DB holds the 8 real units; 8 > 10 * 0.5 → majority guard fires.
    existing = {_normalize_unit_number(u) for u in REAL_UNITS[:8]}

    kept, skipped, is_narrow, is_majority = apply_phantom_unit_guard(records, existing)

    assert is_narrow is False, "4 fields = not narrow"
    assert is_majority is True, "8 existing > 10 requested / 2"
    assert kept_units(kept) == REAL_UNITS[:8]
    assert set(skipped_units(skipped)) == set(phantoms)


def test_full_import_new_project():
    """50 units, 7 fields each, empty project → all pass through."""
    fields = ("unit_type", "bedrooms", "bathrooms", "square_feet",
              "current_rent", "market_rent", "occupancy_status")
    records = [make_record(f"UNIT-{i}", *fields) for i in range(1, 51)]

    kept, skipped, is_narrow, is_majority = apply_phantom_unit_guard(records, set())

    assert is_narrow is False
    assert is_majority is False
    assert len(kept) == 50
    assert len(skipped) == 0


def test_empty_records():
    """Edge case: empty batch → nothing kept, nothing skipped."""
    kept, skipped, is_narrow, is_majority = apply_phantom_unit_guard([], EXISTING)
    assert kept == []
    assert skipped == []


def test_canonical_match_treats_prefixed_unit_as_existing():
    """
    Canonicalization case the old replica could never cover.

    The real guard matches on `_unit_number_canonical`, so an incoming
    "Unit 101" (canonical "101") is recognized as the existing unit "101" and
    KEPT — not filtered as a phantom. A genuinely non-existent prefixed unit
    ("Apt #999" → "999") is still skipped. Assertions are pinned to the actual
    output of `_normalize_unit_number`, read from the real code.
    """
    # Pin the canonicalization behavior explicitly (prefix strip + uppercase).
    assert _normalize_unit_number("Unit 101") == "101"
    assert _normalize_unit_number("101-a") == "101-A"
    assert _normalize_unit_number("Apt #999") == "999"

    records = [
        make_record("Unit 101", "market_rent"),   # canonical "101" — exists
        make_record("Apt #999", "market_rent"),   # canonical "999" — phantom
    ]

    kept, skipped, is_narrow, is_majority = apply_phantom_unit_guard(records, EXISTING)

    assert is_narrow is True, "1 field = narrow update"
    # Prefixed-but-real unit is kept via canonical match, not treated as phantom.
    assert kept_units(kept) == ["Unit 101"]
    assert skipped_units(skipped) == ["Apt #999"]
