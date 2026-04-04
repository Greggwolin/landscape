'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function PropertySummary({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="green" label="Address" value="14105 Chadron Ave" />
      <ProformaRow dot="green" label="City / State" value="Hawthorne, CA" />
      <ProformaRow dot="green" label="Units" value="64" />
      <ProformaRow dot="green" label="Year built" value="1998" />
      <ProformaRow dot="green" label="Type" value="Garden MF" />
      <ProformaRow dot="green" label="GBA" value="52,480 SF" />
      <ProformaRow dot="green" label="Zoning" value="R-3" />
    </>
  );
}
