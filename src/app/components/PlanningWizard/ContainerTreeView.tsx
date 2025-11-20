'use client'

import React, { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { DraggableContainerNode } from './DraggableContainerNode'
import { AddContainerModal } from './AddContainerModal'
import type { ContainerNode } from '@/types'

interface ProjectLabels {
  level1Label: string
  level2Label: string
  level3Label: string
  level1LabelPlural: string
  level2LabelPlural: string
  level3LabelPlural: string
}

interface ContainerTreeViewProps {
  projectId: number
  containers: ContainerNode[]
  labels: ProjectLabels
  onRefresh: () => Promise<void>
}

export function ContainerTreeView({
  projectId,
  containers,
  labels,
  onRefresh,
}: ContainerTreeViewProps) {
  const [showAddModal, setShowAddModal] = useState<{
    level: 1 | 2 | 3
    parentId?: number
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Helper to find all siblings (containers with same parent)
  const findSiblings = useCallback(
    (divisionId: number): ContainerNode[] => {
      let siblings: ContainerNode[] = []

      const findInTree = (nodes: ContainerNode[], parentId: number | null): void => {
        for (const node of nodes) {
          if (node.division_id === divisionId) {
            // Found the node, now get its siblings
            if (parentId === null) {
              // Root level siblings
              siblings = nodes
            } else {
              // Find parent and get its children
              const findParent = (searchNodes: ContainerNode[]): ContainerNode | null => {
                for (const searchNode of searchNodes) {
                  if (searchNode.division_id === parentId) {
                    return searchNode
                  }
                  if (searchNode.children) {
                    const found = findParent(searchNode.children)
                    if (found) return found
                  }
                }
                return null
              }

              const parent = findParent(containers)
              if (parent?.children) {
                siblings = parent.children
              }
            }
            return
          }

          if (node.children) {
            findInTree(node.children, node.division_id)
          }
        }
      }

      findInTree(containers, null)
      return siblings
    },
    [containers]
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeId = Number(active.id)
    const overId = Number(over.id)

    // Find siblings of dragged container
    const siblings = findSiblings(activeId)

    const oldIndex = siblings.findIndex((c) => c.division_id === activeId)
    const newIndex = siblings.findIndex((c) => c.division_id === overId)

    if (oldIndex === -1 || newIndex === -1) return

    // Reorder array
    const reordered = arrayMove(siblings, oldIndex, newIndex)

    // Build updates
    const updates = reordered.map((container, index) => ({
      division_id: container.division_id,
      sort_order: index,
    }))

    // API call
    try {
      const response = await fetch(`/api/projects/${projectId}/containers/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) {
        throw new Error('Failed to reorder containers')
      }

      // Refresh data from server
      await onRefresh()
    } catch (err) {
      console.error('Reorder failed:', err)
      alert('Failed to reorder containers. Please try again.')
      // Refresh to restore correct order
      await onRefresh()
    }
  }

  const handleUpdateContainer = async (
    divisionId: number,
    updates: Partial<ContainerNode>
  ) => {
    try {
      console.log('Updating container:', divisionId, 'with updates:', updates)

      const response = await fetch(`/api/containers/${divisionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const responseData = await response.json()
      console.log('Update response:', responseData)

      if (!response.ok) {
        const errorMsg = responseData.error?.message || 'Failed to update container'
        const errorDetails = responseData.error?.details || ''
        const fullMessage = errorDetails ? `${errorMsg}\nDetails: ${JSON.stringify(errorDetails)}` : errorMsg
        throw new Error(fullMessage)
      }

      // Refresh data
      await onRefresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update container'
      console.error('Container update failed:', err)
      alert(message)
      throw err
    }
  }

  const handleDeleteContainer = async (divisionId: number) => {
    try {
      const response = await fetch(`/api/containers/${divisionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to delete container')
      }

      // Refresh data
      await onRefresh()
    } catch (err: unknown) {
      // Re-throw so DraggableNode can display the error
      throw err
    }
  }

  const handleAddContainerSuccess = async () => {
    // Refresh data to show new container
    await onRefresh()
  }

  const divisionIds = containers.map((c) => c.division_id)

  // Check if this is a multifamily project (Property/Building structure)
  const isMultifamily = labels.level1Label === 'Property' || labels.level1Label === 'Building'
  const hasRootContainer = containers.length > 0

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Project Structure
        </h2>
        {/* For multifamily, only show Add Property if none exists */}
        {(!isMultifamily || !hasRootContainer) && (
          <button
            onClick={() => setShowAddModal({ level: 1 })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            <Plus className="w-4 h-4" />
            Add {labels.level1Label}
          </button>
        )}
        {/* For multifamily with existing property, show helpful text */}
        {isMultifamily && hasRootContainer && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add {labels.level2LabelPlural.toLowerCase()} and {labels.level3LabelPlural.toLowerCase()} using the + buttons below
          </p>
        )}
      </div>

      {/* Container Tree */}
      {containers.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={divisionIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {containers.map((container) => (
                <DraggableContainerNode
                  key={container.division_id}
                  container={container}
                  level={1}
                  labels={labels}
                  onEdit={handleUpdateContainer}
                  onDelete={handleDeleteContainer}
                  onAddChild={(parentId, level) => setShowAddModal({ level, parentId })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="mb-4">
            {isMultifamily
              ? `No ${labels.level1Label.toLowerCase()} defined yet. Create the ${labels.level1Label.toLowerCase()} to start managing ${labels.level2LabelPlural.toLowerCase()} and ${labels.level3LabelPlural.toLowerCase()}.`
              : `No ${labels.level1LabelPlural.toLowerCase()} yet.`
            }
          </p>
          <button
            onClick={() => setShowAddModal({ level: 1 })}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            + Add {isMultifamily ? `the ${labels.level1Label.toLowerCase()}` : `your first ${labels.level1Label.toLowerCase()}`}
          </button>
        </div>
      )}

      {/* Add Container Modal */}
      {showAddModal && (
        <AddContainerModal
          projectId={projectId}
          level={showAddModal.level}
          parentId={showAddModal.parentId}
          labels={labels}
          isOpen={true}
          onClose={() => setShowAddModal(null)}
          onSuccess={handleAddContainerSuccess}
        />
      )}
    </div>
  )
}
