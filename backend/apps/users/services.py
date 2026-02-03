"""
Helper utilities for Landscaper onboarding profile processing.
"""

import re
from typing import List

from .models import UserLandscaperProfile

ROLE_LABELS = {
    'appraiser': 'Appraiser',
    'land_developer': 'Land Developer',
    'cre_investor_multifamily': 'CRE Investor (Multifamily)',
}

PRIMARY_TOOL_HINTS = {
    'argus': 'ARGUS',
    'excel': 'Excel',
    'both': 'ARGUS and Excel',
    'other': 'Other underwriting tools',
    'none': 'No underwriting experience yet',
}

CONFIDENTIALITY_KEYWORDS = [
    'confidential',
    'privileged',
    'engagement letter',
    'do not disclose',
    'client name',
]

CLIENT_NAME_PATTERN = re.compile(r'\[([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)*)\]')


def compile_landscaper_instructions(profile: UserLandscaperProfile) -> str:
    """
    Build the system prompt text stored in compiled_instructions.
    """
    lines = ["USER PROFILE:"]

    if profile.role_primary:
        role_label = ROLE_LABELS.get(profile.role_primary, profile.role_primary.title().replace('_', ' '))
        lines.append(f"- Role: {role_label}")
        if profile.role_property_type:
            lines.append(f"- Property focus: {profile.role_property_type}")

    if profile.markets_text:
        lines.append(f"- Markets: {profile.markets_text}")

    tool_hint = PRIMARY_TOOL_HINTS.get(profile.primary_tool) if profile.primary_tool else None
    if tool_hint:
        lines.append(f"- Primary tool: {tool_hint}")

    if profile.ai_proficiency:
        lines.append(f"- AI experience: {profile.ai_proficiency.capitalize()}")

    if profile.communication_tone:
        lines.append(f"- Communication tone: {profile.communication_tone.capitalize()}")

    lines.append("\nLEARNED PREFERENCES:")
    insights = profile.interaction_insights or {}
    message_count = insights.get('message_count', 0)
    last_user = insights.get('last_user_message')
    lines.append(f"- Onboarding chat interactions: {message_count} message(s)")
    if last_user:
        lines.append(f"- Last user input: \"{last_user}\"")

    lines.append("\nDOCUMENT CONTEXT:")
    document_entries = profile.document_insights.get('documents', []) if profile.document_insights else []
    if document_entries:
        for doc in document_entries[-3:]:
            role_hint = doc.get('doc_type', 'document')
            summary = doc.get('summary', 'No summary')
            lines.append(f"- {role_hint}: {summary}")
    else:
        lines.append("- No documents uploaded yet.")

    return "\n".join(lines)


def detect_confidential_markers(text: str) -> List[str]:
    """
    Return unique markers found in the text.
    """
    markers = set()
    lower_text = text.lower()
    for keyword in CONFIDENTIALITY_KEYWORDS:
        if keyword in lower_text:
            markers.add(keyword)

    for match in CLIENT_NAME_PATTERN.findall(text):
        markers.add(f"client name: {match}")

    return list(markers)
