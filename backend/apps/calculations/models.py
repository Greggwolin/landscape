"""
Calculations app models.

This app provides API endpoints for financial calculations but doesn't
define database models. All calculations are performed in-memory using
the Python financial engine.

The engine is imported from services/financial_engine_py/ which is
added to Python path in settings.py.
"""

# No models needed - calculations are stateless and use data from other apps
# (projects, containers, financial, etc.)
