'use client'

import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import {
  DEVELOPMENT_TYPE_OPTIONS,
  PROPERTY_TYPE_OPTIONS
} from './constants'
import type { DevelopmentType, NewProjectFormData } from './types'

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

  const developmentType = watch('development_type') as DevelopmentType | ''
  const propertyTypeCode = watch('property_type_code')

  useEffect(() => {
    if (!developmentType) {
      setValue('property_type_code', '')
      setValue('property_subtype', '')
      return
    }

    const options = PROPERTY_TYPE_OPTIONS[developmentType]
    if (!options.some(option => option.value === propertyTypeCode)) {
      setValue('property_type_code', '')
      setValue('property_subtype', '')
    }
  }, [developmentType, propertyTypeCode, setValue])

  const propertyTypeOptions = developmentType ? PROPERTY_TYPE_OPTIONS[developmentType] : []

  return (
    <section
      className={`space-y-5 rounded-xl border bg-slate-900/40 p-5 shadow-sm shadow-slate-950/30 transition-colors ${
        hasError ? 'border-rose-600/70 ring-1 ring-rose-500/40' : 'border-slate-800'
      }`}
    >
      <header>
        <h3 className="text-lg font-semibold text-slate-100">Asset type</h3>
        <p className="text-sm text-slate-400">Pick the development family and subtype to tailor inputs.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {DEVELOPMENT_TYPE_OPTIONS.map(option => {
          const isSelected = developmentType === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue('development_type', option.value, { shouldDirty: true, shouldValidate: true })}
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
      {errors.development_type && (
        <p className="text-xs text-rose-400">{errors.development_type.message as string}</p>
      )}

      <div>
        <label className="block text-sm font-semibold text-slate-100">
          Property type detail <span className="text-rose-400">*</span>
        </label>
        <select
          value={propertyTypeCode}
          onChange={(event) => setValue('property_type_code', event.target.value, { shouldDirty: true, shouldValidate: true })}
          disabled={!developmentType}
          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{developmentType ? 'Select a property type' : 'Select development type first'}</option>
          {propertyTypeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.property_type_code && (
          <p className="mt-2 text-xs text-rose-400">{errors.property_type_code.message as string}</p>
        )}
      </div>
    </section>
  )
}

export default AssetTypeSection
