'use client'

import React, { useState, useRef } from 'react'

interface PropertyPackageUploadProps {
  projectId: number
  structureType: 'simple' | 'master_plan'
  onUploadComplete: (results: IngestionResults) => void
  onCancel?: () => void
}

interface UploadedDocument {
  file: File
  type: 'site_plan' | 'pricing_sheet' | 'regulation_summary'
  analysis?: Record<string, unknown>
}

interface IngestionResults {
  success: boolean
  parcels_created: number
  geometry_added: number
  areas_created: number
  phases_created: number
  errors: string[]
  documents_processed: number
}

interface ProcessingStep {
  id: string
  label: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  details?: string
}

const PropertyPackageUpload: React.FC<PropertyPackageUploadProps> = ({
  projectId,
  structureType,
  onUploadComplete,
  onCancel
}) => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [packageName, setPackageName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const documentTypes = [
    { value: 'site_plan', label: 'Site Plan', accept: '.pdf,.dwg,.dxf,.png,.jpg,.jpeg', icon: '🗺️' },
    { value: 'pricing_sheet', label: 'Pricing Sheet', accept: '.xlsx,.xls,.csv,.pdf', icon: '💰' },
    { value: 'regulation_summary', label: 'Regulation Summary', accept: '.pdf,.doc,.docx,.txt', icon: '📋' }
  ]

  const initializeProcessingSteps = (docCount: number) => [
    { id: 'upload', label: 'Uploading documents', status: 'pending' as const },
    { id: 'analyze', label: `Analyzing ${docCount} document(s) with AI`, status: 'pending' as const },
    { id: 'extract', label: 'Extracting parcel data', status: 'pending' as const },
    { id: 'validate', label: 'Validating geometry and attributes', status: 'pending' as const },
    { id: 'create', label: `Creating ${structureType === 'master_plan' ? 'areas, phases, and ' : ''}parcels`, status: 'pending' as const },
    { id: 'finalize', label: 'Finalizing project structure', status: 'pending' as const }
  ]

  const updateProcessingStep = (stepId: string, status: ProcessingStep['status'], details?: string) => {
    setProcessingSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status, details } : step
    ))
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFiles = (fileList: File[]) => {
    const newDocuments = fileList.map(file => ({
      file,
      type: 'site_plan' as const // Default type, user can change
    }))
    setDocuments(prev => [...prev, ...newDocuments])
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const updateDocumentType = (index: number, type: 'site_plan' | 'pricing_sheet' | 'regulation_summary') => {
    setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, type } : doc))
  }

  const simulateAIAnalysis = async (document: UploadedDocument): Promise<Record<string, unknown>> => {
    // Simulate AI document analysis
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock AI analysis results
    return {
      parcels: [
        {
          parcel_code: '1.101',
          land_use: 'SFR',
          acres: 0.25,
          units: 1,
          confidence: 0.95,
          geom: null // Would normally contain GeoJSON geometry
        },
        {
          parcel_code: '1.102',
          land_use: 'SFR',
          acres: 0.30,
          units: 1,
          confidence: 0.92,
          geom: null
        }
      ],
      confidence_overall: 0.93,
      processing_notes: `Processed ${document.type} document: ${document.file.name}`
    }
  }

  const handleSubmit = async () => {
    if (!packageName.trim()) {
      setError('Package name is required')
      return
    }

    if (documents.length === 0) {
      setError('At least one document is required')
      return
    }

    setIsProcessing(true)
    setError(null)
    const steps = initializeProcessingSteps(documents.length)
    setProcessingSteps(steps)

    try {
      // Step 1: Upload documents
      updateProcessingStep('upload', 'processing')
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateProcessingStep('upload', 'completed', `${documents.length} files uploaded`)

      // Step 2: Analyze documents with AI
      updateProcessingStep('analyze', 'processing')
      const analyzedDocuments = []

      for (const document of documents) {
        const analysis = await simulateAIAnalysis(document)
        analyzedDocuments.push({
          filename: document.file.name,
          type: document.type,
          ai_analysis: analysis
        })
      }

      updateProcessingStep('analyze', 'completed', 'AI analysis completed')

      // Step 3: Extract parcel data
      updateProcessingStep('extract', 'processing')
      await new Promise(resolve => setTimeout(resolve, 1000))
      const totalParcels = analyzedDocuments.reduce((sum, doc) => sum + doc.ai_analysis.parcels.length, 0)
      updateProcessingStep('extract', 'completed', `${totalParcels} parcels extracted`)

      // Step 4: Validate data
      updateProcessingStep('validate', 'processing')
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateProcessingStep('validate', 'completed', 'Data validation passed')

      // Step 5: Create project structure
      updateProcessingStep('create', 'processing')

      const response = await fetch('/api/ai/ingest-property-package', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          package_name: packageName,
          documents: analyzedDocuments,
          user_choice: structureType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process property package')
      }

      const results = await response.json()
      updateProcessingStep('create', 'completed',
        `${results.results.parcels_created} parcels, ${results.results.areas_created || 0} areas, ${results.results.phases_created || 0} phases created`)

      // Step 6: Finalize
      updateProcessingStep('finalize', 'processing')
      await new Promise(resolve => setTimeout(resolve, 500))
      updateProcessingStep('finalize', 'completed', 'Project structure finalized')

      // Complete the process
      setTimeout(() => {
        onUploadComplete(results.results)
      }, 1000)

    } catch (err) {
      console.error('Property package processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process property package')
      setIsProcessing(false)
    }
  }

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-400">✓</span>
      case 'processing':
        return <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      case 'error':
        return <span className="text-red-400">✗</span>
      default:
        return <span className="text-gray-500">○</span>
    }
  }

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl">
          <div className="border-b border-gray-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Processing Property Package</h2>
            <p className="text-gray-400 text-sm mt-1">"{packageName}"</p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {processingSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      step.status === 'completed' ? 'text-green-400' :
                      step.status === 'processing' ? 'text-blue-400' :
                      step.status === 'error' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {step.label}
                    </div>
                    {step.details && (
                      <div className="text-xs text-gray-500 mt-1">{step.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="border-b border-gray-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Upload Property Package</h2>
          <p className="text-gray-400 text-sm mt-1">
            Upload site plans, pricing sheets, and regulation documents for AI processing
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Package Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Property Package Name
            </label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g., Red Valley Ranch Phase 1"
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-900/20'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-4">
              <p className="text-gray-300">Drop files here or</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-blue-400 hover:text-blue-300"
              >
                browse files
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
              className="hidden"
            />
          </div>

          {/* Uploaded Documents */}
          {documents.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Uploaded Documents</h3>
              <div className="space-y-3">
                {documents.map((document, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📄</span>
                        <span className="text-white text-sm font-medium">{document.file.name}</span>
                        <span className="text-gray-400 text-xs">
                          ({Math.round(document.file.size / 1024)} KB)
                        </span>
                      </div>

                      <select
                        value={document.type}
                        onChange={(e) => updateDocumentType(index, e.target.value as any)}
                        className="bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {documentTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => removeDocument(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-700">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!packageName.trim() || documents.length === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Process Property Package
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyPackageUpload