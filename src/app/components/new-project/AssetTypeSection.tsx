'use client'

import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { ANALYSIS_TYPE_OPTIONS } from './constants'
import type { AnalysisType, NewProjectFormData } from './types'

type AssetTypeSectionProps = {
  form: UseFormReturn<NewProjectFormData>
  hasError?: boolean
}

const AssetTypeSection = ({ form, hasError = false }: AssetTypeSectionProps) => {
  const {
    watch,
    setValue,
    formState: { errors }
  } = form

  const analysisType = watch('analysis_type') as AnalysisType | ''

  useEffect(() => {
    // Clear property subtype and class when analysis type changes
    if (!analysisType) {
      setValue('property_subtype', '')
      setValue('property_class', '')
      // Also update deprecated fields for backwards compatibility
      setValue('development_type', '')
      setValue('property_type_code', '')
      return
    }

    // Sync deprecated fields for backwards compatibility
    setValue('development_type', analysisType, { shouldDirty: false })

    // Clear property class if switching to Land Development
    if (analysisType === 'Land Development') {
      setValue('property_class', '')
    }
  }, [analysisType, setValue])

  return (
    <section
      className={`space-y-5 rounded-xl border bg-slate-900/40 p-5 shadow-sm shadow-slate-950/30 transition-colors ${
        hasError ? 'border-rose-600/70 ring-1 ring-rose-500/40' : 'border-slate-800'
      }`}
    >
      <header>
        <h3 className="text-lg font-semibold text-slate-100">Analysis type</h3>
        <p className="text-sm text-slate-400">Choose the type of financial analysis for this project.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {ANALYSIS_TYPE_OPTIONS.map(option => {
          const isSelected = analysisType === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue('analysis_type', option.value, { shouldDirty: true, shouldValidate: true })}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                isSelected
                  ? 'border-blue-500 bg-blue-900/30 text-blue-100'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-400 hover:bg-slate-700'
              }`}
            >
              <div className="text-sm font-semibold">{option.label}</div>
              <p className="mt-1 text-xs text-slate-300">{option.description}</p>
            </button>
          )
        })}
      </div>
      {errors.analysis_type && (
        <p className="text-xs text-rose-400">{errors.analysis_type.message as string}</p>
      )}
    </section>
  )
}

export default AssetTypeSection
