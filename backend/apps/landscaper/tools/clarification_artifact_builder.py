"""Server-side clarification / interview artifact builder.

Clarification base-artifact — Phase 1 (LSCMD-CLARIFY-ARTIFACT-0724-BA5). The
FIRST base artifact whose content is *questions*, not data. It is the delivery
mechanism for the north-star napkin acceptance test: when Landscaper needs
several inputs before it can run, it does NOT list them in chat — it opens ONE
clarification artifact in the right panel (stepped, one question at a time) and
drops a single line pointing at the panel.

Divergence from the schedule builders (cashflow / budget / sales / os): those
query the DB and render the numbers so the LLM never composes them. Here the
*questions* are authored by the model — authoring a question is not fabricating a
figure, that is correct — and this builder RENDERS them deterministically: it
validates the step contract, stamps evidence tags, and packs the rich stepped
payload into ``params_json`` for the bespoke ``ClarificationArtifact`` renderer
(dispatched by tool_name, mirroring ``generate_location_brief`` /
``LocationBriefArtifact`` — NOT a new block type, which the strict block-document
validator would reject). The persisted block ``schema`` is a minimal, valid
fallback (a one-line summary + a static table of the questions) so the artifact
is never empty if the bespoke renderer isn't reached, and so it passes
``validate_block_document``.

Evidence tags (four-state taxonomy, shared with every schedule):
  * ``assumed``   (amber) — a pre-filled default the user hasn't touched. Most
                            steps start here.
  * ``entered``   (blue)  — an answer the user typed. (flip happens in Phase 3)
  * ``benchmark`` (green) — the user pointed the answer at the firm library.
  * ``calculated``(grey)  — the running preliminary result strip. The model never
                            hand-writes it; the caller passes a figure that traces
                            to a numbers-producing tool's output. This builder
                            never invents a figure.

Nothing is asked cold: every step MUST carry a non-null ``default`` (the design
point — you correct what's wrong, you don't fill a blank form). Write-back (the
answer flowing into the downstream update tool on apply) is Phase 3; Phase 1
bakes each step's ``target`` into the schema so the later write path is declared,
not invented.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Every widget type the step contract accepts. Slice-1 renders number / percent /
# choice / same_as (the north-star five); toggle / date / text validate now and
# render as their widget lands (Phase 2+).
_VALID_INPUT_TYPES = {'number', 'percent', 'choice', 'same_as', 'toggle', 'date', 'text'}
# Types whose answer is chosen from a fixed option set → ``options`` required and
# the ``default`` must equal one option value.
_OPTION_TYPES = {'choice', 'same_as', 'toggle'}
_VALID_EVIDENCE = {'assumed', 'entered', 'benchmark'}

# A good clarification artifact asks five questions, not fifteen. This is a hard
# ceiling guarding against a runaway wall-of-questions; the "ask only what moves
# the number" discipline (which keeps the real count ~5) is enforced by the
# firing rules in the system prompt (Phase 4), not here.
_MIN_STEPS = 1
_MAX_STEPS = 12


class ClarificationValidationError(ValueError):
    """Raised when a model-supplied step contract is malformed.

    Carries a user-recoverable message: the executor turns it into an error
    envelope with guidance so the model's retry-on-error path can re-author the
    steps rather than the turn dying.
    """


def _normalize_target(target: Any, path: str) -> Optional[Dict[str, Any]]:
    """Validate the optional write-back target. Either ``{tool, field, params?}``
    (a downstream update tool) or ``{modal, context?}`` (open an existing designed
    form via the modal registry). Shape is checked; existence of the tool/modal is
    the Phase-3 write-path's concern."""
    if target is None:
        return None
    if not isinstance(target, dict):
        raise ClarificationValidationError(f'{path}.target must be an object')
    if 'tool' in target:
        if not isinstance(target.get('tool'), str) or not target['tool']:
            raise ClarificationValidationError(f'{path}.target.tool must be a non-empty string')
        out: Dict[str, Any] = {'tool': target['tool']}
        if 'field' in target:
            if not isinstance(target['field'], str) or not target['field']:
                raise ClarificationValidationError(f'{path}.target.field must be a non-empty string')
            out['field'] = target['field']
        if isinstance(target.get('params'), dict):
            out['params'] = target['params']
        return out
    if 'modal' in target:
        if not isinstance(target.get('modal'), str) or not target['modal']:
            raise ClarificationValidationError(f'{path}.target.modal must be a non-empty string')
        out = {'modal': target['modal']}
        if isinstance(target.get('context'), dict):
            out['context'] = target['context']
        return out
    raise ClarificationValidationError(
        f'{path}.target must name either a "tool" (update tool) or a "modal" (designed form)'
    )


