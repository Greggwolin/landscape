#!/usr/bin/env python3
"""
Quick test script for feedback capture utilities.

Run with:
    cd ~/landscape/backend
    source venv/bin/activate
    python apps/landscaper/test_feedback.py
"""

from feedback_utils import detect_feedback_tag, strip_feedback_tag


def test_detection():
    """Test #FB detection."""
    print("Testing #FB detection...")
    
    test_cases = [
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
    ]
    
    passed = 0
    failed = 0
    
    for content, expected in test_cases:
        result = detect_feedback_tag(content)
        status = "✅" if result == expected else "❌"
        
        if result == expected:
            passed += 1
        else:
            failed += 1
            
        print(f"{status} '{content}' -> {result} (expected {expected})")
    
    print(f"\nDetection: {passed} passed, {failed} failed\n")


def test_stripping():
    """Test #FB stripping."""
    print("Testing #FB stripping...")
    
    test_cases = [
        ("Hello #FB this is feedback", "Hello this is feedback"),
        ("This is great! #fb", "This is great!"),
        ("#FB at the start", "at the start"),
        ("At the end #FB", "At the end"),
        ("Multiple #FB tags #FB here", "Multiple tags here"),
        ("No feedback here", "No feedback here"),
        ("", ""),
    ]
    
    passed = 0
    failed = 0
    
    for content, expected in test_cases:
        result = strip_feedback_tag(content)
        status = "✅" if result == expected else "❌"
        
        if result == expected:
            passed += 1
        else:
            failed += 1
            
        print(f"{status} '{content}'")
        print(f"   -> '{result}'")
        print(f"   Expected: '{expected}'\n")
    
    print(f"Stripping: {passed} passed, {failed} failed\n")


if __name__ == "__main__":
    print("=" * 60)
    print("Feedback Capture Utility Tests")
    print("=" * 60 + "\n")
    
    test_detection()
    test_stripping()
    
    print("=" * 60)
    print("Tests complete!")
    print("=" * 60)
