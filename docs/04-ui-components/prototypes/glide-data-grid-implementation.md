# Glide Data Grid Prototype Implementation

**Date:** October 6, 2025
**Prototype ID:** `glide-parcel-grid`
**Status:** Work in Progress
**Owner:** Gregg

## Overview

This document captures the implementation of a high-performance data grid prototype using [Glide Data Grid](https://github.com/glideapps/glide-data-grid) as a potential replacement for the current HTML table in the Planning Overview's parcel section.

## Motivation

The current parcel table in the Planning Overview (`src/app/components/Planning/PlanningContent.tsx`) uses a standard HTML table that becomes difficult to work with as more columns are added. Key limitations:

- **Limited horizontal space** for displaying many columns
- **No built-in column resizing** or reordering
- **Performance concerns** with large datasets
- **Poor horizontal scrolling** experience with 15+ columns

Glide Data Grid was identified as a solution offering:
- Canvas-based rendering for smooth performance with large datasets
- Virtual scrolling for millions of rows
- Built-in column resizing and reordering
- Professional spreadsheet-like UX
- Inline editing capabilities

## Implementation Details

### Installation

The library required special installation due to React 19 compatibility:

```bash
npm install @glideapps/glide-data-grid --legacy-peer-deps
npm install lodash marked react-responsive-carousel --legacy-peer-deps
```

**Peer Dependencies:**
- `lodash` v4.17.21 - Core utilities
- `marked` v16.3.0 - Markdown rendering for markdown cells
- `react-responsive-carousel` v3.2.23 - Image carousel for image cells

**Note:** Glide Data Grid officially supports React 16-18, but works with React 19 using `--legacy-peer-deps`.

### File Structure

**Registry Entry:** `src/lib/prototypes/registry.ts`
```typescript
{
  id: 'glide-parcel-grid',
  name: 'Glide Data Grid - Parcel Table',
  description: 'High-performance canvas-based data grid for parcel overview with many columns',
  status: 'wip',
  owners: ['Gregg'],
  tags: ['glide', 'data', 'layout'],
  notes: 'Testing Glide Data Grid from https://github.com/glideapps/glide-data-grid for Planning Overview parcel table. Uses legacy-peer-deps with React 19.'
}
```

**Component:** `src/prototypes/glide/ParcelGridPrototype.tsx`
- Main prototype component
- Implements 11 data columns (vs 9 in current table)
- Dark and light theme support with toggle
- Live data from `/api/parcels?project_id=7`
- Inline editing for acres, units, product, frontage, efficiency

**Loader:** `src/lib/prototypes/loaders.tsx`
```typescript
'glide-parcel-grid': () => import('@/prototypes/glide/ParcelGridPrototype')
```

**Types:** `src/lib/prototypes/types.ts`
- Added `'glide'` to `PrototypeTag` union type

### Data Schema

The prototype uses the existing parcel data structure:

```typescript
interface Parcel {
  parcel_id: number;
  area_no: number;
  phase_name: string;
  parcel_name: string;
  usecode: string;
  type_code?: string;
  product: string;
  acres: number;
  units: number;
  efficiency: number;
  family_name?: string;
  frontfeet?: number;
}
```

### Grid Configuration

**Columns (11 total):**
1. Area - Number, 80px
2. Phase - Text, 100px
3. Parcel ID - Text, 120px
4. Family - Text, 150px
5. Type - Text, 100px
6. Use Code - Text, 100px
7. Product - Text, 120px (editable)
8. Acres - Number, 100px (editable)
9. Units - Number, 100px (editable)
10. Efficiency - Number (percent), 100px (editable)
11. Frontage (ft) - Number, 120px (editable)

**Features Enabled:**
- `smoothScrollX` - Smooth horizontal scrolling
- `smoothScrollY` - Smooth vertical scrolling
- `getCellsForSelection` - Multi-cell selection
- `rowMarkers="both"` - Row selection markers
- `onCellEdited` - Inline editing with API persistence

### Theme Implementation

Two complete themes were implemented:

**Dark Theme (default):**
- Background: `#1f2937` (gray-800) cells, `#111827` (gray-900) headers
- Text: `#f3f4f6` (gray-100)
- Accent: `#3b82f6` (blue-500)
- Borders: `rgba(75, 85, 99, 0.3)` (gray-600)

**Light Theme:**
- Background: `#ffffff` (white) cells, `#f3f4f6` (gray-100) headers
- Text: `#111827` (gray-900)
- Accent: `#2563eb` (blue-600)
- Borders: `rgba(229, 231, 235, 0.8)` (gray-200)

Theme switching is handled via a toggle button in the UI header.

### Inline Editing

Editable cells (acres, units, product, frontage, efficiency) use the `onCellEdited` callback to persist changes:

```typescript
const onCellEdited = useCallback(
  async (cell: Item, newValue: EditableGridCell) => {
    // Extract column and row
    const [col, row] = cell;
    const parcel = parcels[row];

    // Map to API field name
    const fieldMap = {
      acres: 'acres',
      units: 'units',
      product: 'product',
      frontfeet: 'frontfeet',
      efficiency: 'efficiency',
    };

    // PATCH to API
    await fetch(`/api/parcels/${parcel.parcel_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [apiField]: updatedValue }),
    });

    // Refresh data
    await mutate();
  },
  [parcels, columns, mutate]
);
```

## Technical Challenges

### React Hooks Order Error

**Problem:** Initial implementation placed `useMemo` hook after conditional early returns, violating Rules of Hooks.

**Error:**
```
Rendered more hooks than during the previous render.
React has detected a change in the order of Hooks called by ParcelGridPrototype.
```

**Solution:** Moved all hooks (including `gridTheme` useMemo) before any conditional returns:

```typescript
// ✅ Correct - All hooks before returns
const parcels = useMemo(...);
const columns = useMemo(...);
const gridTheme = useMemo(...);
const getCellContent = useCallback(...);
const onCellEdited = useCallback(...);

