'use client';

import React from 'react';
import ProjectTabMap, {
  type ComparableColorMap,
  type RentalComparable,
} from '@/components/map/ProjectTabMap';

interface ComparableRentalsMapTemplateProps {
  projectId: string;
  comparables: RentalComparable[];
  comparableColors: ComparableColorMap;
  onMarkerClick?: (propertyName: string) => void;
}

/**
 * Archived template of the previous Comparable Rentals map panel.
 * This is intentionally not mounted in Property > Market.
 */
export default function ComparableRentalsMapTemplate({
  projectId,
  comparables,
  comparableColors,
  onMarkerClick,
}: ComparableRentalsMapTemplateProps) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ flex: '1 1 auto', minHeight: '500px' }}>
      <ProjectTabMap
        projectId={projectId}
        styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
        tabId="property"
        rentalComparables={comparables}
        comparableColors={comparableColors}
        onMarkerClick={onMarkerClick}
      />
    </div>
  );
}
