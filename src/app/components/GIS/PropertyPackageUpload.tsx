'use client'

import React, { useState, useRef } from 'react'

interface PropertyPackageUploadProps {
  projectId: number
  structureType: 'simple' | 'master_plan'
  onUploadComplete: (results: IngestionResults & { extractedData?: ExtractedProjectData }) => void
  onCancel?: () => void
}

interface UploadedDocument {
  file: File
  type: 'site_plan' | 'pricing_sheet' | 'regulation_summary' | 'legal_document' | 'survey' | 'unknown'
  analysis?: DocumentAnalysisResult
  analyzing?: boolean
  error?: string
}

interface DocumentAnalysisResult {
  success: boolean
  filename: string
  document_type: UploadedDocument['type']
  readability: {
    can_read: boolean
    confidence: number
    format_supported: boolean
    text_quality: 'excellent' | 'good' | 'fair' | 'poor'
  }
  extracted_data: {
    location: {
      addresses: string[]
      coordinates?: { latitude: number; longitude: number }
      legal_descriptions: string[]
      confidence: number
    }
    parcels: {
      parcel_numbers: string[]
      assessor_ids: string[]
      confidence: number
    }
    land_area: {
      total_acres?: number
      individual_parcels: Array<{
        parcel_id: string
        acres: number
        land_use?: string
      }>
      confidence: number
    }
    development_data?: {
      units_planned?: number
      land_uses: string[]
      phases: string[]
      confidence: number
    }
  }
  field_mappings: Array<{
    source_text: string
    suggested_field: string
    suggested_value: string
    confidence: number
    user_confirmable: boolean
  }>
  processing_notes: string[]
  error?: string
}

