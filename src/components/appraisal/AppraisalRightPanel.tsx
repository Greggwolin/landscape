/**
 * AppraisalRightPanel
 *
 * Right panel (320px): Tiles, sub-nav pills, approach summary views,
 * reports strip, and detail panel overlay.
 *
 * @version 1.0
 * @created 2026-04-04
 */

'use client';

import React from 'react';
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
  return (
    <div className="appraisal-right">
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div className="appraisal-rs-title" style={{ margin: 0 }}>Documents · 8</div>
              <button
                style={{ fontSize: 9, color: 'var(--cui-primary)', cursor: 'pointer', background: 'none', border: 'none' }}
                onClick={onBottomViewReset}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              {['Offering (1)', 'Market (4)', 'Diligence (1)', 'Leases (1)'].map((cat) => (
                <div
                  key={cat}
                  style={{
                    fontSize: 9,
                    padding: '3px 6px',
                    border: '1px solid var(--cui-border-color)',
                    borderRadius: 4,
                    color: 'var(--cui-tertiary-color)',
                  }}
                >
                  {cat}
                </div>
              ))}
            </div>
          </div>
        )}
        {bottomView === 'maps' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div className="appraisal-rs-title" style={{ margin: 0 }}>Map layers</div>
              <button
                style={{ fontSize: 9, color: 'var(--cui-primary)', cursor: 'pointer', background: 'none', border: 'none' }}
                onClick={onBottomViewReset}
              >
                ✕
              </button>
            </div>
            {[
              { color: 'var(--cui-warning)', label: 'Subject', count: '1' },
              { color: 'var(--cui-info)', label: 'Sales comps', count: '5' },
              { color: 'var(--cui-danger)', label: 'Rental comps', count: '8' },
            ].map((layer) => (
              <div
                key={layer.label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 4px', fontSize: 9 }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: layer.color }} />
                <span style={{ color: 'var(--cui-secondary-color)', flex: 1 }}>{layer.label}</span>
                <span style={{ color: 'var(--cui-tertiary-color)' }}>{layer.count}</span>
              </div>
            ))}
          </div>
        )}
        {bottomView === 'notebook' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div className="appraisal-rs-title" style={{ margin: 0 }}>Notebook</div>
              <button
                style={{ fontSize: 9, color: 'var(--cui-primary)', cursor: 'pointer', background: 'none', border: 'none' }}
                onClick={onBottomViewReset}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 9, color: 'var(--cui-secondary-color)', fontWeight: 500 }}>
              Today — Income approach
            </div>
            <div style={{ fontSize: 9, color: 'var(--cui-tertiary-color)', lineHeight: 1.4, marginTop: 2 }}>
              Session log and user notes will appear here.
            </div>
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
