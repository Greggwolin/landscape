'use client'

import React from 'react'
import {
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderToggler,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CButton,
  CAvatar,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilMenu,
  cilAccountLogout,
  cilSettings,
  cilUser,
} from '@coreui/icons'

interface CoreUIHeaderProps {
  onSidebarToggle?: () => void
  activeProject?: {
    project_id: number
    project_name?: string | null
  } | null
  projects?: Array<{
    project_id: number
    project_name?: string | null
  }>
  onProjectSelect?: (projectId: number) => void
}

const CoreUIHeader: React.FC<CoreUIHeaderProps> = ({
  onSidebarToggle,
  activeProject,
  projects = [],
  onProjectSelect
}) => {
  return (
    <CHeader position="sticky" className="mb-4">
      <CContainer fluid className="d-flex align-items-center gap-3 px-3">
        <div className="d-flex align-items-center gap-3">
          <CHeaderToggler
            className="p-0"
            onClick={onSidebarToggle}
          >
            <CIcon icon={cilMenu} size="lg" />
          </CHeaderToggler>

          <CHeaderBrand className="d-none d-md-flex fw-semibold text-decoration-none m-0">
            Landscape
          </CHeaderBrand>
        </div>

        <CHeaderBrand className="mx-auto d-md-none m-0">
          <strong>Landscape</strong>
        </CHeaderBrand>

        <div className="d-flex align-items-center gap-3 ms-auto">
          <CDropdown variant="nav-item">
            <CDropdownToggle color="secondary" caret>
              {activeProject?.project_name ||
               (activeProject?.project_id ? `Project ${activeProject.project_id}` : 'Select Project')}
            </CDropdownToggle>
            <CDropdownMenu>
              {projects.map((project) => (
                <CDropdownItem
                  key={project.project_id}
                  onClick={() => onProjectSelect?.(project.project_id)}
                  active={activeProject?.project_id === project.project_id}
                >
                  {project.project_name || `Project ${project.project_id}`}
                </CDropdownItem>
              ))}
              <CDropdownItem component="hr" className="dropdown-divider" />
              <CDropdownItem>
                + Add New Project
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>

          <CButton color="secondary" variant="outline" size="sm">
            Export
          </CButton>

          <CDropdown variant="nav-item">
            <CDropdownToggle placement="bottom-end" className="py-0" caret={false}>
              <CAvatar color="secondary" textColor="white" size="md">
                U
              </CAvatar>
            </CDropdownToggle>
            <CDropdownMenu className="pt-0" placement="bottom-end">
              <CDropdownItem>
                <CIcon icon={cilUser} className="me-2" />
                Profile
              </CDropdownItem>
              <CDropdownItem>
                <CIcon icon={cilSettings} className="me-2" />
                Settings
              </CDropdownItem>
              <CDropdownItem component="hr" className="dropdown-divider" />
              <CDropdownItem>
                <CIcon icon={cilAccountLogout} className="me-2" />
                Logout
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
        </div>
      </CContainer>
    </CHeader>
  )
}

export default CoreUIHeader
