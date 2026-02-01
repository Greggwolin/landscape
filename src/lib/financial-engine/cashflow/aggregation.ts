/**
 * Cash Flow Aggregation Utilities
 *
 * Functions to aggregate cash flow data by time scale (monthly → quarterly → annual → overall)
 * and to group costs by different granularity levels (summary, by scope, by phase).
 */

import type {
  CashFlowSchedule,
  CashFlowSection,
  CashFlowLineItem,
  CashFlowSummary,
  CalculationPeriod,
  PeriodValue,
  PeriodType,
} from './types';

// ============================================================================
// TIME SCALE AGGREGATION TYPES
// ============================================================================

export type TimeScale = 'monthly' | 'quarterly' | 'annual' | 'overall';

export interface AggregatedPeriod {
  periodIndex: number;
  label: string;
  startDate: Date;
  endDate: Date;
  sourceIndices: number[]; // Original period indices that were aggregated
}

export interface AggregatedSchedule {
  timeScale: TimeScale;
  periods: AggregatedPeriod[];
  sections: AggregatedSection[];
  summary: CashFlowSummary;
}

export interface AggregatedSection {
  sectionId: string;
  sectionName: string;
  lineItems: AggregatedLineItem[];
  subtotals: number[]; // Value per aggregated period
  sectionTotal: number;
  sortOrder: number;
}

export interface AggregatedLineItem {
  lineId: string;
  category: string;
  subcategory: string;
  description: string;
  containerId?: number;
  containerLabel?: string;
  values: number[]; // Value per aggregated period
  total: number;
  childItems?: AggregatedLineItem[]; // Nested items for hierarchical display (e.g., categories within stages)
}

// ============================================================================
// COST GRANULARITY TYPES
// ============================================================================

export type CostGranularity = 'summary' | 'by_stage' | 'by_category' | 'by_phase';

// ============================================================================
// TIME SCALE AGGREGATION
// ============================================================================

/**
 * Aggregate monthly periods to quarters
 */
export function aggregateToQuarters(schedule: CashFlowSchedule): AggregatedSchedule {
  const periods = schedule.periods;
  const quarterMap = new Map<string, { period: AggregatedPeriod; indices: number[] }>();

  // Group periods by quarter
  periods.forEach((p, index) => {
    // Parse date components directly from ISO string to avoid timezone issues
    const startDateStr = typeof p.startDate === 'string'
      ? p.startDate
      : p.startDate.toISOString();
    const year = parseInt(startDateStr.substring(0, 4), 10);
    const month = parseInt(startDateStr.substring(5, 7), 10);
    const quarter = Math.ceil(month / 3);
    const key = `${year}-Q${quarter}`;

    if (!quarterMap.has(key)) {
      const qStart = new Date(year, (quarter - 1) * 3, 1);
      const qEnd = new Date(year, quarter * 3, 0);
      quarterMap.set(key, {
        period: {
          periodIndex: quarterMap.size,
          label: `Q${quarter} ${year}`,
          startDate: qStart,
          endDate: qEnd,
          sourceIndices: [],
        },
        indices: [],
      });
    }
    quarterMap.get(key)!.indices.push(index);
    quarterMap.get(key)!.period.sourceIndices.push(index);
  });

  const aggregatedPeriods = Array.from(quarterMap.values()).map((q, i) => ({
    ...q.period,
    periodIndex: i,
  }));

  // Aggregate sections
  const aggregatedSections = schedule.sections.map((section) =>
    aggregateSection(section, Array.from(quarterMap.values()).map((q) => q.indices))
  );

  return {
    timeScale: 'quarterly',
    periods: aggregatedPeriods,
    sections: aggregatedSections,
    summary: schedule.summary,
  };
}

/**
 * Aggregate monthly periods to years
 */
