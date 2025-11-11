import { sql } from '@/lib/db';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type NodeType = 'budget' | 'milestone';

interface GraphDependency {
  dependencyId: number;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
  isHard: boolean;
  predecessor: string;
  successor: string;
}

interface GraphNode {
  key: string;
  type: NodeType;
  dbId: number;
  name: string;
  durationDays: number;
  timingMethod?: string | null;
  timingLocked?: boolean;
  fixedStartDate?: Date;
  fixedFinishDate?: Date;
  plannedDate?: Date;
  projectId: number;
  predecessors: GraphDependency[];
  successors: GraphDependency[];
  earlyStart?: Date;
  earlyFinish?: Date;
  lateStart?: Date;
  lateFinish?: Date;
  floatDays?: number;
  isCritical?: boolean;
  originalStartDate?: Date;
  originalFinishDate?: Date;
}

interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  projectStartDate?: Date;
  projectEndDate?: Date;
  projectName?: string;
}

export interface TimelineCalculationResult {
  itemsUpdated: number;
  criticalPathLength: number;
  criticalItems: string[];
  warnings: string[];
  calculationTime: number;
}

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function parseDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return normalizeDate(value);
  return normalizeDate(new Date(value));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function differenceInDays(later: Date, earlier: Date): number {
  const laterCopy = normalizeDate(new Date(later));
  const earlierCopy = normalizeDate(new Date(earlier));
  const diff = laterCopy.getTime() - earlierCopy.getTime();
  return Math.round(diff / MS_PER_DAY);
}

function formatDate(value?: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().split('T')[0];
}

function maxDate(values: (Date | undefined)[]): Date | undefined {
  const filtered = values.filter(Boolean) as Date[];
  if (filtered.length === 0) return undefined;
  return filtered.reduce((latest, current) => (current > latest ? current : latest));
}

function minDate(values: (Date | undefined)[]): Date | undefined {
  const filtered = values.filter(Boolean) as Date[];
  if (filtered.length === 0) return undefined;
  return filtered.reduce((earliest, current) => (current < earliest ? current : earliest));
}

function createNodeKey(type: NodeType, id: number): string {
  return `${type}-${id}`;
}

