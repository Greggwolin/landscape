export function sanitizeLandscaperResponse(response: string): string {
  if (!response) {
    return '';
  }

  return response
    // Remove markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown bullets (convert to indented lines)
    .replace(/^\s*[-*+]\s+/gm, '  ')
    // Remove common emojis that clutter output
    .replace(/[✅❌⚠️📊📈📉🏠🏢💰]/g, '')
    // Normalize multiple blank lines to max 2
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim();
}
