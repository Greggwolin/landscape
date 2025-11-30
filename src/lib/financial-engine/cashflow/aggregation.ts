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
    const date = new Date(p.startDate);
    const year = date.getFullYear();
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
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
    const date = new Date(p.startDate);
    const year = date.getFullYear();

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
 * Group costs by phase/container
 * Returns sections organized by Area/Phase hierarchy with stage subtotals as line items
 */
export function groupCostsByPhase(schedule: AggregatedSchedule): AggregatedSchedule {
  // Structure: phase -> stage -> items
  const phaseStageMap = new Map<
    string,
    {
      phaseName: string;
      stages: Map<string, { items: AggregatedLineItem[]; total: number; subtotals: number[] }>;
    }
  >();

  // Project-level stages
  const projectLevelStages = new Map<
    string,
    { items: AggregatedLineItem[]; total: number; subtotals: number[] }
  >();

  const costSections = schedule.sections.filter(
    (s) => !s.sectionName.toLowerCase().includes('revenue')
  );

  costSections.forEach((section) => {
    section.lineItems.forEach((item) => {
      // Get stage from subcategory (e.g., "DEVELOPMENT COSTS")
      const stageKey = item.subcategory || 'OTHER COSTS';

      if (!item.containerId) {
        // Project-level item - group by stage
        if (!projectLevelStages.has(stageKey)) {
          projectLevelStages.set(stageKey, {
            items: [],
            total: 0,
            subtotals: new Array(schedule.periods.length).fill(0),
          });
        }
        const stage = projectLevelStages.get(stageKey)!;
        stage.items.push(item);
        stage.total += item.total;
        item.values.forEach((val, idx) => {
          stage.subtotals[idx] += val;
        });
      } else {
        // Phase-level item
        const phaseKey = String(item.containerId);
        const phaseName = item.containerLabel || `Phase ${item.containerId}`;

        if (!phaseStageMap.has(phaseKey)) {
          phaseStageMap.set(phaseKey, {
            phaseName,
            stages: new Map(),
          });
        }

        const phase = phaseStageMap.get(phaseKey)!;
        if (!phase.stages.has(stageKey)) {
          phase.stages.set(stageKey, {
            items: [],
            total: 0,
            subtotals: new Array(schedule.periods.length).fill(0),
          });
        }

        const stage = phase.stages.get(stageKey)!;
        stage.items.push(item);
        stage.total += item.total;
        item.values.forEach((val, idx) => {
          stage.subtotals[idx] += val;
        });
      }
    });
  });

  // Build sections - each phase becomes a section, line items are stage subtotals
  const sections: AggregatedSection[] = [];

  // Project-level section (if any)
  if (projectLevelStages.size > 0) {
    const projectLineItems: AggregatedLineItem[] = [];
    let projectTotal = 0;
    const projectSubtotals = new Array(schedule.periods.length).fill(0);

    projectLevelStages.forEach((stageData, stageName) => {
      projectLineItems.push({
        lineId: `project-${stageName}`,
        category: 'cost',
        subcategory: stageName,
        description: stageName, // Show stage name as the line item
        values: stageData.subtotals,
        total: stageData.total,
        childItems: stageData.items, // Include original category items for detail view
      });
      projectTotal += stageData.total;
      stageData.subtotals.forEach((val, idx) => {
        projectSubtotals[idx] += val;
      });
    });

    // Sort by stage order
    projectLineItems.sort((a, b) => getStageOrder(a.description) - getStageOrder(b.description));

    sections.push({
      sectionId: 'phase-project',
      sectionName: 'Project Level',
      lineItems: projectLineItems,
      subtotals: projectSubtotals,
      sectionTotal: projectTotal,
      sortOrder: 0,
    });
  }

  // Phase sections
  const sortedPhases = Array.from(phaseStageMap.entries()).sort((a, b) =>
    a[1].phaseName.localeCompare(b[1].phaseName)
  );

  sortedPhases.forEach(([phaseKey, phaseData], idx) => {
    const phaseLineItems: AggregatedLineItem[] = [];
    let phaseTotal = 0;
    const phaseSubtotals = new Array(schedule.periods.length).fill(0);

    phaseData.stages.forEach((stageData, stageName) => {
      phaseLineItems.push({
        lineId: `phase-${phaseKey}-${stageName}`,
        category: 'cost',
        subcategory: stageName,
        description: stageName, // Show stage name as the line item
        containerId: Number(phaseKey),
        containerLabel: phaseData.phaseName,
        values: stageData.subtotals,
        total: stageData.total,
        childItems: stageData.items, // Include original category items for detail view
      });
      phaseTotal += stageData.total;
      stageData.subtotals.forEach((val, idx) => {
        phaseSubtotals[idx] += val;
      });
    });

    // Sort by stage order
    phaseLineItems.sort((a, b) => getStageOrder(a.description) - getStageOrder(b.description));

    sections.push({
      sectionId: `phase-${phaseKey}`,
      sectionName: phaseData.phaseName,
      lineItems: phaseLineItems,
      subtotals: phaseSubtotals,
      sectionTotal: phaseTotal,
      sortOrder: idx + 1,
    });
  });

  // Keep revenue sections unchanged - put them FIRST (before costs)
  const revenueSections = schedule.sections.filter((s) =>
    s.sectionName.toLowerCase().includes('revenue')
  );

  return {
    ...schedule,
    sections: [...revenueSections, ...sections],
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
