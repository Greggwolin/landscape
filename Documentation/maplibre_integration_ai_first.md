# MapLibre Integration - AI-First Workflow

## Context
MapLibre interface for Landscape GIS with **AI-first document ingestion**. Users select tax parcels for project boundary, then AI processes property packages to create complete project structures. Eliminates reconciliation complexity.

**Key Architecture:** Tax parcel selection → AI property package ingestion → Plan parcel navigation

## Phase 1: MapLibre Foundation

### Step 1.1: Dependencies
```bash
npm install maplibre-gl @types/maplibre-gl
npm install @turf/turf @types/geojson
```

### Step 1.2: Core Map Component (Updated)
Create `components/MapLibre/GISMap.tsx`:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface GISMapProps {
  projectId?: number;
  onParcelSelect?: (parcels: MaricopaParcel[]) => void;
  onPlanParcelClick?: (parcel: PlanParcel) => void;
  mode?: 'parcel-select' | 'navigation';
  center?: [number, number];
  zoom?: number;
}

export interface MaricopaParcel {
  apn: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: {
    OWNER_NAME?: string;
    SITUS_ADDRESS?: string;
    ACRES?: number;
  };
}

export interface PlanParcel {
  parcel_id: number;
  parcel_code: string;
  land_use: string;
  acres_gross: number;
  units_total: number;
  area_no?: number;
  phase_no?: number;
  parcel_no?: number;
  confidence?: number;
  source_doc?: string;
  geometry: GeoJSON.Polygon;
}

