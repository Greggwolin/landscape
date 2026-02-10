'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilChevronTop } from '@coreui/icons';
import {
  DEMOGRAPHIC_FIELDS,
  DEFAULT_LAYER_VISIBILITY,
  formatDemographicValue,
  LocationMap,
  MapLayerToggle,
  useDemographics,
} from '@/components/location-intelligence';
import type { LayerVisibility, RingDemographics, UserMapPoint } from '@/components/location-intelligence';
import '@/components/location-intelligence/location-map.css';

interface LocationIntelligenceCardProps {
  projectId: number;
  projectName: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  rentalComparables?: RentalComparable[];
  comparableColors?: Record<string, string>;
}

interface RentalComparable {
  comparable_id: number;
  property_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distance_miles?: number;
  bedrooms: number;
  bathrooms: number;
  avg_sqft: number;
  asking_rent: number;
}

const COMPARABLE_COLOR_VARS = [
  '#3b82f6',
  '#22c55e',
  '#06b6d4',
  '#f59e0b',
  '#ef4444',
] as const;

const parseCoordinate = (value?: number | string | null): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
};

const getComparableColor = (propertyName: string): string => {
  let hash = 0;
  for (let i = 0; i < propertyName.length; i += 1) {
    hash = (hash * 31 + propertyName.charCodeAt(i)) >>> 0;
  }
  return COMPARABLE_COLOR_VARS[hash % COMPARABLE_COLOR_VARS.length];
};

const getComparablePopupHtml = (comp: RentalComparable, color: string): string => {
  const rentValue = Number(comp.asking_rent || 0);
  const sqftValue = Number(comp.avg_sqft || 0);
  const bedroomsValue = Number(comp.bedrooms || 0);
  const bathroomsValue = Number(comp.bathrooms || 0);

  return `<div style="padding: 12px; min-width: 180px;">
    <div style="font-weight: 600; color: ${color}; margin-bottom: 4px; font-size: 0.95em;">${comp.property_name}</div>
    ${comp.address ? `<div style="font-size: 0.85em; color: #9ca3af; margin-bottom: 2px;">${comp.address}</div>` : ''}
    <div style="font-size: 0.85em; color: #d1d5db;">${bedroomsValue}BR/${bathroomsValue}BA · ${sqftValue > 0 ? sqftValue.toLocaleString() : '—'} SF</div>
    <div style="font-size: 0.95em; font-weight: 600; color: #f9fafb; margin-top: 6px;">$${Math.round(rentValue).toLocaleString()}/mo</div>
    ${comp.distance_miles ? `<div style="font-size: 0.8em; color: #6b7280; margin-top: 4px;">${comp.distance_miles} mi away</div>` : ''}
  </div>`;
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const getDistanceMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const earthRadiusMiles = 3958.7613;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
};

