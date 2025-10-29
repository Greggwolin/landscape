'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import Navigation from '@/app/components/Navigation';
import { PROPERTY_TYPE_TEMPLATES, PropertyType, getPropertyTypeTemplate } from '@/types/propertyTypes';
import MapView from '@/app/components/MapView';
import ProjectTabMap from '@/components/map/ProjectTabMap';

// Tab definitions - property type specific
const GENERIC_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'financial', label: 'Financial' },
  { id: 'assumptions', label: 'Assumptions' },
  { id: 'planning', label: 'Planning' },
  { id: 'documents', label: 'Documents' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' }
];

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { activeProject, projects } = useProjectContext();
  const [activeTab, setActiveTab] = useState('rent-roll');
  const [activeView, setActiveView] = useState('project-overview');

  // Find the project from URL or use active project
  const currentProject = projects.find(p => p.project_id === Number(projectId)) || activeProject;

  // Determine property type and tabs
  const propertyType = currentProject?.property_type_code?.toLowerCase() || '';
  const isMultifamily = propertyType.includes('multifamily') || propertyType.includes('multi');

  // For multifamily, redirect to the full prototype page
  if (isMultifamily) {
    if (typeof window !== 'undefined') {
      window.location.href = '/prototypes/multifam/rent-roll-inputs';
    }
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p style={{ color: 'var(--cui-secondary-color)' }}>Redirecting to multifamily underwriting...</p>
        </div>
      </div>
    );
  }

  const TABS = GENERIC_TABS;

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <Navigation activeView={activeView} setActiveView={setActiveView} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Project Selector in upper left corner */}
        <div
          className="px-6 py-3 border-b flex items-center"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <select
            value={currentProject?.project_id || ''}
            onChange={(e) => {
              const newProjectId = Number(e.target.value);
              window.location.href = `/projects/${newProjectId}/overview`;
            }}
            className="px-3 py-2 text-sm font-semibold rounded focus:outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
              border: '1px solid var(--cui-border-color)'
            }}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                {project.project_name} - {project.property_type_code || 'Unknown Type'}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Navigation */}
        <div
          className="border-b px-6"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-3 text-sm font-medium transition-colors relative"
                  style={{
                    color: isActive ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                    borderBottom: isActive ? '2px solid var(--cui-primary)' : '2px solid transparent'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Multifamily-specific tabs */}
          {isMultifamily && (
            <>
              {activeTab === 'rent-roll' && <RentRollUnitMixTab projectId={projectId} project={currentProject} />}
              {activeTab === 'opex' && <OpexTab projectId={projectId} />}
              {activeTab === 'market-rates' && <MarketRatesTab projectId={projectId} />}
              {activeTab === 'capitalization' && <CapitalizationTab projectId={projectId} />}
            </>
          )}

          {/* Generic tabs */}
          {!isMultifamily && (
            <>
              {activeTab === 'overview' && <OverviewTab projectId={projectId} project={currentProject} />}
              {activeTab === 'financial' && <FinancialTab projectId={projectId} />}
              {activeTab === 'assumptions' && <AssumptionsTab projectId={projectId} />}
              {activeTab === 'planning' && <PlanningTab projectId={projectId} />}
              {activeTab === 'documents' && <DocumentsTab projectId={projectId} />}
              {activeTab === 'reports' && <ReportsTab projectId={projectId} />}
              {activeTab === 'settings' && <SettingsTab projectId={projectId} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component (from handoff PL012)
 
function OverviewTab({ projectId, project }: { projectId: string; project: Record<string, unknown> }) {
  const [selectedPropertyType, setSelectedPropertyType] = useState<PropertyType>('multifamily');
  const template = getPropertyTypeTemplate(selectedPropertyType);

  // Show project info if available
  const projectInfo = project ? (
    <div
      className="rounded-lg p-4 mb-6"
      style={{
        backgroundColor: 'var(--cui-secondary-bg)',
        border: '1px solid var(--cui-border-color)'
      }}
    >
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div style={{ color: 'var(--cui-secondary-color)' }}>Project ID</div>
          <div style={{ color: 'var(--cui-body-color)' }} className="font-medium">{project.project_id}</div>
        </div>
        <div>
          <div style={{ color: 'var(--cui-secondary-color)' }}>Property Type</div>
          <div style={{ color: 'var(--cui-body-color)' }} className="font-medium">{project.property_type_code || 'N/A'}</div>
        </div>
        <div>
          <div style={{ color: 'var(--cui-secondary-color)' }}>Location</div>
          <div style={{ color: 'var(--cui-body-color)' }} className="font-medium">
            {project.jurisdiction_city ? `${project.jurisdiction_city}, ${project.jurisdiction_state}` : 'N/A'}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--cui-secondary-color)' }}>Acres</div>
          <div style={{ color: 'var(--cui-body-color)' }} className="font-medium">{project.acres_gross || 'N/A'}</div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Project Info Banner */}
      {projectInfo}

      {/* Location Section */}
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          border: '1px solid var(--cui-border-color)',
          boxShadow: 'var(--cui-box-shadow-sm)'
        }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--cui-body-color)' }}>
          Location
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-floating">
            <input
              type="text"
              className="form-control"
              id="address"
              placeholder="Address"
              defaultValue=""
            />
            <label htmlFor="address">Address</label>
          </div>
          <div className="form-floating">
            <input
              type="text"
              className="form-control"
              id="city"
              placeholder="City"
              defaultValue=""
            />
            <label htmlFor="city">City</label>
          </div>
          <div className="form-floating">
            <input
              type="text"
              className="form-control"
              id="state"
              placeholder="State"
              defaultValue=""
            />
            <label htmlFor="state">State</label>
          </div>
          <div className="form-floating">
            <input
              type="text"
              className="form-control"
              id="zip"
              placeholder="ZIP Code"
              defaultValue=""
            />
            <label htmlFor="zip">ZIP Code</label>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          border: '1px solid var(--cui-border-color)',
          boxShadow: 'var(--cui-box-shadow-sm)'
        }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--cui-body-color)' }}>
          Map View - 3D Oblique
        </h2>
        <ProjectTabMap
          projectId={projectId}
          styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'}
        />
      </div>

      {/* Project Profile Section */}
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          border: '1px solid var(--cui-border-color)',
          boxShadow: 'var(--cui-box-shadow-sm)'
        }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--cui-body-color)' }}>
          Project Profile
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-floating col-span-2">
            <select
              className="form-select"
              id="propertyType"
              value={selectedPropertyType}
              onChange={(e) => setSelectedPropertyType(e.target.value as PropertyType)}
            >
              {PROPERTY_TYPE_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.icon} {template.label}
                </option>
              ))}
            </select>
            <label htmlFor="propertyType">Property Type</label>
          </div>

          {template && template.defaultFields.map((field) => (
            <div key={field.id} className="form-floating">
              {field.type === 'select' ? (
                <>
                  <select className="form-select" id={field.id}>
                    <option value="">Select {field.label}</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <label htmlFor={field.id}>{field.label}</label>
                </>
              ) : field.type === 'textarea' ? (
                <>
                  <textarea
                    className="form-control"
                    id={field.id}
                    placeholder={field.placeholder || field.label}
                    style={{ minHeight: '100px' }}
                  />
                  <label htmlFor={field.id}>{field.label}</label>
                </>
              ) : (
                <>
                  <input
                    type={field.type}
                    className="form-control"
                    id={field.id}
                    placeholder={field.placeholder || field.label}
                  />
                  <label htmlFor={field.id}>
                    {field.label} {field.unit && `(${field.unit})`}
                  </label>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics Section - Dynamic based on property type */}
      {template && (
        <div
          className="rounded-lg p-6"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            border: '1px solid var(--cui-border-color)',
            boxShadow: 'var(--cui-box-shadow-sm)'
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--cui-body-color)' }}>
            Key Metrics - {template.label}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {template.metrics.slice(0, 6).map((metric) => (
              <div key={metric.id} className="text-center p-4 rounded" style={{ backgroundColor: 'var(--cui-secondary-bg)' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--cui-primary)' }}>
                  {metric.format === 'currency' && '$'}
                  {metric.format === 'percentage' && '0%'}
                  {metric.format === 'number' && '0'}
                  {metric.format === 'ratio' && '0.0'}
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Placeholder tab components
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FinancialTab({ projectId }: { projectId: string }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        boxShadow: 'var(--cui-box-shadow-sm)'
      }}
    >
      <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
        Financial Analysis
      </h2>
      <p className="mt-4" style={{ color: 'var(--cui-secondary-color)' }}>
        Financial tab content will display project financials, cash flows, and returns analysis.
      </p>
    </div>
  );
}

 
function AssumptionsTab({ projectId }: { projectId: string }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        boxShadow: 'var(--cui-box-shadow-sm)'
      }}
    >
      <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
        Deal Assumptions
      </h2>
      <p className="mt-4" style={{ color: 'var(--cui-secondary-color)' }}>
        Assumptions tab will link to the existing assumptions page at /projects/{projectId}/assumptions
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PlanningTab({ projectId }: { projectId: string }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        boxShadow: 'var(--cui-box-shadow-sm)'
      }}
    >
      <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
        Planning & Development
      </h2>
      <p className="mt-4" style={{ color: 'var(--cui-secondary-color)' }}>
        Planning tab content for development timeline, milestones, and phase planning.
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DocumentsTab({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          border: '1px solid var(--cui-border-color)',
          boxShadow: 'var(--cui-box-shadow-sm)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            Project Documents
          </h2>
          <a
            href="/dms"
            className="px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--cui-primary)',
              color: '#ffffff'
            }}
          >
            📁 Open Document Library
          </a>
        </div>
        <p style={{ color: 'var(--cui-secondary-color)' }}>
          Access and manage all project documents, contracts, drawings, and files in the Document Management System.
        </p>
      </div>

      {/* Recent Documents */}
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          border: '1px solid var(--cui-border-color)',
          boxShadow: 'var(--cui-box-shadow-sm)'
        }}
      >
        <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--cui-body-color)' }}>
          Recent Documents
        </h3>
        <div className="space-y-2">
          {[
            { name: 'Purchase Agreement.pdf', date: '2024-10-20', type: 'Legal' },
            { name: 'Site Plan.dwg', date: '2024-10-18', type: 'Drawing' },
            { name: 'Financial Model.xlsx', date: '2024-10-15', type: 'Financial' }
          ].map((doc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded transition-colors"
              style={{
                backgroundColor: 'var(--cui-secondary-bg)',
                border: '1px solid var(--cui-border-color)'
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
                    {doc.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                    {doc.type} • {doc.date}
                  </div>
                </div>
              </div>
              <button
                className="px-3 py-1 text-xs rounded"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  border: '1px solid var(--cui-border-color)',
                  color: 'var(--cui-body-color)'
                }}
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Document Categories */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'Legal Documents', count: 12, icon: '⚖️' },
          { name: 'Drawings & Plans', count: 24, icon: '📐' },
          { name: 'Financial Reports', count: 8, icon: '💰' },
          { name: 'Photos', count: 156, icon: '📸' },
          { name: 'Contracts', count: 6, icon: '📝' },
          { name: 'Other Files', count: 34, icon: '📎' }
        ].map((category, idx) => (
          <div
            key={idx}
            className="rounded-lg p-4 text-center transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              border: '1px solid var(--cui-border-color)',
              boxShadow: 'var(--cui-box-shadow-sm)'
            }}
          >
            <div className="text-3xl mb-2">{category.icon}</div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--cui-body-color)' }}>
              {category.name}
            </div>
            <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
              {category.count} files
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ReportsTab({ projectId }: { projectId: string }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        boxShadow: 'var(--cui-box-shadow-sm)'
      }}
    >
      <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
        Reports
      </h2>
      <p className="mt-4" style={{ color: 'var(--cui-secondary-color)' }}>
        Reports tab for generating investment memos, executive summaries, and financial reports.
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SettingsTab({ projectId }: { projectId: string }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        boxShadow: 'var(--cui-box-shadow-sm)'
      }}
    >
      <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
        Project Settings
      </h2>
      <p className="mt-4" style={{ color: 'var(--cui-secondary-color)' }}>
        Settings tab for project configuration, permissions, and preferences.
      </p>
    </div>
  );
}

