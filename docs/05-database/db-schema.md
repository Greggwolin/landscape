Generated: 2025-09-16T20:37:23.558Z

# Database Schema: landscape

## core_doc
- Columns:
  - doc_id: bigint (not null)
  - project_id: bigint
  - workspace_id: bigint
  - phase_id: bigint
  - parcel_id: bigint
  - doc_name: character varying (not null)
  - doc_type: character varying (not null)
  - discipline: character varying
  - mime_type: character varying (not null)
  - file_size_bytes: bigint (not null)
  - sha256_hash: character varying (not null)
  - storage_uri: text (not null)
  - version_no: integer
  - parent_doc_id: bigint
  - status: character varying
  - profile_json: jsonb
  - doc_date: date
  - contract_value: numeric
  - priority: character varying
  - created_by: bigint
  - updated_by: bigint
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- Foreign Keys:
  - parcel_id → tbl_parcel.parcel_id
  - parent_doc_id → core_doc.doc_id
  - phase_id → tbl_phase.phase_id
  - project_id → tbl_project.project_id
  - workspace_id → dms_workspaces.workspace_id

## core_fin_budget_version
- Columns:
  - budget_id: bigint (not null)
  - name: text (not null)
  - as_of: date (not null)
  - status: text (not null)
  - created_at: timestamp with time zone (not null)

## core_fin_category
- Columns:
  - category_id: bigint (not null)
  - parent_id: bigint
  - code: text (not null)
  - kind: text (not null)
  - class: text
  - event: text
  - scope: text
  - detail: text
  - is_active: boolean (not null)
  - created_at: timestamp with time zone (not null)
- Foreign Keys:
  - parent_id → core_fin_category.category_id

## core_fin_category_uom
- Columns:
  - category_id: bigint (not null)
  - uom_code: text (not null)
- Foreign Keys:
  - category_id → core_fin_category.category_id
  - uom_code → core_fin_uom.uom_code

## core_fin_crosswalk_ad
- Columns:
  - ad_code: text (not null)
  - ad_group: text
  - category_id: bigint (not null)
- Foreign Keys:
  - category_id → core_fin_category.category_id

## core_fin_crosswalk_ae
- Columns:
  - ae_coa: text (not null)
  - ae_group: text
  - category_id: bigint (not null)
- Foreign Keys:
  - category_id → core_fin_category.category_id

## core_fin_curve
- Columns:
  - curve_id: bigint (not null)
  - name: text (not null)
  - points_json: jsonb (not null)
  - created_at: timestamp with time zone (not null)

## core_fin_fact_actual
- Columns:
  - fact_id: bigint (not null)
  - pe_level: pe_level { project, area, phase, parcel, lot } (not null)
  - pe_id: text (not null)
  - category_id: bigint (not null)
  - uom_code: text (not null)
  - qty: numeric
  - rate: numeric
  - amount: numeric
  - txn_date: date (not null)
  - source_doc: text
  - created_at: timestamp with time zone (not null)
- Foreign Keys:
  - category_id → core_fin_category.category_id
  - uom_code → core_fin_uom.uom_code

## core_fin_fact_budget
- Columns:
  - fact_id: bigint (not null)
  - budget_id: bigint (not null)
  - pe_level: pe_level { project, area, phase, parcel, lot } (not null)
  - pe_id: text (not null)
  - category_id: bigint (not null)
  - funding_id: bigint
  - uom_code: text (not null)
  - qty: numeric
  - rate: numeric
  - amount: numeric
  - start_date: date
  - end_date: date
  - curve_id: bigint
  - notes: text
  - created_at: timestamp with time zone (not null)
- Foreign Keys:
  - budget_id → core_fin_budget_version.budget_id
  - category_id → core_fin_category.category_id
  - curve_id → core_fin_curve.curve_id
  - funding_id → core_fin_funding_source.funding_id
  - uom_code → core_fin_uom.uom_code

## core_fin_funding_source
- Columns:
  - funding_id: bigint (not null)
  - type: text (not null)
  - subclass: text
  - rank: integer
  - lender_party: text
  - is_active: boolean (not null)
  - created_at: timestamp with time zone (not null)

## core_fin_pe_applicability
- Columns:
  - category_id: bigint (not null)
  - pe_level: pe_level { project, area, phase, parcel, lot } (not null)
