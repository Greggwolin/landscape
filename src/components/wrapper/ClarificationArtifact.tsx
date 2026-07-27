'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { emitLandscapeCommand } from '@/lib/landscape-command-bus';
import { getAuthHeaders } from '@/lib/authHeaders';

/**
 * Clarification / interview artifact — stepped renderer + Apply
 * (LSCMD-CLARIFY-ARTIFACT-0724-BA5, Phases 2 + 3b).
 *
 * Landscaper's QUESTIONS rendered as a stepped, one-question-at-a-time surface
 * in the right panel — never a wall of text in chat. Dispatched by
 * tool_name === 'open_clarification' (mirrors the LocationBriefArtifact carve-out),
 * reading params_json.clarification_config produced by
 * clarification_artifact_builder.build_clarification_config.
 *
 * Phase 2 stepped through the questions and held answers in local state.
 * Phase 3b makes them real:
 *   - a REVIEW state after the last question lists every staged answer;
 *   - APPLY posts the batch to the Phase-3a endpoint
 *     (POST /api/landscaper/clarification/apply/), which commits each writable
 *     step through that target tool's OWN writer in commit mode;
 *   - the response drives the per-step outcome (applied / skipped / error), the
 *     recomputed preliminary, the one-line engine-delta impact, and the DURABLE
 *     evidence flip (assumed → entered/benchmark, persisted server-side).
 *   - MODAL-target steps don't write here: they launch the existing designed
 *     form via the command bus (open_modal → ModalRegistry). That form owns its
 *     own save, so the step is reported as `skipped` by the apply endpoint —
 *     surfaced honestly, never a fake success.
 *
 * Hardcoded light palette, artifact-scoped (does NOT inherit the dark app theme),
 * matching LocationBriefArtifact / ExcelAuditArtifact.
 */

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

/* ─── Types (mirror params_json.clarification_config) ─────────────────── */
export type ClarificationEvidence = 'assumed' | 'entered' | 'benchmark' | 'calculated';

export interface ClarificationOption {
  value: unknown;
  label: string;
}

/** Write-back target, as normalized by clarification_artifact_builder:
 *  either a tool target ({tool, field?, value_key?, params?}) or a designed-form
 *  target ({modal, context?}). */
export interface ClarificationToolTarget {
  tool: string;
  field?: string;
  value_key?: string;
  params?: Record<string, unknown>;
}
export interface ClarificationModalTarget {
  modal: string;
  context?: Record<string, unknown>;
}
export type ClarificationTarget = ClarificationToolTarget | ClarificationModalTarget;

export interface ClarificationStep {
  id: string;
  order: number;
  question: string;
  input_type: 'number' | 'percent' | 'choice' | 'same_as' | 'toggle' | 'date' | 'text';
  default: unknown;
  options?: ClarificationOption[];
  unit?: string;
  evidence: ClarificationEvidence;
  target?: ClarificationTarget | null;
  help?: string;
}

export interface ClarificationPreliminary {
  label: string;
  value: unknown | null;
  evidence: 'calculated';
}

export interface ClarificationArtifactConfig {
  preliminary: ClarificationPreliminary | null;
  steps: ClarificationStep[];
  step_count: number;
}

/** Per-step outcome returned by the Phase-3a apply endpoint. */
interface ApplyStepResult {
  step_id: string;
  status: 'applied' | 'skipped' | 'error';
  tool?: string;
  field?: string;
  evidence?: ClarificationEvidence;
  reason?: string;
}

interface ApplyResponse {
  success?: boolean;
  error?: string;
  applied?: ApplyStepResult[];
  preliminary?: { label: string; value: number | null };
  impact_line?: string;
}

interface ClarificationArtifactProps {
  config: ClarificationArtifactConfig;
  /** Artifact primary key — the apply endpoint's handle on the stored config. */
  artifactId: number;
  onClose: () => void;
}

