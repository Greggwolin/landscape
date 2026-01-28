/**
 * LocationMapFlyout Component
 *
 * Main container component for location intelligence map flyout
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { LocationMapFlyoutProps, UserMapPoint, LayerVisibility } from './types';
import { DEFAULT_LAYER_VISIBILITY } from './constants';
import { useDemographics } from './hooks/useDemographics';
import { useReverseGeocode } from './hooks/useReverseGeocode';
import { LocationMap } from './LocationMap';
import { DemographicsPanel } from './DemographicsPanel';
import { MapLayerToggle } from './MapLayerToggle';
import { AddPointPopover } from './AddPointPopover';
import './location-map.css';

export function LocationMapFlyout({
  projectId,
  center,
  isOpen,
  onClose,
  onPointAdded,
  onPointRemoved,
}: LocationMapFlyoutProps) {
  // State
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState<UserMapPoint[]>([]);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [pendingCoordinates, setPendingCoordinates] = useState<[number, number] | null>(null);

  // Hooks
  const { demographics, isLoading, error, refetch } = useDemographics({
    lat: center[1],
    lon: center[0],
    projectId,
    enabled: isOpen,
  });

  const { result: geocodeResult, geocode, clear: clearGeocode } = useReverseGeocode();

  // Handlers
  const handleLayerToggle = useCallback((layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleMapClick = useCallback(
    async (lngLat: [number, number]) => {
      if (!isAddingPoint) return;

      setPendingCoordinates(lngLat);
      await geocode(lngLat[1], lngLat[0]);
    },
    [isAddingPoint, geocode]
  );

  const handleSavePoint = useCallback(
    (pointData: Omit<UserMapPoint, 'id' | 'created_at'>) => {
      const newPoint: UserMapPoint = {
        ...pointData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      setUserPoints((prev) => [...prev, newPoint]);
      onPointAdded?.(newPoint);
      setIsAddingPoint(false);
      setPendingCoordinates(null);
      clearGeocode();
    },
    [onPointAdded, clearGeocode]
  );

  const handleRemovePoint = useCallback(
    (pointId: string) => {
      setUserPoints((prev) => prev.filter((p) => p.id !== pointId));
      onPointRemoved?.(pointId);
    },
    [onPointRemoved]
  );

  const handleClosePopover = useCallback(() => {
    setPendingCoordinates(null);
    clearGeocode();
  }, [clearGeocode]);

  if (!isOpen) return null;

  return (
    <div className="location-map-flyout-overlay">
      <div className="location-map-flyout">
        {/* Header */}
        <div className="flyout-header">
          <div className="flyout-title-group">
            <h2 className="flyout-title">Location Intelligence</h2>
            <span className="flyout-subtitle">
              {center[1].toFixed(4)}, {center[0].toFixed(4)}
            </span>
          </div>
          <div className="flyout-actions">
            <button
              type="button"
              className={`flyout-btn ${isAddingPoint ? 'active' : ''}`}
              onClick={() => setIsAddingPoint(!isAddingPoint)}
              title="Add point to map"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Point
            </button>
            <button
              type="button"
              className="flyout-btn"
              onClick={() => refetch()}
              title="Refresh demographics"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <button
              type="button"
              className="flyout-close"
              onClick={onClose}
              title="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flyout-content">
          {/* Left panel - Map */}
          <div className="flyout-map-panel">
            <LocationMap
              center={center}
              rings={demographics?.rings || []}
              userPoints={userPoints}
              layers={layers}
              selectedRadius={selectedRadius}
              onMapClick={handleMapClick}
              onPointClick={(point) => {
                // Could open edit dialog here
                console.log('Point clicked:', point);
              }}
              isAddingPoint={isAddingPoint}
            />
            <div className="map-controls">
              <MapLayerToggle layers={layers} onToggle={handleLayerToggle} />
            </div>
          </div>

          {/* Right panel - Demographics */}
          <div className="flyout-data-panel">
            <DemographicsPanel
              demographics={demographics}
              isLoading={isLoading}
              error={error}
              selectedRadius={selectedRadius}
              onRadiusSelect={setSelectedRadius}
            />

            {/* User points list */}
            {userPoints.length > 0 && (
              <div className="user-points-panel">
                <h4 className="panel-title">User Points ({userPoints.length})</h4>
                <ul className="user-points-list">
                  {userPoints.map((point) => (
                    <li key={point.id} className="user-point-item">
                      <span className="point-label">{point.label}</span>
                      <span className="point-category">{point.category}</span>
                      <button
                        type="button"
                        className="point-remove"
                        onClick={() => handleRemovePoint(point.id)}
                        title="Remove point"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Add point popover */}
        <AddPointPopover
          isOpen={pendingCoordinates !== null}
          coordinates={pendingCoordinates}
          onClose={handleClosePopover}
          onSave={handleSavePoint}
          reverseGeocodeResult={geocodeResult}
        />

        {/* Adding point hint */}
        {isAddingPoint && !pendingCoordinates && (
          <div className="adding-point-hint">
            Click anywhere on the map to add a point
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationMapFlyout;
