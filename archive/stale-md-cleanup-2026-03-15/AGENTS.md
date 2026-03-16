# Landscape Platform — Codex Agent Instructions

## ⚠️ After Any Code Changes

Always restart servers after making code changes:

```bash
bash restart.sh
```

This restarts both the Next.js app and Django backend.

---

## Project Overview

Landscape is an AI-native real estate analytics platform. The codebase uses:

- **Frontend:** React / Next.js with TypeScript
- **Backend:** Django / Python
- **Database:** PostgreSQL on Neon (268+ tables in `landscape` schema)
- **Styling:** CoreUI 5.x
- **GIS:** MapLibre

---

## Before You Start Any Task

Read the full task prompt thoroughly, then ask clarifying questions before writing code. Do not assume.

---

## Styling Rules

Use CoreUI CSS variables — never hardcoded hex colors or Tailwind color utilities:

```css
/* Correct */
background: var(--cui-secondary-bg);
color: var(--cui-body-color);
border-color: var(--cui-border-color);

/* Incorrect */
background: #1e293b;
color: white;
```

**Never use:** `bg-slate-*`, `bg-gray-*`, `bg-zinc-*`, `text-slate-*`, `text-gray-*`, `dark:` variants, or hardcoded hex colors in Studio components.

---

## Backend Rules

- All new API endpoints go in Django. No new Next.js API routes.
- Financial calculations run in Python/Django (numpy-financial), not TypeScript.

---

## Database Rules

- All tables live in the `landscape` schema.
- Never modify migrations without explicit instruction.
- Always confirm migration number before and after changes.

---

## Git Hygiene

Commit frequently with descriptive messages:

```bash
git add -A
git commit -m "Description of what changed"
```

---

## Verification Pattern

After completing any task, verify with:

```bash
npm run build        # Confirm no TypeScript errors
bash restart.sh      # Restart servers
```

Then confirm the feature works as expected in the browser.

---

## Success Criteria Pattern

Every implementation task should self-check:

1. [ ] No TypeScript errors (`npm run build` passes)
2. [ ] No console errors in browser
3. [ ] API endpoints return expected data
4. [ ] CoreUI styling compliant (no hardcoded colors)
5. [ ] Servers restarted with `bash restart.sh`

---

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js pages and routes |
| `src/components/` | Shared React components |
| `backend/apps/` | Django apps |
| `backend/services/` | Business logic and calculation engines |
| `.claude/commands/` | Claude Code custom commands |
| `docs/` | Project documentation |
| `scripts/` | Utility scripts including `restart.sh` |
