# Global Benchmarks Library - Implementation Status

**Last Updated**: January 14, 2025

## Overview
The Global Benchmarks Library provides market intelligence data for commercial real estate analysis, including cost factors, growth rates, absorption velocity, and other market standards.

---

## Feature Status Summary

| Category | Status | CRUD | Notes |
|----------|--------|------|-------|
| **Transaction Costs** | ✅ Complete | Full | Create, edit, delete with validation |
| **Growth Rates** | ✅ Complete | Full | Flat and stepped rates with inline editing |
| **Contingency Standards** | 🟡 Partial | Create only | Display/edit in progress |
| **Absorption Velocity** | ✅ Complete | Full | Bulk import supported |
| **Unit Costs** | ✅ Complete | Full | Phase and work type categorization |
| **Market Timing** | ⚪ Not Started | - | Planned |
| **Land Use Pricing** | ⚪ Not Started | - | Planned |
| **Commission Structures** | ⚪ Not Started | - | Planned |
| **Op Costs** | ⚪ Not Started | - | Planned |
| **Capital Stack** | ⚪ Not Started | - | Planned |
| **Debt Standards** | ⚪ Not Started | - | Planned |

**Legend**: ✅ Complete | 🟡 Partial | 🟠 In Progress | ⚪ Not Started

---

## Detailed Implementation Status

### 1. Transaction Costs ✅

**Status**: Production Ready

**Features**:
- ✅ Create new transaction costs via inline form
- ✅ Edit existing transaction costs
- ✅ Delete with confirmation
- ✅ Three value types: Flat Fee ($$), Percentage (% of), Per Unit ($/Unit)
- ✅ Built-in protected benchmarks (closing costs, title insurance, legal, due diligence, broker fees)
- ✅ User-created benchmarks with blue "u" indicator
- ✅ Comma-formatted amounts with decimal preservation
- ✅ Right-aligned amount and type columns
- ✅ Validation for required fields and value ranges
- ✅ Success/error messaging

**Database**:
- Table: `landscape.tbl_benchmark_transaction_cost`
- Value precision: NUMERIC(12,2) - supports up to $9,999,999,999.99
- Fields: benchmark_id, cost_type, value, value_type, basis, deal_size_min, deal_size_max

**API Endpoints**:
- `POST /api/benchmarks` - Create
- `GET /api/benchmarks` - List all with category grouping
- `PATCH /api/benchmarks/[id]` - Update
- `DELETE /api/benchmarks/[id]` - Delete (soft delete if referenced)

**UI Location**: `/admin/benchmarks` → Transaction Costs accordion

**Recent Changes** (Jan 14, 2025):
- Fixed numeric overflow error (changed from NUMERIC(8,4) to NUMERIC(12,2))
- Removed page refreshes - accordions stay open on save/delete
- Added user-defined indicator (blue "u")
- Implemented sorting (built-in first, user-defined below)
- Added delete confirmation dialog
- Improved error handling with user-visible messages

---

### 2. Growth Rates ✅

**Status**: Production Ready

**Features**:
- ✅ Flat rates with inline percentage editing
- ✅ Stepped/variable rates with multi-period schedules
- ✅ Add new growth rate sets
- ✅ Edit stepped rate schedules
- ✅ Delete growth rate sets
- ✅ Auto-updated system rates (read-only)
- ✅ Period-based rate application (months 1-12, 13-24, etc.)
- ✅ Support for "E" (to end) periods
- ✅ Duplicate name detection with overwrite option
- ✅ Right-aligned percentage values
- ✅ Icon-based edit/delete (CoreUI cilPencil, cilX)

**Database**:
- Tables: `landscape.tbl_benchmark_growth_rate_set`, `landscape.tbl_benchmark_growth_rate_step`
- Rate storage: NUMERIC (decimal, not percentage - e.g., 0.03 for 3%)
- Step tracking: from_period, periods, thru_period, rate

**API Endpoints**:
- `POST /api/benchmarks/growth-rates` - Create set
- `GET /api/benchmarks/growth-rates` - List all sets
- `PUT /api/benchmarks/growth-rates/[id]` - Update set
- `DELETE /api/benchmarks/growth-rates/[id]` - Delete set

**UI Location**: `/admin/benchmarks` → Growth Rates accordion

**Recent Changes** (Jan 14, 2025):
- Replaced text Edit/Delete buttons with CoreUI icons
- Right-aligned all percentage values
- Improved input field alignment for inline editing
- Updated step table remove button to use cilX icon

---

### 3. Contingency Standards 🟡

**Status**: Partially Complete (Create only)

**Features**:
- ✅ Create new contingency percentages
- ✅ Simple name + percentage input
- ✅ Validation (0-100% range)
- ✅ Description field
- ⚠️ Display in list view (pending)
- ⚠️ Edit existing contingencies (pending)
- ⚠️ Delete contingencies (pending)

**Database**:
- Table: `landscape.tbl_benchmark_contingency`
- Created: January 14, 2025 (Migration 0019)
- Percentage precision: NUMERIC(5,2) - allows 0.00 to 999.99
- Constraint: CHECK (percentage >= 0 AND percentage <= 100)

**API Endpoints**:
- `POST /api/benchmarks` - Create (category='contingency')
- `GET /api/benchmarks` - List (includes contingency with LEFT JOIN)
- `PATCH /api/benchmarks/[id]` - Update percentage
- `PUT /api/benchmarks/[id]` - Full update
- `DELETE /api/benchmarks/[id]` - Delete

**UI Location**: `/admin/benchmarks` → Contingency Standards accordion

**Design Philosophy**:
- Intentionally simple - just name and percentage
- No complex options (can be added later without breaking changes)
- Focused on common use case: contingency % for budget line items

**Next Steps**:
1. Add display formatting for contingency list items (show percentage)
2. Implement edit form (similar to transaction costs)
3. Add delete functionality with confirmation
4. Integrate contingency application in budget calculations

---

### 4. Absorption Velocity ✅

**Status**: Production Ready

**Features**:
- ✅ Bulk import from CSV
- ✅ Create individual records
- ✅ Edit existing records
- ✅ Delete records
- ✅ Project type and market filtering
- ✅ Velocity in units per month
- ✅ Confidence scoring

**Database**:
- Table: `landscape.tbl_benchmark_absorption_velocity`
- Fields: project_type, market_name, submarket_name, velocity_units_per_month, unit_type, confidence_score

**API Endpoints**:
- `POST /api/benchmarks/absorption-velocity` - Create
- `POST /api/benchmarks/absorption-velocity/bulk-import` - Bulk import
- `GET /api/benchmarks/absorption-velocity` - List all
- `PATCH /api/benchmarks/absorption-velocity/[id]` - Update
- `DELETE /api/benchmarks/absorption-velocity/[id]` - Delete

**UI Location**: `/admin/benchmarks` → Absorption Velocity accordion

---

### 5. Unit Costs ✅

**Status**: Production Ready

**Features**:
- ✅ Create unit costs with UOM ($/SF, $/FF, $/CY, etc.)
- ✅ Edit existing unit costs
- ✅ Delete unit costs
- ✅ Cost phase categorization (site work, vertical construction, etc.)
- ✅ Work type categorization
- ✅ Value range support (low/high)

**Database**:
- Table: `landscape.tbl_benchmark_unit_cost`
- Value precision: NUMERIC(12,2)
- Fields: value, uom_code, uom_alt_code, low_value, high_value, cost_phase, work_type

**API Endpoints**:
- `POST /api/benchmarks` - Create (category='unit_cost')
- `PATCH /api/benchmarks/[id]` - Update
- `DELETE /api/benchmarks/[id]` - Delete

**UI Location**: `/admin/benchmarks` → (category-based accordion)

---

## Architecture

### Database Schema Pattern

```
tbl_global_benchmark_registry (parent)
  ├─ tbl_benchmark_transaction_cost (1:1)
  ├─ tbl_benchmark_unit_cost (1:1)
  ├─ tbl_benchmark_contingency (1:1)
  └─ (other category-specific tables)

Separate tables (independent):
  ├─ tbl_benchmark_growth_rate_set
  │   └─ tbl_benchmark_growth_rate_step (1:many)
  └─ tbl_benchmark_absorption_velocity
```

### API Pattern

**List All Benchmarks**:
```typescript
GET /api/benchmarks
Response: {
  benchmarks: Benchmark[],
  grouped_by_category: Record<string, number>,
  total: number
}
```

**Create Benchmark**:
```typescript
POST /api/benchmarks
Body: {
  category: 'transaction_cost' | 'unit_cost' | 'contingency',
  benchmark_name: string,
  value?: number,        // for transaction_cost, unit_cost
  percentage?: number,   // for contingency
  // category-specific fields...
}
```

**Update Benchmark**:
```typescript
PATCH /api/benchmarks/[id]  // Partial update
PUT /api/benchmarks/[id]    // Full replacement (legacy)
```

**Delete Benchmark**:
```typescript
DELETE /api/benchmarks/[id]
Response: {
  soft_delete: boolean,       // true if references exist
  references_found: number
}
```

### UI Component Pattern

**BenchmarkAccordion.tsx** - Generic accordion for registry-based benchmarks
- Handles transaction_cost, unit_cost, contingency
- Inline forms for add/edit
- Category-specific field configurations
- Shared validation and error handling

**Specialized Panels**:
- `GrowthRateCategoryPanel.tsx` - Growth rates with stepped schedules
- `AbsorptionVelocityPanel.tsx` - Absorption data with bulk import
- (Future specialized panels for other categories)

---

## Common Patterns

### Form Validation
```typescript
// Required fields
if (!formData.field.trim()) {
  setError('Field is required');
  return;
}

// Numeric range
const value = parseFloat(formData.field);
if (isNaN(value) || value <= 0) {
  setError('Enter valid amount > 0');
  return;
}

// Percentage range (contingency)
if (value < 0 || value > 100) {
  setError('Percentage must be 0-100');
  return;
}
```

### Number Formatting
```typescript
// Display format (comma-separated, preserve decimals)
const formatted = value.toLocaleString('en-US', {
  minimumFractionDigits: hasDecimals ? 2 : 0,
  maximumFractionDigits: 2
});

// Input sanitization
const cleaned = value.replace(/[^\d.]/g, '');
```

### Refresh Pattern
```typescript
// Parent provides refresh callback
<BenchmarkAccordion onRefresh={loadData} />

// Child calls on data change
if (response.ok) {
  onRefresh?.(); // Triggers parent reload without page refresh
}
```

---

## Known Issues & Limitations

### Technical Constraints

**Neon Database Limitations**:
- ❌ No transaction support via HTTP API
- Each query auto-commits individually
- Cannot rollback on error
- May leave partial data on multi-step operations

**Workarounds**:
- Design operations to be atomic where possible
- Clean up orphaned registry records manually if needed
- Consider migration to connection pooling for transaction support

### Functional Limitations

