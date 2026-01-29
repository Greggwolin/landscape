/**
 * CSS Variable Utilities
 *
 * Utilities for reading CSS variable values at runtime.
 * Used by the Style Catalog to display live color values.
 *
 * @module utils/cssVariables
 */

/**
 * Get the computed value of a CSS variable
 *
 * @param name - CSS variable name (with or without --)
 * @returns The computed value, or empty string if not found
 *
 * @example
 * getCSSVariable('--cui-primary') // '#0ea5e9'
 * getCSSVariable('cui-primary') // '#0ea5e9' (auto-prefixes --)
 */
export function getCSSVariable(name: string): string {
  if (typeof window === 'undefined') return '';

  const varName = name.startsWith('--') ? name : `--${name}`;
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

/**
 * Get an RGB CSS variable and format it as rgb()
 *
 * @param name - CSS variable name for RGB value (e.g., --cui-primary-rgb)
 * @returns Formatted rgb() string, or empty string if not found
 *
 * @example
 * getCSSVariableRGB('--cui-primary-rgb') // 'rgb(14, 165, 233)'
 */
export function getCSSVariableRGB(name: string): string {
  const rgb = getCSSVariable(name);
  return rgb ? `rgb(${rgb})` : '';
}

/**
 * Convert a color value to hex format
 *
 * @param color - Color value (hex, rgb, hsl, or CSS variable)
 * @returns Hex color string, or the original value if conversion fails
 */
export function toHexColor(color: string): string {
  if (!color || typeof window === 'undefined') return color;

  // Already hex
  if (color.startsWith('#')) return color.toUpperCase();

  // Try to parse rgb/rgba
  const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    const hex = [r, g, b]
      .map(n => parseInt(n, 10).toString(16).padStart(2, '0'))
      .join('');
    return `#${hex.toUpperCase()}`;
  }

  // Try to parse hsl
  const hslMatch = color.match(/hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/i);
  if (hslMatch) {
    const [, h, s, l] = hslMatch.map(Number);
    return hslToHex(h, s, l);
  }

  return color;
}

/**
 * Convert HSL to Hex
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) =>
    Math.round((n + m) * 255).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Get the resolved color value of a CSS variable (as hex)
 *
 * @param variable - CSS variable name
 * @returns Hex color string
 */
export function getResolvedColor(variable: string): string {
  if (typeof window === 'undefined') return '';

  // Create a temporary element to resolve the color
  const temp = document.createElement('div');
  temp.style.color = `var(${variable})`;
  temp.style.display = 'none';
  document.body.appendChild(temp);

  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  return toHexColor(computed);
}
