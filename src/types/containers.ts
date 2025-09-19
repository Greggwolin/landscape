export type ContainerLevel = 1 | 2 | 3

export interface Container {
  container_id: number
  project_id: number
  parent_container_id: number | null
  container_level: ContainerLevel
  container_code: string
  display_name: string
  sort_order: number | null
  attributes?: Record<string, unknown> | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ContainerNode extends Container {
  children: ContainerNode[]
}

export interface ProjectConfig {
  project_id: number
  asset_type: string
  level1_label: string
  level2_label: string
  level3_label: string
  created_at?: string
  updated_at?: string
}

export interface ProjectSettings {
  project_id: number
  default_currency: string
  default_period_type: string
  global_inflation_rate: number | null
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
  container_id: number | null
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
  container_id: number | null
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
