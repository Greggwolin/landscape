/**
 * FolderTabs Component
 *
 * Sub-tab navigation (Row 2 only).
 * Row 1 folder tiles have been moved into ActiveProjectBar as compact nav tiles.
 *
 * STYLING RULES:
 * - All colors use CSS variables (CoreUI --cui-* or custom folder colors)
 * - No Tailwind color classes (bg-*, text-*, border-* with colors)
 * - Tailwind layout utilities (flex, gap, p-*, m-*) are allowed
 *
 * @version 3.0
 * @created 2026-01-23
 * @updated 2026-02-22 - Removed Row 1 (moved to ActiveProjectBar), kept Row 2 sub-tabs only
 */

'use client';

import React, { memo } from 'react';
import { CSpinner } from '@coreui/react';
import type { FolderTab, SubTab } from '@/lib/utils/folderTabConfig';

/** Badge state configuration for sub-tabs */
export interface SubTabBadgeState {
  type: 'processing' | 'error' | 'pending' | null;
  count: number | null;
  message?: string;
}

export interface FolderTabsProps {
  /** Array of folder configurations */
  folders: FolderTab[];
  /** Currently active folder ID */
  currentFolder: string;
  /** Currently active tab ID */
  currentTab: string;
  /** Callback when user navigates to a folder/tab */
  onNavigate: (folder: string, tab: string) => void;
  /** Optional badge counts keyed by sub-tab id (legacy, use subTabBadgeStates for full control) */
  subTabBadges?: Record<string, number>;
  /** Optional badge states keyed by sub-tab id (supports processing/error/pending states) */
  subTabBadgeStates?: Record<string, SubTabBadgeState>;
  /** Optional callback when sub-tab with badge is clicked. Return true to prevent navigation. */
  onSubTabBadgeClick?: (tabId: string, badgeCount: number) => boolean;
}

/**
 * Individual sub-tab button
 */
interface SubTabButtonProps {
  tab: SubTab;
  isActive: boolean;
  onClick: () => void;
  badgeCount?: number;
  badgeState?: SubTabBadgeState;
  onBadgeClick?: () => boolean;
}

const SubTabButton = memo(function SubTabButton({
  tab,
  isActive,
  onClick,
  badgeCount,
  badgeState,
  onBadgeClick,
}: SubTabButtonProps) {
  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBadgeClick) {
      onBadgeClick();
    }
  };

  const effectiveState = badgeState || (badgeCount && badgeCount > 0 ? { type: 'pending' as const, count: badgeCount } : null);

  const renderBadge = () => {
    if (!effectiveState || !effectiveState.type) return null;

    const baseProps = {
      onClick: handleBadgeClick,
      role: 'button' as const,
      tabIndex: 0,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          if (onBadgeClick) onBadgeClick();
        }
      },
    };

    switch (effectiveState.type) {
      case 'processing':
        return (
          <span
            className="sub-tab-badge sub-tab-badge-processing"
            title="Extraction in progress"
            {...baseProps}
          >
            <CSpinner size="sm" style={{ width: '12px', height: '12px' }} />
          </span>
        );
      case 'error':
        return (
          <span
            className="sub-tab-badge sub-tab-badge-error"
            title={effectiveState.message || 'Extraction failed'}
            {...baseProps}
          >
            !
          </span>
        );
      case 'pending':
        if (!effectiveState.count || effectiveState.count === 0) return null;
        return (
          <span className="sub-tab-badge" {...baseProps}>
            {effectiveState.count}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      className={`sub-tab ${isActive ? 'active' : ''}`}
      onClick={onClick}
      aria-selected={isActive}
      role="tab"
    >
      {tab.label}
      {renderBadge()}
    </button>
  );
});

/**
 * FolderTabs - Sub-tab navigation only (Row 2)
 * Row 1 folder tiles are now in ActiveProjectBar.
 */
function FolderTabs({
  folders,
  currentFolder,
  currentTab,
  onNavigate,
  subTabBadges,
  subTabBadgeStates,
  onSubTabBadgeClick,
}: FolderTabsProps) {
  const activeFolder = folders.find((f) => f.id === currentFolder) || folders[0];

  const handleSubTabClick = (tab: SubTab) => {
    onNavigate(currentFolder, tab.id);
  };

  const hasSubTabs = activeFolder.subTabs.length > 0;

  // Only render if there are sub-tabs for the active folder
  if (!hasSubTabs) return null;

  return (
    <div className="folder-tabs-container">
      {/* Row 2: Sub-tabs */}
      <div className="folder-tabs-row2" role="tablist" aria-label="Section navigation">
        {activeFolder.subTabs.map((tab) => (
          <SubTabButton
            key={tab.id}
            tab={tab}
            isActive={tab.id === currentTab}
            onClick={() => handleSubTabClick(tab)}
            badgeCount={subTabBadges?.[tab.id]}
            badgeState={subTabBadgeStates?.[tab.id]}
            onBadgeClick={
              onSubTabBadgeClick && (subTabBadges?.[tab.id] || subTabBadgeStates?.[tab.id]?.count)
                ? () => onSubTabBadgeClick(tab.id, subTabBadges?.[tab.id] || subTabBadgeStates?.[tab.id]?.count || 0)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

export default memo(FolderTabs);
