'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import GuideSidebar from '@/components/guide/GuideSidebar';
import GuideContent from '@/components/guide/GuideContent';
import { guideChapters, guideGroups } from '@/data/guideContent';
import '@/styles/guide-print.css';

/**
 * GuideClient
 *
 * Main client component for the User Guide.
 * Manages sidebar/content layout, URL hash sync, and scroll-based
 * active section tracking via IntersectionObserver.
 */
export default function GuideClient() {
  const [activeId, setActiveId] = useState('1');
  const contentRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);

  // Find chapter by id (chapter id or section's parent chapter)
  const getChapterForId = useCallback((id: string) => {
    const chapterId = id.includes('.') ? id.split('.')[0] : id;
    return guideChapters.find(ch => ch.id === chapterId) || guideChapters[0];
  }, []);

  const activeChapter = getChapterForId(activeId);

  // Read hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setActiveId(hash);
      // Defer scroll to allow render
      setTimeout(() => {
        const el = document.getElementById(`section-${hash}`);
        if (el) el.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, []);

  // Listen for hash changes (back/forward navigation)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveId(hash);
        const el = document.getElementById(`section-${hash}`);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // IntersectionObserver to track active section on scroll
  useEffect(() => {
    if (isNavigatingRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (isNavigatingRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('section-', '');
            if (id) {
              setActiveId(id);
              // Update hash without triggering scroll
              window.history.replaceState(null, '', `#${id}`);
            }
          }
        }
      },
      {
        root: contentRef.current,
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0,
      },
    );

    // Observe all section anchors in current chapter
    const elements = contentRef.current?.querySelectorAll('[id^="section-"]');
    elements?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [activeChapter]);

  // Navigate to a section from sidebar
  const handleNavigate = useCallback((id: string) => {
    isNavigatingRef.current = true;
    setActiveId(id);
    window.history.pushState(null, '', `#${id}`);

    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Section might be in a different chapter — content will re-render, then scroll
      setTimeout(() => {
        const target = document.getElementById(`section-${id}`);
        if (target) target.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }

    // Re-enable observer after scroll settles
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 800);
  }, []);

  return (
    <div
      className="guide-shell"
      style={{
        display: 'flex',
        height: 'calc(100vh - 56px)', // Account for top nav
        overflow: 'hidden',
        backgroundColor: 'var(--cui-body-bg)',
      }}
    >
      <GuideSidebar
        chapters={guideChapters}
        groups={guideGroups}
        activeId={activeId}
        onNavigate={handleNavigate}
      />
      <div
        ref={contentRef}
        className="guide-content-pane"
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: 'var(--cui-body-bg)',
        }}
      >
        <GuideContent chapter={activeChapter} />
      </div>
    </div>
  );
}
