'use client';

/**
 * StudioLayout - Main layout wrapper for Studio components
 *
 * STYLING RULES:
 * - All colors use CSS variables from studio-theme.css
 * - No Tailwind color classes (bg-*, text-*, border-* with colors)
 * - Tailwind layout utilities (flex, grid, gap, p-*, m-*) are allowed
 * - CoreUI components for interactive elements
 *
 * @version 1.0
 * @created 2026-01-20
 */

import React, { ReactNode } from 'react';
import { CContainer, CRow, CCol } from '@coreui/react';

export interface StudioLayoutProps {
  /**
   * Main content area
   */
  children: ReactNode;

  /**
   * Optional sidebar content (left panel)
   */
  sidebar?: ReactNode;

  /**
   * Optional header content
   */
  header?: ReactNode;

  /**
   * Layout variant
   * - 'full': Full width, no sidebar
   * - 'sidebar': With sidebar panel
   * - 'split': Two equal columns
   */
  variant?: 'full' | 'sidebar' | 'split';

  /**
   * Additional CSS classes (layout utilities only)
   */
  className?: string;
}

/**
 * StudioLayout provides a consistent layout structure for Studio components.
 *
 * Uses CSS variables for all colors to ensure theme consistency:
 * - --studio-bg: Main background
 * - --studio-panel-bg: Panel backgrounds
 * - --studio-border: Border colors
 *
 * @example
 * // Full width layout
 * <StudioLayout variant="full">
 *   <PropertyAttributeForm />
 * </StudioLayout>
 *
 * @example
 * // With sidebar
 * <StudioLayout
 *   variant="sidebar"
 *   sidebar={<PropertyNavigation />}
 * >
 *   <PropertyDetails />
 * </StudioLayout>
 */
export function StudioLayout({
  children,
  sidebar,
  header,
  variant = 'full',
  className = '',
}: StudioLayoutProps): JSX.Element {
  // Build layout based on variant
  const renderLayout = () => {
    switch (variant) {
      case 'sidebar':
        return (
          <CRow className="g-0">
            {/* Sidebar - fixed width */}
            <CCol
              xs={12}
              lg={3}
              style={{
                backgroundColor: 'var(--studio-panel-bg)',
                borderRight: '1px solid var(--studio-border)',
                minHeight: 'calc(100vh - var(--studio-header-height, 56px))',
              }}
            >
              <div className="p-4">{sidebar}</div>
            </CCol>

            {/* Main content area */}
            <CCol xs={12} lg={9}>
              <div className="p-4">{children}</div>
            </CCol>
          </CRow>
        );

      case 'split':
        return (
          <CRow className="g-4">
            <CCol xs={12} lg={6}>
              {sidebar}
            </CCol>
            <CCol xs={12} lg={6}>
              {children}
            </CCol>
          </CRow>
        );

      case 'full':
      default:
        return <div className="p-4">{children}</div>;
    }
  };

  return (
    <div
      className={`studio-layout ${className}`}
      style={{
        backgroundColor: 'var(--studio-bg)',
        color: 'var(--studio-text)',
        minHeight: '100%',
      }}
    >
      {/* Optional header */}
      {header && (
        <div
          className="studio-layout-header"
          style={{
            backgroundColor: 'var(--studio-panel-header-bg)',
            borderBottom: '1px solid var(--studio-border)',
            padding: '12px 16px',
          }}
        >
          {header}
        </div>
      )}

      {/* Main layout content */}
      <CContainer fluid className="p-0">
        {renderLayout()}
      </CContainer>
    </div>
  );
}

export default StudioLayout;
