"""CB4 — every deterministic-artifact tool's non-artifact exits must instruct.

A tool return with no ``instruction`` is an invitation to improvise, and the
empty / negative path is the one most likely to lack one. Live proof (CB2,
project 9): ``review_budget_variance`` returned an honest empty result, the
model answered with invented per-lot industry costs ($11,803/lot, $3,000-$8,000
ranges), and only the fabrication guard stopped it — so the user got the guard's
refusal instead of the tool's own honest sentence. CB3 fixed that one tool; CB4
swept the rest.

This is a STRUCTURAL test, not a behavioral one: it walks the AST of every
deterministic-artifact executor and asserts that every ``artifact_created:
False`` return carries an ``instruction`` (relay / degraded guidance) or a
``guidance`` (recoverable contract error the model is meant to retry). It fails
when someone adds a new exit — or a new artifact tool — without one.
"""

import ast
import inspect
from pathlib import Path

import pytest

from apps.landscaper import tool_executor

# The deterministic server-rendered artifact tools. A new one belongs here.
ARTIFACT_TOOLS = [
    'get_budget_schedule',
    'get_sales_schedule',
    'get_cashflow_schedule',
    'get_capitalization_schedule',
    'get_rent_roll_schedule',
    'review_budget_variance',
    'open_clarification',
    'get_operating_statement',
]

# Three ways an exit may direct the model, all acceptable:
#   instruction — the relay / degraded-render directive
#   guidance    — a recoverable contract error the model is meant to fix and retry
#   code        — the operating statement's structured question envelope, whose
#                 `message` carries the directive inline ("Surface the options to
#                 the user, get a pick, save vocab, re-call")
DIRECTIVE_KEYS = {'instruction', 'guidance', 'code'}


def _module_tree():
    source = Path(inspect.getfile(tool_executor)).read_text()
    return ast.parse(source)


def _handler_nodes():
    """Map tool name → function node, read off the @register_tool decorator."""
    out = {}
    for node in ast.walk(_module_tree()):
        if not isinstance(node, ast.FunctionDef):
            continue
        for dec in node.decorator_list:
            if (isinstance(dec, ast.Call)
                    and getattr(dec.func, 'id', None) == 'register_tool'
                    and dec.args
                    and isinstance(dec.args[0], ast.Constant)):
                out[dec.args[0].value] = node
    return out


def _dict_keys(node):
    return {k.value for k in node.keys
            if isinstance(k, ast.Constant) and isinstance(k.value, str)}


def _non_artifact_returns(fn_node):
    """Every `return {... 'artifact_created': False ...}` in the handler."""
    found = []
    for node in ast.walk(fn_node):
        if not isinstance(node, ast.Return) or not isinstance(node.value, ast.Dict):
            continue
        for key, val in zip(node.value.keys, node.value.values):
            if (isinstance(key, ast.Constant) and key.value == 'artifact_created'
                    and isinstance(val, ast.Constant) and val.value is False):
                found.append(node.value)
    return found


@pytest.mark.parametrize('tool_name', ARTIFACT_TOOLS)
def test_every_non_artifact_exit_instructs_the_model(tool_name):
    handlers = _handler_nodes()
    assert tool_name in handlers, f'{tool_name} is not registered in tool_executor'

    exits = _non_artifact_returns(handlers[tool_name])
    assert exits, f'{tool_name} has no artifact_created:False exit to check'

    for d in exits:
        keys = _dict_keys(d)
        assert keys & DIRECTIVE_KEYS, (
            f'{tool_name} has an artifact_created:False return carrying none of '
            f'{sorted(DIRECTIVE_KEYS)} (found {sorted(keys)}). An uninstructed '
            f'exit is where the model improvises — see CB2.'
        )


def test_relay_constants_forbid_the_specific_fabrications_seen_live():
    empty = tool_executor._EMPTY_ARTIFACT_RELAY
    assert 'VERBATIM' in empty
    for phrase in ('no figures', 'no estimates', 'industry ranges', 'benchmarks'):
        assert phrase in empty, f'empty relay should forbid: {phrase}'
    # The empty result must never be reported as an all-clear.
    assert 'nothing is wrong' in empty
    assert 'NOT a finding' in empty


def test_degraded_relay_forbids_hand_composing_the_table():
    degraded = tool_executor._DEGRADED_ARTIFACT_RELAY
    assert 'create_artifact' in degraded
    assert 'compose' in degraded
    assert 'not a licence to hand-write the table' in degraded


def test_every_artifact_tool_is_covered_by_this_list():
    """A new deterministic-artifact tool must be added to ARTIFACT_TOOLS.

    Heuristic: any handler that calls a create_*_artifact builder is one.
    """
    handlers = _handler_nodes()
    builders = set()
    for name, fn in handlers.items():
        for node in ast.walk(fn):
            if (isinstance(node, ast.Call)
                    and getattr(node.func, 'id', '').startswith('create_')
                    and getattr(node.func, 'id', '').endswith('_artifact')):
                builders.add(name)
    missing = builders - set(ARTIFACT_TOOLS)
    assert not missing, (
        f'these artifact tools are not covered by the relay test: {sorted(missing)}'
    )