**Transaction Costs**:
- "% of what" (basis) field not yet functional
- No project usage tracking (can't prevent deleting referenced benchmarks)
- Simple delete only (no replacement workflow)

**Contingency Standards**:
- No edit/display in list view yet
- Not integrated with budget calculations
- Cannot apply contingencies to line items

**General**:
- No bulk import for transaction costs or contingencies
- No benchmark templates or presets
- No inflation adjustment for historical data
- No audit trail for benchmark changes

---

## Security & Authorization

**Current Status**:
- ⚠️ User ID hardcoded as '1' in API routes
- ⚠️ No authentication/authorization implemented
- ⚠️ All users can modify all benchmarks

**Prepared Infrastructure**:
- `created_by` and `updated_by` fields exist
- `user_id` field in registry table
- `is_global` flag for shared vs personal benchmarks

**Future Requirements**:
1. Implement proper user authentication
2. Add role-based access control (admin, editor, viewer)
3. Separate personal vs global benchmarks
4. Add benchmark sharing/permissions

---

## Performance Optimization

**Database**:
- ✅ Indexed foreign keys on all detail tables
- ✅ Efficient COALESCE for value retrieval across tables
- ✅ LEFT JOIN allows null detail records (no orphans)

**Frontend**:
- ✅ React.useMemo for sorted lists (prevents re-sorting)
- ✅ Optimistic UI updates (immediate feedback)
- ✅ Debounced auto-hide for messages
- ✅ Minimal re-renders with proper state management

**API**:
- ✅ Single query for list (no N+1 problems)
- ✅ Partial updates with PATCH (only changed fields)
- ✅ Efficient error responses with details

---

## Testing Status

### Automated Tests
- ⚪ Unit tests - Not implemented
- ⚪ Integration tests - Not implemented
- ⚪ E2E tests - Not implemented

### Manual Testing
- ✅ Transaction Costs - Thoroughly tested
  - Create, edit, delete workflows
  - Validation edge cases
  - Error handling
  - Refresh behavior
  - Formatting and alignment
- ✅ Growth Rates - Thoroughly tested
  - Flat rate inline editing
  - Stepped rate schedule management
  - Icon interactions
  - Right-alignment
- 🟡 Contingency Standards - Partially tested
  - Create workflow validated
  - Edit/delete pending
- ✅ Absorption Velocity - Tested
- ✅ Unit Costs - Tested

---

## Migration History

| # | Date | Description | Status |
|---|------|-------------|--------|
| 0018 | 2025-01-14 | Fix transaction cost value precision (8,4 → 12,2) | ✅ Applied |
| 0019 | 2025-01-14 | Create contingency standards table | ✅ Applied |

---

## Documentation

- ✅ Session notes: `docs/SESSION_NOTES_2025_01_14.md`
- ✅ Implementation status: `docs/02-features/BENCHMARKS_IMPLEMENTATION_STATUS.md` (this file)
- ✅ Database schema: Documented in migration files
- ✅ API documentation: Inline comments in route files
- ⚪ User guide: Not created
- ⚪ Admin guide: Not created

---

## Future Roadmap

### Phase 1: Complete Core Categories (Q1 2025)
1. ✅ Transaction Costs
2. ✅ Growth Rates
3. 🟡 Contingency Standards (finish edit/display)
4. ✅ Absorption Velocity
5. ✅ Unit Costs

### Phase 2: Expand Categories (Q2 2025)
6. Market Timing
7. Land Use Pricing
8. Commission Structures
9. Op Costs
10. Capital Stack
11. Debt Standards

### Phase 3: Enhanced Features (Q2-Q3 2025)
- Bulk import for all categories
- Benchmark templates and presets
- Inflation adjustment engine
- Usage tracking and analytics
- Advanced filtering and search
- Export to Excel/CSV

### Phase 4: Integration & Intelligence (Q3-Q4 2025)
- Apply benchmarks to project budgets
- Apply contingencies to line items
- AI-powered benchmark suggestions
- Market intelligence reporting
- Comparative analysis tools
- Historical trending

### Phase 5: Collaboration & Governance (Q4 2025)
- User authentication and authorization
- Personal vs global benchmarks
- Benchmark sharing and permissions
- Approval workflows
- Audit trail and version history
- Data quality scoring

---

## Support & Maintenance

**Bug Reports**: GitHub Issues
**Feature Requests**: GitHub Discussions
**Documentation**: `/docs` directory
**Database Migrations**: `backend/apps/financial/migrations/`

**Maintainers**:
- Development: Active
- Documentation: Up to date as of Jan 14, 2025
- Testing: Manual only

---

## Changelog

### January 14, 2025
- ✅ Fixed transaction cost numeric overflow (NUMERIC 8,4 → 12,2)
- ✅ Removed page refreshes (implemented onRefresh callback pattern)
- ✅ Added user-defined indicator (blue "u" badge)
- ✅ Implemented transaction cost sorting (built-in first)
- ✅ Added delete confirmation dialog
- ✅ Replaced text buttons with CoreUI icons (cilPencil, cilX)
- ✅ Right-aligned growth rate percentage values
- ✅ Created contingency standards table and basic CRUD
- ✅ Updated all API endpoints to support contingency category
- ✅ Removed BEGIN/COMMIT statements (Neon compatibility)
- ✅ Improved error handling with user-visible messages
- ✅ Added comprehensive session documentation

---

**End of Implementation Status Document**
