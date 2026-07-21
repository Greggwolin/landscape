# Demo Question Battery Runner

`run_battery.py` runs the Peoria Meadows demo-question battery against the production Landscaper thread/message API. It creates one fresh thread per question repetition, records the full assistant response and metadata, then archives every thread it created.

The source markdown says "Count: 48," but the actual A1-J6 tables contain 56 rows. `questions.yaml` preserves every source row rather than dropping valid IDs to match the stale count label.

Dry run is the default and makes zero API calls:

```bash
python scripts/battery/run_battery.py --project 9 --dry-run
```

Execution requires an explicit flag:

```bash
python scripts/battery/run_battery.py --project 9 --execute --reps 3 --reps-critical 5
python scripts/battery/run_battery.py --project 9 --execute --only A1,C1,C2
python scripts/battery/run_battery.py --project 9 --execute --family scenarios
```

## Configuration

Set these in the shell or in `.env.local`:

- `LANDSCAPE_API_URL`, `DJANGO_API_URL`, or `NEXT_PUBLIC_DJANGO_API_URL`: production Django API base URL.
- `BATTERY_USERNAME` and `BATTERY_PASSWORD`: preferred credentials for the dedicated battery user.
- `LANDSCAPE_USERNAME` and `LANDSCAPE_PASSWORD`: fallback credential names.
- `LANDSCAPE_ACCESS_TOKEN`: optional pre-issued JWT access token, used instead of username/password.

The runner intentionally does not default to localhost. If no API URL is configured, execution stops.

## Safety Defaults

- `--dry-run` is default-safe and does not construct the API client, authenticate, create threads, or send messages.
- Write-tagged questions are excluded unless `--allow-writes` is passed. Today that excludes J4.
- Runs are serial by default and sleep between turns. Use `--delay-seconds` to adjust the delay.
- Runs above `--confirm-threshold` turns require confirmation unless `--yes` is passed.
- Cleanup runs in `finally`, including on exceptions or Ctrl-C. Cleanup uses `DELETE /api/landscaper/threads/{thread_id}/`, which soft-archives the thread.

## Output

Each executed run writes:

- `scripts/battery/results/<timestamp>.json`: full, untruncated transcripts and metadata.
- `scripts/battery/results/<timestamp>.md`: human-readable summary table.

The Markdown summary includes a top section for questions whose repetitions disagree, plus per-question result bucket, pass rate, median latency, tools fired, and first reply line.

## Automatic Detection Scope

RED means an automatic failure signal fired: guard refusal, guard metadata, missing tool calls for a numbers question, non-2xx HTTP status, a soft-failure phrase near the top, or latency above 90 seconds.

YELLOW means latency above 30 seconds or disagreement across repetitions for the same question. GREEN only means no automatic failure signal fired. The runner does not grade whether an answer is useful, persuasive, or semantically correct.

## What This Does Not Cover

This runner is not a substitute for a browser pass on:

- Artifact rendering in the right panel.
- Table formatting, column clipping, or `$NaN`.
- The "No active thread - please try again" first-send bug. The runner creates threads explicitly, so it cannot reproduce frontend thread-selection failures.
- Perceived speed: streaming, progress labels, and when the first words land.
- Anything about how the experience feels to a guest.

Those remain a short manual browser pass. This runner covers the content questions where volume and intermittent server-side behavior matter.
