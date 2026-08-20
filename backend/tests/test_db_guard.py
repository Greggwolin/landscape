"""
Offline tests for the test-database guard in ``backend/conftest.py``.

These exercise the pure decision function only. They resolve no settings, open
no connection, and never name the real database host — every hostname below is
fictitious by design. The guard must be provable without going near the thing
it protects.

Run: pytest backend/tests/test_db_guard.py
"""

import pytest

from conftest import (
    TEST_DB_OPT_IN_ENV_VAR,
    db_target_is_allowed,
    opt_in_is_affirmative,
)


# A deliberately fake, non-resolving host that is shaped like a managed
# Postgres endpoint. Never the real one.
FAKE_REMOTE_HOST = 'ep-example-fake-00000000.us-west-2.aws.example-not-real.test'


@pytest.mark.parametrize('host', ['localhost', '127.0.0.1', '::1', ''])
def test_local_hosts_are_allowed(host):
    assert db_target_is_allowed(host) is True


@pytest.mark.parametrize('host', ['LOCALHOST', '  localhost  ', '127.0.0.1 '])
def test_allowlist_ignores_case_and_surrounding_whitespace(host):
    assert db_target_is_allowed(host) is True


def test_remote_host_is_refused_without_opt_in():
    assert db_target_is_allowed(FAKE_REMOTE_HOST) is False


def test_none_host_is_treated_as_local_socket():
    assert db_target_is_allowed(None) is True


@pytest.mark.parametrize('opt_in', ['1', 'true', 'TRUE', 'yes', 'on', ' 1 '])
def test_affirmative_opt_in_permits_a_remote_host(opt_in):
    assert db_target_is_allowed(FAKE_REMOTE_HOST, opt_in) is True


@pytest.mark.parametrize('opt_in', [None, '', '0', 'false', 'no', 'off', 'maybe'])
def test_non_affirmative_opt_in_does_not_permit_a_remote_host(opt_in):
    """'0' and 'false' are truthy strings. The guard must not be fooled by them."""
    assert db_target_is_allowed(FAKE_REMOTE_HOST, opt_in) is False


@pytest.mark.parametrize('value', ['0', 'false', 'no', 'off', '', None, 'maybe'])
def test_opt_in_parser_rejects_non_affirmative_values(value):
    assert opt_in_is_affirmative(value) is False


def test_opt_in_env_var_name_is_stable():
    """The name is documented in README and .env.example; changing it silently
    would leave both wrong."""
    assert TEST_DB_OPT_IN_ENV_VAR == 'LANDSCAPE_ALLOW_TEST_DB'
