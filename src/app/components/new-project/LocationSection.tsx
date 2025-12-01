'use client'

import { useEffect, forwardRef, useState, type InputHTMLAttributes } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { US_STATES } from './constants'
import type { NewProjectFormData } from './types'
import MapPinSelector, { type GeocodeResult } from './MapPinSelector'
import { cn } from '@/lib/utils'

type LocationMode = 'cross_streets' | 'coordinates' | 'map_pin' | 'address'

interface LocationTab {
  id: LocationMode
  label: string
}

type LocationSectionProps = {
  form: UseFormReturn<NewProjectFormData>
  analysisType: 'Land Development' | 'Income Property' | ''
  isDark?: boolean
  hasError?: boolean
}

// Floating Label Input Component (Light mode)
interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  isDark?: boolean
}

const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, isDark = false, className, id, value, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const hasValue = value !== undefined && value !== ''

    const inputId = id || `floating-loc-${label.toLowerCase().replace(/\s+/g, '-')}`

    return (
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
            className
          )}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'absolute left-3 transition-all duration-200 pointer-events-none',
            (isFocused || hasValue)
              ? 'top-1 text-[10px] text-blue-600'
              : `top-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`
          )}
        >
          {label}
        </label>
        {error && (
          <p className="mt-1 text-xs text-rose-500">{error}</p>
        )}
      </div>
    )
  }
)
FloatingInput.displayName = 'FloatingInput'

// Floating Label Select Component (Light mode)
interface FloatingSelectProps {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void
  name?: string
  options: { value: string; label: string }[]
  error?: string
  className?: string
  isDark?: boolean
}

