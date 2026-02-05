/**
 * FolderTabs Component
 *
 * ARGUS-style stacked folder tab navigation with two rows:
 * - Row 1: Top-level folder tabs with colored top border indicators
 * - Row 2: Sub-tabs that change based on the selected folder
 *
 * STYLING RULES:
 * - All colors use CSS variables (CoreUI --cui-* or custom folder colors)
 * - No Tailwind color classes (bg-*, text-*, border-* with colors)
 * - Tailwind layout utilities (flex, gap, p-*, m-*) are allowed
 *
 * @version 2.0
 * @created 2026-01-23
 * @updated 2026-01-23 - Added two-line label support
 */

'use client';

import React, { memo } from 'react';
import { CSpinner } from '@coreui/react';
import type { FolderTab, SubTab } from '@/lib/utils/folderTabConfig';
import { isTwoLineLabel } from '@/lib/utils/folderTabConfig';

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
 * Render folder label - handles both simple strings and two-line labels
 */
function renderFolderLabel(label: string | { primary: string; secondary: string }) {
  if (isTwoLineLabel(label)) {
    return (
      <span className="folder-tab-label-two-line">
        <span className="folder-tab-label-primary">{label.primary}</span>
        <span className="folder-tab-label-secondary">{label.secondary}</span>
      </span>
    );
  }
  return <span className="folder-tab-label">{label}</span>;
}

/**
 * Individual folder tab button
 */
interface FolderTabButtonProps {
  folder: FolderTab;
  isActive: boolean;
  onClick: () => void;
}

const FolderTabButton = memo(function FolderTabButton({
  folder,
  isActive,
  onClick,
}: FolderTabButtonProps) {
  return (
    <button
      type="button"
      className={`folder-tab ${isActive ? 'active' : ''}`}
      data-folder={folder.id}
      style={
        {
          '--folder-color': folder.color,
        } as React.CSSProperties
      }
      onClick={onClick}
      aria-selected={isActive}
      role="tab"
    >
      {renderFolderLabel(folder.label)}
    </button>
  );
});

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
  // Handle badge click separately - only the badge should open modal
  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent button click from firing
    if (onBadgeClick) {
      onBadgeClick();
    }
  };

  // Determine what badge to show based on badgeState or legacy badgeCount
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
 * FolderTabs - Two-row folder tab navigation
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
  // Find the active folder configuration
  const activeFolder = folders.find((f) => f.id === currentFolder) || folders[0];

  // Handle folder click - navigate to folder with its default tab
  const handleFolderClick = (folder: FolderTab) => {
    const defaultTab = folder.subTabs[0]?.id || 'overview';
    onNavigate(folder.id, defaultTab);
  };

  // Handle sub-tab click - navigate within current folder
  const handleSubTabClick = (tab: SubTab) => {
    onNavigate(currentFolder, tab.id);
  };

  // Check if active folder has subtabs
  const hasSubTabs = activeFolder.subTabs.length > 0;

  return (
    <div className="folder-tabs-container">
      {/* Row 1: Folder Tabs */}
      <div className="folder-tabs-row1" role="tablist" aria-label="Main navigation">
        {folders.map((folder) => (
          <FolderTabButton
            key={folder.id}
            folder={folder}
            isActive={folder.id === currentFolder}
            onClick={() => handleFolderClick(folder)}
          />
        ))}
      </div>

      {/* Row 2: Sub-tabs - only render if folder has subtabs */}
      {hasSubTabs && (
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
      )}
    </div>
  );
}

export default memo(FolderTabs);
