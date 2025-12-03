export type Tier = 0 | 1 | 2 | 3
// Backward compatibility alias - will be removed in future version
export type ContainerLevel = Tier

export interface Division {
  division_id: number
  project_id: number
  parent_division_id: number | null
  tier: Tier
  division_code: string
  display_name: string
  sort_order: number | null
  attributes?: Record<string, unknown> | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Backward compatibility alias - will be removed in future version
export type Container = Division

export interface DivisionNode extends Division {
  children: DivisionNode[]
}

// Backward compatibility alias - will be removed in future version
export type ContainerNode = DivisionNode

export interface ProjectConfig {
  project_id: number
  asset_type: string
  tier_0_label?: string
  tier_1_label: string
  tier_2_label: string
  tier_3_label: string
  land_use_level1_label?: string
  land_use_level1_label_plural?: string
  land_use_level2_label?: string
  land_use_level2_label_plural?: string
  land_use_level3_label?: string
  land_use_level3_label_plural?: string
  created_at?: string
  updated_at?: string
}

export interface LandUseLabels {
  level1Label: string
  level1LabelPlural: string
  level2Label: string
  level2LabelPlural: string
  level3Label: string
  level3LabelPlural: string
}

export interface ProjectSettings {
  project_id: number
  default_currency: string
  default_period_type: string
  global_inflation_rate: number | null
  cost_inflation_set_id?: number | null
  price_inflation_set_id?: number | null
  analysis_start_date: string | null
  analysis_end_date: string | null
  discount_rate: number | null
  created_at?: string
  updated_at?: string
}

export type FactType = 'budget' | 'actual'

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'guess'

export interface BudgetTag {
  tag_id: number
  fact_id: number
  fact_type: FactType
  tag_name: string
  tag_color?: string | null
  tag_category?: string | null
  is_compact?: boolean | null
  created_by?: number | null
  created_at?: string
}

export interface EnhancedBudgetFact {
  fact_id: number
  budget_id?: number
  division_id: number | null
  category_id?: number
  amount: number
  confidence_level?: ConfidenceLevel | null
  vendor_contact_id?: number | null
  escalation_rate?: number | null
  contingency_pct?: number | null
  timing_method?: string | null
  contract_number?: string | null
  purchase_order?: string | null
  is_committed: boolean
  tags?: BudgetTag[]
}

export interface ActualFact {
  fact_id: number
  division_id: number | null
  amount: number
  tags?: BudgetTag[]
}

export interface CalculationPeriod {
  period_id: number
  project_id: number
  period_start_date: string
  period_end_date: string
  period_type: string
  period_sequence: number
  created_at?: string
}

export interface BudgetTiming {
  timing_id: number
  fact_id: number
  period_id: number
  amount: number
  timing_method: string
  created_at?: string
}
