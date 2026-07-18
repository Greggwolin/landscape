# Cowork build prompt — the `design` shell (parallel to `studio`)

**Goal.** Add a third project shell called **`design`**, a visual restyle of the existing
`studio` shell, at route **`/design/[projectId]`**. It reuses every backend-coupled
component `studio` uses (chat, content router, screens, sidebar, providers) and changes
**only presentation**. `studio`, `/w/`, and classic `/projects/[id]` are untouched — this
is purely additive, exactly as `studio` was added beside classic.

Design reference for the look/feel + surface behaviors: the Cowork project
`Slice 1 Reference Design.dc.html` (every screen, drawn from this repo's source) and
`Artifact Kit.dc.html` (the panel-width artifact language). Behavioral rules that must
survive the restyle are in `INVARIANTS.md` and `HANDOFF.md` (both in the Cowork project).

---

## Build in two stages

**Stage A — restyle only (do this first, ship it).**
`design` mounts the *same* right-panel components as `studio` (`ProjectContentRouter`,
`CenterChatPanel`, `RightContentPanel`, `ArtifactWorkspacePanel`, the sidebar, the whole
provider stack). A new stylesheet `design.css`, loaded last, restyles the three zones to
the reference look (Nocturne-adjacent dark: one steel-blue accent, neutral dark surfaces,
8px radii, badges never pills, flush-left density). No component logic changes. This gives
a live, data-backed shell with near-zero backend risk. The routed screens still render as
today (full-page compositions) — that's expected for Stage A.

**Stage B — artifact-panel renderer (layer on later, incrementally).**
Swap the right panel's routed output for the panel-width **Artifact Kit** compositions
(K-primitives: KPI strip, table, chart/map frame, narrative, workbench-collapse, capital
stack ladder). One screen at a time, behind a per-screen flag, so Stage A keeps working
throughout. Do NOT block Stage A on this.

---

## Files to create (mirror `studio` exactly)

| New file | Clone of | Change |
| --- | --- | --- |
| `src/app/design/[projectId]/layout.tsx` | `src/app/studio/[projectId]/layout.tsx` | identical provider stack; import `design.css` last instead of `studio.css` |
| `src/app/design/[projectId]/page.tsx` | `src/app/studio/[projectId]/page.tsx` | render `<DesignShell/>` |
| `src/components/design/DesignShell.tsx` | `src/components/studio/StudioShell.tsx` | same logic; root class `design-shell`; renders `<DesignSidebar/>` |
| `src/components/design/DesignSidebar.tsx` | `src/components/studio/StudioSidebar.tsx` | same props/logic; restyled |
| `src/styles/design.css` | `src/styles/studio.css` (as a base) | the visual deltas |

**Critical:** `DesignShell` keeps `StudioShell`'s entire hook/logic body verbatim — the
project sourcing (`useProjectContext` + fallback fetch), `useFolderNavigation`,
`buildScreenManifest` → `availableScreens`, the `navigate_screen` / `navigate` command
subscriptions, `handleBeforeUserSend` (deterministic screen-router, JB37/JB43), `handleNewChat`
remount, the artifact-clear-on-nav effects, pop-out overlay, nav toast. Only JSX class
names / wrapper styling change. If you drift from that logic, chat-driven navigation and
artifact handling break.

The layout is a **top-level route** — it does NOT inherit `/w/`'s `WrapperLayout`, so it owns
its own `WrapperUIProvider` + `ProjectContextShell` + `WrapperChatProvider` +
`WrapperProjectProvider` + `ModalRegistryProvider` + `LandscapeCommandSubscriber`, same as
`studio`'s layout. Copy that composition exactly.

---

## Troubleshooting — first-build symptoms seen at `/design/9`

**Two top nav bars (an outer "landscape … Dashboard" header above the shell's own bar).**
Cause: the `design` route is inheriting a parent layout's chrome (the `/w/` `WrapperLayout`
header, or an app-level header layout). `design` must be a **top-level route that renders
NO outer header** — only `DesignShell`'s three zones. Fixes, in order:
1. Confirm `src/app/design/[projectId]/layout.tsx` is a clone of **studio's** layout (which
   renders only providers + `{children}`, no header/nav chrome) — NOT the `/w/` layout.
2. Ensure there is no `src/app/design/layout.tsx` (or a group layout) injecting a header.
   If a root layout adds global chrome, scope it away from `/design/*` the same way `/studio`
   is exempt.
