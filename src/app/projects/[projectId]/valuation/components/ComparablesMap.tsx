/**
 * ComparablesMap Component
 *
 * Displays comparable properties on a map with markers
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SalesComparable } from '@/types/valuation';
import { COMP_MARKER_COLORS, getCompMarkerColor } from '@/lib/valuation/compMarkerUtils';
import { registerRasterDim } from '@/lib/maps/rasterDim';

interface ComparablesMapProps {
  comparables: SalesComparable[];
  subjectProperty?: {
    latitude: number;
    longitude: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    units?: number;
    sale_price?: number;
    year_built?: number;
  };
  height?: string;
  className?: string;
}

export function ComparablesMap({
  comparables,
  subjectProperty,
  height = '500px',
  className = ''
}: ComparablesMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    let cleanupRasterDim: (() => void) | null = null;

    // Clean up existing map
    if (map.current) {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current.remove();
      map.current = null;
    }

    // Filter comparables with valid coordinates
    const validComps = comparables.filter(comp =>
      comp.latitude !== null &&
      comp.longitude !== null &&
      !isNaN(Number(comp.latitude)) &&
      !isNaN(Number(comp.longitude))
    );

    if (validComps.length === 0 && !subjectProperty) {
      setError('No location data available for comparables');
      return;
    }

    try {
      // Calculate bounds to fit all markers
      const bounds = new maplibregl.LngLatBounds();

      if (subjectProperty) {
        bounds.extend([subjectProperty.longitude, subjectProperty.latitude]);
      }

      validComps.forEach(comp => {
        bounds.extend([Number(comp.longitude), Number(comp.latitude)]);
      });

      // Initialize map with satellite/aerial imagery
      const newMap = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            },
            'labels': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256
            }
          },
          layers: [
            {
              id: 'satellite',
              type: 'raster',
              source: 'raster-tiles',
              minzoom: 0,
              maxzoom: 22
            },
            {
              id: 'labels',
              type: 'raster',
              source: 'labels',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        },
        center: bounds.getCenter(),
        zoom: 11,
        scrollZoom: false,
      });

      cleanupRasterDim = registerRasterDim(newMap, 0.1);

      map.current = newMap;

      // Add navigation controls
      newMap.addControl(new maplibregl.NavigationControl(), 'top-right');

      newMap.on('load', () => {
        // Add subject property marker (red star)
        if (subjectProperty) {
          const subjectEl = document.createElement('div');
          subjectEl.innerHTML = `
            <div style="
              width: 32px;
              height: 32px;
              background-color: #dc3545;
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: white;
              font-size: 18px;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">★</div>
          `;

          const subjectMarker = new maplibregl.Marker({
            element: subjectEl
          })
            .setLngLat([subjectProperty.longitude, subjectProperty.latitude])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(
                `<div style="padding: 8px; min-width: 200px; line-height: 1.3;">
                  <div style="font-weight: 600; color: #dc3545; margin-bottom: 2px;">Subject Property</div>
                  <div style="font-size: 0.9em; margin-bottom: 2px;">${subjectProperty.name}</div>
                  ${subjectProperty.address ? `<div style="font-size: 0.85em; color: #495057;">${subjectProperty.address}</div>` : ''}
                  ${subjectProperty.city || subjectProperty.state ? `<div style="font-size: 0.85em; color: #495057; margin-bottom: 2px;">${subjectProperty.city || ''}${subjectProperty.city && subjectProperty.state ? ', ' : ''}${subjectProperty.state || ''}</div>` : ''}
                  ${subjectProperty.units ? `<div style="font-size: 0.85em; color: #495057;">Units: ${subjectProperty.units}</div>` : ''}
                  ${subjectProperty.sale_price ? `<div style="font-size: 0.85em; color: #495057;">Asking Price: $${Number(subjectProperty.sale_price).toLocaleString()}</div>` : ''}
                  ${subjectProperty.year_built ? `<div style="font-size: 0.85em; color: #495057;">Year Built: ${subjectProperty.year_built}</div>` : ''}
                </div>`
              )
            )
            .addTo(newMap);
          markers.current.push(subjectMarker);
        }

        // Add comparable markers with numbers
        validComps.forEach((comp, idx) => {
          const { bg: markerColor, text: textColor } = getCompMarkerColor(idx + 1);
          const compEl = document.createElement('div');
          compEl.innerHTML = `
            <div style="
              width: 30px;
              height: 30px;
              background-color: ${markerColor};
              border: 2.5px solid #000;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: ${textColor};
              font-size: 14px;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            ">${idx + 1}</div>
          `;

          const marker = new maplibregl.Marker({
            element: compEl
          })
            .setLngLat([Number(comp.longitude), Number(comp.latitude)])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(
                `<div style="padding: 8px; min-width: 200px; line-height: 1.3;">
                  <div style="font-weight: 600; font-size: 1.1em; color: ${markerColor}; margin-bottom: 2px;">Comp ${idx + 1} - ${comp.property_name || 'Unnamed'}</div>
                  <div style="font-size: 0.85em; color: #495057;">
                    ${comp.address || ''}
                  </div>
                  <div style="font-size: 0.85em; color: #495057; margin-bottom: 2px;">
                    ${comp.city || ''}${comp.city && comp.state ? ', ' : ''}${comp.state || ''}
                  </div>
                  ${comp.sale_price ? `<div style="font-size: 0.85em; color: #495057;">Sale Price: $${Number(comp.sale_price).toLocaleString()}</div>` : ''}
                  ${comp.price_per_unit ? `<div style="font-size: 0.85em; color: #495057;">Price/Unit: $${Math.round(Number(comp.price_per_unit)).toLocaleString()}</div>` : ''}
                  ${comp.units ? `<div style="font-size: 0.85em; color: #495057;">Units: ${comp.units}</div>` : ''}
                  ${comp.year_built ? `<div style="font-size: 0.85em; color: #495057;">Year Built: ${comp.year_built}</div>` : ''}
                </div>`
              )
            )
            .addTo(newMap);
          markers.current.push(marker);
        });

        // Center on subject property for initial state
        if (subjectProperty) {
          newMap.setCenter([subjectProperty.longitude, subjectProperty.latitude]);
          newMap.setZoom(13);
        } else if (validComps.length > 0) {
          newMap.fitBounds(bounds, {
            padding: { top: 60, bottom: 60, left: 60, right: 60 },
            maxZoom: 13
          });
        }
      });

    } catch (err) {
      console.error('Error initializing map:', err);
      setError(err instanceof Error ? err.message : 'Failed to load map');
    }

    // Cleanup
    return () => {
      if (map.current) {
        markers.current.forEach(marker => marker.remove());
        markers.current = [];
        cleanupRasterDim?.();
        map.current.remove();
        map.current = null;
      }
    };
  }, [comparables, subjectProperty]);

  if (error) {
    return (
      <div
        className={`card d-flex align-items-center justify-content-center ${className}`}
        style={{
          height,
          backgroundColor: 'var(--cui-card-bg)',
          borderColor: 'var(--cui-border-color)',
          marginBottom: 0,
        }}
      >
        <div className="text-center" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗺️</div>
          <div className="fw-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>
            Map Unavailable
          </div>
          <p className="small mb-0" style={{ color: 'var(--cui-secondary-color)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card d-flex flex-column ${className}`}
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
        height: height,
        marginBottom: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header — mirrors ValuationSalesCompMap */}
      <div
        className="card-header flex-shrink-0"
        style={{ backgroundColor: 'var(--cui-card-header-bg)' }}
      >
        <h5
          className="mb-0"
          style={{ color: 'var(--cui-body-color)', fontSize: '0.875rem', fontWeight: 600 }}
        >
          Comparable Locations
        </h5>
        <small style={{ color: 'var(--cui-secondary-color)' }}>
          {comparables.filter(c => c.latitude && c.longitude).length} of {comparables.length} comps with location data
        </small>
      </div>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="flex-grow-1"
        style={{ minHeight: 0 }}
      />

      {/* Legend */}
      <div
        className="card-footer d-flex align-items-center gap-3 flex-shrink-0"
        style={{
          backgroundColor: 'var(--cui-card-header-bg)',
          borderColor: 'var(--cui-border-color)',
          fontSize: '0.75rem',
          padding: '0.5rem 1rem',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <div style={{ width: 12, height: 12, backgroundColor: '#dc3545', borderRadius: '50%' }} />
          <span style={{ color: 'var(--cui-secondary-color)' }}>Subject Property</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div style={{ display: 'flex', gap: 2 }}>
            {COMP_MARKER_COLORS.slice(0, 5).map((c, i) => (
              <div key={i} style={{ width: 8, height: 8, backgroundColor: c, borderRadius: '50%', border: '1px solid #000' }} />
            ))}
          </div>
          <span style={{ color: 'var(--cui-secondary-color)' }}>Comparables</span>
        </div>
      </div>
    </div>
  );
}
