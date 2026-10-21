/**
 * No `.bak` snapshot sits beside a live source file
 * (ARGUS parity re-audit 2026-10-21, §2.10 — #LS-1021-10).
 *
 * 416 `.bak` copies were committed in one sweep (ca4dbc2, 2026-09-13) and lived
 * next to the real files for five weeks — 349 of them stale pre-edit versions of
 * a live file, 15 of files that no longer exist. Grep and "find the component"
 * searches returned the wrong copy. They were untracked 2026-10-21 and `*.bak`
 * added to .gitignore; history at ca4dbc2 still holds every one.
 *
 * In CI the checkout contains only tracked files, so a filesystem walk is the
 * same question as `git ls-files | grep '\.bak$'`.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const SKIP = new Set(['node_modules', '.git', '.next', 'venv', '.venv', '__pycache__', 'backups']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.bak')) out.push(path.relative(ROOT, full));
  }
  return out;
}

describe('.bak files (#LS-1021-10)', () => {
  test('none under src/, backend/, services/ or the repo root', () => {
    const found = ['src', 'backend', 'services']
      .map((d) => path.join(ROOT, d))
      .filter((d) => fs.existsSync(d))
      .flatMap((d) => walk(d))
      .concat(
        fs
          .readdirSync(ROOT)
          .filter((n) => n.endsWith('.bak'))
          .map((n) => n),
      );
    expect(found).toEqual([]);
  });

  test('.gitignore keeps them out', () => {
    const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(ignore.split(/\r?\n/)).toContain('*.bak');
  });
});
