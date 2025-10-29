#!/usr/bin/env python3
"""
Extract and validate Chadron rent roll from OM pages 29-34

This script:
1. Uses Anthropic Claude Vision API to extract rent roll from PDF
2. Validates extraction against OM stated metrics
3. Generates detailed reconciliation report
4. Only proceeds with DB import if validation passes

Usage:
    python extract_chadron_rent_roll.py --pdf-path="../reference/multifam/chadron/14105 Chadron Ave_OM_2025[nopics].pdf"
"""

import anthropic
import json
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Any
from decimal import Decimal


# OM Stated Values (from pages 27-28)
OM_CURRENT_GPR_ANNUAL = 3072516
OM_CURRENT_GPR_MONTHLY = OM_CURRENT_GPR_ANNUAL / 12  # $256,043
OM_PROFORMA_GPR_ANNUAL = 4356996
OM_PROFORMA_GPR_MONTHLY = OM_PROFORMA_GPR_ANNUAL / 12  # $363,083
OM_TOTAL_UNITS = 115
OM_RESIDENTIAL_UNITS = 113
OM_COMMERCIAL_UNITS = 2
OM_EXPECTED_OCCUPIED = 102  # Approximate
OM_EXPECTED_SECTION_8 = 42


def extract_rent_roll_from_pdf(pdf_path: str, api_key: str) -> Dict[str, Any]:
    """Extract rent roll from PDF using Claude Vision API"""

    print(f"\n📄 Reading PDF: {pdf_path}")

    with open(pdf_path, 'rb') as f:
        pdf_data = f.read()

    import base64
    pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')

    print("🤖 Calling Anthropic Claude Vision API...")

    client = anthropic.Anthropic(api_key=api_key)

    extraction_prompt = """Extract the complete rent roll table from pages 29-34 of this Offering Memorandum.

CRITICAL INSTRUCTIONS:
1. Extract ALL 115 units - do not skip any rows
2. For OCCUPIED units: extract the actual current rent being paid
3. For VACANT units: current_monthly_rent should be null, use market rent from proforma column
4. Look carefully for Section 8 designations or notes
5. Preserve exact unit numbers as shown (e.g., "100", "201", "315")
6. If a unit type has special designation (XL Patio, Balcony, Tower), include it

For each unit, extract:
- unit_number: string (e.g., "201")
- unit_type: string (e.g., "1BR/1BA", "2BR/2BA XL Patio", "Commercial")
- sf: integer (square feet)
- current_monthly_rent: number or null (actual rent if occupied, null if vacant)
- current_rent_psf: number or null
- market_monthly_rent: number (proforma/market rent - all units should have this)
- market_rent_psf: number
- status: "occupied" or "vacant"
- is_section_8: boolean
- notes: string (any special notes, amenity type, etc.)

Return as JSON in this exact format:
{
  "units": [
    {
      "unit_number": "100",
      "unit_type": "Commercial",
      "sf": 1101,
      "current_monthly_rent": null,
      "current_rent_psf": null,
      "market_monthly_rent": 0,
      "market_rent_psf": 0,
      "status": "vacant",
      "is_section_8": false,
      "notes": "Ground floor commercial space"
    },
    {
      "unit_number": "201",
      "unit_type": "3BR/2BA Tower",
      "sf": 1307,
      "current_monthly_rent": null,
      "current_rent_psf": null,
      "market_monthly_rent": 2250,
      "market_rent_psf": 1.72,
      "status": "vacant",
      "is_section_8": false,
      "notes": "Tower unit with balcony, currently vacant"
    },
    {
      "unit_number": "202",
      "unit_type": "3BR/2BA",
      "sf": 1280,
      "current_monthly_rent": 2790,
      "current_rent_psf": 2.18,
      "market_monthly_rent": 2250,
      "market_rent_psf": 1.76,
      "status": "occupied",
      "is_section_8": false,
      "notes": "Property manager unit - above market rent"
    }
  ],
  "extraction_metadata": {
    "total_units_extracted": 115,
    "occupied_count": 102,
    "vacant_count": 13,
    "section_8_count": 42,
    "total_current_monthly_rent": 256043,
    "total_market_monthly_rent": 363083,
    "extraction_date": "2025-10-26",
    "source_pages": "29-34"
  }
}

OUTPUT ONLY VALID JSON. No markdown code fences, no explanations, just the JSON object."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=16000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_base64
                    }
                },
                {
                    "type": "text",
                    "text": extraction_prompt
                }
            ]
        }]
    )

    response_text = message.content[0].text if message.content else ""

    # Clean up response (remove markdown if present)
    json_text = response_text.strip()
    json_text = json_text.replace('```json\n', '').replace('\n```', '').replace('```', '')
    json_text = json_text.strip()

    print(f"✅ API call completed ({len(response_text)} chars)")

    try:
        extracted_data = json.loads(json_text)
        return extracted_data
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse JSON response: {e}")
        print(f"Response preview: {response_text[:500]}...")
        raise


def validate_rent_roll(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Run comprehensive validation checks on extracted data"""

    results = []
    units = data.get('units', [])

    # Validation 1: Total Unit Count
    total_units = len(units)
    results.append({
        'check': 'Total Units',
        'passed': total_units == OM_TOTAL_UNITS,
        'actual': total_units,
        'expected': OM_TOTAL_UNITS,
        'variance': abs(total_units - OM_TOTAL_UNITS),
        'critical': True
    })

    # Validation 2: Occupied Units
    occupied = [u for u in units if u.get('status') == 'occupied']
    occupied_count = len(occupied)
    results.append({
        'check': 'Occupied Units',
        'passed': abs(occupied_count - OM_EXPECTED_OCCUPIED) <= 3,
        'actual': occupied_count,
        'expected': OM_EXPECTED_OCCUPIED,
        'variance': abs(occupied_count - OM_EXPECTED_OCCUPIED),
        'critical': False
    })

    # Validation 3: Vacant Units
    vacant = [u for u in units if u.get('status') == 'vacant']
    vacant_count = len(vacant)
    expected_vacant = OM_TOTAL_UNITS - OM_EXPECTED_OCCUPIED
    results.append({
        'check': 'Vacant Units',
        'passed': abs(vacant_count - expected_vacant) <= 3,
        'actual': vacant_count,
        'expected': expected_vacant,
        'variance': abs(vacant_count - expected_vacant),
        'critical': False
    })

    # Validation 4: Section 8 Count
    section_8 = [u for u in units if u.get('is_section_8')]
    section_8_count = len(section_8)
    results.append({
        'check': 'Section 8 Units',
        'passed': abs(section_8_count - OM_EXPECTED_SECTION_8) <= 3,
        'actual': section_8_count,
        'expected': OM_EXPECTED_SECTION_8,
        'variance': abs(section_8_count - OM_EXPECTED_SECTION_8),
        'critical': False
    })

    # Validation 5: CRITICAL - Current Monthly Rent Sum
    current_rent_sum = sum(
        float(u.get('current_monthly_rent', 0) or 0)
        for u in occupied
    )

    # For vacant units, they contribute to GPR at market rent
    vacant_market_sum = sum(
        float(u.get('market_monthly_rent', 0) or 0)
        for u in vacant
    )

    total_gpr_monthly = current_rent_sum + vacant_market_sum
    variance_gpr = abs(total_gpr_monthly - OM_CURRENT_GPR_MONTHLY)
    variance_gpr_pct = (variance_gpr / OM_CURRENT_GPR_MONTHLY) * 100

    results.append({
        'check': 'Current GPR (Monthly)',
        'passed': variance_gpr_pct < 5.0,
        'actual': total_gpr_monthly,
        'expected': OM_CURRENT_GPR_MONTHLY,
        'variance': variance_gpr,
        'variance_pct': variance_gpr_pct,
        'critical': True
    })

    # Validation 6: Market/Proforma Rent Sum
    market_rent_sum = sum(
        float(u.get('market_monthly_rent', 0) or 0)
        for u in units
    )
    variance_market = abs(market_rent_sum - OM_PROFORMA_GPR_MONTHLY)
    variance_market_pct = (variance_market / OM_PROFORMA_GPR_MONTHLY) * 100

    results.append({
        'check': 'Proforma GPR (Monthly)',
        'passed': variance_market_pct < 5.0,
        'actual': market_rent_sum,
        'expected': OM_PROFORMA_GPR_MONTHLY,
        'variance': variance_market,
        'variance_pct': variance_market_pct,
        'critical': True
    })

    # Validation 7: Unreasonable Rents
    unreasonable = [
        u for u in units
        if u.get('current_monthly_rent') and (
            u['current_monthly_rent'] < 500 or
            u['current_monthly_rent'] > 10000
        )
    ]
    results.append({
        'check': 'Unreasonable Rents (< $500 or > $10k)',
        'passed': len(unreasonable) == 0,
        'actual': len(unreasonable),
        'expected': 0,
        'variance': len(unreasonable),
        'critical': False,
        'details': [u['unit_number'] for u in unreasonable] if unreasonable else []
    })

    # Validation 8: Missing Data
    missing_unit_type = [u for u in units if not u.get('unit_type')]
    missing_sf = [u for u in units if not u.get('sf')]
    missing_market_rent = [u for u in units if not u.get('market_monthly_rent')]

    results.append({
        'check': 'Data Completeness',
        'passed': (len(missing_unit_type) == 0 and
                  len(missing_sf) == 0 and
                  len(missing_market_rent) == 0),
        'actual': {
            'missing_unit_type': len(missing_unit_type),
            'missing_sf': len(missing_sf),
            'missing_market_rent': len(missing_market_rent)
        },
        'expected': {'all_fields': 0},
        'critical': True
    })

    return results


