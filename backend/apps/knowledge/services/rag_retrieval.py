"""
RAG context retrieval for Landscaper chat.
Combines vector similarity search with structured project data.

Context Priority:
1. Database queries (live project data) - PRIMARY
2. Document embeddings (uploaded files) - SECONDARY
3. General knowledge - FALLBACK
"""
from typing import List, Dict, Any, Optional
from django.db import connection

from .embedding_storage import search_similar
from .embedding_service import generate_embedding
from .schema_context import get_project_schema_context
from .query_builder import detect_query_intent, execute_project_query, format_query_results


class RAGContext:
    """
    Container for assembled RAG context.

    Manages context from multiple sources with priority:
    1. Database query results (always current)
    2. Document chunks from RAG search
    3. Project schema context (what data is available)
    """

    def __init__(self):
        self.document_chunks: List[Dict] = []
        self.project_context: Dict[str, Any] = {}
        self.recent_messages: List[Dict] = []
        self.token_estimate: int = 0

        # New: Database query context
        self.db_query_result: Optional[str] = None
        self.db_query_type: Optional[str] = None
        self.schema_context: Optional[str] = None

        # Track what sources were used
        self.sources_used: List[str] = []

    def to_prompt_sections(self) -> Dict[str, str]:
        """
        Format context for inclusion in Claude prompt.

        Returns sections in priority order:
        1. db_query_result - Direct database answer (if matched)
        2. schema_context - Available data description
        3. document_knowledge - RAG document chunks
        4. project_context - Basic project info (legacy)
        """
        sections = {}

        # PRIMARY: Database query results
        if self.db_query_result:
            sections['db_query_result'] = self.db_query_result

        # Schema context (what data is available)
        if self.schema_context:
            sections['schema_context'] = self.schema_context

        # SECONDARY: Document knowledge section
        if self.document_chunks:
            doc_texts = []
            for chunk in self.document_chunks:
                source = chunk.get('doc_name', 'Unknown document')
                similarity = chunk.get('similarity')
                header = f"[From: {source}]"
                if similarity:
                    header = f"[From: {source} (relevance: {similarity:.0%})]"
                doc_texts.append(f"{header}\n{chunk['content']}")
            sections['document_knowledge'] = "\n\n---\n\n".join(doc_texts)

        # Legacy project context (basic info)
        if self.project_context:
            sections['project_context'] = self._format_project_context()

        return sections

    def _format_project_context(self) -> str:
        """Format project data for prompt."""
        lines = []

        ctx = self.project_context

        if ctx.get('project_name'):
            lines.append(f"Project: {ctx['project_name']}")
        if ctx.get('project_type'):
            lines.append(f"Type: {ctx['project_type']}")
        if ctx.get('location'):
            lines.append(f"Location: {ctx['location']}")
        if ctx.get('total_acres'):
            lines.append(f"Total Acres: {ctx['total_acres']}")
        if ctx.get('target_units'):
            lines.append(f"Target Units/Lots: {ctx['target_units']}")
        if ctx.get('price_range'):
            lines.append(f"Price Range: {ctx['price_range']}")
        if ctx.get('total_budget'):
            lines.append(f"Total Budget: ${ctx['total_budget']:,.0f}")

        # Add container summary if available
        if ctx.get('containers'):
            lines.append("\nProject Structure:")
            for container in ctx['containers'][:10]:  # Limit for token management
                lines.append(f"  - {container['name']}: {container.get('type', '')}")

        # Add key assumptions if available
        if ctx.get('assumptions'):
            lines.append("\nKey Assumptions:")
            for key, value in list(ctx['assumptions'].items())[:15]:
                lines.append(f"  - {key}: {value}")

        return "\n".join(lines)

    def has_db_answer(self) -> bool:
        """Check if database provided a direct answer."""
        return self.db_query_result is not None

    def has_document_context(self) -> bool:
        """Check if RAG documents provided context."""
        return len(self.document_chunks) > 0

    def get_citation_hint(self) -> str:
        """Get hint for Landscaper about how to cite sources."""
        if self.has_db_answer():
            return "Based on project data"
        elif self.has_document_context():
            doc_names = [c.get('doc_name', 'document') for c in self.document_chunks[:3]]
            return f"According to {', '.join(doc_names)}"
        return "Based on general knowledge"


