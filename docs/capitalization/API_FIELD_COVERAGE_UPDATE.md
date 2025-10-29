# API Field Coverage Update

**Date:** October 23, 2025
**Status:** In Progress

---

## Completed API Updates

### ✅ Debt Facility Endpoints - 34/34 Fields (100%)

#### GET `/api/capitalization/debt`
- **Updated SELECT query** to include all 34 fields
- **Updated transformation** to map all fields from DB to API schema
- Fields now returned:
  - Basic: facility_name, lender_name, loan_amount, interest_rate_pct, loan_term_years, amortization_years, is_construction_loan (7)
  - Rate Structure: rate_type, spread_over_index_bps, rate_floor_pct, rate_cap_pct, index_name, rate_reset_frequency (6)
  - Underwriting: ltv_pct, dscr (2)
  - Fees: commitment_fee_pct, extension_fee_bps, prepayment_penalty_years, exit_fee_pct (4)
  - Guarantees: guarantee_type, guarantor_name (2)
  - Covenants: loan_covenant_dscr_min, loan_covenant_ltv_max, loan_covenant_occupancy_min, covenant_test_frequency (4)
  - Reserves: reserve_requirements, replacement_reserve_per_unit, tax_insurance_escrow_months, initial_reserve_months, recourse_carveout_provisions (5)
  - Commitment: commitment_balance, drawn_to_date (2)
  - Extensions: extension_options, extension_option_years (2)
  - Payments: monthly_payment, annual_debt_service (2)

#### PATCH `/api/capitalization/debt/[facility_id]`
- **Expanded fieldMapping** from 8 → 34 fields
- **Added proper type handling** for strings, booleans, numbers, and NULL values
- **All fields can now be updated** via PATCH requests

---

## Remaining API Updates

### ⏳ Equity Partner Endpoints - Need 28 Fields

#### GET `/api/capitalization/equity`
**Current:** ~15 fields
**Target:** 28 fields
**Missing:**
- Capital tracking: unreturned_capital, cumulative_distributions, accrued_preferred_return, preferred_return_paid_to_date
- Promote structure: catch_up_pct, promote_trigger_type, promote_tier_1_threshold, promote_tier_3_threshold, promote_tier_3_pct
- Return targets: irr_target_pct, equity_multiple_target, cash_on_cash_target_pct
- Distribution terms: distribution_frequency, distribution_priority, can_defer_distributions
- Fees: management_fee_pct, management_fee_base, acquisition_fee_pct, disposition_fee_pct, promote_fee_pct
- Clawback: has_clawback, clawback_threshold_pct, has_lookback, lookback_at_sale

#### PATCH `/api/capitalization/equity/[tranche_id]`
**Current:** ~10 fields
**Target:** 28 fields
**Action:** Expand fieldMapping similar to debt endpoint

---

### ⏳ Waterfall Tier Endpoints - Need 9 Fields

#### GET `/api/capitalization/waterfall`
**Current:** 6 fields
**Target:** 9 fields
**Missing:**
- equity_multiple_threshold
- is_pari_passu
- is_lookback_tier
- catch_up_to_pct
- display_order

#### PATCH `/api/capitalization/waterfall/[tier_id]`
**Current:** 6 fields
**Target:** 9 fields
**Action:** Add missing 3 fields to fieldMapping

---

### ⏳ Draw Schedule Endpoints - Need 17 Fields

#### GET `/api/capitalization/draws`
**Current:** 5 fields
**Target:** 17 fields
**Missing:**
- draw_number
- outstanding_balance
- Interest: interest_rate_pct, interest_expense, interest_paid, deferred_interest
- Fees: unused_fee_charge, commitment_fee_charge, other_fees
- Dates: request_date, approval_date, funding_date
- Approvals: inspector_approval, lender_approval

#### PATCH `/api/capitalization/draws/[draw_id]`
**Current:** 4 fields
**Target:** 17 fields
**Action:** Expand fieldMapping from 4 → 17 fields

---

## Field Coverage Summary

| Endpoint | Current | Target | % Complete | Status |
|----------|---------|--------|------------|--------|
| **Debt GET** | 34 | 34 | 100% | ✅ Complete |
| **Debt PATCH** | 34 | 34 | 100% | ✅ Complete |
| **Equity GET** | 15 | 28 | 54% | ⏳ To Do |
| **Equity PATCH** | 10 | 28 | 36% | ⏳ To Do |
| **Waterfall GET** | 6 | 9 | 67% | ⏳ To Do |
| **Waterfall PATCH** | 6 | 9 | 67% | ⏳ To Do |
| **Draws GET** | 5 | 17 | 29% | ⏳ To Do |
| **Draws PATCH** | 4 | 17 | 24% | ⏳ To Do |
| **OVERALL** | **114** | **176** | **65%** | **⏳ In Progress** |

---

## Implementation Pattern

### GET Endpoint Updates

1. **Expand SELECT query** to include all fields from migration schema
2. **Update transformation** to map all fields with appropriate type conversions
3. **Handle NULL values** with proper defaults or null coalescing

### PATCH Endpoint Updates

1. **Expand fieldMapping object** to include all updateable fields
2. **Add type handling** for different data types (string, number, boolean, null)
3. **Escape strings** to prevent SQL injection
4. **Keep validation logic** for business rules

---

## Next Steps

1. Update Equity GET endpoint - add 13 missing fields
2. Update Equity PATCH endpoint - expand from 10 → 28 fields
3. Update Waterfall GET endpoint - add 3 missing fields
4. Update Waterfall PATCH endpoint - add 3 missing fields
5. Update Draws GET endpoint - add 12 missing fields
6. Update Draws PATCH endpoint - expand from 4 → 17 fields
7. Test all endpoints with Postman/curl
8. Integrate forms into main UI component

---

## Files Updated

- ✅ `/src/app/api/capitalization/debt/route.ts` (GET)
- ✅ `/src/app/api/capitalization/debt/[facility_id]/route.ts` (PATCH)
- ⏳ `/src/app/api/capitalization/equity/route.ts` (GET)
- ⏳ `/src/app/api/capitalization/equity/[tranche_id]/route.ts` (PATCH)
- ⏳ `/src/app/api/capitalization/waterfall/route.ts` (GET)
- ⏳ `/src/app/api/capitalization/waterfall/[tier_id]/route.ts` (PATCH)
- ⏳ `/src/app/api/capitalization/draws/route.ts` (GET)
- ⏳ `/src/app/api/capitalization/draws/[draw_id]/route.ts` (PATCH)

---

## Testing Notes

Once all endpoints are updated:

1. **Test GET endpoints** return all fields correctly
2. **Test PATCH endpoints** accept and persist all fields
3. **Test NULL handling** for optional fields
4. **Test type conversions** (especially decimals/percentages)
5. **Test validation** for required fields and business rules
6. **Integration test** with UI forms

---

**Progress:** Debt endpoints complete (34/34 fields). Remaining: Equity (28), Waterfall (9), Draws (17) = 54 fields to update.
