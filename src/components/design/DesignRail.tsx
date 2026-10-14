'use client';

/**
 * DesignRail — the collapsed project rail from the Slice 1 reference (C3 et al.):
 * 56px near-black column, "»" to expand into the full nav, a hairline, then one
 * 36px square per standing section carrying its two-letter code. The active
 * section is accent-tinted. Pure presentation over buildDesignNav().
 */
import React from 'react';
import type { DesignNavSection } from './designNav';

interface DesignRailProps {
  sections: DesignNavSection[];
  activeSectionId?: string;
  onSelectSection: (section: DesignNavSection) => void;
  onExpand: () => void;
}

export function DesignRail({ sections, activeSectionId, onSelectSection, onExpand }: DesignRailProps) {
  return (
    <nav className="ds-rail" aria-label="Project sections">
      <button type="button" className="ds-rail-btn" onClick={onExpand} title="Expand navigation" aria-label="Expand navigation">
        »
      </button>
      <div className="ds-rail-rule" />
      {sections.map((s) => {
        const active = s.id === activeSectionId;
        return (
          <button
            key={s.id}
            type="button"
            className={active ? 'ds-rail-btn ds-rail-code is-active' : 'ds-rail-btn ds-rail-code'}
            onClick={() => onSelectSection(s)}
            title={s.label}
            aria-label={s.label}
            aria-current={active ? 'page' : undefined}
          >
            {s.code}
          </button>
        );
      })}
    </nav>
  );
}

export default DesignRail;
