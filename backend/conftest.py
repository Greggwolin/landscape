"""
Pytest configuration for the Django backend.

Two things make this codebase non-standard for testing:

1. **Schema.** The app lives in the ``landscape`` Postgres schema (the custom
   ``db_backend`` sets ``search_path TO landscape, public`` on every
   connection). A freshly-created test database has no such schema, so we
   create it on connection — before any table is built or queried.

2. **Unmanaged models.** Most tables are created by raw-SQL migrations in the
   repo's top-level ``migrations/`` dir, so their Django models are
   ``managed=False`` and ``migrate`` never creates them. For the test database
   we disable Django migrations and build every table directly from the current
   model definitions (``--run-syncdb``), flipping the unmanaged models to
   ``managed=True`` so they are included.

Both hooks are environment-agnostic: they work against a local Postgres (point
DATABASE_URL at it) and against a CI branch database alike.
"""
import os
import sys
import django
from pathlib import Path

# Add project root to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Add financial engine to path
ENGINE_PATH = BASE_DIR.parent / 'services' / 'financial_engine_py'
if ENGINE_PATH.exists():
    sys.path.insert(0, str(ENGINE_PATH))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Setup Django
django.setup()


# --- 1. Ensure the `landscape` schema exists on every test connection --------
from django.db.backends.signals import connection_created  # noqa: E402


def _ensure_landscape_schema(sender, connection, **kwargs):
    """Create the landscape schema if missing (idempotent, cheap)."""
    with connection.cursor() as cursor:
        cursor.execute("CREATE SCHEMA IF NOT EXISTS landscape")


connection_created.connect(_ensure_landscape_schema)


# --- 2. Build the test DB from current model state, not from migrations ------
class _DisableMigrations:
    """Tells Django every app has no migrations, so the test DB is built via
    ``migrate --run-syncdb`` directly from the live model definitions."""

    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


# --- 3. Refuse to build the test database on a hosted/production server ------
#
# pytest-django creates its scratch database on whatever server DATABASE_URL
# points at, naming it `test_<dbname>`. In this repo DATABASE_URL normally
# points at the production Neon project, so simply running `pytest` in this
# directory creates `test_land_v2` **on production** — which is exactly what
# happened: `test_land_v2` and `test_test_land_v2` were both found sitting in
# the live Neon project on 2026-08-20, the second one ten months old.
#
# CI is already hermetic (.github/workflows/preview.yml JOB 4 runs the suite
# against a throwaway `postgres:16` service container), so this guard only
# ever fires on a developer machine.

_DISPOSABLE_HOSTS = frozenset({
    '',            # unix socket / no host given
    'localhost',
    '127.0.0.1',
    '::1',
    'postgres',    # docker-compose / GH Actions service container
    'db',          # docker-compose convention
    'host.docker.internal',
})

_ALLOW_REMOTE_SENTINEL = 'i-know-this-is-not-production'


def _is_disposable_db_host(host):
    """True when a test database on `host` can be created and dropped freely.

    Pure function, no Django import — unit-testable on its own.
    """
    return (host or '').strip().lower() in _DISPOSABLE_HOSTS


def _point_tests_at_a_disposable_database():
    """Redirect the suite to TEST_DATABASE_URL if given, then hard-stop if the
    resulting server is not disposable.

    Runs inside ``pytest_configure``, before pytest-django opens any
    connection, so nothing is created on the wrong server before we bail.
    """
    import pytest
    from django.conf import settings

    override = os.environ.get('TEST_DATABASE_URL', '').strip()
    if override:
        import dj_database_url
        replacement = dj_database_url.parse(override)
        # Keep the custom backend that sets search_path to the landscape schema.
        replacement['ENGINE'] = settings.DATABASES['default'].get(
            'ENGINE', 'db_backend'
        )
        settings.DATABASES['default'] = replacement

    db = settings.DATABASES['default']
    host = db.get('HOST') or ''

    if _is_disposable_db_host(host):
        return

    if os.environ.get('ALLOW_TESTS_ON_REMOTE_DB') == _ALLOW_REMOTE_SENTINEL:
        return

    raise pytest.UsageError(
        "\n"
        "Refusing to run the test suite against a remote database server.\n"
        "\n"
        f"  DATABASE_URL currently points at : {host}/{db.get('NAME')}\n"
        "\n"
        "pytest-django would create a scratch database called\n"
        f"  test_{db.get('NAME')}\n"
        "on that server. If that server is the production Neon project, the\n"
        "scratch database is created inside production and is left behind\n"
        "whenever a run is interrupted.\n"
        "\n"
        "Point the suite at a throwaway Postgres instead, either by exporting\n"
        "TEST_DATABASE_URL for this run:\n"
        "\n"
        "  TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/landscape pytest\n"
        "\n"
        "or by setting DATABASE_URL to a local server. CI already does this\n"
        "(.github/workflows/preview.yml, JOB 4).\n"
        "\n"
        "If you genuinely mean to test against a remote server, set\n"
        f"  ALLOW_TESTS_ON_REMOTE_DB={_ALLOW_REMOTE_SENTINEL}\n"
    )


def pytest_configure(config):
    from django.conf import settings
    from django.apps import apps as django_apps

    # Must come first: everything below assumes we are allowed to build a
    # test database on the configured server.
    _point_tests_at_a_disposable_database()

    # Build tables from model state (skips the raw-SQL/unmanaged migration baggage).
    settings.MIGRATION_MODULES = _DisableMigrations()

    # Flip unmanaged models to managed so run-syncdb creates their tables in the
    # test database. Only affects the in-process model registry during tests.
    #
    # Several ORM models intentionally wrap the SAME physical table (e.g. both
    # apps.landuse and apps.projects.lookups map `lu_family`). Creating a table
    # twice errors, so we claim each db_table for exactly one model: tables an
    # already-managed model will create are reserved first, then each remaining
    # unmanaged model is promoted only if its table is still unclaimed.
    claimed = {
        m._meta.db_table for m in django_apps.get_models() if m._meta.managed
    }
    for model in django_apps.get_models():
        if model._meta.managed:
            continue
        table = model._meta.db_table
        if table in claimed:
            continue  # another model already creates this table
        model._meta.managed = True
        claimed.add(table)
