# Landscaper Tools Inventory

**Generated:** 2026-01-30
**Total Tools:** 135

---

## Overview

Landscaper has 135 tools available for Claude to use. This large number of tools can impact model behavior - with very long conversation histories (40+ messages), Claude may stop using tools and instead generate text-only responses.

**Recommendation:** Keep conversation threads shorter or implement message history trimming to ensure reliable tool use.

---

## Tools by Category

### Project & Field Management (7 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 1 | `update_project_field` | Update a project field |
| 2 | `bulk_update_fields` | Update multiple fields at once |
| 6 | `get_project_fields` | Retrieve current values of specific project fields |
| 7 | `get_field_schema` | Get metadata about available fields |

### Cash Flow & DCF Analysis (3 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 3 | `get_cashflow_results` | Read cash flow / DCF assumptions and results |
| 4 | `compute_cashflow_expression` | Evaluate math expressions against cash flow results |
| 5 | `update_cashflow_assumption` | Update a cashflow/DCF assumption (direct write) |

### Document Management (5 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 8 | `get_project_documents` | List all documents uploaded to this project |
| 9 | `get_document_content` | Get the full text content from a document |
| 10 | `get_document_assertions` | Get structured data assertions extracted from documents |
| 11 | `ingest_document` | Auto-populate project fields from a document |

### Operating Expenses & Comparables (6 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 12 | `update_operating_expenses` | Add or update operating expenses |
| 13 | `update_rental_comps` | Add or update rental comparables |
| 29 | `get_sales_comparables` | Get sales comparables |
| 30 | `update_sales_comparable` | Add or update a sales comparable |
| 31 | `delete_sales_comparable` | Delete a sales comparable |
| 32 | `get_sales_comp_adjustments` | Get adjustments for a sales comparable |
| 33 | `update_sales_comp_adjustment` | Add or update a sales comp adjustment |
| 34 | `get_rental_comparables` | Get rental comparables |
| 35 | `update_rental_comparable` | Add or update a rental comparable |
| 36 | `delete_rental_comparable` | Delete a rental comparable |

### Contacts (9 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 14 | `update_project_contacts` | Add or update project contacts |
| 116 | `search_cabinet_contacts` | Search for existing contacts in the cabinet |
| 117 | `get_project_contacts_v2` | Get all contacts assigned to this project |
| 118 | `get_contact_roles` | Get available contact roles |
| 119 | `create_cabinet_contact` | Create a new contact in the cabinet |
| 120 | `assign_contact_to_project` | Assign an existing contact to project |
| 121 | `remove_contact_from_project` | Remove a contact from project |
| 122 | `extract_and_save_contacts` | Extract contacts from document content |

### Property Acquisition & Revenue (8 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 15 | `get_acquisition` | Get property acquisition assumptions |
| 16 | `update_acquisition` | Update property acquisition assumptions |
| 17 | `get_revenue_rent` | Get rent revenue assumptions |
| 18 | `update_revenue_rent` | Update rent revenue assumptions |
| 19 | `get_revenue_other` | Get other revenue assumptions |
| 20 | `update_revenue_other` | Update other revenue assumptions |
| 21 | `get_vacancy_assumptions` | Get vacancy and loss assumptions |
| 22 | `update_vacancy_assumptions` | Update vacancy and loss assumptions |

### Multifamily Units & Leases (6 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 23 | `get_unit_types` | Get unit type mix for multifamily |
| 24 | `update_unit_types` | Add or update unit types |
| 25 | `get_units` | Get individual unit details |
| 26 | `update_units` | Add or update individual units |
| 27 | `get_leases` | Get lease records |
| 28 | `update_leases` | Add or update lease records |

### Capital Structure (6 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 37 | `get_debt_facilities` | Retrieve debt facilities |
| 38 | `update_debt_facility` | Create or update a debt facility |
| 39 | `delete_debt_facility` | Delete a debt facility |
| 40 | `get_equity_structure` | Retrieve equity structure |
| 41 | `update_equity_structure` | Create or update equity structure |
| 42 | `get_waterfall_tiers` | Retrieve waterfall tiers |
| 43 | `update_waterfall_tiers` | Create or update waterfall tiers |

### Budget Management (5 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 44 | `get_budget_categories` | Retrieve budget cost categories |
| 45 | `update_budget_category` | Create or update a budget category |
| 46 | `get_budget_items` | Retrieve budget line items |
| 47 | `update_budget_item` | Create or update a budget line item |
| 48 | `delete_budget_item` | Delete a budget line item |

### Land Development Hierarchy (12 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 49 | `get_areas` | Retrieve planning areas |
| 50 | `update_area` | Create or update a planning area |
| 51 | `delete_area` | Delete a planning area |
| 52 | `get_phases` | Retrieve development phases |
| 53 | `update_phase` | Create or update a phase |
| 54 | `delete_phase` | Delete a phase |
| 55 | `get_parcels` | Retrieve parcels/lots |
| 56 | `update_parcel` | Create or update a parcel/lot |
| 57 | `delete_parcel` | Delete a parcel/lot |
| 58 | `get_milestones` | Retrieve project milestones |
| 59 | `update_milestone` | Create or update a milestone |
| 60 | `delete_milestone` | Delete a milestone |

### Land Use Taxonomy (6 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 61 | `get_land_use_families` | Retrieve land use families |
| 62 | `update_land_use_family` | Create or update a land use family |
| 63 | `get_land_use_types` | Retrieve land use types |
| 64 | `update_land_use_type` | Create or update a land use type |
| 65 | `get_residential_products` | Retrieve residential lot products |
| 66 | `update_residential_product` | Create or update a residential product |

