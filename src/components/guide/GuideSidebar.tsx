'use client';

import React, { useState, useMemo } from 'react';
import type { GuideChapter } from '@/types/guide';

interface GuideSidebarProps {
  chapters: GuideChapter[];
  groups: string[];
  activeId: string;
  onNavigate: (id: string) => void;
}

/**
 * GuideSidebar
 *
 * Fixed left navigation for the User Guide.
 * Groups chapters by their group label, supports search filtering,
 * and highlights the active section.
 */
export default function GuideSidebar({ chapters, groups, activeId, onNavigate }: GuideSidebarProps) {
  const [search, setSearch] = useState('');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Determine which chapter is active (from section id like "4.2" → chapter "4")
  const activeChapterId = activeId.includes('.') ? activeId.split('.')[0] : activeId;

  const filteredChapters = useMemo(() => {
    if (!search.trim()) return chapters;
    const q = search.toLowerCase();
    return chapters.filter(ch => {
      if (ch.title.toLowerCase().includes(q)) return true;
      if (ch.number.toLowerCase().includes(q)) return true;
      return ch.sections.some(s => s.title.toLowerCase().includes(q) || s.id.includes(q));
    });
  }, [chapters, search]);

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) => expandedChapters.has(id) || activeChapterId === id;

  return (
    <nav
      className="guide-sidebar"
      style={{
        width: '220px',
        minWidth: '220px',
        height: '100%',
        overflowY: 'auto',
        borderRight: '1px solid var(--cui-border-color)',
        backgroundColor: 'var(--cui-body-bg)',
        padding: '1rem 0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Search */}
      <div style={{ padding: '0 0.75rem 0.75rem' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search guide..."
          style={{
            width: '100%',
            padding: '0.4rem 0.6rem',
            fontSize: '0.8rem',
            border: '1px solid var(--cui-border-color)',
            borderRadius: '4px',
            backgroundColor: 'var(--cui-input-bg, var(--cui-body-bg))',
            color: 'var(--cui-body-color)',
            outline: 'none',
          }}
        />
      </div>

      {/* Chapter tree grouped by group label */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {groups.map(group => {
          const groupChapters = filteredChapters.filter(ch => ch.group === group);
          if (groupChapters.length === 0) return null;

          return (
            <div key={group} style={{ marginBottom: '0.75rem' }}>
              {/* Group label */}
              <div
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--cui-secondary-color)',
                }}
              >
                {group}
              </div>

              {groupChapters.map(chapter => (
                <div key={chapter.id}>
                  {/* Chapter item */}
                  <button
                    onClick={() => {
                      if (chapter.sections.length > 0) toggleChapter(chapter.id);
                      onNavigate(chapter.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      width: '100%',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      border: 'none',
                      borderLeft: activeChapterId === chapter.id
                        ? '3px solid var(--cui-primary)'
                        : '3px solid transparent',
                      backgroundColor: activeChapterId === chapter.id
                        ? 'var(--cui-tertiary-bg)'
                        : 'transparent',
                      color: activeChapterId === chapter.id
                        ? 'var(--cui-primary)'
                        : 'var(--cui-body-color)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      lineHeight: 1.3,
                      fontWeight: activeChapterId === chapter.id ? 600 : 400,
                    }}
                  >
                    <span style={{ opacity: 0.5, minWidth: '1.4rem' }}>{chapter.number}</span>
                    <span>{chapter.title}</span>
                  </button>

                  {/* Subsections (indented) */}
                  {chapter.sections.length > 0 && isExpanded(chapter.id) && (
                    <div>
                      {chapter.sections.map(section => (
                        <button
                          key={section.id}
                          onClick={() => onNavigate(section.id)}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.25rem 0.75rem 0.25rem 2.4rem',
                            fontSize: '0.75rem',
                            border: 'none',
                            borderLeft: activeId === section.id
                              ? '3px solid var(--cui-primary)'
                              : '3px solid transparent',
                            backgroundColor: activeId === section.id
                              ? 'var(--cui-tertiary-bg)'
                              : 'transparent',
                            color: activeId === section.id
                              ? 'var(--cui-primary)'
                              : 'var(--cui-secondary-color)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            lineHeight: 1.4,
                            fontWeight: activeId === section.id ? 600 : 400,
                          }}
                        >
                          {section.id} {section.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
