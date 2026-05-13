# Daily Sync — 2026-05-08

**Date**: Thursday, May 8, 2026
**Generated**: Nightly automated sync
**Branch**: `feature/project-home-redesign`

---

## Work Completed Today

### UI / Styling — Chat-First Shell Polish
- **Project home page rebuild** (`3649c1a9`, `d0c6140f`): `ProjectHomepage.tsx` rewritten (+530/−170 lines) to a Claude-style layout with tightened side padding. Major visual overhaul of the `/w/projects/[projectId]` landing surface.
- **Floating-card right rail (v1–v4)**: Four iterative styling passes on the right artifacts panel:
  - v1 (`57ad86d3`): Initial floating-card wrapper with 12px outer padding.
  - v2 (`622cf547`): Per-section cards (Project Documents / Pinned / Recent / Active Artifact), `--w-rail-padding`/`--w-rail-gap`/`--w-card-radius` tightened to 4/8/10px. `ArtifactWorkspacePanel.tsx` restructured (+184/−163 lines).
  - v3 (`2116dad9`): Hidden chat scrollbar gutter, anchored full-rail artifacts flush at top, bumped rail gap to 12px to match Claude spacing.
  - v4 (`b3274ddb`): Unified background surfaces to `var(--w-panel-bg, #1a1e28)` across rail cards, right panel, chat messages, assistant bubbles, and thread list. Used `--w-panel-bg` directly (not `--w-card-bg`) to avoid bleed into other CCard surfaces.

### Documentation
- Session log entry added for the v1–v4 floating-card rail work.

## Files Modified

```
src/components/wrapper/ProjectHomepage.tsx        | +534 / -174
src/components/wrapper/ArtifactWorkspacePanel.tsx | +184 / -163
src/components/wrapper/ProjectArtifactsPanel.tsx  | +108 / -79
src/app/w/layout.tsx                              | +129 / -91
src/styles/wrapper.css                            | +109 / -24
src/components/landscaper/ChatMessageBubble.tsx   | +2  / -1
src/components/landscaper/LandscaperChatThreaded.tsx | +4 / -2
src/components/landscaper/ThreadList.tsx           | +2 / -1
docs/daily-context/session-log.md                  | +16
```

## Git Commits

```
b3274ddb style(wrapper): unify rail + chat + threadlist surfaces to panel-bg (v4)
2116dad9 style(wrapper): hide chat scrollbar, anchor artifact header, Claude card gap (v3)
622cf547 style(wrapper): per-section cards + minimal rail padding (v2)
57ad86d3 style(wrapper): floating-card rail for right artifacts panel
d0c6140f style(wrapper): tighten side padding on project home page
3649c1a9 feat(wrapper): rebuild project home page — Claude-style layout
```

## Active To-Do / Carry-Forward

- [ ] `feature/project-home-redesign` branch not merged to `main`; PR not opened
- [ ] `feature/floating-card-rail` branch (if separate) not merged; PR not opened
- [ ] `LocationBriefArtifact` still uses hardcoded light palette (intentional anti-bleed per CLAUDE.md)
- [ ] Hover/active highlights in `ThreadList` still use `--cui-tertiary-bg` / `--cui-secondary-bg` — revisit if off-color
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll
- [ ] Scanned PDF / OCR pipeline remains unimplemented (alpha blocker)

## Alpha Readiness Impact

No alpha blocker movement today. Work was purely UI/styling polish on the chat-first `/w/` shell — improves visual quality of the target experience but doesn't gate any of the 15 alpha workflow steps.

## Notes for Next Session

- Today was a visual-polish day — project home page and right rail styling. All 6 commits are on `feature/project-home-redesign`. Consider merging to `main` once satisfied.
- The v4 background unification locked `--w-panel-bg` across multiple surfaces. If future theming work changes `--w-panel-bg`, verify it cascades correctly to chat bubbles, thread list, and rail cards.
- No backend or schema changes today. Django server state unchanged.
