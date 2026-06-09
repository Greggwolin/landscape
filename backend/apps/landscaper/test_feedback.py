#!/usr/bin/env python3
"""
Tests for feedback capture utilities (#FB tag detection + stripping).
"""

import pytest

from apps.landscaper.feedback_utils import detect_feedback_tag, strip_feedback_tag


@pytest.mark.parametrize(
    "content,expected",
    [
        ("Hello #FB this is feedback", True),
        ("This is great! #fb", True),
        ("#FB at the start", True),
        ("At the end #FB", True),
        ("No feedback here", False),
        ("", False),
        (None, False),
        ("Multiple #FB tags #FB", True),
        ("#fb lowercase", True),
        ("Not a tag: #FBX", False),
    ],
)
def test_detection(content, expected):
    """#FB tags are detected (case-insensitive, word-bounded)."""
    assert detect_feedback_tag(content) == expected


@pytest.mark.parametrize(
    "content,expected",
    [
        ("Hello #FB this is feedback", "Hello this is feedback"),
        ("This is great! #fb", "This is great!"),
        ("#FB at the start", "at the start"),
        ("At the end #FB", "At the end"),
        ("Multiple #FB tags #FB here", "Multiple tags here"),
        ("No feedback here", "No feedback here"),
        ("", ""),
    ],
)
def test_stripping(content, expected):
    """#FB tags are stripped without mangling surrounding text."""
    assert strip_feedback_tag(content) == expected
