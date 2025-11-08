/**
 * Budget Page with Custom Grid and Timeline
 *
 * Displays budget items in a data grid with SVG timeline visualization.
 * Supports tabs for different organizational levels (Project, Area, Phase) and scope filters.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import BudgetGridWithTimeline from '@/components/budget/custom/BudgetGridWithTimeline';
import '@/components/budget/custom/BudgetGrid.css';

export default function BudgetPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // Tab state for organizational level
  const [activeTab, setActiveTab] = useState('project');

  // Sub-tab state for scope (cost phase)
  const [activeScope, setActiveScope] = useState('all');

  // Extract level and entity ID from active tab
  const { level, entityId } = useMemo(() => {
    if (activeTab === 'project') {
      return { level: 'project', entityId: projectId };
    }
    if (activeTab.startsWith('area-')) {
      const id = activeTab.split('-')[1];
      return { level: 'area', entityId: id };
    }
    if (activeTab.startsWith('phase-')) {
      const id = activeTab.split('-')[1];
      return { level: 'phase', entityId: id };
    }
    return { level: 'project', entityId: projectId };
  }, [activeTab, projectId]);

  return (
    <div className="budget-page">
      {/* Page Header */}
      <div className="budget-header">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Project Budget
        </h1>
        <div className="budget-header-actions">
          <button className="btn-secondary">
            Import from Excel
          </button>
          <button className="btn-secondary">
            Export to PDF
          </button>
          <button className="btn-primary">
            Save Budget
          </button>
        </div>
      </div>

      {/* Organizational Level Tabs */}
      <div className="budget-tabs">
        <button
          className={`tab ${activeTab === 'project' ? 'active' : ''}`}
          onClick={() => setActiveTab('project')}
        >
          Project Level
        </button>
        <button
          className={`tab ${activeTab === 'area-1' ? 'active' : ''}`}
          onClick={() => setActiveTab('area-1')}
        >
          Area 1
        </button>
        <button
          className={`tab ${activeTab === 'phase-1-1' ? 'active' : ''}`}
          onClick={() => setActiveTab('phase-1-1')}
        >
          Phase 1.1
        </button>
      </div>

      {/* Scope Sub-tabs */}
      <div className="budget-subtabs">
        <button
          className={`subtab ${activeScope === 'all' ? 'active' : ''}`}
          onClick={() => setActiveScope('all')}
        >
          All Costs
        </button>
        <button
          className={`subtab ${activeScope === 'Acquisition' ? 'active' : ''}`}
          onClick={() => setActiveScope('Acquisition')}
        >
          Acquisition
        </button>
        <button
          className={`subtab ${activeScope === 'Stage 1' ? 'active' : ''}`}
          onClick={() => setActiveScope('Stage 1')}
        >
          Stage 1
        </button>
        <button
          className={`subtab ${activeScope === 'Stage 2' ? 'active' : ''}`}
          onClick={() => setActiveScope('Stage 2')}
        >
          Stage 2
        </button>
        <button
          className={`subtab ${activeScope === 'Stage 3' ? 'active' : ''}`}
          onClick={() => setActiveScope('Stage 3')}
        >
          Stage 3
        </button>
      </div>

      {/* Budget Summary Bar */}
      <div className="budget-summary">
        <div className="summary-item">
          <span className="summary-label">Total Budget:</span>
          <span className="summary-value">$12,450,000</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Costs:</span>
          <span className="summary-value">$11,280,500</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Contingency:</span>
          <span className="summary-value">$1,169,500</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Variance:</span>
          <span className="summary-value positive">+$1,169,500</span>
        </div>
      </div>

      {/* Budget Grid with Timeline */}
      <div className="budget-grid-wrapper">
        <BudgetGridWithTimeline
          projectId={parseInt(projectId)}
          scope={activeScope}
          level={level}
          entityId={entityId}
        />
      </div>

      {/* Inline styles for now - move to CSS file later */}
      <style jsx>{`
        .budget-gantt-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 500px;
          color: #94a3b8;
        }

        .budget-gantt-loading .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #334155;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .budget-page {
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .budget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .budget-header-actions {
          display: flex;
          gap: 12px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #f9fafb;
        }

        .budget-tabs {
          display: flex;
          gap: 4px;
          background: white;
          border-radius: 8px;
          padding: 4px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .tab {
          padding: 10px 20px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #374151;
          background: #f3f4f6;
        }

        .tab.active {
          background: #3b82f6;
          color: white;
        }

        .budget-subtabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .subtab {
          padding: 8px 16px;
          border-radius: 6px;
          background: white;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .subtab:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .subtab.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .budget-summary {
          display: flex;
          gap: 24px;
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-label {
          font-size: 14px;
          color: #6b7280;
        }

        .summary-value {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .summary-value.positive {
          color: #10b981;
        }

        .summary-value.negative {
          color: #ef4444;
        }

        .budget-grid-wrapper {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        @media (prefers-color-scheme: dark) {
          .budget-page {
            background: #0f172a;
          }

          .budget-tabs,
          .budget-summary,
          .budget-grid-wrapper {
            background: #1e293b;
          }

          .btn-secondary {
            background: #1e293b;
            color: #e2e8f0;
            border-color: #334155;
          }

          .btn-secondary:hover {
            background: #334155;
          }

          .subtab {
            background: #1e293b;
            border-color: #334155;
            color: #94a3b8;
          }

          .summary-label {
            color: #94a3b8;
          }

          .summary-value {
            color: #e2e8f0;
          }
        }
      `}</style>
    </div>
  );
}
