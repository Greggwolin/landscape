# Deploy to Production

Run the full deploy workflow from the skill at `.claude/skills/deploy/SKILL.md`. Execute all steps autonomously without asking for confirmation at each step. Only stop if:

1. There are merge conflicts (show them, ask how to resolve)
2. A push is rejected (show the error)
3. A build fails (show the logs)
4. A git index.lock can't be removed (tell user to delete from host)

Otherwise, run straight through: pre-flight → auto-commit dirty files → merge main into branch → merge branch into main → version bump + changelog (skip if pre-existing) → push → monitor Vercel + Railway → health-check → create next working branch → cleanup stale branches → report results.

**Do not prompt for confirmation between steps.** The user invoked `/deploy` which IS the confirmation.

**Branch naming:** After deploy, create the next working branch using the pattern `alpha<NN>` where NN is the next version number (e.g., after deploying v0.1.05, create `alpha06`).
