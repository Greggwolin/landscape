'use client';

import React from 'react';

interface ValueAddToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

/**
 * ValueAddToggle - Toggle for Value-Add mode
 *
 * When enabled, shows Post-Reno input columns in all sections.
 * When disabled, hides Post-Reno columns for simpler view.
 */
export function ValueAddToggle({
  enabled,
  onChange,
  className = ''
}: ValueAddToggleProps) {
  return (
    <div className={`ops-toggle-group ${className}`}>
      <span className="ops-toggle-label">Value-Add</span>
      <div
        className={`ops-toggle ${enabled ? 'on' : ''}`}
        onClick={() => onChange(!enabled)}
        role="switch"
        aria-checked={enabled}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!enabled);
          }
        }}
      />
    </div>
  );
}

export default ValueAddToggle;
