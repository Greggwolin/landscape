/**
 * Hook for fetching Analysis Type configuration.
 *
 * Analysis types are orthogonal to property types:
 * - VALUATION: Market value opinion (USPAP compliant appraisals)
 * - INVESTMENT: Acquisition underwriting (IRR, returns analysis)
 * - DEVELOPMENT: Ground-up or redevelopment returns
 * - FEASIBILITY: Go/no-go binary decision analysis
 */

import useSWR from 'swr'
import { fetchJson } from '@/lib/fetchJson'
import type { AnalysisPerspective, AnalysisPurpose } from '@/types/project-taxonomy'

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000'

// Analysis type codes
export type AnalysisType = 'VALUATION' | 'INVESTMENT' | 'VALUE_ADD' | 'DEVELOPMENT' | 'FEASIBILITY'
export type AnalysisTypeConfigLookup = {
  analysisType?: AnalysisType | null
  analysisPerspective?: AnalysisPerspective | null
  analysisPurpose?: AnalysisPurpose | null
}

// Analysis type configuration from API
export interface AnalysisTypeConfig {
  config_id?: number
  analysis_type: string
  analysis_perspective?: AnalysisPerspective | null
  analysis_purpose?: AnalysisPurpose | null
  tile_valuation: boolean
  tile_capitalization: boolean
  tile_returns: boolean
  tile_development_budget: boolean
  requires_capital_stack: boolean
  requires_comparable_sales: boolean
  requires_income_approach: boolean
  requires_cost_approach: boolean
  available_reports: string[]
  landscaper_context: string | null
  tiles: string[]
  created_at: string
  updated_at: string
}

// Lightweight config for lists
export interface AnalysisTypeConfigList {
  analysis_type: string
  analysis_perspective?: AnalysisPerspective | null
  analysis_purpose?: AnalysisPurpose | null
  tile_valuation: boolean
  tile_capitalization: boolean
  tile_returns: boolean
  tile_development_budget: boolean
  tiles: string[]
}

// Tiles response
export interface AnalysisTypeTiles {
  analysis_type: AnalysisType
  tiles: string[]
}

// Landscaper context response
export interface AnalysisTypeLandscaperContext {
  analysis_type: AnalysisType
  context: string | null
  required_inputs: {
    capital_stack: boolean
    comparable_sales: boolean
    income_approach: boolean
    cost_approach: boolean
  }
}

const fetcher = (url: string) => fetchJson(url)

const normalizeLookup = (
  lookup: AnalysisType | AnalysisTypeConfigLookup | null | undefined
): AnalysisTypeConfigLookup => {
  if (!lookup) return {}
  if (typeof lookup === 'string') {
    return { analysisType: lookup }
  }
  return lookup
}

/**
 * Fetch configuration for a specific analysis type.
 *
 * @param analysisType - The analysis type code (VALUATION, INVESTMENT, DEVELOPMENT, FEASIBILITY)
 * @returns Config data, loading state, and error
 *
 * @example
 * const { config, isLoading, error } = useAnalysisTypeConfig('VALUATION')
 * if (config?.tile_valuation) {
 *   // Show valuation tile
 * }
 */
