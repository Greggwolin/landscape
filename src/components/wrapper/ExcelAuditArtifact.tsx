'use client';

import React, { useMemo } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2, Info, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import type { ExcelAuditArtifactConfig } from '@/contexts/WrapperUIContext';

interface ExcelAuditArtifactProps {
  config: ExcelAuditArtifactConfig;
  onClose: () => void;
}

/**
 * Renders Excel audit tool results in the right artifacts panel.
 *
 * v3-style layout (matches `Audit_v3_Brownstone.html` reference):
 *   1. Header: doc name + trust badge
 *   2. VERDICT block: headline status, integrity verdict, S&U balance, trust
 *      score — what the user reads first
 *   3. Sections (in v3 order): Structure (condensed), Formula Integrity,
 *      Waterfall, Sources & Uses, Assumptions
 *
 * Phases 0-4 fill in as their tools fire; Phase 5 (Python replication) is
 * NOT YET IMPLEMENTED and the verdict surfaces this honestly.
 *
 * Hardcoded light palette matches LocationBriefArtifact — does NOT inherit
 * the app theme so the artifact reads consistently in either dark or light
 * shells.
 */

const P = {
  bg: '#f7f7f5',
  card: '#ffffff',
  ink: '#1a1a1a',
  inkSoft: '#2a2a2a',
  muted: '#5a5a5a',
  mutedSoft: '#8a8a8a',
  accent: '#185fa5',
  accentSoft: '#e6f0fa',
  border: '#d9d9d4',
  borderSoft: '#ececea',
  headerBg: '#f4f3f0',
  ok: '#2e6f40',
  okSoft: '#eaf5ed',
  warn: '#a35a00',
  warnSoft: '#faf0e0',
  bad: '#b64040',
  badSoft: '#f8e8e8',
  cosmetic: '#888',
} as const;

type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: P.bad,
  high: P.bad,
  medium: P.warn,
  low: P.cosmetic,
};

function severityIcon(sev: string) {
  if (sev === 'critical' || sev === 'high') return <AlertCircle size={14} />;
  if (sev === 'medium') return <AlertTriangle size={14} />;
  return <Info size={14} />;
}