export async function buildDependencyGraph(projectId: number): Promise<DependencyGraph> {
  const [budgetRows, milestoneRows, dependencyRows, projectRow] = await Promise.all([
    sql`
      SELECT
        fact_id,
        detail,
        start_date,
        end_date,
        baseline_start_date,
        baseline_end_date,
        timing_method,
        timing_locked,
        status,
        percent_complete,
        periods_to_complete
      FROM landscape.core_fin_fact_budget
      WHERE project_id = ${projectId}
    `,
    sql`
      SELECT
        milestone_id,
        milestone_name,
        milestone_code,
        current_date,
        planned_date,
        baseline_date,
        status,
        percent_complete
      FROM landscape.tbl_project_milestone
      WHERE project_id = ${projectId}
    `,
    sql`
      SELECT *
      FROM landscape.tbl_dependency
      WHERE project_id = ${projectId}
        AND is_active = TRUE
    `,
    sql`
      SELECT project_name, analysis_start_date, analysis_end_date
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
    `
  ]);

  const nodes = new Map<string, GraphNode>();

  for (const row of budgetRows as any[]) {
    const key = createNodeKey('budget', row.fact_id);
    const startDate = parseDate(row.start_date ?? row.baseline_start_date);
    const finishDate = parseDate(row.end_date ?? row.baseline_end_date);
    let durationDays = 1;
    if (startDate && finishDate) {
      durationDays = Math.max(1, differenceInDays(finishDate, startDate));
    } else if (row.periods_to_complete) {
      durationDays = Math.max(1, Number(row.periods_to_complete));
    }

    nodes.set(key, {
      key,
      type: 'budget',
      dbId: row.fact_id,
      projectId,
      name: row.detail || `Budget ${row.fact_id}`,
      durationDays,
      timingMethod: row.timing_method,
      timingLocked: Boolean(row.timing_locked),
      fixedStartDate: startDate ?? undefined,
      fixedFinishDate: finishDate ?? undefined,
      originalStartDate: startDate ?? undefined,
      originalFinishDate: finishDate ?? undefined,
      predecessors: [],
      successors: []
    });
  }

  for (const row of milestoneRows as any[]) {
    const key = createNodeKey('milestone', row.milestone_id);
    const anchorDate = parseDate(row.current_date ?? row.planned_date ?? row.baseline_date);
    nodes.set(key, {
      key,
      type: 'milestone',
      dbId: row.milestone_id,
      projectId,
      name: row.milestone_name || row.milestone_code || `Milestone ${row.milestone_id}`,
      durationDays: 0,
      plannedDate: anchorDate,
      fixedStartDate: anchorDate ?? undefined,
      predecessors: [],
      successors: []
    });
  }

  for (const dep of dependencyRows as any[]) {
    const predecessorKey = createNodeKey(dep.predecessor_type, dep.predecessor_id);
    const successorKey = createNodeKey(dep.successor_type, dep.successor_id);
    const predecessor = nodes.get(predecessorKey);
    const successor = nodes.get(successorKey);
    if (!predecessor || !successor) {
      continue;
    }

    const edge: GraphDependency = {
      dependencyId: dep.dependency_id,
      type: dep.dependency_type,
      lagDays: Number(dep.lag_days ?? 0),
      isHard: Boolean(dep.is_hard_constraint),
      predecessor: predecessorKey,
      successor: successorKey
    };

    predecessor.successors.push(edge);
    successor.predecessors.push(edge);
  }

  const project = projectRow[0];
  const candidateStarts = [
    parseDate(project?.analysis_start_date),
    ...Array.from(nodes.values())
      .map((node) => node.originalStartDate)
      .filter((d): d is Date => Boolean(d))
  ];
  const candidateEnds = [
    parseDate(project?.analysis_end_date),
    ...Array.from(nodes.values())
      .map((node) => node.originalFinishDate)
      .filter((d): d is Date => Boolean(d))
  ];

  return {
    nodes,
    projectStartDate: minDate(candidateStarts),
    projectEndDate: maxDate(candidateEnds),
    projectName: project?.project_name
  };
}

export function detectCircularDependencies(graph: DependencyGraph): string[] {
  const cycles: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(nodeKey: string, path: string[]) {
    if (visiting.has(nodeKey)) {
      cycles.push([...path, nodeKey].join(' → '));
      return;
    }

    if (visited.has(nodeKey)) {
      return;
    }

    visiting.add(nodeKey);
    path.push(nodeKey);
    const node = graph.nodes.get(nodeKey);
    if (node) {
      for (const edge of node.successors) {
        dfs(edge.successor, path);
      }
    }
    path.pop();
    visiting.delete(nodeKey);
    visited.add(nodeKey);
  }

  for (const nodeKey of graph.nodes.keys()) {
    if (!visited.has(nodeKey)) {
      dfs(nodeKey, []);
    }
  }

  return cycles;
}

export function topologicalSort(graph: DependencyGraph): GraphNode[] {
  const inDegree = new Map<string, number>();
  graph.nodes.forEach((node) => inDegree.set(node.key, node.predecessors.length));

  const queue: string[] = [];
  inDegree.forEach((count, key) => {
    if (count === 0) queue.push(key);
  });

  const sorted: GraphNode[] = [];
  while (queue.length > 0) {
    const key = queue.shift()!;
    const node = graph.nodes.get(key);
    if (!node) continue;
    sorted.push(node);

    for (const edge of node.successors) {
      const successorCount = (inDegree.get(edge.successor) ?? 0) - 1;
      inDegree.set(edge.successor, successorCount);
      if (successorCount === 0) {
        queue.push(edge.successor);
      }
    }
  }

  if (sorted.length !== graph.nodes.size) {
    throw new Error('Graph has cycles or disconnected nodes that prevented a topological sort');
  }

  return sorted;
}

