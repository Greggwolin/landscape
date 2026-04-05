'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import { ValueBox } from '../shared/ValueBox';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function ReconciliationSummary({ onOpenDetail }: Props) {
  return (
    <>
      <div className="appraisal-meta">Approach values</div>
      <ProformaRow dot="green" label="Income approach" value="$11,443,000" />
      <ProformaRow dot="green" label="DCF" value="$11,060,000" />
      <ProformaRow dot="empty" label="Sales comparison" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Cost approach" value="—" valueType="waiting" isWaiting />

      <div className="appraisal-spacer-lg" />
      <div className="appraisal-meta">Weights</div>
      <ProformaRow dot="empty" label="Income weight" input="—" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Sales weight" input="—" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Cost weight" input="—" value="—" valueType="waiting" isWaiting />

      <ValueBox
        eyebrow="Concluded value"
        waitingText="— awaiting all approach values"
        dim
      />
    </>
  );
}
