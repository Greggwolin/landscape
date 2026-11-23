"""
Shared base figures for the multifamily projections.

Stage 1 of the unit-turnover build (#LS-1123-07). Two entry points on the same
page — the DCF service and the Direct Cap view — each read the rent roll and
the operating statement with their own SQL, and the two had drifted:

* a vacant unit with no rent on the rent roll contributed ZERO to potential
  rent, and the vacancy allowance was then deducted on top of that, so the same
  empty unit was penalised twice (#LS-1123-04);
* the Direct Cap view summed operating expenses across EVERY statement the
  project carried, while the DCF filtered to the active one (#LS-1123-01).

Both now read through the helpers below, so the rule lives in one place.

Decision 7a (Gregg, 2026-11-23): a vacant unit counts toward potential rent at
its market rent, and vacancy is deducted once, by the allowance.

No Django model imports — these take a DB-API cursor so they can be called from
a service, a view or a test without pulling the app registry in.
"""

from typing import Any, Dict


# A unit's market rent: its own figure when it has one, otherwise its unit
# type's. This is the same precedence the Direct Cap view already used for its
# market-rent basis (unit market_rent, then the type's current_market_rent),
# extended one step to the type's market_rent so a type priced only in that
# column is not treated as unpriced. The scalar subquery (MAX) keeps one row per
# unit even where a project carries two type rows with the same code.
_UNIT_MARKET_RENT_SQL = """
    COALESCE(
        NULLIF(u.market_rent, 0),
        (
            SELECT MAX(COALESCE(NULLIF(ut.current_market_rent, 0), NULLIF(ut.market_rent, 0)))
            FROM landscape.tbl_multifamily_unit_type ut
            WHERE ut.project_id = u.project_id
              AND ut.unit_type_code = u.unit_type
        ),
        0
    )
"""

# occupancy_status is free text on the rent roll: 'vacant' and 'Vacant' both
# occur in live data (2026-11-23), so the comparison is case-insensitive. A NULL
# status is NOT treated as vacant — absence of a status is not a vacancy.
_UNIT_IS_VACANT_SQL = "LOWER(TRIM(COALESCE(u.occupancy_status, ''))) = 'vacant'"


def unit_potential_rent(cursor, project_id: int) -> Dict[str, Any]:
    """In-place potential rent from the unit-level rent roll.

    Occupied units count at the rent they pay. A vacant unit counts at market
    rent (decision 7a). A vacant unit with no market rent anywhere keeps
    whatever rent the rent roll shows for it (possibly zero) and is reported in
    ``vacant_units_unpriced`` — nothing is invented for it.

    Returns annual figures. ``annual_in_place_rent`` is the plain sum of
    current rents, i.e. what the projections used before this rule; the
    difference between the two is exactly the vacant-unit adjustment.
    """
    cursor.execute(f"""
        SELECT
            COALESCE(SUM(CASE WHEN x.is_vacant AND x.market_rent > 0
                              THEN x.market_rent ELSE x.current_rent END), 0) * 12,
            COALESCE(SUM(x.current_rent), 0) * 12,
            COUNT(*),
            COUNT(*) FILTER (WHERE x.is_vacant),
            COUNT(*) FILTER (WHERE x.is_vacant AND x.market_rent > 0),
            COUNT(*) FILTER (WHERE x.is_vacant AND x.market_rent = 0 AND x.current_rent = 0)
        FROM (
            SELECT
                COALESCE(u.current_rent, 0) AS current_rent,
                {_UNIT_IS_VACANT_SQL} AS is_vacant,
                {_UNIT_MARKET_RENT_SQL} AS market_rent
            FROM landscape.tbl_multifamily_unit u
            WHERE u.project_id = %s
        ) x
    """, [project_id])
    row = cursor.fetchone() or (0, 0, 0, 0, 0, 0)
    return {
        'annual_potential_rent': float(row[0] or 0),
        'annual_in_place_rent': float(row[1] or 0),
        'unit_rows': int(row[2] or 0),
        'vacant_units': int(row[3] or 0),
        'vacant_units_at_market': int(row[4] or 0),
        'vacant_units_unpriced': int(row[5] or 0),
    }


def active_opex_discriminator(cursor, project_id: int) -> str:
    """The project's active operating-statement scenario ('default' if unset)."""
    cursor.execute("""
        SELECT active_opex_discriminator
        FROM landscape.tbl_project
        WHERE project_id = %s
        LIMIT 1
    """, [project_id])
    row = cursor.fetchone()
    return row[0] if row and row[0] else 'default'
