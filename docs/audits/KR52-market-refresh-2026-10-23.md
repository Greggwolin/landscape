# Daily market refresh: October 21 failure and schedule delay

Items: LS-1021-13, LS-0930-01, LS-0929-10.
Session: LSCMD-KR52-CODEX-BATCH-1022. Read-only investigation on 2026-10-23.

The October 21 run failed because 11 of 31 geographies failed. Ten geography
summaries report exhausted retries with `JSONDecodeError`; the final US geography
reports `connection already closed`. The command raised `CommandError: 11 of 31
geographies failed` and exited 1. The error occurred in Refresh, after dependency
installation and credential validation; it was not a missing repository secret.

Evidence: [October 21 run 39649561046](https://github.com/Greggwolin/landscape/actions/runs/39649561046).
Its log includes FRED fetch failures with `JSONDecodeError`, including US series
MSPNHSUS and PAYEMS. This establishes invalid/non-JSON responses at the JSON parser,
not the HTTP response's body or upstream reason: those are not captured. Do not
claim an API outage, rate limit, or invalid key from these logs alone. The final
closed-connection error is also recorded; no live rerun was used to diagnose it.
The summary step still ran, reporting 26,538 rows before and after; that does not
turn the preceding Refresh failure into a successful refresh.

The scheduled slot was 13:15 UTC (06:15 Phoenix). GitHub's run list shows:

| Run | UTC start | Delay from scheduled slot | Result |
|---|---|---|---|
| October 17 | 16:27:44 | 3h 12m | success |
| October 18 | 16:34:03 | 3h 19m | success |
| October 19 | 19:20:55 | 6h 05m | success |
| October 20 | 17:59:42 | 4h 44m | success |
| October 21 | 18:05:21 | 4h 50m | failure |
| October 22 | 18:00:27 | 4h 45m | failure |

`createdAt` and `startedAt` are equal for these workflow runs. This is evidence
that the workflow was created late, not evidence of hours spent queued inside its
Refresh job. It does not identify the scheduler's internal cause. Three consecutive
successful scheduled starts are recorded above, meeting the original watch item.

Move the slot to **13:47 UTC / 06:47 Phoenix**, preserving the monthly exclusion on
the 16th, manual dispatch, and the shared `market-refresh` concurrency group. Remove
the obsolete monthly-workflow push-trigger comment. The schedule change is an
experiment to avoid the old minute, not a guarantee against GitHub delays. After
Gregg merges, compare the next three scheduled start times to 13:47 UTC. Do not run
`workflow_dispatch` as a test: it would write to the live database and would not
test scheduled delivery.

Validation: `npm run test:unit -- --runInBand --runTestsByPath src/__tests__/market-daily-schedule.test.ts`.
The old workflow fails both tests; the new one passes both. These check the actual
scheduled expression, monthly exclusion, manual dispatch, concurrency, and stale
comment removal. No provider calls, data writes, or production reruns were made.
