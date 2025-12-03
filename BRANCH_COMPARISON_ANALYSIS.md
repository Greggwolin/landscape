# Branch Comparison Analysis
## `feature/nav-restructure-phase7` vs `main`

**Generated:** 2025-11-21
**Purpose:** Pre-merge analysis for testing and migration planning

---

## Executive Summary

- **Total Files Changed:** 146
  - **New Files:** 113
  - **Modified Files:** 33
  - **Deleted Files:** 0
- **New Django Migrations:** 3 major migrations
- **New Database Tables:** 5 tables
- **New NPM Dependencies:** 1 (`use-debounce`)
- **Merge Conflict Risk:** **MODERATE** (settings.py, urls.py will need careful merging)

---

## 1. FILE-LEVEL COMPARISON

### 1.1 New Files Created (113 total)

#### Backend - New Django Apps
```
backend/apps/landscaper/          [ENTIRE APP - NEW]
├── __init__.py
├── admin.py
├── ai_handler.py                 # Anthropic Claude integration
├── apps.py
├── models.py                     # ChatMessage, LandscaperAdvice
├── serializers.py
├── urls.py
├── views.py
└── migrations/
    └── 0001_initial.py           # Creates landscaper tables

backend/apps/users/               [NOT YET COMMITTED - TODAY'S WORK]
├── models.py                     # UserSettings model
├── views.py                      # Tier management API
├── urls.py
└── migrations/
    └── 0001_initial.py           # Creates user_settings table
```

#### Backend - New Migrations
```
backend/apps/projects/migrations/
└── 0002_userpreference.py        # User preferences table

backend/apps/reports/migrations/
└── 0001_initial.py               # Report templates table

backend/apps/landscaper/migrations/
└── 0001_initial.py               # Chat messages & AI advice tables
```

#### Frontend - New Pages (22 total)
```
LIFECYCLE-BASED NAVIGATION (New Structure):

/projects/[projectId]/
├── acquisition/page.tsx          # NEW - Land acquisition page
├── planning/
│   ├── market/page.tsx          # NEW - Market analysis
│   ├── land-use/page.tsx        # NEW - Land use planning
│   └── budget/page.tsx          # NEW - Planning budget
├── development/
│   ├── phasing/page.tsx         # NEW - Development phasing
│   └── budget/page.tsx          # NEW - Development budget
├── sales-marketing/page.tsx     # NEW - Sales & marketing
├── capitalization/
│   ├── debt/page.tsx            # NEW - Debt structures (PRO ONLY)
│   ├── equity/page.tsx          # NEW - Equity waterfalls (PRO ONLY)
│   └── operations/page.tsx      # NEW - Operating expenses (PRO ONLY)
├── results/page.tsx             # NEW - Valuation results
├── documents/page.tsx           # NEW - Document management
└── landscaper/page.tsx          # NEW - AI chat interface

LEGACY ROUTES (Still exist for backward compatibility):
/projects/[projectId]/project/
├── summary/page.tsx             # OLD - Project overview
├── budget/page.tsx              # OLD - Unified budget
├── planning/page.tsx            # OLD - Planning tab
├── sales/page.tsx               # OLD - Sales tab
└── dms/page.tsx                 # OLD - Documents

FEASIBILITY ANALYSIS:
/projects/[projectId]/feasibility/
├── market-data/page.tsx         # NEW - Market comparables
└── sensitivity/page.tsx         # NEW - Sensitivity analysis
```

#### Frontend - New API Routes (21 total)
```
/api/projects/[projectId]/
├── assumptions/base/            # Base financial assumptions
├── debt/
│   ├── facilities/              # Debt facility CRUD
│   ├── facilities/[id]/         # Single facility ops
│   └── draw-events/             # Draw schedule events
├── equity/
│   ├── partners/                # Equity partner CRUD
│   ├── partners/[id]/           # Single partner ops
│   └── waterfall/               # Waterfall structure
├── developer/fees/              # Developer fee structures
├── market-data/
│   ├── absorption-rates/        # Absorption rate comps
│   ├── housing-prices/          # Housing price comps
│   └── land-sales/              # Land sale comps
├── sales/names/                 # Update sale parcel names
├── scenarios/                   # Scenario management
├── sensitivity/calculate/       # Sensitivity calculations
└── granularity/                 # Project granularity settings

/api/projects/recent/            # Recent projects list
/api/sales/update-name/          # Legacy sale name update
```

