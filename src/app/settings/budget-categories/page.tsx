// Budget Category Management - Admin Settings
// v1.0 · 2025-11-02

'use client';

import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CAlert,
  CSpinner,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';
import CategoryTreeManager from '@/components/budget/CategoryTreeManager';
import CategoryTemplateManager from '@/components/budget/CategoryTemplateManager';

export default function BudgetCategoriesPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Fetch projects for dropdown
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects/minimal');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchProjects();
  }, []);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="h3 mb-2">Budget Category Management</h1>
        <p className="text-medium-emphasis">
          Manage budget category hierarchies for your projects. Use templates for quick setup or create custom categories.
        </p>
      </div>

      {/* Project Selector */}
      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex align-items-center gap-3">
            <CFormLabel className="mb-0" style={{ minWidth: '100px' }}>
              Project:
            </CFormLabel>
            <CFormSelect
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={loadingProjects}
              style={{ maxWidth: '400px' }}
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_name}
                </option>
              ))}
            </CFormSelect>
            {loadingProjects && <CSpinner size="sm" />}
          </div>
          {!selectedProjectId && (
            <CAlert color="info" className="mt-3 mb-0">
              Select a project to manage its budget categories, or work with templates below.
            </CAlert>
          )}
        </CCardBody>
      </CCard>

      {/* Tabs: Templates vs Custom Categories */}
      <CCard>
        <CCardHeader>
          <CNav variant="tabs" role="tablist">
            <CNavItem>
              <CNavLink
                active={activeTab === 'templates'}
                onClick={() => setActiveTab('templates')}
                style={{ cursor: 'pointer' }}
              >
                Templates
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'custom'}
                onClick={() => setActiveTab('custom')}
                style={{ cursor: 'pointer' }}
                disabled={!selectedProjectId}
              >
                Custom Categories
              </CNavLink>
            </CNavItem>
          </CNav>
        </CCardHeader>

        <CCardBody>
          <CTabContent>
            {/* Templates Tab */}
            <CTabPane visible={activeTab === 'templates'}>
              <CategoryTemplateManager
                selectedProjectId={selectedProjectId}
                onTemplateApplied={() => {
                  // Refresh project categories after template application
                  setActiveTab('custom');
                }}
              />
            </CTabPane>

            {/* Custom Categories Tab */}
            <CTabPane visible={activeTab === 'custom'}>
              {selectedProjectId ? (
                <CategoryTreeManager projectId={selectedProjectId} />
              ) : (
                <CAlert color="warning">
                  Please select a project to manage custom categories.
                </CAlert>
              )}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>
    </div>
  );
}