def print_validation_report(results: List[Dict[str, Any]]) -> bool:
    """Print detailed validation report and return overall pass/fail"""

    print("\n" + "="*60)
    print("RENT ROLL VALIDATION RESULTS")
    print("="*60 + "\n")

    all_passed = True
    critical_failed = False

    for result in results:
        status = "✅" if result['passed'] else "❌"
        critical_marker = " [CRITICAL]" if result.get('critical') else ""

        print(f"{status} {result['check']}{critical_marker}")

        if isinstance(result['actual'], dict):
            print(f"   Actual: {json.dumps(result['actual'], indent=6)}")
            print(f"   Expected: {json.dumps(result['expected'], indent=6)}")
        else:
            print(f"   Actual: {result['actual']:,.2f}" if isinstance(result['actual'], float) else f"   Actual: {result['actual']:,}")
            print(f"   Expected: {result['expected']:,.2f}" if isinstance(result['expected'], float) else f"   Expected: {result['expected']:,}")

        if not result['passed']:
            all_passed = False
            if result.get('critical'):
                critical_failed = True

            if 'variance_pct' in result:
                print(f"   Variance: ${result['variance']:,.2f} ({result['variance_pct']:.1f}%)")
            elif result.get('variance'):
                print(f"   Variance: {result['variance']:,}")

            if result.get('details'):
                print(f"   Details: {result['details']}")

        print()

    print("="*60)
    if all_passed:
        print("OVERALL RESULT: ✅ ALL CHECKS PASSED")
    elif critical_failed:
        print("OVERALL RESULT: ❌ CRITICAL CHECKS FAILED")
        print("\n⚠️  DO NOT POPULATE DATABASE UNTIL RESOLVED")
    else:
        print("OVERALL RESULT: ⚠️  MINOR ISSUES - REVIEW REQUIRED")
    print("="*60 + "\n")

    return all_passed and not critical_failed


