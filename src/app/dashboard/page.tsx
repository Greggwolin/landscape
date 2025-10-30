'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CContainer, CCard, CCardHeader, CCardBody, CTable, CTableHead, CTableBody, CTableRow, CTableHeaderCell, CTableDataCell, CBadge, CButton } from '@coreui/react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import CIcon from '@coreui/icons-react';
import { cilChartPie } from '@coreui/icons';
import NewProjectModal from '@/app/components/NewProjectModal';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  'MPC': 'Master Planned Community',
  'MULTIFAMILY': 'Multifamily',
  'COMMERCIAL': 'Commercial',
  'OFFICE': 'Office',
  'RETAIL': 'Retail',
  'INDUSTRIAL': 'Industrial',
  'HOTEL': 'Hotel',
  'MIXED_USE': 'Mixed Use',
  'SUBDIVISION': 'Subdivision'
};

const PROPERTY_TYPE_COLORS: Record<string, string> = {
  'MPC': 'primary',
  'MULTIFAMILY': 'success',
  'COMMERCIAL': 'info',
  'OFFICE': 'warning',
  'RETAIL': 'danger',
  'INDUSTRIAL': 'secondary',
  'HOTEL': 'dark',
  'MIXED_USE': 'primary',
  'SUBDIVISION': 'info'
};

export default function DashboardPage() {
  const { projects, selectProject } = useProjectContext();
  const router = useRouter();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const handleProjectClick = (projectId: number) => {
    const project = projects.find(p => p.project_id === projectId);
    if (project) {
      selectProject(project);
      router.push(`/projects/${projectId}`);
    }
  };

  return (
    <CContainer fluid className="p-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <CCard className="text-center">
          <CCardBody>
            <div className="text-3xl font-bold" style={{ color: 'var(--cui-primary)' }}>
              {projects.length}
            </div>
            <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              Total Projects
            </div>
          </CCardBody>
        </CCard>

        <CCard className="text-center">
          <CCardBody>
            <div className="text-3xl font-bold" style={{ color: 'var(--cui-success)' }}>
              {projects.filter(p => p.is_active).length}
            </div>
            <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              Active Projects
            </div>
          </CCardBody>
        </CCard>

        <CCard className="text-center">
          <CCardBody>
            <div className="text-3xl font-bold" style={{ color: 'var(--cui-info)' }}>
              {projects.filter(p => p.property_type_code === 'MPC' || p.property_type_code === 'SUBDIVISION').length}
            </div>
            <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              Land Development
            </div>
          </CCardBody>
        </CCard>

        <CCard className="text-center">
          <CCardBody>
            <div className="text-3xl font-bold" style={{ color: 'var(--cui-warning)' }}>
              {projects.filter(p => p.property_type_code === 'MULTIFAMILY' || p.property_type_code === 'OFFICE' || p.property_type_code === 'RETAIL').length}
            </div>
            <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              Income Properties
            </div>
          </CCardBody>
        </CCard>

        <CCard
          className="text-center cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setIsNewProjectModalOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          <CCardBody>
            <div className="text-3xl font-bold" style={{ color: 'var(--cui-success)' }}>
              +
            </div>
            <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
              New Project
            </div>
          </CCardBody>
        </CCard>
      </div>

      {/* Projects Table */}
      <CCard>
        <CCardBody className="p-0">
          <CTable hover responsive className="mb-0">
            <CTableHead style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
              <CTableRow>
                <CTableHeaderCell scope="col">Name</CTableHeaderCell>
                <CTableHeaderCell scope="col">Type</CTableHeaderCell>
                <CTableHeaderCell scope="col">Location</CTableHeaderCell>
                <CTableHeaderCell scope="col">Acreage</CTableHeaderCell>
                <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                <CTableHeaderCell scope="col">Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {projects.map((project) => (
                <CTableRow
                  key={project.project_id}
                  className="cursor-pointer"
                  onClick={() => handleProjectClick(project.project_id)}
                  style={{ cursor: 'pointer' }}
                >
                  <CTableDataCell>
                    <div className="flex items-center gap-2">
                      <CIcon icon={cilChartPie} size="sm" className="opacity-70" />
                      <strong>{project.project_name}</strong>
                    </div>
                  </CTableDataCell>
                  <CTableDataCell>
                    {project.property_type_code ? (
                      <CBadge color={PROPERTY_TYPE_COLORS[project.property_type_code] || 'secondary'}>
                        {PROPERTY_TYPE_LABELS[project.property_type_code] || project.property_type_code}
                      </CBadge>
                    ) : (
                      <span style={{ color: 'var(--cui-secondary-color)' }}>Not specified</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>
                    {project.jurisdiction_city && project.jurisdiction_state ? (
                      <div>
                        <div>{project.jurisdiction_city}, {project.jurisdiction_state}</div>
                        {project.jurisdiction_county && (
                          <div className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
                            {project.jurisdiction_county}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--cui-secondary-color)' }}>Not specified</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>
                    {project.acres_gross ? (
                      `${project.acres_gross} ac`
                    ) : (
                      <span style={{ color: 'var(--cui-secondary-color)' }}>TBD</span>
                    )}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={project.is_active ? 'success' : 'secondary'}>
                      {project.is_active ? 'Active' : 'Inactive'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    <CButton
                      color="primary"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectClick(project.project_id);
                      }}
                    >
                      Open
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>

          {projects.length === 0 && (
            <div className="text-center py-8">
              <p style={{ color: 'var(--cui-secondary-color)' }}>
                No projects found. Click the + New Project tile to get started.
              </p>
            </div>
          )}
        </CCardBody>
      </CCard>

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </CContainer>
  );
}
