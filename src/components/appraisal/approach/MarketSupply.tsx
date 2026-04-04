'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function MarketSupply({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="blue" label="MF permits (12mo)" value="3,840" />
      <ProformaRow dot="blue" label="Absorption (12mo)" value="4,200" />
      <ProformaRow dot="blue" label="Under construction" value="2,100" />
      <ProformaRow dot="blue" label="Existing inventory" value="48,600" />
      <ProformaRow dot="blue" label="Pipeline as % of stock" value="4.3%" />
    </>
  );
}
