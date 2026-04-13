#!/usr/bin/env python3
"""
Seed User A (gregg, user_id=4) — Knowledge Graph approach.

Loads 200 multifamily properties into knowledge_entities / knowledge_facts /
knowledge_embeddings so Landscaper can retrieve them as market intelligence.

Does NOT create tbl_project records.

Usage:
    OPENAI_API_KEY=<key> DATABASE_URL=<url> python scripts/seed_user_a_knowledge.py

Requires:
    pip install psycopg2-binary openai
"""

import json
import random
import sys
import time
from datetime import datetime

import openai
import psycopg2
import psycopg2.extras

from seed_config import (
    BATCH_ID,
    DATABASE_URL,
    DATA_FILE,
    EMBEDDING_BATCH_SIZE,
    EMBEDDING_DELAY,
    EMBEDDING_MODEL,
    ENTITY_TYPE,
    GREGG_USER_ID,
    OPENAI_API_KEY,
    ORPHAN_PROJECT_ID_MAX,
    ORPHAN_PROJECT_ID_MIN,
    SOURCE_TYPE,
)

# ---------------------------------------------------------------------------
# Phase 0: Cleanup orphaned records from prior (wrong) seed run
# ---------------------------------------------------------------------------

def phase0_cleanup_orphans(conn) -> dict:
    """Delete orphaned entity/fact rows left by the deleted project-based seed."""
    print("\nPhase 0: Cleaning orphaned records...")
    cur = conn.cursor()
    counts = {"facts": 0, "entities": 0, "batch_entities": 0}

    # 1. Delete facts whose subject entity is an orphaned project entity
    cur.execute(
        """DELETE FROM landscape.knowledge_facts
           WHERE subject_entity_id IN (
               SELECT entity_id FROM landscape.knowledge_entities
               WHERE entity_type = 'project'
                 AND canonical_name LIKE 'project:%%'
                 AND CAST(REPLACE(canonical_name, 'project:', '') AS int)
                     BETWEEN %s AND %s
           )""",
        (ORPHAN_PROJECT_ID_MIN, ORPHAN_PROJECT_ID_MAX),
    )
    counts["facts"] = cur.rowcount
    print(f"  Deleted {counts['facts']} orphaned facts")

    # 2. Delete the orphaned entities themselves
    cur.execute(
        """DELETE FROM landscape.knowledge_entities
           WHERE entity_type = 'project'
             AND canonical_name LIKE 'project:%%'
             AND CAST(REPLACE(canonical_name, 'project:', '') AS int)
                 BETWEEN %s AND %s""",
        (ORPHAN_PROJECT_ID_MIN, ORPHAN_PROJECT_ID_MAX),
    )
    counts["entities"] = cur.rowcount
    print(f"  Deleted {counts['entities']} orphaned entities")

    # 3. Also check for any entities tagged with our batch
    #    (in case a partial knowledge-based run happened before)
    cur.execute(
        """DELETE FROM landscape.knowledge_facts
           WHERE subject_entity_id IN (
               SELECT entity_id FROM landscape.knowledge_entities
               WHERE metadata->>'test_batch' = %s
           )""",
        (BATCH_ID,),
    )
    batch_facts = cur.rowcount

    cur.execute(
        """DELETE FROM landscape.knowledge_embeddings
           WHERE 'test_batch:qm_batch_001' = ANY(tags)""",
    )
    batch_embeddings = cur.rowcount

    cur.execute(
        """DELETE FROM landscape.knowledge_entities
           WHERE metadata->>'test_batch' = %s""",
        (BATCH_ID,),
    )
    counts["batch_entities"] = cur.rowcount

    if batch_facts or batch_embeddings or counts["batch_entities"]:
        print(f"  Deleted {batch_facts} batch-tagged facts, "
              f"{batch_embeddings} batch-tagged embeddings, "
              f"{counts['batch_entities']} batch-tagged entities")

    conn.commit()
    cur.close()
    print("Phase 0 complete.")
    return counts


# ---------------------------------------------------------------------------
# Idempotency check
# ---------------------------------------------------------------------------

def check_existing_batch(conn) -> bool:
    """Return True if QM_BATCH_001 entities already exist."""
    cur = conn.cursor()
    cur.execute(
        """SELECT COUNT(*) FROM landscape.knowledge_entities
           WHERE metadata->>'test_batch' = %s""",
        (BATCH_ID,),
    )
    count = cur.fetchone()[0]
    cur.close()
    return count > 0


