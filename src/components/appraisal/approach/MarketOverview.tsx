'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function MarketOverview({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="blue" label="Vacancy rate" value="4.8%" />
      <ProformaRow dot="blue" label="Rent growth (1yr)" value="+3.2%" valueType="positive" />
      <ProformaRow dot="blue" label="Median cap rate" value="5.1%" />
      <ProformaRow dot="blue" label="Population growth" value="+0.4%" />
      <ProformaRow dot="blue" label="Unemployment" value="4.2%" />
    </>
  );
}
