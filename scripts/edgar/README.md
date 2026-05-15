# EDGAR Concept Data Extraction

Extracts per-tenant / per-concept exposure data from public net lease REIT 10-K
filings on SEC EDGAR. Used to seed `landscape.tbl_concept` (the net lease
concept catalog) with v1 from authoritative public disclosures.

## What this does

For each major net lease REIT (Realty Income, NNN REIT, EPRT, ADC, W. P. Carey,
Broadstone, Four Corners):

1. Fetches the latest 10-K filing metadata via SEC EDGAR's submissions API
2. Downloads the 10-K HTML
3. Strips HTML and locates per-tenant / per-concept disclosure sections via
   keyword matching (top tenants, industry concentration, property type mix, etc.)
4. Sends each section to Anthropic API for structured extraction
5. Writes consolidated JSON output to `scripts/edgar/output/`

The output JSON is then used by a separate normalization step (TODO: separate
script) to produce the catalog seed.

## Requirements

- Python 3.10+
- `requests`, `anthropic`, `python-dotenv`
- `ANTHROPIC_API_KEY` in environment (loaded from `.cowork-django-env` if
  present)
- SEC EDGAR has no auth requirement but enforces a User-Agent header and
  ~10 req/s rate limit. Both are handled.

## Usage

```bash
# Fetch and extract for all REITs
python scripts/edgar/fetch_concept_data.py

# Dry run — fetch metadata only, no content download or LLM calls
python scripts/edgar/fetch_concept_data.py --dry-run

# Process only one REIT
python scripts/edgar/fetch_concept_data.py --reit "Realty Income"

# Custom output path
python scripts/edgar/fetch_concept_data.py --output /tmp/concepts.json
```

## Output shape

```json
{
  "extracted_at": "2026-05-07T...",
  "reit_count": 7,
  "model": "claude-sonnet-4-...",
  "reits": {
    "Realty Income": {
      "reit": "Realty Income",
      "cik": "0000726728",
      "filing_date": "2024-02-23",
      "accession_number": "...",
      "company_name": "REALTY INCOME CORP",
      "html_size_kb": 4823,
      "text_size_kb": 1244,
      "sections_found": 3,
      "sections": [
        {"section_id": 1, "offset": 152034, "length": 4200, "concepts_count": 25}
      ],
      "concepts": [
        {
          "concept": "Convenience Stores",
          "type": "concept",
          "naics_code": "445120",
          "properties_count": 1500,
          "abr_pct": 11.0,
          "revenue_pct": null,
          "notes": null
        }
      ],
      "concepts_count": 25
    }
  }
}
```

## Extension to DEF 14A (Increment 4)

The script is designed to support adding DEF 14A (proxy statement) extraction
for REIT executive compensation in Increment 4. The reusable primitives:

- `fetch_filing_metadata(cik, form_type='DEF 14A')` — same submission API
  surface, just different form_type
- `fetch_filing_content(filing_info)` — works for any filing type
- `strip_html(html)` — works for any HTML filing
- `find_concept_sections(text)` — gets replaced by a new
  `find_executive_compensation_sections(text)` for DEF 14A
- `extract_concepts_with_llm(...)` — gets a sibling
  `extract_executives_with_llm(...)` with a different prompt

Don't refactor the file structure for DEF 14A; just add new functions
alongside the existing ones.

## Known limitations

- 10-K formatting varies across REITs. Some publish exposure as a clean
  HTML table (easy parse); others embed it in narrative text or footnotes
  (harder parse). Expect 80–90% extraction quality at v1, with some manual
  cleanup needed for edge cases.
- The script logs unparseable sections so they can be addressed in a
  follow-up pass.
- NAICS codes are not always disclosed alongside concept names. Where
  missing, the catalog row gets NULL and the concept is matched by name
  during normalization.
- The concept names extracted vary across REITs. Normalization (mapping
  e.g., "Quick-Service Restaurant" + "QSR" + "Fast Food" → one canonical
  concept) is a separate post-processing step.

## Refresh cadence

REITs file 10-Ks annually (Q1 of following year for calendar-year REITs).
Recommend re-running this script quarterly to capture any 10-Q updates,
and immediately after each REIT's annual 10-K filing.

## Session reference

Created: Increment 3 of net lease foundation work (LSCMD-NLF-0507-OP3).
Approval: `Landscape app/net_lease_increment_3_design.html`.
Companion docs: `net_lease_taxonomy_v3.html`, `net_lease_structural_proposal_v3.html`.
