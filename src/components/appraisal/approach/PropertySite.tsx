'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function PropertySite({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="green" label="Site area" value="3.2 acres" />
      <ProformaRow dot="green" label="Shape" value="Rectangular" />
      <ProformaRow dot="green" label="Topography" value="Level" />
      <ProformaRow dot="green" label="Utilities" value="All available" />
      <ProformaRow dot="green" label="Flood zone" value="Zone X" />
      <ProformaRow dot="empty" label="Environmental" value="—" valueType="waiting" isWaiting />
      <ProformaRow dot="empty" label="Easements" value="—" valueType="waiting" isWaiting />
    </>
  );
}