#### Frontend - New Components (50+ total)
```
ADMIN COMPONENTS (8):
src/components/admin/
├── AdminModal.tsx               # Main admin modal container
├── BenchmarksPanel.tsx          # Benchmarks management
├── CostLibraryPanel.tsx         # Cost library admin
├── DMSAdminPanel.tsx            # Document admin
├── PreferencesPanel.tsx         # System preferences
├── ReportConfiguratorPanel.tsx  # Report templates
├── ReportTemplateCard.tsx
└── ReportTemplateEditorModal.tsx

CAPITALIZATION COMPONENTS (8):
src/components/capitalization/
├── CapitalizationSubNav.tsx     # Cap table sub-navigation
├── DebtFacilitiesTable.tsx
├── DebtFacilityModal.tsx
├── DeveloperFeesTable.tsx
├── DrawScheduleTable.tsx
├── EquityPartnersTable.tsx
├── MetricCard.tsx
└── WaterfallStructureTable.tsx

FEASIBILITY COMPONENTS (5):
src/components/feasibility/
├── FeasibilitySubNav.tsx
├── ComparableModal.tsx
├── ComparablesTable.tsx
├── MarketDataContent.tsx
└── SensitivityAnalysisContent.tsx

LANDSCAPER AI COMPONENTS (4):
src/components/landscaper/
├── ChatInterface.tsx
├── ChatMessageBubble.tsx
├── AdviceAdherencePanel.tsx
└── VarianceItem.tsx

PROJECT NAVIGATION (2):
src/components/projects/
└── LifecycleTileNav.tsx         # CRITICAL - New tile navigation

src/components/project/
├── ProjectSubNav.tsx
├── ActivityFeed.tsx
├── GranularityIndicators.tsx
├── MetricCard.tsx
└── MilestoneTimeline.tsx

SALES COMPONENTS (4):
src/components/sales/
├── FilterSidebar.tsx
├── SaleTransactionDetails.tsx   # Enhanced details view
├── TransactionColumn.tsx
└── TransactionGrid.tsx

VALUATION:
src/components/project/
└── SalesComparableModal.tsx     # Comparable property modal
```

#### Frontend - New Hooks (4 total)
```
src/hooks/
├── useMarketData.ts             # Market data fetching
├── useProjectMetrics.ts         # Project KPIs
├── useReports.ts                # Report templates
├── useUnsavedChanges.ts         # Dirty form tracking
└── useUserTier.ts               # [TODAY'S WORK] Pro tier management
```

#### Frontend - New Styles (2)
```
src/styles/
├── navigation.css               # Tile navigation styles
└── sales-transactions.css       # Sales grid styles
```

#### Documentation (7 new docs)
```
docs/session-notes/
├── PHASE_2_PROJECT_TAB_COMPLETE.md
├── PHASE_3_SALES_TRANSACTION_DETAILS_COMPLETE.md
├── PHASE_4_FEASIBILITY_VALUATION_COMPLETE.md
├── PHASE_5_CAPITALIZATION_FOUNDATION_COMPLETE.md
├── PHASE_6_LANDSCAPER_CHAT_IMPLEMENTATION_COMPLETE.md
└── SESSION_NOTES_2025_11_20_BENCHMARKS_PANEL_FIX.md

MODAL_STANDARDS.md               # Modal design standards
```

### 1.2 Modified Files (33 total)

#### Backend Configuration (Critical - Merge Conflict Risk!)
```
backend/config/settings.py       ⚠️  CONFLICT RISK - Apps list modified
backend/config/urls.py           ⚠️  CONFLICT RISK - URL patterns added
```