function constraintDateForward(
  edge: GraphDependency,
  nodeMap: Map<string, GraphNode>
): Date | undefined {
  const predecessor = nodeMap.get(edge.predecessor);
  if (!predecessor || !predecessor.earlyStart || !predecessor.earlyFinish) {
    return undefined;
  }

  const lagged: Date = (() => {
    switch (edge.type) {
      case 'FS':
        return addDays(predecessor.earlyFinish, edge.lagDays);
      case 'SS':
        return addDays(predecessor.earlyStart, edge.lagDays);
      case 'FF':
        return addDays(predecessor.earlyFinish, edge.lagDays);
      case 'SF':
        return addDays(predecessor.earlyStart, edge.lagDays);
    }
  })();

  if (edge.type === 'FF' || edge.type === 'SF') {
    const target = nodeMap.get(edge.successor);
    if (!target) return undefined;
    return addDays(lagged, -target.durationDays);
  }

  return lagged;
}

function constraintDateBackward(
  edge: GraphDependency,
  nodeMap: Map<string, GraphNode>
): Date | undefined {
  const successor = nodeMap.get(edge.successor);
  if (!successor || !successor.lateStart || !successor.lateFinish) {
    return undefined;
  }

  const lagged: Date = (() => {
    switch (edge.type) {
      case 'FS':
        return addDays(successor.lateStart, -edge.lagDays);
      case 'SS':
        return addDays(successor.lateStart, -edge.lagDays);
      case 'FF':
        return addDays(successor.lateFinish, -edge.lagDays);
      case 'SF':
        return addDays(successor.lateFinish, -edge.lagDays);
    }
  })();

  if (edge.type === 'SS' || edge.type === 'SF') {
    const node = nodeMap.get(edge.predecessor);
    if (!node) return undefined;
    return addDays(lagged, -node.durationDays);
  }

  return lagged;
}

export function calculateForwardPass(sortedNodes: GraphNode[], projectStartDate?: Date): GraphNode[] {
  const nodeMap = new Map(sortedNodes.map((n) => [n.key, n]));
  for (const node of sortedNodes) {
    const candidates: Date[] = [];
    if (projectStartDate) {
      candidates.push(projectStartDate);
    }
    if (node.fixedStartDate && (node.timingLocked || node.timingMethod !== 'milestone')) {
      candidates.push(node.fixedStartDate);
    }
    for (const edge of node.predecessors) {
      const constraint = constraintDateForward(edge, nodeMap);
      if (constraint) {
        candidates.push(constraint);
      }
    }

    const earliest = maxDate(candidates) ?? node.fixedStartDate ?? projectStartDate ?? new Date();
    node.earlyStart = earliest;
    node.earlyFinish = addDays(earliest, node.durationDays);
  }

  return sortedNodes;
}

export function calculateBackwardPass(sortedNodes: GraphNode[], projectEndDate?: Date): GraphNode[] {
  const nodeMap = new Map(sortedNodes.map((node) => [node.key, node]));
  for (let index = sortedNodes.length - 1; index >= 0; index -= 1) {
    const node = sortedNodes[index];
    const candidates: Date[] = [];
    if (projectEndDate) {
      candidates.push(projectEndDate);
    }
    if (node.fixedFinishDate) {
      candidates.push(node.fixedFinishDate);
    }
    if (node.successors.length === 0 && !projectEndDate && node.earlyFinish) {
      candidates.push(node.earlyFinish);
    }

    for (const edge of node.successors) {
      const constraint = constraintDateBackward(edge, nodeMap);
      if (constraint) {
        candidates.push(constraint);
      }
    }

    const latest = minDate(candidates) ?? node.earlyFinish ?? node.earlyStart;
    if (latest) {
      node.lateFinish = latest;
      node.lateStart = addDays(latest, -node.durationDays);
    }
  }

  return sortedNodes;
}

