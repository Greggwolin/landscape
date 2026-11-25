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

import re
from typing import Any, Dict, Optional


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


# ── Which statement lines the computed management fee replaces ──────────────
#
# Decision 10a (Gregg, 2026-11-23). The projections compute the management fee
# as fee % × income. The statement's own fee line therefore has to come OUT of
# base expenses, or the fee is paid twice (#LS-1021-01). The first version of
# that fix removed every row filed under the Management parent — which also
# dropped an on-site manager, payroll and administrative costs that happened to
# be filed there (Lynn Villa: 140,831 of non-fee cost; Vincent Village: 23,000),
# overstating NOI. Only the FEE is replaced; other management costs stay.
#
# A row is the fee when its name says so: "management fee" in any spelling
# ("Management Fee (3%)", "management_fee", "Mgmt Fee"), or off-site management
# ("Off-Site Management", "management_offsite") — the management company's
# charge under its other common label. "On-Site Management" is staff, not the
# fee, and stays an expense. The parent category is deliberately not consulted.
#
# One pattern, used by Python (is_management_fee_row) and by SQL
# (management_fee_sql_predicate) over the same normalisation — lower-case,
# every run of non-letters collapsed to one space — so the two cannot drift.
MANAGEMENT_FEE_PATTERN = (
    r'(management|mgmt) fee'
    r'|off ?site (management|mgmt)'
    r'|(management|mgmt) off ?site'
)
_MANAGEMENT_FEE_RE = re.compile(MANAGEMENT_FEE_PATTERN)


def normalise_expense_name(name: Optional[str]) -> str:
    return re.sub(r'[^a-z]+', ' ', (name or '').lower()).strip()


def is_management_fee_row(expense_category: Optional[str]) -> bool:
    """True when the statement line is the management fee (decision 10a)."""
    return bool(_MANAGEMENT_FEE_RE.search(normalise_expense_name(expense_category)))


def management_fee_sql_predicate(column: str = 'expense_category') -> str:
    """SQL twin of is_management_fee_row() for the given column expression."""
    return (
        f"TRIM(REGEXP_REPLACE(LOWER(COALESCE({column}, '')), '[^a-z]+', ' ', 'g'))"
        f" ~ '{MANAGEMENT_FEE_PATTERN}'"
    )


# ── One projection (Stage 1b, #LS-1123-08) ──────────────────────────────────
#
# The DCF service, the Landscaper cash-flow adapter, the what-if engine and the
# report calculator each carried their own copy of "rent, less vacancy, less
# expenses" — with different starting rents, different expense bases and, in
# the adapter, invented defaults ($5,500 a unit of expenses, 2% credit loss).
# On Chadron Terrace they returned four different Year-1 NOIs for one property.
# This is the single statement of that arithmetic; all four call it.

OPERATING_INPUT_KEYS = (
    'current_annual_rent',
    'base_opex',
    'unit_count',
    'income_growth_rate',
    'expense_growth_rate',
    'vacancy_rate',
    'credit_loss_rate',
    'other_income',
    'management_fee_pct',
    'replacement_reserves_per_unit',
)


def annual_operating_line(
    *,
    year: int,
    current_annual_rent: float,
    base_opex: float,
    unit_count: int,
    income_growth_rate: float,
    expense_growth_rate: float,
    vacancy_rate: float,
    credit_loss_rate: float,
    other_income: float,
    management_fee_pct: float,
    replacement_reserves_per_unit: float,
) -> Dict[str, float]:
    """One year of the operating statement, unrounded.

    Year 1 is the base year (no growth applied); year N grows rent at
    ``income_growth_rate`` and base expenses at ``expense_growth_rate``,
    compounded N-1 times. Vacancy and credit loss are each a share of potential
    rent. Other income and replacement reserves are held flat. The management
    fee is ``management_fee_pct`` of effective gross income — so ``base_opex``
    must already exclude the statement's own fee line (decision 10a).

    This is exactly the arithmetic DCFCalculationService.calculate() has always
    used; it was lifted here unchanged so the other entry points can share it.
    """
    gpr = float(current_annual_rent) * (1 + float(income_growth_rate)) ** (year - 1)
    vacancy_loss = gpr * float(vacancy_rate)
    credit_loss = gpr * float(credit_loss_rate)
    egi = gpr - vacancy_loss - credit_loss + float(other_income)

    opex = float(base_opex) * (1 + float(expense_growth_rate)) ** (year - 1)
    management_fee = egi * float(management_fee_pct)
    replacement_reserves = float(replacement_reserves_per_unit) * unit_count
    total_opex = opex + management_fee + replacement_reserves

    return {
        'gpr': gpr,
        'vacancy_loss': vacancy_loss,
        'credit_loss': credit_loss,
        'other_income': float(other_income),
        'egi': egi,
        'base_opex': opex,
        'management_fee': management_fee,
        'replacement_reserves': replacement_reserves,
        'total_opex': total_opex,
        'noi': egi - total_opex,
    }
