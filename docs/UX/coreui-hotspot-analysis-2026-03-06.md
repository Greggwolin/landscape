# CoreUI Violation Hotspot Analysis - 2026-03-06

## Summary
- **Total files with violations:** 180
- **Total Tailwind color violations:** 1,887
- **Total hardcoded hex colors:** 471
- **Total dark: variants:** 115
- **Actionable files (excluding _archive, prototype, node_modules):** 145

## Changes Since Previous Report (~2 weeks ago)

**Previous stats (~2 weeks ago):**
- Total files with violations: 200
- Total Tailwind color violations: 2,458
- Total hardcoded hex colors: 485
- Total dark: variants: 419
- Actionable files: 179

**Current improvement:**
- **Files cleaned up:** 20 files removed from violation list (-10%)
- **Tailwind violations reduced:** 571 violations fixed (-23% 🎉)
- **Hex colors reduced:** 14 violations fixed (-3%)
- **Dark: variants reduced:** 304 violations fixed (-73% 💪)
- **Actionable files reduced:** 34 files cleaned up (-19%)

**Notable progress:**
The significant reduction in `dark:` variants (-73%) and Tailwind color violations (-23%) shows substantial cleanup progress over the past two weeks. The team has been actively migrating files to CoreUI standards.

## Top 20 Hotspots (Combined Score, actionable only)

| Rank | File | TW | Hex | Dark | Total |
|------|------|----|----|------|-------|
| 1 | src/app/breadcrumb-demo/page.tsx | 46 | 0 | 0 | 46 |
| 2 | src/app/admin/dms/templates/page.tsx | 22 | 0 | 22 | 44 |
| 3 | src/app/components/Market/MarketAssumptions.tsx | 43 | 0 | 0 | 43 |
| 4 | src/app/components/Budget/BudgetGridDark.tsx | 42 | 0 | 0 | 42 |
| 5 | src/app/components/ContainerManagement/ProjectSetupWizard.tsx | 40 | 0 | 0 | 40 |
| 6 | src/app/settings/profile/page.tsx | 17 | 18 | 0 | 35 |
| 7 | src/app/components/OpExHierarchy.tsx | 35 | 0 | 0 | 35 |
| 8 | src/app/components/MapLibre/GISMap.tsx | 0 | 34 | 0 | 34 |
| 9 | src/app/components/GrowthRates.tsx | 0 | 34 | 0 | 34 |
| 10 | src/app/components/AI/DocumentReview.tsx | 31 | 0 | 0 | 31 |
| 11 | src/app/market/components/CombinedTile.tsx | 17 | 13 | 0 | 30 |
| 12 | src/components/benchmarks/BenchmarkAccordion.tsx | 13 | 3 | 12 | 28 |
| 13 | src/app/db-schema/SchemaAccordion.tsx | 27 | 0 | 0 | 27 |
| 14 | src/components/reports/PropertySummaryView.tsx | 25 | 0 | 0 | 25 |
| 15 | src/app/components/MarketFactors/index.tsx | 25 | 0 | 0 | 25 |
| 16 | src/components/operations/ExpenseBreakdownChart.tsx | 0 | 23 | 0 | 23 |
| 17 | src/components/projects/onboarding/NewProjectDropZone.tsx | 17 | 0 | 5 | 22 |
| 18 | src/app/components/Documentation/MarkdownViewer.tsx | 22 | 0 | 0 | 22 |
| 19 | src/app/register/page.tsx | 21 | 0 | 0 | 21 |
| 20 | src/components/project/ProjectLandUseLabels.tsx | 20 | 0 | 0 | 20 |

## Top 10 Folders by Violation Count (actionable)

| Folder | Count |
|--------|-------|
| src/app/components | 91 |
| src/components/operations | 82 |
| src/components/projects/onboarding | 79 |
| src/app/market/components | 62 |
| src/app/components/Market | 58 |
| src/app/breadcrumb-demo | 46 |
| src/app/admin/dms/templates | 44 |
| src/components/sales | 42 |
| src/app/components/Budget | 42 |
| src/app/components/ContainerManagement | 40 |

## Quick Wins (1-5 violations each, actionable)

Files with minimal violations that can be quickly cleaned up:

