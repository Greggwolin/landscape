'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import { ValueBox } from '../shared/ValueBox';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function CostSummary({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="empty" label="Land value" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Replacement cost new" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Less: depreciation" value="—" valueType="waiting" isWaiting />
      <ValueBox
        eyebrow="Value indication — Cost"
        waitingText="— not started"
        dim
      />
    </>
  );
}
