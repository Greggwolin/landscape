# Excel Model Audit Skill v3b — Test Results
**Date:** 2026-04-11
**Models tested:** 22
**Skill version:** v3b (v3 + prefix stripping + property-type-aware scoring + data file detection)

---

## Summary

| Assessment | v3 | v3b | Delta |
|:-----------|---:|----:|------:|
| Ready (90%+) | 2 | 8 | +6 |
| Needs Work (70-89%) | 10 | 8 | -2 |
| Low Coverage (<70%) | 10 | 4 | -6 |
| Data File (exempt) | 0 | 2 | +2 |
| Failed/Timeout | 0 | 0 | 0 |
| **Total** | **22** | **22** | |

## Property Types Detected

| Type | Count | Weight Profile |
|:-----|------:|:---------------|
| land_development | 12 | land_dev |
| multifamily | 6 | standard |
| unknown | 3 | standard |
| valuation | 1 | valuation |

## Waterfall Classifications

16 of 22 models have identifiable waterfall structures (v3: 5).

| Waterfall Type | Count |
|:---------------|------:|
| tiered_hurdle | 8 |
| custom | 3 |
| tiered_irr_hurdle | 2 |
| pref_then_split | 2 |
| pref_catchup_split | 1 |

---

## Detailed Results by Model

### 11515 & 11523 Old River School Rd - 3 year bridge to Refi.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 347 KB |
| VBA | No |
| Trust Score | **99%** |
| Assessment | **Ready** |
| Property Type | multifamily |
| Weight Profile | standard |
| Sheets | 14 total, 13 classified |
| Waterfall | Found: tiered_irr_hurdle |
| S&U | found |
| Categories Found | capex(20), deal_info(19), debt(35), equity(74), expenses(32), income(55), returns(19) |
| Categories Missing | None |
| WF Details | 3-Tier IRR-Hurdle Waterfall - Compounded, Cumulative, Monthly Accrual and Monthl; First, Preferred Return is distributed to Investor and Sponsor Pari-Passu;; Third, Tier 2 promote is distributed to Sp... |

### Azusa RentRoll.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 18 KB |
| VBA | No |
| Trust Score | **0%** (was 24%, Δ-24) |
| Assessment | **Data File** |
| Property Type | unknown |
| Weight Profile | n/a |
| Sheets | 1 total, 1 classified |
| Data File | Yes — exempt from full audit |
| Waterfall | Not found |
| S&U | not_found |
| Categories Found | income(2) |
| Categories Missing | expenses, debt, capex, deal_info, equity, returns |
| Notes | Data export / rent roll — not a financial model. Exempt from full audit. |

### Brownstone Apartments - 3 year bridge refi and hold.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 356 KB |
| VBA | No |
| Trust Score | **99%** (was 98%, Δ+1) |
| Assessment | **Ready** |
| Property Type | multifamily |
| Weight Profile | standard |
| Sheets | 16 total, 15 classified |
| Waterfall | Found: tiered_irr_hurdle |
| S&U | found |
| Categories Found | capex(25), deal_info(27), debt(39), equity(77), expenses(38), income(67), returns(23) |
| Categories Missing | None |
| WF Details | 3-Tier IRR-Hurdle Waterfall - Compounded, Cumulative, Monthly Accrual and Monthl; First, Preferred Return is distributed to Investor and Sponsor Pari-Passu;; Third, Tier 2 promote is distributed to Sp... |

### CHS PROFORMA v6.25 (EB5) w Ph2 08.16.2024  W 6.21 Financial Assumptions.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 586 KB |
| VBA | No |
| Trust Score | **99%** (was 78%, Δ+21) |
| Assessment | **Ready** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 14 total, 13 classified |
| Waterfall | Found: tiered_hurdle |
| S&U | found |
| Categories Found | capex(30), deal_info(47), debt(48), equity(84), expenses(30), income(43), returns(61) |
| Categories Missing | None |
| WF Details | Pref Accrual Rate; Repayment Waterfall; Preferred Return; JV GP Promote Split |
| Notes | Waterfall found in non-classified sheet: Assumptions |

### CP PROFORMA v6.23 (EB5) w Ph2 08.16.2024.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 633 KB |
| VBA | No |
| Trust Score | **99%** (was 78%, Δ+21) |
| Assessment | **Ready** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 14 total, 13 classified |
| Waterfall | Found: tiered_hurdle |
| S&U | found |
| Categories Found | capex(30), deal_info(47), debt(48), equity(84), expenses(30), income(43), returns(61) |
| Categories Missing | None |
| WF Details | Pref Accrual Rate; Repayment Waterfall; Preferred Return; JV GP Promote Split |
| Notes | Waterfall found in non-classified sheet: Assumptions |

