'use client';

/**
 * VersionDropdown Component
 *
 * Dropdown for selecting and viewing narrative versions with:
 * - Version list showing version number, status, and date
 * - Status badges (draft, under_review, final)
 * - "Restore This Version" action that creates a new version
 * - Visual diff link (future enhancement)
 */

import React from 'react';
import {
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CDropdownDivider,
  CDropdownHeader,
  CBadge,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilHistory, cilCheckCircle, cilClock, cilFile, cilReload } from '@coreui/icons';

export interface NarrativeVersion {
  id: number;
  version_number: number;
  status: 'draft' | 'under_review' | 'final';
  created_at: string;
  created_by?: number | null;
}

export interface VersionDropdownProps {
  /** List of available versions */
  versions: NarrativeVersion[];
  /** Currently selected version */
  currentVersion?: NarrativeVersion | null;
  /** Whether versions are loading */
  loading?: boolean;
  /** Callback when a version is selected for viewing */
  onVersionSelect: (version: NarrativeVersion) => void;
  /** Callback when user wants to restore a version (creates new version from it) */
  onVersionRestore?: (version: NarrativeVersion) => void;
  /** Whether restore action is available */
  canRestore?: boolean;
  /** CSS class for the dropdown */
  className?: string;
}

/**
 * Get status badge color
 */
function getStatusColor(status: NarrativeVersion['status']): string {
  switch (status) {
    case 'final':
      return 'success';
    case 'under_review':
      return 'warning';
    case 'draft':
    default:
      return 'secondary';
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: NarrativeVersion['status']): string[] {
  switch (status) {
    case 'final':
      return cilCheckCircle;
    case 'under_review':
      return cilClock;
    case 'draft':
    default:
      return cilFile;
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: NarrativeVersion['status']): string {
  switch (status) {
    case 'final':
      return 'Final';
    case 'under_review':
      return 'Under Review';
    case 'draft':
    default:
      return 'Draft';
  }
}

/**
 * VersionDropdown component
 */
export function VersionDropdown({
  versions,
  currentVersion,
  loading = false,
  onVersionSelect,
  onVersionRestore,
  canRestore = true,
  className = '',
}: VersionDropdownProps) {
  // Sort versions by version_number descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version_number - a.version_number);
  const latestVersion = sortedVersions[0];
  const isViewingLatest = currentVersion?.id === latestVersion?.id;
  const isViewingOlder = currentVersion && !isViewingLatest;

  return (
    <CDropdown className={`version-dropdown ${className}`}>
      <CDropdownToggle color="secondary" variant="ghost" size="sm" disabled={loading}>
        {loading ? (
          <>
            <CSpinner size="sm" className="me-2" />
            Loading...
          </>
        ) : (
          <>
            <CIcon icon={cilHistory} size="sm" className="me-2" />
            {currentVersion ? (
              <>
                v{currentVersion.version_number}
                <CBadge
                  color={getStatusColor(currentVersion.status)}
                  size="sm"
                  className="ms-2"
                >
                  {getStatusLabel(currentVersion.status)}
                </CBadge>
              </>
            ) : (
              'No versions'
            )}
          </>
        )}
      </CDropdownToggle>

      <CDropdownMenu className="version-dropdown-menu">
        <CDropdownHeader>Version History</CDropdownHeader>

        {sortedVersions.length === 0 ? (
          <CDropdownItem disabled>No versions available</CDropdownItem>
        ) : (
          sortedVersions.map((version, index) => (
            <CDropdownItem
              key={version.id}
              active={currentVersion?.id === version.id}
              onClick={() => onVersionSelect(version)}
              className="version-dropdown-item"
            >
              <div className="version-item-content">
                <div className="version-item-header">
                  <span className="version-number">
                    v{version.version_number}
                    {index === 0 && (
                      <span className="version-latest-badge">(Latest)</span>
                    )}
                  </span>
                  <CBadge
                    color={getStatusColor(version.status)}
                    size="sm"
                  >
                    <CIcon icon={getStatusIcon(version.status)} size="sm" className="me-1" />
                    {getStatusLabel(version.status)}
                  </CBadge>
                </div>
                <div className="version-item-date">
                  {formatDate(version.created_at)}
                </div>
              </div>
            </CDropdownItem>
          ))
        )}

        {/* Restore option when viewing an older version */}
        {isViewingOlder && canRestore && onVersionRestore && (
          <>
            <CDropdownDivider />
            <CDropdownItem
              onClick={() => onVersionRestore(currentVersion!)}
              className="version-restore-item"
            >
              <CIcon icon={cilReload} size="sm" className="me-2 text-primary" />
              <span>Restore This Version</span>
              <small className="text-muted ms-1">(creates new v{(latestVersion?.version_number || 0) + 1})</small>
            </CDropdownItem>
          </>
        )}
      </CDropdownMenu>
    </CDropdown>
  );
}

export default VersionDropdown;