/* ─── Light palette (artifact-scoped) ────────────────────────────────── */
const P = {
  bg: '#f7f7f5',
  card: '#ffffff',
  ink: '#1a1a1a',
  muted: '#5a5a5a',
  mutedSoft: '#8a8a8a',
  accent: '#2e6f40',
  danger: '#a33a2b',
  warn: '#c17e1a',
  border: '#d9d9d4',
  borderSoft: '#ececea',
  headerBg: '#f4f3f0',
  inputBg: '#ffffff',
} as const;

const BADGE: Record<ClarificationEvidence, { bg: string; label: string }> = {
  assumed: { bg: '#c17e1a', label: 'assumed' },
  entered: { bg: '#2b5c8a', label: 'entered' },
  benchmark: { bg: '#1e6f5c', label: 'benchmark' },
  calculated: { bg: '#5a6a7e', label: 'calculated' },
};

const STATUS_COLOR: Record<ApplyStepResult['status'], string> = {
  applied: P.accent,
  skipped: P.warn,
  error: P.danger,
};

const STATUS_LABEL: Record<ApplyStepResult['status'], string> = {
  applied: 'applied',
  skipped: 'not applied',
  error: 'failed',
};

function Badge({ evidence }: { evidence: ClarificationEvidence }) {
  const b = BADGE[evidence];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 6,
        padding: '2px 8px',
        color: '#fff',
        background: b.bg,
      }}
    >
      {b.label}
    </span>
  );
}

function isModalTarget(t: ClarificationTarget | null | undefined): t is ClarificationModalTarget {
  return !!t && typeof (t as ClarificationModalTarget).modal === 'string';
}

function displayValue(step: ClarificationStep, value: unknown): string {
  if (step.input_type === 'choice' || step.input_type === 'same_as' || step.input_type === 'toggle') {
    const opt = (step.options || []).find((o) => o.value === value);
    if (opt) return opt.label;
  }
  if (value === null || value === undefined || value === '') return '—';
  return step.unit ? `${value} ${step.unit}` : String(value);
}

