'use client'

import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { NewProjectFormData } from './types'
import { cn } from '@/lib/utils'

type PropertyDataSectionProps = {
  form: UseFormReturn<NewProjectFormData>
  isDark?: boolean
  hasError?: boolean
  extractedFieldKeys?: Set<string>
}

// Compact Floating Label Input Component (Light mode, single line)
interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  suffix?: React.ReactNode
  isDark?: boolean
  isExtracted?: boolean
}

const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, suffix, isDark = false, isExtracted = false, className, id, value, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const hasValue = value !== undefined && value !== ''

    const inputId = id || `floating-prop-${label.toLowerCase().replace(/\s+/g, '-')}`

    return (
      <div className="relative flex-1">
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            value={value}
            {...props}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
          }}
          placeholder=" "
          className={cn(
            'peer w-full rounded-md border px-3 pb-1.5 pt-4 text-sm placeholder-transparent transition',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            error ? 'border-rose-400' : (isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'),
            isExtracted && !isDark && 'ring-2 ring-blue-300 bg-blue-50/50',
            isExtracted && isDark && 'ring-2 ring-blue-500/50 bg-blue-900/20',
            suffix ? 'pr-14' : '',
            className
          )}
          />
          <label
            htmlFor={inputId}
            className={cn(
              'absolute left-3 transition-all duration-200 pointer-events-none whitespace-nowrap',
              (isFocused || hasValue)
                ? 'top-1 text-[10px] text-blue-600'
                : `top-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`
            )}
          >
            {label}
          </label>
          {isExtracted && !suffix && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600">
              Auto
            </span>
          )}
          {suffix && (
            <div className={cn(
              'absolute top-1/2 -translate-y-1/2 text-xs text-slate-400',
              isExtracted ? 'right-10' : 'right-2'
            )}>
              {suffix}
            </div>
          )}
          {isExtracted && suffix && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600">
              Auto
            </span>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-rose-500">{error}</p>
        )}
      </div>
    )
  }
)
FloatingInput.displayName = 'FloatingInput'

const PropertyDataSection = ({ form, isDark = false, hasError = false, extractedFieldKeys = new Set() }: PropertyDataSectionProps) => {
  const {
    register,
    watch,
    formState: { errors }
  } = form

  const analysisType = watch('analysis_type')

  const renderIncomePropertyFields = () => (
    <div className="flex gap-3 items-end">
      <FloatingInput
        label="Total Units"
        type="number"
        min={1}
        {...register('total_units')}
        value={watch('total_units')}
        error={errors.total_units?.message as string}
        isDark={isDark}
        isExtracted={extractedFieldKeys.has('total_units')}
      />
      <FloatingInput
        label="Building SF"
        type="number"
        min={1}
        {...register('building_sf')}
        value={watch('building_sf')}
        error={errors.building_sf?.message as string}
        isDark={isDark}
        isExtracted={extractedFieldKeys.has('building_sf')}
      />
      <div className="flex gap-2 items-end">
        <FloatingInput
          label="Site Size"
          type="number"
          min={0}
          step="0.01"
          {...register('site_area')}
          value={watch('site_area')}
          error={errors.site_area?.message as string}
          isDark={isDark}
          isExtracted={extractedFieldKeys.has('site_area')}
        />
        <select
          {...register('site_area_unit')}
          className={cn(
            'mt-auto h-[44px] min-w-[110px] rounded-md border px-3 text-sm leading-tight',
            isDark
              ? 'border-slate-700 bg-slate-900 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              : 'border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          )}
        >
          <option value="AC">AC</option>
          <option value="SF">SF</option>
        </select>
      </div>
    </div>
  )

  const renderLandDevelopmentFields = () => (
    <div className="flex gap-3 items-end">
      <div className="flex gap-2 items-end flex-1">
        <FloatingInput
          label="Site Size"
          type="number"
          min={0.01}
          step="0.01"
          {...register('site_area')}
          value={watch('site_area')}
          error={errors.site_area?.message as string}
          isDark={isDark}
          isExtracted={extractedFieldKeys.has('site_area')}
        />
        <select
          {...register('site_area_unit')}
          className={cn(
            'mt-auto h-[44px] min-w-[110px] rounded-md border px-3 text-sm leading-tight',
            isDark
              ? 'border-slate-700 bg-slate-900 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
              : 'border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          )}
        >
          <option value="AC">AC</option>
          <option value="SF">SF</option>
        </select>
      </div>

      <FloatingInput
        label="Total Lots"
        type="number"
        min={1}
        {...register('total_lots_units')}
        value={watch('total_lots_units')}
        error={errors.total_lots_units?.message as string}
        isDark={isDark}
        isExtracted={extractedFieldKeys.has('total_lots_units')}
      />

      <FloatingInput
        label="Density"
        type="number"
        min={0.1}
        step="0.1"
        suffix="DU/AC"
        {...register('density')}
        value={watch('density')}
        error={errors.density?.message as string}
        isDark={isDark}
        isExtracted={extractedFieldKeys.has('density')}
      />
    </div>
  )

  if (!analysisType) {
    return (
      <div className={`rounded-lg px-4 py-8 text-center ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-400'}`}>
        <p className="text-sm">Select an analysis type to continue</p>
      </div>
    )
  }

  return (
    <div>
      {analysisType === 'Income Property'
        ? renderIncomePropertyFields()
        : renderLandDevelopmentFields()}
    </div>
  )
}

export default PropertyDataSection
