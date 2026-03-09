"""
Feedback capture utilities for Landscaper chat.

Detects #FB hashtag in user messages and forwards feedback to Discord webhook
with message context for alpha testing.
"""

import logging
import requests
from typing import Optional, List, Dict
from django.conf import settings
from datetime import datetime

logger = logging.getLogger(__name__)


def detect_feedback_tag(content: str) -> bool:
    """
    Check if message contains #FB feedback tag (case-insensitive).
    
    Args:
        content: The message content to check
        
    Returns:
        True if #FB is present, False otherwise
    """
    if not content:
        return False
    
    import re
    # Match #FB case-insensitively with word boundaries
    return bool(re.search(r'#[Ff][Bb]\b', content))


def strip_feedback_tag(content: str) -> str:
    """
    Remove #FB tag from message content.
    
    Args:
        content: The message content
        
    Returns:
        Content with #FB tags removed
    """
    if not content:
        return content
    
    # Remove both uppercase and mixed case variants
    import re
    # Match #FB case-insensitively with word boundaries
    cleaned = re.sub(r'#[Ff][Bb]\b', '', content)
    # Clean up any double spaces left behind
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def capture_feedback(
    user_message: str,
    user_email: Optional[str] = None,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    project_name: Optional[str] = None,
    page_context: Optional[str] = None,
    message_history: Optional[List[Dict]] = None,
) -> bool:
    """
    Send feedback to Discord webhook.
    
    Args:
        user_message: The message containing #FB
        user_email: User's email address (if available)
        user_id: User's ID
        project_id: Current project ID
        project_name: Current project name
        page_context: Current page/workflow context
        message_history: Recent message history for context (last 3-5 messages)
        
    Returns:
        True if sent successfully, False otherwise
    """
    webhook_url = getattr(settings, 'LANDSCAPER_FEEDBACK_WEBHOOK_URL', None)
    
    if not webhook_url:
        logger.warning("LANDSCAPER_FEEDBACK_WEBHOOK_URL not configured - feedback not sent")
        return False
    
    try:
        # Build compact Discord embed
        # Title: "username: Page > Tab"
        username = user_email.split('@')[0] if user_email else f"user_{user_id or '?'}"
        page_label = page_context or "unknown"
        title = f"{username}: {page_label}"

        feedback_text = strip_feedback_tag(user_message)

        embed = {
            "title": title,
            "description": feedback_text[:2000],
            "color": 0x5865F2,
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": f"Project: {project_name or project_id or '—'}"},
        }

        payload = {
            "embeds": [embed]
        }
        
        response = requests.post(
            webhook_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code in (200, 204):
            logger.info(f"Feedback captured successfully for user {user_id} on project {project_id}")
            return True
        else:
            logger.error(f"Failed to send feedback to Discord: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending feedback to Discord: {str(e)}", exc_info=True)
        return False
