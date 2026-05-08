'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Send, Plus, MessageSquare } from 'lucide-react';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch { /* ignore */ }
  return {};
}

interface ProjectThread {
  threadId: string;
  title: string | null;
  pageContext: string;
  updatedAt: string;
  messageCount: number;
  isActive: boolean;
}

interface ProjectDetails {
  project_id: number;
  project_name: string | null;
  location_lat: number | null;
  location_lon: number | null;
  jurisdiction_city: string | null;
  jurisdiction_county: string | null;
  jurisdiction_state: string | null;
  acres_gross: number | null;
  project_type: string | null;
  property_subtype: string | null;
  primary_count: number | null;
  primary_count_type: string | null;
}

interface ProjectHomepageProps {
  projectId: number;
  onSelectThread: (threadId: string, title?: string) => void;
  onStartChat: (message: string) => void;
  isStartingChat?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAcres(acres: number | null): string | null {
  if (acres == null || !Number.isFinite(acres)) return null;
  return acres >= 100
    ? `${Math.round(acres).toLocaleString()} ac`
    : `${acres.toFixed(1)} ac`;
}

function buildMetaLine(p: ProjectDetails | null): string[] {
  if (!p) return [];
  const items: string[] = [];
  const subtype = p.property_subtype?.trim();
  const type = p.project_type?.trim();
  if (subtype) items.push(subtype);
  else if (type) items.push(type);
  const cityState = [p.jurisdiction_city, p.jurisdiction_state]
    .filter((v) => v && v.trim().length > 0)
    .join(', ');
  if (cityState) items.push(cityState);
  if (p.acres_gross != null) {
    const a = formatAcres(p.acres_gross);
    if (a) items.push(a);
  }
  if (p.primary_count != null && p.primary_count_type) {
    items.push(`${p.primary_count.toLocaleString()} ${p.primary_count_type}`);
  }
  return items;
}

/**
 * Free OSM-tile basemap for the home-page location card. No API key needed.
 * Heavier basemaps (Google satellite) are reserved for the dedicated Map tab
 * — the home page just needs a recognisable location preview.
 */
const HOME_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

interface ProjectLocationMapProps {
  lat: number;
  lon: number;
}

function ProjectLocationMap({ lat, lon }: ProjectLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // already initialized

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: HOME_MAP_STYLE,
      center: [lon, lat],
      zoom: 13,
      attributionControl: { compact: true },
      interactive: false, // home-page preview — full controls live on the Map tab
    });

    new maplibregl.Marker({ color: '#e85a5a' })
      .setLngLat([lon, lat])
      .addTo(map);

    mapRef.current = map;

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter if coords change after mount (e.g. user pinned a location elsewhere
  // and returned to the home page).
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter([lon, lat]);
  }, [lat, lon]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export function ProjectHomepage({
  projectId,
  onSelectThread,
  onStartChat,
  isStartingChat = false,
}: ProjectHomepageProps) {
  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [threads, setThreads] = useState<ProjectThread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch project details (name, location, meta).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/details`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setDetails({
          project_id: data.project_id ?? projectId,
          project_name: data.project_name ?? null,
          location_lat: data.location_lat != null ? Number(data.location_lat) : null,
          location_lon: data.location_lon != null ? Number(data.location_lon) : null,
          jurisdiction_city: data.jurisdiction_city ?? null,
          jurisdiction_county: data.jurisdiction_county ?? null,
          jurisdiction_state: data.jurisdiction_state ?? null,
          acres_gross: data.acres_gross != null ? Number(data.acres_gross) : null,
          project_type: data.project_type ?? null,
          property_subtype: data.property_subtype ?? null,
          primary_count: data.primary_count != null ? Number(data.primary_count) : null,
          primary_count_type: data.primary_count_type ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Fetch threads for this project.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingThreads(true);
    fetch(`${DJANGO_API_URL}/api/landscaper/threads/?project_id=${projectId}&include_closed=true`, {
      headers: getAuthHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.threads)) {
          setThreads(data.threads);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingThreads(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const metaItems = useMemo(() => buildMetaLine(details), [details]);

  const hasCoords =
    details?.location_lat != null &&
    details?.location_lon != null &&
    Number.isFinite(details.location_lat) &&
    Number.isFinite(details.location_lon);

  const handleSubmit = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg || isStartingChat) return;
    setChatInput('');
    onStartChat(msg);
  }, [chatInput, isStartingChat, onStartChat]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const titleText = details?.project_name?.trim() || 'Project';
  const locationLabel =
    details?.jurisdiction_city && details?.jurisdiction_state
      ? `${details.jurisdiction_city}, ${details.jurisdiction_state}`
      : details?.jurisdiction_state ?? '—';
  const countyLabel = details?.jurisdiction_county
    ? details.jurisdiction_county.replace(/\s*county$/i, '') + ' County'
    : '—';
  const acresLabel = formatAcres(details?.acres_gross ?? null) ?? '—';

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        background: 'var(--w-bg-body)',
        color: 'var(--w-text-primary)',
      }}
    >
      <div
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '32px 12px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Title + meta */}
        <header style={{ marginBottom: 22 }}>
          <h1
            style={{
              fontFamily: 'Tiempos, Georgia, "Times New Roman", serif',
              fontWeight: 400,
              fontSize: 48,
              lineHeight: 1.05,
              letterSpacing: '-0.5px',
              margin: 0,
              color: 'var(--w-text-primary)',
            }}
          >
            {titleText}
          </h1>
          {metaItems.length > 0 && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: 'var(--w-text-secondary)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0 8px',
              }}
            >
              {metaItems.map((item, i) => (
                <span key={i}>
                  {i > 0 && (
                    <span style={{ color: 'var(--w-text-tertiary)', marginRight: 8 }}>·</span>
                  )}
                  {item}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Map card */}
        <div
          style={{
            display: 'flex',
            border: '1px solid var(--w-border)',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'var(--w-card-bg)',
            boxShadow: 'var(--w-shadow)',
            marginBottom: 22,
            height: 280,
          }}
        >
          {/* Map canvas */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: 'var(--w-bg-surface)',
              position: 'relative',
            }}
          >
            {hasCoords ? (
              <ProjectLocationMap
                lat={details!.location_lat as number}
                lon={details!.location_lon as number}
              />
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--w-text-secondary)',
                  fontSize: 13,
                  textAlign: 'center',
                  padding: 24,
                }}
              >
                {details
                  ? 'No location set yet. Open the Map tab to drop a pin.'
                  : 'Loading…'}
              </div>
            )}
          </div>

          {/* Side stats */}
          <div
            style={{
              width: 200,
              flexShrink: 0,
              borderLeft: '1px solid var(--w-border)',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: 'var(--w-bg-surface)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'var(--w-text-tertiary)',
                }}
              >
                Location
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{locationLabel}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'var(--w-text-tertiary)',
                }}
              >
                County
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{countyLabel}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'var(--w-text-tertiary)',
                }}
              >
                Total Acreage
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{acresLabel}</div>
            </div>
          </div>
        </div>

        {/* Chat starter */}
        <div
          style={{
            border: '1px solid var(--w-border)',
            borderRadius: 14,
            background: 'var(--w-bg-input)',
            padding: '14px 10px 10px',
            marginBottom: 28,
            transition: 'border-color 0.15s',
          }}
        >
          <textarea
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask Landscaper about ${titleText}…`}
            disabled={isStartingChat}
            rows={2}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: 14,
              lineHeight: 1.5,
              color: 'var(--w-text-primary)',
              fontFamily: 'inherit',
              padding: '4px 4px 8px',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <button
              type="button"
              title="Attach"
              style={{
                width: 30,
                height: 30,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: '1px solid var(--w-border)',
                borderRadius: 8,
                color: 'var(--w-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!chatInput.trim() || isStartingChat}
              title="Send"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background:
                  chatInput.trim() && !isStartingChat
                    ? 'var(--w-accent)'
                    : 'transparent',
                border: '1px solid',
                borderColor:
                  chatInput.trim() && !isStartingChat
                    ? 'var(--w-accent)'
                    : 'var(--w-border)',
                borderRadius: 8,
                padding: '5px 12px',
                color:
                  chatInput.trim() && !isStartingChat
                    ? '#fff'
                    : 'var(--w-text-tertiary)',
                fontSize: 12,
                fontWeight: 500,
                cursor:
                  chatInput.trim() && !isStartingChat ? 'pointer' : 'default',
                transition: 'background 0.12s, border-color 0.12s',
              }}
            >
              <Send size={12} />
              {isStartingChat ? 'Starting…' : 'Send'}
            </button>
          </div>
        </div>

        {/* Recent chats */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--w-text-primary)',
              }}
            >
              Recent chats
            </h2>
            {threads.length > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--w-text-tertiary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {threads.length}
              </span>
            )}
          </div>

          {isLoadingThreads ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--w-text-muted)',
                padding: '20px 0',
                textAlign: 'center',
              }}
            >
              Loading…
            </div>
          ) : threads.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--w-text-secondary)',
                padding: '20px 0',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              No conversations yet for this project.
              <br />
              Start one above.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {threads.map((thread) => {
                const title = thread.title?.trim() || 'New conversation';
                return (
                  <button
                    key={thread.threadId}
                    type="button"
                    onClick={() => onSelectThread(thread.threadId, thread.title ?? undefined)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr auto',
                      gap: 12,
                      alignItems: 'flex-start',
                      width: '100%',
                      textAlign: 'left',
                      background: 'var(--w-card-bg)',
                      border: '1px solid var(--w-border-subtle)',
                      borderRadius: 10,
                      padding: '12px 10px',
                      cursor: 'pointer',
                      color: 'var(--w-text-primary)',
                      transition: 'border-color 0.12s, background 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.borderColor = 'var(--w-border-hover)';
                      el.style.background = 'var(--w-bg-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.borderColor = 'var(--w-border-subtle)';
                      el.style.background = 'var(--w-card-bg)';
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--w-bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--w-text-tertiary)',
                      }}
                    >
                      <MessageSquare size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--w-text-primary)',
                          fontStyle: thread.title ? 'normal' : 'italic',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={title}
                      >
                        {title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--w-text-secondary)',
                          marginTop: 3,
                          lineHeight: 1.45,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {thread.messageCount === 0
                          ? 'No messages yet.'
                          : `${thread.messageCount} message${
                              thread.messageCount === 1 ? '' : 's'
                            } · last activity ${formatRelativeTime(thread.updatedAt)}`}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--w-text-tertiary)',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatRelativeTime(thread.updatedAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
