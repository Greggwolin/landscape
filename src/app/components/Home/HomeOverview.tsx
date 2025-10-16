'use client'

import React, { useMemo } from 'react'
import useSWR from 'swr'
import { useProjectContext } from '@/app/components/ProjectProvider'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'
import { flattenContainers, getContainersByLevel, hasContainerData } from '@/lib/containerHelpers'
import type { ContainerNode } from '@/lib/containerHelpers'

interface ParcelSummary {
  parcel_id: number
  area_no: number
  phase_name: string
  acres: number
  units: number
  family_name?: string
}

interface PhaseSummary {
  phase_id: number
  phase_name: string
  status: string
  gross_acres: number
  units_total: number
}

const HomeOverview: React.FC = () => {
  const { activeProject, projects, refreshProjects, isLoading: projectsLoading } = useProjectContext()
  const projectId = activeProject?.project_id ?? null
  const { labels } = useProjectConfig(projectId ?? undefined)

  const fetcher = (url: string) => fetchJson(url)

  // Fetch container data (new unified system)
  const {
    data: containersResponse,
    isLoading: containersLoading
  } = useSWR<{ containers: ContainerNode[] }>(
    projectId ? `/api/projects/${projectId}/containers` : null,
    fetcher
  )

  // Determine if we should use containers or fall back to legacy
  const useContainers = hasContainerData(containersResponse?.containers)
  const shouldUseLegacy = !containersLoading && !useContainers

  // Fetch legacy data only if containers don't exist
  const { data: parcelsData } = useSWR<ParcelSummary[]>(
    projectId && shouldUseLegacy ? `/api/parcels?project_id=${projectId}` : null,
    fetcher
  )
  const { data: phasesData } = useSWR<PhaseSummary[]>(
    projectId && shouldUseLegacy ? `/api/phases?project_id=${projectId}` : null,
    fetcher
  )

  // Transform container data for metrics
  const { level1Containers, level2Containers, level3Containers } = useMemo(() => {
    if (!containersResponse?.containers) {
      return { level1Containers: [], level2Containers: [], level3Containers: [] }
    }
    const flat = flattenContainers(containersResponse.containers)
    return {
      level1Containers: getContainersByLevel(flat, 1),
      level2Containers: getContainersByLevel(flat, 2),
      level3Containers: getContainersByLevel(flat, 3)
    }
  }, [containersResponse])

  // Calculate metrics from containers
  const metricsFromContainers = useMemo(() => {
    const totalUnits = level3Containers.reduce((sum, c) => {
      const units = Number(c.attributes?.units_total || c.attributes?.units || 0)
      return sum + units
    }, 0)

    const activePhases = level2Containers.filter(c =>
      (c.attributes?.status || '').toLowerCase() === 'active'
    ).length

    const plannedAcreage = level2Containers.reduce((sum, c) => {
      const acres = Number(c.attributes?.acres_gross || c.attributes?.acres || 0)
      return sum + acres
    }, 0)

    return {
      areas: level1Containers.length,
      phases: level2Containers.length,
      parcels: level3Containers.length,
      totalUnits,
      activePhases,
      plannedAcreage
    }
  }, [level1Containers, level2Containers, level3Containers])

  // Calculate metrics from legacy data
  const metricsFromLegacy = useMemo(() => {
    if (!Array.isArray(parcelsData) || !Array.isArray(phasesData)) {
      return {
        areas: 0,
        phases: 0,
        parcels: 0,
        totalUnits: 0,
        activePhases: 0,
        plannedAcreage: 0
      }
    }

    const areaCount = new Set(parcelsData.map(p => p.area_no)).size
    const phaseCount = phasesData.length
    const parcelCount = parcelsData.length
    const totalUnits = parcelsData.reduce((sum, parcel) => sum + Number(parcel.units || 0), 0)
    const activePhases = phasesData.filter(phase => (phase.status || '').toLowerCase() === 'active').length
    const plannedAcreage = phasesData.reduce((sum, phase) => sum + Number(phase.gross_acres || 0), 0)

    return {
      areas: areaCount,
      phases: phaseCount,
      parcels: parcelCount,
      totalUnits,
      activePhases,
      plannedAcreage
    }
  }, [parcelsData, phasesData])

  // Use container metrics if available, otherwise legacy
  const metrics = useContainers ? metricsFromContainers : metricsFromLegacy

  // Family breakdown from containers
  const familyBreakdownFromContainers = useMemo(() => {
    if (level3Containers.length === 0) return [] as { family: string; parcels: number; units: number }[]
    const map = new Map<string, { parcels: number; units: number }>()
    level3Containers.forEach(container => {
      const family = container.attributes?.family_name?.trim() || 'Unclassified'
      const entry = map.get(family) ?? { parcels: 0, units: 0 }
      entry.parcels += 1
      entry.units += Number(container.attributes?.units_total || container.attributes?.units || 0)
      map.set(family, entry)
    })
    return Array.from(map.entries())
      .map(([family, value]) => ({ family, parcels: value.parcels, units: value.units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5)
  }, [level3Containers])

  // Family breakdown from legacy data
  const familyBreakdownFromLegacy = useMemo(() => {
    if (!Array.isArray(parcelsData) || parcelsData.length === 0) return [] as { family: string; parcels: number; units: number }[]
    const map = new Map<string, { parcels: number; units: number }>()
    parcelsData.forEach(parcel => {
      const family = parcel.family_name?.trim() || 'Unclassified'
      const entry = map.get(family) ?? { parcels: 0, units: 0 }
      entry.parcels += 1
      entry.units += Number(parcel.units || 0)
      map.set(family, entry)
    })
    return Array.from(map.entries())
      .map(([family, value]) => ({ family, parcels: value.parcels, units: value.units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5)
  }, [parcelsData])

  // Use container family breakdown if available, otherwise legacy
  const familyBreakdown = useContainers ? familyBreakdownFromContainers : familyBreakdownFromLegacy

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-blue-300">Active Project</div>
            <h1 className="text-2xl font-semibold text-white mt-1">{activeProject?.project_name ?? 'Select a project'}</h1>
            <p className="text-sm text-gray-400 mt-2">
              {activeProject
                ? `${labels.level1LabelPlural}, phases, parcels, and budgets stay in sync as you make updates.`
                : 'Choose a project to start planning. All summaries update instantly.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 text-xs font-medium rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
              onClick={() => refreshProjects()}
              disabled={projectsLoading}
            >
              {projectsLoading ? 'Refreshing…' : 'Refresh Projects'}
            </button>
            <button
              className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white border border-blue-500 hover:bg-blue-500"
              onClick={() => window.dispatchEvent(new CustomEvent('navigateToView', { detail: { view: 'planning-overview' } }))}
            >
              Go to Planning Overview
            </button>
          </div>
        </div>
        {projects.length > 1 && (
          <div className="mt-4 text-xs text-gray-500">
            {projects.length} projects available • switching projects updates all dashboards
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={`${labels.level1LabelPlural}`} value={metrics.areas} icon="ri-map-pin-line" accent="bg-indigo-500/10 text-indigo-300" />
        <MetricCard label={`${labels.level2LabelPlural}`} value={metrics.phases} icon="ri-route-fill" accent="bg-emerald-500/10 text-emerald-300" />
        <MetricCard label={`${labels.level3LabelPlural}`} value={metrics.parcels} icon="ri-community-line" accent="bg-sky-500/10 text-sky-300" />
        <MetricCard label="Planned Units" value={metrics.totalUnits} icon="ri-building-3-line" accent="bg-amber-500/10 text-amber-300" formatter="number" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{labels.level2Label} Snapshot</h2>
            <span className="text-xs text-gray-400">{metrics.phases} {labels.level2LabelPlural.toLowerCase()}</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-300">
            <SnapshotStat label={`Active ${labels.level2LabelPlural}`} value={metrics.activePhases} />
            <SnapshotStat label="Gross Acres" value={metrics.plannedAcreage} formatter="acres" />
            <SnapshotStat label={`Avg Units / ${labels.level2Label}`} value={metrics.phases ? Math.round(metrics.totalUnits / metrics.phases) : 0} />
          </div>
          <div className="mt-6 bg-gray-900/60 rounded-md border border-gray-700/60 p-4 text-xs text-gray-400">
            Each {labels.level2Label.toLowerCase()} auto-syncs with the inline planner. Use the Planning Overview to drill into {labels.level3LabelPlural.toLowerCase()} detail and update them in place.
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Top Use Families</h2>
          <div className="space-y-3">
            {familyBreakdown.length === 0 ? (
              <div className="text-sm text-gray-400">Assign land use families to {labels.level3LabelPlural.toLowerCase()} to populate this chart.</div>
            ) : (
              familyBreakdown.map(entry => (
                <div key={entry.family} className="flex items-center justify-between text-sm text-gray-200">
                  <span className="truncate pr-4">{entry.family}</span>
                  <span className="text-gray-400">{entry.parcels} {labels.level3LabelPlural.toLowerCase()} • {entry.units.toLocaleString()} units</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const MetricCard: React.FC<{
  label: string
  value: number
  icon: string
  accent: string
  formatter?: 'number'
}> = ({ label, value, icon, accent, formatter }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-md text-xl ${accent}`}>
      <i className={icon} />
    </div>
    <div className="mt-4 text-sm uppercase tracking-wide text-gray-400">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-white">
      {formatter === 'number' ? value.toLocaleString() : value}
    </div>
  </div>
)

const SnapshotStat: React.FC<{ label: string; value: number; formatter?: 'acres' }> = ({ label, value, formatter }) => (
  <div className="bg-gray-900/40 border border-gray-700/60 rounded-md p-3">
    <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
    <div className="text-lg font-semibold text-white mt-1">
      {formatter === 'acres' ? `${Math.round(value).toLocaleString()} ac` : value.toLocaleString()}
    </div>
  </div>
)

export default HomeOverview
