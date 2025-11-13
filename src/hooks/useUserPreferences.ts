/**
 * React hooks for user preference management
 * Provides state management and synchronization between localStorage and database
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPreference,
  setPreference,
  getAllForScope,
  ScopeType,
  migrateLocalStorage
} from '@/lib/api/user-preferences';

export interface UsePreferenceOptions<T> {
  /** Preference key */
  key: string;
  /** Default value if preference doesn't exist */
  defaultValue: T;
  /** Scope type (global, project, organization) */
  scopeType?: ScopeType;
  /** Scope ID (project ID, org ID, etc.) */
  scopeId?: number;
  /** LocalStorage key to migrate from (optional) */
  migrateFrom?: string;
  /** Debounce delay in ms for auto-save (default: 500) */
  debounceMs?: number;
}

/**
 * Hook for managing a single user preference
 * Automatically syncs with database and provides optimistic updates
 *
 * @example
 * ```tsx
 * const [theme, setTheme, { loading, error }] = usePreference({
 *   key: 'theme',
 *   defaultValue: { mode: 'light' },
 *   scopeType: 'global'
 * });
 * ```
 */
export function usePreference<T = any>(
  options: UsePreferenceOptions<T>
): [T, (value: T) => void, { loading: boolean; error: Error | null; saving: boolean }] {
  const {
    key,
    defaultValue,
    scopeType = 'global',
    scopeId,
    migrateFrom,
    debounceMs = 500
  } = options;

  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(false);

  // Load initial value from database
  useEffect(() => {
    let cancelled = false;

    async function loadPreference() {
      try {
        setLoading(true);
        setError(null);

        // Migrate from localStorage if specified
        if (migrateFrom && typeof window !== 'undefined') {
          await migrateLocalStorage(migrateFrom, key, scopeType, scopeId);
        }

        const fetchedValue = await getPreference<T>(
          key,
          scopeType,
          scopeId,
          defaultValue
        );

        if (!cancelled) {
          setValue(fetchedValue ?? defaultValue);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`Failed to load preference ${key}:`, err);
          setError(err as Error);
          // Fall back to default value
          setValue(defaultValue);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          isMountedRef.current = true;
        }
      }
    }

    loadPreference();

    return () => {
      cancelled = true;
    };
  }, [key, scopeType, scopeId]); // Intentionally not including defaultValue/migrateFrom

  // Debounced save function
  const updateValue = useCallback((newValue: T) => {
    // Optimistic update
    setValue(newValue);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only save if component has mounted (skip initial render)
    if (!isMountedRef.current) {
      return;
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        setError(null);

        await setPreference({
          preference_key: key,
          preference_value: newValue,
          scope_type: scopeType,
          scope_id: scopeId
        });
      } catch (err) {
        console.error(`Failed to save preference ${key}:`, err);
        setError(err as Error);
      } finally {
        setSaving(false);
      }
    }, debounceMs);
  }, [key, scopeType, scopeId, debounceMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return [value, updateValue, { loading, error, saving }];
}

/**
 * Hook for managing multiple preferences within a scope
 * Useful for project-specific or organization-specific settings
 *
 * @example
 * ```tsx
 * const { preferences, setPreference, loading } = useScopedPreferences({
 *   scopeType: 'project',
 *   scopeId: projectId
 * });
 *
 * // Get a value
 * const grouping = preferences['budget.grouping'];
 *
 * // Set a value
 * setPreference('budget.grouping', { isGrouped: true });
 * ```
 */
export function useScopedPreferences(options: {
  scopeType?: ScopeType;
  scopeId?: number;
}) {
  const { scopeType = 'global', scopeId } = options;

  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load all preferences for the scope
  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        setLoading(true);
        setError(null);

        const prefs = await getAllForScope(scopeType, scopeId);

        if (!cancelled) {
          setPreferences(prefs);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load scoped preferences:', err);
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [scopeType, scopeId]);

  const updatePreference = useCallback(async (key: string, value: any) => {
    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: value }));

    try {
      await setPreference({
        preference_key: key,
        preference_value: value,
        scope_type: scopeType,
        scope_id: scopeId
      });
    } catch (err) {
      console.error(`Failed to save preference ${key}:`, err);
      setError(err as Error);

      // Revert on error (optional - could also keep optimistic update)
      // Reload to get true state
      const prefs = await getAllForScope(scopeType, scopeId);
      setPreferences(prefs);
    }
  }, [scopeType, scopeId]);

  return {
    preferences,
    setPreference: updatePreference,
    loading,
    error
  };
}

/**
 * Hook for managing budget grouping state with database persistence
 * Drop-in replacement for localStorage-based useBudgetGrouping
 */
export function useBudgetGroupingPersistence(projectId: number) {
  const [groupingState, setGroupingState, { loading, saving }] = usePreference<{
    isGrouped: boolean;
    expandedCategories: string[];
  }>({
    key: 'budget.grouping',
    defaultValue: {
      isGrouped: false,
      expandedCategories: []
    },
    scopeType: 'project',
    scopeId: projectId,
    migrateFrom: `budget_grouping_${projectId}`,
    debounceMs: 300
  });

  const setIsGrouped = useCallback((isGrouped: boolean) => {
    setGroupingState(prev => ({ ...prev, isGrouped }));
  }, [setGroupingState]);

  const setExpandedCategories = useCallback((expandedCategories: string[]) => {
    setGroupingState(prev => ({ ...prev, expandedCategories }));
  }, [setGroupingState]);

  return {
    isGrouped: groupingState.isGrouped,
    expandedCategories: groupingState.expandedCategories,
    setIsGrouped,
    setExpandedCategories,
    loading,
    saving
  };
}

/**
 * Hook for managing theme preference with database persistence
 */
export function useThemePersistence() {
  const [theme, setTheme, { loading, saving }] = usePreference<{ mode: 'light' | 'dark' }>({
    key: 'theme',
    defaultValue: { mode: 'light' },
    scopeType: 'global',
    migrateFrom: 'coreui-theme',
    debounceMs: 500
  });

  const setThemeMode = useCallback((mode: 'light' | 'dark') => {
    setTheme({ mode });
  }, [setTheme]);

  return {
    theme: theme.mode,
    setTheme: setThemeMode,
    loading,
    saving
  };
}
