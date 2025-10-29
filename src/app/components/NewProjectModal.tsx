'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type FieldErrors, type Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProjectContext } from './ProjectProvider'
import AssetTypeSection from './new-project/AssetTypeSection'
import ConfigureSection from './new-project/ConfigureSection'
import LocationSection from './new-project/LocationSection'
import PropertyDataSection from './new-project/PropertyDataSection'
import PathSelection from './new-project/PathSelection'
import type { NewProjectFormData, ProjectCreationPath, UploadedDocument } from './new-project/types'
import { emptyFormDefaults, newProjectSchema } from './new-project/validation'
import { usePersistentForm, clearPersistedForm } from './new-project/usePersistentForm'
import { generateProjectName } from './new-project/utils'
import { Button } from '@/components/ui/button'

type NewProjectModalProps = {
  isOpen: boolean
  onClose: () => void
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg', '.jpeg']

const isValidExtension = (filename: string) => {
  const lower = filename.toLowerCase()
  return ACCEPTED_EXTENSIONS.some(ext => lower.endsWith(ext))
}

const getNumeric = (value: string) => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

type SectionKey = 'asset' | 'configure' | 'location' | 'propertyData' | 'path'

const FIELD_SECTION_MAP: Record<string, SectionKey> = {
  development_type: 'asset',
  property_type_code: 'asset',
  property_subtype: 'configure',
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
  analysis_start_date: 'propertyData',
  path_choice: 'path'
}

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
    formState: { isDirty, errors }
  } = form

  const formData = watch()

  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [extractionPending, setExtractionPending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [pendingPath, setPendingPath] = useState<ProjectCreationPath | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [invalidSections, setInvalidSections] = useState<SectionKey[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const assetSectionRef = useRef<HTMLDivElement>(null)
  const configureSectionRef = useRef<HTMLDivElement>(null)
  const locationSectionRef = useRef<HTMLDivElement>(null)
  const propertyDataSectionRef = useRef<HTMLDivElement>(null)
  const pathSectionRef = useRef<HTMLDivElement>(null)

  const sectionRefs: Record<SectionKey, React.RefObject<HTMLDivElement>> = {
    asset: assetSectionRef,
    configure: configureSectionRef,
    location: locationSectionRef,
    propertyData: propertyDataSectionRef,
    path: pathSectionRef
  }

  useEffect(() => {
    if (!isOpen) {
      setUploadedDocuments([])
      setExtractionPending(false)
      setGlobalError(null)
      setInfoMessage(null)
      setUploadError(null)
      setPendingPath(null)
      setInvalidSections([])
    }
  }, [isOpen])

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

    const hasData = isDirty || uploadedDocuments.length > 0
    if (hasData) {
      const confirmed = window.confirm('Discard new project setup? Your progress will be saved locally.')
      if (!confirmed) return
    }

    onClose()
  }

  const resetFormState = () => {
    clearPersistedForm()
    reset(emptyFormDefaults)
    setUploadedDocuments([])
    setExtractionPending(false)
    setPendingPath(null)
  }

  const handleCreationSuccess = async (projectId: number) => {
    await refreshProjects()
    selectProject(projectId)
    resetFormState()
    onClose()
    router.push(`/projects/${projectId}`)
  }

  const submitProject = async (path: ProjectCreationPath) => {
    setPendingPath(path)
    setValue('path_choice', path, { shouldDirty: true })
    await form.handleSubmit(onSubmit, handleInvalidSubmit)()
  }

  const onSubmit = async (data: NewProjectFormData) => {
    const path = pendingPath ?? 'immediate'
    setIsSubmitting(true)
    setGlobalError(null)
    setInfoMessage(null)

    try {
      const projectName = generateProjectName(data)
      const payload = {
        project_name: projectName,
        development_type: data.development_type,
        property_type_code: data.property_type_code,
        property_subtype: data.property_subtype || undefined,
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

      if (path === 'ai_extraction') {
        setInfoMessage('AI extraction job kicked off. You will be redirected once the project is ready.')
      }

      await handleCreationSuccess(project.project_id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error creating project'
      setGlobalError(message)
    } finally {
      setIsSubmitting(false)
      setPendingPath(null)
    }
  }

  const scrollToSection = (section: SectionKey) => {
    const ref = sectionRefs[section]
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleInvalidSubmit = (formErrors: FieldErrors<NewProjectFormData>) => {
    setPendingPath(null)
    setIsSubmitting(false)
    setInfoMessage(null)
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

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const accepted: UploadedDocument[] = []
    const errors: string[] = []

    Array.from(files).forEach(file => {
      if (!isValidExtension(file.name)) {
        errors.push(`${file.name} has an unsupported file type.`)
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name} exceeds the 50MB limit.`)
        return
      }
      accepted.push({
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${file.name}-${Date.now()}`,
        filename: file.name,
        size: file.size,
        status: 'pending',
        uploadedAt: new Date().toISOString()
      })
    })

    if (accepted.length > 0) {
      setUploadedDocuments(prev => [...prev, ...accepted])
      setExtractionPending(true)
    }

    if (errors.length > 0) {
      setUploadError(errors.join(' '))
    } else {
      setUploadError(null)
    }

    event.target.value = ''
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleSkipUpload = () => {
    setInfoMessage('You can upload documents at any time from the Project Home page.')
  }

  const docsSummary = useMemo(() => {
    if (uploadedDocuments.length === 0) return null
    const totalSizeMb = uploadedDocuments.reduce((acc, doc) => acc + doc.size, 0) / (1024 * 1024)
    return `${uploadedDocuments.length} ${uploadedDocuments.length === 1 ? 'document' : 'documents'} • ${totalSizeMb.toFixed(1)} MB`
  }, [uploadedDocuments])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closeModal} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[90vh] w-[92vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-blue-950/40"
      >
        <header className="border-b border-slate-800 bg-slate-950/90 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">New Project Intake</p>
              <h2 className="text-xl font-semibold text-slate-50">Create New Project</h2>
              <p className="text-sm text-slate-400">
                Provide the minimum details to spin up a project workspace.
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isSubmitting}>
              Close
            </Button>
          </div>
          {docsSummary && (
            <div className="mt-3 rounded-lg border border-blue-900/40 bg-blue-950/20 px-3 py-2 text-xs text-blue-200">
              📎 {docsSummary}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div ref={assetSectionRef}>
              <AssetTypeSection form={form} hasError={invalidSectionSet.has('asset')} />
            </div>
            <div ref={configureSectionRef}>
              <ConfigureSection
                form={form}
                uploadedDocuments={uploadedDocuments}
                extractionPending={extractionPending}
                hasError={invalidSectionSet.has('configure')}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div ref={locationSectionRef}>
              <LocationSection
                form={form}
                onUploadDocuments={openFilePicker}
                onSkipUpload={handleSkipUpload}
                hasError={invalidSectionSet.has('location')}
              />
            </div>
            <div ref={propertyDataSectionRef}>
              <PropertyDataSection
                form={form}
                onAddDocuments={openFilePicker}
                onContinueWithout={() => setInfoMessage('Documents can be added later from the documents tab.')}
                hasError={invalidSectionSet.has('propertyData')}
              />
            </div>
          </div>

          <div ref={pathSectionRef}>
            <PathSelection
              formData={formData}
              uploadedDocuments={uploadedDocuments}
              extractionPending={extractionPending}
              onCreateNow={() => submitProject('immediate')}
              onExtendedSetup={() => setInfoMessage('Extended setup wizard is coming soon. Create the project now and continue from the tabs.')}
              onAIExtraction={() => {
                if (uploadedDocuments.length === 0) {
                  setGlobalError('Upload documents before requesting AI extraction.')
                  return
                }
                submitProject('ai_extraction').catch(() => undefined)
              }}
              onUploadNow={openFilePicker}
              onManualEntry={() => setInfoMessage('Manual entry selected. You can enrich the project after creation.')}
              hasError={invalidSectionSet.has('path')}
            />
          </div>

          {uploadError && (
            <div className="rounded-lg border border-amber-600/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {uploadError}
            </div>
          )}

          {infoMessage && (
            <div className="rounded-lg border border-blue-600/50 bg-blue-900/20 px-4 py-3 text-sm text-blue-100">
              {infoMessage}
            </div>
          )}

          {globalError && (
            <div className="rounded-lg border border-rose-600/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
              {globalError}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-800 bg-slate-950/90 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Progress autosaves locally. Closing will pause the setup.
            </div>
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
                onClick={() => submitProject('immediate')}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating…' : 'Create Project'}
              </Button>
            </div>
          </div>
        </footer>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          multiple
          className="hidden"
          onChange={handleFileSelection}
        />
      </div>
    </div>
  )
}

export default NewProjectModal
