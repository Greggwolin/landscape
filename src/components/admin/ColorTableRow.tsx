'use client';

import React, { useState } from 'react';
import { CTableRow, CTableDataCell } from '@coreui/react';

interface ColorTableRowProps {
  /** CSS variable name (e.g., '--cui-primary') */
  variable: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Optional paired text color (CSS variable or hex) */
  textVariable?: string;
  /** Light mode hex value from registry */
  lightValue: string;
  /** Dark mode hex value from registry */
  darkValue: string;
}

/**
 * ColorTableRow - Table row for color display with text pairing
 *
 * Uses pre-computed light/dark values from the color registry
 * to avoid DOM manipulation that causes accordion collapse.
 */
export function ColorTableRow({
  variable,
  name,
  description,
  textVariable,
  lightValue,
  darkValue,
}: ColorTableRowProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  // Determine the text color for display
  // If textVariable starts with '--', it's a CSS variable; otherwise it's a hex color
  const isTextVariableCss = textVariable?.startsWith('--');
  const displayTextColor = textVariable
    ? isTextVariableCss
      ? `var(${textVariable})`
      : textVariable
    : '#ffffff';

  // Display text for the Text Color column
  const textColorDisplay = textVariable
    ? isTextVariableCss
      ? textVariable
      : 'white'
    : 'white';

  return (
    <CTableRow>
      <CTableDataCell className="fw-semibold">{name}</CTableDataCell>
      <CTableDataCell>
        <div
          className="color-swatch-inline"
          style={{
            backgroundColor: `var(${variable})`,
            color: displayTextColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
          title={`${name}: ${lightValue}`}
        >
          Aa
        </div>
      </CTableDataCell>
      <CTableDataCell>
        {isTextVariableCss ? (
          <button
            type="button"
            className="color-table-copy-btn"
            onClick={() => copyToClipboard(textVariable!, 'text')}
            title="Click to copy"
          >
            <code>{textColorDisplay}</code>
            {copied === 'text' && <span className="copy-feedback ms-2">Copied!</span>}
          </button>
        ) : (
          <span className="text-muted">{textColorDisplay}</span>
        )}
      </CTableDataCell>
      <CTableDataCell className="text-secondary small">
        {description || '—'}
      </CTableDataCell>
      <CTableDataCell>
        <button
          type="button"
          className="color-table-copy-btn"
          onClick={() => copyToClipboard(variable, 'variable')}
          title="Click to copy"
        >
          <code>{variable}</code>
          {copied === 'variable' && <span className="copy-feedback ms-2">Copied!</span>}
        </button>
      </CTableDataCell>
      <CTableDataCell>
        <button
          type="button"
          className="color-table-copy-btn"
          onClick={() => copyToClipboard(lightValue, 'light')}
          title="Click to copy"
        >
          <code>{lightValue}</code>
          {copied === 'light' && <span className="copy-feedback ms-2">Copied!</span>}
        </button>
      </CTableDataCell>
      <CTableDataCell>
        <button
          type="button"
          className="color-table-copy-btn"
          onClick={() => copyToClipboard(darkValue, 'dark')}
          title="Click to copy"
        >
          <code>{darkValue}</code>
          {copied === 'dark' && <span className="copy-feedback ms-2">Copied!</span>}
        </button>
      </CTableDataCell>
    </CTableRow>
  );
}

export default ColorTableRow;
