'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CCloseButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBook, cilMinus, cilFullscreen, cilFullscreenExit } from '@coreui/icons';
import { useGuideModal } from '@/contexts/GuideModalContext';
import { guideChapters, guideGroups } from '@/data/guideContent';
import type { GuideChapter } from '@/types/guide';
import GuideSidebar from './GuideSidebar';
import GuideContent from './GuideContent';

/* ------------------------------------------------------------------ */
/* Drag hook                                                           */
/* ------------------------------------------------------------------ */

function useDrag(
  ref: React.RefObject<HTMLDivElement | null>,
  handleRef: React.RefObject<HTMLDivElement | null>,
) {
  const posRef = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handle = handleRef.current;
    const el = ref.current;
    if (!handle || !el) return;

    const onDown = (e: MouseEvent) => {
      // Don't drag if clicking a button or close
      if ((e.target as HTMLElement).closest('button')) return;
      dragging.current = true;
      startMouse.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
      document.body.style.userSelect = 'none';
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      posRef.current = {
        x: e.clientX - startMouse.current.x,
        y: e.clientY - startMouse.current.y,
      };
      el.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
    };

    const onUp = () => {
      dragging.current = false;
      document.body.style.userSelect = '';
    };

    handle.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      handle.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [ref, handleRef]);

  // Reset position
  const resetPosition = useCallback(() => {
    posRef.current = { x: 0, y: 0 };
    if (ref.current) ref.current.style.transform = 'translate(0, 0)';
  }, [ref]);

  return { resetPosition };
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_W = 900;
const DEFAULT_H = 620;
const MINIMIZED_H = 44;

export default function GuideModal() {
  const { isOpen, initialHash, closeGuide } = useGuideModal();

  const [activeId, setActiveId] = useState('1');
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { resetPosition } = useDrag(panelRef, handleRef);

  // Derive the active chapter from activeId (e.g. "4.2" → "4")
  const activeChapterId = activeId.includes('.') ? activeId.split('.')[0] : activeId;

  // Handle initial hash on open
  useEffect(() => {
    if (isOpen && initialHash) {
      setActiveId(initialHash);
      requestAnimationFrame(() => {
        const el = document.getElementById(`section-${initialHash}`);
        if (el && contentRef.current) {
          contentRef.current.scrollTo({
            top: el.offsetTop - contentRef.current.offsetTop - 16,
            behavior: 'smooth',
          });
        }
      });
    }
  }, [isOpen, initialHash]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGuide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeGuide]);

  const handleNavigate = useCallback((id: string) => {
    setActiveId(id);
    requestAnimationFrame(() => {
      const el = document.getElementById(`section-${id}`);
      if (el && contentRef.current) {
        contentRef.current.scrollTo({
          top: el.offsetTop - contentRef.current.offsetTop - 16,
          behavior: 'smooth',
        });
      } else {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }, []);

  const toggleMaximize = useCallback(() => {
    setMaximized(prev => !prev);
    setMinimized(false);
    resetPosition();
  }, [resetPosition]);

  const toggleMinimize = useCallback(() => {
    setMinimized(prev => !prev);
  }, []);

  // Resize handle
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const newW = Math.max(500, resizeStart.current.w + (e.clientX - resizeStart.current.x));
      const newH = Math.max(350, resizeStart.current.h + (e.clientY - resizeStart.current.y));
      setSize({ w: newW, h: newH });
    };
    const onUp = () => {
      resizing.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onResizeDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
  }, [size]);

  if (!isOpen) return null;

  const activeChapter: GuideChapter =
    guideChapters.find(c => c.id === activeChapterId) || guideChapters[0];

  const panelStyle: React.CSSProperties = maximized
    ? {
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
        zIndex: 1100,
      }
    : {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: `${size.w}px`,
        height: minimized ? `${MINIMIZED_H}px` : `${size.h}px`,
        borderRadius: '10px',
        zIndex: 1100,
      };

  return (
    <div
      ref={panelRef}
      style={{
        ...panelStyle,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        transition: minimized ? 'height 0.2s ease' : undefined,
      }}
    >
      {/* Title bar — drag handle */}
      <div
        ref={handleRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0 0.75rem',
          height: `${MINIMIZED_H}px`,
          minHeight: `${MINIMIZED_H}px`,
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderBottom: minimized ? 'none' : '1px solid var(--cui-border-color)',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <CIcon icon={cilBook} size="sm" style={{ color: 'var(--cui-primary)' }} />
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--cui-body-color)',
            flex: 1,
          }}
        >
          User Guide
        </span>

        {/* Window controls */}
        <button
          onClick={toggleMinimize}
          title={minimized ? 'Restore' : 'Minimize'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--cui-secondary-color)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <CIcon icon={cilMinus} size="sm" />
        </button>
        <button
          onClick={toggleMaximize}
          title={maximized ? 'Restore size' : 'Maximize'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--cui-secondary-color)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <CIcon icon={maximized ? cilFullscreenExit : cilFullscreen} size="sm" />
        </button>
        <CCloseButton onClick={closeGuide} style={{ marginLeft: '2px' }} />
      </div>

      {/* Body: sidebar + content */}
      {!minimized && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div
            style={{
              width: '220px',
              minWidth: '220px',
              borderRight: '1px solid var(--cui-border-color)',
              overflowY: 'auto',
            }}
          >
            <GuideSidebar
              chapters={guideChapters}
              groups={guideGroups}
              activeId={activeId}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Content */}
          <div ref={contentRef} style={{ flex: 1, overflowY: 'auto' }}>
            <GuideContent chapter={activeChapter} />
          </div>
        </div>
      )}

      {/* Resize handle (bottom-right corner) — not shown when maximized or minimized */}
      {!maximized && !minimized && (
        <div
          onMouseDown={onResizeDown}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '16px',
            height: '16px',
            cursor: 'nwse-resize',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            style={{ opacity: 0.3 }}
          >
            <path
              d="M14 14L8 14L14 8Z"
              fill="var(--cui-secondary-color)"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
