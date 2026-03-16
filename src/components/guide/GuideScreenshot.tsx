'use client';

import React, { useState, useEffect } from 'react';

interface GuideScreenshotProps {
  src: string;
  alt: string;
  caption: string;
}

/**
 * GuideScreenshot
 *
 * Renders a screenshot image with caption. If the image file doesn't exist,
 * renders a dashed placeholder box with the alt text so missing images are
 * visually obvious during authoring.
 */
export default function GuideScreenshot({ src, alt, caption }: GuideScreenshotProps) {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setExists(true);
    img.onerror = () => setExists(false);
    img.src = src;
  }, [src]);

  // Still loading — render placeholder to avoid layout shift
  if (exists === null) {
    return (
      <figure style={{ margin: '1.5rem 0' }}>
        <div
          style={{
            border: '2px dashed var(--cui-border-color)',
            borderRadius: '6px',
            padding: '2rem',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--cui-tertiary-bg)',
            color: 'var(--cui-secondary-color)',
            fontSize: '0.85rem',
          }}
        >
          Loading...
        </div>
      </figure>
    );
  }

  // Image doesn't exist — show placeholder
  if (!exists) {
    return (
      <figure style={{ margin: '1.5rem 0' }}>
        <div
          style={{
            border: '2px dashed var(--cui-warning)',
            borderRadius: '6px',
            padding: '2rem',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--cui-tertiary-bg)',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>&#128247;</span>
          <span
            style={{
              color: 'var(--cui-secondary-color)',
              fontSize: '0.85rem',
              textAlign: 'center',
              maxWidth: '400px',
            }}
          >
            {alt}
          </span>
        </div>
        <figcaption
          style={{
            fontSize: '0.8rem',
            color: 'var(--cui-secondary-color)',
            fontStyle: 'italic',
            marginTop: '0.5rem',
            textAlign: 'center',
          }}
        >
          {caption}
        </figcaption>
      </figure>
    );
  }

  // Image exists — render it
  return (
    <figure style={{ margin: '1.5rem 0' }}>
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          borderRadius: '6px',
          border: '1px solid var(--cui-border-color)',
        }}
      />
      <figcaption
        style={{
          fontSize: '0.8rem',
          color: 'var(--cui-secondary-color)',
          fontStyle: 'italic',
          marginTop: '0.5rem',
          textAlign: 'center',
        }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}