export function aggregateToYears(schedule: CashFlowSchedule): AggregatedSchedule {
  const periods = schedule.periods;
  const yearMap = new Map<number, { period: AggregatedPeriod; indices: number[] }>();

  // Group periods by year
  periods.forEach((p, index) => {
    // Parse year directly from ISO string to avoid timezone issues
    // new Date("2026-01-01") interprets as UTC, which in US timezones
    // becomes Dec 31, 2025 local time - causing wrong year grouping
    const startDateStr = typeof p.startDate === 'string'
      ? p.startDate
      : p.startDate.toISOString();
    const year = parseInt(startDateStr.substring(0, 4), 10);

    if (!yearMap.has(year)) {
      yearMap.set(year, {
        period: {
          periodIndex: yearMap.size,
          label: `${year}`,
          startDate: new Date(year, 0, 1),
          endDate: new Date(year, 11, 31),
          sourceIndices: [],
        },
        indices: [],
      });
    }
    yearMap.get(year)!.indices.push(index);
    yearMap.get(year)!.period.sourceIndices.push(index);
  });

  const aggregatedPeriods = Array.from(yearMap.values()).map((y, i) => ({
    ...y.period,
    periodIndex: i,
  }));

  // Aggregate sections
  const aggregatedSections = schedule.sections.map((section) =>
    aggregateSection(section, Array.from(yearMap.values()).map((y) => y.indices))
  );

  return {
    timeScale: 'annual',
    periods: aggregatedPeriods,
    sections: aggregatedSections,
    summary: schedule.summary,
  };
}

/**
 * Sum all periods into a single "overall" value
 */
export function sumAllPeriods(schedule: CashFlowSchedule): AggregatedSchedule {
  const periods = schedule.periods;
  const allIndices = periods.map((_, i) => i);

  const aggregatedPeriod: AggregatedPeriod = {
    periodIndex: 0,
    label: 'Total',
    startDate: new Date(periods[0]?.startDate || new Date()),
    endDate: new Date(periods[periods.length - 1]?.endDate || new Date()),
    sourceIndices: allIndices,
  };

  // Aggregate sections - wrap allIndices in array to represent single aggregated period
  const aggregatedSections = schedule.sections.map((section) =>
    aggregateSection(section, [allIndices])
  );

  return {
    timeScale: 'overall',
    periods: [aggregatedPeriod],
    sections: aggregatedSections,
    summary: schedule.summary,
  };
}

/**
 * Keep monthly granularity (just reshape to aggregated format)
 */
export function keepMonthly(schedule: CashFlowSchedule): AggregatedSchedule {
  const aggregatedPeriods: AggregatedPeriod[] = schedule.periods.map((p, i) => ({
    periodIndex: i,
    label: p.label,
    startDate: new Date(p.startDate),
    endDate: new Date(p.endDate),
    sourceIndices: [i],
  }));

  // Convert sections to aggregated format (each period maps to itself)
  const aggregatedSections = schedule.sections.map((section) =>
    aggregateSection(
      section,
      schedule.periods.map((_, i) => [i])
    )
  );

  return {
    timeScale: 'monthly',
    periods: aggregatedPeriods,
    sections: aggregatedSections,
    summary: schedule.summary,
  };
}

/**
 * Helper: Aggregate a section's line items based on period groupings
 */
function aggregateSection(
  section: CashFlowSection,
  periodGroupings: number[][]
): AggregatedSection {
  const aggregatedItems: AggregatedLineItem[] = section.lineItems.map((item) => {
    const values = periodGroupings.map((indices) => {
      return indices.reduce((sum, idx) => {
        const periodValue = item.periods.find((p) => p.periodIndex === idx);
        return sum + (periodValue?.amount || 0);
      }, 0);
    });

    return {
      lineId: item.lineId,
      category: item.category,
      subcategory: item.subcategory,
      description: item.description,
      containerId: item.containerId,
      containerLabel: item.containerLabel,
      values,
      total: item.total,
    };
  });

  // Calculate subtotals for each aggregated period
  const subtotals = periodGroupings.map((_, periodIdx) => {
    return aggregatedItems.reduce((sum, item) => sum + (item.values[periodIdx] || 0), 0);
  });

  return {
    sectionId: section.sectionId,
    sectionName: section.sectionName,
    lineItems: aggregatedItems,
    subtotals,
    sectionTotal: section.sectionTotal,
    sortOrder: section.sortOrder,
  };
}

