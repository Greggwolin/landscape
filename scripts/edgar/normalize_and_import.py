#!/usr/bin/env python3
"""
Normalize EDGAR-extracted concept data and import into the catalog.

Reads all JSON files in scripts/edgar/output/, dedupes concepts across REITs,
assigns each to a category, and inserts into tbl_concept_category and
tbl_concept with provenance metadata.

Idempotent — re-running merges new REIT-source citations into existing
concept rows rather than duplicating.

Session: LSCMD-NLF-0507-OP3
Block 3 of Increment 3.

Usage:
    python scripts/edgar/normalize_and_import.py             # imports for real
    python scripts/edgar/normalize_and_import.py --dry-run   # show only
"""

import os
import re
import sys
import json
import argparse
from datetime import date
from pathlib import Path
from collections import defaultdict

import psycopg2

try:
    from dotenv import load_dotenv
    repo_root = Path(__file__).resolve().parent.parent.parent
    env_path = repo_root / '.cowork-django-env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass


# ============================================================================
# Categories — the controlled list at v1
# ============================================================================
# Each tuple: (code, display_name, sort_order, description)
CATEGORIES = [
    ('AUTO_SVC',       'Auto Service',                 10, 'Lube shops, auto repair, tire, auto spa, car wash'),
    ('QSR',            'Quick-Serve Restaurant',       20, 'Fast food, drive-thru-driven QSR concepts'),
    ('CASUAL_DINING',  'Casual Dining',                30, 'Sit-down casual dining and family dining'),
    ('CONVENIENCE',    'Convenience &amp; Fuel',           40, 'C-stores with or without fuel canopies'),
    ('PHARMACY',       'Pharmacy',                     50, 'Pharmacy and drug store concepts'),
    ('DOLLAR_STORE',   'Dollar Store',                 60, 'Discount and dollar-format retail'),
    ('MEDICAL',        'Medical Service',              70, 'Medical, dental, urgent care, diagnostic, dialysis, surgical'),
    ('SPECIALTY_RTL',  'Specialty Retail',             80, 'Sporting goods, pet, beauty, electronics, hobby retail'),
    ('GROCERY',        'Grocery',                      90, 'Grocery, supermarket, specialty grocery'),
    ('BIG_BOX',        'Big-Box Retail',              100, 'Big-box discount, off-price apparel, club stores'),
    ('HOME_IMPROVE',   'Home Improvement',            110, 'Home improvement, building materials, furniture, home goods'),
    ('FITNESS',        'Fitness',                     120, 'Health clubs, gyms, fitness studios'),
    ('CINEMA',         'Cinema',                      130, 'Movie theaters and entertainment venues'),
    ('EDUCATION',      'Education &amp; Childcare',        140, 'Early childhood, K-12, higher education, childcare'),
    ('FINANCIAL',      'Bank &amp; Financial Services',     150, 'Bank branches, financial services'),
    ('AUTOMOTIVE_RTL', 'Automotive Retail',           160, 'Auto dealers, parts retail'),
    ('INDUSTRIAL',     'Industrial &amp; Distribution',     170, 'Distribution, warehousing, light industrial'),
    ('SELF_STORAGE',   'Self-Storage',                180, 'Self-storage facilities'),
    ('HOSPITALITY',    'Hospitality',                 190, 'Hotels, lodging'),
    ('OTHER',          'Other',                       900, 'Concepts not yet classified into a primary category'),
]