// === MULTIFAMILY-SPECIFIC TABS ===

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RentRollUnitMixTab({ projectId, project }: { projectId: string; project: Record<string, unknown> }) {
  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          border: '1px solid var(--cui-border-color)',
          boxShadow: 'var(--cui-box-shadow-sm)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            Rent Roll & Unit Mix
          </h2>
          <div className="flex gap-2">
            <a
              href="/rent-roll"
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--cui-secondary-bg)',
                border: '1px solid var(--cui-border-color)',
                color: 'var(--cui-body-color)'
              }}
            >
              📊 Simple View
            </a>
            <Link
              href="/prototypes/multifam/rent-roll-inputs"
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--cui-primary)',
                color: '#ffffff'
              }}
            >
              🏠 Full Underwriting View
            </Link>
          </div>
        </div>
        <p style={{ color: 'var(--cui-secondary-color)' }}>
          View and manage unit-level data, floor plans, lease information, and rent roll analytics.
          The full underwriting view includes rent comparables, proforma analysis, and AI-assisted market rent estimates.
        </p>
      </div>
    </div>
  );
}

 
function OpexTab({ projectId }: { projectId: string }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        boxShadow: 'var(--cui-box-shadow-sm)'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Operating Expenses
        </h2>
        <a
          href={`/projects/${projectId}/opex-accounts`}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--cui-primary)',
            color: '#ffffff'
          }}
        >
          💵 Manage OpEx
        </a>
      </div>
      <p style={{ color: 'var(--cui-secondary-color)' }}>
        Operating expense forecasting and management for multifamily properties.
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MarketRatesTab({ projectId }: { projectId: string }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        boxShadow: 'var(--cui-box-shadow-sm)'
      }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--cui-body-color)' }}>
        Market Rates
      </h2>
      <p style={{ color: 'var(--cui-secondary-color)' }}>
        Market rent analysis, comparable properties, and rental rate trends for competitive positioning.
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CapitalizationTab({ projectId }: { projectId: string }) {
  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        boxShadow: 'var(--cui-box-shadow-sm)'
      }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--cui-body-color)' }}>
        Capitalization
      </h2>
      <p style={{ color: 'var(--cui-secondary-color)' }}>
        Deal structure, financing assumptions, equity/debt breakdown, and return metrics (IRR, equity multiple, cash-on-cash).
      </p>
    </div>
  );
}