- Foreign Keys:
  - category_id → core_fin_category.category_id

## core_fin_uom
- Columns:
  - uom_code: text (not null)
  - name: text (not null)
  - uom_type: text (not null)
  - is_active: boolean (not null)
  - created_at: timestamp with time zone (not null)

## core_lookup_item
- Columns:
  - item_id: bigint (not null)
  - list_key: text (not null)
  - sort_order: integer (not null)
  - code: text (not null)
  - label: text (not null)
  - is_active: boolean (not null)
  - created_at: timestamp with time zone (not null)
- Foreign Keys:
  - list_key → core_lookup_list.list_key

## core_lookup_list
- Columns:
  - list_key: text (not null)
  - name: text (not null)
  - description: text
  - is_active: boolean (not null)
  - created_at: timestamp with time zone (not null)

## core_lookup_vw
- Columns:
  - list_key: text
  - list_name: text
  - item_id: bigint
  - sort_order: integer
  - code: text
  - label: text
  - is_active: boolean

## dms_attributes
- Columns:
  - attr_id: bigint (not null)
  - attr_key: character varying (not null)
  - attr_name: character varying (not null)
  - attr_type: character varying (not null)
  - attr_description: text
  - is_required: boolean
  - is_searchable: boolean
  - validation_rules: jsonb
  - enum_values: jsonb
  - lookup_table: character varying
  - display_order: integer
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone

## dms_extract_queue
- Columns:
  - queue_id: bigint (not null)
  - doc_id: bigint
  - extract_type: character varying (not null)
  - priority: integer
  - status: character varying
  - attempts: integer
  - max_attempts: integer
  - error_message: text
  - extracted_data: jsonb
  - created_at: timestamp with time zone
  - processed_at: timestamp with time zone
- Foreign Keys:
  - doc_id → core_doc.doc_id

## dms_profile_audit
- Columns:
  - audit_id: bigint (not null)
  - doc_id: bigint
  - changed_by: bigint
  - change_type: character varying (not null)
  - old_profile_json: jsonb
  - new_profile_json: jsonb
  - changed_fields: ARRAY
  - change_reason: text
  - created_at: timestamp with time zone
- Foreign Keys:
  - doc_id → core_doc.doc_id

## dms_template_attributes
- Columns:
  - template_id: bigint (not null)
  - attr_id: bigint (not null)
  - is_required: boolean
  - default_value: jsonb
  - display_order: integer
- Foreign Keys:
  - attr_id → dms_attributes.attr_id
  - template_id → dms_templates.template_id

## dms_templates
- Columns:
  - template_id: bigint (not null)
  - template_name: character varying (not null)
  - workspace_id: bigint
  - project_id: bigint
  - doc_type: character varying
  - is_default: boolean
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- Foreign Keys:
  - project_id → tbl_project.project_id
  - workspace_id → dms_workspaces.workspace_id

## dms_workspaces
- Columns:
  - workspace_id: bigint (not null)
  - workspace_code: character varying (not null)
  - workspace_name: character varying (not null)
  - description: text
  - is_default: boolean
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone

## geography_columns
- Columns:
  - f_table_catalog: name
  - f_table_schema: name
  - f_table_name: name
  - f_geography_column: name
  - coord_dimension: integer
  - srid: integer
  - type: text

## geometry_columns
- Columns:
  - f_table_catalog: character varying
  - f_table_schema: name
  - f_table_name: name
  - f_geometry_column: name
  - coord_dimension: integer
  - srid: integer
  - type: character varying

## glossary_zoning
- Columns:
  - glossary_id: uuid (not null)
  - jurisdiction_city: text (not null)
  - jurisdiction_county: text
  - jurisdiction_state: character (not null)
  - jurisdiction_display: text (not null)
  - district_code: text
  - district_name: text
  - family_name: text (not null)
  - local_code_raw: text (not null)
  - local_code_canonical: text
  - code_token_kind: code_token_kind { published, placeholder, numeric, mixed } (not null)
  - code_token_confidence: numeric (not null)
  - mapped_use: text (not null)
  - allowance: character (not null)
  - purpose_text: text
  - intent_text: text
  - conditions_text: text
  - development_standards: jsonb
  - use_standard_refs: jsonb
  - definitions_refs: jsonb
  - narrative_section_ref: text
  - narrative_src_url: text
  - source_doc_url: text
  - effective_date: date
  - amending_ord_list: jsonb
  - is_active: boolean (not null)
  - created_at: timestamp with time zone (not null)
  - updated_at: timestamp with time zone (not null)

