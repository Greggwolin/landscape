"""
Pytest configuration for Django backend testing.
Phase 6: Testing Enhancement
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

# Pytest configuration
def pytest_configure(config):
    """Configure pytest with Django settings."""
    from django.conf import settings
    
    # Ensure test database is used
    if 'test' not in settings.DATABASES['default']['NAME']:
        settings.DATABASES['default']['NAME'] = 'test_' + settings.DATABASES['default']['NAME']
