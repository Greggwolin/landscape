'use client';

/**
 * MediaPreviewModal — Review and confirm actions for detected media assets.
 *
 * Shows a scrollable gallery of detected/extracted media from a document,
 * with per-item action buttons (Save Image, Extract Data, Both, Ignore).
 * Pre-selects based on AI classification. User confirms, and selections
 * are written to core_doc_media.user_action.
 *
 * @version 1.0
 * @created 2026-02-08
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
} from '@coreui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MediaCard, { type MediaItem, type MediaAction } from './MediaCard';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaActionSummary {
  total: number;
  save_image: number;
  extract_data: number;
  both: number;
  ignore: number;
}

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: number;
  docName: string;
  projectId: number;
  onComplete?: (summary: MediaActionSummary) => void;
}

interface MediaListResponse {
  doc_id: number;
  doc_name: string;
  media_scan_status: string;
  summary: {
    total: number;
    by_action: Record<string, number>;
    by_color: Record<string, unknown>;
  };
  items: MediaItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter categories
// ─────────────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'photos' | 'plans' | 'maps' | 'charts' | 'other';

const FILTER_MAP: Record<FilterKey, string[]> = {
  all: [],
  photos: ['property_photo', 'aerial_photo', 'rendering', 'before_after'],
  plans: ['site_plan', 'floor_plan'],
  maps: ['aerial_map', 'zoning_map', 'location_map', 'planning_map'],
  charts: ['chart', 'infographic'],
  other: ['logo', 'other'],
};

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'photos', label: 'Photos' },
  { key: 'plans', label: 'Plans' },
  { key: 'maps', label: 'Maps' },
  { key: 'charts', label: 'Charts' },
  { key: 'other', label: 'Other' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MediaPreviewModal({
  isOpen,
  onClose,
  docId,
  docName,
  projectId,
  onComplete,
}: MediaPreviewModalProps) {
  const djangoBaseUrl =
    process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [actionMap, setActionMap] = useState<Record<number, MediaAction>>({});
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data, isLoading, error } = useQuery<MediaListResponse>({
    queryKey: ['document-media', docId],
    queryFn: async () => {
      const res = await fetch(
        `${djangoBaseUrl}/api/dms/documents/${docId}/media/`
      );
      if (!res.ok) throw new Error('Failed to load media');
      return res.json();
    },
    enabled: isOpen && !!docId,
  });

  // Initialize action map from server data when it loads
  const items = data?.items ?? [];
  const initializedActions = useMemo(() => {
    const map: Record<number, MediaAction> = {};
    for (const item of items) {
      map[item.media_id] =
        item.user_action ?? item.suggested_action ?? 'save_image';
    }
    return map;
  }, [items]);

  // Merge: local overrides take precedence over server defaults
  const effectiveActions = useMemo(() => {
    return { ...initializedActions, ...actionMap };
  }, [initializedActions, actionMap]);

  // ── Filtering ──────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    const codes = FILTER_MAP[activeFilter];
    return items.filter((item) => {
      const code = item.classification?.code ?? 'other';
      return codes.includes(code);
    });
  }, [items, activeFilter]);

  // ── Filter counts ──────────────────────────────────────────────────────
  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: items.length,
      photos: 0,
      plans: 0,
      maps: 0,
      charts: 0,
      other: 0,
    };
    for (const item of items) {
      const code = item.classification?.code ?? 'other';
      for (const [key, codes] of Object.entries(FILTER_MAP)) {
        if (key !== 'all' && codes.includes(code)) {
          counts[key as FilterKey]++;
        }
      }
    }
    return counts;
  }, [items]);

  // ── Action summary ─────────────────────────────────────────────────────
  const actionSummary = useMemo((): MediaActionSummary => {
    const summary: MediaActionSummary = {
      total: items.length,
      save_image: 0,
      extract_data: 0,
      both: 0,
      ignore: 0,
    };
    for (const item of items) {
      const action = effectiveActions[item.media_id] ?? 'save_image';
      summary[action]++;
    }
    return summary;
  }, [items, effectiveActions]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleActionChange = useCallback(
    (mediaId: number, action: MediaAction) => {
      setActionMap((prev) => ({ ...prev, [mediaId]: action }));
    },
    []
  );

  // Bulk actions
  const handleBulkByType = useCallback(
    (typeCodes: string[], action: MediaAction) => {
      setActionMap((prev) => {
        const next = { ...prev };
        for (const item of items) {
          const code = item.classification?.code ?? 'other';
          if (typeCodes.includes(code)) {
            next[item.media_id] = action;
          }
        }
        return next;
      });
    },
    [items]
  );

  const handleReset = useCallback(() => {
    setActionMap({});
  }, []);

  // ── Submit mutation ────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      const actions = items.map((item) => ({
        media_id: item.media_id,
        action: effectiveActions[item.media_id] ?? 'save_image',
      }));
      const res = await fetch(
        `${djangoBaseUrl}/api/dms/documents/${docId}/media/actions/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actions }),
        }
      );
      if (!res.ok) throw new Error('Failed to submit actions');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-media', docId] });
      onComplete?.(actionSummary);
      onClose();
    },
  });

  // ── Lightbox ───────────────────────────────────────────────────────────
  const lightboxSrc = lightboxItem?.storage_uri
    ? lightboxItem.storage_uri.startsWith('http')
      ? lightboxItem.storage_uri
      : `${djangoBaseUrl}/media/${lightboxItem.storage_uri}`
    : lightboxItem?.thumbnail_uri
      ? lightboxItem.thumbnail_uri.startsWith('http')
        ? lightboxItem.thumbnail_uri
        : `${djangoBaseUrl}/media/${lightboxItem.thumbnail_uri}`
      : null;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <CModal
        visible={isOpen}
        onClose={onClose}
        size="xl"
        backdrop="static"
        alignment="center"
      >
        <CModalHeader
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderColor: 'var(--cui-border-color)',
          }}
        >
          <CModalTitle className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.2rem' }}>{'\uD83D\uDDBC\uFE0F'}</span>
            <span>Media Assets</span>
            <span
              className="fw-normal"
              style={{
                fontSize: '0.85rem',
                color: 'var(--cui-secondary-color)',
              }}
            >
              {'\u2014'} {docName}
            </span>
          </CModalTitle>
        </CModalHeader>

        <CModalBody
          style={{
            maxHeight: '70vh',
            overflowY: 'auto',
            backgroundColor: 'var(--cui-body-bg)',
          }}
        >
          {isLoading && (
            <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
              Loading media assets...
            </div>
          )}

          {error && (
            <div className="text-center py-5" style={{ color: 'var(--cui-danger)' }}>
              Failed to load media. Please try again.
            </div>
          )}

          {!isLoading && !error && items.length === 0 && (
            <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
              No media assets detected in this document.
            </div>
          )}

          {!isLoading && !error && items.length > 0 && (
            <>
              {/* Summary bar */}
              <div
                className="d-flex align-items-center gap-2 flex-wrap mb-3 px-2 py-2 rounded"
                style={{
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  fontSize: '0.85rem',
                }}
              >
                <span className="fw-semibold">
                  {items.length} detected
                </span>
                <span style={{ color: 'var(--cui-border-color)' }}>|</span>
                {actionSummary.save_image > 0 && (
                  <CBadge color="success" shape="rounded-pill">
                    {'\uD83D\uDCBE'} {actionSummary.save_image} save
                  </CBadge>
                )}
                {actionSummary.extract_data > 0 && (
                  <CBadge color="warning" shape="rounded-pill">
                    {'\uD83D\uDCCA'} {actionSummary.extract_data} extract
                  </CBadge>
                )}
                {actionSummary.both > 0 && (
                  <CBadge color="info" shape="rounded-pill">
                    {'\uD83D\uDD04'} {actionSummary.both} both
                  </CBadge>
                )}
                {actionSummary.ignore > 0 && (
                  <CBadge color="secondary" shape="rounded-pill">
                    {'\u2298'} {actionSummary.ignore} skip
                  </CBadge>
                )}
              </div>

              {/* Filter bar */}
              <div className="d-flex gap-1 mb-3 flex-wrap">
                {FILTER_LABELS.map(({ key, label }) => {
                  const count = filterCounts[key];
                  const isActive = activeFilter === key;
                  return (
                    <button
                      key={key}
                      className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setActiveFilter(key)}
                      disabled={count === 0 && key !== 'all'}
                    >
                      {label}
                      {count > 0 && (
                        <span className="ms-1 small">({count})</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Media grid — 4 cols desktop, 2 tablet, 1 mobile */}
              <div
                className="row g-3"
                style={{ '--bs-columns': 4 } as React.CSSProperties}
              >
                {filteredItems.map((item) => (
                  <div
                    key={item.media_id}
                    className="col-12 col-sm-6 col-lg-3"
                  >
                    <MediaCard
                      item={item}
                      selectedAction={
                        effectiveActions[item.media_id] ?? 'save_image'
                      }
                      onActionChange={handleActionChange}
                      onThumbnailClick={setLightboxItem}
                      djangoBaseUrl={djangoBaseUrl}
                    />
                  </div>
                ))}
              </div>

              {/* Bulk actions */}
              <div
                className="d-flex gap-2 flex-wrap mt-3 pt-3"
                style={{ borderTop: '1px solid var(--cui-border-color)' }}
              >
                <span
                  className="small fw-semibold me-1 align-self-center"
                  style={{ color: 'var(--cui-secondary-color)' }}
                >
                  Bulk:
                </span>
                <button
                  className="btn btn-sm btn-outline-success"
                  onClick={() =>
                    handleBulkByType(
                      [
                        'property_photo',
                        'aerial_photo',
                        'rendering',
                        'before_after',
                      ],
                      'save_image'
                    )
                  }
                >
                  Save All Photos
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleBulkByType(['logo'], 'ignore')}
                >
                  Ignore All Logos
                </button>
                <button
                  className="btn btn-sm btn-outline-warning"
                  onClick={() =>
                    handleBulkByType(['chart', 'infographic'], 'extract_data')
                  }
                >
                  Extract All Charts
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleReset}
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </CModalBody>

        <CModalFooter
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderColor: 'var(--cui-border-color)',
          }}
        >
          <div className="d-flex justify-content-between w-100 align-items-center">
            <span
              className="small"
              style={{ color: 'var(--cui-secondary-color)' }}
            >
              {actionSummary.save_image + actionSummary.both} to save
              {actionSummary.extract_data > 0 &&
                ` \u2022 ${actionSummary.extract_data} for data extraction`}
              {actionSummary.ignore > 0 &&
                ` \u2022 ${actionSummary.ignore} skipped`}
            </span>
            <div className="d-flex gap-2">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => submitMutation.mutate()}
                disabled={
                  submitMutation.isPending || items.length === 0
                }
              >
                {submitMutation.isPending
                  ? 'Saving...'
                  : `Confirm Selections (${items.length})`}
              </button>
            </div>
          </div>
        </CModalFooter>
      </CModal>

      {/* Lightbox overlay */}
      {lightboxItem && lightboxSrc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setLightboxItem(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={lightboxSrc}
              alt={lightboxItem.classification?.name ?? 'Media preview'}
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -32,
                left: 0,
                right: 0,
                textAlign: 'center',
                color: '#fff',
                fontSize: '0.85rem',
              }}
            >
              {lightboxItem.classification?.name ?? 'Unclassified'} — pg.{' '}
              {lightboxItem.source_page}
              {lightboxItem.width_px > 0 &&
                ` — ${lightboxItem.width_px}\u00D7${lightboxItem.height_px}px`}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
