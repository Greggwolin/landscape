"""
Human-readable summaries for version log entries.

Phase 1 keeps these intentionally coarse — the version_seq + edit_source
already say most of what the user needs. Phase 5 will refine.
"""

from typing import Any


def summarize_diff(edit_source: str, diff_json: Any) -> str:
    if edit_source == 'create':
        return 'Created artifact'
    if edit_source == 'restore':
        if isinstance(diff_json, dict) and diff_json.get('restored_from'):
            return f'Restored to v{diff_json["restored_from"]}'
        return 'Restored to a previous version'
    if edit_source == 'cascade':
        return 'Cascaded update from a related artifact'
    if edit_source == 'modal_save':
        return 'Updated via modal save'
    if edit_source == 'extraction_commit':
        return 'Updated from extraction commit'
    if edit_source == 'drift_pull':
        return 'Pulled current values for stale rows'
    if edit_source == 'user_edit':
        if isinstance(diff_json, list):
            n = len(diff_json)
            return f'Applied {n} edit op{"s" if n != 1 else ""}'
        return 'Edited'
    return f'Edit ({edit_source})'
