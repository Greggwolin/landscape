'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Feature, FeatureCollection, Geometry, GeoJsonObject } from 'geojson'
import { geoJSON, LatLngBounds, LatLngTuple, Map as LeafletMap, Layer, tileLayer } from 'leaflet'

interface LeafletGISViewProps {
  projectId: number
  projectName?: string
  description?: string
  projectLocation?: LatLngTuple | null
}

const DEFAULT_CENTER: LatLngTuple = [33.279, -111.612]
const DEFAULT_ZOOM = 11

const computeBoundsFromGeoJSON = (data: GeoJsonObject | null) => {
  if (!data) {
    return null
  }

  try {
    const layer = geoJSON(data as GeoJsonObject)
    const bounds = layer.getBounds()
    return bounds.isValid() ? bounds : null
  } catch (error) {
    console.error('Failed to compute bounds from GeoJSON', error)
    return null
  }
}

const buildBoundaryFeature = (geojson: Geometry, metadata: Record<string, unknown>) => ({
  type: 'Feature' as const,
  geometry: geojson,
  properties: metadata
})

export function LeafletGISView({
  projectId,
  projectName,
  description,
  projectLocation
}: LeafletGISViewProps) {
  const [planFeatures, setPlanFeatures] = useState<FeatureCollection | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  const [boundaryFeature, setBoundaryFeature] = useState<Feature<Geometry> | null>(null)
  const [boundaryLoading, setBoundaryLoading] = useState(false)
  const [boundaryError, setBoundaryError] = useState<string | null>(null)

  const [taxFeatures, setTaxFeatures] = useState<FeatureCollection | null>(null)
  const [taxLoading, setTaxLoading] = useState(false)
  const [taxError, setTaxError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const planLayerRef = useRef<Layer | null>(null)
  const taxLayerRef = useRef<Layer | null>(null)
  const boundaryLayerRef = useRef<Layer | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadPlanParcels = async () => {
      setPlanLoading(true)
      setPlanError(null)

      try {
        const response = await fetch(
          `/api/gis/plan-parcels?project_id=${projectId}&include_geometry=true&format=geojson`,
          { signal: controller.signal }
        )

        if (!response.ok) {
      const payload = await response.text()
      throw new Error(`${response.status}: ${payload}`)
    }

    const data = (await response.json()) as FeatureCollection
    setPlanFeatures(data)
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') {
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unable to load plan parcels'
        setPlanError(message)
      } finally {
        setPlanLoading(false)
      }
    }

    loadPlanParcels()

    return () => {
      controller.abort()
    }
  }, [projectId])

  useEffect(() => {
    const controller = new AbortController()

    const loadBoundary = async () => {
      setBoundaryLoading(true)
      setBoundaryError(null)

      try {
        const response = await fetch(`/api/gis/ingest-parcels?project_id=${projectId}`, {
          signal: controller.signal
        })

        if (!response.ok) {
          const payload = await response.text()
          throw new Error(`${response.status}: ${payload}`)
        }

        const json = await response.json()
        if (json?.boundary?.geometry) {
          setBoundaryFeature(
            buildBoundaryFeature(json.boundary.geometry, {
              acres: json.boundary.acres,
              source: json.boundary.source,
              created_at: json.boundary.created_at
            })
          )
        } else {
          setBoundaryError('Boundary geometry missing')
        }
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') {
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unable to load project boundary'
        setBoundaryError(message)
      } finally {
        setBoundaryLoading(false)
      }
    }

    loadBoundary()

    return () => {
      controller.abort()
    }
  }, [projectId])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!mapReady || !map) {
      return
    }
    const center = projectLocation ?? DEFAULT_CENTER
    map.setView(center, DEFAULT_ZOOM)
  }, [projectId, projectLocation, mapReady])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) {
      return
    }

    if (!planFeatures) {
      planLayerRef.current?.remove()
      planLayerRef.current = null
      return
    }

    const layer = geoJSON(planFeatures, {
      pane: 'plan-parcels',
      style: {
        color: '#38bdf8',
        weight: 2,
        opacity: 0.8,
        fillColor: '#38bdf8',
        fillOpacity: 0.15
      }
    })

    planLayerRef.current?.remove()
    layer.addTo(map)
    planLayerRef.current = layer
  }, [planFeatures, mapReady])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) {
      return
    }

    if (!taxFeatures) {
      taxLayerRef.current?.remove()
      taxLayerRef.current = null
      return
    }

    const layer = geoJSON(taxFeatures, {
      pane: 'tax-parcels',
      style: {
        color: '#f97316',
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0.05
      }
    })

    taxLayerRef.current?.remove()
    layer.addTo(map)
    taxLayerRef.current = layer
  }, [taxFeatures, mapReady])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) {
      return
    }

    if (!boundaryFeature) {
      boundaryLayerRef.current?.remove()
      boundaryLayerRef.current = null
      return
    }

    const layer = geoJSON(boundaryFeature, {
      pane: 'project-boundary',
      style: {
        color: '#a855f7',
        weight: 3,
        opacity: 0.95,
        fillOpacity: 0.05
      }
    })

    boundaryLayerRef.current?.remove()
    layer.addTo(map)
    boundaryLayerRef.current = layer
  }, [boundaryFeature, mapReady])

  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) {
      return undefined
    }

    const map = new LeafletMap(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true
    })

    const baseLayer = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    const ensurePane = (name: string, zIndex: number) => {
      if (!map.getPane(name)) {
        map.createPane(name)
      }
      const pane = map.getPane(name)
      if (pane) {
        pane.style.zIndex = `${zIndex}`
      }
    }

    ensurePane('tax-parcels', 200)
    ensurePane('plan-parcels', 400)
    ensurePane('project-boundary', 600)

    mapInstanceRef.current = map
    setMapReady(true)

    return () => {
      planLayerRef.current?.remove()
      planLayerRef.current = null
      taxLayerRef.current?.remove()
      taxLayerRef.current = null
      boundaryLayerRef.current?.remove()
      boundaryLayerRef.current = null
      baseLayer.remove()
      map.remove()
      mapInstanceRef.current = null
      setMapReady(false)
    }
  }, [])

  const planBounds = useMemo(() => computeBoundsFromGeoJSON(planFeatures), [planFeatures])
  const boundaryBounds = useMemo(
    () => computeBoundsFromGeoJSON(boundaryFeature),
    [boundaryFeature]
  )
  const taxBounds = useMemo(() => computeBoundsFromGeoJSON(taxFeatures), [taxFeatures])

  const bboxParam = useMemo(() => {
    if (!planBounds) {
      return ''
    }
    const padding = 0.001
    return [
      planBounds.getWest() - padding,
      planBounds.getSouth() - padding,
      planBounds.getEast() + padding,
      planBounds.getNorth() + padding
    ].join(',')
  }, [planBounds])

  useEffect(() => {
    if (!bboxParam) {
      return
    }

    const controller = new AbortController()

    const loadTaxParcels = async () => {
      setTaxLoading(true)
      setTaxError(null)

      try {
        const response = await fetch(`/api/gis/tax-parcels?bbox=${bboxParam}`, {
          signal: controller.signal
        })

        if (!response.ok) {
          const payload = await response.text()
          throw new Error(`${response.status}: ${payload}`)
        }

        const data = (await response.json()) as FeatureCollection
        setTaxFeatures(data)
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') {
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unable to load tax parcels'
        setTaxError(message)
      } finally {
        setTaxLoading(false)
      }
    }

    loadTaxParcels()

    return () => {
      controller.abort()
    }
  }, [bboxParam])

  const averageConfidence = useMemo(() => {
    if (!planFeatures?.features?.length) {
      return null
    }
    const confidences = planFeatures.features
      .map(feature => Number((feature.properties as Record<string, unknown>)?.confidence))
      .filter(value => Number.isFinite(value))
    if (!confidences.length) {
      return null
    }
    const sum = confidences.reduce((acc, value) => acc + value, 0)
    return sum / confidences.length
  }, [planFeatures])

  const combinedBounds = useMemo<LatLngBounds | null>(() => {
    const boundsList: LatLngBounds[] = [planBounds, boundaryBounds, taxBounds].filter(
      (bounds): bounds is LatLngBounds => Boolean(bounds)
    )
    if (!boundsList.length) {
      return null
    }
    const combined = boundsList[0].clone()
    for (let i = 1; i < boundsList.length; i += 1) {
      combined.extend(boundsList[i])
    }
    return combined
  }, [planBounds, boundaryBounds, taxBounds])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !combinedBounds || !combinedBounds.isValid()) {
      return
    }
    map.fitBounds(combinedBounds, {
      padding: [24, 24],
      maxZoom: 16
    })
  }, [combinedBounds, mapReady])

  const projectLabel = projectName ? projectName : `Project ${projectId}`
  const mapOverlayMessage = planError
    ? `Plan parcels error: ${planError}`
    : !planFeatures && planLoading
    ? 'Loading plan parcels...'
    : null

  return (
    <div className="space-y-6">
      {description && (
        <p className="text-sm text-gray-400">
          {description}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
      <section className="rounded-2xl border border-gray-800 bg-white/5 p-4 text-sm text-gray-300 shadow-lg shadow-black/40">
        <p className="font-semibold text-white">Plan parcels</p>
        <p className="text-xs uppercase tracking-wide text-gray-500">Project: {projectLabel}</p>
          <p className="mt-2 text-xs text-gray-400">
            Source: <code>vw_map_plan_parcels</code> (schema lines 31224‑31316) with{' '}
            <code>project_id</code>, <code>parcel_id</code>, <code>geom</code>, and <code>confidence</code>{' '}
            columns surfaced via the `/api/gis/plan-parcels` endpoint.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Status: {planLoading ? 'fetching...' : planError ? planError : 'geometry loaded'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Parcels: {planFeatures?.features.length ?? 0}, average confidence:{' '}
            {averageConfidence ? averageConfidence.toFixed(2) : 'n/a'}
          </p>
        </section>
        <section className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/40 p-4 text-sm text-gray-300 shadow-lg shadow-black/30">
          <p className="font-semibold text-white">Boundaries &amp; tax parcels</p>
          <p className="mt-2 text-xs text-gray-400">
            Boundary geometry from <code>gis_project_boundary</code> (schema lines 5062‑5095) and taxes
            from <code>gis_tax_parcel_ref</code> (schema lines 5097‑5136).
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Boundary status: {boundaryLoading ? 'fetching...' : boundaryError ? boundaryError : 'ready'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Tax parcels: {taxLoading ? 'fetching...' : taxError ? taxError : `${taxFeatures?.features.length ?? 0} features`}
          </p>
        </section>
      </div>

      <section className="relative min-h-[520px] overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-xl">
        {mapOverlayMessage && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 text-sm">
            {mapOverlayMessage}
          </div>
        )}
        {!mapReady && (
          <div className="absolute inset-0 z-20 flex h-full w-full items-center justify-center bg-black/60 text-sm text-gray-400">
            Initializing map...
          </div>
        )}
        <div
          ref={mapContainerRef}
          id={`leaflet-${projectId}`}
          className="h-full w-full"
          style={{ minHeight: '520px' }}
        />
      </section>
    </div>
  )
}
