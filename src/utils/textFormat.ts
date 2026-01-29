/**
 * Text formatting utilities for consistent text display
 * @module utils/textFormat
 */

/**
 * Converts a string to Proper Case (Title Case)
 * Each word's first letter is capitalized, rest lowercase
 *
 * @param text - The text to convert
 * @returns The text in Proper Case, or empty string if input is null/undefined
 *
 * @example
 * toProperCase('HELLO WORLD') // 'Hello World'
 * toProperCase('hello world') // 'Hello World'
 * toProperCase('hElLo WoRlD') // 'Hello World'
 * toProperCase(null) // ''
 */
export function toProperCase(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Converts a string to Sentence Case
 * Only the first letter of the first word is capitalized
 *
 * @param text - The text to convert
 * @returns The text in Sentence Case, or empty string if input is null/undefined
 *
 * @example
 * toSentenceCase('HELLO WORLD') // 'Hello world'
 * toSentenceCase('hello world') // 'Hello world'
 */
export function toSentenceCase(text: string | null | undefined): string {
  if (!text) return '';
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Converts a kebab-case or snake_case string to Proper Case
 *
 * @param text - The text to convert
 * @returns The text in Proper Case with separators replaced by spaces
 *
 * @example
 * kebabToProperCase('land-development') // 'Land Development'
 * kebabToProperCase('land_development') // 'Land Development'
 */
export function kebabToProperCase(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[-_]/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Converts a camelCase or PascalCase string to Proper Case with spaces
 *
 * @param text - The text to convert
 * @returns The text in Proper Case with spaces between words
 *
 * @example
 * camelToProperCase('landDevelopment') // 'Land Development'
 * camelToProperCase('LandDevelopment') // 'Land Development'
 */
export function camelToProperCase(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
