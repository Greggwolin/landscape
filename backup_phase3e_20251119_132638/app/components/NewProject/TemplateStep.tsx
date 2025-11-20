'use client'

import React, { useEffect, useState } from 'react'

type Template = {
  template_id: number
  template_name: string
  property_type: string
  template_category: string | null
  description: string | null
  is_active: boolean
  column_count?: number
}

type TemplateStepProps = {
  propertyType: string | null
  selectedTemplateId: number | null
  onChange: (templateId: number) => void
  errors: { template?: string }
}

const TemplateStep: React.FC<TemplateStepProps> = ({
  propertyType,
  selectedTemplateId,
  onChange,
  errors
}) => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyType) {
      setTemplates([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/templates?property_type=${propertyType}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch templates')
        return res.json()
      })
      .then(data => {
        setTemplates(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching templates:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [propertyType])

  if (!propertyType) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please select a property type first
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading templates...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>Error loading templates: {error}</p>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No templates available for this property type</p>
        <p className="text-sm mt-2">Templates may need to be created by an administrator</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Template <span className="text-red-500">*</span>
        </label>

        {errors.template && (
          <p className="mb-3 text-sm text-red-500">{errors.template}</p>
        )}

        <div className="space-y-3">
          {templates.map((template) => {
            const isSelected = selectedTemplateId === template.template_id

            return (
              <button
                key={template.template_id}
                type="button"
                onClick={() => onChange(template.template_id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${
                        isSelected
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {template.template_name}
                      </h3>
                      {template.template_category && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {template.template_category}
                        </span>
                      )}
                    </div>

                    {template.description && (
                      <p className={`text-sm mt-1 ${
                        isSelected
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {template.description}
                      </p>
                    )}

                    {template.column_count !== undefined && (
                      <p className={`text-xs mt-2 ${
                        isSelected
                          ? 'text-blue-500 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-500'
                      }`}>
                        {template.column_count} columns configured
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <svg
                      className="w-6 h-6 text-blue-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TemplateStep
