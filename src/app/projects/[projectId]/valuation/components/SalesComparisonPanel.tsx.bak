/**
 * SalesComparisonPanel Component
 *
 * Main container for the redesigned Sales Comparison tab.
 * Combines:
 * - Map accordion (collapsed by default)
 * - Clean report-ready grid
 * - Collapsible narrative canvas with resize handle
 * - Indicated value summary
 *
 * This is the "output/preview" surface. The flyout remains the "input/editing" surface.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SalesComparable, ValuationReconciliation } from '@/types/valuation';
import { ComparablesGrid } from './ComparablesGrid';
import { MapAccordion } from './MapAccordion';
import { NarrativeCanvas } from './NarrativeCanvas';
import { IndicatedValueSummary } from './IndicatedValueSummary';
import { useFlyout } from '../../studio/components/FlyoutContext';
import { useProjectContext } from '@/app/components/ProjectProvider';

// Default and constraints for narrative panel width
const NARRATIVE_DEFAULT_WIDTH = 576;
const NARRATIVE_MIN_WIDTH = 320;
const NARRATIVE_MAX_WIDTH = 800;
const GRID_MIN_WIDTH = 600;
const GRID_MIN_WIDTH_WITH_REVIEW = 420;

interface SalesComparisonPanelProps {
  projectId: number;
  comparables: SalesComparable[];
  reconciliation: ValuationReconciliation | null;
  mode?: 'multifamily' | 'land';
}

interface ProjectDetails {
  street_address?: string;
  city?: string;
  state?: string;
  jurisdiction_city?: string;
  jurisdiction_state?: string;
  analysis_start_date?: string | null;
  total_units?: number;
  target_units?: number;
  gross_sf?: number;
  year_built?: number;
  ownership_type?: string;
}

export function SalesComparisonPanel({
  projectId,
  comparables,
  reconciliation,
  mode = 'multifamily'
}: SalesComparisonPanelProps) {
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);
  const [narrativeWidth, setNarrativeWidth] = useState(NARRATIVE_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [reviewFlyoutOpen, setReviewFlyoutOpen] = useState(false);
  const [subjectProperty, setSubjectProperty] = useState<{
    city?: string | null;
    analysisStartDate?: string | null;
    units?: number | null;
    buildingSf?: number | null;
    yearBuilt?: number | null;
    ownershipType?: string | null;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridMinWidth = reviewFlyoutOpen ? GRID_MIN_WIDTH_WITH_REVIEW : GRID_MIN_WIDTH;
  const { activeProject } = useProjectContext();

  // Try to use flyout context if available (only works in Studio)
  let openFlyout: ((flyoutId: string) => void) | null = null;
  try {
    const flyoutContext = useFlyout();
    openFlyout = (flyoutId: string) => flyoutContext.openFlyout(flyoutId);
  } catch {
    // Not in FlyoutProvider context (e.g., legacy valuation page)
    openFlyout = null;
  }

  const handleEditClick = useCallback(() => {
    if (openFlyout) {
      openFlyout('sales-comparison');
    }
  }, [openFlyout]);

  const handleEditComp = useCallback((comp: SalesComparable) => {
    if (openFlyout) {
      const compIndex = comparables.findIndex(item => item.comparable_id === comp.comparable_id);
      openFlyout('sales-comparison', undefined, undefined, {
        compId: comp.comparable_id,
        compIndex: compIndex >= 0 ? compIndex + 1 : undefined,
      });
    }
  }, [comparables, openFlyout]);

  const handleCanvasToggle = useCallback(() => {
    setCanvasCollapsed(prev => !prev);
  }, []);

  useEffect(() => {
    let active = true;
    const loadSubjectDetails = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/details`);
        if (response.ok) {
          const details = (await response.json()) as ProjectDetails;
          if (!active) return;
          setSubjectProperty({
            city: details.city ?? details.jurisdiction_city ?? activeProject?.jurisdiction_city ?? null,
            analysisStartDate: details.analysis_start_date ?? null,
            units: details.total_units ?? details.target_units ?? activeProject?.total_residential_units ?? null,
            buildingSf: details.gross_sf ?? activeProject?.total_commercial_sqft ?? null,
            yearBuilt: details.year_built ?? null,
            ownershipType: details.ownership_type ?? null
          });
          return;
        }
      } catch (error) {
        console.error('Failed to load subject property details:', error);
      }

      if (!active) return;
      setSubjectProperty({
        city: activeProject?.jurisdiction_city ?? null,
        analysisStartDate: null,
        units: activeProject?.total_residential_units ?? null,
        buildingSf: activeProject?.total_commercial_sqft ?? null,
        yearBuilt: null,
        ownershipType: null
      });
    };

    loadSubjectDetails();
    return () => {
      active = false;
    };
  }, [activeProject, projectId]);

  // Resize handle logic
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerRight = containerRect.right;

      // Calculate new width (from right edge of container to mouse position)
      const newWidth = containerRight - e.clientX;

      // Apply constraints
      const constrainedWidth = Math.min(
        Math.max(newWidth, NARRATIVE_MIN_WIDTH),
        Math.min(NARRATIVE_MAX_WIDTH, containerRect.width - gridMinWidth - 16) // 16px for margin
      );

      setNarrativeWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gridMinWidth, isResizing]);

  // Empty state
  if (comparables.length === 0) {
    return (
      <div
        className="text-center rounded border"
        style={{
          padding: '3rem 1rem',
          backgroundColor: 'var(--cui-card-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🏢</div>
        <h3
          className="fw-semibold mb-2"
          style={{ fontSize: '1.125rem', color: 'var(--cui-body-color)' }}
        >
          No Comparables Yet
        </h3>
        <p
          className="mb-4"
          style={{ fontSize: '0.9375rem', color: 'var(--cui-secondary-color)' }}
        >
          Add comparable sales to begin the valuation analysis
        </p>
        {openFlyout && (
          <button
            onClick={handleEditClick}
            className="btn btn-primary"
            type="button"
          >
            Add Comparables
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="sales-comparison-panel" ref={containerRef}>
      {/* Map Accordion - Collapsed by default */}
      <div className="sales-comparison-map-section mb-4">
        <MapAccordion projectId={projectId} />
      </div>

      {/* Main Content Area: Grid + Resize Handle + Narrative Canvas */}
      <div
        className="sales-comparison-content"
        style={{
          display: 'flex',
          gap: 0,
          alignItems: 'stretch',
          position: 'relative'
        }}
      >
        {/* Grid Section - Expands when canvas is collapsed, has minimum width */}
        <div
          className="sales-comparison-grid-section"
          style={{
            flex: 1,
            minWidth: `${gridMinWidth}px`,
            overflow: 'auto',
            transition: canvasCollapsed ? 'flex 0.2s ease' : undefined
          }}
        >
          <ComparablesGrid
            comparables={comparables}
            projectId={projectId}
            mode={mode}
            subjectProperty={subjectProperty ?? undefined}
            readOnly={true}
            onEdit={handleEditComp}
          />
        </div>

        {/* Resize Handle - Only visible when narrative is expanded */}
        {!canvasCollapsed && (
          <div
            className="sales-comparison-resize-handle"
            onMouseDown={handleResizeStart}
            style={{
              width: '6px',
              cursor: 'col-resize',
              backgroundColor: isResizing ? 'var(--cui-primary)' : 'transparent',
              transition: 'background-color 0.15s ease',
              flexShrink: 0,
              marginLeft: '0.5rem',
              borderRadius: '3px',
              position: 'relative',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = 'var(--cui-border-color)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
            title="Drag to resize"
          />
        )}

        {/* Narrative Canvas - Collapsible with dynamic width */}
        <div
          className="sales-comparison-narrative-wrapper"
          style={{
            width: canvasCollapsed ? '48px' : `${narrativeWidth * (reviewFlyoutOpen ? 2 : 1)}px`,
            minWidth: canvasCollapsed ? '48px' : `${narrativeWidth * (reviewFlyoutOpen ? 2 : 1)}px`,
            marginLeft: canvasCollapsed ? '1rem' : undefined,
            transition: isResizing ? undefined : 'width 0.2s ease, min-width 0.2s ease',
            flexShrink: 0
          }}
        >
          <NarrativeCanvas
            projectId={projectId}
            collapsed={canvasCollapsed}
            onToggle={handleCanvasToggle}
            onReviewFlyoutToggle={setReviewFlyoutOpen}
          />
        </div>
      </div>

      {/* Resize cursor overlay when dragging */}
      {isResizing && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: 'col-resize',
            zIndex: 9999
          }}
        />
      )}

      {/* Indicated Value Summary */}
      <div className="sales-comparison-summary-section mt-4">
        <IndicatedValueSummary
          comparables={comparables}
          reconciliation={reconciliation}
          subjectUnits={113}
          projectId={projectId}
        />
      </div>
    </div>
  );
}
