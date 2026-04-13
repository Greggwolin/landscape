"""
Configuration for User A seeding script.
"""
import os

# --- API ---
API_BASE_URL = os.environ.get("LANDSCAPE_API_URL", "http://localhost:8000")
LOGIN_ENDPOINT = f"{API_BASE_URL}/api/auth/login/"
PROJECTS_ENDPOINT = f"{API_BASE_URL}/api/projects/"

# --- Credentials (User A = Gregg) ---
USERNAME = os.environ.get("SEED_USERNAME", "gregg")
PASSWORD = os.environ.get("SEED_PASSWORD", "o2bFluffy!")

# --- Database ---
# Reads from DATABASE_URL env var (same one Django uses).
# Falls back to empty string — script will abort with a clear message if missing.
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# --- Batch ---
BATCH_ID = "QM_BATCH_001"

# --- Data file ---
DATA_FILE = os.path.join(os.path.dirname(__file__), "landscape_test_data_200.json")

# --- Hardcoded project defaults (used by seed_user_a.py only) ---
PROJECT_DEFAULTS = {
    "project_type_code": "MF",
    "project_type": "Multifamily",
    "analysis_perspective": "INVESTMENT",
    "analysis_purpose": "VALUATION",
}

# --- Knowledge graph seeding (used by seed_user_a_knowledge.py) ---
GREGG_USER_ID = 4
ENTITY_TYPE = "property"
SOURCE_TYPE = "market_data"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
EMBEDDING_MODEL = "text-embedding-ada-002"
EMBEDDING_BATCH_SIZE = 20  # texts per OpenAI API call
EMBEDDING_DELAY = 0.1      # seconds between batches

# Orphan cleanup range (prior seed_user_a.py project IDs)
ORPHAN_PROJECT_ID_MIN = 563
ORPHAN_PROJECT_ID_MAX = 762