/**
 * Main aggregation function - select time scale and apply
 */
export function aggregateByTimeScale(
  schedule: CashFlowSchedule,
  timeScale: TimeScale
): AggregatedSchedule {
  switch (timeScale) {
    case 'monthly':
      return keepMonthly(schedule);
    case 'quarterly':
      return aggregateToQuarters(schedule);
    case 'annual':
      return aggregateToYears(schedule);
    case 'overall':
      return sumAllPeriods(schedule);
    default:
      return keepMonthly(schedule);
  }
}

// ============================================================================
// COST GRANULARITY GROUPING
// ============================================================================

/**
 * Group costs into summary categories
 * Returns sections collapsed to: Land Acquisition, Planning, Development, Soft Costs, etc.
 */
export function groupCostsBySummary(schedule: AggregatedSchedule): AggregatedSchedule {
  // Map categories to summary groups
  const summaryGroups: Record<string, string> = {
    acquisition: 'Land Acquisition',
    planning: 'Planning & Entitlements',
    development: 'Development Costs',
    soft: 'Soft Costs',
    financing: 'Financing',
    contingency: 'Contingency',
    other: 'Other Costs',
  };

  const groupMap = new Map<string, AggregatedSection>();

  // Get cost sections (exclude revenue)
  const costSections = schedule.sections.filter(
    (s) => !s.sectionName.toLowerCase().includes('revenue')
  );

  costSections.forEach((section) => {
    // Determine which summary group this section belongs to
    let groupKey = 'other';
    for (const [key, _] of Object.entries(summaryGroups)) {
      if (section.sectionName.toLowerCase().includes(key)) {
        groupKey = key;
        break;
      }
    }

    const groupName = summaryGroups[groupKey] || 'Other Costs';

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        sectionId: `summary-${groupKey}`,
        sectionName: groupName,
        lineItems: [],
        subtotals: new Array(schedule.periods.length).fill(0),
        sectionTotal: 0,
        sortOrder: getSummaryGroupOrder(groupKey),
      });
    }

    const group = groupMap.get(groupKey)!;
    group.lineItems.push(...section.lineItems);
    group.sectionTotal += section.sectionTotal;
    section.subtotals.forEach((val, idx) => {
      group.subtotals[idx] += val;
    });
  });

  // Keep revenue sections unchanged - put them FIRST (before costs)
  const revenueSections = schedule.sections.filter((s) =>
    s.sectionName.toLowerCase().includes('revenue')
  );

  return {
    ...schedule,
    sections: [
      ...revenueSections,
      ...Array.from(groupMap.values()).sort((a, b) => a.sortOrder - b.sortOrder),
    ],
  };
}

/**
 * Group costs by stage/activity (Development, Planning & Engineering, etc.)
 * Returns sections by lifecycle stage
 */
export function groupCostsByStage(schedule: AggregatedSchedule): AggregatedSchedule {
  const stageMap = new Map<string, AggregatedSection>();

  const costSections = schedule.sections.filter(
    (s) => !s.sectionName.toLowerCase().includes('revenue')
  );

  costSections.forEach((section) => {
    section.lineItems.forEach((item) => {
      // Use subcategory field which contains stage/activity (e.g., "DEVELOPMENT COSTS")
      // Note: category is just 'cost' for all cost items, subcategory has the stage name
      const stageKey = item.subcategory || 'OTHER COSTS';
      const stageName = formatStageName(stageKey);

      if (!stageMap.has(stageKey)) {
        stageMap.set(stageKey, {
          sectionId: `stage-${stageKey}`,
          sectionName: stageName,
          lineItems: [],
          subtotals: new Array(schedule.periods.length).fill(0),
          sectionTotal: 0,
          sortOrder: getStageOrder(stageKey),
        });
      }

      const stage = stageMap.get(stageKey)!;
      stage.lineItems.push(item);
      stage.sectionTotal += item.total;
      item.values.forEach((val, idx) => {
        stage.subtotals[idx] += val;
      });
    });
  });

  // Keep revenue sections unchanged - put them FIRST (before costs)
  const revenueSections = schedule.sections.filter((s) =>
    s.sectionName.toLowerCase().includes('revenue')
  );

  return {
    ...schedule,
    sections: [
      ...revenueSections,
      ...Array.from(stageMap.values()).sort((a, b) => a.sortOrder - b.sortOrder),
    ],
  };
}

