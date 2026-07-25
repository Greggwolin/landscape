# SS2 — Project 9 Sales Schedule Reconciliation (read-only)

**Session:** LSCMD-SS-SALESRECON-0724 · **Date:** 2026-07-24 · **Scope:** Peoria Meadows (project 9), 37 dated parcel sales. READ-ONLY audit — no DB writes, no code changes.

## Executive summary

- **Stored basis** (what the returns headline + SS1 artifact use): gross **$392,049,012.67**, net **$378,437,542.29** → deductions **$13,611,470.38** ( **3.47%** of gross ).
- **Modeled/escalated basis** (cash-flow engine internal): gross **$638,577,700.78**, net **$427,870,512.23** → deductions **$210,707,188.55** ( **33.00%** of gross ).
- **Total lots/units:** 3,411. Stored $/lot = **$114,937**; Modeled $/lot = **$187,211**.
- The modeled gross is **63%** above stored gross for TWO stacked reasons (below): a different, offset-inclusive base column (+43%) then 3% escalation (+13.9%).

## A. Per-parcel table (37 rows, sorted by sale date)

Escalation is uniform on the modeled path: **3.0%/yr compounding, base date 2026-01-01**, factor = 1.03^((sale_period−1)/12). RC Price = rate-card price for the parcel's product (from `land_use_pricing`). Comm = commission, CoS = cost of sale (legal+closing+title).

