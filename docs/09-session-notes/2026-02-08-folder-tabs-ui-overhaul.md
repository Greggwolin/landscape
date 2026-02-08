# Folder-Tabs UI Overhaul — Page Consolidation, Media System, and Location Intelligence

**Date**: February 8, 2026
**Duration**: ~5 hours
**Focus**: Major restructuring of project navigation to folder-tab architecture, media system buildout, location intelligence expansion, and legacy page cleanup

---

## Summary

Completed a sweeping UI overhaul that consolidates 25+ legacy page routes into the folder-tab architecture, introduces a media asset system (picker, preview, classification), expands location intelligence with demographic views, adds property type tokens, and enhances the Landscaper chat with threaded improvements and media summaries. This is the largest single commit on the `feature/folder-tabs` branch — 148 files changed with ~95k additions and ~1.3k deletions.

## Major Accomplishments

### 1. Legacy Page Route Consolidation ✅
Removed 25+ legacy page routes that were superseded by the folder-tab query-param navigation system. All removed pages were archived to `src/app/_archive/` for reference:

**Archived routes:**
- `/projects/[projectId]/overview` → now served by `?folder=home&tab=summary`
- `/projects/[projectId]/planning/*` (market, land-use, budget + layout) → `?folder=property&tab=*`
- `/projects/[projectId]/development/*` (phasing, budget + layout) → `?folder=budget&tab=*`
- `/projects/[projectId]/analysis/*` (page, market-data, sensitivity) → `?folder=feasibility&tab=*`
- `/projects/[projectId]/results` → `?folder=feasibility&tab=returns`
- `/projects/[projectId]/opex`, `/opex-accounts` → `?folder=budget&tab=opex`
- `/projects/[projectId]/capitalization/operations`, `/waterfall` → `?folder=capital&tab=*`
- `/projects/[projectId]/valuation/*` (page, income-approach) → `?folder=valuation&tab=*`
- `/projects/[projectId]/documents/files` → `?folder=documents`
- `/projects/[projectId]/landscaper` → embedded panel
- `/projects/[projectId]/sales-marketing` → `?folder=budget&tab=sales`
- `/projects/[projectId]/acquisition` → `?folder=property&tab=acquisition`
- `/projects/[projectId]/validation` → dev tool removed
- `/parcel-test` → archived
- `/property/[id]` → archived (dead route)
- `/properties/[id]/analysis/*` → archived (dead route)
- `StudioContent.tsx` → renamed to `ProjectContentRouter.tsx`
- `StudioProjectBar.tsx` / `CollapsedLandscaperStrip.tsx` → moved to landscaper components

### 2. ProjectContentRouter (replaces StudioContent) ✅
- Renamed `StudioContent.tsx` to `ProjectContentRouter.tsx`
- Single unified component that renders folder-tab content based on query params
- Routes all `?folder=X&tab=Y` combinations to the correct tab components

### 3. ActiveProjectBar ✅
- New component replacing `StudioProjectBar`
- Project context display with project selector and quick actions
- Cleaner integration with the folder-tab layout

### 4. Media Asset System ✅
Built a complete media management subsystem:

- **`MediaPickerModal.tsx`** — Modal for selecting/attaching media assets to entities
- **`MediaPreviewModal.tsx`** — Full-screen media preview with metadata
- **`MediaCard.tsx`** — Card component for media grid display
- **`MediaBadgeChips.tsx`** — Inline badge chips for media type indicators
- **`MediaSummaryCard.tsx`** — Landscaper-integrated media summary display
- **`EntityMediaDisplay.tsx`** — Shared component for displaying entity-attached media

**Backend media services:**
- `backend/apps/documents/media_views.py` — Django views for media asset CRUD
- `backend/apps/knowledge/services/media_classification_service.py` — AI-powered media type classification
- `backend/apps/knowledge/services/media_extraction_service.py` — Media metadata extraction service

### 5. Location Intelligence Expansion ✅
- Expanded `LocationMap.tsx` with larger viewport and improved controls
- Enhanced `LocationMapFlyout.tsx` with demographic data display
- Updated `useDemographics.ts` hook with additional census fields
- Added new demographic-related views in `backend/apps/location_intelligence/views.py`
- Updated location intelligence types with new data fields

### 6. Property Type Tokens System ✅
- **`PropertyTypeBadge.tsx`** — Semantic badge component for property type display
- **`propertyTypeTokens.ts`** — Token configuration for all 7 property types (LAND, MF, OFF, RET, IND, HTL, MXU)
- **`PropertyTypeTokensSection.tsx`** — Style catalog section for property type tokens
- Updated `src/components/ui/landscape/index.ts` with new exports