export function calculateFloat(nodes: GraphNode[]): GraphNode[] {
  for (const node of nodes) {
    if (node.earlyFinish && node.lateFinish) {
      node.floatDays = Math.max(0, differenceInDays(node.lateFinish, node.earlyFinish));
      node.isCritical = node.floatDays === 0;
    } else {
      node.floatDays = undefined;
      node.isCritical = false;
    }
  }
  return nodes;
}

export function identifyCriticalPath(nodes: GraphNode[]): string[] {
  return nodes.filter((node) => node.isCritical).map((node) => node.key);
}

async function applyCalculatedDates(
  nodes: Map<string, GraphNode>,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    return;
  }

  await sql`BEGIN`;
  try {
    for (const node of nodes.values()) {
      if (node.type === 'budget') {
        const isMilestoneTiming = node.timingMethod === 'milestone';
        await sql`
          UPDATE landscape.core_fin_fact_budget
          SET
            early_start_date = ${formatDate(node.earlyStart)},
            early_finish_date = ${formatDate(node.earlyFinish)},
            late_start_date = ${formatDate(node.lateStart)},
            late_finish_date = ${formatDate(node.lateFinish)},
            float_days = ${node.floatDays ?? null},
            is_critical = ${node.isCritical ?? false},
            start_date = CASE WHEN ${isMilestoneTiming} THEN ${formatDate(node.earlyStart)} ELSE start_date END,
            end_date = CASE WHEN ${isMilestoneTiming} THEN ${formatDate(node.earlyFinish)} ELSE end_date END
          WHERE fact_id = ${node.dbId}
        `;
      } else {
        await sql`
          UPDATE landscape.tbl_project_milestone
          SET
            early_date = ${formatDate(node.earlyStart)},
            late_date = ${formatDate(node.lateFinish)},
            current_date = ${formatDate(node.earlyStart)},
            float_days = ${node.floatDays ?? null},
            is_critical = ${node.isCritical ?? false}
          WHERE milestone_id = ${node.dbId}
        `;
      }
    }

    await sql`COMMIT`;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
}

export async function recalculateProjectTimeline(
  projectId: number,
  options: {
    triggerEvent?: string;
    userId?: number;
    dryRun?: boolean;
    validateOnly?: boolean;
  } = {}
): Promise<TimelineCalculationResult> {
  const startTime = Date.now();
  const dryRun = Boolean(options.dryRun || options.validateOnly);

  const graph = await buildDependencyGraph(projectId);

  const cycles = detectCircularDependencies(graph);
  if (cycles.length > 0) {
    throw new Error(`Circular dependency detected: ${cycles.join('; ')}`);
  }

  const sortedNodes = topologicalSort(graph);
  calculateForwardPass(sortedNodes, graph.projectStartDate);
  calculateBackwardPass(sortedNodes, graph.projectEndDate);
  calculateFloat(sortedNodes);
  const criticalItems = identifyCriticalPath(sortedNodes);
  const criticalPathLength =
    criticalItems.length > 0
      ? sortedNodes.filter((node) => criticalItems.includes(node.key)).reduce((total, node) => total + node.durationDays, 0)
      : 0;

  await applyCalculatedDates(graph.nodes, dryRun);

  if (!dryRun) {
    const warningPayload = JSON.stringify([]);
    await sql`
      INSERT INTO landscape.tbl_timeline_calculation_log (
        project_id,
        calculation_type,
        trigger_event,
        items_updated,
        critical_path_length_days,
        calculation_duration_ms,
        warnings,
        calculated_by
      ) VALUES (
        ${projectId},
        ${options.triggerEvent ?? 'auto'},
        ${options.triggerEvent ?? 'auto'},
        ${sortedNodes.length},
        ${criticalPathLength},
        ${Date.now() - startTime},
        ${warningPayload},
        ${options.userId ?? null}
      )
    `;
  }

  return {
    itemsUpdated: sortedNodes.length,
    criticalPathLength,
    criticalItems,
    warnings: [],
    calculationTime: Date.now() - startTime
  };
}
