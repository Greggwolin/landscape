'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CSpinner } from '@coreui/react';
import { Heart, Tag, Trash2, X } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/utils/mediaUtils';
import { ALL_CLASSIFICATIONS, badgeColorToCssVar, findByCode } from '@/lib/dms/classifications';

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
  aerial_map: 'photos',
  before_after: 'photos',
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

const tileActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginLeft: 'auto',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 6,
  cursor: 'pointer',
  color: 'var(--w-text-tertiary)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  transition: 'background 0.12s',
};

const dropdownTriggerStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--cui-border-color)',
  borderRadius: 4,
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: 11,
  color: 'var(--w-text-tertiary)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  maxWidth: 140,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  transition: 'background 0.12s, border-color 0.12s',
};

const DROPDOWN_MENU_WIDTH = 340;

const dropdownMenuStyle: React.CSSProperties = {
  position: 'fixed',
  background: 'var(--cui-body-bg)',
  border: '1px solid var(--cui-border-color)',
  borderRadius: 6,
  zIndex: 51,
  width: DROPDOWN_MENU_WIDTH,
  maxHeight: 280,
  overflowY: 'auto',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  padding: 8,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
};

const dropdownItemStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.3,
  padding: '4px 10px',
  borderRadius: 999,
  borderWidth: 1,
  borderStyle: 'solid',
  cursor: 'pointer',
};

const dropdownBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'transparent',
};

const lightboxOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.85)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const lightboxCloseStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.5)',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const lightboxImageStyle: React.CSSProperties = {
  maxWidth: '95vw',
  maxHeight: '95vh',
  objectFit: 'contain',
  display: 'block',
};

const EMPTY_ITEMS: MediaItem[] = [];

export interface MediaPanelProps {
  projectId: number;
}

