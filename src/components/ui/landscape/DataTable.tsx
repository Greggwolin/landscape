/**
 * DataTable - Enhanced CoreUI Table Wrapper
 *
 * Thin wrapper around CoreUI CTable with common Landscape features:
 * - Loading states
 * - Empty states
 * - Responsive design
 * - ARGUS-style information density
 *
 * @version 1.0.0
 * @phase Phase 1 - CoreUI Migration
 */

import React from 'react';
import {
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CSpinner,
} from '@coreui/react';
import type { CTableProps } from '@coreui/react';

export interface DataTableColumn<T> {
  /**
   * Column header label
   */
  label: string;

  /**
   * Key to access data (supports dot notation for nested objects)
   */
  key: keyof T | string;

  /**
   * Custom render function for cell content
   */
  render?: (row: T, value: any) => React.ReactNode;

  /**
   * Column width (CSS value)
   */
  width?: string;

  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right';

  /**
   * Enable sorting for this column
   */
  sortable?: boolean;
}

export interface DataTableProps<T> extends Omit<CTableProps, 'children'> {
  /**
   * Array of data to display
   */
  data: T[];

  /**
   * Column definitions
   */
  columns: DataTableColumn<T>[];

  /**
   * Show loading spinner
   */
  loading?: boolean;

  /**
   * Empty state message
   */
  emptyMessage?: string;

  /**
   * Row click handler
   */
  onRowClick?: (row: T, index: number) => void;

  /**
   * Row key accessor (defaults to index)
   */
  rowKey?: keyof T | ((row: T, index: number) => string | number);
}

/**
 * Helper function to get nested property value
 */
function getNestedValue<T>(obj: T, path: string): any {
  return path.split('.').reduce((acc: any, part) => acc?.[part], obj);
}

/**
 * DataTable Component
 *
 * @example
 * // Basic usage
 * <DataTable
 *   data={projects}
 *   columns={[
 *     { label: 'Name', key: 'name' },
 *     { label: 'Status', key: 'status' },
 *   ]}
 * />
 *
 * @example
 * // With custom rendering
 * <DataTable
 *   data={projects}
 *   columns={[
 *     { label: 'Name', key: 'name' },
 *     {
 *       label: 'Status',
 *       key: 'status',
 *       render: (row) => <StatusChip status={row.status} />
 *     },
 *   ]}
 * />
 *
 * @example
 * // With loading state
 * <DataTable
 *   data={projects}
 *   columns={columns}
 *   loading={isLoading}
 * />
 */
export function DataTable<T = any>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowKey,
  striped = true,
  hover = true,
  responsive = true,
  ...props
}: DataTableProps<T>) {
  /**
   * Get unique key for a row
   */
  const getRowKey = (row: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(row, index);
    }
    if (rowKey) {
      return row[rowKey] as string | number;
    }
    return index;
  };

  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <CSpinner color="primary" />
      </div>
    );
  }

  /**
   * Empty state
   */
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-5 text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <CTable
      striped={striped}
      hover={hover}
      responsive={responsive}
      {...props}
    >
      <CTableHead>
        <CTableRow>
          {columns.map((column, index) => (
            <CTableHeaderCell
              key={`header-${index}`}
              style={{ width: column.width }}
              className={column.align ? `text-${column.align}` : undefined}
            >
              {column.label}
            </CTableHeaderCell>
          ))}
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {data.map((row, rowIndex) => (
          <CTableRow
            key={getRowKey(row, rowIndex)}
            onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {columns.map((column, colIndex) => {
              const value = getNestedValue(row, column.key as string);
              const cellContent = column.render
                ? column.render(row, value)
                : value;

              return (
                <CTableDataCell
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={column.align ? `text-${column.align}` : undefined}
                >
                  {cellContent}
                </CTableDataCell>
              );
            })}
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  );
}

DataTable.displayName = 'DataTable';