const FloatingSelect = forwardRef<HTMLSelectElement, FloatingSelectProps>(
  ({ label, value, onChange, onBlur, name, options, error, className, isDark = false }, ref) => {
    const hasValue = value !== ''

    return (
      <div className="relative">
        <select
          ref={ref}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={cn(
            'peer w-full rounded-md border px-3 pb-1.5 pt-4 text-sm transition appearance-none',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            error ? 'border-rose-400' : (isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'),
            className
          )}
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label
          className={cn(
            'absolute left-3 transition-all duration-200 pointer-events-none',
            hasValue ? 'top-1 text-[10px] text-blue-600' : `top-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`
          )}
        >
          {label}
        </label>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {error && (
          <p className="mt-1 text-xs text-rose-500">{error}</p>
        )}
      </div>
    )
  }
)
FloatingSelect.displayName = 'FloatingSelect'

const LocationSection = ({ form, analysisType, isDark = false, hasError = false }: LocationSectionProps) => {
  const {
    register,
    setValue,
    watch,
    formState: { errors }
  } = form

  const locationMode = watch('location_mode') as LocationMode
  const latitude = watch('latitude')
  const longitude = watch('longitude')

  // Location tabs differ based on analysis type
  const locationTabs: LocationTab[] = analysisType === 'Income Property'
    ? [
        { id: 'address', label: 'Full Address' },
        { id: 'cross_streets', label: 'Cross Streets' },
        { id: 'coordinates', label: 'Coordinates' },
        { id: 'map_pin', label: 'Map Pin' }
      ]
    : [
        { id: 'cross_streets', label: 'Cross Streets' },
        { id: 'coordinates', label: 'Coordinates' },
        { id: 'map_pin', label: 'Map Pin' }
      ]

  // Set default location mode based on analysis type
  useEffect(() => {
    if (analysisType === 'Income Property' && !['address', 'cross_streets', 'coordinates', 'map_pin'].includes(locationMode)) {
      setValue('location_mode', 'address', { shouldDirty: false })
    } else if (analysisType === 'Land Development' && locationMode === 'address') {
      setValue('location_mode', 'cross_streets', { shouldDirty: false })
    }
  }, [analysisType, locationMode, setValue])

  const setLocationMode = (mode: LocationMode) => {
    setValue('location_mode', mode, { shouldDirty: true })
  }

  const handleMapLocationSelect = (coords: { lat: number; lng: number }) => {
    setValue('latitude', coords.lat.toFixed(6), { shouldDirty: true })
    setValue('longitude', coords.lng.toFixed(6), { shouldDirty: true })
  }

  const handleGeocode = (result: GeocodeResult) => {
    if (result.city) {
      setValue('city', result.city, { shouldDirty: true })
    }
    if (result.state) {
      const stateMatch = US_STATES.find(
        s => s.label.toLowerCase() === result.state?.toLowerCase() ||
             s.value.toLowerCase() === result.state?.toLowerCase()
      )
      if (stateMatch) {
        setValue('state', stateMatch.value, { shouldDirty: true })
      }
    }
    if (result.zip) {
      setValue('zip', result.zip, { shouldDirty: true })
    }
    if (result.crossStreets && locationMode === 'cross_streets') {
      setValue('cross_streets', result.crossStreets, { shouldDirty: true })
    }
  }

  const renderLocationErrors = () => {
    if (errors.street_address) {
      return <p className="text-xs text-rose-500">{errors.street_address.message as string}</p>
    }
    if (errors.cross_streets) {
      return <p className="text-xs text-rose-500">{errors.cross_streets.message as string}</p>
    }
    if (errors.latitude || errors.longitude) {
      return (
        <p className="text-xs text-rose-500">
          {(errors.latitude?.message as string) || (errors.longitude?.message as string)}
        </p>
      )
    }
    return null
  }

  const parsedLat = latitude ? parseFloat(latitude) : undefined
  const parsedLng = longitude ? parseFloat(longitude) : undefined

  return (
    <div className="space-y-4">
      {/* Location mode tabs - no label */}
      <div className="flex flex-wrap gap-2">
        {locationTabs.map(tab => {
          const isActive = locationMode === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLocationMode(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : isDark
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {locationMode === 'address' && (
          <>
            <FloatingInput
              label="Street Address"
              {...register('street_address')}
              value={watch('street_address')}
              isDark={isDark}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <FloatingInput
                label="City"
                {...register('city')}
                value={watch('city')}
                isDark={isDark}
              />
              <FloatingSelect
                label="State"
                value={watch('state')}
                onChange={(e) => setValue('state', e.target.value)}
                options={US_STATES}
                isDark={isDark}
              />
              <FloatingInput
                label="ZIP"
                inputMode="numeric"
                maxLength={10}
                {...register('zip')}
                value={watch('zip')}
                isDark={isDark}
              />
            </div>
          </>
        )}

        {locationMode === 'cross_streets' && (
          <>
            <FloatingInput
              label="Cross Streets"
              {...register('cross_streets')}
              value={watch('cross_streets')}
              isDark={isDark}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FloatingInput
                label="City"
                {...register('city')}
                value={watch('city')}
                isDark={isDark}
              />
              <FloatingSelect
                label="State"
                value={watch('state')}
                onChange={(e) => setValue('state', e.target.value)}
                options={US_STATES}
                isDark={isDark}
              />
            </div>
          </>
        )}

        {locationMode === 'coordinates' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FloatingInput
              label="Latitude"
              type="number"
              step="0.000001"
              {...register('latitude')}
              value={watch('latitude')}
              isDark={isDark}
            />
            <FloatingInput
              label="Longitude"
              type="number"
              step="0.000001"
              {...register('longitude')}
              value={watch('longitude')}
              isDark={isDark}
            />
          </div>
        )}

        {locationMode === 'map_pin' && parsedLat && parsedLng && (
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Current: {parsedLat.toFixed(4)}, {parsedLng.toFixed(4)}
          </p>
        )}

        {renderLocationErrors()}
      </div>

      {/* Map - always visible */}
      <MapPinSelector
        latitude={parsedLat}
        longitude={parsedLng}
        onLocationSelect={handleMapLocationSelect}
        onGeocode={handleGeocode}
        isDark={isDark}
        className="h-96"
      />

      {/* Auto-detected location display */}
      {(watch('city') || watch('state')) && locationMode === 'map_pin' && (
        <div className={`rounded-md px-3 py-2 text-xs ${
          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
        }`}>
          Auto-detected: {[watch('city'), watch('state'), watch('zip')].filter(Boolean).join(', ')}
        </div>
      )}
    </div>
  )
}

export default LocationSection
