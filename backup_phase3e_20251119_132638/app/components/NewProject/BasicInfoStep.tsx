'use client'

import React from 'react'

type BasicInfoData = {
  project_name: string
  description: string
  location_description: string
  jurisdiction_city: string
  jurisdiction_county: string
  jurisdiction_state: string
  developer_owner: string
}

type BasicInfoStepProps = {
  data: BasicInfoData
  onChange: (field: keyof BasicInfoData, value: string) => void
  errors: Partial<Record<keyof BasicInfoData, string>>
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ data, onChange, errors }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.project_name}
          onChange={(e) => onChange('project_name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
            errors.project_name
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
          } focus:outline-none focus:ring-2`}
          placeholder="e.g., Peoria Lakes MPC"
        />
        {errors.project_name && (
          <p className="mt-1 text-sm text-red-500">{errors.project_name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Brief description of the project..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Location
        </label>
        <input
          type="text"
          value={data.location_description}
          onChange={(e) => onChange('location_description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Northwest corner of Loop 303 and Happy Valley Road"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            City
          </label>
          <input
            type="text"
            value={data.jurisdiction_city}
            onChange={(e) => onChange('jurisdiction_city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Peoria"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            County
          </label>
          <input
            type="text"
            value={data.jurisdiction_county}
            onChange={(e) => onChange('jurisdiction_county', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Maricopa"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            State
          </label>
          <input
            type="text"
            value={data.jurisdiction_state}
            onChange={(e) => onChange('jurisdiction_state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., AZ"
            maxLength={2}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Developer/Owner
        </label>
        <input
          type="text"
          value={data.developer_owner}
          onChange={(e) => onChange('developer_owner', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Crescent Bay Holdings"
        />
      </div>
    </div>
  )
}

export default BasicInfoStep
