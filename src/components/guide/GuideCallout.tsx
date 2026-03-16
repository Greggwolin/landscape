'use client';

import React from 'react';

interface GuideCalloutProps {
  label: string;
  text: string;
}

/**
 * GuideCallout
 *
 * Renders a callout/tip box with a left border accent, bold label, and body text.
 * Uses CoreUI CSS variables for all colors.
 */
export default function GuideCallout({ label, text }: GuideCalloutProps) {
  return (
    <div
      style={{
        borderLeft: '4px solid var(--cui-primary)',
        backgroundColor: 'var(--cui-tertiary-bg)',
        padding: '1rem 1.25rem',
        margin: '1.25rem 0',
        borderRadius: '0 6px 6px 0',
      }}
    >
      <strong style={{ color: 'var(--cui-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </strong>
      <p style={{ margin: '0.5rem 0 0', lineHeight: 1.6, color: 'var(--cui-body-color)' }}>
        {text}
      </p>
    </div>
  );
}
