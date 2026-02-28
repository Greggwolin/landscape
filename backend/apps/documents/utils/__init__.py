"""Utility modules for document processing."""

import re


def detect_extract_type(filename: str, detected_doc_type: str = None) -> str:
    """
    Map filename/doc type hints to extract_type for DMSExtractQueue.

    Returns one of:
    - rent_roll
    - land_use_plan
    - entitlement
    - budget
    - offering_memo
    - general
    """
    # Priority 1: use explicit doc type hint when we can map it directly.
    if detected_doc_type:
        doc_type_lower = detected_doc_type.lower().strip()
        doc_type_map = {
            "rent_roll": "rent_roll",
            "rent roll": "rent_roll",
            "property data": "rent_roll",
            "operating": "budget",
            "operations": "budget",
            "t-12": "budget",
            "t12": "budget",
            "budget": "budget",
            "pro forma": "budget",
            "proforma": "budget",
            "offering": "offering_memo",
            "offering memorandum": "offering_memo",
            "om": "offering_memo",
            "entitlement": "entitlement",
            "zoning": "entitlement",
            "community master plan": "entitlement",
            "cmp": "entitlement",
            "master plan": "entitlement",
            "plat": "land_use_plan",
            "survey": "land_use_plan",
            "title & survey": "land_use_plan",
            "site plan": "land_use_plan",
        }
        if doc_type_lower in doc_type_map:
            return doc_type_map[doc_type_lower]

    if not filename:
        return "general"

    name_lower = filename.lower()

    if re.search(r"rent[_\s-]?roll|\_rr\b|\brr\b", name_lower):
        return "rent_roll"

    if re.search(r"\bcmp\b|master\s*plan|community\s*plan|entitlement|zoning", name_lower):
        return "entitlement"

    if re.search(r"budget|cost|pro\s*forma|proforma|t-?12|operating\s*statement", name_lower):
        return "budget"

    if re.search(r"\bom\b|offering\s*memo(?:randum)?", name_lower):
        return "offering_memo"

    if re.search(r"plat\b|survey|record\s*of\s*survey", name_lower):
        return "land_use_plan"

    return "general"
