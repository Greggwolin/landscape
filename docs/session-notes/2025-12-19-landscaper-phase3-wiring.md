# Landscaper Phase 3 - Real Data & AI Wiring

**Date**: December 19, 2025
**Duration**: ~2 hours
**Focus**: Wiring Landscaper panel to real Django backend APIs and implementing activity feed infrastructure

---

## Summary

Completed Phase 3 of the Landscaper native UI integration, which connects the frontend chat and activity feed components to the Django backend. This phase establishes the data pipeline for AI-powered project analysis.

## Major Accomplishments

### 1. Chat API Connection (Next.js → Django) ✅
- Created Next.js API route to proxy chat requests to Django backend
- Transforms request format: frontend `{ message }` → Django `{ content }`
- Transforms response format: Django `{ assistant_message }` → frontend `{ content, messageId }`
- Django already had full chat infrastructure at `/api/projects/{id}/landscaper/chat/`

### 2. Activity Feed Real Data Infrastructure ✅

**Backend (Django):**
- Added `ActivityItem` model with fields: type, title, summary, status, confidence, link, blocked_by, details, highlight_fields
- Created `ActivityItemSerializer` with camelCase field mapping for frontend
- Added `ActivityFeedViewSet` with:
  - GET/POST for activities list
  - `mark_read` action for individual items
  - `mark_all_read` action for bulk updates
- Created `generate_activity_from_extraction()` helper for document processing integration

**Database:**
- Created migration `037_add_landscaper_activity.sql`
- Table includes indexes for project_id, created_at, is_read, and source tracking
- Seeded sample activities for Peoria Lakes project

**Frontend:**
- Created `useActivityFeed.ts` hook with React Query
- Includes optimistic updates for mark-as-read operations
- Auto-refresh every 60 seconds

### 3. Activity Item Click Navigation ✅
- Activity items navigate to linked pages when clicked
- Marks item as read via mutation
- Supports `?highlight=` query params for field highlighting

### 4. Field Highlighting System ✅
- Created `useFieldHighlight.tsx` hook
- Reads `?highlight=field1,field2` query parameter
- Provides `isHighlighted(fieldName)` check function
- Auto-clears highlights after 5 seconds
- Includes `HighlightWrapper` component for easy integration

### 5. Context-Aware System Prompts ✅
- Added `SYSTEM_PROMPTS` dictionary in `ai_handler.py` for each property type:
  - Land Development: lot pricing, absorption, infrastructure
  - Multifamily: rent roll, NOI, cap rates
  - Office: lease analysis, TI/LC costs
  - Retail: tenant sales, percentage rent
  - Industrial: clear heights, loading docks
- `get_system_prompt(project_type)` maps project codes to prompts
- Response generation uses project type for contextual advice

## Files Modified

### New Files Created:
- `src/app/api/projects/[projectId]/landscaper/chat/route.ts` - Chat API proxy
- `src/app/api/projects/[projectId]/landscaper/activities/route.ts` - Activities API proxy
- `src/hooks/useActivityFeed.ts` - React Query hooks for activities
- `src/hooks/useFieldHighlight.tsx` - Field highlighting utilities
- `migrations/037_add_landscaper_activity.sql` - Database migration

### Files Modified:
- `backend/apps/landscaper/models.py` - Added ActivityItem model
- `backend/apps/landscaper/serializers.py` - Added activity serializers
- `backend/apps/landscaper/views.py` - Added ActivityFeedViewSet
- `backend/apps/landscaper/urls.py` - Added activity endpoints
- `backend/apps/landscaper/ai_handler.py` - Context-aware system prompts
- `src/components/landscaper/ActivityFeed.tsx` - Uses real data with mock fallback
- `src/components/landscaper/ActivityFeedItem.tsx` - Updated types, added highlightFields

## Database Changes

New table: `landscape.landscaper_activity`
```sql
CREATE TABLE landscape.landscaper_activity (
    activity_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES tbl_project,
    activity_type VARCHAR(20) NOT NULL,  -- status, decision, update, alert
    title VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- complete, partial, blocked, pending
    confidence VARCHAR(20),  -- high, medium, low
    link VARCHAR(255),
    blocked_by TEXT,
    details JSONB,
    highlight_fields JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    source_type VARCHAR(50),
    source_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints Added

**Django Backend:**
- `GET /api/projects/{id}/landscaper/activities/` - List activities
- `POST /api/projects/{id}/landscaper/activities/` - Create activity
- `POST /api/projects/{id}/landscaper/activities/{id}/mark-read/` - Mark read
- `POST /api/projects/{id}/landscaper/activities/mark-all-read/` - Mark all read

**Next.js Proxy:**
- `GET/POST/DELETE /api/projects/[projectId]/landscaper/chat`
- `GET/POST /api/projects/[projectId]/landscaper/activities`

## Architecture Notes

### Data Flow
```
User clicks activity → handleActivityClick() → markRead mutation
                                              → router.push with ?highlight params

Frontend useActivityFeed → Next.js /api/projects/.../activities → Django backend
                                                                 ↓
                                                         ActivityFeedViewSet
                                                                 ↓
                                                         ActivityItem model
```

### System Prompt Selection
```
Project Type Code → get_system_prompt() → SYSTEM_PROMPTS dict
LAND → land_development prompt
MF   → multifamily prompt
OFF  → office prompt
etc.
```

## Next Steps

1. **Phase 4**: Integrate activity generation with document extraction pipeline
2. **Phase 5**: Connect to real Claude API for AI responses
3. **Phase 6**: Add activity generation for budget changes
4. **Phase 7**: Implement field highlighting in target components (budget grid, rent roll, etc.)

## Related Sessions
- Previous: Phase 1 & 2 Landscaper Panel implementation
- Next: Document extraction → activity generation integration
