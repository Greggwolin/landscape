"""
Landscaper Tool Executor

Executes tool calls from Claude AI to update project fields in the database.
All changes are logged to the activity feed.
"""

import logging
from typing import Dict, Any, List, Optional
from decimal import Decimal, InvalidOperation
from django.db import connection
from django.utils import timezone
from .opex_mapping import OPEX_ACCOUNT_MAPPING

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Allowed Tables and Fields (Whitelist for Security)
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_UPDATES = {
    'tbl_project': {
        'fields': [
            # Core identifiers
            'project_name', 'description', 'project_type', 'financial_model_type',
            # Location - all address columns (both naming conventions exist)
            'project_address', 'street_address',
            'city', 'jurisdiction_city',
            'state', 'jurisdiction_state',
            'county', 'jurisdiction_county',
            'zip_code',
            'location_lat', 'location_lon', 'location_description',
            # Market geography
            'market', 'submarket', 'market_velocity_annual',
            # Sizing
            'acres_gross', 'target_units', 'total_units',
            # Pricing
            'price_range_low', 'price_range_high',
            # Financial
            'discount_rate_pct', 'cost_of_capital_pct',
            # Analysis
            'analysis_start_date', 'analysis_end_date', 'calculation_frequency',
            # Ownership
            'legal_owner', 'developer_owner',
            # Status
            'is_active',
        ],
        # Map friendly names to actual column names (for convenience)
        'field_aliases': {
            'address': 'project_address',
            'latitude': 'location_lat',
            'longitude': 'location_lon',
            'total_acres': 'acres_gross',
            'units': 'total_units',  # For operating properties
            'discount_rate': 'discount_rate_pct',
            'zip': 'zip_code',
        },
        'pk_field': 'project_id',
        'schema': 'landscape'
    },
    'tbl_parcel': {
        'fields': [
            'parcel_name', 'parcel_type', 'lot_count', 'net_acres', 'gross_acres',
            'avg_lot_size_sf', 'avg_lot_price', 'total_revenue', 'absorption_rate',
            'status', 'notes', 'is_active'
        ],
        'pk_field': 'parcel_id',
        'fk_field': 'project_id',
        'schema': 'landscape'
    },
    'tbl_phase': {
        'fields': [
            'phase_name', 'phase_number', 'lot_count', 'start_date', 'end_date',
            'budget_amount', 'status', 'notes', 'is_active'
        ],
        'pk_field': 'phase_id',
        'fk_field': 'project_id',
        'schema': 'landscape'
    },
    'tbl_operating_expenses': {
        'fields': [
            'expense_category', 'expense_type', 'annual_amount', 'amount_per_sf',
            'is_recoverable', 'recovery_rate', 'escalation_type', 'escalation_rate',
            'start_period', 'payment_frequency', 'notes', 'account_id'
        ],
        'pk_field': 'opex_id',
        'fk_field': 'project_id',
        'schema': 'landscape'
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Operating Expense Account Mapping
# Maps OM expense labels to category_id in core_unit_cost_category (Operations activity)
# NOTE: After migration 042, these IDs reference core_unit_cost_category.category_id
#       Run this query to get updated IDs after migration:
#       SELECT new_category_id, account_number, account_name
#       FROM landscape.opex_account_migration_map ORDER BY account_number;
# ─────────────────────────────────────────────────────────────────────────────

# Fields that should be cast to specific types
FIELD_TYPES = {
    # tbl_project numeric fields
    'acres_gross': 'decimal',
    'target_units': 'integer',
    'total_units': 'integer',
    'location_lat': 'decimal',
    'location_lon': 'decimal',
    'price_range_low': 'decimal',
    'price_range_high': 'decimal',
    'discount_rate_pct': 'decimal',
    'cost_of_capital_pct': 'decimal',
    'assessed_value': 'decimal',
    # tbl_parcel numeric fields
    'lot_count': 'integer',
    'net_acres': 'decimal',
    'gross_acres': 'decimal',
    'avg_lot_size_sf': 'decimal',
    'avg_lot_price': 'decimal',
    'total_revenue': 'decimal',
    'absorption_rate': 'decimal',
    # tbl_phase numeric fields
    'phase_number': 'integer',
    'budget_amount': 'decimal',
    # tbl_operating_expenses numeric fields
    'annual_amount': 'decimal',
    'amount_per_sf': 'decimal',
    'recovery_rate': 'decimal',
    'escalation_rate': 'decimal',
    'start_period': 'integer',
    'account_id': 'integer',
    # Boolean fields
    'is_active': 'boolean',
    'is_recoverable': 'boolean',
}


# ─────────────────────────────────────────────────────────────────────────────
# OM Field Mapping Dictionary
# Maps common OM (Offering Memorandum) labels to database field names
# ─────────────────────────────────────────────────────────────────────────────

OM_FIELD_MAPPING = {
    # Property Basics
    "address": ("tbl_project", "project_address"),
    "street address": ("tbl_project", "project_address"),
    "city": ("tbl_project", "jurisdiction_city"),
    "state": ("tbl_project", "state"),
    "zip": ("tbl_project", "zip_code"),
    "zip code": ("tbl_project", "zip_code"),
    "county": ("tbl_project", "county"),
    "year built": ("tbl_project", "year_built"),
    "year_built": ("tbl_project", "year_built"),
    "units": ("tbl_project", "total_units"),
    "total units": ("tbl_project", "total_units"),
    "unit count": ("tbl_project", "total_units"),
    "building sf": ("tbl_project", "building_sf_gross"),
    "gsf": ("tbl_project", "building_sf_gross"),
    "gross sf": ("tbl_project", "building_sf_gross"),
    "nrsf": ("tbl_project", "building_sf_net"),
    "net rentable sf": ("tbl_project", "building_sf_net"),
    "lot size": ("tbl_project", "lot_size_sf"),
    "land area": ("tbl_project", "lot_size_sf"),
    "acres": ("tbl_project", "acres_gross"),
    "lot size acres": ("tbl_project", "acres_gross"),
    "apn": ("tbl_project", "apn"),
    "parcel number": ("tbl_project", "apn"),
    "avg unit size": ("tbl_project", "avg_unit_sf"),
    "average sf": ("tbl_project", "avg_unit_sf"),
    "parking spaces": ("tbl_project", "parking_spaces_total"),
    "parking": ("tbl_project", "parking_spaces_total"),
    "buildings": ("tbl_project", "building_count"),
    "stories": ("tbl_project", "stories"),
    "occupancy": ("tbl_project", "occupancy_rate"),
    "occupancy rate": ("tbl_project", "occupancy_rate"),
    "property name": ("tbl_project", "project_name"),

    # Pricing & Valuation
    "price": ("tbl_project", "asking_price"),
    "asking price": ("tbl_project", "asking_price"),
    "list price": ("tbl_project", "asking_price"),
    "purchase price": ("tbl_project", "asking_price"),
    "price per unit": ("tbl_project", "price_per_unit"),
    "price/unit": ("tbl_project", "price_per_unit"),
    "$/unit": ("tbl_project", "price_per_unit"),
    "price per sf": ("tbl_project", "price_per_sf"),
    "price/sf": ("tbl_project", "price_per_sf"),
    "$/sf": ("tbl_project", "price_per_sf"),
    "cap rate": ("tbl_project", "cap_rate_going_in"),
    "going-in cap rate": ("tbl_project", "cap_rate_going_in"),
    "current cap rate": ("tbl_project", "cap_rate_going_in"),
    "pro forma cap rate": ("tbl_project", "cap_rate_proforma"),
    "exit cap rate": ("tbl_project", "exit_cap_rate"),
    "terminal cap rate": ("tbl_project", "exit_cap_rate"),

    # Income - Rent
    "current rent": ("tbl_project", "in_place_rent_monthly"),
    "in-place rent": ("tbl_project", "in_place_rent_monthly"),
    "avg rent": ("tbl_project", "avg_rent_per_unit"),
    "average rent": ("tbl_project", "avg_rent_per_unit"),
    "current rent psf": ("tbl_project", "in_place_rent_psf"),
    "rent psf": ("tbl_project", "in_place_rent_psf"),
    "market rent": ("tbl_project", "market_rent_monthly"),
    "post-reno rent": ("tbl_project", "market_rent_monthly"),
    "market rent psf": ("tbl_project", "market_rent_psf"),
    "rental upside": ("tbl_project", "rental_upside_pct"),
    "gpr": ("tbl_project", "gross_potential_rent"),
    "gross potential rent": ("tbl_project", "gross_potential_rent"),
    "loss to lease": ("tbl_project", "loss_to_lease"),

    # Income - Other
    "other income": ("tbl_project", "other_income_total"),
    "parking income": ("tbl_project", "parking_income"),
    "laundry": ("tbl_project", "laundry_income"),
    "laundry income": ("tbl_project", "laundry_income"),
    "vending": ("tbl_project", "laundry_income"),
    "pet income": ("tbl_project", "pet_income"),
    "pet fees": ("tbl_project", "pet_income"),
    "storage income": ("tbl_project", "storage_income"),
    "rubs": ("tbl_project", "utility_reimbursement"),
    "utility reimbursement": ("tbl_project", "utility_reimbursement"),
    "late fees": ("tbl_project", "late_fees"),
    "application fees": ("tbl_project", "application_fees"),

    # Vacancy
    "physical vacancy": ("tbl_project", "physical_vacancy_pct"),
    "vacancy": ("tbl_project", "vacancy_loss_pct"),
    "vacancy loss": ("tbl_project", "vacancy_loss_pct"),
    "economic vacancy": ("tbl_project", "economic_vacancy_pct"),
    "bad debt": ("tbl_project", "collection_loss_pct"),
    "collection loss": ("tbl_project", "collection_loss_pct"),
    "concessions": ("tbl_project", "concessions_pct"),

    # Operating Expenses
    "total operating expenses": ("tbl_project", "total_opex"),
    "operating expenses": ("tbl_project", "total_opex"),
    "opex": ("tbl_project", "total_opex"),
    "opex per unit": ("tbl_project", "opex_per_unit"),
    "expense ratio": ("tbl_project", "expense_ratio_pct"),
    "management fee": ("tbl_project", "management_fee"),
    "management fee pct": ("tbl_project", "management_fee_pct"),
    "management %": ("tbl_project", "management_fee_pct"),
    "real estate taxes": ("tbl_project", "real_estate_taxes"),
    "property taxes": ("tbl_project", "real_estate_taxes"),
    "taxes": ("tbl_project", "real_estate_taxes"),
    "tax rate": ("tbl_project", "tax_rate_pct"),
    "insurance": ("tbl_project", "property_insurance"),
    "property insurance": ("tbl_project", "property_insurance"),
    "utilities": ("tbl_project", "utilities_total"),
    "total utilities": ("tbl_project", "utilities_total"),
    "electric": ("tbl_project", "utilities_electric"),
    "electricity": ("tbl_project", "utilities_electric"),
    "gas": ("tbl_project", "utilities_gas"),
    "water": ("tbl_project", "utilities_water_sewer"),
    "water & sewer": ("tbl_project", "utilities_water_sewer"),
    "water and sewer": ("tbl_project", "utilities_water_sewer"),
    "trash": ("tbl_project", "utilities_trash"),
    "rubbish": ("tbl_project", "utilities_trash"),
    "rubbish removal": ("tbl_project", "utilities_trash"),
    "repairs & maintenance": ("tbl_project", "repairs_maintenance"),
    "repairs and maintenance": ("tbl_project", "repairs_maintenance"),
    "r&m": ("tbl_project", "repairs_maintenance"),
    "payroll": ("tbl_project", "payroll"),
    "on-site payroll": ("tbl_project", "payroll"),
    "administrative": ("tbl_project", "administrative"),
    "admin": ("tbl_project", "administrative"),
    "contract services": ("tbl_project", "contract_services"),
    "contracted services": ("tbl_project", "contract_services"),
    "landscaping": ("tbl_project", "landscaping_expense"),
    "pool": ("tbl_project", "pool_maintenance"),
    "pool maintenance": ("tbl_project", "pool_maintenance"),
    "pest control": ("tbl_project", "pest_control"),
    "turnover": ("tbl_project", "turnover_costs"),
    "make ready": ("tbl_project", "turnover_costs"),
    "apartment prep": ("tbl_project", "turnover_costs"),

    # NOI
    "noi": ("tbl_project", "noi_current"),
    "net operating income": ("tbl_project", "noi_current"),
    "current noi": ("tbl_project", "noi_current"),
    "t12 noi": ("tbl_project", "noi_current"),
    "pro forma noi": ("tbl_project", "noi_proforma"),
    "stabilized noi": ("tbl_project", "noi_proforma"),
    "post-reno noi": ("tbl_project", "noi_post_renovation"),
    "egi": ("tbl_project", "effective_gross_income"),
    "effective gross income": ("tbl_project", "effective_gross_income"),

    # Financing
    "loan amount": ("tbl_project", "loan_amount"),
    "ltv": ("tbl_project", "ltv_pct"),
    "loan to value": ("tbl_project", "ltv_pct"),
    "interest rate": ("tbl_project", "interest_rate_pct"),
    "rate": ("tbl_project", "interest_rate_pct"),
    "amortization": ("tbl_project", "amortization_years"),
    "amortization years": ("tbl_project", "amortization_years"),
    "loan term": ("tbl_project", "loan_term_years"),
    "term": ("tbl_project", "loan_term_years"),
    "dscr": ("tbl_project", "dscr"),
    "debt service coverage": ("tbl_project", "dscr"),
    "debt service": ("tbl_project", "annual_debt_service"),

    # Market Data
    "population": ("tbl_project", "market_population"),
    "household income": ("tbl_project", "market_avg_hh_income"),
    "avg household income": ("tbl_project", "market_avg_hh_income"),
    "average household income": ("tbl_project", "market_avg_hh_income"),
    "median home value": ("tbl_project", "market_median_home_value"),
    "home value": ("tbl_project", "market_median_home_value"),
    "submarket vacancy": ("tbl_project", "submarket_vacancy_pct"),
    "market vacancy": ("tbl_project", "submarket_vacancy_pct"),
    "submarket rent": ("tbl_project", "submarket_effective_rent"),
    "effective rent": ("tbl_project", "submarket_effective_rent"),
    "unemployment": ("tbl_project", "market_unemployment_pct"),
}


def normalize_om_label(extracted_label: str) -> Optional[tuple]:
    """
    Convert extracted OM label to database table and field name.

    Args:
        extracted_label: Label extracted from document (e.g., "Price Per Unit")

    Returns:
        Tuple of (table_name, field_name) or None if not mapped
    """
    normalized = extracted_label.lower().strip()
    return OM_FIELD_MAPPING.get(normalized, None)


def parse_om_value(value_str: str, field_name: str) -> Any:
    """
    Parse an OM value string to appropriate type.

    Handles:
    - Currency: "$1,234,567" -> 1234567.0
    - Percentages: "5.5%" -> 0.055
    - Integers: "1,234" -> 1234
    - Decimals: "1,234.56" -> 1234.56
    """
    if not value_str or value_str.lower() in ('n/a', 'na', '-', 'null', 'none'):
        return None

    # Clean the string
    cleaned = str(value_str).strip()

    # Check if it's a percentage
    is_percentage = '%' in cleaned or '_pct' in field_name

    # Remove currency symbols and commas
    cleaned = cleaned.replace('$', '').replace(',', '').replace('%', '').strip()

    try:
        # Parse as float
        num_value = float(cleaned)

        # Convert percentage to decimal
        if is_percentage and num_value > 1:
            num_value = num_value / 100.0

        # Return as int if it's a whole number and field expects int
        int_fields = ['total_units', 'year_built', 'building_count', 'stories',
                      'parking_spaces_total', 'amortization_years', 'loan_term_years',
                      'market_population']
        if field_name in int_fields:
            return int(num_value)

        return num_value

    except ValueError:
        # Return as string if can't parse as number
        return value_str


def cast_value(field: str, value: str) -> Any:
    """Cast a string value to the appropriate type for the field."""
    field_type = FIELD_TYPES.get(field, 'string')

    if value is None or value == '' or value.lower() == 'null':
        return None

    try:
        if field_type == 'integer':
            return int(float(value))
        elif field_type == 'decimal':
            return Decimal(str(value))
        elif field_type == 'boolean':
            return value.lower() in ('true', '1', 'yes')
        else:
            return str(value)
    except (ValueError, InvalidOperation) as e:
        logger.warning(f"Could not cast value '{value}' for field '{field}': {e}")
        return str(value)


def get_current_value(table: str, field: str, project_id: int) -> Optional[Any]:
    """Get the current value of a field for a project."""
    table_config = ALLOWED_UPDATES.get(table)
    if not table_config:
        return None

    # Check for field aliases
    field_aliases = table_config.get('field_aliases', {})
    db_field = field_aliases.get(field, field)

    schema = table_config.get('schema', 'landscape')
    pk_field = table_config.get('pk_field')
    fk_field = table_config.get('fk_field')

    # Use the appropriate field for lookup
    lookup_field = fk_field if fk_field else pk_field

    try:
        with connection.cursor() as cursor:
            query = f"""
                SELECT {db_field}
                FROM {schema}.{table}
                WHERE {lookup_field} = %s
                LIMIT 1
            """
            cursor.execute(query, [project_id])
            row = cursor.fetchone()
            return row[0] if row else None
    except Exception as e:
        logger.warning(f"Could not get current value for {table}.{db_field}: {e}")
        return None


def update_single_field(
    table: str,
    field: str,
    value: str,
    reason: str,
    project_id: int
) -> Dict[str, Any]:
    """
    Update a single field in the database.

    Returns:
        Dict with success status, old_value, new_value, and any error message
    """
    # Validate table is allowed
    table_config = ALLOWED_UPDATES.get(table)
    if not table_config:
        return {
            'success': False,
            'error': f"Table '{table}' is not allowed for updates",
            'table': table,
            'field': field
        }

    # Check for field aliases (friendly name -> actual column name)
    field_aliases = table_config.get('field_aliases', {})
    actual_field = field_aliases.get(field, field)

    # Validate field is allowed (check both original and aliased)
    if actual_field not in table_config['fields'] and field not in table_config['fields']:
        return {
            'success': False,
            'error': f"Field '{field}' is not allowed for updates in table '{table}'",
            'table': table,
            'field': field
        }

    # Use the actual field name for database operations
    db_field = actual_field

    schema = table_config.get('schema', 'landscape')
    pk_field = table_config.get('pk_field')
    fk_field = table_config.get('fk_field')

    # Use the appropriate field for lookup
    lookup_field = fk_field if fk_field else pk_field

    # Get current value before update (use db_field for actual query)
    old_value = get_current_value(table, db_field, project_id)

    # Cast the new value
    typed_value = cast_value(db_field, value)

    try:
        with connection.cursor() as cursor:
            # Check if record exists
            check_query = f"""
                SELECT COUNT(*)
                FROM {schema}.{table}
                WHERE {lookup_field} = %s
            """
            cursor.execute(check_query, [project_id])
            exists = cursor.fetchone()[0] > 0

            if not exists and fk_field:
                # Need to create a new record for related tables
                insert_query = f"""
                    INSERT INTO {schema}.{table} ({fk_field}, {db_field}, updated_at)
                    VALUES (%s, %s, %s)
                """
                cursor.execute(insert_query, [project_id, typed_value, timezone.now()])
                logger.info(f"Created new {table} record for project {project_id}")
            elif exists:
                # Update existing record
                update_query = f"""
                    UPDATE {schema}.{table}
                    SET {db_field} = %s, updated_at = %s
                    WHERE {lookup_field} = %s
                """
                cursor.execute(update_query, [typed_value, timezone.now(), project_id])
            else:
                return {
                    'success': False,
                    'error': f"No record found for project_id {project_id} in table {table}",
                    'table': table,
                    'field': field
                }

        # Log to activity feed
        _log_field_update_activity(
            project_id=project_id,
            table=table,
            field=field,
            old_value=old_value,
            new_value=typed_value,
            reason=reason
        )

        return {
            'success': True,
            'table': table,
            'field': field,
            'old_value': str(old_value) if old_value is not None else None,
            'new_value': str(typed_value) if typed_value is not None else None,
            'reason': reason
        }

    except Exception as e:
        logger.error(f"Database error updating {table}.{field}: {e}")
        return {
            'success': False,
            'error': str(e),
            'table': table,
            'field': field
        }


def upsert_operating_expense(
    project_id: int,
    expense_label: str,
    annual_amount: float,
    expense_type: str = None,
    escalation_rate: float = 0.03,
    is_recoverable: bool = False,
    notes: str = None
) -> Dict[str, Any]:
    """
    Upsert an operating expense record for a project.

    Maps the expense_label to the appropriate account_id using OPEX_ACCOUNT_MAPPING.
    If a record already exists for this project/account combo, it updates it.
    Otherwise creates a new record.

    Args:
        project_id: Project to add expense to
        expense_label: Human-readable expense name (e.g., "Property Taxes", "Insurance")
        annual_amount: Annual expense amount in dollars
        expense_type: Override expense type (CAM, TAXES, INSURANCE, MANAGEMENT, UTILITIES, REPAIRS, OTHER)
        escalation_rate: Annual escalation rate (default 3%)
        is_recoverable: Whether expense is tenant-recoverable
        notes: Optional notes about the expense

    Returns:
        Dict with success status and created/updated record info
    """
    # Normalize the label and look up account_id
    normalized_label = expense_label.lower().strip()
    account_id = OPEX_ACCOUNT_MAPPING.get(normalized_label)

    if account_id is None:
        # Try partial matching
        for key, aid in OPEX_ACCOUNT_MAPPING.items():
            if key in normalized_label or normalized_label in key:
                account_id = aid
                break

    # Determine expense type from label if not provided
    if not expense_type:
        if any(x in normalized_label for x in ['tax', 'insurance']):
            expense_type = 'TAXES' if 'tax' in normalized_label else 'INSURANCE'
        elif any(x in normalized_label for x in ['water', 'electric', 'gas', 'trash', 'utilit']):
            expense_type = 'UTILITIES'
        elif any(x in normalized_label for x in ['repair', 'maintenance', 'turnover', 'landscap', 'pest', 'pool']):
            expense_type = 'REPAIRS'
        elif any(x in normalized_label for x in ['management', 'admin', 'payroll', 'professional']):
            expense_type = 'MANAGEMENT'
        else:
            expense_type = 'OTHER'

    # Determine expense category from type
    category_map = {
        'TAXES': 'taxes',
        'INSURANCE': 'insurance',
        'UTILITIES': 'utilities',
        'REPAIRS': 'maintenance',
        'MANAGEMENT': 'management',
        'CAM': 'cam',
        'OTHER': 'other'
    }
    expense_category = category_map.get(expense_type, 'other')

    try:
        with connection.cursor() as cursor:
            # Check if record exists for this project/account combo
            if account_id:
                cursor.execute("""
                    SELECT opex_id, annual_amount
                    FROM landscape.tbl_operating_expenses
                    WHERE project_id = %s AND account_id = %s
                """, [project_id, account_id])
            else:
                # No account_id, check by expense_type and category
                cursor.execute("""
                    SELECT opex_id, annual_amount
                    FROM landscape.tbl_operating_expenses
                    WHERE project_id = %s AND expense_type = %s AND expense_category = %s
                    AND account_id IS NULL
                """, [project_id, expense_type, expense_category])

            existing = cursor.fetchone()

            if existing:
                # Update existing record - ADD to existing amount for same account
                opex_id, old_amount = existing
                old_amount_float = float(old_amount) if old_amount else 0
                new_total = old_amount_float + annual_amount

                cursor.execute("""
                    UPDATE landscape.tbl_operating_expenses
                    SET annual_amount = %s,
                        escalation_rate = %s,
                        is_recoverable = %s,
                        notes = COALESCE(notes || '; ' || %s, %s),
                        updated_at = NOW()
                    WHERE opex_id = %s
                """, [new_total, escalation_rate, is_recoverable, notes, notes, opex_id])

                logger.info(f"Updated opex {opex_id} for project {project_id}: {expense_label} added ${annual_amount} (total now ${new_total})")

                return {
                    'success': True,
                    'action': 'updated',
                    'opex_id': opex_id,
                    'expense_label': expense_label,
                    'old_amount': old_amount_float,
                    'added_amount': annual_amount,
                    'new_amount': new_total,
                    'account_id': account_id
                }
            else:
                # Insert new record
                cursor.execute("""
                    INSERT INTO landscape.tbl_operating_expenses
                    (project_id, expense_category, expense_type, annual_amount,
                     escalation_rate, is_recoverable, start_period, account_id, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, 1, %s, %s)
                    RETURNING opex_id
                """, [project_id, expense_category, expense_type, annual_amount,
                      escalation_rate, is_recoverable, account_id, notes])

                opex_id = cursor.fetchone()[0]

                logger.info(f"Created opex {opex_id} for project {project_id}: {expense_label} = ${annual_amount}")

                return {
                    'success': True,
                    'action': 'created',
                    'opex_id': opex_id,
                    'expense_label': expense_label,
                    'amount': annual_amount,
                    'account_id': account_id
                }

    except Exception as e:
        logger.error(f"Error upserting operating expense: {e}")
        return {
            'success': False,
            'error': str(e),
            'expense_label': expense_label
        }


# ─────────────────────────────────────────────────────────────────────────────
# Rental Comparable Functions
# ─────────────────────────────────────────────────────────────────────────────

def upsert_rental_comparable(
    project_id: int,
    property_name: str,
    unit_type: str,
    bedrooms: float,
    bathrooms: float,
    avg_sqft: int,
    asking_rent: float,
    address: str = None,
    latitude: float = None,
    longitude: float = None,
    distance_miles: float = None,
    year_built: int = None,
    total_units: int = None,
    effective_rent: float = None,
    notes: str = None,
    data_source: str = None
) -> Dict[str, Any]:
    """
    Upsert a rental comparable record for a project.

    If a record already exists for this project/property/unit_type combo, it updates it.
    Otherwise creates a new record.

    Args:
        project_id: Project to add comp to
        property_name: Name of comparable property
        unit_type: Unit type descriptor (e.g., "1BR/1BA")
        bedrooms: Number of bedrooms
        bathrooms: Number of bathrooms
        avg_sqft: Average square footage
        asking_rent: Monthly asking rent
        address: Optional street address
        latitude: Optional latitude
        longitude: Optional longitude
        distance_miles: Optional distance from subject
        year_built: Optional year built
        total_units: Optional total unit count
        effective_rent: Optional effective rent
        notes: Optional notes
        data_source: Optional data source

    Returns:
        Dict with success status and created/updated record info
    """
    from datetime import date as date_type

    try:
        with connection.cursor() as cursor:
            # Check if record exists for this project/property/unit_type combo
            cursor.execute("""
                SELECT comparable_id, asking_rent
                FROM landscape.tbl_rental_comparable
                WHERE project_id = %s
                  AND LOWER(property_name) = LOWER(%s)
                  AND LOWER(unit_type) = LOWER(%s)
                  AND is_active = true
            """, [project_id, property_name, unit_type])

            existing = cursor.fetchone()

            if existing:
                # Update existing record
                comparable_id, old_rent = existing
                old_rent_float = float(old_rent) if old_rent else 0

                cursor.execute("""
                    UPDATE landscape.tbl_rental_comparable
                    SET asking_rent = %s,
                        effective_rent = %s,
                        address = COALESCE(%s, address),
                        latitude = COALESCE(%s, latitude),
                        longitude = COALESCE(%s, longitude),
                        distance_miles = COALESCE(%s, distance_miles),
                        year_built = COALESCE(%s, year_built),
                        total_units = COALESCE(%s, total_units),
                        avg_sqft = %s,
                        notes = COALESCE(%s, notes),
                        data_source = COALESCE(%s, data_source),
                        as_of_date = %s,
                        updated_at = NOW()
                    WHERE comparable_id = %s
                """, [
                    asking_rent, effective_rent, address, latitude, longitude,
                    distance_miles, year_built, total_units, avg_sqft,
                    notes, data_source, date_type.today(), comparable_id
                ])

                logger.info(f"Updated rental comp {comparable_id} for project {project_id}: {property_name} {unit_type}")

                return {
                    'success': True,
                    'action': 'updated',
                    'comparable_id': comparable_id,
                    'property_name': property_name,
                    'unit_type': unit_type,
                    'old_rent': old_rent_float,
                    'new_rent': asking_rent
                }
            else:
                # Insert new record
                cursor.execute("""
                    INSERT INTO landscape.tbl_rental_comparable
                    (project_id, property_name, address, latitude, longitude,
                     distance_miles, year_built, total_units, unit_type,
                     bedrooms, bathrooms, avg_sqft, asking_rent, effective_rent,
                     notes, data_source, as_of_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING comparable_id
                """, [
                    project_id, property_name, address, latitude, longitude,
                    distance_miles, year_built, total_units, unit_type,
                    bedrooms, bathrooms, avg_sqft, asking_rent, effective_rent,
                    notes, data_source, date_type.today()
                ])

                comparable_id = cursor.fetchone()[0]

                logger.info(f"Created rental comp {comparable_id} for project {project_id}: {property_name} {unit_type} = ${asking_rent}")

                return {
                    'success': True,
                    'action': 'created',
                    'comparable_id': comparable_id,
                    'property_name': property_name,
                    'unit_type': unit_type,
                    'asking_rent': asking_rent
                }

    except Exception as e:
        logger.error(f"Error upserting rental comparable: {e}")
        return {
            'success': False,
            'error': str(e),
            'property_name': property_name,
            'unit_type': unit_type
        }


def bulk_upsert_rental_comps(
    project_id: int,
    comps: List[Dict[str, Any]],
    source_document: str = None
) -> Dict[str, Any]:
    """
    Bulk upsert multiple rental comparables for a project.

    Args:
        project_id: Project to add comps to
        comps: List of comp dicts with keys:
            - property_name: Required
            - unit_type: Required
            - bedrooms, bathrooms: Required
            - avg_sqft, asking_rent: Required
            - address, lat, lng, etc.: Optional
        source_document: Optional document name for activity logging

    Returns:
        Dict with success status, created/updated counts, and details
    """
    results = []
    created_count = 0
    updated_count = 0
    error_count = 0

    for comp in comps:
        property_name = comp.get('property_name', '')
        unit_type = comp.get('unit_type', '')
        bedrooms = comp.get('bedrooms', 0)
        bathrooms = comp.get('bathrooms', 0)
        avg_sqft = comp.get('avg_sqft', 0)
        asking_rent = comp.get('asking_rent', 0)

        if not property_name or not unit_type or not asking_rent:
            results.append({
                'success': False,
                'error': 'Missing required fields (property_name, unit_type, asking_rent)',
                'comp': comp
            })
            error_count += 1
            continue

        result = upsert_rental_comparable(
            project_id=project_id,
            property_name=property_name,
            unit_type=unit_type,
            bedrooms=float(bedrooms),
            bathrooms=float(bathrooms),
            avg_sqft=int(avg_sqft),
            asking_rent=float(asking_rent),
            address=comp.get('address'),
            latitude=comp.get('latitude'),
            longitude=comp.get('longitude'),
            distance_miles=comp.get('distance_miles'),
            year_built=comp.get('year_built'),
            total_units=comp.get('total_units'),
            effective_rent=comp.get('effective_rent'),
            notes=comp.get('notes'),
            data_source=source_document or 'Landscaper AI'
        )

        results.append(result)

        if result.get('success'):
            if result.get('action') == 'created':
                created_count += 1
            else:
                updated_count += 1
        else:
            error_count += 1

    # Log activity for bulk operation
    if created_count > 0 or updated_count > 0:
        _log_rental_comp_activity(
            project_id=project_id,
            created_count=created_count,
            updated_count=updated_count,
            source_document=source_document,
            comps=[r for r in results if r.get('success')]
        )

    return {
        'success': error_count == 0,
        'created': created_count,
        'updated': updated_count,
        'errors': error_count,
        'results': results,
        'summary': f"Created {created_count}, updated {updated_count}, errors {error_count}"
    }


def _log_rental_comp_activity(
    project_id: int,
    created_count: int,
    updated_count: int,
    source_document: str,
    comps: List[Dict]
) -> None:
    """Log bulk rental comp update to activity feed."""
    try:
        from .models import ActivityItem

        total = created_count + updated_count
        comp_names = list(set([c.get('property_name', 'Unknown') for c in comps[:5]]))
        comp_list = ', '.join(comp_names)
        if len(set([c.get('property_name') for c in comps])) > 5:
            comp_list += f" and {len(set([c.get('property_name') for c in comps])) - 5} more"

        title = f"Added {total} rental comparables"
        if source_document:
            summary = f"Populated from {source_document}: {comp_list}"
        else:
            summary = f"Added comps: {comp_list}"

        ActivityItem.objects.create(
            project_id=project_id,
            activity_type='update',
            title=title,
            summary=summary,
            status='complete',
            confidence='high',
            details={
                'created': created_count,
                'updated': updated_count,
                'comps': comps
            },
            highlight_fields=['rental_comparables'],
            source_type='landscaper_ai',
            source_id=f"rental_comp_bulk_{project_id}"
        )
        logger.info(f"Logged rental comp bulk activity for project {project_id}")

    except Exception as e:
        logger.error(f"Failed to log rental comp activity: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Operating Expense Functions
# ─────────────────────────────────────────────────────────────────────────────

def bulk_upsert_operating_expenses(
    project_id: int,
    expenses: List[Dict[str, Any]],
    source_document: str = None
) -> Dict[str, Any]:
    """
    Bulk upsert multiple operating expenses for a project.

    Args:
        project_id: Project to add expenses to
        expenses: List of expense dicts with keys:
            - label: Expense name (required)
            - annual_amount: Amount in dollars (required)
            - expense_type: Optional override
            - escalation_rate: Optional (default 3%)
            - is_recoverable: Optional (default False)
        source_document: Optional document name for activity logging

    Returns:
        Dict with success status, created/updated counts, and details
    """
    results = []
    created_count = 0
    updated_count = 0
    error_count = 0

    for expense in expenses:
        label = expense.get('label', expense.get('expense_label', ''))
        amount = expense.get('annual_amount', expense.get('amount', 0))

        if not label or not amount:
            results.append({
                'success': False,
                'error': 'Missing label or amount',
                'expense': expense
            })
            error_count += 1
            continue

        result = upsert_operating_expense(
            project_id=project_id,
            expense_label=label,
            annual_amount=float(amount),
            expense_type=expense.get('expense_type'),
            escalation_rate=float(expense.get('escalation_rate', 0.03)),
            is_recoverable=expense.get('is_recoverable', False),
            notes=expense.get('notes')
        )

        results.append(result)

        if result.get('success'):
            if result.get('action') == 'created':
                created_count += 1
            else:
                updated_count += 1
        else:
            error_count += 1

    # Log activity for bulk operation
    if created_count > 0 or updated_count > 0:
        _log_opex_bulk_activity(
            project_id=project_id,
            created_count=created_count,
            updated_count=updated_count,
            source_document=source_document,
            expenses=[r for r in results if r.get('success')]
        )

    return {
        'success': error_count == 0,
        'created': created_count,
        'updated': updated_count,
        'errors': error_count,
        'results': results,
        'summary': f"Created {created_count}, updated {updated_count}, errors {error_count}"
    }


def _log_opex_bulk_activity(
    project_id: int,
    created_count: int,
    updated_count: int,
    source_document: str,
    expenses: List[Dict]
) -> None:
    """Log bulk operating expense update to activity feed."""
    try:
        from .models import ActivityItem

        total = created_count + updated_count
        expense_names = [e.get('expense_label', 'Unknown') for e in expenses[:5]]
        expense_list = ', '.join(expense_names)
        if len(expenses) > 5:
            expense_list += f" and {len(expenses) - 5} more"

        title = f"Updated {total} operating expenses"
        if source_document:
            summary = f"Populated from {source_document}: {expense_list}"
        else:
            summary = f"Updated expenses: {expense_list}"

        ActivityItem.objects.create(
            project_id=project_id,
            activity_type='update',
            title=title,
            summary=summary,
            status='complete',
            confidence='high',
            details={
                'created': created_count,
                'updated': updated_count,
                'expenses': expenses
            },
            highlight_fields=['operating_expenses'],
            source_type='landscaper_ai',
            source_id=f"opex_bulk_{project_id}"
        )
        logger.info(f"Logged opex bulk activity for project {project_id}")

    except Exception as e:
        logger.error(f"Failed to log opex activity: {e}")


def execute_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    project_id: int
) -> Dict[str, Any]:
    """
    Execute a tool call from Claude.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool
        project_id: The project ID to operate on

    Returns:
        Dict with execution results
    """
    if tool_name == 'update_project_field':
        result = update_single_field(
            table=tool_input.get('table', ''),
            field=tool_input.get('field', ''),
            value=tool_input.get('value', ''),
            reason=tool_input.get('reason', ''),
            project_id=project_id
        )
        # Wrap single update in updates list for consistency
        if result.get('success'):
            result['updates'] = [result.copy()]
        return result

    elif tool_name == 'bulk_update_fields':
        updates_input = tool_input.get('updates', [])
        results = []
        all_success = True

        for update in updates_input:
            result = update_single_field(
                table=update.get('table', ''),
                field=update.get('field', ''),
                value=update.get('value', ''),
                reason=update.get('reason', ''),
                project_id=project_id
            )
            results.append(result)
            if not result.get('success'):
                all_success = False

        return {
            'success': all_success,
            'updates': [r for r in results if r.get('success')],
            'errors': [r for r in results if not r.get('success')]
        }

    elif tool_name == 'get_project_fields':
        fields_input = tool_input.get('fields', [])
        values = {}

        for field_spec in fields_input:
            table = field_spec.get('table', '')
            field = field_spec.get('field', '')
            key = f"{table}.{field}"

            # Validate access
            table_config = ALLOWED_UPDATES.get(table)
            if table_config and field in table_config['fields']:
                value = get_current_value(table, field, project_id)
                values[key] = str(value) if value is not None else None
            else:
                values[key] = f"Access denied for {key}"

        return {
            'success': True,
            'values': values
        }

    elif tool_name == 'get_field_schema':
        return get_field_schema(
            table_name=tool_input.get('table_name'),
            field_group=tool_input.get('field_group'),
            field_name=tool_input.get('field_name')
        )

    elif tool_name == 'update_operating_expenses':
        expenses = tool_input.get('expenses', [])
        source_doc = tool_input.get('source_document')
        return bulk_upsert_operating_expenses(
            project_id=project_id,
            expenses=expenses,
            source_document=source_doc
        )

    elif tool_name == 'update_rental_comps':
        comps = tool_input.get('comps', [])
        source_doc = tool_input.get('source_document')
        return bulk_upsert_rental_comps(
            project_id=project_id,
            comps=comps,
            source_document=source_doc
        )

    elif tool_name == 'get_project_documents':
        return get_project_documents(
            project_id=project_id,
            status_filter=tool_input.get('status_filter', 'all')
        )

    elif tool_name == 'get_document_content':
        doc_id = tool_input.get('doc_id')
        if not doc_id:
            return {'success': False, 'error': 'doc_id is required'}
        return get_document_content(
            doc_id=doc_id,
            project_id=project_id,
            max_length=tool_input.get('max_length', 50000)
        )

    elif tool_name == 'get_document_assertions':
        return get_document_assertions(
            project_id=project_id,
            doc_id=tool_input.get('doc_id'),
            subject_type=tool_input.get('subject_type')
        )

    elif tool_name == 'ingest_document':
        doc_id = tool_input.get('doc_id')
        if not doc_id:
            return {'success': False, 'error': 'doc_id is required'}
        return ingest_document(
            doc_id=doc_id,
            project_id=project_id,
            overwrite_existing=tool_input.get('overwrite_existing', False),
            field_filter=tool_input.get('field_filter')
        )

    else:
        return {
            'success': False,
            'error': f"Unknown tool: {tool_name}"
        }


# ─────────────────────────────────────────────────────────────────────────────
# Document Reading Functions
# ─────────────────────────────────────────────────────────────────────────────

def get_project_documents(
    project_id: int,
    status_filter: str = "all"
) -> Dict[str, Any]:
    """
    List all documents uploaded to a project.

    Args:
        project_id: Project ID to list documents for
        status_filter: Optional filter: 'indexed', 'pending', 'failed', or 'all'

    Returns:
        Dict with documents list and count
    """
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT
                    d.doc_id,
                    d.doc_name,
                    d.doc_type,
                    d.mime_type,
                    d.file_size_bytes,
                    d.status as doc_status,
                    d.created_at,
                    q.status as extraction_status,
                    q.overall_confidence,
                    (SELECT COUNT(*) FROM landscape.dms_assertion a WHERE a.doc_id = d.doc_id::text) as assertion_count
                FROM landscape.core_doc d
                LEFT JOIN landscape.dms_extract_queue q ON q.doc_id = d.doc_id
                WHERE d.project_id = %s
            """
            params = [project_id]

            if status_filter != "all":
                query += " AND q.status = %s"
                params.append(status_filter)

            query += " ORDER BY d.created_at DESC LIMIT 50"

            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        documents = []
        for row in rows:
            doc_dict = dict(zip(columns, row))
            # Convert datetime to string for JSON serialization
            if doc_dict.get('created_at'):
                doc_dict['created_at'] = doc_dict['created_at'].isoformat()
            # Convert Decimal to float
            if doc_dict.get('overall_confidence'):
                doc_dict['overall_confidence'] = float(doc_dict['overall_confidence'])
            documents.append(doc_dict)

        return {
            'success': True,
            'documents': documents,
            'count': len(documents)
        }

    except Exception as e:
        logger.error(f"Error getting project documents: {e}")
        return {
            'success': False,
            'error': str(e),
            'documents': [],
            'count': 0
        }


def get_document_content(
    doc_id: int,
    project_id: int,
    max_length: int = 50000
) -> Dict[str, Any]:
    """
    Get extracted content from a document.

    The content comes from the extracted_data JSONB field in dms_extract_queue,
    which contains the structured extraction result.

    Args:
        doc_id: Document ID to retrieve content from
        project_id: Project ID for authorization check
        max_length: Maximum characters to return

    Returns:
        Dict with document metadata and extracted content
    """
    import json
    try:
        with connection.cursor() as cursor:
            # First get document metadata and verify project access
            doc_query = """
                SELECT d.doc_id, d.doc_name, d.doc_type, d.project_id, d.mime_type
                FROM landscape.core_doc d
                WHERE d.doc_id = %s AND d.project_id = %s
            """
            cursor.execute(doc_query, [doc_id, project_id])
            doc = cursor.fetchone()

            if not doc:
                return {
                    'success': False,
                    'error': f"Document {doc_id} not found or access denied"
                }

            doc_id, doc_name, doc_type, proj_id, mime_type = doc

            # Get extracted data from the queue (including raw text)
            content_query = """
                SELECT q.extracted_data, q.status, q.overall_confidence, q.extracted_text
                FROM landscape.dms_extract_queue q
                WHERE q.doc_id = %s AND q.status = 'completed'
                ORDER BY q.processed_at DESC
                LIMIT 1
            """
            cursor.execute(content_query, [doc_id])
            result = cursor.fetchone()

            if not result or (not result[0] and not result[3]):
                return {
                    'success': True,
                    'doc_id': doc_id,
                    'doc_name': doc_name,
                    'doc_type': doc_type,
                    'content': None,
                    'message': "No extracted content available. Document may not be indexed yet."
                }

            extracted_data, status, confidence, raw_text = result

            # Parse JSON if it's a string (Django may not auto-parse JSONB)
            if isinstance(extracted_data, str):
                try:
                    extracted_data = json.loads(extracted_data)
                except json.JSONDecodeError:
                    pass

            # Convert extracted_data to readable text summary
            content_parts = []

            # Handle different extraction types
            if isinstance(extracted_data, dict):
                # Property info
                if 'property_info' in extracted_data:
                    prop = extracted_data['property_info']
                    if prop and any(v for v in prop.values() if v):
                        content_parts.append("## Property Information")
                        for k, v in prop.items():
                            if v:
                                content_parts.append(f"- {k}: {v}")

                # Unit types - format as readable table
                if 'unit_types' in extracted_data and extracted_data['unit_types']:
                    content_parts.append("\n## Unit Types")
                    for ut in extracted_data['unit_types'][:20]:  # Limit to first 20
                        if isinstance(ut, dict):
                            beds = ut.get('bedroom_count', '?')
                            baths = ut.get('bathroom_count', '?')
                            sqft = ut.get('typical_sqft', '?')
                            count = ut.get('unit_count', '?')
                            rent = ut.get('market_rent_monthly')
                            rent_str = f"${rent:,.0f}/mo" if rent else "N/A"
                            content_parts.append(f"- {beds}BR/{baths}BA: {count} units, {sqft} sqft, {rent_str}")
                        else:
                            content_parts.append(f"- {ut}")

                # Units
                if 'units' in extracted_data and extracted_data['units']:
                    content_parts.append(f"\n## Units ({len(extracted_data['units'])} total)")
                    for unit in extracted_data['units'][:10]:  # First 10 units
                        if isinstance(unit, dict):
                            unit_num = unit.get('unit_number', '?')
                            sqft = unit.get('sqft', unit.get('square_feet', '?'))
                            content_parts.append(f"- Unit {unit_num}: {sqft} sqft")
                        else:
                            content_parts.append(f"- {unit}")
                    if len(extracted_data['units']) > 10:
                        content_parts.append(f"... and {len(extracted_data['units']) - 10} more units")

                # Leases
                if 'leases' in extracted_data and extracted_data['leases']:
                    content_parts.append(f"\n## Leases ({len(extracted_data['leases'])} total)")
                    for lease in extracted_data['leases'][:10]:  # First 10 leases
                        if isinstance(lease, dict):
                            unit_num = lease.get('unit_number', '?')
                            rent = lease.get('base_rent_monthly', lease.get('monthly_rent', '?'))
                            tenant = lease.get('resident_name', lease.get('tenant_name', ''))
                            rent_str = f"${rent:,.0f}" if isinstance(rent, (int, float)) else rent
                            content_parts.append(f"- Unit {unit_num}: {rent_str}/mo {tenant}")
                        else:
                            content_parts.append(f"- {lease}")
                    if len(extracted_data['leases']) > 10:
                        content_parts.append(f"... and {len(extracted_data['leases']) - 10} more leases")

                # Extraction metadata
                if 'extraction_metadata' in extracted_data:
                    meta = extracted_data['extraction_metadata']
                    if meta:
                        content_parts.append("\n## Extraction Summary")
                        if meta.get('total_units'):
                            content_parts.append(f"- Total Units: {meta['total_units']}")
                        if meta.get('occupied_units'):
                            content_parts.append(f"- Occupied Units: {meta['occupied_units']}")
                        if meta.get('vacancy_rate'):
                            content_parts.append(f"- Vacancy Rate: {meta['vacancy_rate']:.1%}")

                # Quality score
                if 'quality_score' in extracted_data:
                    content_parts.append(f"\n## Extraction Quality: {extracted_data['quality_score']:.0%}")

                # Validation warnings
                if 'validation_warnings' in extracted_data and extracted_data['validation_warnings']:
                    content_parts.append("\n## Warnings")
                    for w in extracted_data['validation_warnings'][:5]:
                        if isinstance(w, dict):
                            content_parts.append(f"- [{w.get('severity', 'info')}] {w.get('message', w)}")
                        else:
                            content_parts.append(f"- {w}")

            # Build structured content summary
            structured_content = "\n".join(content_parts)

            # Combine: structured summary first, then raw text
            if raw_text:
                content = f"{structured_content}\n\n## Full Document Text\n\n{raw_text}"
            else:
                content = structured_content

            truncated = len(content) > max_length

            return {
                'success': True,
                'doc_id': doc_id,
                'doc_name': doc_name,
                'doc_type': doc_type,
                'mime_type': mime_type,
                'content': content[:max_length] if truncated else content,
                'total_length': len(content),
                'truncated': truncated,
                'extraction_confidence': float(confidence) if confidence else None,
                'has_raw_text': raw_text is not None and len(raw_text) > 0
            }

    except Exception as e:
        logger.error(f"Error getting document content: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def get_document_assertions(
    project_id: int,
    doc_id: int = None,
    subject_type: str = None
) -> Dict[str, Any]:
    """
    Get structured assertions extracted from documents.

    Args:
        project_id: Project ID
        doc_id: Optional document ID to filter by
        subject_type: Optional filter by assertion type (e.g., 'unit_type', 'unit', 'lease')

    Returns:
        Dict with assertions list
    """
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT
                    a.assertion_id,
                    a.doc_id,
                    d.doc_name,
                    a.subject_type,
                    a.subject_ref,
                    a.metric_key,
                    a.value_num,
                    a.value_text,
                    a.units,
                    a.confidence,
                    a.source,
                    a.created_at
                FROM landscape.dms_assertion a
                JOIN landscape.core_doc d ON d.doc_id::text = a.doc_id
                WHERE a.project_id = %s
            """
            params = [project_id]

            if doc_id:
                query += " AND a.doc_id = %s"
                params.append(str(doc_id))

            if subject_type:
                query += " AND a.subject_type = %s"
                params.append(subject_type)

            query += " ORDER BY a.subject_type, a.metric_key LIMIT 100"

            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        assertions = []
        for row in rows:
            assertion_dict = dict(zip(columns, row))
            # Convert types for JSON
            if assertion_dict.get('created_at'):
                assertion_dict['created_at'] = assertion_dict['created_at'].isoformat()
            if assertion_dict.get('value_num'):
                assertion_dict['value_num'] = float(assertion_dict['value_num'])
            if assertion_dict.get('confidence'):
                assertion_dict['confidence'] = float(assertion_dict['confidence'])
            assertions.append(assertion_dict)

        # Group by subject_type for easier reading
        by_type = {}
        for a in assertions:
            t = a.get('subject_type', 'other')
            if t not in by_type:
                by_type[t] = []
            by_type[t].append(a)

        return {
            'success': True,
            'assertions': assertions,
            'by_type': by_type,
            'count': len(assertions)
        }

    except Exception as e:
        logger.error(f"Error getting document assertions: {e}")
        return {
            'success': False,
            'error': str(e),
            'assertions': [],
            'count': 0
        }


def get_field_schema(
    table_name: str = None,
    field_group: str = None,
    field_name: str = None
) -> Dict[str, Any]:
    """
    Get field metadata from the catalog.

    Args:
        table_name: Filter by table (e.g., tbl_project)
        field_group: Filter by group (e.g., Location, Financial)
        field_name: Search for field by name (partial match)

    Returns:
        Dict with field_count and list of field metadata
    """
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT
                    table_name,
                    field_name,
                    display_name,
                    description,
                    data_type,
                    is_editable,
                    is_calculated,
                    valid_values,
                    unit_of_measure,
                    field_group,
                    applies_to_types
                FROM landscape.tbl_field_catalog
                WHERE is_active = true
            """
            params = []

            if table_name:
                query += " AND table_name = %s"
                params.append(table_name)

            if field_group:
                query += " AND field_group ILIKE %s"
                params.append(f"%{field_group}%")

            if field_name:
                query += " AND (field_name ILIKE %s OR display_name ILIKE %s)"
                params.append(f"%{field_name}%")
                params.append(f"%{field_name}%")

            query += " ORDER BY table_name, display_order, field_name LIMIT 50"

            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        fields = []
        for row in rows:
            field_dict = dict(zip(columns, row))
            # Convert valid_values from JSON if present
            if field_dict.get('valid_values'):
                # Already parsed by psycopg2 for JSONB
                pass
            # Convert applies_to_types from array
            if field_dict.get('applies_to_types'):
                field_dict['applies_to_types'] = list(field_dict['applies_to_types'])
            fields.append(field_dict)

        return {
            'success': True,
            'field_count': len(fields),
            'fields': fields
        }

    except Exception as e:
        logger.error(f"Error getting field schema: {e}")
        return {
            'success': False,
            'error': str(e),
            'field_count': 0,
            'fields': []
        }


def _log_field_update_activity(
    project_id: int,
    table: str,
    field: str,
    old_value: Any,
    new_value: Any,
    reason: str
) -> None:
    """Log a field update to the activity feed."""
    try:
        from .models import ActivityItem

        # Format the title
        field_display = field.replace('_', ' ').title()

        # Determine status based on whether this is setting or changing
        if old_value is None:
            title = f"Set {field_display}"
            summary = f"Set {field_display} to {new_value}"
        else:
            title = f"Updated {field_display}"
            summary = f"Changed {field_display} from {old_value} to {new_value}"

        ActivityItem.objects.create(
            project_id=project_id,
            activity_type='update',
            title=title,
            summary=summary,
            status='complete',
            confidence='high',
            details={
                'table': table,
                'field': field,
                'old_value': str(old_value) if old_value is not None else None,
                'new_value': str(new_value) if new_value is not None else None,
                'reason': reason
            },
            highlight_fields=[field],
            source_type='landscaper_ai',
            source_id=f"tool_update_{table}_{field}"
        )
        logger.info(f"Logged activity for {table}.{field} update")

    except Exception as e:
        logger.error(f"Failed to log activity for field update: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Document Ingestion Tool
# ─────────────────────────────────────────────────────────────────────────────

def ingest_document(
    doc_id: int,
    project_id: int,
    overwrite_existing: bool = False,
    field_filter: List[str] = None
) -> Dict[str, Any]:
    """
    Extract data from a document and auto-populate project fields.

    Uses the OM_FIELD_MAPPING to identify which extracted values map to which
    database fields. Only populates fields that are currently empty (unless
    overwrite_existing=True).

    Args:
        doc_id: Document ID to extract from
        project_id: Project ID to populate
        overwrite_existing: If True, overwrite non-empty fields
        field_filter: Optional list of field names to limit ingestion

    Returns:
        Dict with updated_fields, skipped_fields, and any errors
    """
    import json
    import re

    updated_fields = []
    skipped_fields = []
    errors = []

    try:
        # First get the document content
        content_result = get_document_content(doc_id, project_id, max_length=100000)

        if not content_result.get('success'):
            return {
                'success': False,
                'error': content_result.get('error', 'Failed to get document content'),
                'updated_fields': [],
                'skipped_fields': []
            }

        doc_name = content_result.get('doc_name', f'Document {doc_id}')
        content = content_result.get('content', '')

        if not content:
            return {
                'success': False,
                'error': 'No content available for extraction',
                'updated_fields': [],
                'skipped_fields': []
            }

        # Extract key-value pairs from the content
        # Look for patterns like "Label: Value" or "Label = Value"
        extracted_pairs = _extract_key_value_pairs(content)

        logger.info(f"Extracted {len(extracted_pairs)} key-value pairs from document {doc_id}")

        # Map extracted pairs to database fields
        for label, value in extracted_pairs.items():
            mapping = normalize_om_label(label)
            if not mapping:
                continue

            table_name, field_name = mapping

            # Apply field filter if specified
            if field_filter and field_name not in field_filter:
                continue

            # Check if field is allowed for updates
            table_config = ALLOWED_UPDATES.get(table_name)
            if not table_config or field_name not in table_config.get('fields', []):
                skipped_fields.append({
                    'field': field_name,
                    'reason': 'Not in allowed update list',
                    'value': str(value)[:100]
                })
                continue

            # Get current value
            current_value = get_current_value(table_name, field_name, project_id)

            # Skip if already populated and not overwriting
            if current_value is not None and not overwrite_existing:
                skipped_fields.append({
                    'field': field_name,
                    'reason': 'Already populated',
                    'current': str(current_value)[:100],
                    'extracted': str(value)[:100]
                })
                continue

            # Parse the value to appropriate type
            parsed_value = parse_om_value(value, field_name)
            if parsed_value is None:
                continue

            # Update the field
            update_result = update_single_field(
                table=table_name,
                field=field_name,
                value=str(parsed_value),
                reason=f"Extracted from {doc_name}",
                project_id=project_id
            )

            if update_result.get('success'):
                updated_fields.append({
                    'table': table_name,
                    'field': field_name,
                    'old_value': update_result.get('old_value'),
                    'new_value': update_result.get('new_value'),
                    'source_label': label
                })
            else:
                errors.append({
                    'field': field_name,
                    'error': update_result.get('error', 'Unknown error'),
                    'value': str(parsed_value)[:100]
                })

        # Log activity for the ingestion
        if updated_fields:
            _log_ingestion_activity(
                project_id=project_id,
                doc_id=doc_id,
                doc_name=doc_name,
                updated_fields=updated_fields
            )

        return {
            'success': True,
            'doc_id': doc_id,
            'doc_name': doc_name,
            'updated_fields': updated_fields,
            'skipped_fields': skipped_fields,
            'errors': errors,
            'summary': {
                'updated': len(updated_fields),
                'skipped': len(skipped_fields),
                'errors': len(errors)
            }
        }

    except Exception as e:
        logger.error(f"Error ingesting document {doc_id}: {e}")
        return {
            'success': False,
            'error': str(e),
            'updated_fields': updated_fields,
            'skipped_fields': skipped_fields,
            'errors': errors
        }


def _extract_key_value_pairs(content: str) -> Dict[str, str]:
    """
    Extract key-value pairs from document content.

    Looks for patterns like:
    - "Label: Value"
    - "Label = Value"
    - "Label | Value"
    - Table-style patterns

    Returns dict mapping labels to values.
    """
    pairs = {}

    # Split into lines
    lines = content.split('\n')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Skip headers and markdown formatting
        if line.startswith('#') or line.startswith('---'):
            continue

        # Pattern 1: "Label: Value" or "Label : Value"
        match = re.match(r'^([A-Za-z][A-Za-z0-9\s/\-&]+?)\s*:\s*(.+)$', line)
        if match:
            label, value = match.groups()
            if len(label) < 50 and len(value.strip()) > 0:
                pairs[label.strip()] = value.strip()
            continue

        # Pattern 2: "Label = Value"
        match = re.match(r'^([A-Za-z][A-Za-z0-9\s/\-&]+?)\s*=\s*(.+)$', line)
        if match:
            label, value = match.groups()
            if len(label) < 50 and len(value.strip()) > 0:
                pairs[label.strip()] = value.strip()
            continue

        # Pattern 3: "Label | Value" (table format)
        match = re.match(r'^([A-Za-z][A-Za-z0-9\s/\-&]+?)\s*\|\s*(.+)$', line)
        if match:
            label, value = match.groups()
            if len(label) < 50 and len(value.strip()) > 0:
                pairs[label.strip()] = value.strip()

    return pairs


def _log_ingestion_activity(
    project_id: int,
    doc_id: int,
    doc_name: str,
    updated_fields: List[Dict]
) -> None:
    """Log document ingestion to the activity feed."""
    try:
        from .models import ActivityItem

        field_names = [f['field'] for f in updated_fields]
        field_list = ', '.join(field_names[:5])
        if len(field_names) > 5:
            field_list += f" and {len(field_names) - 5} more"

        ActivityItem.objects.create(
            project_id=project_id,
            activity_type='extraction',
            title=f"Ingested data from {doc_name}",
            summary=f"Populated {len(updated_fields)} fields: {field_list}",
            status='complete',
            confidence='high',
            details={
                'doc_id': doc_id,
                'doc_name': doc_name,
                'updated_fields': updated_fields
            },
            highlight_fields=field_names,
            source_type='landscaper_ai',
            source_id=f"ingest_{doc_id}"
        )
        logger.info(f"Logged ingestion activity for document {doc_id}")

    except Exception as e:
        logger.error(f"Failed to log ingestion activity: {e}")


# Convenience wrapper for use in ai_handler
def create_tool_executor(project_id: int):
    """Create a tool executor function bound to a specific project."""
    def executor(tool_name: str, tool_input: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        # Use project_id from kwargs if provided, otherwise use bound value
        pid = kwargs.get('project_id', project_id)
        return execute_tool(tool_name, tool_input, pid)
    return executor


# ─────────────────────────────────────────────────────────────────────────────
# Extraction Mapping System Integration
# ─────────────────────────────────────────────────────────────────────────────

def get_extraction_mappings(
    document_type: str,
    include_inactive: bool = False
) -> List[Dict[str, Any]]:
    """
    Get active extraction mappings for a document type.

    Args:
        document_type: Document type code (e.g., 'OM', 'RENT_ROLL', 'T12')
        include_inactive: Include inactive mappings if True

    Returns:
        List of mapping dictionaries with pattern, target, transform info
    """
    try:
        from .models import ExtractionMapping

        queryset = ExtractionMapping.objects.filter(document_type=document_type)
        if not include_inactive:
            queryset = queryset.filter(is_active=True)

        mappings = []
        for m in queryset:
            mappings.append({
                'mapping_id': m.mapping_id,
                'source_pattern': m.source_pattern,
                'source_aliases': m.source_aliases or [],
                'target_table': m.target_table,
                'target_field': m.target_field,
                'data_type': m.data_type,
                'transform_rule': m.transform_rule,
                'confidence': m.confidence,
                'auto_write': m.auto_write,
                'overwrite_existing': m.overwrite_existing,
            })

        logger.info(f"Loaded {len(mappings)} extraction mappings for {document_type}")
        return mappings

    except Exception as e:
        logger.error(f"Error loading extraction mappings: {e}")
        return []


def transform_extracted_value(
    value: str,
    transform_rule: Optional[str],
    data_type: str
) -> Any:
    """
    Apply transformation rules to an extracted value.

    Transform rules:
    - strip_currency: Remove $, commas, convert to numeric
    - percent_to_decimal: Convert "5%" or "5" to 0.05
    - parse_date: Parse various date formats to date object
    - extract_number: Extract numeric value from text
    - none/None: Type cast only

    Args:
        value: Raw extracted value
        transform_rule: Transformation to apply
        data_type: Target data type (text, integer, decimal, boolean, date)

    Returns:
        Transformed value or original if transformation fails
    """
    import re
    from datetime import datetime

    if value is None or value == '':
        return None

    # Clean string
    cleaned = str(value).strip()

    # Apply transformation
    if transform_rule == 'strip_currency':
        # Remove currency symbols, commas, spaces
        cleaned = re.sub(r'[$,\s]', '', cleaned)
        # Handle parentheses as negative
        if cleaned.startswith('(') and cleaned.endswith(')'):
            cleaned = '-' + cleaned[1:-1]
        try:
            return Decimal(cleaned)
        except (ValueError, InvalidOperation):
            logger.warning(f"Could not strip currency from '{value}'")
            return value

    elif transform_rule == 'percent_to_decimal':
        # Remove % sign
        cleaned = cleaned.replace('%', '').strip()
        try:
            num = Decimal(cleaned)
            # If value > 1, assume it's a percentage and divide by 100
            if num > 1:
                return num / 100
            return num
        except (ValueError, InvalidOperation):
            logger.warning(f"Could not convert percent '{value}'")
            return value

    elif transform_rule == 'parse_date':
        # Try common date formats
        date_formats = [
            '%Y-%m-%d',
            '%m/%d/%Y',
            '%m-%d-%Y',
            '%d/%m/%Y',
            '%B %d, %Y',
            '%b %d, %Y',
            '%m/%d/%y',
        ]
        for fmt in date_formats:
            try:
                return datetime.strptime(cleaned, fmt).date()
            except ValueError:
                continue
        logger.warning(f"Could not parse date '{value}'")
        return value

    elif transform_rule == 'extract_number':
        # Extract first numeric value from text
        match = re.search(r'[\d,]+\.?\d*', cleaned)
        if match:
            num_str = match.group().replace(',', '')
            try:
                return Decimal(num_str)
            except (ValueError, InvalidOperation):
                pass
        logger.warning(f"Could not extract number from '{value}'")
        return value

    # No transform rule - apply type casting
    try:
        if data_type == 'integer':
            return int(float(cleaned.replace(',', '')))
        elif data_type == 'decimal':
            return Decimal(cleaned.replace(',', ''))
        elif data_type == 'boolean':
            return cleaned.lower() in ('true', '1', 'yes', 'y')
        elif data_type == 'date':
            # Try ISO format
            return datetime.fromisoformat(cleaned).date()
        else:
            return cleaned
    except (ValueError, InvalidOperation) as e:
        logger.warning(f"Could not cast '{value}' to {data_type}: {e}")
        return value


def log_extraction(
    mapping_id: Optional[int],
    project_id: int,
    doc_id: Optional[int],
    source_pattern_matched: str,
    extracted_value: str,
    transformed_value: Any,
    previous_value: Any,
    confidence_score: float,
    was_written: bool,
    extraction_context: str = None
) -> Optional[int]:
    """
    Log an extraction attempt to the extraction log table.

    Args:
        mapping_id: ID of the mapping used
        project_id: Project being updated
        doc_id: Document extracted from
        source_pattern_matched: Actual pattern that matched
        extracted_value: Raw extracted value
        transformed_value: Value after transformation
        previous_value: Previous value in database
        confidence_score: Confidence score (0-1)
        was_written: Whether the value was written to database
        extraction_context: Optional surrounding text

    Returns:
        log_id if successful, None otherwise
    """
    try:
        from .models import ExtractionLog

        log_entry = ExtractionLog.objects.create(
            mapping_id=mapping_id,
            project_id=project_id,
            doc_id=doc_id,
            source_pattern_matched=source_pattern_matched,
            extracted_value=str(extracted_value) if extracted_value else None,
            transformed_value=str(transformed_value) if transformed_value else None,
            previous_value=str(previous_value) if previous_value is not None else None,
            confidence_score=Decimal(str(confidence_score)) if confidence_score else None,
            was_written=was_written,
            extraction_context=extraction_context[:500] if extraction_context else None,
        )

        logger.info(f"Logged extraction: {source_pattern_matched} -> {transformed_value}")
        return log_entry.log_id

    except Exception as e:
        logger.error(f"Error logging extraction: {e}")
        return None


def extract_with_mappings(
    document_type: str,
    content: str,
    project_id: int,
    doc_id: int = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Extract and populate fields using configured mappings.

    This uses the extraction mapping system instead of hardcoded OM_FIELD_MAPPING.

    Args:
        document_type: Document type code
        content: Document content to extract from
        project_id: Project to update
        doc_id: Source document ID
        dry_run: If True, only extract but don't write to database

    Returns:
        Dict with extracted values, written fields, skipped fields, etc.
    """
    import re

    # Get active mappings for this document type
    mappings = get_extraction_mappings(document_type)

    if not mappings:
        return {
            'success': False,
            'error': f'No active mappings found for document type: {document_type}',
            'extracted': [],
            'written': [],
            'skipped': []
        }

    extracted = []
    written = []
    skipped = []
    errors = []

    # Extract key-value pairs from content
    content_pairs = _extract_key_value_pairs(content)
    content_lower = {k.lower(): v for k, v in content_pairs.items()}

    for mapping in mappings:
        pattern = mapping['source_pattern'].lower()
        aliases = [a.lower() for a in mapping.get('source_aliases', [])]

        # Check if pattern or any alias matches
        matched_value = None
        matched_pattern = None

        if pattern in content_lower:
            matched_value = content_lower[pattern]
            matched_pattern = pattern
        else:
            for alias in aliases:
                if alias in content_lower:
                    matched_value = content_lower[alias]
                    matched_pattern = alias
                    break

        if matched_value is None:
            continue

        # Transform the value
        transformed = transform_extracted_value(
            matched_value,
            mapping['transform_rule'],
            mapping['data_type']
        )

        extracted.append({
            'mapping_id': mapping['mapping_id'],
            'pattern': matched_pattern,
            'target': f"{mapping['target_table']}.{mapping['target_field']}",
            'extracted_value': matched_value,
            'transformed_value': str(transformed) if transformed else None,
            'confidence': mapping['confidence'],
        })

        # Skip write if dry run
        if dry_run:
            skipped.append({
                'field': mapping['target_field'],
                'reason': 'Dry run mode',
                'value': str(transformed)[:100] if transformed else None
            })
            continue

        # Skip if auto_write is disabled
        if not mapping['auto_write']:
            skipped.append({
                'field': mapping['target_field'],
                'reason': 'Auto-write disabled',
                'value': str(transformed)[:100] if transformed else None
            })
            continue

        # Get current value
        current_value = get_current_value(
            mapping['target_table'],
            mapping['target_field'],
            project_id
        )

        # Skip if already populated and overwrite not enabled
        if current_value is not None and not mapping['overwrite_existing']:
            # Log the extraction attempt anyway
            log_extraction(
                mapping_id=mapping['mapping_id'],
                project_id=project_id,
                doc_id=doc_id,
                source_pattern_matched=matched_pattern,
                extracted_value=matched_value,
                transformed_value=transformed,
                previous_value=current_value,
                confidence_score=0.8 if mapping['confidence'] == 'High' else (0.6 if mapping['confidence'] == 'Medium' else 0.4),
                was_written=False,
                extraction_context=None
            )

            skipped.append({
                'field': mapping['target_field'],
                'reason': 'Already populated',
                'current': str(current_value)[:100],
                'extracted': str(transformed)[:100] if transformed else None
            })
            continue

        # Write the value
        update_result = update_single_field(
            table=mapping['target_table'],
            field=mapping['target_field'],
            value=str(transformed) if transformed else '',
            reason=f"Extracted from document (mapping: {mapping['source_pattern']})",
            project_id=project_id
        )

        # Log the extraction
        log_extraction(
            mapping_id=mapping['mapping_id'],
            project_id=project_id,
            doc_id=doc_id,
            source_pattern_matched=matched_pattern,
            extracted_value=matched_value,
            transformed_value=transformed,
            previous_value=current_value,
            confidence_score=0.8 if mapping['confidence'] == 'High' else (0.6 if mapping['confidence'] == 'Medium' else 0.4),
            was_written=update_result.get('success', False),
            extraction_context=None
        )

        if update_result.get('success'):
            written.append({
                'table': mapping['target_table'],
                'field': mapping['target_field'],
                'old_value': update_result.get('old_value'),
                'new_value': update_result.get('new_value'),
                'source_pattern': matched_pattern
            })
        else:
            errors.append({
                'field': mapping['target_field'],
                'error': update_result.get('error', 'Unknown error'),
                'value': str(transformed)[:100] if transformed else None
            })

    return {
        'success': True,
        'document_type': document_type,
        'extracted': extracted,
        'written': written,
        'skipped': skipped,
        'errors': errors,
        'summary': {
            'total_mappings': len(mappings),
            'extracted': len(extracted),
            'written': len(written),
            'skipped': len(skipped),
            'errors': len(errors)
        }
    }
