/**
 * Opening a budget line must not write a contingency onto it.
 *
 * The tile used to seed state with 10% and let a 1s debounce persist it, so
 * merely opening a line stamped a contingency the estimator never chose. These
 * tests drive the same gating the tile's debounced effect runs
 * (`saveIntent` -> onFieldChange -> `markSaved`) through mount, idle and edit.
 */

import {
  contingencyAmountOf,
  editDraft,
  formatContingencyInput,
  initDraft,
  markSaved,
  parseContingencyInput,
  saveIntent,
  type FieldDraft,
} from '../costControlsSave';

/**
 * Stand-in for the tile's debounced effect: it asks whether to save, calls
 * onFieldChange if so, and folds the write back into the draft.
 */
function runDebouncedSave<T>(
  draft: FieldDraft<T>,
  onFieldChange: (field: string, value: T) => void,
  field = 'contingency_pct',
): FieldDraft<T> {
  const intent = saveIntent(draft);
  if (!intent.save) return draft;
  onFieldChange(field, intent.value);
  return markSaved(draft, intent.value);
}

describe('opening a budget line writes nothing', () => {
  it('saves no contingency when a line with none set is opened', () => {
    const onFieldChange = jest.fn();

    const opened = initDraft<number | null>(null); // item.contingency_pct is null
    runDebouncedSave(opened, onFieldChange);

    expect(onFieldChange).not.toHaveBeenCalled();
    expect(opened.value).toBeNull(); // no 10% of the app's own invention
  });

  it('does not overwrite a contingency the line already carries', () => {
    const onFieldChange = jest.fn();

    const opened = initDraft<number | null>(7.5);
    runDebouncedSave(opened, onFieldChange);

    expect(onFieldChange).not.toHaveBeenCalled();
    expect(opened.value).toBe(7.5);
  });

  it('saves nothing for notes or vendor either, on open', () => {
    const onFieldChange = jest.fn();

    runDebouncedSave(initDraft(''), onFieldChange, 'notes');
    runDebouncedSave(initDraft('Sunbelt Grading'), onFieldChange, 'vendor_name');

    expect(onFieldChange).not.toHaveBeenCalled();
  });

  it('still writes nothing when the tile re-renders many times', () => {
    const onFieldChange = jest.fn();

    let draft = initDraft<number | null>(null);
    for (let i = 0; i < 5; i++) {
      draft = runDebouncedSave(draft, onFieldChange);
    }

    expect(onFieldChange).not.toHaveBeenCalled();
  });
});

describe('a contingency the user sets is saved', () => {
  it('saves a user-set 0% as 0, not as unset and not as a default', () => {
    const onFieldChange = jest.fn();

    const opened = initDraft<number | null>(null);
    const typed = editDraft(opened, parseContingencyInput('0%'));
    runDebouncedSave(typed, onFieldChange);

    expect(onFieldChange).toHaveBeenCalledTimes(1);
    expect(onFieldChange).toHaveBeenCalledWith('contingency_pct', 0);
    // 0 is a decision, so it must not arrive as null or as the old 10 default.
    const [, saved] = onFieldChange.mock.calls[0];
    expect(saved).not.toBeNull();
    expect(Object.is(saved, 0)).toBe(true);
  });

  it('saves a normal percentage the user types', () => {
    const onFieldChange = jest.fn();

    const typed = editDraft(initDraft<number | null>(null), parseContingencyInput('12%'));
    runDebouncedSave(typed, onFieldChange);

    expect(onFieldChange).toHaveBeenCalledWith('contingency_pct', 12);
  });

  it('saves a clear-out as unset rather than as 0', () => {
    const onFieldChange = jest.fn();

    const cleared = editDraft(initDraft<number | null>(15), parseContingencyInput(''));
    runDebouncedSave(cleared, onFieldChange);

    expect(onFieldChange).toHaveBeenCalledWith('contingency_pct', null);
  });

  it('lets a user set a value, then revert to what was stored', () => {
    const onFieldChange = jest.fn();

    const opened = initDraft<number | null>(5);
    const afterFirst = runDebouncedSave(editDraft(opened, 20), onFieldChange);
    runDebouncedSave(editDraft(afterFirst, 5), onFieldChange);

    expect(onFieldChange.mock.calls).toEqual([
      ['contingency_pct', 20],
      ['contingency_pct', 5],
    ]);
  });

  it('does not re-save a value that has already been written', () => {
    const onFieldChange = jest.fn();

    const saved = runDebouncedSave(editDraft(initDraft<number | null>(null), 15), onFieldChange);
    const again = runDebouncedSave(saved, onFieldChange); // effect re-runs, nothing new
    runDebouncedSave(again, onFieldChange);

    expect(onFieldChange).toHaveBeenCalledTimes(1);
  });

  it('does not save when an edit lands back on the stored value', () => {
    const onFieldChange = jest.fn();

    const draft = editDraft(initDraft<number | null>(10), 10);
    runDebouncedSave(draft, onFieldChange);

    expect(onFieldChange).not.toHaveBeenCalled();
  });
});

describe('reading the contingency field', () => {
  it('treats an empty field as not set, never as 0', () => {
    expect(parseContingencyInput('')).toBeNull();
    expect(parseContingencyInput('  ')).toBeNull();
    expect(parseContingencyInput('%')).toBeNull();
  });

  it('treats text that is not a number as not set, rather than 0', () => {
    expect(parseContingencyInput('abc')).toBeNull();
  });

  it('reads a typed zero as zero', () => {
    expect(parseContingencyInput('0')).toBe(0);
    expect(parseContingencyInput('0%')).toBe(0);
  });

  it('reads ordinary percentages', () => {
    expect(parseContingencyInput('12')).toBe(12);
    expect(parseContingencyInput('12.5%')).toBe(12.5);
  });

  it('shows an unset contingency as an empty field', () => {
    expect(formatContingencyInput(null)).toBe('');
  });

  it('shows a set contingency, zero included', () => {
    expect(formatContingencyInput(0)).toBe('0%');
    expect(formatContingencyInput(15)).toBe('15%');
  });
});

describe('the contingency amount consumers read', () => {
  it('is null while no contingency is set — not $0', () => {
    expect(contingencyAmountOf(250_000, null)).toBeNull();
  });

  it('is $0 when the user chose 0%', () => {
    expect(contingencyAmountOf(250_000, 0)).toBe(0);
  });

  it('is the buffer on a line with a contingency', () => {
    expect(contingencyAmountOf(250_000, 10)).toBe(25_000);
  });
});
