'use client'

import React, { useState, useEffect } from 'react'
import ProjectStructureChoice from '../setup/ProjectStructureChoice'
import PropertyPackageUpload from './PropertyPackageUpload'
import GISMap from '../MapLibre/GISMap'
import PlanNavigation from './PlanNavigation'

interface GISSetupWorkflowProps {
  projectId: number
  onComplete?: () => void
  onCancel?: () => void
}

type WorkflowStep = 'structure' | 'boundary' | 'package' | 'navigation'

interface WorkflowState {
  currentStep: WorkflowStep
  completedSteps: Set<WorkflowStep>
  structureType?: 'simple' | 'master_plan'
  boundarySet: boolean
  packageProcessed: boolean
}

interface ProjectData {
  project_id: number
  project_name: string
  structure_type?: string
  boundary_acres?: number
  parcel_count?: number
}

const GISSetupWorkflow: React.FC<GISSetupWorkflowProps> = ({
  projectId,
  onComplete,
  onCancel
}) => {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    currentStep: 'structure',
    completedSteps: new Set(),
    boundarySet: false,
    packageProcessed: false
  })

  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [selectedTaxParcels, setSelectedTaxParcels] = useState<Record<string, unknown>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const steps = [
    { id: 'structure', title: 'Choose Structure', description: 'Select project organization type' },
    { id: 'boundary', title: 'Set Boundary', description: 'Define project boundary from tax parcels' },
    { id: 'package', title: 'Upload Package', description: 'Process property documents with AI' },
    { id: 'navigation', title: 'Navigate Project', description: 'Review and manage parcels' }
  ] as const

  // Load project data and check existing setup on component mount
  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check project structure choice
      const structureResponse = await fetch(`/api/projects/${projectId}/choose-structure`)
      const projectInfo = await structureResponse.json()

      // Check existing boundary
      const boundaryResponse = await fetch(`/api/gis/ingest-parcels?project_id=${projectId}`)
      const boundaryExists = boundaryResponse.ok

      // Check existing parcels
      const parcelsResponse = await fetch(`/api/gis/plan-parcels?project_id=${projectId}&include_geometry=false`)
      const parcelsData = parcelsResponse.ok ? await parcelsResponse.json() : null

      const completedSteps = new Set<WorkflowStep>()
      let currentStep: WorkflowStep = 'structure'

      if (projectInfo.structure_type) {
        completedSteps.add('structure')
        currentStep = 'boundary'

        if (boundaryExists) {
          completedSteps.add('boundary')
          currentStep = 'package'

          if (parcelsData?.parcels?.length > 0) {
            completedSteps.add('package')
            currentStep = 'navigation'
          }
        }
      }

      setProjectData({
        project_id: projectId,
        project_name: projectInfo.project_name,
        structure_type: projectInfo.structure_type,
        boundary_acres: boundaryExists ? parseFloat(boundaryResponse.ok ? '0' : '0') : undefined,
        parcel_count: parcelsData?.statistics?.total_parcels || 0
      })

      setWorkflowState({
        currentStep,
        completedSteps,
        structureType: projectInfo.structure_type,
        boundarySet: boundaryExists,
        packageProcessed: parcelsData?.parcels?.length > 0
      })

    } catch (err) {
      console.error('Error loading project data:', err)
      setError('Failed to load project data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStructureSelected = (structureType: 'simple' | 'master_plan') => {
    setWorkflowState(prev => ({
      ...prev,
      structureType,
      currentStep: 'boundary',
      completedSteps: new Set([...prev.completedSteps, 'structure'])
    }))

    setProjectData(prev => prev ? { ...prev, structure_type: structureType } : null)
  }

  const handleBoundaryConfirmed = () => {
    // Advance to next step when boundary is confirmed
    setWorkflowState(prev => ({
      ...prev,
      boundarySet: true,
      currentStep: 'package',
      completedSteps: new Set([...prev.completedSteps, 'boundary'])
    }))
  }

  const handlePackageComplete = (results: { parcels_created: number }) => {
    setWorkflowState(prev => ({
      ...prev,
      packageProcessed: true,
      currentStep: 'navigation',
      completedSteps: new Set([...prev.completedSteps, 'package'])
    }))

    setProjectData(prev => prev ? {
      ...prev,
      parcel_count: results.parcels_created
    } : null)
  }

  const goToStep = (step: WorkflowStep) => {
    // Only allow navigation to completed steps or the next step
    const stepIndex = steps.findIndex(s => s.id === step)
    const currentIndex = steps.findIndex(s => s.id === workflowState.currentStep)

    if (workflowState.completedSteps.has(step) || stepIndex <= currentIndex + 1) {
      setWorkflowState(prev => ({ ...prev, currentStep: step }))
    }
  }

  const getStepStatus = (stepId: WorkflowStep) => {
    if (workflowState.completedSteps.has(stepId)) return 'completed'
    if (workflowState.currentStep === stepId) return 'current'
    return 'pending'
  }

  const getStepIcon = (stepId: WorkflowStep) => {
    const status = getStepStatus(stepId)

    if (status === 'completed') {
      return (
        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }

    if (status === 'current') {
      return (
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        </div>
      )
    }

    return (
      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
        <span className="text-xs text-gray-300">{steps.findIndex(s => s.id === stepId) + 1}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="flex items-center gap-3 text-white">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Loading GIS setup workflow...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">GIS Project Setup</h1>
            <p className="text-gray-400 text-sm mt-1">
              {projectData ? projectData.project_name : `Project ${projectId}`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
              >
                Exit Setup
              </button>
            )}

            {workflowState.currentStep === 'navigation' && onComplete && (
              <button
                onClick={onComplete}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Complete Setup
              </button>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mt-6">
          <div className="flex items-center justify-between max-w-2xl">
            {steps.map((step, index) => (
              <div key={step.id} className="flex-1">
                <div className="flex items-center">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={!workflowState.completedSteps.has(step.id) && workflowState.currentStep !== step.id}
                    className="flex items-center gap-3 disabled:cursor-not-allowed"
                  >
                    {getStepIcon(step.id)}
                    <div className="text-left">
                      <div className={`text-sm font-medium ${
                        getStepStatus(step.id) === 'current' ? 'text-blue-400' :
                        getStepStatus(step.id) === 'completed' ? 'text-green-400' :
                        'text-gray-400'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500">{step.description}</div>
                    </div>
                  </button>

                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-px ml-4 ${
                      workflowState.completedSteps.has(step.id) ? 'bg-green-600' : 'bg-gray-600'
                    }`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden" style={{ height: '900px', minHeight: '900px' }}>
        {error && (
          <div className="p-4 bg-red-900/50 border-b border-red-700">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {workflowState.currentStep === 'structure' && (
          <div className="h-full flex items-center justify-center">
            <ProjectStructureChoice
              projectId={projectId}
              initialChoice={workflowState.structureType}
              onStructureSelected={handleStructureSelected}
            />
          </div>
        )}

        {workflowState.currentStep === 'boundary' && (
          <div className="h-full">
            <GISMap
              projectId={projectId}
              mode="parcel-select"
              onBoundaryConfirmed={handleBoundaryConfirmed}
              className="h-full"
            />
          </div>
        )}

        {workflowState.currentStep === 'package' && workflowState.structureType && (
          <div className="h-full flex items-center justify-center">
            <PropertyPackageUpload
              projectId={projectId}
              structureType={workflowState.structureType}
              onUploadComplete={handlePackageComplete}
            />
          </div>
        )}

        {workflowState.currentStep === 'navigation' && (
          <div className="h-full">
            <PlanNavigation
              projectId={projectId}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default GISSetupWorkflow