#### Backend App Changes
```
backend/apps/financial/models_valuation.py
backend/apps/market_intel/
├── admin.py
├── models.py
├── serializers.py
└── views.py
backend/apps/projects/urls.py
backend/apps/reports/
├── models.py
├── serializers.py
├── urls.py
└── views.py
```

#### Frontend Core Navigation (Critical!)
```
src/app/layout.tsx                      # Added AdminModal provider
src/app/components/
├── TopNavigationBar.tsx               ⚠️  MAJOR CHANGES - Settings dropdown → button
├── NavigationLayout.tsx               ⚠️  MAJOR CHANGES - AdminModal integration
├── ProjectContextBar.tsx              ⚠️  MAJOR CHANGES - Now uses LifecycleTileNav
└── LandscaperChatModal.tsx
```

#### Frontend Pages
```
src/app/admin/benchmarks/cost-library/page.tsx
src/app/projects/[projectId]/
├── budget/page.tsx
└── components/tabs/
    ├── CapitalizationTab.tsx
    ├── FeasibilityTab.tsx
    ├── PlanningTab.tsx
    └── SalesTab.tsx
```

#### Frontend Components
```
src/app/projects/[projectId]/valuation/components/
├── ComparablesGrid.tsx
└── SalesComparisonApproach.tsx

src/components/benchmarks/
├── BenchmarkAccordion.tsx
└── GrowthRateCategoryPanel.tsx

src/components/budget/BudgetItemModal.tsx
src/components/sales/SalesContent.tsx
```

#### Frontend Utils & Types
```
src/lib/utils/projectTabs.ts
src/types/valuation.ts
```

#### Package Management
```
package.json                     # Added use-debounce@^10.0.6
package-lock.json
```

### 1.3 Deleted Files
```
NONE - All existing files preserved for backward compatibility
```

---

## 2. DATABASE SCHEMA DIFFERENCES

### 2.1 New Tables (5 total)

#### `landscape.landscaper_chat_message`
```sql
CREATE TABLE landscape.landscaper_chat_message (
    message_id VARCHAR(100) PRIMARY KEY,
    project_id INTEGER REFERENCES landscape.tbl_projects,
    user_id INTEGER REFERENCES auth_user,
    role VARCHAR(20),              -- 'user' or 'assistant'
    content TEXT,
    timestamp TIMESTAMP,
    metadata JSONB
);

INDEXES:
- (project_id, timestamp)
- (timestamp)
```

#### `landscape.landscaper_advice`
```sql
CREATE TABLE landscape.landscaper_advice (
    advice_id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES landscape.tbl_projects,
    message_id VARCHAR(100) REFERENCES landscaper_chat_message,
    assumption_key VARCHAR(100),
    lifecycle_stage VARCHAR(50),
    suggested_value DECIMAL(15,4),
    confidence_level VARCHAR(20),   -- 'high', 'medium', 'low', 'placeholder'
    created_at TIMESTAMP,
    notes TEXT
);

INDEXES:
- (project_id, assumption_key)
- (project_id, lifecycle_stage)
- (created_at)
```

#### `landscape.tbl_user_preference`
```sql
CREATE TABLE landscape.tbl_user_preference (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth_user,
    preference_key VARCHAR(255),
    preference_value JSONB,
    scope_type VARCHAR(50),         -- 'global', 'project', 'organization'
    scope_id INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    UNIQUE (user_id, preference_key, scope_type, scope_id)
);

INDEXES:
- (user_id, scope_type, scope_id)
- (preference_key)
- (updated_at DESC)
```

#### `landscape.report_templates`
```sql
CREATE TABLE landscape.report_templates (
    id BIGSERIAL PRIMARY KEY,
    template_name VARCHAR(200),
    description TEXT,
    output_format VARCHAR(20),      -- 'pdf', 'excel', 'powerpoint'
    assigned_tabs JSONB,            -- List of tab names
    sections JSONB,                 -- List of section names
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by TEXT
);

INDEX:
- (is_active)
```

