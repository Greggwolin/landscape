'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CBadge,
  CSpinner,
} from '@coreui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/** Classification filter tabs */
const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'property_photo', label: 'Photos', icon: '📷' },
  { key: 'site_plan', label: 'Plans', icon: '🗺' },
  { key: 'zoning_map', label: 'Maps', icon: '🌐' },
  { key: 'chart', label: 'Charts', icon: '📊' },
  { key: 'rendering', label: 'Renderings', icon: '🎨' },
] as const;

interface AvailableMediaItem {
  media_id: number;
  thumbnail_uri: string | null;
  storage_uri: string | null;
  classification: {
    code: string;
    name: string;
    badge_color: string;
  };
  source_page: number | null;
  width_px: number | null;
  height_px: number | null;
  asset_name: string | null;
  caption: string | null;
  ai_description: string | null;
  source_doc_name: string | null;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  entityType: string;
  entityId: number;
  linkPurpose?: string;
  singleSelect?: boolean;
  filterClassification?: string[];
  onSelect: (mediaIds: number[]) => void;
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  projectId,
  entityType,
  entityId,
  linkPurpose = 'reference',
  singleSelect = false,
  onSelect,
}: MediaPickerModalProps) {
  const djangoBaseUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState('all');
  const [lightboxMedia, setLightboxMedia] = useState<AvailableMediaItem | null>(null);

  const resolveImageSrc = useCallback(
    (uri: string | undefined | null): string => {
      if (!uri) return '';
      if (uri.startsWith('http')) return uri;
      if (uri.startsWith('/')) return `${djangoBaseUrl}${uri}`;
      return `${djangoBaseUrl}/media/${uri}`;
    },
    [djangoBaseUrl]
  );

  // Fetch available media
  const { data, isLoading, error } = useQuery({
    queryKey: ['available-media', projectId, entityType, entityId],
    queryFn: async () => {
      const params = new URLSearchParams({
        project_id: String(projectId),
        entity_type: entityType,
        entity_id: String(entityId),
      });
      const res = await fetch(`${djangoBaseUrl}/api/dms/media/available/?${params}`);
      if (!res.ok) throw new Error('Failed to fetch available media');
      return res.json() as Promise<{ project_id: number; total: number; items: AvailableMediaItem[] }>;
    },
    enabled: isOpen && !!projectId,
  });

  // Mutation: create link(s)
  const linkMutation = useMutation({
    mutationFn: async (mediaIds: number[]) => {
      const results = [];
      for (const mediaId of mediaIds) {
        const res = await fetch(`${djangoBaseUrl}/api/dms/media/links/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_id: mediaId,
            entity_type: entityType,
            entity_id: entityId,
            link_purpose: linkPurpose,
          }),
        });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-media', entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ['available-media', projectId] });
      onSelect(Array.from(selectedIds));
      setSelectedIds(new Set());
      onClose();
    },
  });

  // Filter items by classification
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (activeFilter === 'all') return data.items;
    return data.items.filter((item) => {
      const code = item.classification?.code || '';
      if (activeFilter === 'property_photo') return code.includes('photo');
      if (activeFilter === 'site_plan') return code.includes('plan');
      if (activeFilter === 'zoning_map') return code.includes('map');
      if (activeFilter === 'chart') return code === 'chart' || code === 'infographic';
      if (activeFilter === 'rendering') return code === 'rendering' || code === 'before_after';
      return false;
    });
  }, [data?.items, activeFilter]);

  // Unique source documents for optional dropdown
  const sourceDocNames = useMemo(() => {
    if (!data?.items) return [];
    const unique = new Set(data.items.map((i) => i.source_doc_name).filter(Boolean));
    return Array.from(unique) as string[];
  }, [data?.items]);

  const handleToggle = useCallback(
    (mediaId: number) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(mediaId)) {
          next.delete(mediaId);
        } else {
          if (singleSelect) next.clear();
          next.add(mediaId);
        }
        return next;
      });
    },
    [singleSelect],
  );

  const handleSubmit = useCallback(() => {
    if (selectedIds.size === 0) return;
    linkMutation.mutate(Array.from(selectedIds));
  }, [selectedIds, linkMutation]);

  const entityLabel = entityType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <CModal
        visible={isOpen}
        onClose={onClose}
        size="xl"
        backdrop="static"
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Select Image — {entityLabel}</CModalTitle>
        </CModalHeader>

        <CModalBody style={{ minHeight: '400px' }}>
          {/* Filter bar */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--cui-border-color)',
            }}
          >
            {FILTER_TABS.map((tab) => (
              <CButton
                key={tab.key}
                color={activeFilter === tab.key ? 'primary' : 'secondary'}
                variant={activeFilter === tab.key ? undefined : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(tab.key)}
                style={{ fontSize: '0.8rem' }}
              >
                {'icon' in tab && tab.icon ? `${tab.icon} ` : ''}
                {tab.label}
              </CButton>
            ))}

            {sourceDocNames.length > 1 && (
              <select
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.8rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--cui-border-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  color: 'var(--cui-body-color)',
                }}
                defaultValue=""
                onChange={(e) => {
                  // Future: filter by source doc
                  void e;
                }}
              >
                <option value="">All Documents</option>
                {sourceDocNames.map((name) => (
                  <option key={name} value={name}>
                    {name.length > 40 ? name.substring(0, 37) + '...' : name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <CSpinner color="primary" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                color: 'var(--cui-danger)',
              }}
            >
              Failed to load media assets. Try again later.
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && filteredItems.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                color: 'var(--cui-secondary-color)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📷</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>No saved images available</div>
              <div style={{ fontSize: '0.85rem' }}>
                Upload a document and review media assets first.
              </div>
            </div>
          )}

          {/* Image grid */}
          {!isLoading && !error && filteredItems.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '12px',
                maxHeight: '50vh',
                overflowY: 'auto',
                padding: '4px',
              }}
            >
              {filteredItems.map((item) => {
                const isSelected = selectedIds.has(item.media_id);
                const thumbUrl = resolveImageSrc(item.thumbnail_uri || item.storage_uri || '');

                return (
                  <div
                    key={item.media_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggle(item.media_id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggle(item.media_id);
                      }
                    }}
                    style={{
                      border: isSelected
                        ? '2px solid var(--cui-primary)'
                        : '1px solid var(--cui-border-color)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      backgroundColor: 'var(--cui-card-bg)',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      boxShadow: isSelected ? '0 0 0 2px rgba(var(--cui-primary-rgb), 0.25)' : 'none',
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        position: 'relative',
                        height: '120px',
                        backgroundColor: 'var(--cui-tertiary-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={item.asset_name || `Media ${item.media_id}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxMedia(item);
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '2rem', opacity: 0.3 }}>📷</span>
                      )}

                      {/* Selection checkbox overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: isSelected
                            ? '2px solid var(--cui-primary)'
                            : '2px solid rgba(255,255,255,0.7)',
                          backgroundColor: isSelected ? 'var(--cui-primary)' : 'rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {isSelected ? '✓' : ''}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '6px 8px' }}>
                      <CBadge
                        color={item.classification?.badge_color as 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary'}
                        style={{ fontSize: '0.65rem', marginBottom: '4px' }}
                      >
                        {item.classification?.name || 'Unknown'}
                      </CBadge>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--cui-secondary-color)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.source_page != null ? `pg. ${item.source_page}` : ''}
                        {item.source_doc_name
                          ? ` · ${item.source_doc_name.length > 20 ? item.source_doc_name.substring(0, 17) + '...' : item.source_doc_name}`
                          : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CModalBody>

        <CModalFooter
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--cui-secondary-color)' }}>
            {selectedIds.size > 0
              ? `Selected: ${selectedIds.size} image${selectedIds.size > 1 ? 's' : ''}`
              : 'Select images to attach'}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <CButton color="secondary" variant="outline" onClick={onClose}>
              Cancel
            </CButton>
            <CButton
              color="primary"
              disabled={selectedIds.size === 0 || linkMutation.isPending}
              onClick={handleSubmit}
            >
              {linkMutation.isPending ? (
                <>
                  <CSpinner size="sm" style={{ marginRight: '6px' }} />
                  Attaching…
                </>
              ) : (
                `Attach Selected`
              )}
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      {/* Lightbox overlay */}
      {lightboxMedia && (
        <div
          role="dialog"
          aria-label="Image preview"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setLightboxMedia(null)}
        >
          <img
            src={
              resolveImageSrc(lightboxMedia.storage_uri || lightboxMedia.thumbnail_uri || '')
            }
            alt={lightboxMedia.asset_name || 'Preview'}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        </div>
      )}
    </>
  );
}
