'use client';

import React, { useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CRow,
  CCol,
  CContainer,
  CBadge,
  CAlert
} from '@coreui/react';
import { ThemeToggle } from '@/app/components/ThemeToggle';

export default function TestCoreUIPage() {
  const [activeTab, setActiveTab] = useState(1);

  return (
    <CContainer fluid className="p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 mb-2">CoreUI Theme Test Page</h1>
            <p className="text-muted mb-0">Testing light/dark mode with CoreUI Modern components</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Alert Banner */}
        <CAlert color="info" className="mb-4">
          <strong>Phase 1 Complete!</strong> CoreUI Modern theme is now installed and configured.
          Use the toggle above to switch between light and dark modes.
        </CAlert>

        <CRow className="g-4">
          {/* Left Column - Forms */}
          <CCol md={6}>
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Form Elements</strong>
              </CCardHeader>
              <CCardBody>
                <CForm>
                  <div className="mb-3">
                    <CFormLabel htmlFor="projectName">Project Name</CFormLabel>
                    <CFormInput
                      type="text"
                      id="projectName"
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="mb-3">
                    <CFormLabel htmlFor="projectType">Project Type</CFormLabel>
                    <CFormSelect id="projectType">
                      <option>Select project type...</option>
                      <option value="land-dev-mpc">Land Development - MPC</option>
                      <option value="land-dev-sub">Land Development - Subdivision</option>
                      <option value="multifamily">Multifamily</option>
                      <option value="commercial">Commercial</option>
                      <option value="office">Office</option>
                      <option value="retail">Retail</option>
                      <option value="industrial">Industrial</option>
                    </CFormSelect>
                  </div>
                  <div className="mb-3">
                    <CFormLabel htmlFor="description">Description</CFormLabel>
                    <CFormTextarea
                      id="description"
                      rows={3}
                      placeholder="Enter project description"
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <CButton color="primary">Save Project</CButton>
                    <CButton color="secondary" variant="outline">Cancel</CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>

            <CCard>
              <CCardHeader>
                <strong>Status Badges</strong>
              </CCardHeader>
              <CCardBody>
                <div className="d-flex gap-2 flex-wrap">
                  <CBadge color="primary">Primary</CBadge>
                  <CBadge color="secondary">Secondary</CBadge>
                  <CBadge color="success">Success</CBadge>
                  <CBadge color="danger">Danger</CBadge>
                  <CBadge color="warning" textColor="dark">Warning</CBadge>
                  <CBadge color="info">Info</CBadge>
                  <CBadge color="light" textColor="dark">Light</CBadge>
                  <CBadge color="dark">Dark</CBadge>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          {/* Right Column - Tabs & Table */}
          <CCol md={6}>
            <CCard className="mb-4">
              <CCardHeader>
                <CNav variant="tabs" role="tablist">
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 1}
                      onClick={() => setActiveTab(1)}
                      style={{ cursor: 'pointer' }}
                    >
                      Overview
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 2}
                      onClick={() => setActiveTab(2)}
                      style={{ cursor: 'pointer' }}
                    >
                      Details
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 3}
                      onClick={() => setActiveTab(3)}
                      style={{ cursor: 'pointer' }}
                    >
                      Settings
                    </CNavLink>
                  </CNavItem>
                </CNav>
              </CCardHeader>
              <CCardBody>
                <CTabContent>
                  <CTabPane visible={activeTab === 1}>
                    <h5>Overview Tab</h5>
                    <p className="text-muted">
                      This is the overview tab content. CoreUI tabs work seamlessly with
                      theme switching.
                    </p>
                  </CTabPane>
                  <CTabPane visible={activeTab === 2}>
                    <h5>Details Tab</h5>
                    <p className="text-muted">
                      Details tab content goes here. Notice how the theme applies
                      consistently across all components.
                    </p>
                  </CTabPane>
                  <CTabPane visible={activeTab === 3}>
                    <h5>Settings Tab</h5>
                    <p className="text-muted">
                      Settings and configuration options would appear here.
                    </p>
                  </CTabPane>
                </CTabContent>
              </CCardBody>
            </CCard>

            <CCard>
              <CCardHeader>
                <strong>Sample Data Table</strong>
              </CCardHeader>
              <CCardBody>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">#</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Project</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Type</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    <CTableRow>
                      <CTableHeaderCell scope="row">7</CTableHeaderCell>
                      <CTableDataCell>Peoria Lakes</CTableDataCell>
                      <CTableDataCell>Land Development</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="success">Active</CBadge>
                      </CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">11</CTableHeaderCell>
                      <CTableDataCell>14105 Chadron Ave</CTableDataCell>
                      <CTableDataCell>Multifamily</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="info">Planning</CBadge>
                      </CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">15</CTableHeaderCell>
                      <CTableDataCell>Downtown Office Tower</CTableDataCell>
                      <CTableDataCell>Office</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="warning" textColor="dark">Pending</CBadge>
                      </CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>

        {/* Button Grid */}
        <CCard className="mt-4">
          <CCardHeader>
            <strong>Button Variations</strong>
          </CCardHeader>
          <CCardBody>
            <div className="d-flex gap-2 flex-wrap mb-3">
              <CButton color="primary">Primary</CButton>
              <CButton color="secondary">Secondary</CButton>
              <CButton color="success">Success</CButton>
              <CButton color="danger">Danger</CButton>
              <CButton color="warning">Warning</CButton>
              <CButton color="info">Info</CButton>
              <CButton color="light">Light</CButton>
              <CButton color="dark">Dark</CButton>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <CButton color="primary" variant="outline">Primary Outline</CButton>
              <CButton color="secondary" variant="outline">Secondary Outline</CButton>
              <CButton color="success" variant="outline">Success Outline</CButton>
              <CButton color="danger" variant="outline">Danger Outline</CButton>
            </div>
          </CCardBody>
        </CCard>
      </CContainer>
  );
}