## lu_com_spec
- Columns:
  - com_spec_id: bigint (not null)
  - subtype_id: bigint (not null)
  - far_min: numeric
  - far_max: numeric
  - cov_max_pct: numeric
  - pk_per_ksf: numeric
  - hgt_max_ft: numeric
  - sb_front_ft: numeric
  - sb_side_ft: numeric
  - sb_corner_ft: numeric
  - sb_rear_ft: numeric
  - os_min_pct: numeric
  - notes: text
  - eff_date: date
  - doc_id: bigint
- Foreign Keys:
  - doc_id → planning_doc.doc_id
  - subtype_id → lu_subtype.subtype_id

## lu_family
- Columns:
  - family_id: bigint (not null)
  - code: text (not null)
  - name: text (not null)
  - active: boolean (not null)
  - notes: text

## lu_res_spec
- Columns:
  - res_spec_id: bigint (not null)
  - subtype_id: bigint (not null)
  - dua_min: numeric
  - dua_max: numeric
  - lot_w_min_ft: numeric
  - lot_d_min_ft: numeric
  - lot_area_min_sf: numeric
  - sb_front_ft: numeric
  - sb_side_ft: numeric
  - sb_corner_ft: numeric
  - sb_rear_ft: numeric
  - hgt_max_ft: numeric
  - cov_max_pct: numeric
  - os_min_pct: numeric
  - pk_per_unit: numeric
  - notes: text
  - eff_date: date
  - doc_id: bigint
- Foreign Keys:
  - doc_id → planning_doc.doc_id
  - subtype_id → lu_subtype.subtype_id

## lu_subtype
- Columns:
  - subtype_id: bigint (not null)
  - family_id: bigint (not null)
  - code: text (not null)
  - name: text (not null)
  - ord: integer
  - active: boolean (not null)
  - notes: text
- Foreign Keys:
  - family_id → lu_family.family_id

## market_assumptions
- Columns:
  - project_id: integer (not null)
  - commission_basis: text
  - demand_unit: text
  - uom: text
  - updated_at: timestamp with time zone (not null)

## planning_doc
- Columns:
  - doc_id: bigint (not null)
  - project_id: bigint
  - jurisdiction_id: bigint
  - doc_type: text (not null)
  - title: text (not null)
  - doc_url: text
  - eff_date: date
  - section_ref: text
  - notes: text

## res_lot_product
- Columns:
  - product_id: bigint (not null)
  - code: text (not null)
  - lot_w_ft: integer (not null)
  - lot_d_ft: integer (not null)
  - lot_area_sf: integer

## spatial_ref_sys
- Columns:
  - srid: integer (not null)
  - auth_name: character varying
  - auth_srid: integer
  - srtext: character varying
  - proj4text: character varying

## subtype_lot_product
- Columns:
  - subtype_id: bigint (not null)
  - product_id: bigint (not null)
- Foreign Keys:
  - product_id → res_lot_product.product_id
  - subtype_id → lu_subtype.subtype_id

## tbl_acquisition
- Columns:
  - acquisition_id: integer (not null)
  - project_id: integer (not null)
  - contact_id: integer
  - event_date: date
  - event_type: character varying
  - description: text
  - amount: numeric
  - is_applied_to_purchase: boolean
  - units_conveyed: numeric
  - measure_id: integer
  - notes: text
  - created_at: timestamp without time zone
  - updated_at: timestamp without time zone
- Foreign Keys:
  - contact_id → tbl_contacts.contact_id
  - measure_id → tbl_measures.measure_id
  - project_id → tbl_project.project_id

## tbl_approval
- Columns:
  - approval_id: integer (not null)
  - project_id: integer
  - approval_type: character varying
  - approval_date: date
  - notes: text
- Foreign Keys:
  - project_id → tbl_project.project_id

## tbl_area
- Columns:
  - area_id: integer (not null)
  - project_id: integer (not null)
  - area_alias: character varying (not null)
  - area_no: integer
- Foreign Keys:
  - project_id → tbl_project.project_id

