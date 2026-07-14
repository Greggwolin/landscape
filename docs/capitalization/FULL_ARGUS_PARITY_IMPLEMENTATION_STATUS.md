> # ⛔ OBSOLETE — EVERY FILE PATH IN THIS DOCUMENT IS DEAD
>
> **Retired 2026-07-14.** Verified against the working tree the same day.
>
> This is not "stale but useful." It is a map to a place that **no longer exists**.
> Kept for history only. **Do not update it. Do not work from it.**
>
> ### Verified 2026-07-14 — every premise below is void
>
> | This file says | Actually |
> |---|---|
> | 4 form components at `src/app/prototypes/multifam/rent-roll-inputs/components/` | **All five files DELETED**, including `CapitalizationTab.tsx`. Confirmed by `find`. |
> | Fields respect "**basic/standard/advanced modes**" | **Progressive complexity modes were removed from the UI.** Landscaper manages complexity contextually now. See `CLAUDE.md`. |
> | Phase 4: expand Next.js `fieldMapping` from 8 → 34 fields per route | **Structurally moot.** `src/app/api/capitalization/debt/[facility_id]/route.ts` is now a **thin proxy to Django** — it spreads `...payload` and forwards everything. There is no field mapping left to expand. |
> | "Overall Progress: **40% Complete**" | **Misleading.** Phases 3–5 were not *stalled* — the plan was **abandoned** in favour of a different architecture. 40% of a discontinued plan is 0% of anything. |
> | Live capitalization lives in `/prototypes/` | It was **rebuilt** at `src/components/capitalization/` (`LoanCard`, `EquityPartnerModal`, `EquityPartnersTable`, `LeveragedCashFlow`, `LoanBudgetModal`). |
>
> ### Where the real status lives
>
> - **Capitalization feature status** → `/landscape/CLAUDE.md` (Alpha Readiness, row 12: "✅ WORKS —
>   waterfall calc endpoint wired, Next.js proxy → Django → Python engine")
> - **ARGUS parity** → **[`docs/02-features/financial-engine/ARGUS_PARITY_2026.md`](../02-features/financial-engine/ARGUS_PARITY_2026.md)**
>   (plain-English companion: `Landscape app/ARGUS_PARITY_2026.html`, OneDrive workspace folder)
>
> ### One live risk this document accidentally points at
>
> The proxy forwards `...payload` **blindly** to Django. Per `CLAUDE.md` §15.1, Landscaper tool
> writes fail **silently** when `ALLOWED_UPDATES` field names don't match actual DB columns — the
> API returns 200 while nothing saves. A blind-forwarding proxy inherits that exposure. Worth a
> targeted audit of the loan/equity write path; **not** worth resurrecting anything in this file.

---

# Full ARGUS Parity Implementation Status

**Date:** October 23, 2025 — **OBSOLETE. See the notice above.**
**Session:** Continued from previous context
**Status:** ~~Phase 1 Complete (Form Components), Phase 2 In Progress~~ — **plan abandoned; components deleted**

---

## Overview

This document tracks the comprehensive integration of ALL database fields (88+ fields across 4 entities) into the Capitalization Tab UI to achieve full ARGUS parity.

---

## ✅ Phase 1: UI Form Components (COMPLETED)

### Created Comprehensive Modal Forms

All four modal form components have been created with complete field coverage:

1. **[DebtFacilityForm.tsx](../../src/app/prototypes/multifam/rent-roll-inputs/components/DebtFacilityForm.tsx)** - 34 fields
   - Basic Information (7 fields): facility_name, lender_name, loan_amount, interest_rate_pct, loan_term_years, amortization_years, is_construction_loan
   - Rate Structure (6 fields): rate_type, index_name, spread_over_index_bps, rate_floor_pct, rate_cap_pct, rate_reset_frequency
   - Underwriting Metrics (2 fields): ltv_pct, dscr
   - Fees & Prepayment (4 fields): commitment_fee_pct, extension_fee_bps, prepayment_penalty_years, exit_fee_pct
   - Guarantees (2 fields): guarantee_type, guarantor_name
   - Loan Covenants (4 fields): loan_covenant_dscr_min, loan_covenant_ltv_max, loan_covenant_occupancy_min, covenant_test_frequency
   - Reserves & Escrows (5 fields): replacement_reserve_per_unit, tax_insurance_escrow_months, initial_reserve_months, recourse_carveout_provisions
   - Commitment & Extensions (4 fields): commitment_balance, drawn_to_date, extension_options, extension_option_years
   - Payment Calculations (2 fields): monthly_payment, annual_debt_service

2. **[EquityPartnerForm.tsx](../../src/app/prototypes/multifam/rent-roll-inputs/components/EquityPartnerForm.tsx)** - 28 fields
   - Basic Information (5 fields): tranche_name, partner_type, ownership_pct, capital_contributed, preferred_return_pct
   - Capital Tracking (4 fields): unreturned_capital, cumulative_distributions, accrued_preferred_return, preferred_return_paid_to_date
   - Promote Structure (6 fields): promote_pct, catch_up_pct, promote_trigger_type, promote_tier_1_threshold, promote_tier_3_threshold, promote_tier_3_pct
   - Return Targets (3 fields): irr_target_pct, equity_multiple_target, cash_on_cash_target_pct
   - Distribution Terms (3 fields): distribution_frequency, distribution_priority, can_defer_distributions
   - Fees (5 fields): management_fee_pct, management_fee_base, acquisition_fee_pct, disposition_fee_pct, promote_fee_pct
   - Clawback & Lookback (4 fields): has_clawback, clawback_threshold_pct, has_lookback, lookback_at_sale

3. **[WaterfallTierForm.tsx](../../src/app/prototypes/multifam/rent-roll-inputs/components/WaterfallTierForm.tsx)** - 9 fields
   - Basic Information (5 fields): tier_number, tier_name, lp_split_pct, gp_split_pct, is_active
   - Return Thresholds (2 fields): irr_threshold_pct, equity_multiple_threshold
   - Advanced Characteristics (4 fields): is_pari_passu, is_lookback_tier, catch_up_to_pct, display_order
   - Features: Auto-calculates complementary splits, validates 100% total

4. **[DrawScheduleForm.tsx](../../src/app/prototypes/multifam/rent-roll-inputs/components/DrawScheduleForm.tsx)** - 17 fields
   - Basic Information (5 fields): period_name, draw_number, draw_amount, draw_date, draw_purpose
   - Balance & Interest (5 fields): outstanding_balance, interest_rate_pct, interest_expense, interest_paid, deferred_interest
   - Dates (3 fields): request_date, approval_date, funding_date
   - Fees (3 fields): unused_fee_charge, commitment_fee_charge, other_fees
   - Approvals (2 fields): inspector_approval, lender_approval

### Form Component Features

- **Mode-Aware Visibility**: All forms respect basic/standard/advanced modes
- **Organized Sections**: Fields grouped logically with collapsible sections
- **Validation**: Required fields, split validation (waterfall), currency formatting
- **Professional UX**: Modal/drawer pattern, scrollable content, sticky headers/footers
- **Helpful UI**: Currency displays, percentage inputs, tooltips, examples

---

## ✅ Phase 2: TypeScript Interfaces (COMPLETED)

Updated all interfaces in [CapitalizationTab.tsx](../../src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx):

- `DebtFacility`: 7 → 34 fields
- `EquityTranche`: 7 → 28 fields
- `WaterfallTier`: 7 → 9 fields
- `DrawScheduleItem`: 5 → 17 fields

---

## 🔄 Phase 3: Main Component Integration (IN PROGRESS)

### What Needs to Be Done

The main [CapitalizationTab.tsx](../../src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx) component needs significant refactoring:

1. **Import New Form Components**
   ```typescript
   import DebtFacilityForm from './DebtFacilityForm';
   import EquityPartnerForm from './EquityPartnerForm';
   import WaterfallTierForm from './WaterfallTierForm';
   import DrawScheduleForm from './DrawScheduleForm';
   ```

2. **Add State for Modal Management**
   ```typescript
   const [showDebtForm, setShowDebtForm] = useState(false);
   const [showEquityForm, setShowEquityForm] = useState(false);
   const [showWaterfallForm, setShowWaterfallForm] = useState(false);
   const [showDrawForm, setShowDrawForm] = useState(false);
   const [editingItem, setEditingItem] = useState<any | null>(null);
   ```

3. **Replace Inline Table Editing**
   - Remove all inline editing inputs from tables
   - Keep tables as read-only summary views with key fields
   - Add "View/Edit" buttons that open modal forms
   - Update "Add" buttons to open forms instead of inline rows

4. **Update CRUD Handlers**
   - Modify `saveDebtEdit`, `saveEquityEdit`, etc. to work with modal forms
   - Pass complete form data to API endpoints

5. **Simplify Table Display**
   - Show only 4-6 key fields per entity in table
   - Add expand/collapse for additional summary info
   - Keep tables lightweight and scannable

---

## 🔄 Phase 4: API Endpoint Updates (PENDING)

### GET Endpoints - Need to Return All Fields

Currently GET endpoints return limited fields. Need to update:

1. **[/api/capitalization/debt/route.ts](../../src/app/api/capitalization/debt/route.ts)**
   - Add all 34 fields to SELECT query
   - Update response transformation

2. **[/api/capitalization/equity/route.ts](../../src/app/api/capitalization/equity/route.ts)**
   - Add all 28 fields to SELECT query
   - Update response transformation

3. **[/api/capitalization/waterfall/route.ts](../../src/app/api/capitalization/waterfall/route.ts)**
   - Add all 9 fields to SELECT query

4. **[/api/capitalization/draws/route.ts](../../src/app/api/capitalization/draws/route.ts)**
   - Add all 17 fields to SELECT query

### PATCH Endpoints - Need to Handle All Fields

Currently PATCH endpoints handle 6-8 fields. Need to update field mappings:

1. **[/api/capitalization/debt/[facility_id]/route.ts](../../src/app/api/capitalization/debt/[facility_id]/route.ts)**
   - Expand `fieldMapping` object to include all 34 fields
   - Currently: 8 fields → Target: 34 fields

2. **[/api/capitalization/equity/[tranche_id]/route.ts](../../src/app/api/capitalization/equity/[tranche_id]/route.ts)**
   - Expand field mapping to all 28 fields
   - Currently: ~10 fields → Target: 28 fields

3. **[/api/capitalization/waterfall/[tier_id]/route.ts](../../src/app/api/capitalization/waterfall/[tier_id]/route.ts)**
   - Add missing 4 fields (currently has 6 of 9)

4. **[/api/capitalization/draws/[draw_id]/route.ts](../../src/app/api/capitalization/draws/[draw_id]/route.ts)**
   - Expand to all 17 fields (currently has 4)

### POST Endpoints - Need to Accept All Fields

Similar updates needed for creation endpoints.

---

## 📋 Phase 5: Testing & Validation (PENDING)

### Test Matrix

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Debt Facility | ⏳ | ⏳ | ⏳ | ⏳ |
| Equity Partner | ⏳ | ⏳ | ⏳ | ⏳ |
| Waterfall Tier | ⏳ | ⏳ | ⏳ | ⏳ |
| Draw Schedule | ⏳ | ⏳ | ⏳ | ⏳ |

### Test Scenarios

1. **Basic Mode**: Test with minimal required fields
2. **Standard Mode**: Test with common fields
3. **Advanced Mode**: Test with all fields including edge cases
4. **Validation**: Test required fields, split percentages, date ranges
5. **Data Persistence**: Verify all fields save and retrieve correctly

---

## 🎯 Field Coverage Summary

| Entity | Database Fields | UI Form Fields | GET Endpoint | PATCH Endpoint | Coverage |
|--------|----------------|----------------|--------------|----------------|----------|
| Debt Facility | 34 | ✅ 34 | ⏳ ~12 | ⏳ 8 | Form: 100%, API: 35% |
| Equity Partner | 28 | ✅ 28 | ⏳ ~15 | ⏳ 10 | Form: 100%, API: 53% |
| Waterfall Tier | 9 | ✅ 9 | ⏳ 6 | ⏳ 6 | Form: 100%, API: 67% |
| Draw Schedule | 17 | ✅ 17 | ⏳ 5 | ⏳ 4 | Form: 100%, API: 29% |
| **TOTAL** | **88** | **88** | **~38** | **~28** | **Form: 100%, API: 43%** |

---

## 🚀 Implementation Steps - Next Session

### Priority 1: API Updates (Required for Forms to Work)

1. Update all GET endpoints to return complete field sets
2. Update all PATCH endpoints with complete field mappings
3. Test API endpoints independently with curl/Postman

### Priority 2: Component Integration

1. Import form components into CapitalizationTab
2. Add modal state management
3. Replace inline editing with modal forms
4. Simplify table displays

### Priority 3: Testing

1. Test each CRUD operation per entity
2. Verify field persistence
3. Test mode-specific field visibility
4. Test validation rules

---

## 📁 File Locations

### Form Components (NEW)
- `/src/app/prototypes/multifam/rent-roll-inputs/components/DebtFacilityForm.tsx`
- `/src/app/prototypes/multifam/rent-roll-inputs/components/EquityPartnerForm.tsx`
- `/src/app/prototypes/multifam/rent-roll-inputs/components/WaterfallTierForm.tsx`
- `/src/app/prototypes/multifam/rent-roll-inputs/components/DrawScheduleForm.tsx`

### Main Component (TO UPDATE)
- `/src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx`

### API Endpoints (TO UPDATE)
- `/src/app/api/capitalization/debt/route.ts` (GET/POST)
- `/src/app/api/capitalization/debt/[facility_id]/route.ts` (PATCH/DELETE)
- `/src/app/api/capitalization/equity/route.ts` (GET/POST)
- `/src/app/api/capitalization/equity/[tranche_id]/route.ts` (PATCH/DELETE)
- `/src/app/api/capitalization/waterfall/route.ts` (GET/POST)
- `/src/app/api/capitalization/waterfall/[tier_id]/route.ts` (PATCH/DELETE)
- `/src/app/api/capitalization/draws/route.ts` (GET/POST)
- `/src/app/api/capitalization/draws/[draw_id]/route.ts` (PATCH/DELETE)

### Database Migrations (COMPLETE)
- `/backend/db/migrations/014_complete_argus_capitalization_parity_v3.sql`
- `/backend/db/migrations/015_populate_capitalization_data.sql`

---

## 💡 Design Decisions

### Why Modal Forms vs Inline Editing?

With 34+ fields per entity, inline table editing becomes:
- **Unusable**: Too many columns, horizontal scrolling
- **Confusing**: Context switching between view/edit modes
- **Error-Prone**: Easy to accidentally edit wrong fields

Modal forms provide:
- **Organized Layout**: Grouped sections, clear hierarchy
- **Mode-Aware**: Progressive disclosure based on expertise level
- **Better UX**: Dedicated space, better validation, help text
- **Mobile-Friendly**: Scrollable, responsive design

### Field Organization

Fields are grouped by:
1. **Frequency of Use**: Most common fields in basic mode
2. **Complexity**: Advanced calculations in advanced mode
3. **Logical Grouping**: Related fields together (rates, fees, reserves)
4. **ARGUS Mapping**: Mirrors ARGUS property structure

---

## 🐛 Known Issues

1. **Dev Server Warnings**: Next.js 15 async params warnings in other routes (not capitalization)
2. **API Endpoint Errors**: Trying to edit debt facility currently fails (API not updated yet)
3. **Field Mappings**: Some API/DB field name mismatches need resolution

---

## 📊 Progress Metrics

- **Phase 1 (Form Components)**: 100% Complete
- **Phase 2 (Interfaces)**: 100% Complete
- **Phase 3 (Component Integration)**: 0% Complete
- **Phase 4 (API Updates)**: 0% Complete
- **Phase 5 (Testing)**: 0% Complete

**Overall Progress**: 40% Complete

---

## 🎯 Success Criteria

Integration is complete when:
1. ✅ All 88 fields have UI inputs
2. ⏳ All fields persist to database
3. ⏳ All fields display correctly on load
4. ⏳ Mode switching shows/hides appropriate fields
5. ⏳ Validation works for all required fields
6. ⏳ All CRUD operations work end-to-end

---

**Next Steps**: Update API endpoints to handle all fields, then integrate forms into main component.
