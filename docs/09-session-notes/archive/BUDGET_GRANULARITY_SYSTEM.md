# Budget Granularity System - Complete Reference

**Status**: ✅ Production Ready (100%)
**Last Updated**: November 17, 2025
**Session**: LD19

---

## Overview

The budget granularity system provides **three levels of detail** for budget items, enabling users to choose the appropriate complexity level for their needs:

- **Napkin Mode** (9 fields) - Quick estimates and concept planning
- **Standard Mode** (28 fields) - Professional budgets with timing and cost controls
- **Detail Mode** (49 fields) - Enterprise-grade with full ARGUS Developer parity

---

## Mode Comparison

| Feature | Napkin | Standard | Detail |
|---------|--------|----------|--------|
| **Fields (Total)** | 9 | 28 | 49 |
| **Inline Fields** | 9 | 10 | 10 |
| **Expandable Fields** | 0 | 18 (3 groups) | 39 (7 groups) |
| **Use Case** | Quick estimates | Professional budgets | Full project control |
| **Typical User** | Acquisition team | Development managers | Finance directors |
| **Time to Input** | 30 seconds | 2-3 minutes | 5-10 minutes |
| **Integration** | None | Timing & cost controls | Full CPM/funding integration |

---

## Field Breakdown by Mode

### Napkin Mode (9 fields)

All fields inline in grid:

1. **notes** - Description
2. **qty** - Quantity
3. **uom_code** - Unit of measure
4. **rate** - Rate per unit
5. **amount** - Calculated total (qty × rate)
6. **start_period** - Start period
7. **periods_to_complete** - Duration
8. **end_period** - End period (computed)
9. **Category hierarchy** - L1/L2/L3/L4 categories

---

### Standard Mode (28 fields)

**Inline (10 fields):**
- All Napkin fields plus:
- Container (area/phase)

**Expandable Groups (18 fields in 3 groups):**

#### Group 1: Timing & Escalation (8 fields)
- start_date
- end_date
- timing_method (Fixed/Milestone/S-Curve)
- escalation_rate
- escalation_method
- curve_profile
- curve_steepness
- dependency_count

#### Group 2: Cost Controls (6 fields)
- contingency_pct
- confidence_level
- vendor_name
- contract_number
- purchase_order
- is_committed

#### Group 3: Notes & Classification (4 fields)
- scope_override
- cost_type
- tax_treatment
- internal_memo

---

### Detail Mode (49 fields)

**Inline (10 fields):**
- Same as Standard mode

**Expandable Groups (39 fields in 7 groups):**

All Standard mode groups (18 fields) plus:

#### Group 4: Advanced Timing/CPM (11 fields)
- baseline_start_date
- baseline_end_date
- actual_start_date
- actual_end_date
- percent_complete
- status
- is_critical
- float_days
- early_start_date
- late_finish_date
- milestone_id

#### Group 5: Financial Controls (10 fields)
- budget_version
- version_as_of_date
- funding_id
- funding_draw_pct
- draw_schedule
- retention_pct
- payment_terms
- invoice_frequency
- cost_allocation
- is_reimbursable

#### Group 6: Period Allocation (5 fields)
- allocation_method
- cf_start_flag
- cf_distribution
- allocated_total
- allocation_variance

#### Group 7: Documentation & Audit (10 fields)
- bid_date
- bid_amount
- bid_variance
- change_order_count
- change_order_total
- approval_status
- approved_by
- approval_date
- document_count
- last_modified_by
- last_modified_date

---

## Property Type Filtering

### Land Development Projects

For land development projects (LD-RES, LD-COM, LD-MIX, LD-IND, LD-OTH):
- **Napkin**: 9 fields (no change)
- **Standard**: 28 fields (no change)
- **Detail**: **38 fields** (11 CPM fields hidden)

**Hidden Fields (Group 4: Advanced Timing/CPM):**
1. baseline_start_date
2. baseline_end_date
3. actual_start_date
4. actual_end_date
5. percent_complete
6. status
7. is_critical
8. float_days
9. early_start_date
10. late_finish_date
11. dependency_count

**Rationale:**
Land development projects typically don't use Critical Path Method (CPM) scheduling. These fields are more appropriate for vertical construction projects managed through project management software like MS Project or Primavera.

---

## Mode Persistence

**Current Implementation:** localStorage-backed

**Storage Key:** `budget_mode_${projectId}`

