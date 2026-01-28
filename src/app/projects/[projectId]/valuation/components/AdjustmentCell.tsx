/**
 * AdjustmentCell Component
 *
 * Renders the final input column for a single adjustment row.
 */

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
  const [finalValue, setFinalValue] = useState<string>(
    currentAdjustment?.user_adjustment_pct
      ? (currentAdjustment.user_adjustment_pct * 100).toFixed(0)
      : ''
  );

  useEffect(() => {
    if (currentAdjustment?.user_adjustment_pct != null) {
      setFinalValue((currentAdjustment.user_adjustment_pct * 100).toFixed(0));
    } else {
      setFinalValue('');
    }
  }, [currentAdjustment?.user_adjustment_pct]);

  const handleFinalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFinalValue(newValue);

    if (newValue === '' || newValue === '-') {
      onFinalChange(comparableId, adjustmentType, null);
    } else {
      const numValue = parseFloat(newValue) / 100;
      if (!isNaN(numValue)) {
        onFinalChange(comparableId, adjustmentType, numValue);
      }
    }
  };

  return (
    <td
      className="py-1 px-2 text-center border-l"
      style={{
        borderColor: 'var(--cui-border-color)',
        whiteSpace: 'nowrap'
      }}
    >
      <input
        type="text"
        value={finalValue}
        onChange={handleFinalInputChange}
        placeholder="-"
        className="w-full px-1 py-0.5 text-xs text-center rounded border"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)',
          color: 'var(--cui-body-color)',
          fontSize: '11px'
        }}
      />
    </td>
  );
}
