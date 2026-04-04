'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function CostLandValue({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="empty" label="Land area" value="3.2 acres" isWaiting />
      <ProformaRow dot="empty" label="Land comp 1" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Land comp 2" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Land comp 3" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Concluded $/acre" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Land value" value="—" valueType="waiting" isSubtotal />
    </>
  );
}
