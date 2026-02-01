'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '@/styles/style-catalog.css';
import { colorRegistry } from '@/config/colorRegistry';
import { getResolvedColor } from '@/utils/cssVariables';

const DEFAULT_PATH = 'docs/design-system/style-catalog.md';

type PaletteVariantType = 'dark' | 'base' | 'fill' | 'bg' | 'bgSubtle' | 'text' | 'border' | 'alias';

type PaletteEntry = {
  token: string;
  type: PaletteVariantType;
  shortLabel: string;
};

type PaletteFamily = {
  label: string;
  entries: PaletteEntry[];
};

const paletteFamilies: PaletteFamily[] = [
  {
    label: 'Primary (Blue)',
    entries: [
      { token: '--cui-primary-dark', type: 'dark', shortLabel: 'Dark Companion' },
      { token: '--cui-primary-ramp-01', type: 'fill', shortLabel: 'Ramp 01' },
      { token: '--cui-primary-ramp-02', type: 'fill', shortLabel: 'Ramp 02' },
      { token: '--cui-primary', type: 'base', shortLabel: 'Base' },
      { token: '--cui-primary-ramp-04', type: 'fill', shortLabel: 'Ramp 04' },
      { token: '--cui-primary-ramp-05', type: 'fill', shortLabel: 'Ramp 05' },
      { token: '--cui-primary-bg', type: 'bg', shortLabel: 'BG' },
      { token: '--cui-primary-bg-subtle', type: 'bgSubtle', shortLabel: 'BG subtle' },
      { token: '--cui-primary-text', type: 'text', shortLabel: 'Text' },
      { token: '--cui-primary-border-subtle', type: 'border', shortLabel: 'Border' },
      { token: '--cui-primary-color', type: 'alias', shortLabel: 'Alias' },
    ],
  },
  {
    label: 'Primary Surface (Dark Blue)',
    entries: [
      { token: '--cui-primary-surface-01', type: 'fill', shortLabel: 'Surface 01' },
      { token: '--cui-primary-surface-02', type: 'fill', shortLabel: 'Surface 02' },
      { token: '--cui-primary-surface-03', type: 'fill', shortLabel: 'Surface 03' },
      { token: '--cui-primary-surface-04', type: 'fill', shortLabel: 'Surface 04' },
      { token: '--cui-primary-surface-05', type: 'fill', shortLabel: 'Surface 05' },
    ],
  },
  {
    label: 'Secondary (Slate)',
    entries: [
      { token: '--cui-secondary-dark', type: 'dark', shortLabel: 'Dark' },
      { token: '--cui-secondary', type: 'base', shortLabel: 'Base' },
    ],
  },
  {
    label: 'Success (Green)',
    entries: [
      { token: '--cui-success-dark', type: 'dark', shortLabel: 'Dark' },
      { token: '--cui-success', type: 'base', shortLabel: 'Base' },
      { token: '--cui-success-bg', type: 'bg', shortLabel: 'BG' },
      { token: '--cui-success-color', type: 'alias', shortLabel: 'Alias' },
    ],
  },
  {
    label: 'Danger (Red)',
    entries: [
      { token: '--cui-danger-dark', type: 'dark', shortLabel: 'Danger Dark' },
      { token: '--cui-danger-ramp-01', type: 'fill', shortLabel: 'Ramp 01' },
      { token: '--cui-danger-ramp-02', type: 'fill', shortLabel: 'Ramp 02' },
      { token: '--cui-danger', type: 'base', shortLabel: 'Base' },
      { token: '--cui-danger-ramp-04', type: 'fill', shortLabel: 'Ramp 04' },
      { token: '--cui-danger-bg', type: 'bg', shortLabel: 'BG' },
      { token: '--cui-danger-border-subtle', type: 'border', shortLabel: 'Border' },
      { token: '--cui-danger-text', type: 'text', shortLabel: 'Text' },
      { token: '--cui-danger-color', type: 'alias', shortLabel: 'Alias' },
    ],
  },
  {
    label: 'Warning (Yellow)',
    entries: [
      { token: '--cui-warning-dark', type: 'dark', shortLabel: 'Dark' },
      { token: '--cui-warning', type: 'base', shortLabel: 'Base' },
      { token: '--cui-warning-bg', type: 'bg', shortLabel: 'BG' },
    ],
  },
  {
    label: 'Info (Purple)',
    entries: [
      { token: '--cui-info-dark', type: 'dark', shortLabel: 'Dark' },
      { token: '--cui-info', type: 'base', shortLabel: 'Base' },
    ],
  },
  {
    label: 'Neutrals',
    entries: [
      { token: '--cui-surface-900', type: 'dark', shortLabel: 'Surface 900' },
      { token: '--cui-surface-800', type: 'base', shortLabel: 'Surface 800' },
      { token: '--cui-surface-700', type: 'bg', shortLabel: 'Surface 700' },
      { token: '--cui-dark-bg-subtle', type: 'bgSubtle', shortLabel: 'Dark BG' },
      { token: '--cui-light-bg-subtle', type: 'bgSubtle', shortLabel: 'Light BG' },
    ],
  },
];

