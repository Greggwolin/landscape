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
2. Direct Cap operating expenses filtered to the active statement (#LS-1123-01).
3. A saved `other_income` assumption is read back (#LS-1123-02).
4. A vacant unit counts at market rent in potential rent (decision 7a, #LS-1123-04).

## Year-1 figures

| Project | Line | Before | After |
|---|---|---:|---:|
| 17 Chadron Terrace | DCF potential rent | 2,696,514 | 2,996,286 |
| | DCF base expenses | 1,141,838 | 1,050,582 |
| | DCF NOI | 1,230,631 | 1,589,404 |
| | DCF present value | 18,476,275 | 24,237,547 |
| | Direct Cap NOI (in-place) | 1,321,887 | 1,589,404 |
| 42 Lynn Villa | DCF base expenses | 908,116 | 687,508 |
| | DCF NOI | 902,981 | 1,123,589 |
| | DCF present value | 26,289,399 | 32,678,488 |
| | Direct Cap expenses (all statements → active) | 2,950,748 | 908,116 |
| | Direct Cap NOI (in-place) | -646,249 | 1,115,241 |
| 54 Vincent Village | DCF base expenses | 298,545 | 248,276 |
| | DCF NOI | 414,358 | 464,627 |
| | DCF present value | 7,294,285 | 8,174,253 |
| | Direct Cap NOI (in-place) | 464,627 | 464,627 |
| 70 Torrance Courtyard | DCF potential rent | 1,019,232 | 1,070,744 |
| | DCF base expenses | 590,285 | 506,905 |
| | DCF NOI | 326,151 | 456,500 |
| | DCF present value | 5,753,267 | 8,035,050 |
| | Direct Cap NOI (in-place) | 387,354 | 435,776 |
| 106 The Peninsula Villas | DCF base expenses | 471,801 | 444,414 |
| | DCF NOI | 762,078 | 789,465 |
| | DCF present value | 11,738,053 | 12,158,352 |
| | Direct Cap NOI (in-place) | 800,694 | 800,694 |

## What still disagrees, and why

- **DCF vs Direct Cap (in-place) on 42, 70, 106.** The Direct Cap in-place tile uses
  the management fee printed on the statement where a row is literally named
  `management_fee`; the DCF always computes fee % × income. The gap on each project
  is exactly that difference (42: 8,348; 70: 20,724; 106: 11,229). On 17 and 54 no
  row carries that exact name, both use the computed fee, and the two tie to the cent.
- **Other entry points are untouched** and still disagree with both: the Landscaper
  cash-flow adapter (starts from market rent), the report calculator, and the what-if
  engine. Bringing them onto this base is Stage 1b.
- **Management lines removed from base expenses** include everything filed under the
  Management parent, not only the fee — e.g. Vincent Village "On-Site Management"
  23,000 and Torrance "management_offsite" 32,461. This is the rule the Direct Cap
  tile already applied; PR #331 brought the DCF into line with it. Whether an on-site
  manager's cost belongs in that bucket is an open question for Gregg.
- **Chadron Terrace other income.** The saved assumption is 0, so other income is
  still 0 after the read-back fix; the project record separately carries 61,513.
  Which figure the cash flow should use is an open question for Gregg.
