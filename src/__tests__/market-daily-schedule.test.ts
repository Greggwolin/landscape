import fs from 'fs';
import path from 'path';

const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/market-daily.yml'), 'utf8');

it('schedules the daily refresh off :15, retaining UTC hour and monthly exclusion', () => {
  const cron = workflow.match(/cron:\s*'([^']+)'/)?.[1].split(/\s+/);
  expect(cron).toEqual(['47', '13', '1-15,17-31', '*', '*']);
});

it('keeps manual dispatch and shared market-refresh serialization', () => {
  expect(workflow).toContain('workflow_dispatch:');
  expect(workflow).toContain('group: market-refresh');
  expect(workflow).toContain('cancel-in-progress: false');
  expect(workflow).not.toMatch(/^\s+push:/m);
  expect(workflow).not.toContain('2026-08-26');
});
