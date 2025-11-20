'use client'

import React, { useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import type { ContainerNode } from '@/types'

interface ProjectLabels {
  level1Label: string
  level2Label: string
  level3Label: string
  level1LabelPlural: string
  level2LabelPlural: string
  level3LabelPlural: string
}

interface AddContainerModalProps {
  projectId: number
  level: 1 | 2 | 3
  parentId?: number
  labels: ProjectLabels
  isOpen: boolean
  onClose: () => void
  onSuccess: (container: ContainerNode) => void
}

export function AddContainerModal({
  projectId,
  level,
  parentId,
  labels,
  isOpen,
  onClose,
  onSuccess,
}: AddContainerModalProps) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine label for this level
  const levelLabel =
    level === 1 ? labels.level1Label : level === 2 ? labels.level2Label : labels.level3Label

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/containers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: level,
          parent_division_id: parentId || null,
          container_code: code.trim() || undefined, // Empty = auto-generate
          display_name: name.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create container')
      }

      const result = await response.json()
      onSuccess(result.data)
      onClose()

      // Reset form
      setCode('')
      setName('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create container'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setCode('')
    setName('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add {levelLabel}
          </h2>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-ghost-secondary"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Container Code (optional) */}
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Code (optional)
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to auto-generate
            </p>
          </div>

          {/* Container Name (required) */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${levelLabel.toLowerCase()} name`}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn btn-primary btn-sm"
            >
              {isSubmitting ? 'Adding...' : `Add ${levelLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
