# Apartment base, Stage 1a — before / after (2026-11-23)

Branch `fix/mf-base-stage1-LS-1123-07`. Source: the five apartment projects on the
live database, read 2026-11-23 through a read-only session (writes refused by the
server). "Before" is `origin/main` at `08406469`; "after" is this branch. Both were
run by calling the services directly: `DCFCalculationService.calculate()`,
`.calculate_monthly()`, and `_get_income_approach_data()` (Direct Cap).
Re-run: `/tmp/lswork/h/run.py <backend path> <out.json>` in the session that made
this change (script reproduced in the PR description).

No ARGUS model was run. These are Landscape-before against Landscape-after.

## What changed

1. Management fee counted once in the DCF, and recomputed in the terminal year
   (PR #331 merged in: #LS-1021-01, #LS-1021-02).
2. **Only the management FEE line is replaced by the computed fee** (decision 10a,
   Gregg 2026-11-23). Other costs filed under Management — on-site manager, payroll,
   administrative — stay as expenses. A line is the fee when its name says
   "management fee" in any spelling, or off-site management.
3. Direct Cap operating expenses filtered to the active statement (#LS-1123-01).
4. A saved `other_income` assumption is read back (#LS-1123-02).
5. A vacant unit counts at market rent in potential rent (decision 7a, #LS-1123-04).

"After" below is commit with decision 10a applied (second run, 2026-11-23).

## Year-1 figures

| Project | Line | Before | After |
|---|---|---:|---:|
| 17 Chadron Terrace | DCF potential rent | 2,696,514 | 2,996,286 |
| | DCF base expenses | 1,141,838 | 1,050,582 |
| | DCF NOI | 1,230,631 | 1,589,404 |
| | DCF present value | 18,476,275 | 24,237,547 |
| | Direct Cap NOI (in-place) | 1,321,887 | 1,580,845 |
| 42 Lynn Villa | DCF base expenses | 908,116 | 828,339 |
| | DCF NOI | 902,981 | 982,758 |
| | DCF present value | 26,289,399 | 28,599,843 |
| | Direct Cap expenses (all statements → active) | 2,950,748 | 908,116 |
| | Direct Cap NOI (in-place) | -646,249 | 974,410 |
| 54 Vincent Village | DCF base expenses | 298,545 | 271,276 |
| | DCF NOI | 414,358 | 441,627 |
| | DCF present value | 7,294,285 | 7,771,634 |
| | Direct Cap NOI (in-place) | 464,627 | 436,778 |
| 70 Torrance Courtyard | DCF potential rent | 1,019,232 | 1,070,744 |
| | DCF base expenses | 590,285 | 506,905 |
| | DCF NOI | 326,151 | 456,500 |
| | DCF present value | 5,753,267 | 8,035,050 |
| | Direct Cap NOI (in-place) | 387,354 | 403,315 |
| 106 The Peninsula Villas | DCF base expenses | 471,801 | 444,414 |
| | DCF NOI | 762,078 | 789,465 |
| | DCF present value | 11,738,053 | 12,158,352 |
| | Direct Cap NOI (in-place) | 800,694 | 800,694 |

## What still disagrees, and why

- **DCF vs Direct Cap (in-place), all five.** By design the Direct Cap in-place tile
  uses the fee printed on the statement and the DCF computes fee % × income. Both now
  remove the same fee lines from base expenses, so the gap on every project is exactly
  statement fee minus computed fee: 17: 8,559 · 42: 8,348 · 54: 4,849 · 70: 53,185 ·
  106: -11,229. The Direct Cap market tile (computed fee) ties to the DCF wherever
  in-place and market rent are the same basis.
- **Torrance carries two fee-type lines** (`management_fee` 50,919 and
  `management_offsite` 32,461). Both are treated as the fee; together they are 8.3% of
  income, which is high for a single fee. If the off-site line is something else, the
  statement needs relabelling — the rule goes by name.
- **Other entry points are untouched** and still disagree with both: the Landscaper
  cash-flow adapter (starts from market rent), the report calculator, and the what-if
  engine. Bringing them onto this base is Stage 1b.
- **Chadron Terrace other income.** The saved assumption is 0, so other income is
  still 0 after the read-back fix; the project record separately carries 61,513.
  Which figure the cash flow should use is an open question for Gregg.
