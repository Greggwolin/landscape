#!/usr/bin/env python3
"""
EDGAR concept data extraction for net lease REITs.

Fetches the latest 10-K filing for each major net lease REIT from SEC EDGAR,
locates the per-tenant / per-concept exposure section, and uses Anthropic API
to extract structured concept data.

Output: scripts/edgar/output/concept_extraction_<TIMESTAMP>.json

Usage:
    python scripts/edgar/fetch_concept_data.py
    python scripts/edgar/fetch_concept_data.py --reit "Realty Income"
    python scripts/edgar/fetch_concept_data.py --dry-run
    python scripts/edgar/fetch_concept_data.py --output /path/to/out.json

Requires ANTHROPIC_API_KEY in environment. Loaded automatically from
.cowork-django-env if python-dotenv is available.

This script is designed to be extensible — Increment 4 (REIT executive
compensation) will add DEF 14A fetching alongside 10-K, reusing the
fetch_filing_metadata, fetch_filing_content, and strip_html primitives.

Session: LSCMD-NLF-0507-OP3
"""

import os
import re
import sys
import json
import time
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional

import requests

# Load .cowork-django-env if python-dotenv is available
try:
    from dotenv import load_dotenv
    repo_root = Path(__file__).resolve().parent.parent.parent
    env_path = repo_root / '.cowork-django-env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

import anthropic


# ============================================================================
# Configuration
# ============================================================================

USER_AGENT = "Cowork Landscape NetLease Research concept-research@landscape.dev"
SEC_API_BASE = "https://data.sec.gov"
SEC_ARCHIVE_BASE = "https://www.sec.gov/Archives/edgar/data"

# CIKs for the major net lease REITs.
# Source: https://www.sec.gov/cgi-bin/browse-edgar
REITS = {
    'Realty Income': '0000726728',
    'NNN REIT': '0000751364',
    'EPRT': '0001728951',
    'ADC': '0000917251',
    'W. P. Carey': '0001025378',
    'Broadstone': '0001424182',
    'Four Corners': '0001650132',
}

# Anthropic model — match the platform's existing usage for consistency.
CLAUDE_MODEL = "claude-sonnet-4-20250514"

# Section-finding heuristics. These keywords commonly introduce per-tenant /
# per-concept disclosure tables in net lease REIT 10-Ks.
SECTION_KEYWORDS = [
    r'top\s+\d+\s+tenants?',
    r'top\s+tenants?',
    r'top\s+\d+\s+lines?\s+of\s+trade',
    r'lines?\s+of\s+trade',
    r'industry\s+(?:concentration|diversification|composition|mix|exposure)',
    r'tenant\s+(?:industry|concept|composition|diversification)',
    r'property\s+type\s+(?:mix|composition|exposure)',
    r'concept\s+(?:exposure|composition|mix)',
    r'concentration\s+(?:of|by)\s+(?:tenant|industry|concept|brand)',
    r'tenant\s+industry\s+(?:diversification|composition)',
    r'industry\s+composition',
    r'diversification\s+(?:of|by)\s+(?:property|tenant|industry|portfolio|line)',
    r'brand\s+(?:diversification|concentration|composition)',
    r'portfolio\s+(?:diversification|composition)',
]

# Cap to control LLM token usage. Each section is ~4KB of text (~1K tokens).
MAX_SECTIONS_PER_FILING = 5

# Pause between SEC requests (SEC rate limit: 10 req/s).
SEC_REQUEST_PAUSE = 0.2

# Pause between Anthropic LLM calls.
LLM_REQUEST_PAUSE = 0.5


EXTRACTION_PROMPT = """You're extracting per-tenant or per-concept exposure data from a public REIT 10-K filing.

The text below is a section from {reit_name}'s 10-K filing that likely contains tenant or concept exposure data — typically a table showing top tenants, industry concentration, or property type mix.

Extract every tenant, concept, industry, or property type mentioned with its associated metrics. Return a JSON array. Each element should have:
- "concept": (string) the tenant name OR concept/industry name as written
- "type": (string) one of "tenant", "concept", "industry", "property_type"
- "naics_code": (string|null) if a NAICS code is disclosed, otherwise null
- "properties_count": (int|null) number of properties in this category, if disclosed
- "abr_pct": (float|null) % of annualized base rent attributable to this category, if disclosed
- "revenue_pct": (float|null) % of total revenue, if disclosed (often same as abr_pct)
- "notes": (string|null) any other context worth preserving

Return ONLY the JSON array. No prose, no markdown code fences, no preamble. If the text doesn't contain extractable concept data, return an empty array [].

Section text:
---
{section_text}
---"""


