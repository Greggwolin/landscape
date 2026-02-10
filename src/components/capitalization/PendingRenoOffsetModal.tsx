'use client';

import React from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CSpinner,
  CTable,
  CBadge,
} from '@coreui/react';

interface PendingRenoOffsetModalProps {
  projectId: string;
  exitMonth: number;
  pendingRenoOffset: number;
  visible: boolean;
  onClose: () => void;
}

interface CostToCompleteResponse {
  exit_month: number;
  summary: {
    units_completed: number;
    units_in_relet: number;
    units_in_construction: number;
    units_not_started: number;
    total_units_in_program: number;
    remaining_reno_cost: number;
    remaining_relocation_cost: number;
    remaining_vacancy_loss: number;
    total_pending_offset: number;
  };
  by_category: Array<{
    category: string;
    units: number;
    detail: string;
    amount: number;
  }>;
  unit_detail: Array<{
    unit_id: number;
    unit_number: string;
    unit_type: string;
    square_feet: number;
    current_rent: number;
    market_rent: number;
    status_at_exit: string;
    reno_start_month: number;
    reno_complete_month: number;
    relet_month: number;
    months_remaining_offline: number;
    remaining_reno_cost: number;
    remaining_vacancy_loss: number;
    remaining_relocation: number;
    total_remaining: number;
  }>;
}

function formatCurrency(value: number): string {
  if (Math.abs(value || 0) < 0.005) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    'RENOVATED': 'success',
    'RELET_LAG': 'warning',
    'IN_PROGRESS': 'info',
    'ORIGINAL': 'secondary',
  };

  const labelMap: Record<string, string> = {
    'RENOVATED': 'Renovated',
    'RELET_LAG': 'Relet Lag',
    'IN_PROGRESS': 'In Construction',
    'ORIGINAL': 'Not Started',
  };

  return (
    <CBadge color={colorMap[status] || 'secondary'}>
      {labelMap[status] || status}
    </CBadge>
  );
}

export default function PendingRenoOffsetModal({
  projectId,
  exitMonth,
  pendingRenoOffset,
  visible,
  onClose,
}: PendingRenoOffsetModalProps) {
  const [data, setData] = React.useState<CostToCompleteResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!visible || !projectId) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
        const url = `${apiUrl}/api/projects/${projectId}/renovation/cost-to-complete/?exit_month=${exitMonth}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cost-to-complete data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [visible, projectId, exitMonth]);

  return (
    <CModal visible={visible} onClose={onClose} size="xl">
      <CModalHeader>
        <CModalTitle style={{ fontSize: '0.9375rem' }}>
          Pending Reno Offset Detail — Exit Month {exitMonth}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {isLoading && (
          <div className="text-center py-4">
            <CSpinner size="sm" />
            <span className="ms-2">Loading cost-to-complete data...</span>
          </div>
        )}

        {!isLoading && error && (
          <div className="text-danger">Failed to load data: {error}</div>
        )}

        {!isLoading && !error && data && (
          <>
            {/* Section 1: Unit Status at Exit */}
            <div className="mb-4">
              <div
                className="fw-semibold mb-2"
                style={{ fontSize: '0.8125rem', color: 'var(--cui-body-color)' }}
              >
                UNIT STATUS AT EXIT (Month {data.exit_month})
              </div>
              <CTable striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="text-end">Units</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Renovated</td>
                    <td className="text-end">{data.summary.units_completed}</td>
                    <td style={{ color: 'var(--cui-secondary-color)', fontSize: '0.8125rem' }}>
                      Completed & leased
                    </td>
                  </tr>
                  <tr>
                    <td>In Relet Lag</td>
                    <td className="text-end">{data.summary.units_in_relet}</td>
                    <td style={{ color: 'var(--cui-secondary-color)', fontSize: '0.8125rem' }}>
                      Construction done, awaiting lease-up
                    </td>
                  </tr>
                  <tr>
                    <td>In Construction</td>
                    <td className="text-end">{data.summary.units_in_construction}</td>
                    <td style={{ color: 'var(--cui-secondary-color)', fontSize: '0.8125rem' }}>
                      Mid-renovation
                    </td>
                  </tr>
                  <tr>
                    <td>Not Yet Started</td>
                    <td className="text-end">{data.summary.units_not_started}</td>
                    <td style={{ color: 'var(--cui-secondary-color)', fontSize: '0.8125rem' }}>
                      Pending future renovation
                    </td>
                  </tr>
                  <tr className="fw-semibold">
                    <td>TOTAL</td>
                    <td className="text-end">{data.summary.total_units_in_program}</td>
                    <td></td>
                  </tr>
                </tbody>
              </CTable>
            </div>

            {/* Section 2: Cost to Complete by Category */}
            <div className="mb-4">
              <div
                className="fw-semibold mb-2"
                style={{ fontSize: '0.8125rem', color: 'var(--cui-body-color)' }}
              >
                COST TO COMPLETE
              </div>
              <CTable striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="text-end">Units</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_category.map((cat, idx) => (
                    <tr key={idx}>
                      <td>{cat.category}</td>
                      <td className="text-end">{cat.units}</td>
                      <td className="text-end">{formatCurrency(cat.amount)}</td>
                    </tr>
                  ))}
                  <tr className="fw-semibold" style={{ borderTop: '2px solid var(--cui-border-color)' }}>
                    <td>TOTAL PENDING RENO OFFSET</td>
                    <td className="text-end"></td>
                    <td className="text-end">{formatCurrency(data.summary.total_pending_offset)}</td>
                  </tr>
                </tbody>
              </CTable>
            </div>

            {/* Section 3: Unit-by-Unit Detail */}
            <div>
              <div
                className="fw-semibold mb-2"
                style={{ fontSize: '0.8125rem', color: 'var(--cui-body-color)' }}
              >
                UNIT-BY-UNIT DETAIL ({data.unit_detail.length} units)
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <CTable striped bordered hover size="sm">
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--cui-tertiary-bg)', zIndex: 1 }}>
                    <tr>
                      <th>Unit</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th className="text-end">Start</th>
                      <th className="text-end">Complete</th>
                      <th className="text-end">Relet</th>
                      <th className="text-end">Rem. Reno</th>
                      <th className="text-end">Rem. Vacancy</th>
                      <th className="text-end">Total Rem.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unit_detail.map((unit) => (
                      <tr key={unit.unit_id}>
                        <td>{unit.unit_number}</td>
                        <td>{unit.unit_type}</td>
                        <td><StatusBadge status={unit.status_at_exit} /></td>
                        <td className="text-end">Mo {unit.reno_start_month}</td>
                        <td className="text-end">Mo {unit.reno_complete_month}</td>
                        <td className="text-end">Mo {unit.relet_month}</td>
                        <td className="text-end">{formatCurrency(unit.remaining_reno_cost)}</td>
                        <td className="text-end">{formatCurrency(unit.remaining_vacancy_loss)}</td>
                        <td className="text-end fw-semibold">{formatCurrency(unit.total_remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </CTable>
              </div>
            </div>
          </>
        )}
      </CModalBody>
    </CModal>
  );
}
