'use client';

import React from 'react';
import { parseHighlights, highlightText, type HighlightSegment } from '@/lib/dms/highlight';

interface HighlightedTextProps {
  text: string;
  matches?: Array<{ start: number; length: number }>; // Meilisearch match positions
  query?: string; // Fallback text-based highlighting
  className?: string;
  highlightClassName?: string;
}

/**
 * HighlightedText Component
 * Displays text with highlighted search matches
 */
export default function HighlightedText({
  text,
  matches,
  query,
  className = '',
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-900 font-semibold',
}: HighlightedTextProps) {
  let segments: HighlightSegment[];

  if (matches && matches.length > 0) {
    // Use Meilisearch match positions
    segments = parseHighlights(text, matches);
  } else if (query) {
    // Fallback to text-based highlighting
    segments = highlightText(text, query);
  } else {
    // No highlighting
    segments = [{ text, highlighted: false }];
  }

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={index} className={highlightClassName}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </span>
  );
}

/**
 * SnippetPreview Component
 * Shows a snippet of text around the first match
 */
export function SnippetPreview({
  text,
  matches,
  query,
  contextLength = 100,
  className = '',
}: {
  text: string;
  matches?: Array<{ start: number; length: number }>;
  query?: string;
  contextLength?: number;
  className?: string;
}) {
  if (!text) {
    return null;
  }

  const maxLength = contextLength * 2;

  // If text is short enough, just show it all
  if (text.length <= maxLength && (!matches || matches.length === 0)) {
    return <HighlightedText text={text} query={query} className={className} />;
  }

  // Extract snippet around first match
  let snippet = text;
  let adjustedMatches = matches;

  if (matches && matches.length > 0) {
    const firstMatch = matches[0];
    const start = Math.max(0, firstMatch.start - contextLength);
    const end = Math.min(text.length, firstMatch.start + firstMatch.length + contextLength);

    snippet = text.substring(start, end);

    // Adjust match positions relative to snippet
    adjustedMatches = matches
      .filter((m) => m.start >= start && m.start < end)
      .map((m) => ({
        start: m.start - start,
        length: Math.min(m.length, end - m.start),
      }));

    // Add ellipsis
    snippet = (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '');
  } else if (text.length > maxLength) {
    snippet = text.substring(0, maxLength) + '...';
  }

  return (
    <HighlightedText
      text={snippet}
      matches={adjustedMatches}
      query={query}
      className={className}
    />
  );
}