# ============================================================================
# EDGAR fetching
# ============================================================================

def fetch_filing_metadata(cik: str, form_type: str = '10-K') -> dict:
    """Fetch the latest filing of a given form type for a CIK.

    Returns dict with: cik, accession_number, primary_document, filing_date,
    company_name. Raises if no matching filing found.
    """
    url = f"{SEC_API_BASE}/submissions/CIK{cik}.json"
    headers = {'User-Agent': USER_AGENT, 'Accept': 'application/json'}
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    data = response.json()

    recent = data['filings']['recent']
    forms = recent['form']
    accession_numbers = recent['accessionNumber']
    primary_documents = recent['primaryDocument']
    filing_dates = recent['filingDate']

    for i, form in enumerate(forms):
        if form == form_type:
            return {
                'cik': cik,
                'accession_number': accession_numbers[i].replace('-', ''),
                'primary_document': primary_documents[i],
                'filing_date': filing_dates[i],
                'company_name': data.get('name', 'Unknown'),
                'form_type': form_type,
            }
    raise ValueError(f"No {form_type} found for CIK {cik}")


def fetch_filing_content(filing_info: dict) -> str:
    """Download the primary document of a filing as HTML/text."""
    cik_no_zeros = filing_info['cik'].lstrip('0')
    accession = filing_info['accession_number']
    document = filing_info['primary_document']
    url = f"{SEC_ARCHIVE_BASE}/{cik_no_zeros}/{accession}/{document}"

    headers = {'User-Agent': USER_AGENT}
    response = requests.get(url, headers=headers, timeout=120)
    response.raise_for_status()
    return response.text


# ============================================================================
# Text extraction
# ============================================================================

def strip_html(html: str) -> str:
    """Strip HTML tags and decode common entities. Returns plain text."""
    # Remove script and style blocks
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Replace block-level tags with newlines so structure is preserved
    html = re.sub(r'<(?:br|p|div|tr|li|h[1-6])[^>]*>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'</(?:p|div|tr|li|h[1-6])>', '\n', html, flags=re.IGNORECASE)

    # Replace td/th with tabs to preserve table structure somewhat
    html = re.sub(r'<(?:td|th)[^>]*>', '\t', html, flags=re.IGNORECASE)

    # Strip remaining tags
    html = re.sub(r'<[^>]+>', ' ', html)

    # Decode entities
    entities = {
        '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
        '&apos;': "'", '&#160;': ' ', '&#8217;': "'", '&#8220;': '"',
        '&#8221;': '"', '&#8211;': '-', '&#8212;': '-', '&#37;': '%',
    }
    for entity, char in entities.items():
        html = html.replace(entity, char)

    # Collapse whitespace within lines but preserve line breaks
    lines = html.split('\n')
    lines = [re.sub(r'[ \t]+', ' ', line.strip()) for line in lines]
    lines = [line for line in lines if line]
    return '\n'.join(lines)


def find_concept_sections(text: str) -> list:
    """Find sections likely to contain per-tenant/concept exposure data.

    Returns list of (section_id, start_offset, section_text) tuples.
    """
    pattern = re.compile('|'.join(SECTION_KEYWORDS), re.IGNORECASE)
    matches = list(pattern.finditer(text))
    if not matches:
        return []

    sections = []
    for match in matches:
        start = max(0, match.start() - 200)
        end = min(len(text), match.end() + 4000)
        sections.append((match.start(), text[start:end]))

    # Sort by position, dedupe near-overlapping
    sections.sort()
    merged = []
    for start, section in sections:
        if merged and start - merged[-1][0] < 2000:
            continue
        merged.append((start, section))

    # Cap to control token usage
    merged = merged[:MAX_SECTIONS_PER_FILING]
    return [(i + 1, start, section) for i, (start, section) in enumerate(merged)]


# ============================================================================
# LLM extraction
# ============================================================================

def extract_concepts_with_llm(client, section_text: str, reit_name: str) -> list:
    """Send section text to Anthropic API for structured extraction.

    Returns list of concept dicts. Raises if LLM response can't be parsed.
    """
    prompt = EXTRACTION_PROMPT.format(reit_name=reit_name, section_text=section_text)
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,
        messages=[{'role': 'user', 'content': prompt}],
    )
    text = response.content[0].text.strip()

    # Strip markdown code fences if present
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)

    return json.loads(text)


# ============================================================================
# Per-REIT processing
# ============================================================================

