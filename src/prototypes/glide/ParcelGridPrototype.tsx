'use client';

import React, { useState, useCallback, useMemo } from 'react';
import DataEditor, {
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
  EditableGridCell,
  TextCell,
  NumberCell,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import useSWR from 'swr';
import { fetchJson } from '@/lib/fetchJson';

interface Parcel {
  parcel_id: number;
  area_no: number;
  phase_name: string;
  parcel_name: string;
  usecode: string;
  type_code?: string;
  product: string;
  acres: number;
  units: number;
  efficiency: number;
  family_name?: string;
  frontfeet?: number;
}

const ParcelGridPrototype: React.FC = () => {
  const [projectId] = useState(7); // Default project for testing
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const fetcher = (url: string) => fetchJson(url);
  const { data: parcelsData, error, mutate } = useSWR<Parcel[]>(
    `/api/parcels?project_id=${projectId}`,
    fetcher
  );

  const parcels = useMemo(() => {
    return Array.isArray(parcelsData) ? parcelsData : [];
  }, [parcelsData]);

  // Define columns with more fields than current table
  const columns: GridColumn[] = useMemo(() => [
    { title: 'Area', width: 80, id: 'area_no' },
    { title: 'Phase', width: 100, id: 'phase_name' },
    { title: 'Parcel ID', width: 120, id: 'parcel_name' },
    { title: 'Family', width: 150, id: 'family_name' },
    { title: 'Type', width: 100, id: 'type_code' },
    { title: 'Use Code', width: 100, id: 'usecode' },
    { title: 'Product', width: 120, id: 'product' },
    { title: 'Acres', width: 100, id: 'acres' },
    { title: 'Units', width: 100, id: 'units' },
    { title: 'Efficiency', width: 100, id: 'efficiency' },
    { title: 'Frontage (ft)', width: 120, id: 'frontfeet' },
  ], []);

  // Define theme configurations - MUST be declared before any conditional returns
  const gridTheme = useMemo(() => {
    if (theme === 'light') {
      return {
        accentColor: '#2563eb',
        accentLight: 'rgba(37, 99, 235, 0.1)',
        textDark: '#111827',
        textMedium: '#4b5563',
        textLight: '#6b7280',
        textBubble: '#ffffff',
        bgIconHeader: '#e5e7eb',
        fgIconHeader: '#374151',
        textHeader: '#111827',
        textGroupHeader: '#6b7280',
        bgCell: '#ffffff',
        bgCellMedium: '#f9fafb',
        bgHeader: '#f3f4f6',
        bgHeaderHasFocus: '#e5e7eb',
        bgHeaderHovered: '#e5e7eb',
        bgBubble: '#ffffff',
        bgBubbleSelected: '#f3f4f6',
        bgSearchResult: 'rgba(37, 99, 235, 0.15)',
        borderColor: 'rgba(229, 231, 235, 0.8)',
        drilldownBorder: 'rgba(37, 99, 235, 0.4)',
        linkColor: '#2563eb',
        headerFontStyle: '600 13px',
        baseFontStyle: '13px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      };
    } else {
      return {
        accentColor: '#3b82f6',
        accentLight: 'rgba(59, 130, 246, 0.1)',
        textDark: '#f3f4f6',
        textMedium: '#d1d5db',
        textLight: '#9ca3af',
        textBubble: '#1f2937',
        bgIconHeader: '#374151',
        fgIconHeader: '#d1d5db',
        textHeader: '#e5e7eb',
        textGroupHeader: '#9ca3af',
        bgCell: '#1f2937',
        bgCellMedium: '#111827',
        bgHeader: '#111827',
        bgHeaderHasFocus: '#1f2937',
        bgHeaderHovered: '#1f2937',
        bgBubble: '#374151',
        bgBubbleSelected: '#1f2937',
        bgSearchResult: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(75, 85, 99, 0.3)',
        drilldownBorder: 'rgba(59, 130, 246, 0.4)',
        linkColor: '#60a5fa',
        headerFontStyle: '600 13px',
        baseFontStyle: '13px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      };
    }
  }, [theme]);

  // Get cell content
  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [col, row] = cell;
      const parcel = parcels[row];
      if (!parcel) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          allowOverlay: false,
        };
      }

      const column = columns[col];
      const columnId = column.id;

      switch (columnId) {
        case 'area_no':
          return {
            kind: GridCellKind.Number,
            data: parcel.area_no,
            displayData: String(parcel.area_no),
            allowOverlay: false,
          } as NumberCell;

        case 'phase_name':
          return {
            kind: GridCellKind.Text,
            data: parcel.phase_name || '',
            displayData: parcel.phase_name || '',
            allowOverlay: true,
          } as TextCell;

        case 'parcel_name':
          return {
            kind: GridCellKind.Text,
            data: parcel.parcel_name || '',
            displayData: parcel.parcel_name || '',
            allowOverlay: true,
          } as TextCell;

        case 'family_name':
          return {
            kind: GridCellKind.Text,
            data: parcel.family_name || 'Unclassified',
            displayData: parcel.family_name || 'Unclassified',
            allowOverlay: false,
          } as TextCell;

        case 'type_code':
          return {
            kind: GridCellKind.Text,
            data: parcel.type_code || '',
            displayData: parcel.type_code || '',
            allowOverlay: false,
          } as TextCell;

        case 'usecode':
          return {
            kind: GridCellKind.Text,
            data: parcel.usecode || '',
            displayData: parcel.usecode || '',
            allowOverlay: false,
          } as TextCell;

        case 'product':
          return {
            kind: GridCellKind.Text,
            data: parcel.product || '',
            displayData: parcel.product || '',
            allowOverlay: true,
          } as TextCell;

        case 'acres':
          return {
            kind: GridCellKind.Number,
            data: parcel.acres || 0,
            displayData: new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(parcel.acres || 0),
            allowOverlay: true,
          } as NumberCell;

        case 'units':
          return {
            kind: GridCellKind.Number,
            data: parcel.units || 0,
            displayData: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(parcel.units || 0),
            allowOverlay: true,
          } as NumberCell;

        case 'efficiency':
          return {
            kind: GridCellKind.Number,
            data: parcel.efficiency || 0,
            displayData: new Intl.NumberFormat('en-US', {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
              style: 'percent'
            }).format((parcel.efficiency || 0) / 100),
            allowOverlay: true,
          } as NumberCell;

        case 'frontfeet':
          return {
            kind: GridCellKind.Number,
            data: parcel.frontfeet || 0,
            displayData: parcel.frontfeet ? new Intl.NumberFormat('en-US').format(parcel.frontfeet) : '',
            allowOverlay: true,
          } as NumberCell;

        default:
          return {
            kind: GridCellKind.Text,
            data: '',
            displayData: '',
            allowOverlay: false,
          } as TextCell;
      }
    },
    [parcels, columns]
  );

  // Handle cell edits
  const onCellEdited = useCallback(
    async (cell: Item, newValue: EditableGridCell) => {
      const [col, row] = cell;
      const parcel = parcels[row];
      if (!parcel) return;

      const column = columns[col];
      const columnId = column.id;

      let updatedValue: unknown;

      if (newValue.kind === GridCellKind.Number) {
        updatedValue = newValue.data;
      } else if (newValue.kind === GridCellKind.Text) {
        updatedValue = newValue.data;
      }

      // Map column IDs to API field names
      const fieldMap: Record<string, string> = {
        acres: 'acres',
        units: 'units',
        product: 'product',
        frontfeet: 'frontfeet',
        efficiency: 'efficiency',
      };

      const apiField = fieldMap[columnId as string];
      if (!apiField) return; // Non-editable field

      try {
        const response = await fetch(`/api/parcels/${parcel.parcel_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [apiField]: updatedValue }),
        });

        if (response.ok) {
          // Refresh data
          await mutate();
        } else {
          console.error('Failed to update parcel:', await response.text());
        }
      } catch (error) {
        console.error('Error updating parcel:', error);
      }
    },
    [parcels, columns, mutate]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-red-400">Failed to load parcel data: {error.message}</div>
      </div>
    );
  }

  if (!parcelsData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-gray-400">Loading parcel data...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen p-6 ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className={`mb-4 rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Glide Data Grid - Parcel Table Prototype
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Testing high-performance canvas-based grid with {parcels.length} parcels across {columns.length} columns.
              Features: virtual scrolling, column resizing, inline editing, and smooth horizontal navigation.
            </p>
            <div className={`mt-3 flex gap-4 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              <div>Project ID: {projectId}</div>
              <div>Rows: {parcels.length}</div>
              <div>Columns: {columns.length}</div>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Light
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <DataEditor
          getCellContent={getCellContent}
          columns={columns}
          rows={parcels.length}
          onCellEdited={onCellEdited}
          theme={gridTheme}
          smoothScrollX={true}
          smoothScrollY={true}
          getCellsForSelection={true}
          rowMarkers="both"
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
};

export default ParcelGridPrototype;
