'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'

interface BudgetItem {
  fact_id: number
  budget_id: number
  pe_level?: string | null
  pe_id?: string | null
  container_id: number | null
  category_id: number
  uom_code: string
  qty: number | null
  rate: number | null
  amount: number
  confidence_level: string | null
  is_committed: boolean
  // Container details
  container_level: number | null
  container_code: string | null
  container_name: string | null
  project_id: number | null
  container_sort_order: number | null
  // Category details
  category_code: string
  category_name: string
  category_depth: number
}

interface BudgetSummary {
  totalAmount: number
  itemCount: number
  byLevel: Array<{
    level: number
    levelName: string
    count: number
    total: number
  }>
}

interface BudgetContainerViewProps {
  projectId: number
  containerId?: number
  containerLevel?: number
  includeChildren?: boolean
}

export default function BudgetContainerView({
  projectId,
  containerId,
  containerLevel,
  includeChildren = false
}: BudgetContainerViewProps) {
  const { labels, isLoading: labelsLoading } = useProjectConfig(projectId)
  const { level1Label, level2Label, level3Label } = labels

  const [expandedContainers, setExpandedContainers] = useState<Set<number>>(
    new Set()
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    new Set()
  )

  // Build query parameters
  const queryParams = new URLSearchParams()
  if (containerId) {
    queryParams.append('container_id', containerId.toString())
    if (includeChildren) {
      queryParams.append('include_children', 'true')
    }
  } else if (containerLevel) {
    queryParams.append('project_id', projectId.toString())
    queryParams.append('container_level', containerLevel.toString())
  } else {
    queryParams.append('project_id', projectId.toString())
  }

  // Fetch budget data
  const {
    data: budgetData,
    error,
    isLoading
  } = useSWR<{
    success: boolean
    data: {
      items: BudgetItem[]
      summary: BudgetSummary
    }
  }>(`/api/budget/containers?${queryParams.toString()}`, fetchJson)

  const items = budgetData?.data?.items || []
  const summary = budgetData?.data?.summary

  // Group items by container
  const itemsByContainer = useMemo(() => {
    const grouped = new Map<string, BudgetItem[]>()

    items.forEach((item) => {
      const key = item.container_id
        ? `container-${item.container_id}`
        : 'project'
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(item)
    })

    return grouped
  }, [items])

  // Get sorted container keys
  const sortedContainerKeys = useMemo(() => {
    return Array.from(itemsByContainer.keys()).sort((a, b) => {
      if (a === 'project') return -1
      if (b === 'project') return 1

      const itemsA = itemsByContainer.get(a)![0]
      const itemsB = itemsByContainer.get(b)![0]

      // Sort by level first, then sort_order
      const levelDiff =
        (itemsA.container_level || 0) - (itemsB.container_level || 0)
      if (levelDiff !== 0) return levelDiff

      return (
        (itemsA.container_sort_order || 0) - (itemsB.container_sort_order || 0)
      )
    })
  }, [itemsByContainer])

  // Get level label by container level
  const getLevelLabel = (level: number | null): string => {
    if (level === null || level === 0) return 'Project'
    if (level === 1) return level1Label || 'Level 1'
    if (level === 2) return level2Label || 'Level 2'
    if (level === 3) return level3Label || 'Level 3'
    return `Level ${level}`
  }

  // Toggle container expansion
  const toggleContainer = (containerId: number) => {
    setExpandedContainers((prev) => {
      const next = new Set(prev)
      if (next.has(containerId)) {
        next.delete(containerId)
      } else {
        next.add(containerId)
      }
      return next
    })
  }

  // Toggle category expansion
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  if (isLoading || labelsLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-gray-400">Loading budget data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-red-400">
          Error loading budget: {error.message}
        </div>
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-gray-400">No budget items found</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-400">Total Budget</div>
            <div className="text-2xl font-bold text-white">
              ${summary?.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Line Items</div>
            <div className="text-2xl font-bold text-white">
              {summary?.itemCount}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-sm text-gray-400 mb-2">By Level</div>
            <div className="flex gap-2">
              {summary?.byLevel.map((level) => (
                <div
                  key={level.level}
                  className="bg-gray-700 px-3 py-2 rounded text-sm"
                >
                  <div className="text-gray-300 font-medium">
                    {getLevelLabel(level.level)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {level.count} items · $
                    {level.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Items by Container */}
      <div className="bg-gray-900 rounded-lg border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 border-b border-gray-700 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {getLevelLabel(1)} / Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  UOM
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Committed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sortedContainerKeys.map((containerKey) => {
                const containerItems = itemsByContainer.get(containerKey)!
                const firstItem = containerItems[0]
                const containerTotal = containerItems.reduce(
                  (sum, item) => sum + (item.amount || 0),
                  0
                )
                const isExpanded =
                  containerKey === 'project' ||
                  (firstItem.container_id !== null &&
                    expandedContainers.has(firstItem.container_id))

                return (
                  <React.Fragment key={containerKey}>
                    {/* Container Header Row */}
                    <tr
                      className="bg-gray-850 hover:bg-gray-800 cursor-pointer"
                      onClick={() =>
                        firstItem.container_id &&
                        toggleContainer(firstItem.container_id)
                      }
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        <div className="flex items-center gap-2">
                          {firstItem.container_id && (
                            <span className="text-gray-500">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          )}
                          <span>
                            {firstItem.container_name || 'Project Total'}
                          </span>
                          {firstItem.container_level !== null && (
                            <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">
                              {getLevelLabel(firstItem.container_level)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400" colSpan={3}>
                        {containerItems.length} items
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        $
                        {containerTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td colSpan={2}></td>
                    </tr>

                    {/* Expanded Items */}
                    {isExpanded &&
                      containerItems.map((item) => (
                        <tr
                          key={item.fact_id}
                          className="hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-2 pl-12 text-gray-300">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {item.category_code}
                              </span>
                              <span>{item.category_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-gray-400">
                            {item.uom_code}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-300">
                            {item.qty?.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-300">
                            {item.rate
                              ? `$${item.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-white font-medium">
                            $
                            {item.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.confidence_level && (
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  item.confidence_level === 'high'
                                    ? 'bg-green-900/30 text-green-400'
                                    : item.confidence_level === 'medium'
                                      ? 'bg-yellow-900/30 text-yellow-400'
                                      : 'bg-red-900/30 text-red-400'
                                }`}
                              >
                                {item.confidence_level}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.is_committed ? (
                              <span className="text-green-400">✓</span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
