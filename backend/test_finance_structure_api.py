#!/usr/bin/env python
"""
Test script for Finance Structure API endpoints.

This script demonstrates how to test the Finance Structure API layer:
1. Create a finance structure (cost pool)
2. Create cost allocations
3. Calculate cost-to-complete
4. Create a sale settlement
5. Create participation payments

Run with: python test_finance_structure_api.py
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.financial.models_finance_structure import (
    FinanceStructure,
    CostAllocation,
    SaleSettlement,
    ParticipationPayment,
)
from apps.projects.models import Project
from apps.containers.models import Container
from django.db import connection


def print_section(title):
    """Print a formatted section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def test_finance_structure_creation():
    """Test creating a finance structure."""
    print_section("TEST 1: Create Finance Structure")

    # Get a project (Project 7 - Red Valley Ranch)
    try:
        project = Project.objects.get(project_id=7)
        print(f"✅ Using project: {project.project_name}")
    except Project.DoesNotExist:
        print("❌ Project 7 not found. Using first available project.")
        project = Project.objects.first()
        if not project:
            print("❌ No projects found in database!")
            return None

    # Create a finance structure
    finance_structure = FinanceStructure.objects.create(
        project=project,
        structure_code='OFFSITE-TEST-01',
        structure_name='Test Offsite Infrastructure',
        description='Test cost pool for offsite infrastructure',
        structure_type='capital_cost_pool',
        total_budget_amount=Decimal('2500000.00'),
        budget_category='CapEx',
        allocation_method='by_units',
        is_active=True,
        created_by='test_script'
    )

    print(f"✅ Created Finance Structure:")
    print(f"   ID: {finance_structure.finance_structure_id}")
    print(f"   Code: {finance_structure.structure_code}")
    print(f"   Budget: ${finance_structure.total_budget_amount:,.2f}")
    print(f"   Allocation Method: {finance_structure.allocation_method}")

    return finance_structure


def test_cost_allocation(finance_structure):
    """Test creating cost allocations."""
    print_section("TEST 2: Create Cost Allocations")

    if not finance_structure:
        print("❌ No finance structure provided")
        return []

    # Get containers for this project
    containers = Container.objects.filter(
        project=finance_structure.project,
        container_level=3,  # Level 3 = Parcels
        is_active=True
    )[:3]  # Get first 3 containers

    if not containers:
        print("❌ No containers found for this project")
        return []

    print(f"Found {containers.count()} containers")

    # Create allocations
    allocations = []
    percentage_each = Decimal('100.00') / len(containers)

    for container in containers:
        allocation = CostAllocation.objects.create(
            finance_structure=finance_structure,
            container=container,
            allocation_percentage=percentage_each,
            allocation_basis='equal',
            allocated_budget_amount=finance_structure.total_budget_amount * (percentage_each / Decimal('100.00'))
        )
        allocations.append(allocation)

        print(f"✅ Allocated to {container.container_code}:")
        print(f"   Percentage: {allocation.allocation_percentage}%")
        print(f"   Amount: ${allocation.allocated_budget_amount:,.2f}")

    return allocations


def test_auto_calculate_allocations(finance_structure):
    """Test the auto-calculate allocations PostgreSQL function."""
    print_section("TEST 3: Auto-Calculate Allocations")

    if not finance_structure:
        print("❌ No finance structure provided")
        return

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM landscape.auto_calculate_allocations(%s)",
                [finance_structure.finance_structure_id]
            )
            columns = [col[0] for col in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        print(f"✅ Auto-calculated {len(results)} allocations:")
        for result in results[:5]:  # Show first 5
            print(f"   Container {result['container_id']}: {result['allocation_percentage']}% = ${result['allocated_amount']:,.2f}")

        if len(results) > 5:
            print(f"   ... and {len(results) - 5} more")

    except Exception as e:
        print(f"❌ Error: {e}")


def test_cost_to_complete(allocations):
    """Test calculating cost-to-complete for a container."""
    print_section("TEST 4: Calculate Cost-to-Complete")

    if not allocations:
        print("❌ No allocations provided")
        return

    allocation = allocations[0]
    container_id = allocation.container_id

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT landscape.calculate_cost_to_complete(%s)",
                [container_id]
            )
            cost_to_complete = cursor.fetchone()[0] or Decimal('0.00')

        print(f"✅ Cost-to-Complete for Container {allocation.container.container_code}:")
        print(f"   Total: ${cost_to_complete:,.2f}")

        return cost_to_complete

    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_sale_settlement(allocations, cost_to_complete):
    """Test creating a sale settlement."""
    print_section("TEST 5: Create Sale Settlement")

    if not allocations:
        print("❌ No allocations provided")
        return None

    allocation = allocations[0]

    settlement = SaleSettlement.objects.create(
        project=allocation.finance_structure.project,
        container=allocation.container,
        sale_date='2025-01-15',
        buyer_name='Test Builder LLC',
        buyer_entity='Test Builder Corp',
        list_price=Decimal('1200000.00'),
        allocated_cost_to_complete=cost_to_complete or Decimal('255000.00'),
        other_adjustments=Decimal('0.00'),
        net_proceeds=Decimal('945000.00'),
        settlement_type='participation',
        has_participation=True,
        participation_rate=Decimal('25.000'),
        participation_basis='gross_home_sales',
        settlement_status='pending',
        created_by='test_script'
    )

    print(f"✅ Created Sale Settlement:")
    print(f"   ID: {settlement.settlement_id}")
    print(f"   Container: {settlement.container.container_code}")
    print(f"   List Price: ${settlement.list_price:,.2f}")
    print(f"   Cost-to-Complete: ${settlement.allocated_cost_to_complete:,.2f}")
    print(f"   Net Proceeds: ${settlement.net_proceeds:,.2f}")
    print(f"   Participation Rate: {settlement.participation_rate}%")

    return settlement