#### `landscape.user_settings` ⚠️ [TODAY'S WORK - Not yet merged]
```sql
CREATE TABLE landscape.user_settings (
    user_id INTEGER PRIMARY KEY,
    tier_level VARCHAR(20) DEFAULT 'analyst',  -- 'analyst' or 'pro'
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 2.2 Modified Columns/Constraints
```
NONE - No schema alterations to existing tables
All changes are additive (new tables only)
```

### 2.3 Migration Dependencies
```
Migration Order (MUST be applied in sequence):

1. backend/apps/projects/migrations/0002_userpreference.py
2. backend/apps/reports/migrations/0001_initial.py
3. backend/apps/landscaper/migrations/0001_initial.py
   └── Depends on: projects.0002_userpreference

[NOT YET MERGED]
4. backend/apps/users/migrations/0001_initial.py
```

---

## 3. COMPONENT & ROUTING CHANGES

### 3.1 Navigation Architecture Transformation

#### OLD (main branch):
```
TopNavigationBar
├── Logo
├── Global Links (Dashboard, Documents)
├── Sandbox Dropdown
├── User Menu
├── Settings Dropdown ← REMOVED
└── Theme Toggle

Project Pages:
└── Tab-based navigation within /projects/[id]/page.tsx
```

#### NEW (feature branch):
```
TopNavigationBar
├── Logo
├── Global Links (Dashboard, Documents)
├── Landscaper AI Button ← NEW
├── Sandbox Dropdown
├── User Menu
├── Analyst/Developer Toggle ← NEW (TODAY'S WORK)
├── Settings Button ← CHANGED (opens AdminModal)
├── Theme Toggle ← Updated with icons
└── Bug Reporter Icon

ProjectContextBar (NEW - Tier 2 Navigation)
├── Active Project Selector
└── Lifecycle Tile Navigation ← CRITICAL NEW COMPONENT
    ├── Project Home
    ├── Acquisition ← NEW
    ├── Planning
    ├── Development
    ├── Sales
    ├── Capitalization (PRO TIER ONLY) ← NEW
    ├── Results ← NEW
    └── Documents

AdminModal (NEW - Global Overlay)
├── Preferences Tab
│   ├── Pro Features Toggle ← TODAY'S WORK
│   ├── Unit Cost Categories
│   └── Land Use Taxonomy
├── Benchmarks Tab
├── Cost Library Tab
├── DMS Admin Tab
└── Reports Tab
```

### 3.2 Routing Structure Comparison

#### Route Mapping (Old → New)
```
BACKWARD COMPATIBLE ROUTES:
/projects/[id]/project/summary   → Still works (legacy)
/projects/[id]/project/budget    → Still works (legacy)
/projects/[id]/project/planning  → Still works (legacy)
/projects/[id]/project/sales     → Still works (legacy)
/projects/[id]/project/dms       → Still works (legacy)

NEW PRIMARY ROUTES:
/projects/[id]                   → Project Home (tile navigation)
/projects/[id]/acquisition       → NEW
/projects/[id]/planning/market   → NEW
/projects/[id]/planning/land-use → NEW
/projects/[id]/planning/budget   → NEW
/projects/[id]/development/phasing → NEW
/projects/[id]/development/budget  → NEW
/projects/[id]/sales-marketing   → NEW
/projects/[id]/capitalization/*  → NEW (PRO ONLY)
/projects/[id]/results           → NEW
/projects/[id]/documents         → NEW
/projects/[id]/landscaper        → NEW (AI chat)

FEASIBILITY ROUTES (NEW):
/projects/[id]/feasibility/market-data
/projects/[id]/feasibility/sensitivity
```

### 3.3 Component Dependency Changes

#### New Component Dependencies:
```
LifecycleTileNav
├── useUserTier (TODAY'S WORK)
├── useRouter (next/navigation)
└── usePathname (next/navigation)

ProjectContextBar
├── useProjectContext
├── LifecycleTileNav ← NEW DEPENDENCY
└── No longer passes tierLevel prop

AdminModal (Global Component)
├── PreferencesPanel
│   └── useUserTier, useUpdateUserTier ← TODAY'S WORK
├── BenchmarksPanel
├── CostLibraryPanel
├── DMSAdminPanel
└── ReportConfiguratorPanel
```

---

## 4. KEY FUNCTIONAL CHANGES

### 4.1 Navigation System Overhaul

**Before (main):**
- Single-page app with internal tabs
- Settings accessed via dropdown
- No AI integration
- No tiered features

**After (feature branch):**
- Multi-page with tile-based navigation
- Settings in modal overlay
- Landscaper AI chat integrated
- Pro tier features (Capitalization)
- Analyst/Developer mode toggle (TODAY'S WORK)

### 4.2 New Core Features

#### Landscaper AI Assistant
```
Backend:
- Anthropic Claude API integration (ai_handler.py)
- Chat message persistence
- AI advice tracking with confidence levels
- Project-scoped conversations

Frontend:
- Real-time chat interface
- Advice adherence monitoring
- Variance tracking against AI suggestions
```

#### Pro Tier System (TODAY'S WORK)
```
Backend:
- UserSettings model with tier_level field
- API: GET/PUT /api/users/tier/
- Tier levels: 'analyst' (default) | 'pro'

Frontend:
- useUserTier() hook - fetches tier
- useUpdateUserTier() hook - mutation
- Preferences panel toggle
- LifecycleTileNav filters based on tier
- Capitalization tile visible only in 'pro' mode
```

#### Report Templates
```
Backend:
- ReportTemplate model
- Template CRUD API
- Output formats: PDF, Excel, PowerPoint
- Tab-based template assignment

Frontend:
- ReportConfiguratorPanel in AdminModal
- Template editor modal
- Export button in project tabs
```

#### Market Intelligence
```
Backend:
- Enhanced market_intel models
- Absorption rates tracking
- Housing price comparables
- Land sale comparables

Frontend:
- MarketDataContent component
- ComparablesTable with filtering
- Comparable modal for CRUD
```

### 4.3 State Management Changes

#### New React Query Keys:
```javascript
// Existing queries (modified)
['projects', projectId]
['budget-categories', projectId]

// New queries (feature branch)
['user-tier']                              // TODAY'S WORK
['market-data', projectId, dataType]
['project-metrics', projectId]
['report-templates', projectId]
['landscaper-messages', projectId]
['landscaper-advice', projectId]
['debt-facilities', projectId]
['equity-partners', projectId]
['absorption-rates', projectId]
['land-sales', projectId]
```

#### New Context Providers:
```
NONE - No new context providers added
All state managed via React Query
```

### 4.4 API Endpoint Changes

#### New Django API Endpoints:
```
Backend (Django REST Framework):
POST   /api/landscaper/chat/                 # Send chat message
GET    /api/landscaper/advice/<project_id>/  # Get AI advice
GET    /api/reports/templates/               # List templates
POST   /api/reports/templates/               # Create template
PUT    /api/reports/templates/<id>/          # Update template
DELETE /api/reports/templates/<id>/          # Delete template
GET    /api/users/tier/                      # Get user tier (TODAY)
PUT    /api/users/tier/                      # Update tier (TODAY)
```

#### New Next.js API Routes:
```
Frontend (Next.js Route Handlers):
GET/POST   /api/projects/[projectId]/debt/facilities/
GET/PUT    /api/projects/[projectId]/debt/facilities/[id]/
GET/POST   /api/projects/[projectId]/equity/partners/
GET/PUT    /api/projects/[projectId]/equity/partners/[id]/
GET/POST   /api/projects/[projectId]/market-data/absorption-rates/
GET/POST   /api/projects/[projectId]/market-data/land-sales/
GET/POST   /api/projects/[projectId]/scenarios/
POST       /api/projects/[projectId]/sensitivity/calculate/
GET        /api/projects/recent/
```

---

## 5. MIGRATION RISKS & TESTING REQUIREMENTS

### 5.1 HIGH RISK - Merge Conflicts

#### `backend/config/settings.py`
```python
# MAIN branch has:
INSTALLED_APPS = [
    ...
    "apps.reports",
]

# FEATURE branch adds:
INSTALLED_APPS = [
    ...
    "apps.reports",
    "apps.landscaper",  # Feature branch addition
]

# TODAY'S WORK (uncommitted) adds:
    "apps.users",  # Not yet in either branch

⚠️  RESOLUTION STRATEGY:
1. Accept feature branch changes
2. Manually add "apps.users" after "apps.landscaper"
3. Verify app order doesn't break dependencies
```

#### `backend/config/urls.py`
```python
# MAIN:
urlpatterns = [
    ...
    path("", include('apps.reports.urls')),
]

# FEATURE:
urlpatterns = [
    ...
    path("", include('apps.reports.urls')),
    path("api/", include('apps.landscaper.urls')),
]

# TODAY'S WORK:
    path("api/users/", include('apps.users.urls')),

⚠️  RESOLUTION STRATEGY:
1. Accept feature branch changes
2. Manually add users URL after landscaper
```

#### `src/app/components/TopNavigationBar.tsx`
```typescript
// MAIN: Has SettingsDropdown component
// FEATURE: Removed SettingsDropdown, added Settings button + AdminModal
// TODAY: Added Analyst/Developer mode toggle

⚠️  RESOLUTION STRATEGY:
1. Accept ALL feature branch changes
2. TODAY'S changes already applied to feature branch
3. Verify imports and state management
```

### 5.2 MEDIUM RISK - Database Migrations

#### Migration Order Dependency
```
Problem:
- landscaper migrations depend on projects.0002_userpreference
- If migrations run out of order, foreign keys will fail

Solution:
1. Run migrations in order:
   python manage.py migrate projects 0002
   python manage.py migrate reports 0001
   python manage.py migrate landscaper 0001
   python manage.py migrate users 0001  # TODAY'S WORK

2. Or run all at once (Django handles dependencies):
   python manage.py migrate
```

#### Data Seeding Required
```
New tables need seed data:

1. user_settings
   - Create default record for user_id=1
   INSERT INTO landscape.user_settings (user_id, tier_level)
   VALUES (1, 'analyst');

2. report_templates
   - Need default report templates (optional)
   - Can be created via admin UI

3. landscaper tables
   - Will populate via user interaction
   - No seed data required
```

### 5.3 MEDIUM RISK - Frontend Component Dependencies

#### AdminModal Integration
```
Problem:
- AdminModal is imported in NavigationLayout
- If AdminModal components have issues, entire app nav breaks

Testing Required:
1. Open AdminModal from top nav
2. Test each tab panel loads correctly:
   - Preferences (with Pro toggle)
   - Benchmarks
   - Cost Library
   - DMS Admin
   - Reports
3. Verify modal closes properly
4. Test in light/dark themes
```

#### LifecycleTileNav Component
```
Problem:
- This is the NEW primary navigation for projects
- Depends on useUserTier hook
- If tier API fails, navigation breaks

Testing Required:
1. Navigate to any project
2. Verify all 8 tiles render:
   - Home, Acquisition, Planning, Development
   - Sales, Results, Documents
   - (Capital only if tier=pro)
3. Test tile click navigation
4. Verify active tile highlighting
5. Test tier toggle:
   - Go to Admin → Preferences
   - Toggle Pro features ON
   - Return to project - Capital tile should appear
   - Toggle Pro features OFF
   - Return to project - Capital tile should disappear
```

### 5.4 LOW RISK - Backward Compatibility

#### Legacy Routes Still Work
```
All old routes preserved:
✅ /projects/[id]/project/summary
✅ /projects/[id]/project/budget
✅ /projects/[id]/project/planning
✅ /projects/[id]/project/sales
✅ /projects/[id]/project/dms

Testing:
- Access each legacy route directly
- Verify pages render correctly
- Confirm no broken links
```

### 5.5 CONFIGURATION CHANGES NEEDED

#### Environment Variables
```bash
# No new env vars required in .env
# API keys already exist:
- ANTHROPIC_API_KEY (for Landscaper AI)
- DATABASE_URL (no changes)
- NEXT_PUBLIC_DJANGO_API_URL (no changes)
```

#### NPM Dependencies
```bash
# New dependency in feature branch:
npm install use-debounce@^10.0.6

# After merge:
npm install  # Will install from package-lock.json
```

---

## 6. TESTING CHECKLIST

### 6.1 Pre-Merge Testing (Feature Branch)

#### Database
- [ ] All migrations run without errors
- [ ] Tables created with correct schema
- [ ] Indexes created properly
- [ ] Foreign keys enforced
- [ ] Default values applied

#### Backend API
- [ ] Django admin accessible
- [ ] All new endpoints return 200 OK
- [ ] Landscaper chat API works
- [ ] Report templates CRUD works
- [ ] User tier API works (GET/PUT)
- [ ] CORS settings correct

#### Frontend - Navigation
- [ ] TopNavigationBar renders correctly
- [ ] ProjectContextBar shows on project pages
- [ ] LifecycleTileNav shows 7 tiles (analyst) or 8 tiles (pro)
- [ ] Tile navigation works (click → route)
- [ ] Active tile highlighted correctly
- [ ] AdminModal opens from settings button
- [ ] Analyst/Developer toggle works

#### Frontend - Pro Tier Feature
- [ ] Admin → Preferences shows Pro Features section
- [ ] Toggle switch works (analyst ↔ pro)
- [ ] Success message appears when enabled
- [ ] Capitalization tile appears/disappears correctly
- [ ] Setting persists after page refresh
- [ ] API calls succeed without errors

#### Frontend - New Pages
- [ ] Acquisition page loads
- [ ] Planning pages load (market, land-use, budget)
- [ ] Development pages load (phasing, budget)
- [ ] Sales-Marketing page loads
- [ ] Capitalization pages load (pro only)
- [ ] Results page loads
- [ ] Documents page loads
- [ ] Landscaper AI chat works

#### Frontend - Legacy Pages
- [ ] /project/summary still works
- [ ] /project/budget still works
- [ ] /project/planning still works
- [ ] /project/sales still works
- [ ] /project/dms still works

### 6.2 Post-Merge Testing (After merging to main)

#### Smoke Tests
- [ ] Application starts without errors
- [ ] Database migrations succeed
- [ ] NPM install completes
- [ ] Build succeeds (npm run build)
- [ ] Dev server runs (npm run dev)

#### Integration Tests
- [ ] Create new project
- [ ] Navigate through all lifecycle tiles
- [ ] Toggle Pro features on/off
- [ ] Create report template
- [ ] Chat with Landscaper AI
- [ ] Export report from a project tab

#### Regression Tests
- [ ] Existing budget functionality works
- [ ] Existing sales grid works
- [ ] Existing benchmarks work
- [ ] Existing planning tools work
- [ ] User preferences persist

### 6.3 Browser/Theme Testing
- [ ] Chrome (light theme)
- [ ] Chrome (dark theme)
- [ ] Safari (light theme)
- [ ] Safari (dark theme)
- [ ] Firefox (light theme)
- [ ] Firefox (dark theme)

---

## 7. ROLLBACK PLAN

### If Merge Fails:

#### Option 1: Revert Merge
```bash
git revert -m 1 <merge-commit-sha>
git push origin main
```

#### Option 2: Reset to Pre-Merge State
```bash
git reset --hard HEAD~1
git push origin main --force  # ⚠️ DANGEROUS - Use only if no one else pushed
```

#### Database Rollback
```sql
-- Revert migrations in reverse order
python manage.py migrate users zero
python manage.py migrate landscaper zero
python manage.py migrate reports zero
python manage.py migrate projects 0001

-- Or manually drop tables:
DROP TABLE IF EXISTS landscape.user_settings CASCADE;
DROP TABLE IF EXISTS landscape.landscaper_advice CASCADE;
DROP TABLE IF EXISTS landscape.landscaper_chat_message CASCADE;
DROP TABLE IF EXISTS landscape.report_templates CASCADE;
DROP TABLE IF EXISTS landscape.tbl_user_preference CASCADE;
```

---

## 8. MERGE STRATEGY RECOMMENDATION

### Recommended Approach: **Incremental Merge with Testing**

```bash
# 1. Create merge preparation branch
git checkout main
git pull origin main
git checkout -b merge-prep/nav-restructure-phase7
git merge feature/nav-restructure-phase7

# 2. Resolve conflicts
# - settings.py: Add both landscaper AND users apps
# - urls.py: Add both landscaper AND users URLs
# - TopNavigationBar.tsx: Accept feature changes + today's mode toggle

# 3. Add today's uncommitted changes
git add backend/apps/users/
git add src/hooks/useUserTier.ts
git add src/app/admin/preferences/page.tsx
git commit -m "feat: Add Pro tier user settings and toggle"

# 4. Test thoroughly on merge-prep branch
npm install
python manage.py migrate
npm run dev
python manage.py runserver

# 5. Run all tests from checklist above

# 6. If tests pass, merge to main
git checkout main
git merge merge-prep/nav-restructure-phase7
git push origin main

# 7. If tests fail, fix issues in merge-prep branch and repeat
```

---

## 9. PRIORITY FIX LIST (If Issues Found)

### P0 - Critical (App Breaking)
1. Migration failures
2. TopNavigationBar crash
3. LifecycleTileNav crash
4. Database connection errors

### P1 - High (Feature Breaking)
1. Pro tier toggle not working
2. Capitalization tile not showing/hiding
3. AdminModal not opening
4. API endpoints returning 500

### P2 - Medium (Degraded UX)
1. Tile navigation sluggish
2. AdminModal panels slow to load
3. Legacy routes broken
4. Dark theme styling issues

### P3 - Low (Polish)
1. Tile hover states
2. Loading states
3. Error messages
4. Accessibility issues

---

## 10. CONTACTS & ESCALATION

### Code Owners (from git history)
- **Navigation System:** Recent commits by Claude Code
- **Landscaper AI:** Phase 6 implementation
- **Capitalization:** Phase 5 implementation
- **Pro Tier Toggle:** Today's implementation (2025-11-21)

### Review Required By:
- **Backend Lead:** Database migrations approval
- **Frontend Lead:** Navigation architecture review
- **QA Lead:** Full regression test suite
- **DevOps:** Deployment strategy review

---

## APPENDIX: Files Changed Today (Not in Feature Branch)

```
✅ COMPLETED TODAY (Need to be added to branch):

backend/apps/users/                    [NEW DJANGO APP]
├── __init__.py
├── admin.py
├── apps.py
├── models.py                         # UserSettings model
├── urls.py                           # /api/users/tier/ endpoint
├── views.py                          # GET/PUT tier API
└── migrations/
    └── 0001_initial.py               # Creates user_settings table

src/hooks/useUserTier.ts              [NEW HOOK]
                                      # useUserTier(), useUpdateUserTier()

src/app/admin/preferences/page.tsx    [MODIFIED]
                                      # Added Pro Features toggle section

backend/config/settings.py            [MODIFIED]
                                      # Added 'apps.users' to INSTALLED_APPS

backend/config/urls.py                [MODIFIED]
                                      # Added path("api/users/", ...)

src/components/projects/LifecycleTileNav.tsx  [MODIFIED]
                                      # Now uses useUserTier() instead of prop

src/app/components/ProjectContextBar.tsx      [MODIFIED]
                                      # Removed hardcoded tierLevel prop
```

---

**END OF ANALYSIS**
**Generated:** 2025-11-21 by Claude Code
