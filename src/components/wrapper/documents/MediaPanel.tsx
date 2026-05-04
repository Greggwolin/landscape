'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CSpinner } from '@coreui/react';
import { resolveMediaUrl } from '@/lib/utils/mediaUtils';

const djangoBaseUrl =
  process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

type MediaTab = 'all' | 'photos' | 'charts' | 'renders' | 'other';

interface MediaItem {
  media_id: number;
  storage_uri: string | null;
  thumbnail_uri: string | null;
  classification: {
    code: string;
    name: string;
    badge_color: string;
  } | null;
  source_page: number | null;
  asset_name: string | null;
  source_doc_name: string | null;
}

interface AvailableMediaResponse {
  project_id: number;
  total: number;
  items: MediaItem[];
}

const TAB_BY_CODE: Record<string, Exclude<MediaTab, 'all'>> = {
  property_photo: 'photos',
  aerial_photo: 'photos',
  before_after: 'photos',
  chart: 'charts',
  infographic: 'charts',
  rendering: 'renders',
  site_plan: 'renders',
  floor_plan: 'renders',
};

function bucketFor(item: MediaItem): Exclude<MediaTab, 'all'> {
  const code = item.classification?.code;
  if (!code) return 'other';
  return TAB_BY_CODE[code] ?? 'other';
}

const TAB_ORDER: { id: MediaTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'photos', label: 'Photos' },
  { id: 'charts', label: 'Charts' },
  { id: 'renders', label: 'Renders' },
  { id: 'other', label: 'Other' },
];

const fullSpanStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  textAlign: 'center',
  padding: '32px 14px',
  color: 'var(--w-text-tertiary)',
  fontSize: 13,
};

const thumbImgStyle: React.CSSProperties = {
  width: '100%',
  height: 140,
  objectFit: 'cover',
  display: 'block',
};

const EMPTY_ITEMS: MediaItem[] = [];

export interface MediaPanelProps {
  projectId: number;
}

export function MediaPanel({ projectId }: MediaPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<MediaTab>('all');

  const { data, isLoading, isError } = useQuery<AvailableMediaResponse>({
    queryKey: ['media-panel', 'available', projectId],
    queryFn: async () => {
      const res = await fetch(
        `${djangoBaseUrl}/api/dms/media/available/?project_id=${projectId}`
      );
      if (!res.ok) {
        throw new Error(`Failed to load media (${res.status})`);
      }
      return res.json();
    },
    enabled: Number.isFinite(projectId),
  });

  const items = data?.items ?? EMPTY_ITEMS;

  const counts = useMemo(() => {
    const c: Record<MediaTab, number> = {
      all: items.length,
      photos: 0,
      charts: 0,
      renders: 0,
      other: 0,
    };
    for (const it of items) c[bucketFor(it)]++;
    return c;
  }, [items]);

  const visibleItems = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter((it) => bucketFor(it) === tab);
  }, [items, tab]);

  return (
    <div className="w-panel">
      <div className="w-panel-head" onClick={() => setCollapsed((v) => !v)}>
        <span className="w-panel-chev">{collapsed ? '▸' : '▾'}</span>
        <span className="w-panel-title">Project Media</span>
        <span className="w-panel-count">
          {isLoading ? '…' : `${items.length} items`}
        </span>
        <div className="w-panel-spacer" />
        <button className="w-btn w-btn-ghost" onClick={(e) => e.stopPropagation()}>
          Scan PDFs ▾
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="w-media-tabs">
            {TAB_ORDER.map((t) => (
              <button
                key={t.id}
                className={`w-media-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label} ({counts[t.id]})
              </button>
            ))}
          </div>

          <div className="w-media-grid" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={fullSpanStyle}>
                <CSpinner size="sm" />
                <span style={{ marginLeft: 8 }}>Loading media…</span>
              </div>
            ) : isError ? (
              <div style={fullSpanStyle}>Couldn&apos;t load media. Try refreshing.</div>
            ) : items.length === 0 ? (
              <div style={fullSpanStyle}>
                No media yet. Use Scan PDFs to extract images from documents.
              </div>
            ) : visibleItems.length === 0 ? (
              <div style={fullSpanStyle}>No {tab} items in this view.</div>
            ) : (
              visibleItems.map((item) => {
                const src = resolveMediaUrl(
                  item.thumbnail_uri || item.storage_uri || ''
                );
                const tag = item.classification?.name ?? 'Unclassified';
                const page = item.source_page;
                return (
                  <div key={item.media_id} className="w-media-thumb">
                    {src ? (
                      <img
                        src={src}
                        alt={item.asset_name || tag}
                        loading="lazy"
                        style={thumbImgStyle}
                      />
                    ) : (
                      <div className="w-media-thumb-placeholder">📷</div>
                    )}
                    <div className="w-media-thumb-meta">
                      <span className="w-media-thumb-tag">{tag}</span>
                      <span className="w-media-thumb-page">
                        {page != null ? `pg. ${page}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
