#!/usr/bin/env python3
"""
Demo script for DMS AI Document Extraction System

This script demonstrates the complete workflow:
1. Generate synthetic documents (PDF and Excel)
2. Extract data using AI extractors
3. Display results with confidence scores
"""

import tempfile
import os
import sys
from pathlib import Path
from pprint import pprint

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from apps.documents.testing.generators import (
    RentRollGenerator,
    OperatingStatementGenerator,
    ParcelTableGenerator
)
from apps.documents.extractors import (
    RentRollExtractor,
    OperatingExtractor,
    ParcelTableExtractor
)


def demo_rentroll_extraction(tier='institutional'):
    """Demonstrate rent roll generation and extraction"""
    print(f"\n{'='*80}")
    print(f"RENT ROLL EXTRACTION DEMO - {tier.upper()} TIER")
    print(f"{'='*80}\n")

    # Generate document
    print(f"1. Generating {tier} tier rent roll PDF...")
    generator = RentRollGenerator(tier=tier, seed=42)

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        pdf_path = tmp.name

    try:
        units_data = generator.generate_pdf(
            pdf_path,
            units_count=20,
            vacancy_rate=0.10,
            property_name=f"Demo Property ({tier})",
            address="123 Test Street, Phoenix, AZ 85001"
        )
        print(f"   ✓ Generated PDF: {pdf_path}")
        print(f"   ✓ Total units: {len(units_data)}")

        # Generate Excel version
        excel_path = pdf_path.replace('.pdf', '.xlsx')
        generator.generate_excel(excel_path, units_count=20, vacancy_rate=0.10)
        print(f"   ✓ Generated Excel: {excel_path}")

        # Extract from Excel (more reliable for demo)
        print(f"\n2. Extracting data from Excel...")
        extractor = RentRollExtractor()
        result = extractor.extract(excel_path)

        print(f"   ✓ Extraction complete")
        print(f"   ✓ Method: {result['metadata']['extraction_method']}")
        print(f"   ✓ Units extracted: {result['metadata']['units_count']}")

        # === RENT ROLL SPECIFIC METRICS ===
        print(f"\n3. Rent Roll Metrics:")

        # Count by status (units, occupancy)
        occupied = sum(1 for u in result['data'] if u.get('status') == 'Occupied')
        vacant = len(result['data']) - occupied
        total_units = len(result['data'])
        occupancy_rate = (occupied / total_units * 100) if total_units > 0 else 0

        print(f"   • Total Units: {total_units}")
        print(f"   • Occupied: {occupied}")
        print(f"   • Vacant: {vacant}")
        print(f"   • Occupancy Rate: {occupancy_rate:.1f}%")

        # Calculate average confidence
        if result['confidence_scores']:
            confidences = []
            for scores in result['confidence_scores']:
                if scores:
                    confidences.append(sum(scores.values()) / len(scores))

            if confidences:
                avg_confidence = sum(confidences) / len(confidences)
                print(f"   • Average confidence: {avg_confidence:.2%}")

        # Show validation warnings
        if result['validation_warnings']:
            print(f"\n4. Validation Warnings ({len(result['validation_warnings'])}):")
            for i, warning in enumerate(result['validation_warnings'][:5], 1):
                print(f"   {i}. [{warning['severity'].upper()}] {warning['message']}")
            if len(result['validation_warnings']) > 5:
                print(f"   ... and {len(result['validation_warnings']) - 5} more")
        else:
            print(f"\n4. Validation: ✓ No warnings")

        # Show sample units
        print(f"\n5. Sample Extracted Units:")
        for i, unit in enumerate(result['data'][:3], 1):
            print(f"\n   Unit {unit.get('unit_id', 'N/A')}:")
            print(f"     Type: {unit.get('bed_bath', 'N/A')}")
            print(f"     SF: {unit.get('sqft', 'N/A')}")
            print(f"     Market Rent: ${unit.get('market_rent', 0):,}")
            print(f"     Current Rent: ${unit.get('current_rent', 0):,}")
            print(f"     Status: {unit.get('status', 'N/A')}")

            # Show confidence for this unit
            if i-1 < len(result['confidence_scores']):
                scores = result['confidence_scores'][i-1]
                if scores:
                    print(f"     Confidence: {sum(scores.values())/len(scores):.2%}")

    finally:
        # Cleanup
        for path in [pdf_path, excel_path]:
            if os.path.exists(path):
                os.unlink(path)
        print(f"\n   ✓ Cleaned up temporary files")


