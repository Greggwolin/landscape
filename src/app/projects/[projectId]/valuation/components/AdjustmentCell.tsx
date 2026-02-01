'use client';

import { useEffect, useState } from 'react';
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
    formatDisplayValue(currentAdjustment?.user_adjustment_pct ?? null)
  );

  useEffect(() => {
    if (currentAdjustment?.user_adjustment_pct != null) {
      setFinalValue(formatDisplayValue(currentAdjustment.user_adjustment_pct));
    } else {
      setFinalValue('');
    }
  }, [currentAdjustment?.user_adjustment_pct]);

  const handleFinalInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = stripNonNumeric(event.target.value);
    setFinalValue(cleaned);

    if (cleaned === '' || cleaned === '-') {
      onFinalChange(comparableId, adjustmentType, null);
      return;
    }

    const numValue = parseFloat(cleaned);
    if (!isNaN(numValue)) {
      onFinalChange(comparableId, adjustmentType, numValue / 100);
    }
  };

  const handleBlur = () => {
    const cleaned = stripNonNumeric(finalValue);
    if (cleaned === '' || cleaned === '-') {
      setFinalValue('');
      onFinalChange(comparableId, adjustmentType, null);
      return;
    }
    const numValue = parseFloat(cleaned);
    if (!isNaN(numValue)) {
      setFinalValue(`${numValue}%`);
    }
  };

  return (
    <td
      className="py-1 px-4 text-center border-l"
      style={{
        borderColor: 'var(--cui-border-color)',
        whiteSpace: 'nowrap'
      }}
    >
      <input
        type="text"
        value={finalValue}
        onChange={handleFinalInputChange}
        onBlur={handleBlur}
        placeholder="-"
        className="w-full px-1 py-0 text-center border-0 rounded-none bg-transparent focus:border-0 focus:outline-none"
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
          minHeight: '20px'
        }}
      />
    </td>
  );
}
