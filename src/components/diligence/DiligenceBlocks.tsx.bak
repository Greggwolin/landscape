'use client';

import React from 'react';
import './diligence-blocks.css';

interface UnitMixItem {
  type: string;
  count: number;
  avgRent: number;
  sqft?: number;
}

interface DiligenceData {
  projectName: string;
  totalUnits: number;
  avgRent: number;
  occupancy: number;
  belowMarketUnits?: number;
  noi?: number;
  grossRevenue?: number;
  expenses?: number;
  expenseRatio?: number;
  capRate?: number;
  capRateRange?: { min: number; max: number };
  compsAvg?: number;
  unitMix: UnitMixItem[];
  askingPrice?: number;
  yearBuilt?: number;
  buildingSF?: number;
  landArea?: string;
  stories?: number;
  parking?: number;
  rentRollSource?: string;
  t12Source?: string;
  omSource?: string;
  // Status flags
  hasRentRoll: boolean;
  hasT12: boolean;
  hasCapRate: boolean;
  hasAskingPrice: boolean;
  hasMarketComps: boolean;
  hasPropertyDetails: boolean;
  // Alert
  t12Alert?: string;
}

interface DiligenceBlocksProps {
  data: DiligenceData;
  onConfirm?: (blockId: string) => void;
  onEdit?: (blockId: string) => void;
  onAddValue?: (blockId: string, value: string) => void;
  onAnalyze?: () => void;
}

