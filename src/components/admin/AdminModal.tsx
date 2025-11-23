'use client';

import React, { useState, useEffect } from 'react';
import { CModal, CModalBody, CModalHeader, CNav, CNavItem, CNavLink } from '@coreui/react';
import PreferencesPanel from './PreferencesPanel';
import BenchmarksPanel from './BenchmarksPanel';
import CostLibraryPanel from './CostLibraryPanel';
import DMSAdminPanel from './DMSAdminPanel';
import ReportConfiguratorPanel from './ReportConfiguratorPanel';

/**
 * AdminModal Component
 *
 * Full-screen modal overlay for system administration.
 * Contains 5 internal tabs:
 * - Preferences (Unit Cost Categories, Land Use Taxonomy)
 * - Benchmarks (Global Benchmarks Library)
 * - Cost Library (Cost Library Management)
 * - DMS Admin (Document Templates)
 * - Report Configurator (Coming in Phase 2)
 */

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'preferences' | 'benchmarks' | 'cost-library' | 'dms-admin' | 'report-configurator';

export default function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('preferences');

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
              active={activeTab === 'preferences'}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('preferences');
              }}
            >
              Preferences
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              href="#"
              active={activeTab === 'benchmarks'}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('benchmarks');
              }}
            >
              Benchmarks
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              href="#"
              active={activeTab === 'cost-library'}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('cost-library');
              }}
            >
              Cost Library
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              href="#"
              active={activeTab === 'dms-admin'}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('dms-admin');
              }}
            >
              DMS Admin
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              href="#"
              active={activeTab === 'report-configurator'}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('report-configurator');
              }}
            >
              Report Configurator
            </CNavLink>
          </CNavItem>
        </CNav>

        {/* Tab Content Panels */}
        <div className="admin-modal-content p-4">
          {activeTab === 'preferences' && <PreferencesPanel />}
          {activeTab === 'benchmarks' && <BenchmarksPanel />}
          {activeTab === 'cost-library' && <CostLibraryPanel />}
          {activeTab === 'dms-admin' && <DMSAdminPanel />}
          {activeTab === 'report-configurator' && <ReportConfiguratorPanel />}
        </div>
      </CModalBody>
    </CModal>
  );
}
