# Market Canvas Style Guide

Use these guidelines to design new pages that match the Market agent canvas (`/projects/[projectId]/market`).

## Layout Shell
- **Three-panel layout:** Match `AgentDashboard` — left content, middle chat, right studio; 12px outer padding and 12px gaps.
- **Content panel:** From `CollapsibleContent` — 750px min width, `var(--surface-card)` background, rounded corners, soft shadow, sticky header with `#F0F1F2` and `border-border`.
- **Chat & Studio panels:** Mirror card background/shadow; chat min 280px, studio 250–350px; sticky headers.
- **Sticky controls:** Collapse buttons use CoreUI icons and hover overlays (`hover:bg-hover-overlay`).

## Canvas Sections (Inside Content Panel)
- Wrap blocks in `Card` (`bg-surface-card`, rounded-lg, light shadow). Header: title/subtitle, divider, 12px padding; body: 12px padding unless `noPadding`.
- Spacing: `space-y-2`/`space-y-3` for vertical rhythm; `grid grid-cols-2 gap-4` for metrics; `flex justify-between items-center` for rows.
- Typography: titles `h3 font-semibold text-sm text-foreground`; helper text `text-sm text-muted`; labels `text-xs text-muted`.
- Metric tiles: soft tints (`bg-green-50`, `bg-blue-50`, etc.), `p-3`, rounded.

## Colors & Tokens
- Use tokens from `src/styles/tokens.css`: surfaces (`--surface-card`, `--surface-card-header`), text (`--text-primary`, `--text-secondary`), lines (`--line-soft`, `--line-strong`), overlays (`--hover-overlay`).
- Tailwind mappings (`tailwind.config.js` + `component-patterns.css`): `bg-surface-card`, `border-border`, `text-muted`, `text-foreground`.
- Sticky headers and panel headers use `#F0F1F2`; overall page background `var(--surface-page-bg)`.

## Spacing & Density
- Outer canvas padding: 12px; inter-panel gap: 12px.
- Card padding: 12px; header padding: 12px with bottom border.
- Prefer `space-y-*` over manual margins; avoid extra margin in headers.

## States & Interactions
- Preserve collapse behavior on content/chat/studio panels; hover feedback via `hover:bg-hover-overlay`.
- Buttons/controls use CoreUI icons (`@coreui/icons-react`) with muted text for secondary actions.

## Structure Template
```tsx
<AgentDashboard projectId={projectId} agentId="market" agentName="Market Analyst">
  <Card title="Section Title" className="mb-3">
    {/* section content using grids/flex per patterns */}
  </Card>
  {/* more cards ... */}
</AgentDashboard>
```

## Do / Don't
- **Do:** Keep backgrounds light (`var(--surface-page-bg)` for page, `var(--surface-card)` for panels/cards); maintain sticky headers and existing shadows.
- **Don't:** Introduce new fonts or bold borders; change panel widths; remove sticky behavior.***
