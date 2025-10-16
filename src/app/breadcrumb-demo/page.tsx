'use client'

import React, { useState } from 'react'
import { DynamicBreadcrumb, buildContainerBreadcrumbs } from '@/app/components/DynamicBreadcrumb'
import { useProjectContext } from '@/app/components/ProjectProvider'
import { useProjectConfig } from '@/hooks/useProjectConfig'

/**
 * Breadcrumb Demo Page
 *
 * Demonstrates the DynamicBreadcrumb component with different hierarchy configurations.
 * Shows how the same component adapts to different project types:
 * - Master Planned Community: Plan Area > Phase > Parcel
 * - Multifamily Property: Property > Building > Unit
 * - Office Property: Campus > Building > Suite
 */
export default function BreadcrumbDemoPage() {
  const { activeProject } = useProjectContext()
  const { config, labels, containers, isLoading } = useProjectConfig(activeProject?.project_id ?? null)

  const [selectedScenario, setSelectedScenario] = useState<'project' | 'level1' | 'level2' | 'level3'>('level3')

  // Example breadcrumb scenarios
  const scenarios = {
    project: buildContainerBreadcrumbs(
      activeProject?.project_name ?? 'Select a Project',
      undefined,
      undefined,
      undefined,
      { projectHref: '/projects' }
    ),
    level1: buildContainerBreadcrumbs(
      activeProject?.project_name ?? 'Select a Project',
      'Plan Area 1',
      undefined,
      undefined,
      {
        projectHref: '/projects',
        level1Href: '/projects/7/area/1'
      }
    ),
    level2: buildContainerBreadcrumbs(
      activeProject?.project_name ?? 'Select a Project',
      'Plan Area 1',
      'Phase 1.1',
      undefined,
      {
        projectHref: '/projects',
        level1Href: '/projects/7/area/1',
        level2Href: '/projects/7/phase/5'
      }
    ),
    level3: buildContainerBreadcrumbs(
      activeProject?.project_name ?? 'Select a Project',
      'Plan Area 1',
      'Phase 1.1',
      'Parcel 42',
      {
        projectHref: '/projects',
        level1Href: '/projects/7/area/1',
        level2Href: '/projects/7/phase/5'
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Dynamic Breadcrumb Demo</h1>
          <p className="text-gray-400">
            Breadcrumbs adapt to project configuration. Same component, different terminology.
          </p>
        </div>

        {/* Current Project Config */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Current Project Configuration</h2>

          {isLoading ? (
            <div className="text-gray-400">Loading configuration...</div>
          ) : config ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Project</div>
                  <div className="text-gray-200">{activeProject?.project_name ?? 'None selected'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Asset Type</div>
                  <div className="text-gray-200 font-mono">{config.asset_type}</div>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <div className="text-sm text-gray-500 mb-2">Hierarchy Labels</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-xs text-gray-500">Level 1</div>
                    <div className="text-blue-400 font-medium">{labels.level1Label}</div>
                    <div className="text-xs text-gray-500 mt-1">Plural: {labels.level1LabelPlural}</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-xs text-gray-500">Level 2</div>
                    <div className="text-blue-400 font-medium">{labels.level2Label}</div>
                    <div className="text-xs text-gray-500 mt-1">Plural: {labels.level2LabelPlural}</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-xs text-gray-500">Level 3</div>
                    <div className="text-blue-400 font-medium">{labels.level3Label}</div>
                    <div className="text-xs text-gray-500 mt-1">Plural: {labels.level3LabelPlural}</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <div className="text-sm text-gray-500 mb-2">Container Hierarchy</div>
                <div className="text-gray-300">
                  {containers.length > 0 ? (
                    <div className="space-y-1">
                      <div>Level 1: {containers.length} {labels.level1LabelPlural}</div>
                      <div>Level 2: {containers.reduce((sum, c) => sum + (c.children?.length ?? 0), 0)} {labels.level2LabelPlural}</div>
                      <div>Level 3: {containers.reduce((sum, c) => sum + (c.children?.reduce((s2, c2) => s2 + (c2.children?.length ?? 0), 0) ?? 0), 0)} {labels.level3LabelPlural}</div>
                    </div>
                  ) : (
                    <div className="text-gray-500">No containers found for this project</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-yellow-400">
              ⚠️ No configuration found. Select a project or create configuration.
            </div>
          )}
        </div>

        {/* Interactive Demo */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Interactive Demo</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Select Navigation Depth:</label>
              <div className="flex gap-2">
                {(['project', 'level1', 'level2', 'level3'] as const).map((scenario) => (
                  <button
                    key={scenario}
                    onClick={() => setSelectedScenario(scenario)}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      selectedScenario === scenario
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {scenario === 'project' && 'Project Only'}
                    {scenario === 'level1' && `+ ${labels.level1Label}`}
                    {scenario === 'level2' && `+ ${labels.level2Label}`}
                    {scenario === 'level3' && `+ ${labels.level3Label}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-gray-700 rounded-lg p-6 bg-gray-950">
              <div className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Live Breadcrumb:</div>
              <DynamicBreadcrumb items={scenarios[selectedScenario]} />
            </div>
          </div>
        </div>

        {/* Example Configurations */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Example Configurations</h2>
          <p className="text-sm text-gray-400">
            How the same breadcrumb component appears with different project types:
          </p>

          <div className="space-y-4">
            {/* Master Planned Community */}
            <div className="border border-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Master Planned Community</div>
                  <div className="text-xs text-gray-500 font-mono">asset_type: land_development</div>
                </div>
              </div>
              <div className="bg-gray-950 p-3 rounded border border-gray-800">
                <div className="text-xs text-gray-500 mb-2">Labels: Plan Area → Phase → Parcel</div>
                <DynamicBreadcrumb
                  items={[
                    { label: 'Peoria Lakes', href: '#' },
                    { label: 'Plan Area 1', href: '#' },
                    { label: 'Phase 1.1', href: '#' },
                    { label: 'Parcel 42' }
                  ]}
                />
              </div>
            </div>

            {/* Multifamily */}
            <div className="border border-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Multifamily Property</div>
                  <div className="text-xs text-gray-500 font-mono">asset_type: multifamily</div>
                </div>
              </div>
              <div className="bg-gray-950 p-3 rounded border border-gray-800">
                <div className="text-xs text-gray-500 mb-2">Labels: Property → Building → Unit</div>
                <div className="text-sm text-gray-400 mb-2">(Example - requires project config update)</div>
              </div>
            </div>

            {/* Office */}
            <div className="border border-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Office Property</div>
                  <div className="text-xs text-gray-500 font-mono">asset_type: office</div>
                </div>
              </div>
              <div className="bg-gray-950 p-3 rounded border border-gray-800">
                <div className="text-xs text-gray-500 mb-2">Labels: Campus → Building → Suite</div>
                <div className="text-sm text-gray-400 mb-2">(Example - requires project config update)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Notes */}
        <div className="bg-blue-950 border border-blue-900 rounded-lg p-6 space-y-3">
          <h3 className="text-lg font-semibold text-blue-300">Implementation Notes</h3>
          <ul className="space-y-2 text-sm text-blue-200">
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>Component uses <code className="bg-blue-900 px-1 rounded">useProjectConfig()</code> hook to fetch labels from API</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>Labels automatically update when project changes</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>Same component works for all project types (Land, Multifamily, Office, Retail, etc.)</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>Zero hardcoded terminology - everything driven by <code className="bg-blue-900 px-1 rounded">tbl_project_config</code></span>
            </li>
          </ul>
        </div>

        {/* API Response */}
        {config && (
          <details className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <summary className="text-lg font-semibold text-white cursor-pointer hover:text-blue-400">
              View API Response (Click to expand)
            </summary>
            <pre className="mt-4 text-xs text-gray-400 bg-gray-950 p-4 rounded overflow-auto">
              {JSON.stringify({ config, labels, containerCount: containers.length }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
