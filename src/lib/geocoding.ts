// Geocoding utilities for converting addresses/intersections to coordinates

export interface GeocodingResult {
  latitude: number
  longitude: number
  confidence: number
  source: 'nominatim' | 'manual' | 'cache'
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

// Known locations for faster lookup (can be expanded)
const KNOWN_LOCATIONS: Record<string, GeocodingResult> = {
  // Red Valley area - Anderson and Farrell Roads intersection in Maricopa, AZ
  'anderson farrell maricopa': {
    latitude: 33.0583,
    longitude: -112.0147,
    confidence: 0.95,
    source: 'manual',
    bounds: {
      north: 33.0683,
      south: 33.0483,
      east: -112.0047,
      west: -112.0247
    }
  },
  'corner of anderson and farrell roads maricopa': {
    latitude: 33.0583,
    longitude: -112.0147,
    confidence: 0.95,
    source: 'manual',
    bounds: {
      north: 33.0683,
      south: 33.0483,
      east: -112.0047,
      west: -112.0247
    }
  }
}

/**
 * Normalizes a location description for lookup
 */
function normalizeLocation(description: string): string {
  return description
    .toLowerCase()
    .replace(/\b(corner of|at the|near|intersection of)\b/g, '')
    .replace(/\b(road|rd|street|st|avenue|ave|blvd|boulevard)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Geocodes a location description using Nominatim (OpenStreetMap)
 */
async function geocodeWithNominatim(description: string): Promise<GeocodingResult | null> {
  try {
    const encodedQuery = encodeURIComponent(description)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Landscape-GIS-App/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const results = await response.json()

    if (results && results.length > 0) {
      const result = results[0]
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        confidence: result.importance || 0.5, // Nominatim importance score
        source: 'nominatim',
        bounds: result.boundingbox ? {
          south: parseFloat(result.boundingbox[0]),
          north: parseFloat(result.boundingbox[1]),
          west: parseFloat(result.boundingbox[2]),
          east: parseFloat(result.boundingbox[3])
        } : undefined
      }
    }

    return null
  } catch (error) {
    console.error('Nominatim geocoding error:', error)
    return null
  }
}

/**
 * Main geocoding function that tries multiple sources
 */
export async function geocodeLocation(description: string): Promise<GeocodingResult | null> {
  if (!description?.trim()) {
    return null
  }

  console.log(`🌍 Geocoding location: "${description}"`)

  // First, try known locations cache
  const normalized = normalizeLocation(description)
  console.log(`🔍 Normalized query: "${normalized}"`)

  // Check for exact matches in known locations
  for (const [key, location] of Object.entries(KNOWN_LOCATIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      console.log(`✅ Found in cache: ${key}`)
      return { ...location, source: 'cache' }
    }
  }

  // Fall back to Nominatim API
  console.log('🌐 Trying Nominatim API...')
  const nominatimResult = await geocodeWithNominatim(description)

  if (nominatimResult) {
    console.log(`✅ Nominatim result: ${nominatimResult.latitude}, ${nominatimResult.longitude}`)
    return nominatimResult
  }

  console.log('❌ No geocoding results found')
  return null
}

/**
 * Gets appropriate zoom level based on confidence and bounds
 */
export function getZoomLevel(result: GeocodingResult): number {
  // If we have bounds, calculate zoom based on area
  if (result.bounds) {
    const latDiff = result.bounds.north - result.bounds.south
    const lngDiff = result.bounds.east - result.bounds.west
    const maxDiff = Math.max(latDiff, lngDiff)

    if (maxDiff > 0.1) return 10  // Large area
    if (maxDiff > 0.05) return 12 // Medium area
    if (maxDiff > 0.01) return 14 // Small area
    return 16 // Very specific location
  }

  // Fall back to confidence-based zoom
  if (result.confidence > 0.8) return 16  // High confidence - close zoom
  if (result.confidence > 0.6) return 14  // Medium confidence
  if (result.confidence > 0.4) return 12  // Lower confidence
  return 10 // Very low confidence - stay zoomed out
}