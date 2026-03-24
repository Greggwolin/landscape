# Landscape Rich Schema — Abridged Summary
Generated: 2026-03-24T00:06:46.086982Z
Database: ep-tiny-lab-af0tg3ps.c-2.us-west-2.aws.neon.tech
Schema: landscape

## Object Counts
- Tables: 366
- Views: 42
- Indexes: 1237
- Constraints: 1063
- Foreign Keys: 399
- Triggers: 60
- Routines: 996

## Tables (366)

### _migrations (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| migration_id | integer | NO | nextval('_migrations_migration_id_seq'::regclass) |
| migration_file | character varying | NO |  |
| applied_at | timestamp with time zone | YES | now() |
| checksum | character varying | YES |  |

### ai_correction_log (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('ai_correction_log_id_seq'::regclass) |
| queue_id | bigint | NO |  |
| field_path | character varying | NO |  |
| ai_value | text | YES |  |
| user_value | text | YES |  |
| ai_confidence | numeric | YES |  |
| correction_type | character varying | YES | 'value_wrong'::character varying |
| page_number | integer | YES |  |
| source_quote | text | YES |  |
| user_notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |

### ai_debug_log (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('ai_debug_log_id_seq'::regclass) |
| log_type | character varying | YES |  |
| payload | jsonb | YES |  |
| created_at | timestamp without time zone | YES | now() |

### ai_document_subtypes (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| subtype_id | integer | NO | nextval('ai_document_subtypes_subtype_id_seq'::reg |
| subtype_code | character varying | NO |  |
| subtype_name | character varying | NO |  |
| property_type | character varying | NO | 'multifamily'::character varying |
| description | text | YES |  |
| detection_patterns | jsonb | NO | '[]'::jsonb |
| priority_fields | jsonb | NO | '[]'::jsonb |
| skip_fields | jsonb | NO | '[]'::jsonb |
| special_instructions | text | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### ai_extraction_staging (27 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| extraction_id | integer | NO | nextval('ai_extraction_staging_extraction_id_seq': |
| project_id | bigint | NO |  |
| doc_id | bigint | YES |  |
| target_table | character varying | NO |  |
| target_field | character varying | YES |  |
| extracted_value | jsonb | NO |  |
| extraction_type | character varying | NO |  |
| source_text | text | YES |  |
| confidence_score | numeric | YES |  |
| status | character varying | YES | 'pending'::character varying |
| validated_value | jsonb | YES |  |
| validated_by | text | YES |  |
| validated_at | timestamp without time zone | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| created_by | text | YES | 'landscaper'::text |
| field_key | character varying | YES |  |
| property_type | character varying | YES |  |
| db_write_type | character varying | YES |  |
| selector_json | jsonb | YES |  |
| scope | character varying | YES |  |
| scope_id | bigint | YES |  |
| source_page | integer | YES |  |
| source_snippet | text | YES |  |
| conflict_with_extraction_id | bigint | YES |  |
| rejection_reason | text | YES |  |
| scope_label | character varying | YES |  |
| array_index | integer | YES |  |

### ai_extraction_warnings (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('ai_extraction_warnings_id_seq'::regclass) |
| queue_id | bigint | NO |  |
| field_path | character varying | NO |  |
| warning_type | character varying | NO |  |
| severity | character varying | YES | 'warning'::character varying |
| message | text | NO |  |
| suggested_value | text | YES |  |
| user_action | character varying | YES |  |
| created_at | timestamp without time zone | YES | now() |

### ai_ingestion_history (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ingestion_id | integer | NO | nextval('ai_ingestion_history_ingestion_id_seq'::r |
| project_id | integer | NO |  |
| package_name | character varying | NO |  |
| documents | jsonb | YES |  |
| ai_analysis | jsonb | YES |  |
| created_at | timestamp with time zone | YES | now() |
| created_by | character varying | YES |  |

### ai_review_history (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| review_id | integer | NO | nextval('ai_review_history_review_id_seq'::regclas |
| project_id | integer | NO |  |
| action_type | character varying | NO |  |
| field_updates | jsonb | YES |  |
| user_feedback | text | YES |  |
| ai_confidence | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |
| created_by | character varying | YES |  |

### auth_group (2 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO |  |
| name | character varying | NO |  |

### auth_group_permissions (3 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| group_id | integer | NO |  |
| permission_id | integer | NO |  |

### auth_permission (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO |  |
| name | character varying | NO |  |
| content_type_id | integer | NO |  |
| codename | character varying | NO |  |

### auth_user (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO |  |
| password | character varying | NO |  |
| last_login | timestamp with time zone | YES |  |
| is_superuser | boolean | NO |  |
| username | character varying | NO |  |
| first_name | character varying | NO |  |
| last_name | character varying | NO |  |
| email | character varying | NO |  |
| is_staff | boolean | NO |  |
| is_active | boolean | NO |  |
| date_joined | timestamp with time zone | NO |  |
| phone | character varying | YES |  |
| company | character varying | YES |  |
| role | character varying | YES | 'user'::character varying |
| is_verified | boolean | YES | false |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| last_login_ip | inet | YES |  |
| demo_projects_provisioned | boolean | NO |  |
| plain_password | character varying | YES |  |

### auth_user_groups (3 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| user_id | integer | NO |  |
| group_id | integer | NO |  |

### auth_user_user_permissions (3 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| user_id | integer | NO |  |
| permission_id | integer | NO |  |

### bmk_absorption_velocity (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| absorption_velocity_id | bigint | NO | nextval('bmk_absorption_velocity_absorption_veloci |
| benchmark_id | bigint | YES |  |
| velocity_annual | integer | NO |  |
| market_geography | character varying | YES |  |
| project_scale | character varying | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### bmk_builder_communities (27 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('bmk_builder_communities_id_seq'::regclass |
| source | character varying | NO |  |
| source_id | character varying | NO |  |
| builder_name | character varying | NO |  |
| community_name | character varying | NO |  |
| market_label | character varying | YES |  |
| city | character varying | YES |  |
| state | character | YES |  |
| zip_code | character varying | YES |  |
| lat | numeric | YES |  |
| lng | numeric | YES |  |
| price_min | integer | YES |  |
| price_max | integer | YES |  |
| sqft_min | integer | YES |  |
| sqft_max | integer | YES |  |
| beds_min | smallint | YES |  |
| beds_max | smallint | YES |  |
| baths_min | numeric | YES |  |
| baths_max | numeric | YES |  |
| hoa_monthly | integer | YES |  |
| product_types | character varying | YES |  |
| plan_count | smallint | YES |  |
| inventory_count | smallint | YES |  |
| source_url | text | YES |  |
| first_seen_at | timestamp with time zone | NO | now() |
| last_seen_at | timestamp with time zone | NO | now() |
| ingested_at | timestamp with time zone | NO | now() |

### bmk_builder_inventory (23 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('bmk_builder_inventory_id_seq'::regclass) |
| source | character varying | NO |  |
| source_id | character varying | NO |  |
| community_source_id | character varying | YES |  |
| plan_source_id | character varying | YES |  |
| address_line1 | character varying | YES |  |
| city | character varying | YES |  |
| state | character | YES |  |
| zip_code | character varying | YES |  |
| lat | numeric | YES |  |
| lng | numeric | YES |  |
| status | character varying | YES |  |
| price_current | integer | YES |  |
| price_original | integer | YES |  |
| sqft_actual | integer | YES |  |
| beds_actual | smallint | YES |  |
| baths_actual | numeric | YES |  |
| lot_sqft | integer | YES |  |
| move_in_date | date | YES |  |
| source_url | text | YES |  |
| first_seen_at | timestamp with time zone | NO | now() |
| last_seen_at | timestamp with time zone | NO | now() |
| ingested_at | timestamp with time zone | NO | now() |

### bmk_builder_plans (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('bmk_builder_plans_id_seq'::regclass) |
| source | character varying | NO |  |
| source_id | character varying | NO |  |
| community_source_id | character varying | NO |  |
| plan_name | character varying | NO |  |
| series_name | character varying | YES |  |
| product_type | character varying | YES |  |
| base_price | integer | YES |  |
| sqft_min | integer | YES |  |
| sqft_max | integer | YES |  |
| beds_min | smallint | YES |  |
| beds_max | smallint | YES |  |
| baths_min | numeric | YES |  |
| baths_max | numeric | YES |  |
| garage_spaces | smallint | YES |  |
| stories | smallint | YES |  |
| source_url | text | YES |  |
| first_seen_at | timestamp with time zone | NO | now() |
| last_seen_at | timestamp with time zone | NO | now() |
| ingested_at | timestamp with time zone | NO | now() |

### bmk_resale_closings (27 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('bmk_resale_closings_id_seq'::regclass) |
| source | character varying | NO |  |
| source_id | character varying | NO |  |
| sale_price | integer | NO |  |
| sale_date | date | NO |  |
| address_line1 | character varying | YES |  |
| city | character varying | YES |  |
| state | character | YES |  |
| zip_code | character varying | YES |  |
| lat | numeric | YES |  |
| lng | numeric | YES |  |
| property_type | character varying | YES |  |
| list_price | integer | YES |  |
| list_date | date | YES |  |
| days_on_market | smallint | YES |  |
| sqft | integer | YES |  |
| lot_sqft | integer | YES |  |
| price_per_sqft | integer | YES |  |
| year_built | smallint | YES |  |
| beds | smallint | YES |  |
| baths | numeric | YES |  |
| builder_name | character varying | YES |  |
| subdivision_name | character varying | YES |  |
| source_url | text | YES |  |
| first_seen_at | timestamp with time zone | NO | now() |
| last_seen_at | timestamp with time zone | NO | now() |
| ingested_at | timestamp with time zone | NO | now() |

### core_category_lifecycle_stages (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| category_id | integer | NO |  |
| activity | character varying | NO |  |
| sort_order | integer | YES | 0 |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### core_category_tag_library (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| tag_id | integer | NO | nextval('core_category_tag_library_tag_id_seq'::re |
| tag_name | character varying | NO |  |
| tag_context | character varying | NO |  |
| is_system_default | boolean | YES | true |
| description | text | YES |  |
| display_order | integer | YES | 999 |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### core_doc (36 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| doc_id | bigint | NO | nextval('core_doc_doc_id_seq'::regclass) |
| project_id | bigint | YES |  |
| workspace_id | bigint | YES |  |
| phase_id | bigint | YES |  |
| parcel_id | bigint | YES |  |
| doc_name | character varying | NO |  |
| doc_type | character varying | NO | 'general'::character varying |
| discipline | character varying | YES | NULL::character varying |
| mime_type | character varying | NO |  |
| file_size_bytes | bigint | NO |  |
| sha256_hash | character varying | NO |  |
| storage_uri | text | NO |  |
| version_no | integer | YES | 1 |
| parent_doc_id | bigint | YES |  |
| status | character varying | YES | 'draft'::character varying |
| profile_json | jsonb | YES | '{}'::jsonb |
| doc_date | date | YES |  |
| contract_value | numeric | YES | NULL::numeric |
| priority | character varying | YES | NULL::character varying |
| created_by | bigint | YES |  |
| updated_by | bigint | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| processing_status | character varying | YES | 'pending'::character varying |
| processing_started_at | timestamp without time zone | YES |  |
| processing_completed_at | timestamp without time zone | YES |  |
| processing_error | text | YES |  |
| chunks_count | integer | YES | 0 |
| embeddings_count | integer | YES | 0 |
| deleted_at | timestamp with time zone | YES |  |
| deleted_by | character varying | YES |  |
| cabinet_id | bigint | YES |  |
| media_scan_status | character varying | YES | 'unscanned'::character varying |
| media_scan_json | jsonb | YES |  |
| table_count | integer | YES | 0 |
| property_type | character varying | YES | NULL::character varying |

### core_doc_attr_enum (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| attr_id | bigint | NO |  |
| option_code | text | NO |  |
| label | text | NO |  |
| sort_order | integer | NO | 0 |
| is_active | boolean | NO | true |

### core_doc_attr_lookup (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| attr_id | bigint | NO |  |
| sql_source | text | NO |  |
| cache_ttl | integer | NO | 600 |
| display_fmt | text | YES |  |

### core_doc_folder (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| folder_id | integer | NO | nextval('core_doc_folder_folder_id_seq'::regclass) |
| parent_id | integer | YES |  |
| name | character varying | NO |  |
| path | text | NO |  |
| sort_order | integer | YES | 0 |
| default_profile | jsonb | YES | '{}'::jsonb |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### core_doc_folder_link (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| doc_id | integer | NO |  |
| folder_id | integer | NO |  |
| linked_at | timestamp without time zone | YES | now() |
| inherited | boolean | YES | true |

### core_doc_media (34 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| media_id | bigint | NO | nextval('core_doc_media_media_id_seq'::regclass) |
| doc_id | bigint | NO |  |
| project_id | bigint | YES |  |
| workspace_id | bigint | YES |  |
| classification_id | integer | YES |  |
| ai_classification | character varying | YES |  |
| ai_confidence | numeric | YES |  |
| user_override | boolean | NO | false |
| source_page | integer | YES |  |
| source_region | jsonb | YES |  |
| extraction_method | character varying | NO | 'embedded'::character varying |
| asset_name | character varying | YES |  |
| storage_uri | text | NO |  |
| thumbnail_uri | text | YES |  |
| mime_type | character varying | NO | 'image/png'::character varying |
| file_size_bytes | bigint | YES |  |
| width_px | integer | YES |  |
| height_px | integer | YES |  |
| dpi | integer | YES |  |
| caption | text | YES |  |
| alt_text | text | YES |  |
| tags | ARRAY | YES |  |
| ai_description | text | YES |  |
| status | character varying | NO | 'extracted'::character varying |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| created_by | bigint | YES |  |
| deleted_at | timestamp with time zone | YES |  |
| suggested_action | character varying | YES |  |
| user_action | character varying | YES |  |
| discard_reason_code | character varying | YES |  |
| discard_reason_text | text | YES |  |
| discarded_at | timestamp with time zone | YES |  |
| image_hash | character varying | YES |  |

### core_doc_media_link (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| link_id | bigint | NO | nextval('core_doc_media_link_link_id_seq'::regclas |
| media_id | bigint | NO |  |
| entity_type | character varying | NO |  |
| entity_id | bigint | NO |  |
| link_purpose | character varying | YES |  |
| display_order | integer | NO | 0 |
| notes | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| created_by | bigint | YES |  |

### core_doc_smartfilter (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| filter_id | integer | NO | nextval('core_doc_smartfilter_filter_id_seq'::regc |
| name | character varying | NO |  |
| query | jsonb | NO |  |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### core_doc_text (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| doc_id | integer | NO |  |
| extracted_text | text | YES |  |
| word_count | integer | YES |  |
| extraction_method | character varying | YES |  |
| extracted_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### core_fin_budget_version (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| budget_id | bigint | NO | nextval('core_fin_budget_version_budget_id_seq'::r |
| name | text | NO |  |
| as_of | date | NO |  |
| status | text | NO | 'draft'::text |
| created_at | timestamp with time zone | NO | now() |
| project_id | bigint | YES |  |

### core_fin_category_uom (2 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| category_id | bigint | NO |  |
| uom_code | text | NO |  |

### core_fin_confidence_policy (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| confidence_code | text | NO |  |
| name | text | NO |  |
| default_contingency_pct | numeric | NO | 0 |
| description | text | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

### core_fin_crosswalk_ad (3 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ad_code | text | NO |  |
| ad_group | text | YES |  |
| category_id | bigint | NO |  |

### core_fin_crosswalk_ae (3 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ae_coa | text | NO |  |
| ae_group | text | YES |  |
| category_id | bigint | NO |  |

### core_fin_curve (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| curve_id | bigint | NO | nextval('core_fin_curve_curve_id_seq'::regclass) |
| name | text | NO |  |
| points_json | jsonb | NO |  |
| created_at | timestamp with time zone | NO | now() |

### core_fin_division_applicability (2 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| category_id | bigint | NO |  |
| tier | integer | NO |  |

### core_fin_fact_actual (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| fact_id | bigint | NO | nextval('core_fin_fact_actual_fact_id_seq'::regcla |
| category_id | bigint | NO |  |
| uom_code | text | NO |  |
| qty | numeric | YES | 1 |
| rate | numeric | YES |  |
| amount | numeric | YES |  |
| txn_date | date | NO |  |
| source_doc | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| container_id | bigint | YES |  |
| project_id | bigint | YES |  |
| scenario_id | integer | YES |  |

### core_fin_fact_budget (82 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| fact_id | bigint | NO | nextval('core_fin_fact_budget_fact_id_seq'::regcla |
| budget_id | bigint | NO |  |
| category_id | bigint | YES |  |
| funding_id | bigint | YES |  |
| uom_code | text | NO |  |
| qty | numeric | YES | 1 |
| rate | numeric | YES |  |
| amount | numeric | YES |  |
| start_date | date | YES |  |
| end_date | date | YES |  |
| curve_id | bigint | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| division_id | bigint | YES |  |
| confidence_level | character varying | YES |  |
| vendor_contact_id | integer | YES |  |
| escalation_rate | numeric | YES |  |
| contingency_pct | numeric | YES |  |
| timing_method | character varying | YES |  |
| contract_number | character varying | YES |  |
| purchase_order | character varying | YES |  |
| is_committed | boolean | YES | false |
| growth_rate_set_id | integer | YES |  |
| project_id | bigint | YES |  |
| contingency_mode | text | YES |  |
| confidence_code | text | YES |  |
| finance_structure_id | bigint | YES |  |
| scenario_id | integer | YES |  |
| category_l1_id | bigint | YES |  |
| category_l2_id | bigint | YES |  |
| category_l3_id | bigint | YES |  |
| category_l4_id | bigint | YES |  |
| start_period | integer | YES |  |
| periods_to_complete | integer | YES |  |
| end_period | integer | YES |  |
| escalation_method | character varying | YES |  |
| curve_profile | character varying | YES |  |
| curve_steepness | numeric | YES |  |
| scope_override | character varying | YES |  |
| cost_type | character varying | YES |  |
| tax_treatment | character varying | YES |  |
| internal_memo | text | YES |  |
| vendor_name | character varying | YES |  |
| baseline_start_date | date | YES |  |
| baseline_end_date | date | YES |  |
| actual_start_date | date | YES |  |
| actual_end_date | date | YES |  |
| percent_complete | numeric | YES |  |
| status | character varying | YES |  |
| is_critical | boolean | YES | false |
| float_days | integer | YES |  |
| early_start_date | date | YES |  |
| late_finish_date | date | YES |  |
| milestone_id | bigint | YES |  |
| budget_version | character varying | YES |  |
| version_as_of_date | date | YES |  |
| funding_draw_pct | numeric | YES |  |
| draw_schedule | character varying | YES |  |
| retention_pct | numeric | YES |  |
| payment_terms | character varying | YES |  |
| invoice_frequency | character varying | YES |  |
| cost_allocation | character varying | YES |  |
| is_reimbursable | boolean | YES | false |
| allocation_method | character varying | YES |  |
| cf_start_flag | boolean | YES | false |
| cf_distribution | character varying | YES |  |
| allocated_total | numeric | YES |  |
| allocation_variance | numeric | YES |  |
| bid_date | date | YES |  |
| bid_amount | numeric | YES |  |
| bid_variance | numeric | YES |  |
| change_order_count | integer | YES | 0 |
| change_order_total | numeric | YES | 0 |
| approval_status | character varying | YES |  |
| approved_by | bigint | YES |  |
| approval_date | date | YES |  |
| document_count | integer | YES | 0 |
| last_modified_by | bigint | YES |  |
| last_modified_date | timestamp without time zone | YES |  |
| activity | character varying | YES |  |
| new_category_id | bigint | YES |  |
| value_source | character varying | YES |  |

### core_fin_fact_tags (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| tag_id | bigint | NO |  |
| fact_id | bigint | NO |  |
| fact_type | character varying | NO |  |
| tag_name | character varying | NO |  |
| tag_color | character varying | YES |  |
| tag_category | character varying | YES |  |
| is_compact | boolean | YES | false |
| created_by | integer | YES |  |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |

### core_fin_funding_source (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| funding_id | bigint | NO | nextval('core_fin_funding_source_funding_id_seq':: |
| type | text | NO |  |
| subclass | text | YES |  |
| rank | integer | YES |  |
| lender_party | text | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

### core_fin_growth_rate_sets (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| set_id | integer | NO | nextval('core_fin_growth_rate_sets_set_id_seq'::re |
| project_id | bigint | NO |  |
| card_type | character varying | NO |  |
| set_name | character varying | NO | 'Custom 1'::character varying |
| is_default | boolean | YES | false |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| benchmark_id | bigint | YES |  |
| market_geography | character varying | YES |  |
| is_global | boolean | YES | false |

### core_fin_growth_rate_steps (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| step_id | integer | NO | nextval('core_fin_growth_rate_steps_step_id_seq':: |
| set_id | integer | NO |  |
| step_number | integer | NO |  |
| from_period | integer | NO |  |
| periods | integer | YES |  |
| rate | numeric | NO |  |
| thru_period | integer | YES |  |
| created_at | timestamp with time zone | YES | now() |

### core_fin_uom (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| uom_code | text | NO |  |
| name | text | NO |  |
| uom_type | text | NO |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

### core_item_benchmark_link (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| link_id | integer | NO | nextval('core_template_benchmark_link_link_id_seq' |
| item_id | integer | YES |  |
| benchmark_id | bigint | YES |  |
| is_primary | boolean | YES | false |
| created_at | timestamp without time zone | YES | now() |

### core_lookup_item (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| item_id | bigint | NO | nextval('core_lookup_item_item_id_seq'::regclass) |
| list_key | text | NO |  |
| sort_order | integer | NO | 0 |
| code | text | NO |  |
| label | text | NO |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

### core_lookup_list (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| list_key | text | NO |  |
| name | text | NO |  |
| description | text | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

### core_lookup_vw (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| list_key | text | YES |  |
| list_name | text | YES |  |
| item_id | bigint | YES |  |
| sort_order | integer | YES |  |
| code | text | YES |  |
| label | text | YES |  |
| is_active | boolean | YES |  |

