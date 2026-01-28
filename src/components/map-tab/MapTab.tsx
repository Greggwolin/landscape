/**
 * MapTab Component
 *
 * Main container for the unified spatial hub Map tab.
 * Aggregates all geographic data into a single Google Earth-style interface.
 *
 * @version 2.0
 * @created 2026-01-27
 * @updated 2026-01-28 - Integrated mapbox-gl-draw for line/polygon drawing
 */

'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type {
  MapTabProps,
  LayerState,
  LayerGroupId,
  BasemapStyle,
  DrawTool,
  MapViewState,
  MapFeature,
  FeatureCategory,
} from './types';
import { getDefaultLayerGroups, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './constants';
import { LayerPanel } from './LayerPanel';
import { MapCanvas, MapCanvasRef } from './MapCanvas';
import { DrawToolbar } from './DrawToolbar';
import { FeatureModal } from './FeatureModal';
import type { FeatureGeometryType } from './FeatureModal';
import { useMapDraw, type DrawnFeature } from './hooks/useMapDraw';
import { useMapFeatures } from './hooks/useMapFeatures';
import { DemographicsPanel, useDemographics } from '@/components/location-intelligence';
import './map-tab.css';

/**
 * Parse coordinate value (handles string or number)
 */
function parseCoordinate(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? null : num;
}

export function MapTab({ project }: MapTabProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // Parse project coordinates
  // ─────────────────────────────────────────────────────────────────────────

  const projectLat = parseCoordinate(project.location_lat);
  const projectLon = parseCoordinate(project.location_lon);
  const hasValidCoordinates = projectLat !== null && projectLon !== null;

  // ─────────────────────────────────────────────────────────────────────────
  // Refs
  // ─────────────────────────────────────────────────────────────────────────

  const mapCanvasRef = useRef<MapCanvasRef>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  const [basemap, setBasemap] = useState<BasemapStyle>('hybrid');
  const [activeTool, setActiveTool] = useState<DrawTool>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerState>(() => ({
    groups: getDefaultLayerGroups(),
  }));
  const [viewState, setViewState] = useState<MapViewState>(() => ({
    center: hasValidCoordinates
      ? [projectLon!, projectLat!]
      : DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
  }));

  // Feature state - local features shown on map
  const [displayFeatures, setDisplayFeatures] = useState<MapFeature[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFeatureType, setModalFeatureType] = useState<FeatureGeometryType>('Point');
  const [modalCoordinates, setModalCoordinates] = useState<
    GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][] | null
  >(null);
  const [modalMeasurements, setModalMeasurements] = useState<DrawnFeature['properties']>({});
  const [isSaving, setIsSaving] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Map Features API Hook
  // ─────────────────────────────────────────────────────────────────────────

  const {
    features: savedFeatures,
    loading: featuresLoading,
    fetchFeatures,
    saveFeature,
    deleteFeature,
  } = useMapFeatures(project.project_id);

  // ─────────────────────────────────────────────────────────────────────────
  // Draw Hook
  // ─────────────────────────────────────────────────────────────────────────

  const map = mapCanvasRef.current?.getMap() ?? null;

  const handleFeatureCreated = useCallback((feature: DrawnFeature) => {
    // Open save modal when a feature is drawn
    setModalFeatureType(feature.type);
    setModalCoordinates(feature.coordinates);
    setModalMeasurements(feature.properties);
    setIsModalOpen(true);
  }, []);

  const {
    initializeDraw,
    activeMode,
    currentFeature,
    liveMeasurement,
    isDrawing,
    startDrawPoint,
    startDrawLine,
    startDrawPolygon,
    startEdit,
    deleteSelected,
    cancelDraw,
    getFeatureGeoJSON,
    clearCurrentFeature,
    loadFeatures: loadDrawFeatures,
  } = useMapDraw(map, {
    onFeatureCreated: handleFeatureCreated,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize draw when map is ready
  // ─────────────────────────────────────────────────────────────────────────

  const [drawInitialized, setDrawInitialized] = useState(false);

  useEffect(() => {
    if (mapCanvasRef.current?.isLoaded() && !drawInitialized) {
      initializeDraw();
      setDrawInitialized(true);
      fetchFeatures();
    }
  }, [mapCanvasRef.current?.isLoaded(), drawInitialized, initializeDraw, fetchFeatures]);

  // Sync saved features to display features
  useEffect(() => {
    if (savedFeatures.length > 0) {
      const mapped: MapFeature[] = savedFeatures.map((f) => ({
        id: f.id,
        project_id: f.project_id,
        feature_type: f.feature_type as 'point' | 'line' | 'polygon' | 'measurement',
        category: f.category as FeatureCategory,
        geometry: f.geometry as GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon,
        label: f.label,
        notes: f.notes ?? null,
        style: (f.style as Record<string, unknown>) ?? {},
        linked_table: f.linked_table ?? null,
        linked_id: f.linked_id ?? null,
        area_sqft: f.area_sqft ?? null,
        area_acres: f.area_acres ?? null,
        perimeter_ft: f.perimeter_ft ?? null,
        length_ft: f.length_ft ?? null,
        created_by: f.created_by ?? null,
        created_at: f.created_at,
        updated_at: f.updated_at,
      }));
      setDisplayFeatures(mapped);

      // Update layer count
      setLayers((prev) => ({
        groups: prev.groups.map((group) => {
          if (group.id !== 'annotations') return group;
          return {
            ...group,
            layers: group.layers.map((layer) => {
              if (layer.id !== 'drawn-shapes') return layer;
              return { ...layer, count: mapped.length };
            }),
          };
        }),
      }));
    }
  }, [savedFeatures]);

  // ─────────────────────────────────────────────────────────────────────────
  // Map center derived from project (lng, lat order for MapLibre)
  // ─────────────────────────────────────────────────────────────────────────

  const mapCenter = useMemo((): [number, number] => {
    if (hasValidCoordinates) {
      return [projectLon!, projectLat!];
    }
    return DEFAULT_MAP_CENTER;
  }, [hasValidCoordinates, projectLon, projectLat]);

  // ─────────────────────────────────────────────────────────────────────────
  // Check if Demo Rings layer is visible
  // ─────────────────────────────────────────────────────────────────────────

  const isDemoRingsVisible = useMemo(() => {
    const locationIntelGroup = layers.groups.find((g) => g.id === 'location-intel');
    const demoRingsLayer = locationIntelGroup?.layers.find((l) => l.id === 'demo-rings');
    return demoRingsLayer?.visible ?? false;
  }, [layers]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch demographics when Demo Rings layer is enabled
  // ─────────────────────────────────────────────────────────────────────────

  const {
    demographics,
    isLoading: demographicsLoading,
    error: demographicsError,
  } = useDemographics({
    lat: projectLat ?? 0,
    lon: projectLon ?? 0,
    projectId: String(project.project_id),
    enabled: isDemoRingsVisible && hasValidCoordinates,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Layer Toggle Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleToggleLayer = useCallback(
    (groupId: LayerGroupId, layerId: string) => {
      setLayers((prev) => ({
        groups: prev.groups.map((group) => {
          if (group.id !== groupId) return group;
          return {
            ...group,
            layers: group.layers.map((layer) => {
              if (layer.id !== layerId) return layer;
              return { ...layer, visible: !layer.visible };
            }),
          };
        }),
      }));
    },
    []
  );

  const handleToggleGroup = useCallback((groupId: LayerGroupId) => {
    setLayers((prev) => ({
      groups: prev.groups.map((group) => {
        if (group.id !== groupId) return group;
        return { ...group, expanded: !group.expanded };
      }),
    }));
  }, []);

  const handleZoomToLayer = useCallback(
    (_groupId: LayerGroupId, _layerId: string) => {
      console.log('Zoom to layer:', _groupId, _layerId);
    },
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Draw Tool Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleToolChange = useCallback(
    (tool: DrawTool) => {
      // Toggle off if clicking same tool
      if (tool === activeTool) {
        setActiveTool(null);
        startEdit(); // Return to select mode
        return;
      }

      setActiveTool(tool);
      setSelectedFeatureId(null);

      switch (tool) {
        case 'point':
          startDrawPoint();
          break;
        case 'line':
          startDrawLine();
          break;
        case 'polygon':
          startDrawPolygon();
          break;
        case 'edit':
          startEdit();
          break;
        case 'delete':
          // Delete mode - clicking a feature will delete it
          startEdit();
          break;
        default:
          startEdit();
      }
    },
    [activeTool, startDrawPoint, startDrawLine, startDrawPolygon, startEdit]
  );

  const handleMapClick = useCallback(
    (_coordinates: [number, number]) => {
      // Map clicks are now handled by mapbox-gl-draw
      // This is called for clicks that aren't on draw features
      if (activeTool === 'delete' && selectedFeatureId) {
        // Delete the selected feature
        deleteFeature(selectedFeatureId).catch((err) => {
          console.error('Failed to delete feature:', err);
          setToastMessage('Failed to delete feature');
          setTimeout(() => setToastMessage(null), 2500);
        });
        setSelectedFeatureId(null);
      }
    },
    [activeTool, selectedFeatureId, deleteFeature]
  );

  const handleFeatureClick = useCallback(
    (feature: MapFeature) => {
      if (activeTool === 'delete') {
        // Delete the clicked feature
        deleteFeature(feature.id).catch((err) => {
          console.error('Failed to delete feature:', err);
          setToastMessage('Failed to delete feature');
          setTimeout(() => setToastMessage(null), 2500);
        });
      } else {
        setSelectedFeatureId(feature.id);
      }
    },
    [activeTool, deleteFeature]
  );

  const handleViewStateChange = useCallback((newViewState: MapViewState) => {
    setViewState(newViewState);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Feature Modal Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setModalCoordinates(null);
    setModalMeasurements({});
    cancelDraw();
    setActiveTool(null);
  }, [cancelDraw]);

  const handleFeatureSave = useCallback(
    async (data: { label: string; category: FeatureCategory; notes: string }) => {
      const geojson = getFeatureGeoJSON();
      if (!geojson || !geojson.geometry) {
        console.error('No feature geometry to save');
        return;
      }

      setIsSaving(true);

      try {
        // Map geometry type to feature_type
        const featureType = geojson.geometry.type.toLowerCase();

        await saveFeature(geojson.geometry, featureType, {
          label: data.label,
          category: data.category,
          notes: data.notes || undefined,
          area_sqft: modalMeasurements.area_sqft,
          area_acres: modalMeasurements.area_acres,
          perimeter_ft: modalMeasurements.perimeter_ft,
          length_ft: modalMeasurements.length_ft,
        });

        // Clear the draw state
        clearCurrentFeature();

        // Close modal
        setIsModalOpen(false);
        setModalCoordinates(null);
        setModalMeasurements({});
        setActiveTool(null);

        // Show success toast
        setToastMessage(`${data.label} saved`);
        setTimeout(() => setToastMessage(null), 2000);
      } catch (err) {
        console.error('Failed to save feature:', err);
        setToastMessage('Failed to save feature');
        setTimeout(() => setToastMessage(null), 2500);
      } finally {
        setIsSaving(false);
      }
    },
    [getFeatureGeoJSON, saveFeature, modalMeasurements, clearCurrentFeature]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="map-tab">
      {/* Left Panel: Layer Tree */}
      <div className="map-tab-sidebar">
        <LayerPanel
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onToggleGroup={handleToggleGroup}
          onZoomToLayer={handleZoomToLayer}
        />

        {/* Draw Tools */}
        <div className="map-tab-tools">
          <div className="map-tab-tools-header">Tools</div>
          <DrawToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
          />
        </div>
      </div>

      {/* Main Content: Map Canvas + Demographics */}
      <div className="map-tab-content">
        <MapCanvas
          ref={mapCanvasRef}
          center={mapCenter}
          zoom={viewState.zoom}
          basemap={basemap}
          layers={layers}
          features={displayFeatures}
          activeTool={activeTool}
          selectedFeatureId={selectedFeatureId}
          onMapClick={handleMapClick}
          onFeatureClick={handleFeatureClick}
          onViewStateChange={handleViewStateChange}
        />

        {/* Live measurement overlay */}
        {liveMeasurement && isDrawing && (
          <div className="map-tab-measurement-overlay">
            {liveMeasurement}
          </div>
        )}

        {/* Demographics Panel - shown when Demo Rings layer is enabled */}
        {isDemoRingsVisible && (
          <div className="map-tab-demographics-panel">
            <DemographicsPanel
              demographics={demographics}
              isLoading={demographicsLoading}
              error={demographicsError}
              selectedRadius={1}
              onRadiusSelect={() => {}}
            />
          </div>
        )}

        {/* Bottom Toolbar */}
        <div className="map-tab-bottom-toolbar">
          <div className="map-tab-basemap-selector">
            <label htmlFor="basemap-select">Base:</label>
            <select
              id="basemap-select"
              value={basemap}
              onChange={(e) => setBasemap(e.target.value as BasemapStyle)}
            >
              <option value="satellite">Satellite</option>
              <option value="hybrid">Hybrid</option>
              <option value="streets">Streets</option>
            </select>
          </div>

          <div className="map-tab-search">
            <input
              type="text"
              placeholder="Search location..."
              className="map-tab-search-input"
            />
          </div>

          <button type="button" className="map-tab-export-btn">
            Export
          </button>
        </div>
      </div>

      {/* Feature Modal for saving drawn features */}
      <FeatureModal
        isOpen={isModalOpen}
        featureType={modalFeatureType}
        coordinates={modalCoordinates}
        measurements={modalMeasurements}
        onClose={handleModalClose}
        onSave={handleFeatureSave}
        isSaving={isSaving}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div className="map-tab-toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default MapTab;
