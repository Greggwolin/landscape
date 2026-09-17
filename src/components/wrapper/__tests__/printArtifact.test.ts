/**
 * The sheet that goes to the printer.
 *
 * The artifact had no print control at all until 2026-09-17 — the only printed
 * version in the application lived on a different screen. What is asserted here
 * is the part that cannot be seen by looking at the screen: that the document
 * stands on its own off the page, and that it is LIGHT whatever the working
 * surface is doing.
 */

import { buildPrintDocument } from '../printArtifact';

const TABLE = '<table><thead><tr><th>Line Item</th></tr></thead>'
  + '<tbody><tr><td>Gross Potential Rent</td></tr></tbody></table>';

describe('buildPrintDocument', () => {
  const doc = buildPrintDocument('Chadron Terrace — Operating Statement', TABLE);

  it('is a complete document, not a fragment', () => {
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('<html lang="en">');
    expect(doc).toContain('<meta charset="utf-8">');
    expect(doc).toContain('</body>');
  });

  it('prints on white paper with dark text, whatever the screen is doing', () => {
    expect(doc).toContain('background: #ffffff');
    expect(doc).toContain('color: #111111');
  });

  it('carries no dark-mode variant', () => {
    expect(doc).not.toContain('prefers-color-scheme');
  });

  it('repeats the heading row across page breaks and never splits a row', () => {
    expect(doc).toContain('display: table-header-group');
    expect(doc).toContain('page-break-inside: avoid');
  });

  it('carries the content it was given, and the title', () => {
    expect(doc).toContain(TABLE);
    expect(doc).toContain('Chadron Terrace');
  });

  it('escapes a title that would otherwise close a tag', () => {
    const risky = buildPrintDocument('<script>alert(1)</script>', TABLE);
    expect(risky).not.toContain('<script>alert');
    expect(risky).toContain('&lt;script&gt;');
  });

  it('adds a footnote only when one is given', () => {
    expect(doc).not.toContain('<footer>');
    expect(buildPrintDocument('T', TABLE, '12 of 40 lines shown.'))
      .toContain('<footer>12 of 40 lines shown.</footer>');
  });
});
