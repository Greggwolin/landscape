/**
 * The NNN sale-leaseback mock screens are not reachable from the app
 * (ARGUS parity re-audit 2026-10-21, §2.3 — #LS-1021-07, decision PX-Q1 = 1a).
 *
 * NNNIncomeApproach / NNNReconciliation and their panels render figures from
 * nnnMockData.ts — hardcoded lease, rent and value numbers that belong to no
 * project. Until 2026-10-21 the classic Valuation tab showed them to any project
 * detected as NNN, as if they were that project's valuation. The detection and
 * the mock-up files are kept for the real build; this test pins that nothing
 * outside components/valuation/nnn/ imports them.
 */

import * as fs from 'fs';
import * as path from 'path';
import { isNNNProject } from '@/components/valuation/nnn/nnnDetection';

const SRC = path.resolve(__dirname, '..');
const NNN_DIR = path.join(SRC, 'components', 'valuation', 'nnn');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const MOCK_BACKED = /valuation\/nnn\/(NNNIncomeApproach|NNNReconciliation|nnnMockData|SubSubTabBar|panels\/)/;

describe('NNN mock screens are hidden (#LS-1021-07)', () => {
  const importers = walk(SRC)
    .filter((f) => !f.startsWith(NNN_DIR))
    .filter((f) => f !== __filename)
    .filter((f) => MOCK_BACKED.test(fs.readFileSync(f, 'utf8')));

  test('nothing outside components/valuation/nnn/ imports the mock-data screens', () => {
    expect(importers.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  test('the classic Valuation tab still detects NNN but renders the not-built state', () => {
    const tab = fs.readFileSync(
      path.join(SRC, 'app', 'projects', '[projectId]', 'components', 'tabs', 'ValuationTab.tsx'),
      'utf8',
    );
    expect(tab).toMatch(/isNNNProject\(project\)/);
    expect(tab).toMatch(/<NNNNotBuiltEmpty title="Income Approach" \/>/);
    expect(tab).toMatch(/<NNNNotBuiltEmpty title="Reconciliation" \/>/);
    expect(tab).not.toMatch(/<NNNIncomeApproach/);
    expect(tab).not.toMatch(/<NNNReconciliation/);
  });

  test('NNN detection itself is unchanged', () => {
    expect(isNNNProject({ property_subtype: 'NNN' })).toBe(true);
    expect(isNNNProject({ project_type_code: 'MF', property_subtype: 'GARDEN' })).toBe(false);
  });
});
