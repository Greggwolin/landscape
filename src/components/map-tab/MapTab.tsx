'use client'

import { useMemo } from 'react'
import type { LatLngTuple } from 'leaflet'
import { LeafletGISView } from './LeafletGISView'
import type { MapTabProps } from './types'

const parseCoordinate = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function MapTab({ project }: MapTabProps) {
  const projectTitle = project.project_name ?? 'Project GIS View'
  const projectLocation = useMemo<LatLngTuple | null>(() => {
    const lat =
      parseCoordinate(project.location_lat ?? project.latitude ?? null)
    const lon =
      parseCoordinate(project.location_lon ?? project.longitude ?? null)

    if (lat === null || lon === null) {
      return null
    }

    return [lat, lon]
  }, [
    project.location_lat,
    project.latitude,
    project.location_lon,
    project.longitude
  ])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 py-10 px-4">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400">GIS / Map page</p>
          <h1 className="text-3xl font-semibold">Leaflet GIS overview – {projectTitle}</h1>
          <p className="text-gray-300">
            Geometry is sourced from <code>docs/schema/landscape_rich_schema_2026-01-25.json</code>{' '}
            (e.g., <code>vw_map_plan_parcels</code>, <code>gis_project_boundary</code>,{' '}
            <code>gis_tax_parcel_ref</code>) and rendered without reprojection.
          </p>
        </header>

        <LeafletGISView
          projectId={project.project_id}
          projectName={projectTitle}
          description={`Rendering parcel, boundary, and tax datasets for ${projectTitle} with Leaflet.`}
          projectLocation={projectLocation}
        />
      </div>
    </div>
  )
}

export default MapTab
