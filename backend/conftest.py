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


def pytest_configure(config):
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
