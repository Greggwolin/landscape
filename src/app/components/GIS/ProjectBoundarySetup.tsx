'use client'

import React, { useState } from 'react'
import GISMap from '../MapLibre/GISMap'
import { reverseGeocode, type ReverseGeocodingResult } from '../../../lib/geocoding'

interface ProjectBoundarySetupProps {
  projectId: number
  onBoundaryConfirmed: (boundaryData: BoundaryData) => void
  onCancel?: () => void
  extractedData?: {
    project_location?: {
      addresses: string[]
      coordinates?: { latitude: number; longitude: number }
      legal_descriptions: string[]
    }
    total_acres?: number
    parcel_data?: Array<{
      parcel_id: string
      acres: number
      land_use?: string
    }>
  }
}

interface TaxParcel {
  PARCELID: string
  OWNERNME1?: string
  SITEADDRESS?: string
  GROSSAC?: number
  CNVYNAME?: string
  USEDSCRP?: string
  APPRAISEDVALUE?: number
  MARKETVALUE?: number
  geometry?: GeoJSON.Geometry
  properties?: Record<string, any>
}

interface BoundaryData {
  selectedParcels: TaxParcel[]
  totalAcres: number
  dissolvedBoundary?: GeoJSON.Geometry
  boundaryCenter?: [number, number]
  projectData: {
    estimatedAcres?: number
    county?: string
    city?: string
    totalValue?: number
  }
}

// Helper function to extract city from address
const extractCityFromAddress = (address?: string): string => {
  if (!address) return ''

  // Try to extract city from address pattern like "123 Main St, Phoenix, AZ 85001"
  const parts = address.split(',')
  if (parts.length >= 2) {
    const cityPart = parts[1].trim()
    // Remove state and zip code if present
    return cityPart.split(' ')[0] || ''
  }

  // Fallback: look for common Arizona cities in the address
  const arizonaCities = ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale', 'Gilbert', 'Tempe', 'Peoria', 'Surprise', 'Yuma', 'Avondale', 'Flagstaff', 'Goodyear', 'Buckeye', 'Lake Havasu City', 'Casa Grande', 'Sierra Vista', 'Maricopa', 'Oro Valley', 'Prescott', 'Bullhead City', 'Prescott Valley', 'Apache Junction', 'Marana', 'Fountain Hills', 'Kingman', 'Nogales', 'Sahuarita', 'Eloy', 'Payson', 'Sedona', 'Show Low', 'Somerton', 'El Mirage', 'Paradise Valley', 'Tolleson', 'Cottonwood', 'Cave Creek', 'Chino Valley', 'Litchfield Park', 'Globe', 'San Luis', 'Wickenburg', 'Page', 'Carefree']

  for (const city of arizonaCities) {
    if (address.toUpperCase().includes(city.toUpperCase())) {
      return city
    }
  }

  return ''
}

