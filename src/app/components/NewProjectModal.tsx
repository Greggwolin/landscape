'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type FieldErrors, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProjectContext } from './ProjectProvider'
import LocationSection from './new-project/LocationSection'
import PropertyDataSection from './new-project/PropertyDataSection'
import LandscaperPanel from './new-project/LandscaperPanel'
import type { NewProjectFormData } from './new-project/types'
import { emptyFormDefaults, newProjectSchema } from './new-project/validation'
import { usePersistentForm, clearPersistedForm } from './new-project/usePersistentForm'
import { generateProjectName } from './new-project/utils'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useTheme } from '@/app/components/CoreUIThemeProvider'

type NewProjectModalProps = {
  isOpen: boolean
  onClose: () => void
}

const getNumeric = (value: string) => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

type SectionKey = 'asset' | 'configure' | 'location' | 'propertyData'

const FIELD_SECTION_MAP: Record<string, SectionKey> = {
  analysis_type: 'asset',
  development_type: 'asset',
  project_type_code: 'asset',
  property_subtype: 'configure',
  property_class: 'configure',
  project_name: 'configure',
  location_mode: 'location',
  single_line_address: 'location',
  street_address: 'location',
  city: 'location',
  state: 'location',
  zip: 'location',
  cross_streets: 'location',
  latitude: 'location',
  longitude: 'location',
  total_units: 'propertyData',
  building_sf: 'propertyData',
  site_area: 'propertyData',
  site_area_unit: 'propertyData',
  total_lots_units: 'propertyData',
  density: 'propertyData',
  scale_input_method: 'propertyData',
  analysis_start_date: 'propertyData'
}

const LAND_SUBTYPE_OPTIONS = [
  { value: 'MPC', label: 'Master Planned Community' },
  { value: 'INFILL', label: 'Infill Subdivision' },
  { value: 'LAND_BANK', label: 'Land Banking' },
  { value: 'LOT_DEVELOPMENT', label: 'Lot Development' },
  { value: 'ENTITLED_LAND', label: 'Entitled Land Sale' }
]

const INCOME_SUBTYPE_OPTIONS = [
  { value: 'MULTIFAMILY', label: 'Multifamily' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'MIXED_USE', label: 'Mixed Use' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'SELF_STORAGE', label: 'Self Storage' }
]

const PROPERTY_CLASS_OPTIONS = [
  { value: 'CLASS_A', label: 'Class A' },
  { value: 'CLASS_B', label: 'Class B' },
  { value: 'CLASS_C', label: 'Class C' },
  { value: 'CLASS_D', label: 'Class D' }
]

const collectErrorFieldNames = (errors: FieldErrors<NewProjectFormData>): string[] => {
  const fields: string[] = []
  Object.entries(errors).forEach(([key, value]) => {
    if (!value) return
    if (typeof value === 'object' && ('message' in value || 'type' in value)) {
      fields.push(key)
    } else if (typeof value === 'object') {
      collectErrorFieldNames(value as FieldErrors<NewProjectFormData>).forEach(child => {
        fields.push(`${key}.${child}`)
      })
    }
  })
  return fields
}

const getSectionForField = (fieldName: string): SectionKey | undefined => {
  const root = fieldName.split('.')[0]
  return FIELD_SECTION_MAP[root]
}

