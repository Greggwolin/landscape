# User Preferences Persistence System - Phase 1 Implementation

**Status**: Implementation Complete (Database + Backend + Frontend)
**Date**: 2025-11-13
**Branch**: work

---

## Overview

Phase 1 implements a centralized user preference storage system to replace localStorage-based persistence. This provides:

- ✅ Database-backed preference storage with flexible JSON values
- ✅ Scoped preferences (global, project-specific, organization-specific)
- ✅ Django REST API for CRUD operations
- ✅ TypeScript API client with type safety
- ✅ React hooks with automatic sync and optimistic updates
- ✅ Migration helpers for localStorage → database transition

---

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   React Hooks   │ ───▶ │  TypeScript API  │ ───▶ │  Django REST    │
│  (Frontend UI)  │      │     Client       │      │      API        │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │   PostgreSQL    │
                                                    │ tbl_user_pref   │
                                                    └─────────────────┘
```

---

## Database Schema

### Table: `landscape.tbl_user_preference`

```sql
CREATE TABLE landscape.tbl_user_preference (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    preference_key VARCHAR(255) NOT NULL,
    preference_value JSONB NOT NULL DEFAULT '{}',
    scope_type VARCHAR(50) DEFAULT 'global',
    scope_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_preference
        UNIQUE (user_id, preference_key, scope_type, scope_id)
);
```

**Indexes**:
- `idx_user_preference_user_id` on `user_id`
- `idx_user_preference_scope` on `(scope_type, scope_id)`
- `idx_user_preference_key` on `preference_key`
- `idx_user_preference_updated` on `updated_at DESC`

**Common preference_key patterns**:
- `theme` - UI theme settings
- `budget.grouping` - Budget grid grouping state
- `budget.filters` - Budget filter preferences
- `budget.columns` - Column visibility/order
- `grid.pageSize` - Grid pagination settings
- `map.defaults` - Map view defaults

---

## Backend (Django)

### Models

**File**: `backend/apps/projects/models_user.py`

```python
class UserPreference(models.Model):
    """
    User preferences with flexible JSON storage.
    Supports global and scoped (project/org-specific) preferences.
    """

    SCOPE_GLOBAL = 'global'
    SCOPE_PROJECT = 'project'
    SCOPE_ORGANIZATION = 'organization'

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    preference_key = models.CharField(max_length=255)
    preference_value = models.JSONField(default=dict)
    scope_type = models.CharField(max_length=50, default=SCOPE_GLOBAL)
    scope_id = models.IntegerField(null=True, blank=True)
    # timestamps...

    @classmethod
    def get_preference(cls, user, key, scope_type='global', scope_id=None, default=None):
        """Retrieve a preference value."""

    @classmethod
    def set_preference(cls, user, key, value, scope_type='global', scope_id=None):
        """Set or update a preference value."""

    @classmethod
    def get_all_for_user(cls, user, scope_type=None, scope_id=None):
        """Get all preferences for a user."""
```

### API Endpoints

**Base URL**: `/api/user-preferences/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user-preferences/` | List all user preferences (filterable) |
| GET | `/api/user-preferences/{id}/` | Get specific preference by ID |
| GET | `/api/user-preferences/by_key/` | Get preference by key + scope |
| GET | `/api/user-preferences/all_for_scope/` | Get all prefs for a scope |
| POST | `/api/user-preferences/` | Create new preference |
| POST | `/api/user-preferences/set_preference/` | Upsert single preference |
| POST | `/api/user-preferences/bulk_set/` | Upsert multiple preferences |
| PUT | `/api/user-preferences/{id}/` | Update preference |
| PATCH | `/api/user-preferences/{id}/` | Partial update |
| DELETE | `/api/user-preferences/{id}/` | Delete preference |
| DELETE | `/api/user-preferences/clear_scope/` | Delete all prefs in scope |

**Query Parameters** (for GET /api/user-preferences/):
- `scope_type` - Filter by scope (global, project, organization)
- `scope_id` - Filter by scope ID
- `preference_key` - Filter by key (partial match)

---

## Frontend (React/Next.js)

### TypeScript API Client

**File**: `src/lib/api/user-preferences.ts`

```typescript
// Get a preference
const theme = await getPreference<{ mode: string }>('theme', 'global');

// Set a preference
await setPreference({
  preference_key: 'theme',
  preference_value: { mode: 'dark' },
  scope_type: 'global'
});