# ============================================================================
# Concept name normalization — maps extracted names to canonical names + category
# ============================================================================
# Rules: case-insensitive match on lowercased extracted name. Match the FIRST
# matching pattern wins. Patterns are substring matches against the lowercased
# extracted concept name.
NORMALIZATION = [
    # (lowercase pattern, canonical name, category code)
    # Auto Service
    ('car wash',                       'Car Wash',                          'AUTO_SVC'),
    ('automotive service',             'Automotive Service',                'AUTO_SVC'),
    ('auto service',                   'Automotive Service',                'AUTO_SVC'),
    ('auto repair',                    'Auto Repair',                       'AUTO_SVC'),
    ('lube',                           'Lube Shop',                         'AUTO_SVC'),
    ('quick lube',                     'Lube Shop',                         'AUTO_SVC'),
    ('tire',                           'Tire Service',                      'AUTO_SVC'),
    ('automotive aftermarket',         'Automotive Aftermarket',            'AUTO_SVC'),
    ('automotive parts',               'Automotive Parts Retail',           'AUTOMOTIVE_RTL'),
    ('automotive dealers',             'Automotive Dealer',                 'AUTOMOTIVE_RTL'),
    ('automotive dealer',              'Automotive Dealer',                 'AUTOMOTIVE_RTL'),

    # QSR
    ('quick service',                  'Quick-Serve Restaurant',            'QSR'),
    ('quick-service',                  'Quick-Serve Restaurant',            'QSR'),
    ('quick serve',                    'Quick-Serve Restaurant',            'QSR'),
    ('qsr',                            'Quick-Serve Restaurant',            'QSR'),
    ('fast food',                      'Quick-Serve Restaurant',            'QSR'),
    ('fast casual',                    'Fast Casual Restaurant',            'QSR'),
    ('quick service & casual dining',  'Quick-Serve Restaurant',            'QSR'),

    # Casual / Family Dining
    ('family dining',                  'Family Dining',                     'CASUAL_DINING'),
    ('casual dining',                  'Casual Dining',                     'CASUAL_DINING'),
    ('full service restaurant',        'Full-Service Restaurant',           'CASUAL_DINING'),
    ('restaurant',                     'Restaurant (Other)',                'CASUAL_DINING'),

    # C-Store
    ('convenience store',              'Convenience Store',                 'CONVENIENCE'),
    ('convenience',                    'Convenience Store',                 'CONVENIENCE'),
    ('c-store',                        'Convenience Store',                 'CONVENIENCE'),
    ('gas station',                    'Gas Station / C-Store',             'CONVENIENCE'),
    ('fuel',                           'Gas Station / C-Store',             'CONVENIENCE'),

    # Pharmacy
    ('pharmacy',                       'Pharmacy',                          'PHARMACY'),
    ('drug store',                     'Pharmacy',                          'PHARMACY'),
    ('drugstore',                      'Pharmacy',                          'PHARMACY'),

    # Dollar Store
    ('dollar store',                   'Dollar Store',                      'DOLLAR_STORE'),
    ('dollar',                         'Dollar Store',                      'DOLLAR_STORE'),
    ('discount store',                 'Discount Store',                    'DOLLAR_STORE'),

    # Medical
    ('medical',                        'Medical / Dental',                  'MEDICAL'),
    ('dental',                         'Medical / Dental',                  'MEDICAL'),
    ('urgent care',                    'Urgent Care',                       'MEDICAL'),
    ('diagnostic',                     'Diagnostic Lab',                    'MEDICAL'),
    ('dialysis',                       'Dialysis Center',                   'MEDICAL'),
    ('surgical',                       'Surgical Center',                   'MEDICAL'),
    ('veterinary',                     'Veterinary',                        'MEDICAL'),
    ('healthcare',                     'Healthcare',                        'MEDICAL'),
    ('health and fitness',             'Health and Fitness',                'FITNESS'),

    # Specialty Retail
    ('pet supplies',                   'Pet Supplies',                      'SPECIALTY_RTL'),
    ('pet supply',                     'Pet Supplies',                      'SPECIALTY_RTL'),
    ('sporting goods',                 'Sporting Goods',                    'SPECIALTY_RTL'),
    ('hobby',                          'Hobby Retail',                      'SPECIALTY_RTL'),
    ('crafts',                         'Crafts Retail',                     'SPECIALTY_RTL'),
    ('beauty',                         'Beauty &amp; Cosmetics',                'SPECIALTY_RTL'),
    ('cosmetics',                      'Beauty &amp; Cosmetics',                'SPECIALTY_RTL'),
    ('off-price',                      'Off-Price Apparel',                 'BIG_BOX'),
    ('apparel',                        'Apparel Retail',                    'SPECIALTY_RTL'),
    ('jewelry',                        'Jewelry',                           'SPECIALTY_RTL'),
    ('wireless',                       'Wireless Retail',                   'SPECIALTY_RTL'),
    ('mattress',                       'Mattress Retail',                   'SPECIALTY_RTL'),

    # Grocery
    ('grocery',                        'Grocery',                           'GROCERY'),
    ('supermarket',                    'Supermarket',                       'GROCERY'),

    # Big-Box / Home Improvement
    ('big box',                        'Big-Box Retail',                    'BIG_BOX'),
    ('big-box',                        'Big-Box Retail',                    'BIG_BOX'),
    ('home improvement',               'Home Improvement',                  'HOME_IMPROVE'),
    ('home furnishings',               'Home Furnishings',                  'HOME_IMPROVE'),
    ('home goods',                     'Home Goods',                        'HOME_IMPROVE'),
    ('furniture',                      'Furniture Retail',                  'HOME_IMPROVE'),
    ('building materials',             'Building Materials',                'HOME_IMPROVE'),

    # Fitness
    ('fitness',                        'Fitness',                           'FITNESS'),
    ('health club',                    'Fitness',                           'FITNESS'),
    ('gym',                            'Fitness',                           'FITNESS'),

    # Cinema
    ('movie theater',                  'Cinema',                            'CINEMA'),
    ('cinema',                         'Cinema',                            'CINEMA'),
    ('theater',                        'Cinema',                            'CINEMA'),
    ('entertainment',                  'Entertainment',                     'CINEMA'),

    # Education
    ('early childhood',                'Early Childhood Education',         'EDUCATION'),
    ('education',                      'Education',                         'EDUCATION'),
    ('childcare',                      'Childcare',                         'EDUCATION'),
    ('learning center',                'Learning Center',                   'EDUCATION'),
    ('school',                         'Education',                         'EDUCATION'),

    # Financial
    ('bank',                           'Bank Branch',                       'FINANCIAL'),
    ('financial services',             'Financial Services',                'FINANCIAL'),
    ('credit union',                   'Credit Union',                      'FINANCIAL'),

    # Industrial
    ('industrial',                     'Industrial / Distribution',         'INDUSTRIAL'),
    ('distribution',                   'Industrial / Distribution',         'INDUSTRIAL'),
    ('warehouse',                      'Industrial / Distribution',         'INDUSTRIAL'),
    ('manufacturing',                  'Manufacturing',                     'INDUSTRIAL'),
    ('logistics',                      'Industrial / Distribution',         'INDUSTRIAL'),
    ('equipment rental',               'Equipment Rental &amp; Sales',          'INDUSTRIAL'),
    ('transportation services',        'Transportation Services',           'INDUSTRIAL'),
    ('transportation',                 'Transportation Services',           'INDUSTRIAL'),

    # Auto parts / dealerships
    ('auto parts',                     'Automotive Parts Retail',           'AUTOMOTIVE_RTL'),
    ('motor vehicle dealership',       'Automotive Dealer',                 'AUTOMOTIVE_RTL'),
    ('motor vehicle',                  'Automotive Dealer',                 'AUTOMOTIVE_RTL'),
    ('dealerships',                    'Automotive Dealer',                 'AUTOMOTIVE_RTL'),

    # Specialty retail extensions
    ('consumer electronics',           'Consumer Electronics',              'SPECIALTY_RTL'),
    ('electronics',                    'Consumer Electronics',              'SPECIALTY_RTL'),
    ('office supplies',                'Office Supplies',                   'SPECIALTY_RTL'),
    ('shoes',                          'Footwear Retail',                   'SPECIALTY_RTL'),
    ('footwear',                       'Footwear Retail',                   'SPECIALTY_RTL'),
    ('pet care',                       'Pet Care Services',                 'SPECIALTY_RTL'),
    ('pet ',                           'Pet Supplies',                      'SPECIALTY_RTL'),
    ('specialty retail',               'Specialty Retail (Generic)',        'SPECIALTY_RTL'),

    # Big-box extensions
    ('wholesale club',                 'Wholesale Club',                    'BIG_BOX'),
    ('general merchandise',            'General Merchandise',               'BIG_BOX'),
    ('farm and rural',                 'Farm &amp; Rural Supply',                'BIG_BOX'),
    ('farm supply',                    'Farm &amp; Rural Supply',                'BIG_BOX'),

    # Grocery extensions
    ('food retail',                    'Food Retail',                       'GROCERY'),
    ('packaged foods',                 'Packaged Foods Retail',             'GROCERY'),

    # Health services
    ('health care',                    'Health Care Services',              'MEDICAL'),
    ('health services',                'Health Care Services',              'MEDICAL'),

    # Gaming / entertainment
    ('gaming',                         'Gaming &amp; Casino',                   'CINEMA'),
    ('casino',                         'Gaming &amp; Casino',                   'CINEMA'),

    # Self-Storage
    ('self-storage',                   'Self-Storage',                      'SELF_STORAGE'),
    ('self storage',                   'Self-Storage',                      'SELF_STORAGE'),
    ('storage',                        'Self-Storage',                      'SELF_STORAGE'),

    # Hospitality
    ('hotel',                          'Hotel / Lodging',                   'HOSPITALITY'),
    ('lodging',                        'Hotel / Lodging',                   'HOSPITALITY'),
]

