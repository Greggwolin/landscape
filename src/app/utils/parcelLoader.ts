// Utility for loading local Pinal County parcel data
import type { FeatureCollection, Feature, Polygon } from 'geojson'

interface ParcelProperties {
  PARCELID?: string
  OBJECTID?: number
  grossac?: number
  ownernme1?: string
  siteaddress?: string
  [key: string]: any
}

interface MapBounds {
  sw: { lng: number; lat: number }
  ne: { lng: number; lat: number }
}

export class LocalParcelLoader {
  private parcelsData: FeatureCollection | null = null
  private isLoading = false
  private readonly dataUrl: string

  constructor() {
    const envUrl = process.env.NEXT_PUBLIC_PARCEL_DATA_URL
    this.dataUrl = envUrl && envUrl.trim().length > 0 ? envUrl : '/samples/pinal-parcels-sample.json'
  }

  async loadParcelsData(): Promise<FeatureCollection> {
    if (this.parcelsData) {
      return this.parcelsData
    }

    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return this.parcelsData!
    }

    this.isLoading = true
    try {
      console.log(`Loading parcel data from ${this.dataUrl} ...`)
      const response = await fetch(this.dataUrl, {
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error(`Failed to load parcel data (${response.status})`)
      }

      this.parcelsData = await response.json()
      console.log(`Loaded ${this.parcelsData!.features.length} parcels from ${this.dataUrl}`)
      return this.parcelsData!
    } finally {
      this.isLoading = false
    }
  }

  filterParcelsForBounds(bounds: MapBounds, allParcels?: FeatureCollection): Feature<Polygon, ParcelProperties>[] {
    const parcels = allParcels || this.parcelsData
    if (!parcels) {
      console.warn('No parcel data available for filtering')
      return []
    }

    const { sw, ne } = bounds

    const visibleParcels = parcels.features.filter((feature) => {
      if (!feature.geometry || feature.geometry.type !== 'Polygon') return false

      const coords = feature.geometry.coordinates[0]
      if (!coords || coords.length === 0) return false

      // Check if any part of parcel is within visible bounds
      return coords.some((coord) => {
        const [lng, lat] = coord
        return lng >= sw.lng && lng <= ne.lng && lat >= sw.lat && lat <= ne.lat
      })
    }) as Feature<Polygon, ParcelProperties>[]

    console.log(`Filtered ${visibleParcels.length} parcels from ${parcels.features.length} total for current view`)
    return visibleParcels
  }

  async getParcelsForMapView(bounds: MapBounds): Promise<Feature<Polygon, ParcelProperties>[]> {
    const allParcels = await this.loadParcelsData()
    return this.filterParcelsForBounds(bounds, allParcels)
  }
}

// Singleton instance
export const parcelLoader = new LocalParcelLoader()
