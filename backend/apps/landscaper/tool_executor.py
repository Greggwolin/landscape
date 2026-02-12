"""
Landscaper Tool Executor

Executes tool calls from Claude AI to update project fields in the database.
All changes are logged to the activity feed.

Architecture:
- Tools are registered via @register_tool decorator
- TOOL_REGISTRY maps tool names to handler functions
- execute_tool() dispatches to registered handlers
"""

import ast
import json
import logging
import math
import operator
import os
from contextlib import contextmanager
from functools import wraps
from typing import Dict, Any, List, Optional, Callable
from decimal import Decimal, InvalidOperation
from urllib import request as urllib_request
from urllib.error import HTTPError, URLError
from django.db import connection, transaction
from django.utils import timezone
from psycopg2.extras import RealDictCursor
from .opex_mapping import OPEX_ACCOUNT_MAPPING

logger = logging.getLogger(__name__)


@contextmanager
def get_db_connection():
    """
    Return a DB-API connection that supports psycopg cursor factories.

    Uses Django's managed connection to avoid duplicating credentials/config.
    """
    connection.ensure_connection()
    yield connection.connection


# ─────────────────────────────────────────────────────────────────────────────
# Tool Registry Pattern
# ─────────────────────────────────────────────────────────────────────────────

TOOL_REGISTRY: Dict[str, Callable] = {}


def register_tool(name: str, is_mutation: bool = False):
    """
    Decorator to register a tool handler function.

    Args:
        name: The tool name (must match LANDSCAPER_TOOLS in ai_handler.py)
        is_mutation: If True, tool modifies data and supports propose_only mode

    Usage:
        @register_tool('get_project_documents')
        def handle_get_project_documents(tool_input, project_id, **kwargs):
            return {'success': True, 'documents': [...]}

        @register_tool('update_project_field', is_mutation=True)
        def handle_update_project_field(tool_input, project_id, propose_only=True, **kwargs):
            if propose_only:
                return create_proposal(...)
            return execute_update(...)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        # Store metadata on the function
        wrapper._tool_name = name
        wrapper._is_mutation = is_mutation

        # Register the tool
        TOOL_REGISTRY[name] = wrapper
        logger.debug(f"Registered tool: {name} (mutation={is_mutation})")

        return wrapper
    return decorator


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
    notes: str = None,
    unit_amount: Optional[float] = None,
    amount_per_sf: Optional[float] = None
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
    try:
        from apps.knowledge.services.opex_utils import upsert_opex_entry

        selector = {
            'expense_type': expense_type,
            'escalation_rate': escalation_rate,
            'is_recoverable': is_recoverable,
        }
        if notes:
            selector['notes'] = notes
        if unit_amount is not None:
            selector['unit_amount'] = unit_amount
        if amount_per_sf is not None:
            selector['amount_per_sf'] = amount_per_sf

        result = upsert_opex_entry(connection, project_id, expense_label, annual_amount, selector)
        if result.get('success'):
            return {
                'success': True,
                'action': result.get('action', 'updated'),
                'opex_id': result.get('opex_id'),
                'expense_label': expense_label,
                'amount': annual_amount
            }

        return {
            'success': False,
            'error': result.get('error', 'Unknown error'),
            'expense_label': expense_label
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

def calculate_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.

    Args:
        lat1, lon1: Subject property coordinates
        lat2, lon2: Comparable property coordinates

    Returns:
        Distance in miles
    """
    import math

    # Earth's radius in miles
    R = 3959.0

    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    # Haversine formula
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def get_subject_coordinates(project_id: int) -> Optional[tuple]:
    """
    Get the subject property's coordinates for distance calculation.

    Returns:
        Tuple of (lat, lon) or None if not available
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT location_lat, location_lon
                FROM landscape.tbl_project
                WHERE project_id = %s
            """, [project_id])
            row = cursor.fetchone()

            if row and row[0] and row[1]:
                return (float(row[0]), float(row[1]))
            return None
    except Exception as e:
        logger.warning(f"Could not get subject coordinates: {e}")
        return None


def geocode_address(address: str) -> Optional[tuple]:
    """
    Geocode an address to get lat/lon coordinates.
    Uses OpenStreetMap Nominatim API (free, no API key required).

    Args:
        address: Street address to geocode

    Returns:
        Tuple of (lat, lon) or None if geocoding fails
    """
    import urllib.request
    import urllib.parse
    import json
    import time

    if not address:
        return None

    try:
        # Clean and encode the address
        clean_address = address.strip()
        encoded_address = urllib.parse.quote(clean_address)

        # OpenStreetMap Nominatim API
        url = f"https://nominatim.openstreetmap.org/search?q={encoded_address}&format=json&limit=1"

        # Add headers (required by Nominatim)
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Landscape/1.0 (Real Estate Analytics)'}
        )

        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())

        if data and len(data) > 0:
            lat = float(data[0]['lat'])
            lon = float(data[0]['lon'])
            logger.info(f"Geocoded '{address}' to ({lat}, {lon})")
            return (lat, lon)

        logger.warning(f"No geocoding results for '{address}'")
        return None

    except Exception as e:
        logger.warning(f"Geocoding failed for '{address}': {e}")
        return None


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

    Auto-calculates distance if address is provided but distance is not:
    1. Gets subject property coordinates from tbl_project
    2. Geocodes comp address using OpenStreetMap Nominatim
    3. Calculates distance using Haversine formula

    Args:
        project_id: Project to add comp to
        property_name: Name of comparable property
        unit_type: Unit type descriptor (e.g., "1BR/1BA")
        bedrooms: Number of bedrooms
        bathrooms: Number of bathrooms
        avg_sqft: Average square footage
        asking_rent: Monthly asking rent
        address: Optional street address (used for geocoding if lat/lon not provided)
        latitude: Optional latitude
        longitude: Optional longitude
        distance_miles: Optional distance from subject (auto-calculated if not provided)
        year_built: Optional year built
        total_units: Optional total unit count
        effective_rent: Optional effective rent
        notes: Optional notes
        data_source: Optional data source

    Returns:
        Dict with success status and created/updated record info
    """
    from datetime import date as date_type
    import time

    try:
        # Auto-calculate distance if address provided but distance not
        if address and distance_miles is None:
            # Get subject property coordinates
            subject_coords = get_subject_coordinates(project_id)

            if subject_coords:
                # If comp has lat/lon, use them directly
                if latitude and longitude:
                    distance_miles = calculate_distance_miles(
                        subject_coords[0], subject_coords[1],
                        latitude, longitude
                    )
                    distance_miles = round(distance_miles, 2)
                    logger.info(f"Calculated distance for {property_name}: {distance_miles} miles")
                else:
                    # Geocode the comp address
                    comp_coords = geocode_address(address)
                    if comp_coords:
                        latitude = comp_coords[0]
                        longitude = comp_coords[1]
                        distance_miles = calculate_distance_miles(
                            subject_coords[0], subject_coords[1],
                            latitude, longitude
                        )
                        distance_miles = round(distance_miles, 2)
                        logger.info(f"Geocoded and calculated distance for {property_name}: {distance_miles} miles")
                        # Rate limit to respect Nominatim's 1 req/sec policy
                        time.sleep(1.1)
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
    if not expenses:
        return {
            'success': False,
            'created': 0,
            'updated': 0,
            'errors': 0,
            'results': [],
            'summary': 'No operating expenses provided'
        }

    results = []
    created_count = 0
    updated_count = 0
    error_count = 0

    logger.info(
        "[bulk_upsert_operating_expenses] start project_id=%s source_document=%s expenses=%s",
        project_id,
        source_document,
        len(expenses)
    )

    for expense in expenses:
        label = expense.get('label', expense.get('expense_label', ''))
        amount = expense.get('annual_amount', expense.get('amount', 0))
        unit_amount = expense.get('unit_amount', expense.get('per_unit'))
        amount_per_sf = expense.get('amount_per_sf', expense.get('per_sf'))

        if not label or not amount:
            results.append({
                'success': False,
                'error': 'Missing label or amount',
                'expense': expense
            })
            error_count += 1
            continue

        try:
            result = upsert_operating_expense(
                project_id=project_id,
                expense_label=label,
                annual_amount=float(amount),
                expense_type=expense.get('expense_type'),
                escalation_rate=float(expense.get('escalation_rate', 0.03)),
                is_recoverable=expense.get('is_recoverable', False),
                notes=expense.get('notes'),
                unit_amount=unit_amount,
                amount_per_sf=amount_per_sf
            )
        except Exception as e:
            result = {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__,
                'failed_item': expense
            }

        results.append(result)

        if not result.get('success'):
            logger.warning(
                "[bulk_upsert_operating_expenses] failed project_id=%s label=%s error=%s",
                project_id,
                label,
                result.get('error')
            )

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

    summary = {
        'success': error_count == 0 and (created_count + updated_count) > 0,
        'created': created_count,
        'updated': updated_count,
        'errors': error_count,
        'results': results,
        'summary': f"Created {created_count}, updated {updated_count}, errors {error_count}"
    }
    logger.info(
        "[bulk_upsert_operating_expenses] done project_id=%s created=%s updated=%s errors=%s success=%s",
        project_id,
        created_count,
        updated_count,
        error_count,
        summary.get('success')
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO landscape.ai_debug_log (log_type, payload, created_at)
                VALUES (%s, %s::jsonb, NOW())
                """,
                ["OPEX_TOOL_RESULT", json.dumps(summary)]
            )
    except Exception as e:
        err_msg = str(e)
        if "ai_debug_log" in err_msg and "does not exist" in err_msg:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        CREATE TABLE IF NOT EXISTS landscape.ai_debug_log (
                            id SERIAL PRIMARY KEY,
                            log_type VARCHAR(50),
                            payload JSONB,
                            created_at TIMESTAMP DEFAULT NOW()
                        )
                        """
                    )
                    cursor.execute(
                        """
                        INSERT INTO landscape.ai_debug_log (log_type, payload, created_at)
                        VALUES (%s, %s::jsonb, NOW())
                        """,
                        ["OPEX_TOOL_RESULT", json.dumps(summary)]
                    )
            except Exception as create_err:
                logger.error("Failed to create/write ai_debug_log: %s", create_err)
        else:
            logger.error("Failed to write OPEX_TOOL_RESULT debug log: %s", e)
    return summary


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


# ─────────────────────────────────────────────────────────────────────────────
# Registered Tool Handlers
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('update_project_field', is_mutation=True)
def handle_update_project_field(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Update a single project field."""
    from .services.mutation_service import MutationService

    table = tool_input.get('table', '')
    field = tool_input.get('field', '')
    value = tool_input.get('value', '')
    reason = tool_input.get('reason', '')

    # Resolve field aliases
    table_config = ALLOWED_UPDATES.get(table)
    if table_config:
        field_aliases = table_config.get('field_aliases', {})
        actual_field = field_aliases.get(field, field)
    else:
        actual_field = field

    if propose_only:
        current = get_current_value(table, actual_field, project_id)
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='field_update',
            table_name=table,
            field_name=actual_field,
            proposed_value=value,
            current_value=current,
            reason=reason,
            source_message_id=source_message_id,
        )
    else:
        result = update_single_field(
            table=table,
            field=field,
            value=value,
            reason=reason,
            project_id=project_id
        )
        if result.get('success'):
            result['updates'] = [result.copy()]
        return result


