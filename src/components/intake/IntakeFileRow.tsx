'use client';

import React, { useState } from 'react';
import type { IntakeStagedFile, IntakeIntent } from '@/hooks/useIntakeStaging';

interface IntakeFileRowProps {
  file: IntakeStagedFile;
  onSetIntent: (id: string, intent: IntakeIntent) => void;
  onRemove: (id: string) => void;
}

// Intent configuration with UI details
const INTENTS: Record<IntakeIntent, {
  line1: string;
  line2: string;
  tooltip: string;
  color: string;
  destIcon: string;
  destLabel: string;
  destNote: string;
}> = {
  structured_ingestion: {
    line1: 'Extract',
    line2: 'Inputs',
    tooltip: 'Pull structured data into project tables — opens Workbench for field-by-field review',
    color: '#4f46e5',
    destIcon: '📂',
    destLabel: 'Project DMS + Workbench',
    destNote: 'Extracts fields for review',
  },
  project_knowledge: {
    line1: 'Project',
    line2: 'Knowledge',
    tooltip: 'Store in project files and feed to AI — informs Landscaper analysis and narratives',
    color: '#0891b2',
    destIcon: '📂',
    destLabel: 'Project DMS + Knowledge Base',
    destNote: 'Visible in project, feeds AI',
  },
  platform_knowledge: {
    line1: 'Platform',
    line2: 'Knowledge',
    tooltip: 'Feed to platform AI only — not visible in project files, searchable across all projects',
    color: '#7c3aed',
    destIcon: '🧠',
    destLabel: 'Platform Knowledge Base',
    destNote: 'Not in project files',
  },
};

// Helper: Get file icon emoji based on extension
function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    pdf: '📄',
    doc: '📋',
    docx: '📋',
    xls: '📊',
    xlsx: '📊',
    csv: '📊',
    txt: '📝',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
    zip: '📦',
    rar: '📦',
  };
  return iconMap[ext] || '📎';
}

// Helper: Format byte size to human-readable
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

// Helper: Get confidence label and color
function getConfidenceStyle(
  confidence?: number
): { label: string; bgColor: string; textColor: string } {
  if (confidence === undefined || confidence === null) {
    return { label: 'pending', bgColor: '#6b7280', textColor: '#f3f4f6' };
  }
  if (confidence >= 0.9) {
    return { label: 'high', bgColor: '#10b981', textColor: '#ecfdf5' };
  }
  if (confidence >= 0.7) {
    return { label: 'medium', bgColor: '#f59e0b', textColor: '#fffbeb' };
  }
  return { label: 'low', bgColor: '#ef4444', textColor: '#fef2f2' };
}

