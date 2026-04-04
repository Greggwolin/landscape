'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function CostReplacement({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="empty" label="GBA" value="52,480 SF" isWaiting />
      <ProformaRow dot="empty" label="Cost source" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Base $/SF" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Multiplier" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Soft costs" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Entrepreneurial incentive" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Replacement cost new" value="—" valueType="waiting" isSubtotal />
    </>
  );
}
