"""
Test mutation guard: strict UPDATE-only mode for narrow field updates.

Verifies that when the Landscaper sends a rent_roll_batch with only 1-2 fields
(e.g., market_rent), non-existent unit numbers are rejected — preventing
phantom unit creation.

Run: python3 tests/test_mutation_guard.py
"""

# ---------------------------------------------------------------------------
# Replicate the Phase 1c guard logic from mutation_service.py (lines 1248-1274)
# ---------------------------------------------------------------------------

_UNIT_DATA_FIELDS = {
    'unit_type', 'bedrooms', 'bathrooms', 'square_feet',
    'current_rent', 'market_rent', 'occupancy_status',
}


def simulate_guard_logic(records, existing_unit_numbers):
    """
    Exact replica of the Phase 1c guard from mutation_service.py.
    Returns (kept, skipped, is_narrow_update, is_majority_existing).
    """
    # Phase 1: Normalize — track provided fields
    normalized = []
    for rec in records:
        provided_fields = set()
        for field in _UNIT_DATA_FIELDS:
            if field in rec:
                provided_fields.add(field)
        normalized.append({
            "unit_number": rec.get("unit_number"),
            "_provided_fields": provided_fields,
        })

    existing_set = set(existing_unit_numbers)
    total_in_request = len(normalized)
    existing_count = sum(1 for r in normalized if r["unit_number"] in existing_set)

    # Phase 1c: Guard logic (matches mutation_service.py)
    all_provided = [r["_provided_fields"] for r in normalized]
    max_fields_provided = max((len(pf) for pf in all_provided), default=0)
    is_narrow_update = max_fields_provided <= 2
    is_majority_existing = existing_count > total_in_request * 0.5

    kept = []
    skipped = []

    if is_narrow_update or is_majority_existing:
        for r in normalized:
            if r["unit_number"] in existing_set:
                kept.append(r["unit_number"])
            else:
                skipped.append(r["unit_number"])
    else:
        kept = [r["unit_number"] for r in normalized]
        skipped = []

    return kept, skipped, is_narrow_update, is_majority_existing


# ---------------------------------------------------------------------------
# Test data: simulate project 17's 113 real unit numbers
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


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_narrow_update_blocks_all_phantoms():
    """
    THE BUG: Landscaper sends market_rent for 12 non-existent units.
    Old logic: 0% exist, <50% threshold not met → all INSERT → 12 phantoms.
    New logic: 1 field = narrow update → ALL blocked.
    """
    phantoms = ["237", "238", "239", "240", "241", "242",
                "243", "244", "245", "246", "247", "248"]
    records = [{"unit_number": un, "market_rent": 950} for un in phantoms]

    kept, skipped, is_narrow, is_majority = simulate_guard_logic(records, REAL_UNITS)

    assert is_narrow is True, "1 field should trigger narrow guard"
    assert len(kept) == 0, f"Should keep 0, got {kept}"
    assert len(skipped) == 12, f"Should skip all 12, got {len(skipped)}"
    print("  PASS: 12 phantom units blocked (narrow update, 0 real)")


def test_narrow_update_keeps_real_units():
    """market_rent update on 10 real units → all kept."""
    records = [{"unit_number": un, "market_rent": 1100} for un in REAL_UNITS[:10]]

    kept, skipped, is_narrow, is_majority = simulate_guard_logic(records, REAL_UNITS)

    assert is_narrow is True
    assert len(kept) == 10
    assert len(skipped) == 0
    print("  PASS: 10 real units kept, 0 skipped")


def test_narrow_update_mixed_real_and_phantom():
    """market_rent for 10 real + 5 phantom → phantoms filtered."""
    phantoms = ["FAKE-1", "FAKE-2", "FAKE-3", "FAKE-4", "FAKE-5"]
    records = [{"unit_number": un, "market_rent": 1200} for un in REAL_UNITS[:10] + phantoms]

    kept, skipped, is_narrow, is_majority = simulate_guard_logic(records, REAL_UNITS)

    assert is_narrow is True
    assert len(kept) == 10
    assert set(skipped) == set(phantoms)
    print("  PASS: 10 real kept, 5 phantoms blocked")


