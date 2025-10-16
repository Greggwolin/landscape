'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectContext } from './ProjectProvider'
import BasicInfoStep from './NewProject/BasicInfoStep'
import PropertyTypeStep from './NewProject/PropertyTypeStep'
import TemplateStep from './NewProject/TemplateStep'

type BasicInfoData = {
  project_name: string
  description: string
  location_description: string
  jurisdiction_city: string
  jurisdiction_county: string
  jurisdiction_state: string
  developer_owner: string
}

type NewProjectModalProps = {
  isOpen: boolean
  onClose: () => void
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter()
  const { selectProject, refreshProjects } = useProjectContext()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form data
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    project_name: '',
    description: '',
    location_description: '',
    jurisdiction_city: '',
    jurisdiction_county: '',
    jurisdiction_state: '',
    developer_owner: ''
  })
  const [propertyType, setPropertyType] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<number | null>(null)

  const handleBasicInfoChange = (field: keyof BasicInfoData, value: string) => {
    setBasicInfo(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handlePropertyTypeChange = (type: string) => {
    setPropertyType(type)
    setTemplateId(null) // Reset template when property type changes
    if (errors.property_type) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.property_type
        return newErrors
      })
    }
  }

  const handleTemplateChange = (id: number) => {
    setTemplateId(id)
    if (errors.template) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.template
        return newErrors
      })
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!basicInfo.project_name.trim()) {
        newErrors.project_name = 'Project name is required'
      }
    } else if (step === 2) {
      if (!propertyType) {
        newErrors.property_type = 'Please select a property type'
      }
    } else if (step === 3) {
      if (!templateId) {
        newErrors.template = 'Please select a template'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: basicInfo.project_name,
          property_type_code: propertyType,
          template_id: templateId,
          description: basicInfo.description || undefined,
          location_description: basicInfo.location_description || undefined,
          jurisdiction_city: basicInfo.jurisdiction_city || undefined,
          jurisdiction_county: basicInfo.jurisdiction_county || undefined,
          jurisdiction_state: basicInfo.jurisdiction_state || undefined,
          developer_owner: basicInfo.developer_owner || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create project')
      }

      const result = await response.json()
      console.log('Project created:', result)

      // Refresh projects list and select the new project
      await refreshProjects()
      selectProject(result.project.project_id)

      // Close modal
      onClose()

      // Redirect to inventory table for the new project
      router.push('/inventory')

    } catch (error) {
      console.error('Error creating project:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create project'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset form
      setCurrentStep(1)
      setBasicInfo({
        project_name: '',
        description: '',
        location_description: '',
        jurisdiction_city: '',
        jurisdiction_county: '',
        jurisdiction_state: '',
        developer_owner: ''
      })
      setPropertyType(null)
      setTemplateId(null)
      setErrors({})
      onClose()
    }
  }

  if (!isOpen) return null

  const steps = [
    { number: 1, label: 'Basic Info' },
    { number: 2, label: 'Property Type' },
    { number: 3, label: 'Template' }
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Create New Project
              </h2>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step indicator */}
            <div className="mt-4 flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.number
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {step.number}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                      currentStep >= step.number
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-500 dark:text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.number
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 min-h-[400px]">
            {currentStep === 1 && (
              <BasicInfoStep
                data={basicInfo}
                onChange={handleBasicInfoChange}
                errors={errors}
              />
            )}

            {currentStep === 2 && (
              <PropertyTypeStep
                selectedPropertyType={propertyType}
                onChange={handlePropertyTypeChange}
                errors={errors}
              />
            )}

            {currentStep === 3 && (
              <TemplateStep
                propertyType={propertyType}
                selectedTemplateId={templateId}
                onChange={handleTemplateChange}
                errors={errors}
              />
            )}

            {errors.submit && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>

              {currentStep < 3 ? (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewProjectModal
