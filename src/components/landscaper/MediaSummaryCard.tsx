'use client';

/**
 * MediaSummaryCard — Inline card displayed in Landscaper chat when
 * media assets are detected in an uploaded document.
 *
 * Shows badge-colored counts by type and a "Review Media Assets" button
 * that opens the MediaPreviewModal.
 *
 * @version 1.0
 * @created 2026-02-08
 */

import React from 'react';
import { CBadge } from '@coreui/react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaSummaryData {
  doc_id: number;
  doc_name: string;
  total_detected: number;
  by_type: Record<
    string,
    {
      name: string;
      count: number;
      badge_color: string;
      content_intent?: string;
      default_action?: string;
    }
  >;
}

interface MediaSummaryCardProps {
  summary: MediaSummaryData;
  onReview: (docId: number, docName: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MediaSummaryCard({
  summary,
  onReview,
}: MediaSummaryCardProps) {
  const { doc_id, doc_name, total_detected, by_type } = summary;

  if (!total_detected || total_detected === 0) return null;

  // Sort types by count descending
  const sortedTypes = Object.entries(by_type)
    .filter(([, info]) => info.count > 0)
    .sort(([, a], [, b]) => b.count - a.count);

  return (
    <div
      className="card mt-2"
      style={{
        backgroundColor: 'var(--cui-tertiary-bg)',
        borderColor: 'var(--cui-border-color)',
        maxWidth: 420,
      }}
    >
      <div className="card-body p-3">
        {/* Header */}
        <div
          className="d-flex align-items-center gap-2 mb-2"
          style={{ fontSize: '0.85rem' }}
        >
          <span style={{ fontSize: '1.1rem' }}>{'\uD83D\uDDBC\uFE0F'}</span>
          <span className="fw-semibold" style={{ color: 'var(--cui-body-color)' }}>
            {total_detected} media asset{total_detected !== 1 ? 's' : ''} detected
          </span>
        </div>

        {/* Badge-colored type counts */}
        <div className="d-flex gap-1 flex-wrap mb-3">
          {sortedTypes.map(([code, info]) => (
            <CBadge
              key={code}
              color={info.badge_color as any}
              shape="rounded-pill"
              style={{ fontSize: '0.75rem' }}
            >
              {info.count} {info.name}
            </CBadge>
          ))}
        </div>

        {/* Review button */}
        <button
          className="btn btn-sm btn-outline-primary w-100"
          onClick={() => onReview(doc_id, doc_name)}
        >
          Review Media Assets
        </button>
      </div>
    </div>
  );
}
