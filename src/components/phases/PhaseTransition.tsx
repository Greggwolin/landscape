'use client';

import React, { useState } from 'react';
import './phase-transition.css';

interface ChecklistItem {
  id: string;
  name: string;
  detail: string;
  status: 'complete' | 'pending' | 'missing';
}

interface ProFormaRow {
  label: string;
  t12: string;
  year1: string;
  year2: string;
  year3: string;
  assumption: string;
  isTotal?: boolean;
  isNegative?: boolean;
}

interface PhaseTransitionData {
  projectName: string;
  totalUnits: number;
  avgRent: number;
  occupancy: number;
  noi?: number;
  expenseRatio?: number;
  capRate?: number;
  documentsCount: number;
  flagsCount: number;
  checklist: ChecklistItem[];
  // AI message content
  aiMessage: string;
  aiIssue1?: string;
  aiIssue2?: string;
  // Pro forma data
  proForma: ProFormaRow[];
  // Key metrics
  purchasePrice?: number;
  cashOnCash?: number;
  irr5Year?: number;
}

interface PhaseTransitionProps {
  data: PhaseTransitionData;
  onProceedToAnalysis?: () => void;
  onReviewIssues?: () => void;
  onUploadDocument?: () => void;
}

export function PhaseTransition({
  data,
  onProceedToAnalysis,
  onReviewIssues,
  onUploadDocument,
}: PhaseTransitionProps) {
  const [activePhase, setActivePhase] = useState<1 | 2>(1);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('proforma');

  // Calculate progress
  const completeCount = data.checklist.filter(c => c.status === 'complete').length;
  const totalCount = data.checklist.length;
  const progressPercent = Math.round((completeCount / totalCount) * 100);

  const pendingCount = data.checklist.filter(c => c.status === 'pending').length;
  const isReady = pendingCount <= 2 && completeCount >= totalCount - 2;

  // Format currency
  const formatCurrency = (val: number, _decimals = 0) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `$${Math.round(val / 1000)}K`;
    }
    return `$${val.toLocaleString()}`;
  };

  const handleProceed = () => {
    setActivePhase(2);
    onProceedToAnalysis?.();
  };

  return (
    <div className="phases-container">
      {/* Tab Navigation */}
      <nav className="tab-nav">
        <button
          className={`tab-btn ${activePhase === 1 ? 'active' : ''}`}
          onClick={() => setActivePhase(1)}
        >
          Phase 1: Diligence
        </button>
        <button
          className={`tab-btn ${activePhase === 2 ? 'active' : ''}`}
          onClick={() => setActivePhase(2)}
        >
          Phase 2: Analysis
        </button>
      </nav>

      {/* PHASE 1: DILIGENCE */}
      <div className={`phase-container ${activePhase === 1 ? 'active' : ''}`}>
        <div className="phase1-header">
          <h1 className="phase1-title">🌿 Diligence Intake</h1>
          <p className="phase1-subtitle">Upload documents and Landscaper will extract the data you need for analysis</p>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="progress-label">
              <span>{completeCount} of {totalCount} items complete</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        </div>

        <div className="diligence-content">
          {/* Document Checklist */}
          <div className="document-area">
            <div className="area-header">
              <h2 className="area-title">Diligence Checklist</h2>
              <span className="doc-count">{data.documentsCount} documents uploaded</span>
            </div>

            <div className="checklist">
              {data.checklist.map((item) => (
                <div key={item.id} className={`check-item ${item.status}`}>
                  <div className={`check-icon icon-${item.status}`}>
                    {item.status === 'complete' && '✓'}
                    {item.status === 'pending' && '⚠'}
                    {item.status === 'missing' && '○'}
                  </div>
                  <div className="check-info">
                    <div className="check-name">{item.name}</div>
                    <div className="check-detail">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Sidebar */}
          <div className="ai-sidebar">
            <div className="ai-card">
              <div className="ai-header">
                <div className="ai-avatar">🌿</div>
                <div className="ai-name">Landscaper</div>
              </div>
              <div className="ai-text">
                {data.aiMessage}
                {data.aiIssue1 && (
                  <>
                    <br /><br />
                    <strong>1. {data.aiIssue1.split(':')[0]}:</strong> {data.aiIssue1.split(':').slice(1).join(':')}
                  </>
                )}
                {data.aiIssue2 && (
                  <>
                    <br /><br />
                    <strong>2. {data.aiIssue2.split(':')[0]}:</strong> {data.aiIssue2.split(':').slice(1).join(':')}
                  </>
                )}
              </div>
              <div className="ai-actions">
                <button className="ai-btn ai-btn-primary" onClick={onReviewIssues}>Review Issues</button>
                <button className="ai-btn ai-btn-secondary">Ask Question</button>
              </div>
            </div>

            <div className="ai-card">
              <div className="ai-header">
                <div className="ai-avatar">📄</div>
                <div className="ai-name">Quick Add</div>
              </div>
              <div className="ai-text">
                Drop documents here or click to upload. I can read:
                <br />• Offering Memorandums
                <br />• T12 / Operating Statements
                <br />• Rent Rolls
                <br />• Surveys & Site Plans
              </div>
              <div className="ai-actions">
                <button
                  className="ai-btn ai-btn-secondary"
                  style={{ width: '100%' }}
                  onClick={onUploadDocument}
                >
                  + Upload Document
                </button>
              </div>
            </div>

            <div className={`ready-card ${isReady ? '' : 'locked'}`}>
              <div className="ready-icon">📊</div>
              <div className="ready-title">
                {isReady ? 'Ready for Analysis' : 'More Data Needed'}
              </div>
              <div className="ready-text">
                {isReady
                  ? 'You have enough data to proceed. Resolve flagged items for better accuracy.'
                  : `Complete ${totalCount - completeCount} more items to proceed.`}
              </div>
              <button
                className={`ready-btn ${isReady ? '' : 'locked'}`}
                onClick={handleProceed}
                disabled={!isReady}
              >
                Proceed to Analysis →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 2: ANALYSIS */}
      <div className={`phase-container ${activePhase === 2 ? 'active' : ''}`}>
        <div className="phase2-layout">
          {/* Collapsed Sidebar */}
          <aside className="collapsed-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-title">Property Summary</div>
              <div className="mini-card">
                <div className="mini-card-header">
                  <span className="mini-card-label">Units</span>
                  <span className="mini-card-status">✓</span>
                </div>
                <div className="mini-card-value">{data.totalUnits}</div>
              </div>
              <div className="mini-card">
                <div className="mini-card-header">
                  <span className="mini-card-label">Avg Rent</span>
                  <span className="mini-card-status">✓</span>
                </div>
                <div className="mini-card-value">${data.avgRent.toLocaleString()}</div>
              </div>
              <div className="mini-card">
                <div className="mini-card-header">
                  <span className="mini-card-label">Occupancy</span>
                  <span className="mini-card-status">✓</span>
                </div>
                <div className="mini-card-value">{data.occupancy}%</div>
              </div>
              <div className="mini-card">
                <div className="mini-card-header">
                  <span className="mini-card-label">Cap Rate</span>
                  <span className="mini-card-status" style={{ color: data.capRate ? '#22c55e' : '#f59e0b' }}>
                    {data.capRate ? '✓' : '⚠'}
                  </span>
                </div>
                <div className="mini-card-value">{data.capRate?.toFixed(1) || '—'}%</div>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-title">Diligence</div>
              <div className="mini-card" style={{ cursor: 'pointer' }} onClick={() => setActivePhase(1)}>
                <div className="mini-card-header">
                  <span className="mini-card-label">Documents</span>
                </div>
                <div className="mini-card-value" style={{ fontSize: '14px' }}>{data.documentsCount} uploaded</div>
              </div>
              {data.flagsCount > 0 && (
                <div
                  className="mini-card"
                  style={{ cursor: 'pointer', borderLeft: '2px solid #f59e0b' }}
                  onClick={() => setActivePhase(1)}
                >
                  <div className="mini-card-header">
                    <span className="mini-card-label">Flags</span>
                  </div>
                  <div className="mini-card-value" style={{ fontSize: '14px', color: '#f59e0b' }}>{data.flagsCount} items</div>
                </div>
              )}
            </div>

            <div className="sidebar-section">
              <div className="sidebar-title">Ask Landscaper</div>
              <div className="mini-ai-chat">
                <div className="mini-ai-header">
                  <div className="mini-ai-avatar">🌿</div>
                  <div className="mini-ai-name">Landscaper</div>
                </div>
                <input
                  type="text"
                  className="mini-ai-input"
                  placeholder="Ask about this analysis..."
                />
              </div>
            </div>
          </aside>

          {/* Analysis Main Area */}
          <main className="analysis-main">
            <div className="analysis-header">
              <h1 className="analysis-title">{data.projectName} Analysis</h1>
              <div className="analysis-tabs">
                <button
                  className={`analysis-tab ${activeAnalysisTab === 'proforma' ? 'active' : ''}`}
                  onClick={() => setActiveAnalysisTab('proforma')}
                >
                  Pro Forma
                </button>
                <button
                  className={`analysis-tab ${activeAnalysisTab === 'cashflow' ? 'active' : ''}`}
                  onClick={() => setActiveAnalysisTab('cashflow')}
                >
                  Cash Flow
                </button>
                <button
                  className={`analysis-tab ${activeAnalysisTab === 'returns' ? 'active' : ''}`}
                  onClick={() => setActiveAnalysisTab('returns')}
                >
                  Returns
                </button>
                <button
                  className={`analysis-tab ${activeAnalysisTab === 'sensitivity' ? 'active' : ''}`}
                  onClick={() => setActiveAnalysisTab('sensitivity')}
                >
                  Sensitivity
                </button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="metrics-row">
              <div className="metric-box">
                <div className="metric-box-label">Purchase Price</div>
                <div className="metric-box-value">
                  {data.purchasePrice ? formatCurrency(data.purchasePrice) : '—'}
                </div>
                <div className="metric-box-sub">
                  {data.purchasePrice && data.totalUnits
                    ? `$${Math.round(data.purchasePrice / data.totalUnits).toLocaleString()} / unit`
                    : '—'}
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-box-label">Net Operating Income</div>
                <div className="metric-box-value">
                  {data.noi ? formatCurrency(data.noi) : '—'}
                </div>
                <div className="metric-box-sub positive">+4.2% vs T12</div>
              </div>
              <div className="metric-box">
                <div className="metric-box-label">Cash-on-Cash</div>
                <div className="metric-box-value">{data.cashOnCash?.toFixed(1) || '—'}%</div>
                <div className="metric-box-sub">Year 1</div>
              </div>
              <div className="metric-box">
                <div className="metric-box-label">5-Year IRR</div>
                <div className="metric-box-value">{data.irr5Year?.toFixed(1) || '—'}%</div>
                <div className="metric-box-sub positive">Above target</div>
              </div>
            </div>

            {/* Spreadsheet */}
            <div className="spreadsheet">
              <div className="spreadsheet-header">
                <h3 className="spreadsheet-title">Operating Pro Forma</h3>
                <div className="spreadsheet-actions">
                  <button className="sheet-btn">Export</button>
                  <button className="sheet-btn">Scenarios</button>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Line Item</th>
                    <th>T12 Actual</th>
                    <th>Year 1</th>
                    <th>Year 2</th>
                    <th>Year 3</th>
                    <th>Assumptions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.proForma.map((row, idx) => (
                    <tr key={idx} className={row.isTotal ? 'row-total' : ''}>
                      <td className="row-label">{row.label}</td>
                      <td className={row.isNegative ? 'negative' : ''}>{row.t12}</td>
                      <td className={`${row.isNegative ? 'negative' : ''} ${!row.isTotal ? 'editable' : ''}`}>{row.year1}</td>
                      <td className={row.isNegative ? 'negative' : ''}>{row.year2}</td>
                      <td className={row.isNegative ? 'negative' : ''}>{row.year3}</td>
                      <td className={`muted ${!row.isTotal ? 'editable' : ''}`}>{row.assumption}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default PhaseTransition;
