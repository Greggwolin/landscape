'use client'

import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CCol,
  CContainer,
  CRow,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane
} from '@coreui/react'
import { useState } from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'

export default function CoreUIDemo() {
  const [activeTab, setActiveTab] = useState(1)

  return (
    <CContainer fluid className="p-4">
      <CRow className="mb-4">
        <CCol>
          <h1 className="mb-2">CoreUI Prototype Demo</h1>
          <p className="text-muted">
            Experimental CoreUI components for comparison with existing MUI implementation
          </p>
        </CCol>
      </CRow>

      <CRow className="mb-4">
        <CCol md={12}>
          <CAlert color="info">
            This is a prototype branch testing CoreUI as an alternative to Material UI.
            Components here are for evaluation purposes only.
          </CAlert>
        </CCol>
      </CRow>

      <CRow className="mb-4">
        <CCol md={6}>
          <CCard>
            <CCardHeader>
              <CCardTitle>Sample Form</CCardTitle>
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
                    <option>Select type...</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="mixed">Mixed Use</option>
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
                <CButton color="primary">Submit</CButton>
                {' '}
                <CButton color="secondary" variant="outline">Cancel</CButton>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6}>
          <CCard>
            <CCardHeader>
              <CCardTitle>Component Showcase</CCardTitle>
            </CCardHeader>
            <CCardBody>
              <div className="mb-3">
                <h6>Buttons</h6>
                <div className="d-flex gap-2 flex-wrap">
                  <CButton color="primary">Primary</CButton>
                  <CButton color="secondary">Secondary</CButton>
                  <CButton color="success">Success</CButton>
                  <CButton color="danger">Danger</CButton>
                  <CButton color="warning">Warning</CButton>
                  <CButton color="info">Info</CButton>
                </div>
              </div>

              <div className="mb-3">
                <h6>Badges</h6>
                <div className="d-flex gap-2 flex-wrap">
                  <CBadge color="primary">Primary</CBadge>
                  <CBadge color="success">Success</CBadge>
                  <CBadge color="danger">Danger</CBadge>
                  <CBadge color="warning">Warning</CBadge>
                  <CBadge color="info">Info</CBadge>
                </div>
              </div>

              <div>
                <h6>Alerts</h6>
                <CAlert color="success" dismissible>
                  This is a success alert with dismissible button!
                </CAlert>
                <CAlert color="warning">
                  This is a warning alert - check something out!
                </CAlert>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow className="mb-4">
        <CCol md={12}>
          <CCard>
            <CCardHeader>
              <CNav variant="tabs" role="tablist">
                <CNavItem>
                  <CNavLink
                    active={activeTab === 1}
                    onClick={() => setActiveTab(1)}
                    style={{ cursor: 'pointer' }}
                  >
                    Table View
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 2}
                    onClick={() => setActiveTab(2)}
                    style={{ cursor: 'pointer' }}
                  >
                    Grid View
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 3}
                    onClick={() => setActiveTab(3)}
                    style={{ cursor: 'pointer' }}
                  >
                    Details
                  </CNavLink>
                </CNavItem>
              </CNav>
            </CCardHeader>
            <CCardBody>
              <CTabContent>
                <CTabPane visible={activeTab === 1}>
                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Project</CTableHeaderCell>
                        <CTableHeaderCell>Type</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Budget</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell>Sunset Development</CTableDataCell>
                        <CTableDataCell>Residential</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="success">Active</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>$2.5M</CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell>Downtown Plaza</CTableDataCell>
                        <CTableDataCell>Commercial</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="warning">Planning</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>$5.2M</CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell>Riverside Mixed Use</CTableDataCell>
                        <CTableDataCell>Mixed Use</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">Review</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>$8.7M</CTableDataCell>
                      </CTableRow>
                    </CTableBody>
                  </CTable>
                </CTabPane>
                <CTabPane visible={activeTab === 2}>
                  <CRow>
                    {[1, 2, 3, 4].map((item) => (
                      <CCol md={3} key={item} className="mb-3">
                        <CCard>
                          <CCardBody>
                            <h6>Project {item}</h6>
                            <p className="text-muted small">Grid card view example</p>
                            <CBadge color="primary">Active</CBadge>
                          </CCardBody>
                        </CCard>
                      </CCol>
                    ))}
                  </CRow>
                </CTabPane>
                <CTabPane visible={activeTab === 3}>
                  <div>
                    <h5>CoreUI Framework Details</h5>
                    <p>
                      CoreUI is a Bootstrap-based admin template framework that provides:
                    </p>
                    <ul>
                      <li>Comprehensive component library</li>
                      <li>Responsive grid system</li>
                      <li>Professional admin templates</li>
                      <li>TypeScript support</li>
                      <li>Active community and documentation</li>
                    </ul>
                    <p className="text-muted">
                      This demo page showcases basic CoreUI components that could replace
                      MUI equivalents in the main application.
                    </p>
                  </div>
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard>
            <CCardHeader>
              <CCardTitle>Next Steps</CCardTitle>
            </CCardHeader>
            <CCardBody>
              <ol>
                <li>Test CoreUI components against your design requirements</li>
                <li>Compare performance with existing MUI components</li>
                <li>Evaluate accessibility features</li>
                <li>Check compatibility with existing styling (Tailwind)</li>
                <li>Build parallel versions of key components (Navigation, Forms, Tables)</li>
                <li>Decide whether to migrate, keep both, or stick with MUI</li>
              </ol>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}
