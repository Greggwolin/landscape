'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
} from '@tanstack/react-table';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CSpinner,
  CButton,
  CTooltip,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilHistory,
  cilChevronRight,
  cilChevronBottom,
  cilFile,
  cilCloudUpload,
} from '@coreui/icons';
import { format, parseISO } from 'date-fns';
import {
  useExtractionHistory,
  type ExtractionRecord,
  type ExtractionCategory,
  CATEGORY_CONFIG,
  getAllCategories,
} from '@/hooks/useExtractionHistory';
import { ExtractionFilterPills } from './ExtractionFilterPills';

interface ExtractionHistoryReportProps {
  projectId: number;
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  applied: 'info',
  conflict: 'secondary',
};

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
}

// Truncate text with ellipsis
function truncate(text: string | null, maxLen = 40): string {
  if (!text) return '—';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

// Format value based on type detection
function formatValue(value: unknown, fieldKey: string, fieldLabel?: string): string {
  if (value === null || value === undefined) return '—';

  // If it's already a string that's not a number, return as-is
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Check if it's a numeric string
    const numericValue = parseFloat(trimmed.replace(/[$,%]/g, ''));
    if (isNaN(numericValue)) {
      return trimmed || '—';
    }
    // Use the parsed numeric value for formatting
    value = numericValue;
    // Check if original string had % or $ to preserve intent
    if (trimmed.includes('%')) {
      return `${numericValue.toFixed(2)}%`;
    }
    if (trimmed.includes('$')) {
      return `$${numericValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
  }

  if (typeof value !== 'number') {
    return String(value);
  }

  // Detect field type by key name patterns
  const key = fieldKey.toLowerCase();
  const label = (fieldLabel || '').toLowerCase();

  // FIRST: Check if field label explicitly contains "%" - always a percentage
  if (label.includes('%') || label.includes('percent')) {
    // If value is already in decimal form (0.05 = 5%), multiply by 100
    const displayValue = value < 1 && value > -1 ? value * 100 : value;
    return `${displayValue.toFixed(2)}%`;
  }

  // Percentage fields (rate, percent, ratio, cap_rate, vacancy, occupancy, ltv, dscr)
  const percentagePatterns = [
    '_pct', '_rate', 'percent', 'ratio', 'cap_rate', 'vacancy', 'occupancy',
    'ltv', 'loan_to_value', 'dscr', 'yield', 'irr', 'coc', 'roi',
    'growth', 'escalation', 'increase', 'appreciation'
  ];
  if (percentagePatterns.some(p => key.includes(p))) {
    // If value is already in decimal form (0.05 = 5%), multiply by 100
    const displayValue = value < 1 && value > -1 ? value * 100 : value;
    return `${displayValue.toFixed(2)}%`;
  }

  // Currency fields - check both key and label for currency indicators
  // Note: 'fee' alone is currency, but 'fee_pct' or 'fee %' handled above as percentage
  const currencyKeyPatterns = [
    'price', 'cost', 'amount', 'rent', 'income', 'expense', 'value',
    'noi', 'revenue', 'budget', 'actual', 'fee', 'tax', 'insurance',
    'payment', 'loan', 'debt', 'equity', 'proceeds', 'gpr', 'egi',
    'purchase', 'sale', 'asking', 'turnover', 'maintenance', 'repair',
    'contract', 'service', 'utility', 'payroll', 'marketing', 'admin',
    'professional', 'landscaping', 'trash', 'pest', 'security', 'elevator',
    'hvac', 'reserve', 'opex', 'capex'
  ];

  // Also check if the label suggests currency (contains $ or common expense terms)
  const currencyLabelPatterns = [
    '$', 'cost', 'expense', 'fee', 'income', 'rent', 'price', 'payment',
    'services', 'maintenance', 'repairs', 'utilities', 'turnover', 'ready'
  ];

  const isCurrencyByKey = currencyKeyPatterns.some(p => key.includes(p));
  const isCurrencyByLabel = currencyLabelPatterns.some(p => label.includes(p));

  if (isCurrencyByKey || isCurrencyByLabel) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  // Default: format as general number with thousands separator
  // For integers, no decimals; for decimals, show up to 2
  if (Number.isInteger(value)) {
    return value.toLocaleString('en-US');
  }
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Confidence badge component
function ConfidenceBadge({
  percent,
  label,
}: {
  percent: number | null;
  label: string | null;
}) {
  if (percent === null) return <span className="text-muted">—</span>;

  let color = 'danger';
  if (percent >= 90) color = 'success';
  else if (percent >= 70) color = 'warning';
  else if (percent >= 50) color = 'secondary';

  return (
    <CTooltip content={`${label} confidence - ${percent}%`}>
      <CBadge color={color}>{percent}%</CBadge>
    </CTooltip>
  );
}

// Category pill component
function CategoryPill({ category }: { category: ExtractionCategory }) {
  const config = CATEGORY_CONFIG[category];
  if (!config) return null;

  return (
    <span
      className="category-pill"
      style={{
        backgroundColor: config.color,
        color: '#fff',
        padding: '0.125rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 500,
      }}
    >
      {config.label}
    </span>
  );
}

export function ExtractionHistoryReport({ projectId }: ExtractionHistoryReportProps) {
  // Filter state
  const [selectedCategories, setSelectedCategories] = useState<ExtractionCategory[]>(
    getAllCategories().filter((c) => c !== 'other')
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true },
  ]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Fetch data
  const { extractions, categoryCounts, total, isLoading, error } = useExtractionHistory(
    projectId,
    {
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      sort: 'created_at',
      order: 'desc',
    }
  );

  // Filter handlers
  const handleToggleCategory = useCallback((category: ExtractionCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedCategories(getAllCategories().filter((c) => c !== 'other'));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  // Define table columns
  const columns = useMemo<ColumnDef<ExtractionRecord>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          // Check if this field has history (multiple extractions)
          const hasHistory = false; // TODO: implement history detection
          if (!hasHistory) return null;

          return (
            <button
              type="button"
              onClick={() => row.toggleExpanded()}
              className="btn btn-link btn-sm p-0"
            >
              <CIcon icon={row.getIsExpanded() ? cilChevronBottom : cilChevronRight} />
            </button>
          );
        },
        size: 40,
      },
      {
        accessorKey: 'created_at',
        header: 'Date/Time',
        cell: ({ getValue }) => (
          <span className="text-nowrap small">{formatDate(getValue() as string)}</span>
        ),
        size: 140,
      },
      {
        accessorKey: 'field_label',
        header: 'Field Name',
        cell: ({ row }) => (
          <div>
            <div className="fw-medium">{row.original.field_label}</div>
            <div className="text-muted small">{row.original.scope_label || row.original.scope}</div>
          </div>
        ),
        size: 180,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => <CategoryPill category={getValue() as ExtractionCategory} />,
        size: 100,
      },
      {
        accessorKey: 'formatted_value',
        header: 'Value',
        cell: ({ row }) => {
          const formattedVal = formatValue(
            row.original.extracted_value,
            row.original.field_key,
            row.original.field_label
          );
          return (
            <CTooltip content={String(row.original.extracted_value || '')}>
              <span>{truncate(formattedVal)}</span>
            </CTooltip>
          );
        },
        size: 200,
      },
      {
        accessorKey: 'doc_name',
        header: 'Source',
        cell: ({ row }) => {
          const docName = row.original.doc_name;
          const docId = row.original.doc_id;
          if (!docName) return <span className="text-muted">—</span>;

          return (
            <CTooltip content={docName}>
              <a
                href={`/projects/${projectId}?tab=documents&doc=${docId}`}
                className="text-decoration-none d-flex align-items-center gap-1"
              >
                <CIcon icon={cilFile} size="sm" />
                <span className="text-truncate" style={{ maxWidth: '180px' }}>
                  {truncate(docName, 30)}
                </span>
              </a>
            </CTooltip>
          );
        },
        size: 220,
      },
      {
        accessorKey: 'confidence_percent',
        header: 'Confidence',
        cell: ({ row }) => (
          <ConfidenceBadge
            percent={row.original.confidence_percent}
            label={row.original.confidence_label}
          />
        ),
        size: 100,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string;
          return (
            <CBadge color={STATUS_COLORS[status] || 'secondary'}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </CBadge>
          );
        },
        size: 100,
      },
    ],
    [projectId]
  );

  // Create table instance
  const table = useReactTable({
    data: extractions,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // Loading state
  if (isLoading) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-3 text-body-secondary">Loading extraction history...</p>
        </CCardBody>
      </CCard>
    );
  }

  // Error state
  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger">Failed to load extraction history</p>
          <p className="text-body-secondary small">{error.message}</p>
        </CCardBody>
      </CCard>
    );
  }

  // Empty state
  if (total === 0 && Object.values(categoryCounts).every((c) => c === 0)) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CIcon icon={cilCloudUpload} size="3xl" className="text-muted mb-3" />
          <h5>No Extraction History</h5>
          <p className="text-body-secondary">
            No AI extractions have been performed for this project yet.
            <br />
            Upload documents and use Landscaper to extract data.
          </p>
          <CButton
            color="primary"
            variant="outline"
            href={`/projects/${projectId}?tab=documents`}
          >
            Upload Documents
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <div className="extraction-history-report">
      {/* Filter Pills */}
      <CCard className="mb-3">
        <CCardBody className="py-2">
          <ExtractionFilterPills
            selectedCategories={selectedCategories}
            categoryCounts={categoryCounts}
            onToggleCategory={handleToggleCategory}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        </CCardBody>
      </CCard>

      {/* Data Table */}
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <CIcon icon={cilHistory} />
            <span className="fw-medium">Extraction History</span>
          </div>
          <CBadge color="secondary">{extractions.length} records</CBadge>
        </CCardHeader>
        <CCardBody className="p-0">
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="table table-hover table-striped mb-0">
              <thead className="sticky-top bg-body">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        onClick={header.column.getToggleSortingHandler()}
                        className={header.column.getCanSort() ? 'cursor-pointer' : ''}
                      >
                        <div className="d-flex align-items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getIsSorted() === 'asc' && ' ▲'}
                          {header.column.getIsSorted() === 'desc' && ' ▼'}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={{ width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CCardBody>
      </CCard>

      <style jsx>{`
        .extraction-history-report .cursor-pointer {
          cursor: pointer;
        }

        .extraction-history-report th {
          user-select: none;
        }

        .extraction-history-report .table th,
        .extraction-history-report .table td {
          vertical-align: middle;
          padding: 0.5rem;
        }
      `}</style>
    </div>
  );
}
