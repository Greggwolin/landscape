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

import React, { useEffect, useRef, useState } from 'react';
import { getAuthHeaders } from '@/lib/authHeaders';
import { PlanPreviewWindow } from './PlanPreviewWindow';

/**
 * The read lives on the Django side; the profile read/write does not.
 *
 * This card calls two different servers and it matters which is which. The
 * confirm PATCH and the polling read both go to Next routes, so a relative
 * URL is right for them. The apply endpoint exists ONLY on Django, so the
 * same relative URL 404s — which is precisely what happened the first time
 * anyone pressed Confirm: the card announced "Reading…" and then sat there
 * for good, because a failed POST returns no state to poll on.
 */
const DJANGO_API = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(
    (plan as { apply?: { message?: string } }).apply?.message ?? null,
  );

  // A card can mount onto a read that is already running — the panel remounts
  // whenever the document is reopened, and the read outlives the request that
  // started it. Without this the card sits inert on the stored "Reading…" and
  // never learns that it finished.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    if (plan?.is_plan && applyState === 'reading') {
      resumedRef.current = true;
      void pollApply();
    }
    // Once per mount. pollApply is re-created every render, so listing it as a
    // dependency would stack a new poll on every state change it causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!plan?.is_plan) return null;

  const picked = STAGE_CHOICES.find((s) => s.value === choice);
  const measurable = confirmed ? Boolean(picked?.measurable) : false;
  const unread = plan.stage == null;

  /**
   * Ask for the read. Separate from confirming, because the two can come
   * apart: the first plat was confirmed while the read endpoint was
   * unreachable, and the card then offered no way to try again — the Confirm
   * button is gone once a drawing is confirmed, and confirming is not
   * something you can meaningfully do twice. A drawing whose stage is settled
   * but which has never been read needs its own way in.
   */
  const runApply = async () => {
    // The stamp on whatever answer is already stored. If this attempt fails we
    // still watch the document, and this is how the watcher tells a NEW answer
    // from the one that was sitting there before it pressed anything.
    const priorApplyAt = (plan as { apply?: { at?: string } }).apply?.at ?? null;
    setApplyState('reading');
    setApplyMessage('Reading the drawing…');
    try {
      const applyRes = await fetch(
        `${DJANGO_API}/api/knowledge/documents/${docId}/apply-plan/`,
        {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        },
      );
      const applyBody = await applyRes.json().catch(() => null);

      // Say so when the request itself failed. Without this the card keeps
      // showing "Reading…" for ever: nothing came back to poll on, and a
      // spinner that never resolves reads as slow rather than broken, so
      // the person waits instead of telling anyone.
      if (!applyRes.ok || !applyBody?.state) {
        setApplyState('failed');
        // ...but keep watching anyway. A request can fail on the way BACK from
        // a server that already started the read, and the card used to stop
        // here — so the read finished, the parcels landed, and the card went
        // on showing a stale failure until someone was told out of band that
        // it had worked. Polling costs nothing if the read never began: the
        // stored state simply never changes and the poll gives up.
        void pollApply(priorApplyAt, true);
        // Distinguish "no answer" from "answered, and said no". They look the
        // same from here and mean opposite things: one is a server that is
        // down, the other is a request that was understood and refused, and
        // reporting the second as the first sends everyone looking in the
        // wrong place.
        setApplyMessage(
          applyBody?.error
            ? `The drawing could not be read: ${applyBody.error}. Nothing was changed.`
            : 'The step that reads the drawing gave no answer, so nothing was '
              + 'changed. Try again once it is back.',
        );
        return;
      }

      if (applyBody.message) setApplyMessage(applyBody.message);
      setApplyState(applyBody.state);
      if (applyBody.state === 'reading') void pollApply();
    } catch {
      setApplyState('failed');
      setApplyMessage(
        'The step that reads the drawing could not be reached, so nothing '
          + 'was changed. Try again once it is back.',
      );
      void pollApply(priorApplyAt, true);  // see the note above — the read may have started
    }
  };

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

      // Confirming is permission to read. The endpoint answers immediately
      // and does the ~10s work in the background, so the card polls.
      await runApply();
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
  const pollApply = async (staleAt?: string | null, defensive = false) => {
    for (let i = 0; i < 60; i += 1) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/dms/documents/${docId}/profile`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) continue;
        const body = await res.json();
        const apply = body?.profile?.plan?.apply ?? body?.plan?.apply;
        // Ignore an answer that was already there before this attempt. When
        // the POST itself failed we cannot tell whether a read started, so we
        // watch — but a stale `done` left by an EARLIER run would otherwise be
        // read as this attempt succeeding, which is the one wrong thing this
        // card must never say.
        if (staleAt && apply?.at && apply.at === staleAt) continue;
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
    // A defensive watch is a long shot by definition — it was started because
    // the request failed, not because a read was known to be running. Timing
    // out only means no read appeared, which is the likeliest case; saying so
    // here would replace the accurate reason the request failed with a vaguer
    // one two minutes later.
    if (defensive) return;
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

      {/* A settled, survey-accurate drawing that has never been read. Reached
          when the read failed, or when the drawing was confirmed before the
          read existed at all. Not shown once it has been read: re-reading a
          plat supersedes rather than duplicates, but offering it as a
          standing button invites pressing it to see what happens. */}
      {confirmed && measurable && applyState !== 'reading' && applyState !== 'done' && (
        <div className="w-plan-card-controls">
          <button className="btn btn-primary btn-sm" onClick={() => void runApply()}>
            Read the drawing
          </button>
        </div>
      )}

      {/* The one way in. The card is what reports the read, so it is what
          offers to show it — and because both surfaces that render a plan card
          render THIS component, the control appears in the documents panel and
          the overlay preview together or not at all. Do not add a second entry
          point elsewhere. */}
      {applyState === 'done' && (
        <div className="w-plan-card-controls">
          <button className="btn btn-secondary btn-sm" onClick={() => setPreviewOpen(true)}>
            Show the proposed geometry
          </button>
        </div>
      )}

      {previewOpen && (
        <PlanPreviewWindow docId={docId} onClose={() => setPreviewOpen(false)} />
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
