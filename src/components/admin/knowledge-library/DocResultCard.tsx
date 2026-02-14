'use client';

import React from 'react';
import { CButton } from '@coreui/react';

export interface DocResult {
  doc_id: number;
  document_key?: string | null;   // Platform Knowledge slug — used for chat routing
  name: string;
  project_id: number | null;
  project_name: string | null;
  doc_type: string;
  format: string;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  modified_at: string | null;
  relevance_score: number;
  snippet: string;
  storage_uri: string | null;
}

interface DocResultCardProps {
  doc: DocResult;
  isSelected: boolean;
  isExpanded?: boolean;
  onToggleSelect: (docId: number) => void;
  onPreview: (docId: number) => void;
  onRowClick?: (docId: number) => void;
}

const FORMAT_ICONS: Record<string, string> = {
  PDF: '\u{1F4C4}',
  XLSX: '\u{1F4CA}',
  DOCX: '\u{1F4DD}',
  IMAGE: '\u{1F5BC}',
  CSV: '\u{1F4C8}',
  OTHER: '\u{1F4CE}',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocResultCard({
  doc,
  isSelected,
  isExpanded = false,
  onToggleSelect,
  onPreview,
  onRowClick,
}: DocResultCardProps) {
  const icon = FORMAT_ICONS[doc.format] || FORMAT_ICONS.OTHER;
  const metaParts = [
    doc.project_name,
    doc.doc_type,
    formatSize(doc.file_size_bytes),
    formatDate(doc.modified_at || doc.uploaded_at),
  ].filter(Boolean);

  return (
    <div
      className={`kl-doc-card${isExpanded ? ' kl-doc-card-expanded' : ''}`}
      onClick={() => onRowClick?.(doc.doc_id)}
      style={{ cursor: onRowClick ? 'pointer' : undefined }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(doc.doc_id)}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
      />
      <span className="kl-doc-card-icon">{icon}</span>
      <div className="kl-doc-card-info">
        <div className="kl-doc-card-name">{doc.name}</div>
        <div className="kl-doc-card-meta">{metaParts.join(' \u00B7 ')}</div>
      </div>
      <div className="kl-doc-card-actions">
        <CButton
          color="primary"
          variant="ghost"
          size="sm"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onPreview(doc.doc_id);
          }}
          style={{ fontSize: '0.75rem' }}
        >
          Preview
        </CButton>
      </div>
    </div>
  );
}
