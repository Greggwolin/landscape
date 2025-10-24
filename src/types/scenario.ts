/**
 * Scenario Management Types
 * Feature: SCENARIO-001
 * Created: 2025-10-24
 *
 * TypeScript interfaces for financial modeling scenarios.
 */

export type ScenarioType = 'base' | 'optimistic' | 'conservative' | 'stress' | 'custom';

export type VarianceMethod = 'percentage' | 'absolute' | 'mixed';

export type ComparisonType = 'side_by_side' | 'variance_from_base' | 'probability_weighted';

export interface Scenario {
  scenario_id: number;
  project: number;
  scenario_name: string;
  scenario_type: ScenarioType;
  scenario_code: string;

  is_active: boolean;
  is_locked: boolean;
  display_order: number;

  description?: string;
  color_hex: string;
  color_class: string;

  variance_method?: VarianceMethod;
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

export interface ScenarioComparison {
  comparison_id: number;
  project: number;
  comparison_name: string;

  scenario_ids: number[];
  scenarios: Scenario[];

  comparison_type: ComparisonType;
  scenario_probabilities?: number[];

  comparison_results?: ComparisonResults;

  created_at: string;
  updated_at: string;
}

export interface ComparisonResults {
  calculated_at: string;
  metrics: {
    irr_comparison?: Record<string, number>;
    npv_comparison?: Record<string, number>;
    cash_flow_variance?: Record<string, number>;
    [key: string]: Record<string, number> | undefined;
  };
  message?: string;
}

export interface CreateScenarioRequest {
  project: number;
  scenario_name: string;
  scenario_type?: ScenarioType;
  description?: string;
  variance_method?: VarianceMethod;
  revenue_variance_pct?: number;
  cost_variance_pct?: number;
  absorption_variance_pct?: number;
}

export interface CloneScenarioRequest {
  scenario_name: string;
  scenario_type?: ScenarioType;
}

export interface ReorderScenariosRequest {
  project_id: number;
  scenario_ids: number[];
}

export interface CreateComparisonRequest {
  project: number;
  comparison_name: string;
  scenario_ids: number[];
  comparison_type?: ComparisonType;
  scenario_probabilities?: number[];
}
