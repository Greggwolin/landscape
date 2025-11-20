'use client'

import React, { useState, useEffect } from 'react'
import { useLandUseLabels } from '@/hooks/useLandUseLabels'

interface Props {
  projectId: number
}

export default function ProjectLandUseLabels({ projectId }: Props) {
  const { labels: currentLabels, isLoading, refetch } = useLandUseLabels(projectId)
  const [labels, setLabels] = useState({
    level1: '',
    level1Plural: '',
    level2: '',
    level2Plural: '',
    level3: '',
    level3Plural: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize from current labels
  useEffect(() => {
    if (!isLoading && currentLabels) {
      setLabels({
        level1: currentLabels.level1Label,
        level1Plural: currentLabels.level1LabelPlural,
        level2: currentLabels.level2Label,
        level2Plural: currentLabels.level2LabelPlural,
        level3: currentLabels.level3Label,
        level3Plural: currentLabels.level3LabelPlural
      })
      setHasChanges(false)
    }
  }, [currentLabels, isLoading])

  const handleChange = (field: keyof typeof labels, value: string) => {
    setLabels(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const response = await fetch(`/api/projects/${projectId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          land_use_level1_label: labels.level1,
          land_use_level1_label_plural: labels.level1Plural,
          land_use_level2_label: labels.level2,
          land_use_level2_label_plural: labels.level2Plural,
          land_use_level3_label: labels.level3,
          land_use_level3_label_plural: labels.level3Plural
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save labels')
      }

      setSaveStatus('success')
      setHasChanges(false)
      await refetch()

      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save land use labels:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (currentLabels) {
      setLabels({
        level1: currentLabels.level1Label,
        level1Plural: currentLabels.level1LabelPlural,
        level2: currentLabels.level2Label,
        level2Plural: currentLabels.level2LabelPlural,
        level3: currentLabels.level3Label,
        level3Plural: currentLabels.level3LabelPlural
      })
      setHasChanges(false)
      setSaveStatus('idle')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2">Land Use Taxonomy Labels</h3>
        <p className="text-sm text-gray-600">
          Customize the terminology used for land use classifications in this project.
          These labels appear in inventory management, planning interfaces, and reports.
        </p>
      </div>

      <div className="space-y-6">
        {/* Level 1 - Top Classification */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level 1 Label (Singular)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Family, Category, Classification"
              value={labels.level1}
              onChange={e => handleChange('level1', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Top-level classification (e.g., Residential, Commercial)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level 1 Label (Plural)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Families, Categories, Classifications"
              value={labels.level1Plural}
              onChange={e => handleChange('level1Plural', e.target.value)}
            />
          </div>
        </div>

        {/* Level 2 - Mid Classification */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level 2 Label (Singular)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Type, Use, Subtype"
              value={labels.level2}
              onChange={e => handleChange('level2', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Second-level classification (e.g., Single Family, Townhome)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level 2 Label (Plural)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Types, Uses, Subtypes"
              value={labels.level2Plural}
              onChange={e => handleChange('level2Plural', e.target.value)}
            />
          </div>
        </div>

        {/* Level 3 - Product Level */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level 3 Label (Singular)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Product, Series, Model"
              value={labels.level3}
              onChange={e => handleChange('level3', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Product-level classification (e.g., 50x100 Standard Lot)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level 3 Label (Plural)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Products, Series, Models"
              value={labels.level3Plural}
              onChange={e => handleChange('level3Plural', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Example Configurations */}
      <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Common Configurations:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Default:</strong> Family → Type → Product</li>
          <li><strong>Alternative 1:</strong> Category → Use → Series</li>
          <li><strong>Alternative 2:</strong> Classification → Subtype → Model</li>
          <li><strong>Commercial:</strong> Asset Class → Property Type → Submarket</li>
        </ul>
      </div>

      {/* Current Preview */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-sm text-gray-700">
          <strong>Current hierarchy:</strong> {labels.level1} → {labels.level2} → {labels.level3}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          This terminology will be used throughout the project for inventory management and planning.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <div>
          {saveStatus === 'success' && (
            <span className="text-green-600 text-sm font-medium">✓ Labels saved successfully</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-600 text-sm font-medium">✗ Failed to save labels</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Labels'}
          </button>
        </div>
      </div>
    </div>
  )
}