# Generic concepts to filter out — too broad to be meaningful catalog entries
DROP_PATTERNS = {'other', 'miscellaneous', 'other services', 'retail', 'specialty'}


def normalize_concept(extracted_name: str) -> tuple:
    """Return (canonical_name, category_code) for an extracted concept.
    Falls back to (extracted_name, 'OTHER') if no rule matches."""
    name_lower = extracted_name.lower().strip()
    for pattern, canonical, category in NORMALIZATION:
        if pattern in name_lower:
            return canonical, category
    return extracted_name.strip(), 'OTHER'


def load_extraction_files(output_dir: Path) -> list:
    """Load all extraction JSON files. Skip dry-runs."""
    results = []
    for path in sorted(output_dir.glob('concept_extraction_*.json')):
        try:
            data = json.loads(path.read_text())
            if data.get('dry_run'):
                continue
            results.append((path.name, data))
        except Exception as e:
            print(f"  WARNING: skipping {path.name}: {e}")
    return results


def consolidate_concepts(extraction_files: list) -> dict:
    """Merge concepts across REITs. Returns dict keyed by canonical concept name.

    Filters: only type='industry' or 'concept' entries (drops type='tenant' which
    are specific company names and belong in tbl_operator, and drops
    type='property_type' which are too broad). Drops generic catch-all names.
    """
    concepts = {}
    for filename, data in extraction_files:
        for reit_name, reit_data in data.get('reits', {}).items():
            if reit_data.get('error'):
                continue
            for raw in reit_data.get('concepts', []):
                # Filter by type — only industries / concepts go in the catalog
                if raw.get('type') not in ('industry', 'concept'):
                    continue
                # Drop generic catch-all names
                if raw['concept'].lower().strip() in DROP_PATTERNS:
                    continue
                canonical, category = normalize_concept(raw['concept'])
                key = canonical.lower()

                if key not in concepts:
                    concepts[key] = {
                        'canonical_name': canonical,
                        'category_code': category,
                        'extracted_aliases': set(),
                        'naics_codes': set(),
                        'seeded_from_reits': set(),
                        'sample_metrics': [],
                    }

                entry = concepts[key]
                if raw['concept'] != canonical:
                    entry['extracted_aliases'].add(raw['concept'])
                if raw.get('naics_code'):
                    entry['naics_codes'].add(raw['naics_code'])
                entry['seeded_from_reits'].add(reit_name)
                entry['sample_metrics'].append({
                    'reit': reit_name,
                    'properties': raw.get('properties_count'),
                    'abr_pct': raw.get('abr_pct'),
                })

    # Convert sets to sorted lists
    for entry in concepts.values():
        entry['extracted_aliases'] = sorted(entry['extracted_aliases'])
        entry['naics_codes'] = sorted(entry['naics_codes'])
        entry['seeded_from_reits'] = sorted(entry['seeded_from_reits'])

    return concepts


