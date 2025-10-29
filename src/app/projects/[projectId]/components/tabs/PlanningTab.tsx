'use client';

import React, { useState, useEffect } from 'react';
import { CCard, CCardHeader, CCardBody, CRow, CCol, CButton, CBadge } from '@coreui/react';
import type { ContainerNode } from '@/types';

interface Project {
  project_id: number;
  project_name: string;
}

interface PlanningTabProps {
  project: Project;
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Plan Area',
  2: 'Phase',
  3: 'Parcel',
  4: 'Sub-Parcel'
};

const LEVEL_COLORS: Record<number, string> = {
  1: 'primary',
  2: 'success',
  3: 'info',
  4: 'warning'
};

function ContainerTreeNode({ node, level = 0 }: { node: ContainerNode; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 24;

  return (
    <div>
      <div
        className="p-3 mb-2 rounded border"
        style={{
          marginLeft: `${indent}px`,
          borderColor: 'var(--cui-border-color)',
          backgroundColor: level === 0 ? 'var(--cui-tertiary-bg)' : 'var(--cui-body-bg)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasChildren && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm"
                style={{ color: 'var(--cui-body-color)' }}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            {!hasChildren && <span className="w-4" />}

            <div>
              <div className="flex items-center gap-2">
                <CBadge color={LEVEL_COLORS[node.container_level] || 'secondary'}>
                  {LEVEL_LABELS[node.container_level] || `Level ${node.container_level}`}
                </CBadge>
                <strong>{node.display_name}</strong>
                <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                  ({node.container_code})
                </span>
              </div>

              {node.attributes && typeof node.attributes === 'object' && Object.keys(node.attributes).length > 0 && (
                <div className="text-sm mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
                  {Object.entries(node.attributes).map(([key, value]) => (
                    <span key={key} className="mr-3">
                      <strong>{key}:</strong> {String(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {hasChildren && (
            <CBadge color="light" style={{ color: 'var(--cui-body-color)' }}>
              {node.children.length} {node.children.length === 1 ? 'child' : 'children'}
            </CBadge>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <ContainerTreeNode key={child.container_id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanningTab({ project }: PlanningTabProps) {
  const [containers, setContainers] = useState<ContainerNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${project.project_id}/containers`);

        if (!response.ok) {
          throw new Error('Failed to load containers');
        }

        const data = await response.json();
        // Ensure we always set an array
        setContainers(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error('Error loading containers:', err);
        setError(err instanceof Error ? err.message : 'Failed to load planning data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContainers();
  }, [project.project_id]);

  // Calculate summary stats
  const stats = containers.reduce((acc, area) => {
    acc.areas++;
    const countChildren = (node: ContainerNode) => {
      if (node.container_level === 2) acc.phases++;
      if (node.container_level === 3) acc.parcels++;
      node.children?.forEach(countChildren);
    };
    area.children?.forEach(countChildren);
    return acc;
  }, { areas: 0, phases: 0, parcels: 0 });

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <CRow>
        <CCol md={3}>
          <CCard className="text-center">
            <CCardBody>
              <div className="text-3xl font-bold" style={{ color: 'var(--cui-primary)' }}>
                {stats.areas}
              </div>
              <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                Plan Areas
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard className="text-center">
            <CCardBody>
              <div className="text-3xl font-bold" style={{ color: 'var(--cui-success)' }}>
                {stats.phases}
              </div>
              <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                Phases
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard className="text-center">
            <CCardBody>
              <div className="text-3xl font-bold" style={{ color: 'var(--cui-info)' }}>
                {stats.parcels}
              </div>
              <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                Parcels
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={3}>
          <CCard className="text-center">
            <CCardBody>
              <div className="text-3xl font-bold" style={{ color: 'var(--cui-body-color)' }}>
                {containers.reduce((sum, area) => {
                  const countAll = (node: ContainerNode): number =>
                    1 + (node.children?.reduce((s, c) => s + countAll(c), 0) || 0);
                  return sum + countAll(area);
                }, 0)}
              </div>
              <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                Total Containers
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Container Hierarchy */}
      <CCard>
        <CCardHeader className="flex items-center justify-between">
          <span>Project Hierarchy</span>
          <CButton color="primary" size="sm">
            + Add Container
          </CButton>
        </CCardHeader>
        <CCardBody>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4" style={{ color: 'var(--cui-secondary-color)' }}>
                Loading planning data...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">Error: {error}</p>
              <CButton color="secondary" size="sm" onClick={() => window.location.reload()}>
                Retry
              </CButton>
            </div>
          ) : containers.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--cui-secondary-color)' }} className="mb-4">
                No planning containers defined yet.
              </p>
              <CButton color="primary">
                Create First Container
              </CButton>
            </div>
          ) : (
            <div>
              {containers.map((container) => (
                <ContainerTreeNode key={container.container_id} node={container} />
              ))}
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Legend */}
      <CCard>
        <CCardHeader>Container Levels</CCardHeader>
        <CCardBody>
          <div className="flex flex-wrap gap-4">
            {Object.entries(LEVEL_LABELS).map(([level, label]) => (
              <div key={level} className="flex items-center gap-2">
                <CBadge color={LEVEL_COLORS[Number(level)] || 'secondary'}>
                  {label}
                </CBadge>
                <span className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
                  Level {level}
                </span>
              </div>
            ))}
          </div>
        </CCardBody>
      </CCard>
    </div>
  );
}