def process_reit(client, reit_name: str, cik: str, dry_run: bool = False) -> dict:
    """Process one REIT end-to-end. Returns result dict with metadata + concepts."""
    result = {'reit': reit_name, 'cik': cik}

    try:
        print(f"  [{reit_name}] fetching 10-K metadata...")
        filing = fetch_filing_metadata(cik, form_type='10-K')
        result['filing_date'] = filing['filing_date']
        result['accession_number'] = filing['accession_number']
        result['company_name'] = filing['company_name']
        time.sleep(SEC_REQUEST_PAUSE)

        if dry_run:
            result['dry_run'] = True
            return result

        print(f"  [{reit_name}] fetching 10-K content (filed {filing['filing_date']})...")
        html = fetch_filing_content(filing)
        result['html_size_kb'] = len(html) // 1024
        text = strip_html(html)
        result['text_size_kb'] = len(text) // 1024
        time.sleep(SEC_REQUEST_PAUSE)

        print(f"  [{reit_name}] locating concept sections...")
        sections = find_concept_sections(text)
        result['sections_found'] = len(sections)
        if not sections:
            result['error'] = 'No concept sections matched in text'
            return result

        print(f"  [{reit_name}] extracting from {len(sections)} sections via LLM...")
        all_concepts = []
        section_results = []
        for section_id, offset, section in sections:
            section_meta = {'section_id': section_id, 'offset': offset, 'length': len(section)}
            try:
                concepts = extract_concepts_with_llm(client, section, reit_name)
                section_meta['concepts_count'] = len(concepts)
                all_concepts.extend(concepts)
                time.sleep(LLM_REQUEST_PAUSE)
            except json.JSONDecodeError as e:
                section_meta['error'] = f'JSON parse failed: {e}'
            except Exception as e:
                section_meta['error'] = f'{type(e).__name__}: {e}'
            section_results.append(section_meta)

        result['sections'] = section_results
        result['concepts'] = all_concepts
        result['concepts_count'] = len(all_concepts)
        return result

    except Exception as e:
        result['error'] = f"{type(e).__name__}: {e}"
        return result


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Extract concept data from EDGAR 10-K filings for net lease REITs.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='Output is written to scripts/edgar/output/concept_extraction_<TIMESTAMP>.json by default.',
    )
    global MAX_SECTIONS_PER_FILING
    parser.add_argument('--reit', help='Process only this REIT (by name from REITS dict)')
    parser.add_argument('--dry-run', action='store_true', help='Fetch metadata only, no content download or LLM calls')
    parser.add_argument('--output', default=None, help='Output JSON path')
    parser.add_argument('--max-sections', type=int, default=None, help='Override max sections per filing (default 5)')
    args = parser.parse_args()

    if args.max_sections is not None:
        MAX_SECTIONS_PER_FILING = args.max_sections

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key and not args.dry_run:
        print(
            "ERROR: ANTHROPIC_API_KEY not set. Source .cowork-django-env or set the env var.",
            file=sys.stderr,
        )
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key) if api_key else None

    targets = REITS
    if args.reit:
        if args.reit not in REITS:
            print(f"ERROR: Unknown REIT '{args.reit}'. Options: {list(REITS.keys())}", file=sys.stderr)
            sys.exit(1)
        targets = {args.reit: REITS[args.reit]}

    output = {
        'extracted_at': datetime.now().isoformat(),
        'reit_count': len(targets),
        'dry_run': args.dry_run,
        'model': CLAUDE_MODEL if not args.dry_run else None,
        'reits': {},
    }

    for reit_name, cik in targets.items():
        print(f"\n=== {reit_name} ({cik}) ===")
        result = process_reit(client, reit_name, cik, dry_run=args.dry_run)
        output['reits'][reit_name] = result
        time.sleep(1)

    if args.output:
        output_path = Path(args.output)
    else:
        date_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_path = Path(__file__).parent / 'output' / f'concept_extraction_{date_str}.json'

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2, default=str))
    print(f"\nOutput written to: {output_path}")

    # Brief summary
    print("\n=== Summary ===")
    for reit_name, result in output['reits'].items():
        if result.get('error'):
            print(f"  {reit_name}: ERROR — {result['error']}")
        elif args.dry_run:
            print(f"  {reit_name}: dry-run — filing {result.get('filing_date', '?')}")
        else:
            print(f"  {reit_name}: {result.get('concepts_count', 0)} concepts from {result.get('sections_found', 0)} sections")


if __name__ == '__main__':
    main()
