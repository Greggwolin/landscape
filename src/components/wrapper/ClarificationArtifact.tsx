'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Clarification / interview artifact — Phase 2 renderer
 * (LSCMD-CLARIFY-ARTIFACT-0724-BA5).
 *
 * Landscaper's QUESTIONS rendered as a stepped, one-question-at-a-time surface
 * in the right panel — never a wall of text in chat. Dispatched by
 * tool_name === 'open_clarification' (mirrors the LocationBriefArtifact carve-out),
 * reading params_json.clarification_config produced by
 * clarification_artifact_builder.build_clarification_config.
 *
 * Phase 2 is RENDER-ONLY: it steps through the questions, shows pre-filled
 * editable defaults with four-state evidence tags, and holds answers in local
 * state (touching a default flips its tag assumed → entered visually). The real
 * write-back through each step's `target` and the live preliminary recompute are
 * Phase 3 — deliberately not wired here.
 *
 * Hardcoded light palette, artifact-scoped (does NOT inherit the dark app theme),
 * matching LocationBriefArtifact / ExcelAuditArtifact.
 */

/* ─── Types (mirror params_json.clarification_config) ─────────────────── */
export type ClarificationEvidence = 'assumed' | 'entered' | 'benchmark' | 'calculated';

export interface ClarificationOption {
  value: unknown;
  label: string;
}

export interface ClarificationStep {
  id: string;
  order: number;
  question: string;
  input_type: 'number' | 'percent' | 'choice' | 'same_as' | 'toggle' | 'date' | 'text';
  default: unknown;
  options?: ClarificationOption[];
  unit?: string;
  evidence: ClarificationEvidence;
  target?: unknown;
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

interface ClarificationArtifactProps {
  config: ClarificationArtifactConfig;
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

function displayValue(step: ClarificationStep, value: unknown): string {
  if (step.input_type === 'choice' || step.input_type === 'same_as' || step.input_type === 'toggle') {
    const opt = (step.options || []).find((o) => o.value === value);
    if (opt) return opt.label;
  }
  if (value === null || value === undefined || value === '') return '—';
  return step.unit ? `${value} ${step.unit}` : String(value);
}

export function ClarificationArtifact({ config, onClose }: ClarificationArtifactProps) {
  const steps = (config?.steps ?? []).slice().sort((a, b) => a.order - b.order);
  const preliminary = config?.preliminary ?? null;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(steps.map((s) => [s.id, s.default])),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  if (steps.length === 0) {
    return (
      <div style={{ flex: 1, padding: 24, color: P.muted, background: P.bg }}>
        No questions to answer.
      </div>
    );
  }

  const clamped = Math.min(idx, steps.length - 1);
  const step = steps[clamped];
  const answer = answers[step.id];
  const evidence: ClarificationEvidence = touched[step.id] ? 'entered' : step.evidence;

  const setAnswer = (value: unknown) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
    setTouched((prev) => ({ ...prev, [step.id]: true }));
  };

  const answeredCount = steps.filter((s) => touched[s.id]).length;
  const atFirst = clamped === 0;
  const atLast = clamped === steps.length - 1;

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

      {/* Preliminary result strip — calculated, pass-through (Phase 3 recomputes live) */}
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
              {preliminary.value === null || preliminary.value === undefined ? '—' : String(preliminary.value)}
            </strong>
            <Badge evidence="calculated" />
          </span>
        </div>
      )}

      {/* Body — one step at a time */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
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
            <Badge evidence={evidence} />
          </div>

          {step.help && (
            <div style={{ color: P.muted, fontSize: 13, marginTop: 6 }}>{step.help}</div>
          )}

          <div style={{ marginTop: 16 }}>
            <StepInput step={step} value={answer} onChange={setAnswer} />
          </div>

          <div style={{ color: P.mutedSoft, fontSize: 12, marginTop: 10 }}>
            Current: {displayValue(step, answer)}
          </div>
        </div>

        {atLast && (
          <div style={{ color: P.muted, fontSize: 13, marginTop: 16 }}>
            That&apos;s the last one. Your answers apply when you&apos;re ready.
          </div>
        )}
      </div>

      {/* Footer — Back / Next */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderTop: `1px solid ${P.border}`,
          background: P.card,
        }}
      >
        <button
          onClick={() => setIdx(Math.max(0, clamped - 1))}
          disabled={atFirst}
          style={btnStyle(atFirst, false)}
        >
          Back
        </button>
        <button
          onClick={() => setIdx(Math.min(steps.length - 1, clamped + 1))}
          disabled={atLast}
          style={btnStyle(atLast, true)}
        >
          Next
        </button>
      </div>
    </div>
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
