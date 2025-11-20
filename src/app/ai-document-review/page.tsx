'use client'

import React, { useState } from 'react'
import DocumentReview from '../components/AI/DocumentReview'

export default function AIDocumentReviewPage() {
  const [showReview, setShowReview] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<number>(8) // Default to Red Valley

  const projects = [
    { id: 7, name: 'Peoria Lakes' },
    { id: 8, name: 'Red Valley Test Site' }
  ]

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            AI Document Review Protocol
          </h1>
          <p className="text-gray-600">
            Analyze uploaded documents and populate project database fields with AI-suggested values.
          </p>
        </div>

        {/* Project Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Project for Document Review
          </h2>

          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedProjectId === project.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-600">Project ID: {project.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={selectedProjectId === project.id}
                      onChange={() => setSelectedProjectId(project.id)}
                      className="text-blue-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowReview(true)}
            className="mt-6 btn btn-primary btn-lg"
          >
            🤖 Start AI Document Review
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            How the AI Document Review Works
          </h2>

          <div className="space-y-4 text-gray-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <h3 className="font-medium">Document Analysis</h3>
                <p className="text-sm">AI reviews all uploaded documents in the project library to extract relevant project information.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <h3 className="font-medium">Field Suggestions</h3>
                <p className="text-sm">AI suggests values for database fields based on document content, with confidence scores and reasoning.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <h3 className="font-medium">Review & Approve</h3>
                <p className="text-sm">You can <strong>Confirm</strong> suggestions, <strong>Edit</strong> with feedback, or <strong>Pass</strong> to postpone. When editing, you can also ask the AI to <strong>re-analyze</strong> based on your feedback.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <div>
                <h3 className="font-medium">Database Update</h3>
                <p className="text-sm">Confirmed changes are applied to the database, and user feedback helps improve future AI suggestions.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Demo Note</h4>
            <p className="text-sm text-yellow-700">
              The Red Valley Test Site project includes sample document analysis for demonstration.
              Other projects will show basic analysis pending full AI integration.
            </p>
          </div>
        </div>
      </div>

      {/* Document Review Modal */}
      {showReview && (
        <DocumentReview
          projectId={selectedProjectId}
          onComplete={() => {
            setShowReview(false)
            alert('Project fields updated successfully!')
          }}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  )
}