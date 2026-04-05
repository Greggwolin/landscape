/**
 * DetailPanel
 *
 * Slide-over detail panel shell. Overlays the right panel (does not push layout).
 * Renders specific detail content based on detailId.
 *
 * @version 1.1
 * @created 2026-04-04
 * @updated 2026-04-05 — Added DetailUnitMix, DetailNarrative
 */

'use client';

import React from 'react';
import type { DetailId } from '../appraisal.types';
import { DetailVacancy } from './DetailVacancy';
import { DetailPGI } from './DetailPGI';
import { DetailOpEx } from './DetailOpEx';
import { DetailCapRate } from './DetailCapRate';
import { DetailMaintenance } from './DetailMaintenance';
import { DetailUnitMix } from './DetailUnitMix';
import { DetailNarrative } from './DetailNarrative';
import { DetailGeneric } from './DetailGeneric';

interface DetailPanelProps {
  open: boolean;
  detailId: DetailId | string;
  detailLabel: string;
  onClose: () => void;
}

const DETAIL_MAP: Record<string, React.FC<{ onClose: () => void }>> = {
  vacancy: DetailVacancy,
  pgi: DetailPGI,
  opex: DetailOpEx,
  caprate: DetailCapRate,
  maint: DetailMaintenance,
  unitmix: DetailUnitMix,
  narrative: DetailNarrative,
};

export function DetailPanel({ open, detailId, detailLabel, onClose }: DetailPanelProps) {
  const overlayClass = ['detail-overlay', open && 'show'].filter(Boolean).join(' ');

  const DetailComponent = DETAIL_MAP[detailId];

  return (
    <div className={overlayClass}>
      <div className="detail-panel">
        {DetailComponent ? (
          <DetailComponent onClose={onClose} />
        ) : (
          <DetailGeneric title={detailLabel} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