def generate_reconciliation_report(data: Dict[str, Any], output_path: str):
    """Generate detailed reconciliation worksheet"""

    units = data.get('units', [])
    occupied = [u for u in units if u.get('status') == 'occupied']
    vacant = [u for u in units if u.get('status') == 'vacant']
    residential = [u for u in units if 'BR' in u.get('unit_type', '')]
    commercial = [u for u in units if 'BR' not in u.get('unit_type', '')]

    current_rent_occupied = sum(float(u.get('current_monthly_rent', 0) or 0) for u in occupied)
    market_rent_vacant = sum(float(u.get('market_monthly_rent', 0) or 0) for u in vacant)
    total_current_gpr = current_rent_occupied + market_rent_vacant

    market_rent_all = sum(float(u.get('market_monthly_rent', 0) or 0) for u in units)

    report = f"""# CHADRON RENT ROLL RECONCILIATION REPORT

**Extraction Date:** {data.get('extraction_metadata', {}).get('extraction_date', 'N/A')}
**Source Pages:** {data.get('extraction_metadata', {}).get('source_pages', 'N/A')}
**Total Units Extracted:** {len(units)}

---

## UNIT BREAKDOWN

```
Total Units:              {len(units):3d}
  Residential:            {len(residential):3d}
  Commercial/Office:      {len(commercial):3d}

Occupancy Status:
  Occupied:               {len(occupied):3d}
  Vacant:                 {len(vacant):3d}
  Occupancy Rate:         {len(occupied)/len(units)*100:5.1f}%

Section 8:
  Section 8 Units:        {len([u for u in units if u.get('is_section_8')]):3d}
  Section 8 %:            {len([u for u in units if u.get('is_section_8')])/len(residential)*100:5.1f}%
```

---

## CURRENT GPR RECONCILIATION

```
Extracted Data (Monthly):
  Occupied Units Rent:           ${current_rent_occupied:12,.2f}
  Vacant Units at Market:        ${market_rent_vacant:12,.2f}
  ─────────────────────────────────────────────────
  Total Current GPR:             ${total_current_gpr:12,.2f}

OM Stated (from Page 27):
  Current GPR (Monthly):         ${OM_CURRENT_GPR_MONTHLY:12,.2f}

Reconciliation:
  Difference:                    ${total_current_gpr - OM_CURRENT_GPR_MONTHLY:12,.2f}
  Variance %:                    {abs(total_current_gpr - OM_CURRENT_GPR_MONTHLY) / OM_CURRENT_GPR_MONTHLY * 100:7.2f}%

Status: {'✅ MATCHES' if abs(total_current_gpr - OM_CURRENT_GPR_MONTHLY) / OM_CURRENT_GPR_MONTHLY < 0.05 else '❌ DISCREPANCY'}
```

---

## PROFORMA GPR RECONCILIATION

```
Extracted Data (Monthly):
  All Units at Market Rent:     ${market_rent_all:12,.2f}

OM Stated (from Page 27):
  Proforma GPR (Monthly):        ${OM_PROFORMA_GPR_MONTHLY:12,.2f}

Reconciliation:
  Difference:                    ${market_rent_all - OM_PROFORMA_GPR_MONTHLY:12,.2f}
  Variance %:                    {abs(market_rent_all - OM_PROFORMA_GPR_MONTHLY) / OM_PROFORMA_GPR_MONTHLY * 100:7.2f}%

Status: {'✅ MATCHES' if abs(market_rent_all - OM_PROFORMA_GPR_MONTHLY) / OM_PROFORMA_GPR_MONTHLY < 0.05 else '❌ DISCREPANCY'}
```

---

## UNIT TYPE DISTRIBUTION

```
{''.join([f"{ut:25s}: {len([u for u in units if u.get('unit_type') == ut]):3d} units" + chr(10) for ut in sorted(set(u.get('unit_type', '') for u in units))])}
```

---

## RENT STATISTICS

### Current Rents (Occupied Units):

```
Min:     ${min([u.get('current_monthly_rent', 0) or 0 for u in occupied if u.get('current_monthly_rent')], default=0):8,.2f}
Max:     ${max([u.get('current_monthly_rent', 0) or 0 for u in occupied if u.get('current_monthly_rent')], default=0):8,.2f}
Average: ${sum([u.get('current_monthly_rent', 0) or 0 for u in occupied]) / len(occupied) if occupied else 0:8,.2f}
```

### Market Rents (All Units):

```
Min:     ${min([u.get('market_monthly_rent', 0) or 0 for u in units if u.get('market_monthly_rent')], default=0):8,.2f}
Max:     ${max([u.get('market_monthly_rent', 0) or 0 for u in units if u.get('market_monthly_rent')], default=0):8,.2f}
Average: ${sum([u.get('market_monthly_rent', 0) or 0 for u in units]) / len(units) if units else 0:8,.2f}
```

---

## SAMPLE UNITS

### Top 10 Highest Current Rents:

```
{''.join([f"Unit {u.get('unit_number'):6s}: {u.get('unit_type'):20s} ${u.get('current_monthly_rent', 0):7,.2f}/mo" + chr(10) for u in sorted([u for u in occupied if u.get('current_monthly_rent')], key=lambda x: x.get('current_monthly_rent', 0), reverse=True)[:10]])}
```

### Vacant Units:

```
{''.join([f"Unit {u.get('unit_number'):6s}: {u.get('unit_type'):20s} Market: ${u.get('market_monthly_rent', 0):7,.2f}/mo" + chr(10) for u in vacant[:10]])}
```

---

## DATABASE IMPORT READINESS

{'✅ READY FOR DATABASE IMPORT' if abs(total_current_gpr - OM_CURRENT_GPR_MONTHLY) / OM_CURRENT_GPR_MONTHLY < 0.05 else '❌ NOT READY - RESOLVE DISCREPANCIES FIRST'}

---

**End of Report**
"""

    with open(output_path, 'w') as f:
        f.write(report)

    print(f"📄 Reconciliation report saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Extract and validate Chadron rent roll')
    parser.add_argument('--pdf-path', required=True, help='Path to Chadron OM PDF')
    parser.add_argument('--output-json', default='chadron_rent_roll_extracted.json', help='Output JSON file')
    parser.add_argument('--output-report', default='chadron_reconciliation_report.md', help='Output report file')
    parser.add_argument('--api-key', help='Anthropic API key (or set ANTHROPIC_API_KEY env var)')

    args = parser.parse_args()

    # Get API key
    import os
    api_key = args.api_key or os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("❌ Error: Anthropic API key required. Set ANTHROPIC_API_KEY env var or use --api-key")
        sys.exit(1)

    # Check PDF exists
    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(f"❌ Error: PDF not found at {pdf_path}")
        sys.exit(1)

    try:
        # Extract rent roll
        print("\n🚀 Starting Chadron Rent Roll Extraction...")
        extracted_data = extract_rent_roll_from_pdf(str(pdf_path), api_key)

        # Save raw extraction
        with open(args.output_json, 'w') as f:
            json.dump(extracted_data, f, indent=2)
        print(f"💾 Raw extraction saved to: {args.output_json}")

        # Validate
        print("\n🔍 Running validation checks...")
        validation_results = validate_rent_roll(extracted_data)

        # Print results
        passed = print_validation_report(validation_results)

        # Generate reconciliation report
        generate_reconciliation_report(extracted_data, args.output_report)

        # Exit code
        sys.exit(0 if passed else 1)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
