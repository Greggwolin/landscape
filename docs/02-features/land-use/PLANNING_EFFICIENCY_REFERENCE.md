# Planning Efficiency Reference

## Overview

**Planning Efficiency** is a project-level multiplier used to account for land area lost to rights-of-way, open space, drainage, and other site constraints when calculating residential density. It allows density calculations to reflect actual developable land rather than gross acreage.

## Purpose

In land development, the **gross acreage** of a parcel includes all land, but not all of it can be used for housing units due to:
- Streets and roadways (rights-of-way)
- Open space requirements
- Drainage infrastructure
- Utility easements
- Common areas

Planning efficiency represents the percentage of gross land that is actually developable. For example:
- A planning efficiency of **0.75 (75%)** means 75% of the gross acreage can be developed with units
- The remaining 25% is allocated to infrastructure and common areas

## Storage Location

### Primary Storage: Project Level
- **Database Table**: `landscape.tbl_project`
- **Column**: `planning_efficiency`
- **Data Type**: `numeric(5,4)` (stores values like 0.8500)
- **Example**: A value of `0.8500` represents 85% planning efficiency

### Global Default
- **Database Table**: `landscape.core_planning_standards`
- **Column**: `default_planning_efficiency`
- **Data Type**: `numeric(5,4)`
- **Default Value**: `0.7500` (75%)
- Used when no project-specific value is set

## User Interface

### Planning Tab - Planning Overview Controls
**Location**: [src/app/components/Planning/PlanningOverviewControls.tsx](src/app/components/Planning/PlanningOverviewControls.tsx)

The planning efficiency input is located in the **"Other Parcel Standards"** tile on the Planning tab:

```typescript
// Input field shows percentage (0-150%)
<input
  type="number"
  min="0"
  max="150"
  value={efficiencyInput}  // Displayed as percentage (e.g., "85" for 85%)
  onChange={(e) => handleEfficiencyChange(e.target.value)}
  placeholder="75"
/>
```

**Data Flow**:
1. User enters a percentage value (e.g., "85" for 85%)
2. Frontend converts to decimal (85 → 0.85)
3. Saved to database via PUT `/api/project/granularity-settings`
4. Stored in `tbl_project.planning_efficiency` column

### Guidance Text
The UI displays this helpful description:
> "Accounts for rights-of-way, open space, drainage, and other site constraints when computing density."

## API Endpoints

### Save Planning Efficiency
**Endpoint**: `PUT /api/project/granularity-settings?project_id={id}`

```typescript
// Request body
{
  "level1Label": "Area",
  "level2Label": "Phase",
  "level3Label": "Parcel",
  "autoNumber": false,
  "planningEfficiency": 0.85  // Decimal value (0-1.5)
}

// Response
{
  "success": true
}
```

**Implementation**: [src/app/api/project/granularity-settings/route.ts](src/app/api/project/granularity-settings/route.ts)

### Load Planning Efficiency
**Endpoint**: `GET /api/projects/{projectId}/config`

```json
{
  "config": { ... },
  "settings": { ... },
  "planningEfficiency": "0.8500"  // String from database
}
```

**Implementation**: [src/app/api/projects/[projectId]/config/route.ts](src/app/api/projects/[projectId]/config/route.ts)

## React Hook Integration

The `useProjectConfig` hook provides planning efficiency to components:

```typescript
// src/hooks/useProjectConfig.ts
export function useProjectConfig(projectId?: number | null): ProjectConfigResult {
  // ... fetch logic ...

  const planningEfficiency = configResponse?.planningEfficiency ?? null

  return {
    config,
    settings,
    containers,
    labels,
    planningEfficiency  // Available to all consumers
  }
}
```

**Usage in Components**:
```typescript
const { planningEfficiency } = useProjectConfig(projectId)
// planningEfficiency is null | number (e.g., 0.85)
```

## Calculations Affected

### 1. DUA (Dwelling Units per Acre) - Planning Tab

