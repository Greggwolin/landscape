'use client';

import React from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  width?: number;
  format?: 'currency' | 'number' | 'decimal' | 'percent';
}

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, unknown>[];
  columns: ColumnDef[];
}

export function DataTableModal({
  isOpen,
  onClose,
  title,
  data,
  columns,
}: DataTableModalProps) {
  if (!isOpen) return null;

  const formatValue = (value: unknown, format?: string): string => {
    if (value === null || value === undefined) return '—';

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(value));
      case 'number':
        return new Intl.NumberFormat('en-US').format(Number(value));
      case 'decimal':
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 2,
        }).format(Number(value));
      case 'percent':
        if (value === 0 || value === null) return '—';
        return `${(Number(value) * 100).toFixed(1)}%`;
      default:
        return String(value);
    }
  };

  const exportToCSV = () => {
    const headers = columns.map((c) => c.label).join(',');
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          // Escape commas and quotes in CSV
          if (
            typeof val === 'string' &&
            (val.includes(',') || val.includes('"'))
          ) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val ?? '';
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const headers = columns.map((c) => c.label).join('\t');
    const rows = data.map((row) =>
      columns.map((c) => row[c.key] ?? '').join('\t')
    );
    const text = [headers, ...rows].join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative flex max-h-[80vh] w-[90vw] max-w-4xl flex-col rounded-lg shadow-xl"
        style={{ backgroundColor: 'var(--cui-card-bg)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b p-4"
          style={{ borderColor: 'var(--cui-border-color)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="rounded-md px-3 py-1.5 text-sm hover:opacity-80"
              style={{ color: 'var(--cui-body-color)' }}
              title="Copy to clipboard"
            >
              📋 Copy
            </button>
            <button
              onClick={exportToCSV}
              className="rounded-md px-3 py-1.5 text-sm hover:opacity-80"
              style={{ color: 'var(--cui-body-color)' }}
              title="Export to CSV"
            >
              📥 CSV
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 hover:opacity-80"
              style={{ color: 'var(--cui-body-color)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="p-2 text-left font-medium"
                    style={{ width: col.width, color: 'var(--cui-secondary-color)' }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:opacity-90"
                  style={{ borderBottom: '1px solid var(--cui-border-color)' }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="p-2" style={{ color: 'var(--cui-body-color)' }}>
                      {formatValue(row[col.key], col.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          className="border-t p-3 text-sm"
          style={{ borderColor: 'var(--cui-border-color)', color: 'var(--cui-secondary-color)' }}
        >
          {data.length} rows
        </div>
      </div>
    </div>
  );
}

export default DataTableModal;
