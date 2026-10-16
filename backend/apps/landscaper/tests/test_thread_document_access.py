"""
Pre-project document review (2026-10-16): which documents a chat may read.

Inside a project the project's documents; in a chat with no project only the
documents attached to that chat thread; with neither, nothing. The clause is
the single gate shared by get_document_content, get_document_page and
get_project_documents, so these are the whole of the authorisation rule.
"""
from apps.landscaper.tool_executor import _doc_owner_clause
from apps.landscaper.tool_registry import UNASSIGNED_SAFE_TOOLS


def test_project_wins_when_present():
    sql, params = _doc_owner_clause(9, 'f938d2d3-1e93-4284-b550-e47a3281a085')
    assert sql == "d.project_id = %s"
    assert params == [9]


def test_thread_scopes_a_pre_project_chat():
    sql, params = _doc_owner_clause(None, 'f938d2d3-1e93-4284-b550-e47a3281a085')
    assert sql == "d.thread_id = %s::uuid"
    assert params == ['f938d2d3-1e93-4284-b550-e47a3281a085']


def test_nothing_matches_with_neither():
    sql, params = _doc_owner_clause(None, None)
    assert sql == "FALSE"
    assert params == []


def test_document_read_tools_reach_pre_project_chats():
    for name in ('get_project_documents', 'get_document_content', 'get_document_page'):
        assert name in UNASSIGNED_SAFE_TOOLS
