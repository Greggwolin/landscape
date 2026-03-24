/**
 * API client for Expense Comparable Django REST endpoints
 *
 * Django routes:
 *   GET/POST   /api/projects/<project_pk>/expense-comps/
 *   GET/PUT/PATCH/DELETE  /api/projects/<project_pk>/expense-comps/<pk>/
 */

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpenseComparable {
  comparable_id: number;
  project: number;
  property_name: string;
  address?: string | null;
  distance_miles?: number | null;
  year_built?: number | null;
  total_units?: number | null;
  total_sqft?: number | null;
  expenses: Record<string, number | null>;
  total_opex?: number | null;
  opex_per_unit?: number | null;
  opex_per_sf?: number | null;
  data_source?: string | null;
  as_of_date?: string | null;
  notes?: string | null;
  is_active: boolean;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseComparableForm {
  property_name: string;
  address?: string | null;
  distance_miles?: number | null;
  year_built?: number | null;
  total_units?: number | null;
  total_sqft?: number | null;
  expenses: Record<string, number | null>;
  data_source?: string | null;
  as_of_date?: string | null;
  notes?: string | null;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizePayload(payload: unknown): ExpenseComparable[] {
  if (Array.isArray(payload)) return payload as ExpenseComparable[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.results)) return record.results as ExpenseComparable[];
    if (Array.isArray(record.data)) return record.data as ExpenseComparable[];
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getExpenseComparables(projectId: number): Promise<ExpenseComparable[]> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/expense-comps/`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) throw new Error(`Failed to fetch expense comparables: ${response.statusText}`);
  const payload = await response.json();
  return normalizePayload(payload);
}

export async function getExpenseComparable(projectId: number, comparableId: number): Promise<ExpenseComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/expense-comps/${comparableId}/`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) throw new Error(`Failed to fetch expense comparable: ${response.statusText}`);
  return response.json();
}

export async function createExpenseComparable(projectId: number, data: ExpenseComparableForm): Promise<ExpenseComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/expense-comps/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create expense comparable: ${response.statusText} — ${errorBody}`);
  }
  return response.json();
}

export async function updateExpenseComparable(
  projectId: number,
  comparableId: number,
  data: Partial<ExpenseComparableForm>
): Promise<ExpenseComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/expense-comps/${comparableId}/`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update expense comparable: ${response.statusText} — ${errorBody}`);
  }
  return response.json();
}

export async function deleteExpenseComparable(projectId: number, comparableId: number): Promise<void> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/expense-comps/${comparableId}/`,
    { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) throw new Error(`Failed to delete expense comparable: ${response.statusText}`);
}
