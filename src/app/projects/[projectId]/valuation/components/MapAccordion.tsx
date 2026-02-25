/**
 * MapAccordion Component
 *
 * Collapsible accordion wrapper for the comparables map.
 * Collapsed by default, shows subject + all comparables when expanded.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { CCollapse } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilChevronTop, cilMap } from '@coreui/icons';
import ValuationSalesCompMap, { ValuationSalesCompMapRef } from '@/components/map/ValuationSalesCompMap';

interface MapAccordionProps {
  projectId: number;
}

export function MapAccordion({ projectId }: MapAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ValuationSalesCompMapRef>(null);

  // Mount map after accordion opens and transition completes
  useEffect(() => {
    if (isOpen && !mapMounted) {
      // Wait for collapse animation to complete before mounting map
      const timer = setTimeout(() => {
        setMapMounted(true);
      }, 350); // Match CCollapse transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, mapMounted]);

  // Trigger map resize when it becomes visible
  useEffect(() => {
    if (mapMounted && isOpen) {
      // Give the map a moment to render, then call resize directly on the map ref
      const timer = setTimeout(() => {
        mapRef.current?.resize();
      }, 100);
      // Also trigger again after a longer delay to ensure tiles load
      const timer2 = setTimeout(() => {
        mapRef.current?.resize();
      }, 500);
      // One more resize after animation is definitely complete
      const timer3 = setTimeout(() => {
        mapRef.current?.resize();
      }, 1000);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [mapMounted, isOpen]);

  return (
    <div
      className="sales-comparison-map-accordion"
      style={{
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: '1px solid var(--cui-border-color)',
        backgroundColor: 'var(--cui-card-bg)'
      }}
    >
      {/* Custom Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="d-flex align-items-center justify-content-between w-100"
        style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--surface-card-header)',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--cui-body-color)',
          fontWeight: 600,
          fontSize: '1.125rem',
          borderRadius: isOpen ? '0.5rem 0.5rem 0 0' : '0.5rem'
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <CIcon icon={cilMap} style={{ width: '1.25rem', height: '1.25rem' }} />
          <span>Comparable Locations</span>
        </div>
        <CIcon
          icon={isOpen ? cilChevronTop : cilChevronBottom}
          style={{ width: '1.25rem', height: '1.25rem' }}
        />
      </button>

      {/* Collapsible Body */}
      <CCollapse visible={isOpen}>
        <div
          ref={mapContainerRef}
          className="sales-comparison-map-container"
          style={{
            borderTop: '1px solid var(--cui-border-color)',
            height: '400px',
            minHeight: '400px'
          }}
        >
          {mapMounted ? (
            <ValuationSalesCompMap
              ref={mapRef}
              projectId={projectId.toString()}
              styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
              height="400px"
            />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                height: '400px',
                backgroundColor: 'var(--cui-tertiary-bg)',
                color: 'var(--cui-secondary-color)'
              }}
            >
              <div className="text-center">
                <div
                  className="spinner-border spinner-border-sm mb-3"
                  role="status"
                  style={{ color: 'var(--cui-primary)' }}
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="small mb-0">Loading map...</p>
              </div>
            </div>
          )}
        </div>
      </CCollapse>
    </div>
  );
}
