'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  CCard,
  CCardHeader,
  CCardBody,
  CBadge,
  CSpinner,
} from '@coreui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  classification: {
    code: string;
    name: string;
    badge_color: string;
  } | null;
  source_doc_name?: string;
}

interface DocMediaResponse {
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

interface DocListItem {
  doc_id: number | string;
  file_name?: string;
  doc_name?: string;
  mime_type?: string;
  media_scan_status?: string | null;
}

interface ProjectMediaGalleryProps {
  projectId: number;
  projectName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter categories
// ─────────────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'photos' | 'plans' | 'maps' | 'charts' | 'renders' | 'other';

const FILTER_MAP: Record<FilterKey, string[]> = {
  all: [],
  photos: ['property_photo', 'aerial_photo', 'before_after'],
  plans: ['site_plan', 'floor_plan'],
  maps: ['aerial_map', 'zoning_map', 'location_map', 'planning_map'],
  charts: ['chart', 'infographic'],
  renders: ['rendering'],
  other: ['logo', 'other'],
};

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'photos', label: 'Photos' },
  { key: 'plans', label: 'Plans' },
  { key: 'maps', label: 'Maps' },
  { key: 'charts', label: 'Charts' },
  { key: 'renders', label: 'Renders' },
  { key: 'other', label: 'Other' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectMediaGallery({
  projectId,
}: ProjectMediaGalleryProps) {
  const djangoBaseUrl =
    process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────
  const [mediaOpen, setMediaOpen] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ── Data fetching ──────────────────────────────────────────────────────

  // Fetch project documents list
  const { data: docsData } = useQuery<{ results: DocListItem[] }>({
    queryKey: ['project-docs-for-scan', projectId],
    queryFn: async () => {
      const res = await fetch(
        `/api/dms/search?project_id=${projectId}&limit=200`
      );
      if (!res.ok) throw new Error('Failed to load documents');
      return res.json();
    },
    enabled: !!projectId,
  });

  // All PDFs in the project
  const allPDFs = useMemo(() => {
    if (!docsData?.results) return [];
    return docsData.results.filter(
      (d) =>
        d.file_name?.toLowerCase().endsWith('.pdf') ||
        d.doc_name?.toLowerCase().endsWith('.pdf') ||
        d.mime_type === 'application/pdf'
    );
  }, [docsData]);

  const totalPDFs = allPDFs.length;

  // PDFs that have been scanned (have media records to show)
  const scannedDocIds = useMemo(() => {
    return allPDFs
      .filter(
        (d) =>
          d.media_scan_status === 'scanned' ||
          d.media_scan_status === 'classified' ||
          d.media_scan_status === 'complete'
      )
      .map((d) => d.doc_id);
  }, [allPDFs]);

  // PDFs eligible for scanning (anything not complete)
  const scannablePDFs = useMemo(() => {
    return allPDFs.filter(
      (d) => d.media_scan_status !== 'complete'
    );
  }, [allPDFs]);

  // Fetch media items for all scanned documents
  // This aggregates the per-doc /media/ endpoint across all scanned docs
  const {
    data: allMediaItems,
    isLoading: mediaLoading,
    refetch: refetchMedia,
  } = useQuery<MediaItem[]>({
    queryKey: ['project-all-media', projectId, scannedDocIds.join(',')],
    queryFn: async () => {
      if (scannedDocIds.length === 0) return [];

      const results: MediaItem[] = [];
      for (const docId of scannedDocIds) {
        try {
          const res = await fetch(
            `${djangoBaseUrl}/api/dms/documents/${docId}/media/`
          );
          if (!res.ok) continue;
          const data: DocMediaResponse = await res.json();
          // Only include items that have been extracted (have a storage_uri)
          const extracted = (data.items || []).filter(
            (item) => item.storage_uri && item.status !== 'pending'
          );
          // Attach source doc name to each item
          for (const item of extracted) {
            item.source_doc_name = item.source_doc_name || data.doc_name;
          }
          results.push(...extracted);
        } catch {
          // Skip docs that fail
        }
      }
      return results;
    },
    enabled: scannedDocIds.length > 0,
  });

  const mediaItems = allMediaItems ?? [];

  // ── Filtering ──────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    if (filter === 'all') return mediaItems;
    const codes = FILTER_MAP[filter];
    return mediaItems.filter(
      (item) => item.classification && codes.includes(item.classification.code)
    );
  }, [mediaItems, filter]);