/**
 * Group costs by category/description (Offsite Improvements, Onsite Improvements, etc.)
 * Returns sections by line item category
 */
export function groupCostsByCategory(schedule: AggregatedSchedule): AggregatedSchedule {
  const categoryMap = new Map<string, AggregatedSection>();

  const costSections = schedule.sections.filter(
    (s) => !s.sectionName.toLowerCase().includes('revenue')
  );

  costSections.forEach((section) => {
    section.lineItems.forEach((item) => {
      // Use description field for detailed category grouping (e.g., "Offsite Improvements")
      // Note: subcategory contains the stage, description has the cost category
      const categoryKey = item.description || 'Other';
      const categoryName = formatCategoryName(categoryKey);

      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          sectionId: `category-${categoryKey}`,
          sectionName: categoryName,
          lineItems: [],
          subtotals: new Array(schedule.periods.length).fill(0),
          sectionTotal: 0,
          sortOrder: categoryMap.size,
        });
      }

      const category = categoryMap.get(categoryKey)!;
      category.lineItems.push(item);
      category.sectionTotal += item.total;
      item.values.forEach((val, idx) => {
        category.subtotals[idx] += val;
      });
    });
  });

  // Keep revenue sections unchanged - put them FIRST (before costs)
  const revenueSections = schedule.sections.filter((s) =>
    s.sectionName.toLowerCase().includes('revenue')
  );

  return {
    ...schedule,
    sections: [
      ...revenueSections,
      ...Array.from(categoryMap.values()).sort((a, b) => a.sectionName.localeCompare(b.sectionName)),
    ],
  };
}

/**
 * Group costs AND revenue by phase/container
 * Returns flat sections (REVENUE, PROJECT COSTS) with phase labels appended to line items
 * e.g., "Gross Revenue: Phase 1.2"
 */