def import_categories(cur, dry_run: bool = False):
    """Insert categories. Idempotent via ON CONFLICT."""
    inserted = 0
    if dry_run:
        print(f"  Would insert {len(CATEGORIES)} categories")
        return
    for code, name, sort_order, description in CATEGORIES:
        cur.execute("""
            INSERT INTO landscape.tbl_concept_category (category_code, category_name, sort_order, description, is_active)
            VALUES (%s, %s, %s, %s, true)
            ON CONFLICT (category_code) DO UPDATE
                SET category_name = EXCLUDED.category_name,
                    sort_order = EXCLUDED.sort_order,
                    description = EXCLUDED.description,
                    updated_at = NOW()
        """, (code, name, sort_order, description))
        inserted += 1
    print(f"  Upserted {inserted} categories")


def import_concepts(cur, concepts: dict, dry_run: bool = False):
    """Insert concepts. Idempotent — merges aliases and seeded_from_reits."""
    inserted = 0
    if dry_run:
        print(f"  Would insert/upsert {len(concepts)} concepts")
        return

    # Map category code -> id
    cur.execute("SELECT category_code, category_id FROM landscape.tbl_concept_category")
    cat_id_by_code = dict(cur.fetchall())

    for key, entry in concepts.items():
        canonical = entry['canonical_name']
        # Build a stable concept_code from canonical name (uppercase, underscores)
        concept_code = re.sub(r'[^A-Z0-9]+', '_', canonical.upper()).strip('_')[:40]
        category_id = cat_id_by_code[entry['category_code']]
        naics = entry['naics_codes'][0] if entry['naics_codes'] else None
        alt_naics = ','.join(entry['naics_codes'][1:]) if len(entry['naics_codes']) > 1 else None
        aliases = entry['extracted_aliases']
        seeded_from = entry['seeded_from_reits']

        cur.execute("""
            INSERT INTO landscape.tbl_concept (
                concept_code, concept_name, category_id, naics_code,
                alternative_naics_codes, aliases, seed_source, seeded_from_reits,
                seeded_at, last_refreshed_at, is_active, is_curated, notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'EDGAR', %s, %s, NOW(), true, false, %s)
            ON CONFLICT (concept_code) DO UPDATE
                SET aliases = (
                        SELECT array_agg(DISTINCT a) FROM unnest(
                            COALESCE(landscape.tbl_concept.aliases, ARRAY[]::TEXT[]) || EXCLUDED.aliases
                        ) AS a
                    ),
                    seeded_from_reits = (
                        SELECT array_agg(DISTINCT r) FROM unnest(
                            COALESCE(landscape.tbl_concept.seeded_from_reits, ARRAY[]::TEXT[]) || EXCLUDED.seeded_from_reits
                        ) AS r
                    ),
                    last_refreshed_at = NOW(),
                    updated_at = NOW()
        """, (
            concept_code, canonical, category_id, naics, alt_naics,
            aliases, seeded_from, date.today(),
            f"Seeded from EDGAR extraction across {len(seeded_from)} REIT 10-K filings"
        ))
        inserted += 1
    print(f"  Upserted {inserted} concepts")


