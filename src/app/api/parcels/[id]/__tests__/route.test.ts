import { NextRequest } from 'next/server';

/**
 * A NUMERIC FIELD COULD BE CHANGED BUT NEVER EMPTIED, 2026-08-25.
 *
 * Six fields on this route were guarded with `if (value !== null)`, which
 * conflates two different things: a key that is ABSENT (the caller is not
 * touching this field) and a key that is present and NULL (the caller means
 * empty). So when a parcel stopped being residential and the Parcels screen
 * sent `units: null` to blank the count, the write was discarded and the old
 * number stayed on a parcel that no longer had units.
 *
 * These pin the distinction, because it is not visible in the SQL: an UPDATE
 * that never runs and an UPDATE that writes NULL look the same from the caller
 * — both return `{ ok: true }`.
 *
 * ZERO IS THE CASE TO WATCH. It is falsy, it is not empty, and a rule written
 * with `||` instead of an explicit null/'' check would silently blank it.
 */

jest.mock('@/lib/db', () => ({ sql: jest.fn() }));
jest.mock('@/lib/api/requireAuth', () => ({ requireAuth: jest.fn() }));

// Imported after the mocks so the route binds to them.
import { PATCH } from '@/app/api/parcels/[id]/route';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/api/requireAuth';

const sqlCalls: Array<{ text: string; values: unknown[] }> = [];

/* This project's jest config sets `resetMocks: true`, which strips the
 * implementation off every mock before each test. So the implementations are
 * (re)installed here rather than in the factory above, where they would be
 * wiped before the first assertion ever ran — a mock that silently becomes a
 * no-op returning undefined, which the route happily awaits. */
beforeEach(() => {
  sqlCalls.length = 0;
  (sql as unknown as jest.Mock).mockImplementation(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      sqlCalls.push({ text: strings.join('?'), values });
      return Promise.resolve([]);
    },
  );
  (requireAuth as jest.Mock).mockResolvedValue({ userId: 1, username: 'test', isAdmin: false });
});

/** Run a PATCH and return the value bound into the UPDATE for `column`, or
 *  `NOT_WRITTEN` when no UPDATE touched that column at all. */
const NOT_WRITTEN = Symbol('no UPDATE issued for this column');

async function patchValueFor(column: string, body: unknown): Promise<unknown> {
  sqlCalls.length = 0;
  /* The handler only ever calls `request.json()`, and `requireAuth` is mocked,
   * so a stub carries the body more reliably than constructing a NextRequest —
   * which arrives body-less under this runner. */
  const request = { json: async () => body } as unknown as NextRequest;
  const response = await PATCH(request, { params: Promise.resolve({ id: '42' }) });
  expect(response.status).toBe(200);

  const call = sqlCalls.find((c) => c.text.includes(`SET ${column} =`));
  return call ? call.values[0] : NOT_WRITTEN;
}

describe('an explicit null clears the field', () => {
  it('blanks the unit count — the case that was being dropped', async () => {
    expect(await patchValueFor('units_total', { units: null })).toBeNull();
    expect(await patchValueFor('units_total', { units_total: null })).toBeNull();
  });

  it('blanks the other five that had the same hole', async () => {
    expect(await patchValueFor('acres_gross', { acres_gross: null })).toBeNull();
    expect(await patchValueFor('plan_efficiency', { plan_efficiency: null })).toBeNull();
    expect(await patchValueFor('lots_frontfeet', { lots_frontfeet: null })).toBeNull();
    expect(await patchValueFor('lot_width', { lot_width: null })).toBeNull();
    expect(await patchValueFor('lot_depth', { lot_depth: null })).toBeNull();
  });

  it('treats an emptied input the same as null', async () => {
    /* An input the user cleared arrives as '', not null. */
    expect(await patchValueFor('units_total', { units: '' })).toBeNull();
    expect(await patchValueFor('acres_gross', { acres_gross: '' })).toBeNull();
  });
});

describe('an absent key still means leave it alone', () => {
  it('issues no UPDATE for a field the caller did not mention', async () => {
    expect(await patchValueFor('units_total', { acres_gross: 5 })).toBe(NOT_WRITTEN);
    expect(await patchValueFor('lot_width', { acres_gross: 5 })).toBe(NOT_WRITTEN);
  });

  it('leaves sale_period alone, which is all the other caller sends', async () => {
    /* useSalesAbsorption sends sale_period and nothing else; its branch is
     * untouched by this change and must not start writing other columns. */
    expect(await patchValueFor('units_total', { sale_period: 3 })).toBe(NOT_WRITTEN);
    expect(await patchValueFor('sale_period', { sale_period: 3 })).toBe(3);
  });
});

describe('a real value is still written', () => {
  it('writes a number', async () => {
    expect(await patchValueFor('units_total', { units: 120 })).toBe(120);
    expect(await patchValueFor('acres_gross', { acres: 12.5 })).toBe(12.5);
  });

  it('KEEPS ZERO AS ZERO — zero is a value, not an empty', async () => {
    expect(await patchValueFor('units_total', { units: 0 })).toBe(0);
    expect(await patchValueFor('acres_gross', { acres_gross: 0 })).toBe(0);
    expect(await patchValueFor('lot_width', { lot_width: 0 })).toBe(0);
  });
});

describe('the UI spelling and the column spelling', () => {
  it('accepts the UI alias', async () => {
    expect(await patchValueFor('plan_efficiency', { efficiency: 0.85 })).toBe(0.85);
    expect(await patchValueFor('lots_frontfeet', { frontfeet: 400 })).toBe(400);
  });

  it('lets the column name win when both are sent', async () => {
    expect(await patchValueFor('units_total', { units_total: 7, units: 9 })).toBe(7);
  });

  it('lets an explicit null column name beat a non-null alias', async () => {
    /* "clear this" must not be overridden by a stale alias in the same body —
     * which is why the rule tests `!== undefined` rather than using `??`. */
    expect(await patchValueFor('units_total', { units_total: null, units: 9 })).toBeNull();
  });
});