### 7. Landscaper Chat Enhancements ✅
- `CollapsedLandscaperStrip.tsx` moved from `studio/` to `landscaper/` components
- Enhanced `LandscaperChatThreaded.tsx` with expanded thread management
- Updated `LandscaperChat.tsx`, `ChatMessageBubble.tsx`, `ActivityFeed.tsx`
- Added media summary integration via `MediaSummaryCard.tsx`
- Updated `ThreadList.tsx` with improved thread display
- Enhanced `LandscaperProgress.tsx` with richer status indicators
- Backend: expanded `ai_handler.py` and `tool_executor.py` with new capabilities

### 8. Capitalization UI Improvements ✅
- Major update to `LeveragedCashFlow.tsx` with expanded grid functionality
- Updated `DeveloperFeeModal.tsx` and `OverheadItemModal.tsx` with improved forms
- Enhanced `DebtFacilityModal.tsx`, `LoanScheduleGrid.tsx`, `MetricCard.tsx`
- Updated `WaterfallStructureTable.tsx`

### 9. Dashboard & Admin Updates ✅
- Redesigned `DashboardMap.tsx` with improved visualization
- Updated `dashboard/page.tsx` with layout changes
- Enhanced `ProjectTable.tsx` with new columns/features
- Updated `admin/changelog/page.tsx` and `admin/feedback/page.tsx`
- Enhanced `PicklistEditor.tsx` and `FeedbackLog.tsx`

### 10. Styles & Tokens ✅
- Updated `folder-tabs.css` with refined tab styling
- Updated `navigation.css` with new nav patterns
- Major refactor of `resizable-panel.css`
- Added styles to `leveraged-cf.css`
- Updated `coreui-theme.css` theme variables
- Added new design tokens to `tokens.css`

### 11. Income Property Cashflow Service ✅
- New `backend/apps/financial/services/income_property_cashflow_service.py`
- Python-based income property cash flow calculations
- Complements existing land dev cashflow service

## Files Modified

### New Files Created:
- `src/app/projects/[projectId]/ProjectContentRouter.tsx` (renamed from StudioContent)
- `src/app/projects/[projectId]/components/ActiveProjectBar.tsx`
- `src/components/dms/MediaBadgeChips.tsx`
- `src/components/dms/modals/MediaCard.tsx`
- `src/components/dms/modals/MediaPickerModal.tsx`
- `src/components/dms/modals/MediaPreviewModal.tsx`
- `src/components/landscaper/CollapsedLandscaperStrip.tsx`
- `src/components/landscaper/MediaSummaryCard.tsx`
- `src/components/shared/EntityMediaDisplay.tsx`
- `src/components/ui/landscape/PropertyTypeBadge.tsx`
- `src/config/propertyTypeTokens.ts`
- `src/app/components/StyleCatalog/PropertyTypeTokensSection.tsx`
- `backend/apps/documents/media_views.py`
- `backend/apps/financial/services/income_property_cashflow_service.py`
- `backend/apps/knowledge/services/media_classification_service.py`
- `backend/apps/knowledge/services/media_extraction_service.py`
- `docs/PAGE_INVENTORY_AUDIT.md`
- `docs/schema/landscape_rich_schema_2026-02-07.json`
- `star_valley_test_fixture.json`

### Files Modified (selected highlights):
- `src/app/projects/[projectId]/ProjectLayoutClient.tsx` — Wired new ProjectContentRouter + ActiveProjectBar
- `src/app/projects/[projectId]/layout.tsx` — Updated layout for folder-tab architecture
- `src/app/projects/[projectId]/page.tsx` — Updated to use new routing
- `src/app/dashboard/page.tsx` — Dashboard layout redesign
- `backend/apps/location_intelligence/views.py` — New demographic views
- `backend/apps/landscaper/ai_handler.py` — Expanded AI tool capabilities
- `backend/apps/landscaper/tool_executor.py` — New tool execution support
- 40+ more component and style files

### Files Archived (moved to `src/app/_archive/`):
- 25+ legacy page routes (see Section 1 above)
- `StudioProjectBar.tsx`, `CollapsedLandscaperStrip.tsx` from `studio/` folder

## Git Activity

### Branch: `feature/folder-tabs`

### Commit:
- `8aaa92c` — feat: folder-tabs UI overhaul — page consolidation, media system, and location intelligence
- 148 files changed, +95,187 / -1,253

## Next Steps
- Wire media picker into entity edit forms (parcels, leases, etc.)
- Complete media classification integration with Landscaper
- Add DSCR row to Leveraged Cash Flow when NOI data is available
- Test all folder-tab routes with multiple project types
- Consider removing `src/app/_archive/` after verification period