**Behavior:**
- Mode persists across page reloads
- Project-scoped (each project remembers its own mode)
- Browser-specific (does not sync across devices)
- Survives browser refresh but not localStorage clearing

**Future Enhancement:**
When authentication is configured, mode can be upgraded to database-backed persistence with cross-device synchronization.

---

## User Interface

### Mode Selector

**Location:** Top of Budget Grid tab

**Design:** Badge-style toggle

**Colors:**
- Napkin: Green (Success)
- Standard: Yellow (Warning)
- Detail: Red (Danger)

**Display:** Shows field count for each mode
- Example: "Napkin (9)" | "Standard (28)" | "Detail (49)"

### Expandable Field Groups

**Trigger:** Arrow icon (▶/▼) in first column of each row

**Behavior:**
- Click arrow to expand/collapse field groups
- Groups shown as accordion sections
- Each section shows:
  - Group name
  - Field count badge
  - Color indicator (yellow for Standard, red for Detail)

**Layout:**
- 3-column responsive grid
- Auto-width for compact single-row sections
- Full-width for textarea fields (notes, memo)

---

## Technical Implementation

### File Structure

```
src/
├── types/
│   └── budget.ts                          # Complete type definitions
├── components/budget/
│   ├── config/
│   │   └── fieldGroups.ts                 # Field configuration & filtering
│   ├── fields/
│   │   └── FieldRenderer.tsx              # Universal field renderer
│   ├── custom/
│   │   └── ExpandableDetailsRow.tsx       # Accordion UI component
│   ├── BudgetGridTab.tsx                  # Mode state management
│   ├── BudgetDataGrid.tsx                 # Grid rendering
│   └── ModeSelector.tsx                   # Mode toggle UI
```

### Key Functions

**fieldGroups.ts:**
```typescript
// Get field groups for a mode
getFieldGroupsByMode(mode: BudgetMode): FieldGroup[]

// Check if field should be visible
shouldShowField(field: FieldConfig, item: BudgetItem, projectTypeCode?: string): boolean

// Get all fields for a mode (flat array)
getAllFieldsByMode(mode: BudgetMode): FieldConfig[]

// Count fields by mode
getFieldCountByMode(mode: BudgetMode): number
```

### Field Configuration Schema

```typescript
interface FieldConfig {
  name: keyof BudgetItem;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'dropdown' | 'date' | 'checkbox' | ...;
  mode: BudgetMode;
  group: string;
  editable: boolean;
  readonly?: boolean;
  computed?: boolean;
  width?: number;
  colWidth?: 'auto' | string;
  fullWidth?: boolean;
  validation?: ValidationRule;
  options?: SelectOption[];
  dependsOn?: string[];
  helpText?: string;
}
```

---

## Database Schema

**Table:** `landscape.core_fin_fact_budget`

**Columns:** All 49 fields plus standard metadata (created_at, updated_at, etc.)

**Migration:** `backend/migrations/002_budget_field_expansion.sql` (117 lines)

**Indexes:**
- idx_budget_status
- idx_budget_approval_status
- idx_budget_is_critical
- idx_budget_funding_id
- idx_budget_milestone_id

---

## API Endpoints

**Base Path:** `/api/financial/budget-items/`

**Operations:**
- GET /api/financial/budget-items/ - List all items
- POST /api/financial/budget-items/ - Create item
- GET /api/financial/budget-items/{id}/ - Get item details
- PATCH /api/financial/budget-items/{id}/ - Update item
- DELETE /api/financial/budget-items/{id}/ - Delete item

**Serializer:** `BudgetItemSerializer` (supports all 49 fields)

**File:** `backend/apps/financial/serializers.py`

---

## Usage Guidelines

### When to Use Each Mode

**Napkin Mode:**
- Initial feasibility studies
- Quick ROI calculations
- High-level comparisons
- Early-stage acquisitions
- Conceptual planning

**Standard Mode:**
- Active development projects
- Professional investor presentations
- Lender submissions (basic)
- Internal budgeting
- Timeline-sensitive projects

**Detail Mode:**
- Large-scale developments ($10M+)
- Institutional investor reporting
- Complex financing structures
- CPM-integrated projects (vertical construction)
- Audit-ready documentation
- Multi-phase master plans

### Recommended Workflow

1. **Start in Napkin** - Quick estimates during initial planning
2. **Upgrade to Standard** - When project gets greenlit
3. **Upgrade to Detail** - When construction starts or financing closes