# ---------------------------------------------------------------------------
# Phase 1: Create knowledge entities
# ---------------------------------------------------------------------------

METRO_TO_MSA = {
    "Phoenix": "Phoenix-Mesa-Chandler",
    "Los Angeles": "Los Angeles-Long Beach-Anaheim",
    "Dallas-Fort Worth": "Dallas-Fort Worth-Arlington",
    "Austin": "Austin-Round Rock-Georgetown",
}


def build_entity_metadata(prop: dict) -> dict:
    """Build the metadata JSONB for a property entity."""
    addr = prop.get("address", {})
    reg = prop.get("regulatory", {})
    src = prop.get("source_metadata", {})

    return {
        "name": prop["name"],
        "address": addr.get("street"),
        "city": addr.get("city"),
        "state": addr.get("state"),
        "zip": addr.get("zip"),
        "submarket": prop.get("submarket"),
        "metro": prop.get("metro"),
        "metro_key": prop.get("metro_key"),
        "msa": METRO_TO_MSA.get(prop.get("metro"), prop.get("metro")),
        "property_type": "multifamily",
        "property_class": prop.get("property_class"),
        "unit_count": prop.get("unit_count"),
        "year_built": prop.get("year_built"),
        "year_renovated": prop.get("year_renovated"),
        "stories": prop.get("stories"),
        "building_count": prop.get("building_count"),
        "construction_type": prop.get("construction_type"),
        "total_rentable_sf": prop.get("total_rentable_sf"),
        "site_acres": prop.get("site_acres"),
        "parking_spaces": prop.get("parking_spaces"),
        "parking_ratio": prop.get("parking_ratio"),
        "parking_type": prop.get("parking_type"),
        "amenities": prop.get("amenities", []),
        "rent_control": reg.get("rent_control", False),
        "rubs_program": reg.get("rubs_program", False),
        "section_8_pct": reg.get("section_8_pct", 0),
        "source_type": src.get("source_type"),
        "data_completeness": src.get("data_completeness"),
        "data_as_of": src.get("data_as_of"),
        "source_property_id": prop.get("id"),
        "test_batch": BATCH_ID,
    }


def phase1_create_entities(properties: list, conn) -> list:
    """Insert one knowledge_entities row per property.

    Returns list of (entity_id, prop_dict) tuples.
    """
    print(f"\nPhase 1: Creating {len(properties)} knowledge entities...")
    cur = conn.cursor()
    results = []
    errors = []

    for i, prop in enumerate(properties):
        canonical = f"mf_comp:{prop['id'].lower()}"
        metadata = build_entity_metadata(prop)

        try:
            cur.execute(
                """INSERT INTO landscape.knowledge_entities
                   (canonical_name, entity_type, entity_subtype, metadata, created_at, created_by_id)
                   VALUES (%s, %s, %s, %s, NOW(), %s)
                   RETURNING entity_id""",
                (canonical, ENTITY_TYPE, "multifamily", json.dumps(metadata), GREGG_USER_ID),
            )
            entity_id = cur.fetchone()[0]
            results.append((entity_id, prop))
            conn.commit()

            if (i + 1) % 50 == 0:
                print(f"  [{i+1}/{len(properties)}] entities created")

        except Exception as e:
            errors.append((prop["name"], str(e)))
            print(f"  ERROR creating entity for {prop['name']}: {e}")
            conn.rollback()

    if results:
        ids = [r[0] for r in results]
        print(f"Phase 1 complete: {len(results)} entities (IDs {min(ids)}-{max(ids)})")
    else:
        print("Phase 1 complete: 0 entities created")

    if errors:
        print(f"  Phase 1 errors: {len(errors)}")
    cur.close()
    return results


# ---------------------------------------------------------------------------
# Phase 2: Create knowledge facts
# ---------------------------------------------------------------------------

def slugify(s: str) -> str:
    """Convert expense name to slug: 'Real Estate Taxes' -> 'real_estate_taxes'."""
    return s.lower().replace(" ", "_").replace("&", "and").replace("/", "_").replace("-", "_")


