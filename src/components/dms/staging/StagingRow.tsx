'use client';

/**
 * StagingRow — Per-file row in the staging tray.
 * Shows classification, confidence, field targets, collision info, and action buttons.
 */

import React from 'react';
import {
  type StagedFile,
  type StagingRoute,
  confidenceLabel,
} from './classifyFile';

interface StagingRowProps {
  file: StagedFile;
  docTypes: string[];
  onRemove: (id: string) => void;
  onConfirm: (id: string) => void;
  onSetDocType: (id: string, docType: string) => void;
  onSetRoute: (id: string, route: StagingRoute) => void;
}

// ============================================
// HELPERS
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx++;
  }
  return `${size >= 10 || idx === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[idx]}`;
}

function fileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return '📄';
  if (['xlsx', 'xls', 'xlsm', 'csv'].includes(ext)) return '📊';
  if (['jpg', 'jpeg', 'png', 'gif', 'heic'].includes(ext)) return '🖼️';
  if (['doc', 'docx', 'txt'].includes(ext)) return '📝';
  return '📎';
}

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = {
  high:   { bg: 'rgba(34, 197, 94, 0.15)', text: '#16a34a' },
  medium: { bg: 'rgba(234, 179, 8, 0.15)',  text: '#ca8a04' },
  low:    { bg: 'rgba(156, 163, 175, 0.15)', text: '#6b7280' },
};

const ROUTE_LABELS: Record<StagingRoute, string> = {
  extract: 'Extract',
  library: 'Library',
  reference: 'Reference',
};

// ============================================
// COMPONENT
// ============================================

