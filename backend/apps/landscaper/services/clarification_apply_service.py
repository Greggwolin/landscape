"""Clarification-artifact apply service — Phase 3a (LSCMD-CLARIFY-ARTIFACT-0724-BA5-PHASE3).

Makes the clarification artifact's answers real. Phase 2 renders the stepped
questions and holds answers in the browser's local state; this service is the
backend "apply" that commits a batch of staged answers into live project data.

Design (confirmed decisions):
  * COMMIT via each target tool's OWN writer in commit mode — dispatch through
    ``execute_tool(tool, tool_input, project_id, propose_only=False, ...)``. This
    reuses each tool's real write path AND its cascade recalc (e.g. a DCF
    discount-rate write recomputes the cash flow). Apply IS the user's confirm —
    the stepped answers were already reviewed. We do NOT invent a parallel writer
    and do NOT force everything through MutationService's generic field_update
    (that would fork the tools' bespoke recalc logic). The uniform audit path is
    the separate Commit·Impact·Variance build; out of scope here.
  * PARAMS-COMPLETE steps only. A step resolves to a write only when its target
    carries a tool-ready payload: ``target = {tool, value_key, params}`` where
    ``params`` is the full tool_input MINUS the answer, and ``value_key`` names
    where the answer goes. The Phase-1 target schema already allows ``params``.
    Steps without a resolvable write (no target, modal target, or missing
    value_key) are returned as ``skipped`` with a reason — surfaced, never
    silently dropped.
  * §15.2 SILENT-WRITE GUARD. Two target tools (update_equity_structure,
    update_waterfall_tiers) return success with an empty change set when the
    field isn't in their column allowlist — a write that "succeeds" but changes
    no row. ``_classify_write`` treats an empty change as an ERROR, not applied.
    The endpoint's tests additionally SELECT the column back to confirm the value
    landed (the mandatory raw-DB verification).
  * IMPACT LINE is an ENGINE DELTA, never model prose: read the headline figure
    from the same read-only engine the schedules use, before and after the batch.
    Shows nothing if nothing numeric moved; "—" when it can't compute.
  * DURABLE EVIDENCE. Applied steps flip ``assumed → entered`` in the artifact's
    stored ``params_json.clarification_config`` (not just browser state), so the
    badge persists across reloads.

Batch semantics: all-or-report. Each step commits independently through its
tool's own atomic write; the response is a per-step result list. One step's
error does not roll back another step's committed write.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Target tools with the §15.2 silent-write trap: they return success with no
# row change when the supplied field isn't in their column allowlist. For these,
# a truthy ``success`` is NOT sufficient — require evidence of a real change.
_EMPTY_CHANGE_TRAP_TOOLS = {'update_equity_structure', 'update_waterfall_tiers'}


def _headline(project_id: Optional[int], label: str) -> Dict[str, Any]:
    """Read-only headline figure for the preliminary strip, from the same engine
    the cash-flow schedule uses. Routes LAND vs income internally. Never writes,
    never fabricates — value is ``None`` (renders as "—") when it can't compute."""
    value: Optional[float] = None
    if project_id is not None:
        try:
            from apps.financial.services.cashflow_routing import fetch_cashflow_schedule
            env = fetch_cashflow_schedule(project_id, include_financing=False)
            npv = (env.get('summary') or {}).get('npv')
            value = float(npv) if npv is not None else None
        except Exception:  # noqa: BLE001 — a missing/unmodeled schedule → "—", never an error
            logger.exception('clarification_apply: headline recompute failed for project %s', project_id)
            value = None
    return {'label': label, 'value': value}


def _fmt_money(v: Optional[float]) -> str:
    if v is None:
        return '—'
    a = abs(v)
    if a >= 1_000_000:
        return f'${v / 1_000_000:.1f}M'
    if a >= 1_000:
        return f'${v / 1_000:.0f}K'
    return f'${v:,.0f}'


def _impact_line(before: Dict[str, Any], after: Dict[str, Any], applied_count: int) -> str:
    """One-line engine delta — never model prose. Empty when nothing numeric moved."""
    if applied_count == 0:
        return ''
    b, a = before.get('value'), after.get('value')
    if b is None or a is None or b == a:
        return ''
    plural = 's' if applied_count != 1 else ''
    return (
        f"Those {applied_count} answer{plural} moved {after['label']} "
        f"{_fmt_money(b)} → {_fmt_money(a)}."
    )


def _classify_write(tool: str, result: Any) -> tuple[bool, Optional[str]]:
    """Interpret a target tool's commit-mode return. Returns (applied?, reason).

    §15.2: for the empty-change-trap tools, a truthy success with no change set is
    a silent no-op → treated as an error, not applied.
    """
    if not isinstance(result, dict) or not result.get('success'):
        reason = (result or {}).get('error') if isinstance(result, dict) else 'no result'
        return False, reason or 'write did not succeed'

    if tool == 'update_equity_structure':
        if not result.get('fields_updated'):
            return False, 'silent no-op: no equity field changed (field not in allowlist)'
        return True, None

    if tool == 'update_waterfall_tiers':
        # Per-record results; require at least one record that actually changed a
        # column (fields_updated) or was created. Absent any change signal → no-op.
        records = result.get('results') or result.get('records') or []
        if isinstance(records, list) and records:
            changed = any(
                (isinstance(r, dict) and (r.get('fields_updated') or r.get('action') == 'created'))
                for r in records
            )
            if not changed:
                return False, 'silent no-op: no waterfall tier column changed (field not in allowlist)'
        return True, None

    # update_cashflow_assumption / update_land_use_pricing / budget tools:
    # success + an explicit updated/change signal.
    return True, None


