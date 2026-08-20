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


# --- 3. Refuse to build a test database anywhere but a test host -------------
#
# `backend/.env` legitimately points DATABASE_URL at the real Neon database so
# the Django dev server sees real data, and pytest.ini carries `--create-db`.
# Together, a bare `pytest` would DROP and CREATE `test_land_v2` on that server,
# and the connection_created hook above would issue CREATE SCHEMA on the
# maintenance connection to `land_v2` itself — DDL against the database holding
# real project data.
#
# Deny by default; allow an explicit, named opt-in. We deliberately do NOT
# pattern-match "production" hostnames. That is fragile in both directions: it
# would block a legitimate isolated Neon branch database, and it would silently
# stop protecting anything the day the production endpoint is rotated. Requiring
# a human to type the variable that means "I know what I am doing" is safer than
# requiring this file to recognize every dangerous host in advance.

ALLOWED_TEST_DB_HOSTS = frozenset({
    'localhost',
    '127.0.0.1',
    '::1',
    # An empty host means a local unix-domain socket. libpq cannot reach a
    # remote server without a host, so this can only ever be a local database.
    '',
})

TEST_DB_OPT_IN_ENV_VAR = 'LANDSCAPE_ALLOW_TEST_DB'


def opt_in_is_affirmative(value):
    """True only for an affirmative opt-in value.

    NOTE the name: anything starting with ``test_`` would be collected as a
    test by pytest the moment this module is imported into one.

    Deliberately strict: ``LANDSCAPE_ALLOW_TEST_DB=0`` must NOT disable the
    guard. A bare truthiness check would accept "0" and "false", which is the
    opposite of what someone typing them intends.
    """
    return str(value or '').strip().lower() in {'1', 'true', 'yes', 'on'}


def db_target_is_allowed(host, opt_in=None):
    """Whether pytest may build a test database on ``host``.

    Pure and offline: takes an already-resolved host string, reads no settings
    and opens no connection, so it can be unit-tested directly (see
    ``backend/tests/test_db_guard.py``).
    """
    if opt_in_is_affirmative(opt_in):
        return True
    return (host or '').strip().lower() in ALLOWED_TEST_DB_HOSTS


def _refuse_unsafe_test_database():
    """Stop the run before --create-db can touch a non-test server."""
    import pytest
    from django.conf import settings

    default = settings.DATABASES.get('default', {})
    host = default.get('HOST') or ''
    name = default.get('NAME') or '(unnamed)'

    if db_target_is_allowed(host, os.environ.get(TEST_DB_OPT_IN_ENV_VAR)):
        return

    # Host and database name only — never the connection string, which carries
    # credentials.
    pytest.exit(
        "\n"
        "REFUSING TO RUN: the test database would be built on a non-test host.\n"
        "\n"
        "  DATABASE_URL resolves to host {host!r}, database {name!r}.\n"
        "\n"
        "pytest runs with --create-db, so continuing would DROP and CREATE a test\n"
        "database on that server, and create the `landscape` schema on {name!r}\n"
        "itself. If that server holds real project data, this is destructive.\n"
        "Only localhost / 127.0.0.1 is allowed by default.\n"
        "\n"
        "Run the suite against local Postgres instead:\n"
        "\n"
        "    DATABASE_URL=postgresql://localhost/landscape pytest\n"
        "\n"
        "If the target really is an isolated, disposable database, set\n"
        "{var}=1 to override this check.\n".format(
            host=host, name=name, var=TEST_DB_OPT_IN_ENV_VAR
        ),
        returncode=4,
    )


def pytest_configure(config):
    # Runs before settings are mutated, before collection, and long before
    # --create-db can act. See section 3.
    _refuse_unsafe_test_database()

    from django.conf import settings
    from django.apps import apps as django_apps

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
