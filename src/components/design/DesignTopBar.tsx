'use client';

/**
 * DesignTopBar — the 52px strip across the top of every Slice 1 project frame:
 * "L" mark · project name · type · location · the active section as an accent
 * chip · the section's sub-pages as a segmented control (when there is more
 * than one) · actions at the right (artifacts, full width, hide/show chat).
 */
import React from 'react';
import type { DesignNavItem, DesignNavSection } from './designNav';

const TYPE_LABEL: Record<string, string> = {
  LAND: 'Land', MF: 'Multifamily', OFF: 'Office', RET: 'Retail', IND: 'Industrial', HTL: 'Hotel', MXU: 'Mixed Use',
};

interface DesignTopBarProps {
  projectName: string;
  typeCode?: string | null;
  location?: string | null;
  section?: DesignNavSection;
  activeItem?: DesignNavItem;
  onSelectItem: (item: DesignNavItem) => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  onShowArtifacts?: () => void;
  onExpandScreen?: () => void;
  /** Muted note at the right (platform pages: "Landscaper — no project selected"). */
  note?: string;
}

export function DesignTopBar({
  projectName, typeCode, location, section, activeItem, onSelectItem,
  chatOpen, onToggleChat, onShowArtifacts, onExpandScreen, note,
}: DesignTopBarProps) {
  const type = typeCode ? TYPE_LABEL[typeCode.toUpperCase()] ?? typeCode : null;
  const meta = [type, location].filter(Boolean).join(' · ');
  return (
    <header className="ds-topbar">
      <div className="ds-mark" aria-hidden>L</div>
      <div className="ds-project">
        {projectName}
        {meta && <span className="ds-project-meta"> · {meta}</span>}
      </div>
      {section && <span className="ds-section-chip">{section.label}</span>}
      {section && section.items.length > 1 && (
        <div className="ds-seg" role="tablist" aria-label={`${section.label} pages`}>
          {section.items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={activeItem?.id === it.id}
              className={activeItem?.id === it.id ? 'ds-seg-btn is-active' : 'ds-seg-btn'}
              onClick={() => onSelectItem(it)}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
      <div className="ds-topbar-actions">
        {note && <span className="ds-muted ds-topbar-note">{note}</span>}
        {onShowArtifacts && (
          <button type="button" className="ds-ghost" onClick={onShowArtifacts} title="Artifacts">Artifacts</button>
        )}
        {onExpandScreen && (
          <button type="button" className="ds-ghost" onClick={onExpandScreen} title="Full width">⤢</button>
        )}
        <button type="button" className="ds-ghost" onClick={onToggleChat}>{chatOpen ? 'Hide chat' : 'Show chat'}</button>
      </div>
    </header>
  );
}

export default DesignTopBar;