export function MediaPanel({ projectId }: MediaPanelProps) {
  // Collapsed by default — the section is supplementary; users open it on
  // demand rather than scrolling past expanded thumbnail grids on every
  // project visit.
  const [collapsed, setCollapsed] = useState(true);
  const [tab, setTab] = useState<MediaTab>('all');

  const [favorites, setFavorites] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = window.localStorage.getItem(`media-favorites-${projectId}`);
      return stored ? new Set(JSON.parse(stored) as number[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleFavorite = useCallback(
    (mediaId: number) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(mediaId)) next.delete(mediaId);
        else next.add(mediaId);
        try {
          window.localStorage.setItem(
            `media-favorites-${projectId}`,
            JSON.stringify([...next])
          );
        } catch {}
        return next;
      });
    },
    [projectId]
  );

  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['media-panel', 'available', projectId] as const,
    [projectId]
  );

  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<DOMRect | null>(null);

  const closeDropdown = useCallback(() => {
    setOpenDropdownId(null);
    setDropdownAnchor(null);
  }, []);

  useEffect(() => {
    if (!lightboxItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxItem(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxItem]);

  useEffect(() => {
    if (openDropdownId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown();
    };
    const onReposition = () => closeDropdown();
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [openDropdownId, closeDropdown]);

  const handleReclassify = useCallback(
    (mediaId: number, classificationId: number) => {
      const cls = ALL_CLASSIFICATIONS.find(
        (c) => c.classification_id === classificationId
      );
      if (!cls) return;
      queryClient.setQueryData<AvailableMediaResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((it) =>
            it.media_id === mediaId
              ? {
                  ...it,
                  classification: {
                    code: cls.code,
                    name: cls.name,
                    badge_color: cls.badge_color,
                  },
                }
              : it
          ),
        };
      });
      fetch(`${djangoBaseUrl}/api/dms/media/${mediaId}/reclassify/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classification_id: classificationId }),
      })
        .then((res) => {
          if (!res.ok) {
            queryClient.invalidateQueries({ queryKey });
            alert(`Couldn't reclassify (${res.status}).`);
          }
        })
        .catch(() => {
          queryClient.invalidateQueries({ queryKey });
          alert("Couldn't reclassify. Please try again.");
        });
    },
    [queryClient, queryKey]
  );

  const handleDiscard = useCallback(
    (mediaId: number) => {
      queryClient.setQueryData<AvailableMediaResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          total: Math.max(0, old.total - 1),
          items: old.items.filter((it) => it.media_id !== mediaId),
        };
      });
      fetch(`${djangoBaseUrl}/api/dms/media/${mediaId}/discard/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason_code: 'not_relevant', reason_text: null }),
      })
        .then((res) => {
          if (!res.ok) {
            queryClient.invalidateQueries({ queryKey });
            alert(`Couldn't delete (${res.status}).`);
          }
        })
        .catch(() => {
          queryClient.invalidateQueries({ queryKey });
          alert("Couldn't delete. Please try again.");
        });
    },
    [queryClient, queryKey]
  );

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
    const filtered = tab === 'all' ? items : items.filter((it) => bucketFor(it) === tab);
    return [...filtered].sort((a, b) => {
      const aFav = favorites.has(a.media_id) ? 0 : 1;
      const bFav = favorites.has(b.media_id) ? 0 : 1;
      return aFav - bFav;
    });
  }, [items, tab, favorites]);

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
                const isFav = favorites.has(item.media_id);
                const isDropdownOpen = openDropdownId === item.media_id;
                const canonicalBadgeColor =
                  findByCode(item.classification?.code ?? '')?.badge_color;
                const triggerColor = badgeColorToCssVar(canonicalBadgeColor);
                return (
                  <div key={item.media_id} className="w-media-thumb">
                    {src ? (
                      <img
                        src={src}
                        alt={item.asset_name || tag}
                        loading="lazy"
                        style={{ ...thumbImgStyle, cursor: 'pointer' }}
                        onClick={() => setLightboxItem(item)}
                      />
                    ) : (
                      <div
                        className="w-media-thumb-placeholder"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setLightboxItem(item)}
                      >
                        📷
                      </div>
                    )}
                    <div className="w-media-thumb-meta">
                      <span className="w-media-thumb-page">
                        {page != null ? `pg. ${page}` : ''}
                      </span>
                      <div style={tileActionsStyle}>
                        <button
                          type="button"
                          className="w-media-action-btn"
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.media_id);
                          }}
                          style={{
                            ...iconBtnStyle,
                            color: isFav ? '#e25555' : 'var(--w-text-tertiary)',
                          }}
                        >
                          <Heart size={14} fill={isFav ? '#e25555' : 'none'} />
                        </button>
                        <button
                          type="button"
                          className="w-media-action-btn"
                          title="Change classification"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDropdownOpen) {
                              closeDropdown();
                            } else {
                              setDropdownAnchor(
                                (e.currentTarget as HTMLElement).getBoundingClientRect()
                              );
                              setOpenDropdownId(item.media_id);
                            }
                          }}
                          style={{
                            ...dropdownTriggerStyle,
                            background: `color-mix(in srgb, ${triggerColor} 15%, transparent)`,
                            borderColor: triggerColor,
                            color: triggerColor,
                          }}
                        >
                          <Tag size={12} />
                          <span>{tag}</span>
                        </button>
                        <button
                          type="button"
                          className="w-media-action-btn"
                          title="Delete"
                          aria-label="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDiscard(item.media_id);
                          }}
                          style={iconBtnStyle}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {openDropdownId !== null &&
        dropdownAnchor &&
        typeof document !== 'undefined' &&
        (() => {
          const dropdownItem = items.find((it) => it.media_id === openDropdownId);
          if (!dropdownItem) return null;
          const flipUp = dropdownAnchor.bottom + 280 > window.innerHeight;
          const placement: React.CSSProperties = flipUp
            ? { bottom: window.innerHeight - dropdownAnchor.top + 4 }
            : { top: dropdownAnchor.bottom + 4 };
          const left = Math.max(8, Math.min(
            window.innerWidth - DROPDOWN_MENU_WIDTH - 8,
            dropdownAnchor.right - DROPDOWN_MENU_WIDTH
          ));
          return createPortal(
            <>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  closeDropdown();
                }}
                style={dropdownBackdropStyle}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ ...dropdownMenuStyle, ...placement, left, right: 'auto' }}
              >
                {ALL_CLASSIFICATIONS.map((cls) => {
                  const isCurrent = dropdownItem.classification?.code === cls.code;
                  const pillColor = badgeColorToCssVar(cls.badge_color);
                  return (
                    <button
                      key={cls.classification_id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeDropdown();
                        if (!isCurrent) {
                          handleReclassify(dropdownItem.media_id, cls.classification_id);
                        }
                      }}
                      style={{
                        ...dropdownItemStyle,
                        borderColor: isCurrent ? pillColor : 'var(--cui-border-color)',
                        backgroundColor: isCurrent ? pillColor : 'transparent',
                        color: isCurrent ? '#fff' : 'var(--cui-body-color)',
                      }}
                    >
                      {cls.name}
                    </button>
                  );
                })}
              </div>
            </>,
            document.body
          );
        })()}

      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          style={lightboxOverlayStyle}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            title="Close"
            aria-label="Close preview"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxItem(null);
            }}
            style={lightboxCloseStyle}
          >
            <X size={24} />
          </button>
          {(() => {
            const fullSrc = resolveMediaUrl(
              lightboxItem.storage_uri || lightboxItem.thumbnail_uri || ''
            );
            if (!fullSrc) {
              return <div style={{ color: '#fff' }}>No preview available.</div>;
            }
            return (
              <img
                src={fullSrc}
                alt={lightboxItem.asset_name || 'Media preview'}
                onClick={(e) => e.stopPropagation()}
                style={lightboxImageStyle}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