## tbl_assumptionrule
- Columns:
  - rule_id: integer (not null)
  - rule_category: character varying
  - rule_key: character varying
  - rule_value: text

## tbl_budget
- Columns:
  - budget_id: integer (not null)
  - devphase_id: integer
  - budget_category: text (not null)
  - budget_subcategory: text
  - amount: numeric
  - source_table: character varying
  - source_id: integer
  - measure_id: integer
  - cost_per_unit: numeric
  - quantity: numeric
- Foreign Keys:
  - devphase_id → tbl_phase.phase_id
  - measure_id → tbl_measures.measure_id

## tbl_budget_items
- Columns:
  - budget_item_id: integer (not null)
  - project_id: integer (not null)
  - structure_id: integer (not null)
  - amount: numeric
  - quantity: numeric
  - cost_per_unit: numeric
  - notes: text
  - created_at: timestamp without time zone
  - updated_at: timestamp without time zone
- Foreign Keys:
  - project_id → tbl_project.project_id
  - structure_id → tbl_budget_structure.structure_id

## tbl_budget_structure
- Columns:
  - structure_id: integer (not null)
  - scope: character varying (not null)
  - category: character varying (not null)
  - detail: character varying (not null)
  - cost_method: character varying
  - measure_id: integer
  - is_system: boolean
  - created_by: integer
  - sort_order: integer
  - created_at: timestamp without time zone
  - updated_at: timestamp without time zone
  - start_period: integer
  - periods_to_complete: integer
- Foreign Keys:
  - measure_id → tbl_measures.measure_id

## tbl_capitalization
- Columns:
  - capitalization_id: integer (not null)
  - project_id: integer
  - capital_source: text (not null)
  - amount: numeric
  - notes: text
- Foreign Keys:
  - project_id → tbl_project.project_id

## tbl_contacts
- Columns:
  - contact_id: integer (not null)
  - company_name: character varying
  - contact_person: character varying
  - email: character varying
  - phone: character varying
  - address_line1: character varying
  - address_line2: character varying
  - city: character varying
  - state: character varying
  - zip: character varying
  - is_parent: boolean
  - parent_company_name: character varying
  - parent_contact_person: character varying
  - parent_email: character varying
  - parent_phone: character varying
  - parent_address_line1: character varying
  - parent_address_line2: character varying
  - parent_city: character varying
  - parent_state: character varying
  - parent_zip: character varying
  - created_at: timestamp without time zone
  - updated_at: timestamp without time zone

## tbl_landuse
- Columns:
  - landuse_id: integer (not null)
  - landuse_code: character varying (not null)
  - landuse_type: character varying
  - subtype_id: integer
  - name: character varying
  - description: text
  - active: boolean
  - created_at: timestamp without time zone
  - updated_at: timestamp without time zone
- Foreign Keys:
  - subtype_id → lu_subtype.subtype_id

## tbl_landuse_program
- Columns:
  - landuse_code: character varying (not null)
  - rsf_to_gfa_eff: numeric
  - employee_density: numeric
  - floor_plate_efficiency: numeric
  - clear_height_ft: numeric
  - loading_dock_ratio: numeric
  - truck_court_depth_ft: numeric
  - trailer_parking_ratio: numeric
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone

## tbl_lot_type
- Columns:
  - producttype_id: integer (not null)
  - producttype_name: character varying (not null)
  - typical_lot_width: double precision
  - typical_lot_depth: double precision

## tbl_measures
- Columns:
  - measure_id: integer (not null)
  - measure_code: character varying (not null)
  - measure_name: character varying (not null)
  - measure_category: character varying (not null)
  - is_system: boolean
  - created_by: integer
  - property_types: jsonb
  - created_at: timestamp without time zone
  - updated_at: timestamp without time zone

## tbl_parcel
- Columns:
  - parcel_id: integer (not null)
  - area_id: integer (not null)
  - phase_id: integer (not null)
  - landuse_code: character varying
  - landuse_type: character varying
  - acres_gross: double precision
  - lot_width: double precision
  - lot_depth: double precision
  - lot_product: character varying
  - lot_area: double precision
  - units_total: integer
  - lots_frontfeet: double precision
  - planning_loss: double precision
  - plan_efficiency: double precision
  - saledate: date
  - saleprice: double precision
  - lot_type_id: integer
  - project_id: integer
