'use client';

import React from 'react';

import { NarrativeVersion } from './VersionHistoryDropdown';

interface ReadOnlyBannerProps {
  version: NarrativeVersion;
  onRestore: () => void;
  onBack: () => void;
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ReadOnlyBanner({ version, onRestore, onBack }: ReadOnlyBannerProps) {
  return (
    <div className="readonly-banner">
      <div>
        Viewing v{version.version_number} ({formatDate(version.created_at)})
      </div>
      <div className="d-flex align-items-center gap-2">
        <button className="btn btn-outline-warning btn-sm" type="button" onClick={onRestore}>
          Restore This Version
        </button>
        <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onBack}>
          Back to Current
        </button>
      </div>
    </div>
  );
}

export default ReadOnlyBanner;
