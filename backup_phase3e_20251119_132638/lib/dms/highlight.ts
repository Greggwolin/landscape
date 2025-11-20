/**
 * Search highlighting utilities
 * Highlights matched terms in text based on Meilisearch results
 */

export interface MatchPosition {
  start: number;
  length: number;
}

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Parse Meilisearch match positions and generate highlight segments
 */
export function parseHighlights(
  text: string,
  matches: MatchPosition[]
): HighlightSegment[] {
  if (!matches || matches.length === 0) {
    return [{ text, highlighted: false }];
  }

  // Sort matches by start position
  const sortedMatches = [...matches].sort((a, b) => a.start - b.start);

  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  sortedMatches.forEach((match) => {
    // Add non-highlighted text before match
    if (match.start > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.start),
        highlighted: false,
      });
    }

    // Add highlighted match
    segments.push({
      text: text.substring(match.start, match.start + match.length),
      highlighted: true,
    });

    lastIndex = match.start + match.length;
  });

  // Add remaining non-highlighted text
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      highlighted: false,
    });
  }

  return segments;
}

/**
 * Extract snippet around first match (for previews)
 */
export function extractSnippet(
  text: string,
  matches: MatchPosition[],
  contextLength = 100
): { snippet: string; segments: HighlightSegment[] } {
  if (!matches || matches.length === 0) {
    return {
      snippet: text.substring(0, contextLength * 2),
      segments: [{ text: text.substring(0, contextLength * 2), highlighted: false }],
    };
  }

  // Find first match
  const firstMatch = matches[0];
  const start = Math.max(0, firstMatch.start - contextLength);
  const end = Math.min(text.length, firstMatch.start + firstMatch.length + contextLength);

  const snippet = text.substring(start, end);

  // Adjust match positions relative to snippet
  const adjustedMatches = matches
    .filter((m) => m.start >= start && m.start < end)
    .map((m) => ({
      start: m.start - start,
      length: Math.min(m.length, end - m.start),
    }));

  const segments = parseHighlights(snippet, adjustedMatches);

  return {
    snippet: (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : ''),
    segments,
  };
}

/**
 * Simple text-based highlighting (fallback when no match positions)
 */
export function highlightText(
  text: string,
  query: string
): HighlightSegment[] {
  if (!query || query.trim().length === 0) {
    return [{ text, highlighted: false }];
  }

  const terms = query.toLowerCase().split(/\s+/);
  const segments: HighlightSegment[] = [];
  const lowerText = text.toLowerCase();

  let lastIndex = 0;

  // Find all occurrences of search terms
  terms.forEach((term) => {
    let index = lowerText.indexOf(term, lastIndex);
    while (index !== -1) {
      // Add non-highlighted text before match
      if (index > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, index),
          highlighted: false,
        });
      }

      // Add highlighted match
      segments.push({
        text: text.substring(index, index + term.length),
        highlighted: true,
      });

      lastIndex = index + term.length;
      index = lowerText.indexOf(term, lastIndex);
    }
  });

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      highlighted: false,
    });
  }

  return segments;
}
