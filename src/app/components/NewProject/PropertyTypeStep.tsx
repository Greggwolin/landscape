'use client'

import React from 'react'

const PROPERTY_TYPES = [
  {
    code: 'mpc',
    label: 'Master-Planned Community',
    description: 'Residential master-planned community with multiple phases and product types',
    icon: '🏘️'
  },
  {
    code: 'office',
    label: 'Office',
    description: 'Office building or campus development',
    icon: '🏢'
  },
  {
    code: 'retail',
    label: 'Retail',
    description: 'Shopping center, power center, or retail development',
    icon: '🏬'
  },
  {
    code: 'multifamily',
    label: 'Multifamily',
    description: 'Apartment complex or multifamily residential development',
    icon: '🏘️'
  },
  {
    code: 'industrial',
    label: 'Industrial',
    description: 'Warehouse, distribution center, or industrial park',
    icon: '🏭'
  },
  {
    code: 'hotel',
    label: 'Hotel',
    description: 'Hotel or hospitality development',
    icon: '🏨'
  }
]

type PropertyTypeStepProps = {
  selectedPropertyType: string | null
  onChange: (propertyType: string) => void
  errors: { property_type?: string }
}

const PropertyTypeStep: React.FC<PropertyTypeStepProps> = ({
  selectedPropertyType,
  onChange,
  errors
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Property Type <span className="text-red-500">*</span>
        </label>

        {errors.property_type && (
          <p className="mb-3 text-sm text-red-500">{errors.property_type}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PROPERTY_TYPES.map((type) => {
            const isSelected = selectedPropertyType === type.code

            return (
              <button
                key={type.code}
                type="button"
                onClick={() => onChange(type.code)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{type.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${
                        isSelected
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {type.label}
                      </h3>
                      {isSelected && (
                        <svg
                          className="w-5 h-5 text-blue-500 flex-shrink-0"
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
                    <p className={`text-sm mt-1 ${
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {type.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PropertyTypeStep
