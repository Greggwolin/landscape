'use client';

import React from 'react';
import { ProformaRow } from '../shared/ProformaRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

const ITEMS = ['Laundry', 'Parking', 'Pet fees', 'Late fees', 'RUBS / utility reimbursement', 'Other'];

export function IncomeOtherIncome({ onOpenDetail }: Props) {
  return (
    <>
      {ITEMS.map((item) => (
        <ProformaRow
          key={item}
          dot="empty" label={item} value="—" valueType="waiting" isWaiting
          onDoubleClick={() => onOpenDetail('generic', item)}
        />
      ))}
      <ProformaRow dot="empty" label="Total other income" value="—" valueType="waiting" isSubtotal />
    </>
  );
}
