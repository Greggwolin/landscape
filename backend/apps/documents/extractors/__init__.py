"""Document extractors for AI-powered extraction."""

# Lazy imports - import classes only when needed to avoid loading pdfplumber at startup
# Usage: from apps.documents.extractors.rentroll import RentRollExtractor

__all__ = [
    'BaseExtractor',
    'RentRollExtractor',
    'OperatingExtractor',
    'ParcelTableExtractor',
    'MarketResearchExtractor',
]
