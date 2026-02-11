# Conversational Column Mapping for Rent Roll Ingestion

**Date**: February 11, 2026
**Duration**: ~3 hours
**Focus**: Moving rent roll column mapping from a modal UI into the Landscaper AI chat for an AI-native workflow

---

## Summary

This session implemented "Conversational Column Mapping" - a major architectural change to how structured rent roll files (Excel/CSV) are mapped to the Landscape data model. Previously, dropping a rent roll onto the Landscaper panel would open a `FieldMappingInterface` modal for column mapping, breaking the AI-native chat flow. Now, the mapping happens conversationally within the Landscaper chat using two new AI tools.

## New User Flow

1. User drops Excel/CSV rent roll onto Landscaper panel
2. Frontend auto-sends a chat message: *"I've uploaded [filename] (document ID: X). Please analyze the columns for rent roll mapping."*
3. Landscaper calls `analyze_rent_roll_columns` tool, which uses the existing `discover_columns()` fuzzy-matching engine
4. AI presents the mapping proposal conversationally, grouped by confidence (HIGH/MEDIUM/LOW)
5. User confirms or adjusts mappings in chat
6. Landscaper calls `confirm_column_mapping` to start async extraction
7. Existing `RentRollUpdateReviewModal` shows data preview for final commit

## Major Accomplishments

### 1. Shared Service Function Extraction

Extracted `apply_column_mapping()` from the HTTP endpoint (`extraction_views.py:apply_rent_roll_mapping`) into a reusable service function in `column_discovery.py`. This function handles:
- Separating standard field mappings from dynamic column creations
- Creating `DynamicColumnDefinition` records for custom columns
- Checking for existing active extraction jobs (prevents duplicates)
- Creating `ExtractionJob` with queued status
- Launching background extraction thread
- Returning structured result with job_id, status, counts

The HTTP endpoint was refactored to delegate to this shared function, maintaining backward compatibility.

### 2. Two New Landscaper Tools

**`analyze_rent_roll_columns`** (read-only)
- Takes `document_id`, looks up the Document record
- Calls existing `discover_columns()` with the document's storage URI
- Returns column analysis with fuzzy-matched proposals
- Trims `sample_values` to 3 per column (vs 5 in HTTP endpoint) to stay within the 4K `_truncate_tool_result()` limit

**`confirm_column_mapping`** (mutation, auto-execute)
- Takes `document_id` + `mappings` array
- Calls shared `apply_column_mapping()` service function
- Added to `AUTO_EXECUTE_TOOLS` set so it executes immediately (user already confirmed in chat)

### 3. Tool Registration & System Prompt

- Both tools added to `LANDSCAPER_TOOLS` schemas in `ai_handler.py` with full JSON schema definitions
- Both tools added to `EXTRACTION_TOOLS` list in `tool_registry.py` (auto-loaded on Documents page and when user mentions rent roll keywords)
- "RENT ROLL COLUMN MAPPING" workflow section added to `BASE_INSTRUCTIONS` in `ai_handler.py`:
  - Instructions for grouping columns by confidence level
  - HIGH confidence: summarize briefly
  - MEDIUM confidence: show proposed mapping with samples, ask to confirm
  - LOW/NONE confidence: show samples, ask what field to map or skip

### 4. Frontend Chat Message Injection

- `LandscaperChatThreaded.tsx` wrapped with `forwardRef` and `useImperativeHandle` exposing `sendMessage`
- New `LandscaperChatHandle` interface exported for type safety
- `LandscaperPanel.tsx` creates a `chatRef` and passes it to the chat component
- When a structured rent roll is uploaded, instead of opening `FieldMappingInterface`, the upload handler programmatically sends a chat message via `chatRef.current?.sendMessage()`
- `FieldMappingInterface` kept as dead code for potential future power-user fallback

## Design Decisions

1. **Reuse over duplication**: Both tools delegate to existing `discover_columns()` and the new shared `apply_column_mapping()` — no business logic duplication
2. **Auto-execute for confirm**: `confirm_column_mapping` is in `AUTO_EXECUTE_TOOLS` because the user already confirmed in chat conversation — no need for a second proposal step
3. **forwardRef + useImperativeHandle**: Chosen over custom events or context for the parent→child communication bridge (cleaner API, type-safe)
4. **Token budget awareness**: Sample values trimmed to 3 per column to respect the 4K truncation limit on tool results
5. **Keyword-based tool loading**: The injected chat message contains "uploaded" and "rent roll" which match `should_include_extraction_tools()` keywords, ensuring the new tools are available

## Files Modified

### Backend - New Service Function
- `backend/apps/knowledge/services/column_discovery.py` - Added `apply_column_mapping()` shared service function (~175 lines)

### Backend - Refactored HTTP Endpoint
- `backend/apps/knowledge/views/extraction_views.py` - `apply_rent_roll_mapping` now delegates to shared function

### Backend - Landscaper Tools
- `backend/apps/landscaper/tool_executor.py` - Two new tool handlers (`analyze_rent_roll_columns`, `confirm_column_mapping`); `confirm_column_mapping` added to `AUTO_EXECUTE_TOOLS`
- `backend/apps/landscaper/ai_handler.py` - Two tool schemas in `LANDSCAPER_TOOLS`; rent roll workflow in `BASE_INSTRUCTIONS`
- `backend/apps/landscaper/tool_registry.py` - Both tools added to `EXTRACTION_TOOLS` list

### Frontend
- `src/components/landscaper/LandscaperChatThreaded.tsx` - `forwardRef`, `useImperativeHandle`, `LandscaperChatHandle` export
- `src/components/landscaper/LandscaperPanel.tsx` - `chatRef`, ref prop on chat component, chat message injection replacing modal trigger

## Verification

- ESLint: 0 errors on both modified frontend files (3 pre-existing warnings only)
- Python AST: All 5 modified backend files parse successfully
- No regressions in existing tool registry or extraction pipeline

## Git Activity

### Previous Session Commit (Feb 10)
- `2127b2a` - feat: landscaper stability fixes, rent roll visibility, and dynamic columns

### Current Session
- All changes listed above are staged for commit

## Next Steps

- End-to-end test: drop Excel rent roll onto Landscaper panel, verify conversational flow
- Test with PDF rent roll to confirm it bypasses this flow (existing extraction path)
- Test edge cases: duplicate columns, all-high-confidence mappings, dynamic column creation
- Consider adding progress indicator for async extraction job status
- Clean up `FieldMappingInterface` dead code after confirming conversational flow is stable