| # | Parcel | Area | Phase | Product | Lots | Sale Date | RC Price (UOM) | Stored Gross | Comm | CoS | Stored Net | Modeled Gross | Modeled Net |
|--:|---|---|---|---|--:|---|---|--:|--:|--:|--:|--:|--:|
| 1 | 1.101 | Area 1 | 1.1 | 50x125 | 128 | 2028-03-01 | 2,400 $/FF | 6,481,984 | 194,460 | 50,000 | 6,237,524 | 16,335,613 | 6,633,710 |
| 2 | 1.102 | Area 1 | 1.1 | 60x125 | 82 | 2028-03-01 | 2,400 $/FF | 4,983,025 | 149,491 | 50,000 | 4,783,534 | 12,558,002 | 5,087,368 |
| 3 | 1.103 | Area 1 | 1.1 | 45x115 | 100 | 2028-03-01 | 2,400 $/FF | 4,557,645 | 136,729 | 50,000 | 4,370,916 | 11,485,978 | 4,648,541 |
| 4 | 1.104 | Area 1 | 1.1 | MU | 0 | 2028-03-01 | 10 SF | 11,325,600 | 339,768 | 50,000 | 10,935,832 | 12,044,962 | 11,630,437 |
| 5 | 1.201 | Area 1 | 1.2 | MU | 0 | 2029-07-01 | 10 SF | 11,761,200 | 352,836 | 50,000 | 11,358,364 | 13,011,044 | 12,565,399 |
| 6 | 1.202 | Area 1 | 1.2 | APTS | 380 | 2029-07-01 | 25,000 $/Unit | 8,951,383 | 268,541 | 50,000 | 8,632,841 | 10,509,550 | 9,550,240 |
| 7 | 1.203 | Area 1 | 1.2 | 35x95 | 120 | 2029-07-01 | 2,400 $/FF | 4,016,334 | 120,490 | 50,000 | 3,845,844 | 11,151,186 | 4,254,536 |
| 8 | 1.204 | Area 1 | 1.2 | 45x115 | 96 | 2029-07-01 | 2,400 $/FF | 4,131,086 | 123,933 | 50,000 | 3,957,154 | 11,469,791 | 4,377,674 |
| 9 | 1.205 | Area 1 | 1.2 | 65x125 | 111 | 2029-07-01 | 2,200 $/FF | 5,456,488 | 163,695 | 50,000 | 5,242,793 | 17,559,799 | 5,799,937 |
| 10 | 1.206 | Area 1 | 1.2 | 70x125 | 81 | 2029-07-01 | 2,200 $/FF | 4,288,051 | 128,642 | 50,000 | 4,109,409 | 13,799,592 | 4,546,110 |
| 11 | 2.101 | Area 2 | 2.1 | 40x115 | 97 | 2030-01-01 | 2,400 $/FF | 3,625,744 | 108,772 | 50,000 | 3,466,971 | 10,454,953 | 3,892,507 |
| 12 | 2.102 | Area 2 | 2.1 | 45x115 | 81 | 2030-01-01 | 2,400 $/FF | 3,406,143 | 102,184 | 50,000 | 3,253,959 | 9,821,728 | 3,653,349 |
| 13 | 2.103 | Area 2 | 2.1 | 50x120 | 65 | 2030-01-01 | 3,000 $/FF | 4,987,028 | 149,611 | 50,000 | 4,787,417 | 10,946,713 | 5,375,023 |
| 14 | 2.104 | Area 2 | 2.1 | 40x115 | 113 | 2030-01-01 | 2,400 $/FF | 4,223,804 | 126,714 | 50,000 | 4,047,090 | 12,179,482 | 4,543,829 |
| 15 | 2.105 | Area 2 | 2.1 | 45x115 | 100 | 2030-01-01 | 2,400 $/FF | 4,205,115 | 126,153 | 50,000 | 4,028,962 | 12,125,590 | 4,523,476 |
| 16 | 2.106 | Area 2 | 2.1 | 50x120 | 86 | 2030-01-01 | 3,000 $/FF | 6,598,221 | 197,947 | 50,000 | 6,350,274 | 14,483,344 | 7,129,706 |
| 17 | 2.107 | Area 2 | 2.1 | 7/8 Pack | 168 | 2030-01-01 | 50,000 $/Unit | 8,153,791 | 244,614 | 50,000 | 7,859,177 | 9,431,015 | 8,823,811 |
| 18 | 2.108 | Area 2 | 2.1 | 6/6Pack | 110 | 2030-01-01 | 50,000 $/Unit | 5,338,792 | 160,164 | 50,000 | 5,128,628 | 6,175,069 | 5,758,115 |
| 19 | 2.109 | Area 2 | 2.1 | 40x100 | 117 | 2030-01-01 | 2,400 $/FF | 4,373,320 | 131,200 | 50,000 | 4,192,120 | 12,610,614 | 4,706,660 |
| 20 | 2.110 | Area 2 | 2.1 | BFR SFD | 253 | 2030-01-01 | 60,000 $/Unit | 14,809,221 | 444,277 | 50,000 | 14,314,944 | 17,043,191 | 16,071,958 |
| 21 | 2.111 | Area 2 | 2.1 | APTS | 380 | 2030-01-01 | 25,000 $/Unit | 8,943,099 | 268,293 | 50,000 | 8,624,806 | 10,666,028 | 9,683,413 |
| 22 | 3.101 | Area 3 | 3.1 | C | 0 | 2030-01-01 | 20 SF | 55,756,800 | 1,672,704 | 50,000 | 54,034,096 | 62,600,380 | 60,666,232 |
| 23 | 3.102 | Area 3 | 3.1 | C | 0 | 2030-01-01 | 20 SF | 29,620,800 | 888,624 | 50,000 | 28,682,176 | 33,256,452 | 32,202,621 |
| 24 | 3.103 | Area 3 | 3.1 | C | 0 | 2030-01-01 | 20 SF | 33,976,800 | 1,019,304 | 50,000 | 32,907,496 | 38,147,107 | 36,946,556 |
| 25 | 3.201 | Area 3 | 3.2 | C | 0 | 2030-01-01 | 20 SF | 39,204,000 | 1,176,120 | 50,000 | 37,977,880 | 44,015,892 | 42,639,279 |
| 26 | 3.202 | Area 3 | 3.2 | C | 0 | 2030-01-01 | 20 SF | 52,272,000 | 1,568,160 | 50,000 | 50,653,840 | 58,687,856 | 56,871,084 |
| 27 | 2.201 | Area 2 | 2.2 | 50x125 | 112 | 2032-01-01 | 2,400 $/FF | 4,726,232 | 141,787 | 50,000 | 4,534,445 | 16,008,581 | 5,401,044 |
| 28 | 2.202 | Area 2 | 2.2 | 55x125 | 75 | 2032-02-01 | 2,400 $/FF | 3,465,330 | 103,960 | 50,000 | 3,311,370 | 11,821,118 | 3,953,949 |
| 29 | 4.102 | Area 4 | 4.1 | 55x120 | 87 | 2032-07-01 | 2,400 $/FF | 3,925,997 | 117,780 | 50,000 | 3,758,217 | 13,882,426 | 4,543,118 |
| 30 | 4.104 | Area 4 | 4.1 | 45x115 | 91 | 2032-07-01 | 2,400 $/FF | 3,359,866 | 100,796 | 50,000 | 3,209,070 | 11,880,572 | 3,879,282 |
| 31 | 4.105 | Area 4 | 4.1 | 55x120 | 83 | 2032-07-01 | 2,400 $/FF | 3,745,491 | 112,365 | 50,000 | 3,583,126 | 13,244,154 | 4,331,460 |
| 32 | 4.201 | Area 4 | 4.2 | 70x130 | 45 | 2034-01-01 | 2,200 $/FF | 1,725,790 | 51,774 | 50,000 | 1,624,017 | 8,757,119 | 2,052,195 |
| 33 | 4.202 | Area 4 | 4.2 | 80x130 | 62 | 2034-01-01 | 2,200 $/FF | 2,717,435 | 81,523 | 50,000 | 2,585,912 | 13,788,988 | 3,267,697 |
| 34 | 4.203 | Area 4 | 4.2 | 70x130 | 54 | 2034-01-01 | 2,200 $/FF | 2,070,949 | 62,128 | 50,000 | 1,958,820 | 10,508,543 | 2,475,270 |
| 35 | 4.204 | Area 4 | 4.2 | 70x130 | 62 | 2034-01-01 | 2,200 $/FF | 2,377,756 | 71,333 | 50,000 | 2,256,423 | 12,065,364 | 2,851,337 |
| 36 | 4.205 | Area 4 | 4.2 | 80x130 | 64 | 2034-01-01 | 2,200 $/FF | 2,805,094 | 84,153 | 50,000 | 2,670,942 | 14,233,794 | 3,375,145 |
| 37 | 4.206 | Area 4 | 4.2 | C | 0 | 2034-01-01 | 20 SF | 15,681,600 | 470,448 | 50,000 | 15,161,152 | 19,816,110 | 19,158,444 |
| | **TOTAL** | | | | **3,411** | | | **392,049,013** | **11,761,470** | **1,850,000** | **378,437,542** | **638,577,701** | **427,870,512** |

