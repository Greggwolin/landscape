# Loss to Lease & Year 1 Buyer NOI Implementation

**Date**: January 13, 2026
**Duration**: ~2 hours
**Focus**: Implementing income analysis tools for multifamily underwriting

---

## Summary

Implemented comprehensive Loss to Lease (LTL) and Year 1 Buyer NOI calculators for multifamily properties. These tools help buyers understand realistic Day 1 cash flow vs. broker-presented "Current" and "Proforma" NOI scenarios. Added rent control awareness for California properties.

## Major Accomplishments

### 1. Income Analysis Detection Service ✅
- Created `IncomeAnalysisDetector` to detect when LTL/Year 1 NOI analysis is applicable
- Checks for rent roll data availability (current rents, market rents, lease dates)
- Identifies material rent gaps (>5% threshold)
- Determines expense data availability (proforma vs T-12)

### 2. Loss to Lease Calculator ✅
- Simple method: Annual gap = (Market - Current) × 12
- Time-weighted method: Present value based on lease expirations
- Lease expiration schedule by month
- Rent control impact analysis integrated

### 3. Year 1 Buyer NOI Calculator ✅
- Uses actual in-place rents (inherited rent roll)
- Uses projected/proforma expenses (taxes reassess, new insurance, etc.)
- Compares to broker "Current NOI" and "Proforma NOI"
- Includes loss to lease context

### 4. Rent Control Service ✅
- California AB 1482 awareness (10% cap)
- Local rent control ordinances (LA, SF, Oakland, etc.)
- New construction exemption detection (15 years in CA)
- Costa-Hawkins vacancy decontrol awareness
- LTL recovery timeline calculation under rent control

### 5. Landscaper Tool Integration ✅
- `analyze_loss_to_lease` - Calculate LTL with simple or time-weighted method
- `calculate_year1_buyer_noi` - Calculate realistic Year 1 NOI
- `check_income_analysis_availability` - Check data availability and recommendations

## Files Modified

### New Files Created:
- `backend/apps/landscaper/services/income_analysis_detector.py`
- `backend/apps/landscaper/services/loss_to_lease_calculator.py`
- `backend/apps/landscaper/services/year1_noi_calculator.py`
- `backend/apps/landscaper/services/rent_control_service.py`

### Files Modified:
- `backend/apps/landscaper/services/__init__.py` - Added exports for new services
- `backend/apps/landscaper/ai_handler.py` - Added 3 new tool definitions
- `backend/apps/landscaper/tool_executor.py` - Added tool executor functions

## Test Results (Vincent Village, project_id=54)

```
Loss to Lease Results (Simple Method):
  Total Current Monthly: $66,252
  Total Market Monthly: $88,600
  Monthly Gap: $22,348
  Annual Gap: $268,176
  Gap %: 33.7%
  Units: 40 total, 39 below market

Rent Control Analysis:
  Is Rent Controlled: True
  Ordinance: AB 1482
  Max Increase: 10%
  Years to full LTL recovery: 3.4 years
```

## Key Concepts

### Year 1 Buyer NOI vs Broker Scenarios
- **Broker "Current NOI"**: Actual Rents + Actual Expenses (historical, backward-looking)
- **Broker "Proforma NOI"**: Market Rents + Projected Expenses (aspirational fantasy)
- **Year 1 Buyer NOI**: Actual Rents + Projected Expenses (realistic Day 1 cash flow)

### Rent Control Impact
Properties under rent control (like CA AB 1482) cannot immediately recover Loss to Lease:
- Max annual increase capped (typically 5-10%)
- Recovery timeline extends from immediate to years
- Vacancy decontrol (Costa-Hawkins) allows market rate on turnover

## Next Steps
- Integrate income analysis context injection into AI system prompts
- Add time-weighted LTL when lease dates are available
- Consider adding Year 2+ NOI projections with rent growth
- Add more local rent control jurisdictions beyond California

## Git Activity

### Commit Information:
Pending commit for documentation update
