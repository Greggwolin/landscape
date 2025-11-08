# Session Notes

## Date: 2025-11-07

### Theme Tokenization & Top Navigation Refresh

**Objective**: Create a single source of truth for brand/surface/semantic colors, wire the tokens into CoreUI + Tailwind, and update the top navigation components to rely on the new variables instead of ad-hoc hex values.

**Highlights**:

1. **Token Source of Truth**
   - Added `src/styles/tokens.css` with light/dark values for brand, surfaces, text, overlays, parcel tiles, chips, and the new `--nav-*` variables.
   - Imported tokens at the top of `src/app/globals.css` so every layout automatically inherits the variables.
   - Introduced Tailwind helpers (`withVar`) in `tailwind.config.js` to expose `surface`, `text`, `line`, `brand`, `parcel`, and `chip` palettes for utility classes.

2. **CoreUI / Bootstrap Bridge**
   - Updated `src/styles/coreui-theme.css` to map Bootstrap & CoreUI variables to the tokens, including a dedicated “Top Navigation Bridge” for `--cui-header-*`.
   - Removed repurposed sidebar-specific colors; light/dark themes now derive header borders, text, and hover states from the nav tokens.

3. **Component Refactors**
   - Parcel & scenario chips now consume tokens (`src/styles/parcel-tiles.css`, `src/styles/scenarios.css`, `src/components/scenarios/ScenarioChipManager.tsx`, `src/components/budget/custom/BudgetGrid.css`, `src/app/components/Budget/BudgetContent.tsx`), eliminating hard-coded Tailwind colors.
   - Updated `src/app/components/TopNavigationBar.tsx` plus dropdowns (`SandboxDropdown`, `UserMenuDropdown`, `SettingsDropdown`) and `LandscaperChatModal` to reference `--nav-bg`, `--nav-border`, `--nav-text`, etc.
   - Navigation sidebar (`src/app/components/Navigation.tsx`) now uses nav tokens for background, borders, hover, and active states.
   - Added runtime theme awareness for the logo: light mode renders `public/logo-color.png`, dark mode keeps `logo-invert.png`.

4. **Assets & Housekeeping**
   - Ensured `public/logo-color.png` lives alongside `logo-invert.png` so the light theme logo loads correctly.
   - Enforced `data-theme` attribute from `CoreUIThemeProvider` to activate dark token overrides.

**Testing / Follow-Up**:
- ✅ Verified light/dark toggle swaps the nav background, text, and logo assets.
- ✅ Confirmed scenario chips/buttons inherit token colors in both themes.
- ⏳ Recommend running `pnpm lint && pnpm test` once UI smoke testing completes (not run yet).

### Area and Phase Filter Tiles Implementation (Budget & Sales Tabs)

**Objective**: Add visual filter tiles for Areas (Level 1 containers) and Phases (Level 2 containers) to Budget and Sales & Absorption tabs with cost rollup calculations and dynamic labeling.

**Features Implemented**:

1. **Budget Tab - FiltersAccordion Component**
   - Created collapsible accordion with Area and Phase filter tiles
   - Tiles display: name, acres, units, phase/parcel counts, and budget costs
   - Dynamic labeling based on Project Structure settings (e.g., "Village" vs "Area")
   - Color-coded tiles: Very dark colors for Level 1 (Areas), lighter pastels for Level 2 (Phases)
   - Visual selection state with checkmarks and border highlighting
   - Cascading filter logic: selecting an Area highlights child Phases
   - Responsive grid layout: fits 2-8 tiles per row based on screen size

2. **API Enhancement - Container Costs Endpoint**
   - Extended `/api/projects/[projectId]/containers` with `includeCosts` parameter
   - Queries `core_fin_fact_budget` table and rolls up costs through container hierarchy
   - Returns `direct_cost`, `child_cost`, and `total_cost` for each container
   - Recursive aggregation: child costs automatically bubble up to parents

