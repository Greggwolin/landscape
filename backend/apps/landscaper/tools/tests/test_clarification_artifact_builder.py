"""Pure unit tests for the clarification / interview artifact builder.

The builder is a dict-in / (config + block-schema)-out function with no DB or
Django-model access, so no database fixture is required. These guard the Phase-1
contract (LSCMD-CLARIFY-ARTIFACT-0724-BA5): step validation, evidence tags,
"nothing asked cold" defaults, option/default coupling, the calculated-only
preliminary strip, and a fallback block schema that passes the strict
block-document validator.
"""

import pytest

from apps.landscaper.tools.clarification_artifact_builder import (
    ClarificationValidationError,
    build_clarification_config,
    build_clarification_fallback_schema,
    normalize_step,
)
from apps.artifacts.schema_validation import validate_block_document

# The north-star five, trimmed to the slice-1 widget set (number / percent /
# choice / same_as). Round, synthetic — no production data.
NORTH_STAR_STEPS = [
    {
        'id': 'front_footage',
        'question': 'Front footage per lot — SF-50 product?',
        'input_type': 'number',
        'default': 50,
        'unit': 'FF',
        'target': {'tool': 'update_land_use_pricing', 'field': 'front_footage'},
    },
    {
        'id': 'phase2_basis',
        'question': 'Phase-2 cost basis — same as Phase 1, or its own numbers?',
        'input_type': 'same_as',
        'default': 'same_as_phase_1',
        'options': [
            {'value': 'same_as_phase_1', 'label': 'Same as Phase 1'},
            {'value': 'enter_values', 'label': 'Enter values'},
        ],
    },
    {
        'id': 'subdivision_contains',
        'question': 'What does "subdivision cost" contain?',
        'input_type': 'choice',
        'default': 'offsite_backbone_lot',
        'options': [
            {'value': 'offsite_backbone_lot', 'label': 'Offsite + backbone + lot improvements'},
            {'value': 'lot_only', 'label': 'Lot improvements only'},
        ],
        'evidence': 'assumed',
    },
    {
        'id': 'waterfall_split',
        'question': 'Split above the 8% pref?',
        'input_type': 'percent',
        'default': 20,
        'unit': '%',
        'target': {'modal': 'equity_structure', 'context': {'tab': 'waterfall'}},
    },
    {
        'id': 'discount_rate_role',
        'question': 'Does the 12% rate set residual land value, or is it the partner target?',
        'input_type': 'choice',
        'default': 'sets_value',
        'options': [
            {'value': 'sets_value', 'label': 'Sets residual land value'},
            {'value': 'is_target', 'label': "Is the partner's target return"},
        ],
    },
]


def _normalize_all(raw_steps):
    return [normalize_step(s, i) for i, s in enumerate(raw_steps)]


# --------------------------------------------------------------------------- #
# normalize_step — the step contract
# --------------------------------------------------------------------------- #

def test_north_star_steps_normalize_cleanly():
    steps = _normalize_all(NORTH_STAR_STEPS)
    assert len(steps) == 5
    # order auto-assigned 1-based for the "N of M" marker
    assert [s['order'] for s in steps] == [1, 2, 3, 4, 5]
    # ids preserved
    assert steps[0]['id'] == 'front_footage'
    # every step keeps its typed input + default
    assert steps[0]['input_type'] == 'number'
    assert steps[0]['default'] == 50
    assert steps[0]['unit'] == 'FF'


def test_evidence_defaults_to_assumed():
    # A step that omits evidence starts amber ('assumed').
    step = normalize_step(
        {'question': 'Lot count?', 'input_type': 'number', 'default': 100}, 0
    )
    assert step['evidence'] == 'assumed'


def test_evidence_explicit_value_preserved():
    step = normalize_step(
        {'question': 'X?', 'input_type': 'number', 'default': 1, 'evidence': 'benchmark'}, 0
    )
    assert step['evidence'] == 'benchmark'


def test_invalid_evidence_rejected():
    with pytest.raises(ClarificationValidationError):
        normalize_step(
            {'question': 'X?', 'input_type': 'number', 'default': 1, 'evidence': 'guessed'}, 0
        )


def test_missing_default_rejected_nothing_asked_cold():
    with pytest.raises(ClarificationValidationError):
        normalize_step({'question': 'Lot count?', 'input_type': 'number'}, 0)


def test_null_default_rejected():
    with pytest.raises(ClarificationValidationError):
        normalize_step({'question': 'Lot count?', 'input_type': 'number', 'default': None}, 0)


def test_falsy_default_is_allowed():
    # 0 / False are legitimate pre-fills, not "asked cold".
    step = normalize_step({'question': 'Escalation?', 'input_type': 'number', 'default': 0}, 0)
    assert step['default'] == 0


