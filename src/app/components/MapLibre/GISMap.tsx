'use client'

import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { parcelLoader } from '../../utils/parcelLoader'
import { geocodeLocation, getZoomLevel, type GeocodingResult } from '../../../lib/geocoding'
import { registerGoogleProtocol } from '@/lib/maps/registerGoogleProtocol'
import { getGoogleBasemapStyle } from '@/lib/maps/googleBasemaps'
import { registerRasterDim } from '@/lib/maps/rasterDim'

interface GISMapProps {
 projectId: number
 mode: 'parcel-select' | 'navigation'
 onParcelSelect?: (features: Record<string, unknown>[]) => void
 onParcelClick?: (parcel: Record<string, unknown>) => void
 onMapClick?: (coordinates: { lat: number, lng: number }) => void
 onBoundaryConfirmed?: () => void
 projectLocation?: {
 description: string
 latitude?: number
 longitude?: number
 confidence?: number
 }
 className?: string
}

interface PlanParcel {
 parcel_id: number
 parcel_code: string
 landuse_code: string
 landuse_type: string
 acres_gross: number
 units_total?: number
 area_no?: number
 phase_no?: number
 parcel_no?: number
 confidence: number
 geom?: GeoJSON.Geometry
}

interface PinalParcel {
 PARCELID: string
 OWNERNME1?: string
 SITEADDRESS?: string
 GROSSAC?: number
 CNVYNAME?: string
 USEDSCRP?: string
 geometry?: GeoJSON.Geometry
}