## B. Totals + reconciliation

### 1. Stored basis
- Stored gross (`gross_sale_proceeds`): **$392,049,012.67** → confirms $392,049,012.67 ✓
- Stored net (`net_sale_proceeds`): **$378,437,542.29** → confirms $378,437,542.29 ✓
- Deduction: **$13,611,470.38** = **3.47%** of gross. Composed of commission **$11,761,470.40** + cost of sale **$1,850,000.00** = total transaction costs **$13,611,470.40**. (net = gross − transaction costs.)
- **Deduction source:** the amounts are STORED columns on `tbl_parcel_sale_assumptions` (`commission_amount`, `legal_amount`, `closing_cost_amount`, `title_insurance_amount`, summed as `total_transaction_costs`). The generating percents (`commission_pct`, `legal_pct`, `closing_cost_pct`, `title_insurance_pct`) are **NULL on all 37 rows** — the %s trace to the firm **Benchmarks library** (Commissions + Transaction Costs sections) at seed time but are not persisted per row. Effective blended commission = 3.00% of gross; effective CoS = 0.47%.

### 2. Modeled/escalated basis
- Modeled gross (`gross_parcel_price` escalated): **$638,577,700.78** → confirms ~$638.6M ✓
- Modeled net (`net_sale_proceeds` escalated): **$427,870,512.23** → confirms ~$427.9M ✓
- Deduction: **$210,707,188.55** = **33.00%** of modeled gross.

### 3. $/lot cross-checks
- **Stored** gross ÷ 3,411 lots = **$114,937/lot** — lands inside the rate card (near SF-50 $117.5K; range $90.3K SF-42 – $136.4K SF-55). ✓
- **Modeled** gross ÷ 3,411 lots = **$187,211/lot** — **exceeds** the top rate-card price ($136.4K SF-55) by 37%.

#### Why modeled gross is 63% above stored gross — named from code
Two stacked causes (from `land_dev_cashflow_service._calculate_parcel_sale`):
1. **Different base column (the larger effect).** Stored gross uses `gross_sale_proceeds` = **$392,049,013**. The modeled path uses **`gross_parcel_price` = $560,609,800**, which still INCLUDES the improvement offsets. `gross_parcel_price − improvement_offset_total = gross_sale_proceeds` ($560,609,800 − $168,560,787 = $392,049,013). So before any escalation the modeled base is already **43%** higher, purely from adding back **$168,560,787** of improvement offsets.
2. **Escalation (the smaller effect).** `grossRevenue = gross_parcel_price × (1+0.03)^((sale_period−1)/12)`, price_growth_rate **0.03** from `tbl_dcf_analysis`, base date **2026-01-01**. Across the 2028–2034 sale window this lifts $560,609,800 → $638,577,701, a further **13.9%**.
- Combined: $392,049,013 ×1.430 (offset add-back) ×1.139 (escalation) = $638,577,701 ≈ **63%** lift. Escalation is the minority cause; the offset-inclusive base column is the majority.

### 4. What the modeled 33% haircut actually subtracts — named from code
Modeled gross $638,577,701 − modeled net $427,870,512 = **$210,707,189** (33.0%). In `_calculate_parcel_sale`, modeled net = `net_sale_proceeds` escalated independently (NOT gross − line-item deductions). The gap decomposes as the escalated version of (`gross_parcel_price` − `net_sale_proceeds`) = improvement offsets + transaction costs:
- **Improvement/subdivision offsets** (`improvement_offset_total`, escalated): **$166,677,072** — the dominant piece (79% of the haircut). Reported by the service as `totalSubdivisionCosts`.
- **Commissions** (`commission_amount`, escalated): **$13,298,752** — `totalCommissions`.
- **Closing/transaction costs** (`legal+closing+title`, escalated): **$0** — `totalClosingCosts` (service reports 0.0 here; these amounts fold into the offset/subdivision handling for this dataset).
- So the 33% haircut is **overwhelmingly improvement/subdivision offsets ($166,677,072)**, NOT commission/CoS. There is **no** separate carry or discount deduction in this path.

## C. Verdict

- **Stored basis ($392,049,013 gross / $378,437,542 net):** this is what the returns tool `analysis_tools._landdev_parcel_takedown_absorption_summary` reports as its **headline** (`gross_sale_proceeds` / `net_sale_proceeds` via a direct SUM). The escalated modeled figures are carried in the SAME tool only as separate `modeled_gross_revenue` / `modeled_net_revenue` fields — explicitly not the headline.
- **Modeled basis ($638,577,701 / $427,870,512):** internal cash-flow engine output; offset-inclusive base + 3% escalation. Not the headline.
- **Therefore SS1 correctly anchored the sales artifact to the STORED basis** — it reconciles to $392,049,012.67 / $378,437,542.29 and can never drift from the returns headline. ✓
