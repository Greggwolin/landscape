// v2.1 · 2025-11-15 · CoreUI Design System Alignment
// Renders all field types with CoreUI components

'use client';

import React, { useState, useEffect } from 'react';
import {
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CFormCheck,
  CFormRange,
  CBadge,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react';
import { LandscapeButton } from '@/components/ui/landscape';
import { FieldConfig, BudgetItem } from '@/types/budget';
import { shouldShowField } from '../config/fieldGroups';
import { formatMoney } from '@/utils/formatters/number';

interface FieldRendererProps {
  field: FieldConfig;
  value: any;
  item: BudgetItem;
  onChange: (fieldName: keyof BudgetItem, newValue: any) => void;
}

export function FieldRenderer({ field, value, item, onChange }: FieldRendererProps) {
  // Check dependencies
  if (!shouldShowField(field, item)) {
    return null;
  }

  // Check readonly
  if (field.readonly || field.computed) {
    return <ReadOnlyField field={field} value={value} />;
  }

  // Render by type
  switch (field.type) {
    case 'text':
      return (
        <TextInput
          field={field}
          value={value}
          onChange={(val) => onChange(field.name, val)}
        />
      );

    case 'number':
      return (
        <NumberInput
          field={field}
          value={value}
          onChange={(val) => onChange(field.name, val)}
        />
      );

    case 'currency':
      return (
        <CurrencyInput
          field={field}
          value={value}
          onChange={(val) => onChange(field.name, val)}
        />
      );

    case 'percentage':
      return (
        <PercentageInput
          field={field}
          value={value}
          onChange={(val) => onChange(field.name, val)}
        />
      );

    case 'dropdown':
      return (
        <DropdownInput
          field={field}
          value={value}
          onChange={(val) => onChange(field.name, val)}
        />
      );

    case 'date':
      return (
        <DateInput
          field={field}
          value={value}
          onChange={(val) => onChange(field.name, val)}
        />
      );

    case 'checkbox':
      return (
        <CheckboxInput
          field={field}
          value={value}
          onChange={(val) => onChange(field.name, val)}
        />
      );

    case 'textarea':
      return (
        <TextareaInput
          field={field}
          value={value}
          onChange={(val) => onChange(field.name, val)}
        />
      );

    case 'slider':
      return (
        <SliderInput
          field={field}
          value={value}
          onChange={(val) => onChange(field.name, val)}
        />
      );

    case 'link':
      return (
        <LinkField
          field={field}
          value={value}
          onClick={() => console.log('Link clicked:', field.name)}
        />
      );

    case 'button':
      return (
        <ButtonField
          field={field}
          onClick={() => console.log('Button clicked:', field.name)}
        />
      );

    case 'user-lookup':
      return <UserLookupField value={value} />;

    case 'datetime':
      return <DateTimeField value={value} />;

    default:
      return <span className="text-muted">{value || '-'}</span>;
  }
}

// ============================================================================
// READ-ONLY FIELD
// ============================================================================

function ReadOnlyField({ field, value }: { field: FieldConfig; value: any }) {
  switch (field.type) {
    case 'currency':
      return (
        <span className="text-muted fw-semibold" style={{ fontSize: '0.875rem' }}>
          {formatMoney(value)}
        </span>
      );
    case 'percentage':
      return (
        <span className="text-muted" style={{ fontSize: '0.875rem' }}>
          {value ? `${value}%` : '-'}
        </span>
      );
    case 'date':
      return (
        <span className="text-muted" style={{ fontSize: '0.875rem' }}>
          {value ? new Date(value).toLocaleDateString() : '-'}
        </span>
      );
    case 'datetime':
      return (
        <span className="text-muted" style={{ fontSize: '0.875rem' }}>
          {value ? new Date(value).toLocaleString() : '-'}
        </span>
      );
    case 'checkbox':
      return (
        <CFormCheck
          checked={Boolean(value)}
          disabled
          readOnly
        />
      );
    default:
      return (
        <span className="text-muted" style={{ fontSize: '0.875rem' }}>
          {value || '-'}
        </span>
      );
  }
}

// ============================================================================
// INPUT COMPONENTS
// ============================================================================

function TextInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <CFormInput
      type="text"
      size="sm"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={!field.editable}
      placeholder={field.helpText}
      title={field.helpText}
      style={{ width: field.width || 120 }}
    />
  );
}

function NumberInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: number;
  onChange: (value: number | null) => void;
}) {
  const [localValue, setLocalValue] = useState(value?.toString() || '');

  useEffect(() => {
    setLocalValue(value?.toString() || '');
  }, [value]);

  const handleBlur = () => {
    const numValue = localValue === '' ? null : parseFloat(localValue);
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  return (
    <CFormInput
      type="number"
      size="sm"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={!field.editable}
      min={field.validation?.min}
      max={field.validation?.max}
      step="1"
      title={field.helpText}
      style={{ width: field.width || 100 }}
    />
  );
}

function CurrencyInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: number;
  onChange: (value: number | null) => void;
}) {
  const [localValue, setLocalValue] = useState(value?.toString() || '');

  useEffect(() => {
    setLocalValue(value?.toString() || '');
  }, [value]);

  const handleBlur = () => {
    const numValue = localValue === '' ? null : parseFloat(localValue);
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  return (
    <CInputGroup size="sm" style={{ width: field.width || 140 }}>
      <CInputGroupText>$</CInputGroupText>
      <CFormInput
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        disabled={!field.editable}
        step="0.01"
        title={field.helpText}
      />
    </CInputGroup>
  );
}

function PercentageInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: number;
  onChange: (value: number | null) => void;
}) {
  const [localValue, setLocalValue] = useState(value?.toString() || '');

  useEffect(() => {
    setLocalValue(value?.toString() || '');
  }, [value]);

  const handleBlur = () => {
    const numValue = localValue === '' ? null : parseFloat(localValue);
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  return (
    <CInputGroup size="sm" style={{ width: field.width || 100 }}>
      <CFormInput
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        disabled={!field.editable}
        min={field.validation?.min || 0}
        max={field.validation?.max || 100}
        step="0.1"
        title={field.helpText}
      />
      <CInputGroupText>%</CInputGroupText>
    </CInputGroup>
  );
}

function DropdownInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <CFormSelect
      size="sm"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={!field.editable}
      title={field.helpText}
      style={{ width: field.width || 150 }}
    >
      <option value="">-- Select --</option>
      {field.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </CFormSelect>
  );
}

function DateInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string | null) => void;
}) {
  const dateValue = value ? value.split('T')[0] : '';

  return (
    <CFormInput
      type="date"
      size="sm"
      value={dateValue}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={!field.editable}
      title={field.helpText}
      style={{ width: field.width || 140 }}
    />
  );
}

function CheckboxInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <CFormCheck
      checked={Boolean(value)}
      onChange={(e) => onChange(e.target.checked)}
      disabled={!field.editable}
      title={field.helpText}
    />
  );
}

function TextareaInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <CFormTextarea
      rows={2}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={!field.editable}
      placeholder={field.helpText}
      title={field.helpText}
      style={{ width: field.width || 300 }}
    />
  );
}

function SliderInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: number;
  onChange: (value: number) => void;
}) {
  const numValue = value || 50;

  return (
    <div className="d-flex align-items-center gap-2" style={{ width: field.width || 200 }}>
      <CFormRange
        value={numValue}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={!field.editable}
        min={field.validation?.min || 0}
        max={field.validation?.max || 100}
        title={field.helpText}
        style={{ flex: 1 }}
      />
      <CBadge color="secondary" style={{ minWidth: '40px', textAlign: 'center' }}>
        {numValue}
      </CBadge>
    </div>
  );
}

function LinkField({
  field,
  value,
  onClick,
}: {
  field: FieldConfig;
  value: any;
  onClick: () => void;
}) {
  return (
    <LandscapeButton
      color="primary"
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={field.helpText}
      className="p-0 text-decoration-underline"
    >
      {value || 0}
    </LandscapeButton>
  );
}

function ButtonField({
  field,
  onClick,
}: {
  field: FieldConfig;
  onClick: () => void;
}) {
  return (
    <LandscapeButton
      color="primary"
      variant="outline"
      size="sm"
      onClick={onClick}
      title={field.helpText}
    >
      {field.label}
    </LandscapeButton>
  );
}

function UserLookupField({ value }: { value: number | null }) {
  // TODO: Fetch user name from API or context
  if (!value) return <span className="text-muted">-</span>;
  return (
    <CBadge color="info">
      User #{value}
    </CBadge>
  );
}

function DateTimeField({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted">-</span>;
  return (
    <span className="text-muted" style={{ fontSize: '0.875rem' }}>
      {new Date(value).toLocaleString()}
    </span>
  );
}
