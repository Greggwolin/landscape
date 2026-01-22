'use client';

import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_PATH = 'docs/design-system/style-catalog.md';

interface StyleCatalogContentProps {
  filePath?: string;
  title?: string;
  showTitle?: boolean;
}

interface MarkdownResponse {
  success: boolean;
  content?: string;
  error?: string;
}

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
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set([
    'component',
    'swatch',
    'used',
    'background',
    'text',
    'border',
    'hover',
    'active',
    'dark'
  ]));
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMarkdown = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/markdown?path=${encodeURIComponent(filePath)}`);
        const data = (await response.json()) as MarkdownResponse;
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

  const rendered = useMemo(() => renderMarkdown(content), [content]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const cells = root.querySelectorAll<HTMLElement>('[data-col]');
    cells.forEach((cell) => {
      const col = cell.dataset.col;
      if (!col) return;
      cell.style.display = visibleColumns.has(col) ? '' : 'none';
    });
  }, [visibleColumns, rendered]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        color: 'var(--cui-body-color)',
        border: '1px solid var(--cui-border-color)',
        borderRadius: '12px',
        padding: '20px'
      }}
    >
      {showTitle && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{title}</div>
          <div style={{ color: 'var(--cui-secondary-color)', fontSize: '0.875rem' }}>
            Canonical Styles (read-only)
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        {[
          { key: 'component', label: 'Component' },
          { key: 'swatch', label: 'Swatch' },
          { key: 'used', label: 'Used for' },
          { key: 'background', label: 'Background' },
          { key: 'text', label: 'Text' },
          { key: 'border', label: 'Border' },
          { key: 'hover', label: 'Hover' },
          { key: 'active', label: 'Active' },
          { key: 'dark', label: 'Dark theme' },
        ].map((col) => {
          const active = visibleColumns.has(col.key);
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => toggleColumn(col.key)}
              className="btn btn-sm"
              style={{
                backgroundColor: active ? 'var(--cui-primary)' : 'transparent',
                color: active ? '#fff' : 'var(--cui-body-color)',
                borderColor: active ? 'var(--cui-primary)' : 'var(--cui-border-color)',
                borderWidth: 1,
                borderStyle: 'solid',
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: '0.75rem'
              }}
            >
              {col.label}
            </button>
          );
        })}
      </div>
      {loading && <div style={{ color: 'var(--cui-secondary-color)' }}>Loading style catalog...</div>}
      {error && <div style={{ color: 'var(--cui-danger)' }}>{error}</div>}
      {!loading && !error && (
        <div ref={contentRef} dangerouslySetInnerHTML={{ __html: rendered }} />
      )}
    </div>
  );
};

export default StyleCatalogContent;
