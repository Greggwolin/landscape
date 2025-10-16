# Testing the Dynamic Breadcrumb Demo

**Date:** October 15, 2025

---

## Quick Start

```bash
# 1. Navigate to project
cd /Users/5150east/landscape

# 2. Start dev server
npm run dev

# 3. Open browser
http://localhost:3000/breadcrumb-demo
```

---

## Files Created

### Component Files
✅ `/src/app/components/DynamicBreadcrumb.tsx` (Main component)
✅ `/src/app/breadcrumb-demo/page.tsx` (Demo page)
✅ `/src/app/breadcrumb-demo/layout.tsx` (Layout with ProjectProvider) **← FIXED RUNTIME ERROR**

### Documentation Files
✅ `/docs/02-features/land-use/DYNAMIC_LABEL_PATTERN.md` (Pattern guide)
✅ `/DYNAMIC_BREADCRUMB_POC.md` (Summary)
✅ `/TESTING_BREADCRUMB_DEMO.md` (This file)

### Modified Files
✅ `/src/app/components/Navigation.tsx` (Added "Demos" menu)

---

## Testing Checklist

### ✅ Step 1: Visual Verification

**Navigate to:** `http://localhost:3000/breadcrumb-demo`

**You should see:**
- [ ] Page loads without errors
- [ ] "Dynamic Breadcrumb Demo" header
- [ ] "Current Project Configuration" section
- [ ] "Interactive Demo" section with 4 buttons
- [ ] "Example Configurations" section
- [ ] "Implementation Notes" section (blue box)

### ✅ Step 2: Check Project Configuration Display

**In "Current Project Configuration" section:**
- [ ] Project name shows: "Peoria Lakes Phase 1" or similar
- [ ] Asset Type shows: `land_development`
- [ ] Level 1 label shows: "Plan Area"
- [ ] Level 2 label shows: "Phase"
- [ ] Level 3 label shows: "Parcel"
- [ ] Plural forms show: "Plan Areas", "Phases", "Parcels"
- [ ] Container counts show:
  - Level 1: 4 Plan Areas
  - Level 2: 8 Phases
  - Level 3: 42 Parcels

### ✅ Step 3: Test Interactive Demo

**Click each button and verify breadcrumb updates:**

1. **Click "Project Only"**
   - [ ] Breadcrumb shows: "Peoria Lakes Phase 1"
   - [ ] No chevrons, single item

2. **Click "+ Plan Area"**
   - [ ] Breadcrumb shows: "Peoria Lakes Phase 1 > Plan Area 1"
   - [ ] First item is blue link, second is gray

3. **Click "+ Phase"**
   - [ ] Breadcrumb shows: "Peoria Lakes Phase 1 > Plan Area 1 > Phase 1.1"
   - [ ] Three items with chevrons between

4. **Click "+ Parcel"**
   - [ ] Breadcrumb shows: "Peoria Lakes Phase 1 > Plan Area 1 > Phase 1.1 > Parcel 42"
   - [ ] Full hierarchy, last item in white/bold

### ✅ Step 4: Check Navigation Integration

**From main app (http://localhost:3000):**
- [ ] Left sidebar shows "Demos" section
- [ ] "Dynamic Breadcrumbs" link is visible
- [ ] Clicking link navigates to `/breadcrumb-demo`
- [ ] Page loads correctly

### ✅ Step 5: Test Responsive Behavior

**Resize browser window:**
- [ ] Breadcrumb items wrap appropriately on narrow screens
- [ ] Configuration cards stack on mobile
- [ ] No horizontal scroll
- [ ] Text remains readable

### ✅ Step 6: Verify Database Connection

**Check "Container Hierarchy" in config section:**
- [ ] Shows "Level 1: 4 Plan Areas" (not "0 Plan Areas")
- [ ] Shows "Level 2: 8 Phases"
- [ ] Shows "Level 3: 42 Parcels"

**If it shows 0 or error:**
- Database connection issue
- Check `.env.local` has correct `DATABASE_URL`

### ✅ Step 7: Test API Response Viewer

**At bottom of page:**
- [ ] "View API Response" expandable section exists
- [ ] Click to expand
- [ ] JSON shows `config`, `labels`, `containerCount`
- [ ] JSON is formatted and readable

### ✅ Step 8: Console Check

**Open browser DevTools (F12) > Console tab:**
- [ ] No red errors
- [ ] No "Failed to load" messages
- [ ] No 404s or 500s

**Common issues:**
- `useProjectContext` errors = ProjectProvider issue
- `Failed to load containers` = Database connection issue
- TypeScript errors = Build issue

---

## Advanced Testing

### Test Label Changes

**1. Change labels in database:**
```sql
UPDATE landscape.tbl_project_config
SET level1_label = 'District',
    level2_label = 'Neighborhood',
    level3_label = 'Lot'
WHERE project_id = 7;
```

**2. Refresh demo page**
- [ ] Labels update to "District", "Neighborhood", "Lot"
- [ ] Breadcrumbs show new terminology
- [ ] No code changes required

**3. Restore original labels:**
```sql
UPDATE landscape.tbl_project_config
SET level1_label = 'Plan Area',
    level2_label = 'Phase',
    level3_label = 'Parcel'
WHERE project_id = 7;
```

### Test with Different Projects

**If you have Project 8 or 9:**

1. Switch projects in navigation dropdown
2. Demo page should update automatically
3. Labels should match that project's config
4. Container counts should update

---

## Troubleshooting

### Issue: Page shows "Loading configuration..."

**Cause:** Database not connected or slow query

**Fix:**
```bash
# Check database connection
PGPASSWORD=npg_bps3EShU9WFM /opt/homebrew/bin/psql \
  -h ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech \
  -U neondb_owner -d land_v2 \
  -c "SELECT * FROM landscape.tbl_project_config WHERE project_id = 7;"
```

Should return 1 row.

### Issue: "No configuration found" warning

**Cause:** Project 7 not configured in `tbl_project_config`

**Fix:**
```sql
INSERT INTO landscape.tbl_project_config
  (project_id, asset_type, level1_label, level2_label, level3_label)
VALUES
  (7, 'land_development', 'Plan Area', 'Phase', 'Parcel');
```

### Issue: Container counts show 0

**Cause:** No container data for project

**Check:**
```sql
SELECT container_level, COUNT(*)
FROM landscape.tbl_container
WHERE project_id = 7
GROUP BY container_level;
```

Should return:
- Level 1: 4
- Level 2: 8
- Level 3: 42

### Issue: Build errors

**Check TypeScript:**
```bash
npx tsc --noEmit
```

**Check for import errors:**
```bash
npm run build
```

### Issue: Port 3000 already in use

**Kill existing process:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

---

## Performance Benchmarks

**Expected load times:**
- Initial page load: < 500ms
- API config fetch: < 100ms
- API containers fetch: < 200ms
- Label updates: Instant (SWR cache)

**Check in Network tab:**
- `/api/projects/7/config` - Should return 200 OK
- `/api/projects/7/containers` - Should return 200 OK
- Both should be cached on subsequent visits

---

## Success Criteria

All checkboxes above should be ✅ checked.

**If any fail:**
1. Note which test failed
2. Check browser console for errors
3. Check database connection
4. Review component code

**After successful testing:**
- Demo proves the pattern works
- Ready to build Container Management UI
- Pattern documented for other developers

---

## Next Steps After Testing

1. ✅ Demo works correctly
2. Show pattern to team/stakeholders
3. Build Container Management UI
4. Migrate Planning Wizard to use pattern
5. Update all legacy components

---

## Questions to Answer During Testing

- [ ] Do breadcrumbs update when project changes?
- [ ] Are labels readable and make sense?
- [ ] Is the interactive demo intuitive?
- [ ] Does the configuration display help understanding?
- [ ] Would other developers understand how to replicate this?

---

**Test Date:** _____________
**Tester:** _____________
**Result:** ☐ Pass  ☐ Fail  ☐ Needs Revision

**Notes:**
```
(Add testing notes here)
```

---

**Last Updated:** October 15, 2025
**Ready for Testing:** ✅ Yes
**Estimated Test Time:** 10-15 minutes