const NewProjectModal = ({ isOpen, onClose }: NewProjectModalProps) => {
  const router = useRouter()
  const { refreshProjects, selectProject } = useProjectContext()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const form = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    mode: 'onChange',
    defaultValues: emptyFormDefaults
  })

  usePersistentForm(form)

  const {
    watch,
    reset,
    setValue,
    setFocus,
    register,
    formState: { isDirty, errors }
  } = form

  const formData = watch()
  const analysisType = watch('analysis_type')
  const subtypeOptions = useMemo(() => {
    if (analysisType === 'Land Development') return LAND_SUBTYPE_OPTIONS
    if (analysisType === 'Income Property') return INCOME_SUBTYPE_OPTIONS
    return []
  }, [analysisType])

  const showPropertyClass = analysisType === 'Income Property'
  const [subtypeFocused, setSubtypeFocused] = useState(false)
  const [classFocused, setClassFocused] = useState(false)
  const hasSubtypeValue = Boolean(formData.property_subtype)
  const hasClassValue = Boolean(formData.property_class)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [invalidSections, setInvalidSections] = useState<SectionKey[]>([])

  const assetSectionRef = useRef<HTMLDivElement>(null)
  const locationSectionRef = useRef<HTMLDivElement>(null)
  const propertyDataSectionRef = useRef<HTMLDivElement>(null)

  const sectionRefs: Record<SectionKey, React.RefObject<HTMLDivElement>> = {
    asset: assetSectionRef,
    configure: assetSectionRef,
    location: locationSectionRef,
    propertyData: propertyDataSectionRef
  }

  useEffect(() => {
    if (!isOpen) {
      setGlobalError(null)
      setInvalidSections([])
    }
  }, [isOpen])

  const previousAnalysisType = useRef<string | null>(null)

  useEffect(() => {
    if (previousAnalysisType.current === analysisType) return

    setValue('development_type', analysisType || '', { shouldDirty: false })

    const hasChanged = previousAnalysisType.current !== null

    setValue('property_subtype', '', {
      shouldDirty: hasChanged,
      shouldValidate: hasChanged
    })
    setValue('project_type_code', '', { shouldDirty: hasChanged })

    if (analysisType !== 'Income Property' || hasChanged) {
      setValue('property_class', '', {
        shouldDirty: hasChanged,
        shouldValidate: hasChanged
      })
    }

    previousAnalysisType.current = analysisType
  }, [analysisType, setValue])

  const invalidSectionSet = useMemo(() => new Set(invalidSections), [invalidSections])

  useEffect(() => {
    const fieldNames = collectErrorFieldNames(errors)
    if (fieldNames.length === 0) {
      setInvalidSections((prev) => (prev.length === 0 ? prev : []))
      if (globalError === 'Please complete the highlighted fields.') {
        setGlobalError(null)
      }
      return
    }
    const sections = Array.from(
      new Set(
        fieldNames
          .map((name) => getSectionForField(name))
          .filter((section): section is SectionKey => Boolean(section))
      )
    )
    setInvalidSections((prev) => {
      if (prev.length === sections.length && prev.every((value, index) => value === sections[index])) {
        return prev
      }
      return sections
    })
  }, [errors, globalError])

  const closeModal = () => {
    if (isSubmitting) return

    const hasData = isDirty
    if (hasData) {
      const confirmed = window.confirm('Discard new project setup? Your progress will be saved locally.')
      if (!confirmed) return
    }

    onClose()
  }

  const resetFormState = () => {
    clearPersistedForm()
    reset(emptyFormDefaults)
  }

  const handleCreationSuccess = async (projectId: number) => {
    await refreshProjects()
    selectProject(projectId)
    resetFormState()
    onClose()
    router.push(`/projects/${projectId}`)
  }

  const submitProject = async () => {
    await form.handleSubmit(onSubmit, handleInvalidSubmit)()
  }

  const onSubmit = async (data: NewProjectFormData) => {
    setIsSubmitting(true)
    setGlobalError(null)

    try {
      const projectName = generateProjectName(data)
      const payload = {
        project_name: projectName,
        analysis_type: data.analysis_type,
        property_subtype: data.property_subtype || undefined,
        property_class: data.property_class || undefined,
        development_type: data.analysis_type,
        project_type_code: data.property_subtype || '',
        street_address: data.street_address || undefined,
        cross_streets: data.cross_streets || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip_code: data.zip || undefined,
        latitude: getNumeric(data.latitude),
        longitude: getNumeric(data.longitude),
        site_area: getNumeric(data.site_area),
        site_area_unit: data.site_area_unit,
        total_units: getNumeric(data.total_units),
        gross_sf: getNumeric(data.building_sf),
        analysis_start_date: data.analysis_start_date || undefined
      }

      const response = await fetch('/api/projects/minimal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Failed to create project')
      }

      const { project } = await response.json() as { project: { project_id: number } }
      await handleCreationSuccess(project.project_id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error creating project'
      setGlobalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToSection = (section: SectionKey) => {
    const ref = sectionRefs[section]
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleInvalidSubmit = (formErrors: FieldErrors<NewProjectFormData>) => {
    setIsSubmitting(false)
    const fieldNames = collectErrorFieldNames(formErrors)
    if (fieldNames.length === 0) return
    const primaryField = fieldNames[0]
    const rootField = primaryField.split('.')[0] as keyof NewProjectFormData
    setFocus(rootField as Path<NewProjectFormData>)
    const section = getSectionForField(primaryField)
    if (section) {
      scrollToSection(section)
    }
    const sections = Array.from(
      new Set(
        fieldNames
          .map((name) => getSectionForField(name))
          .filter((value): value is SectionKey => Boolean(value))
      )
    )
    setInvalidSections(sections)
    setGlobalError('Please complete the highlighted fields.')
  }

  // Calculate implied density for display
  const siteArea = formData.site_area ? Number(formData.site_area) : 0
  const totalUnits = formData.total_lots_units ? Number(formData.total_lots_units) : 0
  const impliedDensity = siteArea > 0 && totalUnits > 0 ? (totalUnits / siteArea).toFixed(2) : null

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[90vh] w-[95vw] max-w-7xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        {/* Header */}
        <header
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isDark ? 'border-slate-800 bg-slate-900/70 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-900'
          }`}
        >
          <div>
            <h2 className="text-xl font-semibold">Create Project</h2>
          </div>
          <button
            type="button"
            onClick={closeModal}
            disabled={isSubmitting}
            className={`rounded-lg p-2 transition ${
              isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Two-column layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left column - Form (60%) */}
          <div
            className={`flex-1 overflow-y-auto border-r p-6 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}
            style={{ flexBasis: '60%' }}
          >
            <div className="space-y-6 max-w-2xl">
              {/* Analysis Type Toggle */}
              <div ref={assetSectionRef}>
                <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  Analysis Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('analysis_type', 'Land Development', { shouldDirty: true, shouldValidate: true })}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${
                      analysisType === 'Land Development'
                        ? 'bg-blue-600 text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Land Development
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('analysis_type', 'Income Property', { shouldDirty: true, shouldValidate: true })}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition ${
                      analysisType === 'Income Property'
                        ? 'bg-blue-600 text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Income Property
                  </button>
                </div>
                {errors.analysis_type && (
                  <p className="mt-2 text-xs text-rose-500">{errors.analysis_type.message as string}</p>
                )}
              </div>

              {/* Property Subtype & Class (Income Property only) */}
              {analysisType === 'Income Property' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="relative">
                      <select
                        value={formData.property_subtype}
                        onFocus={() => setSubtypeFocused(true)}
                        onBlur={() => setSubtypeFocused(false)}
                        onChange={(event) => {
                          const value = event.target.value
                          setValue('property_subtype', value, { shouldDirty: true, shouldValidate: true })
                          setValue('project_type_code', value, { shouldDirty: true })
                        }}
                        className={`peer w-full rounded-md border px-3 pb-1.5 pt-4 text-sm transition appearance-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'
                        }`}
                      >
                        <option value="">Select property type (optional)</option>
                        {subtypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <label
                        className={`pointer-events-none absolute left-3 transition-all duration-200 ${
                          subtypeFocused || hasSubtypeValue
                            ? 'top-1 text-[10px] text-blue-600'
                            : `top-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`
                        }`}
                      >
                        Property Type
                      </label>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {errors.property_subtype && (
                        <p className="mt-1 text-xs text-rose-500">{errors.property_subtype.message as string}</p>
                      )}
                    </div>
                  </div>

                  {showPropertyClass && (
                    <div>
                      <div className="relative">
                        <select
                          value={formData.property_class}
                          onFocus={() => setClassFocused(true)}
                          onBlur={() => setClassFocused(false)}
                          onChange={(event) => {
                            const value = event.target.value
                            setValue('property_class', value, { shouldDirty: true, shouldValidate: true })
                          }}
                          className={`peer w-full rounded-md border px-3 pb-1.5 pt-4 text-sm transition appearance-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'
                          }`}
                        >
                          <option value="">Select property class (optional)</option>
                          {PROPERTY_CLASS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <label
                          className={`pointer-events-none absolute left-3 transition-all duration-200 ${
                            classFocused || hasClassValue
                              ? 'top-1 text-[10px] text-blue-600'
                              : `top-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`
                          }`}
                        >
                          Property Class
                        </label>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {errors.property_class && (
                          <p className="mt-1 text-xs text-rose-500">{errors.property_class.message as string}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Project Name - Floating Label */}
              <div className="relative">
                <input
                  {...register('project_name')}
                  id="project-name"
                  placeholder=" "
                  className={`peer w-full rounded-md border px-3 pb-1.5 pt-4 text-sm placeholder-transparent transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'
                  }`}
                />
                <label
                  htmlFor="project-name"
                  className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                    watch('project_name')
                      ? 'top-1 text-[10px] text-blue-600'
                      : `top-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'} peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-blue-600`
                  }`}
                >
                  Project Name (optional)
                </label>
              </div>

              {/* Location Section */}
              <div ref={locationSectionRef} className="pt-2">
                <div className="flex items-baseline gap-2 mb-3">
                  <h3 className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Location</h3>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Click on the map to place a pin, or drag to adjust</span>
                </div>
                <LocationSection
                  form={form}
                  analysisType={analysisType}
                  isDark={isDark}
                  hasError={invalidSectionSet.has('location')}
                />
              </div>

              {/* Property Data Section */}
              <div ref={propertyDataSectionRef} className="pt-2">
                <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Property Data</h3>
                <PropertyDataSection
                  form={form}
                  isDark={isDark}
                  hasError={invalidSectionSet.has('propertyData')}
                />
              </div>

              {/* Implied Density Display */}
              {analysisType === 'Land Development' && impliedDensity && (
                <div className={`rounded-lg px-4 py-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Implied Density</span>
                    <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{impliedDensity} DU/AC</span>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {globalError && (
                <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {globalError}
                </div>
              )}
            </div>
          </div>

          {/* Right column - Landscaper (40%) */}
          <div className="overflow-hidden p-4" style={{ flexBasis: '40%' }}>
            <LandscaperPanel
              analysisType={analysisType}
              formData={formData}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-400">
            Progress autosaves locally.
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitProject}
              disabled={isSubmitting || !analysisType}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default NewProjectModal
