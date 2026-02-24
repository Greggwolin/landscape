'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SalesCompAdjustment } from '@/types/valuation';

interface AdjustmentCellProps {
  comparableId: number;
  adjustmentType: string;
  currentAdjustment: SalesCompAdjustment | null;
  onFinalChange: (compId: number, adjType: string, value: number | null) => void;
}

export function AdjustmentCell({
  comparableId,
  adjustmentType,
  currentAdjustment,
  onFinalChange
}: AdjustmentCellProps) {
  const formatDisplayValue = (value: number | null | undefined) => {
    if (value == null) return '';
    return `${(value * 100).toFixed(0)}%`;
  };

  const stripNonNumeric = (value: string) => value.replace(/[^0-9.\-]/g, '');

  const [finalValue, setFinalValue] = useState<string>(
    formatDisplayValue(currentAdjustment?.user_adjustment_pct ?? currentAdjustment?.adjustment_pct ?? null)
  );

  useEffect(() => {
    const displayValue = currentAdjustment?.user_adjustment_pct ?? currentAdjustment?.adjustment_pct ?? null;
    if (displayValue != null) {
      setFinalValue(formatDisplayValue(displayValue));
    } else {
      setFinalValue('');
    }
  }, [currentAdjustment?.user_adjustment_pct, currentAdjustment?.adjustment_pct]);

  const commitFinalValue = useCallback((rawValue: string) => {
    const cleaned = stripNonNumeric(rawValue);
    if (cleaned === '' || cleaned === '-') {
      setFinalValue('');
      onFinalChange(comparableId, adjustmentType, null);
      return;
    }

    const numValue = parseFloat(cleaned);
    if (!Number.isNaN(numValue)) {
      setFinalValue(`${numValue}%`);
      onFinalChange(comparableId, adjustmentType, numValue / 100);
    }
  }, [adjustmentType, comparableId, onFinalChange]);

  const handleFinalInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = stripNonNumeric(event.target.value);
    setFinalValue(cleaned);
  };

  const handleBlur = () => {
    commitFinalValue(finalValue);
  };

  return (
    <td
      style={{
        padding: '0.25rem 1rem',
        textAlign: 'center',
        borderLeft: '1px solid var(--cui-border-color)',
        whiteSpace: 'nowrap',
      }}
    >
      <input
        type="text"
        value={finalValue}
        onChange={handleFinalInputChange}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitFinalValue((event.target as HTMLInputElement).value);
            (event.target as HTMLInputElement).blur();
          }
        }}
        placeholder="-"
        className="comparables-grid-input"
        style={{
          color: 'var(--cui-body-color)',
          outline: 'none',
          boxShadow: 'none',
          border: 'none',
          borderWidth: 0,
          borderRadius: 0,
          backgroundColor: 'transparent',
          fontSize: '13px',
          lineHeight: '1.2',
          minHeight: '20px',
        }}
      />
    </td>
  );
}
