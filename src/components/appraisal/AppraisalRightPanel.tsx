/**
 * AppraisalRightPanel
 *
 * Right panel (320px default, draggable 260–600px): Tiles, "Detail view" button,
 * sub-nav pills, approach summary views, reports strip, and detail panel overlay.
 *
 * In detail mode (detailMode === true), the entire panel is replaced by the
 * full-width detail content area + 48px icon rail on the right edge.
 *
 * @version 1.2
 * @created 2026-04-04
 * @updated 2026-04-07 — Added Detail view button, detail-content-area, icon-rail
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
import { getPillsForApproach, APPROACH_LABELS } from './appraisal.config';

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
  // Detail mode (full-width content area)
  detailMode: boolean;
  activeDetailPill: string | null;
  onEnterDetailMode: (pillId: string) => void;
  onExitDetailMode: () => void;
  onDetailPillChange: (pillId: string) => void;
  // Dock height/collapsed used only to reserve space below detail content
  // (the actual docked chat is rendered by AppraisalChatPanel, not here)
  dockedChatHeight: number;
  dockedChatCollapsed: boolean;
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
  detailMode,
  activeDetailPill,
  onEnterDetailMode,
  onExitDetailMode,
  onDetailPillChange,
  dockedChatHeight,
  dockedChatCollapsed,
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

  // Detail mode helpers
  const detailPillSet = getPillsForApproach(activeApproach);
  const detailPills = detailPillSet?.pills ?? [];
  const currentDetailPill = detailPills.find((p) => p.id === activeDetailPill);
  const detailTitle = currentDetailPill?.label ?? 'Detail';
  const approachLabel = APPROACH_LABELS[activeApproach] || 'Approach';

  // Detail mode: full-width content area + icon rail (replaces normal Studio)
  if (detailMode) {
    // Reserve vertical space at the bottom equal to the docked chat height.
    // The docked chat itself is rendered by AppraisalChatPanel as an
    // absolutely-positioned sibling so its React state persists across mode
    // switches. We shrink the detail area above it via padding-bottom so
    // scrollable content never slides behind the chat.
    const reservedHeight = dockedChatCollapsed ? 48 : dockedChatHeight;
    return (
      <>
        <div
          className="appraisal-detail-content-area"
          style={{ paddingBottom: reservedHeight }}
        >
          {/* Pill nav for detail mode */}
          <div className="appraisal-det-pills">
            {detailPills.map((pill) => {
              const isActive = pill.id === activeDetailPill;
              return (
                <button
                  type="button"
                  key={pill.id}
                  className={['appraisal-det-pill', isActive && 'active'].filter(Boolean).join(' ')}
                  onClick={() => onDetailPillChange(pill.id)}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Header */}
          <div className="appraisal-det-header">
            <div className="appraisal-det-title">{detailTitle}</div>
            <div className="appraisal-det-meta">{approachLabel}</div>
            <button
              type="button"
              className="appraisal-summary-btn"
              onClick={onExitDetailMode}
            >
              ⊟ Summary view
            </button>
          </div>

          {/* Toolbar */}
          <div className="appraisal-det-toolbar">
            <button type="button" className="appraisal-det-tool-btn">+ Add</button>
            <button type="button" className="appraisal-det-tool-btn">↑ Import</button>
            <button type="button" className="appraisal-det-tool-btn">↓ Export</button>
            <button type="button" className="appraisal-det-tool-btn">⚡ Auto-fill from OM</button>
            <input
              type="text"
              className="appraisal-det-search"
              placeholder="Filter..."
            />
          </div>

          {/* Body — placeholder table per active detail pill */}
          <div className="appraisal-det-body">
            <DetailBodyPlaceholder pillId={activeDetailPill} />
          </div>
        </div>

        {/* Icon rail (right edge, detail mode only) */}
        <div className="appraisal-icon-rail">
          <button
            type="button"
            className="appraisal-rail-icon"
            onClick={onExitDetailMode}
            title="Back to Studio"
          >
            <span>⊟</span>
            <span className="appraisal-rail-tip">Back to Studio</span>
          </button>
          <div className="appraisal-rail-divider" />
          <button
            type="button"
            className="appraisal-rail-icon"
            onClick={onExitDetailMode}
            title="Documents"
          >
            <span>📄</span>
            <span className="appraisal-rail-tip">Documents</span>
          </button>
          <button
            type="button"
            className="appraisal-rail-icon"
            onClick={onExitDetailMode}
            title="Maps"
          >
            <span>🗺</span>
            <span className="appraisal-rail-tip">Maps</span>
          </button>
          <button
            type="button"
            className="appraisal-rail-icon"
            onClick={onExitDetailMode}
            title="Notebook"
          >
            <span>📓</span>
            <span className="appraisal-rail-tip">Notebook</span>
          </button>
          <div className="appraisal-rail-divider" />
          {detailPills.slice(0, 4).map((pill) => {
            const isActive = pill.id === activeDetailPill;
            return (
              <button
                type="button"
                key={pill.id}
                className={['appraisal-rail-icon', isActive && 'active'].filter(Boolean).join(' ')}
                onClick={onExitDetailMode}
                title={pill.label}
              >
                <span>•</span>
                <span className="appraisal-rail-tip">{pill.label}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // Normal mode: Studio panel
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

      {/* Detail view button (global, full-width, between tiles and pills) */}
      <div className="appraisal-detail-btn-wrap">
        <button
          type="button"
          className="appraisal-detail-btn"
          onClick={() => onEnterDetailMode(activePill)}
        >
          ⤢ Detail view
        </button>
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

/* ───────────────────────────────────────────────────────────────────────
 * DetailBodyPlaceholder
 *
 * Static placeholder tables for detail-mode body content. One table per
 * pill ID. Wide-table style (not the compact Studio rows). All scaffold;
 * no real data wiring.
 * ─────────────────────────────────────────────────────────────────────── */

interface DetailBodyPlaceholderProps {
  pillId: string | null;
}

const RENT_ROLL_UNITS: Array<{
  unit: string;
  type: string;
  bd: number;
  ba: number;
  sf: number;
  contract: number;
  market: number;
  status: 'Occupied' | 'Vacant';
  lease: string;
}> = [
  { unit: '101', type: '1BR/1BA', bd: 1, ba: 1, sf: 650, contract: 1200, market: 1250, status: 'Occupied', lease: '2026-08-15' },
  { unit: '102', type: '1BR/1BA', bd: 1, ba: 1, sf: 650, contract: 1180, market: 1250, status: 'Occupied', lease: '2026-11-30' },
  { unit: '103', type: '1BR/1BA', bd: 1, ba: 1, sf: 655, contract: 1225, market: 1250, status: 'Occupied', lease: '2026-06-01' },
  { unit: '104', type: '2BR/1BA', bd: 2, ba: 1, sf: 880, contract: 1380, market: 1400, status: 'Occupied', lease: '2027-01-31' },
  { unit: '105', type: '2BR/1BA', bd: 2, ba: 1, sf: 880, contract: 1350, market: 1400, status: 'Occupied', lease: '2026-09-30' },
  { unit: '106', type: '2BR/1BA', bd: 2, ba: 1, sf: 885, contract: 1420, market: 1400, status: 'Occupied', lease: '2026-12-15' },
  { unit: '107', type: '2BR/2BA', bd: 2, ba: 2, sf: 950, contract: 1500, market: 1525, status: 'Occupied', lease: '2026-07-31' },
  { unit: '108', type: '2BR/2BA', bd: 2, ba: 2, sf: 950, contract: 1550, market: 1525, status: 'Occupied', lease: '2027-03-15' },
  { unit: '109', type: '3BR/2BA', bd: 3, ba: 2, sf: 1120, contract: 1650, market: 1690, status: 'Occupied', lease: '2026-10-31' },
  { unit: '110', type: '3BR/2BA', bd: 3, ba: 2, sf: 1120, contract: 1700, market: 1690, status: 'Occupied', lease: '2027-02-28' },
  { unit: '111', type: '1BR/1BA', bd: 1, ba: 1, sf: 650, contract: 0, market: 1250, status: 'Vacant', lease: '—' },
  { unit: '112', type: '1BR/1BA', bd: 1, ba: 1, sf: 650, contract: 1275, market: 1250, status: 'Occupied', lease: '2026-05-15' },
  { unit: '201', type: '1BR/1BA', bd: 1, ba: 1, sf: 650, contract: 1190, market: 1250, status: 'Occupied', lease: '2026-08-31' },
  { unit: '202', type: '2BR/1BA', bd: 2, ba: 1, sf: 880, contract: 1395, market: 1400, status: 'Occupied', lease: '2026-12-31' },
  { unit: '203', type: '2BR/2BA', bd: 2, ba: 2, sf: 955, contract: 1480, market: 1525, status: 'Occupied', lease: '2026-06-30' },
  { unit: '204', type: '3BR/2BA', bd: 3, ba: 2, sf: 1125, contract: 1710, market: 1690, status: 'Occupied', lease: '2027-01-15' },
  { unit: '205', type: '1BR/1BA', bd: 1, ba: 1, sf: 650, contract: 1240, market: 1250, status: 'Occupied', lease: '2026-09-15' },
  { unit: '206', type: '2BR/1BA', bd: 2, ba: 1, sf: 880, contract: 0, market: 1400, status: 'Vacant', lease: '—' },
  { unit: '207', type: '2BR/2BA', bd: 2, ba: 2, sf: 950, contract: 1510, market: 1525, status: 'Occupied', lease: '2026-11-30' },
  { unit: '208', type: '3BR/2BA', bd: 3, ba: 2, sf: 1120, contract: 1675, market: 1690, status: 'Occupied', lease: '2026-07-15' },
];

const PROFORMA_ROWS: Array<{ label: string; input: string; value: string; cls?: string; bold?: boolean }> = [
  { label: 'Potential gross income', input: '$1,385/unit', value: '$1,064,640' },
  { label: 'Vacancy', input: '5.0%', value: '($53,232)', cls: 'neg' },
  { label: 'Credit loss', input: '1.0%', value: '($10,114)', cls: 'neg' },
  { label: 'Effective gross income', input: '', value: '$1,001,294', bold: true },
  { label: 'Operating expenses', input: '40%', value: '($400,518)', cls: 'neg' },
  { label: 'Net operating income', input: '', value: '$600,776', bold: true, cls: 'pos' },
  { label: 'Going-in cap rate', input: '5.25%', value: '—' },
];

function RentRollTable() {
  const occupied = RENT_ROLL_UNITS.filter((u) => u.contract > 0);
  const vacant = RENT_ROLL_UNITS.length - occupied.length;
  const avgContract = Math.round(occupied.reduce((s, u) => s + u.contract, 0) / occupied.length);

  return (
    <table className="appraisal-det-table">
      <thead>
        <tr>
          <th>Unit</th>
          <th>Type</th>
          <th>Bd</th>
          <th>Ba</th>
          <th className="r">SF</th>
          <th className="r">Contract Rent</th>
          <th className="r">Market Rent</th>
          <th className="r">Variance</th>
          <th>Status</th>
          <th>Lease End</th>
        </tr>
      </thead>
      <tbody>
        {RENT_ROLL_UNITS.map((u) => {
          const variance = u.contract === 0 ? null : ((u.contract - u.market) / u.market) * 100;
          const varCls = variance === null ? '' : variance < 0 ? 'neg' : 'pos';
          const varText = variance === null ? '—' : `${variance.toFixed(1)}%`;
          return (
            <tr key={u.unit}>
              <td>{u.unit}</td>
              <td>{u.type}</td>
              <td>{u.bd}</td>
              <td>{u.ba}</td>
              <td className="r">{u.sf.toLocaleString()}</td>
              <td className={`r ${u.contract === 0 ? 'neg' : ''}`}>
                {u.contract === 0 ? '—' : `$${u.contract.toLocaleString()}`}
              </td>
              <td className="r">${u.market.toLocaleString()}</td>
              <td className={`r ${varCls}`}>{varText}</td>
              <td>
                <span className={`appraisal-det-status ${u.status === 'Vacant' ? 'vacant' : 'occupied'}`}>
                  {u.status}
                </span>
              </td>
              <td className="muted">{u.lease}</td>
            </tr>
          );
        })}
        <tr className="total">
          <td colSpan={5}>{RENT_ROLL_UNITS.length} units ({vacant} vacant)</td>
          <td className="r">Avg ${avgContract.toLocaleString()}</td>
          <td className="r">—</td>
          <td />
          <td />
          <td />
        </tr>
      </tbody>
    </table>
  );
}

function ProformaTable() {
  return (
    <table className="appraisal-det-table">
      <thead>
        <tr>
          <th>Line item</th>
          <th className="r">Input</th>
          <th className="r">Annual</th>
        </tr>
      </thead>
      <tbody>
        {PROFORMA_ROWS.map((row) => (
          <tr key={row.label} className={row.bold ? 'subtotal' : ''}>
            <td>{row.label}</td>
            <td className="r muted">{row.input || '—'}</td>
            <td className={`r ${row.cls || ''}`}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GenericPlaceholder({ label }: { label: string }) {
  return (
    <div className="appraisal-det-empty">
      <p>{label} workspace — placeholder content.</p>
      <p>This view will host the wide-table layout for {label.toLowerCase()} data in a future pass.</p>
    </div>
  );
}

function DetailBodyPlaceholder({ pillId }: DetailBodyPlaceholderProps) {
  if (!pillId) return <GenericPlaceholder label="Detail" />;
  if (pillId === 'income-rentroll') return <RentRollTable />;
  if (pillId === 'income-proforma') return <ProformaTable />;
  // Generic fallback for all other pills
  return <GenericPlaceholder label={pillId.replace(/^[a-z]+-/, '').replace(/-/g, ' ')} />;
}