| File | Count |
|------|-------|
| src/components/map/ValuationSalesCompMap.tsx | 5 |
| src/components/map-tab/MapCanvas.tsx | 5 |
| src/app/projects/[projectId]/components/tabs/LocationIntelligenceCard.tsx | 5 |
| src/app/budget-grid-v2/page.tsx | 5 |
| src/components/ic/PresentationModeView.tsx | 4 |
| src/components/analysis/SfCompsTile.tsx | 4 |
| src/app/projects/[projectId]/components/tabs/MarketTab.tsx | 4 |
| src/themes/current/index.tsx | 3 |
| src/components/phases/PhaseTransition.tsx | 3 |
| src/components/operations/ValueAddCard.tsx | 3 |
| src/components/ic/ICResultsTabs.tsx | 3 |
| src/components/dms/staging/StagingRow.tsx | 3 |
| src/components/budget/FiltersAccordion.tsx | 3 |
| src/app/projects/[projectId]/components/ActiveProjectBar.tsx | 3 |
| src/app/map-debug/page.tsx | 3 |
| src/app/components/theme/index.tsx | 3 |
| src/app/components/StyleCatalog/StyleCatalogContent.tsx | 3 |
| src/components/shared/AreaTiles.tsx | 2 |
| src/components/sales/PhaseTiles.tsx | 2 |
| src/components/land-use/LandUsePicker.tsx | 2 |

**Quick Win Strategy:** These 20 files contain only 66 total violations. A focused cleanup session could eliminate ~3.5% of remaining actionable violations in a few hours.

## Recommended Tier 4 Priority Order

### High-Impact Targets (40+ violations)
1. **src/app/breadcrumb-demo/page.tsx** (46) - Demo page with 46 Tailwind violations
   - May be a prototype or test page that could be archived or completely rewritten
   
2. **src/app/admin/dms/templates/page.tsx** (44) - Admin UI with high dark: variant usage (22)
   - Critical admin interface, needs careful migration

3. **src/app/components/Market/MarketAssumptions.tsx** (43) - Core market analysis component
   - High visibility component, 43 TW violations

4. **src/app/components/Budget/BudgetGridDark.tsx** (42) - Budget grid with legacy dark mode
   - Name suggests it's a dark-mode-specific variant that might need architectural review

5. **src/app/components/ContainerManagement/ProjectSetupWizard.tsx** (40) - Onboarding wizard
   - User-facing flow, high impact on first impressions

### Medium-Impact Targets (30-39 violations)
6. **src/app/settings/profile/page.tsx** (35) - Mixed violations (TW + hex)
   - User settings page, combination of Tailwind and hardcoded colors

7. **src/app/components/OpExHierarchy.tsx** (35) - Operations hierarchy view

8. **src/app/components/MapLibre/GISMap.tsx** (34) - Map visualization with 34 hex colors
   - Likely chart/map colors, may need color palette constants

9. **src/app/components/GrowthRates.tsx** (34) - Chart component with hex colors
   - Similar to GISMap, likely needs centralized color tokens

10. **src/app/components/AI/DocumentReview.tsx** (31) - AI feature UI

### Folder Cleanup Strategy
Focus on these high-violation folders for batch cleanup:
- **src/app/components** (91 violations) - Core app components
- **src/components/operations** (82 violations) - Operations UI
- **src/components/projects/onboarding** (79 violations) - User onboarding flow

## Notes

### Patterns Observed
1. **Chart/Map components are hex-heavy:** GISMap.tsx (34 hex), GrowthRates.tsx (34 hex), ExpenseBreakdownChart.tsx (23 hex)
   - **Recommendation:** Create a centralized `chartColorPalette.ts` using CoreUI tokens for data visualization

2. **Dark mode variants are mostly cleaned up:** Only 115 remaining (was 419)
   - Most remaining in: admin/dms/templates/page.tsx (22), benchmarks/BenchmarkAccordion.tsx (12)
   - **Recommendation:** Complete the dark mode migration in these last few files

3. **Admin pages need attention:** admin/dms/templates (44), admin/users (18)
   - Admin UI lagging behind public-facing components

4. **Demo/prototype pages polluting the codebase:**
   - breadcrumb-demo/page.tsx (46 violations)
   - **Recommendation:** Review and archive or clean up demo pages

### Recommendations for Next Cleanup Batch

**Immediate actions (next sprint):**
1. Archive or clean up `breadcrumb-demo/page.tsx` (46 violations)
2. Tackle the 20 quick-win files (66 total violations, easy targets)
3. Create `chartColorPalette.ts` and migrate GISMap + GrowthRates + chart components
4. Complete dark mode migration in remaining files (admin/dms/templates, benchmarks)

**Medium-term targets (next 2 sprints):**
5. Systematically clean up `src/app/components` folder (91 violations)
6. Focus on operations components (82 violations)
7. Clean up project onboarding flow (79 violations)

**Process improvements:**
- Add pre-commit hook to prevent new Tailwind color violations (enforce CoreUI-only)
- Create migration guide with before/after examples for common patterns
- Schedule weekly "CoreUI cleanup hour" for team to tackle quick wins together

---

**Analysis completed:** 2026-03-06  
**Next analysis recommended:** 2026-03-20 (2 weeks)
