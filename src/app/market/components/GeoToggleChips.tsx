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
  US: 'US',
};

interface GeoToggleChipsProps {
  targets: GeoTarget[];
  selectedGeoIds: string[];
  onToggle: (geoId: string) => void;
}

export const GeoToggleChips: React.FC<GeoToggleChipsProps> = ({ targets, selectedGeoIds, onToggle }) => {
  if (!targets.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {targets.map((target) => {
        const label = LABELS[target.geo_level] ?? target.geo_level;
        const isActive = selectedGeoIds.includes(target.geo_id);
        return (
          <button
            key={target.geo_id}
            type="button"
            onClick={() => onToggle(target.geo_id)}
            className={clsx(
              'px-3 py-1 rounded-full border text-sm transition-colors',
              isActive
                ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                : 'border-gray-600 text-gray-300 hover:border-blue-400 hover:text-blue-200'
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
