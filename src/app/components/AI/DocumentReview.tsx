'use client'

import React, { useState, useEffect } from 'react'

interface DocumentReviewSuggestion {
  field_name: string
  field_label: string
  suggested_value: string | number
  confidence: number
  reasoning: string
  current_value?: string | number | null
  source_documents: string[]
}

interface DocumentReviewResponse {
  project_id: number
  review_summary: string
  suggestions: DocumentReviewSuggestion[]
  documents_analyzed: string[]
}

interface DocumentReviewProps {
  projectId: number
  onComplete?: () => void
  onClose?: () => void
}

type SuggestionStatus = 'pending' | 'confirmed' | 'edited' | 'passed'

interface SuggestionState extends DocumentReviewSuggestion {
  status: SuggestionStatus
  edited_value?: string | number
  user_notes?: string
}

const DocumentReview: React.FC<DocumentReviewProps> = ({
  projectId,
  onComplete,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [reviewData, setReviewData] = useState<DocumentReviewResponse | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionState[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)

  useEffect(() => {
    performDocumentReview()
  }, [projectId])

  const performDocumentReview = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log('🤖 Starting AI document review...')

      const response = await fetch('/api/ai/document-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to perform document review')
      }

      const data: DocumentReviewResponse = await response.json()
      setReviewData(data)

      // Initialize suggestion states
      const initialSuggestions: SuggestionState[] = data.suggestions.map(suggestion => ({
        ...suggestion,
        status: 'pending'
      }))
      setSuggestions(initialSuggestions)

    } catch (err) {
      console.error('Document review error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionAction = (fieldName: string, action: SuggestionStatus, value?: string | number, notes?: string) => {
    setSuggestions(prev => prev.map(suggestion =>
      suggestion.field_name === fieldName
        ? {
            ...suggestion,
            status: action,
            edited_value: value,
            user_notes: notes
          }
        : suggestion
    ))
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'High'
    if (confidence >= 0.7) return 'Medium'
    return 'Low'
  }

  const handleConfirmAll = async () => {
    const confirmedSuggestions = suggestions.filter(s => s.status === 'confirmed' || s.status === 'edited')

    if (confirmedSuggestions.length === 0) {
      alert('Please confirm at least one suggestion before proceeding.')
      return
    }

    try {
      setIsUpdating(true)

      const fieldUpdates = confirmedSuggestions.map(suggestion => ({
        field_name: suggestion.field_name,
        value: suggestion.status === 'edited' ? suggestion.edited_value : suggestion.suggested_value
      }))

      const userFeedback = suggestions
        .filter(s => s.user_notes)
        .map(s => `${s.field_label}: ${s.user_notes}`)
        .join('; ')

      const response = await fetch('/api/ai/document-review', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          field_updates: fieldUpdates,
          user_feedback: userFeedback || null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update project fields')
      }

      console.log('✅ Project fields updated successfully')

      if (onComplete) {
        onComplete()
      }

    } catch (err) {
      console.error('Update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update project fields')
    } finally {
      setIsUpdating(false)
    }
  }

  const getSummaryStats = () => {
    const confirmed = suggestions.filter(s => s.status === 'confirmed').length
    const edited = suggestions.filter(s => s.status === 'edited').length
    const passed = suggestions.filter(s => s.status === 'passed').length
    const pending = suggestions.filter(s => s.status === 'pending').length

    return { confirmed, edited, passed, pending }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-gray-700">Analyzing project documents...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-red-600 mb-4">
            <h3 className="text-lg font-semibold">Document Review Error</h3>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={performDocumentReview}
              className="btn btn-primary"
            >
              Retry
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="btn btn-secondary"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!reviewData) {
    return null
  }

  const stats = getSummaryStats()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Document Review</h2>
              <p className="text-sm text-gray-600 mt-1">
                Project {projectId} • {reviewData.documents_analyzed.length} document(s) analyzed
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="btn btn-sm btn-ghost-secondary"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Review Summary</h3>
          <p className="text-gray-700 text-sm leading-relaxed">{reviewData.review_summary}</p>

          {/* Progress Stats */}
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-green-600">✓ {stats.confirmed} confirmed</span>
            <span className="text-blue-600">✏ {stats.edited} edited</span>
            <span className="text-yellow-600">⏸ {stats.passed} passed</span>
            <span className="text-gray-600">⏳ {stats.pending} pending</span>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="font-medium text-gray-900 mb-4">Suggested Field Values</h3>

          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No field suggestions found in the analyzed documents.
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.field_name}
                  suggestion={suggestion}
                  onAction={handleSuggestionAction}
                  isExpanded={expandedSuggestion === suggestion.field_name}
                  onToggleExpand={() => setExpandedSuggestion(
                    expandedSuggestion === suggestion.field_name ? null : suggestion.field_name
                  )}
                  getConfidenceColor={getConfidenceColor}
                  getConfidenceText={getConfidenceText}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {stats.confirmed + stats.edited} of {suggestions.length} suggestions ready to apply
            </div>
            <div className="flex gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="btn btn-outline-secondary"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleConfirmAll}
                disabled={isUpdating || (stats.confirmed + stats.edited) === 0}
                className="btn btn-primary d-flex align-items-center gap-2"
              >
                {isUpdating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Apply Changes ({stats.confirmed + stats.edited})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SuggestionCardProps {
  suggestion: SuggestionState
  onAction: (fieldName: string, action: SuggestionStatus, value?: string | number, notes?: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
  getConfidenceColor: (confidence: number) => string
  getConfidenceText: (confidence: number) => string
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onAction,
  isExpanded,
  onToggleExpand,
  getConfidenceColor,
  getConfidenceText
}) => {
  const [editValue, setEditValue] = useState<string | number>(suggestion.suggested_value)
  const [editNotes, setEditNotes] = useState('')
  const [showEditForm, setShowEditForm] = useState(false)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [reanalysisMessage, setReanalysisMessage] = useState('')
  const [aiRevisedSuggestion, setAiRevisedSuggestion] = useState<any>(null)
  const [showAiRevision, setShowAiRevision] = useState(false)

  const handleEdit = () => {
    if (editNotes.trim()) {
      onAction(suggestion.field_name, 'edited', editValue, editNotes)
      setShowEditForm(false)
    } else {
      alert('Please provide reasoning for your edit.')
    }
  }

  const handleAIReanalysis = async () => {
    if (!editNotes.trim()) {
      alert('Please provide feedback for the AI to consider during re-analysis.')
      return
    }

    setIsReanalyzing(true)
    setReanalysisMessage('')

    try {
      const response = await fetch('/api/ai/document-review', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: 8, // For demo, hardcode Red Valley project
          field_name: suggestion.field_name,
          user_feedback: editNotes,
          current_suggestion: suggestion,
          user_proposed_value: editValue // Include the user's proposed value
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Store the AI's revised suggestion for user review
        setAiRevisedSuggestion(result.revised_suggestion)
        setShowAiRevision(true)

        let message = `🤖 ${result.message}`
        if (result.additional_fields && result.additional_fields.length > 0) {
          message += `\n\n📊 Analysis Details:\n• Document: ${result.analysis_details?.document_analyzed}\n• Tables Found: ${result.analysis_details?.tables_found}\n• Rows Analyzed: ${result.analysis_details?.total_rows_analyzed}\n\n✨ Discovered ${result.additional_fields.length} new fields: ${result.additional_fields.map(f => f.field_label).join(', ')}`
        }

        setReanalysisMessage(message)

        // Log discovered fields for potential addition to suggestions list
        if (result.additional_fields) {
          console.log('🔍 AI discovered additional fields:', result.additional_fields)
          // In a real implementation, these would be added to the main suggestions list
        }
      } else if (result.requires_user_clarification) {
        setReanalysisMessage(`❓ ${result.message}\n\n${result.ai_question}`)
      } else {
        setReanalysisMessage('❌ AI re-analysis failed: ' + (result.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Re-analysis error:', error)
      setReanalysisMessage('❌ Failed to contact AI for re-analysis')
    } finally {
      setIsReanalyzing(false)
    }
  }

  const handleAcceptAiRevision = () => {
    if (aiRevisedSuggestion) {
      setEditValue(aiRevisedSuggestion.suggested_value)
      setEditNotes(editNotes + (editNotes ? '\n\n' : '') + `Accepted AI revised suggestion: ${aiRevisedSuggestion.reasoning}`)
      setShowAiRevision(false)
    }
  }

  const handleRejectAiRevision = () => {
    setShowAiRevision(false)
    setAiRevisedSuggestion(null)
  }

  const getStatusIcon = () => {
    switch (suggestion.status) {
      case 'confirmed': return <span className="text-green-600">✓</span>
      case 'edited': return <span className="text-blue-600">✏</span>
      case 'passed': return <span className="text-yellow-600">⏸</span>
      default: return <span className="text-gray-400">⏳</span>
    }
  }

  const getDisplayValue = () => {
    if (suggestion.status === 'edited' && suggestion.edited_value !== undefined) {
      return suggestion.edited_value
    }
    return suggestion.suggested_value
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon()}
            <h4 className="font-medium text-gray-900">{suggestion.field_label}</h4>
            <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
              {getConfidenceText(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
            </span>
          </div>

          {/* Document Sources */}
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">Based on documents:</div>
            <div className="flex flex-wrap gap-1">
              {suggestion.source_documents.map((doc, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"
                >
                  📄 {doc}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Current:</span>
              <div className="font-mono bg-gray-50 p-1 rounded mt-1">
                {suggestion.current_value || <em className="text-gray-400">None</em>}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Suggested:</span>
              <div className="font-mono bg-blue-50 p-1 rounded mt-1">
                {getDisplayValue()}
              </div>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>AI Reasoning:</strong> {suggestion.reasoning}
            </div>
          )}

          {suggestion.status === 'edited' && suggestion.user_notes && (
            <div className="mt-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
              <strong>Your notes:</strong> {suggestion.user_notes}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onToggleExpand}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {suggestion.status === 'pending' && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => onAction(suggestion.field_name, 'confirmed')}
            className="btn btn-sm btn-success"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            className="btn btn-sm btn-primary"
          >
            Edit
          </button>
          <button
            onClick={() => onAction(suggestion.field_name, 'passed')}
            className="btn btn-sm btn-warning"
          >
            Pass
          </button>
        </div>
      )}

      {suggestion.status !== 'pending' && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => onAction(suggestion.field_name, 'pending')}
            className="btn btn-sm btn-secondary"
          >
            Reset
          </button>
        </div>
      )}

      {showEditForm && (
        <div className="mt-4 p-3 bg-blue-50 rounded border">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Value:
            </label>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why is the AI suggestion incorrect?
            </label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Explain why you're changing this value..."
              className="w-full p-2 border border-gray-300 rounded text-sm h-20"
            />
          </div>

          {reanalysisMessage && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              {reanalysisMessage}
            </div>
          )}

          {/* AI Revised Suggestion for Confirmation */}
          {showAiRevision && aiRevisedSuggestion && (
            <div className="mb-3 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-700 font-semibold">🤖 AI Found New Information!</span>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                  {Math.round(aiRevisedSuggestion.confidence * 100)}% confidence
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Original Suggestion:</div>
                  <div className="font-mono bg-gray-100 p-2 rounded text-sm">
                    {suggestion.suggested_value}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">AI Revised Suggestion:</div>
                  <div className="font-mono bg-green-100 p-2 rounded text-sm font-semibold">
                    {aiRevisedSuggestion.suggested_value}
                  </div>
                </div>
              </div>

              <div className="text-xs text-green-700 mb-3 bg-green-100 p-2 rounded">
                <strong>AI Reasoning:</strong> {aiRevisedSuggestion.reasoning}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAcceptAiRevision}
                  className="btn btn-sm btn-success"
                >
                  ✅ Accept AI Revision
                </button>
                <button
                  onClick={handleRejectAiRevision}
                  className="btn btn-sm btn-secondary"
                >
                  ❌ Keep My Value
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleAIReanalysis}
              disabled={isReanalyzing || !editNotes.trim()}
              className="btn btn-sm btn-info d-flex align-items-center gap-1"
            >
              {isReanalyzing && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>}
              🤖 Ask AI to Re-analyze
            </button>
            <button
              onClick={handleEdit}
              className="btn btn-sm btn-primary"
            >
              Save Edit
            </button>
            <button
              onClick={() => {
                setShowEditForm(false)
                setEditValue(suggestion.suggested_value)
                setEditNotes('')
                setReanalysisMessage('')
                setShowAiRevision(false)
                setAiRevisedSuggestion(null)
              }}
              className="btn btn-sm btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentReview