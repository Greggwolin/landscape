/**
 * What the copy button puts on the clipboard.
 *
 * Two flavours, one copy: HTML for anything that renders a table (a document,
 * a mail client, a spreadsheet), tab-separated text for anything that does not.
 * Both carry the values as the SCREEN shows them — copying used to emit the
 * raw stored number, so a statement reading 2,696,514 pasted as 2696514, and
 * the tabbed text landed in a document as a run of loose figures
 * (Gregg, 2026-09-17).
 */

import { serializeArtifact, serializeArtifactHtml } from '../ArtifactRenderer';
import type { Block } from '@/types/artifact';

const STATEMENT: Block[] = [
  {
    type: 'table',
    id: 'os',
    columns: [
      { key: 'line', label: 'Line Item', align: 'left' },
      { key: 'annual', label: 'Annual', align: 'right' },
      { key: 'per_unit', label: '$/Unit', align: 'right' },
    ],
    rows: [
      { id: 'r1', cells: { line: 'Gross Potential Rent', annual: 2696514, per_unit: 23863 } },
      { id: 'r2', cells: { line: 'Less: Physical Vacancy (9.7%)', annual: -262493, per_unit: -2323 } },
      { id: 'r3', cells: { line: 'Net Operating Income', annual: 1217834, per_unit: 10777 } },
      { id: 'r4', cells: { line: 'Other Income', annual: null, per_unit: null } },
    ],
  },
];

describe('the plain-text flavour', () => {
  const text = serializeArtifact('Chadron Terrace — Operating Statement', STATEMENT);

  it('separates cells with tabs so a spreadsheet splits them into columns', () => {
    expect(text).toContain('Line Item\tAnnual\t$/Unit');
  });

  it('carries the figures as the screen shows them', () => {
    expect(text).toContain('Gross Potential Rent\t2,696,514\t23,863');
  });

  it('shows a deduction in parentheses, never with a minus sign', () => {
    expect(text).toContain('(262,493)');
    expect(text).not.toContain('-262493');
  });

  it('keeps a label column as words — "1.2" is a phase, not a quantity', () => {
    const phases: Block[] = [{
      type: 'table', id: 't', columns: [{ key: 'p', label: 'Phase', align: 'left' }],
      rows: [{ id: 'r', cells: { p: '1.2' } }],
    }];
    expect(serializeArtifact('', phases)).toContain('1.2');
  });
});

describe('the HTML flavour', () => {
  const html = serializeArtifactHtml('Chadron Terrace — Operating Statement', STATEMENT);

  it('is a real table, not text laid out with tabs', () => {
    expect(html).toContain('<table');
    expect(html).toContain('<thead>');
    expect(html.match(/<tr>/g) ?? []).toHaveLength(5); // header + four rows
  });

  it('gives every heading the alignment of the column under it', () => {
    expect(html).toContain('<th style="text-align:right;');
    expect(html).toContain('<th style="text-align:left;');
  });

  it('keeps a label heading on one line and lets a numeric heading wrap', () => {
    // Same rule the screen follows: the stub column never stacks; a narrow
    // numeric column may. See ArtifactRenderer.module.css.
    expect(html).toContain('<th style="text-align:left;white-space:nowrap;');
    expect(html).toContain('<th style="text-align:right;white-space:normal;');
  });

  it('keeps the weight and the rule on a total row', () => {
    const noi = html.slice(html.indexOf('Net Operating Income'));
    expect(noi).toContain('font-weight:700');
  });

  it('escapes anything that would close a tag', () => {
    const risky: Block[] = [{
      type: 'table', id: 't', columns: [{ key: 'c', label: 'A & B', align: 'left' }],
      rows: [{ id: 'r', cells: { c: '<script>alert(1)</script>' } }],
    }];
    const out = serializeArtifactHtml('', risky);
    expect(out).toContain('A &amp; B');
    expect(out).not.toContain('<script>');
  });

  it('renders an empty cell as the em dash the screen shows', () => {
    const other = html.slice(html.indexOf('Other Income'));
    expect(other).toContain('—');
  });
});

/**
 * The statement's shape — what is bold, what is indented, what is blank.
 *
 * From Gregg's markup of a printed operating statement, 2026-09-17: section
 * headings bold and flush left, each level indented a step further, a total
 * level with the line it totals, and NO em dashes on a section heading, which
 * states no figure.
 */
const STATEMENT_SHAPE: Block[] = [
  {
    type: 'table',
    id: 'os2',
    columns: [
      { key: 'line', label: 'Line Item', align: 'left' },
      { key: 'y3', label: 'Year 3', align: 'right' },
    ],
    rows: [
      { id: 's1', cells: { line: 'Income', y3: null } },
      { id: 'r1', cells: { line: 'Gross Potential Rent', y3: 2861562 } },
      { id: 'r2', cells: { line: 'Less: Physical Vacancy (9.7%)', y3: -278559 } },
      { id: 'r3', cells: { line: 'Effective Gross Income', y3: 2540080 } },
      { id: 's2', cells: { line: 'Operating Expenses', y3: null } },
      { id: 'r4', cells: { line: 'Taxes & Insurance', y3: 845901 } },
      { id: 'r5', cells: { line: 'Total Operating Expenses', y3: 1284762 } },
      { id: 'r6', cells: { line: 'Net Operating Income', y3: 1255317 } },
    ],
  },
];

describe('statement shape', () => {
  const html = serializeArtifactHtml('', STATEMENT_SHAPE);
  const rowOf = (label: string) => {
    const at = html.indexOf(label);
    const start = html.lastIndexOf('<tr>', at);
    return html.slice(start, html.indexOf('</tr>', at));
  };
  const indentOf = (label: string) => {
    const m = rowOf(label).match(/padding-left:(\d+)pt/);
    return m ? Number(m[1]) : 0;
  };

  it('a section heading is bold and flush left', () => {
    expect(rowOf('Income')).toContain('font-weight:700');
    expect(indentOf('Income')).toBe(0);
  });

  it('a section heading states no figure — blank, never an em dash', () => {
    const row = rowOf('>Income<');
    expect(row).not.toContain('—');
  });

  it('the opening subtotal sits one level in, and its lines one further', () => {
    expect(indentOf('Gross Potential Rent')).toBeGreaterThan(0);
    expect(indentOf('Less: Physical Vacancy'))
      .toBeGreaterThan(indentOf('Gross Potential Rent'));
  });

  it('a closing total lines up with the line it totals', () => {
    expect(indentOf('Effective Gross Income'))
      .toBe(indentOf('Gross Potential Rent'));
    expect(indentOf('Total Operating Expenses'))
      .toBe(indentOf('Taxes & Insurance'));
  });

  it('the grand total returns to flush left, ruled above and below', () => {
    expect(indentOf('Net Operating Income')).toBe(0);
    expect(rowOf('Net Operating Income')).toContain('border-top');
    expect(rowOf('Net Operating Income')).toContain('border-bottom');
  });

  it('a section heading takes the air that separates one group from the next', () => {
    expect(rowOf('Operating Expenses')).toContain('padding-top:10pt');
    expect(rowOf('Taxes & Insurance')).not.toContain('padding-top:10pt');
  });
});
