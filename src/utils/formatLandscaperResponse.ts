/**
 * Utilities for formatting and sanitizing Landscaper AI responses.
 *
 * These functions clean up Claude's output for display:
 * - Remove markdown syntax (headers, bold, italic, code blocks)
 * - Strip "thinking" narration (Let me check..., I'll analyze...)
 * - Normalize whitespace and formatting
 */

/**
 * Web addresses and markdown links, matched so they can be shielded from the
 * markdown clean-up below and rendered as clickable links. The underscore-
 * italic rule was eating the underscores out of county addresses
 * ("planning_and_development" became "planninganddevelopment") and every such
 * link 404'd (2026-10-17).
 */
export const LINK_PATTERN = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)|https?:\/\/[^\s<>"'`)\]]+/g;
const LINK_TRAIL = /[.,;:!?*]+$/;

/**
 * Remove markdown formatting from response text.
 * Claude sometimes includes markdown even when instructed not to.
 */
export function sanitizeLandscaperResponse(response: string): string {
  if (!response) return '';

  // Shield links: swap each for a placeholder, clean the text, put them back.
  const links: string[] = [];
  const shielded = response.replace(LINK_PATTERN, (match) => {
    const trail = match.startsWith('[') ? '' : (match.match(LINK_TRAIL)?.[0] ?? '');
    links.push(trail ? match.slice(0, -trail.length) : match);
    return `\u0000L${links.length - 1}\u0000${trail}`;
  });

  return restoreLinks(
    shielded
      // Remove markdown headers (## Header, ### Header, etc.)
      .replace(/^#{1,6}\s+(.*)$/gm, '$1')
      // Remove markdown bold (preserve content)
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      // Remove markdown italic (single asterisk, preserve content)
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
      // Remove markdown bold/italic (triple asterisk)
      .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
      // Remove underscore bold
      .replace(/__([^_]+)__/g, '$1')
      // Remove underscore italic
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '$1')
      // Remove inline code backticks (preserve content)
      .replace(/`([^`]+)`/g, '$1')
      // Remove code blocks entirely (these don't display well in plain text)
      .replace(/```[\s\S]*?```/g, '')
      // Convert markdown bullets to plain text bullets
      .replace(/^\s*[-*+]\s+/gm, '  • ')
      // Keep numbered lists but clean formatting
      .replace(/^\s*(\d+)\.\s+/gm, '$1. ')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Normalize excessive blank lines (more than 2 in a row)
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    links,
  );
}

function restoreLinks(text: string, links: string[]): string {
  return text.replace(/\u0000L(\d+)\u0000/g, (_, i) => links[Number(i)] ?? '');
}

export type LinkSegment = { text: string; href?: string };

/** Split display text into plain runs and links ([label](url) or bare url). */
export function splitLinks(text: string): LinkSegment[] {
  const out: LinkSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_PATTERN)) {
    const start = m.index ?? 0;
    let full = m[0];
    let label: string;
    let href: string;
    if (m[2]) {
      label = m[1];
      href = m[2];
    } else {
      const trail = full.match(LINK_TRAIL)?.[0] ?? '';
      if (trail) full = full.slice(0, -trail.length);
      label = full;
      href = full;
    }
    if (start > last) out.push({ text: text.slice(last, start) });
    out.push({ text: label, href });
    last = start + full.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/**
 * Remove "thinking out loud" narration from responses.
 * Claude sometimes narrates its process even when asked not to.
 */
export function stripThinkingNarration(response: string): string {
  if (!response) return '';

  // Patterns that indicate Claude is narrating its thinking process
  // These should be removed to give users direct answers
  const thinkingPatterns = [
    // "I'll" patterns
    /^I'll\s+[^.!?]+[.!?]\s*/gm,
    /^I will\s+[^.!?]+[.!?]\s*/gm,
    // "Let me" patterns
    /^Let me\s+[^.!?:]+[.!?:]\s*/gm,
    /^Now let me\s+[^.!?:]+[.!?:]\s*/gm,
    // "Now I" patterns
    /^Now I\s+[^.!?]+[.!?]\s*/gm,
    /^Now,?\s+I\s+[^.!?]+[.!?]\s*/gm,
    // "First/Next" thinking patterns
    /^First,?\s+I'll\s+[^.!?]+[.!?]\s*/gm,
    /^First,?\s+let me\s+[^.!?:]+[.!?:]\s*/gm,
    /^Next,?\s+I'll\s+[^.!?]+[.!?]\s*/gm,
    // Observation patterns that are just narration
    /^I notice\s+that\s+[^.!?]+[.!?]\s*/gm,
    /^I can see\s+that\s+[^.!?]+[.!?]\s*/gm,
    /^I see\s+that\s+[^.!?]+[.!?]\s*/gm,
    // "Looking at" patterns (when used as filler)
    /^Looking at\s+[^,.:]+[,.:]\s*/gm,
    // Generic analysis narration
    /^Based on my analysis,?\s*/gm,
    /^After analyzing[^,]*,?\s*/gm,
    /^After reviewing[^,]*,?\s*/gm,
    // Comprehensive understanding patterns
    /^I have a comprehensive understanding[^.!?]*[.!?]\s*/gm,
    /^I now have[^.!?]*understanding[^.!?]*[.!?]\s*/gm,
    // "I'm going to" patterns
    /^I'm going to\s+[^.!?]+[.!?]\s*/gm,
    // Tool usage narration
    /^I'm checking\s+[^.!?]+[.!?]\s*/gm,
    /^I'm looking at\s+[^.!?]+[.!?]\s*/gm,
    /^I'm pulling\s+[^.!?]+[.!?]\s*/gm,
    /^I'm retrieving\s+[^.!?]+[.!?]\s*/gm,
  ];

  let cleaned = response;
  for (const pattern of thinkingPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean up any resulting issues
  return cleaned
    // Remove lines that are just whitespace
    .replace(/^\s*$/gm, '')
    // Normalize excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Full processing pipeline for Landscaper responses.
 * Applies all sanitization and formatting in the correct order.
 */
export function processLandscaperResponse(response: string): string {
  if (!response) return '';

  // Order matters: strip thinking first, then sanitize markdown
  const withoutThinking = stripThinkingNarration(response);
  const sanitized = sanitizeLandscaperResponse(withoutThinking);

  return sanitized;
}
