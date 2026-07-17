'use client';

import React, { useCallback } from 'react';
import { FilePreviewerProps, resolveRenderer } from './types';
import { PdfPreview } from './PdfPreview';
import { XlsxPreview } from './XlsxPreview';
import { UnsupportedPreview } from './UnsupportedPreview';

/**
 * Top-level dispatch for the preview component family.
 * Phase 1 of LSCMD-DMSPREV-IMPL-0516-DV.
 *
 * Picks a renderer from mime type + filename extension and forwards
 * the props. Renderers handle their own loading + error states; this
 * component is a thin dispatcher only.
 *
 * Default sizing matches the existing .w-doc-detail-preview-frame
 * (320px) so dropping <FilePreviewer/> into the existing detail
 * panel preview slot needs no parent CSS changes.
 */
export function FilePreviewer({
  fileUrl,
  mimeType,
  filename,
  variant = 'inline',
  height = 320,
  initialPage,
  searchTerm,
  onError,
  onClose,
}: FilePreviewerProps) {
  // Default download — used by UnsupportedPreview when the host doesn't
  // pass a richer handler. Mirrors the existing DocumentDetailPanel
  // handleDownload pattern so behavior is identical to today.
  const handleDownload = useCallback(() => {
    if (typeof window === 'undefined') return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = filename || 'download';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [fileUrl, filename]);

  const handleOpenExternally = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }, [fileUrl]);

  const renderer = resolveRenderer(mimeType, filename);

  // Phase 1: variant=modal is reserved for Phase 4 lightbox; treat as inline.
  void variant;
  void onClose;

  switch (renderer) {
    case 'pdf':
      return (
        <PdfPreview
          fileUrl={fileUrl}
          filename={filename}
          height={height}
          initialPage={initialPage}
          searchTerm={searchTerm}
          onError={onError}
          onDownload={handleDownload}
        />
      );

    case 'xlsx':
      return (
        <XlsxPreview
          fileUrl={fileUrl}
          filename={filename}
          height={height}
          onError={onError}
          onDownload={handleDownload}
        />
      );

    case 'image':
      // Native <img> rendering — matches the existing DocumentDetailPanel
      // image preview behavior. Wrapped to honor the sized container so
      // tall images don't blow out the side panel.
      return (
        <div
          style={{
            width: '100%',
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--w-bg-surface)',
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={filename || 'Image preview'}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              display: 'block',
            }}
            onError={() => {
              const e = new Error('Image failed to load');
              onError?.(e);
            }}
          />
        </div>
      );

    case 'unsupported':
    default:
      return (
        <UnsupportedPreview
          filename={filename}
          mimeType={mimeType}
          onDownload={handleDownload}
          onOpenExternally={handleOpenExternally}
        />
      );
  }
}

export default FilePreviewer;
