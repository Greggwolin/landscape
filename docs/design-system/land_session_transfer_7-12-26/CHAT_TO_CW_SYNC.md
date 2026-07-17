# CHAT_TO_CW_SYNC

> **Direction:** Chat project (strategy side) → Cowork (coding side).
> **Cowork: this is your inbound file.** Read at session start. Read-only for you.

---

```
SYNC:           Chat  →  Cowork   (Landscape)
seq:            1
generated_at:   2026-07-11
source:         Claude.ai chat project / Landscape
```

**Staleness check:** compare `seq` to the last chat-side seq you ingested. Same or lower = nothing new. This is seq 1 — the first outbound file ever produced; everything here is new.

---

## 1. Current focus
A major product direction was set on 2026-07-11: Landscape will ship **property-type-specific front doors** over the shared engine, starting with a standalone **land development product**. Eight design decisions were locked and a first build slice defined. Full detail travels in the companion briefing file `LANDSCAPE_LAND_SLICE1_BRIEFING.md`, saved to this same folder.

## 2. Work state (plain English)
Ten disposable interaction prototypes were built and reviewed with Gregg in one session: intake paradigms (conversational vs. briefing vs. hybrid decision tiles), a decision-docket pattern for judgment calls, MPC intake from a single land plan exhibit, Red Valley Ranch intake from its real entitlement record, map-driven navigation (clickable parcels/phases/areas, takedown tiles), spatial parcel-table authoring (multi-select + paint), and streets as clickable objects with derived quantities. These are evidence, not code.

## 3. Decisions locked
- D1: First slice = app-level map + boundary-first project creation + parcel table authoring.
- D2: In the land product the workspace owns the center; chat is a rail during intake, summonable elsewhere. Do not carry the chat-in-center layout into this product.
- D3: The decision docket (blockers vs. pre-applied defaults, per-tile Q&A, recorded resolutions) is the product-wide pattern for anything needing Gregg's judgment.
- D4: Slice 1 geometry reuses existing machinery only — tax parcels, drawing tools, overlay engine with control points — promoted to app-level scope, with drawn shapes promoted to first-class records. Exhibit auto-vectorization deferred.
- D5: Streets & quantities land in v1.5, after the parcel workflow is in daily pilot use.
- D6: Pilot = Red Valley Ranch, rebuilt from scratch in the new slice.
- D7: Existing component kit and tokens; no new visual identity.
- D8: v1 exclusions confirmed (automated takeoff, exhibit vectorization, MU vertical, offsite cost sharing, portfolio views, income-property workflows).

## 4. Open items / waiting on
- **Coding side's next move (requested):** a read-only discovery audit of the existing map engine, draw/measure tools, overlay engine, tax-parcel integration, land use taxonomy library, and parcel data model — reported to Gregg in plain English — BEFORE proposing any implementation phasing. The briefing file states this as a hard precondition.
- Waiting on Gregg: none. All eight decisions are locked.
- Ingested your seq 1 (2026-06-16). Noted: operating-statement work must respect the existing scenario classification; nothing in the land direction touches that area. Your file is ~25 days old — an update after the discovery audit would be timely.

## 5. Recent changes (newest first)
- 2026-07-11 — Decision register D1–D8 locked; slice 1 scoped; briefing + this sync file produced.
- 2026-07-11 — Red Valley Ranch entitlement record located and read from the project folders (pre-plat narrative, final plat staff report); precedence rule (recorded > approved > proposed) established as an intake design principle.
- 2026-07-11 — Ten interaction prototypes built and reviewed; map-driven navigation validated as the land product's signature pattern.

## 6. Handoff notes for the coding side
- Read `LANDSCAPE_LAND_SLICE1_BRIEFING.md` (same folder) before anything else — it carries the scope table, in/out lists, and human gates.
- The briefing intentionally contains no claims about current code structure; your audit supplies those facts.
- Canonical land hierarchy remains Area → Phase → Parcel; parcel IDs decode as Area.Phase+Parcel. No alternative vocabulary.
- The docket pattern (D3) will eventually surface outside intake; design its first implementation so it isn't welded to the intake flow.

---
*Overwritten in place each update; increment seq by 1 on every new version.*
