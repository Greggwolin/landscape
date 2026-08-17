'use client';

/**
 * What this drawing is, and whether we are sure enough to measure from it.
 *
 * Intake reads a stage off an uploaded drawing and stores it on the document.
 * Until this card existed nothing showed it, so the reading was invisible and
 * the confirmation Gregg asked for had nowhere to happen.
 *
 * The rule this renders (his call, 2026-08-14): read the stage, show it,
 * and derive nothing until a person confirms it. So the card always states
 * what was read AND what led to it, and a stage that has not been confirmed
 * is never presented as safe to price from — the "approximate" wording is
 * driven by the stored flag, not re-derived here.
 */

import React, { useState } from 'react';
import { getAuthHeaders } from '@/lib/authHeaders';

/** Mirrors what intake writes under `profile_json.plan`. */
export interface PlanProfile {
  is_plan?: boolean;
  stage?: number | null;
  stage_label?: string;
  confidence?: number;
  trusted_for_money?: boolean;
  needs_confirmation?: boolean;
  evidence?: string[];
  confirmed_by_user?: boolean;
  summary?: string;
}

/**
 * The drawings a person can pick from, in the order they arrive on a project.
 * Values match the stored integers and must never be renumbered.
 */
const STAGE_CHOICES: Array<{ value: number; label: string; measurable: boolean }> = [
  { value: 10, label: 'Zoning exhibit', measurable: false },
  { value: 20, label: 'Design concept', measurable: false },
  { value: 30, label: 'Site plan', measurable: false },
  { value: 40, label: 'Preliminary plat', measurable: true },
  { value: 45, label: 'Preliminary landscape plan', measurable: true },
  { value: 60, label: 'Final plat', measurable: true },
  { value: 65, label: 'Final landscape plan', measurable: true },
  { value: 70, label: 'Recorded survey', measurable: true },
];

interface Props {
  docId: string;
  plan: PlanProfile;
  /** Called after a successful confirm so the document list can refresh. */
  onConfirmed?: () => void;
}

export function PlanStageCard({ docId, plan, onConfirmed }: Props) {
  const [choice, setChoice] = useState<number | ''>(plan.stage ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(Boolean(plan.confirmed_by_user));
  // MK34 — what the read is doing, and what it said when it finished. The
  // messages come back written for a person and are shown verbatim; they are
  // the whole point of the endpoint and must not be summarised here.
  const [applyState, setApplyState] = useState<string | null>(
    (plan as { apply?: { state?: string } }).apply?.state ?? null,
  );
  const [applyMessage, setApplyMessage] = useState<string | null>(
    (plan as { apply?: { message?: string } }).apply?.message ?? null,
  );

  if (!plan?.is_plan) return null;

  const picked = STAGE_CHOICES.find((s) => s.value === choice);
  const measurable = confirmed ? Boolean(picked?.measurable) : false;
  const unread = plan.stage == null;

  const handleConfirm = async () => {
    if (choice === '') return;
    setSaving(true);
    setError(null);
    try {
      const stage = STAGE_CHOICES.find((s) => s.value === choice)!;
      const response = await fetch(`/api/dms/documents/${docId}/profile`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            plan: {
              ...plan,
              stage: stage.value,
              stage_label: stage.label,
              trusted_for_money: stage.measurable,
              needs_confirmation: false,
              confirmed_by_user: true,
            },
          },
          reason: 'Plan stage confirmed by user',
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setConfirmed(true);
      onConfirmed?.();

      // Confirming is permission to read. Ask for the read; the endpoint
      // answers immediately (202) and does the ~10s work in the background,
      // so poll the document until it stops saying "reading".
      setApplyState('reading');
      setApplyMessage('Reading the drawing…');
      const applyRes = await fetch(`/api/knowledge/documents/${docId}/apply-plan/`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      const applyBody = await applyRes.json().catch(() => null);
      if (applyBody?.message) setApplyMessage(applyBody.message);
      if (applyBody?.state) setApplyState(applyBody.state);
      if (applyBody?.state === 'reading') void pollApply();
    } catch {
      setError('Could not save that. Try again.');
      setApplyState(null);
      setApplyMessage(null);
    } finally {
      setSaving(false);
    }
  };

  /** Poll the document's profile until the read finishes. Bounded: a plat
   *  takes ~10s, so 60 tries at 2s is a generous ceiling rather than a loop
   *  that spins forever if the worker dies. */
  const pollApply = async () => {
    for (let i = 0; i < 60; i += 1) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/dms/documents/${docId}/profile`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) continue;
        const body = await res.json();
        const apply = body?.profile?.plan?.apply ?? body?.plan?.apply;
        if (apply?.state && apply.state !== 'reading') {
          setApplyState(apply.state);
          setApplyMessage(apply.message ?? null);
          // The project just gained parcels — let the host refresh.
          if (apply.state === 'done') onConfirmed?.();
          return;
        }
      } catch {
        /* transient — keep polling until the ceiling */
      }
    }
    setApplyState('failed');
    setApplyMessage('The read is taking longer than expected. Reload to see where it got to.');
  };

  return (
    <div className="w-plan-card">
      <div className="w-plan-card-head">
        <span className="w-plan-card-title">Drawing</span>
        <span className={`w-plan-badge ${measurable ? 'is-measurable' : 'is-approximate'}`}>
          {measurable ? 'Survey-accurate' : 'Approximate'}
        </span>
      </div>

      <p className="w-plan-card-read">
        {unread
          ? 'This is a drawing, but the sheet does not say which one.'
          : confirmed
            ? `Confirmed as a ${(picked?.label ?? plan.stage_label ?? '').toLowerCase()}.`
            : `Reads as a ${(plan.stage_label ?? '').toLowerCase()}.`}
      </p>

      {!!plan.evidence?.length && (
        <ul className="w-plan-card-evidence">
          {plan.evidence.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}

      {!confirmed && (
        <>
          <p className="w-plan-card-ask">
            Nothing is measured from a drawing until you confirm what it is.
          </p>
          <div className="w-plan-card-controls">
            <select
              className="w-plan-card-select"
              value={choice}
              onChange={(e) => setChoice(e.target.value === '' ? '' : Number(e.target.value))}
              aria-label="What this drawing is"
            >
              <option value="">Choose…</option>
              {STAGE_CHOICES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleConfirm}
              // MK34: not pressable while saving OR while the read runs. The
              // writer supersedes rather than duplicating, so a second press is
              // not destructive — but someone watching nothing happen will
              // press again, and should not have to wonder.
              disabled={choice === '' || saving || applyState === 'reading'}
            >
              {saving ? 'Saving…' : applyState === 'reading' ? 'Reading…' : 'Confirm'}
            </button>
          </div>
          {picked && !picked.measurable && (
            <p className="w-plan-card-note">
              A {picked.label.toLowerCase()} is drawn to look right rather than to be
              measured — it will be used for orientation, never for pricing.
            </p>
          )}
        </>
      )}

      {confirmed && !measurable && (
        <p className="w-plan-card-note">
          Used for orientation only — not for pricing or yield.
        </p>
      )}

      {error && <p className="w-plan-card-error">{error}</p>}

      {/* What the read said — shown verbatim. These messages are written for a
          person to act on ("Confirm what this drawing is before anything is
          measured from it"), and paraphrasing them would lose the reason. */}
      {applyMessage && (
        <p
          className={`w-plan-card-apply${applyState === 'done' ? ' is-done' : ''}${
            applyState === 'blocked' || applyState === 'failed' ? ' is-blocked' : ''
          }`}
        >
          {applyMessage}
        </p>
      )}
    </div>
  );
}

export default PlanStageCard;