**Location**: [src/app/components/Planning/PlanningContent.tsx:1390-1409](src/app/components/Planning/PlanningContent.tsx#L1390-L1409)

**Formula**:
```typescript
const efficiency = planningEfficiency ?? 1
const dua = units / (acres * efficiency)
```

**Example**:
- Parcel: 30 acres, 150 units
- Planning Efficiency: 0.85 (85%)
- Developable Acres: 30 × 0.85 = 25.5 acres
- **DUA Calculation**: 150 / 25.5 = **5.88 DUA**

Without planning efficiency (efficiency = 1):
- **Gross DUA**: 150 / 30 = 5.0 DUA

The planning efficiency **increases** the calculated density because it represents density on the developable portion of land (after removing ROW, open space, drainage, etc.).

**Display**: Shown in the "DUA" column of the Parcel Detail Table, formatted to 2 decimal places

**Business Logic**:
- Only calculated for residential parcels (family_name === 'Residential')
- Returns "—" for non-residential parcels
- Returns "—" if acres ≤ 0 or calculation is invalid

### 2. Parcel Detail Card Density Display

**Location**: [src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:298-305](src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx#L298-L305)

```typescript
const efficiency = planningEfficiency ?? 1
const density = formData.units / (formData.acres * efficiency)
```

The planning efficiency is used in the parcel detail flyout when users edit individual parcel information. This shows the density on developable land.

### 3. Product Density Calculations (Global)

**Location**: [src/app/api/products/helpers.ts](src/app/api/products/helpers.ts)

```typescript
export async function fetchPlanningEfficiency(): Promise<number | null> {
  const result = await sql`
    SELECT default_planning_efficiency
    FROM landscape.core_planning_standards
    WHERE is_active = true
    ORDER BY standard_id
    LIMIT 1
  `
  const value = result.rows?.[0]?.default_planning_efficiency;
  return value ? Number(value) : null;
}
```

This global planning efficiency is used when calculating density for products across the system.

## Valid Value Range

- **Minimum**: 0 (0%)
- **Maximum**: 1.5 (150%)
- **Typical Range**: 0.65 - 0.90 (65% - 90%)
- **Default**: 0.75 (75%)

Values above 1.0 (100%) are allowed to support scenarios where density bonuses or special zoning allows more units than standard calculations.

## Data Type Conversions

### Frontend → Database
```typescript
// User enters: 85
// Stored as: 0.8500

const efficiencyValue = Number(inputValue) / 100
// 85 / 100 = 0.85
```

### Database → Frontend
```typescript
// Database: 0.8500
// Displayed as: "85.0"

const displayValue = (dbValue * 100).toFixed(1)
// 0.85 * 100 = "85.0"
```

### Database → Calculation
```typescript
// Database: "0.8500" (string from postgres numeric)
// Calculation: 0.85 (number)

const multiplier = planningEfficiency ?? 1
// If null, defaults to 1 (100% efficiency)
```

## Recent Fixes (2025-11-20)

### Issue
Planning efficiency input was not saving when changed on the Planning tab.

### Root Cause
Database column name mismatch:
- Database used: `tier_1_label`, `tier_2_label`, `tier_3_label`
- API code used: `level1_label`, `level2_label`, `level3_label`

This caused INSERT/UPDATE queries to fail silently.

### Solution
1. Fixed column names in GET and PUT queries to use correct `tier_*_label` names with aliases
2. Removed `await loadSettings()` call after save to prevent race conditions
3. Local state is now trusted after successful save
4. SWR cache mutations ensure other components see updated values

### Files Modified
- [src/app/api/project/granularity-settings/route.ts](src/app/api/project/granularity-settings/route.ts)
- [src/app/api/projects/[projectId]/config/route.ts](src/app/api/projects/[projectId]/config/route.ts)
- [src/app/components/Planning/PlanningOverviewControls.tsx](src/app/components/Planning/PlanningOverviewControls.tsx)

## Testing Planning Efficiency

### Manual Test Steps
1. Navigate to a project's Planning tab
2. Locate the "Planning Overview" section
3. Find "Planning Efficiency" input in the "Other Parcel Standards" tile
4. Enter a value (e.g., 85)
5. Click "Apply Changes"
6. Verify success message appears
7. Check DUA column in Parcel Detail Table reflects the new efficiency

### Database Verification
```sql
-- Check saved value
SELECT project_id, project_name, planning_efficiency
FROM landscape.tbl_project
WHERE project_id = 7;

-- Expected: planning_efficiency = 0.8500 for 85% input
```

### API Test
```bash
# Save planning efficiency
curl -X PUT 'http://localhost:3000/api/project/granularity-settings?project_id=7' \
  -H 'Content-Type: application/json' \
  -d '{"level1Label":"Area","level2Label":"Phase","level3Label":"Parcel","autoNumber":false,"planningEfficiency":0.85}'

# Verify saved value
curl 'http://localhost:3000/api/projects/7/config' | grep planningEfficiency
```

## Related Documentation
- [Project Configuration Architecture](../../01-architecture/project-configuration.md)
- [DUA Calculation Standards](../financial-engine/density-calculations.md)
- [Land Use Taxonomy](./CATEGORIZATION_SYSTEMS_REFERENCE.md)

## Future Considerations

### Potential Enhancements
1. **Parcel-Level Efficiency**: Allow per-parcel efficiency overrides for irregular lots
2. **Historical Tracking**: Track efficiency changes over time for audit purposes
3. **Efficiency Templates**: Pre-defined efficiency values by project type (urban, suburban, rural)
4. **Validation Rules**: Warn when efficiency seems unusually high or low
5. **Calculation Transparency**: Show efficiency factor breakdown in DUA tooltips