const GISMap: React.FC<GISMapProps> = ({
 projectId,
 mode,
 onParcelSelect,
 onParcelClick,
 onMapClick,
 onBoundaryConfirmed,
 projectLocation,
 className = ''
}) => {
 console.log('🔥 GISMap component rendering...', { mode, projectId })

 const mapContainer = useRef<HTMLDivElement>(null)
 const map = useRef<maplibregl.Map | null>(null)
 const [isLoading, setIsLoading] = useState(true)
 const [selectedParcels, setSelectedParcels] = useState<Set<string>>(new Set())
 const [selectedParcelDetails, setSelectedParcelDetails] = useState<PinalParcel[]>([])
 const [planParcels, setPlanParcels] = useState<PlanParcel[]>([])
 const [mapError, setMapError] = useState<string | null>(null)
 const [loadingParcels, setLoadingParcels] = useState<boolean>(false)
 const [selectionMode, setSelectionMode] = useState<'pan' | 'select'>('pan')
 const selectionModeRef = useRef<'pan' | 'select'>('pan')
 const [geocodingResult, setGeocodingResult] = useState<GeocodingResult | null>(null)

 // Pinal County parcel service configuration
 const PINAL_PARCELS_URL = 'https://rogue.casagrandeaz.gov/arcgis/rest/services/Pinal_County/Pinal_County_Parcels/MapServer/0'

 // Geocode project location if provided
 useEffect(() => {
 const handleGeocode = async () => {
 if (projectLocation?.description && !projectLocation.latitude) {
 console.log('🌍 Geocoding project location:', projectLocation.description)
 try {
 const result = await geocodeLocation(projectLocation.description)
 if (result) {
 console.log('✅ Geocoding successful:', result)
 setGeocodingResult(result)
 } else {
 console.log('❌ Geocoding failed for:', projectLocation.description)
 }
 } catch (error) {
 console.error('Error geocoding location:', error)
 }
 } else if (projectLocation?.latitude && projectLocation?.longitude) {
 // Use provided coordinates directly
 setGeocodingResult({
 latitude: projectLocation.latitude,
 longitude: projectLocation.longitude,
 confidence: projectLocation.confidence || 0.8,
 source: 'manual'
 })
 }
 }

 handleGeocode()
 }, [projectLocation])

 // Recenter map once geocoding resolves
 useEffect(() => {
 if (!map.current || !geocodingResult) return
 map.current.setCenter([geocodingResult.longitude, geocodingResult.latitude])
 map.current.setZoom(getZoomLevel(geocodingResult))
 }, [geocodingResult])

 // Dissolve parcel boundaries into a single boundary (simplified client-side approach)
 const dissolveParcelBoundaries = async (parcels: PinalParcel[]): Promise<GeoJSON.Geometry | null> => {
 try {
 // For now, create a simple bounding box that encompasses all parcels
 // In a full implementation, you'd use a proper geometry library like Turf.js

 let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity

 parcels.forEach(parcel => {
 if (parcel.geometry?.type === 'Polygon') {
 const coords = parcel.geometry.coordinates[0]
 coords.forEach(coord => {
 const [lng, lat] = coord
 minLng = Math.min(minLng, lng)
 maxLng = Math.max(maxLng, lng)
 minLat = Math.min(minLat, lat)
 maxLat = Math.max(maxLat, lat)
 })
 }
 })

 // Create a bounding rectangle
 const boundingBox: GeoJSON.Polygon = {
 type: 'Polygon',
 coordinates: [[
 [minLng, minLat],
 [maxLng, minLat],
 [maxLng, maxLat],
 [minLng, maxLat],
 [minLng, minLat]
 ]]
 }

 return boundingBox
 } catch (error) {
 console.error('Error dissolving boundaries:', error)
 return null
 }
 }

 // Land use color mapping
 const getLandUseColor = (landUseCode: string, confidence: number): string => {
 const colors: Record<string, string> = {
 'SFR': '#2ECC71', // Single Family Residential - Green
 'MFR': '#F39C12', // Multi Family Residential - Orange
 'COM': '#E74C3C', // Commercial - Red
 'IND': '#9B59B6', // Industrial - Purple
 'OS': '#27AE60', // Open Space - Dark Green
 'PUB': '#3498DB', // Public - Blue
 'MU': '#F1C40F', // Mixed Use - Yellow
 'AGR': '#8B4513', // Agricultural - Brown
 'VAC': '#BDC3C7' // Vacant - Light Gray
 }

 const baseColor = colors[landUseCode] || '#95A5A6' // Default gray

 // Adjust opacity based on AI confidence
 const opacity = Math.max(0.3, confidence)

 return `${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`
 }

 // Initialize map with container ready check
 useEffect(() => {
 console.log('🎯 useEffect running...', { mode, projectId })
 let cleanupRasterDim: (() => void) | null = null

 const createMap = () => {
 try {
 registerGoogleProtocol()
 const hasProjectCoords = Number.isFinite(projectLocation?.latitude) && Number.isFinite(projectLocation?.longitude)
 const initialCenter: [number, number] = hasProjectCoords
 ? [projectLocation!.longitude as number, projectLocation!.latitude as number]
 : geocodingResult
 ? [geocodingResult.longitude, geocodingResult.latitude]
 : [-111.927912, 33.028911] // Default: Anderson Road & Farrell Road intersection
 const initialZoom = hasProjectCoords
 ? 14
 : geocodingResult
 ? getZoomLevel(geocodingResult)
 : 13 // Default zoom level
 map.current = new maplibregl.Map({
 container: mapContainer.current!,
 style: getGoogleBasemapStyle('hybrid'),
 center: initialCenter,
 zoom: initialZoom
 })

 cleanupRasterDim = registerRasterDim(map.current, 0.1)

 // Map instance created, waiting for load event

 map.current.on('load', () => {
 document.title ="MAP LOADED -" + mode +" -" + new Date().getTime()
 setIsLoading(false)
 if (mode === 'parcel-select') {
 document.title ="SETTING UP PARCEL SELECT -" + new Date().getTime()
 setTimeout(() => {
 setupParcelSelectMode()
 }, 500) // Small delay to ensure map is fully loaded
 } else if (mode === 'navigation') {
 setupNavigationMode()
 }
 })

 map.current.on('error', (e) => {
 setMapError('Failed to load map')
 setIsLoading(false)
 })

 map.current.on('styledata', () => {
 // Style loaded
 })

 map.current.on('sourcedata', (e) => {
 // Source data event
 })

 } catch (error) {
 setMapError('Failed to initialize map')
 setIsLoading(false)
 }
 }

 const initMap = () => {
 if (!mapContainer.current || map.current) {
 return false
 }

 createMap()
 return true
 }

 // Try immediately, if container not ready try again after a delay
 if (!initMap()) {
 const timeoutId = setTimeout(() => {
 initMap()
 }, 100)

 return () => clearTimeout(timeoutId)
 }

 return () => {
 if (map.current) {
 cleanupRasterDim?.()
 map.current.remove()
 map.current = null
 }
 }
 }, [mode, geocodingResult])

 // Setup parcel selection mode for Pinal County tax parcels
 const setupParcelSelectMode = async () => {
 if (!map.current) {
 return
 }

 try {
 // Setting up Pinal County parcel selection mode

 // Load parcel data first
 console.log('📦 LOADING PARCELS FOR SELECTION MODE')
 await loadParcelsForView()

 // Try the working debug page approach - add source and layer differently
 if (!map.current) return
 if (!map.current.getLayer('tax-parcels-stroke')) {
 console.log('🎨 ADDING TAX PARCEL LAYERS')
 document.title ="ADDING STROKE LAYER -" + new Date().getTime()

 // Add simple parcel boundary styling - no fill, just 1pt black lines
 try {
 // Tax parcel boundary lines only - no fill
 // Add AFTER plan parcels to ensure they appear on top
 const addTaxParcelLayer = () => {
 // Add parcel fill layer (for selection)
 map.current!.addLayer({
 id: 'tax-parcels-fill',
 type: 'fill',
 source: 'pinal-parcels',
 layout: {
 'visibility': 'visible'
 },
 paint: {
 'fill-color': 'transparent', // Invisible fill for clicking
 'fill-opacity': 0
 },
 minzoom: 0,
 maxzoom: 24
 })

 // Add selected parcel fill layer
 map.current!.addLayer({
 id: 'tax-parcels-selected-fill',
 type: 'fill',
 source: 'pinal-parcels',
 layout: {
 'visibility': 'visible'
 },
 paint: {
 'fill-color': '#00FF00', // Green for selected
 'fill-opacity': 0.3
 },
 filter: ['in', 'grossac', ''], // Start with empty filter
 minzoom: 0,
 maxzoom: 24
 })

 // Add main parcel stroke layer (on top)
 map.current!.addLayer({
 id: 'tax-parcels-stroke',
 type: 'line',
 source: 'pinal-parcels',
 layout: {
 'line-join': 'round',
 'line-cap': 'round',
 'visibility': 'visible' // Force visibility
 },
 paint: {
 'line-color': '#FF0000', // Simple solid red - no conditional logic
 'line-width': 2, // Medium lines for visibility
 'line-opacity': 0.8
 },
 minzoom: 0, // Always visible regardless of zoom
 maxzoom: 24
 })

 // Add selected parcel highlight stroke
 map.current!.addLayer({
 id: 'tax-parcels-selected-stroke',
 type: 'line',
 source: 'pinal-parcels',
 layout: {
 'line-join': 'round',
 'line-cap': 'round',
 'visibility': 'visible'
 },
 paint: {
 'line-color': '#00FF00', // Green for selected
 'line-width': 4, // Thicker for selection
 'line-opacity': 1.0
 },
 filter: ['in', 'grossac', ''], // Start with empty filter
 minzoom: 0,
 maxzoom: 24
 })

 // Force layer visibility after adding
 setTimeout(() => {
 if (map.current?.getLayer('tax-parcels-stroke')) {
 map.current.setLayoutProperty('tax-parcels-stroke', 'visibility', 'visible')
 map.current.setPaintProperty('tax-parcels-stroke', 'line-color', '#FF0000')
 map.current.setPaintProperty('tax-parcels-stroke', 'line-width', 3)
 map.current.setPaintProperty('tax-parcels-stroke', 'line-opacity', 1.0)
 document.title = `FORCED LAYER VISIBILITY - ${new Date().getTime()}`
 }
 }, 100)
 }

 // Always add tax parcel layer - it will appear on top regardless
 addTaxParcelLayer()

 // Store function to re-add tax parcels after plan parcels are loaded
 ;(window as any).refreshTaxParcelsOnTop = addTaxParcelLayer

 document.title ="LAYERS ADDED SUCCESSFULLY -" + new Date().getTime()

 // Expose map to global window for debugging
 ;(window as any).debugMap = map.current

 // Log layer and source info for debugging
 setTimeout(() => {
 if (map.current) {
 const source = map.current.getSource('pinal-parcels') as any
 const layers = map.current.getStyle().layers
 document.title = `LAYERS: ${layers?.length || 0}, SOURCE: ${source ? 'EXISTS' : 'MISSING'} - ${new Date().getTime()}`
 }
 }, 500)

 } catch (error) {
 document.title ="LAYER ADD ERROR -" + new Date().getTime()
 }

 // Tax parcel layers added successfully

 // Add click handler for parcel selection - ensure this runs after layers are added
 const addClickHandler = () => {
 console.log('🎯 ADDING CLICK HANDLER TO MAP')
 document.title = `ADDING CLICK HANDLER - ${new Date().getTime()}`

 map.current!.on('click', (e) => {
 console.log('🖱️ MAP CLICKED! Mode:', selectionModeRef.current, 'Position:', e.lngLat)
 document.title = `MAP CLICKED - MODE: ${selectionModeRef.current} - ${new Date().getTime()}`

 // Always call onMapClick if provided for reverse geocoding
 if (onMapClick) {
 onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng })
 }

 // Only handle parcel selection clicks in selection mode
 if (selectionModeRef.current !== 'select') {
 console.log('❌ Not in select mode, ignoring parcel selection')
 return
 }

 document.title = `CLICK DETECTED AT [${e.lngLat.lng.toFixed(4)}, ${e.lngLat.lat.toFixed(4)}] - ${new Date().getTime()}`

 // Query all features at the click point (use fill layer for better selection)
 const features = map.current!.queryRenderedFeatures(e.point, {
 layers: ['tax-parcels-fill']
 })

 console.log('🔍 FEATURES FOUND:', features.length)
 if (features.length > 0) {
 console.log('🎯 FIRST FEATURE:', features[0])
 console.log('🎯 FIRST FEATURE PROPERTIES:', features[0].properties)
 console.log('🎯 FIRST FEATURE LAYER:', features[0].layer)
 }

 // Also try querying ALL layers to see what's available
 const allFeatures = map.current!.queryRenderedFeatures(e.point)
 console.log('🌐 ALL FEATURES AT CLICK:', allFeatures.length, allFeatures.map(f => ({ layer: f.layer?.id, props: f.properties })))

 // Try querying the stroke layer instead
 const strokeFeatures = map.current!.queryRenderedFeatures(e.point, {
 layers: ['tax-parcels-stroke']
 })
 console.log('📏 STROKE LAYER FEATURES:', strokeFeatures.length)
 if (strokeFeatures.length > 0) {
 console.log('📏 STROKE FEATURE PROPERTIES:', strokeFeatures[0].properties)
 }

 document.title = `FOUND ${features.length} FEATURES AT CLICK - ${new Date().getTime()}`

 if (features.length === 0) {
 document.title = `NO FEATURES AT CLICK POINT - ${new Date().getTime()}`
 return
 }

 // Try to get feature with properties - check fill layer first, then stroke layer
 let feature = features[0]
 if (!feature?.properties && strokeFeatures.length > 0) {
 console.log('🔄 Using stroke layer feature instead of fill layer')
 feature = strokeFeatures[0]
 }

 // Create unique identifier using grossac + owner name since grossac alone is not unique
 console.log('🔧 DEBUG: feature.properties.grossac =', feature.properties?.grossac)
 console.log('🔧 DEBUG: grossac TYPE =', typeof feature.properties?.grossac)
 console.log('🔧 DEBUG: feature.properties.ownernme1 =', feature.properties?.ownernme1)

 // Use APN (Assessor Parcel Number) as unique identifier
 const parcelId = feature.properties?.parcelid
 console.log('🔧 DEBUG: parcelId (APN) =', parcelId)

 console.log('🏷️ PARCEL ID FROM FEATURE:', parcelId)
 console.log('🏷️ ALL FEATURE PROPERTIES:', feature.properties)
 console.log('🔑 AVAILABLE PROPERTY KEYS:', Object.keys(feature.properties || {}))

 document.title = `CLICKED PARCEL: ${parcelId || 'NO_ID'} - ${new Date().getTime()}`

 if (parcelId) {
 try {
 const isSelected = selectedParcels.has(parcelId)
 const newSelected = new Set(selectedParcels)

 if (isSelected) {
 newSelected.delete(parcelId)
 } else {
 newSelected.add(parcelId)
 }

 // Update selection layer filters to show selected parcels
 const selectedArray = Array.from(newSelected)
 console.log('🎨 UPDATING SELECTION FILTERS:', selectedArray)
 console.log('🎨 FILTER ARRAY TYPES:', selectedArray.map(id => typeof id))

 if (selectedArray.length > 0) {
 console.log('✅ Setting selection filters for parcels:', selectedArray)

 // Use APN-based filter for unique identification
 const filter = selectedArray.length === 1
 ? ['==', 'parcelid', selectedArray[0]]
 : ['in', 'parcelid', ...selectedArray]

 console.log('🎯 APN FILTER:', filter)
 map.current?.setFilter('tax-parcels-selected-fill', filter)
 map.current?.setFilter('tax-parcels-selected-stroke', filter)
 } else {
 console.log('❌ Clearing selection filters')
 map.current?.setFilter('tax-parcels-selected-fill', ['in', 'parcelid', ''])
 map.current?.setFilter('tax-parcels-selected-stroke', ['in', 'parcelid', ''])
 }

 // Update selected parcel details for UI display
 const sourceData = (map.current?.getSource('pinal-parcels') as maplibregl.GeoJSONSource)?._data
 const selectedDetails: PinalParcel[] = []

 if (sourceData && 'features' in sourceData) {
 Array.from(newSelected).forEach(selectedParcelId => {
 console.log('🔍 LOOKING FOR APN:', selectedParcelId)

 const selectedFeature = sourceData.features.find(f =>
 f.properties?.parcelid === selectedParcelId
 )
 console.log('🎯 FOUND FEATURE FOR LOOKUP:', selectedFeature?.properties)
 if (selectedFeature?.properties) {
 const parcelDetail = {
 PARCELID: selectedFeature.properties.parcelid, // Use actual APN
 OWNERNME1: selectedFeature.properties.ownernme1,
 SITEADDRESS: selectedFeature.properties.siteaddres, // Corrected field name
 GROSSAC: selectedFeature.properties.grossac,
 geometry: selectedFeature.geometry
 }
 console.log('📦 ADDING PARCEL DETAIL:', parcelDetail)
 selectedDetails.push(parcelDetail)
 }
 })
 }

 setSelectedParcels(newSelected)
 setSelectedParcelDetails(selectedDetails)

 console.log('✅ SELECTION STATE UPDATED')
 console.log('📊 Selected parcels count:', selectedArray.length)
 console.log('📊 Selected parcel details:', selectedDetails)

 document.title = `PARCEL ${isSelected ? 'DESELECTED' : 'SELECTED'}: ${parcelId} (${selectedArray.length} total) - ${new Date().getTime()}`

 if (onParcelSelect) {
 const selectedFeatures = selectedDetails.map(detail => ({
 parcelId: detail.PARCELID,
 geom: detail.geometry,
 attributes: detail,
 properties: detail
 }))
 onParcelSelect(selectedFeatures)
 }
 } catch (error) {
 document.title ="SELECTION ERROR:" + (error as Error).message
 }
 }
 })

 // Also add hover effects - only in selection mode
 map.current!.on('mouseenter', 'tax-parcels-fill', (e) => {
 if (selectionModeRef.current === 'select') {
 map.current!.getCanvas().style.cursor = 'pointer'
 }
 if (e.features && e.features[0]) {
 const parcelId = e.features[0].properties?.PARCELID
 document.title = `HOVER: ${parcelId || 'NO_ID'} - ${new Date().getTime()}`
 }
 })

 map.current!.on('mouseleave', 'tax-parcels-fill', () => {
 if (selectionModeRef.current === 'select') {
 map.current!.getCanvas().style.cursor = 'crosshair'
 } else {
 map.current!.getCanvas().style.cursor = ''
 }
 })
 }

 // Add click handler after a small delay to ensure layers are ready
 setTimeout(addClickHandler, 500)

 // Add map event handlers for dynamic parcel loading
 const addMapEventHandlers = () => {
 if (!map.current) {
 document.title ="ERROR: No map for event handlers -" + new Date().getTime()
 return
 }

 // Add a throttled reload function
 let reloadTimeout: NodeJS.Timeout | null = null
 const throttledReload = () => {
 if (reloadTimeout) {
 clearTimeout(reloadTimeout)
 }
 reloadTimeout = setTimeout(() => {
 loadParcelsForView()
 }, 500) // 500ms delay to prevent too many calls
 }

 // Reload parcels when map view changes
 map.current.on('moveend', () => {
 document.title ="MAP MOVED - WILL RELOAD PARCELS -" + new Date().getTime()
 throttledReload()
 })

 // Also reload on zoom end
 map.current.on('zoomend', () => {
 document.title ="MAP ZOOMED - WILL RELOAD PARCELS -" + new Date().getTime()
 throttledReload()
 })

 document.title ="MAP EVENT HANDLERS ADDED SUCCESSFULLY -" + new Date().getTime()
 }

 // Add event handlers after layers are ready
 setTimeout(addMapEventHandlers, 1500)
 }

 } catch (error) {
 console.error('Error setting up Pinal County parcel mode:', error)
 setMapError('Failed to load Pinal County parcel data')
 }
 }

 // Load parcels from local data for current map view
 const loadParcelsForView = async () => {
 try {
 if (!map.current) {
 document.title ="ERROR: No map instance -" + new Date().getTime()
 return
 }

 if (loadingParcels) {
 document.title ="PARCELS ALREADY LOADING - SKIPPING -" + new Date().getTime()
 return
 }

 setLoadingParcels(true)

 // Load parcels at zoom level 10+ (less restrictive)
 const currentZoom = map.current.getZoom()
 if (currentZoom < 10) {
 document.title = `ZOOM TOO LOW - ZOOM: ${currentZoom.toFixed(1)} - PARCELS HIDDEN - ${new Date().getTime()}`

 // Clear existing parcels at low zoom
 if (map.current.getSource('pinal-parcels')) {
 (map.current.getSource('pinal-parcels') as maplibregl.GeoJSONSource).setData({
 type: 'FeatureCollection',
 features: []
 })
 }
 setLoadingParcels(false)
 return
 }

 // Get current map bounds
 const bounds = map.current.getBounds()
 const sw = bounds.getSouthWest()
 const ne = bounds.getNorthEast()

 document.title = `LOADING LOCAL PARCELS - ZOOM: ${currentZoom.toFixed(1)} - ${new Date().getTime()}`

 // Use local parcel loader for much faster performance
 const visibleFeatures = await parcelLoader.getParcelsForMapView({
 sw: { lng: sw.lng, lat: sw.lat },
 ne: { lng: ne.lng, lat: ne.lat }
 })

 document.title = `LOADED ${visibleFeatures.length} LOCAL PARCELS - ${new Date().getTime()}`

 if (visibleFeatures && visibleFeatures.length > 0) {
 // Add explicit IDs to features for MapLibre selection
 visibleFeatures.forEach((feature: any, index: number) => {
 feature.id = index + 1
 })

 // Create source with filtered visible parcels
 const filteredData = {
 type: 'FeatureCollection',
 features: visibleFeatures
 }

 // Debug: Show sample grossac values and their types
 const sampleGrossacs = visibleFeatures.slice(0, 5).map(f => ({
 value: f.properties?.grossac,
 type: typeof f.properties?.grossac
 }))
 console.log('🏗️ SAMPLE GROSSAC VALUES:', sampleGrossacs)

 if (!map.current.getSource('pinal-parcels')) {
 map.current.addSource('pinal-parcels', {
 type: 'geojson',
 data: filteredData
 })
 document.title = `SOURCE CREATED WITH ${visibleFeatures.length} LOCAL PARCELS - ${new Date().getTime()}`
 } else {
 (map.current.getSource('pinal-parcels') as maplibregl.GeoJSONSource).setData(filteredData)
 document.title = `SOURCE UPDATED WITH ${visibleFeatures.length} LOCAL PARCELS - ${new Date().getTime()}`
 }

 // Force layer refresh and visibility after data update
 setTimeout(() => {
 if (map.current?.getLayer('tax-parcels-stroke')) {
 // Force layer visibility and styling
 map.current.setLayoutProperty('tax-parcels-stroke', 'visibility', 'visible')
 map.current.setPaintProperty('tax-parcels-stroke', 'line-color', '#FF0000')
 map.current.setPaintProperty('tax-parcels-stroke', 'line-width', 2)
 map.current.setPaintProperty('tax-parcels-stroke', 'line-opacity', 0.8)

 // Also refresh selection layer
 if (map.current.getLayer('tax-parcels-selected')) {
 map.current.setLayoutProperty('tax-parcels-selected', 'visibility', 'visible')
 map.current.setPaintProperty('tax-parcels-selected', 'line-color', '#00FF00')
 map.current.setPaintProperty('tax-parcels-selected', 'line-width', 4)
 }

 // Force map repaint
 map.current.triggerRepaint()
 document.title = `LAYER REFRESHED & REPAINTED - ${visibleFeatures.length} PARCELS - ${new Date().getTime()}`
 }
 }, 300)
 } else {
 document.title = `NO PARCELS FOUND IN CURRENT VIEW - ${new Date().getTime()}`

 // Create empty data source to prevent errors
 if (!map.current.getSource('pinal-parcels')) {
 map.current.addSource('pinal-parcels', {
 type: 'geojson',
 data: {
 type: 'FeatureCollection',
 features: []
 }
 })
 } else {
 (map.current.getSource('pinal-parcels') as maplibregl.GeoJSONSource).setData({
 type: 'FeatureCollection',
 features: []
 })
 }
 }

 } catch (error) {
 document.title ="LOADPARCELS ERROR:" + (error as Error).message +" -" + new Date().getTime()
 } finally {
 setLoadingParcels(false)
 }
 }

 // Setup navigation mode for plan parcels
 const setupNavigationMode = async () => {
 if (!map.current) return

 try {
 // Fetch plan parcels from API
 const response = await fetch(`/api/gis/plan-parcels?project_id=${projectId}&format=geojson&include_geometry=true`)

 if (!response.ok) {
 throw new Error('Failed to fetch plan parcels')
 }

 const data = await response.json()

 if (data.features && data.features.length > 0) {
 // Add plan parcels source
 map.current.addSource('plan-parcels', {
 type: 'geojson',
 data: data
 })

 // Add plan parcels fill layer with land use colors
 map.current.addLayer({
 id: 'plan-parcels-fill',
 type: 'fill',
 source: 'plan-parcels',
 paint: {
 'fill-color': [
 'case',
 ['has', 'landuse_code'],
 [
 'match',
 ['get', 'landuse_code'],
 'SFR', '#2ECC71',
 'MFR', '#F39C12',
 'COM', '#E74C3C',
 'IND', '#9B59B6',
 'OS', '#27AE60',
 'PUB', '#3498DB',
 'MU', '#F1C40F',
 'AGR', '#8B4513',
 'VAC', '#BDC3C7',
 '#95A5A6' // Default
 ],
 '#95A5A6'
 ],
 'fill-opacity': [
 'case',
 ['has', 'confidence'],
 ['*', ['get', 'confidence'], 0.8],
 0.6
 ]
 }
 })

 // Add plan parcels stroke layer
 map.current.addLayer({
 id: 'plan-parcels-stroke',
 type: 'line',
 source: 'plan-parcels',
 paint: {
 'line-color': '#1E293B',
 'line-width': 2
 }
 })

 // Add parcel labels
 map.current.addLayer({
 id: 'plan-parcels-labels',
 type: 'symbol',
 source: 'plan-parcels',
 layout: {
 'text-field': ['get', 'parcel_code'],
 'text-font': ['Open Sans Regular'],
 'text-size': 12,
 'text-anchor': 'center'
 },
 paint: {
 'text-color': '#FFFFFF',
 'text-halo-color': '#000000',
 'text-halo-width': 1
 }
 })

 // Refresh tax parcels to appear on top
 const refreshFunction = (window as any).refreshTaxParcelsOnTop
 if (refreshFunction && map.current.getLayer('tax-parcels-stroke')) {
 map.current.removeLayer('tax-parcels-stroke')
 refreshFunction()
 }

 // Add click handler for plan parcels
 map.current.on('click', 'plan-parcels-fill', (e) => {
 if (!e.features || !onParcelClick) return

 const feature = e.features[0]
 const parcelData = {
 parcel_id: feature.properties?.parcel_id,
 parcel_code: feature.properties?.parcel_code,
 landuse_code: feature.properties?.landuse_code,
 landuse_type: feature.properties?.landuse_type,
 acres_gross: feature.properties?.acres_gross,
 units_total: feature.properties?.units_total,
 area_no: feature.properties?.area_no,
 phase_no: feature.properties?.phase_no,
 parcel_no: feature.properties?.parcel_no,
 confidence: feature.properties?.confidence,
 source_doc: feature.properties?.source_doc
 }

 onParcelClick(parcelData)
 })

 // Change cursor on hover
 map.current.on('mouseenter', 'plan-parcels-fill', () => {
 if (map.current) map.current.getCanvas().style.cursor = 'pointer'
 })

 map.current.on('mouseleave', 'plan-parcels-fill', () => {
 if (map.current) map.current.getCanvas().style.cursor = ''
 })

 // Fit map to plan parcels bounds
 const bounds = new maplibregl.LngLatBounds()
 data.features.forEach((feature: { geometry: { type: string; coordinates: number[][][] } }) => {
 if (feature.geometry.type === 'Polygon') {
 feature.geometry.coordinates[0].forEach((coord: number[]) => {
 if (coord.length >= 2) {
 bounds.extend([coord[0], coord[1]] as [number, number])
 }
 })
 }
 })

 if (!bounds.isEmpty()) {
 map.current.fitBounds(bounds, { padding: 50 })
 }
 }

 // Also load local tax parcels in navigation mode for context
 await loadParcelsForView()

 // Add tax parcel layers if they don't exist yet
 if (!map.current.getLayer('tax-parcels-stroke')) {
 // Add tax parcel boundary lines
 map.current.addLayer({
 id: 'tax-parcels-stroke',
 type: 'line',
 source: 'pinal-parcels',
 layout: {
 'line-join': 'round',
 'line-cap': 'round',
 'visibility': 'visible'
 },
 paint: {
 'line-color': '#FF0000',
 'line-width': 1,
 'line-opacity': 0.5
 }
 })
 }

 } catch (error) {
 console.error('Error setting up navigation mode:', error)
 setMapError('Failed to load plan parcel data')
 }
 }

 if (mapError) {
 return (
 <div className={`flex items-center justify-center bg-body text-body ${className}`}>
 <div className="text-center">
 <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 <p className="text-red-300">{mapError}</p>
 </div>
 </div>
 )
 }

 return (
 <div className={`relative ${className}`} style={{ backgroundColor: 'var(--cui-body-bg)', height: '100%' }}>
 {isLoading && (
 <div className="absolute inset-0 bg-body flex items-center justify-center z-10">
 <div className="flex items-center gap-3 text-body">
 <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
 <span>Loading map...</span>
 </div>
 </div>
 )}

 <div
 ref={mapContainer}
 className="w-full h-full"
 style={{ height: '100%' }}
 />

 {/* Mode Toggle Toolbar for parcel-select mode */}
 {mode === 'parcel-select' && (
 <div className="absolute top-4 right-4 bg-body border border rounded-lg p-2 shadow-lg">
 <div className="flex gap-1">
 <button
 onClick={() => {
 console.log('🖐️ Pan mode selected')
 setSelectionMode('pan')
 selectionModeRef.current = 'pan'
 if (map.current) {
 map.current.getCanvas().style.cursor = ''
 }
 }}
 className={`px-3 py-2 text-xs rounded flex items-center gap-2 ${
 selectionMode === 'pan'
 ? 'bg-blue-600 text-body'
 : 'bg-body text-body-tertiary hover:bg-body'
 }`}
 title="Pan Mode - Navigate the map"
 >
 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
 <path d="M10 3L3 10l7 7 7-7-7-7zM10 1l9 9-9 9-9-9 9-9z"/>
 </svg>
 Pan
 </button>
 <button
 onClick={() => {
 console.log('🎯 Select mode activated')
 setSelectionMode('select')
 selectionModeRef.current = 'select'
 if (map.current) {
 map.current.getCanvas().style.cursor = 'crosshair'
 }
 }}
 className={`px-3 py-2 text-xs rounded flex items-center gap-2 ${
 selectionMode === 'select'
 ? 'bg-blue-600 text-body'
 : 'bg-body text-body-tertiary hover:bg-body'
 }`}
 title="Select Mode - Click to select parcels"
 >
 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
 <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
 </svg>
 Select
 </button>
 </div>
 </div>
 )}

 {mode === 'parcel-select' && selectedParcels.size > 0 && (
 <div className="absolute top-4 left-4 bg-body border border rounded-lg p-4 shadow-lg max-w-sm">
 <div className="text-body space-y-3">
 {/* Header */}
 <div className="border-b border pb-2">
 <h3 className="font-semibold text-lg">Selected Parcels</h3>
 <p className="text-sm text-body-tertiary">
 {selectedParcels.size} parcel{selectedParcels.size !== 1 ? 's' : ''} selected
 </p>
 </div>

 {/* Summary */}
 <div className="space-y-2">
 <div className="flex justify-between">
 <span className="text-sm text-body-tertiary">Total Area:</span>
 <span className="text-sm font-medium">
 {selectedParcelDetails.reduce((total, parcel) => total + (parcel.GROSSAC || 0), 0).toFixed(2)} acres
 </span>
 </div>
 </div>

 {/* Parcel List */}
 <div className="max-h-40 overflow-y-auto space-y-1">
 {selectedParcelDetails.map((parcel, index) => (
 <div key={parcel.PARCELID} className="text-xs bg-body rounded p-2">
 <div className="font-medium">Parcel {parcel.PARCELID}</div>
 <div className="text-body-tertiary">
 {parcel.GROSSAC ? `${parcel.GROSSAC.toFixed(2)} acres` : 'No acreage data'}
 </div>
 {parcel.OWNERNME1 && (
 <div className="text-body-tertiary truncate">{parcel.OWNERNME1}</div>
 )}
 </div>
 ))}
 </div>

 {/* Actions */}
 <div className="pt-2 border-t border">
 <button
 onClick={() => {
 // Clear selection
 setSelectedParcels(new Set())
 setSelectedParcelDetails([])
 map.current?.setFilter('tax-parcels-selected-fill', ['in', 'grossac', ''])
 map.current?.setFilter('tax-parcels-selected-stroke', ['in', 'grossac', ''])
 // Clear parcel selection in parent component
 if (onParcelSelect) {
 onParcelSelect([])
 }
 }}
 className="w-full px-3 py-2 text-xs bg-body hover:bg-body rounded text-body"
 >
 Clear Selection
 </button>
 </div>
 </div>
 </div>
 )}

 {mode === 'navigation' && (
 <div className="absolute bottom-4 left-4 bg-body border border rounded-lg p-3 shadow-lg">
 <div className="text-body text-sm space-y-1">
 <div className="font-medium">Legend:</div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2ECC71' }}></div>
 <span>Single Family Residential</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F39C12' }}></div>
 <span>Multi Family Residential</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded" style={{ backgroundColor: '#E74C3C' }}></div>
 <span>Commercial</span>
 </div>
 <div className="text-xs text-body-tertiary mt-2">
 Opacity indicates AI confidence level
 </div>
 </div>
 </div>
 )}

 {/* Debug Button */}
 <div className="absolute bottom-4 right-4">
 <button
 onClick={() => {
 if (!map.current) {
 alert('No map instance')
 return
 }

 try {
 const source = map.current.getSource('pinal-parcels') as any
 const layers = map.current.getStyle().layers
 const sourceData = source?._data
 const layerIds = layers?.map((l: any) => l.id) || []
 const features = map.current.querySourceFeatures('pinal-parcels')

 const debugInfo = `
DEBUG INFO:
- Total layers: ${layers?.length || 0}
- Layer IDs: ${layerIds.join(', ')}
- Source exists: ${source ? 'YES' : 'NO'}
- Source has data: ${sourceData?.features?.length || 0} features
- Features queryable: ${features?.length || 0}
- Fill layer visible: ${map.current.getLayoutProperty('tax-parcels-fill', 'visibility') || 'default'}
- Stroke layer visible: ${map.current.getLayoutProperty('tax-parcels-stroke', 'visibility') || 'default'}
- Selected parcels: ${selectedParcels.size}
 `.trim()

 alert(debugInfo)
 } catch (error) {
 alert('Debug error: ' + (error as Error).message)
 }
 }}
 className="px-3 py-2 text-sm bg-blue-600 text-body rounded hover:bg-blue-700 shadow-lg"
 >
 🐛 Debug Map
 </button>
 </div>
 </div>
 )
}

export default GISMap
