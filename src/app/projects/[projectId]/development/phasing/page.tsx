'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';

type CostCurveType = 'linear' | 's-curve' | 'front-loaded' | 'back-loaded' | 'custom';

export default function DevelopmentPhasingPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [selectedCurve, setSelectedCurve] = useState<CostCurveType>('s-curve');
  const [showCostLibrary, setShowCostLibrary] = useState(false);

  // Render cost curve preview
  const renderCurvePreview = () => {
    let pathData = '';
    let description = '';

    switch (selectedCurve) {
      case 'linear':
        pathData = 'M 20 180 L 280 20';
        description = 'Even distribution of costs over time';
        break;
      case 's-curve':
        pathData = 'M 20 180 Q 80 160, 150 100 T 280 20';
        description = 'Slow start, peak in middle, slow end (typical construction)';
        break;
      case 'front-loaded':
        pathData = 'M 20 180 Q 100 80, 150 40 Q 200 20, 280 20';
        description = 'Heavy costs early, tapering off';
        break;
      case 'back-loaded':
        pathData = 'M 20 180 Q 100 160, 150 120 Q 200 60, 280 20';
        description = 'Light costs early, heavy costs late';
        break;
      case 'custom':
        pathData = 'M 20 180 L 100 140 L 150 80 L 200 100 L 280 20';
        description = 'Drag points to customize distribution';
        break;
    }

    return (
      <div className="border rounded p-3 bg-white">
        <div className="small text-muted mb-2">{description}</div>
        <svg width="100%" height="200" viewBox="0 0 300 200">
          {/* Grid lines */}
          <line x1="20" y1="180" x2="280" y2="180" stroke="#e0e0e0" strokeWidth="1" />
          <line x1="20" y1="140" x2="280" y2="140" stroke="#e0e0e0" strokeWidth="1" />
          <line x1="20" y1="100" x2="280" y2="100" stroke="#e0e0e0" strokeWidth="1" />
          <line x1="20" y1="60" x2="280" y2="60" stroke="#e0e0e0" strokeWidth="1" />
          <line x1="20" y1="20" x2="280" y2="20" stroke="#e0e0e0" strokeWidth="1" />

          {/* Axes */}
          <line x1="20" y1="20" x2="20" y2="180" stroke="#333" strokeWidth="2" />
          <line x1="20" y1="180" x2="280" y2="180" stroke="#333" strokeWidth="2" />

          {/* Curve */}
          <path
            d={pathData}
            fill="none"
            stroke="#0d6efd"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Area under curve */}
          <path
            d={`${pathData} L 280 180 L 20 180 Z`}
            fill="#0d6efd"
            fillOpacity="0.1"
          />

          {/* Axis labels */}
          <text x="150" y="197" textAnchor="middle" fontSize="12" fill="#666">
            Time
          </text>
          <text x="10" y="100" textAnchor="middle" fontSize="12" fill="#666" transform="rotate(-90, 10, 100)">
            Cost
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="row">
      {/* Left Panel - Cost Curve Builder */}
      <div className="col-md-5">
        <div className="card mb-3">
          <div className="card-header">
            <h5 className="mb-0">Cost Curve Selection</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Curve Type</label>
              <select
                className="form-select"
                value={selectedCurve}
                onChange={(e) => setSelectedCurve(e.target.value as CostCurveType)}
              >
                <option value="linear">Linear (Even Distribution)</option>
                <option value="s-curve">S-Curve (Typical Construction)</option>
                <option value="front-loaded">Front-Loaded</option>
                <option value="back-loaded">Back-Loaded</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Curve Preview */}
            {renderCurvePreview()}

            {selectedCurve === 'custom' && (
              <div className="alert alert-info mt-3 small">
                <i className="bi bi-info-circle me-2"></i>
                Drag points on the chart to customize the distribution curve.
              </div>
            )}

            <div className="mt-3">
              <button className="btn btn-success w-100" disabled>
                Apply to Budget Categories
              </button>
            </div>
          </div>
        </div>

        {/* Cost Library Window */}
        <div className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Cost Library</h5>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setShowCostLibrary(!showCostLibrary)}
            >
              {showCostLibrary ? 'Hide' : 'Browse'}
            </button>
          </div>

          {showCostLibrary && (
            <div className="card-body">
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search cost items..."
                />
              </div>

              <div className="alert alert-info small">
                <strong>Placeholder:</strong> Cost library items from Admin will appear here.
                <ul className="mt-2 mb-0 small">
                  <li>Browse global cost library (read-only)</li>
                  <li>Search and filter cost items</li>
                  <li>View unit costs, regions, and dates</li>
                  <li>Add selected items to project budget</li>
                </ul>
              </div>

              <div className="list-group list-group-flush">
                <div className="list-group-item p-2 small">
                  <div className="fw-semibold">Sample Cost Item 1</div>
                  <div className="text-muted">$125.00 per unit • Southwest Region</div>
                </div>
                <div className="list-group-item p-2 small">
                  <div className="fw-semibold">Sample Cost Item 2</div>
                  <div className="text-muted">$85.50 per SF • National Average</div>
                </div>
                <div className="list-group-item p-2 small">
                  <div className="fw-semibold">Sample Cost Item 3</div>
                  <div className="text-muted">$2,450.00 per acre • California</div>
                </div>
              </div>

              <div className="mt-3">
                <a href={`/admin`} className="btn btn-sm btn-secondary w-100">
                  <i className="bi bi-box-arrow-up-right me-2"></i>
                  Open Full Cost Library in Admin
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Phase Timing Section */}
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Phase Timing & Sequencing</h5>
          </div>
          <div className="card-body">
            <div className="alert alert-info">
              <strong>Placeholder:</strong> Phase timing tools will appear here.
              <ul className="mt-2 mb-0">
                <li>Timeline/Gantt chart showing phases</li>
                <li>Drag phases to adjust timing</li>
                <li>Set dependencies between phases</li>
                <li>Link to sales absorption rates</li>
              </ul>
            </div>

            <button className="btn btn-primary" disabled>
              <i className="bi bi-calendar-plus me-2"></i>
              Configure Phase Timing
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Cost Distribution Visualization */}
      <div className="col-md-7">
        <div className="card" style={{ height: 'calc(100vh - 300px)' }}>
          <div className="card-header">
            <h5 className="mb-0">Development Schedule & Cost Distribution</h5>
          </div>
          <div className="card-body">
            <div className="alert alert-warning">
              <strong>Coming Soon:</strong> This panel will display:
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="card border-0 bg-light mb-3">
                  <div className="card-body">
                    <h6 className="card-title">
                      <i className="bi bi-calendar-week me-2"></i>
                      Development Schedule
                    </h6>
                    <ul className="small">
                      <li>Timeline visualization over months/years</li>
                      <li>Phase delivery sequence</li>
                      <li>Milestone markers</li>
                      <li>Critical path indicators</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card border-0 bg-light mb-3">
                  <div className="card-body">
                    <h6 className="card-title">
                      <i className="bi bi-graph-up me-2"></i>
                      Cost Curves
                    </h6>
                    <ul className="small">
                      <li>Cost distribution curves by phase</li>
                      <li>Cumulative spend tracking</li>
                      <li>Budget vs. actual comparison</li>
                      <li>Cash flow implications</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card border-0 bg-light mb-3">
                  <div className="card-body">
                    <h6 className="card-title">
                      <i className="bi bi-diagram-3 me-2"></i>
                      Dependencies
                    </h6>
                    <ul className="small">
                      <li>Phase dependencies visualization</li>
                      <li>Prerequisite completion tracking</li>
                      <li>Trigger conditions</li>
                      <li>Contingency paths</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card border-0 bg-light mb-3">
                  <div className="card-body">
                    <h6 className="card-title">
                      <i className="bi bi-cart-check me-2"></i>
                      Sales Integration
                    </h6>
                    <ul className="small">
                      <li>Sales pace overlay</li>
                      <li>Phase triggering by sales velocity</li>
                      <li>Inventory management</li>
                      <li>Revenue timing alignment</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-4">
              <div className="bg-white border rounded p-5">
                <i className="bi bi-bar-chart" style={{ fontSize: '4rem', color: '#ccc' }}></i>
                <p className="text-muted mt-3">Interactive visualization coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
