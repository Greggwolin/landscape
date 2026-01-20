'use client';

import React, { useState } from 'react';
import { CNav, CNavItem, CNavLink, CTabContent, CTabPane } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilWarning } from '@coreui/icons';
import type { PropertySummary, PropertyMetric, UnitMixItem } from './types';

interface PropertyOverviewProps {
  summary: PropertySummary;
}

function MetricCard({
  label,
  value,
  source,
  inferred,
  pending,
}: PropertyMetric) {
  return (
    <div
      className={`card h-100 ${pending ? 'border-dashed opacity-50' : ''}`}
      style={{ background: 'var(--cui-tertiary-bg)' }}
    >
      <div className="card-body p-3">
        <div
          className="text-uppercase text-body-secondary mb-2"
          style={{ fontSize: '11px', letterSpacing: '0.5px' }}
        >
          {label}
        </div>
        <div
          className={`fw-bold ${inferred ? 'text-warning' : 'text-body'}`}
          style={{ fontSize: '28px', lineHeight: 1 }}
        >
          {pending ? '—' : value ?? '—'}
        </div>
        {source && (
          <div className="text-body-secondary mt-1" style={{ fontSize: '10px' }}>
            {inferred && <CIcon icon={cilWarning} size="sm" className="me-1" />}
            {inferred ? 'Inferred from market' : `From: ${source}`}
          </div>
        )}
        {pending && (
          <div className="text-body-secondary mt-1" style={{ fontSize: '10px' }}>
            Needs: {source}
          </div>
        )}
      </div>
    </div>
  );
}

function UnitMixBar({ items }: { items: UnitMixItem[] }) {
  return (
    <div>
      {/* Bar visualization */}
      <div
        className="d-flex rounded overflow-hidden mb-3"
        style={{ height: '40px' }}
      >
        {items.map((item, idx) => (
          <div
            key={idx}
            className="d-flex align-items-center justify-content-center text-white fw-semibold"
            style={{
              width: `${item.percentage}%`,
              background: item.color,
              fontSize: '11px',
              minWidth: item.percentage > 10 ? 'auto' : '0',
            }}
          >
            {item.percentage > 10 && item.type}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="d-flex flex-wrap gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="d-flex align-items-center gap-2" style={{ fontSize: '12px' }}>
            <div
              className="rounded"
              style={{
                width: '12px',
                height: '12px',
                background: item.color,
              }}
            />
            <span className="text-body-secondary">
              {item.type} ({item.count}) - ${item.avgRent.toLocaleString()} avg
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PropertyOverview({ summary }: PropertyOverviewProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'unitMix' | 'financials' | 'comps'>('summary');

  const metrics: PropertyMetric[] = [
    {
      label: 'Total Units',
      value: summary.totalUnits?.toLocaleString() ?? null,
      source: 'Offering Memo',
    },
    {
      label: 'Average Rent',
      value: summary.averageRent ? `$${summary.averageRent.toLocaleString()}` : null,
      source: 'Rent Roll',
    },
    {
      label: 'Occupancy',
      value: summary.occupancy ? `${summary.occupancy}%` : null,
      source: 'Rent Roll',
    },
    {
      label: 'Net Operating Income',
      value: summary.noi ? `$${(summary.noi / 1000000).toFixed(1)}M` : null,
      source: 'T12 Statement',
    },
    {
      label: 'Cap Rate',
      value: summary.capRate ? `${summary.capRate.toFixed(1)}%` : null,
      source: 'market',
      inferred: true,
    },
    {
      label: 'Price / Unit',
      value: summary.pricePerUnit ? `$${summary.pricePerUnit.toLocaleString()}` : null,
      source: 'Asking Price',
      pending: !summary.pricePerUnit,
    },
  ];

  return (
    <div className="h-100 d-flex flex-column">
      <div
        className="card flex-grow-1"
        style={{ background: 'var(--cui-body-bg)' }}
      >
        <div className="card-body p-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0 fw-semibold">Property Overview</h5>
            <CNav variant="pills" className="bg-body-tertiary rounded p-1">
              <CNavItem>
                <CNavLink
                  active={activeTab === 'summary'}
                  onClick={() => setActiveTab('summary')}
                  style={{ fontSize: '12px', padding: '6px 14px', cursor: 'pointer' }}
                >
                  Summary
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'unitMix'}
                  onClick={() => setActiveTab('unitMix')}
                  style={{ fontSize: '12px', padding: '6px 14px', cursor: 'pointer' }}
                >
                  Unit Mix
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'financials'}
                  onClick={() => setActiveTab('financials')}
                  style={{ fontSize: '12px', padding: '6px 14px', cursor: 'pointer' }}
                >
                  Financials
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'comps'}
                  onClick={() => setActiveTab('comps')}
                  style={{ fontSize: '12px', padding: '6px 14px', cursor: 'pointer' }}
                >
                  Comps
                </CNavLink>
              </CNavItem>
            </CNav>
          </div>

          <CTabContent>
            {/* Summary Tab */}
            <CTabPane visible={activeTab === 'summary'}>
              {/* Metrics Grid */}
              <div className="row g-3 mb-4">
                {metrics.map((metric, idx) => (
                  <div key={idx} className="col-md-4">
                    <MetricCard {...metric} />
                  </div>
                ))}
              </div>

              {/* Unit Mix Preview */}
              {summary.unitMix.length > 0 && (
                <div
                  className="card"
                  style={{ background: 'var(--cui-tertiary-bg)' }}
                >
                  <div className="card-body p-3">
                    <h6 className="fw-semibold mb-3" style={{ fontSize: '14px' }}>
                      Unit Mix Distribution
                    </h6>
                    <UnitMixBar items={summary.unitMix} />
                  </div>
                </div>
              )}
            </CTabPane>

            {/* Unit Mix Tab */}
            <CTabPane visible={activeTab === 'unitMix'}>
              {summary.unitMix.length > 0 ? (
                <div className="card" style={{ background: 'var(--cui-tertiary-bg)' }}>
                  <div className="card-body p-4">
                    <UnitMixBar items={summary.unitMix} />

                    {/* Detailed table */}
                    <table className="table table-sm mt-4">
                      <thead>
                        <tr>
                          <th>Unit Type</th>
                          <th className="text-end">Count</th>
                          <th className="text-end">% of Total</th>
                          <th className="text-end">Avg Rent</th>
                          <th className="text-end">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.unitMix.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  className="rounded"
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    background: item.color,
                                  }}
                                />
                                {item.type}
                              </div>
                            </td>
                            <td className="text-end">{item.count}</td>
                            <td className="text-end">{item.percentage.toFixed(1)}%</td>
                            <td className="text-end">${item.avgRent.toLocaleString()}</td>
                            <td className="text-end">
                              ${(item.count * item.avgRent).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-body-secondary py-5">
                  <p>No unit mix data available yet.</p>
                  <p className="small">Upload a rent roll to see unit mix distribution.</p>
                </div>
              )}
            </CTabPane>

            {/* Financials Tab */}
            <CTabPane visible={activeTab === 'financials'}>
              <div className="text-center text-body-secondary py-5">
                <p>Financial analysis will appear here after T12 processing.</p>
              </div>
            </CTabPane>

            {/* Comps Tab */}
            <CTabPane visible={activeTab === 'comps'}>
              <div className="text-center text-body-secondary py-5">
                <p>Market comparables will appear here.</p>
              </div>
            </CTabPane>
          </CTabContent>
        </div>
      </div>
    </div>
  );
}

export default PropertyOverview;
