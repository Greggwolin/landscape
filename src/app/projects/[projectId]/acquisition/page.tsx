'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AcquisitionHeaderCard from '@/components/acquisition/AcquisitionHeaderCard';
import AcquisitionLedgerGrid from '@/components/acquisition/AcquisitionLedgerGrid';
import AcquisitionReconciliation from '@/components/acquisition/AcquisitionReconciliation';
import { usePreference } from '@/hooks/useUserPreferences';
import type { AcquisitionEvent, AcquisitionHeader } from '@/types/acquisition';
import type { BudgetMode } from '@/components/budget/ModeSelector';

const normalizeNumber = (value: any) => (value === null || value === undefined ? null : Number(value));

export default function AcquisitionPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  // Mode state with database persistence via usePreference hook
  const [mode, setMode] = usePreference<BudgetMode>({
    key: 'acquisition.mode',
    defaultValue: 'napkin',
    scopeType: 'project',
    scopeId: projectId,
    migrateFrom: `acquisition_mode_${projectId}`, // Auto-migrate from old localStorage key
  });
  const [headerData, setHeaderData] = useState<AcquisitionHeader | null>(null);
  const [headerLoading, setHeaderLoading] = useState<boolean>(true);
  const [headerSaving, setHeaderSaving] = useState<boolean>(false);
  const [events, setEvents] = useState<AcquisitionEvent[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const fetchHeader = async () => {
    setHeaderLoading(true);
    setHeaderError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/assumptions/acquisition/`);
      if (!res.ok) throw new Error(`Failed to fetch header (${res.status})`);
      const json = await res.json();
      setHeaderData({
        ...json,
        purchase_price: normalizeNumber(json.purchase_price),
        due_diligence_days: normalizeNumber(json.due_diligence_days),
        earnest_money: normalizeNumber(json.earnest_money),
      });
    } catch (err) {
      console.error(err);
      setHeaderError('Unable to load acquisition assumptions');
    } finally {
      setHeaderLoading(false);
    }
  };

  useEffect(() => {
    fetchHeader();
  }, [projectId]);

  const handleHeaderChange = (patch: Partial<AcquisitionHeader>) => {
    setHeaderData((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleHeaderSave = async () => {
    if (!headerData) return;
    setHeaderSaving(true);
    setHeaderError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/assumptions/acquisition/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(headerData),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const json = await res.json();
      setHeaderData({
        ...json,
        purchase_price: normalizeNumber(json.purchase_price),
        due_diligence_days: normalizeNumber(json.due_diligence_days),
        earnest_money: normalizeNumber(json.earnest_money),
      });
    } catch (err) {
      console.error(err);
      setHeaderError('Failed to save acquisition assumptions');
    } finally {
      setHeaderSaving(false);
    }
  };

  const purchasePrice = useMemo(() => Number(headerData?.purchase_price ?? 0), [headerData?.purchase_price]);
  const netAffecting = useMemo(
    () =>
      events
        .filter((evt) => evt.isAppliedToPurchase)
        .reduce((sum, evt) => sum + (evt.amount ?? 0), 0),
    [events]
  );

  return (
    <div className="container-fluid px-4 py-4" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h2 className="mb-0">Acquisition</h2>
          <p className="text-muted mb-0">Header assumptions + unified acquisition ledger (ALTA-inspired)</p>
        </div>
        <div className="text-muted small">Project ID: {projectId}</div>
      </div>

      {headerError && <div className="alert alert-danger py-2">{headerError}</div>}

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <AcquisitionHeaderCard
            data={headerData}
            loading={headerLoading}
            saving={headerSaving}
            onChange={handleHeaderChange}
            onSave={handleHeaderSave}
          />
        </div>
        <div className="col-lg-4">
          <AcquisitionReconciliation purchasePrice={purchasePrice} netAffecting={netAffecting} />
        </div>
      </div>

      <AcquisitionLedgerGrid
        projectId={projectId}
        mode={mode}
        onModeChange={setMode}
        onEventsChange={setEvents}
      />
    </div>
  );
}
