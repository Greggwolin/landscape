'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import { ValueBox } from '../shared/ValueBox';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function IncomeDCF({ onOpenDetail }: Props) {
  return (
    <>
      <div style={{ fontSize: 9, color: 'var(--cui-tertiary-color)', marginBottom: 6 }}>Assumptions</div>
      <ProformaRow dot="green" label="Hold period" input="10 yrs" inputHasValue value="—" />
      <ProformaRow dot="green" label="Rent growth" input="3.0%" inputHasValue value="—" />
      <ProformaRow dot="green" label="Expense growth" input="2.5%" inputHasValue value="—" />
      <ProformaRow dot="green" label="Vacancy (stabilized)" input="5.0%" inputHasValue value="—" />
      <ProformaRow dot="green" label="Terminal cap rate" input="5.75%" inputHasValue value="—" />
      <ProformaRow dot="green" label="Discount rate" input="7.50%" inputHasValue value="—" />
      <ProformaRow dot="blue" label="Selling costs" input="dflt 2%" value="—" />

      <div style={{ height: 6 }} />
      <div style={{ fontSize: 9, color: 'var(--cui-tertiary-color)', marginBottom: 6 }}>Results (calculated)</div>
      <ProformaRow dot="empty" label="Year 11 NOI" value="$807,240" isSubtotal />
      <ProformaRow dot="empty" label="Reversion value" value="$14,039,000" isSubtotal />
      <ProformaRow dot="empty" label="Less: selling costs" value="(280,780)" valueType="negative" isSubtotal />
      <ProformaRow dot="empty" label="Net reversion" value="$13,758,000" isSubtotal />
      <div style={{ height: 4 }} />
      <ProformaRow dot="empty" label="PV of cash flows" value="$4,312,000" isSubtotal />
      <ProformaRow dot="empty" label="PV of reversion" value="$6,748,000" isSubtotal />

      <ValueBox
        eyebrow="Value indication — DCF"
        value="$11,060,000"
        subtitle="PV cash flows + PV reversion · $172,813/unit"
      />
    </>
  );
}
