# Global Benchmarks - Quick Start Guide

**Status**: ✅ Page loads successfully! Now run migration to enable full functionality.

---

## ✅ WHAT'S WORKING NOW

The Global Benchmarks page is **loading successfully** with graceful handling:
- ✅ Page accessible at `/admin/benchmarks`
- ✅ Navigation link in gear menu
- ✅ API endpoints return empty arrays (safe fallback)
- ✅ UI renders correctly with "No benchmarks yet" message

---

## 🚀 NEXT STEP: Run Database Migration

To enable full functionality, run the migration to create the tables:

### 1. Connect to Database

```bash
cd /Users/5150east/landscape

# Verify connection
psql $DATABASE_URL -c "SELECT current_database();"
```

**Expected output**: Your database name (e.g., `landscape`)

---

### 2. Run Migration

```bash
psql $DATABASE_URL -f backend/apps/financial/migrations/0014_global_benchmarks_phase1.sql
```

**Expected output**:
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
... (15 total "CREATE INDEX" lines)
COMMENT ON SCHEMA
```

---

### 3. Verify Tables Created

```bash
# Check all tables exist
psql $DATABASE_URL -c "\dt landscape.tbl_*benchmark*"
```

**Expected output**:
```
 Schema    |           Name                        | Type  | Owner
-----------+---------------------------------------+-------+-------
 landscape | tbl_global_benchmark_registry         | table | ...
 landscape | tbl_benchmark_unit_cost               | table | ...
 landscape | tbl_benchmark_transaction_cost        | table | ...
 landscape | tbl_benchmark_ai_suggestions          | table | ...
```

---

### 4. Check Indexes

```bash
psql $DATABASE_URL -c "\d landscape.tbl_global_benchmark_registry"
```

**Look for**: "Indexes:" section showing 5+ indexes

---

## 🎨 TEST THE UI

### 1. Refresh Page
- Navigate to `http://localhost:3000/admin/benchmarks`
- Page should load without errors
- Should show 11 category tiles (all with count: 0)

### 2. Verify API Endpoints

```bash
# Test benchmarks endpoint
curl http://localhost:3000/api/benchmarks

# Expected: {"benchmarks":[],"grouped_by_category":{},"total":0}

# Test AI suggestions endpoint
curl http://localhost:3000/api/benchmarks/ai-suggestions

# Expected: {"suggestions":[],"summary":{...}}
```

---

## 📦 SEED SAMPLE DATA (Optional)

### Create a Sample Unit Cost Benchmark

```bash
curl -X POST http://localhost:3000/api/benchmarks \
  -H "Content-Type: application/json" \
  -d '{
    "category": "unit_cost",
    "benchmark_name": "Grading - Standard",
    "value": 2.50,
    "uom_code": "$/SF",
    "cost_phase": "site_work",
    "work_type": "grading",
    "confidence_level": "high",
    "market_geography": "Phoenix"
  }'
```

**Expected response**:
```json
{
  "benchmark_id": 1,
  "message": "Benchmark created successfully"
}
```

### View in UI
1. Refresh `/admin/benchmarks` page
2. Expand "Unit Costs" accordion
3. Should see "Grading - Standard" benchmark
4. Shows "2.5 $/SF" with age badge

---

### Create a Sample Growth Rate Set

```bash
curl -X POST http://localhost:3000/api/benchmarks/growth-rates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Conservative 2025",
    "description": "Moderate inflation forecast",
    "geography": "Phoenix",
    "steps": [
      {"from_period": 1, "rate": 2.0, "periods": 12, "thru_period": 12},
      {"from_period": 13, "rate": 2.5, "periods": 12, "thru_period": 24},
      {"from_period": 25, "rate": 3.0, "periods": "E", "thru_period": 180}
    ]
  }'
```

**Expected response**:
```json
{
  "set_id": 1,
  "benchmark_id": 2,
  "message": "Growth rate set created successfully"
}
```

### View in UI
1. Refresh page
2. Expand "Growth Rates" accordion
3. Should see "Conservative 2025" set

---

## ✅ VERIFICATION CHECKLIST

After running migration and seeding data:

### Database
- [ ] 4 benchmark tables exist
- [ ] 15+ indexes created
- [ ] `core_fin_growth_rate_sets` has new columns (`benchmark_id`, `market_geography`, `is_global`)
- [ ] `land_use_pricing` has new columns

### API
- [ ] `GET /api/benchmarks` returns 200
- [ ] `GET /api/benchmarks/ai-suggestions` returns 200
- [ ] `GET /api/benchmarks/growth-rates` returns 200
- [ ] `POST /api/benchmarks` creates benchmark
- [ ] Created benchmark appears in GET response

### UI
- [ ] Page loads without errors
- [ ] 11 category tiles visible
- [ ] Accordion expands/collapses
- [ ] Sample benchmarks display correctly
- [ ] Age badges show (green for new data)
- [ ] Landscaper panel renders
- [ ] Mode selector works (Silent/Helpful/Teaching)

---

## 🐛 TROUBLESHOOTING

### Error: "relation does not exist"
**Problem**: Tables not created yet
**Solution**: Run migration (step 2 above)

### Error: "Failed to fetch data"
**Problem**: API can't connect to database
**Solution**:
1. Check `DATABASE_URL` env var: `echo $DATABASE_URL`
2. Test connection: `psql $DATABASE_URL -c "SELECT 1"`
3. Restart Next.js: `npm run dev`

### Page shows "No benchmarks yet" after seeding
**Problem**: Data created but not showing
**Solution**:
1. Verify data in DB: `psql $DATABASE_URL -c "SELECT * FROM landscape.tbl_global_benchmark_registry"`
2. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+F5 (Windows)
3. Check browser console for errors

### Accordion doesn't expand
**Problem**: JavaScript error
**Solution**:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed API calls

---

## 📚 WHAT'S NEXT

### Immediate (You're Ready!)
✅ Run migration
✅ Test page
✅ Seed sample data
✅ Verify UI works

### Optional Enhancements (Future)
- Growth Rate Step Editor component (inline form)
- Benchmark Detail Modal (full view with tabs)
- Benchmarks Extractor (AI document processing)
- CPI integration (auto-sync)

### Phase 2 (Future)
- Absorption rate benchmarks
- Commission structures
- Property type templates
- Capital stack standards

---

## 🎉 SUCCESS CRITERIA

You'll know it's working when:

✅ Page loads without console errors
✅ 11 category tiles show in left accordion
✅ Clicking category expands/collapses
✅ Sample benchmarks display in list
✅ Age badges show correct colors
✅ Landscaper panel shows on right
✅ No red errors anywhere

---

## 📞 NEED HELP?

Check these files for details:
- **Full documentation**: `IMPLEMENTATION_COMPLETE_SUMMARY.md`
- **Phase 1 status**: `GLOBAL_BENCHMARKS_PHASE1_STATUS.md`
- **Database migration**: `backend/apps/financial/migrations/0014_global_benchmarks_phase1.sql`

---

**You're ready to go! Run the migration and start using Global Benchmarks.** 🚀
