'use client';

import React from 'react';
import type { GuideChapter, GuideBlock } from '@/types/guide';
import GuideScreenshot from './GuideScreenshot';
import GuideCallout from './GuideCallout';
import GuidePrintButton from './GuidePrintButton';

interface GuideContentProps {
  chapter: GuideChapter;
}

/**
 * Renders a single GuideBlock recursively.
 */
function BlockRenderer({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case 'prose':
      return <p style={{ lineHeight: 1.6, margin: '0.75rem 0', color: 'var(--cui-body-color)' }}>{block.text}</p>;

    case 'screenshot':
      return <GuideScreenshot src={block.src} alt={block.alt} caption={block.caption} />;

    case 'callout':
      return <GuideCallout label={block.label} text={block.text} />;

    case 'table':
      return (
        <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '0.5rem 0.75rem',
                      textAlign: 'left',
                      borderBottom: '2px solid var(--cui-border-color)',
                      backgroundColor: 'var(--cui-tertiary-bg)',
                      color: 'var(--cui-body-color)',
                      fontWeight: 600,
                      whiteSpace: 'normal',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderBottom: '1px solid var(--cui-border-color)',
                        color: 'var(--cui-body-color)',
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'subsection':
      return (
        <div style={{ marginTop: '1.25rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--cui-body-color)', margin: '0 0 0.5rem' }}>
            <span style={{ color: 'var(--cui-primary)', marginRight: '0.4rem' }}>{block.number}</span>
            {block.title}
          </h4>
          {block.blocks.map((b, i) => (
            <BlockRenderer key={i} block={b} />
          ))}
        </div>
      );

    default:
      return null;
  }
}

/**
 * GuideContent
 *
 * Renders a single chapter with its header, sections, and all content blocks.
 */
export default function GuideContent({ chapter }: GuideContentProps) {
  return (
    <article className="guide-content-article" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 2.5rem' }}>
      {/* Chapter header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--cui-primary)',
            }}
          >
            Chapter {chapter.number}
          </span>
          <GuidePrintButton chapterId={chapter.id} chapterTitle={`Chapter ${chapter.number}: ${chapter.title}`} />
        </div>
        <h1
          id={`section-${chapter.id}`}
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--cui-body-color)',
            margin: '0 0 0.25rem',
          }}
        >
          {chapter.title}
        </h1>
        {chapter.subtitle && (
          <p style={{ fontSize: '1rem', fontStyle: 'italic', color: 'var(--cui-secondary-color)', margin: 0 }}>
            {chapter.subtitle}
          </p>
        )}
        <hr style={{ border: 'none', borderTop: '1px solid var(--cui-border-color)', margin: '1.25rem 0' }} />
      </div>

      {/* Chapter-level content for chapters with no sections */}
      {chapter.sections.length === 0 && (
        <p style={{ lineHeight: 1.6, color: 'var(--cui-secondary-color)', fontStyle: 'italic' }}>
          Content for this chapter will be added during the content authoring pass.
        </p>
      )}

      {/* Sections */}
      {chapter.sections.map(section => (
        <section key={section.id} id={`section-${section.id}`} style={{ marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'var(--cui-body-color)',
              margin: '0 0 0.75rem',
            }}
          >
            <span style={{ color: 'var(--cui-primary)', marginRight: '0.5rem', fontWeight: 700 }}>
              {section.id}
            </span>
            {section.title}
          </h2>
          {section.content.map((block, i) => (
            <BlockRenderer key={i} block={block} />
          ))}
        </section>
      ))}
    </article>
  );
}
