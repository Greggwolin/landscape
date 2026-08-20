"""
Offline tests for the test-database guard in ``backend/conftest.py``.

These exercise the pure decision function only. They resolve no settings, open
no connection, and never name the real database host — every hostname below is
fictitious by design. The guard must be provable without going near the thing
it protects.

These merge the cases from two independently-written guards: this one and the
uncommitted implementation found in the primary checkout on 2026-08-20 and
preserved on `wip/local-test-db-guard-0819`. That work contributed the
container hostnames, the TEST_DATABASE_URL redirect and the phrase-based
opt-in, all of which were better than what was here.

Its own tests lived at backend/apps/projects/test_db_guard.py — not a mistake:
under the then-current `testpaths = apps` that was the ONLY directory where a
test would run at all. This change widens testpaths to `apps tests`, which
removes the constraint, so the cases live here and the duplicate file is gone.

Run: pytest backend/tests/test_db_guard.py
"""

import pytest

from conftest import (
    TEST_DB_OPT_IN_ENV_VAR,
    TEST_DB_OPT_IN_PHRASE,
    TEST_DB_URL_ENV_VAR,
    db_target_is_allowed,
    opt_in_is_affirmative,
)


# A deliberately fake, non-resolving host that is shaped like a managed
# Postgres endpoint. Never the real one.
FAKE_REMOTE_HOST = 'ep-example-fake-00000000.us-west-2.aws.example-not-real.test'


@pytest.mark.parametrize('host', ['localhost', '127.0.0.1', '::1', ''])
def test_local_hosts_are_allowed(host):
    assert db_target_is_allowed(host) is True


@pytest.mark.parametrize('host', ['postgres', 'db', 'host.docker.internal'])
def test_container_hostnames_are_allowed(host):
    """A database reachable only by a compose service name is by construction
    a local, disposable one — these resolve to nothing outside the container
    network. Omitting them made the guard fire on a perfectly safe docker
    setup, and a guard that cries wolf on the normal case gets switched off."""
    assert db_target_is_allowed(host) is True


@pytest.mark.parametrize('host', ['POSTGRES', ' db ', 'Host.Docker.Internal'])
def test_container_hostnames_ignore_case_and_whitespace(host):
    assert db_target_is_allowed(host) is True


@pytest.mark.parametrize('host', ['LOCALHOST', '  localhost  ', '127.0.0.1 '])
def test_allowlist_ignores_case_and_surrounding_whitespace(host):
    assert db_target_is_allowed(host) is True


def test_remote_host_is_refused_without_opt_in():
    assert db_target_is_allowed(FAKE_REMOTE_HOST) is False


def test_none_host_is_treated_as_local_socket():
    assert db_target_is_allowed(None) is True


@pytest.mark.parametrize('opt_in', [
    'i-know-this-is-not-production',
    'I-Know-This-Is-Not-Production',
    '  i-know-this-is-not-production  ',
])
def test_the_exact_phrase_permits_a_remote_host(opt_in):
    assert db_target_is_allowed(FAKE_REMOTE_HOST, opt_in) is True


@pytest.mark.parametrize('opt_in', ['1', 'true', 'TRUE', 'yes', 'on', ' 1 '])
def test_a_truthy_flag_does_NOT_permit_a_remote_host(opt_in):
    """THE POINT OF THE PHRASE.

    '1' is what a person reaches for when they want the error to go away, so a
    guard that yields to it gets defeated by habit rather than by judgement.
    Only a sentence about the target database opens it.
    """
    assert db_target_is_allowed(FAKE_REMOTE_HOST, opt_in) is False


@pytest.mark.parametrize('opt_in', [
    None, '', '0', 'false', 'no', 'off', 'maybe',
    'i-know-this-is-production',          # the opposite claim
    'i know this is not production',      # spaces, not hyphens
    'i-know-this-is-not-production!',     # near miss
])
def test_anything_but_the_phrase_does_not_permit_a_remote_host(opt_in):
    assert db_target_is_allowed(FAKE_REMOTE_HOST, opt_in) is False


@pytest.mark.parametrize('value', [
    '0', 'false', 'no', 'off', '', None, 'maybe', '1', 'true', 'yes',
])
def test_opt_in_parser_rejects_everything_but_the_phrase(value):
    assert opt_in_is_affirmative(value) is False


def test_opt_in_env_var_name_is_stable():
    """The names are documented in README and .env.example; changing one
    silently would leave both wrong."""
    assert TEST_DB_OPT_IN_ENV_VAR == 'LANDSCAPE_ALLOW_TEST_DB'
    assert TEST_DB_URL_ENV_VAR == 'TEST_DATABASE_URL'
    assert TEST_DB_OPT_IN_PHRASE == 'i-know-this-is-not-production'
