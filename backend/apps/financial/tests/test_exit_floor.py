"""
Negative terminal NOI floors the exit at zero and flags it
(LSCMD-PD-GUARDFIX-0813-PD15, Fix 6 — PD14 Defect A2).

Before this guard, `terminal_noi / cap_rate` on a loss-making terminal year
produced a large NEGATIVE reversion (Lynn Villa: −$31M) that rendered as a sale
price, and selling costs were charged on top of it. Gregg's ruling: floor at
zero and say why.

The three unguarded division sites all route through `_exit_value_or_floor`;
each keeps its own selling-cost arithmetic, so both formulations are asserted
here — `exit_value - exit_value*pct` (exit analysis, monthly path) and
`exit_value * (1 - pct)` (sensitivity matrix).
"""

import pytest

from apps.financial.services.dcf_calculation_service import (
    EXIT_NOT_MEANINGFUL_REASON,
    _exit_value_or_floor,
)


# ── Negative / zero terminal NOI → floored, flagged ─────────────────────────

@pytest.mark.parametrize('terminal_noi', [-1_500_000.0, -1.0, 0.0])
def test_non_positive_terminal_noi_floors_the_exit(terminal_noi):
    exit_value, not_meaningful = _exit_value_or_floor(terminal_noi, 0.055)
    assert exit_value == 0.0
    assert not_meaningful is True


def test_floored_exit_carries_zero_selling_costs_and_zero_reversion():
    # Exit-analysis / monthly-path arithmetic.
    exit_value, not_meaningful = _exit_value_or_floor(-1_500_000.0, 0.055)
    selling_costs = exit_value * 0.02
    net_reversion = exit_value - selling_costs
    assert (exit_value, selling_costs, net_reversion) == (0.0, 0.0, 0.0)
    assert not_meaningful is True


def test_floored_exit_zeroes_the_sensitivity_cell_too():
    # Sensitivity-matrix arithmetic: exit_value * (1 - pct).
    exit_value, _ = _exit_value_or_floor(-1_500_000.0, 0.045)
    assert exit_value * (1 - 0.02) == 0.0


def test_reason_string_states_the_cause():
    assert 'Terminal NOI is negative' in EXIT_NOT_MEANINGFUL_REASON
    assert '$0' in EXIT_NOT_MEANINGFUL_REASON


# ── Positive terminal NOI → identical to pre-guard behaviour ────────────────

@pytest.mark.parametrize('terminal_noi,cap_rate', [
    (1_500_000.0, 0.055),
    (412_000.0, 0.0475),
    (1.0, 0.09),
])
def test_positive_terminal_noi_is_byte_identical(terminal_noi, cap_rate):
    expected = terminal_noi / cap_rate if cap_rate > 0 else 0
    exit_value, not_meaningful = _exit_value_or_floor(terminal_noi, cap_rate)
    assert exit_value == expected
    assert not_meaningful is False


def test_positive_noi_with_non_positive_cap_rate_still_returns_zero():
    # Pre-guard behaviour for a zero/negative cap rate was `else 0` — unchanged.
    for cap_rate in (0.0, -0.01):
        exit_value, not_meaningful = _exit_value_or_floor(1_500_000.0, cap_rate)
        assert exit_value == 0.0
        # NOT flagged: the terminal income is fine; the cap rate is the problem.
        assert not_meaningful is False


def test_positive_reversion_chain_matches_the_old_expressions():
    terminal_noi, cap_rate, pct = 1_500_000.0, 0.055, 0.02
    exit_value, _ = _exit_value_or_floor(terminal_noi, cap_rate)

    old_exit_value = terminal_noi / cap_rate
    assert exit_value == old_exit_value
    assert exit_value * pct == old_exit_value * pct                      # selling costs
    assert exit_value - exit_value * pct == old_exit_value - old_exit_value * pct
    assert exit_value * (1 - pct) == old_exit_value * (1 - pct)          # sensitivity
