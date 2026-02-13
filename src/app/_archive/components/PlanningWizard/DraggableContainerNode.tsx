'use client'

import React, { useState, KeyboardEvent } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import type { ContainerNode } from '@/types'

interface ProjectLabels {
  level1Label: string
  level2Label: string
  level3Label: string
  level1LabelPlural: string
  level2LabelPlural: string
  level3LabelPlural: string
}

interface DraggableContainerNodeProps {
  container: ContainerNode
  level: 1 | 2 | 3
  labels: ProjectLabels
  onEdit: (id: number, updates: Partial<ContainerNode>) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onAddChild: (parentId: number, level: 2 | 3) => void
}

export function DraggableContainerNode({
  container,
  level,
  labels,
  onEdit,
  onDelete,
  onAddChild,
}: DraggableContainerNodeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(container.display_name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAttributes, setShowAttributes] = useState(false)
  const [editingAttributes, setEditingAttributes] = useState(false)
  const [editedAttributes, setEditedAttributes] = useState(container.attributes || {})

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: container.division_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Determine label for this level
  const levelLabel =
    level === 1 ? labels.level1Label : level === 2 ? labels.level2Label : labels.level3Label

  const childLabel = level === 1 ? labels.level2Label : labels.level3Label

  const hasChildren = container.children && container.children.length > 0

  const handleSave = async () => {
    const trimmedName = editedName.trim()
    if (trimmedName && trimmedName !== container.display_name) {
      try {
        await onEdit(container.division_id, { display_name: trimmedName })
      } catch (err) {
        // Error already displayed by onEdit, just revert
        setEditedName(container.display_name)
      }
    }
    setIsEditing(false)
  }

  const handleSaveAttributes = async () => {
    try {
      await onEdit(container.division_id, { attributes: editedAttributes })
      setEditingAttributes(false)
    } catch (err) {
      // Error already displayed by onEdit, just revert
      setEditedAttributes(container.attributes || {})
    }
  }

  const handleAttributeChange = (key: string, value: any) => {
    setEditedAttributes({ ...editedAttributes, [key]: value })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditedName(container.display_name)
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await onDelete(container.division_id)
      setShowDeleteConfirm(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete container'
      setDeleteError(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      {/* Main Container Node */}
      <div
        className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <div
            className="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Expand/Collapse (if has children) */}
          {hasChildren && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Container Code (small, muted) */}
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {container.container_code}
          </span>

          {/* Container Name (editable) */}
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                className="border-b-2 border-blue-500 bg-transparent focus:outline-none w-full text-gray-900 dark:text-gray-100"
                maxLength={200}
              />
            ) : (
              <span
                onClick={() => setIsEditing(true)}
                className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 text-gray-900 dark:text-gray-100"
              >
                {container.display_name}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Show Attributes Button */}
            {container.attributes && Object.keys(container.attributes).length > 0 && (
              <button
                onClick={() => setShowAttributes(!showAttributes)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                title="View attributes"
              >
                {showAttributes ? 'Hide' : 'Show'} Details
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              title={`Delete ${levelLabel}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Add Child Button (levels 1 & 2 only) */}
            {level < 3 && (
              <button
                onClick={() => onAddChild(container.division_id, (level + 1) as 2 | 3)}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                title={`Add ${childLabel}`}
              >
                <Plus className="w-3 h-3" />
                <span>Add {childLabel}</span>
              </button>
            )}
          </div>
        </div>

        {/* Attributes Display/Edit */}
        {showAttributes && container.attributes && Object.keys(container.attributes).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Attributes</span>
              {!editingAttributes && (
                <button
                  onClick={() => {
                    setEditingAttributes(true)
                    setEditedAttributes(container.attributes || {})
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="space-y-2">
              {Object.entries(container.attributes).map(([key, value]) => {
                const isNumber = typeof value === 'number'
                const currentValue = editedAttributes[key] !== undefined ? editedAttributes[key] : value

                // Calculate rollup values for multifamily (units roll up from children)
                const isCalculatedField = key === 'units_total' || key === 'units'
                const calculatedValue = isCalculatedField && container.children && container.children.length > 0
                  ? container.children.reduce((sum, child) => {
                      const childUnits = (child.attributes?.units as number) ||
                                       (child.attributes?.units_total as number) || 0
                      return sum + childUnits
                    }, 0)
                  : null

                const displayValue = calculatedValue !== null ? calculatedValue : currentValue
                const isReadonly = calculatedValue !== null

                return (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400 w-24 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </label>
                    {editingAttributes && !isReadonly ? (
                      <input
                        type={isNumber ? 'number' : 'text'}
                        step={isNumber ? 'any' : undefined}
                        value={currentValue}
                        onChange={(e) => {
                          const newValue = isNumber
                            ? (e.target.value === '' ? 0 : parseFloat(e.target.value))
                            : e.target.value
                          handleAttributeChange(key, newValue)
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    ) : (
                      <span className={`flex-1 text-xs ${isReadonly ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-900 dark:text-gray-100'}`}>
                        {String(displayValue)}
                        {isReadonly && <span className="ml-1 text-gray-500 dark:text-gray-400 text-[10px]">(calculated)</span>}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {editingAttributes && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveAttributes}
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingAttributes(false)
                    setEditedAttributes(container.attributes || {})
                  }}
                  className="px-3 py-1 text-xs bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 rounded"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nested Children */}
      {hasChildren && isExpanded && (
        <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          {container.children!.map((child) => (
            <DraggableContainerNode
              key={child.division_id}
              container={child}
              level={(level + 1) as 2 | 3}
              labels={labels}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete {levelLabel}?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{container.display_name}"?
            </p>

            {/* Error Message */}
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">{deleteError}</p>
              </div>
            )}

            {/* Warning if has children */}
            {hasChildren && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This {levelLabel.toLowerCase()} has {container.children!.length} child
                  {container.children!.length === 1 ? '' : 'ren'}. Delete the children first.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={hasChildren || isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
