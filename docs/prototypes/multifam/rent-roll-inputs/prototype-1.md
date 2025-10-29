# Rent Roll & Unit Inputs - Prototype 1

**Created:** 2025-10-23
**Status:** Active
**Prototype ID:** `multifam-rent-roll-inputs`
**URL:** `/prototypes/multifam/rent-roll-inputs`

## Overview

A comprehensive rent roll management interface for multifamily properties that combines floor plan matrix inputs with market comparables analysis and detailed unit-level rent roll data. Designed to support both top-down (floor plan to units) and bottom-up (units to floor plan) data entry workflows.

## Key Features

- **Editable Floor Plan Matrix**: All fields editable (plan name, bed, bath, SF, unit count, rents)
- **AI Rent Analysis**: Landscaper analysis box showing market position and recommendations
- **Market Comparables**: Large map with compact comparison table
- **Detailed Rent Roll**: Unit-level data with inline editing, status tracking, lease dates
- **AI Indicators**: Visual indicators when user-entered market rent differs from AI estimate
- **Bidirectional Data Flow**: Supports both aggregation (units → floor plans) and distribution (floor plans → units)
- **Notes System**: Inline notes field for capturing feedback and observations

## Layout Structure

### Three-Panel Design (Inspired by Peoria Lakes Planning Overview)

**Upper Row (2 columns):**
- **Left (60% width)**: Floor Plan Matrix
  - Summary statistics (total units, avg current rent, avg market rent)
  - Editable table with 9 columns: Plan, Bed, Bath, SF, Units, Current, Market, Variance, Actions
  - Landscaper Analysis box below table with AI insights

- **Right (40% width)**: Comparable Rentals
  - Large map placeholder (h-80, 320px)
  - Compact comparison table with 5 columns: Property, Bed/Ba, SF, Dist, Rent

**Bottom Row (full width):**
- **Detailed Rent Roll**: Unit-level table with 11 columns
  - Unit, Plan, Bed, Bath, SF, Current Rent, Market Rent, Status, Tenant, Lease End, Actions
  - Inline editing for all fields
  - Color-coded status badges (Occupied/Vacant/Notice/Renewal)

## User Workflow

### Scenario 1: Bottom-Up (From Detailed Rent Roll)
1. User uploads broker package with complete unit-level rent roll
2. Landscaper populates Detailed Rent Roll table
3. System aggregates data upward into Floor Plan Matrix
4. AI analyzes and suggests market rents based on comparables
5. User reviews and adjusts aggregated values in matrix

### Scenario 2: Top-Down (From Floor Plan Matrix)
1. User has floor plan summary only (no unit details)
2. User enters bed/bath/SF/unit counts in Floor Plan Matrix
3. Landscaper suggests market rents based on comparables
4. System creates default unit records in Detailed Rent Roll
5. User fills in tenant-specific details as needed

### Scenario 3: Hybrid
1. Partial data exists in both sections
2. User can edit either section
3. Changes sync bidirectionally
4. AI validates consistency and flags discrepancies

## AI Integration Points

### 1. Document Analysis & Population
- Parse broker packages, rent rolls, lease abstracts
- Extract floor plan data and unit-level information
- Populate appropriate section based on document content
- Handle both structured (Excel) and unstructured (PDF) formats

### 2. Market Rent Estimation
- Analyze comparable properties from multiple sources
- Calculate AI-estimated market rent per floor plan
- Show visual indicators (↑↓) when user values differ from AI
- Provide explanation in Landscaper Analysis box

### 3. Data Validation & Aggregation
- Ensure floor plan totals match unit-level details
- Flag inconsistencies between sections
- Suggest corrections when discrepancies found
- Auto-calculate variance and revenue potential

### 4. Strategic Recommendations
- Identify units with highest rent gap potential
- Suggest phased rent increase strategy
- Forecast occupancy impact of rent changes
- Highlight renewal opportunities

## Technical Implementation

- **Framework:** Next.js 14, React 19, TypeScript
- **Styling:** Tailwind CSS with dark theme (gray-950/900/800 palette)
- **State Management:** React hooks (useState for local state)
- **Data Persistence:** API integration with `/api/prototypes/notes`
- **Key Components:**
  - Floor plan table with inline editing
  - Unit rent roll table with expandable edit rows
  - AI analysis box with purple theme
  - Notes autosave system

### Data Flow
1. Mock data loaded on component mount
2. Notes fetched from API on load
3. Edit actions update local state
4. Save actions persist via API (notes)
5. Future: Floor plan edits trigger unit updates and vice versa

## Design Decisions

### Why Three-Panel Layout?
Borrowed from successful Peoria Lakes Planning Overview pattern. Users praised the organization:
- Context at top (summary statistics)
- Related data side-by-side (floor plans + comparables)
- Detailed data below (full rent roll)

### Why Separate Bed/Bath Columns?
- User requested individual columns (not combined "1/1")
- Values populate as DVLs (Default Value Lists) in rent roll
- Cleaner data entry and editing
- Better for filtering and sorting

### Why AI Indicators in Market Rent?
- User needs to know when their estimate differs from AI
- Visual cue (↑↓) faster than reading analysis box
- Hover tooltip provides detailed explanation
- Balances user expertise with AI assistance

### Why Purple Theme for AI?
- Distinct from standard blue (actions) and green/red (status)
- Consistent with "Landscaper AI" branding
- Not alarming like red, not action-oriented like blue
- Easily identifiable as "AI-generated content"