// Get all preferences for a project
const prefs = await getAllForScope('project', projectId);

// Migrate from localStorage
await migrateLocalStorage(
  'coreui-theme',      // localStorage key
  'theme',              // preference key
  'global'              // scope
);
```

### React Hooks

**File**: `src/hooks/useUserPreferences.ts`

#### 1. `usePreference<T>` - Single Preference Management

```typescript
const [theme, setTheme, { loading, saving, error }] = usePreference({
  key: 'theme',
  defaultValue: { mode: 'light' },
  scopeType: 'global',
  migrateFrom: 'coreui-theme',  // Auto-migrate from localStorage
  debounceMs: 500
});

// Update (auto-saves with debounce)
setTheme({ mode: 'dark' });
```

**Features**:
- ✅ Automatic database sync with debouncing
- ✅ Optimistic updates for instant UI response
- ✅ Auto-migration from localStorage on first load
- ✅ Loading/saving states for UI feedback
- ✅ Error handling and fallback to defaults

#### 2. `useScopedPreferences` - Multiple Preferences in a Scope

```typescript
const { preferences, setPreference, loading, error } = useScopedPreferences({
  scopeType: 'project',
  scopeId: projectId
});

// Access
const grouping = preferences['budget.grouping'];

// Update
setPreference('budget.grouping', { isGrouped: true, expandedCategories: [] });
```

#### 3. `useBudgetGroupingPersistence` - Budget Grouping Helper

```typescript
const {
  isGrouped,
  expandedCategories,
  setIsGrouped,
  setExpandedCategories,
  loading,
  saving
} = useBudgetGroupingPersistence(projectId);

// Automatically migrates from:
// - localStorage: `budget_grouping_${projectId}`
// - localStorage: `budget_expanded_${projectId}`
```

#### 4. `useThemePersistence` - Theme Helper

```typescript
const { theme, setTheme, loading, saving } = useThemePersistence();

// Automatically migrates from localStorage: 'coreui-theme'
setTheme('dark');
```

---

## Migration Strategy

### Phase 1: Parallel Operation (Current)

1. New hooks read from database first
2. If database empty, check localStorage and migrate
3. Updates go to both localStorage (for compatibility) and database
4. Existing components continue using localStorage

### Phase 2: Database-Only (Next Step)

1. Replace `useBudgetGrouping` with `useBudgetGroupingPersistence`
2. Replace `CoreUIThemeProvider` localStorage logic with `useThemePersistence`
3. Remove localStorage writes (keep reads as fallback)

### Phase 3: Cleanup

1. Remove all localStorage reads
2. Remove migration logic from hooks
3. Pure database persistence

---

## Integration Examples

### Budget Grouping Migration

**Current** (`src/hooks/useBudgetGrouping.ts`):
```typescript
const [isGrouped, setIsGrouped] = useState<boolean>(() => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`budget_grouping_${projectId}`);
    return stored === 'true';
  }
  return false;
});

useEffect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`budget_grouping_${projectId}`, String(isGrouped));
  }
}, [isGrouped, projectId]);
```

**Updated** (using `useBudgetGroupingPersistence`):
```typescript
const {
  isGrouped,
  setIsGrouped,
  loading,
  saving
} = useBudgetGroupingPersistence(projectId);

// That's it! Automatic database sync with migration
```

### Theme Preference Migration

**Current** (`src/app/components/CoreUIThemeProvider.tsx`):
```typescript
useEffect(() => {
  setMounted(true);
  const storedTheme = localStorage.getItem('coreui-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') {
    setThemeState(storedTheme);
  }
}, []);
```

**Updated** (using `useThemePersistence`):
```typescript
const { theme, setTheme, loading } = useThemePersistence();