3. The design shell's own top bar (project name · type chip · chat + · Close) is the ONLY
   top bar — it comes from `CenterChatPanel` / `RightContentPanel` headers, not a shell header.

**Nav menu looks broken / mis-styled.**
Cause: `design.css` re-maps `--cui-*` / `--w-*` tokens under `.design-shell`, but the sidebar
markup must actually be inside that scope AND still receive its `projectNav` folder tree.
Fixes:
1. Verify `DesignShell`'s root element has `className="design-shell"` and the sidebar renders
   INSIDE it (so the scoped token re-map applies). If the sidebar mounts outside `.design-shell`,
   it falls back to default `/w/` tokens and looks wrong.
2. `DesignSidebar` must pass the same `folders / currentFolder / currentTab / onSelectFolder /
   onSelectTab / onNewChat` props to the reused `WrapperSidebar` that `StudioSidebar` does —
   the folder tree is wired via the sidebar's `projectNav` prop. A blank/duplicated nav means
   that prop isn't being forwarded.
3. The sidebar-item selectors in `design.css` (`.sb-item`, `.sb-nav-item`) are best-effort — if
   the real WrapperSidebar uses different class names at HEAD, adjust those rules to the actual
   classes (inspect the DOM). This is cosmetic only; it won't cause the duplicate-bar bug.

---

## What Cowork can't do — hand to Claude Code
- Verify every `@/...` import resolves at the current HEAD (paths may have drifted from the
  refs this prompt was written against). Nothing new is imported except the two `design/*`
  components + `design.css`.
- Run the dev server, open `/design/<a real project id>`, confirm it loads live threads, the
  live folder tree, and routed screens exactly like `/studio/<same id>` — in the restyled shell.
- Optional: add a shell switcher (studio ↔ design) once both are healthy.

---

## Surface map (what each screen is, for Stage B compositions)
Authoritative studio folder tree + the non-folder surfaces are enumerated in `HANDOFF.md`
("Authoritative studio screen map"). Every frame in `Slice 1 Reference Design.dc.html`
is keyed to one of them:
- **Platform**: A1 map home · A2 platform intelligence · A3 projects · A5 dashboard · A6 tools · A7 help · A8 Landscaper AI · A9 profile
- **Project folders**: C1 home (+C1-S settings overlay, C1-K contacts card) · C2 property (land parcels; MF: details/floor-plans/rent-roll/renovation/operations) · C3/C4 market · C5 costs · C6 revenue · C7 capitalization (debt/equity/waterfall) · C8 reports · C9 documents · C-MAP map · C10 sales comparison · C11 income approach · C12 cash flow · C13 cost approach · C14 reconciliation
- **Standalone**: IC investment committee
- **Admin** (`/w/admin`): Preferences (unit cost categories · taxonomy · UOM · picklists · canonical styles) · Benchmarks (growth rates · transaction costs · commissions · contingency standards) · Cost Library · DMS Admin · Users

## Non-negotiable invariants (reuse components; see INVARIANTS.md for the full list)
- **FloorPlanMatrix**: editable only when there are no active/MTM leases; read-only ("From Rent Roll") when there are. Never unconditionally editable.
- **PhysicalDescription**: 42 fields / 6 sections, click-to-edit inline, ★ ratings, acres↔SF auto-convert, provenance locks.
- **Renovation/ValueAdd**: present only when value-add enabled; derived figures not editable; feeds Operations Post-Reno column.
- **ProjectLandUseLabels**: project-scoped, re-terms Area/Phase/Parcel everywhere.
- **ProjectDates**: `analysis_start_date` = T0 for all period math.
- General: everything is ingested (no "file only"); waterfall assumptions come from the project (no platform defaults); tabular inputs edit in place with no cell box; growth-rate fields = admin picklist + manual entry; dirty-state Save buttons; badges never pills.

## Visual language (design.css)
One steel-blue accent on neutral dark surfaces; 8px radii; badges (rounded-rect) never pills;
flush-left, dense; editable fields = accent-bordered chip (dashed underline for picklists),
derived values plain; provenance tags (read/derived/assumed/comp/benchmark/engineer-bid/
library-default). The reference file paints its own inline dark tokens — lift those values
into `design.css` variables. Bound design systems for the repo are Modernist + Nocturne;
the design shell is Nocturne-adjacent.
