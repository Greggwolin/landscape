'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CCard, CCardHeader, CCardBody, CRow, CCol, CButton } from '@coreui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MetricCard from '@/components/capitalization/MetricCard';
import EquityPartnersTable, { type EquityPartner } from '@/components/capitalization/EquityPartnersTable';
import EquityPartnerModal, { type EquityPartnerInput } from '@/components/capitalization/EquityPartnerModal';
import WaterfallConfigForm from '@/components/capitalization/WaterfallConfigForm';
import WaterfallResults, { WaterfallApiResponse } from '@/components/capitalization/WaterfallResults';

import { getAuthHeaders } from '@/lib/authHeaders';
type WaterfallType = 'IRR' | 'EM' | 'IRR_EM';

/** Row shape returned by GET /api/capitalization/equity. */
interface EquityTrancheRow {
  tranche_id: number;
  tranche_name: string;
  partner_type: string;
  ownership_pct: number;
  capital_contributed: number;
  capital_deployed?: number;
  preferred_return_pct?: number | null;
}

function mapTrancheToPartner(t: EquityTrancheRow): EquityPartner {
  const partnerType: EquityPartner['partnerType'] =
    t.partner_type === 'GP' ? 'GP' : t.partner_type === 'LP' ? 'LP' : 'Sponsor';
  return {
    id: Number(t.tranche_id),
    partnerName: t.tranche_name,
    partnerType,
    capitalCommitted: Number(t.capital_contributed) || 0,
    capitalDeployed: Number(t.capital_deployed) || 0,
    ownershipPercent: Number(t.ownership_pct) || 0,
    // CRUD stores preferred return as a percent (8); the table multiplies by 100 for display.
    preferredReturn: t.preferred_return_pct != null ? Number(t.preferred_return_pct) / 100 : undefined,
  };
}

/** tbl_equity accepts GP | LP | COMMON | PREFERRED; map the UI's "Sponsor" to COMMON. */
function partnerTypeToCrud(t: 'LP' | 'GP' | 'Sponsor'): string {
  return t === 'Sponsor' ? 'COMMON' : t;
}

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

  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<EquityPartner | null>(null);

  const { data: partners = [] } = useQuery<EquityPartner[]>({
    queryKey: ['equity-partners', projectId],
    queryFn: async () => {
      // Read from the implemented equity CRUD (tbl_equity). The legacy
      // /api/projects/:id/equity/partners route was an empty stub.
      const response = await fetch(`/api/capitalization/equity?projectId=${projectId}`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch partners');
      const json = await response.json();
      const rows: EquityTrancheRow[] = Array.isArray(json?.data) ? json.data : [];
      return rows.map(mapTrancheToPartner);
    },
  });

  const invalidatePartners = () =>
    queryClient.invalidateQueries({ queryKey: ['equity-partners', projectId] });

  const saveMutation = useMutation({
    mutationFn: async (values: EquityPartnerInput) => {
      const payload = {
        project_id: projectId,
        tranche_name: values.partnerName,
        partner_type: partnerTypeToCrud(values.partnerType),
        ownership_pct: values.ownershipPercent,
        capital_contributed: values.capitalCommitted,
        preferred_return_pct: values.preferredReturn ?? 0,
      };
      const url = editingPartner
        ? `/api/capitalization/equity/${editingPartner.id}`
        : `/api/capitalization/equity`;
      const res = await fetch(url, {
        method: editingPartner ? 'PATCH' : 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save partner');
      }
      return res.json();
    },
    onSuccess: () => {
      setModalOpen(false);
      setEditingPartner(null);
      invalidatePartners();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/capitalization/equity/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete partner');
      }
      return res.json();
    },
    onSuccess: invalidatePartners,
  });

  const handleAdd = () => { setEditingPartner(null); setModalOpen(true); };
  const handleEdit = (partner: EquityPartner) => { setEditingPartner(partner); setModalOpen(true); };
  const handleDelete = (id: number) => {
    if (window.confirm('Remove this equity partner?')) {
      deleteMutation.mutate(id, {
        onError: (e) => alert(e instanceof Error ? e.message : 'Failed to delete partner'),
      });
    }
  };

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

      const res = await fetch(`/api/projects/${projectId}/waterfall/calculate?hurdle_method=${hurdleMethod}&_t=${Date.now()}`, { headers: getAuthHeaders(), method: 'GET',
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
        const res = await fetch(`/api/projects/${projectId}/waterfall/last-result?_t=${Date.now()}`, { headers: getAuthHeaders(), credentials: 'include',
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
    // Always recalculate waterfall after assumptions are saved
    if (!loading) {
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
        <CCardHeader className="d-flex justify-content-between align-items-center" style={{ padding: '8px 12px' }}>
          <h5 className="mb-0">Equity Partners</h5>
          <CButton color="primary" size="sm" onClick={handleAdd}>Add Partner</CButton>
        </CCardHeader>
        <CCardBody style={{ padding: 0 }}>
          <EquityPartnersTable
            partners={partners}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CCardBody>
      </CCard>

      <EquityPartnerModal
        open={modalOpen}
        initial={editingPartner}
        saving={saveMutation.isPending}
        onClose={() => { setModalOpen(false); setEditingPartner(null); }}
        onSubmit={(values) => saveMutation.mutate(values, {
          onError: (e) => alert(e instanceof Error ? e.message : 'Failed to save partner'),
        })}
      />
    </div>
  );
}
