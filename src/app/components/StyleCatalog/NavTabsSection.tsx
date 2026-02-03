'use client';

import React from 'react';
import { CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react';

/**
 * NavTabsSection
 *
 * Displays the nav tab functional color coding system in StyleCatalog.
 * Shows the mapping table and live rendered nav tab samples.
 *
 * Functional Groups:
 * - Setup (Blue): Project, Property
 * - Financial (Cyan/Teal): Operations, Valuation
 * - Output (Purple): Capitalization, Reports
 * - Spatial (Green): Documents, Map
 */

interface NavTabConfig {
  group: string;
  groupColor: string;
  tabs: Array<{
    name: string;
    token: string;
    color: string;
    folderId: string;
  }>;
}

/**
 * D12 Nav Tab Color Registry — EXACT VALUES
 * DO NOT MODIFY these hex values
 */
const navTabRegistry: NavTabConfig[] = [
  {
    group: 'Setup',
    groupColor: '#2563eb',
    tabs: [
      { name: 'Project', token: '--nav-tab-project', color: '#2563eb', folderId: 'home' },
      { name: 'Property', token: '--nav-tab-property', color: '#3b82f6', folderId: 'property' },
    ],
  },
  {
    group: 'Financial',
    groupColor: '#0891b2',
    tabs: [
      { name: 'Operations', token: '--nav-tab-operations', color: '#0891b2', folderId: 'operations' },
      { name: 'Valuation', token: '--nav-tab-valuation', color: '#06b6d4', folderId: 'valuation' },
      { name: 'Capitalization', token: '--nav-tab-capitalization', color: '#0d9488', folderId: 'capital' },
    ],
  },
  {
    group: 'Output',
    groupColor: '#7c3aed',
    tabs: [
      { name: 'Reports', token: '--nav-tab-reports', color: '#7c3aed', folderId: 'reports' },
      { name: 'Documents', token: '--nav-tab-documents', color: '#8b5cf6', folderId: 'documents' },
    ],
  },
  {
    group: 'Spatial',
    groupColor: '#059669',
    tabs: [
      { name: 'Map', token: '--nav-tab-map', color: '#059669', folderId: 'map' },
    ],
  },
];

export function NavTabsSection() {
  return (
    <div
      style={{
        border: '1px solid var(--cui-border-color)',
        borderRadius: '10px',
        padding: '16px',
        background: 'var(--cui-card-bg)',
      }}
    >
      {/* Functional Groups Overview */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {navTabRegistry.map(({ group, groupColor, tabs }) => (
          <div
            key={group}
            style={{
              flex: '1 1 200px',
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--cui-tertiary-bg)',
              border: `2px solid ${groupColor}`,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: '8px',
                color: groupColor,
              }}
            >
              {group} Group
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {tabs.map(({ name, color }) => (
                <span
                  key={name}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: color,
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Token Mapping Table */}
      <CTable small striped className="mb-4">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell scope="col">Tab</CTableHeaderCell>
            <CTableHeaderCell scope="col">Group</CTableHeaderCell>
            <CTableHeaderCell scope="col">Token</CTableHeaderCell>
            <CTableHeaderCell scope="col">Color</CTableHeaderCell>
            <CTableHeaderCell scope="col">Folder ID</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {navTabRegistry.flatMap(({ group, tabs }) =>
            tabs.map(({ name, token, color, folderId }) => (
              <CTableRow key={folderId}>
                <CTableDataCell style={{ fontWeight: 500 }}>{name}</CTableDataCell>
                <CTableDataCell>
                  <span style={{ color: navTabRegistry.find((g) => g.group === group)?.groupColor }}>
                    {group}
                  </span>
                </CTableDataCell>
                <CTableDataCell>
                  <code
                    style={{
                      background: 'var(--cui-tertiary-bg)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {token}
                  </code>
                </CTableDataCell>
                <CTableDataCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: color,
                      }}
                    />
                    <code style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
                      {color}
                    </code>
                  </div>
                </CTableDataCell>
                <CTableDataCell>
                  <code
                    style={{
                      background: 'var(--cui-tertiary-bg)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    {folderId}
                  </code>
                </CTableDataCell>
              </CTableRow>
            ))
          )}
        </CTableBody>
      </CTable>

      {/* Live Tab Samples */}
      <div
        style={{
          background: 'var(--cui-tertiary-bg)',
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        <div
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--cui-secondary-color)',
            marginBottom: '12px',
          }}
        >
          Live Tab Samples (Inactive → Hover → Active)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {navTabRegistry.map(({ group, tabs }) => (
            <div key={group}>
              <small
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--cui-secondary-color)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                {group}
              </small>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {tabs.map(({ name, color }) => (
                  <div key={name} style={{ display: 'flex', gap: '4px' }}>
                    {/* Inactive state */}
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        color: color,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {name}
                    </span>
                    {/* Hover state */}
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: `color-mix(in srgb, ${color} 20%, transparent)`,
                        color: color,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {name}
                    </span>
                    {/* Active state */}
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: color,
                        color: '#FFFFFF',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Implementation Note */}
      <div
        style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: 'var(--cui-info-bg)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: 'var(--cui-body-color)',
        }}
      >
        <strong>Mode-Stable:</strong> Nav tab colors remain consistent between light and dark mode.
        Only the inactive background opacity increases in dark mode (12% → 20%) for better visibility.
        Tokens defined in{' '}
        <code style={{ background: 'var(--cui-tertiary-bg)', padding: '1px 4px', borderRadius: '3px' }}>
          src/styles/tokens.css
        </code>
        , applied in{' '}
        <code style={{ background: 'var(--cui-tertiary-bg)', padding: '1px 4px', borderRadius: '3px' }}>
          src/styles/folder-tabs.css
        </code>
      </div>
    </div>
  );
}

export default NavTabsSection;
