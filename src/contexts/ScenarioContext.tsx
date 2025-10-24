/**
 * Scenario Context Provider
 * Feature: SCENARIO-001 - Revised Integration (LX9)
 * Created: 2025-10-24
 *
 * Provides project-level scenario management with React Context API.
 * Handles scenario activation, creation, cloning, deletion.
 * Broadcasts scenario-changed events for data refetching.
 */

'use client';

import React, { createContext, useContext, useEffect } from 'react';
import useSWR, { mutate } from 'swr';

export interface Scenario {
  scenario_id: number;
  project: number;
  scenario_name: string;
  scenario_type: 'base' | 'optimistic' | 'conservative' | 'stress' | 'custom';
  scenario_code: string;
  is_active: boolean;
  is_locked: boolean;
  display_order: number;
  description?: string;
  color_hex: string;
  color_class: string;
  variance_method?: 'percentage' | 'absolute' | 'mixed';
  revenue_variance_pct?: number;
  cost_variance_pct?: number;
  absorption_variance_pct?: number;
  start_date_offset_months: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  cloned_from?: number;
  clone_count: number;
  can_delete: boolean;
}

interface ScenarioContextValue {
  activeScenario: Scenario | null;
  scenarios: Scenario[];
  loading: boolean;
  error: Error | null;
  activateScenario: (scenarioId: number) => Promise<void>;
  createScenario: (name: string, type: string) => Promise<void>;
  cloneScenario: (scenarioId: number, newName: string) => Promise<void>;
  deleteScenario: (scenarioId: number) => Promise<void>;
  refetchScenarios: () => void;
}

const ScenarioContext = createContext<ScenarioContextValue | undefined>(undefined);

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
  return r.json();
});

export function ScenarioProvider({
  projectId,
  children
}: {
  projectId: number;
  children: React.ReactNode;
}) {
  const { data: scenarios, error, isLoading } = useSWR<Scenario[]>(
    projectId ? `/api/financial/scenarios?project_id=${projectId}` : null,
    fetcher,
    {
      refreshInterval: 0, // Don't auto-refresh
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const activeScenario = scenarios?.find(s => s.is_active) || null;

  const activateScenario = async (scenarioId: number) => {
    try {
      const response = await fetch(`/api/financial/scenarios/${scenarioId}/activate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate scenario');
      }

      // Refetch scenarios
      await mutate(`/api/financial/scenarios?project_id=${projectId}`);

      // Broadcast scenario change event for all data-fetching components
      window.dispatchEvent(new CustomEvent('scenario-changed', {
        detail: { scenarioId, projectId }
      }));
    } catch (error) {
      console.error('Failed to activate scenario:', error);
      throw error;
    }
  };

  const createScenario = async (name: string, type: string) => {
    try {
      const response = await fetch('/api/financial/scenarios/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: projectId,
          scenario_name: name,
          scenario_type: type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create scenario');
      }

      // Refetch scenarios
      await mutate(`/api/financial/scenarios?project_id=${projectId}`);
    } catch (error) {
      console.error('Failed to create scenario:', error);
      throw error;
    }
  };

  const cloneScenario = async (scenarioId: number, newName: string) => {
    try {
      const response = await fetch(`/api/financial/scenarios/${scenarioId}/clone/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_name: newName,
          scenario_type: 'custom'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clone scenario');
      }

      // Refetch scenarios
      await mutate(`/api/financial/scenarios?project_id=${projectId}`);
    } catch (error) {
      console.error('Failed to clone scenario:', error);
      throw error;
    }
  };

  const deleteScenario = async (scenarioId: number) => {
    try {
      const response = await fetch(`/api/financial/scenarios/${scenarioId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete scenario');
      }

      // Refetch scenarios
      await mutate(`/api/financial/scenarios?project_id=${projectId}`);
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      throw error;
    }
  };

  const refetchScenarios = () => {
    mutate(`/api/financial/scenarios?project_id=${projectId}`);
  };

  return (
    <ScenarioContext.Provider
      value={{
        activeScenario,
        scenarios: scenarios || [],
        loading: isLoading,
        error: error || null,
        activateScenario,
        createScenario,
        cloneScenario,
        deleteScenario,
        refetchScenarios,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}

export function useScenario() {
  const context = useContext(ScenarioContext);
  if (context === undefined) {
    throw new Error('useScenario must be used within a ScenarioProvider');
  }
  return context;
}

/**
 * Hook for data-fetching components to include scenario_id in API calls
 * and automatically refetch when scenario changes.
 */
export function useScenarioFilter() {
  const { activeScenario } = useScenario();

  useEffect(() => {
    // Components using this hook will automatically re-render when scenario changes
    const handleScenarioChange = () => {
      // The component will re-fetch due to activeScenario dependency change
    };

    window.addEventListener('scenario-changed', handleScenarioChange);
    return () => window.removeEventListener('scenario-changed', handleScenarioChange);
  }, []);

  return {
    scenarioId: activeScenario?.scenario_id,
    scenarioName: activeScenario?.scenario_name,
    hasActiveScenario: !!activeScenario,
  };
}