def build_facts_for_property(entity_id: int, prop: dict) -> list:
    """Build all fact tuples for one property.

    Each tuple: (subject_entity_id, predicate, object_value, object_entity_id,
                 valid_from, valid_to, source_type, confidence_score,
                 is_current, created_by_id)
    """
    facts = []

    def add_fact(predicate, value, valid_from=None, confidence=None):
        if value is None:
            return
        conf = confidence or round(random.uniform(0.88, 0.98), 2)
        facts.append((
            entity_id,           # subject_entity_id
            predicate,           # predicate
            str(value),          # object_value
            None,                # object_entity_id
            valid_from,          # valid_from
            None,                # valid_to
            SOURCE_TYPE,         # source_type
            conf,                # confidence_score
            True,                # is_current
            GREGG_USER_ID,       # created_by_id
        ))

    # --- T-12 operating data ---
    t12 = prop.get("t12") or {}
    rev = t12.get("revenue", {})

    add_fact("gpr", rev.get("gross_potential_rent"))
    add_fact("has_assumption:vacancy_rate", rev.get("vacancy_pct"))
    add_fact("egi", rev.get("effective_gross_income"))
    add_fact("total_opex", t12.get("total_expenses"))
    add_fact("expense_ratio", t12.get("expense_ratio"))
    add_fact("noi", t12.get("noi"))
    add_fact("noi_per_unit", t12.get("noi_per_unit"))
    add_fact("expenses_per_unit", t12.get("expense_per_unit"))

    # Revenue sub-items
    add_fact("vacancy_loss", rev.get("vacancy_loss"))
    add_fact("concession_loss", rev.get("concession_loss"))
    add_fact("bad_debt", rev.get("bad_debt"))
    add_fact("net_rental_income", rev.get("net_rental_income"))
    add_fact("other_income", rev.get("other_income"))

    # Expense line items (full/moderate completeness)
    completeness = prop.get("source_metadata", {}).get("data_completeness", "sparse")
    expenses = t12.get("expenses", {})
    if completeness in ("full", "moderate") and expenses:
        for exp_name, amount in expenses.items():
            add_fact(f"opex:{slugify(exp_name)}", abs(amount) if amount else 0)

    # --- Floor plan / rent facts ---
    for fp in prop.get("floor_plan_matrix", []):
        code = slugify(fp.get("unit_type", "unknown"))
        add_fact(f"unit_type:{code}:count", fp.get("unit_count"))
        add_fact(f"unit_type:{code}:avg_sf", fp.get("avg_sf"))
        add_fact(f"unit_type:{code}:avg_rent", fp.get("avg_rent"))
        add_fact(f"unit_type:{code}:market_rent", fp.get("market_rent"))
        add_fact(f"unit_type:{code}:rent_per_sf", fp.get("rent_per_sf"))

    # Compute property-level rent facts from floor plans
    # (UserKnowledgeRetriever filters on: asking_rent, effective_rent, rent_per_sf)
    floor_plans = prop.get("floor_plan_matrix", [])
    total_fp_units = sum(fp.get("unit_count", 0) for fp in floor_plans)
    if total_fp_units > 0 and floor_plans:
        wavg_rent = sum(
            fp.get("avg_rent", 0) * fp.get("unit_count", 0) for fp in floor_plans
        ) / total_fp_units
        wavg_market = sum(
            fp.get("market_rent", 0) * fp.get("unit_count", 0) for fp in floor_plans
        ) / total_fp_units
        wavg_sf = sum(
            fp.get("avg_sf", 0) * fp.get("unit_count", 0) for fp in floor_plans
        ) / total_fp_units
        add_fact("asking_rent", round(wavg_market))
        add_fact("effective_rent", round(wavg_rent))
        if wavg_sf > 0:
            add_fact("rent_per_sf", round(wavg_rent / wavg_sf, 2))

    # Also store full unit mix as JSON for convenient retrieval
    if floor_plans:
        add_fact("unit_mix", json.dumps(floor_plans))

    # --- Rent roll summary (if available) ---
    rr = prop.get("rent_roll")
    if rr:
        add_fact("has_rent_roll", "true")
        add_fact("rent_roll_unit_count", len(rr))
        occupied = sum(1 for u in rr if u.get("status") == "Occupied")
        add_fact("rent_roll_occupancy_pct", round(occupied / len(rr), 4) if rr else None)

    # --- Sale transactions ---
    for txn in prop.get("sale_transactions", []):
        sale_date = txn.get("sale_date")
        add_fact("sale_price", txn.get("sale_price"), valid_from=sale_date)
        add_fact("price_per_unit", txn.get("price_per_unit"), valid_from=sale_date)
        add_fact("sale_cap_rate", txn.get("cap_rate"), valid_from=sale_date)
        add_fact("sale_date", sale_date, valid_from=sale_date)
        add_fact("condition_at_sale", txn.get("condition_at_sale"), valid_from=sale_date)
        add_fact("buyer_type", txn.get("buyer_type"), valid_from=sale_date)
        add_fact("seller_type", txn.get("seller_type"), valid_from=sale_date)

        # Debt facts
        debt = txn.get("debt")
        if debt:
            orig_date = debt.get("origination_date")
            add_fact("loan_amount", debt.get("loan_amount"), valid_from=orig_date)
            add_fact("loan_ltv", debt.get("ltv"), valid_from=orig_date)
            add_fact("loan_rate", debt.get("interest_rate"), valid_from=orig_date)
            add_fact("loan_term", debt.get("term_years"), valid_from=orig_date)
            add_fact("loan_amortization", debt.get("amortization_years"), valid_from=orig_date)
            add_fact("loan_io_months", debt.get("io_period_months"), valid_from=orig_date)
            add_fact("lender_type", debt.get("lender_type"), valid_from=orig_date)
            add_fact("loan_dscr", debt.get("dscr"), valid_from=orig_date)
            add_fact("annual_debt_service", debt.get("annual_debt_service"), valid_from=orig_date)

    # --- Regulatory / program facts ---
    reg = prop.get("regulatory", {})
    if reg.get("rent_control"):
        add_fact("rent_control", "true")
    if reg.get("rubs_program"):
        add_fact("rubs_program", "true")
    if reg.get("section_8_pct"):
        add_fact("section_8_pct", reg["section_8_pct"])

    # --- Physical / location assumptions ---
    add_fact("has_assumption:cap_rate", None)  # skip — only if we have a cap rate
    # Store key assumptions that UserKnowledgeRetriever looks for
    if rev.get("vacancy_pct") is not None:
        pass  # already stored as has_assumption:vacancy_rate above
    if t12.get("expense_ratio") is not None:
        add_fact("has_assumption:expense_ratio", t12["expense_ratio"])

    return facts