**Note:** You can switch modes at any time. Data is preserved when switching to more detailed modes. When switching to simpler modes, detailed data remains in database but is hidden in UI.

---

## Field Dependencies

Some fields are conditionally visible based on other field values:

**S-Curve Fields:**
- `curve_profile` and `curve_steepness` only show when `timing_method = 'curve'`

**Milestone Dependencies:**
- `dependency_count` only shows when `timing_method = 'milestone'`

---

## Validation Rules

### Field-Level Validation

**Percentages:**
- escalation_rate: 0-20%
- contingency_pct: 0-100%
- confidence_level: 0-100%
- percent_complete: 0-100%

**Numeric Ranges:**
- qty: >= 0
- rate: >= 0
- amount: calculated (qty × rate)

**Required Fields:**
- notes (description)
- category_l1_id (top-level category)
- project_id (parent project)

---

## Performance Considerations

**Field Rendering:**
- Only visible fields are rendered (conditional rendering)
- Expandable groups use lazy rendering (accordion pattern)
- No impact on grid performance (fields outside grid)

**State Management:**
- Mode stored in localStorage (fast synchronous reads)
- Field values stored in React state with optimistic updates
- Debounced API calls for inline edits (300ms default)

**Network:**
- All 49 fields sent in single API response
- No additional requests for expandable fields
- Inline edits PATCH only changed field

---

## Testing

### Manual Testing Checklist

**Mode Persistence:**
- [ ] Switch to Standard mode, reload page → mode persists
- [ ] Switch projects → each project has independent mode
- [ ] Clear localStorage → mode resets to Napkin

**Property Type Filtering:**
- [ ] Create land development project → CPM fields hidden in Detail mode
- [ ] Create multifamily project → all fields visible in Detail mode
- [ ] Switch project type → fields adjust dynamically

**Field Visibility:**
- [ ] Napkin mode shows 9 inline fields only
- [ ] Standard mode shows expandable groups
- [ ] Detail mode shows all 7 groups
- [ ] S-curve fields only show when timing_method='curve'

### Automated Testing

**TypeScript:**
```bash
npx tsc --noEmit
```

**Unit Tests:** (Future)
- shouldShowField() logic
- getFieldGroupsByMode() output
- Field count validation

---

## Troubleshooting

### Mode not persisting
- **Check:** Browser localStorage enabled?
- **Check:** Private browsing mode?
- **Solution:** Enable localStorage or use regular browser window

### CPM fields showing for land project
- **Check:** projectTypeCode being fetched?
- **Check:** Project type matches LD-* codes?
- **Solution:** Verify project_type_code in database

### Fields not expanding
- **Check:** Mode is Standard or Detail?
- **Check:** Browser console for errors?
- **Solution:** Click arrow icon in first column

### Data lost when switching modes
- **Data is NOT lost** - it's preserved in database
- Switching to simpler mode just hides fields
- Switch back to Detail mode to see all data again

---

## Future Enhancements

### Planned (High Priority)
1. **Mode Transition Warnings** - Warn before switching to simpler mode
2. **Database-backed Persistence** - Cross-device mode sync (requires auth)
3. **Field Mode Indicators** - Badge showing which mode introduced each field

### Consideration (Medium Priority)
4. **Default Mode Configuration** - Admin panel for org/project defaults
5. **Bulk Edit** - Edit multiple items in Standard/Detail mode
6. **Field Usage Analytics** - Track which Detail fields are actually used

### Ideas (Low Priority)
7. **Tab-level Mode** - Different modes for different tabs
8. **Custom Field Sets** - User-defined field groupings
9. **Template Modes** - Save custom mode configurations

---

## Related Documentation

- `docs/SESSION_NOTES_2025_11_17.md` - Gap closure implementation
- `docs/BUDGET_FIELD_EXPANSION_IMPLEMENTATION.md` - Original 49-field spec
- `backend/migrations/002_budget_field_expansion.sql` - Database schema
- `src/types/budget.ts` - TypeScript type definitions
- `src/components/budget/config/fieldGroups.ts` - Field configuration

---

## Version History

| Date | Version | Changes | Session |
|------|---------|---------|---------|
| 2025-11-15 | 1.0 | Initial 49-field implementation | QW82 |
| 2025-11-16 | 1.1 | UI refinements and layout improvements | QW90 |
| 2025-11-17 | 2.0 | Mode persistence + property type filtering | LD19 |

---

**Status:** ✅ Production Ready (100%)
**Maintained By:** Development Team
**Contact:** See project documentation
