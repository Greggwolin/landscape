'use client';

import { useEffect, useState } from 'react';
import { CCard, CCardBody, CCardHeader, CButton, CSpinner, CAlert, CTable } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload } from '@coreui/icons';

interface PropertySummaryData {
  scenario: string;
  year: number;
  gross_scheduled_rent: number;
  vacancy_loss: number;
  effective_rental_income: number;
  other_income: number;
  effective_gross_income: number;
  total_opex: number;
  opex_by_category: Record<string, number>;
  noi: number;
  noi_margin: number;
  opex_ratio: number;
}

interface PropertySummaryViewProps {
  propertyId: string;
  scenario?: 'current' | 'proforma';
}

export function PropertySummaryView({ propertyId, scenario = 'current' }: PropertySummaryViewProps) {
  const [data, setData] = useState<PropertySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
        const response = await fetch(`${backendUrl}/api/reports/calculate/noi/${propertyId}/?scenario=${scenario}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [propertyId, scenario]);

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
          <div className="mt-3">Loading property data...</div>
        </CCardBody>
      </CCard>
    );
  }

  if (error) {
    return (
      <CAlert color="danger">
        <strong>Error loading data:</strong> {error}
      </CAlert>
    );
  }

  if (!data) return null;

  // Calculate derived metrics
  const purchasePrice = 47500000; // From CRE property record
  const totalUnits = 113;
  const rentableSF = 119167;

  const capRate = (data.noi / purchasePrice) * 100;
  const grm = purchasePrice / data.gross_scheduled_rent;
  const pricePerUnit = purchasePrice / totalUnits;
  const pricePerSF = purchasePrice / rentableSF;
  const noiPerUnit = data.noi / totalUnits;
  const noiPerSF = data.noi / rentableSF;

  const handleDownloadPDF = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    window.open(`${backendUrl}/api/reports/${propertyId}/property-summary.pdf/`, '_blank');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value).toFixed(2)}%`;
  };

  return (
    <div>
      {/* Header Card */}
      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="h4 mb-1">Property Summary Report</h2>
              <p className="text-body-secondary small mb-0">
                14105 Chadron Avenue, Hawthorne, CA 90250 • {scenario === 'current' ? 'Current' : 'Proforma'} Scenario
              </p>
            </div>
            <CButton
              color="primary"
              onClick={handleDownloadPDF}
              className="d-flex align-items-center gap-2"
            >
              <CIcon icon={cilCloudDownload} />
              Download PDF
            </CButton>
          </div>
        </CCardBody>
      </CCard>

      {/* Key Metrics Grid */}
      <div className="row g-3 mb-4">
        <MetricCard
          label="Purchase Price"
          value={formatCurrency(purchasePrice)}
          subvalue={`${formatCurrency(pricePerUnit)}/unit`}
        />
        <MetricCard
          label="Net Operating Income"
          value={formatCurrency(data.noi)}
          subvalue={`${formatCurrency(noiPerUnit)}/unit`}
          highlight
        />
        <MetricCard
          label="Cap Rate"
          value={formatPercent(capRate)}
          subvalue={`${scenario === 'current' ? 'Current' : 'Proforma'} Cap`}
          highlight
        />
        <MetricCard
          label="Gross Rent Multiplier"
          value={grm.toFixed(2)}
          subvalue="GRM"
        />
        <MetricCard
          label="Total Units"
          value={totalUnits.toLocaleString()}
          subvalue={`${formatCurrency(pricePerSF)}/SF`}
        />
        <MetricCard
          label="Rentable SF"
          value={rentableSF.toLocaleString()}
          subvalue={`${formatCurrency(noiPerSF)}/SF NOI`}
        />
        <MetricCard
          label="Expense Ratio"
          value={formatPercent(data.opex_ratio * 100)}
          subvalue="% of EGI"
        />
        <MetricCard
          label="NOI Margin"
          value={formatPercent(data.noi_margin * 100)}
          subvalue="% of EGI"
        />
      </div>

      {/* Operating Income Statement */}
      <CCard>
        <CCardHeader>
          <h5 className="mb-0">Operating Income Statement</h5>
        </CCardHeader>
        <CCardBody className="p-0">
          <CTable responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Line Item</th>
                <th className="text-end">Annual Amount</th>
                <th className="text-end">Monthly</th>
              </tr>
            </thead>
            <tbody>
              {/* Revenue Section */}
              <tr className="bg-blue-50">
                <td colSpan={3} className="px-6 py-2 text-sm font-semibold text-gray-900 uppercase">
                  Revenue
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">Gross Scheduled Rent</td>
                <td className="px-6 py-3 text-sm text-right font-mono">{formatCurrency(data.gross_scheduled_rent)}</td>
                <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
                  {formatCurrency(data.gross_scheduled_rent / 12)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900 pl-12">Less: Vacancy Loss (3%)</td>
                <td className="px-6 py-3 text-sm text-right font-mono text-red-600">
                  ({formatCurrency(data.vacancy_loss)})
                </td>
                <td className="px-6 py-3 text-sm text-right font-mono text-red-600">
                  ({formatCurrency(data.vacancy_loss / 12)})
                </td>
              </tr>
              <tr className="bg-gray-50 hover:bg-gray-100">
                <td className="px-6 py-3 text-sm font-semibold text-gray-900">Effective Rental Income</td>
                <td className="px-6 py-3 text-sm text-right font-mono font-semibold">
                  {formatCurrency(data.effective_rental_income)}
                </td>
                <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
                  {formatCurrency(data.effective_rental_income / 12)}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">Other Income</td>
                <td className="px-6 py-3 text-sm text-right font-mono">{formatCurrency(data.other_income)}</td>
                <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
                  {formatCurrency(data.other_income / 12)}
                </td>
              </tr>
              <tr className="bg-blue-100 font-semibold">
                <td className="px-6 py-3 text-sm text-gray-900">EFFECTIVE GROSS INCOME</td>
                <td className="px-6 py-3 text-sm text-right font-mono">
                  {formatCurrency(data.effective_gross_income)}
                </td>
                <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
                  {formatCurrency(data.effective_gross_income / 12)}
                </td>
              </tr>

              {/* Expenses Section */}
              <tr className="bg-red-50">
                <td colSpan={3} className="px-6 py-2 text-sm font-semibold text-gray-900 uppercase">
                  Operating Expenses
                </td>
              </tr>
              {Object.entries(data.opex_by_category).map(([category, amount]) => (
                <tr key={category} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">{category}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono">{formatCurrency(amount)}</td>
                  <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
                    {formatCurrency(amount / 12)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 hover:bg-gray-100 font-semibold">
                <td className="px-6 py-3 text-sm text-gray-900">Total Operating Expenses</td>
                <td className="px-6 py-3 text-sm text-right font-mono">{formatCurrency(data.total_opex)}</td>
                <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
                  {formatCurrency(data.total_opex / 12)}
                </td>
              </tr>
              <tr className="text-xs text-gray-600">
                <td className="px-6 py-2 pl-12">% of EGI</td>
                <td className="px-6 py-2 text-right font-mono">{formatPercent(data.opex_ratio * 100)}</td>
                <td className="px-6 py-2"></td>
              </tr>

              {/* NOI Section */}
              <tr className="bg-green-100 font-bold">
                <td className="px-6 py-4 text-sm text-gray-900">NET OPERATING INCOME</td>
                <td className="px-6 py-4 text-sm text-right font-mono text-green-800">
                  {formatCurrency(data.noi)}
                </td>
                <td className="px-6 py-4 text-sm text-right font-mono text-gray-600">
                  {formatCurrency(data.noi / 12)}
                </td>
              </tr>
              <tr className="text-xs text-gray-600">
                <td className="px-6 py-2 pl-12">NOI Margin</td>
                <td className="px-6 py-2 text-right font-mono">{formatPercent(data.noi_margin * 100)}</td>
                <td className="px-6 py-2 text-right">Cap Rate: {formatPercent(capRate)}</td>
              </tr>
            </tbody>
          </CTable>
        </CCardBody>
      </CCard>

      {/* Footer */}
      <div className="text-center text-body-secondary small mt-4">
        <p>© 2025 Landscape Platform - Professional Real Estate Analytics</p>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  subvalue?: string;
  highlight?: boolean;
}

function MetricCard({ label, value, subvalue, highlight = false }: MetricCardProps) {
  return (
    <div className="col-12 col-sm-6 col-md-4 col-lg-3">
      <CCard className={`h-100 ${highlight ? 'border-primary' : ''}`}>
        <CCardBody>
          <div className="text-body-secondary text-uppercase small mb-1">
            {label}
          </div>
          <div className={`h3 fw-bold mb-0 ${highlight ? 'text-primary' : ''}`}>
            {value}
          </div>
          {subvalue && (
            <div className="text-body-secondary small mt-1">
              {subvalue}
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  );
}
