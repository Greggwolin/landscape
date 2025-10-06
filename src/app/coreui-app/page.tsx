'use client'

import React, { useState, useEffect } from 'react'
import '@coreui/coreui/dist/css/coreui.min.css'
import './coreui-custom.css'
import CoreUIHeader from '../components-coreui/CoreUIHeader'
import CoreUINavigation from '../components-coreui/CoreUINavigation'
import { ProjectProvider, useProjectContext } from '../components/ProjectProvider'

// Import existing page components
import BudgetContent from '../components/Budget/BudgetContent'
import MarketAssumptionsNative from '../components/MarketAssumptionsNative'
import PlanningContent from '../components/Planning/PlanningContent'
import PlanningWizard from '../components/PlanningWizard/PlanningWizard'
import CategoryTree from '../components/Admin/CategoryTree'
import LandUseSchema from '../components/LandUse/LandUseSchema'
import ZoningGlossaryAdmin from '../components/Glossary/ZoningGlossaryAdmin'
import DevStatus from '../components/DevStatus/DevStatus'
import DocumentManagement from '../components/Documents/DocumentManagement'
import HomeOverview from '../components/Home/HomeOverview'
import GrowthRates from '../components/GrowthRates'

const CoreUIAppInner: React.FC = () => {
  const [activeView, setActiveView] = useState('home')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const { activeProject, projects, selectProject, isLoading, error } = useProjectContext()

  // Listen for cross-component navigation requests
  useEffect(() => {
    const handler = (e: CustomEvent<{ view?: string }>) => {
      const view = e.detail?.view
      if (typeof view === 'string') {
        setActiveView(view)
      }
    }
    window.addEventListener('navigateToView', handler)
    return () => window.removeEventListener('navigateToView', handler)
  }, [])

  const renderContent = () => {
    switch (activeView) {
      case 'home':
      case 'dashboard':
        return <DashboardContent />

      case 'planning-overview':
        return <PlanningContent projectId={activeProject?.project_id ?? null} />
      case 'planning-inline':
      case 'planning':
        return <PlanningWizard />
      case 'land-use':
        return <LandUseSchema />
      case 'documents':
        return <DocumentManagement projectId={activeProject?.project_id ?? null} />
      case 'mapping-gis':
        return <ComingSoonContent title="Mapping / GIS" />

      case 'acquisition':
        return <ComingSoonContent title="Acquisition" />
      case 'market':
        return <MarketAssumptionsNative projectId={activeProject?.project_id ?? null} />
      case 'growth-rates':
        return <GrowthRates projectId={activeProject?.project_id ?? null} />
      case 'project-costs':
        return <BudgetContent projectId={activeProject?.project_id ?? null} />
      case 'project-revenues':
        return <ComingSoonContent title="Project Revenues" />

      case 'entitlements':
        return <ComingSoonContent title="Stage 1 - Entitlements" />
      case 'engineering':
        return <ComingSoonContent title="Stage 2 - Engineering" />
      case 'development':
        return <ComingSoonContent title="Stage 3 - Development" />
      case 'disposition':
        return <ComingSoonContent title="Project Disposition" />

      case 'debt':
        return <ComingSoonContent title="Debt" />
      case 'equity':
        return <ComingSoonContent title="Equity" />
      case 'muni-district':
        return <ComingSoonContent title="Muni / District" />

      case 'settings':
        return <CategoryTree />
      case 'zoning-glossary':
        return <ZoningGlossaryAdmin />
      case 'dev-status':
        return <DevStatus />

      default:
        return <ComingSoonContent title={activeView.charAt(0).toUpperCase() + activeView.slice(1)} />
    }
  }

  if (error) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-danger">Error loading projects: {error.message}</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-muted">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className={`coreui-app ${sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
      <CoreUINavigation
        activeView={activeView}
        setActiveView={setActiveView}
        visible={sidebarVisible}
        onVisibleChange={setSidebarVisible}
      />
      <div className="coreui-app__wrapper wrapper d-flex flex-column min-vh-100 bg-light">
        <CoreUIHeader
          onSidebarToggle={() => setSidebarVisible(!sidebarVisible)}
          activeProject={activeProject}
          projects={projects}
          onProjectSelect={selectProject}
        />
        <div className="body flex-grow-1 px-3">
          {renderContent()}
        </div>
        <footer className="footer border-top py-2 px-3">
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              Project ID: {activeProject?.project_id || 'None'} • Last saved: Just now
            </div>
            <div className="text-muted small">
              Landscape &copy; 2025 • CoreUI Prototype
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

const CoreUIApp: React.FC = () => {
  return (
    <ProjectProvider>
      <CoreUIAppInner />
    </ProjectProvider>
  )
}

// Dashboard Content
const DashboardContent: React.FC = () => (
  <div className="p-4">
    <HomeOverview />
  </div>
)

// Reusable Coming Soon Component
const ComingSoonContent: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-4">
    <div className="card text-center">
      <div className="card-body">
        <div className="text-muted mb-2">Coming Soon</div>
        <h5 className="card-title">{title}</h5>
      </div>
    </div>
  </div>
)

export default CoreUIApp
