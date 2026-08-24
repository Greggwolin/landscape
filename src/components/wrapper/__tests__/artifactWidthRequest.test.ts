import { widthForColumns } from '../artifactWidthRequest';

/* The budget schedule's four detail rungs, as schedule_view_spec.py defines
 * them on the slice-2b-2 branch. Kept here as literals rather than imported:
 * this test is about what the width model does with a column set, and pinning
 * the sets means a change to either side has to be a deliberate edit here. */
const RUNGS: Record<string, string[]> = {
  summary: ['group', 'amount', 'pct'],
  standard: ['category', 'description', 'uom', 'rate', 'amount'],
  detail: ['description', 'uom', 'rate', 'amount', 'start', 'duration'],
  all: [
    'division', 'category', 'stage', 'description', 'uom', 'rate', 'amount',
    'start', 'duration', 'start_date', 'end_date', 'timing_method',
    'curve_profile', 'curve_steepness', 'vendor', 'notes',
  ],
};

const cols = (keys: string[]) => keys.map((key) => ({ key }));

describe('widthForColumns', () => {
  it('asks for nothing when there are no columns', () => {
    // An artifact with no table must not pin the panel open at some minimum.
    expect(widthForColumns([])).toBe(0);
  });

  it('grows monotonically as columns are added', () => {
    const summary = widthForColumns(cols(RUNGS.summary));
    const standard = widthForColumns(cols(RUNGS.standard));
    const all = widthForColumns(cols(RUNGS.all));
    expect(standard).toBeGreaterThan(summary);
    expect(all).toBeGreaterThan(standard);
  });

  it('leaves the narrow rungs inside the default panel width', () => {
    // The panel opens at 25% of the viewport (~420px on a laptop) and only
    // grows on request. Summary must not trigger a grow — a three-column
    // summary widening the panel would be a regression, not a fix.
    expect(widthForColumns(cols(RUNGS.summary))).toBeLessThan(600);
  });

  it('asks for roughly two thousand pixels at the widest rung', () => {
    // The number itself is not sacred; the ORDER OF MAGNITUDE is the finding.
    // Seventeen columns do not fit a laptop panel at any width, which is why
    // the table keeps its own horizontal scroll (ScheduleArtifact.module.css
    // .scroll) rather than the panel pretending it can hold them.
    const all = widthForColumns(cols(RUNGS.all));
    expect(all).toBeGreaterThan(1800);
    expect(all).toBeLessThan(2300);
  });

  it('counts the hierarchy column, which the spec does not declare', () => {
    // ScheduleArtifact unshifts it locally when levels are open, so a width
    // model that only knew the spec's columns would undercount exactly when
    // the table is widest.
    const withHier = widthForColumns(cols(['__hier', ...RUNGS.all]));
    const without = widthForColumns(cols(RUNGS.all));
    expect(withHier).toBeGreaterThan(without);
  });

  it('falls back by kind, then to a floor, for a column it does not know', () => {
    const unknownNoKind = widthForColumns([{ key: 'no_such_column' }]);
    const unknownTextKind = widthForColumns([{ key: 'no_such_column', kind: 'text' }]);
    // Both must produce a usable width rather than zero — an unrecognised
    // column silently contributing nothing is how a table ends up one column
    // wider than the room it asked for.
    expect(unknownNoKind).toBeGreaterThan(0);
    expect(unknownTextKind).toBeGreaterThan(unknownNoKind);
  });

  it('prefers the column key over the kind where they disagree', () => {
    // `start` is a period NUMBER in two or three characters; `start_date` is a
    // formatted calendar date. Both would be mis-sized by kind alone.
    const start = widthForColumns([{ key: 'start', kind: 'number' }]);
    const startDate = widthForColumns([{ key: 'start_date', kind: 'date' }]);
    expect(startDate).toBeGreaterThan(start);
  });

  it('is pure — same columns, same answer, no window', () => {
    // Called during render on both sides of hydration. A width that measured
    // anything would be a hydration mismatch.
    const a = widthForColumns(cols(RUNGS.all));
    const b = widthForColumns(cols(RUNGS.all));
    expect(a).toBe(b);
  });
});
