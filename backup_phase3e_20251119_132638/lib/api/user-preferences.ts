/**
 * User Preferences API Client
 * Provides type-safe methods for interacting with user preference endpoints
 */

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || process.env.DJANGO_API_URL || 'http://localhost:8000';

export type ScopeType = 'global' | 'project' | 'organization';

export interface UserPreference {
  id: number;
  user_id: number;
  user_email: string;
  preference_key: string;
  preference_value: any;
  scope_type: ScopeType;
  scope_id?: number | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface PreferenceQuery {
  scope_type?: ScopeType;
  scope_id?: number;
  preference_key?: string;
}

export interface SetPreferenceParams {
  preference_key: string;
  preference_value: any;
  scope_type?: ScopeType;
  scope_id?: number;
}

export interface BulkPreferenceParams {
  preferences: Array<{
    preference_key: string;
    preference_value: any;
    scope_type?: ScopeType;
    scope_id?: number;
  }>;
}

/**
 * Get all user preferences with optional filtering
 */
export async function getUserPreferences(query?: PreferenceQuery): Promise<UserPreference[]> {
  const params = new URLSearchParams();
  if (query?.scope_type) params.append('scope_type', query.scope_type);
  if (query?.scope_id !== undefined) params.append('scope_id', query.scope_id.toString());
  if (query?.preference_key) params.append('preference_key', query.preference_key);

  const url = `${DJANGO_API_URL}/api/user-preferences/?${params.toString()}`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch preferences: ${response.statusText}`);
  }

  const data = await response.json();
  return data.preferences || [];
}

/**
 * Get a single preference by key and scope
 */
export async function getPreference<T = any>(
  key: string,
  scope_type: ScopeType = 'global',
  scope_id?: number,
  defaultValue?: T
): Promise<T | null> {
  const params = new URLSearchParams();
  params.append('key', key);
  params.append('scope_type', scope_type);
  if (scope_id !== undefined) params.append('scope_id', scope_id.toString());
  if (defaultValue !== undefined) params.append('default', JSON.stringify(defaultValue));

  const url = `${DJANGO_API_URL}/api/user-preferences/by_key/?${params.toString()}`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    // Return default value for 404 (not found) or 401 (unauthorized - auth not set up yet)
    if (response.status === 404 || response.status === 401) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      // Even without a default value, don't throw on 401 - just return null
      console.warn(`User preferences API returned ${response.status}, returning null`);
      return null as T;
    }
    throw new Error(`Failed to fetch preference: ${response.statusText}`);
  }

  const data = await response.json();
  return data.preference_value as T;
}

/**
 * Set a single preference (upsert)
 */
export async function setPreference(params: SetPreferenceParams): Promise<UserPreference | null> {
  const url = `${DJANGO_API_URL}/api/user-preferences/set_preference/`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    // Silently fail for unauthorized requests (auth not set up yet)
    // Preferences will fall back to in-memory/localStorage only
    if (response.status === 401) {
      console.warn('User preferences API requires authentication. Using local-only mode.');
      return null;
    }
    throw new Error(`Failed to set preference: ${response.statusText}`);
  }

  const data = await response.json();
  return data.preference;
}

/**
 * Set multiple preferences at once
 */
export async function setBulkPreferences(params: BulkPreferenceParams): Promise<void> {
  const url = `${DJANGO_API_URL}/api/user-preferences/bulk_set/`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error(`Failed to set bulk preferences: ${response.statusText}`);
  }
}

/**
 * Get all preferences for a specific scope as a flat object
 */
export async function getAllForScope(
  scope_type: ScopeType = 'global',
  scope_id?: number
): Promise<Record<string, any>> {
  const params = new URLSearchParams();
  params.append('scope_type', scope_type);
  if (scope_id !== undefined) params.append('scope_id', scope_id.toString());

  const url = `${DJANGO_API_URL}/api/user-preferences/all_for_scope/?${params.toString()}`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch scoped preferences: ${response.statusText}`);
  }

  const data = await response.json();
  return data.preferences || {};
}

/**
 * Delete a specific preference by ID
 */
export async function deletePreference(id: number): Promise<void> {
  const url = `${DJANGO_API_URL}/api/user-preferences/${id}/`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Failed to delete preference: ${response.statusText}`);
  }
}

/**
 * Clear all preferences for a specific scope
 */
export async function clearScope(scope_type: ScopeType, scope_id?: number): Promise<number> {
  const params = new URLSearchParams();
  params.append('scope_type', scope_type);
  if (scope_id !== undefined) params.append('scope_id', scope_id.toString());

  const url = `${DJANGO_API_URL}/api/user-preferences/clear_scope/?${params.toString()}`;
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Failed to clear scope: ${response.statusText}`);
  }

  const data = await response.json();
  return data.deleted_count || 0;
}

/**
 * Helper: Migrate localStorage to database
 * Reads from localStorage and saves to user preferences
 */
export async function migrateLocalStorage(
  localStorageKey: string,
  preferenceKey: string,
  scope_type: ScopeType = 'global',
  scope_id?: number
): Promise<void> {
  if (typeof window === 'undefined') return;

  const value = localStorage.getItem(localStorageKey);
  if (!value) return;

  try {
    const parsedValue = JSON.parse(value);
    await setPreference({
      preference_key: preferenceKey,
      preference_value: parsedValue,
      scope_type,
      scope_id
    });

    // Optionally remove from localStorage after successful migration
    // localStorage.removeItem(localStorageKey);
  } catch (error) {
    console.error(`Failed to migrate ${localStorageKey}:`, error);
  }
}
