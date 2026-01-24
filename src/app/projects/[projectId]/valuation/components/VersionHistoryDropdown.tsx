'use client';

import React from 'react';
import {
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CDropdownDivider,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilHistory } from '@coreui/icons';

import { VersionBadge, VersionStatus } from './VersionBadge';

export interface NarrativeVersion {
  id: number;
  version_number: number;
  status: VersionStatus;
  created_at: string;
  updated_at?: string;
  summary?: string | null;
}

interface VersionHistoryDropdownProps {
  versions: NarrativeVersion[];
  currentVersion?: NarrativeVersion | null;
  loading?: boolean;
  onVersionSelect: (version: NarrativeVersion) => void;
  onViewHistory?: () => void;
  className?: string;
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function VersionHistoryDropdown({
  versions,
  currentVersion,
  loading = false,
  onVersionSelect,
  onViewHistory,
  className = '',
}: VersionHistoryDropdownProps) {
  const sortedVersions = [...versions].sort((a, b) => b.version_number - a.version_number);

  return (
    <CDropdown className={`version-history-dropdown ${className}`.trim()}>
      <CDropdownToggle color="secondary" variant="ghost" size="sm" disabled={loading}>
        {loading ? (
          <>
            <CSpinner size="sm" className="me-2" />
            Loading...
          </>
        ) : (
          <>
            <CIcon icon={cilHistory} size="sm" className="me-2" />
            {currentVersion ? `v${currentVersion.version_number}` : 'No versions'}
            {currentVersion && (
              <span className="ms-2">
                <VersionBadge status={currentVersion.status} />
              </span>
            )}
          </>
        )}
      </CDropdownToggle>
      <CDropdownMenu className="version-history-menu">
        {sortedVersions.length === 0 ? (
          <CDropdownItem disabled>No versions available</CDropdownItem>
        ) : (
          sortedVersions.map((version, index) => (
            <React.Fragment key={version.id}>
              <CDropdownItem
                onClick={() => onVersionSelect(version)}
                className="version-history-item"
              >
                <div className="version-history-item-row">
                  <div className="version-history-main">
                    <div className="version-history-title">
                      <span
                        className={`version-history-dot ${
                          currentVersion?.id === version.id ? 'is-active' : ''
                        }`}
                      />
                      v{version.version_number}
                      {index === 0 && <span className="version-history-current">Current</span>}
                    </div>
                    <div className="version-history-summary">
                      {version.summary || 'Narrative update'}
                    </div>
                  </div>
                  <div className="version-history-meta">
                    <VersionBadge status={version.status} />
                    <span className="version-history-date">{formatDate(version.created_at)}</span>
                  </div>
                </div>
              </CDropdownItem>
              {index < sortedVersions.length - 1 && <CDropdownDivider />}
            </React.Fragment>
          ))
        )}
        {onViewHistory && (
          <>
            <CDropdownDivider />
            <CDropdownItem onClick={onViewHistory}>View History</CDropdownItem>
          </>
        )}
      </CDropdownMenu>
    </CDropdown>
  );
}

export default VersionHistoryDropdown;