  // Count items per filter category
  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: mediaItems.length,
      photos: 0,
      plans: 0,
      maps: 0,
      charts: 0,
      renders: 0,
      other: 0,
    };
    for (const item of mediaItems) {
      const code = item.classification?.code;
      if (!code) {
        counts.other++;
        continue;
      }
      let matched = false;
      for (const [key, codes] of Object.entries(FILTER_MAP)) {
        if (key === 'all') continue;
        if (codes.includes(code)) {
          counts[key as FilterKey]++;
          matched = true;
          break;
        }
      }
      if (!matched) counts.other++;
    }
    return counts;
  }, [mediaItems]);

  // ── Scan action ────────────────────────────────────────────────────────
  // Full pipeline: scan → extract → classify → auto-confirm actions

  const handleScanPDFs = useCallback(async () => {
    setScanning(true);
    setScanProgress('Preparing scan...');

    try {
      const toScan = scannablePDFs;
      for (let i = 0; i < toScan.length; i++) {
        const doc = toScan[i];
        const name = doc.doc_name || doc.file_name || `Document ${doc.doc_id}`;

        // Step 1: Scan (detect images)
        setScanProgress(`Scanning ${i + 1} of ${toScan.length}: ${name}`);
        try {
          await fetch(
            `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/scan/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: 'full' }),
            }
          );

          // Step 2: Extract (write images to disk)
          setScanProgress(`Extracting ${i + 1} of ${toScan.length}: ${name}`);
          await fetch(
            `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/extract/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ extract_all: true }),
            }
          );

          // Step 3: Classify
          setScanProgress(`Classifying ${i + 1} of ${toScan.length}: ${name}`);
          await fetch(
            `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/classify/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ strategy: 'auto' }),
            }
          );

          // Step 4: Auto-confirm with suggested actions
          setScanProgress(`Saving ${i + 1} of ${toScan.length}: ${name}`);
          const mediaListRes = await fetch(
            `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/`
          );
          if (mediaListRes.ok) {
            const mediaList: DocMediaResponse = await mediaListRes.json();
            const actions = (mediaList.items || []).map((item) => ({
              media_id: item.media_id,
              action: item.suggested_action || 'save_image',
            }));
            if (actions.length > 0) {
              await fetch(
                `${djangoBaseUrl}/api/dms/documents/${doc.doc_id}/media/actions/`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ actions }),
                }
              );
            }
          }
        } catch (err) {
          console.error(`Media pipeline failed for doc ${doc.doc_id}:`, err);
        }
      }

      // Refresh all data
      queryClient.invalidateQueries({
        queryKey: ['project-docs-for-scan', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['project-all-media', projectId],
      });
      await refetchMedia();
    } finally {
      setScanning(false);
      setScanProgress('');
    }
  }, [scannablePDFs, djangoBaseUrl, refetchMedia, queryClient, projectId]);

  // ── Re-classify action ────────────────────────────────────────────────
  // Resets classifications and re-runs with AI vision (auto strategy)

  const handleReclassify = useCallback(async () => {
    setScanning(true);
    setScanProgress('Re-classifying media with AI vision...');

    try {
      for (let i = 0; i < scannedDocIds.length; i++) {
        const docId = scannedDocIds[i];
        setScanProgress(`Re-classifying ${i + 1} of ${scannedDocIds.length}...`);
        try {
          await fetch(
            `${djangoBaseUrl}/api/dms/documents/${docId}/media/reclassify/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ strategy: 'auto' }),
            }
          );
        } catch (err) {
          console.error(`Reclassify failed for doc ${docId}:`, err);
        }
      }

      // Refresh media data
      queryClient.invalidateQueries({
        queryKey: ['project-all-media', projectId],
      });
      await refetchMedia();
    } finally {
      setScanning(false);
      setScanProgress('');
    }
  }, [scannedDocIds, djangoBaseUrl, refetchMedia, queryClient, projectId]);

  // ── Lightbox nav ───────────────────────────────────────────────────────

  const handleLightboxPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setLightboxIndex((i) => Math.max(0, i - 1));
    },
    []
  );

  const handleLightboxNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setLightboxIndex((i) =>
        Math.min(filteredItems.length - 1, i + 1)
      );
    },
    [filteredItems.length]
  );

  // ── Helpers ────────────────────────────────────────────────────────────

  const resolveImageSrc = useCallback(
    (uri: string | undefined | null): string => {
      if (!uri) return '';
      if (uri.startsWith('http')) return uri;
      // storage_uri values are like "media_assets/17/58/thumb.jpg"
      // Django serves media at /media/ prefix, so prepend it
      if (uri.startsWith('/')) return `${djangoBaseUrl}${uri}`;
      return `${djangoBaseUrl}/media/${uri}`;
    },
    [djangoBaseUrl]
  );

  // ── Render ─────────────────────────────────────────────────────────────

  const hasMedia = mediaItems.length > 0;
  const hasScannablePDFs = scannablePDFs.length > 0;

  return (
    <>
      <CCard className="mb-3 shadow-sm">
        <CCardHeader
          onClick={() => setMediaOpen((prev) => !prev)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          className="d-flex align-items-center justify-content-between py-2"
        >
          <div className="d-flex align-items-center gap-2">
            <span
              style={{
                fontSize: '0.75rem',
                transition: 'transform 0.2s',
                transform: mediaOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              &#9654;
            </span>
            <strong>Project Media</strong>
            {hasMedia && (
              <span
                className="text-body-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                {mediaItems.length} items
              </span>
            )}
          </div>
          <div
            className="d-flex gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {hasMedia && !scanning && (
              <button
                onClick={handleReclassify}
                className="px-3 py-1 rounded border"
                style={{
                  borderColor: 'var(--cui-border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--cui-secondary-color)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Re-classify
              </button>
            )}
            {hasScannablePDFs && !scanning && (
              <button
                onClick={handleScanPDFs}
                className="px-3 py-1 rounded text-white border-0"
                style={{
                  backgroundColor: 'var(--cui-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Scan PDFs
              </button>
            )}
          </div>
        </CCardHeader>

        {mediaOpen && (
          <CCardBody className="p-3">
            {/* Loading state */}
            {mediaLoading && (
              <div
                className="d-flex align-items-center justify-content-center"
                style={{ minHeight: '120px' }}
              >
                <CSpinner size="sm" className="me-2" />
                <span
                  className="text-body-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Loading media...
                </span>
              </div>
            )}

            {/* Scanning progress */}
            {scanning && (
              <div
                className="d-flex align-items-center justify-content-center flex-column"
                style={{ minHeight: '120px' }}
              >
                <CSpinner size="sm" className="mb-2" />
                <span style={{ fontSize: '0.85rem', color: 'var(--cui-primary)' }}>
                  {scanProgress}
                </span>
              </div>
            )}

            {/* Empty state — no media, but scannable PDFs exist */}
            {!mediaLoading &&
              !scanning &&
              !hasMedia &&
              hasScannablePDFs && (
                <div
                  className="d-flex flex-column align-items-center justify-content-center text-center"
                  style={{ minHeight: '160px' }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    &#128444;
                  </div>
                  <div
                    className="fw-semibold mb-1"
                    style={{ color: 'var(--cui-body-color)' }}
                  >
                    No media extracted yet
                  </div>
                  <div
                    className="mb-3"
                    style={{
                      color: 'var(--cui-secondary-color)',
                      fontSize: '0.85rem',
                      maxWidth: '360px',
                    }}
                  >
                    This project has {totalPDFs} PDF document
                    {totalPDFs !== 1 ? 's' : ''} that may contain photos, maps,
                    and plans.
                  </div>
                  <button
                    onClick={handleScanPDFs}
                    className="px-4 py-2 rounded text-white border-0"
                    style={{
                      backgroundColor: 'var(--cui-primary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Scan PDFs for Images
                  </button>
                </div>
              )}

            {/* Empty state — no PDFs at all */}
            {!mediaLoading &&
              !scanning &&
              !hasMedia &&
              !hasScannablePDFs &&
              totalPDFs === 0 && (
                <div
                  className="d-flex flex-column align-items-center justify-content-center text-center"
                  style={{ minHeight: '120px' }}
                >
                  <div
                    style={{
                      color: 'var(--cui-secondary-color)',
                      fontSize: '0.85rem',
                      maxWidth: '360px',
                    }}
                  >
                    No PDF documents to scan. Upload documents with embedded
                    images to build your project media library.
                  </div>
                </div>
              )}

            {/* Media gallery */}
            {!mediaLoading && !scanning && hasMedia && (
              <>
                {/* Filter bar */}
                <div
                  className="d-flex flex-wrap gap-1 mb-3"
                  style={{ borderBottom: '1px solid var(--cui-border-color)', paddingBottom: '0.5rem' }}
                >
                  {FILTER_LABELS.map(({ key, label }) => {
                    const count = filterCounts[key];
                    if (key !== 'all' && count === 0) return null;
                    const isActive = filter === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-2 py-1 rounded border-0 ${
                          isActive ? 'text-white' : ''
                        }`}
                        style={{
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          backgroundColor: isActive
                            ? 'var(--cui-primary)'
                            : 'transparent',
                          color: isActive
                            ? '#fff'
                            : 'var(--cui-secondary-color)',
                        }}
                      >
                        {label}
                        {key !== 'all' && (
                          <span style={{ marginLeft: '0.25rem', opacity: 0.8 }}>
                            ({count})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Thumbnail grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.5rem',
                  }}
                >
                  {filteredItems.map((item, idx) => {
                    const thumbSrc = resolveImageSrc(item.thumbnail_uri || item.storage_uri);
                    return (
                      <div
                        key={item.media_id}
                        onClick={() => {
                          setLightboxIndex(idx);
                          setLightboxOpen(true);
                        }}
                        style={{
                          cursor: 'pointer',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          border: '1px solid var(--cui-border-color)',
                          backgroundColor: 'var(--cui-card-bg)',
                          transition: 'box-shadow 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow =
                            '0 2px 8px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow =
                            'none';
                        }}
                      >
                        {/* Thumbnail image */}
                        <div
                          style={{
                            width: '100%',
                            height: '90px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--cui-tertiary-bg)',
                          }}
                        >
                          {thumbSrc ? (
                            <img
                              src={thumbSrc}
                              alt={item.classification?.name ?? 'Media'}
                              loading="lazy"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.5rem', opacity: 0.4 }}>&#128444;</span>
                          )}
                        </div>
                        {/* Info row */}
                        <div style={{ padding: '0.35rem 0.5rem' }}>
                          {item.classification && (
                            <CBadge
                              color={item.classification.badge_color || 'secondary'}
                              style={{
                                fontSize: '0.65rem',
                                marginBottom: '0.15rem',
                              }}
                            >
                              {item.classification.name}
                            </CBadge>
                          )}
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--cui-secondary-color)',
                              lineHeight: 1.3,
                            }}
                          >
                            pg. {item.source_page}
                          </div>
                          {item.source_doc_name && (
                            <div
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--cui-secondary-color)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.source_doc_name}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CCardBody>
        )}
      </CCard>

      {/* Lightbox */}
      {lightboxOpen && filteredItems[lightboxIndex] && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={resolveImageSrc(filteredItems[lightboxIndex].storage_uri)}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
            }}
            alt={
              filteredItems[lightboxIndex].classification?.name ?? 'Media'
            }
          />
          {/* Caption */}
          <div
            style={{
              position: 'absolute',
              bottom: '2rem',
              color: 'white',
              textAlign: 'center',
              fontSize: '0.85rem',
            }}
          >
            {filteredItems[lightboxIndex].classification?.name ??
              'Unclassified'}{' '}
            — Page {filteredItems[lightboxIndex].source_page}
            {filteredItems[lightboxIndex].source_doc_name && (
              <>
                <br />
                {filteredItems[lightboxIndex].source_doc_name}
              </>
            )}
          </div>

          {/* Navigation arrows */}
          {filteredItems.length > 1 && (
            <>
              {lightboxIndex > 0 && (
                <button
                  onClick={handleLightboxPrev}
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '2rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  &#8249;
                </button>
              )}
              {lightboxIndex < filteredItems.length - 1 && (
                <button
                  onClick={handleLightboxNext}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '2rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  &#8250;
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
