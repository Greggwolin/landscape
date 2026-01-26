/**
 * Utilities for formatting and sanitizing Landscaper AI responses.
 *
 * These functions clean up Claude's output for display:
 * - Remove markdown syntax (headers, bold, italic, code blocks)
 * - Strip "thinking" narration (Let me check..., I'll analyze...)
 * - Normalize whitespace and formatting
 */

/**
 * Remove markdown formatting from response text.
 * Claude sometimes includes markdown even when instructed not to.
 */
export function sanitizeLandscaperResponse(response: string): string {
  if (!response) return '';

  return (
    response
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
      .trim()
  );
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