export default function StagingRow({
  file: sf,
  docTypes,
  onRemove,
  onConfirm,
  onSetDocType,
  onSetRoute,
}: StagingRowProps) {
  const effectiveDocType = sf.userDocType || sf.classifiedDocType || 'General';
  const effectiveRoute = sf.userRoute || sf.route;
  const confLevel = confidenceLabel(sf.confidence);
  const confColors = CONFIDENCE_COLORS[confLevel];

  // ------------------------------------------
  // ANALYZING STATE
  // ------------------------------------------
  if (sf.status === 'analyzing') {
    return (
      <div
        className="d-flex align-items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--cui-border-color)', opacity: 0.7 }}
      >
        <span>{fileIcon(sf.file.name)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate" style={{ color: 'var(--cui-body-color)' }}>
            {sf.file.name}
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            {formatBytes(sf.file.size)}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
          <span className="spinner-border spinner-border-sm" role="status" />
          Analyzing...
        </div>
      </div>
    );
  }

  // ------------------------------------------
  // UPLOADING STATE
  // ------------------------------------------
  if (sf.status === 'uploading') {
    return (
      <div
        className="d-flex align-items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--cui-border-color)', opacity: 0.5 }}
      >
        <span>{fileIcon(sf.file.name)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate" style={{ color: 'var(--cui-body-color)' }}>
            {sf.file.name}
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            Uploading as {effectiveDocType}...
          </div>
        </div>
        <span className="spinner-border spinner-border-sm" role="status" />
      </div>
    );
  }

  // ------------------------------------------
  // COMPLETE STATE
  // ------------------------------------------
  if (sf.status === 'complete') {
    return (
      <div
        className="d-flex align-items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--cui-border-color)', opacity: 0.6 }}
      >
        <span>{fileIcon(sf.file.name)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate" style={{ color: 'var(--cui-body-color)' }}>
            {sf.file.name}
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-success)' }}>
            {effectiveRoute === 'library' ? 'Staged for library (coming soon)' : 'Uploaded successfully'}
          </div>
        </div>
        <span style={{ color: 'var(--cui-success)', fontSize: '1.1rem' }}>&#10003;</span>
      </div>
    );
  }

  // ------------------------------------------
  // ERROR STATE
  // ------------------------------------------
  if (sf.status === 'error') {
    return (
      <div
        className="d-flex align-items-center gap-3 px-4 py-3 border-b"
        style={{
          borderColor: 'var(--cui-border-color)',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
        }}
      >
        <span>{fileIcon(sf.file.name)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate" style={{ color: 'var(--cui-body-color)' }}>
            {sf.file.name}
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-danger)' }}>
            {sf.errorMessage || 'Upload failed'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(sf.id)}
          className="btn btn-ghost-secondary btn-sm"
          style={{ fontSize: '0.75rem' }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // ------------------------------------------
  // READY STATE (full controls)
  // ------------------------------------------
  return (
    <div
      className="px-4 py-3 border-b"
      style={{ borderColor: 'var(--cui-border-color)' }}
    >
      {/* Row 1: File info + controls */}
      <div className="d-flex align-items-center gap-3">
        <span style={{ fontSize: '1.1rem' }}>{fileIcon(sf.file.name)}</span>

        {/* Filename + size */}
        <div className="flex-1 min-w-0" style={{ minWidth: 0 }}>
          <div className="text-sm truncate" style={{ color: 'var(--cui-body-color)' }}>
            {sf.file.name}
          </div>
          <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
            {formatBytes(sf.file.size)}
          </div>
        </div>

        {/* Doc type dropdown */}
        <select
          value={effectiveDocType}
          onChange={e => onSetDocType(sf.id, e.target.value)}
          className="form-select form-select-sm"
          style={{
            width: 'auto',
            maxWidth: '160px',
            fontSize: '0.75rem',
            borderColor: 'var(--cui-border-color)',
            backgroundColor: 'var(--cui-body-bg)',
            color: 'var(--cui-body-color)',
          }}
        >
          {/* Include current type even if not in docTypes list */}
          {!docTypes.includes(effectiveDocType) && (
            <option value={effectiveDocType}>{effectiveDocType}</option>
          )}
          {docTypes.map(dt => (
            <option key={dt} value={dt}>{dt}</option>
          ))}
        </select>

        {/* Confidence badge */}
        {!sf.userDocType && (
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{
              backgroundColor: confColors.bg,
              color: confColors.text,
              whiteSpace: 'nowrap',
            }}
          >
            {confLevel === 'high' ? 'High' : confLevel === 'medium' ? 'Med' : 'Low'}
          </span>
        )}

        {/* Route selector */}
        <div className="d-flex gap-1">
          {(['extract', 'library', 'reference'] as StagingRoute[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => onSetRoute(sf.id, r)}
              className="btn btn-sm"
              style={{
                fontSize: '0.65rem',
                padding: '2px 6px',
                backgroundColor: effectiveRoute === r ? 'var(--cui-primary)' : 'transparent',
                color: effectiveRoute === r ? '#fff' : 'var(--cui-secondary-color)',
                border: effectiveRoute === r ? 'none' : '1px solid var(--cui-border-color)',
              }}
              title={
                r === 'extract' ? 'Extract to project fields'
                : r === 'library' ? 'Route to cost library (coming soon)'
                : 'Store as reference only'
              }
            >
              {ROUTE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemove(sf.id)}
          className="btn btn-ghost-danger btn-sm"
          style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          title="Remove from staging"
        >
          Remove
        </button>

        {/* Confirm */}
        <button
          type="button"
          onClick={() => onConfirm(sf.id)}
          className="btn btn-primary btn-sm"
          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
        >
          {effectiveRoute === 'library' ? 'Stage for Library' : 'Add to Project'}
        </button>
      </div>

      {/* Row 2: Field targets + collision warning */}
      {(sf.fieldTargets.length > 0 || sf.collision) && (
        <div className="d-flex align-items-center gap-3 mt-1 ps-4" style={{ marginLeft: '1.1rem' }}>
          {/* Field targets (Route A only) */}
          {effectiveRoute === 'extract' && sf.fieldTargets.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
              Will populate: {sf.fieldTargets.join(', ')}
            </span>
          )}

          {/* Cost library note (Route B) */}
          {effectiveRoute === 'library' && (
            <span className="text-xs" style={{ color: 'var(--cui-warning)' }}>
              Mapping review required before committing &mdash; coming in Prompt 9
            </span>
          )}

          {/* Collision warning */}
          {sf.collision && (
            <span className="text-xs" style={{ color: 'var(--cui-warning)' }}>
              &#9888; V{sf.collision.existingDoc.version_number} already exists &mdash; saving as new version
            </span>
          )}
        </div>
      )}
    </div>
  );
}
