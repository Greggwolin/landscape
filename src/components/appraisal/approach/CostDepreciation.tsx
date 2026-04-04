'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function CostDepreciation({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="empty" label="Actual age" value="28 yrs" isWaiting />
      <ProformaRow dot="empty" label="Total economic life" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Physical depreciation" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Functional obsolescence" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="External obsolescence" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Total depreciation" value="—" valueType="waiting" isSubtotal />
    </>
  );
}
