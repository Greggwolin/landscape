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
import { LandscapeButton } from '@/components/ui/landscape';
import { ExportButton } from '@/components/admin';

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
          <LandscapeButton color="secondary" variant="outline">
            Import from Excel
          </LandscapeButton>
          <ExportButton tabName="Budget" projectId={projectId} />
          <LandscapeButton color="primary">
            Save Budget
          </LandscapeButton>
        </div>
      </div>

      {/* Organizational Level Tabs */}
      <div className="budget-tabs">
        <LandscapeButton
          color={activeTab === 'project' ? 'primary' : 'secondary'}
          variant={activeTab === 'project' ? undefined : 'ghost'}
          onClick={() => setActiveTab('project')}
        >
          Project Level
        </LandscapeButton>
        <LandscapeButton
          color={activeTab === 'area-1' ? 'primary' : 'secondary'}
          variant={activeTab === 'area-1' ? undefined : 'ghost'}
          onClick={() => setActiveTab('area-1')}
        >
          Area 1
        </LandscapeButton>
        <LandscapeButton
          color={activeTab === 'phase-1-1' ? 'primary' : 'secondary'}
          variant={activeTab === 'phase-1-1' ? undefined : 'ghost'}
          onClick={() => setActiveTab('phase-1-1')}
        >
          Phase 1.1
        </LandscapeButton>
      </div>

      {/* Scope Sub-tabs */}
      <div className="budget-subtabs">
        <LandscapeButton
          color={activeScope === 'all' ? 'primary' : 'secondary'}
          variant={activeScope === 'all' ? undefined : 'outline'}
          size="sm"
          onClick={() => setActiveScope('all')}
        >
          All Costs
        </LandscapeButton>
        <LandscapeButton
          color={activeScope === 'Acquisition' ? 'primary' : 'secondary'}
          variant={activeScope === 'Acquisition' ? undefined : 'outline'}
          size="sm"
          onClick={() => setActiveScope('Acquisition')}
        >
          Acquisition
        </LandscapeButton>
        <LandscapeButton
          color={activeScope === 'Stage 1' ? 'primary' : 'secondary'}
          variant={activeScope === 'Stage 1' ? undefined : 'outline'}
          size="sm"
          onClick={() => setActiveScope('Stage 1')}
        >
          Stage 1
        </LandscapeButton>
        <LandscapeButton
          color={activeScope === 'Stage 2' ? 'primary' : 'secondary'}
          variant={activeScope === 'Stage 2' ? undefined : 'outline'}
          size="sm"
          onClick={() => setActiveScope('Stage 2')}
        >
          Stage 2
        </LandscapeButton>
        <LandscapeButton
          color={activeScope === 'Stage 3' ? 'primary' : 'secondary'}
          variant={activeScope === 'Stage 3' ? undefined : 'outline'}
          size="sm"
          onClick={() => setActiveScope('Stage 3')}
        >
          Stage 3
        </LandscapeButton>
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

      {/* Theme-aware styles using CoreUI CSS variables */}
      <style jsx>{`
        .budget-gantt-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 500px;
          color: var(--cui-secondary-color);
        }

        .budget-gantt-loading .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--cui-border-color);
          border-top-color: var(--cui-primary);
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
          background: var(--cui-body-bg);
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
          background: var(--cui-primary);
          color: white;
          border: none;
        }

        .btn-primary:hover {
          background: rgba(var(--cui-primary-rgb), 0.9);
        }

        .btn-secondary {
          background: var(--cui-card-bg);
          color: var(--cui-body-color);
          border: 1px solid var(--cui-border-color);
        }

        .btn-secondary:hover {
          background: var(--cui-tertiary-bg);
        }

        .budget-tabs {
          display: flex;
          gap: 4px;
          background: var(--cui-card-bg);
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
          color: var(--cui-secondary-color);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab:hover {
          color: var(--cui-body-color);
          background: var(--cui-tertiary-bg);
        }

        .tab.active {
          background: var(--cui-primary);
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
          background: var(--cui-card-bg);
          border: 1px solid var(--cui-border-color);
          color: var(--cui-secondary-color);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .subtab:hover {
          border-color: var(--cui-primary);
          color: var(--cui-primary);
        }

        .subtab.active {
          background: var(--cui-primary);
          color: white;
          border-color: var(--cui-primary);
        }

        .budget-summary {
          display: flex;
          gap: 24px;
          background: var(--cui-card-bg);
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
          color: var(--cui-secondary-color);
        }

        .summary-value {
          font-size: 20px;
          font-weight: 600;
          color: var(--cui-body-color);
        }

        .summary-value.positive {
          color: var(--cui-success);
        }

        .summary-value.negative {
          color: var(--cui-danger);
        }

        .budget-grid-wrapper {
          background: var(--cui-card-bg);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
