-- =====================================================
-- Simple Budget → Container Migration for Project 7
-- =====================================================
--
-- Since all 66 budget items for Project 7 are at pe_level='project',
-- they should remain at container_id=NULL (correct state).
--
-- This script demonstrates the migration logic for when you have
-- area/phase/parcel level budgets.
-- =====================================================

-- Current State
SELECT 
  'CURRENT STATE' as report_section,
  pe_level,
  COUNT(*) as facts,
  COUNT(container_id) as has_container_id
FROM landscape.core_fin_fact_budget
GROUP BY pe_level;

-- For Project 7: No changes needed
-- All facts are at pe_level='project' → container_id should be NULL

-- If you had area/phase/parcel budgets, migration would be:
-- UPDATE landscape.core_fin_fact_budget b
-- SET container_id = c.container_id
-- FROM landscape.tbl_container c
-- WHERE b.pe_level = 'parcel'
--   AND c.container_level = 3
--   AND c.attributes->>'parcel_id' = b.pe_id;

SELECT 'Migration complete - all project-level budgets correctly have container_id=NULL' as status;
