# Part 5: Cumulative Open Items Briefing — Instruction Set

> Append this section to the end of each daily log entry, after the standard Open Items section.

## How to Build It

1. Collect every "Open items" / "Open questions" entry from all prior daily log entries
2. Cross-reference each against "What changed," "Code changes," or "Completed" notes in subsequent entries
3. If an open item appears resolved by later work, exclude it
4. If an open item has no corresponding resolution, include it
5. When Gregg provides a Decision Log file from Claude Projects, reconcile those entries into the session log chronologically (use header: `Session [code] — [date] — Title (Claude Projects)`). Any "Open questions" from decision log entries that haven't been resolved become items in this briefing.

## Format

Append this block to the daily entry, after the standard `**Open items:**` section:

```markdown
**Cumulative Unfinished Business:**

🔴 Blocked (needs input or external action):
- [Item] — blocked on: [what's needed] — last touched: [date/session]

🟡 In Progress (started but incomplete):
- [Item] — status: [where it stands] — next step: [specific action] — last touched: [date/session]

🟠 Queued (designed/specified but not started):
- [Item] — artifact: [prompt or spec filename] — waiting for: [CC execution / Cowork session / other]

🔵 Verify (completed but unverified):
- [Item] — needs: [live test / DB check / build confirmation] — last touched: [date/session]
```

## Rules

1. **One line per item.** Scannable in 30 seconds.
2. **Name the next action.** Not "continue work on X" but "run schema migration for tbl_rental_comparable" or "execute CC_DMS_VERSION_CONTROL_XR2.md."
3. **Link to artifacts.** If a CC prompt, Cowork prompt, or spec exists, name the file.
4. **Flag stale items.** If untouched for 5+ days: note it. If 10+ days: `⚠️ stale`.
5. **Cap at ~20 items.** Prioritize: blocked > in-progress > recently queued. Drop completed items older than 3 days.
6. **Distinguish sources.** Items from Claude Projects decision logs: `(from Claude Projects, session [code])`. Cowork implementation items: no annotation.
7. **Don't repeat today's open items.** The standard Open Items section already covers today. This section is for everything PRIOR that's still unresolved.

## Decision Log Reconciliation

When Gregg provides a file named `DECISION_LOG_[dates].md`:

1. Read each session entry
2. Append to the session log in chronological position with header: `Session [code] — [date] — Title (Claude Projects)`
3. Extract unresolved "Open questions" into the cumulative briefing
4. Confirm to Gregg: "Reconciled [N] Claude Projects sessions. [M] new open items added to tracking."

## Triggers

- Every new session log entry gets a Part 5 block appended
- When Gregg says "what's open" or "where did we leave off" — generate a fresh briefing immediately
- If no new sessions occurred, still generate on request — the value is in surfacing stale items