export function groupCostsByPhase(schedule: AggregatedSchedule): AggregatedSchedule {
  const periodCount = schedule.periods.length;

  // ========== COLLECT REVENUE BY PHASE ==========
  const grossRevenueItems: AggregatedLineItem[] = [];
  const deductionItems: AggregatedLineItem[] = [];
  const netRevenueItems: AggregatedLineItem[] = [];

  // Totals for section subtotals
  let grossRevenueTotal = 0;
  const grossRevenueSubtotals = new Array(periodCount).fill(0);
  let deductionsTotal = 0;
  const deductionsSubtotals = new Array(periodCount).fill(0);
  let netRevenueTotal = 0;
  const netRevenueSubtotals = new Array(periodCount).fill(0);

  const revenueSections = schedule.sections.filter((s) =>
    s.sectionName.toLowerCase().includes('revenue')
  );

  revenueSections.forEach((section) => {
    const isGross = section.sectionId === 'revenue-gross';
    const isDeductions = section.sectionId === 'revenue-deductions';
    const isNet = section.sectionId === 'revenue-net';

    section.lineItems.forEach((item, itemIdx) => {
      const phaseName = item.containerLabel || 'Project Level';
      const labelSuffix = item.containerId ? `: ${phaseName}` : '';
      // Use original lineId + container to ensure uniqueness
      const uniqueSuffix = `${item.containerId ?? 'project'}-${item.lineId || itemIdx}`;

      if (isGross) {
        grossRevenueItems.push({
          ...item,
          lineId: `by-phase-gross-${uniqueSuffix}`,
          description: `Gross Revenue${labelSuffix}`,
        });
        grossRevenueTotal += item.total;
        item.values.forEach((val, idx) => {
          grossRevenueSubtotals[idx] += val;
        });
      } else if (isDeductions) {
        deductionItems.push({
          ...item,
          lineId: `by-phase-deduction-${uniqueSuffix}`,
          description: `Subdivision Costs${labelSuffix}`,
        });
        deductionsTotal += item.total;
        item.values.forEach((val, idx) => {
          deductionsSubtotals[idx] += val;
        });
      } else if (isNet) {
        netRevenueItems.push({
          ...item,
          lineId: `by-phase-net-${uniqueSuffix}`,
          description: `Net Revenue${labelSuffix}`,
        });
        netRevenueTotal += item.total;
        item.values.forEach((val, idx) => {
          netRevenueSubtotals[idx] += val;
        });
      }
    });
  });

  // Sort revenue items by phase name
  const sortByPhase = (a: AggregatedLineItem, b: AggregatedLineItem) =>
    (a.containerLabel || '').localeCompare(b.containerLabel || '');
  grossRevenueItems.sort(sortByPhase);
  deductionItems.sort(sortByPhase);
  netRevenueItems.sort(sortByPhase);

  // ========== COLLECT COSTS BY PHASE ==========
  // Structure: stage -> phase -> items (so we group by stage first, then show phases within)
  const costsByStagePhase = new Map<
    string,
    {
      stageName: string;
      phaseItems: Map<string, { phaseName: string; items: AggregatedLineItem[]; total: number; subtotals: number[] }>;
      projectItems: { items: AggregatedLineItem[]; total: number; subtotals: number[] };
    }
  >();

  const costSections = schedule.sections.filter(
    (s) => !s.sectionName.toLowerCase().includes('revenue')
  );

  costSections.forEach((section) => {
    section.lineItems.forEach((item) => {
      const stageKey = item.subcategory || 'OTHER COSTS';

      if (!costsByStagePhase.has(stageKey)) {
        costsByStagePhase.set(stageKey, {
          stageName: stageKey,
          phaseItems: new Map(),
          projectItems: { items: [], total: 0, subtotals: new Array(periodCount).fill(0) },
        });
      }

      const stageData = costsByStagePhase.get(stageKey)!;

      if (!item.containerId) {
        // Project-level cost
        stageData.projectItems.items.push(item);
        stageData.projectItems.total += item.total;
        item.values.forEach((val, idx) => {
          stageData.projectItems.subtotals[idx] += val;
        });
      } else {
        // Phase-level cost
        const phaseKey = String(item.containerId);
        const phaseName = item.containerLabel || `Phase ${item.containerId}`;

        if (!stageData.phaseItems.has(phaseKey)) {
          stageData.phaseItems.set(phaseKey, {
            phaseName,
            items: [],
            total: 0,
            subtotals: new Array(periodCount).fill(0),
          });
        }

        const phaseData = stageData.phaseItems.get(phaseKey)!;
        phaseData.items.push(item);
        phaseData.total += item.total;
        item.values.forEach((val, idx) => {
          phaseData.subtotals[idx] += val;
        });
      }
    });
  });

  // Build cost line items grouped by stage, with phase suffix
  const costLineItems: AggregatedLineItem[] = [];
  let totalCosts = 0;
  const totalCostsSubtotals = new Array(periodCount).fill(0);

  // Sort stages by order
  const sortedStages = Array.from(costsByStagePhase.entries()).sort(
    (a, b) => getStageOrder(a[0]) - getStageOrder(b[0])
  );

  sortedStages.forEach(([stageKey, stageData]) => {
    // Project-level items first (no suffix)
    if (stageData.projectItems.total !== 0) {
      costLineItems.push({
        lineId: `by-phase-cost-${stageKey}-project`,
        category: 'cost',
        subcategory: stageKey,
        description: stageData.stageName,
        values: stageData.projectItems.subtotals,
        total: stageData.projectItems.total,
        childItems: stageData.projectItems.items,
      });
      totalCosts += stageData.projectItems.total;
      stageData.projectItems.subtotals.forEach((val, idx) => {
        totalCostsSubtotals[idx] += val;
      });
    }

    // Phase items sorted by phase name
    const sortedPhases = Array.from(stageData.phaseItems.entries()).sort(
      (a, b) => a[1].phaseName.localeCompare(b[1].phaseName)
    );

    sortedPhases.forEach(([phaseKey, phaseData]) => {
      if (phaseData.total !== 0) {
        costLineItems.push({
          lineId: `by-phase-cost-${stageKey}-${phaseKey}`,
          category: 'cost',
          subcategory: stageKey,
          description: `${stageData.stageName}: ${phaseData.phaseName}`,
          containerId: Number(phaseKey),
          containerLabel: phaseData.phaseName,
          values: phaseData.subtotals,
          total: phaseData.total,
          childItems: phaseData.items,
        });
        totalCosts += phaseData.total;
        phaseData.subtotals.forEach((val, idx) => {
          totalCostsSubtotals[idx] += val;
        });
      }
    });
  });

  // ========== BUILD SECTIONS ==========
  const sections: AggregatedSection[] = [];

  // GROSS REVENUE section
  sections.push({
    sectionId: 'phase-revenue-gross',
    sectionName: 'GROSS REVENUE',
    lineItems: grossRevenueItems,
    subtotals: grossRevenueSubtotals,
    sectionTotal: grossRevenueTotal,
    sortOrder: 1,
  });

  // REVENUE DEDUCTIONS section (only if there are deductions)
  if (deductionsTotal !== 0) {
    sections.push({
      sectionId: 'phase-revenue-deductions',
      sectionName: 'REVENUE DEDUCTIONS',
      lineItems: deductionItems,
      subtotals: deductionsSubtotals,
      sectionTotal: deductionsTotal,
      sortOrder: 2,
    });
  }

  // NET REVENUE section
  sections.push({
    sectionId: 'phase-revenue-net',
    sectionName: 'NET REVENUE',
    lineItems: netRevenueItems,
    subtotals: netRevenueSubtotals,
    sectionTotal: netRevenueTotal,
    sortOrder: 3,
  });

  // PROJECT COSTS section
  sections.push({
    sectionId: 'phase-costs',
    sectionName: 'PROJECT COSTS',
    lineItems: costLineItems,
    subtotals: totalCostsSubtotals,
    sectionTotal: totalCosts,
    sortOrder: 4,
  });

  return {
    ...schedule,
    sections,
  };
}