def retrieve_rag_context(
    query: str,
    project_id: int,
    max_chunks: int = 5,
    similarity_threshold: float = 0.65,
    include_project_context: bool = True,
    include_db_query: bool = True,
    include_schema_context: bool = True
) -> RAGContext:
    """
    Retrieve relevant context for a user query.

    Context is retrieved in priority order:
    1. Database queries (if question matches a query pattern)
    2. Document embeddings (RAG search)
    3. Project schema context (what data is available)

    Args:
        query: User's question/message
        project_id: Current project ID
        max_chunks: Maximum document chunks to retrieve
        similarity_threshold: Minimum similarity score (0-1)
        include_project_context: Whether to include structured project data
        include_db_query: Whether to try database query matching
        include_schema_context: Whether to include schema context

    Returns:
        RAGContext with assembled context
    """
    context = RAGContext()

    # STEP 1: Try to match query to database query template (PRIMARY)
    if include_db_query:
        query_intent = detect_query_intent(query)

        if query_intent:
            # Execute the matched query
            query_results = execute_project_query(project_id, query_intent)

            if not query_results.get('error') and query_results.get('row_count', 0) > 0:
                context.db_query_result = format_query_results(query_results)
                context.db_query_type = query_intent
                context.sources_used.append('database')

    # STEP 2: Get schema context (so Landscaper knows what data exists)
    if include_schema_context:
        try:
            context.schema_context = get_project_schema_context(project_id)
        except Exception:
            # Don't fail if schema context fails
            pass

    # STEP 3: Vector similarity search for document chunks (SECONDARY)
    # Always do this - documents may have additional context even if DB answered
    try:
        query_embedding = generate_embedding(query)
        similar_chunks = []
        if query_embedding:
            similar_chunks = search_similar(
                query_embedding=query_embedding,
                project_id=project_id,
                top_k=max_chunks,
                similarity_threshold=similarity_threshold
            )

        if similar_chunks:
            context.document_chunks = _enrich_chunks_with_metadata(similar_chunks)
            context.sources_used.append('documents')
    except Exception:
        # Don't fail if RAG search fails
        pass

    # STEP 4: Get structured project context (legacy - basic info)
    if include_project_context:
        context.project_context = _get_project_context(project_id)

    # STEP 5: Estimate tokens (rough: 1 token ≈ 4 chars)
    total_chars = 0
    total_chars += len(context.db_query_result or '')
    total_chars += len(context.schema_context or '')
    total_chars += sum(len(c.get('content_text', '')) for c in context.document_chunks)
    total_chars += len(str(context.project_context))
    context.token_estimate = total_chars // 4

    return context


def _enrich_chunks_with_metadata(chunks: List[Dict]) -> List[Dict]:
    """Add document metadata to chunks."""
    if not chunks:
        return []

    doc_ids = list({
        c.get('source_doc_id') or c.get('source_id')
        for c in chunks
        if c.get('source_doc_id') or c.get('source_id')
    })

    if not doc_ids:
        for chunk in chunks:
            chunk['content'] = chunk.get('content') or chunk.get('content_text', '')
            chunk['doc_name'] = chunk.get('doc_name') or chunk.get('filename') or 'Unknown document'
        return chunks

    with connection.cursor() as cursor:
        placeholders = ','.join(['%s'] * len(doc_ids))
        cursor.execute(f"""
            SELECT doc_id, doc_name, doc_type, project_id
            FROM landscape.core_doc
            WHERE doc_id IN ({placeholders})
        """, doc_ids)

        doc_metadata = {row[0]: {
            'doc_name': row[1],
            'doc_type': row[2],
            'project_id': row[3]
        } for row in cursor.fetchall()}

    for chunk in chunks:
        doc_id = chunk.get('source_doc_id') or chunk.get('source_id')
        if doc_id in doc_metadata:
            chunk.update(doc_metadata[doc_id])
        chunk['content'] = chunk.get('content') or chunk.get('content_text', '')
        chunk['doc_name'] = chunk.get('doc_name') or chunk.get('filename') or 'Unknown document'

    return chunks


class RAGRetriever:
    """Simple wrapper to retrieve project-scoped RAG chunks."""

    def __init__(
        self,
        project_id: int,
        top_k: int = 5,
        similarity_threshold: float = 0.7,
        source_types: Optional[List[str]] = None
    ):
        self.project_id = project_id
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold
        self.source_types = source_types

    def retrieve(self, query: str) -> Dict[str, Any]:
        query_embedding = generate_embedding(query)
        if not query_embedding:
            return {'chunks': []}

        chunks = search_similar(
            query_embedding=query_embedding,
            project_id=self.project_id,
            top_k=self.top_k,
            similarity_threshold=self.similarity_threshold,
            source_types=self.source_types
        )

        if chunks:
            chunks = _enrich_chunks_with_metadata(chunks)

        return {'chunks': chunks}


def _get_project_context(project_id: int) -> Dict[str, Any]:
    """Fetch structured project data."""
    context = {}

    with connection.cursor() as cursor:
        # Basic project info
        cursor.execute("""
            SELECT
                project_name,
                project_type,
                jurisdiction_city,
                jurisdiction_state,
                acres_gross,
                target_units,
                price_range_low,
                price_range_high
            FROM landscape.tbl_project
            WHERE project_id = %s
        """, [project_id])

        row = cursor.fetchone()
        if row:
            context['project_name'] = row[0]
            context['project_type'] = row[1]
            context['location'] = f"{row[2]}, {row[3]}" if row[2] and row[3] else None
            context['total_acres'] = row[4]
            context['target_units'] = row[5]
            if row[6] and row[7]:
                context['price_range'] = f"${row[6]:,.0f} - ${row[7]:,.0f}"

        # Budget summary from tbl_budget_items
        try:
            cursor.execute("""
                SELECT
                    SUM(budget_amount) as total_budget,
                    COUNT(*) as line_items
                FROM landscape.tbl_budget_items
                WHERE project_id = %s
            """, [project_id])

            row = cursor.fetchone()
            if row and row[0]:
                context['total_budget'] = float(row[0])
                context['budget_line_items'] = row[1]
        except Exception:
            # Table may not exist or have different structure
            pass

    return context


def get_conversation_context(
    project_id: int,
    limit: int = 10
) -> List[Dict[str, str]]:
    """
    Get recent conversation history for context.

    Args:
        project_id: Project ID
        limit: Max messages to retrieve

    Returns:
        List of {role, content} dicts for Claude messages format
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT role, content
            FROM landscape.landscaper_chat_message
            WHERE project_id = %s
            ORDER BY timestamp DESC
            LIMIT %s
        """, [project_id, limit])

        # Reverse to get chronological order
        messages = [{'role': row[0], 'content': row[1]} for row in cursor.fetchall()]
        messages.reverse()

        return messages
