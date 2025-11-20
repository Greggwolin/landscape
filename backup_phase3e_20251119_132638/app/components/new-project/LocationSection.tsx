'use client'

import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { US_STATES } from './constants'
import type { LocationMode, NewProjectFormData } from './types'
import AIDocumentPrompt from './AIDocumentPrompt'
import { Lightbulb } from 'lucide-react'
import { parseSingleLineAddress, type ParsedAddress } from './utils'

const LOCATION_TABS: Array<{ id: LocationMode; label: string; description: string }> = [
  { id: 'address', label: 'Full Address', description: 'Recommended' },
  { id: 'cross_streets', label: 'Cross Streets', description: 'When no street number' },
  { id: 'coordinates', label: 'Coordinates', description: 'Lat / Long' }
]

type LocationSectionProps = {
  form: UseFormReturn<NewProjectFormData>
  onUploadDocuments: () => void
  onSkipUpload: () => void
  hasError?: boolean
}

const LocationSection = ({ form, onUploadDocuments, onSkipUpload, hasError = false }: LocationSectionProps) => {
  const {
    register,
    setValue,
    getValues,
    watch,
    formState: { errors }
  } = form

  const [suggestedAddress, setSuggestedAddress] = useState<ParsedAddress | null>(null)
  const [showSuggestion, setShowSuggestion] = useState(false)

  const locationMode = watch('location_mode')

  const setLocationMode = (mode: LocationMode) => {
    setValue('location_mode', mode, { shouldDirty: true })
  }

  const renderLocationErrors = () => {
    if (errors.street_address) {
      return <p className="text-xs text-rose-400">{errors.street_address.message as string}</p>
    }
    if (errors.cross_streets) {
      return <p className="text-xs text-rose-400">{errors.cross_streets.message as string}</p>
    }
    if (errors.latitude || errors.longitude) {
      return (
        <p className="text-xs text-rose-400">
          {(errors.latitude?.message as string) || (errors.longitude?.message as string)}
        </p>
      )
    }
    return null
  }

  const attemptParseAddress = () => {
    const raw = getValues('single_line_address')
    if (!raw) return
    const parsed = parseSingleLineAddress(raw)
    if (!parsed) return
    setSuggestedAddress(parsed)
    setShowSuggestion(true)
  }

  const acceptSuggestion = () => {
    if (!suggestedAddress) return
    setValue('street_address', suggestedAddress.street, { shouldDirty: true })
    setValue('city', suggestedAddress.city, { shouldDirty: true })
    setValue('state', suggestedAddress.state, { shouldDirty: true })
    setValue('zip', suggestedAddress.zip ?? '', { shouldDirty: true })
    setValue('location_mode', 'address', { shouldDirty: true })
    setShowSuggestion(false)
  }

  const rejectSuggestion = () => {
    setShowSuggestion(false)
    setSuggestedAddress(null)
  }

  return (
    <section
      className={`space-y-5 rounded-xl border bg-slate-900/40 p-5 shadow-sm shadow-slate-950/30 transition-colors ${
        hasError ? 'border-rose-600/70 ring-1 ring-rose-500/40' : 'border-slate-800'
      }`}
    >
      <header>
        <h3 className="text-lg font-semibold text-slate-100">Location</h3>
        <p className="text-sm text-slate-400">Enter a quick address or choose another method.</p>
      </header>

      <div>
        <label className="block text-sm font-semibold text-slate-100">
          Quick address
        </label>
        <Input
          {...register('single_line_address')}
          placeholder="e.g., 14105 Chadron Ave, Hawthorne, CA 90250"
          className="mt-2 border-slate-700 bg-slate-900/40 text-slate-100"
          onBlur={attemptParseAddress}
        />
        <p className="mt-1 text-xs text-slate-500">
          Landscaper will auto-fill address fields when possible.
        </p>

        {showSuggestion && suggestedAddress && (
          <div className="mt-3 rounded-lg border border-blue-700 bg-blue-900/20 p-3 text-sm text-slate-100">
            <p className="font-semibold text-blue-200">Confirm parsed address</p>
            <p className="mt-1 text-slate-200">
              {suggestedAddress.street}, {suggestedAddress.city}, {suggestedAddress.state}
              {suggestedAddress.zip ? ` ${suggestedAddress.zip}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Button type="button" size="sm" onClick={acceptSuggestion}>
                Use this address
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={rejectSuggestion}>
                Edit manually
              </Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          {LOCATION_TABS.map(tab => {
            const isActive = locationMode === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLocationMode(tab.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? 'border-blue-500 bg-blue-900/40 text-blue-100'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-400 hover:bg-slate-700'
                }`}
              >
                <div className="font-semibold">{tab.label}</div>
                <div className="text-xs text-slate-300">{tab.description}</div>
              </button>
            )
          })}
        </div>

        <div className="mt-4 space-y-3">
          {locationMode === 'address' && (
            <>
              <Input
                {...register('street_address')}
                placeholder="Street Address"
                className="border-slate-700 bg-slate-900/40 text-slate-100"
              />
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <Input
                  {...register('city')}
                  placeholder="City"
                  className="border-slate-700 bg-slate-900/40 text-slate-100"
                />
                <select
                  {...register('state')}
                  className="rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">State</option>
                  {US_STATES.map(state => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
                <Input
                  {...register('zip')}
                  placeholder="ZIP Code"
                  inputMode="numeric"
                  maxLength={10}
                  className="border-slate-700 bg-slate-900/40 text-slate-100"
                />
              </div>
            </>
          )}

          {locationMode === 'cross_streets' && (
            <>
              <Input
                {...register('cross_streets')}
                placeholder="Main St & Oak Ave"
                className="border-slate-700 bg-slate-900/40 text-slate-100"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  {...register('city')}
                  placeholder="City"
                  className="border-slate-700 bg-slate-900/40 text-slate-100"
                />
                <select
                  {...register('state')}
                  className="rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">State</option>
                  {US_STATES.map(state => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {locationMode === 'coordinates' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                {...register('latitude')}
                type="number"
                step="0.000001"
                placeholder="33.914400"
                className="border-slate-700 bg-slate-900/40 text-slate-100"
              />
              <Input
                {...register('longitude')}
                type="number"
                step="0.000001"
                placeholder="-118.352600"
                className="border-slate-700 bg-slate-900/40 text-slate-100"
              />
            </div>
          )}
        </div>

        <div className="mt-2">{renderLocationErrors()}</div>
      </div>

      <AIDocumentPrompt step={1}>
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-5 w-5 text-blue-300" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-200">Landscaper says:</p>
            <p className="mt-1 text-sm text-slate-200">
              "I can extract location details, property specs, and financial data from your documents."
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Have an Offering Memo, Appraisal, or Site Plan?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={onUploadDocuments}>
                📎 Upload Documents
              </Button>
              <Button type="button" variant="ghost" onClick={onSkipUpload}>
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      </AIDocumentPrompt>
    </section>
  )
}

export default LocationSection