// Now safe to do early returns
if (error) return <ErrorView />;
if (!parcelsData) return <LoadingView />;

return <DataEditor ... />;
```

### Dependency Installation

Glide Data Grid has several peer dependencies that weren't automatically installed:

1. `lodash` - Core utilities (clamp, uniq, flatten, range)
2. `marked` - Markdown cell support
3. `react-responsive-carousel` - Image cell carousel

All were installed with `--legacy-peer-deps` flag for React 19 compatibility.

### Build Cache

After installing dependencies, the Next.js build cache needed to be cleared:

```bash
rm -rf .next
npm run dev
```

## Prototype Lab Improvements

As part of this work, the prototype lab index page was enhanced:

**Clickable Tiles:**
- Entire card is now a clickable link (not just bottom button)
- Added `cursor-pointer` for better UX
- Removed redundant "Open prototype →" button

**"Open" Chip:**
- Added blue chip next to each prototype title
- Styled: `bg-blue-600/20 text-blue-300 border border-blue-500/40`
- Provides clear visual call-to-action

## Testing Checklist

- [x] Grid loads with live parcel data
- [x] All 11 columns visible and properly formatted
- [x] Horizontal scrolling works smoothly
- [x] Column resizing by dragging headers
- [x] Row selection with markers
- [x] Dark theme displays correctly
- [x] Light theme displays correctly
- [x] Theme toggle switches instantly
- [ ] Inline editing persists to database
- [ ] Performance with 100+ rows
- [ ] Performance with 500+ rows
- [ ] Multi-cell selection and copy
- [ ] Keyboard navigation

## Next Steps

1. **Performance Testing**
   - Test with full dataset (hundreds of parcels)
   - Measure rendering performance vs HTML table
   - Test memory usage with large datasets

2. **Feature Parity**
   - Add phase filtering (currently in HTML table)
   - Add detail card sidebar integration
   - Add family/type/product dropdowns for editing
   - Implement sort functionality

3. **Integration Planning**
   - Evaluate if grid should replace HTML table
   - Plan migration strategy if approved
   - Document any breaking changes
   - Create side-by-side comparison view

4. **Additional Features**
   - Column visibility toggles
   - Column reordering via drag-and-drop
   - Export to CSV/Excel
   - Advanced filtering UI
   - Cell validation and error handling

## Comparison: Glide Data Grid vs HTML Table

| Feature | HTML Table | Glide Data Grid |
|---------|-----------|-----------------|
| **Performance** | Degrades with many rows | Handles millions of rows |
| **Horizontal Scrolling** | Standard browser scroll | Smooth canvas-based scroll |
| **Column Resizing** | CSS only, no drag | Built-in drag-to-resize |
| **Column Reordering** | Manual implementation | Built-in support |
| **Inline Editing** | Manual implementation | Built-in editors |
| **Virtual Scrolling** | No | Yes |
| **Cell Types** | HTML only | Text, Number, Image, Markdown, etc. |
| **Memory Usage** | All DOM nodes in memory | Virtual rendering |
| **Mobile Support** | Standard HTML | Touch-optimized |
| **Accessibility** | Standard HTML a11y | Built-in a11y support |

## References

- **Glide Data Grid GitHub:** https://github.com/glideapps/glide-data-grid
- **Documentation:** https://grid.glideapps.com/
- **Prototype URL:** http://localhost:3001/prototypes/glide-parcel-grid
- **Current Implementation:** `src/app/components/Planning/PlanningContent.tsx:319-343`

## Recommendations

**Pros:**
- Significantly better performance with large datasets
- Professional spreadsheet-like UX
- Built-in features reduce custom code
- Canvas rendering enables smooth interactions
- Active maintenance and community

**Cons:**
- Requires React 16-18 (using legacy peer deps for React 19)
- Different mental model than HTML tables
- Additional bundle size (~100KB)
- Steeper learning curve for customization
- Theme configuration is verbose

**Verdict:** Recommended for Planning Overview if:
1. Performance testing confirms improvements
2. Team is comfortable with canvas-based approach
3. Feature parity can be achieved
4. Bundle size increase is acceptable

The prototype demonstrates strong potential as a replacement for the HTML table, particularly for scenarios requiring many columns and high performance.
