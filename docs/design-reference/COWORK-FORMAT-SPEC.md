# Cowork format spec — make the `design` shell match Slice 1

This is the single source of truth for the **look** of every page in the `design`
shell. Pair it with `design.css` (drop-in, scoped under `.design-shell`) in the
same folder. If a rule here and `design.css` ever disagree, `design.css` wins —
it carries the exact values.

Reference: `Slice 1 Reference Design.dc.html` (every screen, drawn from the real
repo). Open it beside your build and match panel-for-panel.

---

## 1. The three fixed colors (most-reported bug — get these exact)

Every page is three vertical zones, left to right. Their backgrounds are NOT
interchangeable and are NOT `--color-surface`:

| Zone | Background | Notes |
| --- | --- | --- |
| **Left nav rail** (icon rail OR expanded nav) | **`#08090A`** | near-black. Applies to the 56px icon rail AND the 232–300px expanded nav. Never `--color-surface`, never `--color-neutral-900`. |
| **Landscaper (chat) panel** | **`#2A2B31`** | the conversational column, always immediately right of the nav rail. Never `--color-surface` (#232532) and never `--color-neutral-900` (#292b31) — those are the three-colors-on-different-pages bug. |
| **Content / workspace** | **`#161826`** (`--color-bg`) | the routed screen. |

Header strips / top bars stay `--color-surface` (#232532). Cards inside content
stay `--color-surface`. Only the two rails get the special colors above.

**Every non-modal page has BOTH a nav rail and a Landscaper panel.** The only
exception is a modal/overlay popup (e.g. the Settings overlay, the workbench
modal) — those may show the chat rail without the nav rail. If a page currently
renders as `nav + content` or `content only`, insert the missing Landscaper panel
(320px) so it becomes `nav + Landscaper + content`.

Canonical grid for a standard page:
```
grid-template-columns: 56px 320px 1fr;   /* icon-rail · Landscaper · content */
/* or, expanded nav: */
grid-template-columns: 232px 300px 1fr;
```

---

## 2. Landscaper panel anatomy (copy this structure)

```html
<div style="background:#2A2B31; border-right:1px solid var(--color-neutral-800); display:flex; flex-direction:column; min-height:0;">
  <header> accent dot · "Landscaper" · right-aligned context label </header>   <!-- border-bottom -->
  <scroll> assistant bubbles (bg var(--color-bg), 1px border) + user bubbles
           (bg color-mix(accent 14%)) </scroll>
  <footer> composer: 1px border rounded input "Ask …" </footer>               <!-- border-top -->
</div>
```
The panel is always present, even when no project is selected (show a "No project"
/ portfolio context label and a relevant opening message).

---

## 3. Badges never pills

Small status/label chips are **rounded-rectangles** (`border-radius:
var(--radius-sm)`), never fully-rounded pills. This holds everywhere: status
badges, category chips, count chips, type tags. `design.css` enforces
`border-radius: var(--ds-radius-sm) !important` on `.badge/.cbadge/[class*=badge]`
but author new markup as rounded-rect from the start.

Ghost/type badges: transparent fill, family-colored 1px border, tinted text.
Solid badges: tinted fill from the accent/neutral ramp, light text.

---

## 4. Editable fields (tabular + forms)

- Values edit **in place on click** — no persistent input box around a cell.
- An editable value shows a **dashed accent underline** (`border-bottom: 1px
  dashed var(--color-accent-700)`); a picklist adds a `▾`.
- **Derived / calculated values are plain text** (no underline, not editable).
- Ratings edit as a ★ dropdown; provenance-locked values carry the 🔒 amber mark.
- Save buttons enable only when the form is dirty.

---

## 5. Map chrome (home / map pages)

The map already reads `--cui-*`, which `design.css` remaps. Beyond that:
- Display card (Basemap/Hillshade/3D), bottom toolbar, search/export → surface + border, `--ds-radius`.
- Draw-tool active state is an **accent outline**, not a solid indigo fill.
- MapLibre zoom/compass/scale controls → surface bg, `--ds-radius-sm`, border.
- The full toolbar set must be present: search box, 2D/3D/Hillshade segmented
  control, Layers chip, `+ Create Feature`, and the compass/tilt/zoom stack.

---

## 6. Type, spacing, radius

- Font: Inter (`--font-body`), medium weight; hierarchy is size + space, not bold.
- Radius: 8px (`--ds-radius`) for cards/panels, 6px (`--ds-radius-sm`) for chips/inputs.
- Accent: `#2f9dd3` (Nocturne current). Use as line/glow/small emphasis, never a large flood.
- Borders: `#3f424d` (`--color-neutral-800`); soft dividers `--color-divider`.

---

## 7. How to apply (mechanical checklist for the pass)

1. Load `design.css` last in the `design` layout (after wrapper/studio CSS).
2. For each page, confirm the 3-zone grid; insert a Landscaper panel if missing.
3. Nav rail bg → `#08090A`. Landscaper panel bg → `#2A2B31`. Content → `--color-bg`.
4. Grep the codebase for panel backgrounds still set to `--color-surface` or
   `--color-neutral-900` on a `border-right … flex-direction:column` container —
   those are mis-colored rails; fix to the table in §1.
5. Any pill-radius chip → rounded-rect.
6. Modals/overlays: chat rail allowed without nav rail; everything else gets both.

Verifier check to run after the pass: no `border-right …; display:flex;
flex-direction:column` container should have `background: var(--color-surface)` or
`var(--color-neutral-900)` — every such rail is either `#08090A` (nav) or
`#2A2B31` (Landscaper).