def demo_operating_extraction(tier='institutional'):
    """Demonstrate operating statement generation and extraction"""
    print(f"\n{'='*80}")
    print(f"OPERATING STATEMENT EXTRACTION DEMO - {tier.upper()} TIER")
    print(f"{'='*80}\n")

    print(f"1. Generating {tier} tier operating statement Excel...")
    generator = OperatingStatementGenerator(tier=tier, seed=42)

    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        excel_path = tmp.name

    try:
        operating_data = generator.generate_excel(excel_path, units=200)
        print(f"   ✓ Generated Excel: {excel_path}")
        print(f"   ✓ Generated NOI: ${operating_data['noi']:,}")

        print(f"\n2. Extracting data...")
        extractor = OperatingExtractor()
        result = extractor.extract(excel_path)

        print(f"   ✓ Extraction complete")

        # === OPERATING STATEMENT SPECIFIC METRICS ===
        print(f"\n3. Operating Statement Metrics:")
        print(f"   • Total Line Items: {result['metadata']['line_items_count']}")

        # Calculate NOI from extracted data if possible
        total_income = sum(item.get('Amount', 0) for item in result['data']
                          if item.get('Category') == 'Income')
        total_expenses = sum(item.get('Amount', 0) for item in result['data']
                            if item.get('Category') == 'Expense')
        extracted_noi = total_income - total_expenses

        if total_income > 0:
            print(f"   • Total Income: ${total_income:,}")
        if total_expenses > 0:
            print(f"   • Total Expenses: ${total_expenses:,}")
        if total_income > 0 or total_expenses > 0:
            print(f"   • Calculated NOI: ${extracted_noi:,}")

        # Show sample line items
        print(f"\n4. Sample Extracted Line Items:")
        for i, item in enumerate(result['data'][:8], 1):
            account = item.get('Account', 'N/A')
            amount = item.get('Amount', 0)
            print(f"   {account:.<40} ${amount:>12,}")

    finally:
        if os.path.exists(excel_path):
            os.unlink(excel_path)
        print(f"\n   ✓ Cleaned up temporary files")


def demo_parcel_extraction(tier='institutional'):
    """Demonstrate parcel table generation and extraction"""
    print(f"\n{'='*80}")
    print(f"PARCEL TABLE EXTRACTION DEMO - {tier.upper()} TIER")
    print(f"{'='*80}\n")

    print(f"1. Generating {tier} tier parcel table Excel...")
    generator = ParcelTableGenerator(tier=tier, seed=42)

    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        excel_path = tmp.name

    try:
        parcel_data = generator.generate_excel(excel_path, parcel_count=15)
        print(f"   ✓ Generated Excel: {excel_path}")
        print(f"   ✓ Generated Parcels: {len(parcel_data)}")

        print(f"\n2. Extracting data...")
        extractor = ParcelTableExtractor()
        result = extractor.extract(excel_path)

        print(f"   ✓ Extraction complete")

        # === PARCEL TABLE SPECIFIC METRICS ===
        print(f"\n3. Parcel Table Metrics:")
        print(f"   • Total Parcels: {result['metadata']['parcels_count']}")

        # Calculate acreage totals
        total_gross = sum(p.get('acres_gross', 0) for p in result['data']
                         if isinstance(p.get('acres_gross'), (int, float)))
        total_net = sum(p.get('acres_net', 0) for p in result['data']
                       if isinstance(p.get('acres_net'), (int, float)))

        print(f"   • Total Gross Acres: {total_gross:.1f}")
        print(f"   • Total Net Acres: {total_net:.1f}")

        # Count parcels by land use if available
        land_uses = {}
        for p in result['data']:
            lu = p.get('land_use', 'Unknown')
            land_uses[lu] = land_uses.get(lu, 0) + 1

        if len(land_uses) > 0:
            print(f"   • Land Use Distribution:")
            for lu, count in sorted(land_uses.items()):
                print(f"     - {lu}: {count} parcel(s)")

        # Show sample parcels
        print(f"\n4. Sample Extracted Parcels:")
        for i, parcel in enumerate(result['data'][:5], 1):
            print(f"\n   Parcel {parcel.get('parcel_id', 'N/A')}:")
            print(f"     Land Use: {parcel.get('land_use', 'N/A')}")
            print(f"     Gross Acres: {parcel.get('acres_gross', 'N/A')}")
            print(f"     Net Acres: {parcel.get('acres_net', 'N/A')}")
            max_units = parcel.get('max_units')
            if isinstance(max_units, (int, float)) and max_units > 0:
                print(f"     Max Units: {int(max_units)}")
            density = parcel.get('density')
            if density:
                print(f"     Density: {density}")
            print(f"     Phase: {parcel.get('phase', 'TBD')}")

    finally:
        if os.path.exists(excel_path):
            os.unlink(excel_path)
        print(f"\n   ✓ Cleaned up temporary files")


def main():
    """Run all demos"""
    print("\n" + "="*80)
    print("DMS AI DOCUMENT EXTRACTION SYSTEM - COMPREHENSIVE DEMO")
    print("="*80)

    # Rent roll demos
    for tier in ['institutional', 'regional', 'owner_generated']:
        demo_rentroll_extraction(tier=tier)

    # Operating statement demo
    demo_operating_extraction(tier='institutional')

    # Parcel table demo
    demo_parcel_extraction(tier='institutional')

    print(f"\n{'='*80}")
    print("DEMO COMPLETE")
    print(f"{'='*80}\n")

    print("Next steps:")
    print("  1. Review the DMS_README.md for full API documentation")
    print("  2. Run pytest tests: pytest apps/documents/tests/ -v")
    print("  3. Integrate with Django admin for review UI")
    print("  4. Connect to normalized database tables")


if __name__ == '__main__':
    main()