export default function GISMap({
  projectId,
  onParcelSelect,
  onPlanParcelClick,
  mode = 'navigation',
  center = [-112.074, 33.448], // Phoenix default
  zoom = 12
}: GISMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [selectedParcels, setSelectedParcels] = useState<MaricopaParcel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: 'Esri, Maxar, GeoEye, Earthstar Geographics'
          }
        },
        layers: [
          {
            id: 'satellite',
            type: 'raster',
            source: 'satellite'
          }
        ]
      },
      center,
      zoom,
      maxZoom: 20
    });

    map.current.addControl(new maplibregl.NavigationControl());
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom]);

  // Load appropriate layers based on mode
  useEffect(() => {
    if (!map.current) return;

    map.current.on('load', () => {
      if (mode === 'parcel-select') {
        addMaricopaParcels();
      } else if (projectId && mode === 'navigation') {
        loadPlanParcels(projectId);
      }
    });
  }, [projectId, mode]);

  const addMaricopaParcels = () => {
    if (!map.current) return;

    // Maricopa County Assessor parcels service
    const parcelServiceUrl = 'https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/1';
    
    map.current.addSource('maricopa-parcels', {
      type: 'vector',
      tiles: [`${parcelServiceUrl}/tile/{z}/{y}/{x}.pbf`],
      maxzoom: 16
    });

    // Tax parcel layer for selection
    map.current.addLayer({
      id: 'tax-parcels-fill',
      type: 'fill',
      source: 'maricopa-parcels',
      'source-layer': 'parcels',
      paint: {
        'fill-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          '#ff6b35', // selected orange
          'rgba(0,0,0,0.1)' // transparent default
        ],
        'fill-opacity': 0.6
      },
      filter: ['>', ['zoom'], 14]
    });

    map.current.addLayer({
      id: 'tax-parcels-line',
      type: 'line',
      source: 'maricopa-parcels',
      'source-layer': 'parcels',
      paint: {
        'line-color': '#666',
        'line-width': 1,
        'line-opacity': 0.8
      },
      filter: ['>', ['zoom'], 14]
    });

    // Click handler for parcel selection
    map.current.on('click', 'tax-parcels-fill', handleParcelClick);
    map.current.getCanvas().style.cursor = 'pointer';
  };

  const handleParcelClick = async (e: maplibregl.MapMouseEvent) => {
    if (!map.current || !e.features?.length) return;

    const feature = e.features[0];
    const apn = feature.properties?.APN || feature.properties?.apn;
    
    if (!apn) return;

    setIsLoading(true);

    try {
      const queryUrl = `https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/1/query`;
      const params = new URLSearchParams({
        where: `APN='${apn}'`,
        outFields: '*',
        returnGeometry: 'true',
        f: 'geojson'
      });

      const response = await fetch(`${queryUrl}?${params}`);
      const data = await response.json();

      if (data.features?.length > 0) {
        const parcel = data.features[0];
        const maricopaParcel: MaricopaParcel = {
          apn,
          geometry: parcel.geometry,
          properties: {
            OWNER_NAME: parcel.properties.OWNER_NAME,
            SITUS_ADDRESS: parcel.properties.SITUS_ADDRESS,
            ACRES: parcel.properties.ACRES
          }
        };

        // Toggle selection
        const isSelected = selectedParcels.some(p => p.apn === apn);
        let newSelection: MaricopaParcel[];
        
        if (isSelected) {
          newSelection = selectedParcels.filter(p => p.apn !== apn);
          map.current!.setFeatureState(
            { source: 'maricopa-parcels', sourceLayer: 'parcels', id: feature.id },
            { selected: false }
          );
        } else {
          newSelection = [...selectedParcels, maricopaParcel];
          map.current!.setFeatureState(
            { source: 'maricopa-parcels', sourceLayer: 'parcels', id: feature.id },
            { selected: true }
          );
        }

        setSelectedParcels(newSelection);
        onParcelSelect?.(newSelection);
      }
    } catch (error) {
      console.error('Error querying parcel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlanParcels = async (projectId: number) => {
    if (!map.current) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/gis/plan-parcels?projectId=${projectId}`);
      const planParcels = await response.json();

      if (planParcels.length > 0) {
        map.current.addSource('plan-parcels', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: planParcels.map((p: PlanParcel) => ({
              type: 'Feature',
              id: p.parcel_id,
              geometry: p.geometry,
              properties: {
                parcel_code: p.parcel_code,
                land_use: p.land_use,
                acres_gross: p.acres_gross,
                units_total: p.units_total,
                area_no: p.area_no,
                phase_no: p.phase_no,
                parcel_no: p.parcel_no,
                confidence: p.confidence,
                source_doc: p.source_doc
              }
            }))
          }
        });

        // Plan parcels with land use styling
        map.current.addLayer({
          id: 'plan-parcels-fill',
          type: 'fill',
          source: 'plan-parcels',
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'land_use'], 'SFR'], '#4CAF50',  // green
              ['==', ['get', 'land_use'], 'MFR'], '#2196F3',  // blue  
              ['==', ['get', 'land_use'], 'HDR'], '#9C27B0',  // purple
              ['==', ['get', 'land_use'], 'COM'], '#FF9800',  // orange
              ['==', ['get', 'land_use'], 'RET'], '#F44336',  // red
              '#9E9E9E' // default gray
            ],
            'fill-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'confidence'],
              0.5, 0.4,  // low confidence = more transparent
              1.0, 0.8   // high confidence = more opaque
            ]
          }
        });

        map.current.addLayer({
          id: 'plan-parcels-line',
          type: 'line',
          source: 'plan-parcels',
          paint: {
            'line-color': '#333',
            'line-width': 2
          }
        });

        // Plan parcel labels with hierarchy info
        map.current.addLayer({
          id: 'plan-parcels-labels',
          type: 'symbol',
          source: 'plan-parcels',
          layout: {
            'text-field': [
              'case',
              ['has', 'area_no'],
              ['concat', ['get', 'parcel_code'], '\n', ['get', 'land_use']],
              ['concat', ['get', 'parcel_code'], '\n', ['get', 'land_use']]
            ],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 11,
            'text-anchor': 'center',
            'text-line-height': 1.2
          },
          paint: {
            'text-color': '#000',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          },
          filter: ['>', ['zoom'], 16]
        });

        // Click handler for plan parcels
        map.current.on('click', 'plan-parcels-fill', (e) => {
          if (e.features?.length && onPlanParcelClick) {
            const feature = e.features[0];
            const planParcel = planParcels.find((p: PlanParcel) => 
              p.parcel_id === feature.id
            );
            if (planParcel) onPlanParcelClick(planParcel);
          }
        });

        // Fit bounds to plan parcels
        const bounds = new maplibregl.LngLatBounds();
        planParcels.forEach((p: PlanParcel) => {
          if (p.geometry.type === 'Polygon') {
            p.geometry.coordinates[0].forEach(coord => bounds.extend(coord as [number, number]));
          }
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error('Error loading plan parcels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {mode === 'parcel-select' && (
        <div className="absolute top-4 left-4 bg-white p-4 rounded shadow-lg max-w-sm">
          <h3 className="font-bold mb-2">Select Tax Parcels</h3>
          <p className="text-sm text-gray-600 mb-2">
            Click parcels to define project boundary
          </p>
          <div className="text-sm">
            Selected: {selectedParcels.length} parcel(s)
            {selectedParcels.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto">
                {selectedParcels.map(p => (
                  <div key={p.apn} className="text-xs border-b py-1">
                    {p.apn} - {p.properties.ACRES?.toFixed(1)} ac
                  </div>
                ))}
                <div className="mt-2 text-xs text-gray-500">
                  Total: {selectedParcels.reduce((sum, p) => sum + (p.properties.ACRES || 0), 0).toFixed(1)} acres
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'navigation' && (
        <div className="absolute top-4 left-4 bg-white p-3 rounded shadow-lg">
          <h3 className="font-bold text-sm mb-1">Land Use Legend</h3>
          <div className="text-xs space-y-1">
            <div className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded mr-2"></div>SFR</div>
            <div className="flex items-center"><div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>MFR</div>
            <div className="flex items-center"><div className="w-3 h-3 bg-purple-600 rounded mr-2"></div>HDR</div>
            <div className="flex items-center"><div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>COM</div>
            <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded mr-2"></div>RET</div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg">
            <div className="flex items-center">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
              Loading...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Phase 2: Updated Navigation Component

### Step 2.1: Plan Navigation with AI Context
Create `components/GIS/PlanNavigation.tsx`:

```typescript
'use client';

import { useState } from 'react';
import GISMap, { PlanParcel } from '../MapLibre/GISMap';

interface PlanNavigationProps {
  projectId: number;
}

export default function PlanNavigation({ projectId }: PlanNavigationProps) {
  const [selectedParcel, setSelectedParcel] = useState<PlanParcel | null>(null);

  const handlePlanParcelClick = (parcel: PlanParcel) => {
    setSelectedParcel(parcel);
  };

  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence?: number): string => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  return (
    <div className="w-full h-full flex">
      <div className="flex-1">
        <GISMap
          projectId={projectId}
          mode="navigation"
          onPlanParcelClick={handlePlanParcelClick}
        />
      </div>
      
      {selectedParcel && (
        <div className="w-96 bg-white border-l p-6 overflow-y-auto">
          <h3 className="font-bold text-xl mb-4">
            Parcel {selectedParcel.parcel_code}
          </h3>
          
          {/* AI Extraction Info */}
          {selectedParcel.confidence && (
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">AI Extraction</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className={`font-medium ${getConfidenceColor(selectedParcel.confidence)}`}>
                    {getConfidenceLabel(selectedParcel.confidence)} ({(selectedParcel.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
                {selectedParcel.source_doc && (
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span className="text-blue-600 font-mono text-xs">{selectedParcel.source_doc}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Hierarchy Info */}
          {(selectedParcel.area_no || selectedParcel.phase_no) && (
            <div className="mb-6">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Project Hierarchy</h4>
              <div className="space-y-1 text-sm">
                {selectedParcel.area_no && (
                  <div>Area: {selectedParcel.area_no}</div>
                )}
                {selectedParcel.phase_no && (
                  <div>Phase: {selectedParcel.phase_no}</div>
                )}
                {selectedParcel.parcel_no && (
                  <div>Parcel: {selectedParcel.parcel_no}</div>
                )}
              </div>
            </div>
          )}
          
          {/* Parcel Details */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Land Use
              </label>
              <p className="text-gray-900 font-medium">{selectedParcel.land_use}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gross Acres
              </label>
              <p className="text-gray-900">{selectedParcel.acres_gross?.toFixed(2)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Units
              </label>
              <p className="text-gray-900">{selectedParcel.units_total}</p>
            </div>

            {selectedParcel.acres_gross && selectedParcel.units_total && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Density
                </label>
                <p className="text-gray-900">
                  {(selectedParcel.units_total / selectedParcel.acres_gross).toFixed(1)} DU/Acre
                </p>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <button className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Edit Parcel Data
            </button>
            <button className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
              View Financial Model
            </button>
            <button className="w-full py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
              Development Schedule
            </button>
            
            {selectedParcel.confidence && selectedParcel.confidence < 0.8 && (
              <button className="w-full py-2 px-4 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors">
                Review AI Extraction
              </button>
            )}
          </div>

          {/* Debug Info (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 pt-4 border-t border-gray-200">
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 font-mono">Debug Info</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(selectedParcel, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Phase 3: Simplified Project Boundary Setup

### Step 3.1: Updated Boundary Component
Create `components/GIS/ProjectBoundarySetup.tsx`:

```typescript
'use client';

import { useState } from 'react';
import GISMap, { MaricopaParcel } from '../MapLibre/GISMap';

interface ProjectBoundarySetupProps {
  projectId: number;
  onBoundaryConfirmed: (parcels: MaricopaParcel[]) => void;
}

export default function ProjectBoundarySetup({ 
  projectId, 
  onBoundaryConfirmed 
}: ProjectBoundarySetupProps) {
  const [selectedParcels, setSelectedParcels] = useState<MaricopaParcel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleParcelSelect = (parcels: MaricopaParcel[]) => {
    setSelectedParcels(parcels);
  };

  const handleConfirmBoundary = async () => {
    if (selectedParcels.length === 0) return;

    setIsSubmitting(true);
    try {
      const features = selectedParcels.map(p => ({
        apn: p.apn,
        geom: p.geometry
      }));

      const response = await fetch('/api/gis/ingest-parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          features
        })
      });

      if (response.ok) {
        onBoundaryConfirmed(selectedParcels);
      } else {
        const error = await response.json();
        console.error('Boundary setup failed:', error);
      }
    } catch (error) {
      console.error('Error setting project boundary:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAcres = selectedParcels.reduce((sum, p) => 
    sum + (p.properties.ACRES || 0), 0
  );

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <h2 className="text-xl font-bold">Define Project Boundary</h2>
        <p className="text-gray-600">
          Select tax parcels that define your project boundary. These will be used 
          as context for AI document analysis.
        </p>
      </div>
      
      {/* Map */}
      <div className="flex-1">
        <GISMap
          mode="parcel-select"
          onParcelSelect={handleParcelSelect}
          center={[-112.074, 33.448]} // Adjust for project location
          zoom={15}
        />
      </div>
      
      {/* Footer */}
      <div className="p-4 bg-white border-t">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-semibold text-lg">
              {selectedParcels.length} parcels selected
            </span>
            {totalAcres > 0 && (
              <div className="text-gray-600">
                {totalAcres.toFixed(1)} acres total • Average {(totalAcres / selectedParcels.length).toFixed(1)} acres/parcel
              </div>
            )}
            {selectedParcels.length > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                APNs: {selectedParcels.map(p => p.apn).join(', ')}
              </div>
            )}
          </div>
          
          <button
            onClick={handleConfirmBoundary}
            disabled={selectedParcels.length === 0 || isSubmitting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 font-medium"
          >
            {isSubmitting ? 'Setting Boundary...' : 'Confirm Project Boundary'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Success Criteria
- [ ] Tax parcels render from Maricopa County service
- [ ] Click-select toggles parcel highlighting and updates selection
- [ ] Selected parcels create dissolved project boundary
- [ ] Plan parcels render with land use styling and AI confidence
- [ ] Parcel labels include hierarchy info (area/phase) when available
- [ ] Context panel shows AI extraction confidence and source document
- [ ] Performance remains smooth at typical project scales (100-500 parcels)

## Key Improvements from Previous Version
- **Confidence visualization** - parcel opacity reflects AI extraction confidence
- **Source document tracking** - shows which document each parcel came from
- **Hierarchy display** - area/phase info when using master plan structure
- **Simplified workflow** - no reconciliation UI needed
- **Performance optimized** - efficient rendering for large projects
- **Debug support** - development mode shows full parcel data

RS01
