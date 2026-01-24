"""
Narrative Models

Phase 3 narrative collaboration uses the valuation narrative tables.
This module re-exports the existing models for convenience.
"""

from apps.valuation.models import NarrativeVersion, NarrativeComment, NarrativeChange

__all__ = [
    'NarrativeVersion',
    'NarrativeComment',
    'NarrativeChange',
]