export default function LocationIntelligenceCard({
  projectId,
  projectName,
  latitude,
  longitude,
  rentalComparables = [],
  comparableColors = {},
}: LocationIntelligenceCardProps) {
  const storageKey = useMemo(
    () => `location-intelligence:market-card-open:${projectId}`,
    [projectId]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [mapResizeToken, setMapResizeToken] = useState(0);
  const [shouldMountMap, setShouldMountMap] = useState(false);
  const [isResolvingCenter, setIsResolvingCenter] = useState(false);
  const [centerError, setCenterError] = useState<string | null>(null);
  const [isLayersOpen, setIsLayersOpen] = useState(true);
  const [isRingModalOpen, setIsRingModalOpen] = useState(false);
  const [selectedRingStats, setSelectedRingStats] = useState<RingDemographics | null>(null);

  const parsedLat = parseCoordinate(latitude);
  const parsedLon = parseCoordinate(longitude);
  const [resolvedCenter, setResolvedCenter] = useState<[number, number] | null>(() => {
    if (parsedLat === null || parsedLon === null) {
      return null;
    }
    return [parsedLon, parsedLat];
  });

  const { demographics, isLoading, error, refetch } = useDemographics({
    lat: resolvedCenter?.[1] ?? 0,
    lon: resolvedCenter?.[0] ?? 0,
    projectId: String(projectId),
    enabled: isOpen && resolvedCenter !== null,
  });

  const rentalComparablePoints = useMemo<UserMapPoint[]>(() => {
    return rentalComparables
      .map((comp, index) => {
        const lat = parseCoordinate(comp.latitude);
        const lon = parseCoordinate(comp.longitude);
        if (lat === null || lon === null) {
          return null;
        }

        const color = comparableColors[comp.property_name] || getComparableColor(comp.property_name || `comp-${index + 1}`);
        return {
          id: `comp-${comp.comparable_id}-${index}`,
          label: comp.property_name || `Comparable ${index + 1}`,
          category: 'competitor',
          coordinates: [lon, lat],
          markerColor: color,
          markerLabel: String(index + 1),
          popupHtml: getComparablePopupHtml(comp, color),
        };
      })
      .filter((point): point is UserMapPoint => point !== null);
  }, [comparableColors, rentalComparables]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const savedState = window.sessionStorage.getItem(storageKey);
      setIsOpen(savedState === '1');
    } catch {
      setIsOpen(false);
    } finally {
      setStorageHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageHydrated || typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(storageKey, isOpen ? '1' : '0');
    } catch {
      // Ignore session storage write failures
    }
  }, [storageHydrated, isOpen, storageKey]);

  useEffect(() => {
    if (!isOpen) return;
    if (shouldMountMap) return;

    const timeout = window.setTimeout(() => {
      setShouldMountMap(true);
    }, 380);

    return () => window.clearTimeout(timeout);
  }, [isOpen, shouldMountMap]);

  useEffect(() => {
    if (parsedLat !== null && parsedLon !== null) {
      setResolvedCenter((previous) => {
        if (previous && previous[0] === parsedLon && previous[1] === parsedLat) {
          return previous;
        }
        return [parsedLon, parsedLat];
      });
      setCenterError(null);
    }
  }, [parsedLat, parsedLon]);

  useEffect(() => {
    if (!isOpen || resolvedCenter !== null || isResolvingCenter) {
      return;
    }

    let cancelled = false;
    setIsResolvingCenter(true);
    setCenterError(null);

    const resolveProjectCenter = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/details`);
        if (!response.ok) {
          throw new Error(`Failed to load project coordinates (${response.status})`);
        }

        const details = await response.json();
        const detailsLat = parseCoordinate(details.location_lat ?? details.latitude);
        const detailsLon = parseCoordinate(details.location_lon ?? details.longitude);

        if (cancelled) return;

        if (detailsLat === null || detailsLon === null) {
          setCenterError('Add project latitude/longitude to enable Location Intelligence.');
          return;
        }

        setResolvedCenter([detailsLon, detailsLat]);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load project coordinates.';
        setCenterError(message);
      } finally {
        if (!cancelled) {
          setIsResolvingCenter(false);
        }
      }
    };

    void resolveProjectCenter();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isResolvingCenter, projectId, resolvedCenter]);

  useEffect(() => {
    if (!isOpen || !resolvedCenter || !shouldMountMap) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMapResizeToken((value) => value + 1);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [isOpen, resolvedCenter, shouldMountMap]);

  const handleToggle = useCallback(() => {
    setIsOpen((value) => !value);
  }, []);

  const handleLayerToggle = useCallback((layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleRingAreaClick = useCallback((lngLat: [number, number]) => {
    if (!resolvedCenter || !demographics?.rings?.length) {
      return;
    }

    const [clickLon, clickLat] = lngLat;
    const [centerLon, centerLat] = resolvedCenter;
    const distanceMiles = getDistanceMiles(centerLat, centerLon, clickLat, clickLon);

    const clickedRing = [...demographics.rings]
      .sort((a, b) => a.radius_miles - b.radius_miles)
      .find((ring) => distanceMiles <= ring.radius_miles);

    if (!clickedRing) {
      return;
    }

    setSelectedRadius(clickedRing.radius_miles);
    setSelectedRingStats(clickedRing);
    setIsRingModalOpen(true);
  }, [demographics?.rings, resolvedCenter]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <CCard
      className="mb-3"
      style={{
        background: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      <CCardHeader
        className="d-flex justify-content-between align-items-center"
        onClick={handleToggle}
        style={{
          cursor: 'pointer',
        }}
      >
        <span>Competitve Rental Market</span>
        <CIcon icon={isOpen ? cilChevronTop : cilChevronBottom} />
      </CCardHeader>

      {isOpen && (
        <CCardBody className="location-intelligence-card-body">
          {isResolvingCenter && (
            <div
              className="rounded p-3 mb-3"
              style={{
                background: 'var(--cui-secondary-bg)',
                border: '1px solid var(--cui-border-color)',
                color: 'var(--cui-secondary-color)',
              }}
            >
              Loading project location...
            </div>
          )}

          {!isResolvingCenter && !resolvedCenter && (
            <div
              className="rounded p-3"
              style={{
                background: 'var(--cui-secondary-bg)',
                border: '1px solid var(--cui-border-color)',
              }}
            >
              <div className="fw-semibold mb-1">Location required</div>
              <div style={{ color: 'var(--cui-secondary-color)' }}>
                {centerError || 'Add project latitude/longitude to enable Location Intelligence rings and demographics.'}
              </div>
            </div>
          )}

          {resolvedCenter && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">{projectName}</span>
                  <span style={{ color: 'var(--cui-secondary-color)', fontSize: '0.875rem' }}>
                    {resolvedCenter[1].toFixed(5)}, {resolvedCenter[0].toFixed(5)}
                  </span>
                  <span style={{ color: 'var(--cui-secondary-color)', fontSize: '0.875rem' }}>
                    · {rentalComparablePoints.length} rental comparables
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <CButton color="secondary" variant="outline" size="sm" onClick={() => void handleRefresh()}>
                    Refresh
                  </CButton>
                </div>
              </div>

              <div className="location-intelligence-map-shell">
                <div
                  className="position-relative overflow-hidden location-intelligence-map-frame"
                  style={{
                    borderRadius: '0.375rem',
                    border: '1px solid var(--cui-border-color)',
                    background: 'var(--cui-secondary-bg)',
                  }}
                >
                  {shouldMountMap ? (
                    <LocationMap
                      center={resolvedCenter}
                      rings={demographics?.rings || []}
                      userPoints={rentalComparablePoints}
                      layers={layers}
                      selectedRadius={selectedRadius}
                      onMapClick={handleRingAreaClick}
                      isAddingPoint={false}
                      resizeToken={mapResizeToken}
                    />
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center h-100"
                      style={{ color: 'var(--cui-secondary-color)' }}
                    >
                      Initializing map...
                    </div>
                  )}

                  <div className="location-intelligence-overlay-stack">
                    <CCard className="location-intelligence-overlay-card">
                      <CCardHeader
                        className="d-flex justify-content-between align-items-center location-intelligence-overlay-header"
                        onClick={() => setIsLayersOpen((value) => !value)}
                      >
                        <span>Layers</span>
                        <CIcon icon={isLayersOpen ? cilChevronTop : cilChevronBottom} />
                      </CCardHeader>
                      {isLayersOpen && (
                        <CCardBody className="p-2 location-intelligence-overlay-body">
                          <MapLayerToggle layers={layers} onToggle={handleLayerToggle} />
                        </CCardBody>
                      )}
                    </CCard>
                  </div>
                </div>
              </div>
            </>
          )}
        </CCardBody>
      )}

      <CModal visible={isRingModalOpen} onClose={() => setIsRingModalOpen(false)} alignment="center">
        <CModalHeader>
          <CModalTitle>
            {selectedRingStats ? `${selectedRingStats.radius_miles}-Mile Ring Demographics` : 'Ring Demographics'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {!selectedRingStats && (
            <div style={{ color: 'var(--cui-secondary-color)' }}>
              Click inside a ring to view demographic metrics.
            </div>
          )}
          {selectedRingStats && (
            <div className="d-flex flex-column gap-2">
              {DEMOGRAPHIC_FIELDS.map((field) => {
                const value = selectedRingStats[field.key as keyof RingDemographics];
                const numericValue = typeof value === 'number' ? value : null;
                return (
                  <div
                    key={field.key}
                    className="d-flex justify-content-between align-items-center"
                    style={{ borderBottom: '1px solid var(--cui-border-color)', paddingBottom: '0.35rem' }}
                  >
                    <span style={{ color: 'var(--cui-secondary-color)' }}>{field.label}</span>
                    <span style={{ fontWeight: 600 }}>
                      {formatDemographicValue(numericValue, field.format)}
                    </span>
                  </div>
                );
              })}
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ color: 'var(--cui-secondary-color)' }}>Block Groups</span>
                <span style={{ fontWeight: 600 }}>{selectedRingStats.block_groups_included ?? '—'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ color: 'var(--cui-secondary-color)' }}>Land Area</span>
                <span style={{ fontWeight: 600 }}>
                  {selectedRingStats.total_land_area_sqmi !== null && selectedRingStats.total_land_area_sqmi !== undefined
                    ? `${selectedRingStats.total_land_area_sqmi.toFixed(1)} sq mi`
                    : '—'}
                </span>
              </div>
              <div style={{ color: 'var(--cui-secondary-color)', fontSize: '0.85rem' }}>
                {isLoading ? 'Refreshing demographics…' : error || 'Click inside 1, 3, or 5-mile ring areas to switch.'}
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setIsRingModalOpen(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  );
}
