# Landscaper Stability & Rent Roll Visibility

**Date**: February 10, 2026
**Duration**: ~4 hours
**Focus**: Fixing Landscaper tool execution hangs, document extraction truncation, and dynamic column integration into the rent roll UI

---

## Summary

This session addressed multiple critical issues in the Landscaper AI system and rent roll visibility pipeline. The Landscaper was silently hanging during multi-unit update operations due to bloated tool results, no loop safeguards, and N+1 SQL queries. Additionally, the document extraction system was truncating Excel rent rolls to only show 10 of 113 units, and dynamic columns from the EAV system were not wired into the Configure Columns modal.

## Major Accomplishments

### 1. Landscaper Tool Execution Hang Fix

**Diagnostic Report**: Created `docs/audits/landscaper-diag-tool-hang.md` identifying root cause at the continuation Claude API call in the tool execution loop.

**Six fixes applied to `backend/apps/landscaper/ai_handler.py`:**

- **Tool result truncation** (`_truncate_tool_result()`) - Caps tool results at 4,000 chars with first/last halves preserved, preventing bloated context that exceeded Anthropic timeout
- **Loop iteration limit** (`MAX_TOOL_ITERATIONS=5`) + **time budget** (`MAX_TOOL_LOOP_SECONDS=75`) - Graceful break with final summary call when limits hit
- **Anthropic timeout** increased from 60s to 120s
- **Max tokens** increased from 2,048 to 16,384 with `stop_reason == "max_tokens"` user-facing warning
- **Permanent logging** - 12 `[Tool Loop]` log lines throughout the execution loop

**Batch SQL in `mutation_service.py`:**
- Replaced N+1 per-unit SQL pattern (4-5 queries x 40 units = 200 queries) with batched PostgreSQL operations using `UNNEST` arrays and `executemany` (~5 queries total)

**Frontend fixes:**
- Timeout increased from 90s to 150s in `useLandscaperThreads.ts`, `useLandscaper.ts`, `ChatInterface.tsx`
- Error display guard `!isLoading` removed in `LandscaperChatThreaded.tsx` so errors are always visible

### 2. Auto-Refresh After Landscaper Mutations

Added `useLandscaperRefresh` to three tabs that previously required manual browser refresh:
- **PropertyTab** - Watches `['units', 'leases', 'unit_types', 'project']`
- **ValuationTab** - Watches broad set of tables
- **ProjectTab** - Watches `['project', 'units', 'operating_expenses']`

Each tab's data-fetching function refactored from inside `useEffect` into a `useCallback` for reuse by the refresh hook.

### 3. Document Extraction Truncation Fix

**Root cause**: Three stacked truncation layers prevented Landscaper from seeing full rent rolls:

1. **`get_document_content()` showed only first 10 units** (hardcoded `[:10]`) - Changed to show ALL units/leases in compact markdown table format
2. **Excel files never generated `raw_text`** - Added `_generate_raw_text()` to `RentRollExtractor` that converts full DataFrame to tab-separated text
3. **`max_length` hard-capped at 15K** - Increased to 40K (safe because `_truncate_tool_result()` provides secondary safety net)

### 4. Dynamic Columns in Configure Columns Modal

Wired the existing EAV dynamic column system (`tbl_dynamic_column_definition` / `tbl_dynamic_column_value`) into PropertyTab's rent roll grid:

- Fetches dynamic columns via `useDynamicColumns(projectId, 'multifamily_unit')`
- Merges active columns into Configure Columns modal under **"Additional Fields"** category
- Green "Extra" badge distinguishes from blue "Input" and purple "Calc" columns
- Dynamic values rendered with proper formatting (currency, percent, date, boolean, text)
- Columns with data default to visible; "Reset to Defaults" preserves dynamic columns

### 5. Infinite Re-render Loop Fix

Fixed `Maximum update depth exceeded` error caused by `useEffect` hooks with unstable SWR object references:
- Added stable fingerprints via `useMemo` + `useRef` to prevent infinite `setColumns` loops
- Auto-hide effect uses unit ID fingerprint to run once per unit set

### 6. Floor Plan Column Now Editable

Changed floor plan from calculated (read-only) to editable input field in the rent roll grid.

## Files Modified

### Backend
- `backend/apps/landscaper/ai_handler.py` - Tool loop guards, truncation, timeout, max_tokens, logging
- `backend/apps/landscaper/services/mutation_service.py` - Batch SQL with UNNEST
- `backend/apps/landscaper/tool_executor.py` - Full unit/lease display, max_length 40K
- `backend/services/extraction/rent_roll_extractor.py` - `_generate_raw_text()` method

### Frontend
- `src/app/projects/[projectId]/components/tabs/PropertyTab.tsx` - Dynamic columns, floor plan edit, auto-hide fix
- `src/app/projects/[projectId]/components/tabs/ValuationTab.tsx` - useLandscaperRefresh
- `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx` - useLandscaperRefresh
- `src/hooks/useLandscaperThreads.ts` - Timeout 150s, improved error message
- `src/hooks/useLandscaper.ts` - Timeout 150s
- `src/hooks/useValueAddAssumptions.ts` - Syntax fix (malformed useCallback)
- `src/components/landscaper/ChatInterface.tsx` - Timeout 150s
- `src/components/landscaper/LandscaperChatThreaded.tsx` - Always-visible errors

### Documentation
- `docs/audits/landscaper-diag-tool-hang.md` - Diagnostic report (new)

## Git Activity

### Uncommitted Changes
All changes listed above are uncommitted, part of the current working session.

## Next Steps

- Test Landscaper with full 113-unit rent roll update end-to-end
- Add `useLandscaperRefresh` to remaining tabs (MarketTab, AcquisitionSubTab, RenovationSubTab)
- Re-process existing rent roll documents to populate `extracted_text` with new `raw_text` generation
- Consider adding dynamic column editing inline in the rent roll grid