def test_invalid_input_type_rejected():
    with pytest.raises(ClarificationValidationError):
        normalize_step({'question': 'X?', 'input_type': 'slider', 'default': 1}, 0)


def test_missing_question_rejected():
    with pytest.raises(ClarificationValidationError):
        normalize_step({'input_type': 'number', 'default': 1}, 0)


def test_choice_requires_options():
    with pytest.raises(ClarificationValidationError):
        normalize_step({'question': 'Which?', 'input_type': 'choice', 'default': 'a'}, 0)


def test_choice_default_must_match_an_option():
    with pytest.raises(ClarificationValidationError):
        normalize_step(
            {
                'question': 'Which?',
                'input_type': 'choice',
                'default': 'c',
                'options': [{'value': 'a', 'label': 'A'}, {'value': 'b', 'label': 'B'}],
            },
            0,
        )


def test_target_tool_shape_preserved():
    step = normalize_step(
        {
            'question': 'FF?',
            'input_type': 'number',
            'default': 50,
            'target': {'tool': 'update_land_use_pricing', 'field': 'front_footage'},
        },
        0,
    )
    assert step['target'] == {'tool': 'update_land_use_pricing', 'field': 'front_footage'}


def test_target_modal_shape_preserved():
    step = normalize_step(
        {
            'question': 'Split?',
            'input_type': 'percent',
            'default': 20,
            'target': {'modal': 'equity_structure', 'context': {'tab': 'waterfall'}},
        },
        0,
    )
    assert step['target'] == {'modal': 'equity_structure', 'context': {'tab': 'waterfall'}}


def test_target_without_tool_or_modal_rejected():
    with pytest.raises(ClarificationValidationError):
        normalize_step(
            {'question': 'X?', 'input_type': 'number', 'default': 1, 'target': {'field': 'x'}}, 0
        )


def test_id_auto_assigned_when_missing():
    step = normalize_step({'question': 'X?', 'input_type': 'number', 'default': 1}, 2)
    assert step['id'] == 'step3'


# --------------------------------------------------------------------------- #
# build_clarification_config — the bespoke-renderer payload
# --------------------------------------------------------------------------- #

def test_config_carries_steps_and_count():
    steps = _normalize_all(NORTH_STAR_STEPS)
    config = build_clarification_config(steps, None)
    assert config['step_count'] == 5
    assert config['steps'] == steps
    assert config['preliminary'] is None


def test_config_preliminary_pass_through():
    steps = _normalize_all(NORTH_STAR_STEPS[:1])
    prelim = {'label': 'Preliminary residual land value', 'value': '$4,200,000', 'evidence': 'calculated'}
    config = build_clarification_config(steps, prelim)
    assert config['preliminary']['value'] == '$4,200,000'
    assert config['preliminary']['evidence'] == 'calculated'


# --------------------------------------------------------------------------- #
# build_clarification_fallback_schema — must pass the strict block validator
# --------------------------------------------------------------------------- #

def test_fallback_schema_is_valid_block_document():
    steps = _normalize_all(NORTH_STAR_STEPS)
    schema = build_clarification_fallback_schema(steps, None)
    # Raises SchemaValidationError if any block violates the whitelist/shape.
    validate_block_document(schema)


def test_fallback_schema_has_row_per_step():
    steps = _normalize_all(NORTH_STAR_STEPS)
    schema = build_clarification_fallback_schema(steps, None)
    tables = [b for b in schema['blocks'] if b['type'] == 'table']
    assert len(tables) == 1
    assert len(tables[0]['rows']) == 5
    # status cell carries the evidence tag
    assert tables[0]['rows'][0]['cells']['status'] == 'assumed'
    # option steps render the option LABEL, not the raw value
    subdivision_row = next(r for r in tables[0]['rows'] if r['id'] == 'subdivision_contains')
    assert subdivision_row['cells']['current'] == 'Offsite + backbone + lot improvements'


def test_fallback_schema_uses_only_whitelisted_block_types():
    steps = _normalize_all(NORTH_STAR_STEPS)
    schema = build_clarification_fallback_schema(steps, None)
    types = {b['type'] for b in schema['blocks']}
    assert types <= {'section', 'table', 'key_value_grid', 'text'}


def test_fallback_schema_with_preliminary_is_valid():
    steps = _normalize_all(NORTH_STAR_STEPS[:2])
    prelim = {'label': 'Preliminary IRR', 'value': None, 'evidence': 'calculated'}
    schema = build_clarification_fallback_schema(steps, prelim)
    validate_block_document(schema)
    # None value renders as the em dash, never fabricated.
    callouts = [b for b in schema['blocks'] if b.get('variant') == 'callout']
    assert callouts and callouts[0]['content'].endswith('—')
