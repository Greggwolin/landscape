import React from 'react';
import clsx from 'clsx';

export interface GeoTarget {
  geo_id: string;
  geo_level: string;
  geo_name: string;
}

const LABELS: Record<string, string> = {
  CITY: 'City',
  COUNTY: 'County',
  MSA: 'MSA',
  STATE: 'State',
  TRACT: 'Tract',
  US: 'US',
};

interface GeoToggleChipsProps {
  targets: GeoTarget[];
  selectedGeoIds: string[];
  onToggle: (geoId: string) => void;
  baseGeoId?: string | null;
  availableGeoIds?: Set<string>;
}

export const GeoToggleChips: React.FC<GeoToggleChipsProps> = ({
  targets,
  selectedGeoIds,
  onToggle,
  baseGeoId,
  availableGeoIds,
}) => {
  if (!targets.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {targets.map((target) => {
        const label = LABELS[target.geo_level] ?? target.geo_level;
        const isBase = baseGeoId === target.geo_id;
        const hasData = isBase || !availableGeoIds || availableGeoIds.has(target.geo_id);
        const isActive = hasData && (isBase || selectedGeoIds.includes(target.geo_id));
        return (
          <button
            key={target.geo_id}
            type="button"
            onClick={() => {
              if (!isBase && hasData) {
                onToggle(target.geo_id);
              }
            }}
            disabled={isBase || !hasData}
            className={clsx(
              'px-3 py-1 rounded-full border text-sm transition-colors',
              isActive
                ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                : hasData
                ? 'border-gray-600 text-gray-300 hover:border-blue-400 hover:text-blue-200'
                : 'border-gray-700 text-gray-600 cursor-not-allowed',
              isBase && 'cursor-default opacity-80'
            )}
          >
            <span className="font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default GeoToggleChips;