function fmtPct(n?: number | null): string {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function fmtNum(n?: number | null): string {
  if (n === null || n === undefined) return '—';
  return n.toString();
}

function fmtCurrency(n?: number | null): string {
  if (n === null || n === undefined) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function trustBadgeColor(score: number, status?: string): { bg: string; fg: string } {
  if (status === 'cannot_verify') return { bg: P.cosmetic, fg: '#fff' };
  if (score >= 80) return { bg: P.ok, fg: '#fff' };
  if (score >= 50) return { bg: P.warn, fg: '#fff' };
  return { bg: P.bad, fg: '#fff' };
}

export function ExcelAuditArtifact({ config, onClose }: ExcelAuditArtifactProps) {
  const {
    doc_id,
    doc_name,
    classification,
    structural,
    integrity,
    assumptions,
    waterfall,
    sources_uses,
    trust_score,
  } = config;

  // Sort findings by severity for the integrity + waterfall sections
  const integrityFindings = useMemo(() => {
    const list = (integrity?.findings ?? []) as Array<Record<string, unknown>>;
    return [...list].sort((a, b) => {
      const sa = SEVERITY_ORDER[(a.severity as Severity) ?? 'low'] ?? 3;
      const sb = SEVERITY_ORDER[(b.severity as Severity) ?? 'low'] ?? 3;
      return sa - sb;
    });
  }, [integrity?.findings]);

  const waterfallFindings = useMemo(() => {
    const list = (waterfall?.findings ?? []) as Array<Record<string, unknown>>;
    return [...list].sort((a, b) => {
      const sa = SEVERITY_ORDER[(a.severity as Severity) ?? 'low'] ?? 3;
      const sb = SEVERITY_ORDER[(b.severity as Severity) ?? 'low'] ?? 3;
      return sa - sb;
    });
  }, [waterfall?.findings]);

  const sourcesUsesFindings = useMemo(() => {
    const list = (sources_uses?.findings ?? []) as Array<Record<string, unknown>>;
    return [...list].sort((a, b) => {
      const sa = SEVERITY_ORDER[(a.severity as Severity) ?? 'low'] ?? 3;
      const sb = SEVERITY_ORDER[(b.severity as Severity) ?? 'low'] ?? 3;
      return sa - sb;
    });
  }, [sources_uses?.findings]);

  const hasAnyPhase = !!(classification || structural || integrity || assumptions || waterfall || sources_uses || trust_score);

  return (
    <div
      style={{
        height: '100%',
        background: P.bg,
        color: P.ink,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 13,
        lineHeight: 1.5,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header — doc name + trust badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          background: P.headerBg,
          borderBottom: `1px solid ${P.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: P.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Excel Model Audit
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: P.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc_name || `doc_id ${doc_id}`}
          </div>
        </div>
        {trust_score && (
          <TrustBadge score={trust_score.trust_score} status={trust_score.headline_status} />
        )}
        <button
          onClick={onClose}
          aria-label="Close audit artifact"
          style={{
            background: 'transparent',
            border: 'none',
            color: P.muted,
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
        {!hasAnyPhase && (
          <div style={{ color: P.muted, fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
            No audit phases run yet. Ask Landscaper to classify the file or run the audit.
          </div>
        )}

        {/* ── VERDICT BLOCK — what the user reads first ─────────────── */}
        {hasAnyPhase && (
          <VerdictBlock
            integrity={integrity}
            sources_uses={sources_uses}
            trust_score={trust_score}
          />
        )}

        {/* ── Structure (Phase 0 + 1 condensed into one row) ────────── */}
        {(classification || structural) && (
          <StructureRow classification={classification} structural={structural} />
        )}

        {/* ── Phase 2: Formula Integrity ────────────────────────────── */}
        {integrity && (
          <Section title="Formula Integrity">
            {integrity.impact_summary && <ImpactSummary summary={integrity.impact_summary} />}
            <FindingList findings={integrityFindings} />
          </Section>
        )}

        {/* ── Phase 4: Waterfall ────────────────────────────────────── */}
        {waterfall && <WaterfallSection waterfall={waterfall} findings={waterfallFindings} />}

        {/* ── Phase 6: Sources & Uses ───────────────────────────────── */}
        {sources_uses && <SourcesUsesSection su={sources_uses} findings={sourcesUsesFindings} />}

        {/* ── Phase 3: Assumptions (condensed — most are in workbench) */}
        {assumptions && (
          <Section title="Assumption Extraction">
            <KvRow label="Staged">
              {fmtNum(assumptions.staged_count)}
              {assumptions.project_id ? (
                <span style={{ color: P.muted, marginLeft: 6 }}>(project {assumptions.project_id})</span>
              ) : (
                <span style={{ color: P.warn, marginLeft: 6 }}>(no project — extractions inline only)</span>
              )}
            </KvRow>
            {Array.isArray(assumptions.extractions) && assumptions.extractions.length > 0 && (
              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer', color: P.muted, fontSize: 12 }}>
                  Inline extractions ({assumptions.extractions.length})
                </summary>
                <pre style={{ fontSize: 11, marginTop: 6, padding: 8, background: P.bg, border: `1px solid ${P.borderSoft}`, borderRadius: 4, overflow: 'auto', maxHeight: 240 }}>
                  {JSON.stringify(assumptions.extractions, null, 2)}
                </pre>
              </details>
            )}
          </Section>
        )}

        {/* ── Trust score breakdown (collapsible) ───────────────────── */}
        {trust_score && trust_score.components && Object.keys(trust_score.components).length > 0 && (
          <Section title="Trust Score Breakdown">
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${P.borderSoft}` }}>
                  <th style={thStyle}>Component</th>
                  <th style={thStyle}>Weight</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Contribution</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(trust_score.components).map(([key, c]) => (
                  <tr key={key} style={{ borderBottom: `1px solid ${P.borderSoft}` }}>
                    <td style={tdStyle}>{key.replace(/_/g, ' ')}</td>
                    <td style={tdStyle}>{(c.weight * 100).toFixed(0)}%</td>
                    <td style={tdStyle}>{(c.raw_score * 100).toFixed(0)}%</td>
                    <td style={tdStyle}>{(c.contribution * 100).toFixed(1)} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: P.muted, marginTop: 6, fontStyle: 'italic' }}>
              {trust_score.rationale}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

/* ── VERDICT BLOCK ─────────────────────────────────────────────────── */

function VerdictBlock({
  integrity,
  sources_uses,
  trust_score,
}: {
  integrity?: ExcelAuditArtifactConfig['integrity'];
  sources_uses?: ExcelAuditArtifactConfig['sources_uses'];
  trust_score?: ExcelAuditArtifactConfig['trust_score'];
}) {
  // Build the headline. Priority:
  //   (1) trust_score.headline_status if available
  //   (2) integrity.impact_summary.verdict
  //   (3) generic "audit running"
  let headlineLabel: string;
  let headlineColor: string;
  let headlineIcon: React.ReactNode;
  let subText: string;

  if (trust_score) {
    if (trust_score.headline_status === 'verified') {
      headlineLabel = 'Model verified';
      headlineColor = P.ok;
      headlineIcon = <ShieldCheck size={18} />;
      subText = 'Python replication confirms the model math.';
    } else if (trust_score.headline_status === 'partial') {
      headlineLabel = 'Partial audit — Python replication not yet run';
      headlineColor = P.warn;
      headlineIcon = <Shield size={18} />;
      subText = 'Structural + extraction phases complete. Phase 5 (Python replication of the waterfall math) has not been implemented yet — the model\'s math has not been independently verified.';
    } else {
      headlineLabel = 'Insufficient phases run to render a verdict';
      headlineColor = P.cosmetic;
      headlineIcon = <ShieldAlert size={18} />;
      subText = 'Run more audit phases to populate the trust score.';
    }
  } else if (integrity?.impact_summary?.verdict) {
    const v = integrity.impact_summary.verdict;
    if (v === 'ALL_QUARANTINED') {
      headlineLabel = 'Errors are cosmetic — do not affect results';
      headlineColor = P.ok;
      headlineIcon = <ShieldCheck size={18} />;
      subText = integrity.impact_summary.verdict_text ?? '';
    } else if (v === 'ALL_REACH_OUTPUTS') {
      headlineLabel = 'Errors reach reported outputs';
      headlineColor = P.bad;
      headlineIcon = <ShieldAlert size={18} />;
      subText = integrity.impact_summary.verdict_text ?? '';
    } else if (v === 'MIXED') {
      headlineLabel = 'Mixed — some errors reach outputs, some are cosmetic';
      headlineColor = P.warn;
      headlineIcon = <Shield size={18} />;
      subText = integrity.impact_summary.verdict_text ?? '';
    } else {
      headlineLabel = 'Audit in progress';
      headlineColor = P.cosmetic;
      headlineIcon = <Shield size={18} />;
      subText = '';
    }
  } else {
    headlineLabel = 'Audit in progress';
    headlineColor = P.cosmetic;
    headlineIcon = <Shield size={18} />;
    subText = 'Run formula integrity to see the verdict.';
  }

  return (
    <div
      style={{
        marginBottom: 14,
        padding: 14,
        background: P.card,
        borderRadius: 6,
        border: `1px solid ${P.border}`,
        borderLeft: `4px solid ${headlineColor}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: headlineColor, display: 'inline-flex', alignItems: 'center' }}>{headlineIcon}</span>
        <div style={{ fontSize: 13, fontWeight: 700, color: headlineColor, letterSpacing: '0.02em' }}>
          {headlineLabel}
        </div>
      </div>
      {subText && (
        <div style={{ fontSize: 12, color: P.inkSoft, lineHeight: 1.5, marginBottom: 8 }}>{subText}</div>
      )}

      {/* Quick-glance metrics row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: P.inkSoft }}>
        {integrity?.impact_summary && (
          <span>
            <strong style={{ color: P.bad }}>{integrity.impact_summary.errors_reaching_headline}</strong>
            <span style={{ color: P.muted }}> reach outputs</span>
            {' · '}
            <strong style={{ color: P.cosmetic }}>{integrity.impact_summary.errors_quarantined}</strong>
            <span style={{ color: P.muted }}> quarantined</span>
          </span>
        )}
        {sources_uses && sources_uses.delta !== null && (
          <span>
            <span style={{ color: P.muted }}>S&U: </span>
            {sources_uses.balanced ? (
              <strong style={{ color: P.ok }}>balanced</strong>
            ) : (
              <strong style={{ color: P.bad }}>delta {fmtCurrency(sources_uses.delta)}</strong>
            )}
          </span>
        )}
        {trust_score && (
          <span>
            <span style={{ color: P.muted }}>Trust: </span>
            <strong style={{ color: trustBadgeColor(trust_score.trust_score, trust_score.headline_status).bg }}>
              {trust_score.trust_score.toFixed(0)}/100
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}

function TrustBadge({ score, status }: { score: number; status?: string }) {
  const c = trustBadgeColor(score, status);
  return (
    <div
      title={status === 'cannot_verify' ? 'Insufficient phases run to compute trust' : `Trust: ${score.toFixed(0)}/100`}
      style={{
        background: c.bg,
        color: c.fg,
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      Trust: {status === 'cannot_verify' ? '—' : `${score.toFixed(0)}/100`}
    </div>
  );
}

/* ── Structure row (Phase 0 + 1 condensed) ──────────────────────────── */

function StructureRow({
  classification,
  structural,
}: {
  classification?: ExcelAuditArtifactConfig['classification'];
  structural?: ExcelAuditArtifactConfig['structural'];
}) {
  const tier = classification?.tier;
  const tierColor =
    tier === 'full_model' ? P.accent :
    tier === 'assumption_heavy' ? P.warn :
    tier === 'flat' ? P.cosmetic : P.mutedSoft;
  return (
    <div
      style={{
        marginBottom: 14,
        padding: '8px 12px',
        background: P.card,
        borderRadius: 4,
        border: `1px solid ${P.borderSoft}`,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        fontSize: 12,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Structure
      </span>
      {tier && (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 3,
            background: tierColor,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {tier}
        </span>
      )}
      {structural && (
        <>
          <span>
            <strong>{structural.sheet_count}</strong>
            <span style={{ color: P.muted }}> sheets</span>
            {structural.hidden_sheet_count > 0 && (
              <span style={{ color: P.warn }}> ({structural.hidden_sheet_count} hidden)</span>
            )}
          </span>
          {structural.named_range_count > 0 && (
            <span>
              <strong>{structural.named_range_count}</strong>
              <span style={{ color: P.muted }}> named ranges</span>
            </span>
          )}
          {structural.external_link_count > 0 && (
            <span>
              <strong style={{ color: P.bad }}>{structural.external_link_count}</strong>
              <span style={{ color: P.muted }}> external links</span>
            </span>
          )}
        </>
      )}
      {classification && (
        <details style={{ marginLeft: 'auto' }}>
          <summary style={{ cursor: 'pointer', color: P.muted, fontSize: 11 }}>why</summary>
          <div style={{ fontSize: 11, color: P.inkSoft, marginTop: 4, padding: 6, background: P.bg, borderRadius: 3 }}>
            {classification.rationale}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── Impact summary box (Phase 2 verdict mini-card) ─────────────────── */

function ImpactSummary({
  summary,
}: {
  summary: NonNullable<NonNullable<ExcelAuditArtifactConfig['integrity']>['impact_summary']>;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        marginBottom: 8,
        padding: '6px 10px',
        background: P.bg,
        borderRadius: 3,
        fontSize: 12,
      }}
    >
      <span>
        <strong style={{ color: P.bad }}>{summary.errors_reaching_headline}</strong>
        <span style={{ color: P.muted }}> reach outputs</span>
      </span>
      <span>
        <strong style={{ color: P.cosmetic }}>{summary.errors_quarantined}</strong>
        <span style={{ color: P.muted }}> quarantined</span>
      </span>
      {summary.total_traced > 0 && (
        <span style={{ color: P.muted }}>({summary.total_traced} traced)</span>
      )}
    </div>
  );
}

/* ── Waterfall section ──────────────────────────────────────────────── */

function WaterfallSection({
  waterfall,
  findings,
}: {
  waterfall: NonNullable<ExcelAuditArtifactConfig['waterfall']>;
  findings: Array<Record<string, unknown>>;
}) {
  return (
    <Section title="Waterfall">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 8, fontSize: 12 }}>
        <span><span style={{ color: P.muted }}>Type: </span><strong>{waterfall.waterfall_type}</strong></span>
        {waterfall.sheet_name && <span><span style={{ color: P.muted }}>Sheet: </span>{waterfall.sheet_name}</span>}
        <span><span style={{ color: P.muted }}>Tiers: </span><strong>{waterfall.tier_count}</strong></span>
        {waterfall.pref_rate !== null && <span><span style={{ color: P.muted }}>Pref: </span><strong>{fmtPct(waterfall.pref_rate)}</strong></span>}
        {waterfall.pref_compounding && <span><span style={{ color: P.muted }}>Compounding: </span>{waterfall.pref_compounding}</span>}
        {waterfall.sponsor_coinvest_pct !== null && (
          <span><span style={{ color: P.muted }}>SP co-invest: </span><strong>{fmtPct(waterfall.sponsor_coinvest_pct)}</strong></span>
        )}
      </div>

      {Array.isArray(waterfall.tiers) && waterfall.tiers.length > 0 && (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: findings.length > 0 ? 8 : 0 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${P.borderSoft}` }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Hurdle</th>
              <th style={thStyle}>LP/GP</th>
            </tr>
          </thead>
          <tbody>
            {(waterfall.tiers as Array<Record<string, unknown>>).map((t, i) => {
              const idx = (t.index as number) ?? i + 1;
              const ttype = (t.tier_type as string) ?? '—';
              const hv = t.hurdle_value as number | null;
              const ht = t.hurdle_type as string | null;
              const lp = t.split_lp_pct as number | null;
              const gp = t.split_gp_pct as number | null;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${P.borderSoft}` }}>
                  <td style={tdStyle}>{idx}</td>
                  <td style={tdStyle}>{ttype}</td>
                  <td style={tdStyle}>{hv !== null && hv !== undefined ? `${ht ?? '?'} ${ttype === 'hurdle_split' && ht === 'EM' ? hv.toFixed(2) + 'x' : fmtPct(hv)}` : '—'}</td>
                  <td style={tdStyle}>
                    {lp !== null && lp !== undefined && gp !== null && gp !== undefined
                      ? `${(lp * 100).toFixed(0)}/${(gp * 100).toFixed(0)}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {findings.length > 0 && <FindingList findings={findings} />}
    </Section>
  );
}

/* ── Sources & Uses section (Phase 6) ───────────────────────────────── */

function SourcesUsesSection({
  su,
  findings,
}: {
  su: NonNullable<ExcelAuditArtifactConfig['sources_uses']>;
  findings: Array<Record<string, unknown>>;
}) {
  if (!su.sheet_name && (!su.sources || su.sources.length === 0) && (!su.uses || su.uses.length === 0)) {
    return (
      <Section title="Sources & Uses">
        <div style={{ fontSize: 12, color: P.muted, fontStyle: 'italic' }}>{su.rationale}</div>
      </Section>
    );
  }

  const balanceColor = su.balanced ? P.ok : (su.delta !== null && su.delta > 100 ? P.bad : P.warn);
  const balanceLabel = su.balanced ? 'BALANCED' : su.delta !== null ? `OFF BY ${fmtCurrency(su.delta)}` : 'INCOMPLETE';

  return (
    <Section title="Sources & Uses">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12 }}>
        {su.sheet_name && <span style={{ color: P.muted }}>Sheet: <strong style={{ color: P.ink }}>{su.sheet_name}</strong></span>}
        <span style={{
          padding: '2px 8px',
          borderRadius: 3,
          background: balanceColor,
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
          marginLeft: 'auto',
        }}>
          {balanceLabel}
        </span>
      </div>

      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${P.border}` }}>
            <th colSpan={3} style={{ ...thStyle, fontSize: 11, color: P.accent, paddingTop: 6 }}>Sources</th>
          </tr>
        </thead>
        <tbody>
          {su.sources.map((s, i) => (
            <tr key={`src-${i}`} style={{ borderBottom: `1px solid ${P.borderSoft}` }}>
              <td style={tdStyle}>{s.label}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCurrency(s.value)}</td>
              <td style={{ ...tdStyle, fontFamily: 'SFMono-Regular, Consolas, monospace', color: P.muted, fontSize: 11 }}>{s.sheet_cell}</td>
            </tr>
          ))}
          {su.sources_total !== null && (
            <tr style={{ borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`, background: P.bg }}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Total Sources</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmtCurrency(su.sources_total)}</td>
              <td style={{ ...tdStyle, fontFamily: 'SFMono-Regular, Consolas, monospace', color: P.muted, fontSize: 11 }}>{su.sources_total_cell ?? '—'}</td>
            </tr>
          )}
          <tr>
            <th colSpan={3} style={{ ...thStyle, fontSize: 11, color: P.accent, paddingTop: 10 }}>Uses</th>
          </tr>
          {su.uses.map((u, i) => (
            <tr key={`use-${i}`} style={{ borderBottom: `1px solid ${P.borderSoft}` }}>
              <td style={tdStyle}>{u.label}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCurrency(u.value)}</td>
              <td style={{ ...tdStyle, fontFamily: 'SFMono-Regular, Consolas, monospace', color: P.muted, fontSize: 11 }}>{u.sheet_cell}</td>
            </tr>
          ))}
          {su.uses_total !== null && (
            <tr style={{ borderTop: `1px solid ${P.border}`, background: P.bg }}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Total Uses</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmtCurrency(su.uses_total)}</td>
              <td style={{ ...tdStyle, fontFamily: 'SFMono-Regular, Consolas, monospace', color: P.muted, fontSize: 11 }}>{su.uses_total_cell ?? '—'}</td>
            </tr>
          )}
        </tbody>
      </table>

      {findings.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <FindingList findings={findings} />
        </div>
      )}
    </Section>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: 12,
        background: P.card,
        borderRadius: 6,
        border: `1px solid ${P.border}`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: P.accent, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function KvRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, fontSize: 12 }}>
      <span style={{ color: P.muted, minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: P.ink, flex: 1 }}>{children}</span>
    </div>
  );
}

