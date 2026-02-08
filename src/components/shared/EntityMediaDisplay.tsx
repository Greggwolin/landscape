'use client';

import React, { useState } from 'react';
import { CSpinner } from '@coreui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

interface LinkedMedia {
  link_id: number;
  media_id: number;
  link_purpose: string | null;
  display_order: number;
  media: {
    media_id: number;
    thumbnail_uri: string | null;
    storage_uri: string | null;
    classification: {
      code: string;
      name: string;
      badge_color: string;
    };
    width_px: number | null;
    height_px: number | null;
    source_page: number | null;
    caption: string | null;
    asset_name: string | null;
    ai_description: string | null;
  };
}

interface EntityMediaLinksResponse {
  entity_type: string;
  entity_id: number;
  links: LinkedMedia[];
}

export interface EntityMediaDisplayProps {
  entityType: string;
  entityId: number;
  projectId: number;
  variant: 'hero' | 'thumbnail-strip' | 'single-thumb';
  maxDisplay?: number;
  onAttach?: () => void;
  editable?: boolean;
}

/**
 * Reusable component that shows linked media for any entity.
 * Supports hero (large single image), thumbnail-strip, and single-thumb variants.
 */
export default function EntityMediaDisplay({
  entityType,
  entityId,
  projectId,
  variant,
  maxDisplay = 4,
  onAttach,
  editable = false,
}: EntityMediaDisplayProps) {
  const queryClient = useQueryClient();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery<EntityMediaLinksResponse>({
    queryKey: ['entity-media', entityType, entityId],
    queryFn: async () => {
      const res = await fetch(
        `${DJANGO_API_URL}/api/dms/media/links/?entity_type=${entityType}&entity_id=${entityId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch entity media');
      return res.json();
    },
    enabled: !!entityType && !!entityId,
  });

  const removeMutation = useMutation({
    mutationFn: async (linkId: number) => {
      const res = await fetch(`${DJANGO_API_URL}/api/dms/media/links/${linkId}/`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove link');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-media', entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ['available-media', projectId] });
    },
  });

  const links = data?.links || [];

  // Suppress "projectId" unused warning — it's used for query invalidation
  void projectId;

  if (isLoading) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <CSpinner size="sm" style={{ width: '14px', height: '14px' }} />
      </span>
    );
  }

  // ──────────────────────────────────────────────
  // HERO VARIANT — single large image
  // ──────────────────────────────────────────────
  if (variant === 'hero') {
    const hero = links[0];
    if (!hero && !editable) return null;

    const thumbUrl = hero?.media?.thumbnail_uri
      ? `${DJANGO_API_URL}${hero.media.thumbnail_uri}`
      : null;
    const fullUrl = hero?.media?.storage_uri
      ? `${DJANGO_API_URL}${hero.media.storage_uri}`
      : thumbUrl;

    return (
      <>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'var(--cui-tertiary-bg)',
            border: '1px solid var(--cui-border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: fullUrl ? 'pointer' : 'default',
          }}
          onClick={fullUrl ? () => setLightboxUrl(fullUrl) : undefined}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={hero?.media?.asset_name || 'Project image'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--cui-secondary-color)',
              }}
            >
              <span style={{ fontSize: '2rem', opacity: 0.4 }}>📷</span>
              {editable && (
                <span style={{ fontSize: '0.75rem' }}>No image attached</span>
              )}
            </div>
          )}

          {/* Action buttons */}
          {editable && (
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                display: 'flex',
                gap: '4px',
              }}
            >
              {hero && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMutation.mutate(hero.link_id);
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                  title="Remove image"
                >
                  ✕
                </button>
              )}
              {onAttach && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAttach();
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                  title={hero ? 'Change image' : 'Add image'}
                >
                  📷 {hero ? 'Change' : 'Add Photo'}
                </button>
              )}
            </div>
          )}
        </div>

        {lightboxUrl && (
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
            onClick={() => setLightboxUrl(null)}
          >
            <img
              src={lightboxUrl}
              alt="Full size preview"
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

  // ──────────────────────────────────────────────
  // THUMBNAIL-STRIP VARIANT — row of small thumbs
  // ──────────────────────────────────────────────
  if (variant === 'thumbnail-strip') {
    const displayLinks = links.slice(0, maxDisplay);
    const overflow = links.length - maxDisplay;

    if (displayLinks.length === 0 && !editable) return null;

    return (
      <>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap' }}>
          {displayLinks.map((link) => {
            const thumbUrl = link.media?.thumbnail_uri
              ? `${DJANGO_API_URL}${link.media.thumbnail_uri}`
              : null;
            const fullUrl = link.media?.storage_uri
              ? `${DJANGO_API_URL}${link.media.storage_uri}`
              : thumbUrl;

            return (
              <div
                key={link.link_id}
                style={{
                  position: 'relative',
                  width: '48px',
                  height: '48px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid var(--cui-border-color)',
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onClick={() => fullUrl && setLightboxUrl(fullUrl)}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={link.media?.asset_name || ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      fontSize: '1.2rem',
                      opacity: 0.3,
                    }}
                  >
                    📷
                  </span>
                )}

                {/* Remove button on hover */}
                {editable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMutation.mutate(link.link_id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      fontSize: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      padding: 0,
                    }}
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {overflow > 0 && (
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--cui-secondary-color)',
                whiteSpace: 'nowrap',
              }}
            >
              +{overflow}
            </span>
          )}

          {/* Add button */}
          {editable && onAttach && (
            <button
              type="button"
              onClick={onAttach}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '6px',
                border: '1px dashed var(--cui-border-color)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                color: 'var(--cui-secondary-color)',
                flexShrink: 0,
              }}
              title="Add image"
            >
              +
            </button>
          )}
        </div>

        {lightboxUrl && (
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
            onClick={() => setLightboxUrl(null)}
          >
            <img
              src={lightboxUrl}
              alt="Full size preview"
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

  // ──────────────────────────────────────────────
  // SINGLE-THUMB VARIANT — compact single thumbnail
  // ──────────────────────────────────────────────
  const first = links[0];
  if (!first && !editable) return null;

  const singleThumbUrl = first?.media?.thumbnail_uri
    ? `${DJANGO_API_URL}${first.media.thumbnail_uri}`
    : null;

  return (
    <div
      style={{
        position: 'relative',
        width: '56px',
        height: '56px',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid var(--cui-border-color)',
        backgroundColor: 'var(--cui-tertiary-bg)',
        cursor: editable && onAttach ? 'pointer' : 'default',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={
        !first && editable && onAttach
          ? onAttach
          : singleThumbUrl
            ? () => {
                const full = first?.media?.storage_uri
                  ? `${DJANGO_API_URL}${first.media.storage_uri}`
                  : singleThumbUrl;
                setLightboxUrl(full);
              }
            : undefined
      }
      title={first ? first.media?.asset_name || 'Linked image' : editable ? 'Add Photo' : undefined}
    >
      {singleThumbUrl ? (
        <img
          src={singleThumbUrl}
          alt={first?.media?.asset_name || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            color: 'var(--cui-secondary-color)',
            fontSize: '0.6rem',
          }}
        >
          <span style={{ fontSize: '1.2rem', opacity: 0.4 }}>📷</span>
          {editable && <span>Add</span>}
        </span>
      )}

      {/* Remove button */}
      {editable && first && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeMutation.mutate(first.link_id);
          }}
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            fontSize: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
          }}
          title="Remove"
        >
          ✕
        </button>
      )}

      {lightboxUrl && (
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
          onClick={(e) => {
            e.stopPropagation();
            setLightboxUrl(null);
          }}
        >
          <img
            src={lightboxUrl}
            alt="Full size preview"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        </div>
      )}
    </div>
  );
}
