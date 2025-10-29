"""
Seed script for Chadron Terrace Garden valuation data.

This script populates the valuation tables with sales comparables
extracted from the 14105 Chadron Ave Offering Memorandum.

Usage:
    python manage.py shell < scripts/seed_chadron_valuation.py
    OR
    python scripts/seed_chadron_valuation.py
"""

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Setup Django environment
if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

from apps.projects.models import Project
from apps.financial.models_valuation import (
    SalesComparable,
    SalesCompAdjustment,
    ValuationReconciliation,
)


def seed_valuation_data():
    """Seed valuation data for Chadron Terrace Garden."""

    # Find the Chadron project
    try:
        project = Project.objects.get(project_name__icontains='Chadron')
        print(f"Found project: {project.project_name} (ID: {project.project_id})")
    except Project.DoesNotExist:
        print("ERROR: Chadron project not found. Please create the project first.")
        return
    except Project.MultipleObjectsReturned:
        project = Project.objects.filter(project_name__icontains='Chadron').first()
        print(f"Multiple Chadron projects found. Using: {project.project_name} (ID: {project.project_id})")

    # Clear existing data for this project
    print("\nClearing existing valuation data...")
    SalesComparable.objects.filter(project=project).delete()
    ValuationReconciliation.objects.filter(project=project).delete()
    print("Cleared existing data.")

    # Sales Comparable #1: Reveal Playa Vista
    print("\nCreating Sales Comparable #1: Reveal Playa Vista...")
    comp1 = SalesComparable.objects.create(
        project=project,
        comp_number=1,
        property_name="Reveal Playa Vista",
        address="5710 Crescent Park East",
        city="Los Angeles (Playa Vista)",
        state="CA",
        zip="90094",
        sale_date=date(2024, 4, 24),
        sale_price=Decimal('122100000.00'),
        price_per_unit=Decimal('570561.00'),
        price_per_sf=Decimal('554.15'),
        year_built=2003,
        units=214,
        building_sf=220337,
        cap_rate=Decimal('0.0430'),
        distance_from_subject="10.2 miles NW",
        unit_mix={
            "one_bedroom": {"count": 117, "percentage": 0.55},
            "two_bedroom": {"count": 97, "percentage": 0.45}
        },
        notes="Premium Playa Vista location, older vintage (2003) but well-maintained"
    )
    print(f"Created: {comp1}")

    # Add adjustments for Comp 1
    print("Adding adjustments for Comp #1...")
    SalesCompAdjustment.objects.create(
        comparable=comp1,
        adjustment_type='location',
        adjustment_pct=Decimal('-0.200'),
        justification="Premium coastal-adjacent Playa Vista location"
    )
    SalesCompAdjustment.objects.create(
        comparable=comp1,
        adjustment_type='physical_age',
        adjustment_pct=Decimal('-0.050'),
        justification="Older construction (2003 vs 2016)"
    )
    SalesCompAdjustment.objects.create(
        comparable=comp1,
        adjustment_type='physical_unit_mix',
        adjustment_pct=Decimal('-0.050'),
        justification="No 3BR units"
    )
    print("Adjustments added. Adjusted price/unit: $399,393")

    # Sales Comparable #2: Cobalt
    print("\nCreating Sales Comparable #2: Cobalt...")
    comp2 = SalesComparable.objects.create(
        project=project,
        comp_number=2,
        property_name="Cobalt",
        address="10601 Washington Blvd",
        city="Culver City",
        state="CA",
        zip="90232",
        sale_date=date(2024, 2, 16),
        sale_price=Decimal('67700000.00'),
        price_per_unit=Decimal('501481.00'),
        price_per_sf=Decimal('494.74'),
        year_built=2019,
        units=135,
        building_sf=136840,
        cap_rate=Decimal('0.0530'),
        distance_from_subject="11.4 miles NW",
        unit_mix={
            "studio": {"count": 27, "percentage": 0.20},
            "one_bedroom": {"count": 53, "percentage": 0.39},
            "two_bedroom": {"count": 55, "percentage": 0.41}
        },
        notes="Culver City location, newer construction (2019), higher cap rate reflects conservative pricing"
    )
    print(f"Created: {comp2}")

    # Add adjustments for Comp 2
    print("Adding adjustments for Comp #2...")
    SalesCompAdjustment.objects.create(
        comparable=comp2,
        adjustment_type='location',
        adjustment_pct=Decimal('-0.150'),
        justification="Strong Culver City rental market near major employers"
    )
    SalesCompAdjustment.objects.create(
        comparable=comp2,
        adjustment_type='physical_age',
        adjustment_pct=Decimal('0.020'),
        justification="Newer construction (2019 vs 2016)"
    )
    SalesCompAdjustment.objects.create(
        comparable=comp2,
        adjustment_type='physical_unit_mix',
        adjustment_pct=Decimal('-0.050'),
        justification="No 3BR units"
    )
    print("Adjustments added. Adjusted price/unit: $411,215")

    # Sales Comparable #3: Atlas
    print("\nCreating Sales Comparable #3: Atlas...")
    comp3 = SalesComparable.objects.create(
        project=project,
        comp_number=3,
        property_name="Atlas",
        address="1650 W Florence Ave",
        city="Los Angeles",
        state="CA",
        zip="90047",
        sale_date=date(2024, 1, 19),
        sale_price=Decimal('49500000.00'),
        price_per_unit=Decimal('386719.00'),
        price_per_sf=Decimal('627.79'),
        year_built=2022,
        units=128,
        building_sf=78848,
        cap_rate=None,
        distance_from_subject="6.2 miles N",
        unit_mix={
            "one_bedroom": {"count": 128, "percentage": 1.0}
        },
        notes="AFFORDABLE HOUSING - Limited comparability, newest construction (2022), highest price/SF despite lower price/unit"
    )
    print(f"Created: {comp3}")
    print("No adjustments for Comp #3 (affordable housing designation limits comparability)")

    # Create Valuation Reconciliation
    print("\nCreating Valuation Reconciliation...")
    reconciliation = ValuationReconciliation.objects.create(
        project=project,
        sales_comparison_value=Decimal('45932918.00'),
        sales_comparison_weight=Decimal('1.00'),
        cost_approach_value=None,
        cost_approach_weight=Decimal('0.00'),
        income_approach_value=None,
        income_approach_weight=Decimal('0.00'),
        final_reconciled_value=Decimal('45932918.00'),
        reconciliation_narrative=(
            "The indicated value by Sales Comparison Approach is $45,932,918, based on a weighted "
            "average of $406,486 per unit applied to 113 units. Comp 1 (Reveal Playa Vista) was given "
            "40% weight and Comp 2 (Cobalt) was given 60% weight. Comp 3 (Atlas) was excluded from the "
            "reconciliation due to its affordable housing designation, which limits comparability with "
            "market-rate properties.\n\n"
            "The subject property's asking price of $47,500,000 represents a 3.4% premium over the "
            "indicated market value. This premium may be justified by the significant 42% rental upside "
            "opportunity documented in the rent roll analysis, which shows current rents substantially "
            "below market rates."
        ),
        valuation_date=date.today(),
    )
    print(f"Created: Valuation Reconciliation")
    print(f"Final Reconciled Value: ${reconciliation.final_reconciled_value:,.2f}")

    # Summary
    print("\n" + "="*60)
    print("VALUATION DATA SEEDING COMPLETE")
    print("="*60)
    print(f"Project: {project.project_name}")
    print(f"Sales Comparables Created: 3")
    print(f"  - Comp 1: Reveal Playa Vista ($570,561/unit → $399,393 adjusted)")
    print(f"  - Comp 2: Cobalt ($501,481/unit → $411,215 adjusted)")
    print(f"  - Comp 3: Atlas ($386,719/unit, not adjusted)")
    print(f"\nWeighted Average: $406,486/unit")
    print(f"Total Indicated Value: ${reconciliation.final_reconciled_value:,.2f}")
    print(f"Asking Price: $47,500,000")
    print(f"Variance: +3.4%")
    print("\nNext Steps:")
    print("1. Run the migration: psql $DATABASE_URL -f backend/migrations/014_valuation_system.sql")
    print("2. Start the Django server: python manage.py runserver")
    print("3. Access the API at: /api/financial/valuation/summary/by_project/{project_id}/")
    print("="*60)


if __name__ == '__main__':
    seed_valuation_data()