export function ClarificationArtifact({ config, artifactId, onClose }: ClarificationArtifactProps) {
  const steps = (config?.steps ?? []).slice().sort((a, b) => a.order - b.order);
  const configPreliminary = config?.preliminary ?? null;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(steps.map((s) => [s.id, s.default])),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  /** Steps whose designed form was launched — the form owns its own save. */
  const [formOpened, setFormOpened] = useState<Record<string, boolean>>({});

  // ── Apply state (Phase 3b) ────────────────────────────────────────────
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ApplyStepResult> | null>(null);
  const [impactLine, setImpactLine] = useState<string>('');
  const [livePreliminary, setLivePreliminary] = useState<{ label: string; value: number | null } | null>(null);

  if (steps.length === 0) {
    return (
      <div style={{ flex: 1, padding: 24, color: P.muted, background: P.bg }}>
        No questions to answer.
      </div>
    );
  }

  const reviewIdx = steps.length; // one past the last question = the review state
  const clamped = Math.min(idx, reviewIdx);
  const onReview = clamped === reviewIdx;
  const step = onReview ? steps[steps.length - 1] : steps[clamped];

  const setAnswer = (value: unknown) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
    setTouched((prev) => ({ ...prev, [step.id]: true }));
  };

  /** Badge for a step: the applied outcome wins (durable, from the server),
   *  then a local touch, then the authored evidence. */
  const evidenceFor = (s: ClarificationStep): ClarificationEvidence => {
    const r = results?.[s.id];
    if (r?.status === 'applied' && r.evidence) return r.evidence;
    if (touched[s.id]) return 'entered';
    return s.evidence;
  };

  const openDesignedForm = (s: ClarificationStep) => {
    const t = s.target;
    if (!isModalTarget(t)) return;
    emitLandscapeCommand('open_modal', { modal_name: t.modal, context: t.context });
    setFormOpened((prev) => ({ ...prev, [s.id]: true }));
  };

  /** Steps that carry a value worth sending. Modal steps are included so the
   *  endpoint reports them as skipped rather than them vanishing silently. */
  const payloadSteps = steps.filter(
    (s) => answers[s.id] !== null && answers[s.id] !== undefined && answers[s.id] !== '',
  );

  const handleApply = async () => {
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch(`${DJANGO_API_URL}/api/landscaper/clarification/apply/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          artifact_id: artifactId,
          answers: payloadSteps.map((s) => ({ step_id: s.id, value: answers[s.id] })),
        }),
      });
      const data: ApplyResponse = await res.json().catch(() => ({}) as ApplyResponse);
      if (!res.ok || data.success === false) {
        setApplyError(data.error || `Apply failed (${res.status}).`);
        return;
      }
      const byId: Record<string, ApplyStepResult> = {};
      for (const r of data.applied ?? []) {
        if (r && typeof r.step_id === 'string') byId[r.step_id] = r;
      }
      setResults(byId);
      setImpactLine(data.impact_line || '');
      setLivePreliminary(data.preliminary ?? null);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Apply failed.');
    } finally {
      setApplying(false);
    }
  };

  const answeredCount = steps.filter((s) => touched[s.id]).length;
  const appliedCount = results
    ? Object.values(results).filter((r) => r.status === 'applied').length
    : 0;
  const atFirst = clamped === 0;

  const preliminary = livePreliminary
    ? { label: livePreliminary.label, value: livePreliminary.value, evidence: 'calculated' as const }
    : configPreliminary;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: P.ink,
        background: P.bg,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: P.headerBg,
          borderBottom: `1px solid ${P.border}`,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>A few questions</div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: P.muted, display: 'flex' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Preliminary result strip — recomputed from the engine after Apply */}
      {preliminary && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: P.card,
            borderBottom: `1px solid ${P.borderSoft}`,
          }}
        >
          <span style={{ color: P.muted, fontSize: 13 }}>{preliminary.label}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 15 }}>
              {preliminary.value === null || preliminary.value === undefined
                ? '—'
                : formatPreliminary(preliminary.value)}
            </strong>
            <Badge evidence="calculated" />
          </span>
        </div>
      )}

      {/* Impact line — the engine delta, one line, never prose */}
      {impactLine && (
        <div
          style={{
            padding: '8px 16px',
            fontSize: 13,
            color: P.accent,
            background: '#eef4ef',
            borderBottom: `1px solid ${P.borderSoft}`,
          }}
        >
          {impactLine}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {onReview ? (
          <ReviewList
            steps={steps}
            answers={answers}
            results={results}
            evidenceFor={evidenceFor}
            onJump={(i) => setIdx(i)}
          />
        ) : (
          <>
            <div style={{ color: P.mutedSoft, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, marginBottom: 10 }}>
              STEP {clamped + 1} OF {steps.length}
              {answeredCount > 0 && (
                <span style={{ marginLeft: 8, color: P.accent }}>· {answeredCount} answered</span>
              )}
            </div>

            <div
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: 10,
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{step.question}</div>
                <Badge evidence={evidenceFor(step)} />
              </div>

              {step.help && (
                <div style={{ color: P.muted, fontSize: 13, marginTop: 6 }}>{step.help}</div>
              )}

              <div style={{ marginTop: 16 }}>
                {isModalTarget(step.target) ? (
                  <div>
                    <button onClick={() => openDesignedForm(step)} style={btnStyle(false, true)}>
                      Open form
                    </button>
                    <div style={{ color: P.muted, fontSize: 12, marginTop: 8, maxWidth: 380 }}>
                      {formOpened[step.id]
                        ? 'The form saves this value itself — it is not applied from here.'
                        : 'This one is captured in its own form, which saves it directly.'}
                    </div>
                  </div>
                ) : (
                  <>
                    <StepInput step={step} value={answers[step.id]} onChange={setAnswer} />
                    <div style={{ color: P.mutedSoft, fontSize: 12, marginTop: 10 }}>
                      Current: {displayValue(step, answers[step.id])}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {applyError && (
          <div style={{ color: P.danger, fontSize: 13, marginTop: 16 }}>{applyError}</div>
        )}

        {results && !applyError && (
          <div style={{ color: P.muted, fontSize: 13, marginTop: 16 }}>
            {appliedCount} of {Object.keys(results).length} answered items were written to the deal.
          </div>
        )}
      </div>

      {/* Footer — Back / Next / Apply */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderTop: `1px solid ${P.border}`,
          background: P.card,
        }}
      >
        <button
          onClick={() => setIdx(Math.max(0, clamped - 1))}
          disabled={atFirst || applying}
          style={btnStyle(atFirst || applying, false)}
        >
          Back
        </button>
        {onReview ? (
          <button
            onClick={handleApply}
            disabled={applying || payloadSteps.length === 0}
            style={btnStyle(applying || payloadSteps.length === 0, true)}
          >
            {applying
              ? 'Applying…'
              : results
                ? 'Apply again'
                : `Apply ${payloadSteps.length} answer${payloadSteps.length === 1 ? '' : 's'}`}
          </button>
        ) : (
          <button onClick={() => setIdx(clamped + 1)} style={btnStyle(false, true)}>
            {clamped === steps.length - 1 ? 'Review' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Money-ish preliminary formatting; falls back to the raw string for
 *  non-numeric values. Never invents precision the engine didn't give. */
function formatPreliminary(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value);
  const a = Math.abs(value);
  if (a >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/* ─── Review state — every staged answer + its outcome ───────────────── */
function ReviewList({
  steps,
  answers,
  results,
  evidenceFor,
  onJump,
}: {
  steps: ClarificationStep[];
  answers: Record<string, unknown>;
  results: Record<string, ApplyStepResult> | null;
  evidenceFor: (s: ClarificationStep) => ClarificationEvidence;
  onJump: (index: number) => void;
}) {
  return (
    <>
      <div style={{ color: P.mutedSoft, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, marginBottom: 10 }}>
        REVIEW
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s, i) => {
          const r = results?.[s.id];
          return (
            <div
              key={s.id}
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{s.question}</div>
                <Badge evidence={evidenceFor(s)} />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <span style={{ fontSize: 14 }}>{displayValue(s, answers[s.id])}</span>
                <button
                  onClick={() => onJump(i)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: P.accent,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Change
                </button>
              </div>
              {r && (
                <div style={{ marginTop: 8, fontSize: 12, color: STATUS_COLOR[r.status] }}>
                  {STATUS_LABEL[r.status]}
                  {r.reason ? ` — ${r.reason}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function btnStyle(disabled: boolean, primary: boolean): React.CSSProperties {
  return {
    border: `1px solid ${primary ? P.accent : P.border}`,
    background: disabled ? P.borderSoft : primary ? P.accent : P.card,
    color: disabled ? P.mutedSoft : primary ? '#fff' : P.ink,
    borderRadius: 8,
    padding: '7px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
  };
}

/* ─── The typed input widget for a step ──────────────────────────────── */
function StepInput({
  step,
  value,
  onChange,
}: {
  step: ClarificationStep;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const inputBase: React.CSSProperties = {
    border: `1px solid ${P.border}`,
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 15,
    background: P.inputBg,
    color: P.ink,
    width: '100%',
    maxWidth: 260,
  };

  if (step.input_type === 'choice' || step.input_type === 'same_as' || step.input_type === 'toggle') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(step.options || []).map((opt, i) => {
          const selected = opt.value === value;
          return (
            <label
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                border: `1px solid ${selected ? P.accent : P.border}`,
                borderRadius: 8,
                background: selected ? '#eef4ef' : P.card,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name={`step-${step.id}`}
                checked={selected}
                onChange={() => onChange(opt.value)}
              />
              <span style={{ fontSize: 14 }}>{opt.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (step.input_type === 'date') {
    return (
      <input
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        style={inputBase}
      />
    );
  }

  if (step.input_type === 'number' || step.input_type === 'percent') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          value={value === null || value === undefined ? '' : (value as number | string)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          style={inputBase}
        />
        {(step.unit || step.input_type === 'percent') && (
          <span style={{ color: P.muted, fontSize: 14 }}>{step.unit || '%'}</span>
        )}
      </div>
    );
  }

  // text
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      style={inputBase}
    />
  );
}
