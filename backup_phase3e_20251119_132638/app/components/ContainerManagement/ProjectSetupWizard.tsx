'use client'

import React, { useState } from 'react'
import { Building2, Home, Store, Factory, Landmark, Grid3x3, ChevronRight, Check } from 'lucide-react'

// Asset type configurations with predefined label sets
export const ASSET_TYPE_CONFIGS = {
  land_development: {
    name: 'Land Development / MPC',
    icon: Grid3x3,
    description: 'Master-planned communities, subdivisions, lot sales',
    defaultLevels: 3,
    defaultLabels: {
      level1: 'Plan Area',
      level2: 'Phase',
      level3: 'Parcel',
      level4: 'Lot'
    },
    examples: 'Peoria Lakes, Verrado, Daybreak'
  },
  multifamily: {
    name: 'Multifamily Property',
    icon: Building2,
    description: 'Apartment complexes, unit-level tracking',
    defaultLevels: 3,
    defaultLabels: {
      level1: 'Property',
      level2: 'Building',
      level3: 'Unit',
      level4: 'Bedroom'
    },
    examples: 'Garden-style, mid-rise, high-rise apartments'
  },
  office: {
    name: 'Office Property',
    icon: Landmark,
    description: 'Office buildings, multi-tenant, corporate campuses',
    defaultLevels: 3,
    defaultLabels: {
      level1: 'Campus',
      level2: 'Building',
      level3: 'Suite',
      level4: 'Floor'
    },
    examples: 'Class A office towers, business parks'
  },
  retail: {
    name: 'Retail Property',
    icon: Store,
    description: 'Shopping centers, strip malls, power centers',
    defaultLevels: 3,
    defaultLabels: {
      level1: 'Center',
      level2: 'Building',
      level3: 'Space',
      level4: 'Bay'
    },
    examples: 'Regional malls, lifestyle centers, outlets'
  },
  industrial: {
    name: 'Industrial Property',
    icon: Factory,
    description: 'Warehouses, distribution centers, manufacturing',
    defaultLevels: 3,
    defaultLabels: {
      level1: 'Park',
      level2: 'Building',
      level3: 'Bay',
      level4: 'Zone'
    },
    examples: 'Logistics facilities, flex space, cold storage'
  },
  mixed_use: {
    name: 'Mixed-Use Development',
    icon: Home,
    description: 'Combined residential, retail, office',
    defaultLevels: 4,
    defaultLabels: {
      level1: 'District',
      level2: 'Phase',
      level3: 'Building',
      level4: 'Unit'
    },
    examples: 'Urban villages, transit-oriented development'
  }
} as const

export type AssetTypeKey = keyof typeof ASSET_TYPE_CONFIGS

interface ProjectSetupData {
  projectName: string
  assetType: AssetTypeKey | null
  hierarchyLevels: 2 | 3 | 4
  level1Label: string
  level2Label: string
  level3Label: string
  level4Label: string
}

export interface ProjectSetupWizardProps {
  onComplete: (data: ProjectSetupData) => void
  onCancel: () => void
}

