'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Script from 'next/script';
import { PreviewLoading } from './PreviewLoading';
import { PreviewError } from './PreviewError';

/**
 * Adobe PDF Embed wrapper. Phase 1 of LSCMD-DMSPREV-IMPL-0516-DV.
 *
 * Loads the Adobe Embed View SDK from the official CDN via next/script,
 * then renders the PDF into a sized container. Uses SIZED_CONTAINER mode
 * so the iframe matches the parent height. Annotations + Adobe-side
 * download/print buttons are hidden — those go through the host UI.
 *
 * Client ID comes from NEXT_PUBLIC_ADOBE_EMBED_CLIENT_ID. If missing,
 * the component renders a clear "not configured" error rather than
 * silently failing. Adobe enforces domain registration server-side; the
 * client ID itself is not a secret.
 *
 * Phase 3 hooks (initialPage, searchTerm) are wired through the
 * viewerReady callback so the citation-jumping feature can use them
 * later without retrofitting this file.
 */

const ADOBE_VIEW_SDK_URL = 'https://acrobatservices.adobe.com/view-sdk/viewer.js';
const ADOBE_VIEW_READY_EVENT = 'adobe_dc_view_sdk.ready';

interface PdfPreviewProps {
  fileUrl: string;
  filename?: string | null;
  /** Container height in px. Defaults to 320 to match the existing .w-doc-detail-preview-frame size. */
  height?: number;
  /** Phase 3 — page number to jump to on load. 1-indexed. */
  initialPage?: number;
  /** Phase 3 — term to search for and highlight on load. */
  searchTerm?: string;
  /** Optional error callback for the host. */
  onError?: (error: Error) => void;
  /** Optional download handler — surfaced on PreviewError so the user can recover. */
  onDownload?: () => void;
}

declare global {
  interface Window {
    AdobeDC?: {
      View: new (config: { clientId: string; divId: string }) => AdobeDCView;
    };
  }
}

interface AdobeDCView {
  previewFile: (
    content: {
      content: { location: { url: string } };
      metaData: { fileName: string };
    },
    options: Record<string, unknown>
  ) => Promise<AdobeDCViewer>;
}

interface AdobeDCViewer {
  getAPIs: () => Promise<{
    gotoLocation: (page: number) => Promise<void>;
    search: (term: string) => Promise<void>;
  }>;
}

export function PdfPreview({
  fileUrl,
  filename,
  height = 320,
  initialPage,
  searchTerm,
  onError,
  onDownload,
}: PdfPreviewProps) {
  const clientId = process.env.NEXT_PUBLIC_ADOBE_EMBED_CLIENT_ID;
  const divId = `pdf-preview-${useId().replace(/:/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(
    typeof window !== 'undefined' && typeof window.AdobeDC !== 'undefined'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Listen for the Adobe SDK ready event. The SDK fires this once the
  // global AdobeDC.View is available — both for the initial script load
  // and (notionally) for subsequent re-init. If AdobeDC is already on
  // window when we mount, skip straight to render.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.AdobeDC) {
      setSdkReady(true);
      return;
    }
    const onReady = () => setSdkReady(true);
    document.addEventListener(ADOBE_VIEW_READY_EVENT, onReady);
    return () => document.removeEventListener(ADOBE_VIEW_READY_EVENT, onReady);
  }, []);

  // Render the file once the SDK and container are both ready.
  const renderPdf = useCallback(async () => {
    if (!clientId) {
      const e = new Error('Adobe Embed client ID not configured (NEXT_PUBLIC_ADOBE_EMBED_CLIENT_ID)');
      setError(e);
      setLoading(false);
      onError?.(e);
      return;
    }
    if (!sdkReady || !window.AdobeDC) return;
    if (!containerRef.current) return;

    try {
      setError(null);
      setLoading(true);

      const view = new window.AdobeDC.View({ clientId, divId });
      const viewerPromise = view.previewFile(
        {
          content: { location: { url: fileUrl } },
          metaData: { fileName: filename || 'document.pdf' },
        },
        {
          embedMode: 'SIZED_CONTAINER',
          defaultViewMode: 'FIT_WIDTH',
          showAnnotationTools: false,
          showDownloadPDF: false,
          showPrintPDF: false,
          showLeftHandPanel: false,
          showZoomControl: true,
          showThumbnails: false,
          showBookmarks: false,
        }
      );

      // Phase 3 hooks — jump to a page or search a term once the viewer is ready.
      if (initialPage || searchTerm) {
        const viewer = await viewerPromise;
        const apis = await viewer.getAPIs();
        if (initialPage) {
          await apis.gotoLocation(initialPage).catch(() => {});
        }
        if (searchTerm) {
          await apis.search(searchTerm).catch(() => {});
        }
      }
      // SIZED_CONTAINER fires its own readiness internally; mark loading false once previewFile resolves.
      await viewerPromise;
      setLoading(false);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setLoading(false);
      onError?.(e);
    }
  }, [clientId, sdkReady, divId, fileUrl, filename, initialPage, searchTerm, onError]);

  useEffect(() => {
    void renderPdf();
  }, [renderPdf]);

  // Missing client ID — surface clearly, do not stall.
  if (!clientId) {
    return (
      <div style={{ width: '100%', height }}>
        <PreviewError
          message="PDF preview not configured"
          detail="Adobe Embed client ID is missing. Set NEXT_PUBLIC_ADOBE_EMBED_CLIENT_ID."
          onAction={onDownload}
          actionLabel="Download"
        />
      </div>
    );
  }

  return (
    <>
      <Script
        src={ADOBE_VIEW_SDK_URL}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <div style={{ position: 'relative', width: '100%', height }}>
        {/* Sized container — Adobe Embed mounts its iframe inside this div. */}
        <div
          id={divId}
          ref={containerRef}
          style={{ width: '100%', height: '100%', background: '#ffffff' }}
        />
        {/* Loading + error overlays — positioned absolute so they sit over the (initially empty) container. */}
        {loading && !error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--w-bg-surface, #f7f7f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PreviewLoading message="Loading PDF…" />
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <PreviewError
              message="Couldn't load PDF"
              detail={error.message}
              onAction={onDownload}
              actionLabel="Download"
            />
          </div>
        )}
      </div>
    </>
  );
}

export default PdfPreview;
