'use client'

import dynamic from 'next/dynamic'

const LeafletGISView = dynamic(
  () => import('@/components/map-tab/LeafletGISView').then((mod) => mod.LeafletGISView),
  { ssr: false }
)

export default function MapDebugPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 py-10 px-4">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400">GIS / Map page</p>
          <h1 className="text-3xl font-semibold">Leaflet GIS overview (schema-backed)</h1>
          <p className="text-gray-300">
            Geometry comes directly from PostGIS artifacts defined in{' '}
            <code>docs/schema/landscape_rich_schema_2026-01-29.json</code> (e.g.,{' '}
            <code>vw_map_plan_parcels.geom</code>, <code>gis_project_boundary.geom</code>, and{' '}
            <code>gis_tax_parcel_ref.geom</code>) and is rendered without any reprojection.
          </p>
        </header>

        <LeafletGISView projectId={7} />
      </div>
    </div>
  )
}
