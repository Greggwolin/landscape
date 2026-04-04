'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import { ValueBox } from '../shared/ValueBox';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function SalesConclusion({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="empty" label="Adjusted range ($/SF)" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Adjusted range ($/unit)" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Concluded $/unit" value="—" valueType="waiting" isWaiting />
      <ValueBox
        eyebrow="Value indication — Sales comparison"
        waitingText="— awaiting adjustments"
        dim
      />
    </>
  );
}
