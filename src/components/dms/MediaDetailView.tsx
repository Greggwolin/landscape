'use client';

import React, { useState, useEffect, useCallback } from 'react';
// CoreUI components used via className + CSS vars (no CoreUI component imports needed)
import { useQuery } from '@tanstack/react-query';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MediaItem {
  media_id: number;
  doc_id: number;
  source_page: number;
  width_px: number;
  height_px: number;
  storage_uri: string;
  thumbnail_uri?: string;
  status?: string;
  suggested_action?: string;
  user_action?: string;
  ai_confidence?: number;
  classification: {
    code: string;
    name: string;
    badge_color: string;
    classification_id?: number;
  } | null;
  source_doc_name?: string;
}

interface Classification {
  classification_id: number;
  code: string;
  name: string;
  badge_color: string;
}

interface DiscardReason {
  item_id: number;
  code: string;
  label: string;
  sort_order: number;
}

interface MediaDetailViewProps {
  mediaItem: MediaItem;
  classifications: Classification[];
  currentIndex: number;
  totalCount: number;
  djangoBaseUrl: string;
  resolveImageSrc: (uri: string | undefined | null) => string;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReclassify: (mediaId: number, classificationId: number, classInfo: Classification) => void;
  onDiscard: (mediaId: number, reasonCode: string, customReason?: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MediaDetailView({
  mediaItem,
  classifications,
  currentIndex,
  totalCount,
  djangoBaseUrl,
  resolveImageSrc,
  onBack,
  onPrev,
  onNext,
  onReclassify,
  onDiscard,
}: MediaDetailViewProps) {
  const [showDiscard, setShowDiscard] = useState(false);
  const [otherReason, setOtherReason] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  // Reset discard UI when navigating to a different item
  useEffect(() => {
    setShowDiscard(false);
    setShowOtherInput(false);
    setOtherReason('');
  }, [mediaItem.media_id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showOtherInput) return; // Don't capture keys when typing
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext, onBack, showOtherInput]);

  // Fetch discard reasons from lookup
  const { data: discardReasons } = useQuery<DiscardReason[]>({
    queryKey: ['discard-reasons'],
    queryFn: async () => {
      const res = await fetch(
        `${djangoBaseUrl}/api/lookups/media_discard_reason/items/`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    },
    staleTime: Infinity,
  });

  const handleDiscardClick = useCallback(
    (code: string) => {
      if (code === 'other') {
        setShowOtherInput(true);
      } else {
        onDiscard(mediaItem.media_id, code);
      }
    },
    [mediaItem.media_id, onDiscard]
  );

  const handleOtherConfirm = useCallback(() => {
    onDiscard(mediaItem.media_id, 'other', otherReason || undefined);
  }, [mediaItem.media_id, otherReason, onDiscard]);

  const imgSrc = resolveImageSrc(mediaItem.storage_uri);
  const currentCode = mediaItem.classification?.code;

  return (
    <div>
      {/* Header row */}
      <div
        className="d-flex align-items-center justify-content-between mb-3"
        style={{ borderBottom: '1px solid var(--cui-border-color)', paddingBottom: '0.5rem' }}
      >
        <button
          onClick={onBack}
          className="border-0 bg-transparent d-flex align-items-center gap-1"
          style={{
            color: 'var(--cui-primary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            padding: 0,
          }}
        >
          &#8592; Back to Gallery
        </button>
        <span
          className="text-body-secondary"
          style={{ fontSize: '0.8rem' }}
        >
          {currentIndex + 1} of {totalCount}
        </span>
      </div>

      {/* Large image preview */}
      <div
        className="d-flex align-items-center justify-content-center mb-3"
        style={{
          minHeight: '200px',
          maxHeight: '60vh',
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={mediaItem.classification?.name ?? 'Media'}
            style={{
              maxWidth: '100%',
              maxHeight: '60vh',
              objectFit: 'contain',
            }}
          />
        ) : (
          <span style={{ fontSize: '3rem', opacity: 0.3 }}>&#128444;</span>
        )}
      </div>

      {/* Classification pill bar */}
      <div className="mb-3">
        <div
          className="fw-semibold mb-2"
          style={{ fontSize: '0.8rem', color: 'var(--cui-body-color)' }}
        >
          Classification
        </div>
        <div className="d-flex flex-wrap gap-1">
          {classifications.map((cls) => {
            const isActive = currentCode === cls.code;
            return (
              <button
                key={cls.classification_id}
                onClick={() =>
                  onReclassify(mediaItem.media_id, cls.classification_id, cls)
                }
                className="border-0 rounded-pill px-2 py-1"
                style={{
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  backgroundColor: isActive
                    ? `var(--cui-${cls.badge_color}, var(--cui-secondary))`
                    : 'var(--cui-tertiary-bg)',
                  color: isActive
                    ? '#fff'
                    : 'var(--cui-body-color)',
                  opacity: isActive ? 1 : 0.75,
                  transition: 'all 0.15s',
                }}
              >
                {cls.name}
                {isActive && ' \u2713'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Source info */}
      <div
        className="mb-3"
        style={{
          fontSize: '0.8rem',
          color: 'var(--cui-secondary-color)',
          borderTop: '1px solid var(--cui-border-color)',
          paddingTop: '0.75rem',
        }}
      >
        {mediaItem.source_doc_name && (
          <div className="mb-1">
            <strong>Source:</strong> {mediaItem.source_doc_name} — Page {mediaItem.source_page}
          </div>
        )}
        {mediaItem.width_px > 0 && (
          <div className="mb-1">
            <strong>Dimensions:</strong> {mediaItem.width_px} &times; {mediaItem.height_px}px
          </div>
        )}
        {mediaItem.ai_confidence != null && mediaItem.ai_confidence > 0 && (
          <div>
            <strong>AI Confidence:</strong> {(mediaItem.ai_confidence * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Discard section */}
      <div
        style={{
          borderTop: '1px solid var(--cui-border-color)',
          paddingTop: '0.75rem',
        }}
      >
        {!showDiscard ? (
          <button
            onClick={() => setShowDiscard(true)}
            className="border rounded px-3 py-1"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'var(--cui-danger)',
              color: 'var(--cui-danger)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            &#10005; Discard This Image
          </button>
        ) : (
          <div>
            <div
              className="mb-2"
              style={{ fontSize: '0.8rem', color: 'var(--cui-secondary-color)' }}
            >
              Why discard? (helps Landscaper learn)
            </div>
            <div className="d-flex flex-wrap gap-1 mb-2">
              {(discardReasons ?? []).map((reason) => (
                <button
                  key={reason.code}
                  onClick={() => handleDiscardClick(reason.code)}
                  className="border rounded-pill px-2 py-1"
                  style={{
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    borderColor: 'var(--cui-border-color)',
                    color: 'var(--cui-body-color)',
                  }}
                >
                  {reason.label}
                </button>
              ))}
            </div>
            {showOtherInput && (
              <div className="d-flex gap-2 align-items-center mb-2">
                <input
                  type="text"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Reason..."
                  className="form-control form-control-sm"
                  style={{ maxWidth: '250px', fontSize: '0.8rem' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleOtherConfirm();
                  }}
                />
                <button
                  onClick={handleOtherConfirm}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'var(--cui-danger)',
                    color: '#fff',
                    fontSize: '0.75rem',
                  }}
                >
                  Confirm
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setShowDiscard(false);
                setShowOtherInput(false);
              }}
              className="border-0 bg-transparent"
              style={{
                fontSize: '0.75rem',
                color: 'var(--cui-secondary-color)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      <div
        className="d-flex justify-content-between mt-3"
        style={{ borderTop: '1px solid var(--cui-border-color)', paddingTop: '0.75rem' }}
      >
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="border rounded px-3 py-1"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'var(--cui-border-color)',
            color: currentIndex === 0 ? 'var(--cui-disabled-color)' : 'var(--cui-body-color)',
            fontSize: '0.8rem',
            cursor: currentIndex === 0 ? 'default' : 'pointer',
            opacity: currentIndex === 0 ? 0.4 : 1,
          }}
        >
          &#8592; Previous
        </button>
        <button
          onClick={onNext}
          disabled={currentIndex >= totalCount - 1}
          className="border rounded px-3 py-1"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'var(--cui-border-color)',
            color: currentIndex >= totalCount - 1 ? 'var(--cui-disabled-color)' : 'var(--cui-body-color)',
            fontSize: '0.8rem',
            cursor: currentIndex >= totalCount - 1 ? 'default' : 'pointer',
            opacity: currentIndex >= totalCount - 1 ? 0.4 : 1,
          }}
        >
          Next &#8594;
        </button>
      </div>
    </div>
  );
}
