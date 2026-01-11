"""
Response contracts for Landscaper chat.
Single source of truth for response shapes - Django returns these directly,
Next.js passes through without transformation.
"""
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional


@dataclass
class ChatSource:
    """A source document referenced in the response."""
    filename: str
    doc_id: Optional[int] = None
    similarity: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class ChatMetadata:
    """Metadata about the AI response."""
    sources: List[ChatSource]
    db_query_used: Optional[str] = None
    rag_chunks_used: int = 0
    field_updates: Optional[Dict[str, Any]] = None
    client_request_id: Optional[str] = None
    tools_used: Optional[List[str]] = None
    tool_executions: Optional[List[Dict[str, Any]]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            'sources': [s.to_dict() for s in self.sources],
            'rag_chunks_used': self.rag_chunks_used
        }
        if self.db_query_used:
            result['db_query_used'] = self.db_query_used
        if self.field_updates:
            result['fieldUpdates'] = self.field_updates
        if self.client_request_id:
            result['client_request_id'] = self.client_request_id
        if self.tools_used:
            result['tools_used'] = self.tools_used
        if self.tool_executions:
            result['tool_executions'] = self.tool_executions
        return result


@dataclass
class ChatMessage:
    """A single chat message."""
    message_id: str
    role: str
    content: str
    created_at: str
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            'messageId': self.message_id,
            'role': self.role,
            'content': self.content,
            'createdAt': self.created_at
        }
        if self.metadata:
            result['metadata'] = self.metadata
        return result


@dataclass
class ChatResponse:
    """
    Unified response contract for chat POST.
    This is what Django returns and what the UI expects.
    Next.js should pass this through WITHOUT transformation.
    """
    success: bool
    message_id: str
    content: str
    metadata: ChatMetadata
    created_at: str
    was_duplicate: bool = False
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            'success': self.success,
            'messageId': self.message_id,
            'content': self.content,
            'metadata': self.metadata.to_dict(),
            'createdAt': self.created_at,
            'wasDuplicate': self.was_duplicate
        }
        if self.error:
            result['error'] = self.error
        return result


@dataclass
class ChatHistoryResponse:
    """Response contract for chat GET (history)."""
    success: bool
    messages: List[ChatMessage]
    project_id: int
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            'success': self.success,
            'messages': [m.to_dict() for m in self.messages],
            'projectId': self.project_id
        }
        if self.error:
            result['error'] = self.error
        return result


def error_response(error: str, status_code: int = 500) -> Dict[str, Any]:
    """Standard error response shape."""
    return {
        'success': False,
        'error': error
    }
