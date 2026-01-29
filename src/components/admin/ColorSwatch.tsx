'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getResolvedColor } from '@/utils/cssVariables';

export interface ColorSwatchProps {
  /** CSS variable name (e.g., '--cui-primary') */
  variable: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Show hex value (default: true) */
  showHex?: boolean;
  /** Show variable name (default: true) */
  showVariable?: boolean;
  /** Compact display mode */
  compact?: boolean;
}

/**
 * ColorSwatch - Live color preview from CSS variables
 *
 * Reads the actual computed value of a CSS variable and displays
 * a color swatch with the variable name and hex value.
 * Updates automatically when theme changes.
 */
export function ColorSwatch({
  variable,
  name,
  description,
  showHex = true,
  showVariable = true,
  compact = false,
}: ColorSwatchProps) {
  const [hexColor, setHexColor] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const updateColor = useCallback(() => {
    const resolved = getResolvedColor(variable);
    setHexColor(resolved);
  }, [variable]);

  useEffect(() => {
    // Initial color read
    updateColor();

    // Listen for theme changes via MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === 'data-coreui-theme' ||
          mutation.attributeName === 'class'
        ) {
          // Small delay to allow CSS to recompute
          setTimeout(updateColor, 50);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-coreui-theme', 'class'],
    });

    return () => observer.disconnect();
  }, [updateColor]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (compact) {
    return (
      <div
        className="color-swatch-compact"
        onClick={() => copyToClipboard(variable)}
        title={`${name}\n${variable}\n${hexColor}`}
      >
        <div
          className="color-swatch-dot"
          style={{ backgroundColor: `var(${variable})` }}
        />
        <span className="color-swatch-compact-name">{name}</span>
      </div>
    );
  }

  return (
    <div className="color-swatch-card">
      <div
        className="color-swatch-preview"
        style={{ backgroundColor: `var(${variable})` }}
      />
      <div className="color-swatch-info">
        <div className="color-swatch-name">{name}</div>
        {showVariable && (
          <button
            type="button"
            className="color-swatch-variable"
            onClick={() => copyToClipboard(variable)}
            title="Click to copy"
          >
            <code>{variable}</code>
            {copied && <span className="copy-feedback">Copied</span>}
          </button>
        )}
        {showHex && hexColor && (
          <button
            type="button"
            className="color-swatch-hex"
            onClick={() => copyToClipboard(hexColor)}
            title="Click to copy"
          >
            <code>{hexColor}</code>
          </button>
        )}
        {description && (
          <div className="color-swatch-description">{description}</div>
        )}
      </div>
    </div>
  );
}

export default ColorSwatch;