export function useAnalysisTypeConfig(
  lookupOrType: AnalysisType | AnalysisTypeConfigLookup | null | undefined
) {
  const lookup = normalizeLookup(lookupOrType)
  const analysisType = lookup.analysisType
  const analysisPerspective = lookup.analysisPerspective
  const analysisPurpose = lookup.analysisPurpose
  const hasCompositeLookup = Boolean(analysisPerspective && analysisPurpose)

  const key = hasCompositeLookup
    ? `/api/projects?include_inactive=true&config_lookup=1&perspective=${analysisPerspective}&purpose=${analysisPurpose}`
    : (analysisType ? `${DJANGO_API_URL}/api/config/analysis-types/${analysisType}/` : null)

  const { data, error, isLoading, mutate } = useSWR<AnalysisTypeConfig | null>(
    key,
    async (url: string) => {
      if (!hasCompositeLookup) {
        return fetchJson<AnalysisTypeConfig>(url)
      }

      const projects = await fetchJson<Array<{
        tile_config?: AnalysisTypeConfig | null
      }>>(url)
      const match = projects
        .map((project) => project.tile_config)
        .find(
          (config): config is AnalysisTypeConfig =>
            Boolean(config)
            && config.analysis_perspective === analysisPerspective
            && config.analysis_purpose === analysisPurpose
        )

      return match ?? null
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    config: data ?? null,
    isLoading,
    error: error as Error | undefined,
    mutate,
  }
}

/**
 * Fetch all analysis type configurations.
 *
 * @returns List of all configs, loading state, and error
 *
 * @example
 * const { configs, isLoading } = useAnalysisTypeConfigs()
 * configs?.forEach(config => console.log(config.analysis_type, config.tiles))
 */
export function useAnalysisTypeConfigs() {
  const { data, error, isLoading, mutate } = useSWR<AnalysisTypeConfigList[]>(
    `${DJANGO_API_URL}/api/config/analysis-types/`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    configs: data ?? [],
    isLoading,
    error: error as Error | undefined,
    mutate,
  }
}

/**
 * Fetch visible tiles for a specific analysis type.
 *
 * @param analysisType - The analysis type code
 * @returns Tiles array, loading state, and error
 *
 * @example
 * const { tiles, isLoading } = useVisibleTiles('DEVELOPMENT')
 * // tiles = ['project_home', 'property', 'market', 'hbu', 'capitalization', 'returns', 'development_budget', 'reports', 'documents']
 */
export function useVisibleTiles(analysisType: AnalysisType | null | undefined) {
  const shouldFetch = !!analysisType

  const { data, error, isLoading } = useSWR<AnalysisTypeTiles>(
    shouldFetch ? `${DJANGO_API_URL}/api/config/analysis-types/${analysisType}/tiles/` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    tiles: data?.tiles ?? [],
    isLoading,
    error: error as Error | undefined,
  }
}

/**
 * Fetch Landscaper context hints for a specific analysis type.
 *
 * @param analysisType - The analysis type code
 * @returns Landscaper context data, loading state, and error
 *
 * @example
 * const { context, requiredInputs } = useLandscaperContext('VALUATION')
 * // context = 'Focus on USPAP compliance...'
 * // requiredInputs.comparable_sales = true
 */
export function useLandscaperContext(analysisType: AnalysisType | null | undefined) {
  const shouldFetch = !!analysisType

  const { data, error, isLoading } = useSWR<AnalysisTypeLandscaperContext>(
    shouldFetch ? `${DJANGO_API_URL}/api/config/analysis-types/${analysisType}/landscaper_context/` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    context: data?.context ?? null,
    requiredInputs: data?.required_inputs ?? null,
    isLoading,
    error: error as Error | undefined,
  }
}

// Analysis type display metadata
export const ANALYSIS_TYPE_META: Record<AnalysisType, {
  label: string
  description: string
  icon: string
  color: string
}> = {
  VALUATION: {
    label: 'Valuation',
    description: 'Market value opinion - appraisal',
    icon: '📈',
    color: 'bg-pink-900 text-pink-200',
  },
  INVESTMENT: {
    label: 'Investment',
    description: 'Acquisition underwriting - IRR analysis',
    icon: '💰',
    color: 'bg-blue-900 text-blue-200',
  },
  VALUE_ADD: {
    label: 'Value-Add',
    description: 'Acquisition with renovation upside',
    icon: '🔧',
    color: 'bg-purple-900 text-purple-200',
  },
  DEVELOPMENT: {
    label: 'Development',
    description: 'Ground-up or redevelopment returns',
    icon: '🔨',
    color: 'bg-amber-900 text-amber-200',
  },
  FEASIBILITY: {
    label: 'Feasibility',
    description: 'Go/no-go decision analysis',
    icon: '✅',
    color: 'bg-green-900 text-green-200',
  },
}

// Export list of valid analysis types
export const ANALYSIS_TYPES: AnalysisType[] = ['VALUATION', 'INVESTMENT', 'VALUE_ADD', 'DEVELOPMENT', 'FEASIBILITY']

export default useAnalysisTypeConfig