## Alternatives Considered

### Single Table Approach
- **Rejected:** Too much data in one view, hard to scan
- Floor plans and units serve different purposes
- User needs both summary and detail simultaneously

### Cards Instead of Tables
- **Rejected:** Less data-dense, requires more scrolling
- Tables better for comparing multiple items
- Inline editing more natural in table format

### Separate Pages for Floor Plans vs Units
- **Rejected:** Context switching overhead
- User needs to see both to understand full picture
- Comparables inform both sections simultaneously

## Trade-offs

### Data Density vs Readability
- **Chose:** Higher density with careful spacing
- **Trade-off:** Slightly busier interface
- **Mitigation:** Clear visual hierarchy, alternating row colors, grouping

### Inline Editing vs Modal Forms
- **Chose:** Inline editing for quick changes
- **Trade-off:** Less room for validation/help text
- **Mitigation:** Save/Cancel clearly visible, status badges for context

### Bidirectional Sync Complexity
- **Chose:** Support both data entry directions
- **Trade-off:** More complex state management
- **Mitigation:** AI handles aggregation logic, flags conflicts

## User Feedback Summary

### What Works Well
✅ "Love the floor plan matrix layout - very scannable"
✅ Landscaper AI analysis box provides valuable context
✅ Comparables map is appropriately sized
✅ Inline editing feels natural
✅ Separate bed/bath columns work better than combined

### Pain Points
⚠️ Need to consider bidirectional workflow (floor plans ↔ units)
⚠️ AI indicators helpful but need to be more prominent

### Suggested Improvements
💡 Add visual indicators for data flow direction
💡 Show which section was the "source" of data
💡 Add batch edit capabilities for multiple units
💡 Include rent increase scenario modeling

## Iteration Notes

### 2025-10-23 - Initial Creation
- Created three-panel layout based on Peoria Lakes pattern
- Implemented floor plan matrix with full editing
- Added Landscaper analysis box
- Created comparables section with large map and compact table
- Built detailed rent roll with inline editing
- Added notes system for prototype feedback

### 2025-10-23 - User Feedback Session 1
**Key Insight:** Need bidirectional workflow support
> "need to consider landscaper workflow. if user provides a detailed broker package that contains a complete rent roll, landscaper would populate the detailed rent roll and 'roll up' those values into the floor plan matrix. Alternatively, the document uploaded may contain ONLY the floorplan matrix. Needs to work both ways."

**Action Items for Prototype 2:**
- Add visual indicators showing data flow direction
- Implement aggregation logic (units → floor plans)
- Implement distribution logic (floor plans → units)
- Show source of data (user-entered vs AI-calculated vs aggregated)
- Add conflict resolution UI when sections don't match

## Related Prototypes

- [Peoria Lakes Planning Overview](../../planning/overview.md): Inspiration for three-panel layout
- [Budget Grid](../../budget/grid.md): Similar table editing patterns

## Next Steps

### High Priority
1. **Add Data Flow Indicators**: Visual cues showing bottom-up vs top-down
2. **Implement Bidirectional Sync**: Floor plan changes update units, unit changes update floor plans
3. **Enhanced AI Indicators**: Make ↑↓ more prominent, add color coding
4. **Batch Operations**: Select multiple units for bulk rent updates

### Medium Priority
5. **Scenario Modeling**: "What if" rent increase impact calculator
6. **Export Functionality**: Generate reports from data
7. **Lease Expiration Timeline**: Visual calendar of upcoming renewals
8. **Filtering/Sorting**: By floor plan, status, lease date, etc.

### Low Priority
9. **Map Integration**: Real MapLibre implementation with markers
10. **Document Upload**: Direct upload of broker packages
11. **Automated Comparables**: Pull live data from APIs

## Migration to Production

### Ready for Production?
**Partial** - Layout and UI patterns are solid, needs backend integration

### What Needs to Change?

**Backend Integration:**
- Create MultiFam API endpoints for floor plans, units, leases
- Implement aggregation/distribution logic in Django
- Add validation for data consistency
- Create audit trail for rent changes

**AI Integration:**
- Connect to Landscaper AI for document parsing
- Implement comparable property analysis
- Add real-time rent estimation
- Build recommendation engine

**Testing:**
- Unit tests for aggregation logic
- Integration tests for bidirectional sync
- User acceptance testing with real broker packages
- Performance testing with 100+ units

**Security:**
- Add authentication/authorization
- Implement row-level security for multi-tenant
- Audit logging for compliance (rent changes tracked)

### Dependencies

**Must Exist First:**
- MultiFam Django models (Unit, UnitType, Lease, Turn)
- Property/Project association
- Document management system for uploads
- Landscaper AI document parsing pipeline

**Data Structures Required:**
- Floor plan definitions linked to units
- Market comparable data structure
- Lease/tenant information model
- Rent history tracking

## Screenshots

(To be added - capture screenshots of key states)

## Notes & Comments

All inline notes are automatically aggregated here from the notes API.

---

**2025-10-23 17:15** - Initial user feedback
> "need to consider landscaper workflow. if user provides a detailed broker package that contains a complete rent roll, landscaper would populate the detailed rent roll and 'roll up' those values into the floor plan matrix. Alternatively, the document uploaded may contain ONLY the floorplan matrix. Needs to work both ways."