def phase2_create_facts(entity_results: list, conn) -> int:
    """Batch-insert knowledge facts for all entities."""
    print(f"\nPhase 2: Creating knowledge facts...")
    cur = conn.cursor()
    total = 0
    errors = []

    all_facts = []
    for entity_id, prop in entity_results:
        try:
            facts = build_facts_for_property(entity_id, prop)
            all_facts.extend(facts)
        except Exception as e:
            errors.append((entity_id, prop["name"], str(e)))
            print(f"  ERROR building facts for {prop['name']}: {e}")

    # Batch insert in chunks of 1000
    CHUNK = 1000
    for i in range(0, len(all_facts), CHUNK):
        chunk = all_facts[i:i + CHUNK]
        try:
            psycopg2.extras.execute_batch(
                cur,
                """INSERT INTO landscape.knowledge_facts
                   (subject_entity_id, predicate, object_value, object_entity_id,
                    valid_from, valid_to, source_type, confidence_score,
                    is_current, created_at, created_by_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)""",
                chunk,
                page_size=500,
            )
            conn.commit()
            total += len(chunk)
            if (i + CHUNK) % 1000 == 0 or i + CHUNK >= len(all_facts):
                print(f"  [{total}/{len(all_facts)}] facts inserted")
        except Exception as e:
            errors.append((None, f"chunk at offset {i}", str(e)))
            print(f"  ERROR inserting fact chunk at offset {i}: {e}")
            conn.rollback()

    cur.close()
    print(f"Phase 2 complete: {total:,} facts created")
    if errors:
        print(f"  Phase 2 errors: {len(errors)}")
    return total


# ---------------------------------------------------------------------------
# Phase 3: Create knowledge embeddings
# ---------------------------------------------------------------------------