- Foreign Keys:
  - area_id → tbl_area.area_id
  - landuse_code → tbl_landuse.landuse_code
  - lot_type_id → tbl_lot_type.producttype_id
  - phase_id → tbl_phase.phase_id

## tbl_phase
- Columns:
  - phase_id: integer (not null)
  - area_id: integer (not null)
  - phase_name: character varying (not null)
  - phase_no: integer
  - project_id: integer
  - label: text
  - description: text
- Foreign Keys:
  - area_id → tbl_area.area_id

## tbl_project
- Columns:
  - project_id: integer (not null)
  - project_name: character varying (not null)
  - acres_gross: double precision
  - location_lat: double precision
  - location_lon: double precision
  - start_date: date
  - jurisdiction_city: character varying
  - jurisdiction_county: character varying
  - jurisdiction_state: character varying

## tbl_zoning_control
- Columns:
  - zoning_control_id: bigint (not null)
  - jurisdiction_id: bigint
  - zoning_code: character varying (not null)
  - landuse_code: character varying (not null)
  - site_coverage_pct: numeric
  - site_far: numeric
  - max_stories: integer
  - max_height_ft: numeric
  - parking_ratio_per1000sf: numeric
  - parking_stall_sf: numeric
  - site_common_area_pct: numeric
  - parking_sharing_flag: boolean
  - parking_structured_flag: boolean
  - setback_notes: text
  - scenario_id: character varying
  - valid_from: date
  - valid_to: date
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone

## tmp_search_results
- Columns:
  - table_name: text
  - column_name: text
  - value: text

## vw_zoning_glossary_export
- Columns:
  - glossary_id: uuid
  - jurisdiction_display: text
  - jurisdiction_city: text
  - jurisdiction_county: text
  - jurisdiction_state: character
  - family_name: text
  - district_code: text
  - district_name: text
  - local_code_raw: text
  - local_code_canonical: text
  - code_token_kind: code_token_kind { published, placeholder, numeric, mixed }
  - code_token_confidence: numeric
  - mapped_use: text
  - allowance: character
  - purpose_text: text
  - intent_text: text
  - conditions_text: text
  - development_standards: jsonb
  - use_standard_refs: jsonb
  - definitions_refs: jsonb
  - narrative_section_ref: text
  - narrative_src_url: text
  - source_doc_url: text
  - effective_date: date
  - is_active: boolean
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone

# Database Schema: land_v2

## glossary_zoning
- Columns:
  - glossary_id: uuid (not null)
  - jurisdiction_city: text (not null)
  - jurisdiction_county: text
  - jurisdiction_state: character (not null)
  - jurisdiction_display: text (not null)
  - district_code: text
  - district_name: text
  - family_name: text (not null)
  - local_code_raw: text (not null)
  - local_code_canonical: text
  - code_token_kind: code_token_kind { published, placeholder, numeric, mixed } (not null)
  - code_token_confidence: numeric (not null)
  - mapped_use: text (not null)
  - allowance: character (not null)
  - purpose_text: text
  - intent_text: text
  - conditions_text: text
  - development_standards: jsonb
  - use_standard_refs: jsonb
  - definitions_refs: jsonb
  - narrative_section_ref: text
  - narrative_src_url: text
  - source_doc_url: text
  - effective_date: date
  - amending_ord_list: jsonb
  - is_active: boolean (not null)
  - created_at: timestamp with time zone (not null)
  - updated_at: timestamp with time zone (not null)

## vw_zoning_glossary_export
- Columns:
  - glossary_id: uuid
  - jurisdiction_display: text
  - jurisdiction_city: text
  - jurisdiction_county: text
  - jurisdiction_state: character
  - family_name: text
  - district_code: text
  - district_name: text
  - local_code_raw: text
  - local_code_canonical: text
  - code_token_kind: code_token_kind { published, placeholder, numeric, mixed }
  - code_token_confidence: numeric
  - mapped_use: text
  - allowance: character
  - purpose_text: text
  - intent_text: text
  - conditions_text: text
  - development_standards: jsonb
  - use_standard_refs: jsonb
  - definitions_refs: jsonb
  - narrative_section_ref: text
  - narrative_src_url: text
  - source_doc_url: text
  - effective_date: date
  - is_active: boolean
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone

