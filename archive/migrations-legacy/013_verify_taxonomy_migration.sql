-- ============================================================================
-- VERIFICATION QUERIES FOR MIGRATION 013
-- ============================================================================
-- Run these queries after applying the migration to verify results
-- ============================================================================

-- Check 1: View migration results summary
SELECT
  analysis_type,
  property_subtype,
  COUNT(*) as project_count,
  STRING_AGG(DISTINCT property_class, ', ') as classes_used
FROM landscape.tbl_project
GROUP BY analysis_type, property_subtype
ORDER BY analysis_type, property_subtype;

-- Check 2: Look for NULL values that need attention
SELECT
  project_id,
  project_name,
  analysis_type,
  property_subtype,
  development_type_deprecated,
  property_type_code_deprecated
FROM landscape.tbl_project
WHERE analysis_type IS NULL
   OR property_subtype IS NULL;

-- Check 3: Verify indexes were created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'landscape'
  AND tablename = 'tbl_project'
  AND indexname IN ('idx_project_analysis_type', 'idx_project_property_subtype');

-- Check 4: Verify deprecated columns were renamed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'tbl_project'
  AND column_name IN ('development_type_deprecated', 'property_type_code_deprecated', 'analysis_type', 'property_subtype')
ORDER BY column_name;

-- Check 5: Verify constraints
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'landscape.tbl_project'::regclass
  AND conname LIKE '%analysis_type%';
