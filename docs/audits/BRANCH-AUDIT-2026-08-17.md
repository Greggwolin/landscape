# Branch, Worktree, Stash & PR Audit — 2026-08-17 (run 2026-08-18)

Session: `LSCMD-BA-BRANCHAUDIT-0817-BA7`
Read-only. No commits, merges, checkouts, deletes, or stash operations were performed.
Run from `/Users/5150east/landscape` (primary checkout, on `feature/plan-geometry`, dirty —
another session's live work; never touched, only read via explicit refs).

`git fetch --all --prune` was run first, as instructed. It hit two stale 0-byte lock files
(`refs/remotes/origin/feat/budget-artifact-slice1.lock`, then `packed-refs.lock`), both
timestamped today, held by no live git process (verified via `ps`/`lsof` before removing) —
the same recurring VM-mount lock pattern noted previously. Removed both, re-ran, succeeded.
**The only ref that moved:** `origin/feat/budget-artifact-slice1` was deleted server-side
(PR #241 merged and GitHub's post-merge cleanup removed it). No other remote ref changed.

---

## Table-claim reconciliation (the prior sandbox's picture, checked line by line)

| Branch | Claimed | Verified |
|---|---|---|
| `main` | at `ff2d019f` | **Correction:** `ff2d019f` is `origin/main`. The **local** `main` ref (checked out in `landscape-wt-cashflow`) is `aa2bb92c`, four commits behind `origin/main` (missing #244, #245/PD15, #246/PD28, #241). Not lost work — just a stale local ref, `git pull` fixes it — but the table conflated remote and local. |
| `feat/budget-artifact-slice1` | 12 ahead/1 behind, content identical to main, merged via #241 | **Confirmed.** `git diff origin/main..feat/budget-artifact-slice1` is empty. `gh pr list` shows #241 MERGED 2026-08-18. |
| `fix/assumption-sourcing-0813` | 1 ahead/2 behind, `fcd42fd5` landed as `b5c906a6` | **Confirmed.** Commit body of `fcd42fd5` (PD28) is byte-identical to `b5c906a6` (#246, MERGED). |
| `feature/plan-geometry` | 26 ahead/1 behind, live today, PR #247 | **Confirmed live.** Local and `origin/feature/plan-geometry` are in sync (no divergence either direction) — the session actively pushing it is keeping the remote current. PR #247 is OPEN, checks mostly green (see §D — one check fails). |
| `chore/ci-gate-stacked-prs` | 11 ahead/7 behind, real unmerged infra work, idle since 08-13 | **Confirmed real and unmerged**, but "idle since 08-13" only describes the local branch tip. **Local and its own `origin/chore/ci-gate-stacked-prs` have diverged**: local carries 3 commits (nightly docs 08-11/12/13) origin lacks; origin carries 2 commits (`e9a55985` "resolve paths from the repo, not a hardcoded home folder", `1c541c42` "record legacy-peer-deps=true") the local branch lacks. Something pushed directly to the remote branch after the local tip stopped advancing. See detailed breakdown below. |
| `chore/nightly-committer-branch-guard` | 1 ahead/7 behind, idle since 07-30 | **Confirmed**, in sync with its own origin. |
| `audit/sales-basis-comparison` | 1 ahead/14 behind, idle since 07-28 | **Confirmed**, in sync with its own origin. No PR was ever opened for it (`gh pr list --search head:audit/sales-basis-comparison` → empty). |
| `feature/design-shell` | 3 ahead/83 behind, idle since 07-18 | **Confirmed counts**, but "idle" undersells it — see below. Two of its three commits are already landed (PR #170, #171, both MERGED); the third carries real unlanded work (new component + vendored reference assets) not on main anywhere. |
| `feature/map-sales-match-market` | 2 ahead/117 behind, idle since 07-09 | **Correction — this one's content is already on main.** `git diff` of the branch's two commits against the corresponding merge-base is line-for-line identical to main commit `11e11891`, whose own message reads *"squash of feature/map-sales-match-market."* The branch is fully superseded by content. **But PR #145 (its own PR) is still OPEN** on GitHub. Local record says landed; server record says open. Flagged, not resolved — see §D. |

---

## A. Per-branch detail

### `chore/ci-gate-stacked-prs` (most attention, per instructions)

11 commits ahead of `origin/main`, split cleanly by true diff-from-merge-base
(`b89c8c9e`, 2026-07-30) into four distinct pieces of work:

1. **CI gate fix** (`cfd10a4c`, `.github/workflows/preview.yml` + `cleanup.yml`, ~37 lines).
   Removes the `branches: [main, work]` filter on the PR trigger. That filter matches the PR's
   *base* branch, so a stacked PR (opened against another feature branch, not `main`) ran no
   backend tests, no build, no migrations — only Vercel's checks fired, so the PR page looked
   green while saying nothing about whether the code compiled. This already caused a real miss:
   on 2026-07-30, three stacked PRs (#236→#237→#238) sat open with every backend gate silently
   skipped, and a TypeScript compile failure reached one of them undetected. `cleanup.yml` is
   touched too, deliberately: gating every PR means every stacked PR now provisions a Neon
   preview database branch, and `cleanup.yml` carried the same filter, so without this fix none
   of those branches would ever be torn down.
   **Still needed**: verified the base-branch filter is still present, unchanged, on current
   `origin/main`'s copy of both workflow files. The gap this closes is still open today.
   **Still applies cleanly**: PR #241 (merged today) touched a different section of
   `preview.yml` (line ~137, the test command) than this commit touches (line ~12, the trigger
   filter) — confirmed via `git diff`, no textual overlap.

2. **Nightly-committer lock fix** (`c5913fb9`, `scripts/nightly/commit-generated-docs.sh`,
   +51 lines). Fixes the sandbox's nightly doc-committer leaving a `.git/index.lock` that only
   the host can clear (the sandbox mount permits creating files under `.git/` but denies
   unlink), which silently ate eight consecutive nightly runs (07-31 → 08-07) before anyone
   noticed. Adds a pre-flight unlink-capability probe plus self-healing stale-lock removal.
   **Still needed**: `scripts/nightly/commit-generated-docs.sh` is untouched on `origin/main`
   since the merge-base — the underlying bug is still unfixed there. (Note: this session hit
   the *exact* failure mode this commit fixes — twice — clearing the audit's own `git fetch`.)
   **Does not conflict** with `chore/nightly-committer-branch-guard`'s separate fix to the same
   script (see below) — `git merge-tree` auto-merges both into the file with no conflict
   markers.

3. **Dead worktree gitlink cleanup** (`1ac215db`, 11 files, `.claude/worktrees/*` git-submodule
   entries removed). All 11 still exist in `origin/main`'s tree today — the cleanup is still
   valid and still un-landed.

4. **Nightly health-check docs** (8 commits, `docs: nightly health check 2026-08-0{6,8,9,10,11,
   12,13}` — one date appears twice), generating 14 files under
   `docs/09_session_notes/*-daily-sync.md`. Auto-generated noise, not reviewed content.

**Landed or not**: Not landed. `git diff origin/main..chore/ci-gate-stacked-prs` is non-empty
and PR #239 (opened 2026-07-30, still OPEN) has never merged. Relied on true content diff,
corroborated by the PR record — the two agree here.

**Lost if deleted**: The CI gate fix (a real, currently-open backend-testing hole on stacked
PRs), the nightly-lock self-heal, and the dead-gitlink cleanup — none exist anywhere else.
The 14 doc files are regenerable noise.

**Still relevant**: Yes, all three substantive pieces. Nothing on `origin/main` has since
fixed any of the three problems they address.

**Recommendation**: The three substantive commits (CI gate, nightly-lock, gitlink cleanup) are
independent of each other and of the doc-noise commits, and none conflicts with the other two
open infra branches. Land the substance; the interleaved nightly-doc commits do not need to
come along and would need to be dropped or squashed out first. That's a judgment call about how
to split a branch, not one this pass is making — flagging it as landable, not landing it.

### `chore/nightly-committer-branch-guard`

One commit (`6f574452`, 2026-07-30), +39 lines to
`scripts/nightly/commit-generated-docs.sh`: makes the nightly doc-committer refuse to commit
generated docs onto anything but the main line, so a nightly run that happens to fire while a
feature branch is checked out doesn't silently attach its docs to that branch.

**Landed or not**: Not landed. Non-empty diff vs `origin/main`; PR #235 (opened 07-30) still
OPEN.

**Lost if deleted**: The only guard against nightly docs landing on the wrong branch. Real,
narrow, unclaimed elsewhere.

**Still relevant**: Yes — `scripts/nightly/commit-generated-docs.sh` is unchanged on
`origin/main` since this branch's merge-base, so the gap is still open. Note it modifies the
same script as `chore/ci-gate-stacked-prs`'s lock fix; the two were checked for a textual
conflict (`git merge-tree`) and merge cleanly — they touch different concerns in the file.

**Recommendation**: Land — small, self-contained, unconflicted, addresses a real observed
failure mode (same family as this very audit's lock encounters).

### `audit/sales-basis-comparison`

One commit (`9a33cdb1`, 2026-07-28), a single new doc,
`docs/audits/CB11-sales-basis-audit.md` (42 lines). No code change. It's a write-up concluding
the stored sales basis is correct and that a since-referenced CB9 recalculation path drops an
offset escalation.

**Landed or not**: Not landed (as this exact file) — `origin/main` has no
`docs/audits/CB11-sales-basis-audit.md`. No PR was ever opened for this branch.

**Lost if deleted**: The write-up itself — a finding, not a fix. If the finding it describes
was independently acted on elsewhere, the doc would still be the only record of the reasoning.

**Still relevant**: Not independently checked whether the CB9 recalc bug it describes has since
been fixed on main — that would mean reading the CB9 code path, out of scope for this pass. Flag
this as **undetermined**, not resolved (see §E).

**Recommendation**: Land the doc (cheap, zero conflict risk, it's a record) or at minimum copy
its content into a durable location before the branch is ever deleted — right now it exists in
exactly one place.

### `feature/design-shell`

Three commits (`62343650`, `0c1ba7ef`, `d24f672a`, 2026-07-18) since merge-base `de80f4ee`
(the DG1 shell, PR #170, merged 07-17).

- `62343650` "fix(design): exempt /design from legacy chrome + dark-only theme; token
  punch-up" — **content-identical** to what merged as PR #171 / commit `aae2f170` (DG2,
  07-17). Verified by diffing both commits against the same five touched files: same added/
  removed lines, only blob-hash and line-offset differences from unrelated surrounding drift.
  **This part is landed**, under a different hash.
- `0c1ba7ef` "wip(design): park in-progress design-shell styling" — adds
  `src/components/design/DesignProjectHome.tsx`, a new 438-line component. **Confirmed absent**
  from `origin/main` (`git ls-tree` returns nothing). Real, unlanded, unique.
- `d24f672a` "chore(design): park design-session reference assets under reference/" — adds
  `reference/design-shell/` (8 files: prompts, handoff notes, a 6,511-line vendored `.dc.html`
  export, support JS). **Confirmed absent** from `origin/main`. This matches the earlier memory
  note that DG3 (a reference-file token swap) is still pending.

**Landed or not**: Mixed — one of three commits landed (differently-hashed), two did not.
Relied on true content diff for the landed determination (no PR exists for this branch itself,
since it was never opened — #170/#171 were opened from a since-deleted branch, not this one).

**Lost if deleted**: `DesignProjectHome.tsx` (438 lines, no copy elsewhere) and the entire
`reference/design-shell/` vendored asset set (would have to be re-exported from the original
design session if lost — not reproducible from current `origin/main` state).

**Still relevant**: The chrome/dark-only fix, no — already shipped via #171, this copy is
redundant. The parked component and reference assets — undetermined without reading whether
the DG3 token-swap work still has a use for them; flagged, not decided (§E).

**Recommendation**: Do not delete outright — it would silently discard the only copy of
`DesignProjectHome.tsx` and the reference assets. Rework: drop the now-redundant first commit,
decide whether the component and reference assets still serve DG3, then land or discard that
decision explicitly.

### `feature/map-sales-match-market`

Two commits (`e422adb8`, `3217b0c1`, 2026-07-06/07-09) since merge-base `cbd3e18c` (06-29).
Adds a Maricopa County sales importer (`backend/tools/market_ingest/maricopa_sales.py` +
matching Django management command) and wires the map's sales layer to match the Market
screen's live/stale distinction.

**Landed or not**: **Landed**, by content — but PR #145 is still open on the server. Verified
by diffing the branch's unique changes against `origin/main` commit `11e11891` ("squash of
feature/map-sales-match-market"): line-for-line identical, only blob-hash/line-number diff
noise. Both `backend/tools/market_ingest/maricopa_sales.py` and the matching management command
already exist on `origin/main` today. This is a **disagreement between the local content
record and the server's PR-state record** — local says done, GitHub says PR #145 is still
open. Not resolved here; see §D.

**Lost if deleted**: Nothing — content is on `origin/main`.

**Still relevant**: The branch itself, no (superseded). The open PR #145 is a separate loose
end (see §D) independent of whether the branch/local ref is kept.

**Recommendation**: The local branch and its worktree are safe to reclaim by content. PR #145
still needs a human decision (close as superseded, or verify GitHub disagrees for a reason not
visible locally) before anyone acts on "delete."

---

## B. The four worktrees

| Worktree | Branch | HEAD |
|---|---|---|
| `/Users/5150east/landscape` | `feature/plan-geometry` | `081a74c6` |
| `landscape-wt-budget` | `feat/budget-artifact-slice1` | `1a9f7985` |
| `landscape-wt-cashflow` | `main` | `aa2bb92c` |
| `landscape-wt-pd28` | `fix/assumption-sourcing-0813` | `fcd42fd5` |

### `/Users/5150east/landscape` (primary — LIVE, another session's)

```
 M CLAUDE.md
 M backend/apps/knowledge/services/plan_geometry/lot_match.py
 M backend/apps/knowledge/services/plan_geometry/parcel_rollup.py
 M backend/apps/knowledge/services/plan_geometry/plan_reader.py
 M backend/apps/knowledge/views/plan_preview_views.py
 M docs/PROJECT_INSTRUCTIONS_CHANGELOG.md
 M src/components/wrapper/documents/PlanPreviewWindow.tsx
 M src/styles/wrapper.css
?? .claude-flow/
?? .claude/.proven-config-version
?? .claude/proven-config.json
?? _instructions-review-2026-08-14/
?? backend/.claude-flow/
?? backend/apps/knowledge/services/plan_geometry/.claude-flow/
?? backend/apps/knowledge/services/plan_geometry/lot_infill.py
?? backend/apps/knowledge/tests/test_lot_infill.py
```

- The 8 modified files and the two new ones (`lot_infill.py` / `test_lot_infill.py`) were live
  WIP at the time this section was first drafted. **Update, same session, ~45 minutes later**:
  the live session committed (`1415175b`, "fix(plan): recover the lots the plat's file loses,
  and stop one being mislabelled") and absorbed all of those into the branch. They are no longer
  at risk — this is included so a future reader isn't misled by a stale mid-audit snapshot, not
  because anything needed fixing. Current status after that commit: only `CLAUDE.md` and
  `docs/PROJECT_INSTRUCTIONS_CHANGELOG.md` remain modified-uncommitted; still live, still not
  touched.
- `.claude-flow/`, `.claude/.proven-config-version`, `.claude/proven-config.json`,
  `backend/.claude-flow/`, and the nested `.claude-flow/` under `plan_geometry/`: tool/harness
  artifacts, same pattern repeats identically in every worktree below — not work product.
- `_instructions-review-2026-08-14/`: **flag by name.** Three files (`CUTS-list-Landscape.md`,
  `PROPOSED-Landscape-instructions-v5.0.md`, `REVIEW-PROMPT-paste-this.md`), dated 2026-08-14,
  never committed, no git history under that path at all (`git log --all` on it returns
  nothing). Reads as a real, standalone deliverable — a proposed rewrite of the project
  instructions plus a cuts list and review prompt — sitting only on disk. The modified
  `docs/PROJECT_INSTRUCTIONS_CHANGELOG.md` in this same worktree suggests it's connected to
  active instructions work. **This is the single most at-risk item this pass found**: it is
  untracked, uncommitted, has no history anywhere, and would not survive a careless `git clean
  -fd` in this checkout.

### `landscape-wt-budget`

```
?? .claude-flow/
?? .claude/.proven-config-version
?? .claude/proven-config.json
?? _deleted-contingency-rows-project9-2026-08-14.json
?? backend/.claude-flow/
?? backend/apps/artifacts/services.py.bak-2026-08-14-pre-dedup-params
?? backend/apps/landscaper/tools/schedule_view_spec.py.bak-2026-08-14
?? src/components/wrapper/ScheduleArtifact.module.css.bak-2026-08-14
?? src/components/wrapper/ScheduleArtifact.tsx.bak-2026-08-14
?? src/components/wrapper/ScheduleArtifact.tsx.bak2-2026-08-14
?? src/components/wrapper/ScheduleArtifact.tsx.bak3-2026-08-14
```

Confirmed: exactly the 7 known deliberate leftovers (6 `.bak` files +
`_deleted-contingency-rows-project9-2026-08-14.json`) are present, and nothing else has joined
them — the only other untracked items are the same tool-artifact directories seen in every
worktree. Classification: **backup/tool artifact, deliberately kept**, per standing instruction.

### `landscape-wt-cashflow`

```
?? .claude-flow/
?? .claude/.proven-config-version
?? .claude/proven-config.json
?? backend/.claude-flow/
```

Fully clean otherwise. Only the standard tool-artifact clutter. Nothing at risk.

### `landscape-wt-pd28`

```
?? .claude-flow/
?? .claude/.proven-config-version
?? .claude/proven-config.json
?? backend/.claude-flow/
?? backend/venv
```

`backend/venv`: a Python virtualenv directory — environment artifact, not work product.
Otherwise clean. Branch is fully landed (PR #246). Nothing at risk.

---

## C. The four stashes

All four self-describe as superseded/duplicated. Verified each by diffing the stash's actual
added lines against the corresponding file's current content on `origin/main` (not trusting the
label).

### `stash@{0}` — "EB1 stale duplicates... must not be committed"

Touches `backend/apps/artifacts/views.py`, `backend/apps/landscaper/tools/
budget_artifact_builder.py`, `src/components/wrapper/ArtifactWorkspacePanel.tsx`. Every
non-blank added line in all three files was found verbatim in `origin/main`'s current copies
(19/19, 53/53, 19/19 respectively, allowing for duplicate-line over-matches). **Confirmed
superseded** — content is on main. The label's warning that the surrounding file "predates
CC3/CC11/CC13 and must not be re-applied" is consistent with what's here: the specific lines
this stash would add are already present, so re-applying the full patch would either no-op or
(more likely, since the file has restructured around those lines since) conflict/corrupt
rather than help. **Still accurate.**

### `stash@{1}` — "CC7-superseded-worktree-files-2026-07-30"

Touches `CLAUDE.md`, `backend/apps/landscaper/tool_executor.py`,
`budget_artifact_builder.py`, `sales_artifact_builder.py`. All added lines matched on
`origin/main` except one: a `*Last audit: ...*` footer line in `CLAUDE.md`. That line is an
audit-log timestamp entry, not code — main's `CLAUDE.md` has since accumulated newer audit
entries in the same slot, so the exact old sentence no longer appears verbatim, but it isn't
lost content, it's a superseded log line. **Confirmed superseded.**

### `stash@{2}` — "parallel-session WIP before overlay-durable sync"

The largest stash: 14 files (map-tab component/hooks/CSS, property-type badge/token files, a
new media-proxy API route, `/w/` layout and projects page). Most files matched fully. Three
showed unmatched lines on first pass:

- `src/app/w/projects/page.tsx` — the 3 "unmatched" lines are a comment plus a call site for
  `getPropertyTypeBadgeStyle(..., 'outline')`; reading them, they describe the same
  primary/subtype badge pairing concept present in main's current file, just phrased/wrapped
  differently in the comment. Not distinct logic.
- `src/components/wrapper/ArtifactWorkspacePanel.tsx` — same pattern: unmatched lines are
  comment fragments (prose describing panel-collapse behavior), reflowed across different line
  breaks in main's current version, not a different implementation.
- `src/config/propertyTypeTokens.ts` — same pattern again: the ghost-badge color
  (`rgb(200, 200, 200)`) and the primary/subtype styling rule described in the stash's comments
  are present in main's file; the comment block is worded and wrapped differently.

All three "gaps" are **comment rewording, not missing logic or missing values** — the
`rgb(200, 200, 200)` color, the outline/solid pairing rule, and the panel-collapse behavior all
independently verified present on `origin/main`. This lines up with the property-type-badge
work tracked elsewhere as landed. **Functionally superseded**, though not byte-identical —
noting the distinction rather than collapsing it into a flat "confirmed."

### `stash@{3}` — "guide-work-backup-identical-to-#111"

One file, `WrapperSidebar.tsx`, 5 added lines (a `UiModeSwitch` import + render call). All 4
non-blank lines matched `origin/main`'s current file verbatim. Cross-checked against PR #111
("always-visible Chat/Classic view switch in the chat sidebar," MERGED) — same feature.
**Confirmed superseded**, label accurate.

---

## D. The server record

**Open PRs** (`gh pr list --state open`, all base `main`):

| # | Title | Branch | Mergeable | CI | Age | Review comments outstanding |
|---|---|---|---|---|---|---|
| 247 | feat(knowledge): plan geometry — read parcel and lot geometry from project drawings (GP14) | `feature/plan-geometry` | UNKNOWN¹ | Build/Backend Tests/Vercel = SUCCESS; **"Create Database Branch" = FAILURE**; Run Migrations = SKIPPED (consequence of the DB-branch failure) | opened 08-14, updated today | None — the one PR comment is the automated Vercel deployment-status bot, no human review |
| 239 | ci: gate every pull request, including stacked ones (CC15) | `chore/ci-gate-stacked-prs` | UNKNOWN¹ | All green (Create Database Branch, Build and Test, Backend Tests = SUCCESS; Migrations SKIPPED) | opened 07-30, last CI run 08-12 | None — 2 comments, both Vercel bot |
| 235 | fix(nightly): refuse to commit generated docs off the main line (CC7) | `chore/nightly-committer-branch-guard` | UNKNOWN¹ | All green | opened 07-30, last CI run 07-30 | None — 1 comment, Vercel bot |
| 145 | fix(map): match land-project map sales layer to Market screen | `feature/map-sales-match-market` | UNKNOWN¹ | Only Vercel preview checks ran (no backend/build/test jobs recorded — predates the CI-gate-stacked-PRs fix, or predates those jobs existing on `preview.yml` entirely) | opened 07-06, last activity 07-09 | None — 1 comment, Vercel bot |

¹ `gh` reports `mergeable: UNKNOWN` for all four — GitHub computes this lazily and it wasn't
triggered by this read-only pass. Not resolved.

**PR #247's failing "Create Database Branch" check** was not investigated further — out of
scope for a branch/worktree/stash audit, but worth flagging since it's the one red item across
all four open PRs' CI.

**PR #145 vs local content — the disagreement flagged in §A**: local git content says
`feature/map-sales-match-market` is fully landed (squashed into `origin/main` as `11e11891`).
GitHub says PR #145, opened from that same branch, is still open. Both facts are independently
verified; they are not reconciled here.

**Remote branches with commits the local copy lacks**: `origin/chore/ci-gate-stacked-prs`
carries two commits not on the local branch of the same name — `e9a55985` "fix(scripts):
resolve paths from the repo, not a hardcoded home folder" and `1c541c42` "chore(npm): record
legacy-peer-deps=true." Something (another session, presumably) pushed directly to that remote
branch after this local copy's tip stopped advancing. The local copy in turn has 3 commits
(nightly docs 08-11/12/13) not yet pushed to origin.

**Local branches with no remote counterpart**: none found — every local branch has a matching
`origin/*` ref (confirmed via `git branch -vv`).

**`origin/archive/RN2-preswept-0727`** (no local counterpart): 27 ahead / 1 behind
`origin/main` by raw count, but true content diff against its merge-base (`6ab040a3`, itself
already on `origin/main`) shows only **one** commit not otherwise on main: a single
`docs: nightly health check 2026-07-27` entry — generated noise, not a substantive difference.
Everything else in its history duplicates work already landed under different commits. The
`archive/` naming and the fact its merge-base long since merged into `main` both point to
**deliberate archive, not a straggler** — reads as a pre-cleanup snapshot kept for the record.
Not conclusively provable from git alone (no tag, no PR, no comment explaining the rename);
flagging the read, not asserting it as certain (see §E).

---

## E. What could not be determined

- **`mergeable` status** on all four open PRs — GitHub reports `UNKNOWN` and computing it isn't
  a read-only git operation this pass performed.
- **Whether `audit/sales-basis-comparison`'s CB9 finding has since been independently fixed** —
  would require reading the CB9 recalculation code path on current main, out of scope for a
  branch/worktree/stash inventory.
- **Whether `feature/design-shell`'s parked `DesignProjectHome.tsx` and vendored reference
  assets still have a use** for the DG3 token-swap work referenced in prior notes — this is a
  product/roadmap judgment, not a git fact.
- **Why `origin/archive/RN2-preswept-0727` was renamed to `archive/` rather than deleted** — the
  naming and content both point to "deliberate snapshot," but no commit message, tag, or PR
  comment confirms intent; it's a read, not a fact.
- **Why PR #145 is still open** when its content is verifiably on `origin/main` — could be an
  oversight (nobody closed it after the squash landed under a different commit), or there could
  be a reason not visible in the local git history. Not guessed at.
- **Contents of `_instructions-review-2026-08-14/`** were listed and classified by filename/date
  only, not read in full — reading a 80KB proposed-instructions document in detail was outside
  this audit's scope, but its existence and risk are flagged.
- **PR #247's failing "Create Database Branch" CI check** — surfaced, not diagnosed.
