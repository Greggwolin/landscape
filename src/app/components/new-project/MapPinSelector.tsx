'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getEsriHybridStyle } from '@/lib/maps/esriHybrid'

export interface GeocodeResult {
  city?: string
  county?: string
  state?: string
  zip?: string
  crossStreets?: string
  formattedAddress?: string
}

interface MapPinSelectorProps {
  latitude?: number
  longitude?: number
  onLocationSelect: (coords: { lat: number; lng: number }) => void
  onGeocode?: (result: GeocodeResult) => void
  className?: string
  isDark?: boolean
}

// Phoenix metro area default center
const DEFAULT_CENTER: [number, number] = [-112.074, 33.4484]
const DEFAULT_ZOOM = 10

const MapPinSelector = ({
  latitude,
  longitude,
  onLocationSelect,
  onGeocode,
  className = '',
  isDark = false
}: MapPinSelectorProps) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const marker = useRef<maplibregl.Marker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [hasMarker, setHasMarker] = useState(false)

  // Reverse geocode using Nominatim (OpenStreetMap)
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<GeocodeResult | null> => {
    setGeocodeStatus('loading')
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Landscape-App/1.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Geocoding failed')
      }

      const data = await response.json()
      const address = data.address || {}

      const result: GeocodeResult = {
        city: address.city || address.town || address.village || address.municipality,
        county: address.county?.replace(' County', ''),
        state: address.state,
        zip: address.postcode,
        formattedAddress: data.display_name
      }

      if (address.road) {
        result.crossStreets = address.road
      }

      setGeocodeStatus('success')
      return result
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      setGeocodeStatus('error')
      return null
    }
  }, [])

  // Handle map click
  const handleMapClick = useCallback(async (e: maplibregl.MapMouseEvent) => {
    const { lng, lat } = e.lngLat

    if (marker.current) {
      marker.current.setLngLat([lng, lat])
    } else if (map.current) {
      marker.current = new maplibregl.Marker({
        color: '#3b82f6',
        draggable: true
      })
        .setLngLat([lng, lat])
        .addTo(map.current)

      marker.current.on('dragend', async () => {
        const lngLat = marker.current?.getLngLat()
        if (lngLat) {
          onLocationSelect({ lat: lngLat.lat, lng: lngLat.lng })
          if (onGeocode) {
            const result = await reverseGeocode(lngLat.lat, lngLat.lng)
            if (result) {
              onGeocode(result)
            }
          }
        }
      })
    }

    setHasMarker(true)
    onLocationSelect({ lat, lng })

    if (onGeocode) {
      const result = await reverseGeocode(lat, lng)
      if (result) {
        onGeocode(result)
      }
    }
  }, [onLocationSelect, onGeocode, reverseGeocode])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const initialCenter: [number, number] =
      latitude && longitude ? [longitude, latitude] : DEFAULT_CENTER
    const initialZoom = latitude && longitude ? 14 : DEFAULT_ZOOM

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getEsriHybridStyle(),
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false
    })

    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    )

    map.current.on('load', () => {
      setIsLoading(false)

      if (latitude && longitude && map.current) {
        marker.current = new maplibregl.Marker({
          color: '#3b82f6',
          draggable: true
        })
          .setLngLat([longitude, latitude])
          .addTo(map.current)

        setHasMarker(true)

        marker.current.on('dragend', async () => {
          const lngLat = marker.current?.getLngLat()
          if (lngLat) {
            onLocationSelect({ lat: lngLat.lat, lng: lngLat.lng })
            if (onGeocode) {
              const result = await reverseGeocode(lngLat.lat, lngLat.lng)
              if (result) {
                onGeocode(result)
              }
            }
          }
        })
      }
    })

    map.current.on('click', handleMapClick)

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
      marker.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Track previous coordinates to detect changes
  const prevCoordsRef = useRef<{ lat?: number; lng?: number }>({})

  // Refs for callbacks to avoid effect dependency issues
  const onLocationSelectRef = useRef(onLocationSelect)
  const onGeocodeRef = useRef(onGeocode)
  const reverseGeocodeRef = useRef(reverseGeocode)

  // Keep refs updated
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect
    onGeocodeRef.current = onGeocode
    reverseGeocodeRef.current = reverseGeocode
  }, [onLocationSelect, onGeocode, reverseGeocode])

  // Update marker when external coordinates change
  // IMPORTANT: Only depend on lat/lng/isLoading - not callbacks
  useEffect(() => {
    console.log('[MapPinSelector] Coords effect - latitude:', latitude, 'longitude:', longitude, 'isLoading:', isLoading, 'map exists:', !!map.current)

    if (!map.current || isLoading) {
      console.log('[MapPinSelector] Skipping - map not ready or loading')
      return
    }

    if (latitude && longitude) {
      // Check if coordinates actually changed
      const coordsChanged = prevCoordsRef.current.lat !== latitude || prevCoordsRef.current.lng !== longitude
      console.log('[MapPinSelector] Coords changed:', coordsChanged, 'prev:', prevCoordsRef.current, 'new:', { lat: latitude, lng: longitude })

      if (marker.current) {
        marker.current.setLngLat([longitude, latitude])
      } else {
        marker.current = new maplibregl.Marker({
          color: '#3b82f6',
          draggable: true
        })
          .setLngLat([longitude, latitude])
          .addTo(map.current)

        marker.current.on('dragend', async () => {
          const lngLat = marker.current?.getLngLat()
          if (lngLat) {
            onLocationSelectRef.current({ lat: lngLat.lat, lng: lngLat.lng })
            if (onGeocodeRef.current) {
              const result = await reverseGeocodeRef.current(lngLat.lat, lngLat.lng)
              if (result) {
                onGeocodeRef.current(result)
              }
            }
          }
        })
      }

      setHasMarker(true)

      // Only fly if coordinates actually changed
      if (coordsChanged) {
        console.log('[MapPinSelector] Flying to:', [longitude, latitude])
        map.current.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          duration: 1000
        })
        prevCoordsRef.current = { lat: latitude, lng: longitude }
      }
    }
  }, [latitude, longitude, isLoading]) // Only depend on the values that matter

  return (
    <div
      className={`relative rounded-lg overflow-hidden border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'} ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm font-medium">Loading map...</span>
          </div>
        </div>
      )}

      <div
        ref={mapContainer}
        className="h-full w-full"
        style={{ minHeight: '400px' }}
      />

      {!isLoading && !hasMarker && (
        <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
          <div className="rounded-md bg-white/85 backdrop-blur-sm px-3 py-2 text-center shadow">
            <span className="text-xs font-medium text-slate-600">Click to place pin</span>
          </div>
        </div>
      )}

      {geocodeStatus === 'loading' && (
        <div className="absolute top-3 left-3">
          <div className="rounded-md bg-blue-50 border border-blue-100 px-2 py-1 shadow-sm">
            <span className="text-xs font-medium text-blue-700">Detecting location...</span>
          </div>
        </div>
      )}

      {geocodeStatus === 'success' && hasMarker && (
        <div className="absolute top-3 left-3">
          <div className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1 shadow-sm">
            <span className="text-xs font-medium text-emerald-700">Location detected</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapPinSelector
