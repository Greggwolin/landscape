/**
 * API client for Rent Comparable Django REST endpoints
 *
 * Django routes:
 *   GET/POST   /api/projects/<project_pk>/comparables/
 *   GET/PUT/PATCH/DELETE  /api/projects/<project_pk>/comparables/<pk>/
 */

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RentComparable {
  comparable_id: number;
  project: number;
  property_name: string;
  address?: string | null;
  distance_miles?: number | null;
  year_built?: number | null;
  total_units?: number | null;
  unit_type: string;
  bedrooms: number;
  bathrooms: number;
  avg_sqft: number;
  asking_rent: number;
  effective_rent?: number | null;
  rent_per_sf?: number | null;
  concessions?: string | null;
  amenities?: string | null;
  notes?: string | null;
  data_source?: string | null;
  as_of_date: string; // YYYY-MM-DD
  is_active: boolean;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export interface RentComparableForm {
  property_name: string;
  address?: string | null;
  distance_miles?: number | null;
  year_built?: number | null;
  total_units?: number | null;
  unit_type: string;
  bedrooms: number;
  bathrooms: number;
  avg_sqft: number;
  asking_rent: number;
  effective_rent?: number | null;
  concessions?: string | null;
  amenities?: string | null;
  notes?: string | null;
  data_source?: string | null;
  as_of_date: string;
  is_active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizePayload(payload: unknown): RentComparable[] {
  if (Array.isArray(payload)) return payload as RentComparable[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.results)) return record.results as RentComparable[];
    if (Array.isArray(record.data)) return record.data as RentComparable[];
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getRentComparables(projectId: number): Promise<RentComparable[]> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/comparables/`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) throw new Error(`Failed to fetch rent comparables: ${response.statusText}`);
  const payload = await response.json();
  return normalizePayload(payload);
}

export async function getRentComparable(projectId: number, comparableId: number): Promise<RentComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/comparables/${comparableId}/`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) throw new Error(`Failed to fetch rent comparable: ${response.statusText}`);
  return response.json();
}

export async function createRentComparable(projectId: number, data: RentComparableForm): Promise<RentComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/comparables/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create rent comparable: ${response.statusText} — ${errorBody}`);
  }
  return response.json();
}

export async function updateRentComparable(
  projectId: number,
  comparableId: number,
  data: Partial<RentComparableForm>
): Promise<RentComparable> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/comparables/${comparableId}/`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update rent comparable: ${response.statusText} — ${errorBody}`);
  }
  return response.json();
}

export async function deleteRentComparable(projectId: number, comparableId: number): Promise<void> {
  const response = await fetch(
    `${DJANGO_API_BASE}/api/projects/${projectId}/comparables/${comparableId}/`,
    { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) throw new Error(`Failed to delete rent comparable: ${response.statusText}`);
}
