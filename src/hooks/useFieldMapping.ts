/**
 * useFieldMapping Hook
 *
 * Manages field mapping state and operations for rent roll extraction.
 * Handles column discovery, mapping decisions, and extraction job creation.
 */

import { useState, useCallback } from 'react';

// Types
export type MappingConfidence = 'high' | 'medium' | 'low' | 'none';
export type MappingAction = 'auto' | 'suggest' | 'needs_input' | 'skip';
export type DataTypeHint = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'percent';

export interface ColumnMapping {
  source_column: string;
  source_index: number;
  sample_values: string[];
  proposed_target: string | null;
  confidence: MappingConfidence;
  action: MappingAction;
  data_type_hint: DataTypeHint;
  notes: string | null;
}

export interface DiscoveryResult {
  success: boolean;
  file_name: string;
  total_rows: number;
  total_columns: number;
  columns: ColumnMapping[];
  parse_warnings: string[];
  is_structured: boolean;
  document_id: number;
}

export interface MappingDecision {
  source_column: string;
  target_field: string | null;
  create_dynamic: boolean;
  dynamic_column_name?: string;
  data_type?: string;
}

export interface ApplyMappingResult {
  success: boolean;
  job_id?: number;
  job_status?: string;
  dynamic_columns_created?: number;
  standard_mappings?: number;
  skipped_columns?: number;
  units_extracted?: number;
  staged_count?: number;
  error?: string;
}

// Standard Landscape rent roll fields
export const STANDARD_FIELDS = [
  { value: 'unit_number', label: 'Unit Number *', category: 'Identity', required: true },
  { value: 'building_name', label: 'Building', category: 'Identity', required: false },
  { value: 'unit_type', label: 'Unit Type', category: 'Identity', required: false },
  { value: 'bedrooms', label: 'Bedrooms', category: 'Physical', required: false },
  { value: 'bathrooms', label: 'Bathrooms', category: 'Physical', required: false },
  { value: 'square_feet', label: 'Square Feet', category: 'Physical', required: false },
  { value: 'occupancy_status', label: 'Occupancy Status', category: 'Occupancy', required: false },
  { value: 'tenant_name', label: 'Tenant Name', category: 'Occupancy', required: false },
  { value: 'lease_start', label: 'Lease Start', category: 'Lease', required: false },
  { value: 'lease_end', label: 'Lease End', category: 'Lease', required: false },
  { value: 'move_in_date', label: 'Move-In Date', category: 'Lease', required: false },
  { value: 'current_rent', label: 'Current Rent', category: 'Financial', required: false },
  { value: 'market_rent', label: 'Market Rent', category: 'Financial', required: false },
  { value: 'renovation_status', label: 'Renovation Status', category: 'Renovation', required: false },
  { value: 'renovation_date', label: 'Renovation Date', category: 'Renovation', required: false },
  { value: 'renovation_cost', label: 'Renovation Cost', category: 'Renovation', required: false },
] as const;

export const FIELD_CATEGORIES = ['Identity', 'Physical', 'Occupancy', 'Lease', 'Financial', 'Renovation'] as const;

export function useFieldMapping(projectId: number) {
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [decisions, setDecisions] = useState<Map<string, MappingDecision>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Discover columns from an uploaded document
   */
  const discoverColumns = useCallback(async (documentId: number): Promise<DiscoveryResult | null> => {
    setLoading(true);
    setError(null);

    console.log(`[useFieldMapping] Discovering columns: projectId=${projectId}, documentId=${documentId}`);

    try {
      const response = await fetch(`/api/projects/${projectId}/discover-columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId }),
      });

      const data = await response.json();
      console.log(`[useFieldMapping] Response:`, response.status, data.success, data.error);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to discover columns');
      }

      setDiscovery(data);

      // Initialize decisions from discovery
      const initialDecisions = new Map<string, MappingDecision>();
      data.columns.forEach((col: ColumnMapping) => {
        initialDecisions.set(col.source_column, {
          source_column: col.source_column,
          target_field: col.proposed_target,
          create_dynamic: false,
        });
      });
      setDecisions(initialDecisions);

      return data;
    } catch (err) {
      console.error('[useFieldMapping] Discovery error:', err);
      const message = err instanceof Error ? err.message : 'Failed to discover columns';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /**
   * Update a single column's mapping decision
   */
  const updateDecision = useCallback((sourceColumn: string, updates: Partial<MappingDecision>) => {
    setDecisions(prev => {
      const next = new Map(prev);
      const current = next.get(sourceColumn) || {
        source_column: sourceColumn,
        target_field: null,
        create_dynamic: false,
      };
      next.set(sourceColumn, { ...current, ...updates });
      return next;
    });
  }, []);

  /**
   * Get current decision for a column
   */
  const getDecision = useCallback((sourceColumn: string): MappingDecision | undefined => {
    return decisions.get(sourceColumn);
  }, [decisions]);

  /**
   * Apply mapping decisions and start extraction
   */
  const applyMapping = useCallback(async (documentId: number): Promise<ApplyMappingResult> => {
    setLoading(true);
    setError(null);

    try {
      const mappings = Array.from(decisions.values());

      const response = await fetch(`/api/projects/${projectId}/apply-mapping/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          mappings,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply mapping');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply mapping';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [projectId, decisions]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setDiscovery(null);
    setDecisions(new Map());
    setError(null);
  }, []);

  /**
   * Get mapping statistics
   */
  const getStats = useCallback(() => {
    const all = Array.from(decisions.values());
    const mapped = all.filter(d => d.target_field || d.create_dynamic);
    const skipped = all.filter(d => !d.target_field && !d.create_dynamic);
    const dynamic = all.filter(d => d.create_dynamic);
    const standard = all.filter(d => d.target_field && !d.create_dynamic);

    return {
      total: all.length,
      mapped: mapped.length,
      skipped: skipped.length,
      dynamic: dynamic.length,
      standard: standard.length,
    };
  }, [decisions]);

  return {
    // State
    discovery,
    decisions,
    loading,
    error,

    // Actions
    discoverColumns,
    updateDecision,
    getDecision,
    applyMapping,
    reset,

    // Computed
    getStats,
  };
}

export default useFieldMapping;
