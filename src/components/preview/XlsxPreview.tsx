'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { PreviewLoading } from './PreviewLoading';
import { PreviewError } from './PreviewError';

interface XlsxPreviewProps {
  fileUrl: string;
  filename?: string | null;
  /** Height of the preview container in px. Defaults to 320. */
  height?: number;
  /** Optional onError callback for the host. */
  onError?: (error: Error) => void;
  /** Optional download handler — surfaced on PreviewError so the user can recover. */
  onDownload?: () => void;
}

interface ParsedSheet {
  name: string;
  /** 2D array of cell values, stringified for display. */
  rows: string[][];
}

/**
 * Read-only xlsx preview using SheetJS. Phase 1.
 *
 * Fetches the file, parses with XLSX.read, renders sheet tabs + a
 * simple HTML table for the active sheet. No formula evaluation,
 * no editing — the full audit pipeline already covers that elsewhere.
 *
 * Limits: shows the first 100 rows × 26 columns per sheet to keep
 * the inline panel responsive. Users who need the full sheet should
 * open it in Excel via the existing "Open externally" action.
 */
const MAX_ROWS = 100;
const MAX_COLS = 26;

export function XlsxPreview({
  fileUrl,
  filename,
  height = 320,
  onError,
  onDownload,
}: XlsxPreviewProps) {
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSheets([]);
    setActiveIdx(0);

    (async () => {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching workbook`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const wb = XLSX.read(buf, { type: 'array' });

        const parsed: ParsedSheet[] = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
            header: 1,
            blankrows: false,
            defval: '',
            raw: false,
          }) as unknown as string[][];
          const trimmed = rows.slice(0, MAX_ROWS).map((row) =>
            row.slice(0, MAX_COLS).map((cell) => (cell == null ? '' : String(cell)))
          );
          return { name, rows: trimmed };
        }).filter((s) => s.rows.length > 0);

        if (cancelled) return;

        if (parsed.length === 0) {
          throw new Error('Workbook has no readable sheets');
        }
        setSheets(parsed);
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        onError?.(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, onError]);

  if (loading) {
    return (
      <div style={{ width: '100%', height }}>
        <PreviewLoading message="Loading workbook…" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100%', height }}>
        <PreviewError
          message="Couldn't load workbook"
          detail={error.message}
          onAction={onDownload}
          actionLabel="Download"
        />
      </div>
    );
  }

  const active = sheets[activeIdx];
  if (!active) {
    return (
      <div style={{ width: '100%', height }}>
        <PreviewError message="No sheets to display" detail={filename || undefined} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--w-bg-surface, #ffffff)',
        overflow: 'hidden',
      }}
    >
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 4,
            padding: '4px 8px',
            background: 'var(--w-bg-surface-hover, #f5f5f5)',
            borderBottom: '1px solid var(--w-border)',
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          {sheets.map((s, idx) => (
            <button
              key={`${s.name}-${idx}`}
              role="tab"
              aria-selected={idx === activeIdx}
              onClick={() => setActiveIdx(idx)}
              style={{
                padding: '3px 10px',
                fontSize: 11,
                border: '1px solid var(--w-border)',
                borderRadius: 4,
                background: idx === activeIdx ? 'var(--w-card-bg, #ffffff)' : 'transparent',
                color: 'var(--w-text-primary, #111)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Sheet body */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#ffffff',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 11,
            color: '#111',
            tableLayout: 'auto',
            background: '#ffffff',
          }}
        >
          <tbody>
            {active.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                style={{
                  background: rIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                }}
              >
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      padding: '2px 6px',
                      border: '1px solid #e5e7eb',
                      whiteSpace: 'nowrap',
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={cell}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {active.rows.length === MAX_ROWS && (
          <div
            style={{
              padding: '6px 10px',
              fontSize: 10,
              color: 'var(--w-text-tertiary, #888)',
              borderTop: '1px solid #e5e7eb',
              background: '#fafafa',
              textAlign: 'center',
            }}
          >
            Showing first {MAX_ROWS} rows / {MAX_COLS} columns — open in Excel for full sheet.
          </div>
        )}
      </div>
    </div>
  );
}

export default XlsxPreview;
