/**
 * API client for Multifamily Django REST endpoints
 *
 * This module provides type-safe wrappers around the Django REST API
 * for multifamily rent roll functionality.
 */

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// SWR-compatible response format (matching legacy Next.js API format)
interface LegacyApiResponse<T> {
  success: boolean;
  data: T;
  count: number;
}

// ============================================================================
// Types matching Django serializers
// ============================================================================

export interface UnitType {
  unit_type_id: number;
  project_id: number;
  unit_type_code: string;
  bedrooms: number;
  bathrooms: number;
  avg_square_feet: number;
  current_market_rent: number;
  total_units: number;
  notes?: string | null;
  other_features?: string | null;
  floorplan_doc_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Unit {
  unit_id: number;
  project_id: number;
  unit_number: string;
  building_name?: string | null;
  unit_type: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  market_rent: number;
  renovation_status: string;
  renovation_date?: string | null;
  renovation_cost?: number | null;
  other_features?: string | null;
  current_lease?: {
    lease_id: number;
    resident_name?: string | null;
    lease_start_date: string;
    lease_end_date: string;
    base_rent_monthly: number;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface Lease {
  lease_id: number;
  unit_id: number;
  unit_number?: string;
  building_name?: string | null;
  project_id?: number;
  resident_name?: string | null;
  lease_start_date: string;
  lease_end_date: string;
  lease_term_months?: number;
  base_rent_monthly: number;
  effective_rent_monthly?: number | null;
  months_free_rent?: number | null;
  concession_amount?: number | null;
  security_deposit?: number | null;
  pet_rent_monthly?: number | null;
  parking_rent_monthly?: number | null;
  lease_status: string;
  notice_date?: string | null;
  notice_to_vacate_days?: number | null;
  is_renewal?: boolean;
  created_at?: string;
  updated_at?: string;
  // Extended fields from join with unit for grid display
  unit_type?: string;
  square_feet?: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  market_rent?: number | null;
  other_features?: string | null;
}

export interface Turn {
  turn_id: number;
  unit_id: number;
  unit_number?: string;
  building_name?: string | null;
  project_id?: number;
  move_out_date?: string | null;
  make_ready_complete_date?: string | null;
  next_move_in_date?: string | null;
  total_vacant_days?: number | null;
  cleaning_cost?: number | null;
  painting_cost?: number | null;
  carpet_flooring_cost?: number | null;
  appliance_cost?: number | null;
  other_cost?: number | null;
  total_make_ready_cost?: number | null;
  turn_status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Helper functions
// ============================================================================

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    console.log('[Multifamily API] Fetching:', url);
    console.log('[Multifamily API] DJANGO_API_BASE:', DJANGO_API_BASE);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('[Multifamily API] Error response:', errorData);
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('[Multifamily API] Fetch failed:', error);
    console.error('[Multifamily API] URL was:', url);
    console.error('[Multifamily API] Base URL:', DJANGO_API_BASE);
    throw error;
  }
}

// ============================================================================
// Unit Types API
// ============================================================================

export const unitTypesAPI = {
  /**
   * List unit types, optionally filtered by project_id
   */
  async list(projectId?: number): Promise<UnitType[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    const response = await fetchAPI<{results: UnitType[]}>(`${DJANGO_API_BASE}/api/multifamily/unit-types/${params}`);
    return response.results;
  },

  /**
   * Get a single unit type by ID
   */
  async get(id: number): Promise<UnitType> {
    return fetchAPI<UnitType>(`${DJANGO_API_BASE}/api/multifamily/unit-types/${id}/`);
  },

  /**
   * Create a new unit type
   */
  async create(data: Partial<UnitType>): Promise<UnitType> {
    return fetchAPI<UnitType>(`${DJANGO_API_BASE}/api/multifamily/unit-types/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a unit type (PATCH)
   */
  async update(id: number, data: Partial<UnitType>): Promise<UnitType> {
    return fetchAPI<UnitType>(`${DJANGO_API_BASE}/api/multifamily/unit-types/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a unit type
   */
  async delete(id: number): Promise<void> {
    await fetchAPI<void>(`${DJANGO_API_BASE}/api/multifamily/unit-types/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Units API
// ============================================================================

export const unitsAPI = {
  /**
   * List units, optionally filtered by project_id
   */
  async list(projectId?: number): Promise<Unit[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    const response = await fetchAPI<{results: Unit[]}>(`${DJANGO_API_BASE}/api/multifamily/units/${params}`);
    return response.results;
  },

  /**
   * Get a single unit by ID
   */
  async get(id: number): Promise<Unit> {
    return fetchAPI<Unit>(`${DJANGO_API_BASE}/api/multifamily/units/${id}/`);
  },

  /**
   * Create a new unit
   */
  async create(data: Partial<Unit>): Promise<Unit> {
    return fetchAPI<Unit>(`${DJANGO_API_BASE}/api/multifamily/units/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a unit (PATCH)
   */
  async update(id: number, data: Partial<Unit>): Promise<Unit> {
    return fetchAPI<Unit>(`${DJANGO_API_BASE}/api/multifamily/units/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a unit
   */
  async delete(id: number): Promise<void> {
    await fetchAPI<void>(`${DJANGO_API_BASE}/api/multifamily/units/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Leases API
// ============================================================================

export const leasesAPI = {
  /**
   * List leases, optionally filtered by project_id
   */
  async list(projectId?: number): Promise<Lease[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    const response = await fetchAPI<{results: Lease[]}>(`${DJANGO_API_BASE}/api/multifamily/leases/${params}`);
    return response.results;
  },

  /**
   * Get a single lease by ID
   */
  async get(id: number): Promise<Lease> {
    return fetchAPI<Lease>(`${DJANGO_API_BASE}/api/multifamily/leases/${id}/`);
  },

  /**
   * Create a new lease
   */
  async create(data: Partial<Lease>): Promise<Lease> {
    return fetchAPI<Lease>(`${DJANGO_API_BASE}/api/multifamily/leases/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a lease (PATCH)
   */
  async update(id: number, data: Partial<Lease>): Promise<Lease> {
    return fetchAPI<Lease>(`${DJANGO_API_BASE}/api/multifamily/leases/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a lease
   */
  async delete(id: number): Promise<void> {
    await fetchAPI<void>(`${DJANGO_API_BASE}/api/multifamily/leases/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// Turns API
// ============================================================================

export const turnsAPI = {
  /**
   * List turns, optionally filtered by project_id
   */
  async list(projectId?: number): Promise<Turn[]> {
    const params = projectId ? `?project_id=${projectId}` : '';
    const response = await fetchAPI<Turn[]>(`${DJANGO_API_BASE}/api/multifamily/turns/${params}`);
    return response;
  },

  /**
   * Get a single turn by ID
   */
  async get(id: number): Promise<Turn> {
    return fetchAPI<Turn>(`${DJANGO_API_BASE}/api/multifamily/turns/${id}/`);
  },

  /**
   * Create a new turn
   */
  async create(data: Partial<Turn>): Promise<Turn> {
    return fetchAPI<Turn>(`${DJANGO_API_BASE}/api/multifamily/turns/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a turn (PATCH)
   */
  async update(id: number, data: Partial<Turn>): Promise<Turn> {
    return fetchAPI<Turn>(`${DJANGO_API_BASE}/api/multifamily/turns/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a turn
   */
  async delete(id: number): Promise<void> {
    await fetchAPI<void>(`${DJANGO_API_BASE}/api/multifamily/turns/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// SWR-compatible fetchers (for gradual migration from Next.js API routes)
// ============================================================================

/**
 * Fetcher for unit types - wraps Django response in legacy format
 * Usage: useSWR(`/api/multifamily/unit-types?project_id=${id}`, fetchUnitTypes)
 */
export async function fetchUnitTypes(url: string): Promise<LegacyApiResponse<UnitType[]>> {
  const urlObj = new URL(url, window.location.origin);
  const projectId = urlObj.searchParams.get('project_id');

  const data = await unitTypesAPI.list(projectId ? Number(projectId) : undefined);

  return {
    success: true,
    data,
    count: data.length,
  };
}

/**
 * Fetcher for units - wraps Django response in legacy format
 * Usage: useSWR(`/api/multifamily/units?project_id=${id}`, fetchUnits)
 */
export async function fetchUnits(url: string): Promise<LegacyApiResponse<Unit[]>> {
  const urlObj = new URL(url, window.location.origin);
  const projectId = urlObj.searchParams.get('project_id');

  const data = await unitsAPI.list(projectId ? Number(projectId) : undefined);

  return {
    success: true,
    data,
    count: data.length,
  };
}

/**
 * Fetcher for leases - wraps Django response in legacy format
 * Usage: useSWR(`/api/multifamily/leases?project_id=${id}`, fetchLeases)
 */
export async function fetchLeases(url: string): Promise<LegacyApiResponse<Lease[]>> {
  const urlObj = new URL(url, window.location.origin);
  const projectId = urlObj.searchParams.get('project_id');

  const data = await leasesAPI.list(projectId ? Number(projectId) : undefined);

  return {
    success: true,
    data,
    count: data.length,
  };
}

/**
 * Fetcher for turns - wraps Django response in legacy format
 * Usage: useSWR(`/api/multifamily/turns?project_id=${id}`, fetchTurns)
 */
export async function fetchTurns(url: string): Promise<LegacyApiResponse<Turn[]>> {
  const urlObj = new URL(url, window.location.origin);
  const projectId = urlObj.searchParams.get('project_id');

  const data = await turnsAPI.list(projectId ? Number(projectId) : undefined);

  return {
    success: true,
    data,
    count: data.length,
  };
}
