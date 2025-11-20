# 01 – UI_STANDARDS.md v1.0
**Landscape UI Formatting & Alignment Rules (Developer-Oriented)**  
**Version:** v1.0 • **Date:** 2025-11-02

## 1. Scope
Single source of truth for numeric/text formatting, alignment, and input sizing across grids, forms, and reports. Codex/Claude: load and obey these rules for all UI work.

## 2. Global Principles
- All numeric display uses a shared formatter. No inline `toLocaleString` or regex.
- Numeric typography uses tabular numerals for stable column layout.
- Inputs show formatted values but store clean (unformatted) primitives.

## 3. CSS/Tailwind Baseline
```css
/* v1.0 • 2025-11-02 */
.tnum { font-variant-numeric: tabular-nums; }
```
Tailwind: add `tnum` as a safelisted class if using purge.

## 4. Display Formatting
- **Integers:** `#,###` (thousand separators, no decimals).  
- **Money:** `$#,###` or `$#,###.##` (2 fixed decimals only when cents are meaningful).  
- **Percent:** `#,###%` or `#,###.0%` (display decimals only when required).  
- **IDs:** If user-facing, group with `#,###`; if internal keys, show raw or hide.

### 4.1 Shared Formatters (TypeScript)
```ts
// ui/formatters/number.ts  • v1.0 • 2025-11-02
export const formatNumber = (v: number | null | undefined, opts?: Intl.NumberFormatOptions) =>
  v == null ? "" : new Intl.NumberFormat(undefined, { useGrouping: true, maximumFractionDigits: 0, ...opts }).format(v);

export const formatMoney = (v: number | null | undefined, opts?: Intl.NumberFormatOptions) =>
  v == null ? "" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2, ...opts }).format(v);

export const formatPercent = (v: number | null | undefined, digits = 0) =>
  v == null ? "" : `${new Intl.NumberFormat(undefined, { useGrouping: true, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)}%`;
```

## 5. Alignment Rules
**Numeric columns**
- Default **right-aligned** (`text-right tnum`).
- If the column’s **max width ≤ 3 digits** (e.g., 0–999, flags), **center** (`text-center tnum`).

**Text columns**
- Content **> 3 characters** → **left-aligned** (`text-left`).
- Content **≤ 3 characters** → **centered** (`text-center`).

**Mixed columns** (alphanumeric codes)  
- Prefer **left** unless the code length is consistently ≤3 → then **center**.

## 6. Text Field Sizing (by intended content)
Use `ch` (character) width mapping to keep fields visually proportional:
- Codes (1–3 chars): `w-[2ch]`, `w-[3ch]`
- Short text (≈8 chars): `w-[8ch]`
- Standard narrative: `w-[20ch]`
- Long narrative: `w-[40ch]`, or `<textarea>` with `max-w-prose`

### 6.1 Shared Inputs
```tsx
// ui/components/TextField.tsx • v1.0 • 2025-11-02
type CharWidth = 2 | 3 | 8 | 20 | 40;
const map: Record<CharWidth, string> = {2:"w-[2ch]",3:"w-[3ch]",8:"w-[8ch]",20:"w-[20ch]",40:"w-[40ch]"};

export function TextField({ charWidth = 20, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { charWidth?: CharWidth }) {
  return <input {...props} className={`${map[charWidth as CharWidth]} ${className}`} />;
}
```

## 7. Numeric Inputs (masking vs storage)
- Display formatted; parse to plain number on change; keep cursor friendly.
```tsx
// ui/components/NumericInput.tsx • v1.0 • 2025-11-02
import { useState } from "react";
import { formatNumber } from "@/ui/formatters/number";

export function NumericInput({ value, onChange, className = "", ...props }:{
  value: number | null | undefined; onChange: (v: number | null) => void; className?: string;
}) {
  const [raw, setRaw] = useState<string>(value == null ? "" : String(value));
  return (
    <input
      inputMode="numeric"
      className={`text-right tnum ${className}`}
      value={raw}
      onBlur={() => setRaw(value == null ? "" : formatNumber(value))}
      onChange={(e) => {
        const s = e.target.value.replace(/,/g, "");
        setRaw(e.target.value);
        const n = s === "" || isNaN(Number(s)) ? null : Number(s);
        onChange(n);
      }}
      {...props}
    />
  );
}
```

## 8. Table Integration (TanStack v8)
Define alignment via `column.meta` so renderers are declarative.

```ts
// ui/table/columnMeta.ts • v1.0 • 2025-11-02
export type ColKind = "numeric" | "text";
export interface ColMeta {
  kind: ColKind;
  maxChars?: number; // hint for alignment (≤3 → center for both text & small numeric)
  align?: "left" | "center" | "right"; // explicit override
}

export const cellClassFor = (m: ColMeta) => {
  if (m.align) return alignToClass(m.align, m.kind === "numeric");
  const small = (m.maxChars ?? Infinity) <= 3;
  if (m.kind === "numeric") return small ? "text-center tnum" : "text-right tnum";
  return small ? "text-center" : "text-left";
};

const alignToClass = (a: "left"|"center"|"right", numeric: boolean) =>
  `${a === "left" ? "text-left" : a === "center" ? "text-center" : "text-right"} ${numeric ? "tnum" : ""}`;
```

**Usage in column defs**
```tsx
// example
{
  header: "Units",
  accessorKey: "units",
  meta: { kind: "numeric", maxChars: 3 } as ColMeta,
  cell: ({ getValue, column }) => <span className={cellClassFor(column.columnDef.meta as ColMeta)}>{formatNumber(getValue() as number)}</span>,
}
{
  header: "Code",
  accessorKey: "code",
  meta: { kind: "text", maxChars: 3 } as ColMeta,
  cell: ({ getValue, column }) => <span className={cellClassFor(column.columnDef.meta as ColMeta)}>{getValue() as string}</span>,
}
```

## 9. Narrative Cells
```tsx
// ui/components/TextCell.tsx • v1.0 • 2025-11-02
export function TextCell({ text, maxLines = 2, className = "" }:{ text: string; maxLines?: number; className?: string; }) {
  return <span className={`text-left line-clamp-${maxLines} ${className}`}>{text}</span>;
}
```

## 10. Enforcement
- **ESLint rule** (custom) to forbid inline number formatting in JSX:
  - Disallow `.toLocaleString`, regex thousand separators, or manual `%` concatenation.
  - Require imports from `@/ui/formatters/number`.
- **Storybook + Chromatic**: stories for `NumericInput`, `TextField`, `Num/Money/Pct` cells with snapshots to catch alignment/width regressions.
- **Code review checklist**: verify `meta.kind`, `maxChars`, `cellClassFor` usage on every new column.

## 11. Agent Prompt Hook (Codex/Claude)
> All UI must comply with `/docs/UI_STANDARDS.md`.  
> Use `formatNumber/formatMoney/formatPercent`, `TextField/NumericInput`, and `cellClassFor(meta)` for alignment and sizing.  
> Numeric default right; ≤3 digits center. Text >3 left; ≤3 center. Inputs sized by `charWidth`.

## 12. Versioning
- File lives at `/docs/UI_STANDARDS.md`.  
- Update minor versions for clarifications (v1.0.1), major for rule changes (v2.0).  
- Reference this version in PR descriptions: “Conforms to UI_STANDARDS v1.0”.

— End of v1.0 —
