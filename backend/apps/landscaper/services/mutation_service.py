"""
Mutation Service for Landscaper Write-Back

Handles the lifecycle of mutation proposals:
- Creating proposals from tool calls
- Confirming/rejecting proposals
- Executing confirmed mutations
- Audit logging

This implements Level 2 autonomy: Landscaper proposes, user confirms.
"""
import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import timedelta
from decimal import Decimal

from django.db import connection, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class DecimalEncoder(json.JSONEncoder):
    """Handle Decimal serialization for JSONB."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


# =============================================================================
# Schema Configuration - Verified against actual database 2026-01-08
# =============================================================================

# Mutable fields per table (whitelist for security)
MUTABLE_FIELDS = {
    "tbl_project": [
        # Identity
        "project_name", "description",
        # Location
        "project_address", "street_address", "city", "state", "zip_code",
        "county", "jurisdiction_city", "jurisdiction_county", "jurisdiction_state",
        "market", "submarket",
        # Property details
        "property_subtype", "property_class", "year_built", "stories",
        "lot_size_sf", "lot_size_acres", "gross_sf", "acres_gross",
        # Unit counts
        "target_units", "total_units",
        # Pricing
        "asking_price", "acquisition_price", "acquisition_date",
        "price_per_unit", "price_per_sf", "price_range_low", "price_range_high",
        # Cap rates & returns
        "cap_rate_current", "cap_rate_proforma",
        "discount_rate_pct", "cost_of_capital_pct",
        # Vacancy
        "current_vacancy_rate", "proforma_vacancy_rate",
        # Analysis settings
        "analysis_mode", "value_add_enabled", "active_opex_discriminator",
        "analysis_start_date", "analysis_end_date", "calculation_frequency",
        # Velocity
        "market_velocity_annual", "velocity_override_reason",
        # Status
        "is_active",
    ],
    "tbl_multifamily_unit": [
        "unit_number", "building_name", "unit_type",
        "bedrooms", "bathrooms", "square_feet",
        "market_rent", "current_rent", "market_rent_psf", "current_rent_psf",
        "occupancy_status", "renovation_status", "renovation_cost", "renovation_date",
        "is_manager", "is_section8",
        "floor_number", "lease_start_date", "lease_end_date",
        "has_balcony", "has_patio", "view_type",
    ],
    "tbl_project_assumption": [
        "assumption_key", "assumption_value", "assumption_type",
        "scope", "scope_id", "notes", "confidence_score",
    ],
    "tbl_lease_assumptions": [
        "space_type", "market_rent_psf_annual", "market_rent_growth_rate",
        "renewal_probability", "downtime_months",
        "ti_psf_renewal", "ti_psf_new_tenant",
        "lc_psf_renewal", "lc_psf_new_tenant",
        "free_rent_months_renewal", "free_rent_months_new_tenant",
        "notes",
    ],
    "tbl_operations_user_inputs": [
        "as_is_value", "as_is_count", "as_is_rate", "as_is_per_sf", "as_is_growth_rate",
        "post_reno_value", "post_reno_count", "post_reno_rate", "post_reno_per_sf", "post_reno_growth_rate",
        "notes",
    ],
    "tbl_operating_expenses": [
        "expense_category", "expense_type", "annual_amount", "amount_per_sf",
        "is_recoverable", "recovery_rate", "escalation_type", "escalation_rate",
        "start_period", "payment_frequency", "notes",
        "unit_amount", "calculation_basis", "statement_discriminator",
    ],
    "tbl_parcel": [
        "parcel_name", "parcel_code", "landuse_code", "landuse_type",
        "acres_gross", "lot_width", "lot_depth", "lot_area",
        "units_total", "saleprice", "saledate",
        "building_name", "building_class", "year_built", "rentable_sf",
        "description",
    ],
    "tbl_phase": [
        "phase_name", "phase_no", "label", "description", "phase_status",
        "phase_start_date", "phase_completion_date", "absorption_start_date",
    ],
    "tbl_area": [
        "area_alias", "area_no",
    ],
    "tbl_milestone": [
        "milestone_name", "milestone_type", "target_date", "actual_date",
        "status", "predecessor_milestone_id", "notes", "source_doc_id",
        "confidence_score", "created_by",
    ],
    # Financial Assumption Tables
    "tbl_property_acquisition": [
        "purchase_price", "acquisition_date", "hold_period_years", "exit_cap_rate",
        "sale_date", "closing_costs_pct", "due_diligence_days", "earnest_money",
        "sale_costs_pct", "broker_commission_pct", "price_per_unit", "price_per_sf",
        "legal_fees", "financing_fees", "third_party_reports", "depreciation_basis",
        "land_pct", "improvement_pct", "is_1031_exchange", "grm",
    ],
    "tbl_revenue_rent": [
        "current_rent_psf", "occupancy_pct", "annual_rent_growth_pct",
        "in_place_rent_psf", "market_rent_psf", "rent_loss_to_lease_pct",
        "lease_up_months", "stabilized_occupancy_pct", "rent_growth_years_1_3_pct",
        "rent_growth_stabilized_pct", "free_rent_months", "ti_allowance_per_unit",
        "renewal_probability_pct",
    ],
    "tbl_revenue_other": [
        "other_income_per_unit_monthly", "parking_income_per_space", "parking_spaces",
        "pet_fee_per_pet", "pet_penetration_pct", "laundry_income_per_unit",
        "storage_income_per_unit", "application_fees_annual", "late_fees_annual",
        "utility_reimbursements_annual", "furnished_unit_premium_pct",
        "short_term_rental_income", "ancillary_services_income", "vending_income",
        "package_locker_fees", "reserved_parking_premium", "ev_charging_fees",
        "other_miscellaneous", "income_category",
    ],
    "tbl_vacancy_assumption": [
        "vacancy_loss_pct", "collection_loss_pct", "physical_vacancy_pct",
        "economic_vacancy_pct", "bad_debt_pct", "concession_cost_pct",
        "turnover_vacancy_days", "seasonal_vacancy_adjustment",
        "lease_up_absorption_curve", "market_vacancy_rate_pct",
        "submarket_vacancy_rate_pct", "competitive_set_vacancy_pct",
    ],
    # Rent Roll Tables
    "tbl_multifamily_unit_type": [
        "unit_type_code", "unit_type_name", "bedrooms", "bathrooms",
        "square_feet_min", "square_feet_max", "base_rent", "market_rent",
        "unit_count", "is_affordable", "affordability_ami_level", "notes",
    ],
    "tbl_lease": [
        "tenant_name", "tenant_contact", "tenant_email", "tenant_phone",
        "lease_start_date", "lease_end_date", "monthly_rent", "base_rent",
        "rent_escalation_pct", "security_deposit", "lease_type", "lease_status",
        "payment_frequency", "payment_day", "is_month_to_month", "notice_days",
        "renewal_options", "renewal_rent_increase_pct", "cam_charges",
        "utility_reimbursements", "parking_charges", "pet_deposit", "pet_rent",
        "concessions_monthly", "concession_description", "move_in_date",
        "move_out_date", "termination_reason", "notes",
    ],
    # Comparables Tables
    "tbl_sales_comparables": [
        "comp_number", "property_name", "address", "city", "state", "zip",
        "sale_date", "sale_price", "price_per_unit", "price_per_sf",
        "year_built", "units", "building_sf", "cap_rate", "grm",
        "distance_from_subject", "unit_mix", "notes", "latitude", "longitude", "unit_count",
    ],
    "tbl_sales_comp_adjustments": [
        "adjustment_type", "adjustment_pct", "adjustment_amount",
        "justification", "user_adjustment_pct", "ai_accepted", "user_notes", "last_modified_by",
    ],
    "tbl_rent_comparable": [
        "property_name", "address", "distance_miles", "year_built", "total_units",
        "unit_type", "bedrooms", "bathrooms", "avg_sqft", "asking_rent",
        "effective_rent", "concessions", "amenities", "notes", "data_source",
        "as_of_date", "is_active",
    ],
    # Capital Stack Tables
    "tbl_debt_facility": [
        "facility_name", "facility_type", "lender_name", "commitment_amount",
        "interest_rate", "interest_calculation", "payment_frequency",
        "commitment_date", "maturity_date", "origination_fee_pct", "unused_fee_pct",
        "extension_fee_amount", "covenants", "draw_trigger_type", "notes",
        "can_participate_in_profits", "profit_participation_tier", "profit_participation_pct",
        "interest_payment_method", "ltv_pct", "dscr", "amortization_years", "loan_term_years",
        "is_construction_loan", "loan_amount", "interest_rate_pct", "rate_type",
        "interest_only_months", "index_type", "spread_bps", "floor_rate", "ceiling_rate",
        "prepayment_penalty_type", "prepayment_lockout_months", "exit_fee_pct",
        "recourse_type", "guarantor", "carve_out_guarantor", "reserve_requirements",
        "debt_yield_min", "max_ltc_pct", "extension_options", "extension_fee_pct",
        "is_senior", "is_subordinate", "priority_order", "intercreditor_agreement_id",
    ],
    "tbl_equity_structure": [
        "lp_ownership_pct", "gp_ownership_pct", "preferred_return_pct",
        "gp_promote_after_pref", "catch_up_pct", "equity_multiple_target",
        "irr_target_pct", "distribution_frequency",
    ],
    "tbl_waterfall_tier": [
        "tier_number", "tier_name", "tier_description", "hurdle_type", "hurdle_rate",
        "lp_split_pct", "gp_split_pct", "has_catch_up", "catch_up_pct",
        "irr_threshold_pct", "equity_multiple_threshold", "is_pari_passu",
        "is_lookback_tier", "catch_up_to_pct", "is_active", "display_order",
    ],
    # Budget Tables
    "core_unit_cost_category": [
        "parent_id", "category_name", "account_number", "account_level",
        "sort_order", "is_active", "tags", "is_calculated", "property_types",
    ],
    "core_fin_fact_budget": [
        "budget_id", "category_id", "uom_code", "qty", "rate", "amount",
        "start_date", "end_date", "notes", "division_id", "confidence_level",
        "vendor_contact_id", "escalation_rate", "contingency_pct", "timing_method",
        "contract_number", "purchase_order", "is_committed", "growth_rate_set_id",
        "contingency_mode", "confidence_code", "finance_structure_id", "scenario_id",
        "category_l1_id", "category_l2_id", "category_l3_id", "category_l4_id",
        "start_period", "periods_to_complete", "end_period", "escalation_method",
        "curve_profile", "curve_steepness", "scope_override", "cost_type",
        "tax_treatment", "internal_memo", "vendor_name", "status", "is_critical",
        "budget_version", "funding_draw_pct", "draw_schedule", "retention_pct",
        "payment_terms", "invoice_frequency", "cost_allocation", "is_reimbursable",
        "allocation_method", "activity", "new_category_id",
    ],
    # System Administration Tables
    "lu_family": [
        "code", "name", "active", "notes",
    ],
    "lu_type": [
        "family_id", "code", "name", "ord", "active", "notes",
    ],
    "res_lot_product": [
        "code", "lot_w_ft", "lot_d_ft", "lot_area_sf", "type_id", "is_active",
    ],
    "tbl_measures": [
        "measure_code", "measure_name", "measure_category", "is_system",
        "property_types", "sort_order",
    ],
    "tbl_system_picklist": [
        "picklist_type", "code", "name", "description", "parent_id",
        "sort_order", "is_active",
    ],
    "tbl_global_benchmark_registry": [
        "category", "subcategory", "benchmark_name", "description", "market_geography",
        "property_type", "source_type", "as_of_date", "confidence_level",
        "context_metadata", "is_active", "is_global",
    ],
    "core_unit_cost_item": [
        "category_id", "item_name", "default_uom_code", "typical_low_value",
        "typical_mid_value", "typical_high_value", "market_geography",
        "project_type_code", "is_active", "source", "as_of_date",
    ],
    "report_templates": [
        "template_name", "description", "output_format", "assigned_tabs",
        "sections", "is_active",
    ],
    "dms_templates": [
        "template_name", "workspace_id", "project_id", "doc_type",
        "is_default", "doc_type_options", "description",
    ],
    # Part 8: CRE Tables
    "tbl_cre_tenant": [
        "tenant_name", "tenant_legal_name", "dba_name", "industry", "naics_code",
        "business_type", "credit_rating", "creditworthiness", "dun_bradstreet_number",
        "annual_revenue", "years_in_business", "contact_name", "contact_title",
        "email", "phone", "guarantor_name", "guarantor_type",
    ],
    "tbl_cre_space": [
        "cre_property_id", "space_number", "floor_number", "usable_sf", "rentable_sf",
        "space_type", "frontage_ft", "ceiling_height_ft", "number_of_offices",
        "number_of_conference_rooms", "has_kitchenette", "has_private_restroom",
        "space_status", "available_date",
    ],
    "tbl_cre_lease": [
        "cre_property_id", "space_id", "tenant_id", "lease_number", "lease_type",
        "lease_status", "lease_execution_date", "lease_commencement_date",
        "rent_commencement_date", "lease_expiration_date", "lease_term_months",
        "leased_sf", "number_of_options", "option_term_months", "option_notice_months",
        "early_termination_allowed", "termination_notice_months", "termination_penalty_amount",
        "security_deposit_amount", "security_deposit_months", "expansion_rights",
        "right_of_first_refusal", "exclusive_use_clause", "co_tenancy_clause",
        "radius_restriction", "notes",
    ],
    "tbl_cre_property": [
        "project_id", "parcel_id", "property_name", "property_type", "property_subtype",
        "total_building_sf", "rentable_sf", "usable_sf", "common_area_sf", "load_factor",
        "year_built", "year_renovated", "number_of_floors", "number_of_units",
        "parking_spaces", "parking_ratio", "property_status", "stabilization_date",
        "stabilized_occupancy_pct", "acquisition_date", "acquisition_price", "current_assessed_value",
    ],
    # Part 8: Market Intelligence Tables
    "market_competitive_projects": [
        "project_id", "master_plan_name", "comp_name", "builder_name", "comp_address",
        "latitude", "longitude", "city", "zip_code", "total_units", "price_min",
        "price_max", "absorption_rate_monthly", "status", "data_source", "source_url",
        "notes", "source_project_id", "effective_date",
    ],
    "market_assumptions": [
        "project_id", "lu_type_code", "price_per_unit", "unit_of_measure",
        "inflation_type", "dvl_per_year", "dvl_per_quarter", "dvl_per_month",
        "commission_basis", "demand_unit", "uom",
    ],
    # Part 8: Sales/Absorption Tables
    "tbl_absorption_schedule": [
        "project_id", "area_id", "phase_id", "parcel_id", "revenue_stream_name",
        "revenue_category", "lu_family_name", "lu_type_code", "product_code",
        "start_period", "periods_to_complete", "timing_method", "units_per_period",
        "total_units", "base_price_per_unit", "price_escalation_pct", "scenario_name",
        "probability_weight", "notes", "scenario_id",
    ],
    "tbl_parcel_sale_event": [
        "project_id", "parcel_id", "phase_id", "sale_type", "buyer_entity",
        "buyer_contact_id", "contract_date", "total_lots_contracted", "base_price_per_lot",
        "price_escalation_formula", "deposit_amount", "deposit_date", "deposit_terms",
        "deposit_applied_to_purchase", "has_escrow_holdback", "escrow_holdback_amount",
        "escrow_release_terms", "commission_pct", "closing_cost_per_unit", "onsite_cost_pct",
        "has_custom_overrides", "sale_status", "notes",
    ],
    # Part 8: Knowledge/AI Tables
    "ai_extraction_staging": [
        "status", "validated_value", "validated_by", "rejection_reason",
    ],
    "ai_correction_log": [
        "queue_id", "field_path", "ai_value", "user_value", "ai_confidence",
        "correction_type", "page_number", "source_quote", "user_notes",
    ],
    "knowledge_insights": [
        "acknowledged", "acknowledged_at", "user_action", "metadata",
    ],
}

# Primary key column for each table
PK_COLUMNS = {
    "tbl_project": "project_id",
    "tbl_multifamily_unit": "unit_id",
    "tbl_project_assumption": "assumption_id",
    "tbl_lease_assumptions": "assumption_id",
    "tbl_operations_user_inputs": "input_id",
    "tbl_operating_expenses": "opex_id",
    "tbl_parcel": "parcel_id",
    "tbl_phase": "phase_id",
    "tbl_area": "area_id",
    "tbl_milestone": "milestone_id",
    # Financial assumption tables
    "tbl_property_acquisition": "acquisition_id",
    "tbl_revenue_rent": "rent_id",
    "tbl_revenue_other": "other_income_id",
    "tbl_vacancy_assumption": "vacancy_id",
    # Rent roll tables
    "tbl_multifamily_unit_type": "unit_type_id",
    "tbl_multifamily_unit": "unit_id",
    "tbl_lease": "lease_id",
    # Comparables tables
    "tbl_sales_comparables": "comparable_id",
    "tbl_sales_comp_adjustments": "adjustment_id",
    "tbl_rent_comparable": "comparable_id",
    # Capital stack tables
    "tbl_debt_facility": "facility_id",
    "tbl_equity_structure": "equity_structure_id",
    "tbl_waterfall_tier": "tier_id",
    # Budget tables
    "core_unit_cost_category": "category_id",
    "core_fin_fact_budget": "fact_id",
    # System Administration tables
    "lu_family": "family_id",
    "lu_type": "type_id",
    "res_lot_product": "product_id",
    "tbl_measures": "measure_id",
    "tbl_system_picklist": "picklist_id",
    "tbl_global_benchmark_registry": "benchmark_id",
    "core_unit_cost_item": "item_id",
    "report_templates": "id",
    "dms_templates": "template_id",
    # Part 8: CRE tables
    "tbl_cre_tenant": "tenant_id",
    "tbl_cre_space": "space_id",
    "tbl_cre_lease": "lease_id",
    "tbl_cre_property": "cre_property_id",
    # Part 8: Market Intelligence tables
    "market_competitive_projects": "id",
    "market_assumptions": "project_id",  # Composite key with lu_type_code
    # Part 8: Sales/Absorption tables
    "tbl_absorption_schedule": "absorption_id",
    "tbl_parcel_sale_event": "sale_event_id",
    # Part 8: Knowledge/AI tables
    "ai_extraction_staging": "extraction_id",
    "ai_correction_log": "id",
    "knowledge_insights": "insight_id",
}

# High-risk fields that require extra confirmation (significant financial impact)
HIGH_RISK_FIELDS = [
    # Pricing and valuation
    "acquisition_price", "asking_price",
    "price_per_unit", "price_per_sf",
    "price_range_low", "price_range_high",
    # Cap rates (directly affect valuation)
    "cap_rate_current", "cap_rate_proforma",
    # Return assumptions
    "discount_rate_pct", "cost_of_capital_pct",
    # Rent (affects NOI)
    "market_rent", "market_rent_psf_annual",
    "annual_amount",  # Operating expenses
    "saleprice",  # Parcel sale price
    # Acquisition assumptions (high financial impact)
    "purchase_price", "exit_cap_rate",
    # Rent revenue (affects underwriting)
    "current_rent_psf", "market_rent_psf", "annual_rent_growth_pct",
    # Vacancy (affects NOI)
    "vacancy_loss_pct", "collection_loss_pct",
    # Rent roll (affects revenue projections)
    "base_rent", "monthly_rent",
    # Comparables (affects valuation)
    "sale_price", "asking_rent", "effective_rent",
    # Capital stack (affects returns)
    "commitment_amount", "loan_amount", "interest_rate", "interest_rate_pct",
    "ltv_pct", "lp_ownership_pct", "gp_ownership_pct", "preferred_return_pct",
    "hurdle_rate", "lp_split_pct", "gp_split_pct",
    # Budget (affects project costs)
    "amount", "rate", "qty", "contingency_pct",
    # Part 8: CRE (affects rent roll valuation)
    "base_rent_annual", "base_rent_monthly", "base_rent_psf_annual",
    "security_deposit_amount", "termination_penalty_amount",
    # Part 8: Sales/Absorption (affects revenue projections)
    "base_price_per_unit", "base_price_per_lot", "total_lots_contracted",
    # Part 8: Market (affects pricing assumptions)
    "price_min", "price_max", "absorption_rate_monthly",
]

# Field type casting rules
FIELD_TYPES = {
    # Integers
    "target_units": "integer",
    "total_units": "integer",
    "year_built": "integer",
    "stories": "integer",
    "square_feet": "integer",
    "floor_number": "integer",
    "downtime_months": "integer",
    "start_period": "integer",
    "units_total": "integer",
    "phase_no": "integer",
    "as_is_count": "integer",
    "post_reno_count": "integer",
    # Decimals
    "market_rent": "decimal",
    "current_rent": "decimal",
    "asking_price": "decimal",
    "acquisition_price": "decimal",
    "cap_rate_current": "decimal",
    "cap_rate_proforma": "decimal",
    "discount_rate_pct": "decimal",
    "annual_amount": "decimal",
    "bedrooms": "decimal",
    "bathrooms": "decimal",
    "acres_gross": "decimal",
    "lot_size_sf": "decimal",
    "lot_size_acres": "decimal",
    "gross_sf": "decimal",
    # Booleans
    "is_manager": "boolean",
    "is_section8": "boolean",
    "is_active": "boolean",
    "value_add_enabled": "boolean",
    "is_recoverable": "boolean",
}


class MutationService:
    """Service for managing Landscaper mutation proposals."""

    EXPIRATION_HOURS = 1

    @classmethod
    def create_proposal(
        cls,
        project_id: int,
        mutation_type: str,
        table_name: str,
        proposed_value: Any,
        reason: str,
        field_name: Optional[str] = None,
        record_id: Optional[str] = None,
        current_value: Any = None,
        source_message_id: Optional[str] = None,
        source_documents: Optional[List[str]] = None,
        batch_id: Optional[str] = None,
        sequence: int = 0,
    ) -> Dict[str, Any]:
        """
        Create a mutation proposal for user confirmation.

        Args:
            project_id: The project this mutation applies to
            mutation_type: One of 'field_update', 'bulk_update', 'opex_upsert', 'rental_comp_upsert'
            table_name: The database table being modified
            proposed_value: The value to set
            reason: Explanation of why this change is proposed
            field_name: Specific field being changed (for field_update)
            record_id: PK of specific record (for unit updates, etc.)
            current_value: Current value before change (for display)
            source_message_id: Link to chat message that triggered this
            source_documents: Document IDs that informed this proposal
            batch_id: Groups related mutations from a single AI response
            sequence: Order within batch

        Returns:
            Dict with mutation_id, is_high_risk, and proposal details
        """
        # Validate table is allowed
        if table_name not in MUTABLE_FIELDS:
            return {
                "success": False,
                "error": f"Table {table_name} is not mutable by Landscaper",
            }

        # Validate field is allowed (if specified)
        if field_name and field_name not in MUTABLE_FIELDS.get(table_name, []):
            return {
                "success": False,
                "error": f"Field {field_name} is not mutable on {table_name}",
            }

        mutation_id = str(uuid.uuid4())
        expires_at = timezone.now() + timedelta(hours=cls.EXPIRATION_HOURS)

        # Determine if high-risk
        is_high_risk = cls._is_high_risk(field_name)

        # Serialize values for JSONB
        current_json = json.dumps(current_value, cls=DecimalEncoder) if current_value is not None else None
        proposed_json = json.dumps(proposed_value, cls=DecimalEncoder)
        source_docs_json = json.dumps(source_documents or [])

        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO landscape.pending_mutations
                    (mutation_id, project_id, mutation_type, table_name, field_name, record_id,
                     current_value, proposed_value, reason, source_message_id, source_documents,
                     is_high_risk, expires_at, batch_id, sequence_in_batch)
                    VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s::jsonb, %s, %s, %s, %s)
                    RETURNING created_at
                """, [
                    mutation_id, project_id, mutation_type, table_name, field_name, record_id,
                    current_json, proposed_json, reason, source_message_id, source_docs_json,
                    is_high_risk, expires_at, batch_id, sequence
                ])
                row = cursor.fetchone()
                created_at = row[0] if row else timezone.now()

                # Log the proposal to audit
                cls._log_audit(
                    mutation_id=mutation_id,
                    project_id=project_id,
                    mutation_type=mutation_type,
                    table_name=table_name,
                    field_name=field_name,
                    record_id=record_id,
                    old_value=current_value,
                    new_value=proposed_value,
                    action="proposed",
                    reason=reason,
                    source_message_id=source_message_id,
                    source_documents=source_documents,
                )

            return {
                "success": True,
                "mutation_id": mutation_id,
                "is_high_risk": is_high_risk,
                "expires_at": expires_at.isoformat(),
                "created_at": created_at.isoformat(),
                "table": table_name,
                "field": field_name,
                "record_id": record_id,
                "current_value": current_value,
                "proposed_value": proposed_value,
                "reason": reason,
            }

        except Exception as e:
            logger.exception(f"Failed to create mutation proposal: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    @classmethod
    def create_batch_proposals(
        cls,
        project_id: int,
        proposals: List[Dict[str, Any]],
        source_message_id: Optional[str] = None,
        source_documents: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Create multiple mutation proposals as a batch.

        Args:
            proposals: List of dicts with keys: mutation_type, table_name,
                      field_name, proposed_value, current_value, reason, record_id
            source_message_id: Chat message ID that triggered this batch
            source_documents: Document IDs that informed these proposals

        Returns:
            Dict with batch_id and list of created mutations
        """
        batch_id = str(uuid.uuid4())
        results = []

        for i, prop in enumerate(proposals):
            result = cls.create_proposal(
                project_id=project_id,
                mutation_type=prop.get("mutation_type", "field_update"),
                table_name=prop["table_name"],
                field_name=prop.get("field_name"),
                record_id=prop.get("record_id"),
                proposed_value=prop["proposed_value"],
                current_value=prop.get("current_value"),
                reason=prop["reason"],
                source_message_id=source_message_id,
                source_documents=source_documents,
                batch_id=batch_id,
                sequence=i,
            )
            results.append(result)

        return {
            "success": all(r.get("success") for r in results),
            "batch_id": batch_id,
            "mutations": results,
            "count": len(results),
            "high_risk_count": sum(1 for r in results if r.get("is_high_risk")),
        }

    @classmethod
    @transaction.atomic
    def confirm_mutation(
        cls,
        mutation_id: str,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Confirm and execute a pending mutation.

        Args:
            mutation_id: The UUID of the pending mutation
            user_id: Email or ID of user confirming

        Returns:
            Dict with success status and execution result

        Note: This method is wrapped in @transaction.atomic to ensure all
        database operations (mutation execution, status update, audit log)
        are committed together or rolled back together.
        """
        logger.info(f"[MUTATION] Starting confirm for mutation_id={mutation_id}")

        # Get the pending mutation with row lock
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT project_id, mutation_type, table_name, field_name, record_id,
                       current_value, proposed_value, reason, status, expires_at
                FROM landscape.pending_mutations
                WHERE mutation_id = %s
                FOR UPDATE
            """, [mutation_id])
            row = cursor.fetchone()

            if not row:
                logger.warning(f"[MUTATION] Not found: {mutation_id}")
                return {"success": False, "error": "Mutation not found"}

            (project_id, mutation_type, table_name, field_name, record_id,
             current_value, proposed_value, reason, status, expires_at) = row

            logger.info(f"[MUTATION] Found: type={mutation_type}, table={table_name}, status={status}, project={project_id}")

            if status != "pending":
                return {"success": False, "error": f"Mutation already {status}"}

            if expires_at < timezone.now():
                cursor.execute("""
                    UPDATE landscape.pending_mutations
                    SET status = 'expired', resolved_at = NOW()
                    WHERE mutation_id = %s
                """, [mutation_id])
                return {"success": False, "error": "Mutation expired"}

            # Execute the mutation
            try:
                execution_result = cls._execute_mutation(
                    project_id=project_id,
                    mutation_type=mutation_type,
                    table_name=table_name,
                    field_name=field_name,
                    record_id=record_id,
                    proposed_value=proposed_value,
                )

                if execution_result.get("success"):
                    logger.info(f"[MUTATION] Execution succeeded: {execution_result.get('created', 0)} created, {execution_result.get('updated', 0)} updated")

                    # Mark as confirmed
                    cursor.execute("""
                        UPDATE landscape.pending_mutations
                        SET status = 'confirmed', resolved_at = NOW(), resolved_by = %s
                        WHERE mutation_id = %s
                    """, [user_id, mutation_id])
                    logger.info(f"[MUTATION] Status updated to confirmed, rowcount={cursor.rowcount}")

                    # Log success
                    cls._log_audit(
                        mutation_id=mutation_id,
                        project_id=project_id,
                        mutation_type=mutation_type,
                        table_name=table_name,
                        field_name=field_name,
                        record_id=record_id,
                        old_value=current_value,
                        new_value=proposed_value,
                        action="confirmed",
                        reason=reason,
                        confirmed_by=user_id,
                    )
                    logger.info(f"[MUTATION] Audit logged, transaction will commit on function exit")

                    return {
                        "success": True,
                        "mutation_id": mutation_id,
                        "action": "confirmed",
                        "result": execution_result,
                    }
                else:
                    # Execution failed
                    error_msg = execution_result.get("error", "Execution failed")
                    logger.error(f"[MUTATION] Execution failed: {error_msg}")

                    cls._log_audit(
                        mutation_id=mutation_id,
                        project_id=project_id,
                        mutation_type=mutation_type,
                        table_name=table_name,
                        field_name=field_name,
                        record_id=record_id,
                        old_value=current_value,
                        new_value=proposed_value,
                        action="failed",
                        reason=reason,
                        error_message=error_msg,
                    )
                    return {
                        "success": False,
                        "error": error_msg,
                    }

            except Exception as e:
                logger.exception(f"[MUTATION] Exception during execution: {e}")
                cls._log_audit(
                    mutation_id=mutation_id,
                    project_id=project_id,
                    mutation_type=mutation_type,
                    table_name=table_name,
                    field_name=field_name,
                    action="failed",
                    error_message=str(e),
                )
                raise

    @classmethod
    def reject_mutation(
        cls,
        mutation_id: str,
        user_id: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Reject a pending mutation.

        Args:
            mutation_id: The UUID of the pending mutation
            user_id: Email or ID of user rejecting
            reason: Optional reason for rejection

        Returns:
            Dict with success status
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE landscape.pending_mutations
                SET status = 'rejected', resolved_at = NOW(), resolved_by = %s
                WHERE mutation_id = %s AND status = 'pending'
                RETURNING project_id, mutation_type, table_name, field_name, proposed_value, reason
            """, [user_id, mutation_id])
            row = cursor.fetchone()

            if not row:
                return {"success": False, "error": "Mutation not found or not pending"}

            project_id, mutation_type, table_name, field_name, proposed_value, orig_reason = row

            cls._log_audit(
                mutation_id=mutation_id,
                project_id=project_id,
                mutation_type=mutation_type,
                table_name=table_name,
                field_name=field_name,
                new_value=proposed_value,
                action="rejected",
                reason=reason or orig_reason,
                confirmed_by=user_id,
            )

            return {
                "success": True,
                "mutation_id": mutation_id,
                "action": "rejected",
            }

    @classmethod
    def confirm_batch(
        cls,
        batch_id: str,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Confirm all mutations in a batch.

        Args:
            batch_id: The batch UUID
            user_id: Email or ID of user confirming

        Returns:
            Dict with results for each mutation
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT mutation_id FROM landscape.pending_mutations
                WHERE batch_id = %s AND status = 'pending'
                ORDER BY sequence_in_batch
            """, [batch_id])
            mutation_ids = [str(row[0]) for row in cursor.fetchall()]

        if not mutation_ids:
            return {"success": False, "error": "No pending mutations in batch"}

        results = []
        for mid in mutation_ids:
            result = cls.confirm_mutation(mid, user_id)
            results.append(result)

        return {
            "success": all(r.get("success") for r in results),
            "batch_id": batch_id,
            "results": results,
            "confirmed": sum(1 for r in results if r.get("success")),
            "failed": sum(1 for r in results if not r.get("success")),
        }

    @classmethod
    def get_pending_for_project(cls, project_id: int) -> List[Dict[str, Any]]:
        """Get all pending mutations for a project."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT mutation_id, mutation_type, table_name, field_name, record_id,
                       current_value, proposed_value, reason, is_high_risk,
                       created_at, expires_at, batch_id, source_message_id
                FROM landscape.pending_mutations
                WHERE project_id = %s AND status = 'pending' AND expires_at > NOW()
                ORDER BY created_at DESC
            """, [project_id])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            return [dict(zip(columns, row)) for row in rows]

    @classmethod
    def get_pending_for_message(cls, message_id: str) -> List[Dict[str, Any]]:
        """Get pending mutations associated with a specific chat message."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT mutation_id, mutation_type, table_name, field_name, record_id,
                       current_value, proposed_value, reason, is_high_risk,
                       created_at, expires_at, status
                FROM landscape.pending_mutations
                WHERE source_message_id = %s
                ORDER BY sequence_in_batch
            """, [message_id])

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

            return [dict(zip(columns, row)) for row in rows]

    @classmethod
    def _is_high_risk(cls, field_name: Optional[str]) -> bool:
        """Check if a field is considered high-risk."""
        if not field_name:
            return False
        return field_name in HIGH_RISK_FIELDS

    @classmethod
    def _execute_mutation(
        cls,
        project_id: int,
        mutation_type: str,
        table_name: str,
        field_name: Optional[str],
        record_id: Optional[str],
        proposed_value: Any,
    ) -> Dict[str, Any]:
        """
        Execute the actual database mutation.

        This is called only after user confirmation.
        """
        # Parse proposed_value if it's a JSONB string
        if isinstance(proposed_value, str):
            try:
                proposed_value = json.loads(proposed_value)
            except json.JSONDecodeError:
                pass  # Keep as string

        pk_column = PK_COLUMNS.get(table_name)
        if not pk_column:
            return {"success": False, "error": f"Unknown table: {table_name}"}

        try:
            with connection.cursor() as cursor:
                if mutation_type == "field_update" and field_name:
                    # Single field update
                    # Determine the record ID to update
                    if table_name == "tbl_project":
                        target_id = project_id
                    elif record_id:
                        target_id = record_id
                    else:
                        return {"success": False, "error": "No record_id specified for non-project table"}

                    # Cast value to appropriate type
                    typed_value = cls._cast_value(field_name, proposed_value)

                    # Execute update
                    cursor.execute(f"""
                        UPDATE landscape.{table_name}
                        SET {field_name} = %s, updated_at = NOW()
                        WHERE {pk_column} = %s
                    """, [typed_value, target_id])

                    if cursor.rowcount == 0:
                        return {"success": False, "error": f"No record found with {pk_column}={target_id}"}

                    return {
                        "success": True,
                        "rows_affected": cursor.rowcount,
                        "field": field_name,
                        "new_value": typed_value,
                    }

                elif mutation_type == "bulk_update" and isinstance(proposed_value, dict):
                    # Multiple field updates in one record
                    if table_name == "tbl_project":
                        target_id = project_id
                    elif record_id:
                        target_id = record_id
                    else:
                        return {"success": False, "error": "No record_id for bulk update"}

                    # Build SET clause
                    set_parts = []
                    values = []
                    for fld, val in proposed_value.items():
                        if fld in MUTABLE_FIELDS.get(table_name, []):
                            set_parts.append(f"{fld} = %s")
                            values.append(cls._cast_value(fld, val))

                    if not set_parts:
                        return {"success": False, "error": "No valid fields to update"}

                    set_parts.append("updated_at = NOW()")
                    values.append(target_id)

                    cursor.execute(f"""
                        UPDATE landscape.{table_name}
                        SET {', '.join(set_parts)}
                        WHERE {pk_column} = %s
                    """, values)

                    return {
                        "success": True,
                        "rows_affected": cursor.rowcount,
                        "fields_updated": list(proposed_value.keys()),
                    }

                elif mutation_type == "opex_upsert" and isinstance(proposed_value, dict):
                    # Insert or update operating expense
                    expense = proposed_value
                    label = expense.get("expense_category", expense.get("label", ""))

                    # Check if exists
                    cursor.execute("""
                        SELECT opex_id FROM landscape.tbl_operating_expenses
                        WHERE project_id = %s AND expense_category = %s
                        LIMIT 1
                    """, [project_id, label])
                    existing = cursor.fetchone()

                    if existing:
                        # Update
                        cursor.execute("""
                            UPDATE landscape.tbl_operating_expenses
                            SET annual_amount = %s, expense_type = %s,
                                escalation_rate = %s, is_recoverable = %s,
                                updated_at = NOW()
                            WHERE opex_id = %s
                        """, [
                            expense.get("annual_amount", 0),
                            expense.get("expense_type", "OTHER"),
                            expense.get("escalation_rate", 0.03),
                            expense.get("is_recoverable", False),
                            existing[0],
                        ])
                        return {"success": True, "action": "updated", "opex_id": existing[0]}
                    else:
                        # Insert
                        cursor.execute("""
                            INSERT INTO landscape.tbl_operating_expenses
                            (project_id, expense_category, expense_type, annual_amount,
                             escalation_rate, is_recoverable, start_period, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, 1, NOW(), NOW())
                            RETURNING opex_id
                        """, [
                            project_id,
                            label,
                            expense.get("expense_type", "OTHER"),
                            expense.get("annual_amount", 0),
                            expense.get("escalation_rate", 0.03),
                            expense.get("is_recoverable", False),
                        ])
                        new_id = cursor.fetchone()[0]
                        return {"success": True, "action": "created", "opex_id": new_id}

                elif mutation_type == "rent_roll_batch" and isinstance(proposed_value, dict):
                    # Batch upsert for rent roll tables (unit_types, units, leases)
                    records = proposed_value.get("records", [])
                    if not records:
                        return {"success": False, "error": "No records in batch"}

                    created_count = 0
                    updated_count = 0
                    results = []

                    if table_name == "tbl_multifamily_unit_type":
                        for rec in records:
                            cursor.execute("""
                                INSERT INTO landscape.tbl_multifamily_unit_type
                                (project_id, unit_type_code, unit_type_name, bedrooms, bathrooms,
                                 avg_square_feet, market_rent, total_units, created_at, updated_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                ON CONFLICT (project_id, unit_type_code)
                                DO UPDATE SET
                                    unit_type_name = EXCLUDED.unit_type_name,
                                    bedrooms = EXCLUDED.bedrooms,
                                    bathrooms = EXCLUDED.bathrooms,
                                    avg_square_feet = EXCLUDED.avg_square_feet,
                                    market_rent = EXCLUDED.market_rent,
                                    total_units = EXCLUDED.total_units,
                                    updated_at = NOW()
                                RETURNING unit_type_id, (xmax = 0) as is_insert
                            """, [
                                project_id,
                                rec.get("unit_type_code"),
                                rec.get("unit_type_name"),
                                rec.get("bedrooms", 0),
                                rec.get("bathrooms", 1),
                                rec.get("avg_square_feet", 0),
                                rec.get("market_rent", 0),
                                rec.get("total_units", 0),
                            ])
                            row = cursor.fetchone()
                            if row[1]:  # is_insert
                                created_count += 1
                            else:
                                updated_count += 1
                            results.append({"unit_type_id": row[0], "code": rec.get("unit_type_code")})

                    elif table_name == "tbl_multifamily_unit":
                        # Track unit types for aggregation
                        unit_type_stats = {}

                        for rec in records:
                            # Map unit_type from various possible field names
                            unit_type = rec.get("unit_type") or rec.get("unit_type_code") or rec.get("unit_type_name", "")
                            # Build unit_type string from bedrooms/bathrooms if not provided
                            if not unit_type and (rec.get("bedrooms") is not None or rec.get("bathrooms") is not None):
                                br = rec.get("bedrooms", 0)
                                ba = rec.get("bathrooms", 1)
                                unit_type = f"{int(br)}BR/{int(ba)}BA"

                            bedrooms = rec.get("bedrooms", 0)
                            bathrooms = rec.get("bathrooms", 1)
                            square_feet = rec.get("square_feet", 0)
                            current_rent = rec.get("current_rent", 0)
                            market_rent = rec.get("market_rent", 0)
                            occupancy_status = rec.get("occupancy_status") or rec.get("status", "occupied")

                            print(f"=== MUTATION_SERVICE UNIT INSERT ===")
                            print(f"WRITING UNIT: {rec.get('unit_number')}, rent={current_rent}, status={occupancy_status}")
                            print(f"FULL RECORD: {rec}")

                            cursor.execute("""
                                INSERT INTO landscape.tbl_multifamily_unit
                                (project_id, unit_number, unit_type, bedrooms, bathrooms, square_feet,
                                 current_rent, market_rent, occupancy_status, created_at, updated_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                ON CONFLICT (project_id, unit_number)
                                DO UPDATE SET
                                    unit_type = EXCLUDED.unit_type,
                                    bedrooms = EXCLUDED.bedrooms,
                                    bathrooms = EXCLUDED.bathrooms,
                                    square_feet = EXCLUDED.square_feet,
                                    current_rent = EXCLUDED.current_rent,
                                    market_rent = EXCLUDED.market_rent,
                                    occupancy_status = EXCLUDED.occupancy_status,
                                    updated_at = NOW()
                                RETURNING unit_id, (xmax = 0) as is_insert
                            """, [
                                project_id,
                                rec.get("unit_number"),
                                unit_type,
                                bedrooms,
                                bathrooms,
                                square_feet,
                                current_rent,
                                market_rent,
                                occupancy_status,
                            ])
                            row = cursor.fetchone()
                            unit_id = row[0]
                            is_insert = row[1]

                            if is_insert:
                                created_count += 1
                            else:
                                updated_count += 1
                            results.append({"unit_id": unit_id, "unit_number": rec.get("unit_number")})

                            # Also create/update a lease for this unit so it shows in RentRollGrid
                            # The grid reads from leases table, not units directly
                            lease_status = "ACTIVE" if occupancy_status.lower() in ("occupied", "active") else "CANCELLED"

                            # Check if lease exists for this unit
                            cursor.execute("""
                                SELECT lease_id FROM landscape.tbl_multifamily_lease
                                WHERE unit_id = %s
                                ORDER BY created_at DESC LIMIT 1
                            """, [unit_id])
                            existing_lease = cursor.fetchone()

                            # Get lease dates from source data ONLY - never invent dates
                            # If source document doesn't have dates, they should be NULL
                            lease_start = rec.get("lease_start_date")
                            lease_end = rec.get("lease_end_date")
                            lease_term = rec.get("lease_term_months")

                            if existing_lease:
                                # Update existing lease
                                cursor.execute("""
                                    UPDATE landscape.tbl_multifamily_lease
                                    SET base_rent_monthly = %s,
                                        effective_rent_monthly = %s,
                                        lease_status = %s,
                                        lease_start_date = COALESCE(%s, lease_start_date),
                                        lease_end_date = COALESCE(%s, lease_end_date),
                                        lease_term_months = COALESCE(%s, lease_term_months),
                                        updated_at = NOW()
                                    WHERE lease_id = %s
                                """, [current_rent, current_rent, lease_status, lease_start, lease_end, lease_term, existing_lease[0]])
                            else:
                                # Create new lease - use NULL for dates if not in source
                                cursor.execute("""
                                    INSERT INTO landscape.tbl_multifamily_lease
                                    (unit_id, base_rent_monthly, effective_rent_monthly, lease_status,
                                     lease_start_date, lease_end_date, lease_term_months, created_at, updated_at)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                """, [unit_id, current_rent, current_rent, lease_status, lease_start, lease_end, lease_term])

                            # Aggregate unit type stats for floorplan table
                            if unit_type:
                                if unit_type not in unit_type_stats:
                                    unit_type_stats[unit_type] = {
                                        "bedrooms": bedrooms,
                                        "bathrooms": bathrooms,
                                        "square_feet_total": 0,
                                        "market_rent_total": 0,
                                        "count": 0
                                    }
                                unit_type_stats[unit_type]["count"] += 1
                                unit_type_stats[unit_type]["square_feet_total"] += (square_feet or 0)
                                unit_type_stats[unit_type]["market_rent_total"] += (market_rent or 0)

                        # Create/update unit_types (floorplan mix) from aggregated stats
                        floorplan_count = 0
                        for ut_code, stats in unit_type_stats.items():
                            avg_sf = stats["square_feet_total"] / stats["count"] if stats["count"] > 0 else 0
                            avg_market = stats["market_rent_total"] / stats["count"] if stats["count"] > 0 else 0

                            try:
                                cursor.execute("""
                                    INSERT INTO landscape.tbl_multifamily_unit_type
                                    (project_id, unit_type_code, unit_type_name, bedrooms, bathrooms,
                                     avg_square_feet, current_market_rent, total_units, created_at, updated_at)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                    ON CONFLICT (project_id, unit_type_code)
                                    DO UPDATE SET
                                        bedrooms = EXCLUDED.bedrooms,
                                        bathrooms = EXCLUDED.bathrooms,
                                        avg_square_feet = EXCLUDED.avg_square_feet,
                                        current_market_rent = EXCLUDED.current_market_rent,
                                        total_units = EXCLUDED.total_units,
                                        updated_at = NOW()
                                """, [
                                    project_id,
                                    ut_code,
                                    ut_code,  # unit_type_name = code
                                    stats["bedrooms"],
                                    stats["bathrooms"],
                                    avg_sf,
                                    avg_market,
                                    stats["count"],
                                ])
                                floorplan_count += 1
                            except Exception as fp_err:
                                logger.warning(f"Failed to create floorplan {ut_code}: {fp_err}")

                        logger.info(f"Created/updated {floorplan_count} floorplan types from {len(records)} units")

                    else:
                        return {"success": False, "error": f"Unsupported table for rent_roll_batch: {table_name}"}

                    # Include floorplan count in response if we created them
                    response = {
                        "success": True,
                        "created": created_count,
                        "updated": updated_count,
                        "total": len(records),
                        "results": results,
                    }
                    if table_name == "tbl_multifamily_unit":
                        response["leases_created"] = len(records)  # One lease per unit
                        response["floorplan_types_created"] = len(unit_type_stats)
                    return response

                else:
                    return {"success": False, "error": f"Unknown mutation type: {mutation_type}"}

        except Exception as e:
            logger.exception(f"Database mutation failed: {e}")
            return {"success": False, "error": str(e)}

    @classmethod
    def _cast_value(cls, field_name: str, value: Any) -> Any:
        """Cast a value to the appropriate type for the field."""
        field_type = FIELD_TYPES.get(field_name)

        if value is None:
            return None

        try:
            if field_type == "integer":
                return int(float(value)) if value else None
            elif field_type == "decimal":
                return Decimal(str(value)) if value else None
            elif field_type == "boolean":
                if isinstance(value, bool):
                    return value
                if isinstance(value, str):
                    return value.lower() in ("true", "yes", "1", "t")
                return bool(value)
            else:
                return str(value) if value is not None else None
        except (ValueError, TypeError) as e:
            logger.warning(f"Failed to cast {field_name}={value} to {field_type}: {e}")
            return value

    @classmethod
    def _log_audit(
        cls,
        mutation_id: Optional[str],
        project_id: int,
        mutation_type: str,
        table_name: str,
        action: str,
        field_name: Optional[str] = None,
        record_id: Optional[str] = None,
        old_value: Any = None,
        new_value: Any = None,
        reason: Optional[str] = None,
        source_message_id: Optional[str] = None,
        source_documents: Optional[List[str]] = None,
        error_message: Optional[str] = None,
        confirmed_by: Optional[str] = None,
    ) -> None:
        """Log an entry to the mutation audit trail."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO landscape.mutation_audit_log
                    (mutation_id, project_id, mutation_type, table_name, field_name, record_id,
                     old_value, new_value, action, reason, source_message_id, source_documents,
                     error_message, confirmed_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s::jsonb, %s, %s)
                """, [
                    mutation_id, project_id, mutation_type, table_name, field_name, record_id,
                    json.dumps(old_value, cls=DecimalEncoder) if old_value is not None else None,
                    json.dumps(new_value, cls=DecimalEncoder) if new_value is not None else None,
                    action, reason, source_message_id,
                    json.dumps(source_documents) if source_documents else None,
                    error_message, confirmed_by
                ])
        except Exception as e:
            logger.error(f"Failed to log audit entry: {e}")


def get_current_value(
    table_name: str,
    field_name: str,
    project_id: int,
    record_id: Optional[str] = None,
) -> Any:
    """
    Fetch the current value of a field from the database.

    Used to populate current_value in proposals for comparison display.
    """
    pk_column = PK_COLUMNS.get(table_name)
    if not pk_column:
        return None

    # Determine which ID to use
    if table_name == "tbl_project":
        target_id = project_id
    elif record_id:
        target_id = record_id
    else:
        return None

    try:
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT {field_name} FROM landscape.{table_name}
                WHERE {pk_column} = %s
            """, [target_id])
            row = cursor.fetchone()
            return row[0] if row else None
    except Exception as e:
        logger.warning(f"Failed to get current value for {table_name}.{field_name}: {e}")
        return None