def main():
    parser = argparse.ArgumentParser(description='Normalize EDGAR-extracted concepts and import into catalog.')
    parser.add_argument('--dry-run', action='store_true', help='Show plan without writing')
    args = parser.parse_args()

    output_dir = Path(__file__).parent / 'output'
    print(f"Loading extraction files from {output_dir}")
    extraction_files = load_extraction_files(output_dir)
    print(f"  Found {len(extraction_files)} extraction files")

    print("\nConsolidating concepts across REITs...")
    concepts = consolidate_concepts(extraction_files)
    print(f"  Got {len(concepts)} unique canonical concepts")

    # Show category distribution
    cat_counts = defaultdict(int)
    for entry in concepts.values():
        cat_counts[entry['category_code']] += 1
    print("\nCategory distribution:")
    for code, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {code:18} {count} concepts")

    print("\nImporting...")
    db_url = os.environ.get('DATABASE_URL') or open('.cowork-neon-url').read().strip()
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    try:
        import_categories(cur, dry_run=args.dry_run)
        import_concepts(cur, concepts, dry_run=args.dry_run)
        if args.dry_run:
            conn.rollback()
            print("\nDRY RUN — rolled back, no changes committed")
        else:
            conn.commit()
            print("\nCommitted")
    except Exception as e:
        conn.rollback()
        print(f"\nIMPORT FAILED, rolled back: {e}")
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