3. **Hooks Created**
   - `useContainers()`: Fetches container hierarchy with optional cost data
   - Returns flattened arrays for areas, phases, and parcels with statistics
   - Filters out empty containers (0 acres and 0 units)

4. **Budget Filtering Logic**
   - Client-side filtering by selected Area/Phase container IDs
   - **Always shows project-level items** (items without container_id)
   - When area selected, automatically includes all child phases

5. **Budget Grouping Fix - Uncategorized Items**
   - Fixed issue where items without categories were hidden in grouped view
   - Created special "(Uncategorized)" group (category_id = -1) for uncategorized items
   - Uncategorized items now appear in their own expandable group

6. **Sales & Absorption Tab Updates**
   - Enhanced PhaseTiles component to support area filtering
   - Added cost display option with cost data from containers endpoint
   - Coordinated colors with parent areas

**Files Modified**:
- `/src/components/budget/FiltersAccordion.tsx` - New component for filter tiles
- `/src/components/budget/BudgetGridTab.tsx` - Integrated filters and fixed filtering logic
- `/src/hooks/useContainers.ts` - New hook for container hierarchy with costs
- `/src/hooks/useBudgetGrouping.ts` - Fixed to include uncategorized items
- `/src/app/api/projects/[projectId]/containers/route.ts` - Added cost rollup calculations
- `/src/components/sales/PhaseTiles.tsx` - Enhanced with area filtering and costs
- `/src/components/shared/AreaTiles.tsx` - Created reusable area tiles component