### core_planning_standards (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| standard_id | integer | NO | nextval('core_planning_standards_standard_id_seq': |
| standard_name | character varying | NO |  |
| default_planning_efficiency | numeric | YES | 0.7500 |
| default_street_row_pct | numeric | YES |  |
| default_park_dedication_pct | numeric | YES |  |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### core_unit_cost_category (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| category_id | integer | NO | nextval('core_unit_cost_category_category_id_seq': |
| parent_id | integer | YES |  |
| category_name | character varying | NO |  |
| sort_order | integer | YES | 0 |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| tags | jsonb | YES | '[]'::jsonb |
| account_number | character varying | YES |  |
| account_level | smallint | YES | 1 |
| is_calculated | boolean | YES | false |
| property_types | ARRAY | YES | ARRAY['MF'::text, 'OFF'::text, 'RET'::text, 'IND': |

### core_unit_cost_item (19 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| item_id | integer | NO | nextval('core_unit_cost_item_item_id_seq'::regclas |
| category_id | integer | YES |  |
| item_name | character varying | NO |  |
| default_uom_code | character varying | YES |  |
| typical_low_value | numeric | YES |  |
| typical_mid_value | numeric | YES |  |
| typical_high_value | numeric | YES |  |
| market_geography | character varying | YES |  |
| project_type_code | character varying | YES | 'LAND'::character varying |
| last_used_date | date | YES |  |
| usage_count | integer | YES | 0 |
| is_active | boolean | YES | true |
| created_from_project_id | integer | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| created_from_ai | boolean | YES | false |
| quantity | numeric | YES |  |
| source | character varying | YES |  |
| as_of_date | date | YES |  |

### core_workspace_member (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| workspace_id | bigint | NO |  |
| user_id | bigint | NO |  |
| role | character varying | NO |  |
| created_at | timestamp with time zone | NO | now() |

### density_classification (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| density_id | bigint | NO |  |
| code | text | NO |  |
| name | text | NO |  |
| family_category | text | NO |  |
| intensity_min | numeric | YES |  |
| intensity_max | numeric | YES |  |
| intensity_metric | text | YES |  |
| description | text | YES |  |
| jurisdiction_notes | text | YES |  |
| active | boolean | YES | true |
| sort_order | integer | YES |  |
| created_at | timestamp with time zone | YES | now() |

### developer_fees (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('developer_fees_id_seq'::regclass) |
| project_id | bigint | NO |  |
| fee_type | character varying | NO |  |
| fee_description | character varying | YES |  |
| basis_type | character varying | NO |  |
| basis_value | numeric | YES |  |
| calculated_amount | numeric | YES |  |
| payment_timing | character varying | YES |  |
| status | character varying | YES | 'pending'::character varying |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| timing_start_period | integer | YES | 1 |
| timing_duration_periods | integer | YES | 1 |

### django_admin_log (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO |  |
| action_time | timestamp with time zone | NO |  |
| object_id | text | YES |  |
| object_repr | character varying | NO |  |
| action_flag | smallint | NO |  |
| change_message | text | NO |  |
| content_type_id | integer | YES |  |
| user_id | integer | NO |  |

### django_content_type (3 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO |  |
| app_label | character varying | NO |  |
| model | character varying | NO |  |

### django_migrations (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| app | character varying | NO |  |
| name | character varying | NO |  |
| applied | timestamp with time zone | NO |  |

### django_session (3 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| session_key | character varying | NO |  |
| session_data | text | NO |  |
| expire_date | timestamp with time zone | NO |  |

### dms_assertion (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| assertion_id | integer | NO | nextval('dms_assertion_assertion_id_seq'::regclass |
| project_id | integer | NO |  |
| doc_id | text | NO |  |
| subject_type | character varying | NO |  |
| subject_ref | text | YES |  |
| metric_key | text | NO |  |
| value_num | numeric | YES |  |
| value_text | text | YES |  |
| units | text | YES |  |
| context | character varying | YES |  |
| page | integer | YES |  |
| bbox | ARRAY | YES |  |
| confidence | numeric | NO | 0.95 |
| source | character varying | YES |  |
| as_of_date | date | YES |  |
| created_at | timestamp with time zone | YES | now() |

### dms_attributes (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| attr_id | bigint | NO | nextval('dms_attributes_attr_id_seq'::regclass) |
| attr_key | character varying | NO |  |
| attr_name | character varying | NO |  |
| attr_type | character varying | NO |  |
| attr_description | text | YES |  |
| is_required | boolean | YES | false |
| is_searchable | boolean | YES | true |
| validation_rules | jsonb | YES | '{}'::jsonb |
| enum_values | jsonb | YES |  |
| lookup_table | character varying | YES | NULL::character varying |
| display_order | integer | YES | 0 |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### dms_doc_tag_assignments (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| doc_id | bigint | NO |  |
| tag_id | integer | NO |  |
| assigned_by | integer | YES |  |
| assigned_at | timestamp with time zone | YES | now() |

### dms_doc_tags (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| tag_id | integer | NO | nextval('dms_doc_tags_tag_id_seq'::regclass) |
| tag_name | character varying | NO |  |
| workspace_id | bigint | YES |  |
| usage_count | integer | YES | 0 |
| created_by | integer | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| subtype_code | character varying | YES | NULL::character varying |

### dms_extract_queue (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| queue_id | bigint | NO | nextval('dms_extract_queue_queue_id_seq'::regclass |
| doc_id | bigint | YES |  |
| extract_type | character varying | NO | 'ocr'::character varying |
| priority | integer | YES | 0 |
| status | character varying | YES | 'pending'::character varying |
| attempts | integer | YES | 0 |
| max_attempts | integer | YES | 3 |
| error_message | text | YES |  |
| extracted_data | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | now() |
| processed_at | timestamp with time zone | YES |  |
| review_status | character varying | YES | 'pending'::character varying |
| overall_confidence | numeric | YES | 0.0 |
| committed_at | timestamp without time zone | YES |  |
| commit_notes | text | YES |  |
| extracted_text | text | YES |  |

### dms_profile_audit (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| audit_id | bigint | NO | nextval('dms_profile_audit_audit_id_seq'::regclass |
| doc_id | bigint | YES |  |
| changed_by | bigint | YES |  |
| change_type | character varying | NO | 'profile_update'::character varying |
| old_profile_json | jsonb | YES | '{}'::jsonb |
| new_profile_json | jsonb | YES | '{}'::jsonb |
| changed_fields | ARRAY | YES | '{}'::text[] |
| change_reason | text | YES |  |
| created_at | timestamp with time zone | YES | now() |

### dms_project_doc_types (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('dms_project_doc_types_id_seq'::regclass) |
| project_id | integer | NO |  |
| doc_type_name | character varying | NO |  |
| display_order | integer | YES | 0 |
| is_from_template | boolean | YES | false |
| created_at | timestamp with time zone | YES | now() |

### dms_template_attributes (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| template_id | bigint | NO |  |
| attr_id | bigint | NO |  |
| is_required | boolean | YES | false |
| default_value | jsonb | YES |  |
| display_order | integer | YES | 0 |

### dms_templates (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| template_id | bigint | NO | nextval('dms_templates_template_id_seq'::regclass) |
| template_name | character varying | NO |  |
| workspace_id | bigint | YES |  |
| project_id | bigint | YES |  |
| doc_type | character varying | YES |  |
| is_default | boolean | YES | false |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| doc_type_options | ARRAY | YES |  |
| description | text | YES |  |

### dms_unmapped (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| unmapped_id | integer | NO | nextval('dms_unmapped_unmapped_id_seq'::regclass) |
| doc_id | text | NO |  |
| project_id | integer | YES |  |
| source_key | text | NO |  |
| raw_value | text | YES |  |
| candidate_targets | ARRAY | YES |  |
| page | integer | YES |  |
| bbox | ARRAY | YES |  |
| status | character varying | NO | 'new'::character varying |
| mapped_to_table | text | YES |  |
| mapped_to_column | text | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| reviewed_at | timestamp with time zone | YES |  |
| reviewed_by | text | YES |  |

### dms_workspaces (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| workspace_id | bigint | NO | nextval('dms_workspaces_workspace_id_seq'::regclas |
| workspace_code | character varying | NO |  |
| workspace_name | character varying | NO |  |
| description | text | YES |  |
| is_default | boolean | YES | false |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### doc_extracted_facts (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| fact_id | uuid | NO | gen_random_uuid() |
| doc_id | bigint | NO |  |
| source_version | integer | NO | 1 |
| field_name | character varying | NO |  |
| field_value | text | YES |  |
| confidence | numeric | YES |  |
| extraction_method | character varying | YES |  |
| superseded_at | timestamp with time zone | YES |  |
| superseded_by_version | integer | YES |  |
| created_at | timestamp with time zone | YES | now() |

### doc_geo_tag (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| doc_geo_tag_id | integer | NO | nextval('doc_geo_tag_doc_geo_tag_id_seq'::regclass |
| doc_id | integer | NO |  |
| geo_level | character varying | NO |  |
| geo_value | character varying | NO |  |
| geo_source | character varying | YES | 'inferred'::character varying |
| created_at | timestamp with time zone | YES | now() |

### doc_processing_queue (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| queue_id | integer | NO | nextval('doc_processing_queue_queue_id_seq'::regcl |
| doc_id | bigint | NO |  |
| project_id | bigint | YES |  |
| status | character varying | YES | 'queued'::character varying |
| priority | integer | YES | 0 |
| attempts | integer | YES | 0 |
| max_attempts | integer | YES | 3 |
| started_at | timestamp without time zone | YES |  |
| completed_at | timestamp without time zone | YES |  |
| error_message | text | YES |  |
| created_at | timestamp without time zone | YES | now() |

### document_tables (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| table_id | bigint | NO | nextval('document_tables_table_id_seq'::regclass) |
| doc_id | bigint | YES |  |
| table_order | integer | YES | 0 |
| page_number | integer | YES |  |
| table_title | character varying | YES |  |
| headers | jsonb | YES |  |
| rows | jsonb | YES |  |
| row_count | integer | YES | 0 |
| extraction_source | character varying | YES | 'pdfplumber'::character varying |
| accuracy | numeric | YES |  |
| raw_data | jsonb | YES |  |
| created_at | timestamp with time zone | YES | now() |

### extraction_commit_snapshot (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| snapshot_id | bigint | NO |  |
| scope | character varying | NO |  |
| committed_at | timestamp with time zone | NO |  |
| snapshot_data | jsonb | NO |  |
| changes_applied | jsonb | NO |  |
| is_active | boolean | NO |  |
| rolled_back_at | timestamp with time zone | YES |  |
| committed_by | bigint | YES |  |
| doc_id | bigint | YES |  |
| project_id | integer | NO |  |

### geography_columns (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| f_table_catalog | name | YES |  |
| f_table_schema | name | YES |  |
| f_table_name | name | YES |  |
| f_geography_column | name | YES |  |
| coord_dimension | integer | YES |  |
| srid | integer | YES |  |
| type | text | YES |  |

### geometry_columns (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| f_table_catalog | character varying | YES |  |
| f_table_schema | name | YES |  |
| f_table_name | name | YES |  |
| f_geometry_column | name | YES |  |
| coord_dimension | integer | YES |  |
| srid | integer | YES |  |
| type | character varying | YES |  |

### gis_boundary_history (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| boundary_id | integer | NO | nextval('gis_boundary_history_boundary_id_seq'::re |
| project_id | integer | NO |  |
| boundary_type | character varying | NO | 'tax_parcel_boundary'::character varying |
| parcels_selected | jsonb | NO |  |
| total_acres | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |
| action_type | character varying | NO | 'boundary_confirmed'::character varying |

### gis_document_ingestion (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | integer | NO |  |
| package_name | text | NO |  |
| document_type | text | NO |  |
| filename | text | NO |  |
| ai_analysis | jsonb | YES |  |
| parcels_created | integer | YES | 0 |
| geometry_added | integer | YES | 0 |
| status | text | YES | 'processing'::text |
| error_details | text | YES |  |
| processed_at | timestamp with time zone | YES | now() |
| created_at | timestamp with time zone | NO | now() |

### gis_mapping_history (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| mapping_id | integer | NO | nextval('gis_mapping_history_mapping_id_seq'::regc |
| project_id | integer | NO |  |
| mapping_type | character varying | NO | 'assessor_field_mapping'::character varying |
| fields_mapped | jsonb | NO |  |
| source_data | jsonb | YES |  |
| created_at | timestamp with time zone | YES | now() |
| action_type | character varying | NO | 'mapping_applied'::character varying |

### gis_plan_parcel (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | integer | NO |  |
| parcel_id | integer | NO |  |
| geom | USER-DEFINED | NO |  |
| source_doc | text | NO |  |
| version | integer | NO | 1 |
| confidence | numeric | YES | 0.95 |
| valid_from | timestamp with time zone | NO | now() |
| valid_to | timestamp with time zone | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

### gis_project_boundary (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | integer | NO |  |
| geom | USER-DEFINED | NO |  |
| source | text | NO | 'user_selection'::text |
| created_at | timestamp with time zone | NO | now() |

### gis_tax_parcel_ref (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| tax_parcel_id | text | NO |  |
| geom | USER-DEFINED | NO |  |
| assessor_attrs | jsonb | YES |  |
| source_updated_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | NO | now() |
| source | text | YES |  |
| updated_at | timestamp with time zone | YES |  |

### glossary_zoning (33 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| glossary_id | uuid | NO | gen_random_uuid() |
| jurisdiction_city | text | NO |  |
| jurisdiction_county | text | YES |  |
| jurisdiction_state | character | NO |  |
| jurisdiction_display | text | NO |  |
| district_code | text | YES |  |
| district_name | text | YES |  |
| family_name | text | NO |  |
| local_code_raw | text | NO |  |
| local_code_canonical | text | YES |  |
| code_token_kind | USER-DEFINED | NO |  |
| code_token_confidence | numeric | NO |  |
| mapped_use | text | NO |  |
| allowance | character | NO |  |
| purpose_text | text | YES |  |
| intent_text | text | YES |  |
| conditions_text | text | YES |  |
| development_standards | jsonb | YES |  |
| use_standard_refs | jsonb | YES |  |
| definitions_refs | jsonb | YES |  |
| narrative_section_ref | text | YES |  |
| narrative_src_url | text | YES |  |
| source_doc_url | text | YES |  |
| effective_date | date | YES |  |
| amending_ord_list | jsonb | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| suggested_family | text | YES |  |
| suggested_density_code | text | YES |  |
| suggested_type_code | text | YES |  |
| ai_confidence | numeric | YES |  |
| mapping_status | text | YES |  |

### knowledge_embeddings (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| embedding_id | bigint | NO |  |
| source_type | character varying | NO |  |
| source_id | bigint | NO |  |
| content_text | text | NO |  |
| embedding | USER-DEFINED | YES |  |
| entity_ids | ARRAY | NO |  |
| tags | ARRAY | NO |  |
| created_at | timestamp with time zone | NO |  |
| source_version | integer | YES | 1 |
| superseded_by_version | integer | YES |  |

### knowledge_entities (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| entity_id | bigint | NO |  |
| entity_type | character varying | NO |  |
| entity_subtype | character varying | YES |  |
| canonical_name | character varying | NO |  |
| metadata | jsonb | NO |  |
| created_at | timestamp with time zone | NO |  |
| created_by_id | bigint | YES |  |

### knowledge_facts (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| fact_id | bigint | NO |  |
| predicate | character varying | NO |  |
| object_value | text | YES |  |
| valid_from | date | YES |  |
| valid_to | date | YES |  |
| source_type | character varying | NO |  |
| source_id | bigint | YES |  |
| confidence_score | numeric | NO |  |
| is_current | boolean | NO |  |
| created_at | timestamp with time zone | NO |  |
| created_by_id | bigint | YES |  |
| object_entity_id | bigint | YES |  |
| subject_entity_id | bigint | NO |  |
| superseded_by_id | bigint | YES |  |

### knowledge_insights (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| insight_id | bigint | NO |  |
| insight_type | character varying | NO |  |
| related_entities | ARRAY | NO |  |
| insight_title | character varying | NO |  |
| insight_description | text | NO |  |
| severity | character varying | NO |  |
| supporting_facts | ARRAY | NO |  |
| metadata | jsonb | NO |  |
| acknowledged | boolean | NO |  |
| acknowledged_at | timestamp with time zone | YES |  |
| user_action | text | YES |  |
| created_at | timestamp with time zone | NO |  |
| acknowledged_by_id | bigint | YES |  |
| subject_entity_id | bigint | NO |  |

### knowledge_interactions (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| interaction_id | bigint | NO |  |
| user_query | text | NO |  |
| query_type | character varying | NO |  |
| query_intent | character varying | YES |  |
| context_entities | ARRAY | NO |  |
| context_facts | ARRAY | NO |  |
| ai_response | text | NO |  |
| response_type | character varying | NO |  |
| confidence_score | numeric | YES |  |
| input_tokens | integer | NO |  |
| output_tokens | integer | NO |  |
| user_feedback | character varying | YES |  |
| user_correction | text | YES |  |
| created_at | timestamp with time zone | NO |  |
| session_id | uuid | NO |  |

### knowledge_sessions (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| session_id | uuid | NO |  |
| workspace_id | integer | YES |  |
| project_id | integer | YES |  |
| session_start | timestamp with time zone | NO |  |
| session_end | timestamp with time zone | YES |  |
| loaded_entities | ARRAY | NO |  |
| loaded_facts_count | integer | NO |  |
| context_token_count | integer | NO |  |
| context_summary | text | YES |  |
| metadata | jsonb | NO |  |
| user_id | bigint | NO |  |

### land_use_pricing (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('land_use_pricing_id_seq'::regclass) |
| project_id | integer | NO |  |
| lu_type_code | character varying | NO |  |
| price_per_unit | numeric | YES |  |
| unit_of_measure | character varying | YES |  |
| inflation_type | character varying | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| benchmark_id | bigint | YES |  |
| market_geography | character varying | YES |  |
| product_code | character varying | YES |  |
| growth_rate | numeric | YES |  |
| growth_rate_set_id | integer | YES |  |

### landscaper_absorption_detail (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| detail_id | bigint | NO | nextval('landscaper_absorption_detail_detail_id_se |
| benchmark_id | bigint | YES |  |
| data_source_type | character varying | NO |  |
| source_document_id | integer | YES |  |
| extraction_date | timestamp without time zone | YES | now() |
| as_of_period | character varying | YES |  |
| subdivision_name | character varying | YES |  |
| mpc_name | character varying | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| market_geography | character varying | YES |  |
| annual_sales | integer | YES |  |
| monthly_rate | numeric | YES |  |
| yoy_change_pct | numeric | YES |  |
| lot_size_sf | integer | YES |  |
| price_point_low | numeric | YES |  |
| price_point_high | numeric | YES |  |
| builder_name | character varying | YES |  |
| active_subdivisions_count | integer | YES |  |
| product_mix_json | jsonb | YES |  |
| market_tier | character varying | YES |  |
| competitive_supply | character varying | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### landscaper_activity (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| activity_id | integer | NO | nextval('landscaper_activity_activity_id_seq'::reg |
| project_id | integer | NO |  |
| activity_type | character varying | NO |  |
| title | character varying | NO |  |
| summary | text | NO |  |
| status | character varying | NO | 'pending'::character varying |
| confidence | character varying | YES |  |
| link | character varying | YES |  |
| blocked_by | text | YES |  |
| details | jsonb | YES |  |
| highlight_fields | jsonb | YES |  |
| is_read | boolean | NO | false |
| source_type | character varying | YES |  |
| source_id | character varying | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### landscaper_advice (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| advice_id | integer | NO |  |
| assumption_key | character varying | NO |  |
| lifecycle_stage | character varying | NO |  |
| suggested_value | numeric | NO |  |
| confidence_level | character varying | NO |  |
| created_at | timestamp with time zone | NO |  |
| notes | text | YES |  |
| message_id | character varying | YES |  |
| project_id | integer | NO |  |

### landscaper_chat_embedding (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| message_id | uuid | NO |  |
| thread_id | uuid | NO |  |
| project_id | integer | NO |  |
| embedding | USER-DEFINED | YES |  |
| created_at | timestamp with time zone | YES | now() |

### landscaper_chat_message (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| message_id | character varying | NO |  |
| role | character varying | NO |  |
| content | text | NO |  |
| timestamp | timestamp with time zone | NO |  |
| metadata | jsonb | YES |  |
| project_id | integer | NO |  |
| user_id | bigint | YES |  |
| active_tab | character varying | YES | 'home'::character varying |

### landscaper_chat_thread (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| project_id | integer | NO |  |
| page_context | character varying | NO |  |
| subtab_context | character varying | YES |  |
| title | character varying | YES |  |
| summary | text | YES |  |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| closed_at | timestamp with time zone | YES |  |

### landscaper_thread_message (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| thread_id | uuid | NO |  |
| role | character varying | NO |  |
| content | text | NO |  |
| metadata | jsonb | YES |  |
| created_at | timestamp with time zone | YES | now() |

### lkp_building_class (3 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| code | character varying | NO |  |
| display_name | character varying | NO |  |
| description | text | YES |  |

### lkp_buyer_seller_type (3 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| code | character varying | NO |  |
| display_name | character varying | NO |  |
| sort_order | integer | YES |  |

### lkp_price_status (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| code | character varying | NO |  |
| display_name | character varying | NO |  |
| description | text | YES |  |
| reliability_score | integer | YES |  |

### lkp_sale_type (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| code | character varying | NO |  |
| display_name | character varying | NO |  |
| description | text | YES |  |
| sort_order | integer | YES |  |

### lu_acreage_allocation_type (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| allocation_type_id | integer | NO | nextval('lu_acreage_allocation_type_allocation_typ |
| allocation_type_code | character varying | NO |  |
| allocation_type_name | character varying | NO |  |
| description | text | YES |  |
| is_developable | boolean | YES | false |
| sort_order | integer | YES | 0 |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### lu_com_spec (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| com_spec_id | bigint | NO |  |
| type_id | bigint | NO |  |
| far_min | numeric | YES |  |
| far_max | numeric | YES |  |
| cov_max_pct | numeric | YES |  |
| pk_per_ksf | numeric | YES |  |
| hgt_max_ft | numeric | YES |  |
| sb_front_ft | numeric | YES |  |
| sb_side_ft | numeric | YES |  |
| sb_corner_ft | numeric | YES |  |
| sb_rear_ft | numeric | YES |  |
| os_min_pct | numeric | YES |  |
| notes | text | YES |  |
| eff_date | date | YES |  |
| doc_id | bigint | YES |  |

### lu_family (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| family_id | bigint | NO |  |
| code | text | NO |  |
| name | text | NO |  |
| active | boolean | NO | true |
| notes | text | YES |  |

### lu_lease_status (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| status_code | character varying | NO |  |
| status_name | character varying | NO |  |
| description | text | YES |  |
| affects_occupancy | boolean | YES | true |
| display_order | integer | YES |  |

### lu_lease_type (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| type_code | character varying | NO |  |
| type_name | character varying | NO |  |
| description | text | YES |  |
| display_order | integer | YES |  |

### lu_market (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| market_id | integer | NO | nextval('lu_market_market_id_seq'::regclass) |
| market_code | character varying | NO |  |
| market_name | character varying | NO |  |
| state | character varying | YES |  |
| is_active | boolean | YES | true |

### lu_media_classification (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| classification_id | integer | NO | nextval('lu_media_classification_classification_id |
| classification_code | character varying | NO |  |
| classification_name | character varying | NO |  |
| description | text | YES |  |
| badge_color | character varying | NO |  |
| badge_icon | character varying | YES |  |
| sort_order | integer | NO | 0 |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| content_intent | character varying | YES |  |
| default_action | character varying | YES |  |

### lu_picklist_display_config (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| config_id | integer | NO | nextval('lu_picklist_display_config_config_id_seq' |
| list_code | character varying | NO |  |
| context | character varying | NO |  |
| display_format | character varying | NO |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### lu_property_subtype (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| subtype_id | integer | NO | nextval('lu_property_subtype_subtype_id_seq'::regc |
| property_type_code | character varying | NO |  |
| subtype_code | character varying | NO |  |
| subtype_name | character varying | NO |  |
| sort_order | integer | YES | 0 |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### lu_recovery_structure (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| structure_code | character varying | NO |  |
| structure_name | character varying | NO |  |
| description | text | YES |  |
| display_order | integer | YES |  |

### lu_res_spec (18 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| res_spec_id | bigint | NO |  |
| type_id | bigint | NO |  |
| dua_min | numeric | YES |  |
| dua_max | numeric | YES |  |
| lot_w_min_ft | numeric | YES |  |
| lot_d_min_ft | numeric | YES |  |
| lot_area_min_sf | numeric | YES |  |
| sb_front_ft | numeric | YES |  |
| sb_side_ft | numeric | YES |  |
| sb_corner_ft | numeric | YES |  |
| sb_rear_ft | numeric | YES |  |
| hgt_max_ft | numeric | YES |  |
| cov_max_pct | numeric | YES |  |
| os_min_pct | numeric | YES |  |
| pk_per_unit | numeric | YES |  |
| notes | text | YES |  |
| eff_date | date | YES |  |
| doc_id | bigint | YES |  |

### lu_subtype (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| subtype_id | integer | NO | nextval('lu_subtype_subtype_id_seq1'::regclass) |
| family_id | integer | YES |  |
| code | character varying | NO |  |
| name | character varying | NO |  |
| ord | integer | YES | 0 |
| active | boolean | YES | true |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### lu_type (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| type_id | bigint | NO |  |
| family_id | bigint | NO |  |
| code | text | NO |  |
| name | text | NO |  |
| ord | integer | YES |  |
| active | boolean | NO | true |
| notes | text | YES |  |

### management_overhead (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('management_overhead_id_seq'::regclass) |
| project_id | bigint | NO |  |
| item_name | character varying | NO |  |
| amount | numeric | NO |  |
| frequency | character varying | YES | 'monthly'::character varying |
| start_period | integer | YES | 1 |
| duration_periods | integer | YES | 1 |
| container_level | character varying | YES |  |
| container_id | bigint | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### market_activity (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('market_activity_id_seq'::regclass) |
| msa_code | character varying | NO |  |
| source | character varying | NO |  |
| metric_type | character varying | NO |  |
| geography_type | character varying | NO |  |
| geography_name | character varying | NO |  |
| period_type | character varying | NO |  |
| period_end_date | date | NO |  |
| value | integer | NO |  |
| notes | text | YES |  |
| updated_at | timestamp with time zone | YES | now() |

### market_assumptions (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | integer | NO |  |
| commission_basis | text | YES |  |
| demand_unit | text | YES |  |
| uom | text | YES |  |
| updated_at | timestamp with time zone | NO | now() |
| lu_type_code | character varying | YES |  |
| price_per_unit | numeric | YES |  |
| unit_of_measure | character varying | YES |  |
| inflation_type | character varying | YES |  |
| dvl_per_year | numeric | YES |  |
| dvl_per_quarter | numeric | YES |  |
| dvl_per_month | numeric | YES |  |

### market_competitive_project_exclusions (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('market_competitive_project_exclusions_id_ |
| project_id | integer | NO |  |
| source_project_id | character varying | NO |  |
| excluded_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| excluded_reason | character varying | YES |  |

### market_competitive_project_products (23 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('market_competitive_project_products_id_se |
| competitive_project_id | integer | NO |  |
| product_id | integer | YES |  |
| lot_width_ft | integer | YES |  |
| lot_dimensions | character varying | YES |  |
| unit_size_min_sf | integer | YES |  |
| unit_size_max_sf | integer | YES |  |
| unit_size_avg_sf | integer | YES |  |
| price_min | numeric | YES |  |
| price_max | numeric | YES |  |
| price_avg | numeric | YES |  |
| price_per_sf_avg | numeric | YES |  |
| units_planned | integer | YES |  |
| units_sold | integer | YES |  |
| units_remaining | integer | YES |  |
| qmi_count | integer | YES |  |
| sales_rate_monthly | numeric | YES |  |
| sales_rate_3m_avg | numeric | YES |  |
| sales_rate_6m_avg | numeric | YES |  |
| mos_vdl | numeric | YES |  |
| mos_inventory | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### market_competitive_projects (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('market_competitive_projects_id_seq'::regc |
| project_id | integer | NO |  |
| master_plan_name | character varying | YES |  |
| comp_name | character varying | NO |  |
| builder_name | character varying | YES |  |
| comp_address | text | YES |  |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| city | character varying | YES |  |
| zip_code | character varying | YES |  |
| total_units | integer | YES |  |
| price_min | numeric | YES |  |
| price_max | numeric | YES |  |
| absorption_rate_monthly | numeric | YES |  |
| status | character varying | YES | 'selling'::character varying |
| data_source | character varying | YES | 'manual'::character varying |
| source_url | text | YES |  |
| notes | text | YES |  |
| source_project_id | character varying | YES |  |
| effective_date | date | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### mkt_data_source_registry (18 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| source_id | integer | NO |  |
| source_code | character varying | NO |  |
| source_name | character varying | NO |  |
| source_type | character varying | NO |  |
| collection_method | text | YES |  |
| update_frequency | character varying | YES |  |
| typical_lag_days | integer | YES |  |
| coverage_geography | character varying | YES |  |
| coverage_description | text | YES |  |
| field_definitions | jsonb | NO |  |
| known_limitations | text | YES |  |
| caveats | text | YES |  |
| is_authoritative_for | jsonb | NO |  |
| website_url | text | YES |  |
| documentation_url | text | YES |  |
| is_active | boolean | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |

### mkt_new_home_project (101 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| record_id | bigint | NO |  |
| source_project_id | character varying | YES |  |
| source_subdivision_id | character varying | YES |  |
| effective_date | date | NO |  |
| source_file | character varying | YES |  |
| survey_period | character varying | YES |  |
| project_name | character varying | NO |  |
| master_plan_name | character varying | YES |  |
| master_plan_id | character varying | YES |  |
| master_plan_developer | character varying | YES |  |
| builder_name | character varying | YES |  |
| parent_builder | character varying | YES |  |
| status | character varying | YES |  |
| product_type | character varying | YES |  |
| product_style | character varying | YES |  |
| is_active_adult | boolean | NO |  |
| characteristics | text | YES |  |
| lot_size_sf | integer | YES |  |
| lot_width_ft | integer | YES |  |
| lot_depth_ft | integer | YES |  |
| lot_dimensions | character varying | YES |  |
| unit_size_min_sf | integer | YES |  |
| unit_size_max_sf | integer | YES |  |
| unit_size_avg_sf | integer | YES |  |
| price_min | numeric | YES |  |
| price_max | numeric | YES |  |
| price_avg | numeric | YES |  |
| price_per_sf_avg | numeric | YES |  |
| price_change_date | date | YES |  |
| units_planned | integer | YES |  |
| units_sold | integer | YES |  |
| units_remaining | integer | YES |  |
| qmi_count | integer | YES |  |
| open_date | date | YES |  |
| sold_out_date | date | YES |  |
| sales_rate_monthly | numeric | YES |  |
| sales_rate_3m_avg | numeric | YES |  |
| sales_rate_6m_avg | numeric | YES |  |
| sales_rate_12m_avg | numeric | YES |  |
| sales_change_date | date | YES |  |
| annual_starts | integer | YES |  |
| annual_closings | integer | YES |  |
| quarterly_starts | integer | YES |  |
| quarterly_closings | integer | YES |  |
| pipeline_excavation | integer | YES |  |
| pipeline_survey_stakes | integer | YES |  |
| pipeline_street_paving | integer | YES |  |
| pipeline_streets_in | integer | YES |  |
| pipeline_vdl | integer | YES |  |
| pipeline_vacant_land | integer | YES |  |
| pipeline_under_construction | integer | YES |  |
| pipeline_finished_vacant | integer | YES |  |
| models_count | integer | YES |  |
| occupied_count | integer | YES |  |
| future_inventory_count | integer | YES |  |
| mos_vdl | numeric | YES |  |
| mos_inventory | numeric | YES |  |
| mos_finished_vacant | numeric | YES |  |
| incentive_qmi_pct | numeric | YES |  |
| incentive_qmi_amt | numeric | YES |  |
| incentive_qmi_type | character varying | YES |  |
| incentive_tbb_pct | numeric | YES |  |
| incentive_tbb_amt | numeric | YES |  |
| incentive_tbb_type | character varying | YES |  |
| incentive_broker_pct | numeric | YES |  |
| incentive_broker_amt | numeric | YES |  |
| incentive_broker_type | character varying | YES |  |
| hoa_fee_monthly | numeric | YES |  |
| hoa_fee_2_monthly | numeric | YES |  |
| hoa_fee_per_sqft | numeric | YES |  |
| assessment_rate | numeric | YES |  |
| assessment_description | text | YES |  |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| address | character varying | YES |  |
| city | character varying | YES |  |
| zip_code | character varying | YES |  |
| county | character varying | YES |  |
| county_fips | integer | YES |  |
| cbsa_name | character varying | YES |  |
| cbsa_code | integer | YES |  |
| state | character varying | YES |  |
| boundary_names | text | YES |  |
| school_district | character varying | YES |  |
| school_elementary | text | YES |  |
| school_rating_elementary | character varying | YES |  |
| school_middle | text | YES |  |
| school_rating_middle | character varying | YES |  |
| school_high | text | YES |  |
| school_rating_high | character varying | YES |  |
| website_url | text | YES |  |
| office_phone | character varying | YES |  |
| lu_family_id | bigint | YES |  |
| lu_density_id | bigint | YES |  |
| lu_type_id | bigint | YES |  |
| lu_product_id | bigint | YES |  |
| lu_linkage_method | character varying | YES |  |
| lu_linkage_confidence | numeric | YES |  |
| ingestion_timestamp | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| source_id | integer | NO |  |

### mkt_permit_history (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| record_id | bigint | NO |  |
| source_file | character varying | YES |  |
| permit_month | date | NO |  |
| jurisdiction_name | character varying | NO |  |
| jurisdiction_type | character varying | YES |  |
| county | character varying | YES |  |
| state | character varying | NO |  |
| cbsa_code | integer | YES |  |
| permits_sf | integer | YES |  |
| permits_mf | integer | YES |  |
| permits_total | integer | YES |  |
| permits_detached | integer | YES |  |
| permits_attached | integer | YES |  |
| permits_custom | integer | YES |  |
| ingestion_timestamp | timestamp with time zone | NO |  |
| source_id | integer | NO |  |

### mutation_audit_log (18 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| audit_id | integer | NO | nextval('mutation_audit_log_audit_id_seq'::regclas |
| mutation_id | uuid | YES |  |
| project_id | integer | NO |  |
| mutation_type | character varying | NO |  |
| table_name | character varying | NO |  |
| field_name | character varying | YES |  |
| record_id | character varying | YES |  |
| old_value | jsonb | YES |  |
| new_value | jsonb | YES |  |
| action | character varying | NO |  |
| error_message | text | YES |  |
| reason | text | YES |  |
| source_message_id | character varying | YES |  |
| source_documents | jsonb | YES |  |
| initiated_by | character varying | YES | 'landscaper_ai'::character varying |
| confirmed_by | character varying | YES |  |
| created_at | timestamp with time zone | NO | now() |
| source_type | character varying | YES |  |

### mv_doc_search (28 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| doc_id | bigint | YES |  |
| project_id | bigint | YES |  |
| workspace_id | bigint | YES |  |
| doc_name | character varying | YES |  |
| doc_type | character varying | YES |  |
| discipline | character varying | YES |  |
| status | character varying | YES |  |
| version_no | integer | YES |  |
| storage_uri | text | YES |  |
| mime_type | character varying | YES |  |
| file_size_bytes | bigint | YES |  |
| doc_date | date | YES |  |
| contract_value | numeric | YES |  |
| priority | character varying | YES |  |
| profile_json | jsonb | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| project_name | character varying | YES |  |
| phase_name | text | YES |  |
| parcel_name | text | YES |  |
| folder_id | integer | YES |  |
| folder_path | text | YES |  |
| folder_name | character varying | YES |  |
| extracted_text | text | YES |  |
| word_count | integer | YES |  |
| media_scan_status | character varying | YES |  |
| media_scan_json | jsonb | YES |  |
| searchable_text | text | YES |  |

### opex_benchmark (19 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('opex_benchmark_id_seq'::regclass) |
| source | character varying | NO |  |
| source_year | integer | NO |  |
| report_name | character varying | YES |  |
| property_type | character varying | NO |  |
| property_subtype | character varying | YES |  |
| geographic_scope | character varying | NO |  |
| geography_name | character varying | YES |  |
| expense_category | character varying | NO |  |
| expense_subcategory | character varying | YES |  |
| per_unit_amount | numeric | YES |  |
| per_sf_amount | numeric | YES |  |
| pct_of_egi | numeric | YES |  |
| pct_of_gpi | numeric | YES |  |
| sample_size | integer | YES |  |
| sample_units | integer | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### opex_label_mapping (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| mapping_id | integer | NO | nextval('opex_label_mapping_mapping_id_seq'::regcl |
| source_label | character varying | NO |  |
| normalized_label | character varying | YES |  |
| parent_category | character varying | NO |  |
| target_field | character varying | YES |  |
| created_at | timestamp with time zone | YES | now() |
| created_by | bigint | YES |  |
| times_used | integer | YES | 1 |

### pending_mutations (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| mutation_id | uuid | NO | gen_random_uuid() |
| project_id | integer | NO |  |
| mutation_type | character varying | NO |  |
| table_name | character varying | NO |  |
| field_name | character varying | YES |  |
| record_id | character varying | YES |  |
| current_value | jsonb | YES |  |
| proposed_value | jsonb | NO |  |
| reason | text | NO |  |
| source_message_id | character varying | YES |  |
| source_documents | jsonb | YES | '[]'::jsonb |
| is_high_risk | boolean | NO | false |
| status | character varying | NO | 'pending'::character varying |
| created_at | timestamp with time zone | NO | now() |
| expires_at | timestamp with time zone | NO | (now() + '01:00:00'::interval) |
| resolved_at | timestamp with time zone | YES |  |
| resolved_by | character varying | YES |  |
| batch_id | uuid | YES |  |
| sequence_in_batch | integer | YES | 0 |
| source_type | character varying | YES |  |
| division_id | bigint | YES |  |
| unit_id | integer | YES |  |

### planning_doc (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| doc_id | bigint | NO |  |
| project_id | bigint | YES |  |
| jurisdiction_id | bigint | YES |  |
| doc_type | text | NO |  |
| title | text | NO |  |
| doc_url | text | YES |  |
| eff_date | date | YES |  |
| section_ref | text | YES |  |
| notes | text | YES |  |

### project_boundaries (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| boundary_id | integer | NO | nextval('project_boundaries_boundary_id_seq'::regc |
| project_id | integer | NO |  |
| parcel_count | integer | NO |  |
| total_acres | numeric | NO |  |
| dissolved_geometry | USER-DEFINED | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### project_jurisdiction_mapping (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| mapping_id | bigint | NO |  |
| project_id | bigint | NO |  |
| glossary_id | uuid | YES |  |
| family_name | text | YES |  |
| density_code | text | YES |  |
| type_code | text | YES |  |
| user_approved | boolean | YES | false |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### project_land_use (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_land_use_id | integer | NO | nextval('project_land_use_project_land_use_id_seq' |
| project_id | integer | NO |  |
| family_id | integer | NO |  |
| type_id | integer | NO |  |
| is_active | boolean | NO | true |
| notes | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### project_land_use_product (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_land_use_product_id | integer | NO | nextval('project_land_use_product_project_land_use |
| project_land_use_id | integer | NO |  |
| product_id | integer | NO |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

### project_parcel_boundaries (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| parcel_boundary_id | integer | NO | nextval('project_parcel_boundaries_parcel_boundary |
| boundary_id | integer | NO |  |
| project_id | integer | NO |  |
| parcel_id | text | NO |  |
| geometry | USER-DEFINED | NO |  |
| gross_acres | numeric | YES |  |
| owner_name | text | YES |  |
| site_address | text | YES |  |
| created_at | timestamp without time zone | YES | now() |

### report_templates (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| template_name | character varying | NO |  |
| description | text | YES |  |
| output_format | character varying | NO |  |
| assigned_tabs | jsonb | NO |  |
| sections | jsonb | NO |  |
| is_active | boolean | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| created_by | text | YES |  |

### res_lot_product (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| product_id | bigint | NO |  |
| code | text | NO |  |
| lot_w_ft | integer | NO |  |
| lot_d_ft | integer | NO |  |
| lot_area_sf | integer | YES |  |
| type_id | bigint | YES |  |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### sale_names (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('sale_names_id_seq'::regclass) |
| project_id | bigint | NO |  |
| sale_date | date | NO |  |
| sale_name | character varying | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### spatial_ref_sys (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| srid | integer | NO |  |
| auth_name | character varying | YES |  |
| auth_srid | integer | YES |  |
| srtext | character varying | YES |  |
| proj4text | character varying | YES |  |

### tbl_absorption_schedule (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| absorption_id | bigint | NO | nextval('tbl_absorption_schedule_absorption_id_seq |
| project_id | bigint | NO |  |
| area_id | bigint | YES |  |
| phase_id | bigint | YES |  |
| parcel_id | bigint | YES |  |
| revenue_stream_name | character varying | NO |  |
| revenue_category | character varying | YES |  |
| lu_family_name | character varying | YES |  |
| lu_type_code | character varying | YES |  |
| product_code | character varying | YES |  |
| start_period | integer | YES |  |
| periods_to_complete | integer | YES |  |
| timing_method | character varying | YES | 'ABSOLUTE'::character varying |
| units_per_period | numeric | YES |  |
| total_units | integer | YES |  |
| base_price_per_unit | numeric | YES |  |
| price_escalation_pct | numeric | YES | 0 |
| scenario_name | character varying | YES | 'Base Case'::character varying |
| probability_weight | numeric | YES | 1.0 |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| scenario_id | integer | YES |  |
| confidence | character varying | YES | NULL::character varying |
| data_source | text | YES |  |

### tbl_acquisition (17 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| acquisition_id | integer | NO | nextval('tbl_acquisition_acquisition_id_seq'::regc |
| project_id | integer | NO |  |
| contact_id | integer | YES |  |
| event_date | date | YES |  |
| event_type | character varying | YES |  |
| description | text | YES |  |
| amount | numeric | YES |  |
| is_applied_to_purchase | boolean | YES | true |
| units_conveyed | numeric | YES |  |
| measure_id | integer | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| goes_hard_date | date | YES |  |
| is_conditional | boolean | YES | false |
| category_id | integer | YES |  |
| subcategory_id | integer | YES |  |

### tbl_acreage_allocation (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| allocation_id | integer | NO | nextval('tbl_acreage_allocation_allocation_id_seq' |
| project_id | bigint | NO |  |
| phase_id | bigint | YES |  |
| parcel_id | bigint | YES |  |
| allocation_type_id | integer | YES |  |
| allocation_type_code | character varying | YES |  |
| acres | numeric | NO |  |
| source_doc_id | bigint | YES |  |
| source_page | integer | YES |  |
| source_snippet | text | YES |  |
| confidence_score | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| created_by | text | YES |  |
| value_source | character varying | YES |  |

### tbl_additional_income (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| additional_income_id | integer | NO |  |
| lease_id | integer | NO |  |
| parking_spaces | integer | YES | 0 |
| parking_rate_monthly | numeric | YES |  |
| parking_annual | numeric | YES |  |
| other_income | jsonb | YES | '[]'::jsonb |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_ai_adjustment_suggestions (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ai_suggestion_id | integer | NO | nextval('tbl_ai_adjustment_suggestions_ai_suggesti |
| comparable_id | integer | NO |  |
| adjustment_type | character varying | NO |  |
| suggested_pct | numeric | YES |  |
| confidence_level | character varying | YES |  |
| justification | text | YES |  |
| model_version | character varying | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### tbl_alpha_feedback (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('tbl_alpha_feedback_id_seq'::regclass) |
| page_context | character varying | YES |  |
| project_id | integer | YES |  |
| user_id | integer | YES |  |
| feedback | text | NO |  |
| status | character varying | YES | 'new'::character varying |
| notes | text | YES |  |
| submitted_at | timestamp without time zone | YES | now() |
| created_at | timestamp without time zone | YES | now() |

### tbl_analysis_draft (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| draft_id | bigint | NO | nextval('tbl_analysis_draft_draft_id_seq'::regclas |
| user_id | bigint | NO |  |
| draft_name | character varying | YES |  |
| property_type | character varying | YES |  |
| perspective | character varying | YES |  |
| purpose | character varying | YES |  |
| value_add_enabled | boolean | YES | false |
| inputs | jsonb | NO | '{}'::jsonb |
| calc_snapshot | jsonb | YES | '{}'::jsonb |
| address | text | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| zip_code | character varying | YES |  |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| chat_thread_id | bigint | YES |  |
| converted_project_id | bigint | YES |  |
| status | character varying | NO | 'active'::character varying |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### tbl_analysis_type_config (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| config_id | bigint | NO | nextval('tbl_analysis_type_config_config_id_seq':: |
| analysis_type | character varying | NO |  |
| tile_valuation | boolean | YES | false |
| tile_capitalization | boolean | YES | false |
| tile_returns | boolean | YES | false |
| tile_development_budget | boolean | YES | false |
| requires_capital_stack | boolean | YES | false |
| requires_comparable_sales | boolean | YES | false |
| requires_income_approach | boolean | YES | false |
| requires_cost_approach | boolean | YES | false |
| available_reports | jsonb | YES | '[]'::jsonb |
| landscaper_context | text | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| analysis_perspective | character varying | YES |  |
| analysis_purpose | character varying | YES |  |

### tbl_approval (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| approval_id | integer | NO |  |
| project_id | integer | YES |  |
| approval_type | character varying | YES |  |
| approval_date | date | YES |  |
| notes | text | YES |  |

### tbl_area (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| area_id | integer | NO |  |
| project_id | integer | NO |  |
| area_alias | character varying | NO |  |
| area_no | integer | YES |  |

### tbl_assumption_snapshot (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| snapshot_id | bigint | NO | nextval('tbl_assumption_snapshot_snapshot_id_seq': |
| scenario_log_id | bigint | NO |  |
| field | character varying | NO |  |
| table_name | character varying | NO |  |
| record_id | character varying | YES |  |
| original_value | jsonb | YES |  |
| override_value | jsonb | YES |  |
| label | character varying | YES |  |
| unit | character varying | YES |  |
| applied_at | timestamp with time zone | NO | now() |

### tbl_assumptionrule (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| rule_id | integer | NO |  |
| rule_category | character varying | YES |  |
| rule_key | character varying | YES |  |
| rule_value | text | YES |  |

### tbl_base_rent (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| base_rent_id | integer | NO |  |
| lease_id | integer | NO |  |
| period_number | integer | NO |  |
| period_start_date | date | NO |  |
| period_end_date | date | NO |  |
| rent_type | character varying | YES | 'Fixed'::character varying |
| base_rent_psf_annual | numeric | YES |  |
| base_rent_annual | numeric | YES |  |
| base_rent_monthly | numeric | YES |  |
| percentage_rent_rate | numeric | YES |  |
| percentage_rent_breakpoint | numeric | YES |  |
| percentage_rent_annual | numeric | YES |  |
| free_rent_months | integer | YES | 0 |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_benchmark_ai_suggestions (23 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| suggestion_id | bigint | NO | nextval('tbl_benchmark_ai_suggestions_suggestion_i |
| user_id | text | NO |  |
| document_id | bigint | NO |  |
| project_id | bigint | YES |  |
| extraction_date | timestamp without time zone | YES | now() |
| category | character varying | NO |  |
| subcategory | character varying | YES |  |
| suggested_name | character varying | NO |  |
| suggested_value | numeric | NO |  |
| suggested_uom | character varying | YES |  |
| market_geography | character varying | YES |  |
| property_type | character varying | YES |  |
| confidence_score | numeric | YES |  |
| extraction_context | jsonb | YES |  |
| existing_benchmark_id | bigint | YES |  |
| variance_percentage | numeric | YES |  |
| inflation_adjusted_comparison | jsonb | YES |  |
| status | character varying | YES | 'pending'::character varying |
| user_response | jsonb | YES |  |
| reviewed_at | timestamp without time zone | YES |  |
| reviewed_by | text | YES |  |
| created_benchmark_id | bigint | YES |  |
| created_at | timestamp without time zone | YES | now() |

### tbl_benchmark_contingency (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| benchmark_id | integer | NO |  |
| percentage | numeric | NO |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_benchmark_transaction_cost (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| transaction_cost_id | bigint | NO | nextval('tbl_benchmark_transaction_cost_transactio |
| benchmark_id | bigint | NO |  |
| cost_type | character varying | NO |  |
| value | numeric | YES |  |
| value_type | character varying | NO |  |
| basis | character varying | YES |  |
| deal_size_min | numeric | YES |  |
| deal_size_max | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_benchmark_unit_cost (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| unit_cost_id | bigint | NO | nextval('tbl_benchmark_unit_cost_unit_cost_id_seq' |
| benchmark_id | bigint | NO |  |
| value | numeric | NO |  |
| uom_code | character varying | NO |  |
| uom_alt_code | character varying | YES |  |
| low_value | numeric | YES |  |
| high_value | numeric | YES |  |
| cost_phase | character varying | YES |  |
| work_type | character varying | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_budget (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| budget_id | integer | NO |  |
| devphase_id | integer | YES |  |
| budget_category | text | NO |  |
| budget_subcategory | text | YES |  |
| amount | numeric | YES |  |
| source_table | character varying | YES |  |
| source_id | integer | YES |  |
| measure_id | integer | YES |  |
| cost_per_unit | numeric | YES |  |
| quantity | numeric | YES |  |
| expense_type | character varying | YES | 'Capital'::character varying |
| budget_timing_method | character varying | YES | 'Lump Sum'::character varying |

### tbl_budget_fact (17 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| budget_fact_id | integer | NO | nextval('tbl_budget_fact_budget_fact_id_seq'::regc |
| project_id | bigint | NO |  |
| phase_id | bigint | YES |  |
| category_id | bigint | YES |  |
| category_name | character varying | YES |  |
| line_item_name | character varying | YES |  |
| total_cost | numeric | YES |  |
| cost_per_unit | numeric | YES |  |
| cost_per_sf | numeric | YES |  |
| quantity | numeric | YES |  |
| unit_of_measure | character varying | YES |  |
| source_doc_id | bigint | YES |  |
| confidence_score | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| created_by | text | YES |  |

### tbl_budget_items (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| budget_item_id | integer | NO | nextval('tbl_budget_items_budget_item_id_seq'::reg |
| project_id | integer | NO |  |
| structure_id | integer | NO |  |
| amount | numeric | YES |  |
| quantity | numeric | YES |  |
| cost_per_unit | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| migrated_at | timestamp with time zone | YES |  |
| timing_method | character varying | YES | 'ABSOLUTE'::character varying |
| timing_locked | boolean | YES | false |
| s_curve_profile | character varying | YES | 'LINEAR'::character varying |
| actual_amount | numeric | YES | 0 |
| actual_quantity | numeric | YES | 0 |
| actual_period_id | bigint | YES |  |
| variance_amount | numeric | YES |  |
| variance_pct | numeric | YES |  |
| start_period | integer | YES |  |
| periods_to_complete | integer | YES |  |

### tbl_budget_structure (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| structure_id | integer | NO | nextval('tbl_budget_structure_structure_id_seq'::r |
| scope | character varying | NO |  |
| category | character varying | NO |  |
| detail | character varying | NO |  |
| cost_method | character varying | YES | '$$'::character varying |
| measure_id | integer | YES |  |
| is_system | boolean | YES | true |
| created_by | integer | YES |  |
| sort_order | integer | YES | 0 |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| start_period | integer | YES |  |
| periods_to_complete | integer | YES |  |
| migrated_at | timestamp with time zone | YES |  |

### tbl_budget_timing (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| timing_id | bigint | NO |  |
| fact_id | bigint | NO |  |
| period_id | bigint | NO |  |
| amount | numeric | NO |  |
| timing_method | character varying | YES | 'distributed'::character varying |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |

### tbl_cabinet (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| cabinet_id | bigint | NO | nextval('tbl_cabinet_cabinet_id_seq'::regclass) |
| cabinet_name | character varying | NO |  |
| owner_user_id | text | NO |  |
| cabinet_type | character varying | YES | 'standard'::character varying |
| settings | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| is_active | boolean | YES | true |

### tbl_calculation_period (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| period_id | bigint | NO |  |
| project_id | bigint | NO |  |
| period_start_date | date | NO |  |
| period_end_date | date | NO |  |
| period_type | character varying | NO |  |
| period_sequence | integer | NO |  |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| fiscal_year | integer | YES |  |
| fiscal_quarter | integer | YES |  |
| period_status | character varying | YES | 'OPEN'::character varying |
| closed_date | timestamp without time zone | YES |  |
| closed_by_user_id | bigint | YES |  |

### tbl_cap_rate_comps (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| cap_rate_comp_id | integer | NO | nextval('tbl_cap_rate_comps_cap_rate_comp_id_seq': |
| income_approach_id | integer | YES |  |
| property_address | character varying | YES |  |
| sale_price | numeric | YES |  |
| noi | numeric | YES |  |
| implied_cap_rate | numeric | YES |  |
| sale_date | date | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |

### tbl_capex_reserve (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| capex_id | bigint | NO | nextval('tbl_capex_reserve_capex_id_seq'::regclass |
| project_id | bigint | NO |  |
| capex_per_unit_annual | numeric | NO | 300 |
| immediate_capex | numeric | YES | 0 |
| roof_reserve_per_unit | numeric | YES | 50 |
| hvac_reserve_per_unit | numeric | YES | 75 |
| appliance_reserve_per_unit | numeric | YES | 100 |
| other_reserve_per_unit | numeric | YES | 75 |
| roof_replacement_year | integer | YES |  |
| roof_replacement_cost | numeric | YES |  |
| hvac_replacement_cycle_years | integer | YES | 15 |
| hvac_replacement_cost_per_unit | numeric | YES |  |
| parking_lot_reseal_year | integer | YES |  |
| parking_lot_reseal_cost | numeric | YES |  |
| exterior_paint_cycle_years | integer | YES | 7 |
| exterior_paint_cost | numeric | YES |  |
| elevator_modernization_cost | numeric | YES |  |
| unit_renovation_per_turn | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_capital_call (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| capital_call_id | bigint | NO | nextval('tbl_capital_call_capital_call_id_seq'::re |
| project_id | bigint | NO |  |
| period_id | bigint | YES |  |
| call_amount | numeric | NO |  |
| call_date | date | YES |  |
| call_purpose | character varying | YES |  |
| lp_amount | numeric | YES |  |
| gp_amount | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_capital_reserves (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| reserve_id | bigint | NO | nextval('tbl_capital_reserves_reserve_id_seq'::reg |
| project_id | bigint | NO |  |
| reserve_type | character varying | NO |  |
| reserve_name | character varying | NO |  |
| trigger_type | character varying | NO |  |
| trigger_lease_id | bigint | YES |  |
| trigger_period | integer | YES |  |
| amount | numeric | NO |  |
| amount_per_sf | numeric | YES |  |
| recurrence_frequency_months | integer | YES |  |
| recurrence_end_period | integer | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_capitalization (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| capitalization_id | integer | NO |  |
| project_id | integer | YES |  |
| capital_source | text | NO |  |
| amount | numeric | YES |  |
| notes | text | YES |  |

### tbl_cashflow (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| cashflow_id | integer | NO |  |
| project_id | integer | NO |  |
| period_id | integer | NO |  |
| parcel_id | integer | YES |  |
| phase_id | integer | YES |  |
| lot_id | integer | YES |  |
| lease_id | integer | YES |  |
| cashflow_category | character varying | NO |  |
| cashflow_subcategory | character varying | YES |  |
| amount | numeric | NO |  |
| cumulative_amount | numeric | YES |  |
| calculation_method | character varying | YES |  |
| source_table | character varying | YES |  |
| source_id | integer | YES |  |
| calculated_at | timestamp with time zone | YES | now() |

### tbl_cashflow_summary (21 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| summary_id | integer | NO |  |
| project_id | integer | NO |  |
| period_id | integer | NO |  |
| gross_revenue | numeric | YES | 0 |
| vacancy_loss | numeric | YES | 0 |
| credit_loss | numeric | YES | 0 |
| effective_gross_income | numeric | YES | 0 |
| operating_expenses | numeric | YES | 0 |
| net_operating_income | numeric | YES | 0 |
| capital_expenditures | numeric | YES | 0 |
| tenant_improvements | numeric | YES | 0 |
| leasing_commissions | numeric | YES | 0 |
| debt_service | numeric | YES | 0 |
| interest_expense | numeric | YES | 0 |
| principal_payment | numeric | YES | 0 |
| cash_flow_before_tax | numeric | YES | 0 |
| equity_contributions | numeric | YES | 0 |
| equity_distributions | numeric | YES | 0 |
| net_cash_flow | numeric | YES | 0 |
| cumulative_net_cash_flow | numeric | YES | 0 |
| calculated_at | timestamp with time zone | YES | now() |

### tbl_changelog (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| changelog_id | integer | NO |  |
| version | character varying | NO |  |
| deployed_at | timestamp with time zone | NO |  |
| auto_generated_notes | text | YES |  |
| published_notes | text | YES |  |
| is_published | boolean | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |

### tbl_closing_event (24 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| closing_id | bigint | NO | nextval('tbl_closing_event_closing_id_seq'::regcla |
| sale_event_id | bigint | NO |  |
| closing_sequence | integer | NO |  |
| closing_date | date | NO |  |
| lots_closed | integer | NO |  |
| base_price_per_unit | numeric | YES |  |
| inflated_price_per_unit | numeric | YES |  |
| uom_code | character varying | YES |  |
| gross_proceeds | numeric | YES |  |
| gross_value | numeric | YES |  |
| onsite_costs | numeric | YES |  |
| less_commissions_amount | numeric | YES |  |
| commission_amount | numeric | YES |  |
| less_closing_costs | numeric | YES |  |
| closing_costs | numeric | YES |  |
| less_improvements_credit | numeric | YES |  |
| net_proceeds | numeric | YES |  |
| cumulative_lots_closed | integer | YES |  |
| lots_remaining | integer | YES |  |
| escrow_release_amount | numeric | YES |  |
| escrow_release_date | date | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_commercial_lease (30 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lease_id | integer | NO | nextval('tbl_cre_lease_lease_id_seq'::regclass) |
| income_property_id | integer | YES |  |
| space_id | integer | YES |  |
| tenant_id | integer | YES |  |
| lease_number | character varying | YES |  |
| lease_type | character varying | YES |  |
| lease_status | character varying | YES |  |
| lease_execution_date | date | YES |  |
| lease_commencement_date | date | YES |  |
| rent_commencement_date | date | YES |  |
| lease_expiration_date | date | YES |  |
| lease_term_months | integer | YES |  |
| leased_sf | numeric | YES |  |
| number_of_options | integer | YES |  |
| option_term_months | integer | YES |  |
| option_notice_months | integer | YES |  |
| early_termination_allowed | boolean | YES | false |
| termination_notice_months | integer | YES |  |
| termination_penalty_amount | numeric | YES |  |
| security_deposit_amount | numeric | YES |  |
| security_deposit_months | numeric | YES |  |
| expansion_rights | boolean | YES | false |
| right_of_first_refusal | boolean | YES | false |
| exclusive_use_clause | text | YES |  |
| co_tenancy_clause | text | YES |  |
| radius_restriction | text | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| lease_type_code | character varying | YES | 'CRE'::character varying |

### tbl_contact (26 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| contact_id | bigint | NO | nextval('tbl_contact_contact_id_seq'::regclass) |
| cabinet_id | bigint | NO |  |
| contact_type | character varying | NO |  |
| name | character varying | NO |  |
| display_name | character varying | YES |  |
| first_name | character varying | YES |  |
| last_name | character varying | YES |  |
| title | character varying | YES |  |
| company_name | character varying | YES |  |
| entity_type | character varying | YES |  |
| email | character varying | YES |  |
| phone | character varying | YES |  |
| phone_mobile | character varying | YES |  |
| address_line1 | character varying | YES |  |
| address_line2 | character varying | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| postal_code | character varying | YES |  |
| country | character varying | YES | 'United States'::character varying |
| notes | text | YES |  |
| tags | jsonb | YES | '[]'::jsonb |
| custom_fields | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_by | text | YES |  |
| is_active | boolean | YES | true |

### tbl_contact_relationship (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| relationship_id | bigint | NO | nextval('tbl_contact_relationship_relationship_id_ |
| cabinet_id | bigint | NO |  |
| contact_id | bigint | NO |  |
| related_to_id | bigint | NO |  |
| relationship_type | character varying | NO |  |
| role_title | character varying | YES |  |
| start_date | date | YES |  |
| end_date | date | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### tbl_contact_role (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| role_id | integer | NO | nextval('tbl_contact_role_role_id_seq'::regclass) |
| cabinet_id | bigint | YES |  |
| role_code | character varying | NO |  |
| role_label | character varying | NO |  |
| role_category | character varying | NO |  |
| typical_contact_types | jsonb | YES | '["Company", "Entity", "Person"]'::jsonb |
| description | text | YES |  |
| display_order | integer | YES | 100 |
| is_system | boolean | YES | false |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### tbl_cost_allocation (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| allocation_id | bigint | NO | nextval('tbl_cost_allocation_allocation_id_seq'::r |
| finance_structure_id | bigint | NO |  |
| container_id | bigint | NO |  |
| allocation_percentage | numeric | NO |  |
| allocation_basis | character varying | YES |  |
| allocated_budget_amount | numeric | YES |  |
| spent_to_date | numeric | YES | 0 |
| cost_to_complete | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| scenario_id | integer | YES |  |

### tbl_cost_approach (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| cost_approach_id | integer | NO | nextval('tbl_cost_approach_cost_approach_id_seq':: |
| project_id | integer | NO |  |
| land_valuation_method | character varying | YES |  |
| land_area_sf | numeric | YES |  |
| land_value_per_sf | numeric | YES |  |
| total_land_value | numeric | YES |  |
| cost_method | character varying | YES |  |
| building_area_sf | numeric | YES |  |
| cost_per_sf | numeric | YES |  |
| base_replacement_cost | numeric | YES |  |
| entrepreneurial_incentive_pct | numeric | YES |  |
| total_replacement_cost | numeric | YES |  |
| physical_curable | numeric | YES |  |
| physical_incurable_short | numeric | YES |  |
| physical_incurable_long | numeric | YES |  |
| functional_curable | numeric | YES |  |
| functional_incurable | numeric | YES |  |
| external_obsolescence | numeric | YES |  |
| total_depreciation | numeric | YES |  |
| depreciated_improvements | numeric | YES |  |
| site_improvements_cost | numeric | YES |  |
| site_improvements_description | text | YES |  |
| indicated_value | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_cost_approach_depreciation (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| depreciation_id | integer | NO |  |
| physical_curable | numeric | NO |  |
| physical_incurable_short | numeric | NO |  |
| physical_incurable_long | numeric | NO |  |
| functional_curable | numeric | NO |  |
| functional_incurable | numeric | NO |  |
| external_obsolescence | numeric | NO |  |
| effective_age_years | integer | YES |  |
| remaining_life_years | integer | YES |  |
| depreciation_method | character varying | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| project_id | integer | NO |  |

### tbl_dcf_analysis (24 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| dcf_analysis_id | bigint | NO | nextval('tbl_dcf_analysis_dcf_analysis_id_seq'::re |
| project_id | bigint | NO |  |
| property_type | character varying | NO |  |
| hold_period_years | integer | YES |  |
| discount_rate | numeric | YES |  |
| exit_cap_rate | numeric | YES |  |
| selling_costs_pct | numeric | YES |  |
| going_in_cap_rate | numeric | YES |  |
| cap_rate_method | character varying | YES |  |
| sensitivity_interval | numeric | YES |  |
| vacancy_rate | numeric | YES |  |
| stabilized_vacancy | numeric | YES |  |
| credit_loss | numeric | YES |  |
| management_fee_pct | numeric | YES |  |
| reserves_per_unit | numeric | YES |  |
| income_growth_set_id | integer | YES |  |
| expense_growth_set_id | integer | YES |  |
| price_growth_set_id | integer | YES |  |
| cost_inflation_set_id | integer | YES |  |
| bulk_sale_enabled | boolean | YES | false |
| bulk_sale_period | integer | YES |  |
| bulk_sale_discount_pct | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_debt_draw_schedule (30 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| draw_id | bigint | NO |  |
| loan_id | bigint | NO |  |
| period_id | bigint | NO |  |
| draw_number | integer | YES |  |
| draw_amount | numeric | YES |  |
| cumulative_drawn | numeric | YES |  |
| available_remaining | numeric | YES |  |
| beginning_balance | numeric | YES |  |
| ending_balance | numeric | YES |  |
| draw_date | date | YES |  |
| draw_purpose | character varying | YES |  |
| draw_status | character varying | YES | 'PROJECTED'::character varying |
| interest_rate_pct | numeric | YES |  |
| interest_amount | numeric | YES |  |
| interest_expense | numeric | YES |  |
| interest_paid | numeric | YES |  |
| deferred_interest | numeric | YES | 0 |
| cumulative_interest | numeric | YES |  |
| principal_payment | numeric | YES |  |
| outstanding_balance | numeric | YES |  |
| unused_fee_charge | numeric | YES | 0 |
| commitment_fee_charge | numeric | YES | 0 |
| other_fees | numeric | YES | 0 |
| request_date | date | YES |  |
| approval_date | date | YES |  |
| funding_date | date | YES |  |
| inspector_approval | boolean | YES |  |
| lender_approval | boolean | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_division (18 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| division_id | bigint | NO |  |
| project_id | bigint | NO |  |
| parent_division_id | bigint | YES |  |
| tier | integer | NO |  |
| division_code | character varying | NO |  |
| display_name | character varying | NO |  |
| sort_order | integer | YES | 0 |
| attributes | jsonb | YES |  |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| sale_phase_code | character varying | YES |  |
| custom_sale_date | date | YES |  |
| has_sale_overrides | boolean | YES | false |
| option_deposit_pct | numeric | YES |  |
| option_deposit_cap_pct | numeric | YES |  |
| retail_lot_price | numeric | YES |  |
| premium_pct | numeric | YES |  |

### tbl_document_project (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| document_project_id | bigint | NO | nextval('tbl_document_project_document_project_id_ |
| document_id | bigint | NO |  |
| project_id | bigint | NO |  |
| relationship_type | character varying | YES | 'attached'::character varying |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_by | text | YES |  |

### tbl_dynamic_column_definition (17 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| table_name | character varying | NO |  |
| column_key | character varying | NO |  |
| display_label | character varying | NO |  |
| data_type | character varying | NO |  |
| format_pattern | character varying | YES |  |
| source | character varying | NO |  |
| created_at | timestamp with time zone | NO |  |
| is_active | boolean | NO |  |
| is_proposed | boolean | NO |  |
| display_order | integer | NO |  |
| created_by_id | bigint | YES |  |
| project_id | integer | NO |  |
| proposed_from_document_id | bigint | YES |  |
| scope | character varying | YES |  |
| is_calculable | boolean | NO | false |
| created_from_doc_id | bigint | YES |  |

### tbl_dynamic_column_value (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| row_id | integer | NO |  |
| value_text | text | YES |  |
| value_number | numeric | YES |  |
| value_boolean | boolean | YES |  |
| value_date | date | YES |  |
| confidence | double precision | YES |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| column_definition_id | bigint | NO |  |
| extracted_from_id | bigint | YES |  |

### tbl_equity (43 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| equity_id | integer | NO |  |
| project_id | integer | NO |  |
| equity_name | character varying | NO |  |
| equity_class | character varying | NO |  |
| equity_tier | integer | YES | 1 |
| commitment_amount | numeric | NO |  |
| funded_amount | numeric | YES | 0 |
| preferred_return_pct | numeric | YES |  |
| preferred_return_compounds | boolean | YES | false |
| promote_pct | numeric | YES |  |
| promote_tier_2_threshold | numeric | YES |  |
| promote_tier_2_pct | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| partner_type | character varying | YES |  |
| partner_name | character varying | YES |  |
| ownership_pct | numeric | YES | 0 |
| capital_contributed | numeric | YES | 0 |
| unreturned_capital | numeric | YES | 0 |
| cumulative_distributions | numeric | YES | 0 |
| accrued_preferred_return | numeric | YES | 0 |
| preferred_return_paid_to_date | numeric | YES | 0 |
| catch_up_pct | numeric | YES |  |
| promote_trigger_type | character varying | YES | 'irr'::character varying |
| promote_tier_1_threshold | numeric | YES |  |
| promote_tier_3_threshold | numeric | YES |  |
| promote_tier_3_pct | numeric | YES |  |
| irr_target_pct | numeric | YES |  |
| equity_multiple_target | numeric | YES |  |
| cash_on_cash_target_pct | numeric | YES |  |
| distribution_frequency | character varying | YES | 'Quarterly'::character varying |
| distribution_priority | integer | YES |  |
| can_defer_distributions | boolean | YES | false |
| management_fee_pct | numeric | YES |  |
| management_fee_base | character varying | YES | 'equity'::character varying |
| acquisition_fee_pct | numeric | YES |  |
| disposition_fee_pct | numeric | YES |  |
| promote_fee_pct | numeric | YES |  |
| has_clawback | boolean | YES | false |
| clawback_threshold_pct | numeric | YES |  |
| has_lookback | boolean | YES | true |
| lookback_at_sale | boolean | YES | true |

### tbl_equity_distribution (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| distribution_id | bigint | NO | nextval('tbl_equity_distribution_distribution_id_s |
| partner_id | bigint | NO |  |
| period_id | bigint | YES |  |
| distribution_type | character varying | NO |  |
| amount | numeric | NO |  |
| cumulative_amount | numeric | YES |  |
| unpaid_preferred_return | numeric | YES | 0 |
| distribution_date | date | YES |  |
| distribution_status | character varying | YES | 'PROJECTED'::character varying |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |

### tbl_equity_partner (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| partner_id | bigint | NO | nextval('tbl_equity_partner_partner_id_seq'::regcl |
| project_id | bigint | NO |  |
| partner_name | character varying | NO |  |
| partner_class | character varying | NO |  |
| ownership_pct | numeric | YES |  |
| committed_capital | numeric | YES |  |
| preferred_return_pct | numeric | YES |  |
| promote_pct | numeric | YES |  |
| hurdle_irr_pct | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_equity_structure (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| equity_structure_id | bigint | NO | nextval('tbl_equity_structure_equity_structure_id_ |
| project_id | bigint | NO |  |
| lp_ownership_pct | numeric | NO |  |
| gp_ownership_pct | numeric | NO |  |
| preferred_return_pct | numeric | NO | 0.08 |
| gp_promote_after_pref | numeric | YES | 0.20 |
| catch_up_pct | numeric | YES |  |
| equity_multiple_target | numeric | YES |  |
| irr_target_pct | numeric | YES |  |
| distribution_frequency | character varying | YES | 'Quarterly'::character varying |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_escalation (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| escalation_id | integer | NO |  |
| lease_id | integer | NO |  |
| escalation_type | character varying | NO |  |
| escalation_pct | numeric | YES |  |
| escalation_frequency | character varying | YES | 'Annual'::character varying |
| compound_escalation | boolean | YES | true |
| cpi_index | character varying | YES |  |
| cpi_floor_pct | numeric | YES |  |
| cpi_cap_pct | numeric | YES |  |
| tenant_cpi_share_pct | numeric | YES | 100.00 |
| annual_increase_amount | numeric | YES |  |
| step_schedule | jsonb | YES |  |
| first_escalation_date | date | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_expansion_option (23 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| expansion_option_id | integer | NO | nextval('tbl_expansion_option_expansion_option_id_ |
| lease_id | integer | NO |  |
| option_type | character varying | YES |  |
| target_space_id | integer | YES |  |
| target_space_description | character varying | YES |  |
| expansion_sf_min | numeric | YES |  |
| expansion_sf_max | numeric | YES |  |
| option_start_date | date | YES |  |
| option_end_date | date | YES |  |
| must_take_date | date | YES |  |
| notice_period_days | integer | YES |  |
| landlord_notice_required | boolean | YES | false |
| response_period_days | integer | YES |  |
| expansion_rent_method | character varying | YES |  |
| expansion_rent_psf | numeric | YES |  |
| expansion_rent_spread_psf | numeric | YES |  |
| option_exercised | boolean | YES | false |
| exercise_date | date | YES |  |
| exercised_space_id | integer | YES |  |
| exercised_sf | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_expense_detail (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| expense_detail_id | bigint | NO | nextval('tbl_expense_detail_expense_detail_id_seq' |
| project_id | bigint | NO |  |
| expense_id | bigint | YES |  |
| expense_category | character varying | NO |  |
| expense_subcategory | character varying | YES |  |
| amount_annual | numeric | NO |  |
| per_unit_monthly | numeric | YES |  |
| per_sf_annual | numeric | YES |  |
| escalation_pct | numeric | YES | 0.03 |
| escalation_start_year | integer | YES | 1 |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_expense_recovery (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| expense_recovery_id | integer | NO | nextval('tbl_expense_recovery_expense_recovery_id_ |
| lease_id | integer | YES |  |
| recovery_structure | character varying | YES |  |
| recovery_method | character varying | YES |  |
| property_tax_recovery_pct | numeric | YES | 0 |
| insurance_recovery_pct | numeric | YES | 0 |
| cam_recovery_pct | numeric | YES | 0 |
| utilities_recovery_pct | numeric | YES | 0 |
| expense_cap_psf | numeric | YES |  |
| expense_cap_escalation_pct | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |

### tbl_extraction_job (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| job_id | bigint | NO |  |
| project_id | bigint | NO |  |
| document_id | bigint | NO |  |
| scope | character varying | NO |  |
| status | character varying | NO |  |
| total_items | integer | YES |  |
| processed_items | integer | NO |  |
| created_at | timestamp with time zone | NO |  |
| started_at | timestamp with time zone | YES |  |
| completed_at | timestamp with time zone | YES |  |
| error_message | text | YES |  |
| result_summary | jsonb | YES |  |
| created_by_id | bigint | YES |  |

### tbl_extraction_log (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| log_id | integer | NO | nextval('tbl_extraction_log_log_id_seq'::regclass) |
| mapping_id | integer | YES |  |
| project_id | integer | YES |  |
| doc_id | integer | YES |  |
| source_pattern_matched | character varying | YES |  |
| extracted_value | text | YES |  |
| transformed_value | text | YES |  |
| previous_value | text | YES |  |
| confidence_score | numeric | YES |  |
| extraction_context | text | YES |  |
| was_written | boolean | NO | false |
| was_accepted | boolean | YES |  |
| rejection_reason | text | YES |  |
| extracted_at | timestamp with time zone | YES | now() |
| reviewed_at | timestamp with time zone | YES |  |
| reviewed_by | integer | YES |  |

### tbl_extraction_mapping (19 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| mapping_id | integer | NO | nextval('tbl_extraction_mapping_mapping_id_seq'::r |
| document_type | character varying | NO |  |
| source_pattern | character varying | NO |  |
| source_aliases | jsonb | YES |  |
| target_table | character varying | NO |  |
| target_field | character varying | NO |  |
| data_type | character varying | NO | 'text'::character varying |
| transform_rule | character varying | YES |  |
| confidence | character varying | NO | 'Medium'::character varying |
| auto_write | boolean | NO | true |
| overwrite_existing | boolean | NO | false |
| is_active | boolean | NO | true |
| is_system | boolean | NO | true |
| notes | text | YES |  |
| created_by | integer | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_by | integer | YES |  |
| updated_at | timestamp with time zone | YES | now() |
| applicable_tags | jsonb | YES | '[]'::jsonb |

### tbl_field_catalog (21 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| field_id | bigint | NO | nextval('tbl_field_catalog_field_id_seq'::regclass |
| table_name | character varying | NO |  |
| field_name | character varying | NO |  |
| display_name | character varying | YES |  |
| description | text | YES |  |
| data_type | character varying | NO |  |
| is_editable | boolean | YES | true |
| is_required | boolean | YES | false |
| is_calculated | boolean | YES | false |
| calculation_source | text | YES |  |
| valid_values | jsonb | YES |  |
| default_value | text | YES |  |
| unit_of_measure | character varying | YES |  |
| min_value | numeric | YES |  |
| max_value | numeric | YES |  |
| field_group | character varying | YES |  |
| display_order | integer | YES | 0 |
| applies_to_types | ARRAY | YES |  |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### tbl_finance_structure (18 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| finance_structure_id | bigint | NO | nextval('tbl_finance_structure_finance_structure_i |
| project_id | bigint | NO |  |
| structure_code | character varying | NO |  |
| structure_name | character varying | NO |  |
| description | text | YES |  |
| structure_type | character varying | NO |  |
| total_budget_amount | numeric | YES |  |
| budget_category | character varying | YES |  |
| is_recurring | boolean | YES | false |
| recurrence_frequency | character varying | YES |  |
| annual_amount | numeric | YES |  |
| allocation_method | character varying | NO |  |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| created_by | character varying | YES |  |
| updated_by | character varying | YES |  |
| scenario_id | integer | YES |  |

### tbl_global_benchmark_registry (23 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| benchmark_id | bigint | NO | nextval('tbl_global_benchmark_registry_benchmark_i |
| user_id | text | NO |  |
| category | character varying | NO |  |
| subcategory | character varying | YES |  |
| benchmark_name | character varying | NO |  |
| description | text | YES |  |
| market_geography | character varying | YES |  |
| property_type | character varying | YES |  |
| source_type | character varying | NO |  |
| source_document_id | bigint | YES |  |
| source_project_id | bigint | YES |  |
| extraction_date | date | YES |  |
| confidence_level | character varying | YES | 'medium'::character varying |
| usage_count | integer | YES | 0 |
| as_of_date | date | NO | CURRENT_DATE |
| cpi_index_value | numeric | YES |  |
| context_metadata | jsonb | YES |  |
| is_active | boolean | YES | true |
| is_global | boolean | YES | false |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| created_by | text | YES |  |
| updated_by | text | YES |  |

### tbl_hbu_analysis (39 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| hbu_id | bigint | NO | nextval('tbl_hbu_analysis_hbu_id_seq'::regclass) |
| project_id | bigint | NO |  |
| scenario_name | character varying | NO |  |
| scenario_type | character varying | NO |  |
| legal_permissible | boolean | YES |  |
| legal_zoning_code | character varying | YES |  |
| legal_zoning_source_doc_id | bigint | YES |  |
| legal_permitted_uses | jsonb | YES |  |
| legal_requires_variance | boolean | YES | false |
| legal_variance_type | character varying | YES |  |
| legal_narrative | text | YES |  |
| physical_possible | boolean | YES |  |
| physical_site_adequate | boolean | YES |  |
| physical_topography_suitable | boolean | YES |  |
| physical_utilities_available | boolean | YES |  |
| physical_access_adequate | boolean | YES |  |
| physical_constraints | jsonb | YES |  |
| physical_narrative | text | YES |  |
| economic_feasible | boolean | YES |  |
| economic_development_cost | numeric | YES |  |
| economic_stabilized_value | numeric | YES |  |
| economic_residual_land_value | numeric | YES |  |
| economic_profit_margin_pct | numeric | YES |  |
| economic_irr_pct | numeric | YES |  |
| economic_feasibility_threshold | character varying | YES |  |
| economic_narrative | text | YES |  |
| is_maximally_productive | boolean | YES | false |
| productivity_rank | integer | YES |  |
| productivity_metric | character varying | YES |  |
| productivity_narrative | text | YES |  |
| conclusion_use_type | character varying | YES |  |
| conclusion_density | character varying | YES |  |
| conclusion_summary | text | YES |  |
| conclusion_full_narrative | text | YES |  |
| status | character varying | YES | 'draft'::character varying |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| created_by | text | YES |  |
| updated_by | text | YES |  |

### tbl_hbu_comparable_use (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| comparable_use_id | bigint | NO | nextval('tbl_hbu_comparable_use_comparable_use_id_ |
| hbu_id | bigint | NO |  |
| use_name | character varying | NO |  |
| use_category | character varying | YES |  |
| is_legally_permissible | boolean | YES |  |
| is_physically_possible | boolean | YES |  |
| is_economically_feasible | boolean | YES |  |
| proposed_density | character varying | YES |  |
| development_cost | numeric | YES |  |
| stabilized_value | numeric | YES |  |
| residual_land_value | numeric | YES |  |
| irr_pct | numeric | YES |  |
| feasibility_rank | integer | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### tbl_hbu_zoning_document (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| zoning_doc_id | bigint | NO | nextval('tbl_hbu_zoning_document_zoning_doc_id_seq |
| hbu_id | bigint | NO |  |
| document_id | bigint | NO |  |
| jurisdiction_name | character varying | YES |  |
| zoning_designation | character varying | YES |  |
| permitted_uses_extracted | jsonb | YES |  |
| conditional_uses_extracted | jsonb | YES |  |
| prohibited_uses_extracted | jsonb | YES |  |
| development_standards_extracted | jsonb | YES |  |
| extraction_confidence | numeric | YES |  |
| extraction_date | timestamp with time zone | YES |  |
| user_verified | boolean | YES | false |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### tbl_help_conversation (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('tbl_help_conversation_id_seq'::regclass) |
| user_id | integer | YES |  |
| conversation_id | uuid | NO | gen_random_uuid() |
| created_at | timestamp without time zone | NO | now() |
| updated_at | timestamp without time zone | NO | now() |

### tbl_help_message (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('tbl_help_message_id_seq'::regclass) |
| conversation_id | integer | NO |  |
| role | character varying | NO |  |
| content | text | NO |  |
| current_page | character varying | YES |  |
| created_at | timestamp without time zone | NO | now() |

### tbl_ic_challenge (21 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ic_challenge_id | bigint | NO | nextval('tbl_ic_challenge_ic_challenge_id_seq'::re |
| ic_session_id | bigint | NO |  |
| challenge_index | integer | NO |  |
| assumption_key | character varying | NO |  |
| label | character varying | YES |  |
| current_value | numeric | YES |  |
| suggested_value | numeric | YES |  |
| unit | character varying | YES |  |
| benchmark_mean | numeric | YES |  |
| benchmark_std | numeric | YES |  |
| deviation_score | numeric | YES |  |
| percentile_desc | character varying | YES |  |
| challenge_text | text | YES |  |
| status | character varying | NO | 'pending'::character varying |
| user_response | text | YES |  |
| user_value | numeric | YES |  |
| whatif_scenario_log_id | bigint | YES |  |
| impact_deltas | jsonb | YES | '{}'::jsonb |
| presented_at | timestamp with time zone | YES |  |
| responded_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | NO | now() |

### tbl_ic_session (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| ic_session_id | bigint | NO | nextval('tbl_ic_session_ic_session_id_seq'::regcla |
| project_id | integer | NO |  |
| scenario_log_id | bigint | YES |  |
| thread_id | uuid | YES |  |
| aggressiveness | integer | NO | 5 |
| status | character varying | NO | 'active'::character varying |
| total_assumptions_scanned | integer | YES | 0 |
| total_challenges | integer | YES | 0 |
| challenges_presented | integer | YES | 0 |
| baseline_snapshot | jsonb | YES | '{}'::jsonb |
| summary | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| completed_at | timestamp with time zone | YES |  |

### tbl_income_approach (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| income_approach_id | integer | NO | nextval('tbl_income_approach_income_approach_id_se |
| project_id | integer | NO |  |
| market_cap_rate_method | character varying | YES |  |
| selected_cap_rate | numeric | YES |  |
| cap_rate_justification | text | YES |  |
| direct_cap_value | numeric | YES |  |
| forecast_period_years | integer | YES |  |
| terminal_cap_rate | numeric | YES |  |
| discount_rate | numeric | YES |  |
| dcf_value | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| noi_capitalization_basis | character varying | YES | 'forward_12'::character varying |
| stabilized_vacancy_rate | numeric | YES | 0.05 |
| cap_rate_interval | numeric | YES | 0.0050 |
| discount_rate_interval | numeric | YES | 0.0050 |
| band_mortgage_ltv | numeric | YES | NULL::numeric |
| band_mortgage_rate | numeric | YES | NULL::numeric |
| band_amortization_years | integer | YES |  |
| band_equity_dividend_rate | numeric | YES | NULL::numeric |

### tbl_income_property (26 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| income_property_id | integer | NO | nextval('tbl_income_property_income_property_id_se |
| project_id | integer | YES |  |
| parcel_id | integer | YES |  |
| property_name | character varying | YES |  |
| property_type | character varying | YES |  |
| property_subtype | character varying | YES |  |
| total_building_sf | numeric | YES |  |
| rentable_sf | numeric | YES |  |
| usable_sf | numeric | YES |  |
| common_area_sf | numeric | YES |  |
| load_factor | numeric | YES |  |
| year_built | integer | YES |  |
| year_renovated | integer | YES |  |
| number_of_floors | integer | YES |  |
| number_of_units | integer | YES |  |
| parking_spaces | integer | YES |  |
| parking_ratio | numeric | YES |  |
| property_status | character varying | YES |  |
| stabilization_date | date | YES |  |
| stabilized_occupancy_pct | numeric | YES |  |
| acquisition_date | date | YES |  |
| acquisition_price | numeric | YES |  |
| current_assessed_value | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| property_type_code | character varying | YES | 'CRE'::character varying |

### tbl_income_property_ind_ext (42 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| income_property_id | integer | NO |  |
| industrial_type | character varying | YES |  |
| building_class | character varying | YES |  |
| clear_height_ft | numeric | YES |  |
| min_clear_height_ft | numeric | YES |  |
| column_spacing | character varying | YES |  |
| floor_thickness_inches | numeric | YES |  |
| floor_load_psf | numeric | YES |  |
| dock_high_doors | integer | YES | 0 |
| grade_level_doors | integer | YES | 0 |
| drive_in_doors | integer | YES | 0 |
| dock_door_ratio | numeric | YES |  |
| dock_levelers | integer | YES | 0 |
| dock_seals | integer | YES | 0 |
| truck_court_depth_ft | numeric | YES |  |
| trailer_parking_spaces | integer | YES | 0 |
| auto_parking_spaces | integer | YES | 0 |
| secured_truck_yard | boolean | YES | false |
| electrical_service | character varying | YES |  |
| electrical_amps | integer | YES |  |
| electrical_volts | integer | YES |  |
| backup_generator | boolean | YES | false |
| generator_kw | integer | YES |  |
| sprinkler_system | character varying | YES |  |
| sprinkler_density | character varying | YES |  |
| fire_pump | boolean | YES | false |
| fire_pump_gpm | integer | YES |  |
| hvac_type | character varying | YES |  |
| office_hvac_tons | integer | YES |  |
| warehouse_hvac_tons | integer | YES |  |
| rail_served | boolean | YES | false |
| rail_car_capacity | integer | YES |  |
| rail_siding_ft | numeric | YES |  |
| phase_1_date | date | YES |  |
| phase_2_required | boolean | YES | false |
| environmental_issues | text | YES |  |
| food_grade | boolean | YES | false |
| pharma_grade | boolean | YES | false |
| temperature_controlled | boolean | YES | false |
| temperature_zones | integer | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_income_property_mf_ext (37 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| income_property_id | integer | NO |  |
| total_units | integer | YES |  |
| total_bedrooms | integer | YES |  |
| avg_unit_sf | numeric | YES |  |
| studio_count | integer | YES | 0 |
| one_bed_count | integer | YES | 0 |
| two_bed_count | integer | YES | 0 |
| three_bed_count | integer | YES | 0 |
| four_plus_bed_count | integer | YES | 0 |
| has_pool | boolean | YES | false |
| has_fitness_center | boolean | YES | false |
| has_clubhouse | boolean | YES | false |
| has_business_center | boolean | YES | false |
| has_pet_park | boolean | YES | false |
| has_ev_charging | boolean | YES | false |
| has_package_lockers | boolean | YES | false |
| has_controlled_access | boolean | YES | false |
| surface_parking_spaces | integer | YES | 0 |
| covered_parking_spaces | integer | YES | 0 |
| garage_parking_spaces | integer | YES | 0 |
| parking_revenue_monthly | numeric | YES |  |
| utility_billing_type | character varying | YES |  |
| water_metering | character varying | YES |  |
| electric_metering | character varying | YES |  |
| gas_metering | character varying | YES |  |
| class_rating | character varying | YES |  |
| repositioning_potential | boolean | YES | false |
| value_add_score | integer | YES |  |
| is_rent_controlled | boolean | YES | false |
| rent_control_jurisdiction | character varying | YES |  |
| allowable_annual_increase_pct | numeric | YES |  |
| has_affordable_units | boolean | YES | false |
| affordable_unit_count | integer | YES | 0 |
| lihtc_expiration_date | date | YES |  |
| section_8_contract_date | date | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_income_property_ret_ext (32 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| income_property_id | integer | NO |  |
| retail_type | character varying | YES |  |
| anchor_count | integer | YES | 0 |
| junior_anchor_count | integer | YES | 0 |
| inline_shop_count | integer | YES |  |
| pad_site_count | integer | YES | 0 |
| outparcel_count | integer | YES | 0 |
| daily_traffic_count | integer | YES |  |
| traffic_count_date | date | YES |  |
| signalized_intersection | boolean | YES | false |
| highway_visibility | boolean | YES | false |
| pylon_sign | boolean | YES | false |
| monument_sign | boolean | YES | false |
| population_1_mile | integer | YES |  |
| population_3_mile | integer | YES |  |
| population_5_mile | integer | YES |  |
| median_hh_income_3_mile | numeric | YES |  |
| daytime_population_3_mile | integer | YES |  |
| parking_ratio | numeric | YES |  |
| surface_parking_spaces | integer | YES |  |
| structured_parking_spaces | integer | YES |  |
| parking_field_condition | character varying | YES |  |
| national_tenant_pct | numeric | YES |  |
| regional_tenant_pct | numeric | YES |  |
| local_tenant_pct | numeric | YES |  |
| food_tenant_pct | numeric | YES |  |
| service_tenant_pct | numeric | YES |  |
| sales_psf_inline | numeric | YES |  |
| sales_psf_anchor | numeric | YES |  |
| occupancy_cost_ratio | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_intake_session (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| intake_id | bigint | NO |  |
| intake_uuid | uuid | NO | gen_random_uuid() |
| project_id | integer | NO |  |
| doc_id | bigint | YES |  |
| document_type | character varying | YES |  |
| status | character varying | NO | 'draft'::character varying |
| created_by | integer | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_inventory_item (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| item_id | bigint | NO | nextval('tbl_inventory_item_item_id_seq'::regclass |
| project_id | bigint | NO |  |
| property_type | character varying | NO |  |
| item_code | character varying | NO |  |
| hierarchy_values | jsonb | YES | '{}'::jsonb |
| container_id | bigint | YES |  |
| data_values | jsonb | YES | '{}'::jsonb |
| available_date | date | YES |  |
| absorption_month | integer | YES |  |
| lease_start_date | date | YES |  |
| lease_end_date | date | YES |  |
| status | character varying | YES |  |
| is_speculative | boolean | YES | false |
| is_active | boolean | YES | true |
| sort_order | integer | YES | 0 |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| family_id | bigint | YES |  |
| type_id | bigint | YES |  |
| product_id | bigint | YES |  |
| density_code | character varying | YES |  |

### tbl_item_dependency (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| dependency_id | bigint | NO | nextval('tbl_item_dependency_dependency_id_seq'::r |
| dependent_item_type | character varying | NO |  |
| dependent_item_table | character varying | NO |  |
| dependent_item_id | bigint | NO |  |
| trigger_item_type | character varying | YES |  |
| trigger_item_table | character varying | YES |  |
| trigger_item_id | bigint | YES |  |
| trigger_event | character varying | NO | 'ABSOLUTE'::character varying |
| trigger_value | numeric | YES |  |
| offset_periods | integer | YES | 0 |
| is_hard_dependency | boolean | YES | false |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_knowledge_source (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| source_name | character varying | NO |  |
| source_type | character varying | NO |  |
| aliases | jsonb | NO |  |
| website | character varying | YES |  |
| description | text | YES |  |
| document_count | integer | NO |  |
| first_seen_at | timestamp with time zone | NO |  |
| last_seen_at | timestamp with time zone | NO |  |
| created_by | character varying | NO |  |
| is_active | boolean | NO |  |

### tbl_land_comp_adjustments (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| adjustment_id | integer | NO |  |
| adjustment_type | character varying | NO |  |
| adjustment_pct | numeric | YES |  |
| adjustment_amount | numeric | YES |  |
| justification | text | YES |  |
| created_at | timestamp with time zone | NO |  |
| land_comparable_id | integer | NO |  |

### tbl_land_comparables (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| land_comparable_id | integer | NO |  |
| comp_number | integer | YES |  |
| address | character varying | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| zip | character varying | YES |  |
| sale_date | date | YES |  |
| sale_price | numeric | YES |  |
| land_area_sf | numeric | YES |  |
| land_area_acres | numeric | YES |  |
| price_per_sf | numeric | YES |  |
| price_per_acre | numeric | YES |  |
| zoning | character varying | YES |  |
| source | character varying | YES |  |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| project_id | integer | NO |  |

### tbl_landscaper_instructions (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('tbl_landscaper_instructions_id_seq'::regc |
| user_id | integer | NO | 1 |
| project_id | integer | YES |  |
| instruction_type | character varying | NO | 'custom'::character varying |
| instruction_text | text | NO |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### tbl_landscaper_kpi_definition (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('tbl_landscaper_kpi_definition_id_seq'::re |
| user_id | integer | NO | 1 |
| project_type_code | character varying | NO | 'LAND'::character varying |
| kpi_key | character varying | NO |  |
| display_label | character varying | NO |  |
| display_order | integer | NO | 0 |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### tbl_landuse (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| landuse_id | integer | NO |  |
| landuse_code | character varying | NO |  |
| landuse_type | character varying | YES |  |
| type_id | integer | YES |  |
| name | character varying | YES |  |
| description | text | YES |  |
| active | boolean | YES | true |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| subtype_id | integer | YES |  |

### tbl_landuse_program (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| landuse_code | character varying | NO |  |
| rsf_to_gfa_eff | numeric | YES |  |
| employee_density | numeric | YES |  |
| floor_plate_efficiency | numeric | YES |  |
| clear_height_ft | numeric | YES |  |
| loading_dock_ratio | numeric | YES |  |
| truck_court_depth_ft | numeric | YES |  |
| trailer_parking_ratio | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_lease (42 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lease_id | integer | NO |  |
| project_id | integer | NO |  |
| parcel_id | integer | YES |  |
| lot_id | integer | YES |  |
| tenant_name | character varying | NO |  |
| tenant_contact | character varying | YES |  |
| tenant_email | character varying | YES |  |
| tenant_phone | character varying | YES |  |
| tenant_classification | character varying | YES |  |
| lease_status | character varying | YES | 'Speculative'::character varying |
| lease_type | character varying | YES |  |
| suite_number | character varying | YES |  |
| floor_number | integer | YES |  |
| lease_execution_date | date | YES |  |
| lease_commencement_date | date | NO |  |
| rent_start_date | date | YES |  |
| lease_expiration_date | date | NO |  |
| lease_term_months | integer | NO |  |
| leased_sf | numeric | NO |  |
| usable_sf | numeric | YES |  |
| number_of_renewal_options | integer | YES | 0 |
| renewal_option_term_months | integer | YES |  |
| renewal_notice_months | integer | YES |  |
| renewal_probability_pct | numeric | YES | 50.00 |
| early_termination_allowed | boolean | YES | false |
| termination_notice_months | integer | YES |  |
| termination_penalty_amount | numeric | YES |  |
| security_deposit_amount | numeric | YES |  |
| security_deposit_months | integer | YES |  |
| affects_occupancy | boolean | YES | true |
| expansion_rights | boolean | YES | false |
| right_of_first_refusal | boolean | YES | false |
| exclusive_use_clause | text | YES |  |
| co_tenancy_clause | text | YES |  |
| radius_restriction | character varying | YES |  |
| notes | text | YES |  |
| lease_metadata | jsonb | YES | '{}'::jsonb |
| created_at | timestamp with time zone | YES | now() |
| created_by | character varying | YES |  |
| updated_at | timestamp with time zone | YES | now() |
| updated_by | character varying | YES |  |
| lease_type_code | character varying | YES | 'CRE'::character varying |

### tbl_lease_assumptions (17 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| assumption_id | bigint | NO | nextval('tbl_lease_assumptions_assumption_id_seq': |
| project_id | bigint | NO |  |
| space_type | character varying | NO |  |
| market_rent_psf_annual | numeric | NO |  |
| market_rent_growth_rate | numeric | YES | 0.025 |
| renewal_probability | numeric | YES | 0.70 |
| downtime_months | integer | YES | 6 |
| ti_psf_renewal | numeric | YES | 0 |
| ti_psf_new_tenant | numeric | YES | 0 |
| lc_psf_renewal | numeric | YES | 0 |
| lc_psf_new_tenant | numeric | YES | 0 |
| free_rent_months_renewal | integer | YES | 0 |
| free_rent_months_new_tenant | integer | YES | 3 |
| effective_date | date | YES | CURRENT_DATE |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_lease_ind_ext (21 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lease_id | integer | NO |  |
| rent_structure | character varying | YES |  |
| cam_includes_roof | boolean | YES | true |
| cam_includes_structure | boolean | YES | true |
| cam_includes_parking | boolean | YES | true |
| management_fee_pct | numeric | YES |  |
| landlord_ti_allowance | numeric | YES |  |
| landlord_ti_psf | numeric | YES |  |
| tenant_ti_investment | numeric | YES |  |
| clear_height_requirement_ft | numeric | YES |  |
| dock_requirement | integer | YES |  |
| power_requirement_amps | integer | YES |  |
| operating_hours | character varying | YES |  |
| hazmat_use | boolean | YES | false |
| hazmat_description | text | YES |  |
| expansion_option_sf | numeric | YES |  |
| expansion_option_rent_psf | numeric | YES |  |
| contraction_option | boolean | YES | false |
| contraction_date | date | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_lease_mf_ext (21 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lease_id | integer | NO |  |
| base_rent_monthly | numeric | YES |  |
| pet_rent_monthly | numeric | YES |  |
| parking_rent_monthly | numeric | YES |  |
| storage_rent_monthly | numeric | YES |  |
| other_rent_monthly | numeric | YES |  |
| move_in_concession | numeric | YES |  |
| recurring_concession | numeric | YES |  |
| concession_months | integer | YES |  |
| net_effective_rent | numeric | YES |  |
| household_size | integer | YES |  |
| household_income | numeric | YES |  |
| income_to_rent_ratio | numeric | YES |  |
| mtm_rate_premium_pct | numeric | YES |  |
| renewal_probability_pct | numeric | YES |  |
| is_affordable_unit | boolean | YES | false |
| ami_percentage | integer | YES |  |
| voucher_type | character varying | YES |  |
| voucher_amount | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_lease_ret_ext (31 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lease_id | integer | NO |  |
| rent_structure | character varying | YES |  |
| cam_base_year | integer | YES |  |
| cam_base_amount | numeric | YES |  |
| cam_cap_amount | numeric | YES |  |
| cam_cap_escalation_pct | numeric | YES |  |
| cam_controllable_cap | boolean | YES | false |
| admin_fee_pct | numeric | YES |  |
| tax_base_year | integer | YES |  |
| tax_base_amount | numeric | YES |  |
| tax_cap_amount | numeric | YES |  |
| insurance_base_year | integer | YES |  |
| insurance_base_amount | numeric | YES |  |
| natural_breakpoint | boolean | YES | false |
| artificial_breakpoint | boolean | YES | false |
| breakpoint_amount | numeric | YES |  |
| percentage_rate | numeric | YES |  |
| percentage_rent_exclusions | text | YES |  |
| opening_co_tenancy | text | YES |  |
| operating_co_tenancy | text | YES |  |
| co_tenancy_remedy | character varying | YES |  |
| rent_reduction_pct | numeric | YES |  |
| exclusive_use_clause | text | YES |  |
| exclusive_radius_miles | numeric | YES |  |
| kick_out_date | date | YES |  |
| kick_out_sales_threshold | numeric | YES |  |
| assignment_fee | numeric | YES |  |
| subletting_allowed | boolean | YES | false |
| profit_sharing_pct | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_lease_revenue_timing (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| timing_id | bigint | NO | nextval('tbl_lease_revenue_timing_timing_id_seq':: |
| project_id | bigint | NO |  |
| lease_id | bigint | NO |  |
| period_id | integer | NO |  |
| base_rent | numeric | YES | 0 |
| escalated_rent | numeric | YES | 0 |
| percentage_rent | numeric | YES | 0 |
| cam_recovery | numeric | YES | 0 |
| tax_recovery | numeric | YES | 0 |
| insurance_recovery | numeric | YES | 0 |
| vacancy_loss | numeric | YES | 0 |
| free_rent_adjustment | numeric | YES | 0 |
| effective_gross_rent | numeric | YES | 0 |
| calculation_date | timestamp with time zone | YES | now() |

### tbl_leasing_commission (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| commission_id | integer | NO |  |
| lease_id | integer | NO |  |
| base_commission_pct | numeric | YES |  |
| renewal_commission_pct | numeric | YES |  |
| tiers | jsonb | YES | '[]'::jsonb |
| commission_amount | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_loan (86 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| loan_id | bigint | NO |  |
| project_id | bigint | NO |  |
| loan_name | character varying | NO |  |
| loan_type | character varying | NO |  |
| structure_type | character varying | NO | 'TERM'::character varying |
| lender_name | character varying | YES |  |
| seniority | integer | NO | 1 |
| status | character varying | YES | 'active'::character varying |
| commitment_amount | numeric | YES | 0 |
| loan_amount | numeric | YES |  |
| loan_to_cost_pct | numeric | YES |  |
| loan_to_value_pct | numeric | YES |  |
| interest_rate_pct | numeric | YES |  |
| interest_rate_decimal | numeric | YES |  |
| interest_type | character varying | YES | 'Fixed'::character varying |
| interest_index | character varying | YES |  |
| interest_spread_bps | integer | YES |  |
| rate_floor_pct | numeric | YES |  |
| rate_cap_pct | numeric | YES |  |
| rate_reset_frequency | character varying | YES |  |
| interest_calculation | character varying | YES | 'SIMPLE'::character varying |
| interest_payment_method | character varying | YES | 'paid_current'::character varying |
| loan_start_date | date | YES |  |
| loan_maturity_date | date | YES |  |
| maturity_period_id | bigint | YES |  |
| loan_term_months | integer | YES |  |
| loan_term_years | integer | YES |  |
| amortization_months | integer | YES |  |
| amortization_years | integer | YES |  |
| interest_only_months | integer | YES | 0 |
| payment_frequency | character varying | YES | 'MONTHLY'::character varying |
| commitment_date | date | YES |  |
| origination_fee_pct | numeric | YES |  |
| exit_fee_pct | numeric | YES |  |
| unused_fee_pct | numeric | YES |  |
| commitment_fee_pct | numeric | YES |  |
| extension_fee_bps | integer | YES |  |
| extension_fee_amount | numeric | YES |  |
| prepayment_penalty_years | integer | YES |  |
| interest_reserve_amount | numeric | YES |  |
| interest_reserve_funded_upfront | boolean | YES | false |
| reserve_requirements | jsonb | YES | '{}'::jsonb |
| replacement_reserve_per_unit | numeric | YES |  |
| tax_insurance_escrow_months | integer | YES |  |
| initial_reserve_months | integer | YES |  |
| covenants | jsonb | YES | '{}'::jsonb |
| loan_covenant_dscr_min | numeric | YES |  |
| loan_covenant_ltv_max | numeric | YES |  |
| loan_covenant_occupancy_min | numeric | YES |  |
| covenant_test_frequency | character varying | YES | 'Quarterly'::character varying |
| guarantee_type | character varying | YES |  |
| guarantor_name | character varying | YES |  |
| recourse_carveout_provisions | text | YES |  |
| extension_options | integer | YES | 0 |
| extension_option_years | integer | YES |  |
| draw_trigger_type | character varying | YES | 'COST_INCURRED'::character varying |
| commitment_balance | numeric | YES |  |
| drawn_to_date | numeric | YES | 0 |
| is_construction_loan | boolean | YES | false |
| release_price_pct | numeric | YES |  |
| minimum_release_amount | numeric | YES |  |
| takes_out_loan_id | bigint | YES |  |
| can_participate_in_profits | boolean | YES | false |
| profit_participation_tier | integer | YES |  |
| profit_participation_pct | numeric | YES |  |
| monthly_payment | numeric | YES |  |
| annual_debt_service | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| created_by | text | YES |  |
| updated_by | text | YES |  |
| interest_reserve_inflator | numeric | YES | 1.0 |
| repayment_acceleration | numeric | YES | 1.0 |
| closing_costs_appraisal | numeric | YES |  |
| closing_costs_legal | numeric | YES |  |
| closing_costs_other | numeric | YES |  |
| recourse_type | character varying | YES | 'FULL'::character varying |
| collateral_basis_type | character varying | YES | 'PROJECT_COST'::character varying |
| commitment_sizing_method | character varying | YES | 'MANUAL'::character varying |
| ltv_basis_amount | numeric | YES |  |
| ltc_basis_amount | numeric | YES |  |
| calculated_commitment_amount | numeric | YES |  |
| governing_constraint | character varying | YES |  |
| net_loan_proceeds | numeric | YES |  |
| index_rate_pct | numeric | YES |  |

### tbl_loan_container (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| loan_container_id | bigint | NO |  |
| loan_id | bigint | NO |  |
| division_id | bigint | NO |  |
| allocation_pct | numeric | YES |  |
| collateral_type | character varying | YES |  |
| created_at | timestamp with time zone | YES | now() |

### tbl_loan_finance_structure (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| loan_fs_id | bigint | NO |  |
| loan_id | bigint | NO |  |
| finance_structure_id | bigint | NO |  |
| contribution_pct | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |

### tbl_lot (23 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lot_id | integer | NO |  |
| parcel_id | integer | NO |  |
| phase_id | integer | YES |  |
| project_id | integer | NO |  |
| lot_number | character varying | YES |  |
| unit_number | character varying | YES |  |
| suite_number | character varying | YES |  |
| unit_type | character varying | YES |  |
| lot_sf | numeric | YES |  |
| unit_sf | numeric | YES |  |
| bedrooms | integer | YES |  |
| bathrooms | numeric | YES |  |
| floor_number | integer | YES |  |
| base_price | numeric | YES |  |
| price_psf | numeric | YES |  |
| options_price | numeric | YES |  |
| total_price | numeric | YES |  |
| lot_status | character varying | YES | 'Available'::character varying |
| sale_date | date | YES |  |
| close_date | date | YES |  |
| lease_id | integer | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_lot_type (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| producttype_id | integer | NO |  |
| producttype_name | character varying | NO |  |
| typical_lot_width | double precision | YES |  |
| typical_lot_depth | double precision | YES |  |

### tbl_market_rate_analysis (36 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| analysis_id | integer | NO | nextval('tbl_market_rate_analysis_analysis_id_seq' |
| project_id | integer | NO |  |
| unit_type | character varying | YES |  |
| bedrooms | numeric | YES |  |
| bathrooms | numeric | YES |  |
| subject_sqft | integer | YES |  |
| comp_count | integer | YES |  |
| min_rent | numeric | YES |  |
| max_rent | numeric | YES |  |
| avg_rent | numeric | YES |  |
| median_rent | numeric | YES |  |
| avg_rent_per_sf | numeric | YES |  |
| location_adjustment | numeric | YES | 0 |
| condition_adjustment | numeric | YES | 0 |
| amenity_adjustment | numeric | YES | 0 |
| size_adjustment_per_sf | numeric | YES | 0 |
| recommended_market_rent | numeric | YES |  |
| recommended_rent_per_sf | numeric | YES |  |
| confidence_level | character varying | YES | 'MEDIUM'::character varying |
| analysis_notes | text | YES |  |
| analyzed_by | character varying | YES |  |
| analysis_date | date | YES | CURRENT_DATE |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| population_1mi | integer | YES |  |
| population_3mi | integer | YES |  |
| population_5mi | integer | YES |  |
| median_hh_income_1mi | numeric | YES |  |
| median_hh_income_3mi | numeric | YES |  |
| avg_hh_income_5mi | numeric | YES |  |
| employment_5mi | integer | YES |  |
| submarket_vacancy | numeric | YES |  |
| submarket_rent_growth | numeric | YES |  |
| submarket_avg_rent | numeric | YES |  |
| submarket_occupancy | numeric | YES |  |
| new_supply_pipeline | integer | YES |  |

### tbl_measures (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| measure_id | integer | NO | nextval('tbl_measures_measure_id_seq'::regclass) |
| measure_code | character varying | NO |  |
| measure_name | character varying | NO |  |
| measure_category | character varying | NO |  |
| is_system | boolean | YES | true |
| created_by | integer | YES |  |
| property_types | jsonb | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| sort_order | integer | YES | 0 |

### tbl_milestone (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| milestone_id | integer | NO | nextval('tbl_milestone_milestone_id_seq'::regclass |
| project_id | bigint | NO |  |
| phase_id | bigint | YES |  |
| milestone_name | character varying | NO |  |
| milestone_type | character varying | YES |  |
| target_date | date | YES |  |
| actual_date | date | YES |  |
| status | character varying | YES | 'pending'::character varying |
| predecessor_milestone_id | bigint | YES |  |
| notes | text | YES |  |
| source_doc_id | bigint | YES |  |
| confidence_score | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| created_by | text | YES |  |

### tbl_model_override (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| override_id | bigint | NO |  |
| project_id | integer | NO |  |
| division_id | bigint | YES |  |
| unit_id | integer | YES |  |
| field_key | character varying | NO |  |
| calculated_value | text | YES |  |
| override_value | text | NO |  |
| is_active | boolean | NO | true |
| toggled_by | integer | YES |  |
| toggled_at | timestamp with time zone | YES | now() |

### tbl_msa (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| msa_id | integer | NO | nextval('tbl_msa_msa_id_seq'::regclass) |
| msa_name | character varying | NO |  |
| msa_code | character varying | YES |  |
| state_abbreviation | character varying | NO |  |
| primary_city | character varying | YES |  |
| is_active | boolean | YES | true |
| display_order | integer | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_multifamily_lease (19 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lease_id | integer | NO | nextval('tbl_multifamily_lease_lease_id_seq'::regc |
| unit_id | bigint | NO |  |
| resident_name | character varying | YES |  |
| lease_start_date | date | YES |  |
| lease_end_date | date | YES |  |
| lease_term_months | integer | YES |  |
| base_rent_monthly | numeric | NO |  |
| effective_rent_monthly | numeric | YES |  |
| months_free_rent | integer | YES | 0 |
| concession_amount | numeric | YES | 0 |
| security_deposit | numeric | YES | 0 |
| pet_rent_monthly | numeric | YES | 0 |
| parking_rent_monthly | numeric | YES | 0 |
| lease_status | character varying | YES | 'ACTIVE'::character varying |
| notice_date | date | YES |  |
| notice_to_vacate_days | integer | YES |  |
| is_renewal | boolean | YES | false |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_multifamily_property (59 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| multifamily_property_id | integer | NO | nextval('tbl_multifamily_property_multifamily_prop |
| project_id | integer | YES |  |
| parcel_id | integer | YES |  |
| property_name | character varying | YES |  |
| property_class | character varying | YES |  |
| property_subtype | character varying | YES |  |
| year_built | integer | YES |  |
| year_renovated | integer | YES |  |
| number_of_buildings | integer | YES |  |
| number_of_floors | integer | YES |  |
| total_units | integer | YES |  |
| rentable_units | integer | YES |  |
| total_building_sf | numeric | YES |  |
| avg_unit_sf | numeric | YES |  |
| parking_spaces_total | integer | YES |  |
| parking_ratio | numeric | YES |  |
| parking_type | character varying | YES |  |
| garage_spaces | integer | YES |  |
| covered_spaces | integer | YES |  |
| tandem_spaces | integer | YES |  |
| surface_spaces | integer | YES |  |
| has_manager_unit | boolean | YES | false |
| manager_unit_count | integer | YES | 0 |
| manager_rent_credit_monthly | numeric | YES |  |
| leasing_office_count | integer | YES | 0 |
| leasing_office_sf | integer | YES |  |
| has_commercial_space | boolean | YES | false |
| commercial_sf | numeric | YES |  |
| commercial_unit_count | integer | YES | 0 |
| commercial_type | character varying | YES |  |
| assessed_value | numeric | YES |  |
| assessment_year | integer | YES |  |
| property_tax_rate | numeric | YES |  |
| direct_assessments_annual | numeric | YES |  |
| tax_jurisdiction | character varying | YES |  |
| utility_recovery_method | character varying | YES |  |
| rubs_recovery_pct | numeric | YES |  |
| gas_metered_individually | boolean | YES | false |
| electric_metered_individually | boolean | YES | false |
| water_metered_individually | boolean | YES | false |
| has_solar_panels | boolean | YES | false |
| solar_capacity_kw | numeric | YES |  |
| has_tankless_water_heaters | boolean | YES | false |
| has_ev_charging | boolean | YES | false |
| ev_charging_spaces | integer | YES |  |
| energy_star_certified | boolean | YES | false |
| rent_control_exempt | boolean | YES | true |
| rent_control_ordinance | text | YES |  |
| exemption_reason | character varying | YES |  |
| has_section8_units | boolean | YES | false |
| section8_unit_count | integer | YES | 0 |
| affordable_housing_program | character varying | YES |  |
| property_status | character varying | YES |  |
| stabilization_date | date | YES |  |
| stabilized_occupancy_pct | numeric | YES |  |
| acquisition_date | date | YES |  |
| acquisition_price | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_multifamily_turn (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| turn_id | integer | NO | nextval('tbl_multifamily_turn_turn_id_seq'::regcla |
| unit_id | bigint | NO |  |
| move_out_date | date | NO |  |
| make_ready_complete_date | date | YES |  |
| next_move_in_date | date | YES |  |
| total_vacant_days | integer | YES |  |
| cleaning_cost | numeric | YES | 0 |
| painting_cost | numeric | YES | 0 |
| carpet_flooring_cost | numeric | YES | 0 |
| appliance_cost | numeric | YES | 0 |
| other_cost | numeric | YES | 0 |
| total_make_ready_cost | numeric | YES |  |
| turn_status | character varying | YES | 'VACANT'::character varying |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_multifamily_unit (40 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| unit_id | integer | NO | nextval('tbl_multifamily_unit_unit_id_seq'::regcla |
| project_id | bigint | NO |  |
| unit_number | character varying | NO |  |
| building_name | character varying | YES |  |
| unit_type | character varying | NO |  |
| bedrooms | numeric | YES |  |
| bathrooms | numeric | YES |  |
| square_feet | integer | NO |  |
| market_rent | numeric | YES |  |
| renovation_status | character varying | YES | 'ORIGINAL'::character varying |
| renovation_date | date | YES |  |
| renovation_cost | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| other_features | text | YES |  |
| is_section8 | boolean | YES | false |
| section8_contract_date | date | YES |  |
| section8_contract_rent | numeric | YES |  |
| has_balcony | boolean | YES | false |
| has_patio | boolean | YES | false |
| balcony_sf | integer | YES |  |
| ceiling_height_ft | numeric | YES |  |
| view_type | character varying | YES |  |
| is_manager | boolean | YES | false |
| current_rent | numeric | YES |  |
| current_rent_psf | numeric | YES |  |
| market_rent_psf | numeric | YES |  |
| lease_start_date | date | YES |  |
| lease_end_date | date | YES |  |
| occupancy_status | character varying | YES |  |
| floor_number | integer | YES |  |
| extra_data | jsonb | YES |  |
| unit_category | character varying | YES |  |
| unit_designation | character varying | YES |  |
| value_source | character varying | YES |  |
| tenant_name | character varying | YES |  |
| parking_rent | numeric | YES |  |
| pet_rent | numeric | YES |  |
| past_due_amount | numeric | YES |  |
| deposit_amount | numeric | YES |  |

### tbl_multifamily_unit_type (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| unit_type_id | integer | NO | nextval('tbl_multifamily_unit_type_unit_type_id_se |
| project_id | bigint | NO |  |
| unit_type_code | character varying | YES |  |
| bedrooms | numeric | YES |  |
| bathrooms | numeric | YES |  |
| avg_square_feet | integer | YES |  |
| current_market_rent | numeric | YES |  |
| total_units | integer | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| notes | text | YES |  |
| other_features | text | YES |  |
| floorplan_doc_id | bigint | YES |  |
| container_id | bigint | YES |  |
| unit_type_name | character varying | YES |  |
| unit_count | integer | YES |  |
| market_rent | numeric | YES |  |
| current_rent_avg | numeric | YES |  |
| concessions_avg | numeric | YES |  |
| value_source | character varying | YES |  |

### tbl_narrative_change (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| change_type | character varying | NO |  |
| original_text | text | YES |  |
| new_text | text | YES |  |
| position_start | integer | NO |  |
| position_end | integer | NO |  |
| is_accepted | boolean | NO |  |
| accepted_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | NO |  |
| version_id | bigint | NO |  |

### tbl_narrative_comment (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| comment_text | text | NO |  |
| position_start | integer | NO |  |
| position_end | integer | NO |  |
| is_question | boolean | NO |  |
| is_resolved | boolean | NO |  |
| resolved_by | integer | YES |  |
| resolved_at | timestamp with time zone | YES |  |
| landscaper_response | text | YES |  |
| created_by | integer | YES |  |
| created_at | timestamp with time zone | NO |  |
| version_id | bigint | NO |  |

### tbl_narrative_version (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| project_id | integer | NO |  |
| approach_type | character varying | NO |  |
| version_number | integer | NO |  |
| content | jsonb | NO |  |
| content_html | text | YES |  |
| content_plain | text | YES |  |
| status | character varying | NO |  |
| created_by | integer | YES |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| data_snapshot | jsonb | YES |  |

### tbl_operating_expenses (24 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| opex_id | bigint | NO | nextval('tbl_operating_expenses_opex_id_seq'::regc |
| project_id | bigint | NO |  |
| expense_category | character varying | NO |  |
| expense_type | character varying | NO |  |
| annual_amount | numeric | NO |  |
| amount_per_sf | numeric | YES |  |
| is_recoverable | boolean | YES | true |
| recovery_rate | numeric | YES | 1.0 |
| escalation_type | character varying | YES | 'FIXED_PERCENT'::character varying |
| escalation_rate | numeric | YES | 0.03 |
| start_period | integer | NO |  |
| payment_frequency | character varying | YES | 'MONTHLY'::character varying |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| account_id | integer | YES |  |
| calculation_basis | character varying | YES | 'FIXED_AMOUNT'::character varying |
| unit_amount | numeric | YES |  |
| is_auto_calculated | boolean | YES | false |
| category_id | integer | YES |  |
| statement_discriminator | character varying | YES | 'default'::character varying |
| parent_category | character varying | YES | 'unclassified'::character varying |
| source | character varying | YES | 'user'::character varying |
| value_source | character varying | YES |  |

### tbl_operations_user_inputs (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| input_id | integer | NO | nextval('tbl_operations_user_inputs_input_id_seq': |
| project_id | integer | NO |  |
| section | character varying | NO |  |
| line_item_key | character varying | NO |  |
| category_id | integer | YES |  |
| label | character varying | YES |  |
| parent_key | character varying | YES |  |
| sort_order | integer | YES | 0 |
| as_is_value | numeric | YES |  |
| as_is_count | integer | YES |  |
| as_is_rate | numeric | YES |  |
| as_is_per_sf | numeric | YES |  |
| as_is_growth_rate | numeric | YES |  |
| as_is_growth_type | character varying | YES | 'global'::character varying |
| post_reno_value | numeric | YES |  |
| post_reno_count | integer | YES |  |
| post_reno_rate | numeric | YES |  |
| post_reno_per_sf | numeric | YES |  |
| post_reno_growth_rate | numeric | YES |  |
| is_percentage | boolean | YES | false |
| is_calculated | boolean | YES | false |
| calculation_base | character varying | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_opex_timing (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| timing_id | bigint | NO | nextval('tbl_opex_timing_timing_id_seq'::regclass) |
| project_id | bigint | NO |  |
| opex_id | bigint | NO |  |
| period_id | integer | NO |  |
| expense_amount | numeric | YES | 0 |
| recoverable_amount | numeric | YES | 0 |
| recovery_collected | numeric | YES | 0 |
| net_expense | numeric | YES | 0 |
| calculation_date | timestamp with time zone | YES | now() |

### tbl_parcel (45 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| parcel_id | integer | NO |  |
| area_id | integer | YES |  |
| phase_id | integer | YES |  |
| landuse_code | character varying | YES |  |
| landuse_type | character varying | YES |  |
| acres_gross | double precision | YES |  |
| lot_width | double precision | YES |  |
| lot_depth | double precision | YES |  |
| lot_product | character varying | YES |  |
| lot_area | double precision | YES |  |
| units_total | integer | YES |  |
| lots_frontfeet | double precision | YES |  |
| planning_loss | double precision | YES |  |
| plan_efficiency | double precision | YES |  |
| saledate | date | YES |  |
| saleprice | double precision | YES |  |
| lot_type_id | integer | YES |  |
| project_id | integer | YES |  |
| family_name | text | YES |  |
| density_code | text | YES |  |
| type_code | text | YES |  |
| product_code | text | YES |  |
| site_coverage_pct | numeric | YES |  |
| setback_front_ft | numeric | YES |  |
| setback_side_ft | numeric | YES |  |
| setback_rear_ft | numeric | YES |  |
| subtype_id | bigint | YES |  |
| parcel_code | character varying | YES |  |
| parcel_name | character varying | YES |  |
| building_name | character varying | YES |  |
| building_class | character varying | YES |  |
| year_built | integer | YES |  |
| year_renovated | integer | YES |  |
| rentable_sf | numeric | YES |  |
| common_area_sf | numeric | YES |  |
| load_factor_pct | numeric | YES |  |
| parking_spaces | integer | YES |  |
| parking_ratio | numeric | YES |  |
| is_income_property | boolean | YES | false |
| property_metadata | jsonb | YES | '{}'::jsonb |
| description | text | YES |  |
| sale_phase_code | character varying | YES |  |
| custom_sale_date | date | YES |  |
| has_sale_overrides | boolean | YES | false |
| sale_period | integer | YES |  |

### tbl_parcel_sale_assumptions (31 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| assumption_id | integer | NO | nextval('tbl_parcel_sale_assumptions_assumption_id |
| parcel_id | integer | NO |  |
| sale_date | date | NO |  |
| base_price_per_unit | numeric | YES |  |
| price_uom | character varying | YES |  |
| inflation_rate | numeric | YES |  |
| inflated_price_per_unit | numeric | YES |  |
| gross_parcel_price | numeric | YES |  |
| improvement_offset_per_uom | numeric | YES |  |
| improvement_offset_total | numeric | YES |  |
| improvement_offset_source | character varying | YES |  |
| improvement_offset_override | boolean | YES | false |
| gross_sale_proceeds | numeric | YES |  |
| legal_pct | numeric | YES |  |
| legal_amount | numeric | YES |  |
| legal_override | boolean | YES | false |
| commission_pct | numeric | YES |  |
| commission_amount | numeric | YES |  |
| commission_override | boolean | YES | false |
| closing_cost_pct | numeric | YES |  |
| closing_cost_amount | numeric | YES |  |
| closing_cost_override | boolean | YES | false |
| title_insurance_pct | numeric | YES |  |
| title_insurance_amount | numeric | YES |  |
| title_insurance_override | boolean | YES | false |
| custom_transaction_costs | jsonb | YES | '[]'::jsonb |
| total_transaction_costs | numeric | YES |  |
| net_sale_proceeds | numeric | YES |  |
| net_proceeds_per_uom | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_parcel_sale_event (26 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| sale_event_id | bigint | NO | nextval('tbl_parcel_sale_event_sale_event_id_seq': |
| project_id | integer | NO |  |
| parcel_id | bigint | NO |  |
| phase_id | integer | YES |  |
| sale_type | character varying | NO |  |
| buyer_entity | character varying | YES |  |
| buyer_contact_id | integer | YES |  |
| contract_date | date | YES |  |
| total_lots_contracted | integer | NO |  |
| base_price_per_lot | numeric | YES |  |
| price_escalation_formula | text | YES |  |
| deposit_amount | numeric | YES |  |
| deposit_date | date | YES |  |
| deposit_terms | character varying | YES |  |
| deposit_applied_to_purchase | boolean | YES | true |
| has_escrow_holdback | boolean | YES | false |
| escrow_holdback_amount | numeric | YES |  |
| escrow_release_terms | text | YES |  |
| commission_pct | numeric | YES |  |
| closing_cost_per_unit | numeric | YES |  |
| onsite_cost_pct | numeric | YES |  |
| has_custom_overrides | boolean | YES | false |
| sale_status | character varying | YES | 'pending'::character varying |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_participation_payment (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| payment_id | bigint | NO | nextval('tbl_participation_payment_payment_id_seq' |
| settlement_id | bigint | NO |  |
| project_id | bigint | NO |  |
| payment_date | date | NO |  |
| payment_period | integer | YES |  |
| homes_closed_count | integer | YES |  |
| gross_home_sales | numeric | YES |  |
| participation_base | numeric | YES |  |
| participation_amount | numeric | NO |  |
| less_base_allocation | numeric | YES | 0 |
| net_participation_payment | numeric | NO |  |
| cumulative_homes_closed | integer | YES |  |
| cumulative_participation_paid | numeric | YES |  |
| payment_status | character varying | YES | 'calculated'::character varying |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_percentage_rent (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| percentage_rent_id | integer | NO | nextval('tbl_percentage_rent_percentage_rent_id_se |
| lease_id | integer | YES |  |
| breakpoint_amount | numeric | YES |  |
| percentage_rate | numeric | YES |  |
| reporting_frequency | character varying | YES |  |
| reporting_deadline_days | integer | YES |  |
| prior_year_sales | numeric | YES |  |
| current_year_sales_projection | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_phase (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| phase_id | integer | NO |  |
| area_id | integer | NO |  |
| phase_name | character varying | NO |  |
| phase_no | integer | YES |  |
| project_id | integer | YES |  |
| label | text | YES |  |
| description | text | YES |  |
| phase_status | character varying | YES | 'Planning'::character varying |
| phase_start_date | date | YES |  |
| phase_completion_date | date | YES |  |
| absorption_start_date | date | YES |  |

### tbl_platform_knowledge (26 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('tbl_platform_knowledge_id_seq'::regclass) |
| document_key | character varying | NO |  |
| title | character varying | NO |  |
| subtitle | character varying | YES |  |
| edition | character varying | YES |  |
| publisher | character varying | YES |  |
| publication_year | integer | YES |  |
| isbn | character varying | YES |  |
| knowledge_domain | character varying | NO |  |
| property_types | jsonb | YES | '[]'::jsonb |
| description | text | YES |  |
| total_chapters | integer | YES |  |
| total_pages | integer | YES |  |
| file_path | character varying | YES |  |
| file_hash | character varying | YES |  |
| file_size_bytes | bigint | YES |  |
| ingestion_status | character varying | YES | 'pending'::character varying |
| chunk_count | integer | YES | 0 |
| last_indexed_at | timestamp without time zone | YES |  |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| created_by | character varying | YES | 'system'::character varying |
| page_count | integer | YES |  |
| metadata | jsonb | NO |  |
| source_id | bigint | YES |  |

### tbl_platform_knowledge_chapters (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('tbl_platform_knowledge_chapters_id_seq':: |
| document_id | integer | NO |  |
| chapter_number | integer | YES |  |
| chapter_title | character varying | NO |  |
| page_start | integer | YES |  |
| page_end | integer | YES |  |
| topics | jsonb | YES | '[]'::jsonb |
| property_types | jsonb | YES | '[]'::jsonb |
| applies_to | jsonb | YES | '[]'::jsonb |
| summary | text | YES |  |
| key_concepts | jsonb | YES | '{}'::jsonb |
| chunk_ids | jsonb | YES | '[]'::jsonb |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_platform_knowledge_chunks (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('tbl_platform_knowledge_chunks_id_seq'::re |
| document_id | integer | NO |  |
| chapter_id | integer | YES |  |
| chunk_index | integer | NO |  |
| content | text | NO |  |
| content_type | character varying | YES | 'text'::character varying |
| page_number | integer | YES |  |
| section_path | character varying | YES |  |
| embedding | USER-DEFINED | YES |  |
| embedding_model | character varying | YES | 'text-embedding-3-small'::character varying |
| token_count | integer | YES |  |
| created_at | timestamp without time zone | YES | now() |
| category | character varying | NO |  |
| metadata | jsonb | NO |  |

### tbl_project (135 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | integer | NO |  |
| project_name | character varying | NO |  |
| acres_gross | double precision | YES |  |
| location_lat | double precision | YES |  |
| location_lon | double precision | YES |  |
| start_date | date | YES |  |
| jurisdiction_city | character varying | YES |  |
| jurisdiction_county | character varying | YES |  |
| jurisdiction_state | character varying | YES |  |
| uses_global_taxonomy | boolean | YES | true |
| taxonomy_customized | boolean | YES | false |
| jurisdiction_integrated | boolean | YES | false |
| gis_metadata | jsonb | YES | '{}'::jsonb |
| location_description | text | YES |  |
| target_units | integer | YES |  |
| price_range_low | numeric | YES |  |
| price_range_high | numeric | YES |  |
| ai_last_reviewed | timestamp with time zone | YES |  |
| project_address | text | YES |  |
| legal_owner | text | YES |  |
| county | character varying | YES |  |
| existing_land_use | text | YES |  |
| assessed_value | numeric | YES |  |
| project_type | character varying | YES | 'Land Development'::character varying |
| financial_model_type | character varying | YES | 'Development'::character varying |
| analysis_start_date | date | YES |  |
| analysis_end_date | date | YES |  |
| calculation_frequency | character varying | YES | 'Monthly'::character varying |
| discount_rate_pct | numeric | YES | 10.00 |
| cost_of_capital_pct | numeric | YES |  |
| schema_version | integer | YES | 1 |
| last_calculated_at | timestamp with time zone | YES |  |
| description | text | YES |  |
| developer_owner | text | YES |  |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| template_id | bigint | YES |  |
| street_address | character varying | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| zip_code | character varying | YES |  |
| country | character varying | YES | 'United States'::character varying |
| market | character varying | YES |  |
| submarket | character varying | YES |  |
| apn_primary | character varying | YES |  |
| apn_secondary | character varying | YES |  |
| ownership_type | character varying | YES |  |
| property_subtype | character varying | YES |  |
| property_class | character varying | YES |  |
| lot_size_sf | numeric | YES |  |
| lot_size_acres | numeric | YES |  |
| gross_sf | numeric | YES |  |
| total_units | integer | YES |  |
| year_built | integer | YES |  |
| stories | integer | YES |  |
| asking_price | numeric | YES |  |
| price_per_unit | numeric | YES |  |
| price_per_sf | numeric | YES |  |
| cap_rate_current | numeric | YES |  |
| cap_rate_proforma | numeric | YES |  |
| current_gpr | numeric | YES |  |
| current_other_income | numeric | YES |  |
| current_gpi | numeric | YES |  |
| current_vacancy_rate | numeric | YES |  |
| current_egi | numeric | YES |  |
| current_opex | numeric | YES |  |
| current_noi | numeric | YES |  |
| proforma_gpr | numeric | YES |  |
| proforma_other_income | numeric | YES |  |
| proforma_gpi | numeric | YES |  |
| proforma_vacancy_rate | numeric | YES |  |
| proforma_egi | numeric | YES |  |
| proforma_opex | numeric | YES |  |
| proforma_noi | numeric | YES |  |
| listing_brokerage | character varying | YES |  |
| job_number | character varying | YES |  |
| version_reference | character varying | YES |  |
| analysis_type | character varying | YES |  |
| project_type_code | character varying | NO | 'LAND'::character varying |
| msa_id | integer | YES |  |
| planning_efficiency | numeric | YES |  |
| market_velocity_annual | integer | YES |  |
| velocity_override_reason | text | YES |  |
| analysis_mode | character varying | YES | 'napkin'::character varying |
| dms_template_id | bigint | YES |  |
| topography | character varying | YES |  |
| flood_zone | character varying | YES |  |
| overlay_zones | jsonb | YES | '[]'::jsonb |
| has_takedown_agreement | boolean | YES | false |
| current_zoning | character varying | YES |  |
| proposed_zoning | character varying | YES |  |
| general_plan | character varying | YES |  |
| acquisition_price | numeric | YES |  |
| acquisition_date | date | YES |  |
| walk_score | integer | YES |  |
| bike_score | integer | YES |  |
| transit_score | integer | YES |  |
| active_opex_discriminator | character varying | YES | 'default'::character varying |
| value_add_enabled | boolean | NO | false |
| primary_count | integer | YES |  |
| primary_count_type | character varying | YES |  |
| primary_area | numeric | YES |  |
| primary_area_type | character varying | YES |  |
| cabinet_id | bigint | YES |  |
| project_focus | character varying | YES |  |
| site_shape | character varying | YES |  |
| site_utility_rating | integer | YES |  |
| location_rating | integer | YES |  |
| access_rating | integer | YES |  |
| visibility_rating | integer | YES |  |
| building_count | integer | YES |  |
| net_rentable_area | numeric | YES |  |
| land_to_building_ratio | numeric | YES |  |
| construction_class | character varying | YES |  |
| construction_type | character varying | YES |  |
| condition_rating | integer | YES |  |
| quality_rating | integer | YES |  |
| parking_spaces | integer | YES |  |
| parking_ratio | numeric | YES |  |
| parking_type | character varying | YES |  |
| effective_age | integer | YES |  |
| total_economic_life | integer | YES |  |
| remaining_economic_life | integer | YES |  |
| site_attributes | jsonb | YES | '{}'::jsonb |
| improvement_attributes | jsonb | YES | '{}'::jsonb |
| created_by_id | integer | YES |  |
| collateral_enforcement | character varying | YES | 'STRICT'::character varying |
| lotbank_management_fee_pct | numeric | YES |  |
| lotbank_default_provision_pct | numeric | YES |  |
| lotbank_underwriting_fee | numeric | YES |  |
| analysis_perspective | character varying | NO |  |
| analysis_purpose | character varying | NO |  |
| value_source | character varying | YES |  |
| created_by | text | YES |  |

### tbl_project_assumption (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| assumption_id | integer | NO | nextval('tbl_project_assumption_assumption_id_seq' |
| project_id | bigint | NO |  |
| assumption_key | character varying | NO |  |
| assumption_value | text | YES |  |
| assumption_type | character varying | YES | 'user'::character varying |
| scope | character varying | YES | 'project'::character varying |
| scope_id | bigint | YES |  |
| notes | text | YES |  |
| source_doc_id | bigint | YES |  |
| confidence_score | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| created_by | text | YES |  |
| value_source | character varying | YES |  |

### tbl_project_config (19 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | bigint | NO |  |
| asset_type | character varying | NO |  |
| tier_1_label | character varying | NO | 'Area'::character varying |
| tier_2_label | character varying | NO | 'Phase'::character varying |
| tier_3_label | character varying | NO | 'Parcel'::character varying |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| land_use_level1_label | character varying | YES | 'Family'::character varying |
| land_use_level1_label_plural | character varying | YES | 'Families'::character varying |
| land_use_level2_label | character varying | YES | 'Type'::character varying |
| land_use_level2_label_plural | character varying | YES | 'Types'::character varying |
| land_use_level3_label | character varying | YES | 'Product'::character varying |
| land_use_level3_label_plural | character varying | YES | 'Products'::character varying |
| analysis_type | character varying | YES |  |
| level1_enabled | boolean | YES | true |
| level2_enabled | boolean | YES | true |
| level3_enabled | boolean | YES | true |
| auto_number | boolean | YES | false |
| tier_0_label | character varying | YES | 'Project'::character varying |

### tbl_project_contact (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_contact_id | bigint | NO | nextval('tbl_project_contact_project_contact_id_se |
| project_id | bigint | NO |  |
| contact_id | bigint | NO |  |
| role_id | integer | NO |  |
| is_primary | boolean | YES | false |
| is_billing_contact | boolean | YES | false |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### tbl_project_inventory_columns (19 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| column_config_id | bigint | NO | nextval('tbl_project_inventory_columns_column_conf |
| project_id | bigint | NO |  |
| column_name | character varying | NO |  |
| column_label | character varying | NO |  |
| column_type | character varying | NO |  |
| container_level | integer | YES |  |
| data_type | character varying | YES |  |
| enum_options | jsonb | YES |  |
| is_required | boolean | YES | false |
| is_visible | boolean | YES | true |
| display_order | integer | NO |  |
| default_value | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| data_source_table | character varying | YES |  |
| data_source_value_col | character varying | YES |  |
| data_source_label_col | character varying | YES |  |
| parent_column_name | character varying | YES |  |
| junction_table | character varying | YES |  |

### tbl_project_metrics (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| metrics_id | integer | NO |  |
| project_id | integer | NO |  |
| total_equity_invested | numeric | YES |  |
| total_debt_proceeds | numeric | YES |  |
| total_project_cost | numeric | YES |  |
| project_irr_pct | numeric | YES |  |
| equity_irr_pct | numeric | YES |  |
| levered_irr_pct | numeric | YES |  |
| unlevered_irr_pct | numeric | YES |  |
| equity_multiple | numeric | YES |  |
| stabilized_noi | numeric | YES |  |
| exit_cap_rate_pct | numeric | YES |  |
| exit_value | numeric | YES |  |
| residual_land_value_per_acre | numeric | YES |  |
| residual_land_value_per_unit | numeric | YES |  |
| peak_debt | numeric | YES |  |
| avg_dscr | numeric | YES |  |
| min_dscr | numeric | YES |  |
| development_duration_months | integer | YES |  |
| absorption_duration_months | integer | YES |  |
| calculated_at | timestamp with time zone | YES | now() |
| calculation_version | integer | YES | 1 |

### tbl_project_settings (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | bigint | NO |  |
| default_currency | character varying | YES | 'USD'::character varying |
| default_period_type | character varying | YES | 'monthly'::character varying |
| global_inflation_rate | numeric | YES | 0.03 |
| analysis_start_date | date | YES |  |
| analysis_end_date | date | YES |  |
| discount_rate | numeric | YES | 0.10 |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| cost_inflation_set_id | bigint | YES |  |
| price_inflation_set_id | bigint | YES |  |

### tbl_property_acquisition (24 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| acquisition_id | bigint | NO | nextval('tbl_property_acquisition_acquisition_id_s |
| project_id | bigint | NO |  |
| purchase_price | numeric | YES |  |
| acquisition_date | date | YES |  |
| hold_period_years | numeric | YES |  |
| exit_cap_rate | numeric | YES |  |
| sale_date | date | YES |  |
| closing_costs_pct | numeric | YES | 0.015 |
| due_diligence_days | integer | YES | 30 |
| earnest_money | numeric | YES |  |
| sale_costs_pct | numeric | YES | 0.015 |
| broker_commission_pct | numeric | YES | 0.025 |
| price_per_unit | numeric | YES |  |
| price_per_sf | numeric | YES |  |
| legal_fees | numeric | YES |  |
| financing_fees | numeric | YES |  |
| third_party_reports | numeric | YES |  |
| depreciation_basis | numeric | YES |  |
| land_pct | numeric | YES | 20.0 |
| improvement_pct | numeric | YES | 80.0 |
| is_1031_exchange | boolean | YES | false |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| grm | numeric | YES |  |

### tbl_property_apn (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| property_apn_id | bigint | NO | nextval('tbl_property_apn_property_apn_id_seq'::re |
| project_id | bigint | NO |  |
| apn | character varying | NO |  |
| is_primary | boolean | YES | false |
| county | character varying | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_property_attribute_def (18 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| attribute_id | bigint | NO | nextval('tbl_property_attribute_def_attribute_id_s |
| category | character varying | NO |  |
| subcategory | character varying | YES |  |
| attribute_code | character varying | NO |  |
| attribute_label | character varying | NO |  |
| description | text | YES |  |
| data_type | character varying | NO |  |
| options | jsonb | YES |  |
| default_value | text | YES |  |
| is_required | boolean | YES | false |
| sort_order | integer | YES | 0 |
| display_width | character varying | YES | 'full'::character varying |
| help_text | text | YES |  |
| property_types | jsonb | YES |  |
| is_system | boolean | YES | false |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### tbl_property_type_config (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| config_id | bigint | NO | nextval('tbl_property_type_config_config_id_seq':: |
| property_type | character varying | NO |  |
| tab_label | character varying | NO |  |
| description | text | YES |  |
| default_columns | jsonb | NO |  |
| import_suggestions | jsonb | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_property_use_template (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| template_id | bigint | NO | nextval('tbl_property_use_template_template_id_seq |
| template_name | character varying | NO |  |
| property_type | character varying | NO |  |
| template_category | character varying | YES |  |
| description | text | YES |  |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_recovery (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| recovery_id | integer | NO |  |
| lease_id | integer | NO |  |
| recovery_structure | character varying | YES | 'Triple Net'::character varying |
| expense_cap_pct | numeric | YES |  |
| categories | jsonb | NO | '[]'::jsonb |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_renewal_option (32 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| renewal_option_id | integer | NO | nextval('tbl_renewal_option_renewal_option_id_seq' |
| lease_id | integer | NO |  |
| option_number | integer | NO |  |
| option_term_months | integer | NO |  |
| option_term_years | numeric | YES |  |
| notice_period_months | integer | YES |  |
| earliest_notice_date | date | YES |  |
| latest_notice_date | date | YES |  |
| notice_received | boolean | YES | false |
| notice_received_date | date | YES |  |
| rent_determination_method | character varying | YES |  |
| fixed_rent_psf | numeric | YES |  |
| fixed_rent_annual | numeric | YES |  |
| market_rent_floor_psf | numeric | YES |  |
| market_rent_ceiling_psf | numeric | YES |  |
| cpi_adjustment_pct | numeric | YES |  |
| formula_description | text | YES |  |
| option_escalation_type | character varying | YES |  |
| option_escalation_pct | numeric | YES |  |
| option_escalation_frequency | character varying | YES |  |
| fmv_determination_period_days | integer | YES |  |
| fmv_arbitration_required | boolean | YES | false |
| fmv_appraiser_selection | character varying | YES |  |
| option_exercised | boolean | YES | false |
| exercise_date | date | YES |  |
| exercised_rent_psf | numeric | YES |  |
| exercised_rent_annual | numeric | YES |  |
| exercise_conditions | text | YES |  |
| no_default_required | boolean | YES | true |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_rent_concession (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| concession_id | integer | NO | nextval('tbl_rent_concession_concession_id_seq'::r |
| lease_id | integer | NO |  |
| concession_type | character varying | YES |  |
| concession_start_date | date | YES |  |
| concession_end_date | date | YES |  |
| concession_months | integer | YES |  |
| concession_amount_monthly | numeric | YES |  |
| concession_amount_total | numeric | YES |  |
| concession_psf | numeric | YES |  |
| concession_pct_of_rent | numeric | YES |  |
| concession_timing | character varying | YES |  |
| applies_to_base_rent | boolean | YES | true |
| applies_to_cam | boolean | YES | false |
| applies_to_taxes | boolean | YES | false |
| burn_off_upon_default | boolean | YES | false |
| burn_off_upon_assignment | boolean | YES | false |
| remaining_concession_value | numeric | YES |  |
| amortized_over_months | integer | YES |  |
| amortization_start_date | date | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_rent_escalation (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| escalation_id | integer | NO | nextval('tbl_rent_escalation_escalation_id_seq'::r |
| lease_id | integer | YES |  |
| escalation_type | character varying | YES |  |
| escalation_pct | numeric | YES |  |
| escalation_frequency | character varying | YES |  |
| compound_escalation | boolean | YES | true |
| cpi_index | character varying | YES |  |
| cpi_floor_pct | numeric | YES |  |
| cpi_cap_pct | numeric | YES |  |
| annual_increase_amount | numeric | YES |  |
| step_schedule | text | YES |  |
| first_escalation_date | date | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_rent_roll (29 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| rent_roll_id | bigint | NO | nextval('tbl_rent_roll_rent_roll_id_seq'::regclass |
| project_id | bigint | NO |  |
| tenant_name | character varying | NO |  |
| space_type | character varying | YES |  |
| lease_start_date | date | NO |  |
| lease_end_date | date | NO |  |
| lease_term_months | integer | NO |  |
| leased_sf | numeric | NO |  |
| base_rent_psf_annual | numeric | NO |  |
| escalation_type | character varying | YES | 'NONE'::character varying |
| escalation_value | numeric | YES |  |
| escalation_frequency_months | integer | YES | 12 |
| recovery_structure | character varying | YES | 'GROSS'::character varying |
| cam_recovery_rate | numeric | YES | 1.0 |
| tax_recovery_rate | numeric | YES | 1.0 |
| insurance_recovery_rate | numeric | YES | 1.0 |
| free_rent_months | integer | YES | 0 |
| free_rent_start_month | integer | YES | 1 |
| rent_abatement_amount | numeric | YES | 0 |
| has_percentage_rent | boolean | YES | false |
| percentage_rent_rate | numeric | YES |  |
| percentage_rent_breakpoint | numeric | YES |  |
| ti_allowance_psf | numeric | YES | 0 |
| lc_allowance_psf | numeric | YES | 0 |
| lease_status | character varying | YES | 'ACTIVE'::character varying |
| is_vacancy | boolean | YES | false |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_rent_roll_unit (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| rent_roll_id | bigint | NO | nextval('tbl_rent_roll_unit_rent_roll_id_seq'::reg |
| project_id | bigint | NO |  |
| unit_id | bigint | YES |  |
| unit_number | character varying | NO |  |
| unit_type | character varying | YES |  |
| square_feet | integer | YES |  |
| current_rent | numeric | YES |  |
| market_rent | numeric | YES |  |
| lease_start_date | date | YES |  |
| lease_end_date | date | YES |  |
| tenant_name | character varying | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_rent_schedule (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| base_rent_id | integer | NO | nextval('tbl_rent_schedule_rent_schedule_id_seq':: |
| lease_id | integer | YES |  |
| period_start_date | date | NO |  |
| period_end_date | date | NO |  |
| period_number | integer | YES |  |
| base_rent_annual | numeric | YES |  |
| base_rent_monthly | numeric | YES |  |
| base_rent_psf_annual | numeric | YES |  |
| rent_type | character varying | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_rent_step (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| rent_step_id | integer | NO | nextval('tbl_rent_step_rent_step_id_seq'::regclass |
| lease_id | integer | NO |  |
| step_number | integer | NO |  |
| step_effective_date | date | NO |  |
| step_end_date | date | YES |  |
| base_rent_psf | numeric | YES |  |
| base_rent_monthly | numeric | YES |  |
| base_rent_annual | numeric | YES |  |
| step_type | character varying | YES |  |
| step_increase_pct | numeric | YES |  |
| step_increase_amount | numeric | YES |  |
| cumulative_increase_pct | numeric | YES |  |
| cpi_index | character varying | YES |  |
| cpi_base_value | numeric | YES |  |
| cpi_current_value | numeric | YES |  |
| cpi_floor_pct | numeric | YES |  |
| cpi_cap_pct | numeric | YES |  |
| rent_psf_change | numeric | YES |  |
| rent_annual_change | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_rental_comparable (23 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| comparable_id | integer | NO | nextval('tbl_rental_comparable_comparable_id_seq': |
| project_id | integer | NO |  |
| property_name | character varying | NO |  |
| address | character varying | YES |  |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| distance_miles | numeric | YES |  |
| year_built | integer | YES |  |
| total_units | integer | YES |  |
| unit_type | character varying | NO |  |
| bedrooms | numeric | NO |  |
| bathrooms | numeric | NO |  |
| avg_sqft | integer | NO |  |
| asking_rent | numeric | NO |  |
| effective_rent | numeric | YES |  |
| concessions | character varying | YES |  |
| amenities | text | YES |  |
| notes | text | YES |  |
| data_source | character varying | YES |  |
| as_of_date | date | NO |  |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_revenue_other (23 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| other_income_id | bigint | NO | nextval('tbl_revenue_other_other_income_id_seq'::r |
| project_id | bigint | NO |  |
| other_income_per_unit_monthly | numeric | YES | 0 |
| parking_income_per_space | numeric | YES | 50 |
| parking_spaces | integer | YES |  |
| pet_fee_per_pet | numeric | YES | 35 |
| pet_penetration_pct | numeric | YES | 0.30 |
| laundry_income_per_unit | numeric | YES | 15 |
| storage_income_per_unit | numeric | YES | 10 |
| application_fees_annual | numeric | YES | 0 |
| late_fees_annual | numeric | YES |  |
| utility_reimbursements_annual | numeric | YES |  |
| furnished_unit_premium_pct | numeric | YES |  |
| short_term_rental_income | numeric | YES |  |
| ancillary_services_income | numeric | YES |  |
| vending_income | numeric | YES |  |
| package_locker_fees | numeric | YES |  |
| reserved_parking_premium | numeric | YES |  |
| ev_charging_fees | numeric | YES |  |
| other_miscellaneous | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| income_category | character varying | YES |  |

### tbl_revenue_rent (17 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| rent_id | bigint | NO | nextval('tbl_revenue_rent_rent_id_seq'::regclass) |
| project_id | bigint | NO |  |
| current_rent_psf | numeric | NO |  |
| occupancy_pct | numeric | NO | 0.95 |
| annual_rent_growth_pct | numeric | NO | 0.03 |
| in_place_rent_psf | numeric | YES |  |
| market_rent_psf | numeric | YES |  |
| rent_loss_to_lease_pct | numeric | YES |  |
| lease_up_months | integer | YES | 12 |
| stabilized_occupancy_pct | numeric | YES | 0.96 |
| rent_growth_years_1_3_pct | numeric | YES | 0.04 |
| rent_growth_stabilized_pct | numeric | YES | 0.025 |
| free_rent_months | numeric | YES | 0 |
| ti_allowance_per_unit | numeric | YES | 0 |
| renewal_probability_pct | numeric | YES | 0.60 |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_revenue_timing (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| revenue_timing_id | bigint | NO | nextval('tbl_revenue_timing_revenue_timing_id_seq' |
| absorption_id | bigint | NO |  |
| period_id | bigint | NO |  |
| units_sold_this_period | numeric | YES | 0 |
| cumulative_units_sold | numeric | YES | 0 |
| units_remaining | numeric | YES |  |
| average_price_this_period | numeric | YES |  |
| gross_revenue | numeric | YES |  |
| sales_commission | numeric | YES | 0 |
| closing_costs | numeric | YES | 0 |
| net_revenue | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_sale_benchmarks (18 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| benchmark_id | integer | NO | nextval('tbl_sale_benchmarks_benchmark_id_seq'::re |
| scope_level | character varying | NO |  |
| project_id | integer | YES |  |
| lu_type_code | character varying | YES |  |
| product_code | character varying | YES |  |
| benchmark_type | character varying | NO |  |
| benchmark_name | character varying | YES |  |
| rate_pct | numeric | YES |  |
| amount_per_uom | numeric | YES |  |
| fixed_amount | numeric | YES |  |
| uom_code | character varying | YES |  |
| description | text | YES |  |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| created_by | character varying | YES |  |
| updated_by | character varying | YES |  |
| basis | character varying | YES |  |

### tbl_sale_phases (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| phase_code | character varying | NO |  |
| project_id | integer | NO |  |
| phase_name | character varying | YES |  |
| default_sale_date | date | NO |  |
| default_commission_pct | numeric | YES | 3.0 |
| default_closing_cost_per_unit | numeric | YES | 750.00 |
| default_onsite_cost_pct | numeric | YES | 6.5 |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_sale_settlement (29 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| settlement_id | bigint | NO | nextval('tbl_sale_settlement_settlement_id_seq'::r |
| project_id | bigint | NO |  |
| container_id | bigint | YES |  |
| sale_date | date | NO |  |
| buyer_name | character varying | YES |  |
| buyer_entity | character varying | YES |  |
| list_price | numeric | YES |  |
| allocated_cost_to_complete | numeric | YES | 0 |
| other_adjustments | numeric | YES | 0 |
| net_proceeds | numeric | YES |  |
| settlement_type | character varying | YES |  |
| settlement_notes | text | YES |  |
| cost_allocation_detail | jsonb | YES |  |
| has_participation | boolean | YES | false |
| participation_rate | numeric | YES |  |
| participation_basis | character varying | YES |  |
| participation_minimum | numeric | YES |  |
| participation_target_price | numeric | YES |  |
| settlement_status | character varying | YES | 'pending'::character varying |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| created_by | character varying | YES |  |
| updated_by | character varying | YES |  |
| parcel_id | integer | YES |  |
| sale_phase_code | character varying | YES |  |
| commission_pct | numeric | YES |  |
| closing_cost_per_unit | numeric | YES |  |
| onsite_cost_pct | numeric | YES |  |
| gross_value | numeric | YES |  |

### tbl_sales_comp_adjustments (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| adjustment_id | integer | NO | nextval('tbl_sales_comp_adjustments_adjustment_id_ |
| comparable_id | integer | NO |  |
| adjustment_type | character varying | NO |  |
| adjustment_pct | numeric | YES |  |
| adjustment_amount | numeric | YES |  |
| justification | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| user_adjustment_pct | numeric | YES |  |
| ai_accepted | boolean | YES | false |
| user_notes | text | YES |  |
| last_modified_by | character varying | YES |  |
| landscaper_analysis | text | YES |  |
| user_override_analysis | text | YES |  |
| analysis_inputs | jsonb | YES |  |
| confidence_score | numeric | YES |  |
| created_by | character varying | YES |  |
| approved_by | integer | YES |  |
| approved_at | timestamp with time zone | YES |  |
| subject_value | character varying | YES |  |
| comp_value | character varying | YES |  |

### tbl_sales_comp_contacts (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| contact_id | integer | NO | nextval('tbl_sales_comp_contacts_contact_id_seq':: |
| comparable_id | integer | NO |  |
| role | character varying | NO |  |
| name | character varying | YES |  |
| company | character varying | YES |  |
| phone | character varying | YES |  |
| email | character varying | YES |  |
| is_verification_source | boolean | NO | false |
| verification_date | date | YES |  |
| sort_order | integer | NO | 0 |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### tbl_sales_comp_history (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| history_id | bigint | NO | nextval('tbl_sales_comp_history_history_id_seq'::r |
| comparable_id | integer | NO |  |
| sale_date | date | NO |  |
| sale_price | numeric | YES |  |
| price_per_sf | numeric | YES |  |
| price_per_unit | numeric | YES |  |
| buyer_name | character varying | YES |  |
| seller_name | character varying | YES |  |
| sale_type | character varying | YES |  |
| document_number | character varying | YES |  |
| is_arms_length | boolean | YES | true |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_hospitality (27 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| hospitality_id | bigint | NO | nextval('tbl_sales_comp_hospitality_hospitality_id |
| comparable_id | integer | NO |  |
| total_rooms | integer | YES |  |
| available_rooms | integer | YES |  |
| suites_count | integer | YES |  |
| occupancy_rate | numeric | YES |  |
| adr | numeric | YES |  |
| revpar | numeric | YES |  |
| total_revenue | numeric | YES |  |
| rooms_revenue | numeric | YES |  |
| fb_revenue | numeric | YES |  |
| other_revenue | numeric | YES |  |
| flag_brand | character varying | YES |  |
| franchise_company | character varying | YES |  |
| management_company | character varying | YES |  |
| chain_scale | character varying | YES |  |
| meeting_space_sf | numeric | YES |  |
| restaurant_count | integer | YES |  |
| pool | boolean | YES |  |
| fitness_center | boolean | YES |  |
| spa | boolean | YES |  |
| last_renovation_year | integer | YES |  |
| last_pia_year | integer | YES |  |
| franchise_expiration | date | YES |  |
| management_expiration | date | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_industrial (27 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| industrial_id | bigint | NO | nextval('tbl_sales_comp_industrial_industrial_id_s |
| comparable_id | integer | NO |  |
| clear_height_min | numeric | YES |  |
| clear_height_max | numeric | YES |  |
| column_spacing | character varying | YES |  |
| dock_doors_exterior | integer | YES |  |
| dock_doors_interior | integer | YES |  |
| drive_in_doors | integer | YES |  |
| rail_doors | integer | YES |  |
| trailer_parking_spaces | integer | YES |  |
| auto_parking_spaces | integer | YES |  |
| yard_area_sf | numeric | YES |  |
| fenced_yard | boolean | YES |  |
| rail_access | boolean | YES | false |
| rail_served | boolean | YES | false |
| crane_capacity_tons | numeric | YES |  |
| crane_count | integer | YES |  |
| power_voltage | integer | YES |  |
| power_amps | integer | YES |  |
| power_phase | integer | YES |  |
| office_sf | numeric | YES |  |
| office_pct | numeric | YES |  |
| environmental_phase1 | boolean | YES |  |
| environmental_phase2 | boolean | YES |  |
| environmental_issues | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_land (36 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| land_id | bigint | NO | nextval('tbl_sales_comp_land_land_id_seq'::regclas |
| comparable_id | integer | NO |  |
| current_zoning | character varying | YES |  |
| proposed_zoning | character varying | YES |  |
| zoning_description | text | YES |  |
| entitled | boolean | YES | false |
| entitlement_status | character varying | YES |  |
| approved_uses | text | YES |  |
| approved_density | numeric | YES |  |
| approved_units | integer | YES |  |
| approved_sf | numeric | YES |  |
| max_far | numeric | YES |  |
| max_height_ft | numeric | YES |  |
| topography | character varying | YES |  |
| shape | character varying | YES |  |
| frontage_ft | numeric | YES |  |
| depth_ft | numeric | YES |  |
| corner_lot | boolean | YES | false |
| flood_zone | character varying | YES |  |
| wetlands_pct | numeric | YES |  |
| water_available | boolean | YES |  |
| sewer_available | boolean | YES |  |
| gas_available | boolean | YES |  |
| electric_available | boolean | YES |  |
| utility_notes | text | YES |  |
| existing_improvements | text | YES |  |
| demolition_required | boolean | YES | false |
| demolition_cost_estimate | numeric | YES |  |
| phase1_complete | boolean | YES |  |
| phase2_complete | boolean | YES |  |
| remediation_required | boolean | YES | false |
| remediation_cost_estimate | numeric | YES |  |
| impact_fees_estimate | numeric | YES |  |
| offsite_costs_estimate | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_manufactured (27 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| manufactured_id | bigint | NO | nextval('tbl_sales_comp_manufactured_manufactured_ |
| comparable_id | integer | NO |  |
| total_pads | integer | YES |  |
| occupied_pads | integer | YES |  |
| vacant_pads | integer | YES |  |
| occupancy_rate | numeric | YES |  |
| park_owned_homes | integer | YES |  |
| resident_owned_homes | integer | YES |  |
| avg_pad_rent | numeric | YES |  |
| total_pad_income | numeric | YES |  |
| home_rental_income | numeric | YES |  |
| utility_income | numeric | YES |  |
| other_income | numeric | YES |  |
| water_sewer_type | character varying | YES |  |
| utilities_included | character varying | YES |  |
| submetered | boolean | YES |  |
| clubhouse | boolean | YES |  |
| pool | boolean | YES |  |
| laundry_facility | boolean | YES |  |
| playground | boolean | YES |  |
| all_ages | boolean | YES | true |
| senior_community | boolean | YES | false |
| min_age | integer | YES |  |
| rv_spaces | integer | YES |  |
| rv_avg_rent | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_market_conditions (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| market_id | bigint | NO | nextval('tbl_sales_comp_market_conditions_market_i |
| comparable_id | integer | NO |  |
| as_of_date | date | YES |  |
| submarket_vacancy_rate | numeric | YES |  |
| submarket_asking_rent | numeric | YES |  |
| submarket_effective_rent | numeric | YES |  |
| submarket_absorption_sf | numeric | YES |  |
| submarket_inventory_sf | numeric | YES |  |
| metro_vacancy_rate | numeric | YES |  |
| metro_asking_rent | numeric | YES |  |
| metro_cap_rate_avg | numeric | YES |  |
| yoy_rent_growth | numeric | YES |  |
| yoy_vacancy_change | numeric | YES |  |
| under_construction_sf | numeric | YES |  |
| planned_sf | numeric | YES |  |
| unemployment_rate | numeric | YES |  |
| job_growth_pct | numeric | YES |  |
| population_growth_pct | numeric | YES |  |
| source | character varying | YES |  |
| created_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_office (29 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| office_id | bigint | NO | nextval('tbl_sales_comp_office_office_id_seq'::reg |
| comparable_id | integer | NO |  |
| rentable_sf | numeric | YES |  |
| usable_sf | numeric | YES |  |
| loss_factor | numeric | YES |  |
| floor_plate_sf | numeric | YES |  |
| avg_base_rent_psf | numeric | YES |  |
| expense_stop | numeric | YES |  |
| expense_structure | character varying | YES |  |
| avg_ti_psf | numeric | YES |  |
| avg_free_rent_months | numeric | YES |  |
| direct_vacancy_pct | numeric | YES |  |
| sublease_vacancy_pct | numeric | YES |  |
| total_vacancy_pct | numeric | YES |  |
| walt_years | numeric | YES |  |
| hvac_type | character varying | YES |  |
| life_safety_system | character varying | YES |  |
| backup_power | boolean | YES |  |
| fiber_providers | character varying | YES |  |
| parking_ratio_per_1000 | numeric | YES |  |
| reserved_spaces | integer | YES |  |
| unreserved_spaces | integer | YES |  |
| monthly_parking_rate | numeric | YES |  |
| leed_certified | boolean | YES |  |
| leed_level | character varying | YES |  |
| energy_star_score | integer | YES |  |
| wired_score | character varying | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_retail (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| retail_id | bigint | NO | nextval('tbl_sales_comp_retail_retail_id_seq'::reg |
| comparable_id | integer | NO |  |
| center_type | character varying | YES |  |
| anchor_tenant | character varying | YES |  |
| shadow_anchor | character varying | YES |  |
| anchor_sf | numeric | YES |  |
| junior_anchor_sf | numeric | YES |  |
| inline_sf | numeric | YES |  |
| outparcel_count | integer | YES |  |
| outparcel_sf | numeric | YES |  |
| anchor_sales_psf | numeric | YES |  |
| inline_sales_psf | numeric | YES |  |
| total_sales_psf | numeric | YES |  |
| avg_base_rent_psf | numeric | YES |  |
| avg_cam_psf | numeric | YES |  |
| avg_all_in_rent_psf | numeric | YES |  |
| expense_structure | character varying | YES |  |
| traffic_count | integer | YES |  |
| traffic_count_source | character varying | YES |  |
| signage_type | character varying | YES |  |
| pylon_sign | boolean | YES |  |
| monument_sign | boolean | YES |  |
| freeway_visible | boolean | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_self_storage (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| storage_id | bigint | NO | nextval('tbl_sales_comp_self_storage_storage_id_se |
| comparable_id | integer | NO |  |
| total_units | integer | YES |  |
| climate_controlled_units | integer | YES |  |
| non_climate_units | integer | YES |  |
| climate_controlled_pct | numeric | YES |  |
| total_net_rentable_sf | numeric | YES |  |
| climate_controlled_sf | numeric | YES |  |
| avg_unit_size_sf | numeric | YES |  |
| physical_occupancy | numeric | YES |  |
| economic_occupancy | numeric | YES |  |
| avg_rent_psf | numeric | YES |  |
| gross_potential_rent | numeric | YES |  |
| drive_up_access_pct | numeric | YES |  |
| elevator_served_pct | numeric | YES |  |
| rv_boat_parking_spaces | integer | YES |  |
| vehicle_storage_spaces | integer | YES |  |
| management_type | character varying | YES |  |
| brand_flag | character varying | YES |  |
| third_party_managed | boolean | YES |  |
| expansion_potential | boolean | YES |  |
| expansion_units | integer | YES |  |
| expansion_sf | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_specialty_housing (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| specialty_id | bigint | NO | nextval('tbl_sales_comp_specialty_housing_specialt |
| comparable_id | integer | NO |  |
| housing_type | character varying | NO |  |
| total_beds | integer | YES |  |
| total_units | integer | YES |  |
| avg_beds_per_unit | numeric | YES |  |
| independent_living_units | integer | YES |  |
| assisted_living_units | integer | YES |  |
| memory_care_units | integer | YES |  |
| skilled_nursing_beds | integer | YES |  |
| license_type | character varying | YES |  |
| affiliated_university | character varying | YES |  |
| distance_to_campus_miles | numeric | YES |  |
| by_the_bed_leasing | boolean | YES |  |
| furnished | boolean | YES |  |
| occupancy_rate | numeric | YES |  |
| avg_monthly_rent | numeric | YES |  |
| avg_daily_rate | numeric | YES |  |
| revenue_per_bed | numeric | YES |  |
| operator_name | character varying | YES |  |
| third_party_managed | boolean | YES |  |
| medicaid_certified | boolean | YES |  |
| medicare_certified | boolean | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_storage_unit_mix (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| unit_mix_id | bigint | NO | nextval('tbl_sales_comp_storage_unit_mix_unit_mix_ |
| storage_comp_id | bigint | NO |  |
| unit_size_category | character varying | YES |  |
| unit_width_ft | numeric | YES |  |
| unit_depth_ft | numeric | YES |  |
| unit_sf | numeric | YES |  |
| unit_count | integer | YES |  |
| climate_controlled | boolean | YES | false |
| drive_up_access | boolean | YES | false |
| asking_rent | numeric | YES |  |
| effective_rent | numeric | YES |  |
| occupancy_pct | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_tenants (27 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| tenant_id | bigint | NO | nextval('tbl_sales_comp_tenants_tenant_id_seq'::re |
| comparable_id | integer | NO |  |
| tenant_name | character varying | NO |  |
| tenant_type | character varying | YES |  |
| is_anchor | boolean | YES | false |
| credit_rating | character varying | YES |  |
| leased_sf | numeric | YES |  |
| floor_number | character varying | YES |  |
| suite_number | character varying | YES |  |
| pct_of_building | numeric | YES |  |
| lease_start_date | date | YES |  |
| lease_expiration_date | date | YES |  |
| lease_term_months | integer | YES |  |
| lease_type | character varying | YES |  |
| base_rent_psf | numeric | YES |  |
| base_rent_annual | numeric | YES |  |
| expense_stop | numeric | YES |  |
| ti_allowance_psf | numeric | YES |  |
| free_rent_months | integer | YES |  |
| renewal_options | text | YES |  |
| expansion_options | text | YES |  |
| termination_options | text | YES |  |
| sales_psf | numeric | YES |  |
| pct_rent_breakpoint | numeric | YES |  |
| pct_rent_rate | numeric | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comp_unit_mix (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| unit_mix_id | bigint | NO | nextval('tbl_sales_comp_unit_mix_unit_mix_id_seq': |
| comparable_id | integer | NO |  |
| bed_count | integer | YES |  |
| bath_count | numeric | YES |  |
| unit_type | character varying | YES |  |
| unit_count | integer | NO |  |
| unit_pct | numeric | YES |  |
| avg_unit_sf | numeric | YES |  |
| total_sf | numeric | YES |  |
| asking_rent_min | numeric | YES |  |
| asking_rent_max | numeric | YES |  |
| asking_rent_per_sf_min | numeric | YES |  |
| asking_rent_per_sf_max | numeric | YES |  |
| effective_rent_min | numeric | YES |  |
| effective_rent_max | numeric | YES |  |
| effective_rent_per_sf_min | numeric | YES |  |
| effective_rent_per_sf_max | numeric | YES |  |
| vacant_units | integer | YES | 0 |
| concession_pct | numeric | YES |  |
| monthly_discount | numeric | YES |  |
| one_time_concession | numeric | YES |  |
| is_rent_regulated | boolean | YES | false |
| rent_type | character varying | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_sales_comparables (125 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| comparable_id | integer | NO | nextval('tbl_sales_comparables_comparable_id_seq': |
| project_id | integer | NO |  |
| comp_number | integer | YES |  |
| property_name | character varying | YES |  |
| address | character varying | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| zip | character varying | YES |  |
| sale_date | date | YES |  |
| sale_price | numeric | YES |  |
| price_per_unit | numeric | YES |  |
| price_per_sf | numeric | YES |  |
| year_built | integer | YES |  |
| units | numeric | YES |  |
| building_sf | character varying | YES |  |
| cap_rate | character varying | YES |  |
| grm | numeric | YES |  |
| distance_from_subject | character varying | YES |  |
| unit_mix | jsonb | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| unit_count | integer | YES |  |
| costar_comp_id | character varying | YES |  |
| price_status | character varying | YES |  |
| comp_status | character varying | YES |  |
| sale_type | character varying | YES |  |
| sale_conditions | character varying | YES |  |
| hold_period_months | integer | YES |  |
| days_on_market | integer | YES |  |
| asking_price | numeric | YES |  |
| transfer_tax | numeric | YES |  |
| document_number | character varying | YES |  |
| escrow_length_days | integer | YES |  |
| percent_leased_at_sale | numeric | YES |  |
| actual_cap_rate | numeric | YES |  |
| pro_forma_cap_rate | numeric | YES |  |
| gim | numeric | YES |  |
| noi_at_sale | numeric | YES |  |
| gross_income_at_sale | numeric | YES |  |
| financing_type | character varying | YES |  |
| financing_lender | character varying | YES |  |
| financing_amount | numeric | YES |  |
| financing_rate | numeric | YES |  |
| financing_term_months | integer | YES |  |
| loan_to_value | numeric | YES |  |
| assumed_financing | boolean | YES | false |
| recorded_buyer | character varying | YES |  |
| true_buyer | character varying | YES |  |
| buyer_contact | character varying | YES |  |
| buyer_type | character varying | YES |  |
| recorded_seller | character varying | YES |  |
| true_seller | character varying | YES |  |
| seller_contact | character varying | YES |  |
| seller_type | character varying | YES |  |
| buyer_broker_company | character varying | YES |  |
| buyer_broker_name | character varying | YES |  |
| buyer_broker_phone | character varying | YES |  |
| listing_broker_company | character varying | YES |  |
| listing_broker_name | character varying | YES |  |
| listing_broker_phone | character varying | YES |  |
| no_broker_deal | boolean | YES | false |
| property_type | character varying | YES |  |
| property_subtype | character varying | YES |  |
| building_class | character varying | YES |  |
| costar_star_rating | numeric | YES |  |
| location_type | character varying | YES |  |
| num_buildings | integer | YES |  |
| num_floors | integer | YES |  |
| typical_floor_sf | numeric | YES |  |
| tenancy_type | character varying | YES |  |
| owner_occupied | boolean | YES |  |
| avg_unit_size_sf | numeric | YES |  |
| units_per_acre | numeric | YES |  |
| parking_spaces | integer | YES |  |
| parking_ratio | numeric | YES |  |
| parking_type | character varying | YES |  |
| elevators | integer | YES |  |
| zoning | character varying | YES |  |
| construction_type | character varying | YES |  |
| roof_type | character varying | YES |  |
| hvac_type | character varying | YES |  |
| sprinklered | boolean | YES |  |
| land_area_sf | numeric | YES |  |
| land_area_acres | numeric | YES |  |
| far_allowed | numeric | YES |  |
| far_actual | numeric | YES |  |
| num_parcels | integer | YES |  |
| topography | character varying | YES |  |
| utilities_available | character varying | YES |  |
| entitlements | character varying | YES |  |
| environmental_issues | text | YES |  |
| total_assessed_value | numeric | YES |  |
| land_assessed_value | numeric | YES |  |
| improved_assessed_value | numeric | YES |  |
| assessment_year | integer | YES |  |
| tax_amount | numeric | YES |  |
| tax_per_unit | numeric | YES |  |
| percent_improved | numeric | YES |  |
| metro_market | character varying | YES |  |
| submarket | character varying | YES |  |
| county | character varying | YES |  |
| cbsa | character varying | YES |  |
| csa | character varying | YES |  |
| dma | character varying | YES |  |
| walk_score | integer | YES |  |
| transit_score | integer | YES |  |
| bike_score | integer | YES |  |
| data_source | character varying | YES |  |
| verification_status | character varying | YES |  |
| verification_source | character varying | YES |  |
| verification_date | date | YES |  |
| transaction_notes | text | YES |  |
| internal_notes | text | YES |  |
| is_portfolio_sale | boolean | YES | false |
| portfolio_name | character varying | YES |  |
| portfolio_property_count | integer | YES |  |
| price_allocation_method | character varying | YES |  |
| allocated_price | numeric | YES |  |
| site_amenities | jsonb | YES |  |
| extra_data | jsonb | YES |  |
| raw_import_data | jsonb | YES |  |
| property_rights | character varying | YES |  |

### tbl_scenario (19 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| scenario_id | integer | NO | nextval('tbl_scenario_scenario_id_seq'::regclass) |
| project_id | integer | NO |  |
| scenario_name | character varying | NO |  |
| scenario_type | character varying | NO | 'custom'::character varying |
| scenario_code | character varying | YES |  |
| is_active | boolean | YES | false |
| is_locked | boolean | YES | false |
| display_order | integer | YES | 0 |
| description | text | YES |  |
| color_hex | character varying | YES | '#6B7280'::character varying |
| variance_method | character varying | YES |  |
| revenue_variance_pct | numeric | YES |  |
| cost_variance_pct | numeric | YES |  |
| absorption_variance_pct | numeric | YES |  |
| start_date_offset_months | integer | YES | 0 |
| created_by | integer | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| cloned_from_scenario_id | integer | YES |  |

### tbl_scenario_comparison (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| comparison_id | integer | NO | nextval('tbl_scenario_comparison_comparison_id_seq |
| project_id | integer | NO |  |
| comparison_name | character varying | NO |  |
| scenario_ids | ARRAY | NO |  |
| comparison_type | character varying | YES | 'side_by_side'::character varying |
| scenario_probabilities | ARRAY | YES |  |
| comparison_results | jsonb | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_scenario_log (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| scenario_log_id | bigint | NO | nextval('tbl_scenario_log_scenario_log_id_seq'::re |
| project_id | integer | NO |  |
| thread_id | uuid | YES |  |
| user_id | integer | YES |  |
| scenario_name | character varying | YES |  |
| description | text | YES |  |
| status | character varying | NO | 'active_shadow'::character varying |
| scenario_data | jsonb | NO | '{}'::jsonb |
| parent_scenario_id | bigint | YES |  |
| source | character varying | YES | 'landscaper_chat'::character varying |
| tags | ARRAY | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| committed_at | timestamp with time zone | YES |  |
| committed_by | integer | YES |  |

### tbl_security_deposit (29 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| deposit_id | integer | NO | nextval('tbl_security_deposit_deposit_id_seq'::reg |
| lease_id | integer | NO |  |
| deposit_type | character varying | YES |  |
| deposit_amount | numeric | YES |  |
| deposit_months | numeric | YES |  |
| loc_issuing_bank | character varying | YES |  |
| loc_expiration_date | date | YES |  |
| loc_auto_renew | boolean | YES | false |
| loc_renewal_notice_days | integer | YES |  |
| loc_beneficiary | character varying | YES |  |
| guarantor_name | character varying | YES |  |
| guarantor_relationship | character varying | YES |  |
| guarantee_type | character varying | YES |  |
| guarantee_cap | numeric | YES |  |
| guarantee_burn_down | boolean | YES | false |
| burn_down_schedule | text | YES |  |
| deposit_reduction_allowed | boolean | YES | false |
| reduction_trigger | character varying | YES |  |
| reduction_schedule | text | YES |  |
| interest_bearing | boolean | YES | false |
| interest_rate_pct | numeric | YES |  |
| interest_payment_frequency | character varying | YES |  |
| deposit_received | boolean | YES | false |
| deposit_received_date | date | YES |  |
| deposit_account_number | character varying | YES |  |
| current_deposit_balance | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_space (18 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| space_id | integer | NO | nextval('tbl_space_space_id_seq'::regclass) |
| income_property_id | integer | YES |  |
| space_number | character varying | YES |  |
| floor_number | integer | YES |  |
| usable_sf | numeric | YES |  |
| rentable_sf | numeric | YES |  |
| space_type | character varying | YES |  |
| frontage_ft | numeric | YES |  |
| ceiling_height_ft | numeric | YES |  |
| number_of_offices | integer | YES |  |
| number_of_conference_rooms | integer | YES |  |
| has_kitchenette | boolean | YES | false |
| has_private_restroom | boolean | YES | false |
| space_status | character varying | YES |  |
| available_date | date | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| space_type_code | character varying | YES | 'CRE'::character varying |

### tbl_space_ind_ext (17 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| space_id | integer | NO |  |
| warehouse_sf | numeric | YES |  |
| office_sf | numeric | YES |  |
| mezzanine_sf | numeric | YES |  |
| outdoor_storage_sf | numeric | YES |  |
| office_finish_level | character varying | YES |  |
| office_ratio_pct | numeric | YES |  |
| dedicated_docks | integer | YES | 0 |
| shared_dock_access | boolean | YES | false |
| dedicated_electrical | boolean | YES | false |
| electrical_amps | integer | YES |  |
| rack_system | boolean | YES | false |
| rack_value | numeric | YES |  |
| crane_system | boolean | YES | false |
| crane_capacity_tons | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_space_mf_ext (28 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| space_id | integer | NO |  |
| unit_type | character varying | YES |  |
| bedrooms | integer | YES |  |
| bathrooms | numeric | YES |  |
| half_baths | integer | YES | 0 |
| has_washer_dryer | boolean | YES | false |
| washer_dryer_type | character varying | YES |  |
| has_dishwasher | boolean | YES | false |
| has_fireplace | boolean | YES | false |
| has_balcony | boolean | YES | false |
| has_patio | boolean | YES | false |
| balcony_sf | numeric | YES |  |
| floor_type | character varying | YES |  |
| countertop_type | character varying | YES |  |
| cabinet_type | character varying | YES |  |
| appliance_package | character varying | YES |  |
| view_type | character varying | YES |  |
| floor_premium_pct | numeric | YES |  |
| corner_unit | boolean | YES | false |
| market_rent | numeric | YES |  |
| effective_rent | numeric | YES |  |
| loss_to_lease | numeric | YES |  |
| concession_value | numeric | YES |  |
| renovation_status | character varying | YES |  |
| last_renovation_date | date | YES |  |
| renovation_cost | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_space_ret_ext (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| space_id | integer | NO |  |
| retail_space_type | character varying | YES |  |
| tenant_category | character varying | YES |  |
| frontage_ft | numeric | YES |  |
| depth_ft | numeric | YES |  |
| storefront_ft | numeric | YES |  |
| corner_location | boolean | YES | false |
| end_cap | boolean | YES | false |
| grease_trap | boolean | YES | false |
| hood_system | boolean | YES | false |
| walk_in_cooler | boolean | YES | false |
| drive_thru | boolean | YES | false |
| patio_sf | numeric | YES |  |
| visibility_score | integer | YES |  |
| highway_frontage | boolean | YES | false |
| main_entrance_proximity | boolean | YES | false |
| reported_sales | numeric | YES |  |
| sales_reporting_date | date | YES |  |
| sales_psf | numeric | YES |  |
| breakpoint_achieved | boolean | YES | false |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_system_picklist (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| picklist_id | bigint | NO | nextval('tbl_system_picklist_picklist_id_seq'::reg |
| picklist_type | character varying | NO |  |
| code | character varying | NO |  |
| name | character varying | NO |  |
| description | text | YES |  |
| parent_id | bigint | YES |  |
| sort_order | integer | YES | 0 |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_template_column_config (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| template_column_id | bigint | NO | nextval('tbl_template_column_config_template_colum |
| template_id | bigint | NO |  |
| column_name | character varying | NO |  |
| column_label | character varying | NO |  |
| column_type | character varying | NO |  |
| data_type | character varying | YES |  |
| container_level | integer | YES |  |
| display_order | integer | NO | 0 |
| is_required | boolean | YES | false |
| data_source_table | character varying | YES |  |
| data_source_value_col | character varying | YES |  |
| data_source_label_col | character varying | YES |  |
| parent_column_name | character varying | YES |  |
| junction_table | character varying | YES |  |
| created_at | timestamp with time zone | YES | now() |

### tbl_tenant (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| tenant_id | integer | NO | nextval('tbl_tenant_tenant_id_seq'::regclass) |
| tenant_name | character varying | NO |  |
| tenant_legal_name | character varying | YES |  |
| dba_name | character varying | YES |  |
| industry | character varying | YES |  |
| naics_code | character varying | YES |  |
| business_type | character varying | YES |  |
| credit_rating | character varying | YES |  |
| creditworthiness | character varying | YES |  |
| dun_bradstreet_number | character varying | YES |  |
| annual_revenue | numeric | YES |  |
| years_in_business | integer | YES |  |
| contact_name | character varying | YES |  |
| contact_title | character varying | YES |  |
| email | character varying | YES |  |
| phone | character varying | YES |  |
| guarantor_name | character varying | YES |  |
| guarantor_type | character varying | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_tenant_improvement (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| tenant_improvement_id | integer | NO |  |
| lease_id | integer | NO |  |
| allowance_psf | numeric | YES |  |
| allowance_total | numeric | YES |  |
| actual_cost | numeric | YES |  |
| landlord_contribution | numeric | YES |  |
| reimbursement_structure | character varying | YES | 'Upfront'::character varying |
| amortization_months | integer | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_termination_option (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| termination_option_id | integer | NO | nextval('tbl_termination_option_termination_option |
| lease_id | integer | NO |  |
| termination_type | character varying | YES |  |
| earliest_termination_date | date | YES |  |
| termination_window_start | date | YES |  |
| termination_window_end | date | YES |  |
| notice_period_months | integer | YES |  |
| notice_deadline | date | YES |  |
| termination_fee_type | character varying | YES |  |
| termination_fee_flat | numeric | YES |  |
| termination_fee_months_rent | integer | YES |  |
| unamortized_ti_included | boolean | YES | false |
| unamortized_lc_included | boolean | YES | false |
| termination_fee_formula | text | YES |  |
| estimated_termination_fee | numeric | YES |  |
| termination_conditions | text | YES |  |
| financial_covenant_trigger | boolean | YES | false |
| sales_threshold_trigger | numeric | YES |  |
| termination_exercised | boolean | YES | false |
| termination_notice_date | date | YES |  |
| actual_termination_date | date | YES |  |
| termination_fee_paid | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### tbl_uom_calculation_formulas (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| formula_id | integer | NO | nextval('tbl_uom_calculation_formulas_formula_id_s |
| uom_code | character varying | NO |  |
| formula_name | character varying | NO |  |
| formula_expression | text | NO |  |
| required_fields | ARRAY | NO |  |
| description | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_user_grid_preference (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| project_id | bigint | NO |  |
| grid_id | character varying | NO |  |
| column_order | jsonb | NO |  |
| column_visibility | jsonb | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| user_id | bigint | NO |  |

### tbl_user_landscaper_profile (17 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| profile_id | integer | NO |  |
| survey_completed_at | timestamp with time zone | YES |  |
| role_primary | character varying | YES |  |
| role_property_type | character varying | YES |  |
| ai_proficiency | character varying | YES |  |
| communication_tone | character varying | YES |  |
| primary_tool | character varying | YES |  |
| markets_text | text | YES |  |
| compiled_instructions | text | YES |  |
| onboarding_chat_history | jsonb | NO |  |
| interaction_insights | jsonb | NO |  |
| document_insights | jsonb | NO |  |
| tos_accepted_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| user_id | bigint | NO |  |
| custom_instructions | text | YES |  |

### tbl_user_preference (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| preference_key | character varying | NO |  |
| preference_value | jsonb | NO |  |
| scope_type | character varying | NO |  |
| scope_id | integer | YES |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| last_accessed_at | timestamp with time zone | NO |  |
| user_id | bigint | NO |  |

### tbl_vacancy_assumption (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| vacancy_id | bigint | NO | nextval('tbl_vacancy_assumption_vacancy_id_seq'::r |
| project_id | bigint | NO |  |
| vacancy_loss_pct | numeric | NO | 0.05 |
| collection_loss_pct | numeric | NO | 0.02 |
| physical_vacancy_pct | numeric | YES | 0.03 |
| economic_vacancy_pct | numeric | YES | 0.02 |
| bad_debt_pct | numeric | YES | 0.01 |
| concession_cost_pct | numeric | YES | 0.01 |
| turnover_vacancy_days | integer | YES | 14 |
| seasonal_vacancy_adjustment | jsonb | YES |  |
| lease_up_absorption_curve | jsonb | YES |  |
| market_vacancy_rate_pct | numeric | YES |  |
| submarket_vacancy_rate_pct | numeric | YES |  |
| competitive_set_vacancy_pct | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_valuation_reconciliation (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| reconciliation_id | integer | NO | nextval('tbl_valuation_reconciliation_reconciliati |
| project_id | integer | NO |  |
| sales_comparison_value | numeric | YES |  |
| sales_comparison_weight | numeric | YES |  |
| cost_approach_value | numeric | YES |  |
| cost_approach_weight | numeric | YES |  |
| income_approach_value | numeric | YES |  |
| income_approach_weight | numeric | YES |  |
| final_reconciled_value | numeric | YES |  |
| reconciliation_narrative | text | YES |  |
| valuation_date | date | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### tbl_value_add_assumptions (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| value_add_id | bigint | NO | nextval('tbl_value_add_assumptions_value_add_id_se |
| project_id | bigint | NO |  |
| is_enabled | boolean | YES | false |
| reno_cost_per_sf | numeric | YES |  |
| relocation_incentive | numeric | YES |  |
| renovate_all | boolean | YES | true |
| units_to_renovate | integer | YES |  |
| reno_starts_per_month | integer | YES |  |
| reno_start_month | integer | YES |  |
| rent_premium_pct | numeric | YES |  |
| relet_lag_months | integer | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| reno_cost_basis | character varying | YES | 'sf'::character varying |
| months_to_complete | integer | YES |  |

### tbl_waterfall (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| waterfall_id | integer | NO |  |
| project_id | integer | NO |  |
| waterfall_name | character varying | NO |  |
| tiers | jsonb | NO |  |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tbl_waterfall_tier (21 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| tier_id | bigint | NO | nextval('tbl_waterfall_tier_tier_id_seq'::regclass |
| equity_structure_id | bigint | NO |  |
| tier_number | integer | NO |  |
| tier_description | character varying | YES |  |
| hurdle_type | character varying | YES |  |
| hurdle_rate | numeric | YES |  |
| lp_split_pct | numeric | YES |  |
| gp_split_pct | numeric | YES |  |
| has_catch_up | boolean | YES | false |
| catch_up_pct | numeric | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| project_id | bigint | YES |  |
| tier_name | character varying | YES |  |
| irr_threshold_pct | numeric | YES |  |
| equity_multiple_threshold | numeric | YES |  |
| is_pari_passu | boolean | YES | false |
| is_lookback_tier | boolean | YES | false |
| catch_up_to_pct | numeric | YES |  |
| is_active | boolean | YES | true |
| display_order | integer | YES |  |

### tbl_zoning_control (19 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| zoning_control_id | bigint | NO | nextval('tbl_zoning_control_zoning_control_id_seq' |
| jurisdiction_id | bigint | YES |  |
| zoning_code | character varying | NO |  |
| landuse_code | character varying | NO |  |
| site_coverage_pct | numeric | YES |  |
| site_far | numeric | YES |  |
| max_stories | integer | YES |  |
| max_height_ft | numeric | YES |  |
| parking_ratio_per1000sf | numeric | YES |  |
| parking_stall_sf | numeric | YES |  |
| site_common_area_pct | numeric | YES |  |
| parking_sharing_flag | boolean | YES |  |
| parking_structured_flag | boolean | YES |  |
| setback_notes | text | YES |  |
| scenario_id | character varying | YES |  |
| valid_from | date | YES | CURRENT_DATE |
| valid_to | date | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

### tester_feedback (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | bigint | NO |  |
| page_url | character varying | NO |  |
| page_path | character varying | NO |  |
| project_id | integer | YES |  |
| project_name | character varying | YES |  |
| feedback_type | character varying | NO |  |
| message | text | NO |  |
| admin_notes | text | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| user_id | bigint | NO |  |
| status | character varying | NO |  |
| internal_id | uuid | NO |  |
| category | character varying | YES |  |
| affected_module | character varying | YES |  |
| landscaper_summary | text | YES |  |
| landscaper_raw_chat | jsonb | NO |  |
| browser_context | jsonb | NO |  |
| duplicate_of_id | bigint | YES |  |
| report_count | integer | NO |  |
| admin_response | text | YES |  |
| admin_responded_at | timestamp with time zone | YES |  |

### type_lot_product (2 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| type_id | bigint | NO |  |
| product_id | bigint | NO |  |

### user_profile (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('user_profile_id_seq'::regclass) |
| user_id | integer | NO |  |
| bio | text | YES |  |
| avatar_url | character varying | YES |  |
| timezone | character varying | YES | 'UTC'::character varying |
| preferences | jsonb | YES | '{}'::jsonb |

### user_settings (4 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| user_id | integer | NO |  |
| tier_level | character varying | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |

### v_ai_review_summary (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | integer | YES |  |
| project_name | character varying | YES |  |
| total_reviews | bigint | YES |  |
| last_review_date | timestamp with time zone | YES |  |
| field_updates_count | bigint | YES |  |
| ai_last_reviewed | timestamp with time zone | YES |  |

### v_contact_projects (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| contact_id | bigint | YES |  |
| contact_name | character varying | YES |  |
| contact_type | character varying | YES |  |
| company_name | character varying | YES |  |
| project_id | bigint | YES |  |
| project_name | character varying | YES |  |
| project_type_code | character varying | YES |  |
| project_is_active | boolean | YES |  |
| role_label | character varying | YES |  |
| role_category | character varying | YES |  |
| is_primary | boolean | YES |  |
| assigned_at | timestamp with time zone | YES |  |

### v_contact_relationships (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| relationship_id | bigint | YES |  |
| cabinet_id | bigint | YES |  |
| contact_id | bigint | YES |  |
| related_to_id | bigint | YES |  |
| relationship_type | character varying | YES |  |
| role_title | character varying | YES |  |
| start_date | date | YES |  |
| end_date | date | YES |  |
| is_current | boolean | YES |  |
| contact_name | character varying | YES |  |
| contact_type | character varying | YES |  |
| related_to_name | character varying | YES |  |
| related_to_type | character varying | YES |  |

### v_lease_summary (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | integer | YES |  |
| project_name | character varying | YES |  |
| total_leases | bigint | YES |  |
| contract_leases | bigint | YES |  |
| speculative_leases | bigint | YES |  |
| total_leased_sf | numeric | YES |  |
| occupied_sf | numeric | YES |  |
| occupancy_pct | numeric | YES |  |

### v_project_contacts (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| contact_id | bigint | YES |  |
| project_id | bigint | YES |  |
| contact_role | character varying | YES |  |
| role_display_name | text | YES |  |
| role_display_order | integer | YES |  |
| contact_name | character varying | YES |  |
| title | character varying | YES |  |
| company | character varying | YES |  |
| email | character varying | YES |  |
| phone_direct | character varying | YES |  |
| phone_mobile | character varying | YES |  |
| notes | text | YES |  |
| sort_order | integer | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |

### v_project_contacts_detail (23 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_contact_id | bigint | YES |  |
| project_id | bigint | YES |  |
| contact_id | bigint | YES |  |
| role_id | integer | YES |  |
| is_primary | boolean | YES |  |
| is_billing_contact | boolean | YES |  |
| assignment_notes | text | YES |  |
| assigned_at | timestamp with time zone | YES |  |
| contact_name | character varying | YES |  |
| display_name | character varying | YES |  |
| contact_type | character varying | YES |  |
| first_name | character varying | YES |  |
| last_name | character varying | YES |  |
| title | character varying | YES |  |
| company_name | character varying | YES |  |
| email | character varying | YES |  |
| phone | character varying | YES |  |
| phone_mobile | character varying | YES |  |
| role_code | character varying | YES |  |
| role_label | character varying | YES |  |
| role_category | character varying | YES |  |
| role_display_order | integer | YES |  |
| project_name | character varying | YES |  |

### v_rent_roll (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lease_id | integer | YES |  |
| project_id | integer | YES |  |
| tenant_name | character varying | YES |  |
| suite_number | character varying | YES |  |
| lease_status | character varying | YES |  |
| lease_type | character varying | YES |  |
| leased_sf | numeric | YES |  |
| lease_commencement_date | date | YES |  |
| lease_expiration_date | date | YES |  |
| lease_term_months | integer | YES |  |
| base_rent_psf_annual | numeric | YES |  |
| base_rent_annual | numeric | YES |  |
| base_rent_monthly | numeric | YES |  |
| renewal_probability_pct | numeric | YES |  |
| months_to_expiration | integer | YES |  |

### v_sales_comparables_full (137 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| comparable_id | integer | YES |  |
| project_id | integer | YES |  |
| comp_number | integer | YES |  |
| property_name | character varying | YES |  |
| address | character varying | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| zip | character varying | YES |  |
| sale_date | date | YES |  |
| sale_price | numeric | YES |  |
| price_per_unit | numeric | YES |  |
| price_per_sf | numeric | YES |  |
| year_built | integer | YES |  |
| units | numeric | YES |  |
| building_sf | character varying | YES |  |
| cap_rate | character varying | YES |  |
| grm | numeric | YES |  |
| distance_from_subject | character varying | YES |  |
| unit_mix | jsonb | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES |  |
| updated_at | timestamp without time zone | YES |  |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| unit_count | integer | YES |  |
| costar_comp_id | character varying | YES |  |
| price_status | character varying | YES |  |
| comp_status | character varying | YES |  |
| sale_type | character varying | YES |  |
| sale_conditions | character varying | YES |  |
| hold_period_months | integer | YES |  |
| days_on_market | integer | YES |  |
| asking_price | numeric | YES |  |
| transfer_tax | numeric | YES |  |
| document_number | character varying | YES |  |
| escrow_length_days | integer | YES |  |
| percent_leased_at_sale | numeric | YES |  |
| actual_cap_rate | numeric | YES |  |
| pro_forma_cap_rate | numeric | YES |  |
| gim | numeric | YES |  |
| noi_at_sale | numeric | YES |  |
| gross_income_at_sale | numeric | YES |  |
| financing_type | character varying | YES |  |
| financing_lender | character varying | YES |  |
| financing_amount | numeric | YES |  |
| financing_rate | numeric | YES |  |
| financing_term_months | integer | YES |  |
| loan_to_value | numeric | YES |  |
| assumed_financing | boolean | YES |  |
| recorded_buyer | character varying | YES |  |
| true_buyer | character varying | YES |  |
| buyer_contact | character varying | YES |  |
| buyer_type | character varying | YES |  |
| recorded_seller | character varying | YES |  |
| true_seller | character varying | YES |  |
| seller_contact | character varying | YES |  |
| seller_type | character varying | YES |  |
| buyer_broker_company | character varying | YES |  |
| buyer_broker_name | character varying | YES |  |
| buyer_broker_phone | character varying | YES |  |
| listing_broker_company | character varying | YES |  |
| listing_broker_name | character varying | YES |  |
| listing_broker_phone | character varying | YES |  |
| no_broker_deal | boolean | YES |  |
| property_type | character varying | YES |  |
| property_subtype | character varying | YES |  |
| building_class | character varying | YES |  |
| costar_star_rating | numeric | YES |  |
| location_type | character varying | YES |  |
| num_buildings | integer | YES |  |
| num_floors | integer | YES |  |
| typical_floor_sf | numeric | YES |  |
| tenancy_type | character varying | YES |  |
| owner_occupied | boolean | YES |  |
| avg_unit_size_sf | numeric | YES |  |
| units_per_acre | numeric | YES |  |
| parking_spaces | integer | YES |  |
| parking_ratio | numeric | YES |  |
| parking_type | character varying | YES |  |
| elevators | integer | YES |  |
| zoning | character varying | YES |  |
| construction_type | character varying | YES |  |
| roof_type | character varying | YES |  |
| hvac_type | character varying | YES |  |
| sprinklered | boolean | YES |  |
| land_area_sf | numeric | YES |  |
| land_area_acres | numeric | YES |  |
| far_allowed | numeric | YES |  |
| far_actual | numeric | YES |  |
| num_parcels | integer | YES |  |
| topography | character varying | YES |  |
| utilities_available | character varying | YES |  |
| entitlements | character varying | YES |  |
| environmental_issues | text | YES |  |
| total_assessed_value | numeric | YES |  |
| land_assessed_value | numeric | YES |  |
| improved_assessed_value | numeric | YES |  |
| assessment_year | integer | YES |  |
| tax_amount | numeric | YES |  |
| tax_per_unit | numeric | YES |  |
| percent_improved | numeric | YES |  |
| metro_market | character varying | YES |  |
| submarket | character varying | YES |  |
| county | character varying | YES |  |
| cbsa | character varying | YES |  |
| csa | character varying | YES |  |
| dma | character varying | YES |  |
| walk_score | integer | YES |  |
| transit_score | integer | YES |  |
| bike_score | integer | YES |  |
| data_source | character varying | YES |  |
| verification_status | character varying | YES |  |
| verification_source | character varying | YES |  |
| verification_date | date | YES |  |
| transaction_notes | text | YES |  |
| internal_notes | text | YES |  |
| is_portfolio_sale | boolean | YES |  |
| portfolio_name | character varying | YES |  |
| portfolio_property_count | integer | YES |  |
| price_allocation_method | character varying | YES |  |
| allocated_price | numeric | YES |  |
| site_amenities | jsonb | YES |  |
| extra_data | jsonb | YES |  |
| raw_import_data | jsonb | YES |  |
| unit_mix_count | bigint | YES |  |
| total_units_from_mix | bigint | YES |  |
| tenant_count | bigint | YES |  |
| total_leased_sf | numeric | YES |  |
| prior_sales_count | bigint | YES |  |
| has_industrial_data | boolean | YES |  |
| has_hospitality_data | boolean | YES |  |
| has_land_data | boolean | YES |  |
| has_self_storage_data | boolean | YES |  |
| has_retail_data | boolean | YES |  |
| has_office_data | boolean | YES |  |
| has_specialty_data | boolean | YES |  |
| has_manufactured_data | boolean | YES |  |

### vw_absorption_with_dependencies (21 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| absorption_id | bigint | YES |  |
| project_id | bigint | YES |  |
| area_id | bigint | YES |  |
| phase_id | bigint | YES |  |
| parcel_id | bigint | YES |  |
| revenue_stream_name | character varying | YES |  |
| revenue_category | character varying | YES |  |
| start_period | integer | YES |  |
| periods_to_complete | integer | YES |  |
| timing_method | character varying | YES |  |
| units_per_period | numeric | YES |  |
| total_units | integer | YES |  |
| base_price_per_unit | numeric | YES |  |
| price_escalation_pct | numeric | YES |  |
| dependency_id | bigint | YES |  |
| trigger_event | character varying | YES |  |
| trigger_value | numeric | YES |  |
| offset_periods | integer | YES |  |
| is_hard_dependency | boolean | YES |  |
| has_dependency | boolean | YES |  |
| dependency_summary | text | YES |  |

### vw_acreage_allocation (17 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| allocation_id | integer | YES |  |
| project_id | bigint | YES |  |
| project_name | character varying | YES |  |
| phase_id | bigint | YES |  |
| parcel_id | bigint | YES |  |
| allocation_type_id | integer | YES |  |
| allocation_type_code | character varying | YES |  |
| allocation_type_name | character varying | YES |  |
| is_developable | boolean | YES |  |
| acres | numeric | YES |  |
| source_doc_id | bigint | YES |  |
| source_document | character varying | YES |  |
| source_page | integer | YES |  |
| confidence_score | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES |  |
| updated_at | timestamp without time zone | YES |  |

### vw_budget_grid_items (42 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| fact_id | bigint | YES |  |
| budget_id | bigint | YES |  |
| budget_version | text | YES |  |
| project_id | bigint | YES |  |
| division_id | bigint | YES |  |
| tier | integer | YES |  |
| division_code | character varying | YES |  |
| division_name | character varying | YES |  |
| parent_division_id | bigint | YES |  |
| category_id | bigint | YES |  |
| cost_code | text | YES |  |
| scope | text | YES |  |
| category_path | text | YES |  |
| category_depth | integer | YES |  |
| category_source | text | YES |  |
| category_l1_name | text | YES |  |
| category_l2_name | text | YES |  |
| category_l3_name | text | YES |  |
| category_l4_name | text | YES |  |
| activity | character varying | YES |  |
| uom_code | text | YES |  |
| uom_display | text | YES |  |
| qty | numeric | YES |  |
| rate | numeric | YES |  |
| amount | numeric | YES |  |
| calculated_amount | numeric | YES |  |
| start_date | date | YES |  |
| end_date | date | YES |  |
| start_period | integer | YES |  |
| periods_to_complete | integer | YES |  |
| end_period | integer | YES |  |
| escalation_rate | numeric | YES |  |
| contingency_pct | numeric | YES |  |
| timing_method | character varying | YES |  |
| contract_number | character varying | YES |  |
| purchase_order | character varying | YES |  |
| is_committed | boolean | YES |  |
| confidence_level | character varying | YES |  |
| vendor_contact_id | integer | YES |  |
| vendor_name | character varying | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES |  |

### vw_budget_variance (9 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| fact_id | bigint | YES |  |
| category_id | bigint | YES |  |
| project_id | bigint | YES |  |
| container_id | bigint | YES |  |
| original_amount | numeric | YES |  |
| current_amount | numeric | YES |  |
| variance_amount | numeric | YES |  |
| variance_percent | numeric | YES |  |
| variance_status | text | YES |  |

### vw_budget_with_dependencies (25 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| budget_item_id | integer | YES |  |
| project_id | integer | YES |  |
| structure_id | integer | YES |  |
| scope | character varying | YES |  |
| category | character varying | YES |  |
| description | character varying | YES |  |
| amount | numeric | YES |  |
| quantity | numeric | YES |  |
| cost_per_unit | numeric | YES |  |
| notes | text | YES |  |
| timing_method | character varying | YES |  |
| timing_locked | boolean | YES |  |
| start_period | integer | YES |  |
| periods_to_complete | integer | YES |  |
| s_curve_profile | character varying | YES |  |
| actual_amount | numeric | YES |  |
| variance_amount | numeric | YES |  |
| variance_pct | numeric | YES |  |
| dependency_id | bigint | YES |  |
| trigger_event | character varying | YES |  |
| trigger_value | numeric | YES |  |
| offset_periods | integer | YES |  |
| is_hard_dependency | boolean | YES |  |
| has_dependency | boolean | YES |  |
| dependency_summary | text | YES |  |

### vw_category_hierarchy (11 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| category_id | integer | YES |  |
| parent_id | integer | YES |  |
| category_name | character varying | YES |  |
| lifecycle_stages | ARRAY | YES |  |
| tags | jsonb | YES |  |
| sort_order | integer | YES |  |
| is_active | boolean | YES |  |
| depth | integer | YES |  |
| path | ARRAY | YES |  |
| display_label | text | YES |  |
| full_path | text | YES |  |

### vw_debt_balance_summary (20 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| loan_id | bigint | YES |  |
| project_id | bigint | YES |  |
| loan_name | character varying | YES |  |
| loan_type | character varying | YES |  |
| structure_type | character varying | YES |  |
| commitment_amount | numeric | YES |  |
| interest_rate_pct | numeric | YES |  |
| seniority | integer | YES |  |
| period_id | bigint | YES |  |
| period_start_date | date | YES |  |
| period_end_date | date | YES |  |
| draw_amount | numeric | YES |  |
| cumulative_drawn | numeric | YES |  |
| available_remaining | numeric | YES |  |
| beginning_balance | numeric | YES |  |
| interest_amount | numeric | YES |  |
| cumulative_interest | numeric | YES |  |
| principal_payment | numeric | YES |  |
| ending_balance | numeric | YES |  |
| utilization_pct | numeric | YES |  |

### vw_doc_media_summary (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| doc_id | bigint | YES |  |
| doc_name | character varying | YES |  |
| doc_type | character varying | YES |  |
| project_id | bigint | YES |  |
| media_scan_status | character varying | YES |  |
| media_scan_json | jsonb | YES |  |
| total_media | bigint | YES |  |
| pending_count | bigint | YES |  |
| extracted_count | bigint | YES |  |
| badge_counts | jsonb | YES |  |

### vw_extraction_mapping_stats (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| mapping_id | integer | YES |  |
| document_type | character varying | YES |  |
| source_pattern | character varying | YES |  |
| target_table | character varying | YES |  |
| target_field | character varying | YES |  |
| confidence | character varying | YES |  |
| is_active | boolean | YES |  |
| times_extracted | bigint | YES |  |
| projects_used | bigint | YES |  |
| documents_processed | bigint | YES |  |
| avg_confidence_score | numeric | YES |  |
| write_rate | numeric | YES |  |
| acceptance_rate | numeric | YES |  |
| last_used_at | timestamp with time zone | YES |  |

### vw_item_dependency_status (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| dependency_id | bigint | YES |  |
| dependent_item_type | character varying | YES |  |
| dependent_item_table | character varying | YES |  |
| dependent_item_id | bigint | YES |  |
| trigger_event | character varying | YES |  |
| trigger_value | numeric | YES |  |
| offset_periods | integer | YES |  |
| is_hard_dependency | boolean | YES |  |
| trigger_start_period | integer | YES |  |
| trigger_completion_period | integer | YES |  |
| calculated_start_period | numeric | YES |  |
| calculated_at | timestamp with time zone | YES |  |

### vw_lease_expiration_schedule (17 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| rent_roll_id | bigint | YES |  |
| project_id | bigint | YES |  |
| tenant_name | character varying | YES |  |
| space_type | character varying | YES |  |
| lease_end_date | date | YES |  |
| leased_sf | numeric | YES |  |
| base_rent_psf_annual | numeric | YES |  |
| annual_rent | numeric | YES |  |
| market_rent_psf_annual | numeric | YES |  |
| mark_to_market_psf | numeric | YES |  |
| mark_to_market_annual | numeric | YES |  |
| renewal_probability | numeric | YES |  |
| downtime_months | integer | YES |  |
| expected_rollover_cost | numeric | YES |  |
| expected_free_rent_months | numeric | YES |  |
| expected_vacancy_loss | numeric | YES |  |
| lease_status | character varying | YES |  |

### vw_map_plan_parcels (14 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | integer | YES |  |
| parcel_id | integer | YES |  |
| parcel_code | character varying | YES |  |
| landuse_code | character varying | YES |  |
| landuse_type | character varying | YES |  |
| acres_gross | double precision | YES |  |
| units_total | integer | YES |  |
| area_no | integer | YES |  |
| phase_no | integer | YES |  |
| parcel_no | integer | YES |  |
| geom | USER-DEFINED | YES |  |
| source_doc | text | YES |  |
| confidence | numeric | YES |  |
| version | integer | YES |  |

### vw_map_tax_parcels (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| tax_parcel_id | text | YES |  |
| owner_name | text | YES |  |
| situs_address | text | YES |  |
| acres | double precision | YES |  |
| geom | USER-DEFINED | YES |  |

### vw_mkt_absorption_by_lot_width (10 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lot_width_ft | integer | YES |  |
| effective_date | date | YES |  |
| project_count | bigint | YES |  |
| avg_monthly_rate | numeric | YES |  |
| avg_3m_rate | numeric | YES |  |
| rate_p25 | numeric | YES |  |
| rate_median | numeric | YES |  |
| rate_p75 | numeric | YES |  |
| avg_price | numeric | YES |  |
| avg_mos_vdl | numeric | YES |  |

### vw_mkt_absorption_by_lu_product (7 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lu_product_id | bigint | YES |  |
| product_code | text | YES |  |
| effective_date | date | YES |  |
| project_count | bigint | YES |  |
| avg_monthly_rate | numeric | YES |  |
| avg_3m_rate | numeric | YES |  |
| avg_price | numeric | YES |  |

### vw_mkt_current_projects (101 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| record_id | bigint | YES |  |
| source_project_id | character varying | YES |  |
| source_subdivision_id | character varying | YES |  |
| effective_date | date | YES |  |
| source_file | character varying | YES |  |
| survey_period | character varying | YES |  |
| project_name | character varying | YES |  |
| master_plan_name | character varying | YES |  |
| master_plan_id | character varying | YES |  |
| master_plan_developer | character varying | YES |  |
| builder_name | character varying | YES |  |
| parent_builder | character varying | YES |  |
| status | character varying | YES |  |
| product_type | character varying | YES |  |
| product_style | character varying | YES |  |
| is_active_adult | boolean | YES |  |
| characteristics | text | YES |  |
| lot_size_sf | integer | YES |  |
| lot_width_ft | integer | YES |  |
| lot_depth_ft | integer | YES |  |
| lot_dimensions | character varying | YES |  |
| unit_size_min_sf | integer | YES |  |
| unit_size_max_sf | integer | YES |  |
| unit_size_avg_sf | integer | YES |  |
| price_min | numeric | YES |  |
| price_max | numeric | YES |  |
| price_avg | numeric | YES |  |
| price_per_sf_avg | numeric | YES |  |
| price_change_date | date | YES |  |
| units_planned | integer | YES |  |
| units_sold | integer | YES |  |
| units_remaining | integer | YES |  |
| qmi_count | integer | YES |  |
| open_date | date | YES |  |
| sold_out_date | date | YES |  |
| sales_rate_monthly | numeric | YES |  |
| sales_rate_3m_avg | numeric | YES |  |
| sales_rate_6m_avg | numeric | YES |  |
| sales_rate_12m_avg | numeric | YES |  |
| sales_change_date | date | YES |  |
| annual_starts | integer | YES |  |
| annual_closings | integer | YES |  |
| quarterly_starts | integer | YES |  |
| quarterly_closings | integer | YES |  |
| pipeline_excavation | integer | YES |  |
| pipeline_survey_stakes | integer | YES |  |
| pipeline_street_paving | integer | YES |  |
| pipeline_streets_in | integer | YES |  |
| pipeline_vdl | integer | YES |  |
| pipeline_vacant_land | integer | YES |  |
| pipeline_under_construction | integer | YES |  |
| pipeline_finished_vacant | integer | YES |  |
| models_count | integer | YES |  |
| occupied_count | integer | YES |  |
| future_inventory_count | integer | YES |  |
| mos_vdl | numeric | YES |  |
| mos_inventory | numeric | YES |  |
| mos_finished_vacant | numeric | YES |  |
| incentive_qmi_pct | numeric | YES |  |
| incentive_qmi_amt | numeric | YES |  |
| incentive_qmi_type | character varying | YES |  |
| incentive_tbb_pct | numeric | YES |  |
| incentive_tbb_amt | numeric | YES |  |
| incentive_tbb_type | character varying | YES |  |
| incentive_broker_pct | numeric | YES |  |
| incentive_broker_amt | numeric | YES |  |
| incentive_broker_type | character varying | YES |  |
| hoa_fee_monthly | numeric | YES |  |
| hoa_fee_2_monthly | numeric | YES |  |
| hoa_fee_per_sqft | numeric | YES |  |
| assessment_rate | numeric | YES |  |
| assessment_description | text | YES |  |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| address | character varying | YES |  |
| city | character varying | YES |  |
| zip_code | character varying | YES |  |
| county | character varying | YES |  |
| county_fips | integer | YES |  |
| cbsa_name | character varying | YES |  |
| cbsa_code | integer | YES |  |
| state | character varying | YES |  |
| boundary_names | text | YES |  |
| school_district | character varying | YES |  |
| school_elementary | text | YES |  |
| school_rating_elementary | character varying | YES |  |
| school_middle | text | YES |  |
| school_rating_middle | character varying | YES |  |
| school_high | text | YES |  |
| school_rating_high | character varying | YES |  |
| website_url | text | YES |  |
| office_phone | character varying | YES |  |
| lu_family_id | bigint | YES |  |
| lu_density_id | bigint | YES |  |
| lu_type_id | bigint | YES |  |
| lu_product_id | bigint | YES |  |
| lu_linkage_method | character varying | YES |  |
| lu_linkage_confidence | numeric | YES |  |
| ingestion_timestamp | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |
| source_id | integer | YES |  |

### vw_mkt_landscaper_summary (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| city | character varying | YES |  |
| lot_width_ft | integer | YES |  |
| active_communities | bigint | YES |  |
| total_units_available | bigint | YES |  |
| avg_absorption_rate | numeric | YES |  |
| avg_price | numeric | YES |  |
| market_entry_price | numeric | YES |  |
| market_ceiling_price | numeric | YES |  |

### vw_mkt_pricing_by_city_lotwidth (8 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| city | character varying | YES |  |
| lot_width_ft | integer | YES |  |
| effective_date | date | YES |  |
| project_count | bigint | YES |  |
| avg_price | numeric | YES |  |
| min_price | numeric | YES |  |
| max_price | numeric | YES |  |
| avg_price_psf | numeric | YES |  |

### vw_multifamily_lease_expirations (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| lease_id | integer | YES |  |
| unit_id | bigint | YES |  |
| unit_number | character varying | YES |  |
| building_name | character varying | YES |  |
| unit_type | character varying | YES |  |
| project_id | bigint | YES |  |
| project_name | character varying | YES |  |
| resident_name | character varying | YES |  |
| lease_start_date | date | YES |  |
| lease_end_date | date | YES |  |
| lease_term_months | integer | YES |  |
| base_rent_monthly | numeric | YES |  |
| effective_rent_monthly | numeric | YES |  |
| lease_status | character varying | YES |  |
| notice_date | date | YES |  |
| notice_to_vacate_days | integer | YES |  |
| is_renewal | boolean | YES |  |
| days_until_expiration | integer | YES |  |
| expiration_priority | text | YES |  |
| market_rent | numeric | YES |  |
| potential_rent_increase | numeric | YES |  |
| renewal_status | text | YES |  |

### vw_multifamily_occupancy_summary (16 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | bigint | YES |  |
| project_name | character varying | YES |  |
| unit_type | character varying | YES |  |
| total_units | bigint | YES |  |
| occupied_units | bigint | YES |  |
| vacant_units | bigint | YES |  |
| physical_occupancy_pct | numeric | YES |  |
| total_market_rent | numeric | YES |  |
| total_actual_rent | numeric | YES |  |
| economic_occupancy_pct | numeric | YES |  |
| total_loss_to_lease | numeric | YES |  |
| avg_market_rent | numeric | YES |  |
| avg_actual_rent | numeric | YES |  |
| renovated_units | bigint | YES |  |
| renewal_leases | bigint | YES |  |
| renewal_rate_pct | numeric | YES |  |

### vw_multifamily_project_summary (13 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | bigint | YES |  |
| project_name | character varying | YES |  |
| total_units | bigint | YES |  |
| occupied_units | bigint | YES |  |
| physical_occupancy_pct | numeric | YES |  |
| total_market_rent_potential | numeric | YES |  |
| total_actual_rent | numeric | YES |  |
| total_loss_to_lease | numeric | YES |  |
| unit_type_count | bigint | YES |  |
| renovated_units | bigint | YES |  |
| total_turns_ytd | bigint | YES |  |
| avg_turn_cost | numeric | YES |  |
| avg_turn_days | numeric | YES |  |

### vw_multifamily_turn_metrics (15 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | bigint | YES |  |
| project_name | character varying | YES |  |
| unit_type | character varying | YES |  |
| total_turns | bigint | YES |  |
| completed_turns | bigint | YES |  |
| avg_vacant_days | numeric | YES |  |
| avg_make_ready_cost | numeric | YES |  |
| avg_cleaning_cost | numeric | YES |  |
| avg_painting_cost | numeric | YES |  |
| avg_flooring_cost | numeric | YES |  |
| avg_appliance_cost | numeric | YES |  |
| first_turn_date | date | YES |  |
| last_turn_date | date | YES |  |
| avg_make_ready_days | numeric | YES |  |
| avg_total_turn_days | numeric | YES |  |

### vw_multifamily_unit_status (22 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| unit_id | integer | YES |  |
| project_id | bigint | YES |  |
| unit_number | character varying | YES |  |
| building_name | character varying | YES |  |
| unit_type | character varying | YES |  |
| bedrooms | numeric | YES |  |
| bathrooms | numeric | YES |  |
| square_feet | integer | YES |  |
| market_rent | numeric | YES |  |
| renovation_status | character varying | YES |  |
| lease_id | integer | YES |  |
| resident_name | character varying | YES |  |
| lease_start_date | date | YES |  |
| lease_end_date | date | YES |  |
| base_rent_monthly | numeric | YES |  |
| effective_rent_monthly | numeric | YES |  |
| lease_status | character varying | YES |  |
| is_renewal | boolean | YES |  |
| occupancy_status | text | YES |  |
| loss_to_lease | numeric | YES |  |
| loss_to_lease_pct | numeric | YES |  |
| days_until_expiration | integer | YES |  |

### vw_parcels_with_sales (28 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| parcel_id | integer | YES |  |
| parcel_code | character varying | YES |  |
| project_id | integer | YES |  |
| area_id | integer | YES |  |
| dev_phase_id | integer | YES |  |
| units | integer | YES |  |
| acres | double precision | YES |  |
| sale_phase_code | character varying | YES |  |
| custom_sale_date | date | YES |  |
| has_sale_overrides | boolean | YES |  |
| use_type_code | text | YES |  |
| use_type_name | character varying | YES |  |
| product_code | text | YES |  |
| product_name | character varying | YES |  |
| base_price_per_unit | numeric | YES |  |
| growth_rate | numeric | YES |  |
| uom_code | character varying | YES |  |
| pricing_base_date | timestamp with time zone | YES |  |
| sale_id | bigint | YES |  |
| sale_date | date | YES |  |
| buyer_name | character varying | YES |  |
| buyer_entity | character varying | YES |  |
| sale_status | character varying | YES |  |
| gross_value | numeric | YES |  |
| net_proceeds | numeric | YES |  |
| commission_pct | numeric | YES |  |
| closing_cost_per_unit | numeric | YES |  |
| onsite_cost_pct | numeric | YES |  |

### vw_permit_annual_by_jurisdiction (5 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| jurisdiction_name | character varying | YES |  |
| permit_year | integer | YES |  |
| annual_permits_sf | bigint | YES |  |
| annual_permits_total | bigint | YES |  |
| source_id | integer | YES |  |

### vw_permit_msa_monthly (6 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| permit_month | date | YES |  |
| permit_year | integer | YES |  |
| msa_permits_sf | bigint | YES |  |
| msa_permits_total | bigint | YES |  |
| jurisdiction_count | bigint | YES |  |
| source_id | integer | YES |  |

### vw_project_acquisition_summary (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | integer | YES |  |
| project_name | character varying | YES |  |
| asking_price | numeric | YES |  |
| has_closing_date | boolean | YES |  |
| closing_date | date | YES |  |
| total_acquisition_cost | numeric | YES |  |
| land_cost | numeric | YES |  |
| total_fees | numeric | YES |  |
| total_deposits | numeric | YES |  |
| total_credits | numeric | YES |  |
| effective_acquisition_price | numeric | YES |  |
| price_source | text | YES |  |

### vw_rent_roll (12 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| property_name | character varying | YES |  |
| space_number | character varying | YES |  |
| rentable_sf | numeric | YES |  |
| tenant_name | character varying | YES |  |
| creditworthiness | character varying | YES |  |
| lease_number | character varying | YES |  |
| lease_commencement_date | date | YES |  |
| lease_expiration_date | date | YES |  |
| lease_term_months | integer | YES |  |
| base_rent_annual | numeric | YES |  |
| base_rent_psf_annual | numeric | YES |  |
| lease_status | character varying | YES |  |

### vw_revenue_timeline (19 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| absorption_id | bigint | YES |  |
| project_id | bigint | YES |  |
| revenue_stream_name | character varying | YES |  |
| revenue_category | character varying | YES |  |
| total_units | integer | YES |  |
| base_price_per_unit | numeric | YES |  |
| price_escalation_pct | numeric | YES |  |
| period_id | bigint | YES |  |
| period_start_date | date | YES |  |
| period_end_date | date | YES |  |
| units_sold_this_period | numeric | YES |  |
| cumulative_units_sold | numeric | YES |  |
| units_remaining | numeric | YES |  |
| average_price_this_period | numeric | YES |  |
| gross_revenue | numeric | YES |  |
| sales_commission | numeric | YES |  |
| closing_costs | numeric | YES |  |
| net_revenue | numeric | YES |  |
| pct_complete | numeric | YES |  |

### vw_zoning_glossary_export (27 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| glossary_id | uuid | YES |  |
| jurisdiction_display | text | YES |  |
| jurisdiction_city | text | YES |  |
| jurisdiction_county | text | YES |  |
| jurisdiction_state | character | YES |  |
| family_name | text | YES |  |
| district_code | text | YES |  |
| district_name | text | YES |  |
| local_code_raw | text | YES |  |
| local_code_canonical | text | YES |  |
| code_token_kind | USER-DEFINED | YES |  |
| code_token_confidence | numeric | YES |  |
| mapped_use | text | YES |  |
| allowance | character | YES |  |
| purpose_text | text | YES |  |
| intent_text | text | YES |  |
| conditions_text | text | YES |  |
| development_standards | jsonb | YES |  |
| use_standard_refs | jsonb | YES |  |
| definitions_refs | jsonb | YES |  |
| narrative_section_ref | text | YES |  |
| narrative_src_url | text | YES |  |
| source_doc_url | text | YES |  |
| effective_date | date | YES |  |
| is_active | boolean | YES |  |
| created_at | timestamp with time zone | YES |  |
| updated_at | timestamp with time zone | YES |  |

### zonda_subdivisions (26 columns)
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | integer | NO | nextval('zonda_subdivisions_id_seq'::regclass) |
| msa_code | character varying | NO | '38060'::character varying |
| project_name | character varying | NO |  |
| builder | character varying | YES |  |
| mpc | character varying | YES |  |
| property_type | character varying | YES |  |
| style | character varying | YES |  |
| lot_size_sf | integer | YES |  |
| lot_width | integer | YES |  |
| lot_depth | integer | YES |  |
| product_code | character varying | YES |  |
| units_sold | integer | YES |  |
| units_remaining | integer | YES |  |
| size_min_sf | integer | YES |  |
| size_max_sf | integer | YES |  |
| size_avg_sf | integer | YES |  |
| price_min | numeric | YES |  |
| price_max | numeric | YES |  |
| price_avg | numeric | YES |  |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| special_features | text | YES |  |
| source_file | character varying | YES |  |
| source_date | date | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

## Views

### core_lookup_vw

### geography_columns

### geometry_columns

### mv_doc_search

### v_ai_review_summary

### v_contact_projects

### v_contact_relationships

### v_lease_summary

### v_project_contacts

### v_project_contacts_detail

### v_rent_roll

### v_sales_comparables_full

### vw_absorption_with_dependencies

### vw_acreage_allocation

### vw_budget_grid_items

### vw_budget_variance

### vw_budget_with_dependencies

### vw_category_hierarchy

### vw_debt_balance_summary

### vw_doc_media_summary

### vw_extraction_mapping_stats

### vw_item_dependency_status

### vw_lease_expiration_schedule

### vw_map_plan_parcels

### vw_map_tax_parcels

### vw_mkt_absorption_by_lot_width

### vw_mkt_absorption_by_lu_product

### vw_mkt_current_projects

### vw_mkt_landscaper_summary

### vw_mkt_pricing_by_city_lotwidth

### vw_multifamily_lease_expirations

### vw_multifamily_occupancy_summary

### vw_multifamily_project_summary

### vw_multifamily_turn_metrics

### vw_multifamily_unit_status

### vw_parcels_with_sales

### vw_permit_annual_by_jurisdiction

### vw_permit_msa_monthly

### vw_project_acquisition_summary

### vw_rent_roll

### vw_revenue_timeline

### vw_zoning_glossary_export

## Foreign Keys (summary)

| Table | Column | References | On Delete |
|-------|--------|-----------|-----------|
| ai_correction_log | queue_id | dms_extract_queue.queue_id | CASCADE |
| ai_extraction_staging | doc_id | core_doc.doc_id | NO ACTION |
| ai_extraction_staging | project_id | tbl_project.project_id | NO ACTION |
| ai_extraction_warnings | queue_id | dms_extract_queue.queue_id | CASCADE |
| ai_ingestion_history | project_id | tbl_project.project_id | NO ACTION |
| ai_review_history | project_id | tbl_project.project_id | NO ACTION |
| auth_group_permissions | permission_id | auth_permission.id | NO ACTION |
| auth_group_permissions | group_id | auth_group.id | NO ACTION |
| auth_permission | content_type_id | django_content_type.id | NO ACTION |
| auth_user_groups | group_id | auth_group.id | NO ACTION |
| auth_user_groups | user_id | auth_user.id | NO ACTION |
| auth_user_user_permissions | permission_id | auth_permission.id | NO ACTION |
| auth_user_user_permissions | user_id | auth_user.id | NO ACTION |
| bmk_absorption_velocity | benchmark_id | tbl_global_benchmark_registry.benchmark_id | NO ACTION |
| core_category_lifecycle_stages | category_id | core_unit_cost_category.category_id | CASCADE |
| core_doc | cabinet_id | tbl_cabinet.cabinet_id | NO ACTION |
| core_doc | parcel_id | tbl_parcel.parcel_id | NO ACTION |
| core_doc | parent_doc_id | core_doc.doc_id | NO ACTION |
| core_doc | phase_id | tbl_phase.phase_id | NO ACTION |
| core_doc | project_id | tbl_project.project_id | NO ACTION |
| core_doc | workspace_id | dms_workspaces.workspace_id | NO ACTION |
| core_doc_attr_enum | attr_id | dms_attributes.attr_id | CASCADE |
| core_doc_attr_lookup | attr_id | dms_attributes.attr_id | CASCADE |
| core_doc_folder | parent_id | core_doc_folder.folder_id | CASCADE |
| core_doc_folder_link | doc_id | core_doc.doc_id | CASCADE |
| core_doc_folder_link | folder_id | core_doc_folder.folder_id | CASCADE |
| core_doc_media | classification_id | lu_media_classification.classification_id | NO ACTION |
| core_doc_media | doc_id | core_doc.doc_id | CASCADE |
| core_doc_media | project_id | tbl_project.project_id | NO ACTION |
| core_doc_media | workspace_id | dms_workspaces.workspace_id | NO ACTION |
| core_doc_media_link | media_id | core_doc_media.media_id | CASCADE |
| core_doc_text | doc_id | core_doc.doc_id | CASCADE |
| core_fin_budget_version | project_id | tbl_project.project_id | SET NULL |
| core_fin_category_uom | uom_code | core_fin_uom.uom_code | RESTRICT |
| core_fin_fact_actual | scenario_id | tbl_scenario.scenario_id | CASCADE |
| core_fin_fact_actual | uom_code | core_fin_uom.uom_code | RESTRICT |
| core_fin_fact_actual | container_id | tbl_division.division_id | SET NULL |
| core_fin_fact_actual | project_id | tbl_project.project_id | CASCADE |
| core_fin_fact_budget | budget_id | core_fin_budget_version.budget_id | CASCADE |
| core_fin_fact_budget | category_id | core_unit_cost_category.category_id | RESTRICT |
| core_fin_fact_budget | curve_id | core_fin_curve.curve_id | SET NULL |
| core_fin_fact_budget | finance_structure_id | tbl_finance_structure.finance_structure_id | NO ACTION |
| core_fin_fact_budget | funding_id | core_fin_funding_source.funding_id | SET NULL |
| core_fin_fact_budget | growth_rate_set_id | core_fin_growth_rate_sets.set_id | NO ACTION |
| core_fin_fact_budget | scenario_id | tbl_scenario.scenario_id | CASCADE |
| core_fin_fact_budget | uom_code | core_fin_uom.uom_code | RESTRICT |
| core_fin_fact_budget | division_id | tbl_division.division_id | SET NULL |
| core_fin_fact_budget | project_id | tbl_project.project_id | CASCADE |
| core_fin_growth_rate_sets | benchmark_id | tbl_global_benchmark_registry.benchmark_id | NO ACTION |
| core_fin_growth_rate_steps | set_id | core_fin_growth_rate_sets.set_id | CASCADE |
| core_item_benchmark_link | item_id | core_unit_cost_item.item_id | CASCADE |
| core_item_benchmark_link | benchmark_id | tbl_global_benchmark_registry.benchmark_id | CASCADE |
| core_lookup_item | list_key | core_lookup_list.list_key | CASCADE |
| core_unit_cost_category | parent_id | core_unit_cost_category.category_id | NO ACTION |
| core_unit_cost_item | category_id | core_unit_cost_category.category_id | NO ACTION |
| core_unit_cost_item | created_from_project_id | tbl_project.project_id | NO ACTION |
| core_unit_cost_item | default_uom_code | tbl_measures.measure_code | NO ACTION |
| core_workspace_member | workspace_id | dms_workspaces.workspace_id | CASCADE |
| developer_fees | project_id | tbl_project.project_id | CASCADE |
| django_admin_log | content_type_id | django_content_type.id | NO ACTION |
| django_admin_log | user_id | auth_user.id | NO ACTION |
| dms_assertion | project_id | tbl_project.project_id | NO ACTION |
| dms_doc_tag_assignments | tag_id | dms_doc_tags.tag_id | CASCADE |
| dms_extract_queue | doc_id | core_doc.doc_id | CASCADE |
| dms_profile_audit | doc_id | core_doc.doc_id | CASCADE |
| dms_template_attributes | attr_id | dms_attributes.attr_id | CASCADE |
| dms_template_attributes | template_id | dms_templates.template_id | CASCADE |
| dms_templates | project_id | tbl_project.project_id | NO ACTION |
| dms_templates | workspace_id | dms_workspaces.workspace_id | NO ACTION |
| dms_unmapped | project_id | tbl_project.project_id | NO ACTION |
| doc_extracted_facts | doc_id | core_doc.doc_id | CASCADE |
| doc_geo_tag | doc_id | core_doc.doc_id | CASCADE |
| doc_processing_queue | doc_id | core_doc.doc_id | CASCADE |
| document_tables | doc_id | core_doc.doc_id | CASCADE |
| extraction_commit_snapshot | committed_by | auth_user.id | NO ACTION |
| extraction_commit_snapshot | project_id | tbl_project.project_id | NO ACTION |
| extraction_commit_snapshot | doc_id | core_doc.doc_id | NO ACTION |
| gis_boundary_history | project_id | tbl_project.project_id | NO ACTION |
| gis_document_ingestion | project_id | tbl_project.project_id | CASCADE |
| gis_mapping_history | project_id | tbl_project.project_id | NO ACTION |
| gis_plan_parcel | parcel_id | tbl_parcel.parcel_id | CASCADE |
| gis_plan_parcel | project_id | tbl_project.project_id | CASCADE |
| gis_project_boundary | project_id | tbl_project.project_id | CASCADE |
| knowledge_entities | created_by_id | auth_user.id | NO ACTION |
| knowledge_facts | created_by_id | auth_user.id | NO ACTION |
| knowledge_facts | object_entity_id | knowledge_entities.entity_id | NO ACTION |
| knowledge_facts | subject_entity_id | knowledge_entities.entity_id | NO ACTION |
| knowledge_facts | superseded_by_id | knowledge_facts.fact_id | NO ACTION |
| knowledge_insights | acknowledged_by_id | auth_user.id | NO ACTION |
| knowledge_insights | subject_entity_id | knowledge_entities.entity_id | NO ACTION |
| knowledge_interactions | session_id | knowledge_sessions.session_id | NO ACTION |
| knowledge_sessions | user_id | auth_user.id | NO ACTION |
| land_use_pricing | benchmark_id | tbl_global_benchmark_registry.benchmark_id | NO ACTION |
| land_use_pricing | growth_rate_set_id | core_fin_growth_rate_sets.set_id | SET NULL |
| landscaper_absorption_detail | benchmark_id | tbl_global_benchmark_registry.benchmark_id | NO ACTION |
| landscaper_activity | project_id | tbl_project.project_id | CASCADE |
| landscaper_advice | message_id | landscaper_chat_message.message_id | NO ACTION |
| landscaper_advice | project_id | tbl_project.project_id | NO ACTION |
| landscaper_chat_embedding | message_id | landscaper_thread_message.id | CASCADE |
| landscaper_chat_embedding | thread_id | landscaper_chat_thread.id | CASCADE |
| landscaper_chat_message | project_id | tbl_project.project_id | NO ACTION |
| landscaper_chat_message | user_id | auth_user.id | NO ACTION |
| landscaper_chat_thread | project_id | tbl_project.project_id | CASCADE |
| landscaper_thread_message | thread_id | landscaper_chat_thread.id | CASCADE |
| lu_com_spec | doc_id | planning_doc.doc_id | SET NULL |
| lu_com_spec | type_id | lu_type.type_id | NO ACTION |
| lu_res_spec | doc_id | planning_doc.doc_id | SET NULL |
| lu_res_spec | type_id | lu_type.type_id | NO ACTION |
| lu_subtype | family_id | lu_family.family_id | CASCADE |
| lu_type | family_id | lu_family.family_id | NO ACTION |
| management_overhead | project_id | tbl_project.project_id | CASCADE |
| market_competitive_project_exclusions | project_id | tbl_project.project_id | CASCADE |
| market_competitive_project_products | competitive_project_id | market_competitive_projects.id | CASCADE |
| market_competitive_project_products | product_id | res_lot_product.product_id | SET NULL |
| market_competitive_projects | project_id | tbl_project.project_id | CASCADE |
| mkt_new_home_project | source_id | mkt_data_source_registry.source_id | NO ACTION |
| mkt_permit_history | source_id | mkt_data_source_registry.source_id | NO ACTION |
| pending_mutations | project_id | tbl_project.project_id | CASCADE |
| pending_mutations | unit_id | tbl_multifamily_unit.unit_id | SET NULL |
| project_boundaries | project_id | tbl_project.project_id | NO ACTION |
| project_jurisdiction_mapping | density_code | density_classification.code | NO ACTION |
| project_jurisdiction_mapping | glossary_id | glossary_zoning.glossary_id | NO ACTION |
| project_jurisdiction_mapping | project_id | tbl_project.project_id | NO ACTION |
| project_land_use | family_id | lu_family.family_id | NO ACTION |
| project_land_use | project_id | tbl_project.project_id | CASCADE |
| project_land_use | type_id | lu_type.type_id | NO ACTION |
| project_land_use_product | product_id | res_lot_product.product_id | NO ACTION |
| project_land_use_product | project_land_use_id | project_land_use.project_land_use_id | CASCADE |
| project_parcel_boundaries | boundary_id | project_boundaries.boundary_id | CASCADE |
| project_parcel_boundaries | project_id | tbl_project.project_id | NO ACTION |
| res_lot_product | type_id | lu_type.type_id | NO ACTION |
| sale_names | project_id | tbl_project.project_id | CASCADE |
| tbl_absorption_schedule | area_id | tbl_area.area_id | CASCADE |
| tbl_absorption_schedule | parcel_id | tbl_parcel.parcel_id | CASCADE |
| tbl_absorption_schedule | phase_id | tbl_phase.phase_id | CASCADE |
| tbl_absorption_schedule | project_id | tbl_project.project_id | CASCADE |
| tbl_absorption_schedule | scenario_id | tbl_scenario.scenario_id | CASCADE |
| tbl_acquisition | category_id | core_unit_cost_category.category_id | NO ACTION |
| tbl_acquisition | measure_id | tbl_measures.measure_id | NO ACTION |
| tbl_acquisition | project_id | tbl_project.project_id | NO ACTION |
| tbl_acquisition | subcategory_id | core_unit_cost_category.category_id | NO ACTION |
| tbl_acreage_allocation | allocation_type_id | lu_acreage_allocation_type.allocation_type_id | NO ACTION |
| tbl_acreage_allocation | parcel_id | tbl_parcel.parcel_id | SET NULL |
| tbl_acreage_allocation | phase_id | tbl_phase.phase_id | SET NULL |
| tbl_acreage_allocation | project_id | tbl_project.project_id | CASCADE |
| tbl_acreage_allocation | source_doc_id | core_doc.doc_id | SET NULL |
| tbl_additional_income | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_ai_adjustment_suggestions | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_approval | project_id | tbl_project.project_id | CASCADE |
| tbl_area | project_id | tbl_project.project_id | RESTRICT |
| tbl_assumption_snapshot | scenario_log_id | tbl_scenario_log.scenario_log_id | CASCADE |
| tbl_base_rent | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_benchmark_ai_suggestions | created_benchmark_id | tbl_global_benchmark_registry.benchmark_id | NO ACTION |
| tbl_benchmark_ai_suggestions | document_id | core_doc.doc_id | NO ACTION |
| tbl_benchmark_ai_suggestions | existing_benchmark_id | tbl_global_benchmark_registry.benchmark_id | NO ACTION |
| tbl_benchmark_ai_suggestions | project_id | tbl_project.project_id | NO ACTION |
| tbl_benchmark_contingency | benchmark_id | tbl_global_benchmark_registry.benchmark_id | CASCADE |
| tbl_benchmark_transaction_cost | benchmark_id | tbl_global_benchmark_registry.benchmark_id | CASCADE |
| tbl_benchmark_unit_cost | benchmark_id | tbl_global_benchmark_registry.benchmark_id | CASCADE |
| tbl_budget | devphase_id | tbl_phase.phase_id | RESTRICT |
| tbl_budget | measure_id | tbl_measures.measure_id | NO ACTION |
| tbl_budget_fact | category_id | core_unit_cost_category.category_id | SET NULL |
| tbl_budget_fact | phase_id | tbl_phase.phase_id | SET NULL |
| tbl_budget_fact | project_id | tbl_project.project_id | CASCADE |
| tbl_budget_fact | source_doc_id | core_doc.doc_id | SET NULL |
| tbl_budget_items | actual_period_id | tbl_calculation_period.period_id | NO ACTION |
| tbl_budget_items | project_id | tbl_project.project_id | NO ACTION |
| tbl_budget_items | structure_id | tbl_budget_structure.structure_id | NO ACTION |
| tbl_budget_structure | measure_id | tbl_measures.measure_id | NO ACTION |
| tbl_budget_timing | fact_id | core_fin_fact_budget.fact_id | CASCADE |
| tbl_budget_timing | period_id | tbl_calculation_period.period_id | CASCADE |
| tbl_calculation_period | project_id | tbl_project.project_id | CASCADE |
| tbl_cap_rate_comps | income_approach_id | tbl_income_approach.income_approach_id | CASCADE |
| tbl_capex_reserve | project_id | tbl_project.project_id | NO ACTION |
| tbl_capital_call | period_id | tbl_calculation_period.period_id | NO ACTION |
| tbl_capital_call | project_id | tbl_project.project_id | NO ACTION |
| tbl_capital_reserves | project_id | tbl_project.project_id | CASCADE |
| tbl_capital_reserves | trigger_lease_id | tbl_rent_roll.rent_roll_id | SET NULL |
| tbl_capitalization | project_id | tbl_project.project_id | CASCADE |
| tbl_cashflow | lease_id | tbl_lease.lease_id | NO ACTION |
| tbl_cashflow | lot_id | tbl_lot.lot_id | NO ACTION |
| tbl_cashflow | parcel_id | tbl_parcel.parcel_id | NO ACTION |
| tbl_cashflow | phase_id | tbl_phase.phase_id | NO ACTION |
| tbl_cashflow | project_id | tbl_project.project_id | CASCADE |
| tbl_cashflow_summary | project_id | tbl_project.project_id | CASCADE |
| tbl_closing_event | sale_event_id | tbl_parcel_sale_event.sale_event_id | CASCADE |
| tbl_commercial_lease | income_property_id | tbl_income_property.income_property_id | NO ACTION |
| tbl_commercial_lease | space_id | tbl_space.space_id | NO ACTION |
| tbl_commercial_lease | tenant_id | tbl_tenant.tenant_id | NO ACTION |
| tbl_contact | cabinet_id | tbl_cabinet.cabinet_id | CASCADE |
| tbl_contact_relationship | cabinet_id | tbl_cabinet.cabinet_id | CASCADE |
| tbl_contact_relationship | contact_id | tbl_contact.contact_id | CASCADE |
| tbl_contact_relationship | related_to_id | tbl_contact.contact_id | CASCADE |
| tbl_contact_role | cabinet_id | tbl_cabinet.cabinet_id | CASCADE |
| tbl_cost_allocation | container_id | tbl_division.division_id | CASCADE |
| tbl_cost_allocation | finance_structure_id | tbl_finance_structure.finance_structure_id | CASCADE |
| tbl_cost_allocation | scenario_id | tbl_scenario.scenario_id | CASCADE |
| tbl_cost_approach | project_id | tbl_project.project_id | CASCADE |
| tbl_cost_approach_depreciation | project_id | tbl_project.project_id | NO ACTION |
| tbl_dcf_analysis | cost_inflation_set_id | core_fin_growth_rate_sets.set_id | SET NULL |
| tbl_dcf_analysis | expense_growth_set_id | core_fin_growth_rate_sets.set_id | SET NULL |
| tbl_dcf_analysis | income_growth_set_id | core_fin_growth_rate_sets.set_id | SET NULL |
| tbl_dcf_analysis | price_growth_set_id | core_fin_growth_rate_sets.set_id | SET NULL |
| tbl_dcf_analysis | project_id | tbl_project.project_id | CASCADE |
| tbl_debt_draw_schedule | loan_id | tbl_loan.loan_id | CASCADE |
| tbl_debt_draw_schedule | period_id | tbl_calculation_period.period_id | CASCADE |
| tbl_division | parent_division_id | tbl_division.division_id | CASCADE |
| tbl_division | project_id | tbl_project.project_id | CASCADE |
| tbl_document_project | document_id | core_doc.doc_id | CASCADE |
| tbl_document_project | project_id | tbl_project.project_id | CASCADE |
| tbl_dynamic_column_definition | created_by_id | auth_user.id | NO ACTION |
| tbl_dynamic_column_definition | project_id | tbl_project.project_id | NO ACTION |
| tbl_dynamic_column_definition | proposed_from_document_id | core_doc.doc_id | NO ACTION |
| tbl_dynamic_column_definition | created_from_doc_id | core_doc.doc_id | SET NULL |
| tbl_dynamic_column_value | column_definition_id | tbl_dynamic_column_definition.id | NO ACTION |
| tbl_dynamic_column_value | extracted_from_id | core_doc.doc_id | NO ACTION |
| tbl_equity | project_id | tbl_project.project_id | CASCADE |
| tbl_equity_distribution | partner_id | tbl_equity_partner.partner_id | CASCADE |
| tbl_equity_distribution | period_id | tbl_calculation_period.period_id | CASCADE |
| tbl_equity_partner | project_id | tbl_project.project_id | CASCADE |
| tbl_equity_structure | project_id | tbl_project.project_id | NO ACTION |
| tbl_escalation | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_expansion_option | exercised_space_id | tbl_space.space_id | SET NULL |
| tbl_expansion_option | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_expansion_option | target_space_id | tbl_space.space_id | SET NULL |
| tbl_expense_detail | project_id | tbl_project.project_id | NO ACTION |
| tbl_expense_recovery | lease_id | tbl_commercial_lease.lease_id | NO ACTION |
| tbl_extraction_job | created_by_id | auth_user.id | NO ACTION |
| tbl_extraction_log | mapping_id | tbl_extraction_mapping.mapping_id | SET NULL |
| tbl_finance_structure | project_id | tbl_project.project_id | CASCADE |
| tbl_finance_structure | scenario_id | tbl_scenario.scenario_id | CASCADE |
| tbl_global_benchmark_registry | source_document_id | core_doc.doc_id | NO ACTION |
| tbl_global_benchmark_registry | source_project_id | tbl_project.project_id | NO ACTION |
| tbl_hbu_analysis | legal_zoning_source_doc_id | core_doc.doc_id | SET NULL |
| tbl_hbu_analysis | project_id | tbl_project.project_id | CASCADE |
| tbl_hbu_comparable_use | hbu_id | tbl_hbu_analysis.hbu_id | CASCADE |
| tbl_hbu_zoning_document | document_id | core_doc.doc_id | CASCADE |
| tbl_hbu_zoning_document | hbu_id | tbl_hbu_analysis.hbu_id | CASCADE |
| tbl_help_conversation | user_id | auth_user.id | SET NULL |
| tbl_help_message | conversation_id | tbl_help_conversation.id | CASCADE |
| tbl_ic_challenge | ic_session_id | tbl_ic_session.ic_session_id | CASCADE |
| tbl_ic_challenge | whatif_scenario_log_id | tbl_scenario_log.scenario_log_id | NO ACTION |
| tbl_ic_session | project_id | tbl_project.project_id | NO ACTION |
| tbl_ic_session | scenario_log_id | tbl_scenario_log.scenario_log_id | NO ACTION |
| tbl_ic_session | thread_id | landscaper_chat_thread.id | NO ACTION |
| tbl_income_approach | project_id | tbl_project.project_id | CASCADE |
| tbl_income_property | parcel_id | tbl_parcel.parcel_id | NO ACTION |
| tbl_income_property | project_id | tbl_project.project_id | NO ACTION |
| tbl_income_property_ind_ext | income_property_id | tbl_income_property.income_property_id | CASCADE |
| tbl_income_property_mf_ext | income_property_id | tbl_income_property.income_property_id | CASCADE |
| tbl_income_property_ret_ext | income_property_id | tbl_income_property.income_property_id | CASCADE |
| tbl_intake_session | created_by | auth_user.id | SET NULL |
| tbl_intake_session | doc_id | core_doc.doc_id | SET NULL |
| tbl_intake_session | project_id | tbl_project.project_id | CASCADE |
| tbl_inventory_item | container_id | tbl_division.division_id | SET NULL |
| tbl_inventory_item | family_id | lu_family.family_id | NO ACTION |
| tbl_inventory_item | product_id | res_lot_product.product_id | NO ACTION |
| tbl_inventory_item | project_id | tbl_project.project_id | CASCADE |
| tbl_inventory_item | type_id | lu_type.type_id | NO ACTION |
| tbl_land_comp_adjustments | land_comparable_id | tbl_land_comparables.land_comparable_id | NO ACTION |
| tbl_land_comparables | project_id | tbl_project.project_id | NO ACTION |
| tbl_landscaper_instructions | project_id | tbl_project.project_id | CASCADE |
| tbl_landuse | type_id | lu_type.type_id | SET NULL |
| tbl_lease | lot_id | tbl_lot.lot_id | NO ACTION |
| tbl_lease | parcel_id | tbl_parcel.parcel_id | NO ACTION |
| tbl_lease | project_id | tbl_project.project_id | CASCADE |
| tbl_lease_assumptions | project_id | tbl_project.project_id | CASCADE |
| tbl_lease_ind_ext | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_lease_mf_ext | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_lease_ret_ext | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_lease_revenue_timing | lease_id | tbl_rent_roll.rent_roll_id | CASCADE |
| tbl_lease_revenue_timing | project_id | tbl_project.project_id | CASCADE |
| tbl_leasing_commission | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_loan | maturity_period_id | tbl_calculation_period.period_id | NO ACTION |
| tbl_loan | project_id | tbl_project.project_id | CASCADE |
| tbl_loan | takes_out_loan_id | tbl_loan.loan_id | SET NULL |
| tbl_loan_container | division_id | tbl_division.division_id | CASCADE |
| tbl_loan_container | loan_id | tbl_loan.loan_id | CASCADE |
| tbl_loan_finance_structure | finance_structure_id | tbl_finance_structure.finance_structure_id | CASCADE |
| tbl_loan_finance_structure | loan_id | tbl_loan.loan_id | CASCADE |
| tbl_lot | parcel_id | tbl_parcel.parcel_id | CASCADE |
| tbl_lot | phase_id | tbl_phase.phase_id | NO ACTION |
| tbl_lot | project_id | tbl_project.project_id | NO ACTION |
| tbl_market_rate_analysis | project_id | tbl_project.project_id | CASCADE |
| tbl_milestone | phase_id | tbl_phase.phase_id | SET NULL |
| tbl_milestone | predecessor_milestone_id | tbl_milestone.milestone_id | NO ACTION |
| tbl_milestone | project_id | tbl_project.project_id | CASCADE |
| tbl_milestone | source_doc_id | core_doc.doc_id | SET NULL |
| tbl_model_override | division_id | tbl_division.division_id | CASCADE |
| tbl_model_override | project_id | tbl_project.project_id | CASCADE |
| tbl_model_override | toggled_by | auth_user.id | SET NULL |
| tbl_model_override | unit_id | tbl_multifamily_unit.unit_id | CASCADE |
| tbl_multifamily_lease | unit_id | tbl_multifamily_unit.unit_id | NO ACTION |
| tbl_multifamily_property | project_id | tbl_project.project_id | CASCADE |
| tbl_multifamily_turn | unit_id | tbl_multifamily_unit.unit_id | NO ACTION |
| tbl_multifamily_unit | project_id | tbl_project.project_id | NO ACTION |
| tbl_multifamily_unit_type | container_id | tbl_division.division_id | NO ACTION |
| tbl_multifamily_unit_type | project_id | tbl_project.project_id | NO ACTION |
| tbl_narrative_change | version_id | tbl_narrative_version.id | NO ACTION |
| tbl_narrative_comment | version_id | tbl_narrative_version.id | NO ACTION |
| tbl_operating_expenses | category_id | core_unit_cost_category.category_id | NO ACTION |
| tbl_operating_expenses | project_id | tbl_project.project_id | CASCADE |
| tbl_operations_user_inputs | category_id | core_unit_cost_category.category_id | NO ACTION |
| tbl_operations_user_inputs | project_id | tbl_project.project_id | CASCADE |
| tbl_opex_timing | opex_id | tbl_operating_expenses.opex_id | CASCADE |
| tbl_opex_timing | project_id | tbl_project.project_id | CASCADE |
| tbl_parcel | density_code | density_classification.code | NO ACTION |
| tbl_parcel | phase_id | tbl_phase.phase_id | RESTRICT |
| tbl_parcel | landuse_code | tbl_landuse.landuse_code | SET NULL |
| tbl_parcel | area_id | tbl_area.area_id | RESTRICT |
| tbl_parcel | lot_type_id | tbl_lot_type.producttype_id | SET NULL |
| tbl_parcel_sale_assumptions | parcel_id | tbl_parcel.parcel_id | CASCADE |
| tbl_parcel_sale_event | project_id | tbl_project.project_id | CASCADE |
| tbl_participation_payment | project_id | tbl_project.project_id | NO ACTION |
| tbl_participation_payment | settlement_id | tbl_sale_settlement.settlement_id | CASCADE |
| tbl_percentage_rent | lease_id | tbl_commercial_lease.lease_id | NO ACTION |
| tbl_phase | area_id | tbl_area.area_id | RESTRICT |
| tbl_platform_knowledge | source_id | tbl_knowledge_source.id | NO ACTION |
| tbl_platform_knowledge_chapters | document_id | tbl_platform_knowledge.id | CASCADE |
| tbl_platform_knowledge_chunks | chapter_id | tbl_platform_knowledge_chapters.id | SET NULL |
| tbl_platform_knowledge_chunks | document_id | tbl_platform_knowledge.id | CASCADE |
| tbl_project | created_by_id | auth_user.id | SET NULL |
| tbl_project | cabinet_id | tbl_cabinet.cabinet_id | NO ACTION |
| tbl_project | dms_template_id | dms_templates.template_id | NO ACTION |
| tbl_project | msa_id | tbl_msa.msa_id | NO ACTION |
| tbl_project | template_id | tbl_property_use_template.template_id | NO ACTION |
| tbl_project_assumption | project_id | tbl_project.project_id | CASCADE |
| tbl_project_assumption | source_doc_id | core_doc.doc_id | SET NULL |
| tbl_project_config | project_id | tbl_project.project_id | CASCADE |
| tbl_project_contact | contact_id | tbl_contact.contact_id | CASCADE |
| tbl_project_contact | project_id | tbl_project.project_id | CASCADE |
| tbl_project_contact | role_id | tbl_contact_role.role_id | NO ACTION |
| tbl_project_inventory_columns | project_id | tbl_project.project_id | CASCADE |
| tbl_project_metrics | project_id | tbl_project.project_id | CASCADE |
| tbl_project_settings | project_id | tbl_project.project_id | CASCADE |
| tbl_property_acquisition | project_id | tbl_project.project_id | NO ACTION |
| tbl_property_apn | project_id | tbl_project.project_id | CASCADE |
| tbl_recovery | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_renewal_option | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_rent_concession | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_rent_escalation | lease_id | tbl_commercial_lease.lease_id | NO ACTION |
| tbl_rent_roll | project_id | tbl_project.project_id | CASCADE |
| tbl_rent_roll_unit | project_id | tbl_project.project_id | NO ACTION |
| tbl_rent_schedule | lease_id | tbl_commercial_lease.lease_id | NO ACTION |
| tbl_rent_step | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_rental_comparable | project_id | tbl_project.project_id | CASCADE |
| tbl_revenue_other | project_id | tbl_project.project_id | NO ACTION |
| tbl_revenue_rent | project_id | tbl_project.project_id | NO ACTION |
| tbl_revenue_timing | absorption_id | tbl_absorption_schedule.absorption_id | CASCADE |
| tbl_revenue_timing | period_id | tbl_calculation_period.period_id | CASCADE |
| tbl_sale_benchmarks | project_id | tbl_project.project_id | CASCADE |
| tbl_sale_phases | project_id | tbl_project.project_id | CASCADE |
| tbl_sale_settlement | container_id | tbl_division.division_id | NO ACTION |
| tbl_sale_settlement | project_id | tbl_project.project_id | NO ACTION |
| tbl_sales_comp_adjustments | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_contacts | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_history | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_hospitality | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_industrial | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_land | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_manufactured | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_market_conditions | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_office | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_retail | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_self_storage | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_specialty_housing | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_storage_unit_mix | storage_comp_id | tbl_sales_comp_self_storage.storage_id | CASCADE |
| tbl_sales_comp_tenants | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comp_unit_mix | comparable_id | tbl_sales_comparables.comparable_id | CASCADE |
| tbl_sales_comparables | project_id | tbl_project.project_id | CASCADE |
| tbl_scenario | cloned_from_scenario_id | tbl_scenario.scenario_id | NO ACTION |
| tbl_scenario | created_by | auth_user.id | NO ACTION |
| tbl_scenario | project_id | tbl_project.project_id | CASCADE |
| tbl_scenario_comparison | project_id | tbl_project.project_id | CASCADE |
| tbl_scenario_log | parent_scenario_id | tbl_scenario_log.scenario_log_id | NO ACTION |
| tbl_scenario_log | project_id | tbl_project.project_id | NO ACTION |
| tbl_scenario_log | thread_id | landscaper_chat_thread.id | NO ACTION |
| tbl_security_deposit | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_space | income_property_id | tbl_income_property.income_property_id | NO ACTION |
| tbl_space_ind_ext | space_id | tbl_space.space_id | CASCADE |
| tbl_space_mf_ext | space_id | tbl_space.space_id | CASCADE |
| tbl_space_ret_ext | space_id | tbl_space.space_id | CASCADE |
| tbl_system_picklist | parent_id | tbl_system_picklist.picklist_id | NO ACTION |
| tbl_template_column_config | template_id | tbl_property_use_template.template_id | CASCADE |
| tbl_tenant_improvement | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_termination_option | lease_id | tbl_lease.lease_id | CASCADE |
| tbl_user_grid_preference | user_id | auth_user.id | NO ACTION |
| tbl_user_landscaper_profile | user_id | auth_user.id | NO ACTION |
| tbl_user_preference | user_id | auth_user.id | NO ACTION |
| tbl_vacancy_assumption | project_id | tbl_project.project_id | NO ACTION |
| tbl_valuation_reconciliation | project_id | tbl_project.project_id | CASCADE |
| tbl_value_add_assumptions | project_id | tbl_project.project_id | NO ACTION |
| tbl_waterfall | project_id | tbl_project.project_id | CASCADE |
| tbl_waterfall_tier | equity_structure_id | tbl_equity_structure.equity_structure_id | NO ACTION |
| tester_feedback | duplicate_of_id | tester_feedback.id | NO ACTION |
| tester_feedback | user_id | auth_user.id | NO ACTION |
| type_lot_product | product_id | res_lot_product.product_id | CASCADE |
| type_lot_product | type_id | lu_type.type_id | CASCADE |
| user_profile | user_id | auth_user.id | CASCADE |
