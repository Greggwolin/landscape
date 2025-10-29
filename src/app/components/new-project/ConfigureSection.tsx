'use client'

import { useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import ProjectSummaryPreview from './ProjectSummaryPreview'
import type { NewProjectFormData, UploadedDocument } from './types'
import { PROPERTY_SUBTYPE_SAMPLES } from './constants'

type ConfigureSectionProps = {
  form: UseFormReturn<NewProjectFormData>
  uploadedDocuments: UploadedDocument[]
  extractionPending: boolean
  hasError?: boolean
}

const ConfigureSection = ({ form, uploadedDocuments, extractionPending, hasError = false }: ConfigureSectionProps) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors }
  } = form
  const [showSubtype, setShowSubtype] = useState(false)

  const propertyTypeCode = watch('property_type_code')
  const formData = watch()

  const propertySubtypeOptions = useMemo(() => {
    if (!propertyTypeCode) return []
    return PROPERTY_SUBTYPE_SAMPLES[propertyTypeCode] ?? []
  }, [propertyTypeCode])

  return (
    <section
      className={`flex flex-col gap-6 rounded-xl border bg-slate-900/40 p-5 shadow-sm shadow-slate-950/30 transition-colors ${
        hasError ? 'border-rose-600/70 ring-1 ring-rose-500/40' : 'border-slate-800'
      }`}
    >
      <div className="space-y-4">
        <header>
          <h3 className="text-lg font-semibold text-slate-100">Configure</h3>
          <p className="text-sm text-slate-400">
            Name the project and add extra classification detail.
          </p>
        </header>

        <div>
          <label className="block text-sm font-semibold text-slate-100">
            Project name (optional)
          </label>
          <Input
            {...register('project_name')}
            maxLength={255}
            placeholder="Optional — auto-generated from address if empty"
            className="mt-2 border-slate-700 bg-slate-900/40 text-slate-100"
          />
          {errors.project_name && (
            <p className="mt-2 text-xs text-rose-400">{errors.project_name.message as string}</p>
          )}
        </div>

        {propertyTypeCode && (
          <div>
            <button
              type="button"
              className="text-xs font-semibold text-blue-300 underline-offset-2 hover:underline"
              onClick={() => setShowSubtype(prev => !prev)}
            >
              {showSubtype ? 'Hide subtype options' : 'Add subtype specificity'}
            </button>

            {showSubtype && (
              <div className="mt-3 space-y-2">
                {propertySubtypeOptions.length > 0 ? (
                  <select
                    value={watch('property_subtype')}
                    onChange={(event) => setValue('property_subtype', event.target.value, { shouldDirty: true })}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select subtype (optional)</option>
                    {propertySubtypeOptions.map(subtype => (
                      <option key={subtype} value={subtype}>
                        {subtype}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    {...register('property_subtype')}
                    placeholder="Type subtype (optional)"
                    className="border-slate-700 bg-slate-900/40 text-slate-100"
                  />
                )}
                <p className="text-xs text-slate-400">
                  Helps Landscaper tailor AI defaults and benchmarking.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ProjectSummaryPreview
        data={formData}
        uploadedDocuments={uploadedDocuments}
        extractionPending={extractionPending}
      />
    </section>
  )
}

export default ConfigureSection
