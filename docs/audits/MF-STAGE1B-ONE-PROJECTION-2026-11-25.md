# Apartment base, Stage 1b — one projection (2026-11-25)

Branch `fix/mf-one-projection-LS-1123-08`, stacked on `fix/mf-base-stage1-LS-1123-07`
(PR #346). Source: the five apartment projects on the live database, read 2026-11-25
through a read-only session (writes refused by the server). "Before" is `origin/main`
at `08406469`; "after" is this branch. Each figure is Year-1 NOI from calling the entry
point directly.

No ARGUS model was run. These are Landscape entry points against each other.

## Year-1 NOI by entry point

| Project | | Income screen (DCF) | Landscaper cash-flow answer | What-if tool | Report calculator |
|---|---|---:|---:|---:|---:|
| 17 Chadron Terrace | before | 1,230,631 | 3,136,660 | 1,419,850 | 1,510,654 |
| | after | 1,589,404 | 1,589,404 | 1,589,404 | 1,589,404 |
| 42 Lynn Villa | before | 902,981 | 1,243,540 | -2,950,748 | -908,116 |
| | after | 982,758 | 982,758 | 982,758 | 982,758 |
| 54 Vincent Village | before | 414,358 | 529,738 | 456,728 | 472,628 |
| | after | 441,627 | 441,627 | 441,627 | 441,627 |
| 70 Torrance Courtyard | before | 326,151 | 717,557 | 377,985 | -590,285 |
| | after | 456,500 | 456,500 | 456,500 | 456,500 |
| 106 The Peninsula Villas | before | 762,078 | 1,547,227 | 829,087 | -471,801 |
| | after | 789,465 | 789,465 | 789,465 | 789,465 |

## What changed

- `mf_rent_base.annual_operating_line` is the single statement of the operating
  arithmetic. `DCFCalculationService.operating_inputs()` returns its ten inputs.
- **DCF service** calls the line instead of its inline copy. Output on all five projects
  is byte-identical to the Stage 1a run (annual and monthly).
- **Landscaper cash-flow adapter** (`calculate_mf_cashflow`, the calculations
  endpoints): the operating side now comes from those inputs. Removed: market rent as
  the starting rent, an invented $5,500-a-unit expense estimate, hard-coded 2% credit
  loss / 3% fee / $300 reserves / 5% vacancy, and growth rates divided by 100 a second
  time (#LS-1123-03). Acquisition, hold, exit cap and debt are unchanged.
- **What-if engine** (income branch): rent and expenses from the DCF base; the line adds
  the credit loss, other income, management fee and reserves it was missing. Its present
  value now equals the DCF's to within a few cents (rounding).
- **Report calculator**, in-place scenario: income and expenses from the line. Expense
  lines are the active statement's without its fee, plus "Management Fee (computed)" and
  "Replacement Reserves". The caller-supplied vacancy rate (a hard-coded 3% at every
  call site) no longer applies to this scenario. The pro-forma scenario is untouched.

## Consequences worth knowing

- **Landscaper's return figures for apartments move, some sharply.** They were computed
  on invented operating numbers. Chadron Terrace unlevered IRR on the adapter: 6.3%
  before, -7.7% after — purchase price 47,500,000 against Year-1 NOI of 1,589,404 (a
  3.3% going-in yield) and a 6.54% exit cap. That is what the stored inputs say.
- **Report other income** now follows the analysis figure (decision 11c): Chadron's
  reports show 0 where they showed 61,513.
- **Not unified here:** the DCF monthly path (its renovation logic sits on the same base
  but is its own loop), `year1_noi_calculator`, the Operations page statement, and
  `loss_to_lease_calculator`. The pro-forma report scenario still uses its own basis.
