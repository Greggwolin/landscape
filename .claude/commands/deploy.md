# Deploy to Production

Run the full deploy workflow from the skill at `.claude/skills/deploy/SKILL.md`. Execute all steps autonomously without asking for confirmation at each step. Only stop if:

1. There are merge conflicts (show them, ask how to resolve)
2. A push is rejected (show the error)
3. A build fails (show the logs)

Otherwise, run straight through: pre-flight → merge to main → version bump + changelog → push → monitor Vercel + Railway → health-check → report results → return to feature branch.

**Do not prompt for confirmation between steps.** The user invoked `/deploy` which IS the confirmation.
