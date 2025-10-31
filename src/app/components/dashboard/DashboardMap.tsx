'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { MapOblique, MapObliqueRef } from '@/components/map/MapOblique';
import type { ProjectSummary } from '@/app/components/ProjectProvider';

interface DashboardMapProps {
  projects: ProjectSummary[];
}

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  'MPC': '#0d6efd',           // primary blue
  'MULTIFAMILY': '#198754',   // success green
  'COMMERCIAL': '#0dcaf0',    // info cyan
  'OFFICE': '#ffc107',        // warning yellow
  'RETAIL': '#dc3545',        // danger red
  'INDUSTRIAL': '#6c757d',    // secondary grey
  'HOTEL': '#212529',         // dark
  'MIXED_USE': '#0d6efd',     // primary blue
  'SUBDIVISION': '#0dcaf0'    // info cyan
};

export default function DashboardMap({ projects }: DashboardMapProps) {
  const mapRef = useRef<MapObliqueRef>(null);

  // Calculate center point and bounds from all projects with coordinates
  const { center, markers, bounds } = useMemo(() => {
    const projectsWithCoords = projects.filter(
      p => p.location_lat != null && p.location_lon != null
    );

    if (projectsWithCoords.length === 0) {
      // Default to LA area if no projects have coordinates
      return {
        center: [-118.2437, 34.0522] as [number, number],
        markers: [],
        bounds: null
      };
    }

    // Calculate bounds to fit all projects
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    projectsWithCoords.forEach(p => {
      if (p.location_lat! < minLat) minLat = p.location_lat!;
      if (p.location_lat! > maxLat) maxLat = p.location_lat!;
      if (p.location_lon! < minLon) minLon = p.location_lon!;
      if (p.location_lon! > maxLon) maxLon = p.location_lon!;
    });

    // Calculate average center
    const avgLat = projectsWithCoords.reduce((sum, p) => sum + (p.location_lat || 0), 0) / projectsWithCoords.length;
    const avgLon = projectsWithCoords.reduce((sum, p) => sum + (p.location_lon || 0), 0) / projectsWithCoords.length;

    // Create markers for each project
    const projectMarkers = projectsWithCoords.map((project, index) => ({
      id: `project-${project.project_id}`,
      coordinates: [project.location_lon!, project.location_lat!] as [number, number],
      color: PROPERTY_TYPE_COLORS[project.property_type_code || ''] || '#6c757d',
      label: `${index + 1}`,
      tooltip: project.project_name
    }));

    return {
      center: [avgLon, avgLat] as [number, number],
      markers: projectMarkers,
      bounds: [[minLon, minLat], [maxLon, maxLat]] as [[number, number], [number, number]]
    };
  }, [projects]);

  // Fit map to bounds when it loads
  React.useEffect(() => {
    if (mapRef.current && bounds && markers.length > 1) {
      // Give the map a moment to initialize, then fit bounds
      setTimeout(() => {
        mapRef.current?.fitBounds(bounds, { padding: 50, pitch: 0, bearing: 0 });
      }, 500);
    }
  }, [bounds, markers.length]);

  return (
    <div className="h-full w-full relative">
      {markers.length === 0 ? (
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
          <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
            No project locations available
          </p>
        </div>
      ) : (
        <MapOblique
          ref={mapRef}
          center={center}
          zoom={10}
          pitch={0}
          bearing={0}
          markers={markers}
          styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'}
        />
      )}
    </div>
  );
}