const rampTypes: PaletteVariantType[] = ['dark', 'base', 'fill', 'bg', 'bgSubtle'];
const utilityTypes: PaletteVariantType[] = ['text', 'border', 'alias'];

const getSwatchStyle = (type: PaletteVariantType, resolved: string) => {
  switch (type) {
    case 'dark':
    case 'base':
    case 'fill':
      return {
        backgroundColor: resolved,
        color: '#ffffff',
        border: 'none'
      };
    case 'bg':
    case 'bgSubtle':
      return {
        backgroundColor: resolved,
        color: 'var(--cui-body-color)',
        border: 'none'
      };
    case 'text':
      return {
        backgroundColor: 'var(--cui-body-bg)',
        color: 'var(--cui-body-color)',
        border: '1px solid var(--cui-border-color)'
      };
    case 'border':
      return {
        backgroundColor: 'var(--cui-body-bg)',
        border: `1px solid ${resolved}`,
        color: 'var(--cui-body-color)'
      };
    case 'alias':
      return {
        backgroundColor: 'var(--cui-card-bg)',
        border: `1px dashed ${resolved}`,
        color: 'var(--cui-body-color)'
      };
    default:
      return {
        backgroundColor: 'transparent',
        color: 'var(--cui-body-color)',
        border: '1px solid var(--cui-border-color)'
      };
  }
};

const renderMarkdown = (markdown: string) => {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inCodeBlock = false;
  let inTableBlock = false;
  let codeBuffer: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const flushCodeBlock = () => {
    if (!inCodeBlock) return;
    const code = codeBuffer.join('\n');
    html.push(
      `<pre style="background:#f3f4f7;border:1px solid #e5e7eb;border-radius:8px;padding:12px;overflow-x:auto;"><code>${code}</code></pre>`
    );
    codeBuffer = [];
    inCodeBlock = false;
  };

  const formatInline = (text: string) => {
    let formatted = text;
    formatted = formatted.replace(/`([^`]+)`/gim, '<code style="background:#f3f4f7;padding:0 6px;border-radius:6px;">$1</code>');
    formatted = formatted.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    formatted = formatted.replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    return formatted;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');

    if (line.startsWith('<table')) {
      closeList();
      inTableBlock = true;
      html.push(line);
      continue;
    }

    if (inTableBlock) {
      html.push(line);
      if (line.startsWith('</table')) {
        inTableBlock = false;
      }
      continue;
    }

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        closeList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      closeList();
      const level = line.match(/^#{1,6}/)?.[0].length || 1;
      const text = formatInline(line.replace(/^#{1,6}\s+/, '').trim());
      html.push(`<h${level} style="margin:24px 0 12px;font-weight:700;">${text}</h${level}>`);
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      if (listType && listType !== 'ul') closeList();
      if (!listType) {
        listType = 'ul';
        html.push('<ul style="padding-left:20px;margin:8px 0;">');
      }
      const text = formatInline(line.replace(/^\s*-\s+/, '').trim());
      html.push(`<li style="margin:4px 0;">${text}</li>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      if (listType && listType !== 'ol') closeList();
      if (!listType) {
        listType = 'ol';
        html.push('<ol style="padding-left:20px;margin:8px 0;">');
      }
      const text = formatInline(line.replace(/^\s*\d+\.\s+/, '').trim());
      html.push(`<li style="margin:4px 0;">${text}</li>`);
      continue;
    }

    if (line.trim() === '') {
      closeList();
      html.push('<div style="height:8px;"></div>');
      continue;
    }

    closeList();
    html.push(`<p style="margin:8px 0;line-height:1.6;">${formatInline(line)}</p>`);
  }

  flushCodeBlock();
  closeList();

  return html.join('\n');
};