**Color Scheme**:
- Areas (Level 1): Very dark colors (#1A237E, #004D40, #BF360C, #3E2723, #263238, #880E4F, #1B5E20, #E65100)
- Phases (Level 2): Light pastel variants (#CE93D8, #A5D6A7, #FFCC80, #D7CCC8, #CFD8DC, #F8BBD0, #B2EBF2, #FFE082)
- Selected state: Darker border, enhanced background opacity, checkmark indicator
- Highlighted state: Yellow border when parent area selected

**Key Technical Details**:
- Next.js 15 async params compatibility maintained
- React Query for data fetching with 5-minute stale time
- CoreUI components for UI consistency
- Dynamic Project Structure labels via `useProjectConfig` hook
- Responsive Tailwind CSS grid layouts

**User Feedback Addressed**:
1. ✅ Removed duplicate tiles (filtered containers with 0 acres/units)
2. ✅ Changed accordion title from "Filters" to use dynamic labels (e.g., "Villages / Phases")
3. ✅ Made Level 1 tiles much darker to differentiate from Level 2
4. ✅ Fixed tile width to fit on one row
5. ✅ Fixed budget filtering to show ALL lines including ungrouped items
6. ✅ Fixed budget grouping to show uncategorized items in grouped view

**Testing Notes**:
- Tested with Project 7 (Peoria Lakes) which uses "Village" labels
- Verified cost rollups from budget data
- Confirmed cascading filters work correctly
- Verified uncategorized items appear in grouped view

---

## Date: 2025-11-05

### Project Type Code Data Consistency Fix

**Objective**: Resolve data inconsistency between Dashboard and Project Profile tile displays where project type information was showing different values in different views.

**Issue Reported**:
- Dashboard was showing project 18 as "Land Development"
- Project Profile tile was showing the same project as "Income Property, Class A Office"
- Similar inconsistency found in project 11

**Root Cause Analysis**:
- Dashboard displays project type based on `project_type_code` field from `landscape.tbl_project`
- Project Profile tile displays based on `analysis_type` and `property_subtype` fields
- Two projects had mismatched values between these fields:
  - Project 18 "Gainey Center II": Had `project_type_code='LAND'` but `analysis_type='Income Property'` with `property_subtype='Class A Office'`
  - Project 11 "Gern's Crossing Apartments": Had `project_type_code='MF'` but `analysis_type='Land Development'` with `property_subtype='Multifamily Development'`

**Files Analyzed**:
1. `src/app/dashboard/page.tsx` - Dashboard component using `project_type_code` field (lines 192-194)
2. `src/components/project/ProjectProfileTile.tsx` - Profile tile using `analysis_type` and `property_subtype` fields (lines 100-106)
3. `src/app/api/projects/route.ts` - Projects API endpoint fetching data from database
4. `src/app/api/projects/[projectId]/profile/route.ts` - Profile API endpoint

**Database Schema Fields**:
- `project_type_code`: Standard Migration 013 codes (LAND, MF, OFF, RET, IND, HTL, MXU)
- `analysis_type`: Human-readable analysis category ("Land Development" or "Income Property")
- `property_subtype`: Detailed property classification ("Master Planned Community", "Class A Office", etc.)
- `property_class`: Additional classification (e.g., "A", "B", "C" for income properties)

**Data Corrections Applied**:
```sql
-- Fixed Project 18 (Gainey Center II)
UPDATE landscape.tbl_project
SET project_type_code = 'OFF', updated_at = NOW()
WHERE project_id = 18;
-- Changed from: LAND → OFF (to match Income Property / Class A Office)

-- Fixed Project 11 (Gern's Crossing Apartments)
UPDATE landscape.tbl_project
SET project_type_code = 'LAND', updated_at = NOW()
WHERE project_id = 11;
-- Changed from: MF → LAND (to match Land Development / Multifamily Development)
```

**Verification**:
- Ran consistency check across all 10 projects in database
- All projects now have matching `project_type_code` and `analysis_type` values
- Project 8 "Red Valley Master-Planned Community" was already correct (LAND / Land Development)

**Impact**:
- Dashboard and Project Profile tile now show consistent information
- Users can trust both views to display accurate project type data
- Fixes potential confusion when navigating between different project views

**Technical Details**:
- Dashboard uses `PROPERTY_TYPE_LABELS` mapping to convert codes to display labels
- Profile API joins `tbl_project` with `tbl_msa` for location data
- Both components fetch from different API endpoints but should show aligned data
- No code changes required - this was a data-only fix

**Testing Performed**:
- ✓ Queried project 8, 11, 17, 18 data before and after fixes
- ✓ Verified all 10 projects have consistent type codes
- ✓ Confirmed Migration 013 standard codes are correctly applied

**Next Steps**:
1. Browser refresh required for users to see updated data
2. Consider adding validation constraint to prevent future mismatches
3. May want to add a data consistency check to prevent this issue in future migrations

---

### Market Assumptions Sandbox Consolidation

**Objective**: Restore the legacy Peoria Lakes market assumptions experience (inflation steps, commissions, contingency inputs, etc.) and expose it through the Sandbox navigation so analysts can revisit the imported Excel model.

**Work Summary**:
- Located the legacy `MarketAssumptions` client module and confirmed it still renders the Peoria Lakes data set when provided `projectId = 7`.
- Added a dedicated sandbox route `src/app/market-assumptions/page.tsx` that renders `MarketAssumptions` with the Peoria Lakes project preselected. (`commit`: new file)
- Extended the Sandbox dropdown (`src/app/components/navigation/constants.ts`) with a new entry “Market Assumptions (Peoria Lakes)” linking to `/market-assumptions`, alongside the previously added `/projects/7/assumptions` link.
- Resolved a Next.js build failure by correcting the relative import for `processUOMOptions` in `src/app/components/MarketAssumptions.tsx` (`../../lib/uom-utils`).

**File Inventory**:
1. `src/app/market-assumptions/page.tsx` – new sandbox entry point.
2. `src/app/components/navigation/constants.ts` – added dropdown link for Market Assumptions sandbox (and retained Peoria-specific links).
3. `src/app/components/MarketAssumptions.tsx` – fixed utility import path.

**User Workflow Notes**:
- Analysts can now open Sandbox → “Market Assumptions (Peoria Lakes)” to review and edit commission, contingency, legal fee, and inflation schedules without navigating through the main project tabs.
- The existing `/projects/7/assumptions` link remains for the modern assumptions UI; the sandbox points at the legacy Peoria Lakes layout specifically requested earlier in the project.

**Testing Checklist**:
- [ ] Manually load `/market-assumptions` in the browser and confirm the Peoria Lakes data set renders (market factors, growth rates, land pricing, inflation steps).
- [ ] Exercise navigation via the Sandbox dropdown to ensure the new link closes the dropdown and routes correctly.
- [ ] Smoke-test `MarketAssumptions` interactions (edits, save button state, modal flows) to verify they behave as before.
- [ ] Re-run automated lint/build (`pnpm lint`, `pnpm build`) once UI verification is complete. *(Not run yet; changes are UI-only.)*

**Technical Details**:
- The `MarketAssumptions` component expects `processUOMOptions` from `src/lib/uom-utils.tsx`; Turbopack surfaced the incorrect relative path when the sandbox page was added. Updating the import ensures tree-shaking works in both node/browser bundles.
- The sandbox route is a simple client wrapper (`use client`) returning the existing component. No new API endpoints were required.
- Navigation constants remain the single source for sandbox links; ordering keeps Peoria Lakes resources grouped together.

**Next Steps for Deployment**:
1. QA the new sandbox route in a local browser session (Chrome + Safari) to verify there are no hydration warnings.
2. Run the build pipeline to ensure Next.js and Turbopack succeed with the updated import.
3. Confirm the navigation link appears in staging; if role-based filters exist, ensure the sandbox dropdown remains developer-only.
4. After validation, merge and promote to staging so analysts regain access to the Peoria Lakes assumptions reference prior to broader release.

---

## Date: 2025-10-26

### Custom Inflation Rate Mechanism - Needs Work

**Status**: Implementation incomplete, needs debugging and refinement

**Issues Identified**:
1. Tab navigation through step fields not auto-selecting content as expected
2. Dynamic step addition/removal logic may not be triggering correctly
3. Save/cancel behavior needs verification
4. General layout and user flow needs testing

**Current Implementation**:
- Location: `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx`
- Component: StepRateTable in `src/app/prototypes/multifam/rent-roll-inputs/components/StepRateTable.tsx`
- Modal opens with single blank step (Step 1)
- Should dynamically add steps when both Rate and Periods are filled
- Should remove subsequent steps when "E" entered in Periods field
- Rate field should only accept numbers (no "E")
- Periods field accepts numbers or "E"

**Expected Behavior**:
1. Modal starts with Step 1 (blank Rate and Periods)
2. When user fills both Rate AND Periods → Step 2 appears
3. When user enters "E" in Periods → that becomes final step, no more steps added
4. If "E" entered on earlier step (e.g., Step 2), Steps 3+ should disappear
5. Tab navigation should enter edit mode and auto-select field contents
6. Save button should save immediately without confirmation
7. ESC/Cancel should close without prompting

**Display Format**:
- General inflation shows as: "Inflation: General [2.5] % [Custom button]"
- Custom schedules show as: "Inflation: {Name} [Custom box] [Edit] [Delete]"
- Each custom schedule on its own row below General

**Next Steps**:
- Test modal opening and field interaction
- Verify tab navigation auto-selects content
- Test dynamic step addition when filling Rate and Periods
- Test "E" entry removing subsequent steps
- Verify save persists schedule with correct name
- Test edit existing schedule flow

**Related Files**:
- `/Users/5150east/landscape/src/app/projects/[projectId]/components/tabs/ProjectTab.tsx` - Main modal and state management
- `/Users/5150east/landscape/src/app/prototypes/multifam/rent-roll-inputs/components/StepRateTable.tsx` - Step input table component
- `/Users/5150east/landscape/src/types/assumptions.ts` - Type definitions (if needed)

**Technical Debt**:
- Consider extracting inflation modal to separate component
- Consider using React Hook Form for better form state management
- Add backend persistence API endpoint
- Add loading states during save operation
