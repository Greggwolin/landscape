'use client';

import React from 'react';
import { CompMiniRow } from '../shared/CompMiniRow';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

export function SalesComps({ onOpenDetail }: Props) {
  return (
    <>
      <CompMiniRow isHeader label="Comp" units="Units" sale="Sale" psfValue="$/SF" perUnit="$/Unit" />
      <CompMiniRow label="Comp 1" units="48" sale="$6.8M" psfValue="$142" perUnit="$141,667"
        onDoubleClick={() => onOpenDetail('generic', 'Sales Comp 1')} />
      <CompMiniRow label="Comp 2" units="72" sale="$9.9M" psfValue="$138" perUnit="$137,500"
        onDoubleClick={() => onOpenDetail('generic', 'Sales Comp 2')} />
      <CompMiniRow label="Comp 3" units="36" sale="$5.4M" psfValue="$151" perUnit="$150,000"
        onDoubleClick={() => onOpenDetail('generic', 'Sales Comp 3')} />
      <CompMiniRow label="Comp 4" isWaiting
        onDoubleClick={() => onOpenDetail('generic', 'Sales Comp 4')} />
    </>
  );
}
