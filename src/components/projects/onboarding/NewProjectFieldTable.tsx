'use client';

import React from 'react';
import { FileText, MessageCircle, Edit3 } from 'lucide-react';
import type { FieldValue } from './types';

interface NewProjectFieldTableProps {
  fields: Map<string, FieldValue>;
  isDark?: boolean;
  onFieldEdit?: (fieldKey: string, value: any) => void;
}

// Field labels map - in production this would come from the registry
const FIELD_LABELS: Record<string, string> = {
  property_name: 'Property Name',
  street_address: 'Street Address',
  city: 'City',
  state: 'State',
  zip_code: 'ZIP Code',
  property_type: 'Property Type',
  property_class: 'Property Class',
  total_units: 'Total Units',
  year_built: 'Year Built',
  year_renovated: 'Year Renovated',
  stories: 'Stories',
  rentable_sf: 'Rentable SF',
  lot_size_acres: 'Lot Size (Acres)',
  parking_spaces_total: 'Parking Spaces',
  parking_ratio: 'Parking Ratio',
  asking_price: 'Asking Price',
  acquisition_price: 'Acquisition Price',
  cap_rate_current: 'Cap Rate',
  current_noi: 'Current NOI',
  current_vacancy_rate: 'Vacancy Rate',
  submarket: 'Submarket',
};

const SOURCE_ICONS = {
  document: FileText,
  chat: MessageCircle,
  user_edit: Edit3,
};

const SOURCE_LABELS = {
  document: 'From document',
  chat: 'From conversation',
  user_edit: 'User entered',
};

function formatValue(value: any, fieldKey: string): string {
  if (value === null || value === undefined) return '—';

  // Currency fields
  if (
    fieldKey.includes('price') ||
    fieldKey.includes('noi') ||
    fieldKey === 'rentable_sf'
  ) {
    const num = Number(value);
    if (!isNaN(num)) {
      if (fieldKey === 'rentable_sf') {
        return num.toLocaleString() + ' SF';
      }
      return '$' + num.toLocaleString();
    }
  }

  // Percentage fields
  if (fieldKey.includes('rate') || fieldKey.includes('pct')) {
    const num = Number(value);
    if (!isNaN(num)) {
      return num.toFixed(2) + '%';
    }
  }

  // Number fields
  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  return String(value);
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-green-500';
  if (confidence >= 0.7) return 'text-amber-500';
  return 'text-red-500';
}

export default function NewProjectFieldTable({
  fields,
  isDark = false,
  onFieldEdit,
}: NewProjectFieldTableProps) {
  const fieldEntries = Array.from(fields.entries());

  if (fieldEntries.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-center p-6 ${
        isDark ? 'text-slate-400' : 'text-slate-500'
      }`}>
        <div className="text-4xl mb-3 opacity-50">📋</div>
        <p className="text-sm font-medium mb-1">No fields yet</p>
        <p className="text-xs">
          Fields will appear here as you chat or upload documents
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full">
        <thead className={`sticky top-0 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <tr className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <th className="text-left py-2 px-3">Field</th>
            <th className="text-left py-2 px-3">Value</th>
            <th className="text-center py-2 px-3 w-12">Src</th>
          </tr>
        </thead>
        <tbody>
          {fieldEntries.map(([fieldKey, field]) => {
            const SourceIcon = SOURCE_ICONS[field.source];
            const label = field.label || FIELD_LABELS[fieldKey] || fieldKey;

            return (
              <tr
                key={fieldKey}
                className={`border-t ${
                  isDark
                    ? 'border-slate-800 hover:bg-slate-800/50'
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <td className={`py-2 px-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {label}
                </td>
                <td className={`py-2 px-3 text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <div className="flex items-center gap-2">
                    <span>{formatValue(field.value, fieldKey)}</span>
                    {field.confidence < 1 && (
                      <span
                        className={`text-xs ${getConfidenceColor(field.confidence)}`}
                        title={`${Math.round(field.confidence * 100)}% confidence`}
                      >
                        {Math.round(field.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-center">
                  <SourceIcon
                    className={`h-3.5 w-3.5 mx-auto ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}
                    title={SOURCE_LABELS[field.source]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
