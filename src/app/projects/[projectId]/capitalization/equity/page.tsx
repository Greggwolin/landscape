'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react';
import { useQuery } from '@tanstack/react-query';
import MetricCard from '@/components/capitalization/MetricCard';
import EquityPartnersTable, { type EquityPartner } from '@/components/capitalization/EquityPartnersTable';
import WaterfallConfigForm from '@/components/capitalization/WaterfallConfigForm';
import WaterfallResults, { WaterfallApiResponse } from '@/components/capitalization/WaterfallResults';

type WaterfallType = 'IRR' | 'EM' | 'IRR_EM';

const parseWaterfallError = async (res: Response): Promise<string> => {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    const error = parsed?.error;
    const hint = parsed?.hint;
    if (typeof error === 'string' && error.trim().length > 0) {
      return hint ? `${error} ${hint}` : error;
    }
    if (typeof parsed?.details === 'string' && parsed.details.trim().length > 0) {
      return parsed.details;
    }
  } catch {
    // fall through to raw text
  }
  return text || `Request failed with status ${res.status}`;
};

export default function EquityPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  const { data: partners = [] } = useQuery<EquityPartner[]>({
    queryKey: ['equity-partners', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/equity/partners`);
      if (!response.ok) throw new Error('Failed to fetch partners');
      const data = await response.json();
      return data.partners || [];
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WaterfallApiResponse | null>(null);
  const [waterfallType, setWaterfallType] = useState<WaterfallType>('IRR');
  const hasRunOnce = useRef(false);
  const handleRunRef = useRef<(() => void) | null>(null);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const hurdleMethodMap: Record<WaterfallType, string> = {
        IRR: 'IRR',
        EM: 'EMx',
        IRR_EM: 'IRR_EMx',
      };
      const hurdleMethod = hurdleMethodMap[waterfallType];

      const res = await fetch(`/api/projects/${projectId}/waterfall/calculate?hurdle_method=${hurdleMethod}&_t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        const message = await parseWaterfallError(res);
        throw new Error(message);
      }

      const json = (await res.json()) as WaterfallApiResponse;
      setData(json);
      hasRunOnce.current = true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to calculate waterfall.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, waterfallType]);

  // Keep ref in sync for use in mount effect
  handleRunRef.current = handleRun;

  // Load last-run waterfall result on mount, or auto-recalculate if stale
  useEffect(() => {
    let cancelled = false;
    async function loadLastResult() {
      try {
        const res = await fetch(`/api/projects/${projectId}/waterfall/last-result?_t=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();

        // If upstream assumptions changed since last run, auto-recalculate
        if (!cancelled && json?.stale) {
          hasRunOnce.current = true;
          handleRunRef.current?.();
          return;
        }

        if (!cancelled && json && !('error' in json)) {
          setData(json as WaterfallApiResponse);
          hasRunOnce.current = true;
        }
      } catch {
        // Silently ignore — user can click Run to calculate fresh
      }
    }
    loadLastResult();
    return () => { cancelled = true; };
  }, [projectId]);

  const handleSaved = useCallback(() => {
    if (hasRunOnce.current && !loading) {
      handleRun();
    }
  }, [handleRun, loading]);

  const calculateTotalEquity = (): number => {
    return partners.reduce((sum, p) => sum + p.capitalCommitted, 0);
  };

  const calculateTotalDeployed = (): number => {
    return partners.reduce((sum, p) => sum + p.capitalDeployed, 0);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="d-flex flex-column flex-lg-row" style={{ gap: '8px' }}>
        <div className="flex-fill" style={{ minWidth: 0 }}>
          <WaterfallConfigForm
            projectId={projectId}
            waterfallType={waterfallType}
            onWaterfallTypeChange={setWaterfallType}
            onSaved={handleSaved}
          />
        </div>
        <div className="flex-fill" style={{ minWidth: 0 }}>
          <WaterfallResults
            data={data}
            error={error}
            loading={loading}
            onRun={handleRun}
            showPeriodTable={false}
          />
        </div>
      </div>
      {data && (
        <div className="row">
          <div className="col-12">
            <WaterfallResults
              data={data}
              error={null}
              loading={false}
              onRun={handleRun}
              showPeriodTableOnly
            />
          </div>
        </div>
      )}

      <CRow className="g-3" style={{ marginTop: '8px' }}>
        <CCol xs={12} md={4}>
          <MetricCard
            label="Total Equity Committed"
            value={formatCurrency(calculateTotalEquity())}
            status="success"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <MetricCard
            label="Equity Deployed"
            value={formatCurrency(calculateTotalDeployed())}
            status="info"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <MetricCard
            label="Remaining to Deploy"
            value={formatCurrency(calculateTotalEquity() - calculateTotalDeployed())}
            status="primary"
          />
        </CCol>
      </CRow>

      <CCard>
        <CCardHeader style={{ padding: '8px 12px' }}>
          <h5 className="mb-0">Equity Partners</h5>
        </CCardHeader>
        <CCardBody style={{ padding: 0 }}>
          <EquityPartnersTable
            partners={partners}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </CCardBody>
      </CCard>
    </div>
  );
}
