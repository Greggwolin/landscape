"""
Agent framework configuration.

All endpoints, credentials, and timeouts in one place.
Override via environment variables where noted.
"""

import os

# ── Server URLs ──────────────────────────────────────────────────────────────
DJANGO_BASE_URL = os.getenv('AGENT_DJANGO_URL', 'http://localhost:8000')
NEXTJS_BASE_URL = os.getenv('AGENT_NEXTJS_URL', 'http://localhost:3000')

# ── Auth ─────────────────────────────────────────────────────────────────────
AUTH_USERNAME = os.getenv('AGENT_USERNAME', 'noel')
AUTH_PASSWORD = os.getenv('AGENT_PASSWORD', '12345')
TOKEN_ENDPOINT = f'{DJANGO_BASE_URL}/api/token/'

# ── Chat API (thread-based) ─────────────────────────────────────────────────
THREADS_ENDPOINT = f'{DJANGO_BASE_URL}/api/landscaper/threads/'
THREAD_MESSAGES_ENDPOINT = f'{DJANGO_BASE_URL}/api/landscaper/threads/{{thread_id}}/messages/'
THREAD_RECENT_ENDPOINT = f'{DJANGO_BASE_URL}/api/landscaper/threads/recent/'

# ── Mutation confirmation ────────────────────────────────────────────────────
MUTATION_CONFIRM_ENDPOINT = f'{DJANGO_BASE_URL}/api/landscaper/mutations/{{mutation_id}}/confirm/'
BATCH_CONFIRM_ENDPOINT = f'{DJANGO_BASE_URL}/api/landscaper/mutations/batch/{{batch_id}}/confirm/'

# ── Project creation ────────────────────────────────────────────────────────
PROJECT_MINIMAL_ENDPOINT = f'{NEXTJS_BASE_URL}/api/projects/minimal'
DJANGO_PROJECT_ENDPOINT = f'{DJANGO_BASE_URL}/api/projects/'

# ── DMS / Documents ─────────────────────────────────────────────────────────
DMS_UPLOAD_ENDPOINT = f'{NEXTJS_BASE_URL}/api/dms/upload'
DMS_LIST_ENDPOINT = f'{DJANGO_BASE_URL}/api/dms/documents/'
DJANGO_UPLOAD_ENDPOINT = f'{DJANGO_BASE_URL}/api/documents/upload/'

# ── Extraction staging ───────────────────────────────────────────────────────
STAGING_ENDPOINT = f'{DJANGO_BASE_URL}/api/knowledge/projects/{{project_id}}/extraction-staging/'
STAGING_ACCEPT_ALL_ENDPOINT = f'{DJANGO_BASE_URL}/api/knowledge/projects/{{project_id}}/extraction-staging/accept-all-pending/'
STAGING_COMMIT_ENDPOINT = f'{DJANGO_BASE_URL}/api/knowledge/projects/{{project_id}}/extraction-staging/commit/'
STAGING_ABANDON_ENDPOINT = f'{DJANGO_BASE_URL}/api/knowledge/projects/{{project_id}}/extraction-staging/abandon/'

# ── Extraction processing ───────────────────────────────────────────────────
DOC_PROCESS_ENDPOINT = f'{DJANGO_BASE_URL}/api/knowledge/documents/{{doc_id}}/process/'
DOC_EXTRACT_BATCHED_ENDPOINT = f'{DJANGO_BASE_URL}/api/knowledge/documents/{{doc_id}}/extract-batched/'
DOC_APPROVE_HIGH_CONF_ENDPOINT = f'{DJANGO_BASE_URL}/api/knowledge/projects/{{project_id}}/extractions/approve-high-confidence/'

# ── Timeouts (seconds) ──────────────────────────────────────────────────────
# Chat messages are synchronous/blocking — Claude can take 30s+ to respond
CHAT_TIMEOUT = int(os.getenv('AGENT_CHAT_TIMEOUT', '120'))
API_TIMEOUT = int(os.getenv('AGENT_API_TIMEOUT', '30'))
AUTH_TIMEOUT = 10

# ── Test project defaults ───────────────────────────────────────────────────
TEST_PROJECT_PREFIX = 'AGENT_TEST_'
DEFAULT_PROJECT_TYPE = 'MF'
DEFAULT_ANALYSIS_PURPOSE = 'VALUATION'
DEFAULT_ANALYSIS_PERSPECTIVE = 'INVESTMENT'

# ── Test document paths ─────────────────────────────────────────────────────
# Relative to the repo root (landscape/)
TEST_DOCS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'test-docs', 'Multifamily')
S1_RENT_ROLL_PDF = os.path.join(TEST_DOCS_DIR, 'Torrance_rent_roll_itemized-20251219h.pdf')
S3_OM_PDF = os.path.join(TEST_DOCS_DIR, '14105 Chadron Ave_OM_2025[nopics].pdf')

# ── Extraction polling ──────────────────────────────────────────────────────
EXTRACTION_POLL_INTERVAL = 3       # seconds between staging polls
EXTRACTION_POLL_TIMEOUT = 120      # max seconds to wait for extraction results
EXTRACTION_MIN_FIELDS = 3          # minimum fields expected from rent roll extraction

# ── Calibration vs test mode ────────────────────────────────────────────────
# In calibration mode, agents extract actual values and write manifests.
# In test mode, agents compare against manifest values.
CALIBRATION_MODE = os.getenv('AGENT_CALIBRATION', 'true').lower() == 'true'

# ── Output paths ─────────────────────────────────────────────────────────────
REPORT_DIR = os.path.join(os.path.dirname(__file__), 'reports')
MANIFEST_DIR = os.path.join(os.path.dirname(__file__), 'manifests')
