'use client'

import React, { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getEsriHybridStyle } from '@/lib/maps/esriHybrid'

export default function ParcelTestPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [status, setStatus] = useState<string>('Initializing...')
  const [parcelCount, setParcelCount] = useState<number>(0)
  const [selectedCount, setSelectedCount] = useState<number>(0)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    try {
      setStatus('Creating map...')

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: getEsriHybridStyle(),
        center: [-111.927912, 33.028911], // Anderson Road & Farrell Road intersection, Maricopa
        zoom: 12
      })

      map.current.on('load', () => {
        setStatus('Map loaded, fetching parcels...')
        loadParcels()
      })

      map.current.on('error', (e) => {
        setStatus(`Map error: ${e.error?.message || 'Unknown error'}`)
        console.error('Map error:', e)
      })

      // Add move handlers with better debugging
      map.current.on('moveend', () => {
        if (map.current && map.current.getZoom() >= 10) {
          const center = map.current.getCenter()
          setStatus(`Map moved to [${center.lng.toFixed(3)}, ${center.lat.toFixed(3)}], reloading...`)
          setTimeout(loadParcels, 300)
        } else {
          setStatus(`Zoom ${map.current?.getZoom().toFixed(1)} too low - zoom to 10+`)
        }
      })

      map.current.on('zoomend', () => {
        if (map.current && map.current.getZoom() >= 10) {
          setStatus(`Zoomed to ${map.current.getZoom().toFixed(1)}, reloading parcels...`)
          setTimeout(loadParcels, 300)
        } else {
          setStatus(`Zoom ${map.current.getZoom().toFixed(1)} too low - zoom to 10+`)
        }
      })

    } catch (error) {
      setStatus(`Initialization error: ${error instanceof Error ? error.message : 'Unknown'}`)
      console.error('Map initialization error:', error)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  const loadParcels = async () => {
    if (!map.current) return

    try {
      const zoom = map.current.getZoom()
      if (zoom < 10) {
        setStatus(`Zoom level ${zoom.toFixed(1)} too low - zoom to 10+ to see parcels`)
        // Clear parcels at low zoom
        if (map.current.getSource('parcels')) {
          (map.current.getSource('parcels') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: []
          })
        }
        setParcelCount(0)
        return
      }

      setStatus(`Loading parcels for zoom ${zoom.toFixed(1)}...`)

      // SUCCESS: Using correct Pinal County FeatureServer with spatial query
      const currentBounds = map.current.getBounds()
      const sw = currentBounds.getSouthWest()
      const ne = currentBounds.getNorthEast()

      const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`

      // Since spatial queries aren't working, load a large sample and filter client-side
      const url = `https://services7.arcgis.com/MlfUGd2UJYefAS7v/arcgis/rest/services/Pinal_County_Tax_Parcels_viewer/FeatureServer/0/query?` +
        `where=1=1&outFields=*&returnGeometry=true&` +
        `f=geojson&outSR=4326&resultRecordCount=2000`

      setStatus(`Attempting spatial query for current map view...`)
      console.log('Full API URL:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const allFeatures = data.features || []

      // Filter to show only parcels within current view (since spatial query doesn't work)
      const visibleFeatures = allFeatures.filter((feature: any) => {
        if (!feature.geometry || !feature.geometry.coordinates) return false

        const coords = feature.geometry.coordinates[0]
        if (!coords || coords.length === 0) return false

        // Check if any part of parcel is within visible bounds
        return coords.some((coord: number[]) => {
          const lng = coord[0]
          const lat = coord[1]
          return lng >= sw.lng && lng <= ne.lng && lat >= sw.lat && lat <= ne.lat
        })
      })

      const features = visibleFeatures

      console.log(`Total parcels loaded: ${allFeatures.length}, visible in current view: ${features.length}`)
      console.log('Map bounds:', { sw: [sw.lng, sw.lat], ne: [ne.lng, ne.lat] })

      setParcelCount(features.length)

      if (features.length === 0) {
        setStatus(`Loaded ${allFeatures.length} parcels, but none visible in current area. Pan to find parcels.`)
      } else {
        setStatus(`Showing ${features.length} of ${allFeatures.length} parcels (all sizes, no acre filter)`)
      }

      if (features.length === 0) {
        // Clear existing parcels
        if (map.current.getSource('parcels')) {
          (map.current.getSource('parcels') as maplibregl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: []
          })
        }
        return
      }

      // Add IDs to features
      features.forEach((feature: any, index: number) => {
        feature.id = index
      })

      // Create or update source
      if (!map.current.getSource('parcels')) {
        map.current.addSource('parcels', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features }
        })

        // Add stroke layer with better visibility
        map.current.addLayer({
          id: 'parcel-lines',
          type: 'line',
          source: 'parcels',
          paint: {
            'line-color': '#ff0000',
            'line-width': 2,
            'line-opacity': 0.9
          },
          minzoom: 0,  // Always show regardless of zoom
          maxzoom: 24
        })

        // Also add a fill layer for better visibility
        map.current.addLayer({
          id: 'parcel-fill',
          type: 'fill',
          source: 'parcels',
          paint: {
            'fill-color': '#ff0000',
            'fill-opacity': 0.1
          },
          minzoom: 0,
          maxzoom: 24
        }, 'parcel-lines') // Add below the line layer

        // Add selection layer
        map.current.addLayer({
          id: 'parcel-selected',
          type: 'line',
          source: 'parcels',
          paint: {
            'line-color': '#00ff00',
            'line-width': 4,
            'line-opacity': 1
          },
          filter: ['in', 'PARCELID', '']
        })

        // Add click handler
        map.current.on('click', 'parcel-lines', (e) => {
          if (e.features && e.features[0]) {
            const parcelId = e.features[0].properties?.PARCELID
            if (parcelId) {
              // Toggle selection
              const currentFilter = map.current!.getFilter('parcel-selected') as any[]
              const selectedIds = currentFilter.length > 2 ? currentFilter.slice(2) : []

              if (selectedIds.includes(parcelId)) {
                // Remove from selection
                const newIds = selectedIds.filter((id: string) => id !== parcelId)
                map.current!.setFilter('parcel-selected', ['in', 'PARCELID', ...newIds])
                setSelectedCount(newIds.length)
              } else {
                // Add to selection
                const newIds = [...selectedIds, parcelId]
                map.current!.setFilter('parcel-selected', ['in', 'PARCELID', ...newIds])
                setSelectedCount(newIds.length)
              }
            }
          }
        })

        // Change cursor on hover
        map.current.on('mouseenter', 'parcel-lines', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer'
        })

        map.current.on('mouseleave', 'parcel-lines', () => {
          if (map.current) map.current.getCanvas().style.cursor = ''
        })

      } else {
        // FORCE complete data refresh - clear first, then update
        (map.current.getSource('parcels') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [] // Clear first
        })

        // Small delay then add new data
        setTimeout(() => {
          if (map.current?.getSource('parcels')) {
            (map.current.getSource('parcels') as maplibregl.GeoJSONSource).setData({
              type: 'FeatureCollection',
              features
            })
          }
        }, 50)
      }

      // Force layer refresh after data update
      setTimeout(() => {
        if (map.current?.getLayer('parcel-lines')) {
          // Force repaint to ensure all parcels render
          map.current.setPaintProperty('parcel-lines', 'line-opacity', 0.8)
          map.current.triggerRepaint()

          // Debug: Check how many features are actually rendered
          const renderedFeatures = map.current.querySourceFeatures('parcels')
          setStatus(`Loaded ${features.length} parcels, ${renderedFeatures.length} rendered for zoom ${zoom.toFixed(1)}`)
        }
      }, 100)

    } catch (error) {
      setStatus(`Error loading parcels: ${error instanceof Error ? error.message : 'Unknown'}`)
      console.error('Parcel loading error:', error)
    }
  }

  return (
    <div className="h-screen bg-gray-900 text-white">
      {/* Status Bar */}
      <div className="absolute top-4 left-4 z-10 bg-gray-800 p-4 rounded-lg shadow-lg max-w-md">
        <h1 className="text-lg font-bold mb-2">🗺️ Simple Parcel Test</h1>
        <div className="text-sm space-y-1">
          <div><strong>Status:</strong> {status}</div>
          <div><strong>Parcels:</strong> {parcelCount}</div>
          <div><strong>Selected:</strong> {selectedCount}</div>
          <div className="text-yellow-300 mt-2">
            • Red lines = ALL parcels<br/>
            • Click parcels to select (green)<br/>
            • Pan/zoom to load new areas
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ height: '100vh' }}
      />
    </div>
  )
}
