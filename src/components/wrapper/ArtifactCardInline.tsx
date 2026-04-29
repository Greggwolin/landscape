'use client';

import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';

interface ArtifactCardInlineProps {
  artifactId: number;
  title: string;
  /** Optional subtitle (e.g. "Operating Statement"). Defaults to nothing. */
  subtitle?: string;
  onOpen: (artifactId: number) => void;
}

/**
 * Inline artifact card rendered below an assistant chat bubble whose
 * tool_executions included a `create_artifact` call.
 *
 * Click "Open" → caller sets the active artifact id (and re-opens the
 * right artifacts panel if collapsed). The card never renders the
 * artifact's body — the workspace panel does.
 *
 * Phase 4 / Finding #4 — see SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §9.4.
 */
export function ArtifactCardInline({
  artifactId,
  title,
  subtitle,
  onOpen,
}: ArtifactCardInlineProps) {
  return (
    <div
      className="rounded border d-flex align-items-center gap-2 px-3 py-2"
      style={{
        background: 'var(--cui-tertiary-bg)',
        borderColor: 'var(--cui-border-color)',
        color: 'var(--cui-body-color)',
        maxWidth: '90%',
      }}
    >
      <FileText
        size={16}
        style={{ color: 'var(--cui-secondary-color)', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {subtitle && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              color: 'var(--cui-secondary-color)',
              marginBottom: 1,
            }}
          >
            {subtitle}
          </div>
        )}
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={title}
        >
          {title}
        </div>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-ghost-primary d-flex align-items-center gap-1"
        onClick={() => onOpen(artifactId)}
        style={{ flexShrink: 0, fontSize: 12 }}
      >
        <ExternalLink size={12} />
        Open
      </button>
    </div>
  );
}

export default ArtifactCardInline;
