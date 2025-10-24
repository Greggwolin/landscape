# Scenario Management - Deployment Notes

**Feature:** SCENARIO-001
**Version:** 1.0
**Deployment Date:** TBD
**Environment:** Production

---

## Pre-Deployment Checklist

### Database
- [ ] Backup production database
- [ ] Review migration file: `backend/migrations/012_scenario_management.sql`
- [ ] Test migration on staging environment
- [ ] Verify foreign key constraints won't break existing data

### Code Review
- [ ] Backend code reviewed and approved
- [ ] Frontend code reviewed and approved
- [ ] Integration tests passed
- [ ] No breaking changes to existing APIs

### Dependencies
- [ ] No new Python packages required
- [ ] No new npm packages required
- [ ] Django migrations up to date

---

## Deployment Steps

### Step 1: Database Migration (5 minutes)

```bash
# Connect to production database
psql $DATABASE_URL

# Run migration
\i backend/migrations/012_scenario_management.sql

# Verify tables created
\dt tbl_scenario*

# Verify scenario_id columns added
\d core_fin_fact_budget
\d tbl_finance_structure
\d tbl_cost_allocation

# Test clone function
SELECT clone_scenario(1, 'Test Clone');

# Clean up test
DELETE FROM tbl_scenario WHERE scenario_name = 'Test Clone';
```

**Expected Output:**
- `tbl_scenario` table created (20 columns)
- `tbl_scenario_comparison` table created (8 columns)
- `scenario_id` column added to 6 tables
- Indexes created
- Functions and triggers created

### Step 2: Deploy Backend (10 minutes)

```bash
# Pull latest code
cd backend
git pull origin main

# Restart Django server (production)
sudo systemctl restart landscape-backend

# Or for development
python manage.py runserver

# Verify API is accessible
curl http://localhost:8000/api/financial/scenarios/
```

**Expected Response:**
```json
[]
```

### Step 3: Deploy Frontend (10 minutes)

```bash
# Pull latest code
cd landscape
git pull origin main

# Install dependencies (if needed)
npm install

# Build production
npm run build

# Restart Next.js (production)
pm2 restart landscape-frontend

# Or for development
npm run dev
```

### Step 4: Create Base Scenarios (15 minutes)

**Option A: Via Django Admin**

```
1. Navigate to http://localhost:8000/admin/financial/scenario/
2. For each existing project:
   - Click "Add Scenario"
   - Project: [Select project]
   - Scenario Name: "Base Case"
   - Scenario Type: "base"
   - Is Active: ✓
   - Color Hex: #2563EB
   - Click "Save"
```

**Option B: Via Django Shell**

```bash
python manage.py shell

from apps.projects.models import Project
from apps.financial.models_scenario import Scenario

# Create base scenario for all projects
for project in Project.objects.all():
    if not Scenario.objects.filter(project=project).exists():
        Scenario.objects.create(
            project=project,
            scenario_name="Base Case",
            scenario_type="base",
            scenario_code=f"PROJ{project.project_id}-BASE",
            is_active=True,
            color_hex="#2563EB",
            description="Default base case scenario"
        )
        print(f"Created base scenario for Project {project.project_id}")
```

**Option C: Via SQL**

```sql
INSERT INTO landscape.tbl_scenario (
  project_id,
  scenario_name,
  scenario_type,
  scenario_code,
  is_active,
  color_hex,
  description,
  display_order,
  start_date_offset_months,
  created_at
)
SELECT
  project_id,
  'Base Case',
  'base',
  'PROJ' || project_id || '-BASE',
  true,
  '#2563EB',
  'Default base case scenario',
  0,
  0,
  NOW()
FROM landscape.tbl_project
WHERE project_id NOT IN (
  SELECT DISTINCT project_id FROM landscape.tbl_scenario
);
```

### Step 5: Smoke Tests (10 minutes)

```bash
# Test scenario creation
curl -X POST http://localhost:8000/api/financial/scenarios/ \
  -H "Content-Type: application/json" \
  -d '{
    "project": 7,
    "scenario_name": "Test Scenario",
    "scenario_type": "custom"
  }'

# Test scenario activation
curl -X POST http://localhost:8000/api/financial/scenarios/[ID]/activate/

# Test scenario cloning
curl -X POST http://localhost:8000/api/financial/scenarios/[ID]/clone/ \
  -H "Content-Type: application/json" \
  -d '{"scenario_name": "Cloned Test"}'

# Test scenario deletion
curl -X DELETE http://localhost:8000/api/financial/scenarios/[ID]/
```

**Expected Results:**
- ✅ Scenario created successfully (201 Created)
- ✅ Scenario activated (200 OK)
- ✅ Scenario cloned with all data (201 Created)
- ✅ Scenario deleted (204 No Content)

---

## Post-Deployment Verification

### Backend Verification
- [ ] Django admin shows Scenarios section
- [ ] Can create scenario via admin
- [ ] Can activate scenario via admin
- [ ] API endpoints respond correctly
- [ ] No 500 errors in logs

### Frontend Verification (When Integrated)
- [ ] Scenario chips appear on project page
- [ ] Can create new scenario via UI
- [ ] Can clone scenario via chip menu
- [ ] Can delete custom scenarios
- [ ] Active scenario highlighted correctly
- [ ] No console errors

### Data Verification
- [ ] Each project has at least one scenario
- [ ] Each project has exactly one active scenario
- [ ] scenario_id foreign keys working
- [ ] No orphaned scenario records

---

## Rollback Plan

### If Migration Fails

```sql
-- Drop tables (cascades to foreign keys)
DROP TABLE IF EXISTS landscape.tbl_scenario_comparison CASCADE;
DROP TABLE IF EXISTS landscape.tbl_scenario CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS landscape.clone_scenario;
DROP FUNCTION IF EXISTS landscape.set_active_scenario CASCADE;

-- Remove scenario_id columns (if needed)
ALTER TABLE landscape.core_fin_fact_budget DROP COLUMN IF EXISTS scenario_id;
ALTER TABLE landscape.core_fin_fact_actual DROP COLUMN IF EXISTS scenario_id;
ALTER TABLE landscape.tbl_finance_structure DROP COLUMN IF EXISTS scenario_id;
ALTER TABLE landscape.tbl_cost_allocation DROP COLUMN IF EXISTS scenario_id;
```

### If Backend Deployment Fails

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Restart server
sudo systemctl restart landscape-backend
```

### If Frontend Deployment Fails

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Rebuild and restart
npm run build
pm2 restart landscape-frontend
```

---

## Known Issues & Workarounds

### Issue 1: Missing tbl_revenue_item Table
**Symptom:** Migration shows error for `tbl_revenue_item`
**Impact:** None - table will be created in future
**Workaround:** Ignore error, continue with migration

### Issue 2: Missing tbl_absorption_schedule Table
**Symptom:** Migration shows error for `tbl_absorption_schedule`
**Impact:** None - table will be created in future
**Workaround:** Ignore error, continue with migration

### Issue 3: No Scenarios for New Projects
**Symptom:** New projects don't have base scenarios
**Impact:** Users can't use scenario features immediately
**Workaround:** Manually create base scenario or implement Django signal

---

## Monitoring

### Metrics to Track
- **Scenario Creation Rate:** Scenarios created per day
- **Scenario Switch Rate:** Activations per user session
- **API Response Times:** <200ms for activation
- **Error Rate:** <0.1% for scenario operations

### Logs to Monitor
```bash
# Backend errors
tail -f /var/log/landscape/backend.log | grep -i scenario

# Frontend errors
tail -f /var/log/landscape/frontend.log | grep -i scenario

# Database errors
tail -f /var/log/postgresql/postgresql.log | grep -i scenario
```

### Alerts to Configure
- [ ] Scenario API 5xx errors > 10/hour
- [ ] Scenario creation failures > 5/hour
- [ ] Database query timeouts on scenario operations
- [ ] Scenario-related JavaScript errors in browser

---

## Support Contacts

**Backend Issues:**
- Django admin: http://localhost:8000/admin/
- Logs: `/var/log/landscape/backend.log`
- Database: Check `tbl_scenario` table

**Frontend Issues:**
- Browser console for JavaScript errors
- Network tab for API call failures
- React DevTools for component state

**Database Issues:**
- Check foreign key constraints
- Verify scenario_id values are valid
- Check for orphaned records

---

## Success Criteria

Deployment is successful when:
- ✅ All database tables created without errors
- ✅ All API endpoints return expected responses
- ✅ Base scenarios created for all existing projects
- ✅ No 500 errors in production logs
- ✅ Admin panel shows scenarios correctly
- ✅ Frontend integration tested (when deployed)
- ✅ No data corruption or foreign key violations

---

## Timeline

**Estimated Total Time:** 50 minutes

| Step | Duration | Dependencies |
|------|----------|--------------|
| Database Migration | 5 min | Database backup |
| Backend Deploy | 10 min | Code reviewed |
| Frontend Deploy | 10 min | Build successful |
| Create Base Scenarios | 15 min | Database migration complete |
| Smoke Tests | 10 min | All deploys complete |

**Recommended Deployment Window:** Off-peak hours (evenings or weekends)

---

## Deployment Approval

- [ ] Technical Lead Approval
- [ ] QA Sign-off
- [ ] Database Backup Confirmed
- [ ] Rollback Plan Tested
- [ ] Monitoring Configured

**Approved By:** _________________
**Date:** _________________
**Deployment Time:** _________________

---

**Last Updated:** October 24, 2025
**Version:** 1.0
**Status:** Ready for Deployment
