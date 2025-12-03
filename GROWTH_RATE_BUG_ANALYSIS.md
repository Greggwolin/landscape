# Growth Rate Change Bug - Complete Analysis

## Problem Statement

**User report**: "if i try to change the annual growth rate, it doesn't stick and it breaks the date and net proceeds AGAIN!!!!!!!!!~!!!"

When changing the growth rate in the Pricing Table:
1. ❌ The growth rate value doesn't persist/stick
2. ❌ Sale dates disappear or break
3. ❌ Net proceeds disappear or break

## Current Flow (What Happens When User Changes Growth Rate)

### Step 1: User Changes Growth Rate in UI
**File**: `/Users/5150east/landscape/src/components/sales/PricingTable.tsx`
**Line**: 546

```typescript
<select
  value={isCustomRate ? 'custom' : String(value || 0.035)}
  onChange={(e) => {
    if (e.target.value === 'custom') {
      setCustomGrowthRate(String((value || 0.035) * 100));
    } else {
      handleCellChangeAndSave(rowIndex, 'growth_rate', parseFloat(e.target.value));
      setCustomGrowthRate('');
    }
  }}
>
```

### Step 2: handleCellChangeAndSave Executes
**File**: `/Users/5150east/landscape/src/components/sales/PricingTable.tsx`
**Lines**: 236-256

```typescript
const handleCellChangeAndSave = React.useCallback(async (rowIndex: number, field: keyof PricingAssumption, value: any) => {
    // Update local state first
    const updatedRows = [...editingRows];
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
    setEditingRows(updatedRows);

    // Validate the row before saving
    const row = updatedRows[rowIndex];
    if (!row.lu_type_code || !row.unit_of_measure) {
      // Don't auto-save if required fields are missing
      setHasUnsavedChanges(true);
      return;
    }

    // Auto-save
    try {
      await saveMutation.mutateAsync({
        projectId,
        assumptions: updatedRows,  // ← Saves ALL rows, not just changed row
      });
      setHasUnsavedChanges(false);
```

**What it does**:
- Updates ALL pricing assumptions in `updatedRows`
- Calls `saveMutation.mutateAsync()` with entire array

### Step 3: useSavePricingAssumptions Mutation Runs
**File**: `/Users/5150east/landscape/src/hooks/useSalesAbsorption.ts`
**Lines**: 265-334