@register_tool('bulk_update_fields', is_mutation=True)
def handle_bulk_update_fields(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Update multiple fields at once."""
    from .services.mutation_service import MutationService

    updates_input = tool_input.get('updates', [])

    if propose_only:
        proposals = []
        for update in updates_input:
            table = update.get('table', '')
            field = update.get('field', '')

            table_config = ALLOWED_UPDATES.get(table)
            if table_config:
                field_aliases = table_config.get('field_aliases', {})
                actual_field = field_aliases.get(field, field)
            else:
                actual_field = field

            current = get_current_value(table, actual_field, project_id)
            proposals.append({
                'mutation_type': 'field_update',
                'table_name': table,
                'field_name': actual_field,
                'proposed_value': update.get('value', ''),
                'current_value': current,
                'reason': update.get('reason', ''),
            })

        return MutationService.create_batch_proposals(
            project_id=project_id,
            proposals=proposals,
            source_message_id=source_message_id,
        )
    else:
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


@register_tool('update_operating_expenses', is_mutation=True)
def handle_update_operating_expenses(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update operating expenses."""
    from .services.mutation_service import MutationService

    expenses = tool_input.get('expenses', [])
    source_doc = tool_input.get('source_document')

    logger.info(
        "[update_operating_expenses] invoked project_id=%s propose_only=%s source_doc=%s expenses=%s",
        project_id,
        propose_only,
        source_doc,
        len(expenses)
    )

    if propose_only:
        proposals = []
        for expense in expenses:
            proposals.append({
                'mutation_type': 'opex_upsert',
                'table_name': 'tbl_operating_expenses',
                'field_name': None,
                'proposed_value': {
                    'expense_category': expense.get('label', expense.get('expense_category', '')),
                    'annual_amount': expense.get('annual_amount', 0),
                    'expense_type': expense.get('expense_type', 'OTHER'),
                    'escalation_rate': expense.get('escalation_rate', 0.03),
                    'is_recoverable': expense.get('is_recoverable', False),
                    'source_document': source_doc,
                },
                'current_value': None,
                'reason': f"Add/update operating expense: {expense.get('label', expense.get('expense_category', 'Unknown'))}",
            })

        return MutationService.create_batch_proposals(
            project_id=project_id,
            proposals=proposals,
            source_message_id=source_message_id,
            source_documents=[source_doc] if source_doc else None,
        )
    else:
        result = bulk_upsert_operating_expenses(
            project_id=project_id,
            expenses=expenses,
            source_document=source_doc
        )
        logger.info(
            "[update_operating_expenses] completed project_id=%s created=%s updated=%s errors=%s success=%s",
            project_id,
            result.get('created'),
            result.get('updated'),
            result.get('errors'),
            result.get('success')
        )
        return result


@register_tool('update_rental_comps', is_mutation=True)
def handle_update_rental_comps(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update rental comparables."""
    from .services.mutation_service import MutationService

    comps = tool_input.get('comps', [])
    source_doc = tool_input.get('source_document')

    if propose_only:
        proposals = []
        for comp in comps:
            proposals.append({
                'mutation_type': 'rental_comp_upsert',
                'table_name': 'tbl_rental_comparable',
                'field_name': None,
                'proposed_value': {**comp, 'source_document': source_doc},
                'current_value': None,
                'reason': f"Add rental comp: {comp.get('property_name', 'Unknown')} - {comp.get('unit_type', '')}",
            })

        return MutationService.create_batch_proposals(
            project_id=project_id,
            proposals=proposals,
            source_message_id=source_message_id,
            source_documents=[source_doc] if source_doc else None,
        )
    else:
        return bulk_upsert_rental_comps(
            project_id=project_id,
            comps=comps,
            source_document=source_doc
        )


@register_tool('update_project_contacts', is_mutation=True)
def handle_update_project_contacts(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update project contacts."""
    contacts = tool_input.get('contacts', [])
    if not contacts:
        return {'success': False, 'error': 'contacts list is required'}

    # Note: Contacts don't currently support propose_only mode
    # Could be added in future if needed
    return update_project_contacts(
        project_id=project_id,
        contacts=contacts,
        source_document=tool_input.get('source_document')
    )


@register_tool('get_project_fields')
def handle_get_project_fields(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Retrieve current values of specific project fields."""
    fields_input = tool_input.get('fields', [])
    values = {}

    for field_spec in fields_input:
        table = field_spec.get('table', '')
        field = field_spec.get('field', '')
        key = f"{table}.{field}"

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


@register_tool('get_field_schema')
def handle_get_field_schema(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get metadata about available fields."""
    return get_field_schema(
        table_name=tool_input.get('table_name'),
        field_group=tool_input.get('field_group'),
        field_name=tool_input.get('field_name')
    )


@register_tool('get_project_documents')
def handle_get_project_documents(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """List all documents uploaded to a project."""
    return get_project_documents(
        project_id=project_id,
        status_filter=tool_input.get('status_filter', 'all')
    )


@register_tool('get_document_content')
def handle_get_document_content(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get the full text content from a document."""
    doc_id = tool_input.get('doc_id')
    doc_type = tool_input.get('doc_type') or tool_input.get('document_type')
    doc_name = tool_input.get('doc_name') or tool_input.get('document_name')
    if not doc_id and not doc_type and not doc_name:
        return {'success': False, 'error': 'doc_id, doc_type, or doc_name is required'}
    return get_document_content(
        doc_id=doc_id,
        project_id=project_id,
        max_length=tool_input.get('max_length', 50000),
        focus=tool_input.get('focus'),
        doc_type=doc_type,
        doc_name=doc_name
    )


@register_tool('get_document_assertions')
def handle_get_document_assertions(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get structured data assertions extracted from documents."""
    return get_document_assertions(
        project_id=project_id,
        doc_id=tool_input.get('doc_id'),
        subject_type=tool_input.get('subject_type')
    )


@register_tool('ingest_document')
def handle_ingest_document(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Auto-populate project fields from a document."""
    doc_id = tool_input.get('doc_id')
    if not doc_id:
        return {'success': False, 'error': 'doc_id is required'}
    return ingest_document(
        doc_id=doc_id,
        project_id=project_id,
        overwrite_existing=tool_input.get('overwrite_existing', False),
        field_filter=tool_input.get('field_filter')
    )


@register_tool('get_document_media_summary')
def handle_get_document_media_summary(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get a summary of images and visual assets detected in a document."""
    doc_id = tool_input.get('doc_id')
    if not doc_id:
        return {'success': False, 'error': 'doc_id is required'}
    return get_document_media_summary(doc_id=doc_id, project_id=project_id)


def get_document_media_summary(doc_id: int, project_id: int) -> Dict[str, Any]:
    """
    Returns media scan summary for a document: counts by type, by action,
    and a formatted human-readable breakdown for Landscaper to reference.
    """
    from django.db import connection

    with connection.cursor() as c:
        c.execute("""
            SELECT d.doc_id, d.doc_name, d.media_scan_status, d.media_scan_json,
                   d.project_id
            FROM landscape.core_doc d
            WHERE d.doc_id = %s AND d.deleted_at IS NULL
        """, [doc_id])
        row = c.fetchone()

    if not row:
        return {'success': False, 'error': f'Document {doc_id} not found'}

    # Verify doc belongs to this project
    doc_project_id = row[4]
    if doc_project_id and doc_project_id != project_id:
        return {'success': False, 'error': 'Document does not belong to this project'}

    doc_name = row[1]
    scan_status = row[2]
    scan_json = row[3] if isinstance(row[3], dict) else (
        json.loads(row[3]) if row[3] else {}
    )

    if scan_status in (None, 'unscanned', 'not_applicable'):
        return {
            'success': True,
            'doc_id': doc_id,
            'doc_name': doc_name,
            'media_scan_status': scan_status or 'unscanned',
            'total_detected': 0,
            'message': 'No media scan has been performed on this document.',
        }

    # Get classified media counts
    with connection.cursor() as c:
        c.execute("""
            SELECT
                lc.classification_code,
                lc.classification_name,
                lc.badge_color,
                lc.content_intent,
                lc.default_action,
                COUNT(*) as cnt
            FROM landscape.core_doc_media m
            LEFT JOIN landscape.lu_media_classification lc
                ON m.classification_id = lc.classification_id
            WHERE m.doc_id = %s AND m.deleted_at IS NULL
            GROUP BY lc.classification_code, lc.classification_name,
                     lc.badge_color, lc.content_intent, lc.default_action
            ORDER BY cnt DESC
        """, [doc_id])
        type_rows = c.fetchall()

    total_detected = scan_json.get('total_detected', 0)
    total_extracted = scan_json.get('total_extracted', 0)

    # Build by_type summary
    by_type = {}
    type_descriptions = []
    for code, name, color, intent, action, cnt in type_rows:
        code = code or 'unclassified'
        name = name or 'Unclassified'
        by_type[code] = {
            'name': name,
            'count': cnt,
            'badge_color': color or 'secondary',
            'content_intent': intent,
            'default_action': action,
        }
        type_descriptions.append(f"{cnt} {name.lower()}{'s' if cnt != 1 else ''}")

    # Build human-readable summary
    if type_descriptions:
        human_summary = (
            f"Found {total_detected} images in \"{doc_name}\": "
            + ", ".join(type_descriptions) + "."
        )
    else:
        human_summary = f"Found {total_detected} images in \"{doc_name}\" (not yet classified)."

    return {
        'success': True,
        'doc_id': doc_id,
        'doc_name': doc_name,
        'media_scan_status': scan_status,
        'total_detected': total_detected,
        'total_extracted': total_extracted,
        'by_type': by_type,
        'human_summary': human_summary,
        'review_url': f'/api/dms/documents/{doc_id}/media/',
    }


# ─────────────────────────────────────────────────────────────────────────────
# Financial Assumptions Tool Handlers
# ─────────────────────────────────────────────────────────────────────────────

# Column lists for each assumption table (excluding id, project_id, timestamps)
ACQUISITION_COLUMNS = [
    'purchase_price', 'acquisition_date', 'hold_period_years', 'exit_cap_rate',
    'sale_date', 'closing_costs_pct', 'due_diligence_days', 'earnest_money',
    'sale_costs_pct', 'broker_commission_pct', 'price_per_unit', 'price_per_sf',
    'legal_fees', 'financing_fees', 'third_party_reports', 'depreciation_basis',
    'land_pct', 'improvement_pct', 'is_1031_exchange', 'grm'
]

REVENUE_RENT_COLUMNS = [
    'current_rent_psf', 'occupancy_pct', 'annual_rent_growth_pct',
    'in_place_rent_psf', 'market_rent_psf', 'rent_loss_to_lease_pct',
    'lease_up_months', 'stabilized_occupancy_pct', 'rent_growth_years_1_3_pct',
    'rent_growth_stabilized_pct', 'free_rent_months', 'ti_allowance_per_unit',
    'renewal_probability_pct'
]

REVENUE_OTHER_COLUMNS = [
    'other_income_per_unit_monthly', 'parking_income_per_space', 'parking_spaces',
    'pet_fee_per_pet', 'pet_penetration_pct', 'laundry_income_per_unit',
    'storage_income_per_unit', 'application_fees_annual', 'late_fees_annual',
    'utility_reimbursements_annual', 'furnished_unit_premium_pct',
    'short_term_rental_income', 'ancillary_services_income', 'vending_income',
    'package_locker_fees', 'reserved_parking_premium', 'ev_charging_fees',
    'other_miscellaneous', 'income_category'
]

VACANCY_COLUMNS = [
    'vacancy_loss_pct', 'collection_loss_pct', 'physical_vacancy_pct',
    'economic_vacancy_pct', 'bad_debt_pct', 'concession_cost_pct',
    'turnover_vacancy_days', 'seasonal_vacancy_adjustment',
    'lease_up_absorption_curve', 'market_vacancy_rate_pct',
    'submarket_vacancy_rate_pct', 'competitive_set_vacancy_pct'
]


def _get_assumption_record(
    table_name: str,
    pk_column: str,
    project_id: int,
    columns: List[str]
) -> Dict[str, Any]:
    """Generic getter for assumption tables."""
    try:
        col_list = ', '.join(columns)
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT {pk_column}, {col_list}
                FROM landscape.{table_name}
                WHERE project_id = %s
                LIMIT 1
            """, [project_id])
            row = cursor.fetchone()

            if not row:
                return {'success': True, 'exists': False, 'data': None}

            # Build data dict from columns
            data = {pk_column: row[0]}
            for i, col in enumerate(columns):
                val = row[i + 1]
                # Convert Decimal to float for JSON serialization
                if isinstance(val, Decimal):
                    val = float(val)
                # Convert date to string
                if hasattr(val, 'isoformat'):
                    val = val.isoformat()
                data[col] = val

            return {'success': True, 'exists': True, 'data': data}

    except Exception as e:
        logger.error(f"Error getting {table_name}: {e}")
        return {'success': False, 'error': str(e), 'exists': False}


def _upsert_assumption_record(
    table_name: str,
    pk_column: str,
    project_id: int,
    columns: List[str],
    input_data: Dict[str, Any],
    required_columns: List[str] = None
) -> Dict[str, Any]:
    """Generic upsert for assumption tables."""
    try:
        # Filter input to only valid columns
        updates = {k: v for k, v in input_data.items() if k in columns and v is not None}
        reason = input_data.get('reason', 'Updated via Landscaper')

        if not updates:
            return {'success': False, 'error': 'No valid fields provided'}

        with connection.cursor() as cursor:
            # Check if record exists
            cursor.execute(f"""
                SELECT {pk_column} FROM landscape.{table_name}
                WHERE project_id = %s
            """, [project_id])
            existing = cursor.fetchone()

            if existing:
                # UPDATE existing record
                pk_id = existing[0]
                set_clauses = ', '.join([f"{col} = %s" for col in updates.keys()])
                values = list(updates.values()) + [project_id]

                cursor.execute(f"""
                    UPDATE landscape.{table_name}
                    SET {set_clauses}, updated_at = NOW()
                    WHERE project_id = %s
                """, values)

                action = 'updated'
            else:
                # INSERT new record - check required columns
                if required_columns:
                    missing = [c for c in required_columns if c not in updates]
                    if missing:
                        return {
                            'success': False,
                            'error': f"Missing required fields for new record: {missing}"
                        }

                col_names = ['project_id'] + list(updates.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = [project_id] + list(updates.values())

                cursor.execute(f"""
                    INSERT INTO landscape.{table_name} ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING {pk_column}
                """, values)

                pk_id = cursor.fetchone()[0]
                action = 'created'

        # Log activity
        _log_assumption_activity(
            project_id=project_id,
            table_name=table_name,
            action=action,
            fields=list(updates.keys()),
            reason=reason
        )

        return {
            'success': True,
            'action': action,
            pk_column: pk_id,
            'fields_updated': list(updates.keys())
        }

    except Exception as e:
        logger.error(f"Error upserting {table_name}: {e}")
        return {'success': False, 'error': str(e)}


def _log_assumption_activity(
    project_id: int,
    table_name: str,
    action: str,
    fields: List[str],
    reason: str
) -> None:
    """Log assumption update to activity feed."""
    try:
        from .models import ActivityItem

        # Map table names to friendly names
        table_labels = {
            'tbl_property_acquisition': 'acquisition assumptions',
            'tbl_revenue_rent': 'rent revenue assumptions',
            'tbl_revenue_other': 'other income assumptions',
            'tbl_vacancy_assumption': 'vacancy assumptions'
        }
        label = table_labels.get(table_name, table_name)

        field_list = ', '.join(fields[:5])
        if len(fields) > 5:
            field_list += f" and {len(fields) - 5} more"

        ActivityItem.objects.create(
            project_id=project_id,
            activity_type='update',
            title=f"{action.title()} {label}",
            summary=f"{action.title()} fields: {field_list}. {reason}",
            status='complete',
            confidence='high',
            details={
                'table': table_name,
                'action': action,
                'fields': fields,
                'reason': reason
            },
            highlight_fields=fields,
            source_type='landscaper_ai',
            source_id=f"assumption_{table_name}_{project_id}"
        )
    except Exception as e:
        logger.error(f"Failed to log assumption activity: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Cashflow Tool Suite Helpers
# ─────────────────────────────────────────────────────────────────────────────

CASHFLOW_RESULT_KEYS = [
    'irr',
    'npv',
    'equityMultiple',
    'peakEquity',
    'paybackPeriod',
    'totalCashIn',
    'totalCashOut',
    'netCashFlow',
    'cumulativeCashFlow',
]

ALLOWED_CASHFLOW_FUNCTIONS = {
    'abs': abs,
    'min': min,
    'max': max,
}

ASSUMPTION_FIELD_TYPES = {
    'discount_rate': 'decimal',
    'selling_costs_pct': 'decimal',
    'hold_period_years': 'integer',
    'exit_cap_rate': 'decimal',
    'bulk_sale_period': 'integer',
    'bulk_sale_discount_pct': 'decimal',
    'sensitivity_interval': 'decimal',
    'going_in_cap_rate': 'decimal',
    'vacancy_rate': 'decimal',
    'stabilized_vacancy': 'decimal',
    'credit_loss': 'decimal',
    'management_fee_pct': 'decimal',
    'reserves_per_unit': 'decimal',
}


def _fetch_cashflow_schedule(project_id: int) -> Dict[str, Any]:
    """
    Fetch cash flow schedule for a Land Dev project.

    Now calls the Django LandDevCashFlowService directly instead of
    making an HTTP call to the Next.js API.
    """
    from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService

    try:
        service = LandDevCashFlowService(project_id)
        data = service.calculate()
    except ValueError as err:
        raise RuntimeError(f"Cash flow calculation error: {err}")
    except Exception as err:
        raise RuntimeError(f"Cash flow calculation failed: {err}")

    if not data:
        raise RuntimeError('Cash flow service did not return schedule data')

    return data


def _filter_numeric_assumptions(values: Dict[str, Any]) -> Dict[str, Any]:
    filtered: Dict[str, Any] = {}
    for key, value in values.items():
        if key in {'project_id', 'property_type'} or value is None:
            continue
        if isinstance(value, bool):
            filtered[key] = int(value)
        elif isinstance(value, (int, float)):
            filtered[key] = value
        elif isinstance(value, Decimal):
            filtered[key] = float(value)
    return filtered


def _build_cashflow_assumptions(project_id: int) -> Dict[str, Any]:
    from apps.financial.services.dcf_assumptions_service import DcfAssumptionsService

    service = DcfAssumptionsService(project_id)
    return _filter_numeric_assumptions(service.get_all_assumptions())


def _build_cashflow_results_payload(project_id: int) -> Dict[str, Any]:
    schedule = _fetch_cashflow_schedule(project_id)
    summary = schedule.get('summary') or {}

    results: Dict[str, Any] = {}
    for key in CASHFLOW_RESULT_KEYS:
        if key in summary:
            results[key] = summary[key]

    payload = {
        'assumptions': _build_cashflow_assumptions(project_id),
        'results': results,
        'summary': summary,
        'calculated_at': schedule.get('generatedAt') or schedule.get('calculatedAt'),
        'scenario_id': schedule.get('scenarioId') or schedule.get('scenario_id'),
    }
    return payload


def _flatten_expression_context(payload: Dict[str, Any]) -> Dict[str, Any]:
    context = {
        'assumptions': payload.get('assumptions', {}),
        'results': payload.get('results', {}),
        'summary': payload.get('summary', {}),
    }

    for key, value in context['results'].items():
        context[key] = value

    for key, value in context['summary'].items():
        context[f"summary_{key}"] = value

    for key, value in context['assumptions'].items():
        context[f"assumptions_{key}"] = value

    context.update(ALLOWED_CASHFLOW_FUNCTIONS)
    return context


def _evaluate_expression(expression: str, variables: Dict[str, Any]) -> Any:
    tree = ast.parse(expression, mode='eval')

    class _ExpressionEvaluator(ast.NodeVisitor):
        def __init__(self, vars_map: Dict[str, Any]):
            self._vars = vars_map

        def visit(self, node: ast.AST) -> Any:
            method = f'visit_{node.__class__.__name__}'
            visitor = getattr(self, method, None)
            if visitor is None:
                raise ValueError(f"Unsupported expression element: {node.__class__.__name__}")
            return visitor(node)

        def visit_BinOp(self, node: ast.BinOp) -> Any:
            left = self.visit(node.left)
            right = self.visit(node.right)
            op_func = {
                ast.Add: operator.add,
                ast.Sub: operator.sub,
                ast.Mult: operator.mul,
                ast.Div: operator.truediv,
                ast.Mod: operator.mod,
            }.get(type(node.op))
            if op_func is None:
                raise ValueError(f"Operator {node.op.__class__.__name__} not allowed")
            return op_func(left, right)

        def visit_UnaryOp(self, node: ast.UnaryOp) -> Any:
            operand = self.visit(node.operand)
            if isinstance(node.op, ast.USub):
                return -operand
            if isinstance(node.op, ast.UAdd):
                return operand
            raise ValueError(f"Unary operator {node.op.__class__.__name__} not allowed")

        def visit_Call(self, node: ast.Call) -> Any:
            if not isinstance(node.func, ast.Name):
                raise ValueError("Only simple function calls are allowed")
            func = ALLOWED_CASHFLOW_FUNCTIONS.get(node.func.id)
            if func is None:
                raise ValueError(f"Function {node.func.id} is not supported")
            args = [self.visit(arg) for arg in node.args]
            return func(*args)

        def visit_Name(self, node: ast.Name) -> Any:
            if node.id not in self._vars:
                raise ValueError(f"Unknown identifier: {node.id}")
            return self._vars[node.id]

        def visit_Attribute(self, node: ast.Attribute) -> Any:
            value = self.visit(node.value)
            attr = node.attr
            if isinstance(value, dict):
                if attr in value:
                    return value[attr]
                raise ValueError(f"Attribute {attr} not found in context")
            return getattr(value, attr)

        def visit_Subscript(self, node: ast.Subscript) -> Any:
            target = self.visit(node.value)
            slice_node = node.slice
            index = self.visit(slice_node.value) if getattr(slice_node, 'value', None) is not None else self.visit(slice_node)
            return target[index]

        def visit_Constant(self, node: ast.Constant) -> Any:
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError("Only numeric constants are allowed")

        def visit_Num(self, node: ast.Num) -> Any:
            return node.n

        def generic_visit(self, node: ast.AST) -> Any:
            raise ValueError(f"Unsupported expression element: {node.__class__.__name__}")

    evaluator = _ExpressionEvaluator(variables)
    return evaluator.visit(tree.body)


def _values_match(existing: Optional[Any], provided: Any, value_type: str) -> bool:
    if provided is None:
        return existing is None

    if value_type == 'integer':
        current = int(existing) if existing is not None else 0
        return current == int(provided)

    try:
        current = float(existing) if existing is not None else 0.0
        candidate = float(provided)
    except (TypeError, ValueError):
        return False

    return math.isclose(current, candidate, rel_tol=1e-9, abs_tol=1e-9)


def _coerce_assumption_value(value: Any, value_type: str) -> Any:
    if value_type == 'integer':
        return int(value)
    return Decimal(str(value))


def _log_cashflow_assumption_update(
    project_id: int,
    field: str,
    old_value: Any,
    new_value: Any,
    reason: str
) -> None:
    _log_field_update_activity(project_id, 'tbl_dcf_analysis', field, old_value, new_value, reason)


def _build_cashflow_proposal(field: str, current_value: Any, proposed_value: Any, reason: str) -> Dict[str, Any]:
    summary_value = float(current_value) if current_value is not None else 0.0
    return {
        'success': True,
        'proposal': {
            'tool': 'update_cashflow_assumption',
            'field': field,
            'current_value': summary_value,
            'proposed_value': proposed_value,
            'reason': reason,
        }
    }


def _assemble_cashflow_results_payload(project_id: int) -> Dict[str, Any]:
    return _build_cashflow_results_payload(project_id)


@register_tool('get_cashflow_results')
def handle_get_cashflow_results(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Read-only tool returning canonical cash flow/DCF results."""
    target_project = tool_input.get('project_id') or project_id
    try:
        payload = _assemble_cashflow_results_payload(target_project)
        return {'success': True, 'data': payload}
    except Exception as err:
        logger.error(f"Failed to fetch cashflow results for project {target_project}: {err}")
        return {'success': False, 'error': str(err)}


@register_tool('compute_cashflow_expression')
def handle_compute_cashflow_expression(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Pure compute tool for safe math on cashflow values."""
    expression = tool_input.get('expression')
    context = tool_input.get('context')

    if not expression:
        return {'success': False, 'error': 'Expression is required'}
    if not isinstance(context, dict):
        return {'success': False, 'error': 'Context must be the result of get_cashflow_results'}

    try:
        variables = _flatten_expression_context(context)
        value = _evaluate_expression(expression, variables)
        return {'success': True, 'value': value}
    except Exception as err:
        logger.error(f"Expression evaluation failed for project {project_id}: {err}")
        return {'success': False, 'error': str(err)}


@register_tool('update_cashflow_assumption', is_mutation=True)
def handle_update_cashflow_assumption(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    **kwargs
) -> Dict[str, Any]:
    """
    Update a single DCF/cashflow assumption with two-phase confirmation flow.

    Phase 1 (confirm=false or omitted): Returns a preview of the change without writing.
    Phase 2 (confirm=true): Executes the write, verifies it, and returns updated results.

    Writes to tbl_dcf_analysis which is the source of truth for the Cashflow UI.
    """
    field = tool_input.get('field')
    reason = (tool_input.get('reason') or '').strip()
    new_value = tool_input.get('new_value')
    confirm = tool_input.get('confirm', False)

    logger.info(f"[CASHFLOW_WRITE] Invoked: field={field}, new_value={new_value}, confirm={confirm}, propose_only={propose_only}, project_id={project_id}")

    # Validate field is writable
    if not field or field not in ASSUMPTION_FIELD_TYPES:
        writable_fields = list(ASSUMPTION_FIELD_TYPES.keys())
        return {
            'success': False,
            'error': f"Field '{field}' is not writable. Writable fields: {writable_fields}"
        }

    if new_value is None:
        return {'success': False, 'error': 'new_value is required'}

    try:
        from apps.projects.models import Project
        from apps.financial.models_valuation import DcfAnalysis
    except ImportError as exc:
        logger.error(f"Failed to import financial models: {exc}")
        return {'success': False, 'error': 'Configuration error loading financial models'}

    # Get project and DCF analysis record
    try:
        project = Project.objects.get(pk=project_id)
        dcf_analysis, _ = DcfAnalysis.get_or_create_for_project(project)
    except Project.DoesNotExist:
        return {'success': False, 'error': f"Project {project_id} not found"}
    except Exception as err:
        logger.error(f"Failed to load DCF analysis for project {project_id}: {err}")
        return {'success': False, 'error': str(err)}

    value_type = ASSUMPTION_FIELD_TYPES[field]
    current_value = getattr(dcf_analysis, field)
    current_value_float = float(current_value) if current_value is not None else 0.0

    # Phase 1: Preview only (no write)
    if not confirm:
        logger.info(f"[CASHFLOW_WRITE] Preview mode - returning preview (confirm={confirm})")
        return {
            'success': True,
            'action': 'preview',
            'message': f"Ready to update {field} from {current_value_float} to {new_value}. Call again with confirm=true to apply.",
            'preview': {
                'field': field,
                'current_value': current_value_float,
                'new_value': new_value,
                'requires_confirmation': True
            }
        }

    # Phase 2: Confirmed write
    if not reason:
        return {'success': False, 'error': 'Reason is required when confirm=true'}

    try:
        coerced = _coerce_assumption_value(new_value, value_type)
    except (TypeError, ValueError, InvalidOperation) as err:
        logger.error(f"Invalid value for {field}: {err}")
        return {'success': False, 'error': f"Invalid value for {field}: {err}"}

    # Execute the write with explicit transaction
    logger.info(f"[CASHFLOW_WRITE] Phase 2: Confirmed write - executing. DCF pk={dcf_analysis.pk}, current {field}={current_value}")
    try:
        with transaction.atomic():
            setattr(dcf_analysis, field, coerced)
            logger.info(f"[CASHFLOW_WRITE] Set {field} to {coerced} (in memory)")
            dcf_analysis.save(update_fields=[field, 'updated_at'])
            logger.info(f"[CASHFLOW_WRITE] save(update_fields=['{field}', 'updated_at']) completed inside transaction")
        logger.info(f"[CASHFLOW_WRITE] Transaction committed")
    except Exception as err:
        logger.error(f"[CASHFLOW_WRITE] Failed to save {field} for project {project_id}: {err}")
        return {'success': False, 'error': f"Database write failed: {err}"}

    # VERIFY the write by re-reading OUTSIDE the transaction (ensures commit happened)
    try:
        dcf_analysis.refresh_from_db(fields=[field])
        verified_value = getattr(dcf_analysis, field)
        verified_value_float = float(verified_value) if verified_value is not None else 0.0
        logger.info(f"[CASHFLOW_WRITE] After refresh_from_db (outside txn): {field}={verified_value_float}")

        if not _values_match(verified_value, new_value, value_type):
            logger.error(f"[CASHFLOW_WRITE] VERIFICATION FAILED: expected {new_value}, got {verified_value}")
            return {
                'success': False,
                'error': f"Write verification failed. Expected {new_value}, got {verified_value_float}."
            }
        logger.info(f"[CASHFLOW_WRITE] VERIFICATION PASSED: {field} = {verified_value_float}")
    except Exception as err:
        logger.error(f"[CASHFLOW_WRITE] Failed to verify write for {field}: {err}")
        return {'success': False, 'error': f"Write verification failed: {err}"}

    # Log the change
    _log_cashflow_assumption_update(project_id, field, current_value, new_value, reason)

    # Get fresh cashflow results
    try:
        updated_payload = _assemble_cashflow_results_payload(project_id)
    except Exception as err:
        logger.error(f"Failed to recalc cashflow after updating {field}: {err}")
        # Write succeeded but recalc failed - still report success with warning
        return {
            'success': True,
            'action': 'updated',
            'warning': f"Assumption updated but cashflow recalc failed: {err}",
            'change': {
                'field': field,
                'old_value': current_value_float,
                'new_value': verified_value_float,
                'reason': reason
            },
            'recalculated_results': None,
        }

    return {
        'success': True,
        'action': 'updated',
        'change': {
            'field': field,
            'old_value': current_value_float,
            'new_value': verified_value_float,
            'reason': reason
        },
        'recalculated_results': updated_payload,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Acquisition Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_acquisition')
def handle_get_acquisition(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get property acquisition assumptions."""
    return _get_assumption_record(
        table_name='tbl_property_acquisition',
        pk_column='acquisition_id',
        project_id=project_id,
        columns=ACQUISITION_COLUMNS
    )


@register_tool('update_acquisition', is_mutation=True)
def handle_update_acquisition(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Update property acquisition assumptions."""
    if propose_only:
        from .services.mutation_service import MutationService

        # Build proposal for acquisition update
        updates = {k: v for k, v in tool_input.items() if k in ACQUISITION_COLUMNS and v is not None}
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='assumption_upsert',
            table_name='tbl_property_acquisition',
            field_name=None,
            proposed_value=updates,
            current_value=None,
            reason=tool_input.get('reason', 'Update acquisition assumptions'),
            source_message_id=source_message_id,
        )
    else:
        return _upsert_assumption_record(
            table_name='tbl_property_acquisition',
            pk_column='acquisition_id',
            project_id=project_id,
            columns=ACQUISITION_COLUMNS,
            input_data=tool_input,
            required_columns=None  # No required columns for acquisition
        )


# ─────────────────────────────────────────────────────────────────────────────
# Revenue Rent Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_revenue_rent')
def handle_get_revenue_rent(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get rent revenue assumptions."""
    return _get_assumption_record(
        table_name='tbl_revenue_rent',
        pk_column='rent_id',
        project_id=project_id,
        columns=REVENUE_RENT_COLUMNS
    )


@register_tool('update_revenue_rent', is_mutation=True)
def handle_update_revenue_rent(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Update rent revenue assumptions."""
    if propose_only:
        from .services.mutation_service import MutationService

        updates = {k: v for k, v in tool_input.items() if k in REVENUE_RENT_COLUMNS and v is not None}
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='assumption_upsert',
            table_name='tbl_revenue_rent',
            field_name=None,
            proposed_value=updates,
            current_value=None,
            reason=tool_input.get('reason', 'Update rent revenue assumptions'),
            source_message_id=source_message_id,
        )
    else:
        return _upsert_assumption_record(
            table_name='tbl_revenue_rent',
            pk_column='rent_id',
            project_id=project_id,
            columns=REVENUE_RENT_COLUMNS,
            input_data=tool_input,
            required_columns=['current_rent_psf', 'occupancy_pct', 'annual_rent_growth_pct']
        )


# ─────────────────────────────────────────────────────────────────────────────
# Revenue Other Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_revenue_other')
def handle_get_revenue_other(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get other revenue assumptions."""
    return _get_assumption_record(
        table_name='tbl_revenue_other',
        pk_column='other_income_id',
        project_id=project_id,
        columns=REVENUE_OTHER_COLUMNS
    )


@register_tool('update_revenue_other', is_mutation=True)
def handle_update_revenue_other(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Update other revenue assumptions."""
    if propose_only:
        from .services.mutation_service import MutationService

        updates = {k: v for k, v in tool_input.items() if k in REVENUE_OTHER_COLUMNS and v is not None}
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='assumption_upsert',
            table_name='tbl_revenue_other',
            field_name=None,
            proposed_value=updates,
            current_value=None,
            reason=tool_input.get('reason', 'Update other revenue assumptions'),
            source_message_id=source_message_id,
        )
    else:
        return _upsert_assumption_record(
            table_name='tbl_revenue_other',
            pk_column='other_income_id',
            project_id=project_id,
            columns=REVENUE_OTHER_COLUMNS,
            input_data=tool_input,
            required_columns=None  # No required columns
        )


# ─────────────────────────────────────────────────────────────────────────────
# Vacancy Assumptions Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_vacancy_assumptions')
def handle_get_vacancy_assumptions(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get vacancy and loss assumptions."""
    return _get_assumption_record(
        table_name='tbl_vacancy_assumption',
        pk_column='vacancy_id',
        project_id=project_id,
        columns=VACANCY_COLUMNS
    )


@register_tool('update_vacancy_assumptions', is_mutation=True)
def handle_update_vacancy_assumptions(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Update vacancy and loss assumptions."""
    if propose_only:
        from .services.mutation_service import MutationService

        updates = {k: v for k, v in tool_input.items() if k in VACANCY_COLUMNS and v is not None}
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='assumption_upsert',
            table_name='tbl_vacancy_assumption',
            field_name=None,
            proposed_value=updates,
            current_value=None,
            reason=tool_input.get('reason', 'Update vacancy assumptions'),
            source_message_id=source_message_id,
        )
    else:
        return _upsert_assumption_record(
            table_name='tbl_vacancy_assumption',
            pk_column='vacancy_id',
            project_id=project_id,
            columns=VACANCY_COLUMNS,
            input_data=tool_input,
            required_columns=['vacancy_loss_pct', 'collection_loss_pct']
        )


# ─────────────────────────────────────────────────────────────────────────────
# Rent Roll Tool Handlers
# ─────────────────────────────────────────────────────────────────────────────

# Column definitions for rent roll tables
UNIT_TYPE_COLUMNS = [
    'unit_type_code', 'unit_type_name', 'bedrooms', 'bathrooms',
    'avg_square_feet', 'current_market_rent', 'total_units', 'notes',
    'other_features', 'unit_count', 'market_rent', 'current_rent_avg',
    'concessions_avg'
]

UNIT_COLUMNS = [
    'unit_number', 'building_name', 'unit_type', 'bedrooms', 'bathrooms',
    'square_feet', 'market_rent', 'current_rent', 'current_rent_psf',
    'market_rent_psf', 'occupancy_status', 'lease_start_date', 'lease_end_date',
    'renovation_status', 'renovation_cost', 'renovation_date', 'is_section8',
    'is_manager', 'has_balcony', 'has_patio', 'view_type', 'floor_number',
    'other_features'
]

LEASE_COLUMNS = [
    'tenant_name', 'tenant_contact', 'tenant_email', 'tenant_phone',
    'tenant_classification', 'lease_status', 'lease_type', 'suite_number',
    'floor_number', 'lease_execution_date', 'lease_commencement_date',
    'rent_start_date', 'lease_expiration_date', 'lease_term_months',
    'leased_sf', 'usable_sf', 'number_of_renewal_options',
    'renewal_option_term_months', 'renewal_notice_months',
    'renewal_probability_pct', 'early_termination_allowed',
    'termination_notice_months', 'termination_penalty_amount',
    'security_deposit_amount', 'security_deposit_months', 'affects_occupancy',
    'expansion_rights', 'right_of_first_refusal', 'notes'
]


def _log_rent_roll_activity(
    project_id: int,
    table_name: str,
    action: str,
    created_count: int,
    updated_count: int,
    reason: str
) -> None:
    """Log rent roll batch operation to activity feed."""
    try:
        from .models import ActivityItem

        table_labels = {
            'tbl_multifamily_unit_type': 'unit types',
            'tbl_multifamily_unit': 'units',
            'tbl_lease': 'leases'
        }
        label = table_labels.get(table_name, table_name)

        total = created_count + updated_count
        if created_count > 0 and updated_count > 0:
            summary = f"Created {created_count}, updated {updated_count} {label}"
        elif created_count > 0:
            summary = f"Created {created_count} {label}"
        else:
            summary = f"Updated {updated_count} {label}"

        ActivityItem.objects.create(
            project_id=project_id,
            activity_type='update',
            title=f"{action.title()} {label}",
            summary=f"{summary}. {reason}",
            status='complete',
            confidence='high',
            details={
                'table': table_name,
                'action': action,
                'created': created_count,
                'updated': updated_count,
                'reason': reason
            },
            source_type='landscaper_ai',
            source_id=f"rent_roll_{table_name}_{project_id}"
        )
    except Exception as e:
        logger.error(f"Failed to log rent roll activity: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Unit Types Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_unit_types')
def handle_get_unit_types(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get unit type mix for a multifamily property."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT unit_type_id, unit_type_code, unit_type_name, bedrooms, bathrooms,
                       avg_square_feet, current_market_rent, total_units, notes,
                       other_features, unit_count, market_rent, current_rent_avg,
                       concessions_avg
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
                ORDER BY bedrooms, unit_type_code
            """, [project_id])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = {}
                for i, col in enumerate(columns):
                    val = row[i]
                    if isinstance(val, Decimal):
                        val = float(val)
                    record[col] = val
                records.append(record)

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error getting unit types: {e}")
        return {'success': False, 'error': str(e), 'count': 0, 'records': []}


@register_tool('update_unit_types', is_mutation=True)
def handle_update_unit_types(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update unit types for a multifamily property.

    When auto-executed (propose_only=False), uses MutationService._execute_mutation
    for consistency with other rent roll batch operations.
    """
    records = tool_input.get('records', [])
    reason = tool_input.get('reason', 'Update unit types')

    if not records:
        return {'success': False, 'error': 'No records provided'}

    from .services.mutation_service import MutationService

    if propose_only:
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='rent_roll_batch',
            table_name='tbl_multifamily_unit_type',
            field_name=None,
            proposed_value={'records': records, 'count': len(records)},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    # Direct execution - use MutationService for consistency
    logger.info(f"Auto-executing update_unit_types for project {project_id} with {len(records)} records")
    result = MutationService._execute_mutation(
        project_id=project_id,
        mutation_type='rent_roll_batch',
        table_name='tbl_multifamily_unit_type',
        field_name=None,
        record_id=None,
        proposed_value={'records': records, 'count': len(records)},
    )

    # Log the activity
    if result.get('success'):
        _log_rent_roll_activity(
            project_id, 'tbl_multifamily_unit_type', 'batch_upsert',
            result.get('created', 0), result.get('updated', 0), reason
        )

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Units Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_units')
def handle_get_units(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get individual unit details for a multifamily property."""
    try:
        building_filter = tool_input.get('building_name')
        type_filter = tool_input.get('unit_type')
        status_filter = tool_input.get('occupancy_status')
        limit = tool_input.get('limit', 500)

        query = """
            SELECT unit_id, unit_number, building_name, unit_type, bedrooms, bathrooms,
                   square_feet, market_rent, current_rent, current_rent_psf, market_rent_psf,
                   occupancy_status, lease_start_date, lease_end_date, renovation_status,
                   renovation_cost, renovation_date, is_section8, is_manager,
                   has_balcony, has_patio, view_type, floor_number, other_features
            FROM landscape.tbl_multifamily_unit
            WHERE project_id = %s
        """
        params = [project_id]

        if building_filter:
            query += " AND building_name = %s"
            params.append(building_filter)
        if type_filter:
            query += " AND unit_type = %s"
            params.append(type_filter)
        if status_filter:
            query += " AND occupancy_status = %s"
            params.append(status_filter)

        query += " ORDER BY building_name, unit_number LIMIT %s"
        params.append(limit)

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = {}
                for i, col in enumerate(columns):
                    val = row[i]
                    if isinstance(val, Decimal):
                        val = float(val)
                    elif hasattr(val, 'isoformat'):
                        val = val.isoformat()
                    record[col] = val
                records.append(record)

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error getting units: {e}")
        return {'success': False, 'error': str(e), 'count': 0, 'records': []}


@register_tool('update_units', is_mutation=True)
def handle_update_units(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update individual units for a multifamily property.

    When auto-executed (propose_only=False), uses MutationService._execute_mutation
    which creates units, leases, AND unit types in one atomic operation.
    """
    records = tool_input.get('records', [])
    reason = tool_input.get('reason', 'Update units')

    if not records:
        return {'success': False, 'error': 'No records provided'}

    from .services.mutation_service import MutationService

    if propose_only:
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='rent_roll_batch',
            table_name='tbl_multifamily_unit',
            field_name=None,
            proposed_value={'records': records, 'count': len(records)},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    # Direct execution - use MutationService to get full functionality
    # (creates units, leases, AND unit types in one operation)
    logger.info(f"Auto-executing update_units for project {project_id} with {len(records)} records")
    result = MutationService._execute_mutation(
        project_id=project_id,
        mutation_type='rent_roll_batch',
        table_name='tbl_multifamily_unit',
        field_name=None,
        record_id=None,
        proposed_value={'records': records, 'count': len(records)},
    )

    # Log the activity
    if result.get('success'):
        _log_rent_roll_activity(
            project_id, 'tbl_multifamily_unit', 'batch_upsert',
            result.get('created', 0), result.get('updated', 0), reason
        )

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Leases Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_leases')
def handle_get_leases(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get lease records for a property."""
    try:
        status_filter = tool_input.get('lease_status')
        limit = tool_input.get('limit', 500)

        query = """
            SELECT lease_id, tenant_name, tenant_contact, tenant_email, tenant_phone,
                   tenant_classification, lease_status, lease_type, suite_number,
                   floor_number, lease_execution_date, lease_commencement_date,
                   rent_start_date, lease_expiration_date, lease_term_months,
                   leased_sf, usable_sf, number_of_renewal_options,
                   renewal_option_term_months, renewal_notice_months,
                   renewal_probability_pct, early_termination_allowed,
                   termination_notice_months, termination_penalty_amount,
                   security_deposit_amount, security_deposit_months, notes
            FROM landscape.tbl_lease
            WHERE project_id = %s
        """
        params = [project_id]

        if status_filter:
            query += " AND lease_status = %s"
            params.append(status_filter)

        query += " ORDER BY lease_commencement_date DESC LIMIT %s"
        params.append(limit)

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = {}
                for i, col in enumerate(columns):
                    val = row[i]
                    if isinstance(val, Decimal):
                        val = float(val)
                    elif hasattr(val, 'isoformat'):
                        val = val.isoformat()
                    record[col] = val
                records.append(record)

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error getting leases: {e}")
        return {'success': False, 'error': str(e), 'count': 0, 'records': []}


@register_tool('update_leases', is_mutation=True)
def handle_update_leases(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update lease records for a property."""
    records = tool_input.get('records', [])
    reason = tool_input.get('reason', 'Update leases')

    if not records:
        return {'success': False, 'error': 'No records provided'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='rent_roll_batch',
            table_name='tbl_lease',
            field_name=None,
            proposed_value={'records': records, 'count': len(records)},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    # Direct execution
    created_count = 0
    updated_count = 0
    results = []

    try:
        with connection.cursor() as cursor:
            for record in records:
                lease_id = record.get('lease_id')
                tenant_name = record.get('tenant_name')
                suite_number = record.get('suite_number')
                commencement = record.get('lease_commencement_date')

                # Validate required fields
                if not tenant_name:
                    results.append({'success': False, 'error': 'tenant_name required'})
                    continue

                required = ['lease_commencement_date', 'lease_expiration_date', 'lease_term_months', 'leased_sf']
                missing = [f for f in required if not record.get(f)]
                if missing and not lease_id:
                    results.append({'success': False, 'error': f'Missing required fields: {missing}'})
                    continue

                # Check if exists by lease_id or by project + suite + commencement
                existing = None
                if lease_id:
                    cursor.execute("""
                        SELECT lease_id FROM landscape.tbl_lease
                        WHERE lease_id = %s AND project_id = %s
                    """, [lease_id, project_id])
                    existing = cursor.fetchone()
                elif suite_number and commencement:
                    cursor.execute("""
                        SELECT lease_id FROM landscape.tbl_lease
                        WHERE project_id = %s AND suite_number = %s AND lease_commencement_date = %s
                    """, [project_id, suite_number, commencement])
                    existing = cursor.fetchone()

                # Build update dict
                updates = {k: v for k, v in record.items()
                          if k in LEASE_COLUMNS and v is not None and k != 'lease_id'}

                if existing:
                    # Update
                    existing_id = existing[0]
                    if updates:
                        set_clauses = ', '.join([f"{col} = %s" for col in updates.keys()])
                        values = list(updates.values()) + [existing_id]
                        cursor.execute(f"""
                            UPDATE landscape.tbl_lease
                            SET {set_clauses}, updated_at = NOW()
                            WHERE lease_id = %s
                        """, values)
                    updated_count += 1
                    results.append({'success': True, 'action': 'updated', 'lease_id': existing_id, 'tenant_name': tenant_name})
                else:
                    # Insert
                    col_names = ['project_id'] + list(updates.keys())
                    placeholders = ', '.join(['%s'] * len(col_names))
                    values = [project_id] + list(updates.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.tbl_lease ({', '.join(col_names)})
                        VALUES ({placeholders})
                        RETURNING lease_id
                    """, values)
                    new_id = cursor.fetchone()[0]
                    created_count += 1
                    results.append({'success': True, 'action': 'created', 'lease_id': new_id, 'tenant_name': tenant_name})

        _log_rent_roll_activity(project_id, 'tbl_lease', 'batch_upsert',
                                created_count, updated_count, reason)

        return {
            'success': True,
            'created': created_count,
            'updated': updated_count,
            'records': results
        }

    except Exception as e:
        logger.error(f"Error updating leases: {e}")
        return {'success': False, 'error': str(e), 'created': created_count, 'updated': updated_count}


# ─────────────────────────────────────────────────────────────────────────────
# Sales Comparables Tools
# ─────────────────────────────────────────────────────────────────────────────

SALES_COMP_COLUMNS = [
    'comp_number', 'property_name', 'address', 'city', 'state', 'zip',
    'sale_date', 'sale_price', 'price_per_unit', 'price_per_sf',
    'year_built', 'units', 'building_sf', 'cap_rate', 'grm',
    'distance_from_subject', 'unit_mix', 'notes', 'latitude', 'longitude', 'unit_count'
]

SALES_ADJ_COLUMNS = [
    'adjustment_type', 'adjustment_pct', 'adjustment_amount',
    'justification', 'user_adjustment_pct', 'ai_accepted', 'user_notes', 'last_modified_by'
]


def _log_comparables_activity(project_id: int, table_name: str, action: str,
                              count: int, reason: str) -> None:
    """Log comparables operations to landscaper_activity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.landscaper_activity
                (project_id, activity_type, title, summary, details, created_at)
                VALUES (%s, %s, %s, %s, %s::jsonb, NOW())
            """, [
                project_id,
                'update',  # Must be one of: status, decision, update, alert
                f'Comparables {action}',
                f'{action.title()}d {count} record(s) in {table_name}',
                json.dumps({
                    'table': table_name,
                    'action': action,
                    'count': count,
                    'reason': reason
                })
            ])
    except Exception as e:
        logger.warning(f"Failed to log comparables activity: {e}")


@register_tool('get_sales_comparables')
def handle_get_sales_comparables(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get sales comparables for a project."""
    limit = tool_input.get('limit', 100)

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT comparable_id, comp_number, property_name, address, city, state, zip,
                       sale_date, sale_price, price_per_unit, price_per_sf,
                       year_built, units, building_sf, cap_rate, grm,
                       distance_from_subject, unit_mix, notes, latitude, longitude, unit_count
                FROM landscape.tbl_sales_comparables
                WHERE project_id = %s
                ORDER BY comp_number, sale_date DESC
                LIMIT %s
            """, [project_id, limit])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                # Convert Decimal to float for JSON
                for key in ['sale_price', 'price_per_unit', 'price_per_sf', 'units', 'grm', 'latitude', 'longitude']:
                    if record.get(key) is not None:
                        record[key] = float(record[key])
                # Handle date
                if record.get('sale_date'):
                    record['sale_date'] = str(record['sale_date'])
                records.append(record)

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error getting sales comparables: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_sales_comparable', is_mutation=True)
def handle_update_sales_comparable(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update a sales comparable."""
    reason = tool_input.get('reason', 'Update sales comparable')

    # Extract fields
    comparable_id = tool_input.get('comparable_id')
    property_name = tool_input.get('property_name')

    if not property_name and not comparable_id:
        return {'success': False, 'error': 'property_name or comparable_id required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='comparable_upsert',
            table_name='tbl_sales_comparables',
            field_name=None,
            record_id=str(comparable_id) if comparable_id else None,
            proposed_value={k: v for k, v in tool_input.items() if k in SALES_COMP_COLUMNS},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Check if exists
            existing = None
            if comparable_id:
                cursor.execute("""
                    SELECT comparable_id FROM landscape.tbl_sales_comparables
                    WHERE comparable_id = %s AND project_id = %s
                """, [comparable_id, project_id])
                existing = cursor.fetchone()
            elif property_name:
                cursor.execute("""
                    SELECT comparable_id FROM landscape.tbl_sales_comparables
                    WHERE project_id = %s AND property_name = %s
                """, [project_id, property_name])
                existing = cursor.fetchone()

            # Build update dict
            updates = {k: v for k, v in tool_input.items()
                      if k in SALES_COMP_COLUMNS and v is not None}

            if existing:
                # Update
                existing_id = existing[0]
                if updates:
                    set_clauses = ', '.join([f"{col} = %s" for col in updates.keys()])
                    values = list(updates.values()) + [existing_id]
                    cursor.execute(f"""
                        UPDATE landscape.tbl_sales_comparables
                        SET {set_clauses}, updated_at = NOW()
                        WHERE comparable_id = %s
                    """, values)

                _log_comparables_activity(project_id, 'tbl_sales_comparables', 'update', 1, reason)
                return {
                    'success': True,
                    'action': 'updated',
                    'comparable_id': existing_id,
                    'property_name': property_name or updates.get('property_name')
                }
            else:
                # Insert
                col_names = ['project_id'] + list(updates.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = [project_id] + list(updates.values())

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_sales_comparables ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING comparable_id
                """, values)
                new_id = cursor.fetchone()[0]

                _log_comparables_activity(project_id, 'tbl_sales_comparables', 'create', 1, reason)
                return {
                    'success': True,
                    'action': 'created',
                    'comparable_id': new_id,
                    'property_name': property_name or updates.get('property_name')
                }

    except Exception as e:
        logger.error(f"Error updating sales comparable: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_sales_comparable', is_mutation=True)
def handle_delete_sales_comparable(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a sales comparable."""
    comparable_id = tool_input.get('comparable_id')
    reason = tool_input.get('reason', 'Delete sales comparable')

    if not comparable_id:
        return {'success': False, 'error': 'comparable_id required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='comparable_delete',
            table_name='tbl_sales_comparables',
            field_name=None,
            record_id=str(comparable_id),
            proposed_value={'delete': True, 'comparable_id': comparable_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Get property name for logging
            cursor.execute("""
                SELECT property_name FROM landscape.tbl_sales_comparables
                WHERE comparable_id = %s AND project_id = %s
            """, [comparable_id, project_id])
            row = cursor.fetchone()

            if not row:
                return {'success': False, 'error': f'Comparable {comparable_id} not found'}

            property_name = row[0]

            # Delete adjustments first (FK constraint)
            cursor.execute("""
                DELETE FROM landscape.tbl_sales_comp_adjustments
                WHERE comparable_id = %s
            """, [comparable_id])
            adj_deleted = cursor.rowcount

            # Delete the comparable
            cursor.execute("""
                DELETE FROM landscape.tbl_sales_comparables
                WHERE comparable_id = %s AND project_id = %s
            """, [comparable_id, project_id])

            _log_comparables_activity(project_id, 'tbl_sales_comparables', 'delete', 1, reason)
            return {
                'success': True,
                'action': 'deleted',
                'comparable_id': comparable_id,
                'property_name': property_name,
                'adjustments_deleted': adj_deleted
            }

    except Exception as e:
        logger.error(f"Error deleting sales comparable: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Sales Comp Adjustments Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_sales_comp_adjustments')
def handle_get_sales_comp_adjustments(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get adjustments for a sales comparable."""
    comparable_id = tool_input.get('comparable_id')

    if not comparable_id:
        return {'success': False, 'error': 'comparable_id required'}

    try:
        with connection.cursor() as cursor:
            # Verify comparable belongs to project
            cursor.execute("""
                SELECT property_name FROM landscape.tbl_sales_comparables
                WHERE comparable_id = %s AND project_id = %s
            """, [comparable_id, project_id])
            comp_row = cursor.fetchone()

            if not comp_row:
                return {'success': False, 'error': f'Comparable {comparable_id} not found for this project'}

            cursor.execute("""
                SELECT adjustment_id, adjustment_type, adjustment_pct, adjustment_amount,
                       justification, user_adjustment_pct, ai_accepted, user_notes,
                       last_modified_by, created_at
                FROM landscape.tbl_sales_comp_adjustments
                WHERE comparable_id = %s
                ORDER BY adjustment_type
            """, [comparable_id])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                # Convert Decimal to float
                for key in ['adjustment_pct', 'adjustment_amount', 'user_adjustment_pct']:
                    if record.get(key) is not None:
                        record[key] = float(record[key])
                if record.get('created_at'):
                    record['created_at'] = str(record['created_at'])
                records.append(record)

            return {
                'success': True,
                'comparable_id': comparable_id,
                'property_name': comp_row[0],
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error getting sales comp adjustments: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_sales_comp_adjustment', is_mutation=True)
def handle_update_sales_comp_adjustment(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update a sales comparable adjustment."""
    comparable_id = tool_input.get('comparable_id')
    adjustment_type = tool_input.get('adjustment_type')
    reason = tool_input.get('reason', 'Update sales comp adjustment')

    if not comparable_id:
        return {'success': False, 'error': 'comparable_id required'}
    if not adjustment_type:
        return {'success': False, 'error': 'adjustment_type required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='comparable_upsert',
            table_name='tbl_sales_comp_adjustments',
            field_name=None,
            record_id=str(comparable_id),
            proposed_value={k: v for k, v in tool_input.items() if k in SALES_ADJ_COLUMNS or k == 'comparable_id'},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Verify comparable belongs to project
            cursor.execute("""
                SELECT comparable_id FROM landscape.tbl_sales_comparables
                WHERE comparable_id = %s AND project_id = %s
            """, [comparable_id, project_id])
            if not cursor.fetchone():
                return {'success': False, 'error': f'Comparable {comparable_id} not found for this project'}

            # Check if adjustment exists
            cursor.execute("""
                SELECT adjustment_id FROM landscape.tbl_sales_comp_adjustments
                WHERE comparable_id = %s AND adjustment_type = %s
            """, [comparable_id, adjustment_type])
            existing = cursor.fetchone()

            # Build update dict
            updates = {k: v for k, v in tool_input.items()
                      if k in SALES_ADJ_COLUMNS and v is not None}

            if existing:
                # Update
                adjustment_id = existing[0]
                if updates:
                    set_clauses = ', '.join([f"{col} = %s" for col in updates.keys()])
                    values = list(updates.values()) + [adjustment_id]
                    cursor.execute(f"""
                        UPDATE landscape.tbl_sales_comp_adjustments
                        SET {set_clauses}
                        WHERE adjustment_id = %s
                    """, values)

                _log_comparables_activity(project_id, 'tbl_sales_comp_adjustments', 'update', 1, reason)
                return {
                    'success': True,
                    'action': 'updated',
                    'adjustment_id': adjustment_id,
                    'comparable_id': comparable_id,
                    'adjustment_type': adjustment_type
                }
            else:
                # Insert
                updates['adjustment_type'] = adjustment_type
                col_names = ['comparable_id'] + list(updates.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = [comparable_id] + list(updates.values())

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_sales_comp_adjustments ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING adjustment_id
                """, values)
                new_id = cursor.fetchone()[0]

                _log_comparables_activity(project_id, 'tbl_sales_comp_adjustments', 'create', 1, reason)
                return {
                    'success': True,
                    'action': 'created',
                    'adjustment_id': new_id,
                    'comparable_id': comparable_id,
                    'adjustment_type': adjustment_type
                }

    except Exception as e:
        logger.error(f"Error updating sales comp adjustment: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Rental Comparables Tools
# ─────────────────────────────────────────────────────────────────────────────

RENTAL_COMP_COLUMNS = [
    'property_name', 'address', 'distance_miles', 'year_built', 'total_units',
    'unit_type', 'bedrooms', 'bathrooms', 'avg_sqft', 'asking_rent',
    'effective_rent', 'concessions', 'amenities', 'notes', 'data_source',
    'as_of_date', 'is_active'
]


@register_tool('get_rental_comparables')
def handle_get_rental_comparables(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get rental comparables for a project."""
    limit = tool_input.get('limit', 100)
    unit_type = tool_input.get('unit_type')
    active_only = tool_input.get('active_only', True)

    try:
        with connection.cursor() as cursor:
            query = """
                SELECT comparable_id, property_name, address, distance_miles,
                       year_built, total_units, unit_type, bedrooms, bathrooms,
                       avg_sqft, asking_rent, effective_rent, concessions,
                       amenities, notes, data_source, as_of_date, is_active
                FROM landscape.tbl_rent_comparable
                WHERE project_id = %s
            """
            params = [project_id]

            if active_only:
                query += " AND is_active = true"
            if unit_type:
                query += " AND unit_type = %s"
                params.append(unit_type)

            query += " ORDER BY distance_miles, property_name LIMIT %s"
            params.append(limit)

            cursor.execute(query, params)

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                # Convert Decimal to float
                for key in ['distance_miles', 'bedrooms', 'bathrooms', 'asking_rent', 'effective_rent']:
                    if record.get(key) is not None:
                        record[key] = float(record[key])
                if record.get('as_of_date'):
                    record['as_of_date'] = str(record['as_of_date'])
                records.append(record)

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error getting rental comparables: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_rental_comparable', is_mutation=True)
def handle_update_rental_comparable(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update a rental comparable."""
    reason = tool_input.get('reason', 'Update rental comparable')

    comparable_id = tool_input.get('comparable_id')
    property_name = tool_input.get('property_name')
    unit_type = tool_input.get('unit_type')

    if not property_name and not comparable_id:
        return {'success': False, 'error': 'property_name or comparable_id required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='comparable_upsert',
            table_name='tbl_rent_comparable',
            field_name=None,
            record_id=str(comparable_id) if comparable_id else None,
            proposed_value={k: v for k, v in tool_input.items() if k in RENTAL_COMP_COLUMNS},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Check if exists - by comparable_id or by property_name + unit_type
            existing = None
            if comparable_id:
                cursor.execute("""
                    SELECT comparable_id FROM landscape.tbl_rent_comparable
                    WHERE comparable_id = %s AND project_id = %s
                """, [comparable_id, project_id])
                existing = cursor.fetchone()
            elif property_name and unit_type:
                cursor.execute("""
                    SELECT comparable_id FROM landscape.tbl_rent_comparable
                    WHERE project_id = %s AND property_name = %s AND unit_type = %s
                """, [project_id, property_name, unit_type])
                existing = cursor.fetchone()
            elif property_name:
                cursor.execute("""
                    SELECT comparable_id FROM landscape.tbl_rent_comparable
                    WHERE project_id = %s AND property_name = %s
                    LIMIT 1
                """, [project_id, property_name])
                existing = cursor.fetchone()

            # Build update dict
            updates = {k: v for k, v in tool_input.items()
                      if k in RENTAL_COMP_COLUMNS and v is not None}

            if existing:
                # Update
                existing_id = existing[0]
                if updates:
                    set_clauses = ', '.join([f"{col} = %s" for col in updates.keys()])
                    values = list(updates.values()) + [existing_id]
                    cursor.execute(f"""
                        UPDATE landscape.tbl_rent_comparable
                        SET {set_clauses}, updated_at = NOW()
                        WHERE comparable_id = %s
                    """, values)

                _log_comparables_activity(project_id, 'tbl_rent_comparable', 'update', 1, reason)
                return {
                    'success': True,
                    'action': 'updated',
                    'comparable_id': existing_id,
                    'property_name': property_name or updates.get('property_name')
                }
            else:
                # Insert - property_name is required
                if not property_name:
                    return {'success': False, 'error': 'property_name required for new rental comparable'}

                updates['property_name'] = property_name
                col_names = ['project_id'] + list(updates.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = [project_id] + list(updates.values())

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_rent_comparable ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING comparable_id
                """, values)
                new_id = cursor.fetchone()[0]

                _log_comparables_activity(project_id, 'tbl_rent_comparable', 'create', 1, reason)
                return {
                    'success': True,
                    'action': 'created',
                    'comparable_id': new_id,
                    'property_name': property_name
                }

    except Exception as e:
        logger.error(f"Error updating rental comparable: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_rental_comparable', is_mutation=True)
def handle_delete_rental_comparable(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a rental comparable."""
    comparable_id = tool_input.get('comparable_id')
    reason = tool_input.get('reason', 'Delete rental comparable')

    if not comparable_id:
        return {'success': False, 'error': 'comparable_id required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='comparable_delete',
            table_name='tbl_rent_comparable',
            field_name=None,
            record_id=str(comparable_id),
            proposed_value={'delete': True, 'comparable_id': comparable_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Get property name for logging
            cursor.execute("""
                SELECT property_name FROM landscape.tbl_rent_comparable
                WHERE comparable_id = %s AND project_id = %s
            """, [comparable_id, project_id])
            row = cursor.fetchone()

            if not row:
                return {'success': False, 'error': f'Comparable {comparable_id} not found'}

            property_name = row[0]

            cursor.execute("""
                DELETE FROM landscape.tbl_rent_comparable
                WHERE comparable_id = %s AND project_id = %s
            """, [comparable_id, project_id])

            _log_comparables_activity(project_id, 'tbl_rent_comparable', 'delete', 1, reason)
            return {
                'success': True,
                'action': 'deleted',
                'comparable_id': comparable_id,
                'property_name': property_name
            }

    except Exception as e:
        logger.error(f"Error deleting rental comparable: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Capital Stack Tools - Loans
# ─────────────────────────────────────────────────────────────────────────────

LOAN_COLUMNS = [
    'loan_name', 'loan_type', 'structure_type', 'lender_name', 'commitment_amount',
    'loan_amount', 'interest_rate_pct', 'interest_type', 'interest_index',
    'interest_spread_bps', 'loan_term_months', 'loan_term_years',
    'amortization_months', 'amortization_years', 'interest_only_months',
    'payment_frequency', 'origination_fee_pct', 'exit_fee_pct',
    'loan_to_cost_pct', 'loan_to_value_pct', 'seniority', 'status',
    'loan_start_date', 'loan_maturity_date', 'notes'
]

EQUITY_STRUCTURE_COLUMNS = [
    'lp_ownership_pct', 'gp_ownership_pct', 'preferred_return_pct',
    'gp_promote_after_pref', 'catch_up_pct', 'equity_multiple_target',
    'irr_target_pct', 'distribution_frequency'
]

WATERFALL_TIER_COLUMNS = [
    'tier_number', 'tier_name', 'tier_description', 'hurdle_type', 'hurdle_rate',
    'lp_split_pct', 'gp_split_pct', 'has_catch_up', 'catch_up_pct',
    'irr_threshold_pct', 'equity_multiple_threshold', 'is_pari_passu',
    'is_lookback_tier', 'catch_up_to_pct', 'is_active', 'display_order'
]


def _log_capital_stack_activity(project_id: int, table_name: str, action: str,
                                 count: int, reason: str) -> None:
    """Log capital stack operations to landscaper_activity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.landscaper_activity
                (project_id, activity_type, title, summary, details, created_at)
                VALUES (%s, %s, %s, %s, %s::jsonb, NOW())
            """, [
                project_id,
                'update',
                f'Capital stack {action}',
                f'{action.title()}d {count} record(s) in {table_name}',
                json.dumps({
                    'table': table_name,
                    'action': action,
                    'count': count,
                    'reason': reason
                })
            ])
    except Exception as e:
        logger.warning(f"Failed to log capital stack activity: {e}")


@register_tool('get_loans')
def handle_get_loans(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get loans for a project."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT loan_id, loan_name, loan_type, structure_type, lender_name,
                       commitment_amount, loan_amount, interest_rate_pct, interest_type,
                       interest_index, interest_spread_bps, loan_term_months, loan_term_years,
                       amortization_months, amortization_years, interest_only_months,
                       payment_frequency, origination_fee_pct, exit_fee_pct, loan_to_cost_pct,
                       loan_to_value_pct, seniority, status, loan_start_date,
                       loan_maturity_date, notes
                FROM landscape.tbl_loan
                WHERE project_id = %s
                ORDER BY loan_name
            """, [project_id])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                # Convert Decimal to float
                for key in ['commitment_amount', 'loan_amount', 'interest_rate_pct', 'interest_spread_bps',
                           'origination_fee_pct', 'exit_fee_pct', 'loan_to_cost_pct', 'loan_to_value_pct']:
                    if record.get(key) is not None:
                        record[key] = float(record[key])
                # Handle dates
                for key in ['loan_start_date', 'loan_maturity_date']:
                    if record.get(key):
                        record[key] = str(record[key])
                records.append(record)

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error getting loans: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_loan', is_mutation=True)
def handle_update_loan(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update a loan."""
    reason = tool_input.get('reason', 'Update loan')

    loan_id = tool_input.get('loan_id')
    loan_name = tool_input.get('loan_name')

    if not loan_name and not loan_id:
        return {'success': False, 'error': 'loan_name or loan_id required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='capital_stack_upsert',
            table_name='tbl_loan',
            field_name=None,
            record_id=str(loan_id) if loan_id else None,
            proposed_value={k: v for k, v in tool_input.items() if k in LOAN_COLUMNS},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Check if exists
            existing = None
            if loan_id:
                cursor.execute("""
                    SELECT loan_id FROM landscape.tbl_loan
                    WHERE loan_id = %s AND project_id = %s
                """, [loan_id, project_id])
                existing = cursor.fetchone()
            elif loan_name:
                cursor.execute("""
                    SELECT loan_id FROM landscape.tbl_loan
                    WHERE project_id = %s AND loan_name = %s
                """, [project_id, loan_name])
                existing = cursor.fetchone()

            # Build update dict
            updates = {k: v for k, v in tool_input.items()
                      if k in LOAN_COLUMNS and v is not None}

            if existing:
                # Update
                existing_id = existing[0]
                if updates:
                    set_clauses = ', '.join([f"{col} = %s" for col in updates.keys()])
                    values = list(updates.values()) + [existing_id]
                    cursor.execute(f"""
                        UPDATE landscape.tbl_loan
                        SET {set_clauses}, updated_at = NOW()
                        WHERE loan_id = %s
                    """, values)

                _log_capital_stack_activity(project_id, 'tbl_loan', 'update', 1, reason)
                return {
                    'success': True,
                    'action': 'updated',
                    'loan_id': existing_id,
                    'loan_name': loan_name or updates.get('loan_name')
                }
            else:
                # Insert - loan_name and loan_type are required
                if not loan_name:
                    return {'success': False, 'error': 'loan_name required for new loan'}
                if not tool_input.get('loan_type'):
                    return {'success': False, 'error': 'loan_type required for new loan'}
                if tool_input.get('commitment_amount') is None and tool_input.get('loan_amount') is None:
                    return {'success': False, 'error': 'commitment_amount or loan_amount required'}
                if tool_input.get('interest_rate_pct') is None:
                    return {'success': False, 'error': 'interest_rate_pct required'}

                updates['loan_name'] = loan_name
                updates['loan_type'] = tool_input.get('loan_type')
                # Set defaults for required fields
                if 'commitment_amount' not in updates:
                    updates['commitment_amount'] = tool_input.get('loan_amount', 0)
                if 'interest_rate_pct' not in updates:
                    updates['interest_rate_pct'] = tool_input.get('interest_rate_pct', 0)

                col_names = ['project_id'] + list(updates.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = [project_id] + list(updates.values())

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_loan ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING loan_id
                """, values)
                new_id = cursor.fetchone()[0]

                _log_capital_stack_activity(project_id, 'tbl_loan', 'create', 1, reason)
                return {
                    'success': True,
                    'action': 'created',
                    'loan_id': new_id,
                    'loan_name': loan_name
                }

    except Exception as e:
        logger.error(f"Error updating loan: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_loan', is_mutation=True)
def handle_delete_loan(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a loan."""
    loan_id = tool_input.get('loan_id')
    reason = tool_input.get('reason', 'Delete loan')

    if not loan_id:
        return {'success': False, 'error': 'loan_id required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='capital_stack_delete',
            table_name='tbl_loan',
            field_name=None,
            record_id=str(loan_id),
            proposed_value={'delete': True, 'loan_id': loan_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Get loan name for logging
            cursor.execute("""
                SELECT loan_name FROM landscape.tbl_loan
                WHERE loan_id = %s AND project_id = %s
            """, [loan_id, project_id])
            row = cursor.fetchone()

            if not row:
                return {'success': False, 'error': f'Loan {loan_id} not found'}

            loan_name = row[0]

            cursor.execute("""
                DELETE FROM landscape.tbl_loan
                WHERE loan_id = %s AND project_id = %s
            """, [loan_id, project_id])

            _log_capital_stack_activity(project_id, 'tbl_loan', 'delete', 1, reason)
            return {
                'success': True,
                'action': 'deleted',
                'loan_id': loan_id,
                'loan_name': loan_name
            }

    except Exception as e:
        logger.error(f"Error deleting loan: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Capital Stack Tools - Equity Structure
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_equity_structure')
def handle_get_equity_structure(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get equity structure for a project."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT equity_structure_id, lp_ownership_pct, gp_ownership_pct,
                       preferred_return_pct, gp_promote_after_pref, catch_up_pct,
                       equity_multiple_target, irr_target_pct, distribution_frequency
                FROM landscape.tbl_equity_structure
                WHERE project_id = %s
            """, [project_id])

            row = cursor.fetchone()
            if not row:
                return {
                    'success': True,
                    'exists': False,
                    'data': None
                }

            columns = [col[0] for col in cursor.description]
            record = dict(zip(columns, row))

            # Convert Decimal to float
            for key in ['lp_ownership_pct', 'gp_ownership_pct', 'preferred_return_pct',
                       'gp_promote_after_pref', 'catch_up_pct', 'equity_multiple_target', 'irr_target_pct']:
                if record.get(key) is not None:
                    record[key] = float(record[key])

            return {
                'success': True,
                'exists': True,
                'data': record
            }

    except Exception as e:
        logger.error(f"Error getting equity structure: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_equity_structure', is_mutation=True)
def handle_update_equity_structure(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Update equity structure for a project (upsert pattern)."""
    reason = tool_input.get('reason', 'Update equity structure')

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='capital_stack_upsert',
            table_name='tbl_equity_structure',
            field_name=None,
            proposed_value={k: v for k, v in tool_input.items() if k in EQUITY_STRUCTURE_COLUMNS},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Check if exists
            cursor.execute("""
                SELECT equity_structure_id FROM landscape.tbl_equity_structure
                WHERE project_id = %s
            """, [project_id])
            existing = cursor.fetchone()

            # Build update dict
            updates = {k: v for k, v in tool_input.items()
                      if k in EQUITY_STRUCTURE_COLUMNS and v is not None}

            if existing:
                # Update
                equity_id = existing[0]
                if updates:
                    set_clauses = ', '.join([f"{col} = %s" for col in updates.keys()])
                    values = list(updates.values()) + [equity_id]
                    cursor.execute(f"""
                        UPDATE landscape.tbl_equity_structure
                        SET {set_clauses}, updated_at = NOW()
                        WHERE equity_structure_id = %s
                    """, values)

                _log_capital_stack_activity(project_id, 'tbl_equity_structure', 'update', 1, reason)
                return {
                    'success': True,
                    'action': 'updated',
                    'equity_structure_id': equity_id,
                    'fields_updated': list(updates.keys())
                }
            else:
                # Insert - lp and gp ownership are required
                lp_pct = tool_input.get('lp_ownership_pct')
                gp_pct = tool_input.get('gp_ownership_pct')
                pref_return = tool_input.get('preferred_return_pct', 0.08)

                if lp_pct is None or gp_pct is None:
                    return {'success': False, 'error': 'lp_ownership_pct and gp_ownership_pct required'}

                updates['lp_ownership_pct'] = lp_pct
                updates['gp_ownership_pct'] = gp_pct
                updates['preferred_return_pct'] = pref_return

                col_names = ['project_id'] + list(updates.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = [project_id] + list(updates.values())

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_equity_structure ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING equity_structure_id
                """, values)
                new_id = cursor.fetchone()[0]

                _log_capital_stack_activity(project_id, 'tbl_equity_structure', 'create', 1, reason)
                return {
                    'success': True,
                    'action': 'created',
                    'equity_structure_id': new_id
                }

    except Exception as e:
        logger.error(f"Error updating equity structure: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Capital Stack Tools - Waterfall Tiers
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_waterfall_tiers')
def handle_get_waterfall_tiers(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get waterfall tiers for a project."""
    try:
        with connection.cursor() as cursor:
            # First get equity_structure_id
            cursor.execute("""
                SELECT equity_structure_id FROM landscape.tbl_equity_structure
                WHERE project_id = %s
            """, [project_id])
            eq_row = cursor.fetchone()

            if not eq_row:
                return {
                    'success': True,
                    'count': 0,
                    'records': [],
                    'note': 'No equity structure exists for this project'
                }

            equity_structure_id = eq_row[0]

            cursor.execute("""
                SELECT tier_id, tier_number, tier_name, tier_description,
                       hurdle_type, hurdle_rate, irr_threshold_pct, equity_multiple_threshold,
                       lp_split_pct, gp_split_pct, has_catch_up, catch_up_pct, catch_up_to_pct,
                       is_pari_passu, is_lookback_tier, is_active, display_order
                FROM landscape.tbl_waterfall_tier
                WHERE equity_structure_id = %s OR project_id = %s
                ORDER BY COALESCE(display_order, tier_number)
            """, [equity_structure_id, project_id])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                # Convert Decimal to float
                for key in ['hurdle_rate', 'irr_threshold_pct', 'equity_multiple_threshold',
                           'lp_split_pct', 'gp_split_pct', 'catch_up_pct', 'catch_up_to_pct']:
                    if record.get(key) is not None:
                        record[key] = float(record[key])
                records.append(record)

            return {
                'success': True,
                'count': len(records),
                'equity_structure_id': equity_structure_id,
                'records': records
            }

    except Exception as e:
        logger.error(f"Error getting waterfall tiers: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_waterfall_tiers', is_mutation=True)
def handle_update_waterfall_tiers(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Add or update waterfall tiers for a project."""
    records = tool_input.get('records', [])
    reason = tool_input.get('reason', 'Update waterfall tiers')

    if not records:
        return {'success': False, 'error': 'No records provided'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='capital_stack_upsert',
            table_name='tbl_waterfall_tier',
            field_name=None,
            proposed_value={'records': records, 'count': len(records)},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # First get or create equity_structure_id
            cursor.execute("""
                SELECT equity_structure_id FROM landscape.tbl_equity_structure
                WHERE project_id = %s
            """, [project_id])
            eq_row = cursor.fetchone()

            if not eq_row:
                return {
                    'success': False,
                    'error': 'No equity structure exists. Create one first with update_equity_structure.'
                }

            equity_structure_id = eq_row[0]

            created_count = 0
            updated_count = 0
            results = []

            for record in records:
                tier_id = record.get('tier_id')
                tier_number = record.get('tier_number')

                if not tier_number and not tier_id:
                    results.append({'success': False, 'error': 'tier_number or tier_id required'})
                    continue

                # Check if exists
                existing = None
                if tier_id:
                    cursor.execute("""
                        SELECT tier_id FROM landscape.tbl_waterfall_tier
                        WHERE tier_id = %s AND (equity_structure_id = %s OR project_id = %s)
                    """, [tier_id, equity_structure_id, project_id])
                    existing = cursor.fetchone()
                elif tier_number:
                    cursor.execute("""
                        SELECT tier_id FROM landscape.tbl_waterfall_tier
                        WHERE tier_number = %s AND (equity_structure_id = %s OR project_id = %s)
                    """, [tier_number, equity_structure_id, project_id])
                    existing = cursor.fetchone()

                # Build update dict
                updates = {k: v for k, v in record.items()
                          if k in WATERFALL_TIER_COLUMNS and v is not None}

                if existing:
                    # Update
                    existing_id = existing[0]
                    if updates:
                        set_clauses = ', '.join([f"{col} = %s" for col in updates.keys()])
                        values = list(updates.values()) + [existing_id]
                        cursor.execute(f"""
                            UPDATE landscape.tbl_waterfall_tier
                            SET {set_clauses}, updated_at = NOW()
                            WHERE tier_id = %s
                        """, values)
                    updated_count += 1
                    results.append({'success': True, 'action': 'updated', 'tier_id': existing_id, 'tier_number': tier_number})
                else:
                    # Insert
                    if not tier_number:
                        results.append({'success': False, 'error': 'tier_number required for new tier'})
                        continue

                    updates['tier_number'] = tier_number
                    col_names = ['equity_structure_id', 'project_id'] + list(updates.keys())
                    placeholders = ', '.join(['%s'] * len(col_names))
                    values = [equity_structure_id, project_id] + list(updates.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.tbl_waterfall_tier ({', '.join(col_names)})
                        VALUES ({placeholders})
                        RETURNING tier_id
                    """, values)
                    new_id = cursor.fetchone()[0]
                    created_count += 1
                    results.append({'success': True, 'action': 'created', 'tier_id': new_id, 'tier_number': tier_number})

            _log_capital_stack_activity(project_id, 'tbl_waterfall_tier', 'batch_upsert',
                                        created_count + updated_count, reason)

            return {
                'success': True,
                'created': created_count,
                'updated': updated_count,
                'records': results
            }

    except Exception as e:
        logger.error(f"Error updating waterfall tiers: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Budget & Category Tools
# ─────────────────────────────────────────────────────────────────────────────

# Category columns for updates
CATEGORY_COLUMNS = [
    'parent_id', 'category_name', 'account_number', 'account_level',
    'sort_order', 'is_active', 'tags', 'is_calculated', 'property_types'
]

# Budget item columns for updates (100% coverage of core_fin_fact_budget)
BUDGET_ITEM_COLUMNS = [
    # Core fields
    'budget_id', 'category_id', 'uom_code', 'qty', 'rate', 'amount',
    'notes', 'internal_memo', 'division_id', 'confidence_level', 'confidence_code',
    # Vendor/Contract
    'vendor_name', 'vendor_contact_id', 'contract_number', 'purchase_order',
    # Timing - dates
    'start_date', 'end_date', 'baseline_start_date', 'baseline_end_date',
    'actual_start_date', 'actual_end_date', 'early_start_date', 'late_finish_date',
    # Timing - periods
    'start_period', 'periods_to_complete', 'end_period', 'timing_method',
    # Cost tracking
    'escalation_rate', 'escalation_method', 'contingency_pct', 'contingency_mode',
    'cost_type', 'tax_treatment', 'is_committed', 'is_reimbursable',
    # S-curve
    'curve_profile', 'curve_steepness', 'scope_override',
    # Schedule control
    'status', 'percent_complete', 'is_critical', 'float_days', 'milestone_id',
    # Approval & versioning
    'approval_status', 'approved_by', 'approval_date',
    'budget_version', 'version_as_of_date',
    # Bid tracking
    'bid_date', 'bid_amount', 'bid_variance',
    # Funding
    'funding_draw_pct', 'draw_schedule', 'retention_pct',
    'payment_terms', 'invoice_frequency', 'finance_structure_id',
    # Allocation
    'cost_allocation', 'allocation_method', 'allocated_total', 'allocation_variance',
    'cf_start_flag', 'cf_distribution',
    # Change orders & docs
    'change_order_count', 'change_order_total', 'document_count',
    # Category & grouping
    'category_l1_id', 'category_l2_id', 'category_l3_id', 'category_l4_id',
    'growth_rate_set_id', 'scenario_id', 'activity', 'new_category_id', 'curve_id'
]


def _log_budget_activity(project_id: int, table: str, action: str, count: int, reason: str):
    """Log budget-related activity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.landscaper_activity
                (project_id, activity_type, title, summary, status, details, is_read, created_at, updated_at)
                VALUES (%s, 'update', %s, %s, 'completed', %s::jsonb, false, NOW(), NOW())
            """, [
                project_id,
                f"Budget {action}",
                f"{count} items in {table.replace('_', ' ')}",
                json.dumps({'table': table, 'action': action, 'count': count, 'reason': reason})
            ])
    except Exception as e:
        logger.warning(f"Failed to log budget activity: {e}")


@register_tool('get_budget_categories')
def handle_get_budget_categories(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get budget cost categories (hierarchical classification system)."""
    parent_id = tool_input.get('parent_id')
    account_level = tool_input.get('account_level')
    active_only = tool_input.get('active_only', True)

    try:
        with connection.cursor() as cursor:
            # Build WHERE clause
            conditions = []
            params = []

            if parent_id is not None:
                conditions.append("parent_id = %s")
                params.append(parent_id)
            elif parent_id is None and 'parent_id' in tool_input:
                # Explicitly looking for top-level (null parent)
                conditions.append("parent_id IS NULL")

            if account_level is not None:
                conditions.append("account_level = %s")
                params.append(account_level)

            if active_only:
                conditions.append("is_active = true")

            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

            cursor.execute(f"""
                SELECT category_id, parent_id, category_name, account_number,
                       account_level, sort_order, is_active, tags,
                       is_calculated, property_types
                FROM landscape.core_unit_cost_category
                {where_clause}
                ORDER BY account_level, sort_order, category_name
            """, params)

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                # Convert JSONB/array fields
                if record.get('tags'):
                    record['tags'] = record['tags'] if isinstance(record['tags'], list) else []
                if record.get('property_types'):
                    record['property_types'] = list(record['property_types']) if record['property_types'] else []
                records.append(record)

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error fetching budget categories: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_budget_category', is_mutation=True)
def handle_update_budget_category(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a budget category."""
    category_id = tool_input.get('category_id')
    category_name = tool_input.get('category_name')
    reason = tool_input.get('reason', 'Update budget category')

    if not category_name and not category_id:
        return {'success': False, 'error': 'category_name required for new categories'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='budget_upsert',
            table_name='core_unit_cost_category',
            field_name=None,
            proposed_value=tool_input,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if category_id:
                # Update existing
                updates = {k: v for k, v in tool_input.items()
                           if k in CATEGORY_COLUMNS and v is not None}

                if not updates:
                    return {'success': False, 'error': 'No valid fields to update'}

                # Handle JSONB fields
                if 'tags' in updates:
                    updates['tags'] = json.dumps(updates['tags'])
                if 'property_types' in updates:
                    updates['property_types'] = updates['property_types']

                set_parts = [f"{k} = %s" for k in updates.keys()]
                set_parts.append("updated_at = NOW()")
                values = list(updates.values()) + [category_id]

                cursor.execute(f"""
                    UPDATE landscape.core_unit_cost_category
                    SET {', '.join(set_parts)}
                    WHERE category_id = %s
                    RETURNING category_id, category_name
                """, values)

                row = cursor.fetchone()
                if not row:
                    return {'success': False, 'error': f'Category {category_id} not found'}

                _log_budget_activity(project_id, 'core_unit_cost_category', 'update', 1, reason)

                return {
                    'success': True,
                    'action': 'updated',
                    'category_id': row[0],
                    'category_name': row[1],
                    'fields_updated': list(updates.keys())
                }

            else:
                # Insert new
                fields = {'category_name': category_name}
                for col in CATEGORY_COLUMNS:
                    if col in tool_input and tool_input[col] is not None:
                        fields[col] = tool_input[col]

                # Handle JSONB fields
                if 'tags' in fields:
                    fields['tags'] = json.dumps(fields['tags'])

                col_names = list(fields.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = list(fields.values())

                cursor.execute(f"""
                    INSERT INTO landscape.core_unit_cost_category ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING category_id, category_name
                """, values)

                row = cursor.fetchone()
                _log_budget_activity(project_id, 'core_unit_cost_category', 'create', 1, reason)

                return {
                    'success': True,
                    'action': 'created',
                    'category_id': row[0],
                    'category_name': row[1]
                }

    except Exception as e:
        logger.error(f"Error updating budget category: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('get_budget_items')
def handle_get_budget_items(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get budget line items for a project."""
    category_id = tool_input.get('category_id')
    limit = tool_input.get('limit', 500)

    try:
        with connection.cursor() as cursor:
            conditions = ["f.project_id = %s"]
            params = [project_id]

            if category_id:
                conditions.append("f.category_id = %s")
                params.append(category_id)

            where_clause = " AND ".join(conditions)

            cursor.execute(f"""
                SELECT f.fact_id, f.project_id, f.budget_id, f.category_id,
                       c.category_name, c.account_number, c.account_level,
                       f.uom_code, f.qty, f.rate, f.amount,
                       f.start_date, f.end_date, f.notes,
                       f.vendor_name, f.status, f.is_committed,
                       f.contingency_pct, f.escalation_rate,
                       f.start_period, f.periods_to_complete, f.end_period,
                       f.cost_type, f.activity, f.confidence_code
                FROM landscape.core_fin_fact_budget f
                LEFT JOIN landscape.core_unit_cost_category c ON f.category_id = c.category_id
                WHERE {where_clause}
                ORDER BY c.account_level, c.sort_order, f.fact_id
                LIMIT %s
            """, params + [limit])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                # Convert Decimal to float for JSON serialization
                for key in ['qty', 'rate', 'amount', 'contingency_pct', 'escalation_rate']:
                    if record.get(key) is not None:
                        record[key] = float(record[key])
                records.append(record)

            # Calculate summary
            total_amount = sum(r.get('amount', 0) or 0 for r in records)

            return {
                'success': True,
                'count': len(records),
                'total_amount': total_amount,
                'records': records
            }

    except Exception as e:
        logger.error(f"Error fetching budget items: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_budget_item', is_mutation=True)
def handle_update_budget_item(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a budget line item."""
    fact_id = tool_input.get('fact_id')
    reason = tool_input.get('reason', 'Update budget item')

    # For new items, require certain fields
    if not fact_id:
        if not tool_input.get('uom_code'):
            tool_input['uom_code'] = 'EA'  # Default unit of measure

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='budget_upsert',
            table_name='core_fin_fact_budget',
            field_name=None,
            record_id=str(fact_id) if fact_id else None,
            proposed_value=tool_input,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if fact_id:
                # Update existing
                updates = {k: v for k, v in tool_input.items()
                           if k in BUDGET_ITEM_COLUMNS and v is not None}

                if not updates:
                    return {'success': False, 'error': 'No valid fields to update'}

                set_parts = [f"{k} = %s" for k in updates.keys()]
                values = list(updates.values()) + [fact_id]

                cursor.execute(f"""
                    UPDATE landscape.core_fin_fact_budget
                    SET {', '.join(set_parts)}
                    WHERE fact_id = %s
                    RETURNING fact_id, category_id, amount
                """, values)

                row = cursor.fetchone()
                if not row:
                    return {'success': False, 'error': f'Budget item {fact_id} not found'}

                _log_budget_activity(project_id, 'core_fin_fact_budget', 'update', 1, reason)

                return {
                    'success': True,
                    'action': 'updated',
                    'fact_id': row[0],
                    'category_id': row[1],
                    'amount': float(row[2]) if row[2] else None,
                    'fields_updated': list(updates.keys())
                }

            else:
                # Insert new - need budget_id first
                # Check if project has a budget, create one if not
                cursor.execute("""
                    SELECT budget_id FROM landscape.tbl_budget
                    WHERE devphase_id IN (
                        SELECT phase_id FROM landscape.tbl_phase WHERE project_id = %s
                    )
                    LIMIT 1
                """, [project_id])
                budget_row = cursor.fetchone()

                if budget_row:
                    budget_id = budget_row[0]
                else:
                    # Create a default budget entry
                    cursor.execute("""
                        INSERT INTO landscape.tbl_budget (budget_category, amount)
                        VALUES ('Development Budget', 0)
                        RETURNING budget_id
                    """)
                    budget_id = cursor.fetchone()[0]

                fields = {
                    'project_id': project_id,
                    'budget_id': budget_id,
                    'uom_code': tool_input.get('uom_code', 'EA')
                }

                for col in BUDGET_ITEM_COLUMNS:
                    if col in tool_input and tool_input[col] is not None:
                        fields[col] = tool_input[col]

                col_names = list(fields.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = list(fields.values())

                cursor.execute(f"""
                    INSERT INTO landscape.core_fin_fact_budget ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING fact_id, category_id, amount
                """, values)

                row = cursor.fetchone()
                _log_budget_activity(project_id, 'core_fin_fact_budget', 'create', 1, reason)

                return {
                    'success': True,
                    'action': 'created',
                    'fact_id': row[0],
                    'category_id': row[1],
                    'amount': float(row[2]) if row[2] else None
                }

    except Exception as e:
        logger.error(f"Error updating budget item: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_budget_item', is_mutation=True)
def handle_delete_budget_item(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a budget line item."""
    fact_id = tool_input.get('fact_id')
    reason = tool_input.get('reason', 'Delete budget item')

    if not fact_id:
        return {'success': False, 'error': 'fact_id is required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='budget_delete',
            table_name='core_fin_fact_budget',
            field_name=None,
            record_id=str(fact_id),
            proposed_value={'delete': True, 'fact_id': fact_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Verify ownership and get details
            cursor.execute("""
                SELECT fact_id, category_id, amount, notes
                FROM landscape.core_fin_fact_budget
                WHERE fact_id = %s AND project_id = %s
            """, [fact_id, project_id])

            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'Budget item {fact_id} not found for this project'}

            deleted_info = {
                'fact_id': row[0],
                'category_id': row[1],
                'amount': float(row[2]) if row[2] else None,
                'notes': row[3]
            }

            # Delete
            cursor.execute("""
                DELETE FROM landscape.core_fin_fact_budget
                WHERE fact_id = %s AND project_id = %s
            """, [fact_id, project_id])

            _log_budget_activity(project_id, 'core_fin_fact_budget', 'delete', 1, reason)

            return {
                'success': True,
                'action': 'deleted',
                'deleted_item': deleted_info
            }

    except Exception as e:
        logger.error(f"Error deleting budget item: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Planning Hierarchy Tools (Areas, Phases, Parcels, Milestones)
# ─────────────────────────────────────────────────────────────────────────────

# Area columns for updates
AREA_COLUMNS = ['area_alias', 'area_no']

# Phase columns for updates
PHASE_COLUMNS = [
    'phase_name', 'phase_no', 'label', 'description', 'phase_status',
    'phase_start_date', 'phase_completion_date', 'absorption_start_date'
]

# Parcel columns for updates
PARCEL_COLUMNS = [
    'parcel_name', 'parcel_code', 'landuse_code', 'landuse_type',
    'acres_gross', 'lot_width', 'lot_depth', 'lot_product', 'lot_area',
    'units_total', 'lots_frontfeet', 'planning_loss', 'plan_efficiency',
    'saledate', 'saleprice', 'lot_type_id', 'family_name', 'density_code',
    'type_code', 'product_code', 'site_coverage_pct', 'setback_front_ft',
    'setback_side_ft', 'setback_rear_ft', 'subtype_id', 'building_name',
    'building_class', 'year_built', 'year_renovated', 'rentable_sf',
    'common_area_sf', 'load_factor_pct', 'parking_spaces', 'parking_ratio',
    'is_income_property', 'property_metadata', 'description',
    'sale_phase_code', 'custom_sale_date', 'has_sale_overrides', 'sale_period'
]

# Milestone columns for updates
MILESTONE_COLUMNS = [
    'milestone_name', 'milestone_type', 'target_date', 'actual_date',
    'status', 'predecessor_milestone_id', 'notes', 'source_doc_id',
    'confidence_score', 'created_by'
]


def _log_planning_activity(project_id: int, table: str, action: str, count: int, reason: str):
    """Log planning hierarchy activity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.landscaper_activity
                (project_id, activity_type, title, summary, status, details, is_read, created_at, updated_at)
                VALUES (%s, 'update', %s, %s, 'completed', %s::jsonb, false, NOW(), NOW())
            """, [
                project_id,
                f"Planning {action}",
                f"{count} items in {table.replace('tbl_', '').replace('_', ' ')}",
                json.dumps({'table': table, 'action': action, 'count': count, 'reason': reason})
            ])
    except Exception as e:
        logger.warning(f"Failed to log planning activity: {e}")


# ============ AREA TOOLS ============

@register_tool('get_areas')
def handle_get_areas(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get planning areas for a project."""
    area_id = tool_input.get('area_id')

    try:
        with connection.cursor() as cursor:
            if area_id:
                cursor.execute("""
                    SELECT a.area_id, a.project_id, a.area_alias, a.area_no,
                           COUNT(DISTINCT ph.phase_id) as phase_count,
                           COUNT(DISTINCT pa.parcel_id) as parcel_count
                    FROM landscape.tbl_area a
                    LEFT JOIN landscape.tbl_phase ph ON ph.area_id = a.area_id
                    LEFT JOIN landscape.tbl_parcel pa ON pa.phase_id = ph.phase_id
                    WHERE a.area_id = %s AND a.project_id = %s
                    GROUP BY a.area_id
                """, [area_id, project_id])
            else:
                cursor.execute("""
                    SELECT a.area_id, a.project_id, a.area_alias, a.area_no,
                           COUNT(DISTINCT ph.phase_id) as phase_count,
                           COUNT(DISTINCT pa.parcel_id) as parcel_count
                    FROM landscape.tbl_area a
                    LEFT JOIN landscape.tbl_phase ph ON ph.area_id = a.area_id
                    LEFT JOIN landscape.tbl_parcel pa ON pa.phase_id = ph.phase_id
                    WHERE a.project_id = %s
                    GROUP BY a.area_id
                    ORDER BY a.area_no, a.area_alias
                """, [project_id])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = [dict(zip(columns, row)) for row in rows]

            if area_id and records:
                return {'success': True, 'exists': True, 'data': records[0]}

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error fetching areas: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_area', is_mutation=True)
def handle_update_area(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a planning area."""
    area_id = tool_input.get('area_id')
    area_alias = tool_input.get('area_alias')
    reason = tool_input.get('reason', 'Update area')

    if not area_alias and not area_id:
        return {'success': False, 'error': 'area_alias required for new areas'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='planning_upsert',
            table_name='tbl_area',
            field_name=None,
            record_id=str(area_id) if area_id else None,
            proposed_value=tool_input,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if area_id:
                # Update existing
                updates = {k: v for k, v in tool_input.items()
                           if k in AREA_COLUMNS and v is not None}

                if not updates:
                    return {'success': False, 'error': 'No valid fields to update'}

                set_parts = [f"{k} = %s" for k in updates.keys()]
                values = list(updates.values()) + [area_id, project_id]

                cursor.execute(f"""
                    UPDATE landscape.tbl_area
                    SET {', '.join(set_parts)}
                    WHERE area_id = %s AND project_id = %s
                    RETURNING area_id, area_alias
                """, values)

                row = cursor.fetchone()
                if not row:
                    return {'success': False, 'error': f'Area {area_id} not found'}

                _log_planning_activity(project_id, 'tbl_area', 'update', 1, reason)

                return {
                    'success': True,
                    'action': 'updated',
                    'area_id': row[0],
                    'area_alias': row[1],
                    'fields_updated': list(updates.keys())
                }

            else:
                # Insert new
                # Get next area_no
                cursor.execute("""
                    SELECT COALESCE(MAX(area_no), 0) + 1
                    FROM landscape.tbl_area WHERE project_id = %s
                """, [project_id])
                next_no = cursor.fetchone()[0]

                area_no = tool_input.get('area_no', next_no)

                cursor.execute("""
                    INSERT INTO landscape.tbl_area (project_id, area_alias, area_no)
                    VALUES (%s, %s, %s)
                    RETURNING area_id, area_alias
                """, [project_id, area_alias, area_no])

                row = cursor.fetchone()
                _log_planning_activity(project_id, 'tbl_area', 'create', 1, reason)

                return {
                    'success': True,
                    'action': 'created',
                    'area_id': row[0],
                    'area_alias': row[1]
                }

    except Exception as e:
        logger.error(f"Error updating area: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_area', is_mutation=True)
def handle_delete_area(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a planning area. WARNING: Cascades to phases and parcels."""
    area_id = tool_input.get('area_id')
    reason = tool_input.get('reason', 'Delete area')

    if not area_id:
        return {'success': False, 'error': 'area_id is required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='planning_delete',
            table_name='tbl_area',
            field_name=None,
            record_id=str(area_id),
            proposed_value={'delete': True, 'area_id': area_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Get info before delete
            cursor.execute("""
                SELECT area_id, area_alias FROM landscape.tbl_area
                WHERE area_id = %s AND project_id = %s
            """, [area_id, project_id])

            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'Area {area_id} not found'}

            deleted_info = {'area_id': row[0], 'area_alias': row[1]}

            # Delete (cascades to phases and parcels via FK)
            cursor.execute("""
                DELETE FROM landscape.tbl_area
                WHERE area_id = %s AND project_id = %s
            """, [area_id, project_id])

            _log_planning_activity(project_id, 'tbl_area', 'delete', 1, reason)

            return {
                'success': True,
                'action': 'deleted',
                'deleted_item': deleted_info
            }

    except Exception as e:
        logger.error(f"Error deleting area: {e}")
        return {'success': False, 'error': str(e)}


# ============ PHASE TOOLS ============

@register_tool('get_phases')
def handle_get_phases(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get phases for a project or specific area."""
    area_id = tool_input.get('area_id')
    phase_id = tool_input.get('phase_id')

    try:
        with connection.cursor() as cursor:
            conditions = ["ph.project_id = %s OR a.project_id = %s"]
            params = [project_id, project_id]

            if phase_id:
                conditions.append("ph.phase_id = %s")
                params.append(phase_id)
            if area_id:
                conditions.append("ph.area_id = %s")
                params.append(area_id)

            where_clause = " AND ".join(conditions)

            cursor.execute(f"""
                SELECT ph.phase_id, ph.area_id, a.area_alias,
                       ph.phase_name, ph.phase_no, ph.label, ph.description,
                       ph.phase_status, ph.phase_start_date, ph.phase_completion_date,
                       ph.absorption_start_date,
                       COUNT(DISTINCT pa.parcel_id) as parcel_count,
                       SUM(pa.units_total) as total_units,
                       SUM(pa.acres_gross) as total_acres
                FROM landscape.tbl_phase ph
                LEFT JOIN landscape.tbl_area a ON a.area_id = ph.area_id
                LEFT JOIN landscape.tbl_parcel pa ON pa.phase_id = ph.phase_id
                WHERE {where_clause}
                GROUP BY ph.phase_id, a.area_alias
                ORDER BY ph.area_id, ph.phase_no, ph.phase_name
            """, params)

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                # Convert numeric fields
                if record.get('total_units'):
                    record['total_units'] = int(record['total_units'])
                if record.get('total_acres'):
                    record['total_acres'] = float(record['total_acres'])
                records.append(record)

            if phase_id and records:
                return {'success': True, 'exists': True, 'data': records[0]}

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error fetching phases: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_phase', is_mutation=True)
def handle_update_phase(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a phase."""
    phase_id = tool_input.get('phase_id')
    area_id = tool_input.get('area_id')
    phase_name = tool_input.get('phase_name')
    reason = tool_input.get('reason', 'Update phase')

    if not phase_id and (not area_id or not phase_name):
        return {'success': False, 'error': 'area_id and phase_name required for new phases'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='planning_upsert',
            table_name='tbl_phase',
            field_name=None,
            record_id=str(phase_id) if phase_id else None,
            proposed_value=tool_input,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if phase_id:
                # Update existing
                updates = {k: v for k, v in tool_input.items()
                           if k in PHASE_COLUMNS and v is not None}

                if not updates:
                    return {'success': False, 'error': 'No valid fields to update'}

                set_parts = [f"{k} = %s" for k in updates.keys()]
                values = list(updates.values()) + [phase_id]

                cursor.execute(f"""
                    UPDATE landscape.tbl_phase
                    SET {', '.join(set_parts)}
                    WHERE phase_id = %s
                    RETURNING phase_id, phase_name
                """, values)

                row = cursor.fetchone()
                if not row:
                    return {'success': False, 'error': f'Phase {phase_id} not found'}

                _log_planning_activity(project_id, 'tbl_phase', 'update', 1, reason)

                return {
                    'success': True,
                    'action': 'updated',
                    'phase_id': row[0],
                    'phase_name': row[1],
                    'fields_updated': list(updates.keys())
                }

            else:
                # Insert new
                # Get next phase_no within area
                cursor.execute("""
                    SELECT COALESCE(MAX(phase_no), 0) + 1
                    FROM landscape.tbl_phase WHERE area_id = %s
                """, [area_id])
                next_no = cursor.fetchone()[0]

                phase_no = tool_input.get('phase_no', next_no)

                fields = {
                    'area_id': area_id,
                    'project_id': project_id,
                    'phase_name': phase_name,
                    'phase_no': phase_no
                }

                for col in PHASE_COLUMNS:
                    if col in tool_input and tool_input[col] is not None and col not in fields:
                        fields[col] = tool_input[col]

                col_names = list(fields.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = list(fields.values())

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_phase ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING phase_id, phase_name
                """, values)

                row = cursor.fetchone()
                _log_planning_activity(project_id, 'tbl_phase', 'create', 1, reason)

                return {
                    'success': True,
                    'action': 'created',
                    'phase_id': row[0],
                    'phase_name': row[1]
                }

    except Exception as e:
        logger.error(f"Error updating phase: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_phase', is_mutation=True)
def handle_delete_phase(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a phase. WARNING: Cascades to parcels."""
    phase_id = tool_input.get('phase_id')
    reason = tool_input.get('reason', 'Delete phase')

    if not phase_id:
        return {'success': False, 'error': 'phase_id is required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='planning_delete',
            table_name='tbl_phase',
            field_name=None,
            record_id=str(phase_id),
            proposed_value={'delete': True, 'phase_id': phase_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Get info before delete
            cursor.execute("""
                SELECT phase_id, phase_name, area_id FROM landscape.tbl_phase
                WHERE phase_id = %s
            """, [phase_id])

            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'Phase {phase_id} not found'}

            deleted_info = {'phase_id': row[0], 'phase_name': row[1], 'area_id': row[2]}

            # Delete (cascades to parcels via FK)
            cursor.execute("DELETE FROM landscape.tbl_phase WHERE phase_id = %s", [phase_id])

            _log_planning_activity(project_id, 'tbl_phase', 'delete', 1, reason)

            return {
                'success': True,
                'action': 'deleted',
                'deleted_item': deleted_info
            }

    except Exception as e:
        logger.error(f"Error deleting phase: {e}")
        return {'success': False, 'error': str(e)}


# ============ PARCEL TOOLS ============

@register_tool('get_parcels')
def handle_get_parcels(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get parcels for a project, area, or phase."""
    area_id = tool_input.get('area_id')
    phase_id = tool_input.get('phase_id')
    parcel_id = tool_input.get('parcel_id')
    limit = tool_input.get('limit', 500)

    try:
        with connection.cursor() as cursor:
            conditions = ["pa.project_id = %s"]
            params = [project_id]

            if parcel_id:
                conditions.append("pa.parcel_id = %s")
                params.append(parcel_id)
            if phase_id:
                conditions.append("pa.phase_id = %s")
                params.append(phase_id)
            if area_id:
                conditions.append("pa.area_id = %s")
                params.append(area_id)

            where_clause = " AND ".join(conditions)

            cursor.execute(f"""
                SELECT pa.parcel_id, pa.project_id, pa.area_id, pa.phase_id,
                       a.area_alias, ph.phase_name,
                       pa.parcel_name, pa.parcel_code, pa.landuse_code, pa.landuse_type,
                       pa.acres_gross, pa.lot_width, pa.lot_depth, pa.lot_area,
                       pa.units_total, pa.family_name, pa.density_code, pa.type_code,
                       pa.product_code, pa.building_name, pa.building_class,
                       pa.year_built, pa.rentable_sf, pa.saleprice, pa.saledate,
                       pa.description
                FROM landscape.tbl_parcel pa
                LEFT JOIN landscape.tbl_area a ON a.area_id = pa.area_id
                LEFT JOIN landscape.tbl_phase ph ON ph.phase_id = pa.phase_id
                WHERE {where_clause}
                ORDER BY pa.area_id, pa.phase_id, pa.parcel_name
                LIMIT %s
            """, params + [limit])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                # Convert numeric fields
                for key in ['acres_gross', 'lot_width', 'lot_depth', 'lot_area', 'rentable_sf', 'saleprice']:
                    if record.get(key) is not None:
                        record[key] = float(record[key])
                records.append(record)

            if parcel_id and records:
                return {'success': True, 'exists': True, 'data': records[0]}

            # Summary stats
            total_acres = sum(r.get('acres_gross', 0) or 0 for r in records)
            total_units = sum(r.get('units_total', 0) or 0 for r in records)

            return {
                'success': True,
                'count': len(records),
                'total_acres': total_acres,
                'total_units': total_units,
                'records': records
            }

    except Exception as e:
        logger.error(f"Error fetching parcels: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_parcel', is_mutation=True)
def handle_update_parcel(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a parcel."""
    parcel_id = tool_input.get('parcel_id')
    phase_id = tool_input.get('phase_id')
    parcel_name = tool_input.get('parcel_name')
    reason = tool_input.get('reason', 'Update parcel')

    if not parcel_id and (not phase_id or not parcel_name):
        return {'success': False, 'error': 'phase_id and parcel_name required for new parcels'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='planning_upsert',
            table_name='tbl_parcel',
            field_name=None,
            record_id=str(parcel_id) if parcel_id else None,
            proposed_value=tool_input,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if parcel_id:
                # Update existing
                updates = {k: v for k, v in tool_input.items()
                           if k in PARCEL_COLUMNS and v is not None}

                if not updates:
                    return {'success': False, 'error': 'No valid fields to update'}

                # Handle JSONB field
                if 'property_metadata' in updates:
                    updates['property_metadata'] = json.dumps(updates['property_metadata'])

                set_parts = [f"{k} = %s" for k in updates.keys()]
                values = list(updates.values()) + [parcel_id]

                cursor.execute(f"""
                    UPDATE landscape.tbl_parcel
                    SET {', '.join(set_parts)}
                    WHERE parcel_id = %s
                    RETURNING parcel_id, parcel_name
                """, values)

                row = cursor.fetchone()
                if not row:
                    return {'success': False, 'error': f'Parcel {parcel_id} not found'}

                _log_planning_activity(project_id, 'tbl_parcel', 'update', 1, reason)

                return {
                    'success': True,
                    'action': 'updated',
                    'parcel_id': row[0],
                    'parcel_name': row[1],
                    'fields_updated': list(updates.keys())
                }

            else:
                # Insert new - get area_id from phase
                cursor.execute("""
                    SELECT area_id FROM landscape.tbl_phase WHERE phase_id = %s
                """, [phase_id])
                phase_row = cursor.fetchone()
                area_id = phase_row[0] if phase_row else None

                fields = {
                    'project_id': project_id,
                    'phase_id': phase_id,
                    'area_id': area_id,
                    'parcel_name': parcel_name
                }

                for col in PARCEL_COLUMNS:
                    if col in tool_input and tool_input[col] is not None and col not in fields:
                        val = tool_input[col]
                        if col == 'property_metadata':
                            val = json.dumps(val)
                        fields[col] = val

                col_names = list(fields.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = list(fields.values())

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_parcel ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING parcel_id, parcel_name
                """, values)

                row = cursor.fetchone()
                _log_planning_activity(project_id, 'tbl_parcel', 'create', 1, reason)

                return {
                    'success': True,
                    'action': 'created',
                    'parcel_id': row[0],
                    'parcel_name': row[1]
                }

    except Exception as e:
        logger.error(f"Error updating parcel: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_parcel', is_mutation=True)
def handle_delete_parcel(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a parcel."""
    parcel_id = tool_input.get('parcel_id')
    reason = tool_input.get('reason', 'Delete parcel')

    if not parcel_id:
        return {'success': False, 'error': 'parcel_id is required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='planning_delete',
            table_name='tbl_parcel',
            field_name=None,
            record_id=str(parcel_id),
            proposed_value={'delete': True, 'parcel_id': parcel_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Get info before delete
            cursor.execute("""
                SELECT parcel_id, parcel_name, phase_id, acres_gross
                FROM landscape.tbl_parcel
                WHERE parcel_id = %s AND project_id = %s
            """, [parcel_id, project_id])

            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'Parcel {parcel_id} not found'}

            deleted_info = {
                'parcel_id': row[0],
                'parcel_name': row[1],
                'phase_id': row[2],
                'acres_gross': float(row[3]) if row[3] else None
            }

            # Delete
            cursor.execute("""
                DELETE FROM landscape.tbl_parcel
                WHERE parcel_id = %s AND project_id = %s
            """, [parcel_id, project_id])

            _log_planning_activity(project_id, 'tbl_parcel', 'delete', 1, reason)

            return {
                'success': True,
                'action': 'deleted',
                'deleted_item': deleted_info
            }

    except Exception as e:
        logger.error(f"Error deleting parcel: {e}")
        return {'success': False, 'error': str(e)}


# ============ MILESTONE TOOLS ============

@register_tool('get_milestones')
def handle_get_milestones(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Get milestones for a project or phase."""
    phase_id = tool_input.get('phase_id')
    milestone_id = tool_input.get('milestone_id')

    try:
        with connection.cursor() as cursor:
            conditions = ["m.project_id = %s"]
            params = [project_id]

            if milestone_id:
                conditions.append("m.milestone_id = %s")
                params.append(milestone_id)
            if phase_id:
                conditions.append("m.phase_id = %s")
                params.append(phase_id)

            where_clause = " AND ".join(conditions)

            cursor.execute(f"""
                SELECT m.milestone_id, m.project_id, m.phase_id,
                       ph.phase_name,
                       m.milestone_name, m.milestone_type,
                       m.target_date, m.actual_date, m.status,
                       m.predecessor_milestone_id,
                       pm.milestone_name as predecessor_name,
                       m.notes, m.confidence_score, m.created_by,
                       m.created_at, m.updated_at
                FROM landscape.tbl_milestone m
                LEFT JOIN landscape.tbl_phase ph ON ph.phase_id = m.phase_id
                LEFT JOIN landscape.tbl_milestone pm ON pm.milestone_id = m.predecessor_milestone_id
                WHERE {where_clause}
                ORDER BY m.target_date, m.milestone_name
            """, params)

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            records = []
            for row in rows:
                record = dict(zip(columns, row))
                if record.get('confidence_score'):
                    record['confidence_score'] = float(record['confidence_score'])
                records.append(record)

            if milestone_id and records:
                return {'success': True, 'exists': True, 'data': records[0]}

            return {
                'success': True,
                'count': len(records),
                'records': records
            }

    except Exception as e:
        logger.error(f"Error fetching milestones: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_milestone', is_mutation=True)
def handle_update_milestone(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a milestone."""
    milestone_id = tool_input.get('milestone_id')
    milestone_name = tool_input.get('milestone_name')
    reason = tool_input.get('reason', 'Update milestone')

    if not milestone_id and not milestone_name:
        return {'success': False, 'error': 'milestone_name required for new milestones'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='planning_upsert',
            table_name='tbl_milestone',
            field_name=None,
            record_id=str(milestone_id) if milestone_id else None,
            proposed_value=tool_input,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if milestone_id:
                # Update existing
                updates = {k: v for k, v in tool_input.items()
                           if k in MILESTONE_COLUMNS and v is not None}

                if not updates:
                    return {'success': False, 'error': 'No valid fields to update'}

                updates['updated_at'] = 'NOW()'
                set_parts = []
                values = []
                for k, v in updates.items():
                    if v == 'NOW()':
                        set_parts.append(f"{k} = NOW()")
                    else:
                        set_parts.append(f"{k} = %s")
                        values.append(v)

                values.append(milestone_id)

                cursor.execute(f"""
                    UPDATE landscape.tbl_milestone
                    SET {', '.join(set_parts)}
                    WHERE milestone_id = %s
                    RETURNING milestone_id, milestone_name
                """, values)

                row = cursor.fetchone()
                if not row:
                    return {'success': False, 'error': f'Milestone {milestone_id} not found'}

                _log_planning_activity(project_id, 'tbl_milestone', 'update', 1, reason)

                return {
                    'success': True,
                    'action': 'updated',
                    'milestone_id': row[0],
                    'milestone_name': row[1],
                    'fields_updated': [k for k in updates.keys() if k != 'updated_at']
                }

            else:
                # Insert new
                fields = {
                    'project_id': project_id,
                    'milestone_name': milestone_name
                }

                for col in MILESTONE_COLUMNS:
                    if col in tool_input and tool_input[col] is not None and col not in fields:
                        fields[col] = tool_input[col]

                col_names = list(fields.keys())
                placeholders = ', '.join(['%s'] * len(col_names))
                values = list(fields.values())

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_milestone ({', '.join(col_names)})
                    VALUES ({placeholders})
                    RETURNING milestone_id, milestone_name
                """, values)

                row = cursor.fetchone()
                _log_planning_activity(project_id, 'tbl_milestone', 'create', 1, reason)

                return {
                    'success': True,
                    'action': 'created',
                    'milestone_id': row[0],
                    'milestone_name': row[1]
                }

    except Exception as e:
        logger.error(f"Error updating milestone: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_milestone', is_mutation=True)
def handle_delete_milestone(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a milestone."""
    milestone_id = tool_input.get('milestone_id')
    reason = tool_input.get('reason', 'Delete milestone')

    if not milestone_id:
        return {'success': False, 'error': 'milestone_id is required'}

    if propose_only:
        from .services.mutation_service import MutationService
        return MutationService.create_proposal(
            project_id=project_id,
            mutation_type='planning_delete',
            table_name='tbl_milestone',
            field_name=None,
            record_id=str(milestone_id),
            proposed_value={'delete': True, 'milestone_id': milestone_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Get info before delete
            cursor.execute("""
                SELECT milestone_id, milestone_name, milestone_type, target_date
                FROM landscape.tbl_milestone
                WHERE milestone_id = %s AND project_id = %s
            """, [milestone_id, project_id])

            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'Milestone {milestone_id} not found'}

            deleted_info = {
                'milestone_id': row[0],
                'milestone_name': row[1],
                'milestone_type': row[2],
                'target_date': str(row[3]) if row[3] else None
            }

            # Delete
            cursor.execute("""
                DELETE FROM landscape.tbl_milestone
                WHERE milestone_id = %s AND project_id = %s
            """, [milestone_id, project_id])

            _log_planning_activity(project_id, 'tbl_milestone', 'delete', 1, reason)

            return {
                'success': True,
                'action': 'deleted',
                'deleted_item': deleted_info
            }

    except Exception as e:
        logger.error(f"Error deleting milestone: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# PART 7: SYSTEM ADMINISTRATION TOOLS
# =============================================================================

# Column definitions for system admin tables
LU_FAMILY_COLUMNS = ['code', 'name', 'active', 'notes']
LU_TYPE_COLUMNS = ['family_id', 'code', 'name', 'ord', 'active', 'notes']
RES_LOT_PRODUCT_COLUMNS = ['code', 'lot_w_ft', 'lot_d_ft', 'lot_area_sf', 'type_id', 'is_active']
MEASURE_COLUMNS = ['measure_code', 'measure_name', 'measure_category', 'is_system', 'property_types', 'sort_order']
PICKLIST_COLUMNS = ['picklist_type', 'code', 'name', 'description', 'parent_id', 'sort_order', 'is_active']
BENCHMARK_COLUMNS = [
    'category', 'subcategory', 'benchmark_name', 'description', 'market_geography',
    'property_type', 'source_type', 'source_document_id', 'source_project_id',
    'extraction_date', 'confidence_level', 'as_of_date', 'cpi_index_value',
    'context_metadata', 'is_active', 'is_global'
]
COST_ITEM_COLUMNS = [
    'category_id', 'item_name', 'default_uom_code', 'typical_low_value',
    'typical_mid_value', 'typical_high_value', 'market_geography', 'project_type_code',
    'is_active', 'quantity', 'source', 'as_of_date'
]
REPORT_TEMPLATE_COLUMNS = ['template_name', 'description', 'output_format', 'assigned_tabs', 'sections', 'is_active']
DMS_TEMPLATE_COLUMNS = ['template_name', 'workspace_id', 'project_id', 'doc_type', 'is_default', 'doc_type_options', 'description']


def _log_system_activity(table: str, action: str, count: int, reason: str):
    """Log system administration activity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.landscaper_activity
                (title, summary, status, details, is_read, created_at)
                VALUES (%s, %s, %s, %s, false, NOW())
            """, [
                f"System {action.title()}: {table}",
                f"{action.title()}d {count} record(s) in {table}" + (f" - {reason}" if reason else ""),
                'completed',
                json.dumps({'table': table, 'action': action, 'count': count, 'reason': reason})
            ])
    except Exception as e:
        logger.warning(f"Failed to log system activity: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Land Use Family Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_land_use_families')
def get_land_use_families(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve land use families (top-level classification)."""
    family_id = tool_input.get('family_id')
    is_active = tool_input.get('is_active')

    try:
        with connection.cursor() as cursor:
            sql = "SELECT family_id, code, name, active, notes FROM landscape.lu_family WHERE 1=1"
            params = []

            if family_id is not None:
                sql += " AND family_id = %s"
                params.append(family_id)

            if is_active is not None:
                sql += " AND active = %s"
                params.append(is_active)

            sql += " ORDER BY family_id"

            cursor.execute(sql, params)
            columns = ['family_id', 'code', 'name', 'active', 'notes']
            families = [dict(zip(columns, row)) for row in cursor.fetchall()]

            return {
                'success': True,
                'families': families,
                'count': len(families)
            }

    except Exception as e:
        logger.error(f"Error getting land use families: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_land_use_family', is_mutation=True)
def update_land_use_family(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create or update a land use family."""
    family_id = tool_input.get('family_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Update land use family')

    # Build update data
    update_data = {}
    for col in LU_FAMILY_COLUMNS:
        if col in tool_input and tool_input[col] is not None:
            update_data[col] = tool_input[col]

    if not update_data and not family_id:
        return {'success': False, 'error': 'No data provided for update'}

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_upsert',
            table_name='lu_family',
            field_name=None,
            record_id=str(family_id) if family_id else 'new',
            proposed_value=update_data,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if family_id:
                # Update existing
                if update_data:
                    set_clause = ", ".join([f"{k} = %s" for k in update_data.keys()])
                    cursor.execute(f"""
                        UPDATE landscape.lu_family
                        SET {set_clause}
                        WHERE family_id = %s
                        RETURNING family_id, code, name, active
                    """, list(update_data.values()) + [family_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Family {family_id} not found'}
                    _log_system_activity('lu_family', 'update', 1, reason)
                    return {'success': True, 'action': 'updated', 'family_id': row[0], 'code': row[1], 'name': row[2]}
            else:
                # Insert new - need at least code and name
                if 'code' not in update_data or 'name' not in update_data:
                    return {'success': False, 'error': 'New family requires code and name'}

                # Get next family_id
                cursor.execute("SELECT COALESCE(MAX(family_id), 0) + 1 FROM landscape.lu_family")
                new_id = cursor.fetchone()[0]

                columns = ['family_id'] + list(update_data.keys())
                values = [new_id] + list(update_data.values())
                placeholders = ', '.join(['%s'] * len(values))

                cursor.execute(f"""
                    INSERT INTO landscape.lu_family ({', '.join(columns)})
                    VALUES ({placeholders})
                    RETURNING family_id, code, name
                """, values)
                row = cursor.fetchone()
                _log_system_activity('lu_family', 'create', 1, reason)
                return {'success': True, 'action': 'created', 'family_id': row[0], 'code': row[1], 'name': row[2]}

    except Exception as e:
        logger.error(f"Error updating land use family: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Land Use Type Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_land_use_types')
def get_land_use_types(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve land use types (mid-level classification)."""
    type_id = tool_input.get('type_id')
    family_id = tool_input.get('family_id')
    is_active = tool_input.get('is_active')

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT t.type_id, t.family_id, f.name as family_name, t.code, t.name, t.ord, t.active, t.notes
                FROM landscape.lu_type t
                JOIN landscape.lu_family f ON t.family_id = f.family_id
                WHERE 1=1
            """
            params = []

            if type_id is not None:
                sql += " AND t.type_id = %s"
                params.append(type_id)

            if family_id is not None:
                sql += " AND t.family_id = %s"
                params.append(family_id)

            if is_active is not None:
                sql += " AND t.active = %s"
                params.append(is_active)

            sql += " ORDER BY t.family_id, t.ord, t.type_id"

            cursor.execute(sql, params)
            columns = ['type_id', 'family_id', 'family_name', 'code', 'name', 'ord', 'active', 'notes']
            types = [dict(zip(columns, row)) for row in cursor.fetchall()]

            return {
                'success': True,
                'types': types,
                'count': len(types)
            }

    except Exception as e:
        logger.error(f"Error getting land use types: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_land_use_type', is_mutation=True)
def update_land_use_type(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create or update a land use type."""
    type_id = tool_input.get('type_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Update land use type')

    # Build update data
    update_data = {}
    for col in LU_TYPE_COLUMNS:
        if col in tool_input and tool_input[col] is not None:
            update_data[col] = tool_input[col]

    if not update_data and not type_id:
        return {'success': False, 'error': 'No data provided for update'}

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_upsert',
            table_name='lu_type',
            field_name=None,
            record_id=str(type_id) if type_id else 'new',
            proposed_value=update_data,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if type_id:
                # Update existing
                if update_data:
                    set_clause = ", ".join([f"{k} = %s" for k in update_data.keys()])
                    cursor.execute(f"""
                        UPDATE landscape.lu_type
                        SET {set_clause}
                        WHERE type_id = %s
                        RETURNING type_id, code, name
                    """, list(update_data.values()) + [type_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Type {type_id} not found'}
                    _log_system_activity('lu_type', 'update', 1, reason)
                    return {'success': True, 'action': 'updated', 'type_id': row[0], 'code': row[1], 'name': row[2]}
            else:
                # Insert new
                if 'family_id' not in update_data or 'code' not in update_data or 'name' not in update_data:
                    return {'success': False, 'error': 'New type requires family_id, code, and name'}

                cursor.execute("SELECT COALESCE(MAX(type_id), 0) + 1 FROM landscape.lu_type")
                new_id = cursor.fetchone()[0]

                columns = ['type_id'] + list(update_data.keys())
                values = [new_id] + list(update_data.values())
                placeholders = ', '.join(['%s'] * len(values))

                cursor.execute(f"""
                    INSERT INTO landscape.lu_type ({', '.join(columns)})
                    VALUES ({placeholders})
                    RETURNING type_id, code, name
                """, values)
                row = cursor.fetchone()
                _log_system_activity('lu_type', 'create', 1, reason)
                return {'success': True, 'action': 'created', 'type_id': row[0], 'code': row[1], 'name': row[2]}

    except Exception as e:
        logger.error(f"Error updating land use type: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Residential Product Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_residential_products')
def get_residential_products(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve residential lot products (leaf-level classification)."""
    product_id = tool_input.get('product_id')
    type_id = tool_input.get('type_id') or tool_input.get('land_use_type_id')
    is_active = tool_input.get('is_active')

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT p.product_id, p.code, p.lot_w_ft, p.lot_d_ft, p.lot_area_sf,
                       p.type_id, t.name as type_name, p.is_active, p.created_at
                FROM landscape.res_lot_product p
                LEFT JOIN landscape.lu_type t ON p.type_id = t.type_id
                WHERE 1=1
            """
            params = []

            if product_id is not None:
                sql += " AND p.product_id = %s"
                params.append(product_id)

            if type_id is not None:
                sql += " AND p.type_id = %s"
                params.append(type_id)

            if is_active is not None:
                sql += " AND p.is_active = %s"
                params.append(is_active)

            sql += " ORDER BY p.lot_w_ft, p.lot_d_ft"

            cursor.execute(sql, params)
            columns = ['product_id', 'code', 'lot_w_ft', 'lot_d_ft', 'lot_area_sf',
                       'type_id', 'type_name', 'is_active', 'created_at']
            products = [dict(zip(columns, row)) for row in cursor.fetchall()]

            # Convert timestamps
            for p in products:
                if p.get('created_at'):
                    p['created_at'] = str(p['created_at'])

            return {
                'success': True,
                'products': products,
                'count': len(products)
            }

    except Exception as e:
        logger.error(f"Error getting residential products: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_residential_product', is_mutation=True)
def update_residential_product(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create or update a residential lot product."""
    product_id = tool_input.get('product_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Update residential product')

    # Map alternative field names
    if 'lot_width' in tool_input:
        tool_input['lot_w_ft'] = tool_input['lot_width']
    if 'lot_depth' in tool_input:
        tool_input['lot_d_ft'] = tool_input['lot_depth']
    if 'land_use_type_id' in tool_input:
        tool_input['type_id'] = tool_input['land_use_type_id']

    # Build update data
    update_data = {}
    for col in RES_LOT_PRODUCT_COLUMNS:
        if col in tool_input and tool_input[col] is not None:
            update_data[col] = tool_input[col]

    if not update_data and not product_id:
        return {'success': False, 'error': 'No data provided for update'}

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_upsert',
            table_name='res_lot_product',
            field_name=None,
            record_id=str(product_id) if product_id else 'new',
            proposed_value=update_data,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if product_id:
                # Update existing
                if update_data:
                    update_data['updated_at'] = 'NOW()'
                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        if v == 'NOW()':
                            set_parts.append(f"{k} = NOW()")
                        else:
                            set_parts.append(f"{k} = %s")
                            values.append(v)

                    cursor.execute(f"""
                        UPDATE landscape.res_lot_product
                        SET {', '.join(set_parts)}
                        WHERE product_id = %s
                        RETURNING product_id, code, lot_w_ft, lot_d_ft
                    """, values + [product_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Product {product_id} not found'}
                    _log_system_activity('res_lot_product', 'update', 1, reason)
                    return {'success': True, 'action': 'updated', 'product_id': row[0], 'code': row[1],
                            'lot_width': row[2], 'lot_depth': row[3]}
            else:
                # Insert new
                if 'code' not in update_data or 'lot_w_ft' not in update_data or 'lot_d_ft' not in update_data:
                    return {'success': False, 'error': 'New product requires code, lot_w_ft (lot_width), and lot_d_ft (lot_depth)'}

                cursor.execute("SELECT COALESCE(MAX(product_id), 0) + 1 FROM landscape.res_lot_product")
                new_id = cursor.fetchone()[0]

                # Calculate lot_area_sf if not provided
                if 'lot_area_sf' not in update_data:
                    update_data['lot_area_sf'] = update_data['lot_w_ft'] * update_data['lot_d_ft']

                columns = ['product_id'] + list(update_data.keys())
                values = [new_id] + list(update_data.values())
                placeholders = ', '.join(['%s'] * len(values))

                cursor.execute(f"""
                    INSERT INTO landscape.res_lot_product ({', '.join(columns)})
                    VALUES ({placeholders})
                    RETURNING product_id, code, lot_w_ft, lot_d_ft
                """, values)
                row = cursor.fetchone()
                _log_system_activity('res_lot_product', 'create', 1, reason)
                return {'success': True, 'action': 'created', 'product_id': row[0], 'code': row[1],
                        'lot_width': row[2], 'lot_depth': row[3]}

    except Exception as e:
        logger.error(f"Error updating residential product: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Measures Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_measures')
def get_measures(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve measurement units (SF, AC, LF, EA, etc.)."""
    measure_id = tool_input.get('measure_id')
    category = tool_input.get('category')

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT measure_id, measure_code, measure_name, measure_category,
                       is_system, property_types, sort_order
                FROM landscape.tbl_measures
                WHERE 1=1
            """
            params = []

            if measure_id is not None:
                sql += " AND measure_id = %s"
                params.append(measure_id)

            if category is not None:
                sql += " AND measure_category ILIKE %s"
                params.append(f'%{category}%')

            sql += " ORDER BY sort_order, measure_code"

            cursor.execute(sql, params)
            columns = ['measure_id', 'measure_code', 'measure_name', 'measure_category',
                       'is_system', 'property_types', 'sort_order']
            measures = [dict(zip(columns, row)) for row in cursor.fetchall()]

            return {
                'success': True,
                'measures': measures,
                'count': len(measures)
            }

    except Exception as e:
        logger.error(f"Error getting measures: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_measure', is_mutation=True)
def update_measure(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create or update a measurement unit."""
    measure_id = tool_input.get('measure_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Update measure')

    # Map alternative field names
    if 'abbreviation' in tool_input:
        tool_input['measure_code'] = tool_input['abbreviation']
    if 'name' in tool_input and 'measure_name' not in tool_input:
        tool_input['measure_name'] = tool_input['name']
    if 'category' in tool_input and 'measure_category' not in tool_input:
        tool_input['measure_category'] = tool_input['category']

    # Build update data
    update_data = {}
    for col in MEASURE_COLUMNS:
        if col in tool_input and tool_input[col] is not None:
            update_data[col] = tool_input[col]

    if not update_data and not measure_id:
        return {'success': False, 'error': 'No data provided for update'}

    # Handle JSONB property_types
    if 'property_types' in update_data and isinstance(update_data['property_types'], list):
        update_data['property_types'] = json.dumps(update_data['property_types'])

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_upsert',
            table_name='tbl_measures',
            field_name=None,
            record_id=str(measure_id) if measure_id else 'new',
            proposed_value=update_data,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if measure_id:
                # Update existing
                if update_data:
                    update_data['updated_at'] = 'NOW()'
                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        if v == 'NOW()':
                            set_parts.append(f"{k} = NOW()")
                        else:
                            set_parts.append(f"{k} = %s")
                            values.append(v)

                    cursor.execute(f"""
                        UPDATE landscape.tbl_measures
                        SET {', '.join(set_parts)}
                        WHERE measure_id = %s
                        RETURNING measure_id, measure_code, measure_name
                    """, values + [measure_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Measure {measure_id} not found'}
                    _log_system_activity('tbl_measures', 'update', 1, reason)
                    return {'success': True, 'action': 'updated', 'measure_id': row[0], 'code': row[1], 'name': row[2]}
            else:
                # Insert new
                if 'measure_code' not in update_data or 'measure_name' not in update_data:
                    return {'success': False, 'error': 'New measure requires measure_code (abbreviation) and measure_name'}

                if 'measure_category' not in update_data:
                    update_data['measure_category'] = 'other'

                columns = list(update_data.keys())
                placeholders = ', '.join(['%s'] * len(columns))

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_measures ({', '.join(columns)})
                    VALUES ({placeholders})
                    RETURNING measure_id, measure_code, measure_name
                """, list(update_data.values()))
                row = cursor.fetchone()
                _log_system_activity('tbl_measures', 'create', 1, reason)
                return {'success': True, 'action': 'created', 'measure_id': row[0], 'code': row[1], 'name': row[2]}

    except Exception as e:
        logger.error(f"Error updating measure: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# System Picklist Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_picklist_values')
def get_picklist_values(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve system picklist values."""
    picklist_name = tool_input.get('picklist_name') or tool_input.get('picklist_type')
    is_active = tool_input.get('is_active')

    try:
        with connection.cursor() as cursor:
            # First get available picklist types if no name specified
            if not picklist_name:
                cursor.execute("""
                    SELECT DISTINCT picklist_type
                    FROM landscape.tbl_system_picklist
                    ORDER BY picklist_type
                """)
                types = [row[0] for row in cursor.fetchall()]
                return {
                    'success': True,
                    'available_picklist_types': types,
                    'hint': 'Specify picklist_name to get values for a specific picklist'
                }

            sql = """
                SELECT picklist_id, picklist_type, code, name, description,
                       parent_id, sort_order, is_active
                FROM landscape.tbl_system_picklist
                WHERE picklist_type = %s
            """
            params = [picklist_name]

            if is_active is not None:
                sql += " AND is_active = %s"
                params.append(is_active)

            sql += " ORDER BY sort_order, code"

            cursor.execute(sql, params)
            columns = ['picklist_id', 'picklist_type', 'code', 'name', 'description',
                       'parent_id', 'sort_order', 'is_active']
            values = [dict(zip(columns, row)) for row in cursor.fetchall()]

            return {
                'success': True,
                'picklist_type': picklist_name,
                'values': values,
                'count': len(values)
            }

    except Exception as e:
        logger.error(f"Error getting picklist values: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_picklist_value', is_mutation=True)
def update_picklist_value(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create or update a picklist value."""
    picklist_id = tool_input.get('picklist_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Update picklist value')

    # Map alternative field names
    if 'value' in tool_input and 'code' not in tool_input:
        tool_input['code'] = tool_input['value']
    if 'display_label' in tool_input and 'name' not in tool_input:
        tool_input['name'] = tool_input['display_label']
    if 'picklist_name' in tool_input and 'picklist_type' not in tool_input:
        tool_input['picklist_type'] = tool_input['picklist_name']

    # Build update data
    update_data = {}
    for col in PICKLIST_COLUMNS:
        if col in tool_input and tool_input[col] is not None:
            update_data[col] = tool_input[col]

    if not update_data and not picklist_id:
        return {'success': False, 'error': 'No data provided for update'}

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_upsert',
            table_name='tbl_system_picklist',
            field_name=None,
            record_id=str(picklist_id) if picklist_id else 'new',
            proposed_value=update_data,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if picklist_id:
                # Update existing
                if update_data:
                    update_data['updated_at'] = 'NOW()'
                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        if v == 'NOW()':
                            set_parts.append(f"{k} = NOW()")
                        else:
                            set_parts.append(f"{k} = %s")
                            values.append(v)

                    cursor.execute(f"""
                        UPDATE landscape.tbl_system_picklist
                        SET {', '.join(set_parts)}
                        WHERE picklist_id = %s
                        RETURNING picklist_id, picklist_type, code, name
                    """, values + [picklist_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Picklist value {picklist_id} not found'}
                    _log_system_activity('tbl_system_picklist', 'update', 1, reason)
                    return {'success': True, 'action': 'updated', 'picklist_id': row[0],
                            'picklist_type': row[1], 'code': row[2], 'name': row[3]}
            else:
                # Insert new
                if 'picklist_type' not in update_data or 'code' not in update_data or 'name' not in update_data:
                    return {'success': False, 'error': 'New picklist value requires picklist_type, code, and name'}

                columns = list(update_data.keys())
                placeholders = ', '.join(['%s'] * len(columns))

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_system_picklist ({', '.join(columns)})
                    VALUES ({placeholders})
                    RETURNING picklist_id, picklist_type, code, name
                """, list(update_data.values()))
                row = cursor.fetchone()
                _log_system_activity('tbl_system_picklist', 'create', 1, reason)
                return {'success': True, 'action': 'created', 'picklist_id': row[0],
                        'picklist_type': row[1], 'code': row[2], 'name': row[3]}

    except Exception as e:
        logger.error(f"Error updating picklist value: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_picklist_value', is_mutation=True)
def delete_picklist_value(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Delete a picklist value."""
    picklist_id = tool_input.get('picklist_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Delete picklist value')

    if not picklist_id:
        return {'success': False, 'error': 'picklist_id is required'}

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_delete',
            table_name='tbl_system_picklist',
            field_name=None,
            record_id=str(picklist_id),
            proposed_value={'delete': True, 'picklist_id': picklist_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            # Get info before delete
            cursor.execute("""
                SELECT picklist_id, picklist_type, code, name
                FROM landscape.tbl_system_picklist
                WHERE picklist_id = %s
            """, [picklist_id])
            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'Picklist value {picklist_id} not found'}

            deleted_info = {'picklist_id': row[0], 'picklist_type': row[1], 'code': row[2], 'name': row[3]}

            cursor.execute("DELETE FROM landscape.tbl_system_picklist WHERE picklist_id = %s", [picklist_id])
            _log_system_activity('tbl_system_picklist', 'delete', 1, reason)

            return {'success': True, 'action': 'deleted', 'deleted_item': deleted_info}

    except Exception as e:
        logger.error(f"Error deleting picklist value: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Global Benchmark Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_benchmarks')
def get_benchmarks(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve global benchmark values."""
    benchmark_id = tool_input.get('benchmark_id')
    category = tool_input.get('category')
    property_type = tool_input.get('property_type')
    market = tool_input.get('market')
    limit = tool_input.get('limit', 100)

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT benchmark_id, category, subcategory, benchmark_name, description,
                       market_geography, property_type, source_type, as_of_date,
                       confidence_level, context_metadata, is_active, is_global
                FROM landscape.tbl_global_benchmark_registry
                WHERE 1=1
            """
            params = []

            if benchmark_id is not None:
                sql += " AND benchmark_id = %s"
                params.append(benchmark_id)

            if category is not None:
                sql += " AND category ILIKE %s"
                params.append(f'%{category}%')

            if property_type is not None:
                sql += " AND property_type ILIKE %s"
                params.append(f'%{property_type}%')

            if market is not None:
                sql += " AND market_geography ILIKE %s"
                params.append(f'%{market}%')

            sql += " ORDER BY category, benchmark_name LIMIT %s"
            params.append(limit)

            cursor.execute(sql, params)
            columns = ['benchmark_id', 'category', 'subcategory', 'benchmark_name', 'description',
                       'market_geography', 'property_type', 'source_type', 'as_of_date',
                       'confidence_level', 'context_metadata', 'is_active', 'is_global']
            benchmarks = [dict(zip(columns, row)) for row in cursor.fetchall()]

            # Convert dates
            for b in benchmarks:
                if b.get('as_of_date'):
                    b['as_of_date'] = str(b['as_of_date'])

            return {
                'success': True,
                'benchmarks': benchmarks,
                'count': len(benchmarks)
            }

    except Exception as e:
        logger.error(f"Error getting benchmarks: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_benchmark', is_mutation=True)
def update_benchmark(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create or update a global benchmark value."""
    benchmark_id = tool_input.get('benchmark_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Update benchmark')

    # Map alternative field names
    if 'name' in tool_input and 'benchmark_name' not in tool_input:
        tool_input['benchmark_name'] = tool_input['name']
    if 'market' in tool_input and 'market_geography' not in tool_input:
        tool_input['market_geography'] = tool_input['market']

    # Build update data
    update_data = {}
    for col in BENCHMARK_COLUMNS:
        if col in tool_input and tool_input[col] is not None:
            update_data[col] = tool_input[col]

    if not update_data and not benchmark_id:
        return {'success': False, 'error': 'No data provided for update'}

    # Handle JSONB context_metadata
    if 'context_metadata' in update_data and isinstance(update_data['context_metadata'], dict):
        update_data['context_metadata'] = json.dumps(update_data['context_metadata'])

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_upsert',
            table_name='tbl_global_benchmark_registry',
            field_name=None,
            record_id=str(benchmark_id) if benchmark_id else 'new',
            proposed_value=update_data,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if benchmark_id:
                # Update existing
                if update_data:
                    update_data['updated_at'] = 'NOW()'
                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        if v == 'NOW()':
                            set_parts.append(f"{k} = NOW()")
                        else:
                            set_parts.append(f"{k} = %s")
                            values.append(v)

                    cursor.execute(f"""
                        UPDATE landscape.tbl_global_benchmark_registry
                        SET {', '.join(set_parts)}
                        WHERE benchmark_id = %s
                        RETURNING benchmark_id, category, benchmark_name
                    """, values + [benchmark_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Benchmark {benchmark_id} not found'}
                    _log_system_activity('tbl_global_benchmark_registry', 'update', 1, reason)
                    return {'success': True, 'action': 'updated', 'benchmark_id': row[0],
                            'category': row[1], 'name': row[2]}
            else:
                # Insert new
                if 'benchmark_name' not in update_data or 'category' not in update_data:
                    return {'success': False, 'error': 'New benchmark requires benchmark_name (name) and category'}

                # Set required defaults
                if 'source_type' not in update_data:
                    update_data['source_type'] = 'manual'
                if 'user_id' not in update_data:
                    update_data['user_id'] = 'landscaper_ai'

                columns = list(update_data.keys())
                placeholders = ', '.join(['%s'] * len(columns))

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_global_benchmark_registry ({', '.join(columns)})
                    VALUES ({placeholders})
                    RETURNING benchmark_id, category, benchmark_name
                """, list(update_data.values()))
                row = cursor.fetchone()
                _log_system_activity('tbl_global_benchmark_registry', 'create', 1, reason)
                return {'success': True, 'action': 'created', 'benchmark_id': row[0],
                        'category': row[1], 'name': row[2]}

    except Exception as e:
        logger.error(f"Error updating benchmark: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_benchmark', is_mutation=True)
def delete_benchmark(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Delete a benchmark value."""
    benchmark_id = tool_input.get('benchmark_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Delete benchmark')

    if not benchmark_id:
        return {'success': False, 'error': 'benchmark_id is required'}

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_delete',
            table_name='tbl_global_benchmark_registry',
            field_name=None,
            record_id=str(benchmark_id),
            proposed_value={'delete': True, 'benchmark_id': benchmark_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT benchmark_id, category, benchmark_name
                FROM landscape.tbl_global_benchmark_registry
                WHERE benchmark_id = %s
            """, [benchmark_id])
            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'Benchmark {benchmark_id} not found'}

            deleted_info = {'benchmark_id': row[0], 'category': row[1], 'name': row[2]}

            cursor.execute("DELETE FROM landscape.tbl_global_benchmark_registry WHERE benchmark_id = %s", [benchmark_id])
            _log_system_activity('tbl_global_benchmark_registry', 'delete', 1, reason)

            return {'success': True, 'action': 'deleted', 'deleted_item': deleted_info}

    except Exception as e:
        logger.error(f"Error deleting benchmark: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('search_irem_benchmarks')
def search_irem_benchmarks(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Search IREM expense benchmarks for multifamily operating expenses.

    This tool provides access to IREM (Institute of Real Estate Management)
    benchmark data for expense validation and comparison.

    Input parameters:
    - query: Search term (e.g., "R&M", "utilities", "insurance")
    - category: Specific expense category (optional)
    - subcategory: Specific subcategory (optional)
    - property_type: Property type filter (default: "multifamily")
    - year: Specific year (optional, defaults to most recent)
    - compare_value: Actual value to compare against benchmark (optional)
    - value_type: Type of comparison ("per_unit", "pct_of_egi") - required with compare_value

    Returns benchmark data including per_unit_amount, pct_of_egi, sample_size, etc.
    """
    from apps.knowledge.services.benchmark_service import get_benchmark_service

    query = tool_input.get('query')
    category = tool_input.get('category')
    subcategory = tool_input.get('subcategory')
    property_type = tool_input.get('property_type', 'multifamily')
    year = tool_input.get('year')
    compare_value = tool_input.get('compare_value')
    value_type = tool_input.get('value_type')

    try:
        service = get_benchmark_service()

        # If comparing a value to benchmark
        if compare_value is not None and value_type:
            if not category:
                return {'success': False, 'error': 'category is required for comparison'}

            result = service.compare_to_benchmark(
                actual_value=float(compare_value),
                value_type=value_type,
                expense_category=category,
                expense_subcategory=subcategory,
                property_type=property_type,
            )
            return {'success': True, 'comparison': result}

        # If searching by query term
        if query:
            results = service.search_benchmarks(
                query=query,
                property_type=property_type,
                source_year=int(year) if year else None,
            )
            return {
                'success': True,
                'query': query,
                'results': results,
                'count': len(results)
            }

        # If getting specific category
        if category:
            result = service.get_benchmark(
                expense_category=category,
                expense_subcategory=subcategory,
                property_type=property_type,
                source_year=int(year) if year else None,
            )
            if result:
                return {'success': True, 'benchmark': result}
            else:
                return {'success': False, 'error': f'No benchmark found for {category}'}

        # If no query or category, return full expense summary
        summary = service.get_expense_summary(
            source='IREM',
            source_year=int(year) if year else 2024,
            property_type=property_type,
        )
        return {'success': True, 'summary': summary}

    except Exception as e:
        logger.error(f"Error searching IREM benchmarks: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('query_platform_knowledge')
def query_platform_knowledge(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Query platform knowledge base (RAG) for real estate concepts and methodologies.

    This tool searches foundational reference documents like The Appraisal of Real Estate,
    IREM publications, USPAP standards, etc. for relevant information.

    Input parameters:
    - query: Natural language question (required)
    - property_type: Filter by property type (e.g., "multifamily", "hotel")
    - knowledge_domain: Filter by domain (e.g., "valuation", "cost")
    - max_chunks: Maximum chunks to return (default: 5)

    Returns relevant text chunks with source citations.
    """
    from apps.knowledge.services.platform_knowledge_retriever import get_platform_knowledge_retriever

    query = tool_input.get('query')
    if not query:
        return {'success': False, 'error': 'query is required'}

    property_type = tool_input.get('property_type')
    knowledge_domain = tool_input.get('knowledge_domain')
    max_chunks = tool_input.get('max_chunks', 5)

    try:
        retriever = get_platform_knowledge_retriever()
        chunks = retriever.retrieve(
            query=query,
            property_type=property_type,
            knowledge_domain=knowledge_domain,
            max_chunks=max_chunks,
            similarity_threshold=0.65,
        )

        if not chunks:
            return {
                'success': True,
                'chunks': [],
                'count': 0,
                'message': 'No relevant content found in platform knowledge base.'
            }

        # Format results for Claude
        formatted_chunks = []
        for chunk in chunks:
            formatted_chunks.append({
                'content': chunk['content'],
                'similarity': chunk['similarity'],
                'source': {
                    'document': chunk['source'].get('document_title'),
                    'publisher': chunk['source'].get('publisher'),
                    'chapter': chunk['source'].get('chapter_title'),
                    'page': chunk['source'].get('page'),
                }
            })

        return {
            'success': True,
            'chunks': formatted_chunks,
            'count': len(formatted_chunks)
        }

    except Exception as e:
        logger.error(f"Error querying platform knowledge: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Cost Library Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_cost_library_items')
def get_cost_library_items(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve cost library items."""
    item_id = tool_input.get('item_id')
    category_id = tool_input.get('category_id')
    is_active = tool_input.get('is_active')
    limit = tool_input.get('limit', 200)

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT i.item_id, i.category_id, c.category_name, i.item_name,
                       i.default_uom_code, i.typical_low_value, i.typical_mid_value, i.typical_high_value,
                       i.market_geography, i.project_type_code, i.is_active, i.source, i.as_of_date
                FROM landscape.core_unit_cost_item i
                LEFT JOIN landscape.core_unit_cost_category c ON i.category_id = c.category_id
                WHERE 1=1
            """
            params = []

            if item_id is not None:
                sql += " AND i.item_id = %s"
                params.append(item_id)

            if category_id is not None:
                sql += " AND i.category_id = %s"
                params.append(category_id)

            if is_active is not None:
                sql += " AND i.is_active = %s"
                params.append(is_active)

            sql += " ORDER BY c.category_name, i.item_name LIMIT %s"
            params.append(limit)

            cursor.execute(sql, params)
            columns = ['item_id', 'category_id', 'category_name', 'item_name',
                       'default_uom_code', 'typical_low_value', 'typical_mid_value', 'typical_high_value',
                       'market_geography', 'project_type_code', 'is_active', 'source', 'as_of_date']
            items = [dict(zip(columns, row)) for row in cursor.fetchall()]

            # Convert decimals and dates
            for item in items:
                for key in ['typical_low_value', 'typical_mid_value', 'typical_high_value']:
                    if item.get(key):
                        item[key] = float(item[key])
                if item.get('as_of_date'):
                    item['as_of_date'] = str(item['as_of_date'])

            return {
                'success': True,
                'items': items,
                'count': len(items)
            }

    except Exception as e:
        logger.error(f"Error getting cost library items: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_cost_library_item', is_mutation=True)
def update_cost_library_item(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create or update a cost library item."""
    item_id = tool_input.get('item_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Update cost library item')

    # Map alternative field names
    if 'name' in tool_input and 'item_name' not in tool_input:
        tool_input['item_name'] = tool_input['name']
    if 'unit_cost' in tool_input and 'typical_mid_value' not in tool_input:
        tool_input['typical_mid_value'] = tool_input['unit_cost']
    if 'unit_of_measure' in tool_input and 'default_uom_code' not in tool_input:
        tool_input['default_uom_code'] = tool_input['unit_of_measure']

    # Build update data
    update_data = {}
    for col in COST_ITEM_COLUMNS:
        if col in tool_input and tool_input[col] is not None:
            update_data[col] = tool_input[col]

    if not update_data and not item_id:
        return {'success': False, 'error': 'No data provided for update'}

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_upsert',
            table_name='core_unit_cost_item',
            field_name=None,
            record_id=str(item_id) if item_id else 'new',
            proposed_value=update_data,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if item_id:
                # Update existing
                if update_data:
                    update_data['updated_at'] = 'NOW()'
                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        if v == 'NOW()':
                            set_parts.append(f"{k} = NOW()")
                        else:
                            set_parts.append(f"{k} = %s")
                            values.append(v)

                    cursor.execute(f"""
                        UPDATE landscape.core_unit_cost_item
                        SET {', '.join(set_parts)}
                        WHERE item_id = %s
                        RETURNING item_id, item_name, typical_mid_value
                    """, values + [item_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Cost item {item_id} not found'}
                    _log_system_activity('core_unit_cost_item', 'update', 1, reason)
                    return {'success': True, 'action': 'updated', 'item_id': row[0],
                            'name': row[1], 'unit_cost': float(row[2]) if row[2] else None}
            else:
                # Insert new
                if 'item_name' not in update_data:
                    return {'success': False, 'error': 'New cost item requires item_name'}

                columns = list(update_data.keys())
                placeholders = ', '.join(['%s'] * len(columns))

                cursor.execute(f"""
                    INSERT INTO landscape.core_unit_cost_item ({', '.join(columns)})
                    VALUES ({placeholders})
                    RETURNING item_id, item_name, typical_mid_value
                """, list(update_data.values()))
                row = cursor.fetchone()
                _log_system_activity('core_unit_cost_item', 'create', 1, reason)
                return {'success': True, 'action': 'created', 'item_id': row[0],
                        'name': row[1], 'unit_cost': float(row[2]) if row[2] else None}

    except Exception as e:
        logger.error(f"Error updating cost library item: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('delete_cost_library_item', is_mutation=True)
def delete_cost_library_item(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Delete a cost library item."""
    item_id = tool_input.get('item_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Delete cost library item')

    if not item_id:
        return {'success': False, 'error': 'item_id is required'}

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_delete',
            table_name='core_unit_cost_item',
            field_name=None,
            record_id=str(item_id),
            proposed_value={'delete': True, 'item_id': item_id},
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT item_id, item_name, category_id
                FROM landscape.core_unit_cost_item
                WHERE item_id = %s
            """, [item_id])
            row = cursor.fetchone()
            if not row:
                return {'success': False, 'error': f'Cost item {item_id} not found'}

            deleted_info = {'item_id': row[0], 'name': row[1], 'category_id': row[2]}

            cursor.execute("DELETE FROM landscape.core_unit_cost_item WHERE item_id = %s", [item_id])
            _log_system_activity('core_unit_cost_item', 'delete', 1, reason)

            return {'success': True, 'action': 'deleted', 'deleted_item': deleted_info}

    except Exception as e:
        logger.error(f"Error deleting cost library item: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Template Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool('get_report_templates')
def get_report_templates(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve report templates."""
    template_id = tool_input.get('template_id')
    output_format = tool_input.get('output_format') or tool_input.get('report_type')
    is_active = tool_input.get('is_active')

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT id, template_name, description, output_format,
                       assigned_tabs, sections, is_active, created_by
                FROM landscape.report_templates
                WHERE 1=1
            """
            params = []

            if template_id is not None:
                sql += " AND id = %s"
                params.append(template_id)

            if output_format is not None:
                sql += " AND output_format ILIKE %s"
                params.append(f'%{output_format}%')

            if is_active is not None:
                sql += " AND is_active = %s"
                params.append(is_active)

            sql += " ORDER BY template_name"

            cursor.execute(sql, params)
            columns = ['template_id', 'template_name', 'description', 'output_format',
                       'assigned_tabs', 'sections', 'is_active', 'created_by']
            templates = [dict(zip(columns, row)) for row in cursor.fetchall()]

            return {
                'success': True,
                'templates': templates,
                'count': len(templates)
            }

    except Exception as e:
        logger.error(f"Error getting report templates: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('get_dms_templates')
def get_dms_templates(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve DMS templates."""
    template_id = tool_input.get('template_id')
    doc_type = tool_input.get('doc_type') or tool_input.get('document_type')
    is_default = tool_input.get('is_default')

    try:
        with connection.cursor() as cursor:
            sql = """
                SELECT template_id, template_name, workspace_id, project_id,
                       doc_type, is_default, doc_type_options, description
                FROM landscape.dms_templates
                WHERE 1=1
            """
            params = []

            if template_id is not None:
                sql += " AND template_id = %s"
                params.append(template_id)

            if doc_type is not None:
                sql += " AND doc_type ILIKE %s"
                params.append(f'%{doc_type}%')

            if is_default is not None:
                sql += " AND is_default = %s"
                params.append(is_default)

            sql += " ORDER BY template_name"

            cursor.execute(sql, params)
            columns = ['template_id', 'template_name', 'workspace_id', 'project_id',
                       'doc_type', 'is_default', 'doc_type_options', 'description']
            templates = [dict(zip(columns, row)) for row in cursor.fetchall()]

            return {
                'success': True,
                'templates': templates,
                'count': len(templates)
            }

    except Exception as e:
        logger.error(f"Error getting DMS templates: {e}")
        return {'success': False, 'error': str(e)}


@register_tool('update_template', is_mutation=True)
def update_template(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create or update a template (report or DMS)."""
    template_type = tool_input.get('template_type', 'report')
    template_id = tool_input.get('template_id') or tool_input.get('id')
    reason = tool_input.get('reason', 'Update template')

    if template_type == 'report':
        table_name = 'report_templates'
        pk_col = 'id'
        columns = REPORT_TEMPLATE_COLUMNS
    elif template_type == 'dms':
        table_name = 'dms_templates'
        pk_col = 'template_id'
        columns = DMS_TEMPLATE_COLUMNS
    else:
        return {'success': False, 'error': f"Unknown template_type: {template_type}. Use 'report' or 'dms'"}

    # Build update data
    update_data = {}
    for col in columns:
        if col in tool_input and tool_input[col] is not None:
            val = tool_input[col]
            # Handle JSONB fields
            if col in ['assigned_tabs', 'sections', 'template_data'] and isinstance(val, (dict, list)):
                val = json.dumps(val)
            update_data[col] = val

    if not update_data and not template_id:
        return {'success': False, 'error': 'No data provided for update'}

    if propose_only:
        return create_mutation_proposal(
            project_id=project_id,
            mutation_type='system_upsert',
            table_name=table_name,
            field_name=None,
            record_id=str(template_id) if template_id else 'new',
            proposed_value=update_data,
            current_value=None,
            reason=reason,
            source_message_id=source_message_id,
        )

    try:
        with connection.cursor() as cursor:
            if template_id:
                # Update existing
                if update_data:
                    update_data['updated_at'] = 'NOW()'
                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        if v == 'NOW()':
                            set_parts.append(f"{k} = NOW()")
                        else:
                            set_parts.append(f"{k} = %s")
                            values.append(v)

                    cursor.execute(f"""
                        UPDATE landscape.{table_name}
                        SET {', '.join(set_parts)}
                        WHERE {pk_col} = %s
                        RETURNING {pk_col}, template_name
                    """, values + [template_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Template {template_id} not found'}
                    _log_system_activity(table_name, 'update', 1, reason)
                    return {'success': True, 'action': 'updated', 'template_id': row[0], 'name': row[1]}
            else:
                # Insert new
                if 'template_name' not in update_data:
                    return {'success': False, 'error': 'New template requires template_name'}

                # Get next ID for report_templates (bigint without sequence)
                if template_type == 'report':
                    cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM landscape.report_templates")
                    new_id = cursor.fetchone()[0]
                    update_data['id'] = new_id
                    if 'is_active' not in update_data:
                        update_data['is_active'] = True
                    if 'assigned_tabs' not in update_data:
                        update_data['assigned_tabs'] = '[]'
                    if 'sections' not in update_data:
                        update_data['sections'] = '[]'
                    if 'output_format' not in update_data:
                        update_data['output_format'] = 'pdf'
                    update_data['created_at'] = 'NOW()'

                columns_list = list(update_data.keys())
                placeholders = []
                values = []
                for k, v in update_data.items():
                    if v == 'NOW()':
                        placeholders.append('NOW()')
                    else:
                        placeholders.append('%s')
                        values.append(v)

                cursor.execute(f"""
                    INSERT INTO landscape.{table_name} ({', '.join(columns_list)})
                    VALUES ({', '.join(placeholders)})
                    RETURNING {pk_col}, template_name
                """, values)
                row = cursor.fetchone()
                _log_system_activity(table_name, 'create', 1, reason)
                return {'success': True, 'action': 'created', 'template_id': row[0], 'name': row[1]}

    except Exception as e:
        logger.error(f"Error updating template: {e}")
        return {'success': False, 'error': str(e)}


# =============================================================================
# PART 8: CRE, Market Intelligence, Sales & Knowledge Tools
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# Column Definitions for Part 8 Tables
# ─────────────────────────────────────────────────────────────────────────────

# CRE tables
CRE_TENANT_COLUMNS = [
    'tenant_name', 'tenant_legal_name', 'dba_name', 'industry', 'naics_code',
    'business_type', 'credit_rating', 'creditworthiness', 'dun_bradstreet_number',
    'annual_revenue', 'years_in_business', 'contact_name', 'contact_title',
    'email', 'phone', 'guarantor_name', 'guarantor_type'
]

CRE_SPACE_COLUMNS = [
    'cre_property_id', 'space_number', 'floor_number', 'usable_sf', 'rentable_sf',
    'space_type', 'frontage_ft', 'ceiling_height_ft', 'number_of_offices',
    'number_of_conference_rooms', 'has_kitchenette', 'has_private_restroom',
    'space_status', 'available_date'
]

CRE_LEASE_COLUMNS = [
    'cre_property_id', 'space_id', 'tenant_id', 'lease_number', 'lease_type',
    'lease_status', 'lease_execution_date', 'lease_commencement_date',
    'rent_commencement_date', 'lease_expiration_date', 'lease_term_months',
    'leased_sf', 'number_of_options', 'option_term_months', 'option_notice_months',
    'early_termination_allowed', 'termination_notice_months', 'termination_penalty_amount',
    'security_deposit_amount', 'security_deposit_months', 'expansion_rights',
    'right_of_first_refusal', 'exclusive_use_clause', 'co_tenancy_clause',
    'radius_restriction', 'notes'
]

CRE_PROPERTY_COLUMNS = [
    'project_id', 'parcel_id', 'property_name', 'property_type', 'property_subtype',
    'total_building_sf', 'rentable_sf', 'usable_sf', 'common_area_sf', 'load_factor',
    'year_built', 'year_renovated', 'number_of_floors', 'number_of_units',
    'parking_spaces', 'parking_ratio', 'property_status', 'stabilization_date',
    'stabilized_occupancy_pct', 'acquisition_date', 'acquisition_price', 'current_assessed_value'
]

CRE_BASE_RENT_COLUMNS = [
    'lease_id', 'period_start_date', 'period_end_date', 'period_number',
    'base_rent_annual', 'base_rent_monthly', 'base_rent_psf_annual', 'rent_type'
]

CRE_EXPENSE_RECOVERY_COLUMNS = [
    'lease_id', 'recovery_structure', 'recovery_method', 'property_tax_recovery_pct',
    'insurance_recovery_pct', 'cam_recovery_pct', 'utilities_recovery_pct',
    'expense_cap_psf', 'expense_cap_escalation_pct'
]

# Market intelligence tables
MARKET_COMPETITIVE_PROJECTS_COLUMNS = [
    'project_id', 'master_plan_name', 'comp_name', 'builder_name', 'comp_address',
    'latitude', 'longitude', 'city', 'zip_code', 'total_units', 'price_min',
    'price_max', 'absorption_rate_monthly', 'status', 'data_source', 'source_url',
    'notes', 'source_project_id', 'effective_date'
]

BMK_ABSORPTION_VELOCITY_COLUMNS = [
    'benchmark_id', 'velocity_annual', 'market_geography', 'project_scale', 'notes'
]

MARKET_ASSUMPTIONS_COLUMNS = [
    'project_id', 'lu_type_code', 'price_per_unit', 'unit_of_measure',
    'inflation_type', 'dvl_per_year', 'dvl_per_quarter', 'dvl_per_month',
    'commission_basis', 'demand_unit', 'uom'
]

# Sales/Absorption tables
ABSORPTION_SCHEDULE_COLUMNS = [
    'project_id', 'area_id', 'phase_id', 'parcel_id', 'revenue_stream_name',
    'revenue_category', 'lu_family_name', 'lu_type_code', 'product_code',
    'start_period', 'periods_to_complete', 'timing_method', 'units_per_period',
    'total_units', 'base_price_per_unit', 'price_escalation_pct', 'scenario_name',
    'probability_weight', 'notes', 'scenario_id'
]

PARCEL_SALE_EVENT_COLUMNS = [
    'project_id', 'parcel_id', 'phase_id', 'sale_type', 'buyer_entity',
    'buyer_contact_id', 'contract_date', 'total_lots_contracted', 'base_price_per_lot',
    'price_escalation_formula', 'deposit_amount', 'deposit_date', 'deposit_terms',
    'deposit_applied_to_purchase', 'has_escrow_holdback', 'escrow_holdback_amount',
    'escrow_release_terms', 'commission_pct', 'closing_cost_per_unit', 'onsite_cost_pct',
    'has_custom_overrides', 'sale_status', 'notes'
]

# Knowledge/AI tables
KNOWLEDGE_ENTITY_COLUMNS = [
    'entity_type', 'entity_subtype', 'canonical_name', 'metadata'
]

KNOWLEDGE_FACT_COLUMNS = [
    'subject_entity_id', 'predicate', 'object_value', 'object_entity_id',
    'valid_from', 'valid_to', 'source_type', 'source_id', 'confidence_score', 'is_current'
]

KNOWLEDGE_INSIGHT_COLUMNS = [
    'subject_entity_id', 'insight_type', 'related_entities', 'insight_title',
    'insight_description', 'severity', 'supporting_facts', 'metadata',
    'acknowledged', 'user_action'
]

AI_EXTRACTION_STAGING_COLUMNS = [
    'project_id', 'doc_id', 'target_table', 'target_field', 'extracted_value',
    'extraction_type', 'source_text', 'confidence_score', 'status', 'validated_value',
    'validated_by', 'field_key', 'property_type', 'db_write_type', 'selector_json',
    'scope', 'scope_id', 'source_page', 'source_snippet', 'rejection_reason',
    'scope_label', 'array_index'
]

AI_CORRECTION_LOG_COLUMNS = [
    'queue_id', 'field_path', 'ai_value', 'user_value', 'ai_confidence',
    'correction_type', 'page_number', 'source_quote', 'user_notes'
]


# ─────────────────────────────────────────────────────────────────────────────
# CRE Tools (Commercial Real Estate)
# ─────────────────────────────────────────────────────────────────────────────

@register_tool("get_cre_tenants")
def get_cre_tenants(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get commercial tenants."""
    tenant_id = kwargs.get('tenant_id')
    is_active = kwargs.get('is_active')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = "SELECT * FROM landscape.tbl_cre_tenant WHERE 1=1"
                params = []

                if tenant_id:
                    query += " AND tenant_id = %s"
                    params.append(tenant_id)

                # Note: tbl_cre_tenant doesn't have is_active column

                query += " ORDER BY tenant_name"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                return {
                    'success': True,
                    'tenants': [dict(r) for r in rows],
                    'count': len(rows)
                }
    except Exception as e:
        logger.error(f"Error getting CRE tenants: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("update_cre_tenant", is_mutation=True)
def update_cre_tenant(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a commercial tenant."""
    tenant_id = kwargs.get('id') or kwargs.get('tenant_id')
    reason = kwargs.get('reason', 'CRE tenant update')

    # Build update data
    update_data = {}
    for field in CRE_TENANT_COLUMNS:
        if field in kwargs:
            update_data[field] = kwargs[field]

    # Handle field aliases
    if 'name' in kwargs and 'tenant_name' not in update_data:
        update_data['tenant_name'] = kwargs['name']
    if 'trade_name' in kwargs and 'dba_name' not in update_data:
        update_data['dba_name'] = kwargs['trade_name']

    if not update_data:
        return {'success': False, 'error': 'No valid fields to update'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if tenant_id:
                    # Update existing
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='cre_upsert',
                            table_name='tbl_cre_tenant',
                            target_id=tenant_id,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        set_parts.append(f"{k} = %s")
                        values.append(v)
                    set_parts.append("updated_at = NOW()")

                    cursor.execute(f"""
                        UPDATE landscape.tbl_cre_tenant
                        SET {', '.join(set_parts)}
                        WHERE tenant_id = %s
                        RETURNING tenant_id, tenant_name
                    """, values + [tenant_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Tenant {tenant_id} not found'}
                    conn.commit()
                    return {'success': True, 'action': 'updated', 'tenant_id': row['tenant_id'], 'name': row['tenant_name']}
                else:
                    # Insert new
                    if 'tenant_name' not in update_data:
                        return {'success': False, 'error': 'tenant_name required for new tenant'}

                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='cre_upsert',
                            table_name='tbl_cre_tenant',
                            target_id=None,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    columns = list(update_data.keys())
                    placeholders = ['%s'] * len(columns)
                    values = list(update_data.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.tbl_cre_tenant ({', '.join(columns)}, created_at, updated_at)
                        VALUES ({', '.join(placeholders)}, NOW(), NOW())
                        RETURNING tenant_id, tenant_name
                    """, values)
                    row = cursor.fetchone()
                    conn.commit()
                    return {'success': True, 'action': 'created', 'tenant_id': row['tenant_id'], 'name': row['tenant_name']}
    except Exception as e:
        logger.error(f"Error updating CRE tenant: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("delete_cre_tenant", is_mutation=True)
def delete_cre_tenant(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a commercial tenant."""
    tenant_id = kwargs.get('id') or kwargs.get('tenant_id')
    reason = kwargs.get('reason', 'Delete CRE tenant')

    if not tenant_id:
        return {'success': False, 'error': 'tenant_id required'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get tenant info first
                cursor.execute("""
                    SELECT tenant_id, tenant_name FROM landscape.tbl_cre_tenant WHERE tenant_id = %s
                """, [tenant_id])
                tenant = cursor.fetchone()
                if not tenant:
                    return {'success': False, 'error': f'Tenant {tenant_id} not found'}

                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='cre_delete',
                        table_name='tbl_cre_tenant',
                        target_id=tenant_id,
                        changes={'_delete': True, 'tenant_name': tenant['tenant_name']},
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                cursor.execute("DELETE FROM landscape.tbl_cre_tenant WHERE tenant_id = %s", [tenant_id])
                conn.commit()
                return {'success': True, 'action': 'deleted', 'tenant_id': tenant_id, 'name': tenant['tenant_name']}
    except Exception as e:
        logger.error(f"Error deleting CRE tenant: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_cre_spaces")
def get_cre_spaces(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get commercial spaces/units for a CRE property."""
    space_id = kwargs.get('space_id')
    cre_property_id = kwargs.get('cre_property_id') or kwargs.get('property_id')
    floor_number = kwargs.get('floor') or kwargs.get('floor_number')
    space_status = kwargs.get('status') or kwargs.get('space_status')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT s.*, p.property_name
                    FROM landscape.tbl_cre_space s
                    LEFT JOIN landscape.tbl_cre_property p ON s.cre_property_id = p.cre_property_id
                    WHERE 1=1
                """
                params = []

                if space_id:
                    query += " AND s.space_id = %s"
                    params.append(space_id)
                if cre_property_id:
                    query += " AND s.cre_property_id = %s"
                    params.append(cre_property_id)
                if floor_number is not None:
                    query += " AND s.floor_number = %s"
                    params.append(floor_number)
                if space_status:
                    query += " AND s.space_status = %s"
                    params.append(space_status)

                query += " ORDER BY s.floor_number, s.space_number"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                return {
                    'success': True,
                    'spaces': [dict(r) for r in rows],
                    'count': len(rows)
                }
    except Exception as e:
        logger.error(f"Error getting CRE spaces: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("update_cre_space", is_mutation=True)
def update_cre_space(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a commercial space."""
    space_id = kwargs.get('id') or kwargs.get('space_id')
    reason = kwargs.get('reason', 'CRE space update')

    # Build update data
    update_data = {}
    for field in CRE_SPACE_COLUMNS:
        if field in kwargs:
            update_data[field] = kwargs[field]

    # Handle field aliases
    if 'property_id' in kwargs and 'cre_property_id' not in update_data:
        update_data['cre_property_id'] = kwargs['property_id']
    if 'unit_number' in kwargs and 'space_number' not in update_data:
        update_data['space_number'] = kwargs['unit_number']
    if 'floor' in kwargs and 'floor_number' not in update_data:
        update_data['floor_number'] = kwargs['floor']
    if 'status' in kwargs and 'space_status' not in update_data:
        update_data['space_status'] = kwargs['status']

    if not update_data:
        return {'success': False, 'error': 'No valid fields to update'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if space_id:
                    # Update existing
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='cre_upsert',
                            table_name='tbl_cre_space',
                            target_id=space_id,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        set_parts.append(f"{k} = %s")
                        values.append(v)
                    set_parts.append("updated_at = NOW()")

                    cursor.execute(f"""
                        UPDATE landscape.tbl_cre_space
                        SET {', '.join(set_parts)}
                        WHERE space_id = %s
                        RETURNING space_id, space_number
                    """, values + [space_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Space {space_id} not found'}
                    conn.commit()
                    return {'success': True, 'action': 'updated', 'space_id': row['space_id'], 'space_number': row['space_number']}
                else:
                    # Insert new
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='cre_upsert',
                            table_name='tbl_cre_space',
                            target_id=None,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    columns = list(update_data.keys())
                    placeholders = ['%s'] * len(columns)
                    values = list(update_data.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.tbl_cre_space ({', '.join(columns)}, created_at, updated_at)
                        VALUES ({', '.join(placeholders)}, NOW(), NOW())
                        RETURNING space_id, space_number
                    """, values)
                    row = cursor.fetchone()
                    conn.commit()
                    return {'success': True, 'action': 'created', 'space_id': row['space_id'], 'space_number': row['space_number']}
    except Exception as e:
        logger.error(f"Error updating CRE space: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("delete_cre_space", is_mutation=True)
def delete_cre_space(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a commercial space."""
    space_id = kwargs.get('id') or kwargs.get('space_id')
    reason = kwargs.get('reason', 'Delete CRE space')

    if not space_id:
        return {'success': False, 'error': 'space_id required'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT space_id, space_number FROM landscape.tbl_cre_space WHERE space_id = %s
                """, [space_id])
                space = cursor.fetchone()
                if not space:
                    return {'success': False, 'error': f'Space {space_id} not found'}

                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='cre_delete',
                        table_name='tbl_cre_space',
                        target_id=space_id,
                        changes={'_delete': True, 'space_number': space['space_number']},
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                cursor.execute("DELETE FROM landscape.tbl_cre_space WHERE space_id = %s", [space_id])
                conn.commit()
                return {'success': True, 'action': 'deleted', 'space_id': space_id, 'space_number': space['space_number']}
    except Exception as e:
        logger.error(f"Error deleting CRE space: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_cre_leases")
def get_cre_leases(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get commercial leases with tenant and space details."""
    lease_id = kwargs.get('lease_id')
    tenant_id = kwargs.get('tenant_id')
    space_id = kwargs.get('space_id')
    cre_property_id = kwargs.get('cre_property_id') or kwargs.get('property_id')
    lease_status = kwargs.get('status') or kwargs.get('lease_status')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT l.*,
                           t.tenant_name, t.industry, t.credit_rating,
                           s.space_number, s.rentable_sf as space_sf, s.floor_number,
                           p.property_name
                    FROM landscape.tbl_cre_lease l
                    LEFT JOIN landscape.tbl_cre_tenant t ON l.tenant_id = t.tenant_id
                    LEFT JOIN landscape.tbl_cre_space s ON l.space_id = s.space_id
                    LEFT JOIN landscape.tbl_cre_property p ON l.cre_property_id = p.cre_property_id
                    WHERE 1=1
                """
                params = []

                if lease_id:
                    query += " AND l.lease_id = %s"
                    params.append(lease_id)
                if tenant_id:
                    query += " AND l.tenant_id = %s"
                    params.append(tenant_id)
                if space_id:
                    query += " AND l.space_id = %s"
                    params.append(space_id)
                if cre_property_id:
                    query += " AND l.cre_property_id = %s"
                    params.append(cre_property_id)
                if lease_status:
                    query += " AND l.lease_status = %s"
                    params.append(lease_status)

                query += " ORDER BY l.lease_commencement_date DESC"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                return {
                    'success': True,
                    'leases': [dict(r) for r in rows],
                    'count': len(rows)
                }
    except Exception as e:
        logger.error(f"Error getting CRE leases: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("update_cre_lease", is_mutation=True)
def update_cre_lease(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a commercial lease."""
    lease_id = kwargs.get('id') or kwargs.get('lease_id')
    reason = kwargs.get('reason', 'CRE lease update')

    # Build update data
    update_data = {}
    for field in CRE_LEASE_COLUMNS:
        if field in kwargs:
            update_data[field] = kwargs[field]

    # Handle field aliases
    if 'property_id' in kwargs and 'cre_property_id' not in update_data:
        update_data['cre_property_id'] = kwargs['property_id']
    if 'commencement_date' in kwargs and 'lease_commencement_date' not in update_data:
        update_data['lease_commencement_date'] = kwargs['commencement_date']
    if 'expiration_date' in kwargs and 'lease_expiration_date' not in update_data:
        update_data['lease_expiration_date'] = kwargs['expiration_date']
    if 'term_months' in kwargs and 'lease_term_months' not in update_data:
        update_data['lease_term_months'] = kwargs['term_months']
    if 'status' in kwargs and 'lease_status' not in update_data:
        update_data['lease_status'] = kwargs['status']

    if not update_data:
        return {'success': False, 'error': 'No valid fields to update'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if lease_id:
                    # Update existing
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='cre_upsert',
                            table_name='tbl_cre_lease',
                            target_id=lease_id,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        set_parts.append(f"{k} = %s")
                        values.append(v)
                    set_parts.append("updated_at = NOW()")

                    cursor.execute(f"""
                        UPDATE landscape.tbl_cre_lease
                        SET {', '.join(set_parts)}
                        WHERE lease_id = %s
                        RETURNING lease_id, lease_number
                    """, values + [lease_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Lease {lease_id} not found'}
                    conn.commit()
                    return {'success': True, 'action': 'updated', 'lease_id': row['lease_id'], 'lease_number': row['lease_number']}
                else:
                    # Insert new
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='cre_upsert',
                            table_name='tbl_cre_lease',
                            target_id=None,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    columns = list(update_data.keys())
                    placeholders = ['%s'] * len(columns)
                    values = list(update_data.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.tbl_cre_lease ({', '.join(columns)}, created_at, updated_at)
                        VALUES ({', '.join(placeholders)}, NOW(), NOW())
                        RETURNING lease_id, lease_number
                    """, values)
                    row = cursor.fetchone()
                    conn.commit()
                    return {'success': True, 'action': 'created', 'lease_id': row['lease_id'], 'lease_number': row['lease_number']}
    except Exception as e:
        logger.error(f"Error updating CRE lease: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("delete_cre_lease", is_mutation=True)
def delete_cre_lease(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a commercial lease."""
    lease_id = kwargs.get('id') or kwargs.get('lease_id')
    reason = kwargs.get('reason', 'Delete CRE lease')

    if not lease_id:
        return {'success': False, 'error': 'lease_id required'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT lease_id, lease_number FROM landscape.tbl_cre_lease WHERE lease_id = %s
                """, [lease_id])
                lease = cursor.fetchone()
                if not lease:
                    return {'success': False, 'error': f'Lease {lease_id} not found'}

                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='cre_delete',
                        table_name='tbl_cre_lease',
                        target_id=lease_id,
                        changes={'_delete': True, 'lease_number': lease['lease_number']},
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                cursor.execute("DELETE FROM landscape.tbl_cre_lease WHERE lease_id = %s", [lease_id])
                conn.commit()
                return {'success': True, 'action': 'deleted', 'lease_id': lease_id, 'lease_number': lease['lease_number']}
    except Exception as e:
        logger.error(f"Error deleting CRE lease: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_cre_properties")
def get_cre_properties(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get commercial properties for a project."""
    cre_property_id = kwargs.get('cre_property_id') or kwargs.get('property_id')
    property_type = kwargs.get('property_type')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT p.*,
                           (SELECT COUNT(*) FROM landscape.tbl_cre_space s WHERE s.cre_property_id = p.cre_property_id) as space_count,
                           (SELECT COUNT(*) FROM landscape.tbl_cre_lease l WHERE l.cre_property_id = p.cre_property_id AND l.lease_status = 'Active') as active_lease_count
                    FROM landscape.tbl_cre_property p
                    WHERE p.project_id = %s
                """
                params = [project_id]

                if cre_property_id:
                    query += " AND p.cre_property_id = %s"
                    params.append(cre_property_id)
                if property_type:
                    query += " AND p.property_type = %s"
                    params.append(property_type)

                query += " ORDER BY p.property_name"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                return {
                    'success': True,
                    'properties': [dict(r) for r in rows],
                    'count': len(rows)
                }
    except Exception as e:
        logger.error(f"Error getting CRE properties: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("update_cre_property", is_mutation=True)
def update_cre_property(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a commercial property."""
    cre_property_id = kwargs.get('id') or kwargs.get('cre_property_id') or kwargs.get('property_id')
    reason = kwargs.get('reason', 'CRE property update')

    # Build update data
    update_data = {'project_id': project_id}
    for field in CRE_PROPERTY_COLUMNS:
        if field in kwargs and field != 'project_id':
            update_data[field] = kwargs[field]

    # Handle field aliases
    if 'name' in kwargs and 'property_name' not in update_data:
        update_data['property_name'] = kwargs['name']
    if 'type' in kwargs and 'property_type' not in update_data:
        update_data['property_type'] = kwargs['type']

    if len(update_data) <= 1:  # Only has project_id
        return {'success': False, 'error': 'No valid fields to update'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if cre_property_id:
                    # Update existing
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='cre_upsert',
                            table_name='tbl_cre_property',
                            target_id=cre_property_id,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        set_parts.append(f"{k} = %s")
                        values.append(v)
                    set_parts.append("updated_at = NOW()")

                    cursor.execute(f"""
                        UPDATE landscape.tbl_cre_property
                        SET {', '.join(set_parts)}
                        WHERE cre_property_id = %s
                        RETURNING cre_property_id, property_name
                    """, values + [cre_property_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Property {cre_property_id} not found'}
                    conn.commit()
                    return {'success': True, 'action': 'updated', 'cre_property_id': row['cre_property_id'], 'name': row['property_name']}
                else:
                    # Insert new
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='cre_upsert',
                            table_name='tbl_cre_property',
                            target_id=None,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    columns = list(update_data.keys())
                    placeholders = ['%s'] * len(columns)
                    values = list(update_data.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.tbl_cre_property ({', '.join(columns)}, created_at, updated_at)
                        VALUES ({', '.join(placeholders)}, NOW(), NOW())
                        RETURNING cre_property_id, property_name
                    """, values)
                    row = cursor.fetchone()
                    conn.commit()
                    return {'success': True, 'action': 'created', 'cre_property_id': row['cre_property_id'], 'name': row['property_name']}
    except Exception as e:
        logger.error(f"Error updating CRE property: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_cre_rent_roll")
def get_cre_rent_roll(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get full commercial rent roll with spaces, tenants, and lease terms."""
    cre_property_id = kwargs.get('cre_property_id') or kwargs.get('property_id')
    include_vacant = kwargs.get('include_vacant', True)
    as_of_date = kwargs.get('as_of_date')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Build comprehensive rent roll query
                query = """
                    SELECT
                        s.space_id, s.space_number, s.floor_number, s.rentable_sf, s.usable_sf,
                        s.space_type, s.space_status,
                        l.lease_id, l.lease_number, l.lease_type, l.lease_status,
                        l.lease_commencement_date, l.lease_expiration_date, l.lease_term_months,
                        l.leased_sf, l.security_deposit_amount,
                        t.tenant_id, t.tenant_name, t.industry, t.credit_rating,
                        br.base_rent_psf_annual, br.base_rent_monthly, br.base_rent_annual,
                        er.recovery_structure, er.cam_recovery_pct,
                        p.property_name, p.cre_property_id
                    FROM landscape.tbl_cre_space s
                    JOIN landscape.tbl_cre_property p ON s.cre_property_id = p.cre_property_id
                    LEFT JOIN landscape.tbl_cre_lease l ON s.space_id = l.space_id
                        AND (l.lease_status = 'Active' OR l.lease_status IS NULL)
                    LEFT JOIN landscape.tbl_cre_tenant t ON l.tenant_id = t.tenant_id
                    LEFT JOIN LATERAL (
                        SELECT * FROM landscape.tbl_cre_base_rent br2
                        WHERE br2.lease_id = l.lease_id
                        ORDER BY br2.period_start_date DESC LIMIT 1
                    ) br ON true
                    LEFT JOIN landscape.tbl_cre_expense_recovery er ON l.lease_id = er.lease_id
                    WHERE p.project_id = %s
                """
                params = [project_id]

                if cre_property_id:
                    query += " AND p.cre_property_id = %s"
                    params.append(cre_property_id)

                if not include_vacant:
                    query += " AND l.lease_id IS NOT NULL"

                if as_of_date:
                    query += " AND (l.lease_commencement_date <= %s AND l.lease_expiration_date >= %s OR l.lease_id IS NULL)"
                    params.extend([as_of_date, as_of_date])

                query += " ORDER BY p.property_name, s.floor_number, s.space_number"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                # Calculate summary stats
                total_sf = sum(r['rentable_sf'] or 0 for r in rows)
                leased_sf = sum(r['leased_sf'] or 0 for r in rows if r['lease_id'])
                vacant_sf = total_sf - leased_sf
                occupancy_pct = (leased_sf / total_sf * 100) if total_sf > 0 else 0
                total_annual_rent = sum(r['base_rent_annual'] or 0 for r in rows if r['base_rent_annual'])

                return {
                    'success': True,
                    'rent_roll': [dict(r) for r in rows],
                    'count': len(rows),
                    'summary': {
                        'total_sf': float(total_sf),
                        'leased_sf': float(leased_sf),
                        'vacant_sf': float(vacant_sf),
                        'occupancy_pct': round(occupancy_pct, 2),
                        'total_annual_rent': float(total_annual_rent),
                        'avg_rent_psf': round(total_annual_rent / leased_sf, 2) if leased_sf > 0 else 0
                    }
                }
    except Exception as e:
        logger.error(f"Error getting CRE rent roll: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Market Intelligence Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool("get_competitive_projects")
def get_competitive_projects(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get competitive projects in the market."""
    comp_id = kwargs.get('comp_id') or kwargs.get('id')
    city = kwargs.get('city')
    builder_name = kwargs.get('builder_name') or kwargs.get('builder')
    status = kwargs.get('status')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT * FROM landscape.market_competitive_projects
                    WHERE project_id = %s
                """
                params = [project_id]

                if comp_id:
                    query += " AND id = %s"
                    params.append(comp_id)
                if city:
                    query += " AND city ILIKE %s"
                    params.append(f'%{city}%')
                if builder_name:
                    query += " AND builder_name ILIKE %s"
                    params.append(f'%{builder_name}%')
                if status:
                    query += " AND status = %s"
                    params.append(status)

                query += " ORDER BY comp_name"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                return {
                    'success': True,
                    'competitive_projects': [dict(r) for r in rows],
                    'count': len(rows)
                }
    except Exception as e:
        logger.error(f"Error getting competitive projects: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("update_competitive_project", is_mutation=True)
def update_competitive_project(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a competitive project."""
    comp_id = kwargs.get('id') or kwargs.get('comp_id')
    reason = kwargs.get('reason', 'Competitive project update')

    # Build update data
    update_data = {'project_id': project_id}
    for field in MARKET_COMPETITIVE_PROJECTS_COLUMNS:
        if field in kwargs and field != 'project_id':
            update_data[field] = kwargs[field]

    # Handle field aliases
    if 'name' in kwargs and 'comp_name' not in update_data:
        update_data['comp_name'] = kwargs['name']
    if 'builder' in kwargs and 'builder_name' not in update_data:
        update_data['builder_name'] = kwargs['builder']
    if 'address' in kwargs and 'comp_address' not in update_data:
        update_data['comp_address'] = kwargs['address']
    if 'absorption_rate' in kwargs and 'absorption_rate_monthly' not in update_data:
        update_data['absorption_rate_monthly'] = kwargs['absorption_rate']

    if len(update_data) <= 1:  # Only has project_id
        return {'success': False, 'error': 'No valid fields to update'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if comp_id:
                    # Update existing
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='market_upsert',
                            table_name='market_competitive_projects',
                            target_id=comp_id,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        set_parts.append(f"{k} = %s")
                        values.append(v)
                    set_parts.append("updated_at = NOW()")

                    cursor.execute(f"""
                        UPDATE landscape.market_competitive_projects
                        SET {', '.join(set_parts)}
                        WHERE id = %s
                        RETURNING id, comp_name
                    """, values + [comp_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Competitive project {comp_id} not found'}
                    conn.commit()
                    return {'success': True, 'action': 'updated', 'comp_id': row['id'], 'name': row['comp_name']}
                else:
                    # Insert new
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='market_upsert',
                            table_name='market_competitive_projects',
                            target_id=None,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    columns = list(update_data.keys())
                    placeholders = ['%s'] * len(columns)
                    values = list(update_data.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.market_competitive_projects ({', '.join(columns)}, created_at, updated_at)
                        VALUES ({', '.join(placeholders)}, NOW(), NOW())
                        RETURNING id, comp_name
                    """, values)
                    row = cursor.fetchone()
                    conn.commit()
                    return {'success': True, 'action': 'created', 'comp_id': row['id'], 'name': row['comp_name']}
    except Exception as e:
        logger.error(f"Error updating competitive project: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("delete_competitive_project", is_mutation=True)
def delete_competitive_project(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a competitive project."""
    comp_id = kwargs.get('id') or kwargs.get('comp_id')
    reason = kwargs.get('reason', 'Delete competitive project')

    if not comp_id:
        return {'success': False, 'error': 'comp_id required'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT id, comp_name FROM landscape.market_competitive_projects WHERE id = %s
                """, [comp_id])
                comp = cursor.fetchone()
                if not comp:
                    return {'success': False, 'error': f'Competitive project {comp_id} not found'}

                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='market_delete',
                        table_name='market_competitive_projects',
                        target_id=comp_id,
                        changes={'_delete': True, 'comp_name': comp['comp_name']},
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                cursor.execute("DELETE FROM landscape.market_competitive_projects WHERE id = %s", [comp_id])
                conn.commit()
                return {'success': True, 'action': 'deleted', 'comp_id': comp_id, 'name': comp['comp_name']}
    except Exception as e:
        logger.error(f"Error deleting competitive project: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_absorption_benchmarks")
def get_absorption_benchmarks(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get absorption velocity benchmarks."""
    benchmark_id = kwargs.get('benchmark_id')
    market_geography = kwargs.get('market') or kwargs.get('market_geography')
    project_scale = kwargs.get('scale') or kwargs.get('project_scale')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = "SELECT * FROM landscape.bmk_absorption_velocity WHERE 1=1"
                params = []

                if benchmark_id:
                    query += " AND absorption_velocity_id = %s"
                    params.append(benchmark_id)
                if market_geography:
                    query += " AND market_geography ILIKE %s"
                    params.append(f'%{market_geography}%')
                if project_scale:
                    query += " AND project_scale = %s"
                    params.append(project_scale)

                query += " ORDER BY market_geography, project_scale"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                return {
                    'success': True,
                    'benchmarks': [dict(r) for r in rows],
                    'count': len(rows)
                }
    except Exception as e:
        logger.error(f"Error getting absorption benchmarks: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_market_assumptions")
def get_market_assumptions(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get market assumptions for a project (pricing, absorption rates by product type)."""
    lu_type_code = kwargs.get('lu_type_code') or kwargs.get('product_type')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT ma.*, lt.name as lu_type_name
                    FROM landscape.market_assumptions ma
                    LEFT JOIN landscape.lu_type lt ON ma.lu_type_code = lt.code
                    WHERE ma.project_id = %s
                """
                params = [project_id]

                if lu_type_code:
                    query += " AND ma.lu_type_code = %s"
                    params.append(lu_type_code)

                query += " ORDER BY ma.lu_type_code"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                return {
                    'success': True,
                    'assumptions': [dict(r) for r in rows],
                    'count': len(rows)
                }
    except Exception as e:
        logger.error(f"Error getting market assumptions: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("update_market_assumptions", is_mutation=True)
def update_market_assumptions(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Update market assumptions for a project/product type."""
    lu_type_code = kwargs.get('lu_type_code') or kwargs.get('product_type')
    reason = kwargs.get('reason', 'Market assumptions update')

    if not lu_type_code:
        return {'success': False, 'error': 'lu_type_code or product_type required'}

    # Build update data
    update_data = {'project_id': project_id, 'lu_type_code': lu_type_code}
    for field in MARKET_ASSUMPTIONS_COLUMNS:
        if field in kwargs and field not in ('project_id', 'lu_type_code'):
            update_data[field] = kwargs[field]

    # Handle field aliases
    if 'price' in kwargs and 'price_per_unit' not in update_data:
        update_data['price_per_unit'] = kwargs['price']
    if 'annual_velocity' in kwargs and 'dvl_per_year' not in update_data:
        update_data['dvl_per_year'] = kwargs['annual_velocity']
    if 'monthly_velocity' in kwargs and 'dvl_per_month' not in update_data:
        update_data['dvl_per_month'] = kwargs['monthly_velocity']

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Check if exists (composite key: project_id + lu_type_code)
                cursor.execute("""
                    SELECT project_id FROM landscape.market_assumptions
                    WHERE project_id = %s AND lu_type_code = %s
                """, [project_id, lu_type_code])
                exists = cursor.fetchone()

                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='market_upsert',
                        table_name='market_assumptions',
                        target_id=f"{project_id}:{lu_type_code}",
                        changes=update_data,
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                if exists:
                    # Update existing
                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        if k not in ('project_id', 'lu_type_code'):
                            set_parts.append(f"{k} = %s")
                            values.append(v)
                    set_parts.append("updated_at = NOW()")

                    cursor.execute(f"""
                        UPDATE landscape.market_assumptions
                        SET {', '.join(set_parts)}
                        WHERE project_id = %s AND lu_type_code = %s
                        RETURNING project_id, lu_type_code
                    """, values + [project_id, lu_type_code])
                    conn.commit()
                    return {'success': True, 'action': 'updated', 'project_id': project_id, 'lu_type_code': lu_type_code}
                else:
                    # Insert new
                    columns = list(update_data.keys())
                    placeholders = ['%s'] * len(columns)
                    values = list(update_data.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.market_assumptions ({', '.join(columns)}, updated_at)
                        VALUES ({', '.join(placeholders)}, NOW())
                        RETURNING project_id, lu_type_code
                    """, values)
                    conn.commit()
                    return {'success': True, 'action': 'created', 'project_id': project_id, 'lu_type_code': lu_type_code}
    except Exception as e:
        logger.error(f"Error updating market assumptions: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Sales & Absorption Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool("get_absorption_schedule")
def get_absorption_schedule(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get absorption schedule for a project."""
    absorption_id = kwargs.get('absorption_id') or kwargs.get('id')
    phase_id = kwargs.get('phase_id')
    parcel_id = kwargs.get('parcel_id')
    scenario_name = kwargs.get('scenario') or kwargs.get('scenario_name')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT a.*,
                           ph.phase_name, ar.area_alias,
                           pc.parcel_alias
                    FROM landscape.tbl_absorption_schedule a
                    LEFT JOIN landscape.tbl_phase ph ON a.phase_id = ph.phase_id
                    LEFT JOIN landscape.tbl_area ar ON a.area_id = ar.area_id
                    LEFT JOIN landscape.tbl_parcel pc ON a.parcel_id = pc.parcel_id
                    WHERE a.project_id = %s
                """
                params = [project_id]

                if absorption_id:
                    query += " AND a.absorption_id = %s"
                    params.append(absorption_id)
                if phase_id:
                    query += " AND a.phase_id = %s"
                    params.append(phase_id)
                if parcel_id:
                    query += " AND a.parcel_id = %s"
                    params.append(parcel_id)
                if scenario_name:
                    query += " AND a.scenario_name = %s"
                    params.append(scenario_name)

                query += " ORDER BY a.start_period, a.revenue_stream_name"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                # Calculate totals
                total_units = sum(r['total_units'] or 0 for r in rows)
                total_revenue = sum((r['total_units'] or 0) * (r['base_price_per_unit'] or 0) for r in rows)

                return {
                    'success': True,
                    'schedule': [dict(r) for r in rows],
                    'count': len(rows),
                    'summary': {
                        'total_units': total_units,
                        'total_revenue': float(total_revenue)
                    }
                }
    except Exception as e:
        logger.error(f"Error getting absorption schedule: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("update_absorption_schedule", is_mutation=True)
def update_absorption_schedule(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update an absorption schedule entry."""
    absorption_id = kwargs.get('id') or kwargs.get('absorption_id')
    reason = kwargs.get('reason', 'Absorption schedule update')

    # Build update data
    update_data = {'project_id': project_id}
    for field in ABSORPTION_SCHEDULE_COLUMNS:
        if field in kwargs and field != 'project_id':
            update_data[field] = kwargs[field]

    # Handle field aliases
    if 'stream_name' in kwargs and 'revenue_stream_name' not in update_data:
        update_data['revenue_stream_name'] = kwargs['stream_name']
    if 'category' in kwargs and 'revenue_category' not in update_data:
        update_data['revenue_category'] = kwargs['category']
    if 'price' in kwargs and 'base_price_per_unit' not in update_data:
        update_data['base_price_per_unit'] = kwargs['price']
    if 'units' in kwargs and 'total_units' not in update_data:
        update_data['total_units'] = kwargs['units']
    if 'scenario' in kwargs and 'scenario_name' not in update_data:
        update_data['scenario_name'] = kwargs['scenario']

    if len(update_data) <= 1:  # Only has project_id
        return {'success': False, 'error': 'No valid fields to update'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if absorption_id:
                    # Update existing
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='sales_upsert',
                            table_name='tbl_absorption_schedule',
                            target_id=absorption_id,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        set_parts.append(f"{k} = %s")
                        values.append(v)
                    set_parts.append("updated_at = NOW()")

                    cursor.execute(f"""
                        UPDATE landscape.tbl_absorption_schedule
                        SET {', '.join(set_parts)}
                        WHERE absorption_id = %s
                        RETURNING absorption_id, revenue_stream_name
                    """, values + [absorption_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Absorption entry {absorption_id} not found'}
                    conn.commit()
                    return {'success': True, 'action': 'updated', 'absorption_id': row['absorption_id'], 'stream': row['revenue_stream_name']}
                else:
                    # Insert new
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='sales_upsert',
                            table_name='tbl_absorption_schedule',
                            target_id=None,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    columns = list(update_data.keys())
                    placeholders = ['%s'] * len(columns)
                    values = list(update_data.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.tbl_absorption_schedule ({', '.join(columns)}, created_at, updated_at)
                        VALUES ({', '.join(placeholders)}, NOW(), NOW())
                        RETURNING absorption_id, revenue_stream_name
                    """, values)
                    row = cursor.fetchone()
                    conn.commit()
                    return {'success': True, 'action': 'created', 'absorption_id': row['absorption_id'], 'stream': row['revenue_stream_name']}
    except Exception as e:
        logger.error(f"Error updating absorption schedule: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("delete_absorption_schedule", is_mutation=True)
def delete_absorption_schedule(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete an absorption schedule entry."""
    absorption_id = kwargs.get('id') or kwargs.get('absorption_id')
    reason = kwargs.get('reason', 'Delete absorption schedule entry')

    if not absorption_id:
        return {'success': False, 'error': 'absorption_id required'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT absorption_id, revenue_stream_name FROM landscape.tbl_absorption_schedule WHERE absorption_id = %s
                """, [absorption_id])
                entry = cursor.fetchone()
                if not entry:
                    return {'success': False, 'error': f'Absorption entry {absorption_id} not found'}

                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='sales_delete',
                        table_name='tbl_absorption_schedule',
                        target_id=absorption_id,
                        changes={'_delete': True, 'revenue_stream_name': entry['revenue_stream_name']},
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                cursor.execute("DELETE FROM landscape.tbl_absorption_schedule WHERE absorption_id = %s", [absorption_id])
                conn.commit()
                return {'success': True, 'action': 'deleted', 'absorption_id': absorption_id, 'stream': entry['revenue_stream_name']}
    except Exception as e:
        logger.error(f"Error deleting absorption schedule: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_parcel_sale_events")
def get_parcel_sale_events(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get parcel sale events (lot contracts)."""
    sale_event_id = kwargs.get('sale_event_id') or kwargs.get('id')
    parcel_id = kwargs.get('parcel_id')
    phase_id = kwargs.get('phase_id')
    sale_status = kwargs.get('status') or kwargs.get('sale_status')
    buyer_entity = kwargs.get('buyer') or kwargs.get('buyer_entity')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT se.*,
                           pc.parcel_alias, pc.parcel_name,
                           ph.phase_name,
                           c.contact_name as buyer_contact_name
                    FROM landscape.tbl_parcel_sale_event se
                    LEFT JOIN landscape.tbl_parcel pc ON se.parcel_id = pc.parcel_id
                    LEFT JOIN landscape.tbl_phase ph ON se.phase_id = ph.phase_id
                    LEFT JOIN landscape.tbl_contact c ON se.buyer_contact_id = c.contact_id
                    WHERE se.project_id = %s
                """
                params = [project_id]

                if sale_event_id:
                    query += " AND se.sale_event_id = %s"
                    params.append(sale_event_id)
                if parcel_id:
                    query += " AND se.parcel_id = %s"
                    params.append(parcel_id)
                if phase_id:
                    query += " AND se.phase_id = %s"
                    params.append(phase_id)
                if sale_status:
                    query += " AND se.sale_status = %s"
                    params.append(sale_status)
                if buyer_entity:
                    query += " AND se.buyer_entity ILIKE %s"
                    params.append(f'%{buyer_entity}%')

                query += " ORDER BY se.contract_date DESC"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                # Calculate totals
                total_lots = sum(r['total_lots_contracted'] or 0 for r in rows)
                total_value = sum(
                    (r['total_lots_contracted'] or 0) * (r['base_price_per_lot'] or 0)
                    for r in rows
                )

                return {
                    'success': True,
                    'sale_events': [dict(r) for r in rows],
                    'count': len(rows),
                    'summary': {
                        'total_lots': total_lots,
                        'total_value': float(total_value)
                    }
                }
    except Exception as e:
        logger.error(f"Error getting parcel sale events: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("update_parcel_sale_event", is_mutation=True)
def update_parcel_sale_event(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create or update a parcel sale event (lot contract)."""
    sale_event_id = kwargs.get('id') or kwargs.get('sale_event_id')
    reason = kwargs.get('reason', 'Parcel sale event update')

    # Build update data
    update_data = {'project_id': project_id}
    for field in PARCEL_SALE_EVENT_COLUMNS:
        if field in kwargs and field != 'project_id':
            update_data[field] = kwargs[field]

    # Handle field aliases
    if 'buyer' in kwargs and 'buyer_entity' not in update_data:
        update_data['buyer_entity'] = kwargs['buyer']
    if 'lots' in kwargs and 'total_lots_contracted' not in update_data:
        update_data['total_lots_contracted'] = kwargs['lots']
    if 'price' in kwargs and 'base_price_per_lot' not in update_data:
        update_data['base_price_per_lot'] = kwargs['price']
    if 'status' in kwargs and 'sale_status' not in update_data:
        update_data['sale_status'] = kwargs['status']
    if 'deposit' in kwargs and 'deposit_amount' not in update_data:
        update_data['deposit_amount'] = kwargs['deposit']

    if len(update_data) <= 1:  # Only has project_id
        return {'success': False, 'error': 'No valid fields to update'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if sale_event_id:
                    # Update existing
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='sales_upsert',
                            table_name='tbl_parcel_sale_event',
                            target_id=sale_event_id,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    set_parts = []
                    values = []
                    for k, v in update_data.items():
                        set_parts.append(f"{k} = %s")
                        values.append(v)
                    set_parts.append("updated_at = NOW()")

                    cursor.execute(f"""
                        UPDATE landscape.tbl_parcel_sale_event
                        SET {', '.join(set_parts)}
                        WHERE sale_event_id = %s
                        RETURNING sale_event_id, buyer_entity
                    """, values + [sale_event_id])
                    row = cursor.fetchone()
                    if not row:
                        return {'success': False, 'error': f'Sale event {sale_event_id} not found'}
                    conn.commit()
                    return {'success': True, 'action': 'updated', 'sale_event_id': row['sale_event_id'], 'buyer': row['buyer_entity']}
                else:
                    # Insert new
                    if propose_only:
                        return create_mutation_proposal(
                            mutation_type='sales_upsert',
                            table_name='tbl_parcel_sale_event',
                            target_id=None,
                            changes=update_data,
                            reason=reason,
                            project_id=project_id,
                            source_message_id=source_message_id
                        )

                    columns = list(update_data.keys())
                    placeholders = ['%s'] * len(columns)
                    values = list(update_data.values())

                    cursor.execute(f"""
                        INSERT INTO landscape.tbl_parcel_sale_event ({', '.join(columns)}, created_at, updated_at)
                        VALUES ({', '.join(placeholders)}, NOW(), NOW())
                        RETURNING sale_event_id, buyer_entity
                    """, values)
                    row = cursor.fetchone()
                    conn.commit()
                    return {'success': True, 'action': 'created', 'sale_event_id': row['sale_event_id'], 'buyer': row['buyer_entity']}
    except Exception as e:
        logger.error(f"Error updating parcel sale event: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("delete_parcel_sale_event", is_mutation=True)
def delete_parcel_sale_event(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Delete a parcel sale event."""
    sale_event_id = kwargs.get('id') or kwargs.get('sale_event_id')
    reason = kwargs.get('reason', 'Delete parcel sale event')

    if not sale_event_id:
        return {'success': False, 'error': 'sale_event_id required'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT sale_event_id, buyer_entity FROM landscape.tbl_parcel_sale_event WHERE sale_event_id = %s
                """, [sale_event_id])
                event = cursor.fetchone()
                if not event:
                    return {'success': False, 'error': f'Sale event {sale_event_id} not found'}

                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='sales_delete',
                        table_name='tbl_parcel_sale_event',
                        target_id=sale_event_id,
                        changes={'_delete': True, 'buyer_entity': event['buyer_entity']},
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                cursor.execute("DELETE FROM landscape.tbl_parcel_sale_event WHERE sale_event_id = %s", [sale_event_id])
                conn.commit()
                return {'success': True, 'action': 'deleted', 'sale_event_id': sale_event_id, 'buyer': event['buyer_entity']}
    except Exception as e:
        logger.error(f"Error deleting parcel sale event: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Knowledge & Learning Tools
# ─────────────────────────────────────────────────────────────────────────────

@register_tool("get_extraction_results")
def get_extraction_results(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get AI extraction results for documents."""
    extraction_id = kwargs.get('extraction_id') or kwargs.get('id')
    doc_id = kwargs.get('doc_id') or kwargs.get('document_id')
    status = kwargs.get('status')
    min_confidence = kwargs.get('min_confidence')
    target_table = kwargs.get('target_table')

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT e.*,
                           d.filename, d.doc_type
                    FROM landscape.ai_extraction_staging e
                    LEFT JOIN landscape.tbl_document d ON e.doc_id = d.doc_id
                    WHERE e.project_id = %s
                """
                params = [project_id]

                if extraction_id:
                    query += " AND e.extraction_id = %s"
                    params.append(extraction_id)
                if doc_id:
                    query += " AND e.doc_id = %s"
                    params.append(doc_id)
                if status:
                    query += " AND e.status = %s"
                    params.append(status)
                if min_confidence is not None:
                    query += " AND e.confidence_score >= %s"
                    params.append(min_confidence)
                if target_table:
                    query += " AND e.target_table = %s"
                    params.append(target_table)

                query += " ORDER BY e.created_at DESC LIMIT 100"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                # Status breakdown
                cursor.execute("""
                    SELECT status, COUNT(*) as count
                    FROM landscape.ai_extraction_staging
                    WHERE project_id = %s
                    GROUP BY status
                """, [project_id])
                status_counts = {r['status']: r['count'] for r in cursor.fetchall()}

                return {
                    'success': True,
                    'extractions': [dict(r) for r in rows],
                    'count': len(rows),
                    'status_breakdown': status_counts
                }
    except Exception as e:
        logger.error(f"Error getting extraction results: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("update_extraction_result", is_mutation=True)
def update_extraction_result(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Update an extraction result (validate, reject, or correct)."""
    extraction_id = kwargs.get('id') or kwargs.get('extraction_id')
    reason = kwargs.get('reason', 'Extraction result update')

    if not extraction_id:
        return {'success': False, 'error': 'extraction_id required'}

    # Build update data
    update_data = {}
    for field in ['status', 'validated_value', 'validated_by', 'rejection_reason']:
        if field in kwargs:
            update_data[field] = kwargs[field]

    # Handle JSONB fields
    if 'corrected_value' in kwargs:
        import json
        update_data['validated_value'] = json.dumps(kwargs['corrected_value']) if isinstance(kwargs['corrected_value'], dict) else kwargs['corrected_value']

    if not update_data:
        return {'success': False, 'error': 'No valid fields to update (status, validated_value, rejection_reason)'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='knowledge_upsert',
                        table_name='ai_extraction_staging',
                        target_id=extraction_id,
                        changes=update_data,
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                set_parts = []
                values = []
                for k, v in update_data.items():
                    set_parts.append(f"{k} = %s")
                    values.append(v)

                if 'validated_by' not in update_data and update_data.get('status') in ('user_validated', 'rejected'):
                    set_parts.append("validated_at = NOW()")

                cursor.execute(f"""
                    UPDATE landscape.ai_extraction_staging
                    SET {', '.join(set_parts)}
                    WHERE extraction_id = %s
                    RETURNING extraction_id, status, target_field
                """, values + [extraction_id])
                row = cursor.fetchone()
                if not row:
                    return {'success': False, 'error': f'Extraction {extraction_id} not found'}
                conn.commit()
                return {'success': True, 'action': 'updated', 'extraction_id': row['extraction_id'], 'status': row['status'], 'field': row['target_field']}
    except Exception as e:
        logger.error(f"Error updating extraction result: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_extraction_corrections")
def get_extraction_corrections(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get AI extraction corrections (learning data)."""
    field_path = kwargs.get('field_path') or kwargs.get('field')
    correction_type = kwargs.get('correction_type') or kwargs.get('type')
    limit = kwargs.get('limit', 50)

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT c.*,
                           e.target_table, e.target_field, e.doc_id
                    FROM landscape.ai_correction_log c
                    LEFT JOIN landscape.ai_extraction_staging e ON c.queue_id = e.extraction_id
                    WHERE 1=1
                """
                params = []

                if field_path:
                    query += " AND c.field_path ILIKE %s"
                    params.append(f'%{field_path}%')
                if correction_type:
                    query += " AND c.correction_type = %s"
                    params.append(correction_type)

                query += " ORDER BY c.created_at DESC LIMIT %s"
                params.append(limit)

                cursor.execute(query, params)
                rows = cursor.fetchall()

                # Get correction type breakdown
                cursor.execute("""
                    SELECT correction_type, COUNT(*) as count
                    FROM landscape.ai_correction_log
                    GROUP BY correction_type
                """)
                type_counts = {r['correction_type']: r['count'] for r in cursor.fetchall()}

                return {
                    'success': True,
                    'corrections': [dict(r) for r in rows],
                    'count': len(rows),
                    'correction_types': type_counts
                }
    except Exception as e:
        logger.error(f"Error getting extraction corrections: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("log_extraction_correction", is_mutation=True)
def log_extraction_correction(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Log a user correction to an AI extraction (feeds learning system)."""
    reason = kwargs.get('reason', 'Log extraction correction')

    # Required fields
    queue_id = kwargs.get('extraction_id') or kwargs.get('queue_id')
    field_path = kwargs.get('field_path') or kwargs.get('field')
    ai_value = kwargs.get('ai_value')
    user_value = kwargs.get('user_value') or kwargs.get('correct_value')

    if not all([queue_id, field_path, user_value]):
        return {'success': False, 'error': 'Required: extraction_id, field_path, user_value'}

    # Build correction data
    correction_data = {
        'queue_id': queue_id,
        'field_path': field_path,
        'ai_value': str(ai_value) if ai_value else None,
        'user_value': str(user_value)
    }

    # Optional fields
    for field in ['ai_confidence', 'correction_type', 'page_number', 'source_quote', 'user_notes']:
        if field in kwargs:
            correction_data[field] = kwargs[field]

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='knowledge_upsert',
                        table_name='ai_correction_log',
                        target_id=None,
                        changes=correction_data,
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                columns = list(correction_data.keys())
                placeholders = ['%s'] * len(columns)
                values = list(correction_data.values())

                cursor.execute(f"""
                    INSERT INTO landscape.ai_correction_log ({', '.join(columns)}, created_at)
                    VALUES ({', '.join(placeholders)}, NOW())
                    RETURNING id, field_path
                """, values)
                row = cursor.fetchone()
                conn.commit()
                return {'success': True, 'action': 'logged', 'correction_id': row['id'], 'field': row['field_path']}
    except Exception as e:
        logger.error(f"Error logging extraction correction: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Rent Roll Column Mapping Tools (Conversational Flow)
# ─────────────────────────────────────────────────────────────────────────────

RENT_ROLL_BEHAVIORAL_RULES = """
---
RESPONSE RULES (follow exactly):
- Present the analysis above in ONE concise message. Use short labels, not paragraphs.
- BD/BA splits into Bed (integer) + Bath (decimal). Plan auto-derives from those. Do NOT map BD/BA to Plan directly.
- Default for Tags/Additional Tags: combine into single "Other" column, comma-separated. Only split into booleans if user asks.
- End with 2-3 clear options (A/B/C). Include column creation and Plan derivation in the recommended option.
- AFTER user picks an option: EXECUTE IMMEDIATELY. One-sentence confirmation only. Do NOT restate the analysis. Do NOT ask "should I proceed?"
- NEVER say "You're absolutely right" or "You're correct."
- If unit count doesn't match file total, recommend cleanup FIRST. Name the specific units to delete.
"""

CONFIRM_BEHAVIORAL_NUDGE = """
---
RESPONSE RULE: Report what you did in 1-2 sentences max. Do NOT restate the original analysis.
Example: "Done. Updated 113 units, derived 9 Plans, created Other and Delinquency columns."
"""


@register_tool('analyze_rent_roll_columns')
def handle_analyze_rent_roll_columns(
    tool_input: Dict[str, Any],
    project_id: int,
    **kwargs
) -> Dict[str, Any]:
    """Analyze columns in a structured rent roll file, check existing data, and propose mappings."""
    document_id = tool_input.get('document_id')

    # DIAGNOSTIC LOGGING — remove after diagnosis
    logger.info(f"=== RENT ROLL ANALYZE TOOL CALLED === doc_id={document_id}, project_id={project_id}")
    print(f"=== RENT ROLL ANALYZE TOOL CALLED === doc_id={document_id}, project_id={project_id}")

    if not document_id:
        return {'success': False, 'error': 'document_id is required'}

    try:
        from apps.documents.models import Document
        from apps.knowledge.services.column_discovery import (
            discover_columns_enhanced,
            format_discovery_for_chat,
        )

        try:
            document = Document.objects.get(doc_id=document_id, project_id=project_id)
        except Document.DoesNotExist:
            logger.warning(f"=== RENT ROLL: Document {document_id} not found in project {project_id} ===")
            return {'success': False, 'error': f'Document {document_id} not found in this project'}

        if not document.storage_uri:
            logger.warning(f"=== RENT ROLL: Document {document_id} has no storage_uri ===")
            return {'success': False, 'error': 'Document has no storage URI'}

        logger.info(f"=== RENT ROLL: Calling discover_columns_enhanced for {document.doc_name} (uri={document.storage_uri[:80]}...) ===")

        # Get full analysis
        full_result = discover_columns_enhanced(
            storage_uri=document.storage_uri,
            project_id=project_id,
            mime_type=document.mime_type,
            file_name=document.doc_name,
        )

        logger.info(f"=== RENT ROLL: discover_columns_enhanced returned keys: {list(full_result.keys()) if isinstance(full_result, dict) else type(full_result)} ===")
        print(f"=== RENT ROLL: discover_columns_enhanced returned keys: {list(full_result.keys()) if isinstance(full_result, dict) else type(full_result)} ===")

        # Format as compact summary for Claude + append behavioral rules
        summary = format_discovery_for_chat(full_result)

        logger.info(f"=== RENT ROLL: Compact summary ({len(summary)} chars):\n{summary}\n===")
        print(f"=== RENT ROLL: Compact summary ({len(summary)} chars) ===")

        chat_display = f"{summary}\n{RENT_ROLL_BEHAVIORAL_RULES}"

        logger.info(f"=== RENT ROLL: Final tool response: {len(chat_display)} chars ===")
        print(f"=== RENT ROLL: Final tool response: {len(chat_display)} chars ===")

        # Return dict (needed for result.get('success') in ai_handler tool tracking)
        # The chat_display string is the primary content Claude will see via str(result)
        return {
            'success': True,
            'document_id': document_id,
            'document_name': document.doc_name,
            'analysis': chat_display,
            'is_structured': full_result.get('is_structured', True),
        }

    except Exception as e:
        logger.error(f"=== RENT ROLL ANALYZE TOOL FAILED: {e} ===", exc_info=True)
        print(f"=== RENT ROLL ANALYZE TOOL FAILED: {e} ===")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


@register_tool('confirm_column_mapping', is_mutation=True)
def handle_confirm_column_mapping(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """Apply confirmed column mappings and start rent roll extraction."""
    document_id = tool_input.get('document_id')
    mappings = tool_input.get('mappings', [])

    if not document_id:
        return {'success': False, 'error': 'document_id is required'}
    if not mappings:
        return {'success': False, 'error': 'mappings array is required'}

    try:
        from apps.documents.models import Document
        from apps.knowledge.services.column_discovery import apply_column_mapping

        # Verify document exists
        try:
            Document.objects.get(doc_id=document_id, project_id=project_id)
        except Document.DoesNotExist:
            return {'success': False, 'error': f'Document {document_id} not found in this project'}

        result = apply_column_mapping(
            project_id=project_id,
            document_id=int(document_id),
            mappings=mappings,
        )

        # Append behavioral nudge so Claude responds concisely
        result['response_rules'] = CONFIRM_BEHAVIORAL_NUDGE.strip()

        return result

    except Exception as e:
        logger.error(f"Error confirming column mapping for doc {document_id}: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool("get_knowledge_entities")
def get_knowledge_entities(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get knowledge entities (properties, people, companies) from the knowledge graph."""
    entity_id = kwargs.get('entity_id') or kwargs.get('id')
    entity_type = kwargs.get('entity_type') or kwargs.get('type')
    entity_subtype = kwargs.get('entity_subtype') or kwargs.get('subtype')
    search = kwargs.get('search') or kwargs.get('name')

    # Security: In global/no-project contexts, do not expose shared graph data.
    if not project_id or int(project_id) <= 0:
        return {
            'success': True,
            'entities': [],
            'count': 0,
            'entity_types': {},
            'message': 'No project context provided; knowledge entities are project-scoped.'
        }

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT entity_id
                    FROM landscape.knowledge_entities
                    WHERE canonical_name = %s
                    LIMIT 1
                    """,
                    [f'project:{int(project_id)}']
                )
                project_entity = cursor.fetchone()
                if not project_entity:
                    return {
                        'success': True,
                        'entities': [],
                        'count': 0,
                        'entity_types': {},
                        'message': f'No knowledge graph project entity found for project_id={project_id}.'
                    }

                project_entity_id = int(project_entity['entity_id'])

                query = """
                    WITH scoped_entities AS (
                        SELECT %s::bigint AS entity_id
                        UNION
                        SELECT f.subject_entity_id
                        FROM landscape.knowledge_facts f
                        WHERE f.subject_entity_id = %s OR f.object_entity_id = %s
                        UNION
                        SELECT f.object_entity_id
                        FROM landscape.knowledge_facts f
                        WHERE (f.subject_entity_id = %s OR f.object_entity_id = %s)
                          AND f.object_entity_id IS NOT NULL
                    )
                    SELECT e.*
                    FROM landscape.knowledge_entities e
                    WHERE e.entity_id IN (SELECT entity_id FROM scoped_entities)
                """
                params = [
                    project_entity_id,
                    project_entity_id,
                    project_entity_id,
                    project_entity_id,
                    project_entity_id,
                ]

                if entity_id:
                    query += " AND entity_id = %s"
                    params.append(entity_id)
                if entity_type:
                    query += " AND entity_type = %s"
                    params.append(entity_type)
                if entity_subtype:
                    query += " AND entity_subtype = %s"
                    params.append(entity_subtype)
                if search:
                    query += " AND canonical_name ILIKE %s"
                    params.append(f'%{search}%')

                query += " ORDER BY canonical_name LIMIT 100"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                # Get entity type breakdown
                cursor.execute(
                    """
                    WITH scoped_entities AS (
                        SELECT %s::bigint AS entity_id
                        UNION
                        SELECT f.subject_entity_id
                        FROM landscape.knowledge_facts f
                        WHERE f.subject_entity_id = %s OR f.object_entity_id = %s
                        UNION
                        SELECT f.object_entity_id
                        FROM landscape.knowledge_facts f
                        WHERE (f.subject_entity_id = %s OR f.object_entity_id = %s)
                          AND f.object_entity_id IS NOT NULL
                    )
                    SELECT e.entity_type, COUNT(*) as count
                    FROM landscape.knowledge_entities e
                    WHERE e.entity_id IN (SELECT entity_id FROM scoped_entities)
                    GROUP BY e.entity_type
                    """,
                    [
                        project_entity_id,
                        project_entity_id,
                        project_entity_id,
                        project_entity_id,
                        project_entity_id,
                    ]
                )
                type_counts = {r['entity_type']: r['count'] for r in cursor.fetchall()}

                return {
                    'success': True,
                    'entities': [dict(r) for r in rows],
                    'count': len(rows),
                    'entity_types': type_counts
                }
    except Exception as e:
        logger.error(f"Error getting knowledge entities: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_knowledge_facts")
def get_knowledge_facts(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get knowledge facts from the knowledge graph."""
    fact_id = kwargs.get('fact_id') or kwargs.get('id')
    entity_id = kwargs.get('entity_id') or kwargs.get('subject_entity_id')
    predicate = kwargs.get('predicate')
    source_type = kwargs.get('source_type')
    is_current = kwargs.get('is_current', True)
    min_confidence = kwargs.get('min_confidence')

    # Security: In global/no-project contexts, do not expose shared graph data.
    if not project_id or int(project_id) <= 0:
        return {
            'success': True,
            'facts': [],
            'count': 0,
            'message': 'No project context provided; knowledge facts are project-scoped.'
        }

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT entity_id
                    FROM landscape.knowledge_entities
                    WHERE canonical_name = %s
                    LIMIT 1
                    """,
                    [f'project:{int(project_id)}']
                )
                project_entity = cursor.fetchone()
                if not project_entity:
                    return {
                        'success': True,
                        'facts': [],
                        'count': 0,
                        'message': f'No knowledge graph project entity found for project_id={project_id}.'
                    }

                project_entity_id = int(project_entity['entity_id'])

                query = """
                    SELECT f.*,
                           se.canonical_name as subject_name, se.entity_type as subject_type,
                           oe.canonical_name as object_name, oe.entity_type as object_type
                    FROM landscape.knowledge_facts f
                    LEFT JOIN landscape.knowledge_entities se ON f.subject_entity_id = se.entity_id
                    LEFT JOIN landscape.knowledge_entities oe ON f.object_entity_id = oe.entity_id
                    WHERE (
                        f.subject_entity_id = %s
                        OR f.object_entity_id = %s
                        OR (
                            f.source_type = 'document_extract'
                            AND EXISTS (
                                SELECT 1
                                FROM landscape.core_doc d
                                WHERE d.doc_id = f.source_id
                                  AND d.project_id = %s
                            )
                        )
                    )
                """
                params = [project_entity_id, project_entity_id, int(project_id)]

                if fact_id:
                    query += " AND f.fact_id = %s"
                    params.append(fact_id)
                if entity_id:
                    query += " AND f.subject_entity_id = %s"
                    params.append(entity_id)
                if predicate:
                    query += " AND f.predicate = %s"
                    params.append(predicate)
                if source_type:
                    query += " AND f.source_type = %s"
                    params.append(source_type)
                if is_current is not None:
                    query += " AND f.is_current = %s"
                    params.append(is_current)
                if min_confidence is not None:
                    query += " AND f.confidence_score >= %s"
                    params.append(min_confidence)

                query += " ORDER BY f.created_at DESC LIMIT 100"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                return {
                    'success': True,
                    'facts': [dict(r) for r in rows],
                    'count': len(rows)
                }
    except Exception as e:
        logger.error(f"Error getting knowledge facts: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("get_knowledge_insights")
def get_knowledge_insights(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Get AI-discovered insights (anomalies, trends, opportunities, risks)."""
    insight_id = kwargs.get('insight_id') or kwargs.get('id')
    entity_id = kwargs.get('entity_id') or kwargs.get('subject_entity_id')
    insight_type = kwargs.get('insight_type') or kwargs.get('type')
    severity = kwargs.get('severity')
    acknowledged = kwargs.get('acknowledged')

    # Security: In global/no-project contexts, do not expose shared graph data.
    if not project_id or int(project_id) <= 0:
        return {
            'success': True,
            'insights': [],
            'count': 0,
            'unacknowledged_by_severity': {},
            'message': 'No project context provided; knowledge insights are project-scoped.'
        }

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT entity_id
                    FROM landscape.knowledge_entities
                    WHERE canonical_name = %s
                    LIMIT 1
                    """,
                    [f'project:{int(project_id)}']
                )
                project_entity = cursor.fetchone()
                if not project_entity:
                    return {
                        'success': True,
                        'insights': [],
                        'count': 0,
                        'unacknowledged_by_severity': {},
                        'message': f'No knowledge graph project entity found for project_id={project_id}.'
                    }

                project_entity_id = int(project_entity['entity_id'])

                query = """
                    SELECT i.*,
                           e.canonical_name as subject_name, e.entity_type as subject_type
                    FROM landscape.knowledge_insights i
                    LEFT JOIN landscape.knowledge_entities e ON i.subject_entity_id = e.entity_id
                    WHERE (
                        i.subject_entity_id = %s
                        OR EXISTS (
                            SELECT 1
                            FROM landscape.knowledge_entities se
                            WHERE se.entity_id = i.subject_entity_id
                              AND se.metadata ? 'project_id'
                              AND (se.metadata->>'project_id') ~ '^[0-9]+$'
                              AND (se.metadata->>'project_id')::bigint = %s
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM unnest(i.supporting_facts) AS sf(fact_id)
                            JOIN landscape.knowledge_facts f ON f.fact_id = sf.fact_id
                            WHERE (
                                f.subject_entity_id = %s
                                OR f.object_entity_id = %s
                                OR (
                                    f.source_type = 'document_extract'
                                    AND EXISTS (
                                        SELECT 1
                                        FROM landscape.core_doc d
                                        WHERE d.doc_id = f.source_id
                                          AND d.project_id = %s
                                    )
                                )
                            )
                        )
                    )
                """
                params = [
                    project_entity_id,
                    int(project_id),
                    project_entity_id,
                    project_entity_id,
                    int(project_id),
                ]

                if insight_id:
                    query += " AND i.insight_id = %s"
                    params.append(insight_id)
                if entity_id:
                    query += " AND i.subject_entity_id = %s"
                    params.append(entity_id)
                if insight_type:
                    query += " AND i.insight_type = %s"
                    params.append(insight_type)
                if severity:
                    query += " AND i.severity = %s"
                    params.append(severity)
                if acknowledged is not None:
                    query += " AND i.acknowledged = %s"
                    params.append(acknowledged)

                query += " ORDER BY i.created_at DESC LIMIT 50"
                cursor.execute(query, params)
                rows = cursor.fetchall()

                # Get severity breakdown
                cursor.execute(
                    """
                    SELECT i.severity, COUNT(*) as count
                    FROM landscape.knowledge_insights i
                    WHERE (
                        i.subject_entity_id = %s
                        OR EXISTS (
                            SELECT 1
                            FROM landscape.knowledge_entities se
                            WHERE se.entity_id = i.subject_entity_id
                              AND se.metadata ? 'project_id'
                              AND (se.metadata->>'project_id') ~ '^[0-9]+$'
                              AND (se.metadata->>'project_id')::bigint = %s
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM unnest(i.supporting_facts) AS sf(fact_id)
                            JOIN landscape.knowledge_facts f ON f.fact_id = sf.fact_id
                            WHERE (
                                f.subject_entity_id = %s
                                OR f.object_entity_id = %s
                                OR (
                                    f.source_type = 'document_extract'
                                    AND EXISTS (
                                        SELECT 1
                                        FROM landscape.core_doc d
                                        WHERE d.doc_id = f.source_id
                                          AND d.project_id = %s
                                    )
                                )
                            )
                        )
                    )
                    AND (i.acknowledged = false OR i.acknowledged IS NULL)
                    GROUP BY i.severity
                    """,
                    [
                        project_entity_id,
                        int(project_id),
                        project_entity_id,
                        project_entity_id,
                        int(project_id),
                    ]
                )
                severity_counts = {r['severity']: r['count'] for r in cursor.fetchall()}

                return {
                    'success': True,
                    'insights': [dict(r) for r in rows],
                    'count': len(rows),
                    'unacknowledged_by_severity': severity_counts
                }
    except Exception as e:
        logger.error(f"Error getting knowledge insights: {e}")
        return {'success': False, 'error': str(e)}


@register_tool("acknowledge_insight", is_mutation=True)
def acknowledge_insight(
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Acknowledge an AI insight and record user action."""
    insight_id = kwargs.get('insight_id') or kwargs.get('id')
    user_action = kwargs.get('user_action') or kwargs.get('action')
    notes = kwargs.get('notes')
    reason = kwargs.get('reason', 'Acknowledge insight')

    if not insight_id:
        return {'success': False, 'error': 'insight_id required'}
    if not user_action:
        return {'success': False, 'error': 'user_action required (accepted, rejected, needs_review, fixed)'}

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get insight info first
                cursor.execute("""
                    SELECT insight_id, insight_title FROM landscape.knowledge_insights WHERE insight_id = %s
                """, [insight_id])
                insight = cursor.fetchone()
                if not insight:
                    return {'success': False, 'error': f'Insight {insight_id} not found'}

                if propose_only:
                    return create_mutation_proposal(
                        mutation_type='knowledge_upsert',
                        table_name='knowledge_insights',
                        target_id=insight_id,
                        changes={
                            'acknowledged': True,
                            'user_action': user_action,
                            'notes': notes
                        },
                        reason=reason,
                        project_id=project_id,
                        source_message_id=source_message_id
                    )

                update_parts = ["acknowledged = true", "acknowledged_at = NOW()", "user_action = %s"]
                values = [user_action]

                if notes:
                    # Note: The schema doesn't have a notes field on insights, so we'll add to metadata
                    update_parts.append("metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb")
                    import json
                    values.append(json.dumps({'user_notes': notes}))

                cursor.execute(f"""
                    UPDATE landscape.knowledge_insights
                    SET {', '.join(update_parts)}
                    WHERE insight_id = %s
                    RETURNING insight_id, insight_title, user_action
                """, values + [insight_id])
                row = cursor.fetchone()
                conn.commit()
                return {
                    'success': True,
                    'action': 'acknowledged',
                    'insight_id': row['insight_id'],
                    'title': row['insight_title'],
                    'user_action': row['user_action']
                }
    except Exception as e:
        logger.error(f"Error acknowledging insight: {e}")
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Income Analysis Tools - Loss to Lease & Year 1 Buyer NOI
# ─────────────────────────────────────────────────────────────────────────────

@register_tool("analyze_loss_to_lease")
def analyze_loss_to_lease(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Calculate Loss to Lease for a multifamily property.

    Supports simple (annual gap) and time-weighted (PV based on lease expirations) methods.
    """
    from .services.loss_to_lease_calculator import LossToLeaseCalculator
    from decimal import Decimal

    method = tool_input.get('method', 'simple')
    discount_rate = tool_input.get('discount_rate')
    include_details = tool_input.get('include_details', False)
    include_schedule = tool_input.get('include_schedule', method == 'time_weighted')

    try:
        # Initialize calculator
        calc_kwargs = {'project_id': project_id}
        if discount_rate:
            calc_kwargs['discount_rate'] = Decimal(str(discount_rate))

        calculator = LossToLeaseCalculator(**calc_kwargs)

        # Run calculation based on method
        if method == 'time_weighted':
            result = calculator.calculate_time_weighted()
        else:
            result = calculator.calculate_simple()

        # Build response
        response = {
            'success': True,
            'method': result.method,
            'summary': {
                'total_current_monthly': float(result.total_current_monthly),
                'total_market_monthly': float(result.total_market_monthly),
                'monthly_gap': float(result.monthly_gap),
                'annual_gap': float(result.annual_gap),
                'gap_percentage': float(result.gap_percentage),
                'unit_count': result.unit_count,
                'units_below_market': result.units_below_market,
                'units_at_or_above_market': result.units_at_or_above_market,
            }
        }

        # Time-weighted specific fields
        if result.pv_of_loss is not None:
            response['summary']['pv_of_loss'] = float(result.pv_of_loss)
        if result.avg_months_to_expiration is not None:
            response['summary']['avg_months_to_expiration'] = result.avg_months_to_expiration

        # Include unit details if requested
        if include_details:
            response['unit_details'] = [u.to_dict() for u in result.unit_details]

        # Include lease expiration schedule
        if include_schedule:
            response['lease_expiration_schedule'] = calculator.get_lease_expiration_schedule()

        # Include rent control analysis
        try:
            rent_control = calculator.get_rent_control_impact(result)
            response['rent_control'] = rent_control
        except Exception as rc_error:
            logger.warning(f"Could not get rent control analysis: {rc_error}")
            response['rent_control'] = None

        # Build narrative summary
        gap_pct = result.gap_percentage
        if gap_pct > 0:
            response['narrative'] = (
                f"Current rents are {gap_pct:.1f}% below market. "
                f"Annual Loss to Lease is ${result.annual_gap:,.0f} across {result.units_below_market} "
                f"of {result.unit_count} units."
            )
            if result.pv_of_loss is not None:
                response['narrative'] += f" Present value of lost income: ${result.pv_of_loss:,.0f}."

            # Add rent control warning if applicable
            if response.get('rent_control') and response['rent_control'].get('rent_control_status', {}).get('is_rent_controlled'):
                rc_status = response['rent_control']['rent_control_status']
                rc_impact = response['rent_control'].get('recovery_impact', {})
                response['narrative'] += (
                    f" WARNING: Property is subject to {rc_status.get('ordinance_name', 'rent control')} "
                    f"(max {(rc_status.get('max_annual_increase') or 0) * 100:.0f}% annual increase). "
                )
                if rc_impact.get('years_to_full_recovery'):
                    response['narrative'] += f"Est. {rc_impact['years_to_full_recovery']:.1f} years to full LTL recovery."
        else:
            response['narrative'] = (
                f"Current rents are at or above market levels. "
                f"No Loss to Lease - {result.units_at_or_above_market} of {result.unit_count} units "
                f"are at or above market rent."
            )

        return response

    except Exception as e:
        logger.error(f"Error calculating loss to lease: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool("calculate_year1_buyer_noi")
def calculate_year1_buyer_noi(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Calculate realistic Year 1 NOI for a buyer.

    Uses actual in-place rents + projected expenses for Day 1 cash flow reality.
    """
    from .services.year1_noi_calculator import Year1BuyerNOICalculator, format_year1_noi_summary
    from decimal import Decimal

    vacancy_rate = tool_input.get('vacancy_rate')
    credit_loss_rate = tool_input.get('credit_loss_rate')
    expense_scenario = tool_input.get('expense_scenario', 'proforma')
    include_ltl = tool_input.get('include_loss_to_lease', True)

    try:
        calculator = Year1BuyerNOICalculator(project_id)

        # Build calculation kwargs
        calc_kwargs = {
            'expense_scenario': expense_scenario,
            'include_loss_to_lease': include_ltl,
        }
        if vacancy_rate is not None:
            calc_kwargs['vacancy_rate'] = Decimal(str(vacancy_rate))
        if credit_loss_rate is not None:
            calc_kwargs['credit_loss_rate'] = Decimal(str(credit_loss_rate))

        result = calculator.calculate(**calc_kwargs)

        # Build response
        response = {
            'success': True,
            'year1_noi': result.to_dict(),
            'formatted_summary': format_year1_noi_summary(result),
        }

        # Build narrative
        narrative_parts = [
            f"Year 1 Buyer NOI: ${result.net_operating_income:,.0f}",
        ]

        if result.noi_per_unit:
            narrative_parts.append(f"(${result.noi_per_unit:,.0f}/unit)")

        if result.vs_broker_current is not None:
            diff = result.vs_broker_current
            sign = '+' if diff >= 0 else ''
            narrative_parts.append(f"- {sign}${diff:,.0f} vs Broker Current")

        if result.vs_broker_proforma is not None:
            diff = result.vs_broker_proforma
            sign = '+' if diff >= 0 else ''
            narrative_parts.append(f"- {sign}${diff:,.0f} vs Broker Proforma")

        response['narrative'] = ' '.join(narrative_parts)

        return response

    except Exception as e:
        logger.error(f"Error calculating Year 1 Buyer NOI: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@register_tool("check_income_analysis_availability")
def check_income_analysis_availability(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = True,
    source_message_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Check if Loss to Lease and Year 1 Buyer NOI analyses are available.

    Returns data availability and recommendations.
    """
    from .services.income_analysis_detector import IncomeAnalysisDetector

    try:
        detector = IncomeAnalysisDetector(project_id)
        analysis = detector.analyze()

        # Build recommendation
        recommendations = []
        if analysis['can_calculate_year1_buyer_noi']:
            recommendations.append(
                "Year 1 Buyer NOI analysis available - use calculate_year1_buyer_noi tool"
            )
        if analysis['can_calculate_timeweighted_ltl']:
            recommendations.append(
                "Time-weighted Loss to Lease available (lease dates present) - use analyze_loss_to_lease with method='time_weighted'"
            )
        elif analysis['can_calculate_simple_ltl']:
            recommendations.append(
                "Simple Loss to Lease available - use analyze_loss_to_lease tool"
            )

        if analysis['rent_gap_material']:
            gap_pct = analysis['rent_gap_pct'] * 100 if analysis['rent_gap_pct'] else 0
            recommendations.insert(0, f"ALERT: Current rents are {gap_pct:.0f}% below market - significant value-add opportunity")

        return {
            'success': True,
            'availability': {
                'has_rent_roll': analysis['has_rent_roll'],
                'has_current_rents': analysis['has_current_rents'],
                'has_market_rents': analysis['has_market_rents'],
                'has_lease_dates': analysis['has_lease_dates'],
                'has_proforma_expenses': analysis['has_proforma_expenses'],
                'has_t12_expenses': analysis['has_t12_expenses'],
            },
            'analysis_options': {
                'simple_loss_to_lease': analysis['can_calculate_simple_ltl'],
                'time_weighted_loss_to_lease': analysis['can_calculate_timeweighted_ltl'],
                'year1_buyer_noi': analysis['can_calculate_year1_buyer_noi'],
            },
            'rent_gap': {
                'percentage': analysis['rent_gap_pct'],
                'is_material': analysis['rent_gap_material'],
            },
            'recommendations': recommendations,
            'rent_stats': analysis['rent_stats'],
            'expense_stats': analysis['expense_stats'],
        }

    except Exception as e:
        logger.error(f"Error checking income analysis availability: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Main Dispatcher (Registry-based)
# ─────────────────────────────────────────────────────────────────────────────

# Tools that should auto-execute without requiring user confirmation
# These are batch operations where the user explicitly requested the action
AUTO_EXECUTE_TOOLS = {
    'update_units',       # Rent roll batch - populate units from document
    'update_leases',      # Rent roll batch - populate leases from document
    'update_unit_types',  # Rent roll batch - populate floorplan/unit types
    'update_operating_expenses',  # OpEx batch - populate from OM/T12/operating statement
    'confirm_column_mapping',  # Column mapping - user confirmed in chat
}


def execute_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    project_id: int,
    source_message_id: Optional[str] = None,
    propose_only: bool = True,
) -> Dict[str, Any]:
    """
    Execute a tool call from Claude using the registry pattern.

    When propose_only=True (default), mutation tools return proposals for user
    confirmation instead of executing immediately. Read-only tools always execute.

    Exception: Tools in AUTO_EXECUTE_TOOLS always execute immediately because
    they handle batch operations where the user explicitly requested the action
    (e.g., "populate rent roll from this document").

    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool
        project_id: The project ID to operate on
        source_message_id: Optional message ID for linking proposals to chat
        propose_only: If True, mutations return proposals instead of executing

    Returns:
        Dict with execution results or proposal details
    """
    handler = TOOL_REGISTRY.get(tool_name)

    if handler is None:
        logger.warning(f"Unknown tool requested: {tool_name}")
        return {
            'success': False,
            'error': f"Unknown tool: {tool_name}",
            'available_tools': list(TOOL_REGISTRY.keys())
        }

    # Auto-execute rent roll batch tools without requiring confirmation
    # User explicitly asked for this action (e.g., "read document and populate rent roll")
    if tool_name in AUTO_EXECUTE_TOOLS:
        propose_only = False
        logger.info(f"Auto-executing {tool_name} (in AUTO_EXECUTE_TOOLS list)")

    try:
        # All handlers receive the same kwargs for consistency
        return handler(
            tool_input=tool_input,
            project_id=project_id,
            propose_only=propose_only,
            source_message_id=source_message_id,
        )
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}", exc_info=True)
        return {
            'success': False,
            'error': f"Tool execution error: {str(e)}",
            'tool': tool_name
        }


def get_registered_tools() -> Dict[str, Dict[str, Any]]:
    """
    Get information about all registered tools.

    Returns:
        Dict mapping tool names to their metadata (is_mutation, etc.)
    """
    return {
        name: {
            'name': name,
            'is_mutation': getattr(handler, '_is_mutation', False),
            'handler': handler.__name__,
        }
        for name, handler in TOOL_REGISTRY.items()
    }


# ─────────────────────────────────────────────────────────────────────────────
# Document Reading Functions
# ─────────────────────────────────────────────────────────────────────────────

def _is_rent_roll_doc(doc_name: Optional[str], doc_type: Optional[str]) -> bool:
    name = (doc_name or '').lower()
    dtype = (doc_type or '').lower()
    return (
        'rent roll' in name
        or 'rr' in name.split()
        or 'rent_roll' in dtype
        or dtype == 'rent roll'
    )


def _select_document_id_for_request(
    cursor,
    project_id: int,
    doc_type: Optional[str] = None,
    doc_name: Optional[str] = None,
    focus: Optional[str] = None,
    exclude_doc_id: Optional[int] = None
) -> Optional[int]:
    doc_type = (doc_type or '').strip().lower()
    doc_name = (doc_name or '').strip().lower()

    focus_doc_types = []
    if focus == 'operating_expenses':
        focus_doc_types = ['om', 'offering_memorandum', 'operating_statement', 't12', 'financial_statement']
    elif focus == 'rental_comps':
        focus_doc_types = ['om', 'rent_comp', 'market_report', 'comp_report']

    query = """
        SELECT
            d.doc_id,
            d.doc_name,
            d.doc_type,
            d.created_at,
            q.status as extraction_status,
            (SELECT COUNT(*) FROM landscape.knowledge_embeddings ke
             WHERE ke.source_type = 'document_chunk' AND ke.source_id = d.doc_id) as embedding_count
        FROM landscape.core_doc d
        LEFT JOIN landscape.dms_extract_queue q ON q.doc_id = d.doc_id
        WHERE d.project_id = %s
    """
    params = [project_id]

    if exclude_doc_id:
        query += " AND d.doc_id <> %s"
        params.append(exclude_doc_id)

    cursor.execute(query, params)
    rows = cursor.fetchall()

    best_doc_id = None
    best_score = None
    has_focus_candidate = False

    for doc_id_row, name, dtype, created_at, extraction_status, embedding_count in rows:
        name_lower = (name or '').lower()
        dtype_lower = (dtype or '').lower()
        score = 0

        if doc_type and doc_type in dtype_lower:
            score += 100
        if doc_name and doc_name in name_lower:
            score += 90

        if focus_doc_types:
            if any(dt in dtype_lower for dt in focus_doc_types):
                score += 50
                has_focus_candidate = True
            if focus == 'operating_expenses' and ('om' in name_lower or 'offering memorandum' in name_lower):
                score += 40

        if focus == 'operating_expenses' and _is_rent_roll_doc(name, dtype):
            score -= 50

        if extraction_status == 'completed':
            score += 10
        if embedding_count and embedding_count > 0:
            score += 5

        if best_score is None or score > best_score:
            best_score = score
            best_doc_id = doc_id_row
        elif score == best_score and created_at:
            best_doc_id = doc_id_row

    if focus == 'operating_expenses' and not has_focus_candidate:
        if best_doc_id:
            cursor.execute("""
                SELECT doc_name, doc_type
                FROM landscape.core_doc
                WHERE doc_id = %s
            """, [best_doc_id])
            row = cursor.fetchone()
            if row and _is_rent_roll_doc(row[0], row[1]):
                return None

    return best_doc_id

def get_project_documents(
    project_id: int,
    status_filter: str = "all"
) -> Dict[str, Any]:
    """
    List all documents uploaded to a project.

    Prioritizes documents with 'completed' extraction status (readable content).
    Deduplicates by document name, keeping the version with best extraction status.

    Args:
        project_id: Project ID to list documents for
        status_filter: Optional filter: 'indexed', 'pending', 'failed', or 'all'

    Returns:
        Dict with documents list and count, sorted by readiness for extraction
    """
    try:
        with connection.cursor() as cursor:
            # Query with embedding count and priority scoring
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
                    (SELECT COUNT(*) FROM landscape.dms_assertion a WHERE a.doc_id = d.doc_id::text) as assertion_count,
                    (SELECT COUNT(*) FROM landscape.knowledge_embeddings ke
                     WHERE ke.source_type = 'document_chunk' AND ke.source_id = d.doc_id) as embedding_count,
                    -- Priority: completed=1, indexed=2, failed=3, pending=4, null=5
                    CASE
                        WHEN q.status = 'completed' THEN 1
                        WHEN d.status = 'indexed' THEN 2
                        WHEN q.status = 'failed' THEN 3
                        WHEN q.status = 'pending' THEN 4
                        ELSE 5
                    END as priority
                FROM landscape.core_doc d
                LEFT JOIN landscape.dms_extract_queue q ON q.doc_id = d.doc_id
                WHERE d.project_id = %s
            """
            params = [project_id]

            if status_filter != "all":
                query += " AND q.status = %s"
                params.append(status_filter)

            # Order by priority first (completed docs first), then by date
            query += " ORDER BY priority ASC, d.created_at DESC LIMIT 100"

            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        # Deduplicate by doc_name, keeping best version (lowest priority number)
        seen_names = {}
        documents = []

        for row in rows:
            doc_dict = dict(zip(columns, row))
            doc_name = doc_dict.get('doc_name', '')
            priority = doc_dict.get('priority', 5)

            # Keep only the best version of each document
            if doc_name in seen_names:
                existing_priority = seen_names[doc_name]['priority']
                if priority >= existing_priority:
                    continue  # Skip this duplicate, we have a better one
                else:
                    # Remove the worse version
                    documents = [d for d in documents if d['doc_name'] != doc_name]

            seen_names[doc_name] = {'priority': priority}

            # Convert datetime to string for JSON serialization
            if doc_dict.get('created_at'):
                doc_dict['created_at'] = doc_dict['created_at'].isoformat()
            # Convert Decimal to float
            if doc_dict.get('overall_confidence'):
                doc_dict['overall_confidence'] = float(doc_dict['overall_confidence'])

            # Add helpful flags for Landscaper
            doc_dict['has_content'] = (
                doc_dict.get('extraction_status') == 'completed' or
                doc_dict.get('embedding_count', 0) > 0
            )
            doc_dict['recommended'] = doc_dict.get('extraction_status') == 'completed'

            # Remove internal priority field
            doc_dict.pop('priority', None)

            documents.append(doc_dict)

        # Sort final list: recommended first, then by embedding count
        documents.sort(key=lambda x: (not x.get('recommended', False), -x.get('embedding_count', 0)))

        return {
            'success': True,
            'documents': documents,
            'count': len(documents),
            'message': f"Found {len(documents)} unique documents. Documents marked 'recommended' have completed extraction and are ready for content reading."
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
    max_length: int = 40000,
    focus: str = None,
    doc_type: str = None,
    doc_name: str = None
) -> Dict[str, Any]:
    """
    Get extracted content from a document.

    The content comes from the extracted_data JSONB field in dms_extract_queue,
    which contains the structured extraction result.

    max_length is capped at 40K chars (~10K tokens). This is safe because
    _truncate_tool_result() in ai_handler.py will truncate before sending
    to Claude if needed.

    Args:
        doc_id: Document ID to retrieve content from
        project_id: Project ID for authorization check
        max_length: Maximum characters to return (capped at 40000)
        focus: Optional focus area to prioritize:
            - "rental_comps": Prioritize rental comparable sections
            - "operating_expenses": Prioritize T-12 / expense sections
            - None: Return full content (default)

    Returns:
        Dict with document metadata and extracted content
    """
    # Cap to prevent runaway output; _truncate_tool_result() provides secondary safety net
    max_length = min(max_length, 40000)
    import json
    try:
        with connection.cursor() as cursor:
            resolved_doc_id = doc_id
            original_doc_id = None

            if not resolved_doc_id:
                resolved_doc_id = _select_document_id_for_request(
                    cursor=cursor,
                    project_id=project_id,
                    doc_type=doc_type,
                    doc_name=doc_name,
                    focus=focus
                )

            if not resolved_doc_id:
                return {
                    'success': False,
                    'error': 'No matching document found for the requested type/name.'
                }

            # First get document metadata and verify project access
            doc_query = """
                SELECT d.doc_id, d.doc_name, d.doc_type, d.project_id, d.mime_type
                FROM landscape.core_doc d
                WHERE d.doc_id = %s AND d.project_id = %s
            """
            cursor.execute(doc_query, [resolved_doc_id, project_id])
            doc = cursor.fetchone()

            if not doc:
                return {
                    'success': False,
                    'error': f"Document {doc_id} not found or access denied"
                }

            doc_id, doc_name, doc_type, proj_id, mime_type = doc

            if focus == 'operating_expenses' and _is_rent_roll_doc(doc_name, doc_type):
                replacement_doc_id = _select_document_id_for_request(
                    cursor=cursor,
                    project_id=project_id,
                    doc_type='om',
                    doc_name=doc_name,
                    focus=focus,
                    exclude_doc_id=doc_id
                )
                if replacement_doc_id:
                    original_doc_id = doc_id
                    cursor.execute(doc_query, [replacement_doc_id, project_id])
                    doc = cursor.fetchone()
                    if doc:
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
                # Fallback: Try to get content from knowledge_embeddings
                cursor.execute("""
                    SELECT content_text
                    FROM landscape.knowledge_embeddings
                    WHERE source_type = 'document_chunk'
                      AND source_id = %s
                      AND (superseded_by_version IS NULL OR superseded_by_version = 0)
                    ORDER BY embedding_id
                    LIMIT 50
                """, [doc_id])
                embedding_rows = cursor.fetchall()

                if embedding_rows:
                    # Combine embedding chunks into readable content
                    chunks = [row[0] for row in embedding_rows if row[0]]
                    combined_content = "\n\n---\n\n".join(chunks)

                    # Truncate if too long
                    if len(combined_content) > max_length:
                        combined_content = combined_content[:max_length] + "\n\n[Content truncated...]"

                    return {
                        'success': True,
                        'doc_id': doc_id,
                        'doc_name': doc_name,
                        'doc_type': doc_type,
                        'content': combined_content,
                        'chunks': chunks,
                        'source': 'embeddings',
                        'message': f"Retrieved {len(chunks)} text chunks from document embeddings.",
                        'doc_swapped': bool(original_doc_id),
                        'original_doc_id': original_doc_id
                    }

                return {
                    'success': True,
                    'doc_id': doc_id,
                    'doc_name': doc_name,
                    'doc_type': doc_type,
                    'content': None,
                    'message': "No extracted content available. Document may not be indexed yet.",
                    'doc_swapped': bool(original_doc_id),
                    'original_doc_id': original_doc_id
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

                # Units — show ALL units so Landscaper can process the full rent roll
                if 'units' in extracted_data and extracted_data['units']:
                    content_parts.append(f"\n## Units ({len(extracted_data['units'])} total)")
                    content_parts.append("Unit | Bed | Bath | SqFt | Status")
                    content_parts.append("--- | --- | --- | --- | ---")
                    for unit in extracted_data['units']:
                        if isinstance(unit, dict):
                            unit_num = unit.get('unit_number', '?')
                            beds = unit.get('bedroom_count', unit.get('bedrooms', ''))
                            baths = unit.get('bathroom_count', unit.get('bathrooms', ''))
                            sqft = unit.get('sqft', unit.get('square_feet', ''))
                            stat = unit.get('status', unit.get('occupancy_status', ''))
                            content_parts.append(f"{unit_num} | {beds} | {baths} | {sqft} | {stat}")
                        else:
                            content_parts.append(f"- {unit}")

                # Leases — show ALL leases so Landscaper can process the full rent roll
                if 'leases' in extracted_data and extracted_data['leases']:
                    content_parts.append(f"\n## Leases ({len(extracted_data['leases'])} total)")
                    content_parts.append("Unit | Tenant | Rent | Start | End | Type")
                    content_parts.append("--- | --- | --- | --- | --- | ---")
                    for lease in extracted_data['leases']:
                        if isinstance(lease, dict):
                            unit_num = lease.get('unit_number', '?')
                            rent = lease.get('base_rent_monthly', lease.get('monthly_rent', '?'))
                            tenant = lease.get('resident_name', lease.get('tenant_name', ''))
                            rent_str = f"${rent:,.0f}" if isinstance(rent, (int, float)) else rent
                            start = lease.get('lease_start_date', '')
                            end = lease.get('lease_end_date', '')
                            ltype = lease.get('lease_type', '')
                            content_parts.append(f"{unit_num} | {tenant} | {rent_str} | {start} | {end} | {ltype}")
                        else:
                            content_parts.append(f"- {lease}")

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
                # Apply focus-based extraction if specified
                if focus and raw_text:
                    focused_text = _extract_focused_content(raw_text, focus, max_length - len(structured_content) - 100)
                    if focused_text:
                        content = f"{structured_content}\n\n## Focused Extraction ({focus})\n\n{focused_text}"
                    else:
                        content = f"{structured_content}\n\n## Full Document Text\n\n{raw_text}"
                else:
                    content = f"{structured_content}\n\n## Full Document Text\n\n{raw_text}"
            else:
                content = structured_content

            truncated = len(content) > max_length

            # Smart truncation: if we have to truncate, try to preserve relevant sections
            final_content = content
            if truncated and focus:
                # Re-extract with focus to fit within limit
                focused_text = _extract_focused_content(raw_text or '', focus, max_length - len(structured_content) - 100)
                final_content = f"{structured_content}\n\n## Focused Extraction ({focus})\n\n{focused_text}"
                truncated = len(final_content) > max_length
                final_content = final_content[:max_length] if truncated else final_content
            else:
                final_content = content[:max_length] if truncated else content

            return {
                'success': True,
                'doc_id': doc_id,
                'doc_name': doc_name,
                'doc_type': doc_type,
                'mime_type': mime_type,
                'content': final_content,
                'total_length': len(content),
                'truncated': truncated,
                'focus_applied': focus,
                'extraction_confidence': float(confidence) if confidence else None,
                'has_raw_text': raw_text is not None and len(raw_text) > 0
            }

    except Exception as e:
        logger.error(f"Error getting document content: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def _extract_focused_content(text: str, focus: str, max_length: int) -> Optional[str]:
    """
    Extract focused sections from document text based on the focus type.

    Args:
        text: Full document text
        focus: Focus type ('rental_comps', 'operating_expenses', etc.)
        max_length: Maximum characters to return

    Returns:
        Focused text section or None if no relevant section found
    """
    import re

    # Define focus keywords for each type
    FOCUS_PATTERNS = {
        'rental_comps': [
            r'(?i)(comparable|comp)\s*(rental|properties|rentals)',
            r'(?i)rental\s*comps',
            r'(?i)CHARTER\s*OAKS',  # Common comp property name
            r'(?i)ARRIVE\s+',  # Common comp property prefix
            r'(?i)SOFI\s+',  # Common comp property prefix
            r'(?i)(market|competitive)\s*survey',
            r'(?i)bedroom.{0,5}bath.{0,20}\$\d',  # Unit type with rent pattern
        ],
        'operating_expenses': [
            r'(?i)operating\s*expenses',
            r'(?i)T-?12',
            r'(?i)trailing\s*twelve',
            r'(?i)expense\s*summary',
            r'(?i)annual\s*expenses',
            r'(?i)(property|real\s*estate)\s*taxes',
            r'(?i)utilities',
            r'(?i)management\s*fee',
        ],
    }

    patterns = FOCUS_PATTERNS.get(focus, [])
    if not patterns:
        return None

    # Find all matches and their positions
    matches = []
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            matches.append({
                'start': match.start(),
                'end': match.end(),
                'text': match.group()
            })

    if not matches:
        return None

    # Sort by position
    matches.sort(key=lambda m: m['start'])

    # Find the earliest substantial match (prefer those with more context)
    # Look for clusters of matches that indicate a section
    best_start = None
    best_score = 0

    for i, match in enumerate(matches):
        # Count how many matches are within 5000 chars after this one
        cluster_count = 1
        for other in matches[i+1:]:
            if other['start'] - match['start'] < 5000:
                cluster_count += 1
            else:
                break

        if cluster_count > best_score:
            best_score = cluster_count
            best_start = match['start']

    if best_start is None:
        return None

    # Extract section: start 200 chars before first match, extend to max_length
    start_pos = max(0, best_start - 200)
    end_pos = min(len(text), start_pos + max_length)

    # Try to end at a natural boundary (paragraph or page break)
    natural_breaks = ['\n\n', '---', 'PAGE', '\n']
    for break_marker in natural_breaks:
        last_break = text.rfind(break_marker, start_pos, end_pos)
        if last_break > start_pos + max_length * 0.8:  # At least 80% of content
            end_pos = last_break
            break

    focused = text[start_pos:end_pos]

    # Add context about what was extracted
    return focused


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


# ─────────────────────────────────────────────────────────────────────────────
# Project Contacts Functions
# ─────────────────────────────────────────────────────────────────────────────

def update_project_contacts(
    project_id: int,
    contacts: List[Dict[str, Any]],
    source_document: str = None
) -> Dict[str, Any]:
    """
    Add or update contacts for a project.

    Uses tbl_contacts (the canonical contacts table).

    Args:
        project_id: Project to add contacts to
        contacts: List of contact dicts with keys:
            - contact_role: Required (listing_broker, buyer_broker, etc.)
            - contact_name: Required
            - contact_title, contact_email, contact_phone, company_name: Optional
            - license_number, is_primary: Optional (stored in notes)
            - address_line1, city, state, zip: Optional (stored in address fields)
        source_document: Optional document name for audit trail

    Returns:
        Dict with success status, created/updated counts
    """
    created_count = 0
    updated_count = 0
    error_count = 0
    results = []

    for contact in contacts:
        contact_role = contact.get('contact_role', '').lower().strip()
        contact_name = contact.get('contact_name', '').strip()

        if not contact_role or not contact_name:
            results.append({
                'success': False,
                'error': 'Missing required fields (contact_role, contact_name)',
                'contact': contact
            })
            error_count += 1
            continue

        try:
            with connection.cursor() as cursor:
                # Check if this contact already exists for this project/role/email combo
                email = contact.get('contact_email', '').strip() or None

                if email:
                    cursor.execute("""
                        SELECT contact_id FROM landscape.tbl_contacts
                        WHERE project_id = %s AND contact_role = %s AND email = %s
                    """, [project_id, contact_role, email])
                else:
                    # Match by name if no email
                    cursor.execute("""
                        SELECT contact_id FROM landscape.tbl_contacts
                        WHERE project_id = %s AND contact_role = %s AND contact_name = %s
                    """, [project_id, contact_role, contact_name])

                existing = cursor.fetchone()

                # Build notes field with extra info (license, source doc)
                notes_parts = []
                if contact.get('notes'):
                    notes_parts.append(contact.get('notes'))
                if contact.get('license_number'):
                    notes_parts.append(f"License: {contact.get('license_number')}")
                if source_document:
                    notes_parts.append(f"Source: {source_document}")
                notes = ' | '.join(notes_parts) if notes_parts else None

                if existing:
                    # Update existing contact
                    contact_id = existing[0]
                    cursor.execute("""
                        UPDATE landscape.tbl_contacts SET
                            contact_name = %s,
                            title = %s,
                            email = %s,
                            phone_direct = %s,
                            company = %s,
                            address_line1 = %s,
                            city = %s,
                            state = %s,
                            zip = %s,
                            notes = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE contact_id = %s
                    """, [
                        contact_name,
                        contact.get('contact_title'),
                        email,
                        contact.get('contact_phone'),
                        contact.get('company_name'),
                        contact.get('address_line1'),
                        contact.get('city'),
                        contact.get('state'),
                        contact.get('zip'),
                        notes,
                        contact_id
                    ])
                    updated_count += 1
                    results.append({
                        'success': True,
                        'action': 'updated',
                        'contact_name': contact_name,
                        'contact_role': contact_role
                    })
                else:
                    # Insert new contact
                    cursor.execute("""
                        INSERT INTO landscape.tbl_contacts (
                            project_id, contact_role, contact_name, title,
                            email, phone_direct, company,
                            address_line1, city, state, zip, notes
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, [
                        project_id,
                        contact_role,
                        contact_name,
                        contact.get('contact_title'),
                        email,
                        contact.get('contact_phone'),
                        contact.get('company_name'),
                        contact.get('address_line1'),
                        contact.get('city'),
                        contact.get('state'),
                        contact.get('zip'),
                        notes
                    ])
                    created_count += 1
                    results.append({
                        'success': True,
                        'action': 'created',
                        'contact_name': contact_name,
                        'contact_role': contact_role
                    })

        except Exception as e:
            logger.error(f"Error saving contact {contact_name}: {e}")
            results.append({
                'success': False,
                'error': str(e),
                'contact_name': contact_name
            })
            error_count += 1

    # Log activity
    if created_count > 0 or updated_count > 0:
        _log_contacts_activity(
            project_id=project_id,
            created_count=created_count,
            updated_count=updated_count,
            source_document=source_document,
            contacts=contacts
        )

    return {
        'success': error_count == 0,
        'created': created_count,
        'updated': updated_count,
        'errors': error_count,
        'results': results,
        'summary': f"Created {created_count}, updated {updated_count}, errors {error_count}"
    }


def _log_contacts_activity(
    project_id: int,
    created_count: int,
    updated_count: int,
    source_document: str,
    contacts: List[Dict]
) -> None:
    """Log contact update to activity feed."""
    try:
        from .models import ActivityItem

        total = created_count + updated_count
        contact_names = [c.get('contact_name', 'Unknown') for c in contacts[:5]]
        contact_list = ', '.join(contact_names)
        if len(contacts) > 5:
            contact_list += f" and {len(contacts) - 5} more"

        title = f"Added {total} project contacts"
        if source_document:
            summary = f"Extracted from {source_document}: {contact_list}"
        else:
            summary = f"Added contacts: {contact_list}"

        ActivityItem.objects.create(
            project_id=project_id,
            category='data_entry',
            activity_type='contacts_updated',
            title=title,
            summary=summary,
            impact='none',
            source='landscaper',
            metadata={
                'created': created_count,
                'updated': updated_count,
                'contacts': [c.get('contact_name') for c in contacts],
                'source_document': source_document
            }
        )
    except Exception as e:
        logger.error(f"Failed to log contacts activity: {e}")


# =============================================================================
# Cabinet-Based Contact Tools Registration
# =============================================================================
# Register the new contact tools that use the cabinet-based architecture

def _register_contact_tools():
    """Register contact tools from the services module."""
    try:
        from .services.contact_tools import CONTACT_TOOL_HANDLERS

        for tool_name, handler in CONTACT_TOOL_HANDLERS.items():
            # Wrap handler to match registry signature
            def make_wrapper(h, name):
                def wrapper(tool_input, project_id, propose_only=True, source_message_id=None, **kwargs):
                    return h(tool_input=tool_input, project_id=project_id, **kwargs)
                wrapper._tool_name = name
                wrapper._is_mutation = name in {
                    'create_cabinet_contact',
                    'assign_contact_to_project',
                    'remove_contact_from_project',
                    'extract_and_save_contacts',
                }
                return wrapper
            TOOL_REGISTRY[tool_name] = make_wrapper(handler, tool_name)
            logger.debug(f"Registered contact tool: {tool_name}")
    except ImportError as e:
        logger.warning(f"Could not import contact tools: {e}")

# Register contact tools on module load
_register_contact_tools()


# =============================================================================
# Register H&BU (Highest & Best Use) analysis tools

def _register_hbu_tools():
    """Register H&BU tools from the services module."""
    try:
        from .services.hbu_tools import HBU_TOOL_HANDLERS

        for tool_name, handler in HBU_TOOL_HANDLERS.items():
            # Wrap handler to match registry signature
            def make_wrapper(h, name):
                def wrapper(tool_input, project_id, propose_only=True, source_message_id=None, **kwargs):
                    return h(tool_input=tool_input, project_id=project_id, **kwargs)
                wrapper._tool_name = name
                wrapper._is_mutation = name in {
                    'create_hbu_scenario',
                    'update_hbu_scenario',
                    'compare_hbu_scenarios',
                    'add_hbu_comparable_use',
                }
                return wrapper
            TOOL_REGISTRY[tool_name] = make_wrapper(handler, tool_name)
            logger.debug(f"Registered H&BU tool: {tool_name}")
    except ImportError as e:
        logger.warning(f"Could not import H&BU tools: {e}")

# Register H&BU tools on module load
_register_hbu_tools()


# =============================================================================
# Register Property Attribute tools

def _register_property_tools():
    """Register Property Attribute tools from the services module."""
    try:
        from .services.property_tools import PROPERTY_ATTRIBUTE_TOOL_HANDLERS

        for tool_name, handler in PROPERTY_ATTRIBUTE_TOOL_HANDLERS.items():
            # Wrap handler to match registry signature
            def make_wrapper(h, name):
                def wrapper(tool_input, project_id, propose_only=True, source_message_id=None, **kwargs):
                    return h(tool_input=tool_input, project_id=project_id, **kwargs)
                wrapper._tool_name = name
                wrapper._is_mutation = name in {
                    'update_property_attributes',
                    'update_site_attribute',
                    'update_improvement_attribute',
                }
                return wrapper
            TOOL_REGISTRY[tool_name] = make_wrapper(handler, tool_name)
            logger.debug(f"Registered property tool: {tool_name}")
    except ImportError as e:
        logger.warning(f"Could not import property tools: {e}")

# Register property tools on module load
_register_property_tools()


# =============================================================================
# Alpha Feedback Tool
# =============================================================================

@register_tool('log_alpha_feedback', is_mutation=True)
def handle_log_alpha_feedback(
    tool_input: Dict[str, Any],
    project_id: int,
    propose_only: bool = False,
    source_message_id: Optional[str] = None,
    user_id: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Log feedback from Alpha Assistant chat to the tbl_alpha_feedback table.

    This allows users to submit bug reports, suggestions, and questions
    directly from the chat interface.
    """
    feedback_type = tool_input.get('feedback_type', 'bug')
    summary = tool_input.get('summary', '')
    user_quote = tool_input.get('user_quote', '')
    page_context = tool_input.get('page_context', 'alpha_assistant_chat')

    if not summary:
        return {
            'success': False,
            'error': 'Summary is required for feedback'
        }

    # Build notes with additional context
    notes_parts = []
    if feedback_type:
        notes_parts.append(f"Type: {feedback_type}")
    if user_quote:
        notes_parts.append(f"User said: {user_quote}")
    notes = "\n".join(notes_parts) if notes_parts else None

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.tbl_alpha_feedback
                (page_context, project_id, user_id, feedback, status, submitted_at, notes)
                VALUES (%s, %s, %s, %s, 'new', NOW(), %s)
                RETURNING id
            """, [page_context, project_id, user_id, summary, notes])
            feedback_id = cursor.fetchone()[0]

        logger.info(
            f"[ALPHA_FEEDBACK] Logged feedback #{feedback_id}: "
            f"type={feedback_type}, project={project_id}, user={user_id}"
        )

        return {
            'success': True,
            'feedback_id': feedback_id,
            'message': f"Logged as feedback #{feedback_id}. The team will review this.",
            'action': 'created'
        }

    except Exception as e:
        logger.error(f"[ALPHA_FEEDBACK] Failed to log feedback: {e}")
        return {
            'success': False,
            'error': f"Failed to log feedback: {str(e)}"
        }
