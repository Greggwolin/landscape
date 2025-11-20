'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import '@/styles/lease.css';

import FloatingActions from '../components/FloatingActions';
import LeaseHeader from './components/LeaseHeader';
import LeaseSidebar from './components/LeaseSidebar';
import LeaseOverview from './components/LeaseOverview';
import TermsAndDates from './components/TermsAndDates';
import RentStructure from './components/RentStructure';
import Escalations from './components/Escalations';
import Recoveries from './components/Recoveries';
import AdditionalIncome from './components/AdditionalIncome';
import LeasingCosts from './components/LeasingCosts';
import MarketAssumptions from './components/MarketAssumptions';
import Notes from './components/Notes';
import type { LeaseData, LeaseValidationErrors } from '../types';
import { validateLease } from '../utils/validation';

const LeasePage = () => {
  const params = useParams();
  const leaseId = params?.id as string;
  const [activeTab, setActiveTab] = useState('general');
  const [leaseData, setLeaseData] = useState<LeaseData | null>(null);
  const [errors, setErrors] = useState<LeaseValidationErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadLeaseData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/lease/${leaseId}`);
      if (!response.ok) {
        throw new Error('Failed to load lease');
      }
      const result = await response.json() as { ok: boolean; data: LeaseData };
      if (!result.ok || !result.data) {
        throw new Error('Invalid API response');
      }
      setLeaseData(result.data);
      setErrors(validateLease(result.data.lease));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [leaseId]);

  useEffect(() => {
    if (leaseId) {
      loadLeaseData();
    }
  }, [leaseId, loadLeaseData]);

  const handleUpdate = useCallback(
    async (section: keyof LeaseData, field: string, value: unknown) => {
      if (!leaseData) {
        return;
      }

      const nextValue = Array.isArray(leaseData[section])
        ? (value as LeaseData[typeof section])
        : {
            ...(leaseData[section] as Record<string, unknown>),
            [field]: value
          };

      const updated = {
        ...leaseData,
        [section]: nextValue
      } as LeaseData;

      setLeaseData(updated);

      if (section === 'lease') {
        setErrors(validateLease(updated.lease));
      }

      setSaving(true);
      try {
        const response = await fetch(`/api/lease/${leaseId}/${section}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: Array.isArray(nextValue)
            ? JSON.stringify(nextValue)
            : JSON.stringify({ field, value })
        });
        if (!response.ok) {
          throw new Error('Save failed');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setSaving(false);
      }
    },
    [leaseData, leaseId]
  );

  const tabContent = useMemo(() => {
    if (!leaseData) {
      return null;
    }

    switch (activeTab) {
      case 'general':
        return (
          <>
            <LeaseOverview
              data={leaseData}
              errors={errors}
              onUpdate={(field, value) => handleUpdate('lease', field, value)}
            />
            <TermsAndDates data={leaseData} errors={errors} onUpdate={handleUpdate} />
          </>
        );
      case 'rental':
        return <RentStructure data={leaseData} onUpdate={handleUpdate} />;
      case 'cpi':
        return <Escalations data={leaseData} onUpdate={handleUpdate} />;
      case 'percentage':
        return <div className="helper-text">Percentage rent configuration coming soon.</div>;
      case 'recoveries':
        return <Recoveries data={leaseData} onUpdate={handleUpdate} />;
      case 'misc':
        return <AdditionalIncome data={leaseData} onUpdate={handleUpdate} />;
      case 'leasing':
        return <LeasingCosts data={leaseData} onUpdate={handleUpdate} />;
      case 'security':
        return <div className="helper-text">Security deposit workflows coming soon.</div>;
      case 'market':
        return <MarketAssumptions data={leaseData} onUpdate={handleUpdate} />;
      case 'notes':
        return <Notes data={leaseData} onUpdate={handleUpdate} />;
      default:
        return null;
    }
  }, [activeTab, errors, handleUpdate, leaseData]);

  if (loading || !leaseData) {
    return (
      <div className="lease-app">
        <div className="lease-wrapper">Loading lease…</div>
      </div>
    );
  }

  return (
    <div className="lease-app">
      <div className="lease-wrapper">
        <LeaseHeader lease={leaseData.lease} saving={saving} />
        <LeaseSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <section className="lease-card">
          <div className="tab-panel">{tabContent}</div>
          <FloatingActions disabled={saving} />
        </section>
      </div>
    </div>
  );
};

export default LeasePage;
