#!/usr/bin/env python3
"""
Seed User A (gregg, user_id=4) with 200 multifamily properties.

Phase 1: Create projects via Django API (JWT-authenticated)
Phase 2: Bulk SQL inserts for child tables (psycopg2 direct)
Phase 3: Summary report

Usage:
    python scripts/seed_user_a.py

Requires:
    - DATABASE_URL env var (Neon Postgres connection string)
    - Django backend running at localhost:8000 (or set LANDSCAPE_API_URL)
    - pip install psycopg2-binary requests
"""

import json
import sys
import time
import re
from datetime import datetime

import psycopg2
import psycopg2.extras
import requests

from seed_config import (
    API_BASE_URL,
    LOGIN_ENDPOINT,
    PROJECTS_ENDPOINT,
    USERNAME,
    PASSWORD,
    DATABASE_URL,
    BATCH_ID,
    DATA_FILE,
    PROJECT_DEFAULTS,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_bed_bath(unit_type_str: str) -> tuple:
    """Parse '2BR/2BA' -> (2, 2), 'Studio' -> (0, 1), 'Penthouse' -> (2, 2)."""
    if not unit_type_str:
        return (None, None)
    s = unit_type_str.strip()
    if s.lower() == "studio":
        return (0, 1)
    if s.lower() == "penthouse":
        return (2, 2)
    m = re.match(r"(\d+)\s*BR\s*/\s*(\d+)\s*BA", s, re.IGNORECASE)
    if m:
        return (int(m.group(1)), int(m.group(2)))
    # Try just bedrooms: "3BR"
    m2 = re.match(r"(\d+)\s*BR", s, re.IGNORECASE)
    if m2:
        return (int(m2.group(1)), 1)
    return (None, None)


class TokenManager:
    """Manages JWT authentication with auto-refresh on 401."""

    def __init__(self):
        self.access_token = None
        self.headers = {}

    def authenticate(self):
        print(f"Authenticating as {USERNAME}...", end="")
        resp = requests.post(LOGIN_ENDPOINT, json={
            "username": USERNAME,
            "password": PASSWORD,
        }, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        self.access_token = data["tokens"]["access"]
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        print("OK")

    def post(self, url, json_data, retries=1):
        """POST with automatic re-auth on 401."""
        for attempt in range(retries + 1):
            resp = requests.post(url, json=json_data, headers=self.headers, timeout=30)
            if resp.status_code == 401 and attempt < retries:
                print("  (token expired — re-authenticating)")
                self.authenticate()
                continue
            return resp
        return resp


# ---------------------------------------------------------------------------
# Phase 1: Create projects via API
# ---------------------------------------------------------------------------

def build_project_payload(prop: dict) -> dict:
    """Map JSON property -> API payload for POST /api/projects/."""
    addr = prop.get("address", {})
    t12 = prop.get("t12", {})
    revenue = t12.get("revenue", {}) if t12 else {}

    payload = {
        **PROJECT_DEFAULTS,
        "project_name": prop["name"],
        "street_address": addr.get("street"),
        "city": addr.get("city"),
        "state": addr.get("state"),
        "zip_code": addr.get("zip"),
        "property_class": prop.get("property_class"),
        "total_units": prop.get("unit_count"),
        "year_built": prop.get("year_built"),
        "gross_sf": prop.get("total_rentable_sf"),
        "stories": prop.get("stories"),
        "building_count": prop.get("building_count"),
        "construction_type": prop.get("construction_type"),
        "parking_spaces": prop.get("parking_spaces"),
        "parking_ratio": prop.get("parking_ratio"),
        "parking_type": prop.get("parking_type"),
        "lot_size_acres": prop.get("site_acres"),
    }

    # T-12 financials that map directly to tbl_project columns
    if t12:
        noi = t12.get("noi")
        if noi is not None:
            payload["current_noi"] = noi
        egi = revenue.get("effective_gross_income")
        if egi is not None:
            payload["current_egi"] = egi
        gpr = revenue.get("gross_potential_rent")
        if gpr is not None:
            payload["current_gpr"] = gpr
        vac = revenue.get("vacancy_pct")
        if vac is not None:
            payload["current_vacancy_rate"] = vac
        total_exp = t12.get("total_expenses")
        if total_exp is not None:
            payload["current_opex"] = total_exp

    # Strip None values — let API use its defaults
    return {k: v for k, v in payload.items() if v is not None}


def phase1_create_projects(properties: list, token_mgr: TokenManager) -> list:
    """Create 200 projects via API. Returns list of (prop_index, project_id, prop_dict)."""
    print(f"\nPhase 1: Creating {len(properties)} projects via API...")
    results = []
    errors = []

    for i, prop in enumerate(properties):
        payload = build_project_payload(prop)
        try:
            resp = token_mgr.post(PROJECTS_ENDPOINT, payload)
            if resp.status_code in (200, 201):
                project_id = resp.json().get("project_id") or resp.json().get("id")
                results.append((i, project_id, prop))
                if (i + 1) % 10 == 0 or i == 0:
                    print(f"  [{i+1}/{len(properties)}] Created project_id={project_id}: {prop['name']}")
            else:
                errors.append((i, prop["name"], resp.status_code, resp.text[:200]))
                print(f"  [{i+1}] FAILED {prop['name']}: {resp.status_code} — {resp.text[:120]}")
        except Exception as e:
            errors.append((i, prop["name"], 0, str(e)))
            print(f"  [{i+1}] ERROR {prop['name']}: {e}")

    if results:
        ids = [r[1] for r in results]
        print(f"Phase 1 complete: {len(results)} projects created (IDs {min(ids)}-{max(ids)})")
    else:
        print("Phase 1 complete: 0 projects created")

    if errors:
        print(f"  Phase 1 errors: {len(errors)}")
        for idx, name, code, msg in errors[:5]:
            print(f"    #{idx}: {name} — HTTP {code}: {msg}")

    return results


# ---------------------------------------------------------------------------
# Phase 2: Bulk SQL inserts
# ---------------------------------------------------------------------------

def phase2_bulk_inserts(project_results: list, conn):
    """Insert child data for all created projects."""
    print("\nPhase 2: Bulk SQL inserts...")
    cur = conn.cursor()
    counters = {
        "assumptions": 0,
        "unit_types": 0,
        "units": 0,
        "opex": 0,
        "sale_comps": 0,
        "loans": 0,
    }
    errors = []

    for _i, project_id, prop in project_results:
        try:
            counters["assumptions"] += insert_assumptions(cur, project_id, prop)
            counters["unit_types"] += insert_unit_types(cur, project_id, prop)
            counters["units"] += insert_units(cur, project_id, prop)
            counters["opex"] += insert_opex(cur, project_id, prop)
            sc, ln = insert_sales_and_loans(cur, project_id, prop)
            counters["sale_comps"] += sc
            counters["loans"] += ln
            conn.commit()  # Commit per-project so failures don't roll back prior work
        except Exception as e:
            errors.append((project_id, prop["name"], str(e)))
            print(f"  ERROR on project_id={project_id} ({prop['name']}): {e}")
            conn.rollback()
            # Re-open cursor after rollback
            cur = conn.cursor()
            continue
    cur.close()

    print(f"  2a. Assumptions: {counters['assumptions']} rows inserted")
    print(f"  2b. Unit types: {counters['unit_types']} rows inserted")
    print(f"  2c. Individual units: {counters['units']} rows inserted")
    print(f"  2d. Operating expenses: {counters['opex']} rows inserted")
    print(f"  2e. Sales comparables: {counters['sale_comps']} rows inserted")
    print(f"  2f. Loans: {counters['loans']} rows inserted")
    print("Phase 2 complete.")

    if errors:
        print(f"  Phase 2 errors: {len(errors)}")
        for pid, name, msg in errors[:5]:
            print(f"    project_id={pid} ({name}): {msg}")

    return counters, errors


# --- 2a: Project Assumptions ---

def insert_assumptions(cur, project_id: int, prop: dict) -> int:
    """Insert project assumptions (metadata, regulatory flags, batch tag)."""
    assumptions = []

    def add(key, value):
        if value is not None and value != "" and value != 0:
            assumptions.append((project_id, key, str(value), "system", "seed_script"))

    # Batch tag (always)
    assumptions.append((project_id, "test_data_batch", BATCH_ID, "system", "seed_script"))

    # Location / source metadata
    add("metro", prop.get("metro"))
    add("submarket", prop.get("submarket"))
    addr = prop.get("address", {})
    add("submarket_address", addr.get("submarket"))

    src = prop.get("source_metadata", {})
    add("data_completeness", src.get("data_completeness"))
    add("source_type", src.get("source_type"))
    add("data_as_of", src.get("data_as_of"))

    # Regulatory flags
    reg = prop.get("regulatory", {})
    if reg.get("rent_control"):
        add("rent_control", "true")
    if reg.get("rubs_program"):
        add("rubs_program", "true")
    if reg.get("section_8_pct"):
        add("section_8_pct", reg["section_8_pct"])

    # Physical attributes not on tbl_project
    add("parking_ratio", prop.get("parking_ratio"))
    add("parking_type", prop.get("parking_type"))
    add("construction_type", prop.get("construction_type"))
    add("site_acres", prop.get("site_acres"))
    add("building_count", prop.get("building_count"))

    if prop.get("year_renovated"):
        add("year_renovated", prop["year_renovated"])

    # Amenities as JSON string
    if prop.get("amenities"):
        add("amenities", json.dumps(prop["amenities"]))

    # T-12 detail fields not on tbl_project
    t12 = prop.get("t12", {})
    if t12:
        rev = t12.get("revenue", {})
        add("t12_period", t12.get("period"))
        add("expense_ratio", t12.get("expense_ratio"))
        add("noi_per_unit", t12.get("noi_per_unit"))
        add("expense_per_unit", t12.get("expense_per_unit"))
        add("vacancy_loss", rev.get("vacancy_loss"))
        add("concession_loss", rev.get("concession_loss"))
        add("bad_debt", rev.get("bad_debt"))
        add("net_rental_income", rev.get("net_rental_income"))
        add("other_income", rev.get("other_income"))

        # Other income detail
        oid = rev.get("other_income_detail", {})
        for oi_key, oi_val in oid.items():
            add(f"other_income_{oi_key.lower().replace(' ', '_').replace('/', '_')}", oi_val)

    # Property ID from source
    add("source_property_id", prop.get("id"))
    add("metro_key", prop.get("metro_key"))

    if not assumptions:
        return 0

    psycopg2.extras.execute_batch(
        cur,
        """INSERT INTO landscape.tbl_project_assumption
           (project_id, assumption_key, assumption_value, assumption_type, created_by)
           VALUES (%s, %s, %s, %s, %s)""",
        assumptions,
        page_size=500,
    )
    return len(assumptions)


# --- 2b: Unit Types ---

def insert_unit_types(cur, project_id: int, prop: dict) -> int:
    """Insert floor plan matrix as unit types."""
    fps = prop.get("floor_plan_matrix", [])
    if not fps:
        return 0

    rows = []
    for fp in fps:
        beds, baths = parse_bed_bath(fp.get("unit_type", ""))
        rows.append((
            project_id,
            fp.get("unit_type"),       # unit_type_code
            fp.get("unit_type"),       # unit_type_name
            beds,                       # bedrooms
            baths,                      # bathrooms
            fp.get("avg_sf"),           # avg_square_feet
            fp.get("market_rent"),      # current_market_rent (market rent)
            fp.get("unit_count"),       # total_units
            fp.get("unit_count"),       # unit_count (duplicate col)
            fp.get("market_rent"),      # market_rent
            fp.get("avg_rent"),         # current_rent_avg
            "import",                   # value_source (CHECK: ai_extraction|user_manual|benchmark|import)
        ))

    psycopg2.extras.execute_batch(
        cur,
        """INSERT INTO landscape.tbl_multifamily_unit_type
           (project_id, unit_type_code, unit_type_name, bedrooms, bathrooms,
            avg_square_feet, current_market_rent, total_units, unit_count,
            market_rent, current_rent_avg, value_source)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        rows,
        page_size=500,
    )
    return len(rows)


# --- 2c: Individual Units (rent roll) ---

def insert_units(cur, project_id: int, prop: dict) -> int:
    """Insert individual units from rent roll."""
    rr = prop.get("rent_roll")
    if not rr:
        return 0

    rows = []
    for unit in rr:
        beds, baths = parse_bed_bath(unit.get("unit_type", ""))
        sf = unit.get("sf") or 0
        status = unit.get("status", "Occupied")
        contract_rent = unit.get("contract_rent") if status == "Occupied" else 0

        rows.append((
            project_id,
            str(unit.get("unit_number", "")),
            unit.get("unit_type", "Unknown"),
            beds,
            baths,
            int(sf),
            contract_rent,
            unit.get("market_rent"),
            status,
            unit.get("lease_start"),
            unit.get("lease_end"),
        ))

    psycopg2.extras.execute_batch(
        cur,
        """INSERT INTO landscape.tbl_multifamily_unit
           (project_id, unit_number, unit_type, bedrooms, bathrooms,
            square_feet, current_rent, market_rent, occupancy_status,
            lease_start_date, lease_end_date, value_source)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'import'::varchar)""",
        rows,
        page_size=500,
    )
    return len(rows)


# --- 2d: Operating Expenses ---

# CHECK constraint on expense_type: CAM|TAXES|INSURANCE|MANAGEMENT|UTILITIES|REPAIRS|OTHER
EXPENSE_CATEGORY_MAP = {
    "Real Estate Taxes": ("Taxes & Insurance", "TAXES"),
    "Taxes & Insurance": ("Taxes & Insurance", "TAXES"),
    "Insurance": ("Taxes & Insurance", "INSURANCE"),
    "Utilities": ("Utilities", "UTILITIES"),
    "Utilities - Electric": ("Utilities", "UTILITIES"),
    "Utilities - Water/Sewer": ("Utilities", "UTILITIES"),
    "Utilities - Gas": ("Utilities", "UTILITIES"),
    "Utilities - Trash": ("Utilities", "UTILITIES"),
    "Repairs & Maintenance": ("Maintenance", "REPAIRS"),
    "Contract Services": ("Maintenance", "REPAIRS"),
    "Turnover/Make-Ready": ("Maintenance", "REPAIRS"),
    "Landscaping": ("Maintenance", "CAM"),
    "Pest Control": ("Maintenance", "CAM"),
    "Payroll": ("Payroll", "OTHER"),
    "Payroll - On-Site": ("Payroll", "OTHER"),
    "Payroll - Maintenance": ("Payroll", "OTHER"),
    "Marketing": ("Administrative", "OTHER"),
    "Marketing/Advertising": ("Administrative", "OTHER"),
    "Professional Fees": ("Administrative", "OTHER"),
    "General & Administrative": ("Administrative", "OTHER"),
    "Operating Expenses": ("Other", "OTHER"),
    "Management Fee": ("Management", "MANAGEMENT"),
}


def insert_opex(cur, project_id: int, prop: dict) -> int:
    """Insert T-12 operating expenses."""
    t12 = prop.get("t12")
    if not t12:
        return 0
    expenses = t12.get("expenses", {})
    if not expenses:
        return 0

    rows = []
    for exp_name, amount in expenses.items():
        cat, typ = EXPENSE_CATEGORY_MAP.get(exp_name, ("Other", exp_name))
        annual = abs(amount) if amount else 0  # Management fee can be negative in source
        rows.append((
            project_id,
            cat,            # expense_category
            typ,            # expense_type (CHECK: CAM|TAXES|INSURANCE|MANAGEMENT|UTILITIES|REPAIRS|OTHER)
            annual,         # annual_amount
            1,              # start_period
            "seed_script",  # source (no CHECK constraint)
            exp_name,       # notes — preserve original expense name
        ))

    if not rows:
        return 0

    psycopg2.extras.execute_batch(
        cur,
        """INSERT INTO landscape.tbl_operating_expenses
           (project_id, expense_category, expense_type, annual_amount,
            start_period, source, notes, value_source)
           VALUES (%s, %s, %s, %s, %s, %s, %s, 'import'::varchar)""",
        rows,
        page_size=500,
    )
    return len(rows)


# --- 2e & 2f: Sales Comparables + Loans ---

def insert_sales_and_loans(cur, project_id: int, prop: dict) -> tuple:
    """Insert sale transactions and associated debt."""
    sales = prop.get("sale_transactions", [])
    if not sales:
        return (0, 0)

    sale_count = 0
    loan_count = 0

    for idx, sale in enumerate(sales):
        # --- Sale comp ---
        cap_str = str(sale["cap_rate"]) if sale.get("cap_rate") is not None else None
        cur.execute(
            """INSERT INTO landscape.tbl_sales_comparables
               (project_id, property_name, sale_date, sale_price,
                price_per_unit, cap_rate, noi_at_sale,
                buyer_type, seller_type, sale_conditions,
                property_type, data_source)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                project_id,
                prop["name"],
                sale.get("sale_date"),
                sale.get("sale_price"),
                sale.get("price_per_unit"),
                cap_str,
                sale.get("noi_at_sale"),
                sale.get("buyer_type"),
                sale.get("seller_type"),
                sale.get("condition_at_sale"),
                "Multifamily",
                "seed_script",
            ),
        )
        sale_count += 1

        # --- Debt (loan) ---
        debt = sale.get("debt")
        if debt:
            cur.execute(
                """INSERT INTO landscape.tbl_loan
                   (project_id, loan_name, loan_type, structure_type, seniority,
                    lender_name, loan_amount, loan_to_value_pct,
                    interest_rate_pct, loan_term_years, amortization_years,
                    interest_only_months, loan_start_date, loan_maturity_date,
                    annual_debt_service, loan_covenant_dscr_min,
                    created_by, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    project_id,
                    f"Acquisition Loan - {sale.get('sale_date', 'Unknown')}",
                    "PERMANENT",
                    "TERM",
                    1,
                    debt.get("lender_type"),
                    debt.get("loan_amount"),
                    debt.get("ltv") * 100 if debt.get("ltv") else None,  # store as pct
                    debt.get("interest_rate") * 100 if debt.get("interest_rate") else None,
                    debt.get("term_years"),
                    debt.get("amortization_years"),
                    debt.get("io_period_months", 0),
                    debt.get("origination_date"),
                    debt.get("maturity_date"),
                    debt.get("annual_debt_service"),
                    debt.get("dscr"),
                    "seed_script",
                    "active",
                ),
            )
            loan_count += 1

    return (sale_count, loan_count)


# ---------------------------------------------------------------------------
# Phase 3: Summary
# ---------------------------------------------------------------------------

def print_summary(project_results, counters, phase1_errors, phase2_errors):
    """Print final summary report."""
    print("\n" + "=" * 50)
    print("          SEEDING COMPLETE")
    print("=" * 50)
    print(f"  Projects:      {len(project_results)}")
    print(f"  Unit types:    {counters.get('unit_types', 0)}")
    print(f"  Units:         {counters.get('units', 0)}")
    print(f"  OpEx rows:     {counters.get('opex', 0)}")
    print(f"  Sale comps:    {counters.get('sale_comps', 0)}")
    print(f"  Loans:         {counters.get('loans', 0)}")
    print(f"  Assumptions:   {counters.get('assumptions', 0)}")
    total_errors = len(phase1_errors) + len(phase2_errors)
    print(f"  Errors:        {total_errors}")
    print("=" * 50)


# ---------------------------------------------------------------------------
# Idempotency check
# ---------------------------------------------------------------------------

def check_existing_batch(conn) -> bool:
    """Return True if QM_BATCH_001 data already exists."""
    cur = conn.cursor()
    cur.execute(
        """SELECT COUNT(*) FROM landscape.tbl_project_assumption
           WHERE assumption_key = 'test_data_batch'
             AND assumption_value = %s""",
        (BATCH_ID,),
    )
    count = cur.fetchone()[0]
    cur.close()
    return count > 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    start = time.time()

    # --- Load data ---
    print(f"Loading data from {DATA_FILE}...")
    with open(DATA_FILE, "r") as f:
        data = json.load(f)
    properties = data["properties"]
    print(f"  {len(properties)} properties loaded (batch: {data['metadata']['batch_id']})")

    # --- Database connection ---
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("Set it to the Neon Postgres connection string (same one Django uses).")
        sys.exit(1)

    print(f"Connecting to database...", end="")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    print("OK")

    # --- Idempotency check ---
    print(f"Checking for existing test data...", end="")
    if check_existing_batch(conn):
        print(f"ABORT")
        print(f"  Batch '{BATCH_ID}' already exists in tbl_project_assumption.")
        print(f"  Run the cleanup script first, or use a different batch ID.")
        conn.close()
        sys.exit(1)
    print("clean (no existing batch found)")

    # --- Authenticate ---
    token_mgr = TokenManager()
    token_mgr.authenticate()

    # --- Phase 1: API project creation ---
    project_results = phase1_create_projects(properties, token_mgr)

    if not project_results:
        print("No projects created — aborting Phase 2.")
        conn.close()
        sys.exit(1)

    # --- Phase 2: Bulk SQL ---
    counters, phase2_errors = phase2_bulk_inserts(project_results, conn)

    # --- Phase 3: Summary ---
    # Collect phase 1 errors by checking gap
    phase1_errors = [p for p in properties if p["name"] not in {r[2]["name"] for r in project_results}]
    print_summary(project_results, counters, phase1_errors, phase2_errors)

    conn.close()
    elapsed = time.time() - start
    print(f"\nCompleted in {elapsed:.1f}s")


if __name__ == "__main__":
    main()