### System Configuration (12 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 67 | `get_measures` | Retrieve measurement units |
| 68 | `update_measure` | Create or update a measurement unit |
| 69 | `get_picklist_values` | Retrieve system picklist values |
| 70 | `update_picklist_value` | Create or update a picklist value |
| 71 | `delete_picklist_value` | Delete a picklist value |
| 72 | `get_benchmarks` | Retrieve global benchmark values |
| 73 | `update_benchmark` | Create or update a benchmark |
| 74 | `delete_benchmark` | Delete a benchmark |
| 75 | `get_cost_library_items` | Retrieve cost library items |
| 76 | `update_cost_library_item` | Create or update a cost library item |
| 77 | `delete_cost_library_item` | Delete a cost library item |

### Templates (3 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 78 | `get_report_templates` | Retrieve report templates |
| 79 | `get_dms_templates` | Retrieve DMS templates |
| 80 | `update_template` | Create or update a template |

### Commercial Real Estate (12 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 81 | `get_cre_tenants` | Retrieve commercial tenants |
| 82 | `update_cre_tenant` | Create or update a commercial tenant |
| 83 | `delete_cre_tenant` | Delete a commercial tenant |
| 84 | `get_cre_spaces` | Retrieve commercial spaces/suites |
| 85 | `update_cre_space` | Create or update a commercial space |
| 86 | `delete_cre_space` | Delete a commercial space |
| 87 | `get_cre_leases` | Retrieve commercial leases |
| 88 | `update_cre_lease` | Create or update a commercial lease |
| 89 | `delete_cre_lease` | Delete a commercial lease |
| 90 | `get_cre_properties` | Retrieve commercial properties |
| 91 | `update_cre_property` | Create or update a commercial property |
| 92 | `get_cre_rent_roll` | Get the full commercial rent roll |

### Market & Absorption (10 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 93 | `get_competitive_projects` | Retrieve competitive projects |
| 94 | `update_competitive_project` | Create or update a competitive project |
| 95 | `delete_competitive_project` | Delete a competitive project |
| 96 | `get_absorption_benchmarks` | Retrieve absorption velocity benchmarks |
| 97 | `get_market_assumptions` | Get market assumptions |
| 98 | `update_market_assumptions` | Update market assumptions |
| 99 | `get_absorption_schedule` | Get the absorption schedule |
| 100 | `update_absorption_schedule` | Create or update an absorption entry |
| 101 | `delete_absorption_schedule` | Delete an absorption entry |
| 102 | `get_parcel_sale_events` | Get lot sale contracts/events |
| 103 | `update_parcel_sale_event` | Create or update a sale event |
| 104 | `delete_parcel_sale_event` | Delete a parcel sale event |

### AI Extraction & Knowledge (9 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 105 | `get_extraction_results` | Get AI extraction results |
| 106 | `update_extraction_result` | Update an extraction result status |
| 107 | `get_extraction_corrections` | Get AI extraction corrections |
| 108 | `log_extraction_correction` | Log a user correction to AI extraction |
| 109 | `get_knowledge_entities` | Get knowledge entities |
| 110 | `get_knowledge_facts` | Get knowledge facts |
| 111 | `get_knowledge_insights` | Get AI-discovered insights |
| 112 | `acknowledge_insight` | Acknowledge an AI insight |

### Financial Analysis (3 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 113 | `analyze_loss_to_lease` | Calculate Loss to Lease for multifamily |
| 114 | `calculate_year1_buyer_noi` | Calculate realistic Year 1 NOI for a buyer |
| 115 | `check_income_analysis_availability` | Check if analyses are available |

### Highest & Best Use Analysis (7 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 123 | `get_hbu_scenarios` | Get H&BU analysis scenarios |
| 124 | `create_hbu_scenario` | Create a new H&BU scenario |
| 125 | `update_hbu_scenario` | Update an H&BU scenario |
| 126 | `compare_hbu_scenarios` | Compare H&BU scenarios |
| 127 | `generate_hbu_narrative` | Generate appraisal-style narratives |
| 128 | `get_hbu_conclusion` | Get the H&BU conclusion |
| 129 | `add_hbu_comparable_use` | Add a comparable use to H&BU scenario |

### Property Attributes (6 tools)
| # | Tool Name | Description |
|---|-----------|-------------|
| 130 | `get_property_attributes` | Get all property attributes |
| 131 | `update_property_attributes` | Update property attributes |
| 132 | `get_attribute_definitions` | Get available attribute definitions |
| 133 | `update_site_attribute` | Update a single site attribute |
| 134 | `update_improvement_attribute` | Update a single improvement attribute |
| 135 | `calculate_remaining_economic_life` | Calculate remaining economic life |

---

## Known Issues

### Tool Use Degradation with Long Conversations

**Problem:** When conversation history exceeds ~40 messages, Claude may stop calling tools and instead generate plausible-sounding text responses without actually executing tool calls.

**Symptoms:**
- Claude says "Done. Updated X to Y" but database shows old value
- Logs show `stop_reason=end_turn` instead of `stop_reason=tool_use`
- No `[CASHFLOW_WRITE]` or tool execution logs appear

**Root Cause:** With 135 tools and long message history, the context becomes too large and Claude deprioritizes tool use.

**Solution:** Start a new conversation thread to reset context. With fresh threads (1 message), tool use works reliably.

**Potential Fixes:**
1. Trim message history to last N messages before sending to Claude
2. Implement conversation summarization for long threads
3. Reduce number of tools by grouping or lazy-loading
4. Add stronger tool-use reminders in system prompt for long contexts

---

## Session Notes

- **2026-01-30:** Discovered tool use degradation issue. With 49 messages, `stop_reason=end_turn`. With 1 message (new thread), `stop_reason=tool_use` and tools execute correctly.
