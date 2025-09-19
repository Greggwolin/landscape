'use client'

import React, { useMemo } from 'react'
import useSWR from 'swr'
import { useProjectContext } from '@/app/components/ProjectProvider'
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { fetchJson } from '@/lib/fetchJson'

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
  const { data: parcelsData } = useSWR<ParcelSummary[]>(projectId ? `/api/parcels?project_id=${projectId}` : null, fetcher)
  const { data: phasesData } = useSWR<PhaseSummary[]>(projectId ? `/api/phases?project_id=${projectId}` : null, fetcher)

  const metrics = useMemo(() => {
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

  const familyBreakdown = useMemo(() => {
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
            <h2 className="text-lg font-semibold text-white">Phase Snapshot</h2>
            <span className="text-xs text-gray-400">{metrics.phases} {labels.level2LabelPlural.toLowerCase()}</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-300">
            <SnapshotStat label="Active Phases" value={metrics.activePhases} />
            <SnapshotStat label="Gross Acres" value={metrics.plannedAcreage} formatter="acres" />
            <SnapshotStat label="Avg Units / Phase" value={metrics.phases ? Math.round(metrics.totalUnits / metrics.phases) : 0} />
          </div>
          <div className="mt-6 bg-gray-900/60 rounded-md border border-gray-700/60 p-4 text-xs text-gray-400">
            Each phase auto-syncs with the inline planner. Use the Planning Overview to drill into {labels.level3LabelPlural.toLowerCase()} detail and update parcels in place.
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Top Use Families</h2>
          <div className="space-y-3">
            {familyBreakdown.length === 0 ? (
              <div className="text-sm text-gray-400">Assign land use families to parcels to populate this chart.</div>
            ) : (
              familyBreakdown.map(entry => (
                <div key={entry.family} className="flex items-center justify-between text-sm text-gray-200">
                  <span className="truncate pr-4">{entry.family}</span>
                  <span className="text-gray-400">{entry.parcels} parcels • {entry.units.toLocaleString()} units</span>
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