def test_participation_payment(settlement):
    """Test creating a participation payment."""
    print_section("TEST 6: Create Participation Payment")

    if not settlement:
        print("❌ No settlement provided")
        return None

    payment = ParticipationPayment.objects.create(
        settlement=settlement,
        project=settlement.project,
        payment_date='2025-03-01',
        homes_closed_count=10,
        gross_home_sales=Decimal('3500000.00'),
        participation_amount=Decimal('875000.00'),  # 25% of $3.5M
        less_base_allocation=Decimal('250000.00'),
        net_participation_payment=Decimal('625000.00'),
        cumulative_homes_closed=10,
        cumulative_participation_paid=Decimal('625000.00'),
        payment_status='calculated'
    )

    print(f"✅ Created Participation Payment:")
    print(f"   ID: {payment.payment_id}")
    print(f"   Homes Closed: {payment.homes_closed_count}")
    print(f"   Gross Sales: ${payment.gross_home_sales:,.2f}")
    print(f"   Participation: ${payment.participation_amount:,.2f}")
    print(f"   Less Base: ${payment.less_base_allocation:,.2f}")
    print(f"   Net Payment: ${payment.net_participation_payment:,.2f}")

    return payment


def test_model_methods(finance_structure, allocations):
    """Test model methods."""
    print_section("TEST 7: Model Methods")

    if finance_structure:
        print(f"Finance Structure Methods:")
        print(f"   Total Allocated %: {finance_structure.get_total_allocated_percentage()}%")
        print(f"   Spent to Date: ${finance_structure.get_spent_to_date():,.2f}")
        print(f"   Remaining Budget: ${finance_structure.get_remaining_budget():,.2f}")

    if allocations:
        allocation = allocations[0]
        print(f"\nCost Allocation Methods:")
        print(f"   Allocated Amount: ${allocation.calculate_allocated_amount():,.2f}")
        print(f"   Cost to Complete: ${allocation.calculate_cost_to_complete():,.2f}")


def cleanup_test_data(finance_structure):
    """Clean up test data."""
    print_section("CLEANUP: Removing Test Data")

    if finance_structure:
        structure_id = finance_structure.finance_structure_id
        structure_code = finance_structure.structure_code

        # Delete will cascade to allocations, settlements, payments
        finance_structure.delete()

        print(f"✅ Deleted Finance Structure {structure_id} ({structure_code})")
        print("   (All related allocations, settlements, and payments were also deleted)")


def main():
    """Run all tests."""
    print("\n")
    print("╔" + "═" * 78 + "╗")
    print("║" + " " * 20 + "FINANCE STRUCTURE API TEST SUITE" + " " * 26 + "║")
    print("╚" + "═" * 78 + "╝")

    try:
        # Test 1: Create Finance Structure
        finance_structure = test_finance_structure_creation()

        # Test 2: Create Cost Allocations
        allocations = test_cost_allocation(finance_structure)

        # Test 3: Auto-Calculate Allocations
        test_auto_calculate_allocations(finance_structure)

        # Test 4: Calculate Cost-to-Complete
        cost_to_complete = test_cost_to_complete(allocations)

        # Test 5: Create Sale Settlement
        settlement = test_sale_settlement(allocations, cost_to_complete)

        # Test 6: Create Participation Payment
        payment = test_participation_payment(settlement)

        # Test 7: Test Model Methods
        test_model_methods(finance_structure, allocations)

        # Summary
        print_section("TEST SUMMARY")
        print("✅ All tests completed successfully!")
        print("\nCreated:")
        print(f"   - 1 Finance Structure")
        print(f"   - {len(allocations)} Cost Allocations")
        print(f"   - 1 Sale Settlement")
        print(f"   - 1 Participation Payment")

        # Cleanup
        response = input("\n\nDelete test data? (y/n): ")
        if response.lower() == 'y':
            cleanup_test_data(finance_structure)
        else:
            print("\n⚠️  Test data preserved. Remember to clean up manually!")
            print(f"   Finance Structure ID: {finance_structure.finance_structure_id}")

    except KeyboardInterrupt:
        print("\n\n❌ Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error:")
        print(f"   {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
