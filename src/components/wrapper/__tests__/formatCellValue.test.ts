import { formatCellValue } from '../ArtifactRenderer';

/**
 * A LEFT-ALIGNED TABLE COLUMN IS A TEXT COLUMN (2026-08-25).
 *
 * Cell formatting used to be decided by POSITION: every column except the
 * first was treated as numeric, on the assumption that only the first column
 * holds words. That is wrong the moment a table has two text columns, and it
 * fails silently rather than loudly.
 *
 * It was found on the parcel report, whose Phase column holds "1.1", "1.2",
 * "2.1", "2.2". Numeric formatting rounds to whole numbers, so those four
 * distinct phases rendered as "1", "1", "2", "2" — two different phases shown
 * as the same phase, in a table whose entire job is telling parcels apart.
 * Nobody would read that as a formatting bug; it looks like data.
 *
 * The fix suppresses ONLY the string-to-number coercion. Everything else a
 * cell gets must survive, which is most of what follows — a fix that quietly
 * dropped date formatting or the em-dash rule would trade one silent wrong
 * display for another.
 */

describe('a left-aligned column holds words, not quantities', () => {
  it('keeps a phase name intact instead of rounding it', () => {
    expect(formatCellValue('1.1', undefined, true)).toBe('1.1');
    expect(formatCellValue('1.2', undefined, true)).toBe('1.2');
    expect(formatCellValue('2.1', undefined, true)).toBe('2.1');
    expect(formatCellValue('2.2', undefined, true)).toBe('2.2');
  });

  it('is a real change — the old behaviour collapsed them', () => {
    expect(formatCellValue('1.1', undefined, false)).toBe('1');
    expect(formatCellValue('1.2', undefined, false)).toBe('1');
  });

  it('leaves a value that was never numeric alone, as before', () => {
    expect(formatCellValue('7/8 Pack', undefined, true)).toBe('7/8 Pack');
    expect(formatCellValue('50x125', undefined, true)).toBe('50x125');
  });
});

describe('everything else a text column gets still applies', () => {
  it('still renders an ISO date as Mmm-YY', () => {
    expect(formatCellValue('2026-01-15', undefined, true)).toBe('Jan-26');
  });

  it('still renders empty, null and zero as an em dash', () => {
    expect(formatCellValue('', undefined, true)).toBe('—');
    expect(formatCellValue(null, undefined, true)).toBe('—');
    expect(formatCellValue('0', undefined, true)).toBe('—');
  });

  it('still honours an explicit numeric format, whatever the alignment says', () => {
    /* This is what keeps the fix from breaking a left-aligned column that
     * genuinely holds a number and says so. A generator that asks for number
     * formatting gets it. */
    expect(formatCellValue('6500000', 'currency', true)).toBe('$6,500,000');
    expect(formatCellValue('6500000', 'number', true)).toBe('6,500,000');
    expect(formatCellValue('42.1', 'percent', true)).toBe('42.1%');
  });
});

describe('every other column is untouched', () => {
  it('formats numbers exactly as it did', () => {
    expect(formatCellValue(1234)).toBe('1,234');
    expect(formatCellValue('1234')).toBe('1,234');
    expect(formatCellValue(-1234)).toBe('(1,234)');
    expect(formatCellValue(0)).toBe('—');
  });

  it('formats currency and percent exactly as it did', () => {
    expect(formatCellValue(1234, 'currency')).toBe('$1,234');
    expect(formatCellValue(1.23, 'currency2')).toBe('$1.23');
    expect(formatCellValue(42.1, 'percent')).toBe('42.1%');
    expect(formatCellValue(-42.1, 'percent')).toBe('(42.1%)');
  });
});
