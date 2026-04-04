'use client';

import React from 'react';
import type { DotColor, ValueType } from '../appraisal.types';

interface ProformaRowProps {
  dot: DotColor;
  label: string;
  input?: string;
  inputHasValue?: boolean;
  value: string;
  valueType?: ValueType;
  detail?: string;
  isSubtotal?: boolean;
  isWaiting?: boolean;
  onDoubleClick?: () => void;
  onValueClick?: () => void;
}

export function ProformaRow({
  dot,
  label,
  input,
  inputHasValue = false,
  value,
  valueType = 'normal',
  detail,
  isSubtotal = false,
  isWaiting = false,
  onDoubleClick,
  onValueClick,
}: ProformaRowProps) {
  const rowClass = [
    'pf-row',
    isSubtotal && 'subtotal',
    isWaiting && 'waiting',
  ]
    .filter(Boolean)
    .join(' ');

  const dotClass = isSubtotal ? 'pf-dot hidden' : `pf-dot ${dot}`;

  const valClass = [
    'pf-val',
    valueType === 'negative' && 'neg',
    valueType === 'positive' && 'grn',
    valueType === 'waiting' && 'wait',
  ]
    .filter(Boolean)
    .join(' ');

  const inputClass = ['pf-input', inputHasValue && 'has'].filter(Boolean).join(' ');

  return (
    <>
      <div className={rowClass} onDoubleClick={onDoubleClick}>
        <div className={dotClass} />
        <div className="pf-label">{label}</div>
        {input !== undefined && <div className={inputClass}>{input}</div>}
        <div className={valClass} onClick={onValueClick}>
          {value}
        </div>
      </div>
      {detail && <div className="pf-detail">{detail}</div>}
    </>
  );
}