### CP PROFORMA v8.23 (CP Op Agreement).xlsx

| Attribute | Value |
|:----------|:------|
| Size | 476 KB |
| VBA | No |
| Trust Score | **100%** (was 78%, Δ+22) |
| Assessment | **Ready** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 13 total, 13 classified |
| Waterfall | Found: tiered_hurdle |
| S&U | found |
| Categories Found | capex(20), deal_info(44), debt(42), equity(90), expenses(30), income(39), returns(54) |
| Categories Missing | None |
| WF Details | Pref Accrual Rate; Repayment Waterfall; Preferred Return; GP Promote Split |
| Notes | Waterfall found in non-classified sheet: Assumptions |

### CP PROFORMA v8.23 (Phase 1 - CP Op Agreement).xlsx

| Attribute | Value |
|:----------|:------|
| Size | 476 KB |
| VBA | No |
| Trust Score | **100%** (was 78%, Δ+22) |
| Assessment | **Ready** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 13 total, 13 classified |
| Waterfall | Found: tiered_hurdle |
| S&U | found |
| Categories Found | capex(20), deal_info(44), debt(42), equity(90), expenses(30), income(39), returns(54) |
| Categories Missing | None |
| WF Details | Pref Accrual Rate; Repayment Waterfall; Preferred Return; GP Promote Split |
| Notes | Waterfall found in non-classified sheet: Assumptions |

### CP PROFORMA v8.25 (Builders Cap Debt).xlsx

| Attribute | Value |
|:----------|:------|
| Size | 476 KB |
| VBA | No |
| Trust Score | **100%** (was 78%, Δ+22) |
| Assessment | **Ready** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 13 total, 13 classified |
| Waterfall | Found: tiered_hurdle |
| S&U | found |
| Categories Found | capex(20), deal_info(44), debt(42), equity(90), expenses(30), income(39), returns(54) |
| Categories Missing | None |
| WF Details | Pref Accrual Rate; Repayment Waterfall; Preferred Return; GP Promote Split |
| Notes | Waterfall found in non-classified sheet: Assumptions |

### Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 22 KB |
| VBA | No |
| Trust Score | **0%** (was 30%, Δ-30) |
| Assessment | **Data File** |
| Property Type | multifamily |
| Weight Profile | n/a |
| Sheets | 1 total, 1 classified |
| Data File | Yes — exempt from full audit |
| Waterfall | Not found |
| S&U | not_found |
| Categories Found | income(53) |
| Categories Missing | expenses, debt, capex, deal_info, equity, returns |
| Notes | Data export / rent roll — not a financial model. Exempt from full audit. |

### Clarendon_CBH.xlsm

| Attribute | Value |
|:----------|:------|
| Size | 660 KB |
| VBA | Yes |
| Trust Score | **84%** |
| Assessment | **Needs Work** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 10 total, 9 classified |
| Waterfall | Found: tiered_hurdle |
| S&U | not_found |
| Categories Found | capex(14), deal_info(23), debt(6), equity(25), expenses(3), income(5), returns(2) |
| Categories Missing | None |
| WF Details | Distribution Waterfall; Distribution Waterfall; Promote; Preferred Return; Return of Capital |

### CustomHome_2024.xlsm

| Attribute | Value |
|:----------|:------|
| Size | 222 KB |
| VBA | Yes |
| Trust Score | **91%** (was 68%, Δ+23) |
| Assessment | **Ready** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 4 total, 4 classified |
| Waterfall | Found: custom |
| S&U | found |
| Categories Found | deal_info(12), debt(17), equity(12), expenses(6), income(4), returns(3) |
| Categories Missing | capex |
| WF Details | Loan Proceeds; Net Sale Proceeds; House Sale Proceeds |
| Notes | Waterfall found in non-classified sheet: Reports |

### Fontana Workbook.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 26 KB |
| VBA | No |
| Trust Score | **39%** (was 24%, Δ+15) |
| Assessment | **Low Coverage** |
| Property Type | unknown |
| Weight Profile | standard |
| Sheets | 1 total, 1 classified |
| Waterfall | Not found |
| S&U | not_found |
| Categories Found | deal_info(1) |
| Categories Missing | income, expenses, debt, capex, equity, returns |

### Glendora Workbook.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 41 KB |
| VBA | No |
| Trust Score | **51%** (was 36%, Δ+15) |
| Assessment | **Low Coverage** |
| Property Type | unknown |
| Weight Profile | standard |
| Sheets | 1 total, 1 classified |
| Waterfall | Not found |
| S&U | not_found |
| Categories Found | deal_info(1), equity(2), income(1) |
| Categories Missing | expenses, debt, capex, returns |