def _normalize_options(raw: Any, path: str) -> List[Dict[str, Any]]:
    if not isinstance(raw, list) or not raw:
        raise ClarificationValidationError(f'{path}.options must be a non-empty array for this input_type')
    out: List[Dict[str, Any]] = []
    for i, opt in enumerate(raw):
        if not isinstance(opt, dict):
            raise ClarificationValidationError(f'{path}.options[{i}] must be an object')
        if 'value' not in opt:
            raise ClarificationValidationError(f'{path}.options[{i}].value is required')
        label = opt.get('label')
        if not isinstance(label, str) or not label:
            raise ClarificationValidationError(f'{path}.options[{i}].label is required (non-empty string)')
        out.append({'value': opt['value'], 'label': label})
    return out


def normalize_step(raw: Any, index: int) -> Dict[str, Any]:
    """Validate + normalize one model-supplied step into the canonical shape.

    ``index`` is 0-based; ``order`` defaults to ``index + 1`` (1-based, for the
    "N of M" progress marker). Raises ClarificationValidationError on any
    malformed field so the model can re-author.
    """
    path = f'steps[{index}]'
    if not isinstance(raw, dict):
        raise ClarificationValidationError(f'{path} must be an object')

    question = raw.get('question')
    if not isinstance(question, str) or not question.strip():
        raise ClarificationValidationError(f'{path}.question is required (non-empty string)')

    input_type = raw.get('input_type')
    if input_type not in _VALID_INPUT_TYPES:
        raise ClarificationValidationError(
            f'{path}.input_type must be one of {sorted(_VALID_INPUT_TYPES)}, got {input_type!r}'
        )

    # Nothing is asked cold — a default is mandatory and non-null.
    if 'default' not in raw or raw.get('default') is None:
        raise ClarificationValidationError(
            f'{path}.default is required and non-null — a clarification step is a pre-filled '
            f'editable default, never a blank field'
        )
    default = raw['default']

    step: Dict[str, Any] = {
        'id': raw['id'] if isinstance(raw.get('id'), str) and raw['id'] else f'step{index + 1}',
        'order': int(raw['order']) if isinstance(raw.get('order'), int) else index + 1,
        'question': question.strip(),
        'input_type': input_type,
        'default': default,
    }

    if input_type in _OPTION_TYPES:
        options = _normalize_options(raw.get('options'), path)
        option_values = [o['value'] for o in options]
        if default not in option_values:
            raise ClarificationValidationError(
                f'{path}.default {default!r} must equal one of the option values {option_values!r}'
            )
        step['options'] = options

    unit = raw.get('unit')
    if unit is not None:
        if not isinstance(unit, str):
            raise ClarificationValidationError(f'{path}.unit must be a string')
        step['unit'] = unit

    evidence = raw.get('evidence', 'assumed')
    if evidence not in _VALID_EVIDENCE:
        raise ClarificationValidationError(
            f'{path}.evidence must be one of {sorted(_VALID_EVIDENCE)}, got {evidence!r}'
        )
    step['evidence'] = evidence

    target = _normalize_target(raw.get('target'), path)
    if target is not None:
        step['target'] = target

    help_text = raw.get('help')
    if help_text is not None:
        if not isinstance(help_text, str):
            raise ClarificationValidationError(f'{path}.help must be a string')
        step['help'] = help_text

    return step


def _normalize_preliminary(raw: Any) -> Optional[Dict[str, Any]]:
    """Validate the optional preliminary result strip. Forced to
    ``evidence='calculated'`` — this is the model's running answer, never an
    input. ``value`` may be ``None`` ("—" in the UI: can't compute yet)."""
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise ClarificationValidationError('preliminary must be an object')
    label = raw.get('label')
    if not isinstance(label, str) or not label.strip():
        raise ClarificationValidationError('preliminary.label is required (non-empty string)')
    return {
        'label': label.strip(),
        'value': raw.get('value'),  # pass-through; may be None → renders as "—"
        'evidence': 'calculated',
    }


def _default_display(step: Dict[str, Any]) -> str:
    """Human-readable current value for the static fallback table."""
    default = step['default']
    if step['input_type'] in _OPTION_TYPES:
        for opt in step.get('options', []):
            if opt['value'] == default:
                return opt['label']
    unit = step.get('unit')
    if unit:
        return f'{default} {unit}'
    return str(default)


