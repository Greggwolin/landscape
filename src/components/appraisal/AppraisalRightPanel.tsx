/**
 * AppraisalRightPanel
 *
 * Right panel (320px default, draggable 260–600px): Tiles, sub-nav pills,
 * approach summary views, reports strip, and detail panel overlay.
 *
 * @version 1.1
 * @created 2026-04-04
 * @updated 2026-04-05 — Added draggable resize handle
 */

'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { ApproachId, BottomView, DetailId } from './appraisal.types';
import { ApproachPills } from './approach/ApproachPills';
import { ApproachSummary } from './approach/ApproachSummary';
import { DocumentsTile } from './tiles/DocumentsTile';
import { MapsTile } from './tiles/MapsTile';
import { NotebookTile } from './tiles/NotebookTile';
import { ReportsStrip } from './reports/ReportsStrip';
import { DetailPanel } from './detail/DetailPanel';
import { SectionDivider } from './shared/SectionDivider';

interface AppraisalRightPanelProps {
  activeApproach: ApproachId;
  activePill: string;
  onPillChange: (pillId: string) => void;
  detailOpen: boolean;
  detailId: DetailId | string;
  detailLabel: string;
  onOpenDetail: (id: DetailId | string, label?: string) => void;
  onCloseDetail: () => void;
  bottomView: BottomView;
  onBottomViewChange: (view: BottomView) => void;
  onBottomViewReset: () => void;
}

export function AppraisalRightPanel({
  activeApproach,
  activePill,
  onPillChange,
  detailOpen,
  detailId,
  detailLabel,
  onOpenDetail,
  onCloseDetail,
  bottomView,
  onBottomViewChange,
  onBottomViewReset,
}: AppraisalRightPanelProps) {
  const [width, setWidth] = useState(320);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startX - e.clientX;
    const newWidth = Math.min(600, Math.max(260, dragRef.current.startWidth + delta));
    setWidth(newWidth);
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startWidth: width };
    document.body.classList.add('resizing');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [width, onMouseMove, onMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('resizing');
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div className="appraisal-right" style={{ width }}>
      {/* Drag handle */}
      <div className="right-resize" onMouseDown={onMouseDown} />

      {/* Header */}
      <div className="appraisal-right-hdr">
        <div className="appraisal-rh-title">Studio</div>
      </div>

      {/* Tiles */}
      <div className="appraisal-tile-grid">
        <DocumentsTile
          active={bottomView === 'docs'}
          onClick={() => onBottomViewChange('docs')}
        />
        <MapsTile
          active={bottomView === 'maps'}
          onClick={() => onBottomViewChange('maps')}
        />
        <NotebookTile
          active={bottomView === 'notebook'}
          onClick={() => onBottomViewChange('notebook')}
        />
      </div>

      <SectionDivider />

      {/* Sub-nav pills */}
      <ApproachPills
        activeApproach={activeApproach}
        activePill={activePill}
        onPillChange={onPillChange}
      />

      {/* View area — content driven by active pill */}
      <div className="appraisal-view-area">
        <ApproachSummary
          activePill={activePill}
          onOpenDetail={onOpenDetail}
        />
      </div>

      <SectionDivider />

      {/* Bottom section — Reports (default), Docs, Maps, Notebook */}
      <div className="appraisal-bottom-section">
        {bottomView === 'reports' && <ReportsStrip />}
        {bottomView === 'docs' && (
          <div>
            <div className="bs-header">
              <div className="appraisal-rs-title">Documents · 8</div>
              <button className="bs-close" onClick={onBottomViewReset}>✕</button>
            </div>
            <div className="bs-doc-grid">
              {['Offering (1)', 'Market (4)', 'Diligence (1)', 'Leases (1)'].map((cat) => (
                <div key={cat} className="bs-doc-item">{cat}</div>
              ))}
            </div>
          </div>
        )}
        {bottomView === 'maps' && (
          <div>
            <div className="bs-header">
              <div className="appraisal-rs-title">Map layers</div>
              <button className="bs-close" onClick={onBottomViewReset}>✕</button>
            </div>
            {[
              { color: 'var(--cui-warning)', label: 'Subject', count: '1' },
              { color: 'var(--cui-info)', label: 'Sales comps', count: '5' },
              { color: 'var(--cui-danger)', label: 'Rental comps', count: '8' },
            ].map((layer) => (
              <div key={layer.label} className="bs-layer-row">
                <div className="bs-layer-dot" style={{ background: layer.color }} />
                <span className="bs-layer-label">{layer.label}</span>
                <span className="bs-layer-count">{layer.count}</span>
              </div>
            ))}
          </div>
        )}
        {bottomView === 'notebook' && (
          <div>
            <div className="bs-header">
              <div className="appraisal-rs-title">Notebook</div>
              <button className="bs-close" onClick={onBottomViewReset}>✕</button>
            </div>
            <div className="bs-nb-date">Today — Income approach</div>
            <div className="bs-nb-body">Session log and user notes will appear here.</div>
          </div>
        )}
      </div>

      {/* Detail panel overlay */}
      <DetailPanel
        open={detailOpen}
        detailId={detailId}
        detailLabel={detailLabel}
        onClose={onCloseDetail}
      />
    </div>
  );
}