### Land - 2022.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 562 KB |
| VBA | No |
| Trust Score | **53%** (was 44%, Δ+9) |
| Assessment | **Low Coverage** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 14 total, 7 classified |
| Waterfall | Not found |
| S&U | not_found |
| Categories Found | deal_info(18), debt(14), expenses(1), income(4) |
| Categories Missing | capex, equity, returns |

### Land2024.xlsm

| Attribute | Value |
|:----------|:------|
| Size | 185 KB |
| VBA | Yes |
| Trust Score | **44%** (was 41%, Δ+3) |
| Assessment | **Low Coverage** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 3 total, 1 classified |
| Waterfall | Not found |
| S&U | not_found |
| Categories Found | capex(1), deal_info(8), expenses(1) |
| Categories Missing | income, debt, equity, returns |

### MPC_2023.xlsm

| Attribute | Value |
|:----------|:------|
| Size | 941 KB |
| VBA | Yes |
| Trust Score | **84%** (was 74%, Δ+10) |
| Assessment | **Needs Work** |
| Property Type | multifamily |
| Weight Profile | standard |
| Sheets | 24 total, 17 classified |
| Waterfall | Found: tiered_hurdle |
| S&U | not_found |
| Categories Found | capex(15), deal_info(61), debt(35), equity(55), expenses(15), income(57), returns(8) |
| Categories Missing | None |
| WF Details | Distribution Waterfall; Distribution Waterfall; Promote; Preferred Return; Return of Capital |

### Orion_Multifam.xlsm

| Attribute | Value |
|:----------|:------|
| Size | 6445 KB |
| VBA | Yes |
| Trust Score | **86%** (was 83%, Δ+3) |
| Assessment | **Needs Work** |
| Property Type | multifamily |
| Weight Profile | standard |
| Sheets | 31 total, 17 classified |
| Waterfall | Found: custom |
| S&U | found |
| Categories Found | capex(22), deal_info(22), debt(46), equity(63), expenses(30), income(148), returns(26) |
| Categories Missing | None |
| WF Details | Capital Partner |

### PeoriaLakes MPC_2023.xlsm

| Attribute | Value |
|:----------|:------|
| Size | 971 KB |
| VBA | Yes |
| Trust Score | **82%** (was 73%, Δ+9) |
| Assessment | **Needs Work** |
| Property Type | multifamily |
| Weight Profile | standard |
| Sheets | 24 total, 14 classified |
| Waterfall | Found: tiered_hurdle |
| S&U | not_found |
| Categories Found | capex(16), deal_info(46), debt(36), equity(55), expenses(18), income(57), returns(8) |
| Categories Missing | None |
| WF Details | Distribution Waterfall; Distribution Waterfall; Promote; Preferred Return; Return of Capital |

### Peregrine Ranch LOT+HOME v3.0.xlsm

| Attribute | Value |
|:----------|:------|
| Size | 122 KB |
| VBA | Yes |
| Trust Score | **87%** (was 79%, Δ+8) |
| Assessment | **Needs Work** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 2 total, 2 classified |
| Waterfall | Found: pref_then_split |
| S&U | found |
| Categories Found | capex(1), deal_info(3), equity(26), expenses(2), returns(12) |
| Categories Missing | income, debt |
| WF Details | LP RETURN STRUCTURE = IRR HURDLES + BACKEND PROFIT SPLIT; PREFERRED RETURN TO EQUITY; POST PREFERRED RETURNS PROFIT SPLIT; EQUITY: Preferred Members (LP); Preferred Members (LP) Returns |
| Notes | Waterfall found in non-classified sheet: Returns Lot Only |

### STNL-Valuation_v2.4.xlsx

| Attribute | Value |
|:----------|:------|
| Size | 1892 KB |
| VBA | No |
| Trust Score | **74%** (was 64%, Δ+10) |
| Assessment | **Needs Work** |
| Property Type | valuation |
| Weight Profile | valuation |
| Sheets | 6 total, 4 classified |
| Waterfall | Found: custom |
| S&U | not_found |
| Categories Found | capex(9), deal_info(3), debt(20), equity(3), expenses(21), income(51), returns(6) |
| Categories Missing | None |
| WF Details | Residual Month; RESIDUAL ASSUMPTIONS; Residual Discount Rate; Residual Pro Forma |
| Notes | Waterfall found in non-classified sheet: Inputs |

### Weyyakin PROFORMA v3 (Blocks 8+10).xlsm

| Attribute | Value |
|:----------|:------|
| Size | 269 KB |
| VBA | Yes |
| Trust Score | **85%** (was 63%, Δ+22) |
| Assessment | **Needs Work** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 6 total, 6 classified |
| Waterfall | Found: pref_then_split |
| S&U | not_found |
| Categories Found | capex(10), deal_info(6), debt(9), equity(24), expenses(24), income(35), returns(18) |
| Categories Missing | None |
| WF Details | LP RETURN STRUCTURE = IRR HURDLES + BACKEND PROFIT SPLIT; PREFERRED RETURN TO EQUITY; POST PREFERRED RETURNS PROFIT SPLIT; EQUITY: Preferred Members (LP); Preferred Members (LP) Returns |
| Notes | Waterfall found in non-classified sheet: Returns (PreSales) |

