'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import { ValueBox } from '../shared/ValueBox';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function IncomeProforma({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow
        dot="green" label="Potential gross income" input="$1,385" inputHasValue
        value="1,064,640" detail="64 units × $1,385 × 12"
        onDoubleClick={() => onOpenDetail('pgi', 'Potential Gross Income')}
      />
      <ProformaRow
        dot="green" label="Vacancy" input="5.0%" inputHasValue
        value="(53,232)" valueType="negative"
        onDoubleClick={() => onOpenDetail('vacancy', 'Vacancy')}
      />
      <ProformaRow
        dot="blue" label="Credit loss" input="dflt 1%"
        value="(10,114)" valueType="negative"
        onDoubleClick={() => onOpenDetail('credit', 'Credit Loss')}
      />
      <ProformaRow
        dot="empty" label="Effective gross income" value="1,001,294" isSubtotal
      />
      <ProformaRow
        dot="green" label="Operating expenses" input="40%" inputHasValue
        value="(400,518)" valueType="negative"
        onDoubleClick={() => onOpenDetail('opex', 'Operating Expenses')}
      />
      <ProformaRow
        dot="empty" label="Net operating income" value="600,776" valueType="positive" isSubtotal
      />
      <div style={{ height: 6 }} />
      <ProformaRow
        dot="green" label="Going-in cap rate" input="5.25%" inputHasValue value="—"
        onDoubleClick={() => onOpenDetail('caprate', 'Going-in Cap Rate')}
      />
      <ValueBox
        eyebrow="Value indication — Income"
        value="$11,443,000"
        subtitle="NOI $600,776 ÷ 5.25% · $178,797/unit"
      />
    </>
  );
}
