'use client'

import React, { useState } from 'react'
import GISSetupWorkflow from '../components/GIS/GISSetupWorkflow'
import ProjectStructureChoice from '../components/setup/ProjectStructureChoice'
import PropertyPackageUpload from '../components/GIS/PropertyPackageUpload'
import PlanNavigation from '../components/GIS/PlanNavigation'

export default function GISTestPage() {
  const [activeComponent, setActiveComponent] = useState<string>('workflow')
  const [projectId] = useState(8) // Use Red Valley test project

  const components = [
    { id: 'workflow', name: 'Complete GIS Workflow', description: 'Full end-to-end workflow' },
    { id: 'structure', name: 'Project Structure Choice', description: 'Choose simple vs master plan' },
    { id: 'upload', name: 'Property Package Upload', description: 'AI document processing' },
    { id: 'navigation', name: 'Plan Navigation', description: 'Interactive parcel navigation' }
  ]

  const renderActiveComponent = () => {
    switch (activeComponent) {
      case 'workflow':
        return (
          <GISSetupWorkflow
            projectId={projectId}
            onComplete={() => alert('GIS Setup Complete!')}
            onCancel={() => setActiveComponent('structure')}
          />
        )

      case 'structure':
        return (
          <ProjectStructureChoice
            projectId={projectId}
            onStructureSelected={(type) => {
              alert(`Structure selected: ${type}`)
              setActiveComponent('upload')
            }}
            onCancel={() => setActiveComponent('workflow')}
          />
        )

      case 'upload':
        return (
          <PropertyPackageUpload
            projectId={projectId}
            structureType="master_plan"
            onUploadComplete={(results) => {
              alert(`Upload complete! ${results.parcels_created} parcels created`)
              setActiveComponent('navigation')
            }}
            onCancel={() => setActiveComponent('structure')}
          />
        )

      case 'navigation':
        return (
          <div className="h-screen">
            <PlanNavigation
              projectId={projectId}
              onParcelUpdate={(id, updates) => {
                console.log('Parcel updated:', id, updates)
              }}
              className="h-full"
            />
          </div>
        )

      default:
        return null
    }
  }

  if (activeComponent === 'workflow' || activeComponent === 'navigation') {
    return renderActiveComponent()
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-white">GIS AI-First System Test</h1>
        <p className="text-gray-400 mt-2">Testing project: Red Valley (ID: {projectId})</p>
      </div>

      {/* Component Selector */}
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Choose Component to Test:</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {components.map((component) => (
              <button
                key={component.id}
                onClick={() => setActiveComponent(component.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  activeComponent === component.id
                    ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-medium mb-2">{component.name}</div>
                <div className="text-sm text-gray-400">{component.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Component Display */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 min-h-[600px]">
          {renderActiveComponent()}
        </div>
      </div>
    </div>
  )
}