/**
 * Main grouping function - select cost granularity and apply
 */
export function groupByGranularity(
  schedule: AggregatedSchedule,
  granularity: CostGranularity
): AggregatedSchedule {
  switch (granularity) {
    case 'summary':
      return groupCostsBySummary(schedule);
    case 'by_stage':
      return groupCostsByStage(schedule);
    case 'by_category':
      return groupCostsByCategory(schedule);
    case 'by_phase':
      return groupCostsByPhase(schedule);
    default:
      return schedule;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSummaryGroupOrder(key: string): number {
  const order: Record<string, number> = {
    acquisition: 1,
    planning: 2,
    development: 3,
    soft: 4,
    financing: 5,
    contingency: 6,
    other: 7,
  };
  return order[key] || 99;
}

/**
 * Get sort order for stage (activity) grouping
 */
function getStageOrder(stageKey: string): number {
  const order: Record<string, number> = {
    'Land Acquisition': 1,
    'Planning & Engineering': 2,
    'Development Costs': 3,
    'Operating Costs': 4,
    'Financing Costs': 5,
    'Disposition Costs': 6,
    'Contingency': 98,
    'Other Costs': 99,
  };
  return order[stageKey] || 50;
}

/**
 * Format stage name for display (already uppercase from activity mapping)
 */
function formatStageName(key: string): string {
  // Already formatted from ACTIVITY_CATEGORY_MAP in costs.ts
  return key;
}

/**
 * Format category name for display
 */
function formatCategoryName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================================
// COMBINED TRANSFORMATION
// ============================================================================

/**
 * Apply both time scale aggregation and cost granularity grouping
 */
export function transformCashFlow(
  schedule: CashFlowSchedule,
  timeScale: TimeScale,
  granularity: CostGranularity
): AggregatedSchedule {
  // First aggregate by time
  const aggregated = aggregateByTimeScale(schedule, timeScale);
  // Then group by cost granularity
  return groupByGranularity(aggregated, granularity);
}