// Automatic database sync with localStorage migration
```

---

## Files Created/Modified

### Database
- ✅ `backend/db/migrations/019_user_preferences_system.sql`

### Backend (Django)
- ✅ `backend/apps/projects/models_user.py` - Added `UserPreference` model
- ✅ `backend/apps/projects/serializers.py` - Added preference serializers
- ✅ `backend/apps/projects/views_preferences.py` - NEW: ViewSet for preferences
- ✅ `backend/apps/projects/urls.py` - Registered preference routes

### Frontend (Next.js/React)
- ✅ `src/lib/api/user-preferences.ts` - NEW: TypeScript API client
- ✅ `src/hooks/useUserPreferences.ts` - NEW: React hooks

### Documentation
- ✅ `docs/USER_PREFERENCES_PERSISTENCE_PHASE_1.md` - This file

---

## Testing Checklist

### Database
- [ ] Run migration: `psql $DATABASE_URL -f backend/db/migrations/019_user_preferences_system.sql`
- [ ] Verify table created: `\d landscape.tbl_user_preference`
- [ ] Test upsert function: `SELECT landscape.fn_migrate_user_preference(...)`

### Backend API
- [ ] Start Django server: `python manage.py runserver`
- [ ] Test endpoints with curl/Postman:
  ```bash
  # List preferences
  curl http://localhost:8000/api/user-preferences/ -H "Cookie: ..."

  # Set preference
  curl -X POST http://localhost:8000/api/user-preferences/set_preference/ \
    -H "Content-Type: application/json" \
    -H "Cookie: ..." \
    -d '{"preference_key":"theme","preference_value":{"mode":"dark"}}'

  # Get by key
  curl http://localhost:8000/api/user-preferences/by_key/?key=theme
  ```

### Frontend Hooks
- [ ] Import and use `usePreference` in a test component
- [ ] Verify database writes occur (check Network tab)
- [ ] Test localStorage migration (set value in localStorage, reload)
- [ ] Test optimistic updates (update should appear immediately)
- [ ] Test error handling (disconnect backend, verify fallback)

### Integration
- [ ] Update `useBudgetGrouping` to use persistence hook
- [ ] Update `CoreUIThemeProvider` to use persistence hook
- [ ] Verify preferences persist across page reloads
- [ ] Verify preferences sync across browser tabs (future enhancement)

---

## Next Steps (Phase 2)

1. **Run Database Migration**
   ```bash
   psql $DATABASE_URL -f backend/db/migrations/019_user_preferences_system.sql
   ```

2. **Update Budget Grouping Hook**
   - Replace localStorage logic in `src/hooks/useBudgetGrouping.ts`
   - Use `useBudgetGroupingPersistence` internally

3. **Update Theme Provider**
   - Replace localStorage logic in `src/app/components/CoreUIThemeProvider.tsx`
   - Use `useThemePersistence` hook

4. **Add Additional Preferences**
   - Budget filters
   - Column visibility
   - Grid page size
   - Map defaults

5. **UI Enhancements**
   - Add "Preferences" page in Settings
   - Show sync status indicators
   - Add export/import functionality

---

## Benefits

### Developer Experience
- ✅ Type-safe preference access
- ✅ No manual localStorage management
- ✅ Automatic sync across components
- ✅ Reusable hooks for common patterns

### User Experience
- ✅ Preferences persist across devices (when logged in)
- ✅ No data loss on cache clear
- ✅ Faster initial load (server-side rendering compatible)
- ✅ Instant updates (optimistic UI)

### Maintainability
- ✅ Centralized preference logic
- ✅ Easy to add new preferences
- ✅ Queryable preference history
- ✅ Analytics on preference usage

---

## Technical Decisions

### Why JSONB over separate columns?
- Flexibility to add new preference types without migrations
- Complex nested structures (arrays, objects)
- Efficient querying with PostgreSQL JSONB operators

### Why debouncing?
- Reduces database writes during rapid updates (e.g., dragging sliders)
- Better performance for frequently-changing values
- Still provides optimistic updates for instant feedback

### Why scoped preferences?
- Different settings per project (budget grouping, filters)
- Organization-level defaults
- User-level global preferences
- Clear hierarchy and override logic

---

## Known Limitations

1. **Authentication Required** - Preferences only work for logged-in users
2. **No Real-Time Sync** - Changes don't automatically sync across tabs (could add WebSocket)
3. **No Conflict Resolution** - Last write wins (could add versioning)
4. **No Preference History** - Only current value stored (could add audit log)

---

## Support & Troubleshooting

### Preference not saving?
- Check browser Network tab for API errors
- Verify user is authenticated
- Check Django logs for validation errors

### Migration not working?
- Ensure localStorage key matches `migrateFrom` option
- Check browser console for migration errors
- Verify preference was created in database

### Loading state stuck?
- Check Django server is running
- Verify API endpoint is accessible
- Check for CORS issues (credentials: 'include')

---

**Implementation by**: Claude Code
**Last Updated**: 2025-11-13
**Status**: ✅ Phase 1 Complete, Ready for Testing
