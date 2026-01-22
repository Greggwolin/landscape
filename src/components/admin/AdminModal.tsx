'use client';

import React, { useState, useEffect } from 'react';
import { CModal, CModalBody, CModalHeader, CNav, CNavItem, CNavLink } from '@coreui/react';
import PreferencesPanel from './PreferencesPanel';
import BenchmarksPanel from './BenchmarksPanel';
import CostLibraryPanel from './CostLibraryPanel';
import DMSAdminPanel from './DMSAdminPanel';
import ReportConfiguratorPanel from './ReportConfiguratorPanel';
import UserManagementPanel from './UserManagementPanel';
import LandscaperAdminPanel from './LandscaperAdminPanel';

/**
 * AdminModal Component
 *
 * Full-screen modal overlay for system administration.
 * Contains 6 internal tabs:
 * - Preferences (Unit Cost Categories, Land Use Taxonomy)
 * - Benchmarks (Global Benchmarks Library)
 * - Cost Library (Cost Library Management)
 * - DMS Admin (Document Templates)
 * - Report Configurator (Coming in Phase 2)
 * - Users (User Management - CRUD operations)
 * - Landscaper (AI Configuration - Extraction Mappings, Model Config)
 */

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

type AdminTab = 'preferences' | 'benchmarks' | 'cost-library' | 'dms-admin' | 'report-configurator' | 'users' | 'landscaper';

export default function AdminModal({
  isOpen,
  onClose,
  activeTab,
  onTabChange
}: AdminModalProps) {
  const [internalTab, setInternalTab] = useState<AdminTab>('preferences');
  const currentTab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey, true);
      return () => {
        document.removeEventListener('keydown', handleEscKey, true);
      };
    }
  }, [isOpen, onClose]);

  return (
    <CModal
      visible={isOpen}
      onClose={onClose}
      size="xl"
      alignment="center"
      backdrop="static"
      scrollable
      portal={false}
      className="admin-modal"
    >
      <CModalHeader closeButton>
        <h5 className="modal-title">System Administration</h5>
      </CModalHeader>

      <CModalBody className="p-0">
        {/* Internal Tab Navigation */}
        <CNav variant="tabs" className="border-bottom">
          <CNavItem>
            <CNavLink
              href="#"
              active={currentTab === 'preferences'}
              onClick={(e) => {
                e.preventDefault();
                setTab('preferences');
              }}
            >
              Preferences
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              href="#"
              active={currentTab === 'benchmarks'}
              onClick={(e) => {
                e.preventDefault();
                setTab('benchmarks');
              }}
            >
              Benchmarks
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              href="#"
              active={currentTab === 'cost-library'}
              onClick={(e) => {
                e.preventDefault();
                setTab('cost-library');
              }}
            >
              Cost Library
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              href="#"
              active={currentTab === 'dms-admin'}
              onClick={(e) => {
                e.preventDefault();
                setTab('dms-admin');
              }}
            >
              DMS Admin
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              href="#"
              active={currentTab === 'report-configurator'}
              onClick={(e) => {
                e.preventDefault();
                setTab('report-configurator');
              }}
            >
              Report Configurator
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              href="#"
              active={currentTab === 'users'}
              onClick={(e) => {
                e.preventDefault();
                setTab('users');
              }}
            >
              Users
            </CNavLink>
          </CNavItem>

          {/* Landscaper tab - visually separated with spacing before icon */}
          <CNavItem>
            <CNavLink
              href="#"
              active={currentTab === 'landscaper'}
              onClick={(e) => {
                e.preventDefault();
                setTab('landscaper');
              }}
              className="d-flex align-items-center gap-2"
              style={{ marginLeft: 80 }}
            >
              <img
                src="/landscaper-icon.svg"
                alt=""
                style={{ width: 24, height: 24 }}
              />
              Landscaper
            </CNavLink>
          </CNavItem>
        </CNav>

        {/* Tab Content Panels */}
        <div className="admin-modal-content p-4">
          {currentTab === 'preferences' && <PreferencesPanel />}
          {currentTab === 'benchmarks' && <BenchmarksPanel />}
          {currentTab === 'cost-library' && <CostLibraryPanel />}
          {currentTab === 'dms-admin' && <DMSAdminPanel />}
          {currentTab === 'report-configurator' && <ReportConfiguratorPanel />}
          {currentTab === 'users' && <UserManagementPanel />}
          {currentTab === 'landscaper' && <LandscaperAdminPanel />}
        </div>
      </CModalBody>
    </CModal>
  );
}
