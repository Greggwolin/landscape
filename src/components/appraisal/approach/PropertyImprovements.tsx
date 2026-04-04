'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function PropertyImprovements({ onOpenDetail }: Props) {
  return (
    <>
      <ProformaRow dot="green" label="Construction" value="Wood frame" />
      <ProformaRow dot="green" label="Roof" value="Composition" />
      <ProformaRow dot="green" label="Stories" value="2" />
      <ProformaRow dot="green" label="Parking" value="Surface, 1.5/unit" />
      <ProformaRow dot="green" label="HVAC" value="Individual pkg" />
      <ProformaRow dot="yellow" label="Condition rating" value="—" valueType="waiting" />
      <ProformaRow dot="yellow" label="Effective age" value="—" valueType="waiting" />
      <ProformaRow dot="yellow" label="Remaining life" value="—" valueType="waiting" />
    </>
  );
}
