'use client';

/**
 * ProjectPhotosModal
 *
 * Gallery modal showing all media linked to a project.
 * Includes "Add Photos / Media" button that opens MediaPickerModal.
 * Photos display as a responsive grid with lightbox on click.
 */

import React, { useState } from 'react';
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
import MediaPickerModal from '@/components/dms/modals/MediaPickerModal';

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

interface ProjectPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
}

export default function ProjectPhotosModal({
  isOpen,
  onClose,
  projectId,
}: ProjectPhotosModalProps) {
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Fetch all media linked to this project
  const { data, isLoading } = useQuery<EntityMediaLinksResponse>({
    queryKey: ['entity-media', 'project', projectId],
    queryFn: async () => {
      const res = await fetch(
        `${DJANGO_API_URL}/api/dms/media/links/?entity_type=project&entity_id=${projectId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch project media');
      return res.json();
    },
    enabled: isOpen && !!projectId,
  });

  // Remove a link
  const removeMutation = useMutation({
    mutationFn: async (linkId: number) => {
      const res = await fetch(`${DJANGO_API_URL}/api/dms/media/links/${linkId}/`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove link');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-media', 'project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['available-media', projectId] });
    },
  });

  const links = data?.links || [];

  return (
    <>
      <CModal
        visible={isOpen}
        onClose={onClose}
        size="lg"
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Property Photos</CModalTitle>
        </CModalHeader>

        <CModalBody style={{ minHeight: '300px' }}>
          {/* Loading */}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <CSpinner color="primary" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && links.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                color: 'var(--cui-secondary-color)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.4 }}>📷</div>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '1rem' }}>
                No photos yet
              </div>
              <div style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
                Add photos from uploaded documents or extracted media assets.
              </div>
              <CButton
                color="primary"
                size="sm"
                onClick={() => setShowPicker(true)}
              >
                Add Photos / Media
              </CButton>
            </div>
          )}

          {/* Photo grid */}
          {!isLoading && links.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '12px',
                maxHeight: '60vh',
                overflowY: 'auto',
                padding: '4px',
              }}
            >
              {links.map((link) => {
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
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--cui-border-color)',
                      backgroundColor: 'var(--cui-card-bg)',
                    }}
                  >
                    {/* Image */}
                    <div
                      style={{
                        height: '140px',
                        backgroundColor: 'var(--cui-tertiary-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: fullUrl ? 'pointer' : 'default',
                      }}
                      onClick={fullUrl ? () => setLightboxUrl(fullUrl) : undefined}
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={link.media?.asset_name || `Photo ${link.media_id}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '2rem', opacity: 0.3 }}>📷</span>
                      )}
                    </div>

                    {/* Footer info */}
                    <div
                      style={{
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <CBadge
                        color={
                          (link.media?.classification?.badge_color as
                            | 'primary'
                            | 'success'
                            | 'danger'
                            | 'warning'
                            | 'info'
                            | 'secondary') || 'secondary'
                        }
                        style={{ fontSize: '0.65rem' }}
                      >
                        {link.media?.classification?.name || 'Media'}
                      </CBadge>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeMutation.mutate(link.link_id)}
                        disabled={removeMutation.isPending}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          color: 'var(--cui-secondary-color)',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          opacity: 0.6,
                        }}
                        title="Remove photo"
                      >
                        ✕
                      </button>
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
            {links.length > 0
              ? `${links.length} photo${links.length !== 1 ? 's' : ''}`
              : ''}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {links.length > 0 && (
              <CButton
                color="primary"
                variant="outline"
                size="sm"
                onClick={() => setShowPicker(true)}
              >
                Add Photos / Media
              </CButton>
            )}
            <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
              Close
            </CButton>
          </div>
        </CModalFooter>
      </CModal>

      {/* Lightbox overlay */}
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

      {/* Media picker sub-modal */}
      {showPicker && (
        <MediaPickerModal
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          projectId={projectId}
          entityType="project"
          entityId={projectId}
          linkPurpose="reference"
          singleSelect={false}
          onSelect={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
