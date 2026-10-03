import type {
  AggregatedLineItem,
  AggregatedSchedule,
} from '@/lib/financial-engine/cashflow/aggregation';

/**
 * Empty periods do not render (Gregg, 2026-10-02): "when generating cash flow
 * schedules of any kind, if there are empty columns, they shouldnt render."
 *
 * A period is empty when every flow figure in it rounds to zero. Running
 * balances (cumulative, balance carried forward) are not flows and do not keep
 * a period alive on their own — callers pass only the flow rows. Removing a
 * period never changes a total, because everything removed is zero.
 */
export const EMPTY_EPSILON = 0.5;

/** Indices of the periods that carry at least one non-zero flow. */
export function nonEmptyPeriodIndices(
  flowRows: ReadonlyArray<ReadonlyArray<number | null | undefined>>,
  periodCount: number,
  epsilon: number = EMPTY_EPSILON,
): number[] {
  const keep: number[] = [];
  for (let i = 0; i < periodCount; i++) {
    if (flowRows.some((r) => Math.abs(Number(r[i] ?? 0)) >= epsilon)) keep.push(i);
  }
  return keep;
}

/** Pick the given indices out of an array. */
export function pick<T>(values: ReadonlyArray<T>, indices: ReadonlyArray<number>): T[] {
  return indices.map((i) => values[i]);
}

/**
 * The same cut for an aggregated engine schedule (periods as columns): every
 * line, child line and section subtotal is sliced to the periods that carry a
 * flow. A schedule with no flow at all, or the single-column "Total" view, is
 * returned unchanged.
 */
export function dropEmptyAggregatedPeriods(schedule: AggregatedSchedule): AggregatedSchedule {
  const n = schedule.periods.length;
  if (n <= 1) return schedule;
  const flows: number[][] = [];
  const collect = (li: AggregatedLineItem) => {
    flows.push(li.values);
    (li.childItems ?? []).forEach(collect);
  };
  for (const s of schedule.sections) {
    flows.push(s.subtotals);
    s.lineItems.forEach(collect);
  }
  const keep = nonEmptyPeriodIndices(flows, n);
  if (keep.length === 0 || keep.length === n) return schedule;
  const cut = (li: AggregatedLineItem): AggregatedLineItem => ({
    ...li,
    values: pick(li.values, keep),
    childItems: li.childItems?.map(cut),
  });
  return {
    ...schedule,
    periods: pick(schedule.periods, keep),
    sections: schedule.sections.map((s) => ({
      ...s,
      subtotals: pick(s.subtotals, keep),
      lineItems: s.lineItems.map(cut),
    })),
  };
}

/** Periods of a keyed-values grid (values: periodId → amount) that carry a flow. */
export function nonEmptyKeyedPeriods<P extends { id: string }>(
  periods: ReadonlyArray<P>,
  rows: ReadonlyArray<{ values: Record<string, number> }>,
  epsilon: number = EMPTY_EPSILON,
): P[] {
  if (periods.length <= 1) return periods.slice();
  const kept = periods.filter((p) => rows.some((r) => Math.abs(Number(r.values[p.id] ?? 0)) >= epsilon));
  return kept.length ? kept : periods.slice();
}