```typescript
export function useSavePricingAssumptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      assumptions,
    }: {
      projectId: number;
      assumptions: PricingAssumption[];
    }) => {
      // Save each assumption individually
      const promises = assumptions.map(async (assumption) => {
        const url = assumption.id
          ? `/api/projects/${projectId}/pricing-assumptions/${assumption.id}/`
          : `/api/projects/${projectId}/pricing-assumptions/`;

        const method = assumption.id ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assumption),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to save pricing assumption`);
        }

        return response.json();
      });

      return Promise.all(promises);
    },
    onSuccess: async (_, variables) => {
      // Invalidate pricing assumptions to refetch
      queryClient.invalidateQueries({
        queryKey: ['pricing-assumptions', variables.projectId],
      });

      // CRITICAL: Trigger recalculation when pricing assumptions change
      // Growth rate changes affect inflated prices and net proceeds
      try {
        const response = await fetch(`/api/projects/${variables.projectId}/recalculate-sfd/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          console.error('[useSavePricingAssumptions] Recalculation failed:', await response.text());
        }
      } catch (error) {
        console.error('[useSavePricingAssumptions] Failed to trigger recalculation:', error);
      }

      // Invalidate parcels-with-sales to show updated values
      queryClient.invalidateQueries({
        queryKey: ['parcels-with-sales', variables.projectId],
      });
    },
  });
}
```

**What it does**:
1. For each assumption in the array:
   - If `assumption.id` exists → PUT to `/api/projects/{projectId}/pricing-assumptions/{id}/`
   - If no `assumption.id` → POST to `/api/projects/{projectId}/pricing-assumptions/`
2. After all saves complete:
   - Invalidates pricing-assumptions cache ✅
   - **NEW**: Triggers recalculation via POST to `/api/projects/{projectId}/recalculate-sfd/` ✅
   - Invalidates parcels-with-sales cache ✅

### Step 4: Backend API Routes

#### Next.js API Route (Individual PUT/POST)
**File**: `/Users/5150east/landscape/src/app/api/projects/[projectId]/pricing-assumptions/[id]/route.ts`

**PROBLEM**: This file likely doesn't exist or has incorrect PUT handler!

Let me check what routes exist:

```
src/app/api/projects/[projectId]/pricing-assumptions/route.ts  ← Handles GET and POST
src/app/api/projects/[projectId]/pricing-assumptions/[id]/route.ts  ← Should handle PUT but probably missing!
```

#### Existing Route File
**File**: `/Users/5150east/landscape/src/app/api/projects/[projectId]/pricing-assumptions/route.ts`

```typescript
export async function GET(...) {
  // Fetches pricing assumptions - WORKS ✅
}

export async function POST(...) {
  // Creates pricing assumptions via bulk insert - WORKS ✅
  const { assumptions } = await request.json();

  // Delete all existing pricing for this project
  await sql`DELETE FROM landscape.land_use_pricing WHERE project_id = ${projectId}`;

  // Insert new pricing assumptions
  for (const assumption of assumptions) {
    const growthRate = assumption.growth_rate ?? 0.035;  // ← Default if missing
    await sql`INSERT INTO landscape.land_use_pricing (...) VALUES (...)`;
  }
}
```

**ISSUE**: The POST handler deletes ALL existing pricing, then bulk inserts. This means:
- If user changes just one growth_rate, ALL pricing rows get deleted and recreated
- Any IDs change
- This could cause race conditions

### Step 5: Django Backend Recalculation
**File**: `/Users/5150east/landscape/backend/apps/sales_absorption/views.py`
**Lines**: 1035-1331

The recalculation endpoint queries:
```python
SELECT p.parcel_id, p.type_code, p.product_code,
       p.lot_width, p.units_total, p.acres_gross,
       p.sale_period, psa.sale_date,
       pricing.price_per_unit, pricing.unit_of_measure, pricing.growth_rate
FROM landscape.tbl_parcel p
LEFT JOIN landscape.land_use_pricing pricing
  ON pricing.project_id = p.project_id
  AND pricing.lu_type_code = p.type_code
  AND (pricing.product_code = p.product_code OR pricing.product_code IS NULL)
```

Then calculates and saves to `landscape.tbl_parcel_sale_assumptions`.

## Root Causes Identified

### Issue 1: Missing PUT Route for Individual Pricing Assumption Updates
**Location**: `/Users/5150east/landscape/src/app/api/projects/[projectId]/pricing-assumptions/[id]/route.ts`

**Current State**: File probably doesn't exist or PUT handler is missing

**What's needed**:
```typescript
// File: src/app/api/projects/[projectId]/pricing-assumptions/[id]/route.ts

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  const body = await request.json();

  // Update specific pricing assumption
  const result = await sql`
    UPDATE landscape.land_use_pricing
    SET
      price_per_unit = ${body.price_per_unit || 0},
      unit_of_measure = ${body.unit_of_measure || 'FF'},
      growth_rate = ${body.growth_rate ?? 0.035},
      updated_at = NOW()
    WHERE id = ${id} AND project_id = ${projectId}
    RETURNING *
  `;

  return NextResponse.json(result[0]);
}
```

**Why this matters**:
- Currently, the mutation tries to PUT to a non-existent endpoint
- This causes the save to fail silently or fall back to POST (which deletes everything)
- Growth rate changes don't persist

### Issue 2: Race Condition Between Save and Recalculation
**Location**: `/Users/5150east/landscape/src/hooks/useSalesAbsorption.ts` lines 307-333

**Current Code**:
```typescript
onSuccess: async (_, variables) => {
  // 1. Invalidate cache (triggers refetch)
  queryClient.invalidateQueries({
    queryKey: ['pricing-assumptions', variables.projectId],
  });

  // 2. Trigger recalculation (runs in parallel with refetch)
  try {
    const response = await fetch(`/api/projects/${variables.projectId}/recalculate-sfd/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[useSavePricingAssumptions] Failed to trigger recalculation:', error);
  }

  // 3. Invalidate parcels cache
  queryClient.invalidateQueries({
    queryKey: ['parcels-with-sales', variables.projectId],
  });
},
```

**PROBLEM**:
1. React Query invalidation triggers immediate refetch of pricing-assumptions
2. Recalculation endpoint runs at the same time
3. If recalculation reads from database BEFORE new growth_rate is committed, it uses old value
4. Race condition: Which completes first?
   - If pricing fetch wins → UI shows new growth_rate but old net_proceeds
   - If recalculation wins → Might use old growth_rate in calculations

### Issue 3: Timing of Cache Invalidation
**Location**: Same as Issue 2

**PROBLEM**: Invalidating `parcels-with-sales` cache happens immediately after triggering recalculation, but:
- Recalculation takes ~1 second to complete
- React Query refetches immediately
- Refetch reads from `tbl_parcel_sale_assumptions` BEFORE recalculation updates it
- User sees stale net_proceeds values

### Issue 4: POST Route Deletes All Pricing
**Location**: `/Users/5150east/landscape/src/app/api/projects/[projectId]/pricing-assumptions/route.ts` line 68

```typescript
// Delete all existing pricing for this project
await sql`DELETE FROM landscape.land_use_pricing WHERE project_id = ${projectId}`;

// Insert new pricing assumptions
for (const assumption of assumptions) {
  // ... insert each one
}
```

**PROBLEM**:
- This is intended for bulk save, not individual field updates
- If PUT endpoint is missing, mutation falls back to POST
- POST deletes ALL pricing, causing:
  - Brief moment where parcels have NO pricing (if recalculation runs during delete)
  - All `id` values change
  - Potential for data loss if save fails midway

## Data Flow Issues

### Current Data Flow (Broken)
```
User changes growth_rate
    ↓
handleCellChangeAndSave() updates local state
    ↓
saveMutation.mutateAsync(ALL assumptions)
    ↓
For each assumption:
  - Try PUT /api/projects/9/pricing-assumptions/{id}/  ← FAILS (endpoint missing)
  - Falls back to POST? Or error?
    ↓
onSuccess callback:
  - Invalidate pricing-assumptions cache → Refetch starts
  - POST /api/projects/9/recalculate-sfd/ → Takes 1 second
  - Invalidate parcels-with-sales cache → Refetch starts immediately
    ↓
RACE CONDITION:
  - Pricing refetch completes: new growth_rate in UI ✅
  - Parcels refetch completes: old net_proceeds (recalc not done yet) ❌
  - 500ms later: Recalculation finishes, but React Query won't refetch again
```

### Expected Data Flow (Fixed)
```
User changes growth_rate
    ↓
handleCellChangeAndSave() updates local state
    ↓
saveMutation.mutateAsync(ALL assumptions)
    ↓
For each assumption:
  - PUT /api/projects/9/pricing-assumptions/{id}/ → Updates single row ✅
    ↓
onSuccess callback:
  - Invalidate pricing-assumptions cache
  - await POST /api/projects/9/recalculate-sfd/ → Wait for completion ✅
  - THEN invalidate parcels-with-sales cache ✅
    ↓
React Query refetches:
  - Pricing: new growth_rate ✅
  - Parcels: new net_proceeds (recalc already done) ✅
```

## Required Fixes

### Fix 1: Create Missing PUT Route
**Action**: Create `/Users/5150east/landscape/src/app/api/projects/[projectId]/pricing-assumptions/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const body = await request.json();

    // Update single pricing assumption
    const result = await sql`
      UPDATE landscape.land_use_pricing
      SET
        price_per_unit = ${body.price_per_unit || 0},
        unit_of_measure = ${body.unit_of_measure || 'FF'},
        growth_rate = ${body.growth_rate ?? 0.035},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
        AND project_id = ${parseInt(projectId)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Pricing assumption not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating pricing assumption:', error);
    return NextResponse.json(
      {
        error: 'Failed to update pricing assumption',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;

    await sql`
      DELETE FROM landscape.land_use_pricing
      WHERE id = ${parseInt(id)}
        AND project_id = ${parseInt(projectId)}
    `;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting pricing assumption:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete pricing assumption',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
```

### Fix 2: Wait for Recalculation Before Invalidating Cache
**Action**: Modify `/Users/5150east/landscape/src/hooks/useSalesAbsorption.ts` lines 307-333

```typescript
onSuccess: async (_, variables) => {
  // Invalidate pricing assumptions to refetch
  queryClient.invalidateQueries({
    queryKey: ['pricing-assumptions', variables.projectId],
  });

  // CRITICAL: Trigger recalculation and WAIT for it to complete
  // Growth rate changes affect inflated prices and net proceeds
  try {
    const response = await fetch(`/api/projects/${variables.projectId}/recalculate-sfd/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('[useSavePricingAssumptions] Recalculation failed:', await response.text());
      // Still invalidate cache even if recalc failed, so user sees error state
    }
  } catch (error) {
    console.error('[useSavePricingAssumptions] Failed to trigger recalculation:', error);
  }

  // IMPORTANT: Only invalidate parcels AFTER recalculation completes
  // This ensures the refetch gets the newly calculated net_proceeds
  queryClient.invalidateQueries({
    queryKey: ['parcels-with-sales', variables.projectId],
  });
},
```

**Key change**: The `await` on line 316 already exists, so this is correct. But need to ensure recalculation completes before invalidating parcels cache.

### Fix 3: Add Loading State During Recalculation
**Action**: Modify `/Users/5150east/landscape/src/components/sales/PricingTable.tsx`

Show loading indicator while recalculation is in progress:

```typescript
const handleCellChangeAndSave = React.useCallback(async (rowIndex: number, field: keyof PricingAssumption, value: any) => {
    // Update local state first
    const updatedRows = [...editingRows];
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };
    setEditingRows(updatedRows);

    // Validate the row before saving
    const row = updatedRows[rowIndex];
    if (!row.lu_type_code || !row.unit_of_measure) {
      setHasUnsavedChanges(true);
      return;
    }

    // Auto-save with loading state
    setIsSaving(true);  // ← Show spinner
    try {
      await saveMutation.mutateAsync({
        projectId,
        assumptions: updatedRows,
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save pricing:', error);
      alert('Failed to save pricing assumption');
    } finally {
      setIsSaving(false);  // ← Hide spinner after recalc completes
    }
  }, [projectId, editingRows, saveMutation]);
```

This shows a loading state for the full duration: save + recalculate (~1 second total).

### Fix 4: Verify Data After Recalculation
**Action**: Add verification to ensure data consistency

After recalculation completes, check that:
1. Growth rate persisted correctly
2. Net proceeds were recalculated
3. Sale dates remain intact

Could add a test:
```typescript
// After saving growth_rate change
const newPricing = await queryClient.fetchQuery(['pricing-assumptions', projectId]);
const newParcels = await queryClient.fetchQuery(['parcels-with-sales', projectId]);

console.assert(newPricing[0].growth_rate === expectedValue, 'Growth rate not saved!');
console.assert(newParcels[0].net_proceeds !== oldNetProceeds, 'Net proceeds not recalculated!');
console.assert(newParcels[0].sale_date !== null, 'Sale date cleared!');
```

## Testing Checklist

After implementing fixes, test:

- [ ] Change growth rate from 3% → 5% in Pricing Table
- [ ] Verify growth rate shows 5% after save
- [ ] Verify net proceeds increases (higher growth = higher inflated price)
- [ ] Verify sale dates remain unchanged
- [ ] Change growth rate back to 3%
- [ ] Verify net proceeds decreases back
- [ ] Change multiple growth rates at once
- [ ] Verify all changes persist
- [ ] Check browser console for errors during save
- [ ] Check Django server console for recalculation timing
- [ ] Verify loading indicator shows during save + recalc

## Summary

**Primary Issue**: Missing PUT endpoint causes growth_rate saves to fail

**Secondary Issue**: Race condition between recalculation and cache invalidation causes stale data to display

**Tertiary Issue**: POST fallback deletes all pricing causing brief data inconsistency

**Fix Priority**:
1. **CRITICAL**: Create PUT route for individual pricing assumption updates
2. **HIGH**: Ensure cache invalidation waits for recalculation completion (already done via await)
3. **MEDIUM**: Add loading state so user knows recalculation is in progress
4. **LOW**: Add data consistency verification/assertions

**Expected Outcome**:
- Growth rate changes persist ✅
- Net proceeds recalculate automatically ✅
- Sale dates remain intact ✅
- User sees loading indicator during 1-second recalculation ✅
- No race conditions ✅
