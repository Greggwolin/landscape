"""Regression tests for the test-database safety guard in ``backend/conftest.py``.

Context (2026-08-20). ``pytest-django`` creates its scratch database on
whatever server ``DATABASE_URL`` names, calling it ``test_<dbname>``. In this
repo ``DATABASE_URL`` normally points at the production Neon project, so
running ``pytest`` in ``backend/`` created ``test_land_v2`` **inside
production**. Two such databases were found sitting in the live Neon project —
``test_land_v2`` (2 days old) and ``test_test_land_v2`` (10 months old), the
leftovers of interrupted runs.

``conftest._point_tests_at_a_disposable_database`` now stops the suite before
any connection is opened unless the target server is disposable. These tests
pin the classification, which is the part that decides whether it fires.

Note the suite you are reading this in has itself already passed that guard.
"""
import conftest


class TestDisposableHostClassification:
    """Hosts we are allowed to create and drop a test database on."""

    def test_empty_host_is_disposable(self):
        # No host at all means a local unix socket.
        assert conftest._is_disposable_db_host('') is True
        assert conftest._is_disposable_db_host(None) is True

    def test_loopback_is_disposable(self):
        for host in ('localhost', '127.0.0.1', '::1'):
            assert conftest._is_disposable_db_host(host) is True, host

    def test_container_service_names_are_disposable(self):
        # GitHub Actions service container and docker-compose conventions.
        for host in ('postgres', 'db', 'host.docker.internal'):
            assert conftest._is_disposable_db_host(host) is True, host

    def test_classification_ignores_case_and_padding(self):
        assert conftest._is_disposable_db_host('  LocalHost  ') is True


class TestHostedHostsAreRejected:
    """The whole point: a hosted server must never be treated as disposable."""

    def test_production_neon_endpoint_is_not_disposable(self):
        # The exact endpoint the app's DATABASE_URL points at.
        assert conftest._is_disposable_db_host(
            'ep-tiny-lab-af0tg3ps.c-2.us-west-2.aws.neon.tech'
        ) is False

    def test_any_neon_endpoint_is_not_disposable(self):
        for host in (
            'ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech',
            'ep-anything-else.us-east-2.aws.neon.tech',
        ):
            assert conftest._is_disposable_db_host(host) is False, host

    def test_other_hosted_providers_are_not_disposable(self):
        for host in (
            'containers-us-west-1.railway.app',
            'db.example.supabase.co',
            'some-rds.us-east-1.rds.amazonaws.com',
            '10.0.0.5',
        ):
            assert conftest._is_disposable_db_host(host) is False, host

    def test_hostname_merely_containing_localhost_is_not_disposable(self):
        # Guard against a substring match creeping in later.
        assert conftest._is_disposable_db_host('localhost.evil.example.com') is False
        assert conftest._is_disposable_db_host('notlocalhost') is False


class TestEscapeHatch:
    """The override exists, but must require the exact sentinel."""

    def test_sentinel_is_not_a_bare_truthy_value(self):
        # A plain "1" or "true" must not unlock it — the value has to be
        # deliberate enough that nobody sets it by reflex.
        assert conftest._ALLOW_REMOTE_SENTINEL == 'i-know-this-is-not-production'
        assert conftest._ALLOW_REMOTE_SENTINEL not in ('1', 'true', 'yes', 'on')