export function DiligenceBlocks({
  data,
  onConfirm,
  onEdit,
  onAddValue,
  onAnalyze,
}: DiligenceBlocksProps) {
  // Calculate progress
  const blocks = [
    { id: 'rent_roll', confirmed: data.hasRentRoll },
    { id: 't12', confirmed: data.hasT12, needsReview: data.hasT12 && !!data.t12Alert },
    { id: 'cap_rate', confirmed: data.hasCapRate, inferred: !data.hasCapRate && !!data.capRate },
    { id: 'unit_mix', confirmed: data.unitMix.length > 0 },
    { id: 'asking_price', confirmed: data.hasAskingPrice },
    { id: 'market_comps', confirmed: data.hasMarketComps, processing: !data.hasMarketComps },
    { id: 'property_details', confirmed: data.hasPropertyDetails },
  ];

  const confirmed = blocks.filter(b => b.confirmed && !b.needsReview).length;
  const needsReview = blocks.filter(b => b.needsReview || b.inferred).length;
  const missing = blocks.filter(b => !b.confirmed && !b.processing && !b.inferred).length;
  const total = blocks.length;
  const progressPercent = Math.round((confirmed / total) * 100);
  const strokeDashoffset = 226 - (progressPercent / 100) * 226;

  const isReady = confirmed >= total - 1 && needsReview === 0;

  // Format currency
  const formatCurrency = (val: number, decimals = 0) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `$${(val / 1000).toFixed(decimals)}K`;
    }
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="diligence-container">
      {/* Header */}
      <header className="diligence-header">
        <div className="diligence-logo">🌿 Landscaper</div>
        <div className="diligence-project-name">{data.projectName} - {data.totalUnits} Units</div>
        <div className="diligence-header-actions">
          <button className="diligence-upload-btn">
            <span>📁</span> Add Documents
          </button>
          <button
            className={`diligence-analyze-btn ${isReady ? 'ready' : ''}`}
            onClick={onAnalyze}
            disabled={!isReady}
          >
            Proceed to Analysis →
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="diligence-main-content">
        {/* AI Status Banner */}
        <div className="ai-banner">
          <div className="ai-avatar">🌿</div>
          <div className="ai-message">
            <div className="ai-message-title">
              {needsReview > 0 || missing > 0
                ? `I've analyzed your documents and found a few things that need attention`
                : `All data confirmed! Ready for analysis.`}
            </div>
            <div className="ai-message-text">
              {needsReview > 0 && (
                <>
                  <strong>{needsReview} item{needsReview > 1 ? 's' : ''} need{needsReview === 1 ? 's' : ''} review</strong> before we can run a complete analysis.
                  {data.t12Alert && ` ${data.t12Alert}`}
                </>
              )}
              {needsReview === 0 && missing > 0 && (
                <>
                  <strong>{missing} item{missing > 1 ? 's' : ''} missing</strong>. Add the data or proceed with estimates.
                </>
              )}
              {needsReview === 0 && missing === 0 && (
                <>All required data has been confirmed from your documents.</>
              )}
            </div>
          </div>
          <div className="banner-actions">
            {needsReview > 0 && <button className="banner-btn">Review all issues</button>}
            <button className="banner-btn">Ask a question</button>
          </div>
        </div>

        {/* Blocks Grid */}
        <div className="blocks-grid">
          {/* Rent Roll Block */}
          <div className={`data-block ${data.hasRentRoll ? 'confirmed' : 'missing'}`}>
            <div className="block-header">
              <span className="block-title"><span className="block-icon">📋</span> Rent Roll</span>
              <span className={`block-status ${data.hasRentRoll ? 'status-found' : 'status-missing'}`}>
                {data.hasRentRoll ? '✓ Found' : 'Missing'}
              </span>
            </div>
            <div className="block-body">
              {data.hasRentRoll ? (
                <>
                  <div className="metric-display">
                    <div className="metric-main">{data.totalUnits}</div>
                    <div className="metric-sub">Total Units</div>
                  </div>
                  <ul className="data-list">
                    <li><span className="label">Avg Rent</span><span className="value">${data.avgRent.toLocaleString()}</span></li>
                    <li><span className="label">Occupancy</span><span className="value">{data.occupancy}%</span></li>
                    {data.belowMarketUnits !== undefined && data.belowMarketUnits > 0 && (
                      <li><span className="label">Below Market</span><span className="value warning">{data.belowMarketUnits} units</span></li>
                    )}
                  </ul>
                  {data.rentRollSource && (
                    <div className="metric-source"><strong>Source:</strong> {data.rentRollSource}</div>
                  )}
                </>
              ) : (
                <div className="missing-content">
                  <div className="missing-icon">📋</div>
                  <div className="missing-text">No rent roll found in documents</div>
                  <div className="missing-hint">Upload a rent roll to continue</div>
                </div>
              )}
            </div>
          </div>

          {/* T12 / Operating Statement Block */}
          <div className={`data-block ${data.hasT12 ? (data.t12Alert ? 'pending' : 'confirmed') : 'missing'}`}>
            <div className="block-header">
              <span className="block-title"><span className="block-icon">📊</span> Operating Statement</span>
              <span className={`block-status ${data.hasT12 ? (data.t12Alert ? 'status-review' : 'status-found') : 'status-missing'}`}>
                {data.hasT12 ? (data.t12Alert ? '⚠ Review' : '✓ Found') : 'Missing'}
              </span>
            </div>
            <div className="block-body">
              {data.hasT12 && data.noi ? (
                <>
                  <div className="metric-display">
                    <div className="metric-main">{formatCurrency(data.noi)}</div>
                    <div className="metric-sub">Net Operating Income</div>
                  </div>
                  <ul className="data-list">
                    {data.grossRevenue && (
                      <li><span className="label">Gross Revenue</span><span className="value">{formatCurrency(data.grossRevenue)}</span></li>
                    )}
                    {data.expenses && (
                      <li><span className="label">Expenses</span><span className="value">{formatCurrency(data.expenses)}</span></li>
                    )}
                    {data.expenseRatio && (
                      <li><span className="label">Expense Ratio</span><span className="value">{data.expenseRatio}%</span></li>
                    )}
                  </ul>
                  {data.t12Alert && (
                    <div className="alert-box">
                      <div className="alert-title">⚠️ Attention</div>
                      <div className="alert-text">{data.t12Alert}</div>
                    </div>
                  )}
                  {data.t12Source && (
                    <div className="metric-source"><strong>Source:</strong> {data.t12Source}</div>
                  )}
                </>
              ) : (
                <div className="missing-content">
                  <div className="missing-icon">📊</div>
                  <div className="missing-text">No T12 found in documents</div>
                  <div className="missing-hint">Upload an operating statement</div>
                </div>
              )}
            </div>
            {data.hasT12 && data.t12Alert && (
              <div className="block-actions">
                <button className="block-btn btn-confirm" onClick={() => onConfirm?.('t12')}>✓ Confirm</button>
                <button className="block-btn btn-edit" onClick={() => onEdit?.('t12')}>Edit</button>
              </div>
            )}
          </div>

          {/* Cap Rate Block */}
          <div className={`data-block ${data.hasCapRate ? 'confirmed' : data.capRate ? 'inferred' : 'missing'}`}>
            <div className="block-header">
              <span className="block-title"><span className="block-icon">📈</span> Cap Rate</span>
              <span className={`block-status ${data.hasCapRate ? 'status-found' : data.capRate ? 'status-inferred' : 'status-missing'}`}>
                {data.hasCapRate ? '✓ Found' : data.capRate ? '⚡ Inferred' : 'Missing'}
              </span>
            </div>
            <div className="block-body">
              {data.capRate ? (
                <>
                  <div className="metric-display">
                    <div className={`metric-main ${!data.hasCapRate ? 'inferred' : ''}`}>{data.capRate.toFixed(1)}%</div>
                    <div className="metric-sub">{data.hasCapRate ? 'From Documents' : 'Market Estimate'}</div>
                  </div>
                  <ul className="data-list">
                    {data.capRateRange && (
                      <li><span className="label">Market Range</span><span className="value">{data.capRateRange.min}% - {data.capRateRange.max}%</span></li>
                    )}
                    {data.compsAvg && (
                      <li><span className="label">Comps Avg</span><span className="value">{data.compsAvg}%</span></li>
                    )}
                    {!data.hasCapRate && (
                      <li><span className="label">Confidence</span><span className="value warning">Medium</span></li>
                    )}
                  </ul>
                  {!data.hasCapRate && (
                    <div className="inline-prompt">
                      <div className="prompt-label">🌿 Landscaper can help</div>
                      <input
                        type="text"
                        className="prompt-input"
                        placeholder="Enter actual cap rate or asking price..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onAddValue?.('cap_rate', (e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                    </div>
                  )}
                  <div className="metric-source"><strong>Basis:</strong> LA MF comps Q4 2025</div>
                </>
              ) : (
                <>
                  <div className="missing-content">
                    <div className="missing-icon">📈</div>
                    <div className="missing-text">No cap rate found</div>
                    <div className="missing-hint">Enter manually or provide asking price</div>
                  </div>
                  <div className="inline-prompt">
                    <div className="prompt-label">Enter cap rate</div>
                    <input
                      type="text"
                      className="prompt-input"
                      placeholder="5.5%"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onAddValue?.('cap_rate', (e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            {data.capRate && !data.hasCapRate && (
              <div className="block-actions">
                <button className="block-btn btn-confirm" onClick={() => onConfirm?.('cap_rate')}>✓ Accept</button>
                <button className="block-btn btn-edit" onClick={() => onEdit?.('cap_rate')}>Override</button>
              </div>
            )}
          </div>

          {/* Unit Mix Block - Wide */}
          <div className={`data-block wide ${data.unitMix.length > 0 ? 'confirmed' : 'missing'}`}>
            <div className="block-header">
              <span className="block-title"><span className="block-icon">🏠</span> Unit Mix</span>
              <span className={`block-status ${data.unitMix.length > 0 ? 'status-found' : 'status-missing'}`}>
                {data.unitMix.length > 0 ? '✓ Found' : 'Missing'}
              </span>
            </div>
            <div className="block-body">
              {data.unitMix.length > 0 ? (
                <>
                  <ul className="data-list">
                    {data.unitMix.map((unit, idx) => (
                      <li key={idx}>
                        <span className="label">{unit.type} ({unit.count} units)</span>
                        <span className="value">
                          ${unit.avgRent.toLocaleString()} avg
                          {unit.sqft ? ` · ${unit.sqft.toLocaleString()} SF` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {(data.rentRollSource || data.omSource) && (
                    <div className="metric-source">
                      <strong>Source:</strong> {[data.rentRollSource, data.omSource].filter(Boolean).join(', ')}
                    </div>
                  )}
                </>
              ) : (
                <div className="missing-content">
                  <div className="missing-icon">🏠</div>
                  <div className="missing-text">No unit mix data found</div>
                  <div className="missing-hint">Upload a rent roll with unit types</div>
                </div>
              )}
            </div>
          </div>

          {/* Asking Price Block */}
          <div className={`data-block ${data.hasAskingPrice ? 'confirmed' : 'missing'}`}>
            <div className="block-header">
              <span className="block-title"><span className="block-icon">💰</span> Asking Price</span>
              <span className={`block-status ${data.hasAskingPrice ? 'status-found' : 'status-missing'}`}>
                {data.hasAskingPrice ? '✓ Found' : 'Missing'}
              </span>
            </div>
            <div className="block-body">
              {data.hasAskingPrice && data.askingPrice ? (
                <>
                  <div className="metric-display">
                    <div className="metric-main">{formatCurrency(data.askingPrice)}</div>
                    <div className="metric-sub">${Math.round(data.askingPrice / data.totalUnits).toLocaleString()}/unit</div>
                  </div>
                  {data.omSource && (
                    <div className="metric-source"><strong>Source:</strong> {data.omSource}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="missing-content">
                    <div className="missing-icon">💰</div>
                    <div className="missing-text">No asking price found in documents</div>
                    <div className="missing-hint">Add a document with pricing or enter manually</div>
                  </div>
                  <div className="inline-prompt">
                    <div className="prompt-label">Enter asking price</div>
                    <input
                      type="text"
                      className="prompt-input"
                      placeholder="$25,000,000"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onAddValue?.('asking_price', (e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            {!data.hasAskingPrice && (
              <div className="block-actions">
                <button className="block-btn btn-add" onClick={() => onEdit?.('asking_price')}>+ Add Value</button>
              </div>
            )}
          </div>

          {/* Market Comps Block */}
          <div className={`data-block ${data.hasMarketComps ? 'confirmed' : 'processing'}`}>
            <div className="block-header">
              <span className="block-title"><span className="block-icon">🗺️</span> Market Comps</span>
              <span className={`block-status ${data.hasMarketComps ? 'status-found' : 'status-processing'}`}>
                {data.hasMarketComps ? '✓ Found' : 'Searching...'}
              </span>
            </div>
            <div className="block-body">
              {data.hasMarketComps ? (
                <ul className="data-list">
                  <li><span className="label">Avg $/Unit</span><span className="value">$185,000</span></li>
                  <li><span className="label">Avg Cap Rate</span><span className="value">5.2%</span></li>
                  <li><span className="label">Comps Found</span><span className="value">6 sales</span></li>
                </ul>
              ) : (
                <div className="missing-content">
                  <div className="missing-icon">🔍</div>
                  <div className="missing-text">Searching for comparable sales...</div>
                  <div className="missing-hint">Finding properties within 3 miles, 2022-2025</div>
                </div>
              )}
            </div>
          </div>

          {/* Property Details Block */}
          <div className={`data-block ${data.hasPropertyDetails ? 'confirmed' : 'missing'}`}>
            <div className="block-header">
              <span className="block-title"><span className="block-icon">🏢</span> Property Details</span>
              <span className={`block-status ${data.hasPropertyDetails ? 'status-found' : 'status-missing'}`}>
                {data.hasPropertyDetails ? '✓ Found' : 'Missing'}
              </span>
            </div>
            <div className="block-body">
              {data.hasPropertyDetails ? (
                <>
                  <ul className="data-list">
                    {data.yearBuilt && <li><span className="label">Year Built</span><span className="value">{data.yearBuilt}</span></li>}
                    {data.buildingSF && <li><span className="label">Building SF</span><span className="value">{data.buildingSF.toLocaleString()}</span></li>}
                    {data.landArea && <li><span className="label">Land Area</span><span className="value">{data.landArea}</span></li>}
                    {data.stories && <li><span className="label">Stories</span><span className="value">{data.stories}</span></li>}
                    {data.parking && <li><span className="label">Parking</span><span className="value">{data.parking} spaces</span></li>}
                  </ul>
                  {data.omSource && (
                    <div className="metric-source"><strong>Source:</strong> {data.omSource}</div>
                  )}
                </>
              ) : (
                <div className="missing-content">
                  <div className="missing-icon">🏢</div>
                  <div className="missing-text">No property details found</div>
                  <div className="missing-hint">Upload an offering memo</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="progress-summary">
          <div className="progress-ring">
            <svg width="80" height="80">
              <circle className="progress-bg" cx="40" cy="40" r="36"/>
              <circle
                className="progress-fill"
                cx="40"
                cy="40"
                r="36"
                style={{ strokeDashoffset }}
              />
            </svg>
            <div className="progress-text">{progressPercent}%</div>
          </div>
          <div className="progress-details">
            <div className="progress-title">Diligence Progress</div>
            <div className="progress-items">
              <div className="progress-item">
                <span className="progress-dot dot-complete"></span>
                <span>{confirmed} Confirmed</span>
              </div>
              <div className="progress-item">
                <span className="progress-dot dot-review"></span>
                <span>{needsReview} Need Review</span>
              </div>
              <div className="progress-item">
                <span className="progress-dot dot-missing"></span>
                <span>{missing} Missing</span>
              </div>
            </div>
          </div>
          <button
            className={`diligence-analyze-btn ${isReady ? 'ready' : ''}`}
            onClick={onAnalyze}
            disabled={!isReady}
          >
            Proceed to Analysis →
          </button>
        </div>
      </main>
    </div>
  );
}

export default DiligenceBlocks;