### cbaymod_051.xlsm

| Attribute | Value |
|:----------|:------|
| Size | 314 KB |
| VBA | Yes |
| Trust Score | **83%** (was 51%, Δ+32) |
| Assessment | **Needs Work** |
| Property Type | land_development |
| Weight Profile | land_dev |
| Sheets | 8 total, 7 classified |
| Waterfall | Found: pref_catchup_split |
| S&U | not_found |
| Categories Found | capex(40), deal_info(1), debt(2), equity(22), expenses(6), income(6), returns(6) |
| Categories Missing | None |
| WF Details | Promote %; 50.000% Promote Catch up; Promote %; 50.000% Promote CF up until 99.000%; Promote % |
| Notes | Waterfall found in non-classified sheet: R_SingleFund |

---

## v3 → v3b Improvement Analysis

### Changes Applied

1. **Prefix stripping (1a)** — Strip i/m/r prefixes before keyword matching. Gregg's convention: i=inputs, m=model, r=reports.
2. **Extended waterfall keywords** — Added "partner", "partnership", "prtnership", "allocation", "splits", "return of capital", "roc", "residual".
3. **Property-type-aware trust scoring (1b)** — Three weight profiles: standard (MF), land_dev (5% waterfall weight), valuation (5% WF, 25% S&U).
4. **Data file detection** — Files with ≤3 sheets and no calc-type classifications → "Data File" (exempt from audit).
5. **Extended category keywords** — Added construction cost, hard/soft cost, yield on cost, etc.
6. **Sheet name keywords expanded** — Added "general", "project", "deal", "option" categories.

### What improved

| Model | v3 | v3b | Δ | Assessment | Type |
|:------|---:|----:|--:|:-----------|:-----|
| cbaymod_051.xlsm | 51% | 83% | +32 | Needs Work | land_development |
| CustomHome_2024.xlsm | 68% | 91% | +23 | Ready | land_development |
| CP PROFORMA v8.23 (CP Op Agreement).xlsx | 78% | 100% | +22 | Ready | land_development |
| CP PROFORMA v8.23 (Phase 1 - CP Op Agreement).xlsx | 78% | 100% | +22 | Ready | land_development |
| CP PROFORMA v8.25 (Builders Cap Debt).xlsx | 78% | 100% | +22 | Ready | land_development |
| Weyyakin PROFORMA v3 (Blocks 8+10).xlsm | 63% | 85% | +22 | Needs Work | land_development |
| CHS PROFORMA v6.25 (EB5) w Ph2 08.16.2024  W 6.21 Finan | 78% | 99% | +21 | Ready | land_development |
| CP PROFORMA v6.23 (EB5) w Ph2 08.16.2024.xlsx | 78% | 99% | +21 | Ready | land_development |
| Fontana Workbook.xlsx | 24% | 39% | +15 | Low Coverage | unknown |
| Glendora Workbook.xlsx | 36% | 51% | +15 | Low Coverage | unknown |
| MPC_2023.xlsm | 74% | 84% | +10 | Needs Work | multifamily |
| STNL-Valuation_v2.4.xlsx | 64% | 74% | +10 | Needs Work | valuation |
| Land - 2022.xlsx | 44% | 53% | +9 | Low Coverage | land_development |
| PeoriaLakes MPC_2023.xlsm | 73% | 82% | +9 | Needs Work | multifamily |
| Peregrine Ranch LOT+HOME v3.0.xlsm | 79% | 87% | +8 | Needs Work | land_development |
| Land2024.xlsm | 41% | 44% | +3 | Low Coverage | land_development |
| Orion_Multifam.xlsm | 83% | 86% | +3 | Needs Work | multifamily |
| Brownstone Apartments - 3 year bridge refi and hold.xls | 98% | 99% | +1 | Ready | multifamily |

### Remaining gaps

1. **Fontana / Glendora Workbooks** — Single-sheet data files with enough columns to escape data-file detection. Need formula check to distinguish from models.
2. **Land-2022 / Land2024** — Low classification rates suggest non-standard layouts or wide data beyond scan limits.
3. **Orion_Multifam / STNL-Valuation** — Waterfall classified as "custom" (complex multi-sheet structures). Formula-level analysis needed.
4. **MPC / PeoriaLakes** — 24 sheets but only ~9 classified despite prefix stripping. Need deeper content-based classification.