export default function ProjectBoundarySetup({
  projectId,
  onBoundaryConfirmed,
  onCancel,
  extractedData
}: ProjectBoundarySetupProps) {
  const [selectedParcels, setSelectedParcels] = useState<TaxParcel[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string>('')
  const [mapLocation, setMapLocation] = useState<ReverseGeocodingResult | null>(null)

  const handleParcelSelect = (features: Record<string, unknown>[]) => {
    console.log('🔍 Raw features received:', features)

    const parcels = features.map(feature => {
      // The data is nested in properties or attributes - let's extract it properly
      const props = (feature.properties || feature.attributes || feature) as Record<string, any>

      console.log('📊 Processing feature:', feature)
      console.log('📊 Properties:', props)

      const parcel = {
        PARCELID: props.PARCELID || props.parcelid || '',
        OWNERNME1: props.OWNERNME1 || props.ownernme1 || '',
        SITEADDRESS: props.SITEADDRESS || props.siteaddres || '',
        GROSSAC: props.GROSSAC || props.grossac || 0,
        CNVYNAME: props.CNVYNAME || props.cnvyname || '',
        USEDSCRP: props.USEDSCRP || props.usedscrp || '',
        APPRAISEDVALUE: props.APPRAISEDVALUE || props.appraisedvalue || 0,
        MARKETVALUE: props.MARKETVALUE || props.marketvalue || 0,
        geometry: feature.geometry as GeoJSON.Geometry,
        properties: props
      }

      console.log('✅ Mapped parcel:', parcel)
      return parcel
    })

    console.log('🎯 Final parcels array:', parcels)
    setSelectedParcels(parcels)
    setValidationError('')
  }

  // Capture map location for reverse geocoding
  const handleMapClick = async (coordinates: { lat: number, lng: number }) => {
    console.log('📍 Map clicked at:', coordinates)
    try {
      const location = await reverseGeocode(coordinates.lat, coordinates.lng)
      if (location) {
        console.log('🌍 Got location from map:', location)
        setMapLocation(location)
      }
    } catch (error) {
      console.error('Error reverse geocoding map location:', error)
    }
  }

  const calculateBoundaryData = (): BoundaryData => {
    const totalAcres = selectedParcels.reduce((sum, parcel) =>
      sum + (parcel.GROSSAC || 0), 0
    )

    // Find primary parcel (largest by acreage)
    const primaryParcel = selectedParcels.reduce((largest, current) =>
      (current.GROSSAC || 0) > (largest.GROSSAC || 0) ? current : largest
    , selectedParcels[0])

    const totalValue = selectedParcels.reduce((sum, parcel) =>
      sum + (parcel.MARKETVALUE || parcel.APPRAISEDVALUE || 0), 0
    )

    // Use GIS parcel data first, fallback to map location from reverse geocoding
    const county = primaryParcel?.CNVYNAME || mapLocation?.county || ''
    const city = extractCityFromAddress(primaryParcel?.SITEADDRESS) || mapLocation?.city || ''

    console.log('📊 Boundary data sources:', {
      gisCounty: primaryParcel?.CNVYNAME,
      gisCity: extractCityFromAddress(primaryParcel?.SITEADDRESS),
      mapCounty: mapLocation?.county,
      mapCity: mapLocation?.city,
      finalCounty: county,
      finalCity: city
    })

    return {
      selectedParcels,
      totalAcres,
      projectData: {
        estimatedAcres: totalAcres,
        county,
        city,
        totalValue
      }
    }
  }

  const handleConfirmBoundary = async () => {
    if (selectedParcels.length === 0) {
      setValidationError('Please select at least one tax parcel to define the project boundary.')
      return
    }

    setIsSubmitting(true)
    try {
      const boundaryData = calculateBoundaryData()

      // Store boundary selection in database
      const response = await fetch('/api/gis/project-boundary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          selectedParcels: boundaryData.selectedParcels,
          boundaryMetadata: {
            totalAcres: boundaryData.totalAcres,
            parcelCount: selectedParcels.length,
            createdAt: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        onBoundaryConfirmed(boundaryData)
      } else {
        const error = await response.json()
        setValidationError(`Failed to save boundary: ${error.message || error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error confirming boundary:', error)
      setValidationError('Failed to confirm project boundary. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeParcel = (parcelId: string) => {
    setSelectedParcels(prev => prev.filter(p => p.PARCELID !== parcelId))
  }

  const totalAcres = selectedParcels.reduce((sum, p) => sum + (p.GROSSAC || 0), 0)
  const totalValue = selectedParcels.reduce((sum, p) => sum + (p.MARKETVALUE || p.APPRAISEDVALUE || 0), 0)

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Define Project Boundary</h2>
            <p className="text-gray-400 text-sm mt-1">
              Select tax parcels to establish your project boundaries and context
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1">
          <GISMap
            projectId={projectId}
            mode="parcel-select"
            onParcelSelect={handleParcelSelect}
            onMapClick={handleMapClick}
            projectLocation={extractedData?.project_location ? {
              description: extractedData.project_location.addresses[0] || '',
              latitude: extractedData.project_location.coordinates?.latitude,
              longitude: extractedData.project_location.coordinates?.longitude,
              confidence: 0.9
            } : undefined}
            className="w-full h-full"
          />
        </div>

        {/* Selection Panel */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Document Data Summary */}
          {extractedData && (
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">From Your Documents</h3>
              <div className="space-y-3 text-sm">
                {extractedData.project_location?.addresses && extractedData.project_location.addresses.length > 0 && (
                  <div>
                    <div className="text-gray-400 mb-1">Project Location:</div>
                    <div className="text-white">{extractedData.project_location.addresses[0]}</div>
                  </div>
                )}
                {extractedData.total_acres && (
                  <div>
                    <div className="text-gray-400 mb-1">Total Project Area:</div>
                    <div className="text-white">{extractedData.total_acres} acres</div>
                  </div>
                )}
                {extractedData.parcel_data && extractedData.parcel_data.length > 0 && (
                  <div>
                    <div className="text-gray-400 mb-1">Plan Parcels Identified:</div>
                    <div className="text-white">{extractedData.parcel_data.length} parcels</div>
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-blue-300">
                💡 Use this information to guide your tax parcel selection
              </div>
            </div>
          )}

          {/* Selection Summary */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Selected Tax Parcels</h3>

            {selectedParcels.length === 0 ? (
              <div className="text-gray-400 text-sm">
                Click parcels on the map to select them for your project boundary.
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white">
                  <span>Parcels:</span>
                  <span className="font-medium">{selectedParcels.length}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Total Acres:</span>
                  <span className="font-medium">{totalAcres.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>Total Value:</span>
                  <span className="font-medium">${totalValue.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Parcel List */}
          <div className="flex-1 overflow-y-auto">
            {selectedParcels.map((parcel, index) => (
              <div key={parcel.PARCELID || `parcel-${index}`} className="p-3 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {parcel.SITEADDRESS || 'No Address'}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      ID: {parcel.PARCELID}
                    </div>
                    <div className="text-gray-300 text-xs mt-1">
                      {parcel.GROSSAC?.toFixed(2)} acres
                    </div>
                    {parcel.OWNERNME1 && (
                      <div className="text-gray-400 text-xs truncate">
                        Owner: {parcel.OWNERNME1}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeParcel(parcel.PARCELID)}
                    className="ml-2 text-gray-400 hover:text-red-400 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-700">
            {validationError && (
              <div className="mb-3 p-2 bg-red-900/20 border border-red-700 rounded text-red-300 text-sm">
                {validationError}
              </div>
            )}

            <button
              onClick={handleConfirmBoundary}
              disabled={selectedParcels.length === 0 || isSubmitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Saving Boundary...' : `Confirm Boundary (${selectedParcels.length} parcels)`}
            </button>

            <div className="mt-2 text-xs text-gray-400 text-center">
              This boundary will provide context for AI document analysis
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}