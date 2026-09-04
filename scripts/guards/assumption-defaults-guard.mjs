#!/usr/bin/env node
/**
 * Assumption-defaults guard  (LSCMD-ASSUMP-GUARD-0904)
 *
 * WHAT THIS STOPS
 * ---------------
 * The application must never supply a financial assumption the user did not
 * choose. Downstream — in a report, a saved record, a number on a screen — an
 * invented rate is indistinguishable from one the user typed. Gregg's ruling,
 * 2026-09-04: "no inflation should be calc'd for anything. that is a user input."
 *
 * A sweep on 2026-09-04 found roughly sixty such places, eight of which write
 * the invented value into the database. Cleaning them up is worthless if the
 * next change adds a sixty-first, so this exists to make the count only ever
 * go down.
 *
 * WHY A RATCHET AND NOT A RULE
 * ----------------------------
 * A detector precise enough to judge intent would have to understand what each
 * number means, and would be wrong often enough to be switched off. So it does
 * not judge. It fingerprints every site that looks like an assumption default,
 * compares that set against a checked-in baseline, and fails on any DIFFERENCE
 * in either direction:
 *
 *   - a fingerprint not in the baseline  -> a new invented default was added
 *   - a baseline entry that matches nothing -> it was fixed; delete the entry
 *
 * The second half is the important one. Without it the baseline rots into a
 * permanent excuse list, which is how every previous "we'll clean it up" ends.
 * Fixing a site REQUIRES removing its line, so the file is an accurate count of
 * what is left rather than a record of what was once true.
 *
 * Fingerprints deliberately exclude line numbers: unrelated edits above a site
 * would otherwise churn the baseline and train everyone to regenerate it
 * without reading, which defeats the whole mechanism.
 *
 * USAGE
 *   node scripts/guards/assumption-defaults-guard.mjs           # check (CI)
 *   node scripts/guards/assumption-defaults-guard.mjs --update  # rewrite baseline
 *
 * --update is for the initial baseline and for deliberate, reviewed batches.
 * Reaching for it to make a red build go green is the failure mode this guard
 * exists to catch; the diff it produces is meant to be read in review.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const BASELINE = join(ROOT, 'scripts', 'guards', 'assumption-defaults.baseline.json');

const SCAN_DIRS = ['src', join('backend', 'apps'), 'services'];

// Paths that are not shipping behaviour, or where a literal is the point.
const SKIP_PATH = [
  'node_modules', '.next', 'venv', '__pycache__', 'archive', '_archive',
  '.bak', 'test', 'spec', 'conftest', 'fixtures', 'mock', '.d.ts',
  join('src', 'types'),          // type declarations carry no runtime value
  'database.ts',                 // generated schema types
];

const EXT = ['.ts', '.tsx', '.js', '.jsx', '.py'];

// The vocabulary of a financial assumption. A numeric fallback only counts when
// it sits on a line that also names one of these.
const ASSUMPTION_WORDS = [
  'inflation', 'escalation', 'escalat', 'discount', 'cap_rate', 'caprate',
  'exit_cap', 'vacancy', 'credit_loss', 'creditloss', 'bad_debt', 'concession',
  'commission', 'contingency', 'growth', 'appreciat', 'premium', 'reserve',
  'mgmt_fee', 'management_fee', 'expense_ratio', 'absorption', 'yield',
  'hurdle', 'pref', 'promote', 'ltv', 'ltc', 'amortiz', 'amortis',
  'closing_cost', 'cost_of_sale', 'selling_cost', 'onsite', 'recovery_rate',
  'steepness', 'hold_period', 'term_months', 'efficiency', 'rent_premium',
  'price_growth', 'cost_per_unit', 'price_per', 'per_unit', 'lease_up',
  'collection_loss', 'turnover', 'coc', 'irr_hurdle', 'cap_pct', '_rate', '_pct',
  // Added after the first two baselines both missed the rent-control cap, which
  // invents a percentage and then states it to the user as though it were law.
  // Its variable is named for what it limits, not for the fact that it is a rate.
  'increase', 'max_annual', 'ceiling', 'floor_pct', 'factor',
];

// A bare zero is not an invented assumption -- it is usually an honest "none".
// A bare 1 is usually a multiplier identity or a count. Both are ignored.
const IGNORED_VALUES = new Set(['0', '0.0', '0.00', '1', '1.0']);

const RULES = [
  // JS/TS:  x ?? 0.03      x || 0.10
  { id: 'js-fallback', re: /(?:\?\?|\|\|)\s*(\d+(?:\.\d+)?)\b/g, exts: ['.ts', '.tsx', '.js', '.jsx'] },
  // Python: x or 0.03      x or Decimal('0.03')
  { id: 'py-fallback', re: /\bor\s+(?:Decimal\(\s*['"])?(\d+(?:\.\d+)?)(?:['"]\s*\))?/g, exts: ['.py'] },
  // Python: d.get('vacancy_rate', 0.05)
  { id: 'py-get-default', re: /\.get\(\s*['"][^'"]+['"]\s*,\s*(\d+(?:\.\d+)?)\s*\)/g, exts: ['.py'] },
  // Constant literal presented as a query result: 3.0 AS mgmt_fee_pct
  { id: 'sql-literal-as', re: /\b(\d+(?:\.\d+)?)\s+AS\s+\w+/gi, exts: ['.py', '.ts'] },
  // Python keyword/dataclass default: vacancy_rate: float = 0.05
  { id: 'py-kwarg-default', re: /=\s*(?:Decimal\(\s*['"])?(\d+\.\d+)(?:['"]\s*\))?\s*(?:,|\)|$)/g, exts: ['.py'] },
  // A rate assigned straight to an assumption-named field, with no user in it:
  //   commission: 0.03            commissionRate = 0.03
  //   max_increase = Decimal('0.05')
  // Added after the first baseline missed two of the sweep's worst findings --
  // the cash-flow engine's sale deductions and the invented rent-control cap --
  // because both are plain assignments rather than fallbacks.
  {
    id: 'assumption-literal',
    re: /(?:\?\?|\|\|)?\s*[:=]\s*(?:Decimal\(\s*['"])?(\d+\.\d+)(?:['"]\s*\))?/g,
    exts: ['.ts', '.tsx', '.js', '.jsx', '.py'],
  },
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    const rel = relative(ROOT, full);
    if (SKIP_PATH.some((s) => rel.toLowerCase().includes(s.toLowerCase()))) continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else if (EXT.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

function scan() {
  const found = new Map(); // fingerprint -> {file, word, value, rule, sample}
  for (const d of SCAN_DIRS) {
    for (const file of walk(join(ROOT, d))) {
      const rel = relative(ROOT, file).split(sep).join('/');
      let text;
      try { text = readFileSync(file, 'utf8'); } catch { continue; }
      const lines = text.split('\n');
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('#')) continue;
        const lower = line.toLowerCase();
        const word = ASSUMPTION_WORDS.find((w) => lower.includes(w));
        if (!word) continue;
        for (const rule of RULES) {
          if (!rule.exts.some((e) => rel.endsWith(e))) continue;
          rule.re.lastIndex = 0;
          let m;
          while ((m = rule.re.exec(line)) !== null) {
            const value = m[1];
            if (IGNORED_VALUES.has(value)) continue;
            const fp = `${rel}::${rule.id}::${word}::${value}`;
            if (!found.has(fp)) {
              found.set(fp, { file: rel, rule: rule.id, word, value, sample: line.slice(0, 120) });
            }
          }
        }
      }
    }
  }
  return found;
}

function loadBaseline() {
  try {
    const parsed = JSON.parse(readFileSync(BASELINE, 'utf8'));
    return new Set(parsed.fingerprints ?? []);
  } catch {
    return null;
  }
}

const found = scan();
const update = process.argv.includes('--update');

if (update) {
  const fingerprints = [...found.keys()].sort();
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        _comment:
          'Known places the app supplies a financial assumption the user did not choose. ' +
          'Generated by scripts/guards/assumption-defaults-guard.mjs. This list may only shrink: ' +
          'when a site is fixed its line MUST be deleted, or the guard fails on a stale entry. ' +
          'Adding a line is how a new invented default gets into the product -- do it only with a ' +
          'reason in the pull request.',
        _generated: new Date().toISOString().slice(0, 10),
        _count: fingerprints.length,
        fingerprints,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Baseline written: ${fingerprints.length} known sites.`);
  process.exit(0);
}

const baseline = loadBaseline();
if (!baseline) {
  console.error('No baseline found. Run with --update to create one.');
  process.exit(1);
}

const added = [...found.keys()].filter((f) => !baseline.has(f)).sort();
const stale = [...baseline].filter((f) => !found.has(f)).sort();

if (added.length === 0 && stale.length === 0) {
  console.log(`Assumption-defaults guard: clean (${found.size} known sites, unchanged).`);
  process.exit(0);
}

if (added.length) {
  console.error(`\n${added.length} NEW assumption default(s) — the app would supply a number the user did not choose:\n`);
  for (const fp of added) {
    const d = found.get(fp);
    console.error(`  ${d.file}`);
    console.error(`      value ${d.value} near "${d.word}"`);
    console.error(`      ${d.sample}`);
  }
  console.error(
    '\nLeave the value empty and let the caller handle a missing figure, rather than\n' +
    'choosing one on the user\'s behalf. If this genuinely is not an assumption,\n' +
    'add it to scripts/guards/assumption-defaults.baseline.json and say why in the PR.\n',
  );
}

if (stale.length) {
  console.error(`\n${stale.length} baseline entr(ies) no longer match anything — delete them:\n`);
  for (const fp of stale) console.error(`  ${fp}`);
  console.error('\nThe baseline is a count of what is LEFT, not a record of what once was.\n');
}

process.exit(1);