def build_embedding_text(prop: dict) -> str:
    """Build natural language summary for embedding."""
    t12 = prop.get("t12") or {}
    rev = t12.get("revenue", {})
    addr = prop.get("address", {})
    lines = []

    lines.append(
        f"{prop['name']}, {prop.get('unit_count', '?')} units, "
        f"Class {prop.get('property_class', '?')}"
    )
    lines.append(
        f"{addr.get('street', '')}, {addr.get('city', '')}, "
        f"{addr.get('state', '')} {addr.get('zip', '')}"
    )
    lines.append(f"{prop.get('submarket', '')} submarket, {prop.get('metro', '')} metro")
    lines.append(
        f"Built {prop.get('year_built', '?')}, {prop.get('stories', '?')} stories, "
        f"{prop.get('construction_type', '?')}"
    )
    if prop.get("year_renovated"):
        lines.append(f"Renovated {prop['year_renovated']}")

    sf = prop.get("total_rentable_sf")
    if sf:
        lines.append(f"{sf:,} rentable SF, {prop.get('site_acres', '?')} acres")

    # Operating data
    if t12:
        noi = t12.get("noi")
        if noi is not None:
            noi_pu = t12.get("noi_per_unit", 0)
            lines.append(f"T-12 NOI: ${noi:,.0f} (${noi_pu:,.0f}/unit)")
        vac = rev.get("vacancy_pct")
        if vac is not None:
            lines.append(f"Vacancy: {vac:.1%}")
        er = t12.get("expense_ratio")
        if er is not None:
            lines.append(f"Expense ratio: {er:.1%}")
        gpr = rev.get("gross_potential_rent")
        if gpr is not None:
            lines.append(f"GPR: ${gpr:,.0f}")
        egi = rev.get("effective_gross_income")
        if egi is not None:
            lines.append(f"EGI: ${egi:,.0f}")

    # Unit mix
    for fp in prop.get("floor_plan_matrix", []):
        avg_rent = fp.get("avg_rent", 0)
        lines.append(
            f"{fp.get('unit_type', '?')}: {fp.get('unit_count', '?')} units, "
            f"{fp.get('avg_sf', '?')} SF, ${avg_rent:,.0f}/mo"
        )

    # Sales
    for txn in prop.get("sale_transactions", []):
        price = txn.get("sale_price", 0)
        ppu = txn.get("price_per_unit", 0)
        cap = txn.get("cap_rate", 0)
        lines.append(
            f"Sold {txn.get('sale_date', '?')} for ${price:,.0f} "
            f"(${ppu:,.0f}/unit, {cap:.2%} cap)"
        )
        lines.append(
            f"Condition: {txn.get('condition_at_sale', '?')}, "
            f"Buyer: {txn.get('buyer_type', '?')}"
        )
        debt = txn.get("debt")
        if debt:
            la = debt.get("loan_amount", 0)
            ir = debt.get("interest_rate", 0)
            lines.append(
                f"Financing: ${la:,.0f} at {ir:.2%}, "
                f"{debt.get('term_years', '?')}yr, {debt.get('lender_type', '?')}"
            )

    # Regulatory
    reg = prop.get("regulatory", {})
    if reg.get("rent_control"):
        lines.append("Subject to rent control")
    if reg.get("rubs_program"):
        lines.append("RUBS utility billing program active")
    s8 = reg.get("section_8_pct", 0)
    if s8 and s8 > 0:
        lines.append(f"Section 8: {s8:.0%} of units")

    return "\n".join(lines)


def generate_embeddings_batch(texts: list) -> list:
    """Call OpenAI ada-002 for a batch of texts. Returns list of 1536-dim vectors."""
    response = openai.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
    )
    # Sort by index to preserve order
    sorted_data = sorted(response.data, key=lambda x: x.index)
    return [d.embedding for d in sorted_data]