def test_two_fields_still_narrow():
    """market_rent + occupancy_status (2 fields) → still narrow → phantoms blocked."""
    records = [
        {"unit_number": "PHANTOM-1", "market_rent": 900, "occupancy_status": "occupied"},
        {"unit_number": REAL_UNITS[0], "market_rent": 900, "occupancy_status": "occupied"},
    ]

    kept, skipped, is_narrow, is_majority = simulate_guard_logic(records, REAL_UNITS)

    assert is_narrow is True
    assert kept == [REAL_UNITS[0]]
    assert skipped == ["PHANTOM-1"]
    print("  PASS: 2 fields still narrow, phantom blocked")


def test_three_fields_not_narrow_bulk_import_allowed():
    """3+ fields, 0% exist → neither guard fires → bulk import allowed."""
    records = [
        {"unit_number": "NEW-1", "market_rent": 900, "bedrooms": 2, "bathrooms": 1},
        {"unit_number": "NEW-2", "market_rent": 1000, "bedrooms": 3, "bathrooms": 2},
    ]

    kept, skipped, is_narrow, is_majority = simulate_guard_logic(records, REAL_UNITS)

    assert is_narrow is False, "3 fields = not narrow"
    assert is_majority is False, "0% exist = not majority"
    assert len(kept) == 2
    print("  PASS: 3+ fields, new project → bulk import allowed")


def test_majority_existing_fallback():
    """3+ fields, but 80% exist → majority guard blocks phantoms."""
    phantoms = ["PHANTOM-A", "PHANTOM-B"]
    all_units = REAL_UNITS[:8] + phantoms
    records = [
        {"unit_number": un, "market_rent": 1000, "bedrooms": 2, "bathrooms": 1, "square_feet": 800}
        for un in all_units
    ]

    kept, skipped, is_narrow, is_majority = simulate_guard_logic(records, REAL_UNITS)

    assert is_narrow is False, "4 fields = not narrow"
    assert is_majority is True, "80% exist"
    assert len(kept) == 8
    assert set(skipped) == set(phantoms)
    print("  PASS: majority-exist fallback blocks 2 phantoms")


def test_full_import_new_project():
    """50 units, 7 fields each, empty project → all pass through."""
    new_units = [f"UNIT-{i}" for i in range(1, 51)]
    records = [
        {
            "unit_number": un, "unit_type": "2BR/1BA", "bedrooms": 2,
            "bathrooms": 1, "square_feet": 850, "current_rent": 1100,
            "market_rent": 1200, "occupancy_status": "occupied",
        }
        for un in new_units
    ]

    kept, skipped, is_narrow, is_majority = simulate_guard_logic(records, [])

    assert is_narrow is False
    assert is_majority is False
    assert len(kept) == 50
    assert len(skipped) == 0
    print("  PASS: full import on empty project → all 50 allowed")


def test_empty_records():
    """Edge case: empty batch."""
    kept, skipped, is_narrow, is_majority = simulate_guard_logic([], REAL_UNITS)
    assert len(kept) == 0
    assert len(skipped) == 0
    print("  PASS: empty batch handled gracefully")


# ---------------------------------------------------------------------------
# Run all tests
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    tests = [
        test_narrow_update_blocks_all_phantoms,
        test_narrow_update_keeps_real_units,
        test_narrow_update_mixed_real_and_phantom,
        test_two_fields_still_narrow,
        test_three_fields_not_narrow_bulk_import_allowed,
        test_majority_existing_fallback,
        test_full_import_new_project,
        test_empty_records,
    ]

    print(f"\nRunning {len(tests)} mutation guard tests...\n")
    passed = 0
    failed = 0
    for test in tests:
        name = test.__name__
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"  FAIL: {name} — {e}")
            failed += 1
        except Exception as e:
            print(f"  ERROR: {name} — {type(e).__name__}: {e}")
            failed += 1

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)}")
    if failed == 0:
        print("ALL TESTS PASSED")
    else:
        print("SOME TESTS FAILED")
        exit(1)