function FindingList({ findings }: { findings: Array<Record<string, unknown>> }) {
  if (findings.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: P.ok }}>
        <CheckCircle2 size={14} />
        <span>No findings.</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {findings.map((f, i) => {
        const sev = (f.severity as Severity) ?? 'low';
        const isCosmetic = f.is_cosmetic === true;
        const cell = (f.sheet_cell as string) ?? (f.ref as string) ?? '';
        const cat = (f.category as string) ?? '';
        const msg = (f.message as string) ?? '';
        return (
          <div
            key={i}
            style={{
              padding: '6px 8px',
              borderRadius: 4,
              background: P.card,
              border: `1px solid ${P.borderSoft}`,
              borderLeft: `3px solid ${SEVERITY_COLOR[sev]}`,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ color: SEVERITY_COLOR[sev], display: 'inline-flex', alignItems: 'center' }}>
                {severityIcon(sev)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: SEVERITY_COLOR[sev], textTransform: 'uppercase' }}>
                {sev}
              </span>
              {cat && (
                <span style={{ fontSize: 10, color: P.muted, padding: '1px 5px', background: P.headerBg, borderRadius: 3 }}>
                  {cat}
                </span>
              )}
              {isCosmetic && (
                <span style={{ fontSize: 10, color: P.cosmetic, fontStyle: 'italic' }}>cosmetic</span>
              )}
              {cell && (
                <span style={{ fontSize: 11, color: P.muted, fontFamily: 'SFMono-Regular, Consolas, monospace', marginLeft: 'auto' }}>
                  {cell}
                </span>
              )}
            </div>
            <div style={{ color: P.inkSoft, lineHeight: 1.45 }}>{msg}</div>
          </div>
        );
      })}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '4px 6px',
  fontSize: 10,
  fontWeight: 600,
  color: P.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 6px',
  color: P.ink,
};
