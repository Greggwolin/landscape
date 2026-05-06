# Project Instructions — Reference Templates

> **Purpose.** Long-form templates and example blocks extracted from `PROJECT_INSTRUCTIONS.md` to keep the canonical rules file lean. The behavioral rules in PROJECT_INSTRUCTIONS.md still govern when each template fires; the literal template bodies live here.
>
> **Read pattern.** Referenced by section number from PROJECT_INSTRUCTIONS.md. Read on demand when drafting the deliverable that fires the template.

---

## §4.1 — ⚠️ BEFORE YOU START Template

*Origin: PROJECT_INSTRUCTIONS.md §4.1. Required header on every CC/Codex prompt, immediately after the title.*

```markdown
---
## ⚠️ BEFORE YOU START
Read this entire prompt thoroughly, then ask any clarifying questions before writing code.

⚠️ DO NOT process, import, or write any data to the database during verification steps.
Verification is read-only. Confirm pipeline routing by tracing code paths only — do not
upload test files or trigger extraction runs.

If anything is unclear about:
- [List 4-6 specific areas relevant to the task]
- File structure or naming conventions
- How this integrates with existing code
...ask first. Do not assume.
---
```

---

## §4.2 — SERVER RESTART Footer Template

*Origin: PROJECT_INSTRUCTIONS.md §4.2. Required footer when the prompt requires a server restart.*

```markdown
---
## SERVER RESTART
After completing this task, restart the servers:
\`\`\`bash
bash restart.sh
\`\`\`
This restarts both the Next.js app and Django backend.
```

---

## §4.4 — Verification Block Example

*Origin: PROJECT_INSTRUCTIONS.md §4.4. Example of explicit verification commands required in every prompt.*

```bash
# Example verification block
cat src/components/NewComponent.tsx | head -50
npm run build  # Confirm no TypeScript errors
curl http://localhost:3000/api/test-endpoint
```

---

## §4.5 — Success Criteria Pattern Example

*Origin: PROJECT_INSTRUCTIONS.md §4.5. Numbered checkpoint template for the SUCCESS CRITERIA section.*

```markdown
## SUCCESS CRITERIA
All must pass:
1. [ ] Component renders without console errors
2. [ ] API endpoint returns expected data
3. [ ] No TypeScript warnings
4. [ ] Existing tests still pass
5. [ ] Downstream features verified (see DOWNSTREAM IMPACT section)
```

---

## §9.4.1 — Handoff Format Template

*Origin: PROJECT_INSTRUCTIONS.md §9.4.1. Full markdown template for the context handoff document generated at ~80% chat capacity.*

```markdown
# CONTEXT HANDOFF FOR NEW CHAT

**Date:** [today]
**Session IDs:** [list all relevant session codes]
**Branch:** [current working branch]

## Current Project
[specific app/feature being built]

## Status
[exactly where we left off]

## Completed This Session
1. [task with commit ref]
2. [task with commit ref]

## Pending Tasks
1. [priority 1 task]
2. [priority 2 task]

## Next Steps
1. [specific immediate action]
2. [specific immediate action]

## Key Files Referenced
- [filename] — [purpose]
- [filename] — [purpose]

## Critical Context
[essential background from project knowledge]

## Database State
- Migrations: [last migration number]
- Tables: [count if changed]

## For New Chat
Start with: "[exact continuation prompt]"

## File References for Upload
- [list files to upload to new chat if needed]
```

---

## §17.4 — DOWNSTREAM IMPACT Example Block

*Origin: PROJECT_INSTRUCTIONS.md §17.4. Example DOWNSTREAM IMPACT section illustrating files / consumers / verification structure required in every implementation or fix/debug CC prompt.*

```markdown
## DOWNSTREAM IMPACT
**Files being modified:**
- `backend/apps/financial/views.py` — budget rollup endpoint

**Known consumers:**
- `src/components/budget/BudgetGridTab.tsx` — renders rollup totals
- `src/hooks/useBudgetSummary.ts` — SWR hook consuming this endpoint
- `backend/apps/landscaper/tools/budget_tools.py` — Landscaper reads rollup
- `services/financial_engine_py/cash_flow.py` — cash flow pulls budget data

**Post-change verification:**
1. Budget grid renders correct totals for Peoria Lakes
2. Cash flow analysis produces same output as before change
3. Landscaper can answer "what's the total budget?" correctly
4. `npm run build` passes with no type errors
```