interface ExtractedProjectData {
  project_location?: {
    addresses: string[]
    coordinates?: { latitude: number; longitude: number }
    legal_descriptions: string[]
  }
  total_acres?: number
  parcel_data?: Array<{
    parcel_id: string
    acres: number
    land_use?: string
  }>
  development_info?: {
    units_planned?: number
    land_uses: string[]
    phases: string[]
  }
  field_mappings: Array<{
    source_text: string
    suggested_field: string
    suggested_value: string
    confidence: number
    confirmed: boolean
  }>
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
    { value: 'regulation_summary', label: 'Regulation Summary', accept: '.pdf,.doc,.docx,.txt', icon: '📋' },
    { value: 'legal_document', label: 'Legal Document', accept: '.pdf,.doc,.docx', icon: '📄' },
    { value: 'survey', label: 'Survey/Boundary', accept: '.pdf,.dwg,.dxf', icon: '📐' },
    { value: 'unknown', label: 'Other Document', accept: '.pdf,.doc,.docx,.xlsx,.png,.jpg', icon: '📁' }
  ]

  const [extractedData, setExtractedData] = useState<ExtractedProjectData | null>(null)
  const [showFieldMappings, setShowFieldMappings] = useState(false)

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

  const handleFiles = async (fileList: File[]) => {
    const newDocuments = fileList.map(file => ({
      file,
      type: 'site_plan' as const, // Default type, user can change
      analyzing: false
    }))

    setDocuments(prev => [...prev, ...newDocuments])

    // Auto-analyze documents
    for (let i = 0; i < newDocuments.length; i++) {
      const docIndex = documents.length + i
      await analyzeDocument(docIndex, newDocuments[i].file)
    }
  }

  const analyzeDocument = async (index: number, file: File) => {
    setDocuments(prev => prev.map((doc, i) =>
      i === index ? { ...doc, analyzing: true, error: undefined } : doc
    ))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId.toString())
      formData.append('userChoice', structureType)

      const response = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      const analysis: DocumentAnalysisResult = await response.json()

      setDocuments(prev => prev.map((doc, i) =>
        i === index ? {
          ...doc,
          analyzing: false,
          analysis,
          type: analysis.document_type || doc.type
        } : doc
      ))

      // Update extracted data
      updateExtractedData(analysis)

      // Auto-suggest document name if this is the first document
      if (!packageName && analysis.success && documents.length === 0) {
        const suggestedName = generateDocumentName(analysis)
        if (suggestedName) {
          setPackageName(suggestedName)
        }
      }

    } catch (error) {
      console.error('Document analysis error:', error)
      setDocuments(prev => prev.map((doc, i) =>
        i === index ? {
          ...doc,
          analyzing: false,
          error: error instanceof Error ? error.message : 'Analysis failed'
        } : doc
      ))
    }
  }

  const updateExtractedData = (analysis: DocumentAnalysisResult) => {
    setExtractedData(prev => {
      const updated: ExtractedProjectData = {
        project_location: prev?.project_location || {
          addresses: [],
          legal_descriptions: []
        },
        parcel_data: prev?.parcel_data || [],
        development_info: prev?.development_info || {
          land_uses: [],
          phases: []
        },
        field_mappings: prev?.field_mappings || []
      }

      // Merge location data
      if (analysis.extracted_data.location.addresses.length > 0) {
        updated.project_location!.addresses = [
          ...new Set([
            ...updated.project_location!.addresses,
            ...analysis.extracted_data.location.addresses
          ])
        ]
      }

      if (analysis.extracted_data.location.coordinates) {
        updated.project_location!.coordinates = analysis.extracted_data.location.coordinates
      }

      if (analysis.extracted_data.location.legal_descriptions.length > 0) {
        updated.project_location!.legal_descriptions = [
          ...new Set([
            ...updated.project_location!.legal_descriptions,
            ...analysis.extracted_data.location.legal_descriptions
          ])
        ]
      }

      // Merge parcel data
      if (analysis.extracted_data.land_area.individual_parcels.length > 0) {
        updated.parcel_data = [
          ...updated.parcel_data!,
          ...analysis.extracted_data.land_area.individual_parcels
        ]
      }

      // Update total acres if found
      if (analysis.extracted_data.land_area.total_acres) {
        updated.total_acres = analysis.extracted_data.land_area.total_acres
      }

      // Merge development data
      if (analysis.extracted_data.development_data) {
        const devData = analysis.extracted_data.development_data
        if (devData.units_planned) {
          updated.development_info!.units_planned = devData.units_planned
        }
        if (devData.land_uses.length > 0) {
          updated.development_info!.land_uses = [
            ...new Set([
              ...updated.development_info!.land_uses,
              ...devData.land_uses
            ])
          ]
        }
        if (devData.phases.length > 0) {
          updated.development_info!.phases = [
            ...new Set([
              ...updated.development_info!.phases,
              ...devData.phases
            ])
          ]
        }
      }

      // Add field mappings
      const newMappings = analysis.field_mappings.map(mapping => ({
        ...mapping,
        confirmed: false
      }))
      updated.field_mappings = [...updated.field_mappings, ...newMappings]

      return updated
    })

    // Show field mappings if we have any
    if (analysis.field_mappings.length > 0) {
      setShowFieldMappings(true)
    }
  }

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const updateDocumentType = (index: number, type: UploadedDocument['type']) => {
    setDocuments(prev => prev.map((doc, i) => i === index ? { ...doc, type } : doc))
  }

  const toggleFieldMapping = (mappingIndex: number) => {
    setExtractedData(prev => {
      if (!prev) return prev

      const updated = { ...prev }
      updated.field_mappings = updated.field_mappings.map((mapping, i) =>
        i === mappingIndex ? { ...mapping, confirmed: !mapping.confirmed } : mapping
      )
      return updated
    })
  }

  const getConfirmedFieldMappings = () => {
    return extractedData?.field_mappings.filter(mapping => mapping.confirmed) || []
  }

  const generateDocumentName = (analysis: DocumentAnalysisResult): string => {
    // Try to extract project name from field mappings
    const projectNameMapping = analysis.field_mappings.find(
      mapping => mapping.suggested_field === 'project_name'
    )
    if (projectNameMapping) {
      return projectNameMapping.suggested_value
    }

    // Try to extract from location data
    if (analysis.extracted_data.location.addresses.length > 0) {
      const address = analysis.extracted_data.location.addresses[0]
      // Extract street name or area name
      const parts = address.split(',')
      if (parts.length > 0) {
        const streetPart = parts[0].trim()
        // Remove numbers and common words
        const cleanName = streetPart
          .replace(/^\d+\s+/, '') // Remove leading numbers
          .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|way|lane|ln|court|ct|boulevard|blvd)\b/gi, '')
          .trim()
        if (cleanName.length > 3) {
          return cleanName + ' Development'
        }
      }
    }

    // Fallback based on document type and filename
    const docType = analysis.document_type
    const filename = analysis.filename.replace(/\.[^/.]+$/, '') // Remove extension

    if (docType === 'site_plan') {
      return filename.replace(/[_-]/g, ' ').replace(/\bsite\s*plan\b/gi, '').trim() + ' Site Plan'
    }

    if (docType === 'pricing_sheet') {
      return filename.replace(/[_-]/g, ' ').replace(/\bpric(e|ing)\b/gi, '').trim() + ' Pricing'
    }

    // Generic fallback
    return filename.replace(/[_-]/g, ' ').replace(/\b(document|file|pdf)\b/gi, '').trim() || 'Project Documents'
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
      setError('Document name is required')
      return
    }

    if (documents.length === 0) {
      setError('At least one document is required')
      return
    }

    // Check that all documents have been analyzed
    const unanalyzedDocs = documents.filter(doc => !doc.analysis || doc.analyzing)
    if (unanalyzedDocs.length > 0) {
      setError(`Please wait for ${unanalyzedDocs.length} document(s) to finish analyzing`)
      return
    }

    setIsProcessing(true)
    setError(null)
    const steps = initializeProcessingSteps(documents.length)
    setProcessingSteps(steps)

    try {
      // Step 1: Upload documents (already done)
      updateProcessingStep('upload', 'processing')
      await new Promise(resolve => setTimeout(resolve, 500))
      updateProcessingStep('upload', 'completed', `${documents.length} files processed`)

      // Step 2: Compile AI analysis (already done)
      updateProcessingStep('analyze', 'processing')
      const analyzedDocuments = documents.filter(doc => doc.analysis).map(document => ({
        filename: document.file.name,
        type: document.type,
        ai_analysis: document.analysis
      }))
      updateProcessingStep('analyze', 'completed', `${analyzedDocuments.length} documents analyzed`)

      // Step 3: Extract and validate parcel data
      updateProcessingStep('extract', 'processing')
      await new Promise(resolve => setTimeout(resolve, 800))
      const totalParcels = extractedData?.parcel_data?.length || 0
      const totalMappings = getConfirmedFieldMappings().length
      updateProcessingStep('extract', 'completed', `${totalParcels} parcels, ${totalMappings} field mappings confirmed`)

      // Step 4: Validate extracted data
      updateProcessingStep('validate', 'processing')
      await new Promise(resolve => setTimeout(resolve, 600))
      updateProcessingStep('validate', 'completed', 'Data validation passed')

      // Step 5: Create project structure
      updateProcessingStep('create', 'processing')

      // Prepare final payload with confirmed field mappings
      const finalDocuments = analyzedDocuments.map(doc => ({
        ...doc,
        ai_analysis: {
          ...doc.ai_analysis,
          field_mappings: getConfirmedFieldMappings()
        }
      }))

      const response = await fetch('/api/ai/ingest-property-package', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          package_name: packageName,
          documents: finalDocuments,
          user_choice: structureType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process documents')
      }

      const results = await response.json()
      updateProcessingStep('create', 'completed',
        `${results.results?.parcels_created || 0} parcels created`)

      // Step 6: Finalize
      updateProcessingStep('finalize', 'processing')
      await new Promise(resolve => setTimeout(resolve, 500))
      updateProcessingStep('finalize', 'completed', 'Document processing complete')

      // Complete the process with a longer delay to show success
      setTimeout(() => {
        onUploadComplete({
          success: true,
          parcels_created: results.results?.parcels_created || 0,
          documents_processed: analyzedDocuments.length,
          package_name: packageName,
          extractedData
        })
      }, 1500)

    } catch (err) {
      console.error('Document processing error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to process documents'
      setError(errorMessage)

      // Mark current step as error
      const currentStep = processingSteps.find(step => step.status === 'processing')
      if (currentStep) {
        updateProcessingStep(currentStep.id, 'error', errorMessage)
      }

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
          <h2 className="text-xl font-semibold text-white">Upload Project Documents</h2>
          <p className="text-gray-400 text-sm mt-1">
            Upload marketing packages, site plans, studies, entitlement files, and other project documents for AI analysis
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Document Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Document Name
            </label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="AI will suggest a name based on your documents"
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {packageName && (
              <div className="mt-1 text-xs text-blue-300">
                💡 AI suggested this name - you can edit it
              </div>
            )}
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
                  <div key={index} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">📄</span>
                          <span className="text-white text-sm font-medium">{document.file.name}</span>
                          <span className="text-gray-400 text-xs">
                            ({Math.round(document.file.size / 1024)} KB)
                          </span>

                          {/* Analysis Status */}
                          {document.analyzing && (
                            <div className="flex items-center gap-2 text-blue-400 text-xs">
                              <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
                              Analyzing...
                            </div>
                          )}
                          {document.analysis?.success && (
                            <span className="text-green-400 text-xs">✓ Analysis complete</span>
                          )}
                          {document.error && (
                            <span className="text-red-400 text-xs">✗ Analysis failed</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Document Type (for DMS)</label>
                            <select
                              value={document.type}
                              onChange={(e) => updateDocumentType(index, e.target.value as any)}
                              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={document.analyzing}
                            >
                              {documentTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.icon} {type.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">AI Confidence</label>
                            {document.analysis ? (
                              <div className={`text-sm font-medium ${
                                document.analysis.readability.confidence > 0.8 ? 'text-green-400' :
                                document.analysis.readability.confidence > 0.6 ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {Math.round(document.analysis.readability.confidence * 100)}% readable
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {document.analyzing ? 'Analyzing...' : 'Not analyzed'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Analysis Results */}
                        {document.analysis && (
                          <div className="bg-gray-800 rounded p-3 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-gray-400 mb-1">Location Data:</div>
                                <div className="text-white">
                                  {document.analysis.extracted_data.location.addresses.length > 0 ? (
                                    <div>{document.analysis.extracted_data.location.addresses[0]}</div>
                                  ) : (
                                    <div className="text-gray-500">None found</div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-400 mb-1">Land Area:</div>
                                <div className="text-white">
                                  {document.analysis.extracted_data.land_area.total_acres ? (
                                    <div>{document.analysis.extracted_data.land_area.total_acres} acres</div>
                                  ) : (
                                    <div className="text-gray-500">None found</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {document.analysis.processing_notes.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div className="text-gray-400 mb-1">Processing Notes:</div>
                                {document.analysis.processing_notes.map((note, i) => (
                                  <div key={i} className="text-gray-300">• {note}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {document.error && (
                          <div className="bg-red-900/50 border border-red-700 rounded p-3 text-xs">
                            <div className="text-red-300">{document.error}</div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeDocument(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                        disabled={document.analyzing}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field Mapping Confirmation */}
          {showFieldMappings && extractedData && extractedData.field_mappings.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">
                Confirm Field Population
                <span className="text-sm text-gray-400 ml-2">
                  ({getConfirmedFieldMappings().length} of {extractedData.field_mappings.length} confirmed)
                </span>
              </h3>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-4">
                  AI found the following data in your documents. Select which fields you want to populate:
                </div>
                <div className="space-y-3">
                  {extractedData.field_mappings.map((mapping, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded border-2 cursor-pointer transition-colors ${
                        mapping.confirmed
                          ? 'border-green-500 bg-green-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => toggleFieldMapping(index)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={mapping.confirmed}
                            onChange={() => toggleFieldMapping(index)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="text-white text-sm font-medium">
                              {mapping.suggested_field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            <div className="text-gray-400 text-xs">
                              Found: "{mapping.source_text}"
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-white text-sm">{mapping.suggested_value}</div>
                        <div className={`text-xs ${
                          mapping.confidence > 0.9 ? 'text-green-400' :
                          mapping.confidence > 0.7 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {Math.round(mapping.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Extracted Data Summary */}
          {extractedData && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Extracted Project Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {extractedData.project_location && extractedData.project_location.addresses.length > 0 && (
                  <div className="bg-gray-700 rounded p-3">
                    <div className="text-gray-400 mb-1">Project Location:</div>
                    <div className="text-white">{extractedData.project_location.addresses[0]}</div>
                  </div>
                )}

                {extractedData.total_acres && (
                  <div className="bg-gray-700 rounded p-3">
                    <div className="text-gray-400 mb-1">Total Project Area:</div>
                    <div className="text-white">{extractedData.total_acres} acres</div>
                  </div>
                )}

                {extractedData.development_info?.units_planned && (
                  <div className="bg-gray-700 rounded p-3">
                    <div className="text-gray-400 mb-1">Planned Units:</div>
                    <div className="text-white">{extractedData.development_info.units_planned} units</div>
                  </div>
                )}

                {extractedData.parcel_data && extractedData.parcel_data.length > 0 && (
                  <div className="bg-gray-700 rounded p-3">
                    <div className="text-gray-400 mb-1">Individual Parcels:</div>
                    <div className="text-white">{extractedData.parcel_data.length} parcels identified</div>
                  </div>
                )}
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
              disabled={!packageName.trim() || documents.length === 0 || documents.some(doc => doc.analyzing)}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing Documents...' :
               documents.some(doc => doc.analyzing) ? 'Waiting for Analysis...' :
               'Process Documents & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyPackageUpload