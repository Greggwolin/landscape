'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function MarketEconomic({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="blue" label="Median HH income" value="$72,400" />
      <ProformaRow dot="blue" label="Income growth (1yr)" value="+2.8%" />
      <ProformaRow dot="blue" label="Total employment" value="4.2M" />
      <ProformaRow dot="blue" label="Job growth (1yr)" value="+1.1%" />
      <ProformaRow dot="blue" label="Major employers" value="Aerospace, HC" />
    </>
  );
}
