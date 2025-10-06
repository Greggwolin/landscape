'use client'

import React, { useMemo } from 'react'
import {
  CSidebar,
  CSidebarBrand,
  CSidebarNav,
  CNavTitle,
  CNavItem,
  CNavGroup,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilHome,
  cilSpeedometer,
  cilMap,
  cilPencil,
  cilDescription,
  cilCalculator,
  cilChartLine,
  cilMoney,
  cilBuilding,
  cilDollar,
  cilBank,
  cilSettings,
  cilTags,
  cilLayers,
} from '@coreui/icons'

interface CoreUINavigationProps {
  activeView: string
  setActiveView: (view: string) => void
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
}

interface NavSection {
  title: string
  items: NavItemType[]
  isGroup?: boolean
}

interface NavItemType {
  id: string
  label: string
  icon: string[]
}

const CoreUINavigation: React.FC<CoreUINavigationProps> = ({
  activeView,
  setActiveView,
  visible = true,
  onVisibleChange
}) => {
  const pluralize = (label: string) => (label.endsWith('s') ? label : `${label}s`)

  const level1Label = 'Area'
  const level2Label = 'Phase'
  const level1LabelPlural = pluralize(level1Label)

  const navSections: NavSection[] = useMemo(() => [
    {
      title: 'HOME',
      isGroup: true,
      items: [
        { id: 'home', label: 'Home', icon: cilHome },
        { id: 'dev-status', label: 'Development Status', icon: cilSpeedometer }
      ]
    },
    {
      title: 'Planning',
      isGroup: true,
      items: [
        { id: 'planning-overview', label: `${level1LabelPlural} Overview`, icon: cilMap },
        { id: 'planning-inline', label: 'Planning', icon: cilPencil },
        { id: 'documents', label: 'Documents', icon: cilDescription }
      ]
    },
    {
      title: 'Assumptions',
      isGroup: true,
      items: [
        { id: 'market', label: 'Global', icon: cilCalculator },
        { id: 'growth-rates', label: 'Market Rates & Prices', icon: cilChartLine },
        { id: 'project-revenues', label: 'Project Revenues', icon: cilMoney }
      ]
    },
    {
      title: 'Budgets',
      isGroup: true,
      items: [
        { id: 'acquisition', label: 'Acquisition', icon: cilBuilding },
        { id: 'project-costs', label: 'Project Costs', icon: cilDollar },
        { id: 'entitlements', label: 'Stage 1 - Entitlements', icon: cilDescription },
        { id: 'engineering', label: 'Stage 2 - Engineering', icon: cilSettings },
        { id: 'development', label: 'Stage 3 - Development', icon: cilBuilding },
        { id: 'disposition', label: 'Project Disposition', icon: cilMoney }
      ]
    },
    {
      title: 'Ownership',
      isGroup: true,
      items: [
        { id: 'debt', label: 'Debt', icon: cilBank },
        { id: 'equity', label: 'Equity', icon: cilChartLine },
        { id: 'muni-district', label: 'Muni / District', icon: cilBuilding }
      ]
    },
    {
      title: 'SETTINGS',
      isGroup: true,
      items: [
        { id: 'settings', label: 'Settings', icon: cilSettings },
        { id: 'zoning-glossary', label: 'Zoning Glossary', icon: cilTags },
        { id: 'planning', label: `${level2Label} Planner (Legacy)`, icon: cilLayers }
      ]
    }
  ], [level1LabelPlural, level2Label])

  return (
    <CSidebar
      position="fixed"
      unfoldable={false}
      visible={visible}
      onVisibleChange={(visible) => onVisibleChange?.(visible)}
      className="border-end"
      colorScheme="dark"
    >
      <CSidebarBrand className="d-none d-md-flex" style={{ padding: '1rem' }}>
        <div style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600' }}>
          landscape
        </div>
      </CSidebarBrand>

      <CSidebarNav>
        {navSections.map((section) => (
          <React.Fragment key={section.title}>
            {section.isGroup ? (
              <div className="nav-item-wrapper">
                <CNavGroup
                  visible={true}
                  toggler={
                    <>
                      <CIcon customClassName="nav-icon" icon={section.items[0]?.icon} />
                      {section.title}
                    </>
                  }
                >
                  {section.items.map((item) => (
                    <div key={item.id} className="nav-item-nested">
                      <CNavItem
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setActiveView(item.id)
                        }}
                        active={activeView === item.id}
                      >
                        {item.label}
                      </CNavItem>
                    </div>
                  ))}
                </CNavGroup>
              </div>
            ) : (
              <div className="nav-item-wrapper">
                <CNavTitle>{section.title}</CNavTitle>
                {section.items.map((item) => (
                  <CNavItem
                    key={item.id}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setActiveView(item.id)
                    }}
                    active={activeView === item.id}
                  >
                    <CIcon customClassName="nav-icon" icon={item.icon} />
                    {item.label}
                  </CNavItem>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </CSidebarNav>

      <CSidebarToggler
        className="d-none d-lg-flex"
        onClick={() => onVisibleChange?.(!visible)}
      />
    </CSidebar>
  )
}

export default CoreUINavigation
