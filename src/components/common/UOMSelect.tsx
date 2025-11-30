'use client';

import { CFormSelect } from '@coreui/react';
import { useMeasureOptions } from '@/hooks/useMeasures';
import type { UOMContext } from '@/lib/utils/uomFormat';

interface UOMSelectProps {
  context: UOMContext;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function UOMSelect({
  context,
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Select UOM',
}: UOMSelectProps) {
  const { options = [], isLoading, isFetching, isError } = useMeasureOptions(true, context);
  const loading = isLoading || isFetching;
  const placeholderText = loading ? 'Loading...' : isError ? 'Unable to load UOMs' : placeholder;
  const displayValue = (code: string) => {
    const prefix = code ? `${code}` : '';
    return prefix;
  };

  return (
    <CFormSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      className={className}
    >
      <option value="">{placeholderText}</option>
      {options.map((uom) => (
        <option
          key={uom.value}
          value={uom.value}
          title={uom.label}
          aria-label={uom.label}
        >
          {displayValue(uom.value)}
        </option>
      ))}
    </CFormSelect>
  );
}
