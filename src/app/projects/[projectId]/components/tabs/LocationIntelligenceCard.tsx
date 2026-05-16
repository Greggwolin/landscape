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
import { escapeHtml, splitAddressLines } from '@/lib/maps/addressFormat';

import { getAuthHeaders } from '@/lib/authHeaders';
interface LocationIntelligenceCardProps {
  projectId: number;
  projectName: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  projectState?: string;
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

const getGroupedPopupHtml = (comps: RentalComparable[], color: string): string => {
  const first = comps[0];
  const addrStr = first.address ? escapeHtml(first.address.replace(/\s*\n\s*/g, ', ')) : '';

  // Filter to rows with meaningful data
  const validRows = comps.filter((c) => {
    const rent = Number(c.asking_rent);
    const sqft = Number(c.avg_sqft);
    const beds = Number(c.bedrooms);
    return (Number.isFinite(rent) && rent > 0) || (Number.isFinite(sqft) && sqft > 0) || (Number.isFinite(beds) && beds > 0);
  });

  // Build floorplan rows
  const floorplanRows = validRows
    .sort((a, b) => Number(a.bedrooms) - Number(b.bedrooms))
    .map((c) => {
      const rent = Number(c.asking_rent);
      const sqft = Number(c.avg_sqft);
      const beds = Number(c.bedrooms);
      const baths = Number(c.bathrooms);
      const rentStr = Number.isFinite(rent) && rent > 0 ? `<b>$${Math.round(rent).toLocaleString()}</b>` : '—';
      const sqftStr = Number.isFinite(sqft) && sqft > 0 ? `${sqft.toLocaleString()} SF` : '';
      const label = `${beds}BR/${baths}BA`;
      return `<tr><td style="padding:0 4px;font-size:11px;">${escapeHtml(label)}</td><td style="padding:0 4px;text-align:right;font-size:11px;color:#94a3b8;">${sqftStr}</td><td style="padding:0 4px;text-align:right;font-size:11px;">${rentStr}</td></tr>`;
    })
    .join('');

  const distStr = first.distance_miles ? `<span style="font-size:10px;color:#94a3b8;">${first.distance_miles} mi away</span>` : '';

  return `<div style="padding:6px 8px;min-width:160px;line-height:1.3;">
    <div style="font-weight:600;font-size:12px;color:${color};margin-bottom:1px;">${escapeHtml(first.property_name)}</div>
    ${addrStr ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">${addrStr}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;">${floorplanRows}</table>
    ${distStr}
  </div>`;
};

export default function LocationIntelligenceCard({
  projectId,
  projectName,
  latitude,
  longitude,
  projectState,
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

  const [demographicsLoadStatus, setDemographicsLoadStatus] = useState<'idle' | 'loading' | 'complete' | 'error'>('idle');

  const { demographics, isLoading, error, refetch } = useDemographics({
    lat: resolvedCenter?.[1] ?? 0,
    lon: resolvedCenter?.[0] ?? 0,
    projectId: String(projectId),
    enabled: isOpen && resolvedCenter !== null,
  });

  const handleLoadDemographics = useCallback(async () => {
    if (!projectState || demographicsLoadStatus === 'loading') return;

    const djangoUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
    setDemographicsLoadStatus('loading');

    try {
      // Trigger background load
      const response = await fetch(`${djangoUrl}/api/v1/location-intelligence/demographics/load-state/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: projectState }),
      });

      const result = await response.json();

      if (result.status === 'already_loaded') {
        // Data exists — just refetch demographics (cache may have been stale)
        setDemographicsLoadStatus('complete');
        await refetch();
        return;
      }

      if (result.status === 'started' || result.status === 'already_loading') {
        // Poll for completion
        const pollInterval = setInterval(async () => {
          try {
            const statusResp = await fetch(
              `${djangoUrl}/api/v1/location-intelligence/demographics/state-coverage/?state=${projectState}`
            );
            const statusData = await statusResp.json();

            if (statusData.status === 'complete') {
              clearInterval(pollInterval);
              setDemographicsLoadStatus('complete');
              // Invalidate project cache and refetch
              await fetch(
                `${djangoUrl}/api/v1/location-intelligence/demographics/project/${projectId}/delete/`,
                { method: 'DELETE' }
              ).catch(() => {});
              await refetch();
            }
          } catch {
            // Keep polling
          }
        }, 5000);

        // Safety timeout: stop polling after 10 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setDemographicsLoadStatus((prev) => prev === 'loading' ? 'error' : prev);
        }, 600000);
      }
    } catch (err) {
      console.error('Failed to trigger demographics load:', err);
      setDemographicsLoadStatus('error');
    }
  }, [projectState, projectId, demographicsLoadStatus, refetch]);

  const rentalComparablePoints = useMemo<UserMapPoint[]>(() => {
    // Group comparables by property_name so each property gets one marker
    const grouped = new Map<string, RentalComparable[]>();
    rentalComparables.forEach((comp) => {
      const key = comp.property_name;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(comp);
    });

    let markerIndex = 0;
    return Array.from(grouped.entries())
      .map(([propertyName, comps]) => {
        // Use first comp with valid coords as the marker location
        const withCoords = comps.find((c) => {
          const lat = parseCoordinate(c.latitude);
          const lon = parseCoordinate(c.longitude);
          return lat !== null && lon !== null;
        });
        if (!withCoords) return null;

        const lat = parseCoordinate(withCoords.latitude)!;
        const lon = parseCoordinate(withCoords.longitude)!;
        markerIndex += 1;

        const color = comparableColors[propertyName] || getComparableColor(propertyName);
        return {
          id: `comp-property-${propertyName}`,
          label: propertyName,
          category: 'competitor',
          coordinates: [lon, lat],
          markerColor: color,
          markerLabel: String(markerIndex),
          popupHtml: getGroupedPopupHtml(comps, color),
        };
      })
      .filter((point): point is UserMapPoint => point !== null);
  }, [comparableColors, rentalComparables]);

  const { uniqueProjectCount, floorplanCount } = useMemo(() => {
    const uniqueNames = new Set(rentalComparables.map((c) => c.property_name));
    return {
      uniqueProjectCount: uniqueNames.size,
      floorplanCount: rentalComparables.length,
    };
  }, [rentalComparables]);

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
        const response = await fetch(`/api/projects/${projectId}/details`, { headers: getAuthHeaders() });
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
    setLayers((prev) => {
      const next = { ...prev, [layer]: !prev[layer] };
      // Satellite and Hybrid are mutually exclusive basemap modes
      if (layer === 'satellite' && next.satellite) {
        next.hybrid = false;
      } else if (layer === 'hybrid' && next.hybrid) {
        next.satellite = false;
      }
      return next;
    });
  }, []);

  const handleRingClick = useCallback((ring: RingDemographics) => {
    setSelectedRadius(ring.radius_miles);
    setSelectedRingStats(ring);
    setIsRingModalOpen(true);
  }, []);

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
        <span>
          {projectName} - Competitive Rental Market
          <span
            style={{
              marginLeft: '1rem',
              fontWeight: 400,
              fontSize: '0.85em',
              color: 'var(--cui-secondary-color)',
            }}
          >
            {uniqueProjectCount} Projects / {floorplanCount} Floorplans
          </span>
        </span>
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
                    onRingClick={handleRingClick}
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
                      <CCardBody className="location-intelligence-overlay-body" style={{ padding: '8px' }}>
                        <MapLayerToggle layers={layers} onToggle={handleLayerToggle} />
                      </CCardBody>
                    )}
                  </CCard>
                </div>

                {/* Refresh button - bottom-left of map */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    zIndex: 20,
                  }}
                >
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRefresh()}
                    style={{
                      background: 'var(--cui-card-bg)',
                      borderColor: 'var(--cui-border-color)',
                    }}
                  >
                    Refresh
                  </CButton>
                </div>
              </div>

              {/* Demographics load prompt — shown when map renders but no ring data */}
              {!isLoading && (!demographics || !demographics.rings.length) && (
                <div
                  className="rounded p-3 mt-2"
                  style={{
                    background: 'var(--cui-secondary-bg)',
                    border: '1px solid var(--cui-border-color)',
                  }}
                >
                  {demographicsLoadStatus === 'loading' ? (
                    <div className="d-flex align-items-center gap-2">
                      <div className="spinner-border spinner-border-sm" role="status" />
                      <span>Loading Census data for this area... This may take a few minutes.</span>
                    </div>
                  ) : demographicsLoadStatus === 'complete' ? (
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ color: 'var(--cui-success)' }}>Census data loaded.</span>
                      <CButton color="primary" size="sm" onClick={() => void handleRefresh()}>
                        Refresh Demographics
                      </CButton>
                    </div>
                  ) : demographicsLoadStatus === 'error' ? (
                    <div>
                      <span style={{ color: 'var(--cui-danger)' }}>Failed to load Census data. Check server logs.</span>
                    </div>
                  ) : (
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>No demographics available</div>
                        <div style={{ color: 'var(--cui-secondary-color)', fontSize: '0.85rem' }}>
                          Census block group data hasn&apos;t been loaded for this state yet.
                        </div>
                      </div>
                      {projectState && (
                        <CButton
                          color="primary"
                          size="sm"
                          onClick={() => void handleLoadDemographics()}
                        >
                          Load Demographics
                        </CButton>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
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