def _resolve_target(step: Dict[str, Any]):
    """Resolve a step's target into (tool, params, value_key, skip_reason).

    A writable step must be PARAMS-COMPLETE: ``target = {tool, value_key, params}``.
    Returns skip_reason (with tool/value_key None) for anything not directly
    writable — no target, a modal target, or a target missing value_key.
    """
    target = step.get('target')
    if not isinstance(target, dict):
        return None, None, None, 'no writable target'
    if target.get('modal'):
        return None, None, None, 'modal target — open the designed form (Phase 3b)'
    tool = target.get('tool')
    if not tool:
        return None, None, None, 'no writable target'
    value_key = target.get('value_key')
    if not value_key:
        return None, None, None, 'not params-complete (target has no value_key for the answer)'
    params = dict(target.get('params') or {})
    return tool, params, value_key, None


def apply_clarification(
    artifact_id: int,
    answers: List[Dict[str, Any]],
    user_id: Any = None,
) -> Dict[str, Any]:
    """Commit a batch of clarification answers and report per-step results,
    the recomputed preliminary, and the one-line engine-delta impact.

    ``answers`` is ``[{step_id, value}, ...]``. Returns
    ``{applied: [{step_id, status, ...}], preliminary: {label, value|None},
    impact_line: str}``. Raises ClarificationApplyError on a bad request
    (unknown artifact / not a clarification artifact).
    """
    from apps.artifacts.models import Artifact

    try:
        artifact = Artifact.objects.get(artifact_id=artifact_id)
    except Artifact.DoesNotExist as exc:
        raise ClarificationApplyError(f'artifact {artifact_id} not found') from exc

    if artifact.tool_name != 'open_clarification':
        raise ClarificationApplyError(f'artifact {artifact_id} is not a clarification artifact')

    cfg = (artifact.params_json or {}).get('clarification_config') or {}
    steps_by_id = {s.get('id'): s for s in cfg.get('steps', []) if isinstance(s, dict)}
    project_id = artifact.project_id

    prelim_label = (cfg.get('preliminary') or {}).get('label') or 'Preliminary NPV'
    before = _headline(project_id, prelim_label)

    applied: List[Dict[str, Any]] = []
    evidence_flips: Dict[str, str] = {}

    for ans in answers or []:
        sid = ans.get('step_id') if isinstance(ans, dict) else None
        value = ans.get('value') if isinstance(ans, dict) else None
        step = steps_by_id.get(sid)
        if step is None:
            applied.append({'step_id': sid, 'status': 'error', 'reason': 'unknown step id'})
            continue

        tool, params, value_key, skip_reason = _resolve_target(step)
        if skip_reason is not None:
            applied.append({'step_id': sid, 'status': 'skipped', 'reason': skip_reason})
            continue

        tool_input = dict(params or {})
        tool_input[value_key] = value

        try:
            from apps.landscaper.tool_executor import execute_tool
            result = execute_tool(
                tool, tool_input, project_id,
                propose_only=False, user_id=user_id,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception('clarification_apply: %s raised for step %s', tool, sid)
            applied.append({'step_id': sid, 'status': 'error', 'tool': tool, 'reason': f'{tool} raised: {exc}'})
            continue

        ok, reason = _classify_write(tool, result)
        if ok:
            # assumed → entered (a step pointed at the firm library would carry
            # evidence='benchmark' from authoring; preserve that, else 'entered').
            new_evidence = 'benchmark' if step.get('evidence') == 'benchmark' else 'entered'
            evidence_flips[sid] = new_evidence
            applied.append({
                'step_id': sid, 'status': 'applied', 'tool': tool,
                'field': (step.get('target') or {}).get('field'),
                'evidence': new_evidence,
            })
        else:
            applied.append({'step_id': sid, 'status': 'error', 'tool': tool, 'reason': reason})

    # Durable evidence flip — persist into the stored artifact config so the badge
    # survives a reload (not just browser state).
    if evidence_flips:
        for s in cfg.get('steps', []):
            if isinstance(s, dict) and s.get('id') in evidence_flips:
                s['evidence'] = evidence_flips[s['id']]
        params_json = artifact.params_json or {}
        params_json['clarification_config'] = cfg
        artifact.params_json = params_json
        artifact.save(update_fields=['params_json'])

    after = _headline(project_id, prelim_label)
    applied_count = sum(1 for a in applied if a.get('status') == 'applied')
    return {
        'applied': applied,
        'preliminary': {'label': after['label'], 'value': after['value']},
        'impact_line': _impact_line(before, after, applied_count),
    }


class ClarificationApplyError(ValueError):
    """Raised on a malformed apply request (unknown / non-clarification artifact)."""
