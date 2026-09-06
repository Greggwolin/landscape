/**
 * Regression tests for the operating-expense save path.
 *
 * The defect: escalation_rate and recovery_rate were written with `||`
 * (`expense.escalation_rate || 0.03`, `expense.recovery_rate || 1.0`). 0 is
 * falsy, so a user who deliberately entered 0% escalation had 3% written to the
 * database instead — an expense that then inflated 3% a year forever, stored in
 * a form indistinguishable from a rate the user had actually chosen. The same
 * `||` turned a deliberate 0% recovery into 100% recovered from tenants.
 *
 * Two properties are asserted here, and they are separate:
 *   1. A supplied 0 survives as 0.
 *   2. When no rate is supplied, nothing is stored — not 3%, not 100%. The NULL
 *      has to reach the INSERT explicitly, because the columns carry
 *      DEFAULT 0.03 / DEFAULT 1.0 and an omitted column would let the database
 *      reinstate the invented number.
 */
import { NextRequest } from 'next/server';

// Capture every tagged-template SQL call with its interpolated values.
const sqlCalls: Array<{ text: string; values: unknown[] }> = [];

jest.mock('@/lib/db', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
    sqlCalls.push({ text: strings.join('?'), values });
    // The route reads activeResult[0]?.active_opex_discriminator off the first
    // query; an empty array is fine and falls back to 'default'.
    return Promise.resolve([]);
  },
}));

jest.mock('@/lib/api/requireAuth', () => ({
  requireAuth: jest.fn(),
  requireProjectAccess: jest.fn().mockResolvedValue({ userId: 1 }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('@/app/api/projects/[projectId]/opex/route');

/** The INSERT/UPDATE against tbl_operating_expenses (skips the discriminator lookup). */
function writeCall() {
  const call = sqlCalls.find(
    (c) =>
      c.text.includes('tbl_operating_expenses') &&
      (c.text.includes('INSERT INTO') || c.text.includes('UPDATE'))
  );
  if (!call) throw new Error('no write against tbl_operating_expenses was issued');
  return call;
}

/**
 * Value bound to `columnName` by the write statement.
 *
 * The mock joins the template's static chunks with '?', so the text preceding
 * the Nth '?' is the SQL that introduces the Nth interpolated value.
 *
 * INSERT and UPDATE need different resolution. In the INSERT every value is a
 * placeholder, so position in the column list is position in the values array.
 * In the UPDATE the placeholder is the one whose preceding chunk ends with
 * `col = ` (possibly opening a COALESCE).
 */
function boundValueFor(columnName: string): unknown {
  const { text, values } = writeCall();

  if (text.includes('INSERT INTO')) {
    const columnList = text.slice(text.indexOf('(') + 1, text.indexOf(') VALUES'));
    const columns = columnList
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const index = columns.indexOf(columnName);
    if (index === -1) throw new Error(`column ${columnName} not in INSERT column list`);
    // Guard the assumption that every INSERT value is a placeholder.
    expect(columns.length).toBe(values.length);
    return values[index];
  }

  const segments = text.split('?');
  const pattern = new RegExp(`\\b${columnName}\\s*=\\s*(COALESCE\\()?\\s*$`);
  for (let i = 0; i < values.length; i++) {
    if (pattern.test(segments[i])) return values[i];
  }
  throw new Error(`no bound value found for column ${columnName} in: ${text}`);
}

async function postExpenses(expenses: unknown[]) {
  sqlCalls.length = 0;
  const request = {
    json: async () => ({ expenses }),
    nextUrl: { searchParams: new URLSearchParams() },
  } as unknown as NextRequest;

  const response = await POST(request, { params: Promise.resolve({ projectId: '11' }) });
  expect(response.status).toBe(200);
}

const baseExpense = {
  expense_category: 'Property Taxes',
  expense_type: 'TAXES',
  annual_amount: 120000,
  start_period: 1,
};

describe('POST /api/projects/[projectId]/opex — escalation_rate', () => {
  it('stores a deliberate 0% escalation as 0, not 3%', async () => {
    await postExpenses([{ ...baseExpense, escalation_rate: 0 }]);

    const stored = boundValueFor('escalation_rate');
    expect(stored).toBe(0);
    expect(stored).not.toBe(0.03);
  });

  it('stores nothing when no escalation rate was supplied', async () => {
    await postExpenses([{ ...baseExpense }]);

    // NULL, not an invented 3%. The app must never supply a financial
    // assumption the user did not choose.
    expect(boundValueFor('escalation_rate')).toBeNull();
  });

  it('still stores a genuine non-zero rate unchanged', async () => {
    await postExpenses([{ ...baseExpense, escalation_rate: 0.025 }]);

    expect(boundValueFor('escalation_rate')).toBe(0.025);
  });
});

describe('POST /api/projects/[projectId]/opex — recovery_rate', () => {
  it('stores a deliberate 0% recovery as 0, not 100%', async () => {
    await postExpenses([{ ...baseExpense, recovery_rate: 0 }]);

    const stored = boundValueFor('recovery_rate');
    expect(stored).toBe(0);
    // 1.0 would claim the whole expense is recovered from tenants, inflating income.
    expect(stored).not.toBe(1.0);
  });

  it('stores nothing when no recovery rate was supplied', async () => {
    await postExpenses([{ ...baseExpense }]);

    expect(boundValueFor('recovery_rate')).toBeNull();
  });
});

describe('POST /api/projects/[projectId]/opex — update path', () => {
  it('carries a supplied 0 through the UPDATE branch too', async () => {
    await postExpenses([{ ...baseExpense, opex_id: 42, escalation_rate: 0, recovery_rate: 0 }]);

    expect(writeCall().text).toContain('UPDATE');
    expect(boundValueFor('escalation_rate')).toBe(0);
    expect(boundValueFor('recovery_rate')).toBe(0);
  });

  it('does not erase a stored rate when the field is omitted', async () => {
    await postExpenses([{ ...baseExpense, opex_id: 42 }]);

    const { text } = writeCall();
    // COALESCE(<supplied>, escalation_rate) leaves the stored value alone when
    // nothing was supplied, while a supplied 0 (not NULL in SQL) still wins.
    expect(text).toMatch(/escalation_rate\s*=\s*COALESCE/);
    expect(text).toMatch(/recovery_rate\s*=\s*COALESCE/);
    expect(boundValueFor('escalation_rate')).toBeNull();
  });
});