def phase3_create_embeddings(entity_results: list, conn) -> int:
    """Generate text summaries, embed via OpenAI, insert into knowledge_embeddings."""
    print(f"\nPhase 3: Generating embeddings (OpenAI ada-002)...")

    if not OPENAI_API_KEY:
        print("  WARNING: OPENAI_API_KEY not set — skipping embeddings.")
        print("  Set the env var and re-run to populate embeddings.")
        return 0

    openai.api_key = OPENAI_API_KEY
    cur = conn.cursor()
    total = 0
    errors = []

    # Build all texts and metadata upfront
    items = []  # list of (entity_id, prop, text, tags)
    for entity_id, prop in entity_results:
        text = build_embedding_text(prop)
        tags = [
            "property_type:multifamily",
            f"market:{prop.get('metro_key', 'unknown').lower()}",
            f"submarket:{slugify(prop.get('submarket', 'unknown'))}",
            f"class:{prop.get('property_class', '?').lower().replace('+', 'plus').replace('-', 'minus')}",
            f"test_batch:qm_batch_001",
        ]
        items.append((entity_id, prop, text, tags))

    # Process in batches
    for batch_start in range(0, len(items), EMBEDDING_BATCH_SIZE):
        batch = items[batch_start:batch_start + EMBEDDING_BATCH_SIZE]
        texts = [it[2] for it in batch]

        try:
            vectors = generate_embeddings_batch(texts)
        except Exception as e:
            errors.append((batch_start, str(e)))
            print(f"  ERROR at batch offset {batch_start}: {e}")
            # Retry once after a pause
            time.sleep(2)
            try:
                vectors = generate_embeddings_batch(texts)
            except Exception as e2:
                errors.append((batch_start, f"retry failed: {e2}"))
                print(f"  RETRY FAILED at batch offset {batch_start}: {e2}")
                continue

        for j, (entity_id, prop, text, tags) in enumerate(batch):
            vec = vectors[j]
            try:
                cur.execute(
                    """INSERT INTO landscape.knowledge_embeddings
                       (content_text, embedding, source_type, source_id,
                        entity_ids, tags, created_at)
                       VALUES (%s, %s::vector, %s, %s, ARRAY[%s], %s, NOW())""",
                    (
                        text,
                        str(vec),  # pgvector accepts string representation
                        SOURCE_TYPE,
                        entity_id,
                        entity_id,
                        tags,
                    ),
                )
                total += 1
            except Exception as e:
                errors.append((entity_id, str(e)))
                print(f"  ERROR inserting embedding for entity {entity_id}: {e}")
                conn.rollback()
                cur = conn.cursor()
                continue

        conn.commit()

        done = min(batch_start + EMBEDDING_BATCH_SIZE, len(items))
        if done % 50 == 0 or done == len(items):
            print(f"  [{done}/{len(items)}] embeddings generated")

        if EMBEDDING_DELAY > 0:
            time.sleep(EMBEDDING_DELAY)

    cur.close()
    print(f"Phase 3 complete: {total} embeddings stored")
    if errors:
        print(f"  Phase 3 errors: {len(errors)}")
    return total


# ---------------------------------------------------------------------------
# Phase 5: Summary report
# ---------------------------------------------------------------------------

def print_summary(orphan_counts, entity_count, fact_count, embedding_count, errors_total, elapsed):
    print("\n" + "=" * 50)
    print("          SEEDING COMPLETE")
    print("=" * 50)
    print(f"  Orphans cleaned:  {orphan_counts.get('entities', 0)} entities, "
          f"{orphan_counts.get('facts', 0)} facts")
    print(f"  Entities:         {entity_count}")
    print(f"  Facts:            {fact_count:,}")
    print(f"  Embeddings:       {embedding_count}")
    print(f"  Errors:           {errors_total}")
    print(f"  Time:             {elapsed:.1f}s")
    print("=" * 50)


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
        sys.exit(1)

    print("Connecting to database...", end="")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    print("OK")

    # --- Phase 0: Cleanup orphans ---
    orphan_counts = phase0_cleanup_orphans(conn)

    # --- Idempotency check ---
    print(f"\nChecking for existing {BATCH_ID} data...", end="")
    if check_existing_batch(conn):
        print("ABORT")
        print(f"  Batch '{BATCH_ID}' entities already exist in knowledge_entities.")
        print("  Phase 0 should have cleaned them — check for errors above.")
        conn.close()
        sys.exit(1)
    print("clean")

    # --- Phase 1: Create entities ---
    entity_results = phase1_create_entities(properties, conn)
    if not entity_results:
        print("No entities created — aborting.")
        conn.close()
        sys.exit(1)

    # --- Phase 2: Create facts ---
    fact_count = phase2_create_facts(entity_results, conn)

    # --- Phase 3: Create embeddings ---
    embedding_count = phase3_create_embeddings(entity_results, conn)

    # --- Phase 5: Summary ---
    elapsed = time.time() - start
    errors_total = (
        len(properties) - len(entity_results)  # failed entities
    )
    print_summary(orphan_counts, len(entity_results), fact_count, embedding_count,
                  errors_total, elapsed)

    conn.close()


if __name__ == "__main__":
    main()