export function ProjectSetupWizard({ onComplete, onCancel }: ProjectSetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [data, setData] = useState<ProjectSetupData>({
    projectName: '',
    assetType: null,
    hierarchyLevels: 3,
    level1Label: '',
    level2Label: '',
    level3Label: '',
    level4Label: ''
  })

  const handleAssetTypeSelect = (assetType: AssetTypeKey) => {
    const config = ASSET_TYPE_CONFIGS[assetType]
    setData({
      ...data,
      assetType,
      hierarchyLevels: config.defaultLevels as 2 | 3 | 4,
      level1Label: config.defaultLabels.level1,
      level2Label: config.defaultLabels.level2,
      level3Label: config.defaultLabels.level3,
      level4Label: config.defaultLabels.level4
    })
    setStep(2)
  }

  const handleLevelsChange = (levels: 2 | 3 | 4) => {
    setData({ ...data, hierarchyLevels: levels })
  }

  const handleLabelChange = (level: 'level1' | 'level2' | 'level3' | 'level4', value: string) => {
    setData({ ...data, [`${level}Label`]: value })
  }

  const handleSubmit = () => {
    if (!data.assetType || !data.projectName) return
    onComplete(data)
  }

  const canProceed = () => {
    if (step === 1) return data.assetType !== null
    if (step === 2) return data.projectName.trim().length > 0 && data.level1Label && data.level2Label
    if (step === 3) return true
    return false
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Project Setup Wizard</h1>
          <p className="text-gray-400">Configure your project hierarchy and labels</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    s < step
                      ? 'bg-green-600 text-white'
                      : s === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                <span className="ml-2 text-sm text-gray-300">
                  {s === 1 && 'Asset Type'}
                  {s === 2 && 'Configure'}
                  {s === 3 && 'Review'}
                </span>
              </div>
              {s < 3 && <ChevronRight className="w-5 h-5 text-gray-600 mx-4" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          {/* Step 1: Asset Type Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Select Asset Type</h2>
                <p className="text-gray-400">Choose the type of project you're modeling</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(ASSET_TYPE_CONFIGS).map(([key, config]) => {
                  const Icon = config.icon
                  const isSelected = data.assetType === key
                  return (
                    <button
                      key={key}
                      onClick={() => handleAssetTypeSelect(key as AssetTypeKey)}
                      className={`p-6 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div
                          className={`p-3 rounded-lg ${
                            isSelected ? 'bg-blue-600' : 'bg-gray-700'
                          }`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {config.name}
                          </h3>
                          <p className="text-sm text-gray-400 mb-2">{config.description}</p>
                          <p className="text-xs text-gray-500 italic">{config.examples}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && data.assetType && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Configure Project</h2>
                <p className="text-gray-400">Set up your project name and hierarchy labels</p>
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={data.projectName}
                  onChange={(e) => setData({ ...data, projectName: e.target.value })}
                  placeholder="e.g., Peoria Lakes Phase 1"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Hierarchy Levels + Custom Labels */}
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Number of Hierarchy Levels
                  </label>
                  <div className="flex flex-col space-y-3">
                    {[2, 3, 4].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleLevelsChange(level as 2 | 3 | 4)}
                        className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                          data.hierarchyLevels === level
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {level} Levels
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    {data.hierarchyLevels === 2 && 'Flat structure (e.g., Building → Unit)'}
                    {data.hierarchyLevels === 3 && 'Standard 3-tier hierarchy (recommended)'}
                    {data.hierarchyLevels === 4 && 'Complex 4-tier hierarchy (for large projects)'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Customize Hierarchy Labels
                  </label>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Level 1 (Top) *</label>
                      <input
                        type="text"
                        value={data.level1Label}
                        onChange={(e) => handleLabelChange('level1', e.target.value)}
                        placeholder="e.g., Plan Area, Property, Campus"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Level 2 *</label>
                      <input
                        type="text"
                        value={data.level2Label}
                        onChange={(e) => handleLabelChange('level2', e.target.value)}
                        placeholder="e.g., Phase, Building"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {data.hierarchyLevels >= 3 && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Level 3</label>
                        <input
                          type="text"
                          value={data.level3Label}
                          onChange={(e) => handleLabelChange('level3', e.target.value)}
                          placeholder="e.g., Parcel, Unit, Suite"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}

                    {data.hierarchyLevels === 4 && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Level 4 (Bottom)</label>
                        <input
                          type="text"
                          value={data.level4Label}
                          onChange={(e) => handleLabelChange('level4', e.target.value)}
                          placeholder="e.g., Lot, Bedroom, Floor"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && data.assetType && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Review Configuration</h2>
                <p className="text-gray-400">Confirm your project setup before creating</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Project Name</div>
                  <div className="text-lg font-medium text-white">{data.projectName}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Asset Type</div>
                  <div className="text-lg font-medium text-white">
                    {ASSET_TYPE_CONFIGS[data.assetType].name}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-2">Hierarchy Structure</div>
                  <div className="bg-gray-900 p-4 rounded border border-gray-700">
                    <HierarchyPreview data={data} />
                  </div>
                </div>

                <div className="bg-blue-950 border border-blue-900 rounded p-4">
                  <p className="text-sm text-blue-200">
                    <strong>Note:</strong> After creation, you can add containers (
                    {data.level1Label}s, {data.level2Label}s, etc.) and configure financial settings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => {
              if (step === 1) {
                onCancel()
              } else {
                setStep((s) => (s - 1) as 1 | 2 | 3)
              }
            }}
            className="px-6 py-3 rounded-lg font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={() => {
              if (step === 3) {
                handleSubmit()
              } else {
                setStep((s) => (s + 1) as 1 | 2 | 3)
              }
            }}
            disabled={!canProceed()}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              canProceed()
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {step === 3 ? 'Create Project' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Visual hierarchy preview component
function HierarchyPreview({ data }: { data: ProjectSetupData }) {
  const levels = [
    { label: data.level1Label, active: true },
    { label: data.level2Label, active: true },
    { label: data.level3Label, active: data.hierarchyLevels >= 3 },
    { label: data.level4Label, active: data.hierarchyLevels === 4 }
  ].filter((l) => l.active && l.label)

  return (
    <div className="space-y-2">
      {levels.map((level, index) => (
        <div key={index} className="flex items-center" style={{ paddingLeft: `${index * 24}px` }}>
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
          <div className="text-white font-mono">{level.label}</div>
          {index < levels.length - 1 && (
            <ChevronRight className="w-4 h-4 text-gray-600 ml-2" />
          )}
        </div>
      ))}
    </div>
  )
}

export default ProjectSetupWizard
