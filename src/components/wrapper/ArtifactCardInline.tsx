'use client';

import React, { useState } from 'react';
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
 * The entire tile is the click target — clicking the icon, title,
 * subtitle, padding, or the inline "Open" button all open the artifact
 * in the right artifacts panel (and re-open the panel if collapsed).
 * Keyboard activation: tab focus + Enter or Space.
 *
 * Phase 4 / Finding #4 — see SPEC_FINDING4_GENERATIVE_ARTIFACTS.md §9.4.
 * FB-286 — full-tile click target (was Open-button only).
 */
export function ArtifactCardInline({
  artifactId,
  title,
  subtitle,
  onOpen,
}: ArtifactCardInlineProps) {
  const [hovered, setHovered] = useState(false);

  const handleOpen = () => onOpen(artifactId);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open artifact: ${title}`}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded border d-flex align-items-center gap-2 px-3 py-2"
      style={{
        background: hovered
          ? 'var(--cui-secondary-bg)'
          : 'var(--cui-tertiary-bg)',
        borderColor: hovered
          ? 'var(--cui-primary)'
          : 'var(--cui-border-color)',
        color: 'var(--cui-body-color)',
        maxWidth: '90%',
        cursor: 'pointer',
        transition: 'background 120ms ease, border-color 120ms ease',
        outline: 'none',
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
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        tabIndex={-1}
        aria-hidden="true"
        style={{ flexShrink: 0, fontSize: 12 }}
      >
        <ExternalLink size={12} />
        Open
      </button>
    </div>
  );
}

export default ArtifactCardInline;