export const IntakeFileRow: React.FC<IntakeFileRowProps> = ({
  file,
  onSetIntent,
  onRemove,
}) => {
  const [showDestination, setShowDestination] = useState<IntakeIntent | null>(null);
  const confidenceStyle = getConfidenceStyle(file.confidence);
  const isCollision = file.collision !== null;
  const isReady = file.status === 'ready';
  const isAnalyzing = file.status === 'analyzing';
  const isUploading = file.status === 'uploading';
  const isComplete = file.status === 'complete';
  const isError = file.status === 'error';

  // Disable intent buttons for collision or non-ready states
  const intentDisabled = isCollision || !isReady;

  return (
    <div
      style={{
        marginBottom: '1rem',
        borderRadius: '0.5rem',
        backgroundColor: 'var(--cui-dark)',
        border: `1px solid var(--cui-border-color)`,
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem',
          position: 'relative',
        }}
      >
        {/* File icon */}
        <span style={{ fontSize: '1.25rem' }}>{getFileIcon(file.file.name)}</span>

        {/* File name and size */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 500,
              color: 'var(--cui-body-color)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {file.file.name}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
            {formatSize(file.file.size)}
          </div>
        </div>

        {/* Doc type badge */}
        {file.docType && (
          <span
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.5rem',
              backgroundColor: '#374151',
              color: '#e5e7eb',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            {file.docType}
          </span>
        )}

        {/* Confidence badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
            backgroundColor: confidenceStyle.bgColor,
            color: confidenceStyle.textColor,
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          {confidenceStyle.label}
        </span>

        {/* Intent buttons (only if ready and no collision) */}
        {!isAnalyzing && !isUploading && !isError && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(Object.keys(INTENTS) as IntakeIntent[]).map((intent) => {
              const config = INTENTS[intent];
              const isSelected = file.intent === intent;
              return (
                <div key={intent} style={{ position: 'relative' }}>
                  <button
                    onClick={() => !intentDisabled && onSetIntent(file.id, intent)}
                    disabled={intentDisabled}
                    title={config.tooltip}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.125rem',
                      padding: '0.5rem 0.625rem',
                      backgroundColor: isSelected ? config.color : '#374151',
                      color: isSelected ? '#ffffff' : '#d1d5db',
                      border: `1px solid ${isSelected ? config.color : '#4b5563'}`,
                      borderRadius: '0.375rem',
                      cursor: intentDisabled ? 'not-allowed' : 'pointer',
                      opacity: intentDisabled ? 0.5 : 1,
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      lineHeight: 1,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={() => !intentDisabled && setShowDestination(intent)}
                    onMouseLeave={() => setShowDestination(null)}
                  >
                    <span>{config.line1}</span>
                    <span>{config.line2}</span>
                  </button>

                  {/* Tooltip on hover */}
                  {showDestination === intent && !intentDisabled && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '0.5rem',
                        backgroundColor: '#1f2937',
                        border: `1px solid ${config.color}`,
                        color: '#e5e7eb',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        maxWidth: '200px',
                        textAlign: 'center',
                        whiteSpace: 'normal',
                        zIndex: 10,
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      {config.tooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Status indicator */}
        {isAnalyzing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#93c5fd' }}>
            <div
              style={{
                width: '1rem',
                height: '1rem',
                border: '2px solid #93c5fd',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '0.875rem' }}>Analyzing...</span>
          </div>
        )}

        {isUploading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24' }}>
            <div
              style={{
                width: '1rem',
                height: '1rem',
                border: '2px solid #fbbf24',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '0.875rem' }}>Uploading...</span>
          </div>
        )}

        {isComplete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
            <span style={{ fontSize: '1rem' }}>✓</span>
            <span style={{ fontSize: '0.875rem' }}>Saved</span>
          </div>
        )}

        {isError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <span style={{ fontSize: '0.875rem' }}>Error</span>
          </div>
        )}

        {/* Cancel button */}
        <button
          onClick={() => onRemove(file.id)}
          disabled={isUploading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2rem',
            height: '2rem',
            padding: 0,
            backgroundColor: 'transparent',
            border: 'none',
            color: isUploading ? '#9ca3af' : '#ef4444',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            borderRadius: '0.375rem',
            opacity: isUploading ? 0.5 : 1,
            transition: 'all 0.2s ease',
            fontSize: '1.125rem',
          }}
          onMouseEnter={(e) => {
            if (!isUploading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7f1d1d';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
          title="Remove file"
        >
          ✕
        </button>
      </div>

      {/* Collision warning (if present) */}
      {isCollision && file.collision && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: '#7f1d1d',
            borderTop: `1px solid #dc2626`,
            color: '#fecaca',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}
        >
          <span style={{ width: '1rem', height: '1rem', flexShrink: 0, marginTop: '0.125rem' }}>⚠️</span>
          <div>
            <div>
              {file.collision.matchType === 'content'
                ? `Duplicate file: ${file.collision.existingDoc.filename}`
                : `Filename conflict: ${file.collision.existingDoc.filename}`}
            </div>
          </div>
        </div>
      )}

      {/* Destination indicator (when intent selected) */}
      {file.intent && !isError && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: '#1f2937',
            borderTop: `1px solid var(--cui-border-color)`,
            fontSize: '0.875rem',
            color: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>{INTENTS[file.intent].destIcon}</span>
          <span style={{ fontWeight: 500 }}>→ {INTENTS[file.intent].destLabel}</span>
          <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>
            {INTENTS[file.intent].destNote}
          </span>
        </div>
      )}

      {/* Completion message (if saved) */}
      {isComplete && file.docId && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: '#064e3b',
            borderTop: `1px solid #10b981`,
            fontSize: '0.875rem',
            color: '#d1fae5',
          }}
        >
          ✓ Saved to {file.intent === 'project_knowledge' ? 'Project Knowledge' : file.intent === 'platform_knowledge' ? 'Platform Knowledge' : 'Workbench'}
        </div>
      )}

      {/* Error message (if error) */}
      {isError && file.errorMessage && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: '#7f1d1d',
            borderTop: `1px solid #dc2626`,
            fontSize: '0.875rem',
            color: '#fecaca',
          }}
        >
          {file.errorMessage}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default IntakeFileRow;