const StyleCatalogContent: React.FC<StyleCatalogContentProps> = ({
  filePath = DEFAULT_PATH,
  title = 'Style Catalog',
  showTitle = true
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedColors, setResolvedColors] = useState<Record<string, string>>({});
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const renderedMarkdown = useMemo(() => renderMarkdown(content), [content]);
  const colorMap = useMemo(() => {
    const map: Record<string, typeof colorRegistry[0]> = {};
    colorRegistry.forEach((color) => {
      map[color.variable] = color;
    });
    return map;
  }, []);

  const paletteTokenCount = useMemo(() => {
    const tokenSet = new Set<string>();
    paletteFamilies.forEach((family) => {
      family.entries.forEach((entry) => tokenSet.add(entry.token));
    });
    return tokenSet.size;
  }, []);
  const lastSyncedText = lastSynced ? lastSynced.toLocaleString() : 'syncing…';

  const refreshResolved = useCallback(() => {
    if (typeof window === 'undefined') return;
    const next: Record<string, string> = {};
    colorRegistry.forEach((color) => {
      next[color.variable] = getResolvedColor(color.variable) || color.lightValue;
    });
    setResolvedColors(next);
    setLastSynced(new Date());
  }, []);

  useEffect(() => {
    refreshResolved();
    if (typeof MutationObserver === 'undefined') return undefined;
    const observer = new MutationObserver(refreshResolved);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-coreui-theme']
    });
    return () => observer.disconnect();
  }, [refreshResolved]);

  useEffect(() => {
    let isMounted = true;
    const fetchMarkdown = async () => {
      if (!filePath) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/markdown?path=${encodeURIComponent(filePath)}`);
        const data = (await response.json()) as { success: boolean; content?: string; error?: string };
        if (!response.ok || !data.success) {
          throw new Error(data.error || response.statusText);
        }
        if (isMounted) {
          setContent(data.content || '');
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load document');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMarkdown();
    return () => {
      isMounted = false;
    };
  }, [filePath]);

  const [focusedVariant, setFocusedVariant] = useState<string | null>(null);

  const renderPaletteSwatch = (familyLabel: string, entry: PaletteEntry) => {
    const definition = colorMap[entry.token];
    if (!definition) return null;

    const resolved = resolvedColors[entry.token] || definition.lightValue;
    const tokenDisplay = definition.variable;
    const humanName = definition.name || entry.shortLabel;
    const usageNote = definition.description || '—';
    const resolvedDisplay = resolved || '—';
    const sampleTextColor = entry.type === 'text' ? resolved : definition.textVariable || 'var(--cui-body-color)';

    const key = `${familyLabel}-${entry.token}`;
    const isOpen = focusedVariant === key;
    const swatchStyle = getSwatchStyle(entry.type, resolved);

    return (
      <div key={key} style={{ marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setFocusedVariant(isOpen ? null : key)}
          style={{
            width: '100%',
            borderRadius: '10px',
            padding: '0.75rem 0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '48px',
            gap: '0.5rem',
            textTransform: 'none',
            ...swatchStyle
          }}
        >
          <span style={{ color: swatchStyle.color, letterSpacing: '0.05em' }}>{entry.shortLabel}</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.75, color: 'var(--cui-secondary-color)' }}>
            {isOpen ? 'Hide info' : 'Show info'}
          </span>
        </button>
        {isOpen && (
          <div
            style={{
              borderLeft: '3px solid var(--cui-border-color)',
              padding: '10px 14px',
              background: 'var(--cui-card-bg)',
              marginTop: '4px'
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>{humanName}</p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '0.75rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: 'var(--cui-secondary-color)'
              }}
            >
              {tokenDisplay}
            </p>
            <p style={{ margin: '8px 0 4px', fontWeight: 600 }}>{resolvedDisplay}</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--cui-secondary-color)' }}>
              {usageNote}
            </p>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: sampleTextColor,
                marginTop: '8px'
              }}
            >
              The quick brown fox
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPaletteFamily = (family: PaletteFamily) => {
    const rampEntries = rampTypes.flatMap((type) =>
      family.entries.filter((entry) => entry.type === type)
    );
    const utilityEntries = utilityTypes.flatMap((type) =>
      family.entries.filter((entry) => entry.type === type)
    );

    return (
      <div
        key={family.label}
        style={{
          minWidth: '220px',
          border: '1px solid var(--cui-border-color)',
          borderRadius: '10px',
          padding: '16px',
          background: 'var(--cui-card-bg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{family.label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rampEntries.map((entry) => renderPaletteSwatch(family.label, entry))}
        </div>
        {utilityEntries.length > 0 && (
          <div
            style={{
              borderTop: '1px solid var(--cui-border-color)',
              paddingTop: '0.75rem'
            }}
          >
            <div
              style={{
                fontSize: '0.65rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--cui-secondary-color)',
                marginBottom: '0.5rem'
              }}
            >
              Utilities
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {utilityEntries.map((entry) => renderPaletteSwatch(family.label, entry))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="style-catalog">
      {showTitle && (
        <div className="style-catalog-header">
          <div>
            <h1 className="style-catalog-title">{title}</h1>
            <p className="style-catalog-subtitle">
              Canonical palette + component styles driven directly from CoreUI’s theme.
              <span className="style-catalog-live-badge">
                Last synced from colorRegistry ({lastSynced ? lastSyncedText : 'syncing…'})
              </span>
            </p>
          </div>
        </div>
      )}

      <section className="style-catalog-section">
        <div className="style-catalog-section-header">
          <h2 className="style-catalog-section-title">Color Palette — Overview</h2>
          <span className="style-catalog-section-count">{paletteTokenCount} tokens</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
          {paletteFamilies.map((family) => renderPaletteFamily(family))}
        </div>
      </section>

      <section className="style-catalog-section">
        <div className="style-catalog-section-header">
          <h2 className="style-catalog-section-title">Component Styles</h2>
        </div>
        <div>
          {loading && (
            <div style={{ color: 'var(--cui-secondary-color)' }}>Loading style catalog...</div>
          )}
          {error && <div style={{ color: 'var(--cui-danger)' }}>{error}</div>}
          {!loading && !error && (
            <div dangerouslySetInnerHTML={{ __html: renderedMarkdown }} />
          )}
        </div>
      </section>
    </div>
  );
};

export default StyleCatalogContent;