def build_clarification_config(
    steps: List[Dict[str, Any]],
    preliminary: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """The rich stepped payload the bespoke ClarificationArtifact renderer reads
    from ``params_json.clarification_config``. NOT block-validated — this is where
    the typed inputs, targets, and evidence tags live."""
    return {
        'preliminary': preliminary,
        'steps': steps,
        'step_count': len(steps),
    }


def build_clarification_fallback_schema(
    steps: List[Dict[str, Any]],
    preliminary: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """Minimal, valid block document persisted as ``schema``. It is a graceful
    fallback only — the canonical render is the bespoke renderer reading
    ``clarification_config``. Kept to the four whitelisted block types
    (``text`` + ``table``) so ``validate_block_document`` accepts it."""
    count = len(steps)
    summary = (
        f'{count} thing{"s" if count != 1 else ""} to confirm before this runs — '
        f'answer them one at a time in the panel.'
    )

    blocks: List[Dict[str, Any]] = [
        {
            'id': 'clarification_intro',
            'type': 'text',
            'variant': 'subtitle',
            'content': summary,
        },
    ]

    if preliminary is not None:
        value = preliminary.get('value')
        blocks.append({
            'id': 'clarification_preliminary',
            'type': 'text',
            'variant': 'callout',
            'content': f'{preliminary["label"]}: {value if value is not None else "—"}',
        })

    step_rows: List[Dict[str, Any]] = []
    for step in steps:
        step_rows.append({
            'id': step['id'],
            'cells': {
                'step': step['order'],
                'question': step['question'],
                'current': _default_display(step),
                'status': step['evidence'],
            },
        })

    blocks.append({
        'id': 'clarification_steps',
        'type': 'table',
        'title': 'Questions',
        'columns': [
            {'key': 'step', 'label': '#', 'align': 'left', 'editable': False},
            {'key': 'question', 'label': 'Question', 'align': 'left', 'editable': False},
            {'key': 'current', 'label': 'Current', 'align': 'left', 'editable': True},
            {'key': 'status', 'label': 'Status', 'align': 'left', 'editable': False},
        ],
        'rows': step_rows,
    })

    return {'blocks': blocks}


def create_clarification_artifact(
    *,
    steps: List[Any],
    preliminary: Any = None,
    project_id: Optional[int] = None,
    project_name: Optional[str] = None,
    user_id: Any = None,
    thread_id: Any = None,
) -> Dict[str, Any]:
    """Validate the model-supplied steps and register the clarification artifact.

    Returns the artifact-service envelope on success, or
    ``{'success': False, 'error': ...}``. Raises ClarificationValidationError if
    the step contract is malformed (the executor catches it and hands the model a
    recoverable error).

    Dedup is per-THREAD: a clarification is a conversational Q&A in flight, so it
    should update in place across a turn, not spawn a new card each call. Encoded
    as ``dedup_key='clarification:{thread_id}'`` — combined with the artifact
    service's ``(project_id, tool_name, dedup_key)`` filter this scopes to the
    thread. Pre-project threads (``project_id is None``) skip dedup entirely in the
    service, so each open there creates a fresh card — acceptable for a transient
    pre-project interview.

    No ``artifact_subtype`` and a neutral title (no operating-statement keywords),
    so the OS guard never applies. ``tool_name='open_clarification'`` also bypasses
    the create_artifact-gated report + financial guards.
    """
    if not isinstance(steps, list) or not steps:
        raise ClarificationValidationError('steps must be a non-empty array')
    if len(steps) < _MIN_STEPS or len(steps) > _MAX_STEPS:
        raise ClarificationValidationError(
            f'steps must contain between {_MIN_STEPS} and {_MAX_STEPS} questions '
            f'(got {len(steps)}); ask only the unknowns that move the number'
        )

    normalized = [normalize_step(raw, i) for i, raw in enumerate(steps)]
    # Duplicate step ids would collide in the fallback table's row ids.
    seen_ids: set = set()
    for step in normalized:
        if step['id'] in seen_ids:
            raise ClarificationValidationError(f'duplicate step id {step["id"]!r}')
        seen_ids.add(step['id'])

    norm_preliminary = _normalize_preliminary(preliminary)

    config = build_clarification_config(normalized, norm_preliminary)
    schema = build_clarification_fallback_schema(normalized, norm_preliminary)

    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:  # noqa: BLE001
        logger.exception('clarification_artifact_builder: artifact service unavailable')
        return {'success': False, 'error': f'artifact service unavailable: {exc}'}

    title = f'{project_name} — A few questions' if project_name else 'A few questions'
    dedup_key = f'clarification:{thread_id}' if thread_id is not None else None

    try:
        return create_artifact_record(
            title=title,
            schema=schema,
            project_id=project_id,
            user_id=user_id,
            thread_id=thread_id,
            tool_name='open_clarification',
            params_json={'server_rendered': True, 'clarification_config': config},
            dedup_key=dedup_key,
            prior_tool_calls=['open_clarification'],
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception('clarification_artifact_builder: create_artifact_record failed')
        return {'success': False, 'error': f'artifact creation failed: {exc}'}
