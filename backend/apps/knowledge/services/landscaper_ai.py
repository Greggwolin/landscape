"""
Landscaper AI service with RAG-enhanced responses.

Landscaper has access to:
1. STRUCTURED DATA: Full project context from database tables
   - Project profile, container hierarchy, unit/rent data
   - Operating expenses, budget, sales data, financial assumptions
2. DOCUMENT CONTENT: RAG-retrieved chunks from uploaded documents
3. QUERY RESULTS: On-demand database queries for specific questions

The system prompt includes ALL available project data so Landscaper
can answer questions about both structured data AND documents.
"""
import os
import re
import uuid
from typing import List, Dict, Any, Optional
from anthropic import Anthropic
from django.conf import settings
from django.db import connection

from .rag_retrieval import retrieve_rag_context, get_conversation_context, RAGContext
from .query_builder import execute_project_query
from .project_context import get_project_context


def _get_anthropic_client() -> Anthropic:
    """Get Anthropic client with API key from .env or settings."""
    api_key = None

    # First, try to read directly from backend/.env file
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env')
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.strip().startswith('ANTHROPIC_API_KEY='):
                    api_key = line.split('=', 1)[1].strip()
                    break

    # Fallback to system env or Django settings
    if not api_key:
        api_key = os.getenv('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', None)

    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not found. Set it in backend/.env or environment.")

    return Anthropic(api_key=api_key)


CLAUDE_MODEL = "claude-sonnet-4-20250514"


def get_landscaper_response(
    user_message: str,
    project_id: int,
    conversation_history: List[Dict] = None,
    max_context_chunks: int = 5
) -> Dict[str, Any]:
    """
    Get RAG-enhanced response from Landscaper AI.

    Args:
        user_message: User's question/message
        project_id: Current project ID
        conversation_history: Optional prior messages (if not provided, fetched from DB)
        max_context_chunks: Max document chunks to include

    Returns:
        Dict with 'content', 'metadata', 'context_used'
    """

    # 1. Retrieve RAG context
    rag_context = retrieve_rag_context(
        query=user_message,
        project_id=project_id,
        max_chunks=max_context_chunks,
        similarity_threshold=0.65
    )

    # 2. Get conversation history if not provided
    if conversation_history is None:
        conversation_history = get_conversation_context(project_id, limit=10)

    # 3. Get full project context (structured data from all tables)
    project_context = get_project_context(project_id)

    # 4. Build system prompt with RAG context + project context
    system_prompt = _build_system_prompt(rag_context, project_context)

    # 4. Build messages array
    messages = []
    for msg in conversation_history:
        messages.append({
            "role": msg['role'],
            "content": msg['content']
        })

    # Add current user message
    messages.append({
        "role": "user",
        "content": user_message
    })

    # 5. Call Claude API
    try:
        anthropic = _get_anthropic_client()
        response = anthropic.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2000,
            system=system_prompt,
            messages=messages
        )

        ai_content = response.content[0].text if response.content else ""

        # 6. Extract any suggested values from response
        metadata = _extract_suggestions(ai_content)

        # 7. Get structured data if we matched a DB query with tabular results
        structured_data = None
        data_type = None
        data_title = None
        columns = None

        if rag_context.db_query_type:
            query_result = execute_project_query(project_id, rag_context.db_query_type)
            if not query_result.get('error') and query_result.get('row_count', 0) > 3:
                # Tabular data worth showing in a grid
                structured_data = query_result['rows']
                data_type = 'table'
                data_title = _get_data_title(rag_context.db_query_type)
                columns = _get_column_definitions(rag_context.db_query_type)

        # Determine primary source
        has_project_data = bool(project_context and project_context.strip())
        has_query_result = rag_context.db_query_type is not None
        has_documents = len(rag_context.document_chunks) > 0

        if has_query_result:
            primary_source = 'database_query'
        elif has_project_data:
            primary_source = 'project_data'
        elif has_documents:
            primary_source = 'documents'
        else:
            primary_source = 'general'

        return {
            'content': ai_content,
            'metadata': metadata,
            'context_used': {
                'chunks_retrieved': len(rag_context.document_chunks),
                'token_estimate': rag_context.token_estimate,
                'sources': [c.get('doc_name', 'Unknown') for c in rag_context.document_chunks],
                # Track what context was included
                'has_project_context': has_project_data,
                'has_query_result': has_query_result,
                'has_document_chunks': has_documents,
                'db_query_matched': has_query_result,
                'db_query_type': rag_context.db_query_type,
                'sources_used': getattr(rag_context, 'sources_used', []),
                'primary_source': primary_source
            },
            # NEW: Structured data for table rendering
            'structured_data': structured_data,
            'data_type': data_type,
            'data_title': data_title,
            'columns': columns,
            'usage': {
                'input_tokens': response.usage.input_tokens,
                'output_tokens': response.usage.output_tokens
            }
        }

    except Exception as e:
        return {
            'content': f"I apologize, but I encountered an error processing your request. Please try again.",
            'metadata': {'error': str(e)},
            'context_used': {},
            'usage': {}
        }


def _build_system_prompt(rag_context: RAGContext, project_context: str = "") -> str:
    """
    Build system prompt with full project context + RAG context.

    Args:
        rag_context: RAG context with document chunks and query results
        project_context: Full structured data context from ProjectContextService
    """

    sections = rag_context.to_prompt_sections()

    base_prompt = """You are Landscaper AI, a strategic advisor for real estate development projects. You have deep expertise in:
- Land development and master-planned communities
- Multifamily and commercial real estate analysis
- Market analysis and absorption forecasting
- Financial modeling and feasibility analysis
- Risk assessment and mitigation strategies

Your role is to provide actionable, data-driven guidance. You have access to BOTH structured project data from the database AND content from uploaded documents. Reference specific data when answering.

When suggesting specific numeric values (absorption rates, prices, costs, timelines), be explicit so these can be tracked against the user's actual choices."""

    # PRIMARY SOURCE: Full project context (always include if available)
    if project_context and project_context.strip():
        base_prompt += f"""

=== PROJECT DATA (from database) ===

{project_context}

IMPORTANT: This is live, validated project data. Always prefer this structured data over document excerpts when both contain the same information."""

    # QUERY RESULT: Specific database query match (if question matched a pattern)
    if sections.get('db_query_result'):
        base_prompt += f"""

=== QUERY RESULT (specific answer) ===

{sections['db_query_result']}"""

    # DOCUMENT CONTENT: RAG-retrieved document chunks
    if sections.get('document_knowledge'):
        base_prompt += f"""

=== DOCUMENT EXCERPTS (from uploaded files) ===

{sections['document_knowledge']}

When referencing document content, cite the specific document name."""

    # Schema context: What additional data could be queried
    if sections.get('schema_context') and not project_context:
        base_prompt += f"""

=== AVAILABLE DATA TYPES ===

{sections['schema_context']}"""

    # Citation guidance
    citation_hint = rag_context.get_citation_hint() if hasattr(rag_context, 'get_citation_hint') else ""

    base_prompt += """

=== RESPONSE GUIDELINES ===

1. Be direct and actionable - real estate professionals value concise, expert guidance
2. ALWAYS cite your source:
   - For database data: "Based on project data..." or "The project shows..."
   - For documents: "According to [document name]..."
   - For general knowledge: "Based on industry standards..." or acknowledge if you're making an assumption
3. When BOTH database and documents contain the same info, prefer database (it's current)
4. When ONLY documents have the info, use documents and cite them
5. Quantify recommendations when possible (e.g., "target 4-6 units/month absorption")
6. Flag risks and uncertainties proactively
7. Ask clarifying questions if needed to give better advice
8. If you don't have enough information, say so rather than guessing"""

    if citation_hint:
        base_prompt += f"\n9. For this query, your primary source is: {citation_hint}"

    return base_prompt


def _extract_suggestions(ai_response: str) -> Dict[str, Any]:
    """
    Extract suggested values from AI response for advice tracking.

    Looks for patterns like:
    - "I recommend 48 units per year"
    - "target absorption of 4-6 units/month"
    - "price at $85,000 per lot"
    """
    suggestions = {}

    # Absorption rate patterns
    absorption_patterns = [
        r'(\d+(?:-\d+)?)\s*units?\s*per\s*(year|month|quarter)',
        r'absorption\s*(?:rate\s*)?(?:of\s*)?(\d+(?:-\d+)?)\s*units?',
    ]

    for pattern in absorption_patterns:
        match = re.search(pattern, ai_response, re.IGNORECASE)
        if match:
            suggestions['absorption_rate'] = match.group(0)
            break

    # Price patterns
    price_patterns = [
        r'\$(\d{1,3}(?:,\d{3})*)\s*per\s*(lot|unit|acre|sf|sqft)',
        r'price\s*(?:at\s*)?\$(\d{1,3}(?:,\d{3})*)',
    ]

    for pattern in price_patterns:
        match = re.search(pattern, ai_response, re.IGNORECASE)
        if match:
            suggestions['pricing'] = match.group(0)
            break

    # Timeline patterns
    timeline_patterns = [
        r'(\d+(?:-\d+)?)\s*(months?|years?)\s*(?:to\s*)?(?:complete|finish|build)',
        r'timeline\s*(?:of\s*)?(\d+(?:-\d+)?)\s*(months?|years?)',
    ]

    for pattern in timeline_patterns:
        match = re.search(pattern, ai_response, re.IGNORECASE)
        if match:
            suggestions['timeline'] = match.group(0)
            break

    return {
        'suggested_values': suggestions,
        'has_suggestions': len(suggestions) > 0
    }


def save_chat_message(
    project_id: int,
    role: str,
    content: str,
    metadata: Dict = None,
    user_id: int = None
) -> Optional[str]:
    """
    Save a chat message to the database.

    Args:
        project_id: Project ID
        role: 'user' or 'assistant'
        content: Message content
        metadata: Optional metadata (suggestions, context, etc.)
        user_id: Optional user ID

    Returns:
        Message ID
    """
    import json

    message_id = f"msg_{uuid.uuid4().hex[:12]}"

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO landscape.landscaper_chat_message
            (message_id, project_id, role, content, metadata, timestamp, user_id)
            VALUES (%s, %s, %s, %s, %s, NOW(), %s)
            RETURNING message_id
        """, [
            message_id,
            project_id,
            role,
            content,
            json.dumps(metadata) if metadata else None,
            user_id
        ])

        row = cursor.fetchone()
        return row[0] if row else None


def _get_data_title(query_type: str) -> str:
    """Get human-readable title for structured data display."""
    titles = {
        'land_use_pricing': 'Land Use Pricing',
        'budget_total': 'Budget Summary',
        'budget_by_category': 'Budget by Category',
        'budget_by_activity': 'Budget by Activity',
        'parcel_count': 'Parcel Count',
        'parcel_summary': 'Parcel Summary',
        'parcel_by_type': 'Parcels by Type',
        'container_summary': 'Project Structure',
        'area_list': 'Project Areas',
        'phase_list': 'Project Phases',
        'project_details': 'Project Details',
    }
    return titles.get(query_type, 'Data')


def _get_column_definitions(query_type: str) -> List[Dict[str, Any]]:
    """Return column config for table rendering."""
    columns = {
        'land_use_pricing': [
            {'key': 'lu_type_code', 'label': 'Land Use', 'width': 100},
            {'key': 'product_code', 'label': 'Product', 'width': 120},
            {'key': 'price_per_unit', 'label': 'Price', 'width': 100, 'format': 'currency'},
            {'key': 'unit_of_measure', 'label': 'Unit', 'width': 80},
            {'key': 'growth_rate', 'label': 'Growth', 'width': 80, 'format': 'percent'},
        ],
        'budget_by_category': [
            {'key': 'category', 'label': 'Category', 'width': 200},
            {'key': 'total', 'label': 'Amount', 'width': 120, 'format': 'currency'},
            {'key': 'items', 'label': 'Items', 'width': 80, 'format': 'number'},
        ],
        'budget_by_activity': [
            {'key': 'activity', 'label': 'Activity', 'width': 150},
            {'key': 'total', 'label': 'Amount', 'width': 120, 'format': 'currency'},
            {'key': 'items', 'label': 'Items', 'width': 80, 'format': 'number'},
        ],
        'parcel_summary': [
            {'key': 'parcel_count', 'label': 'Parcels', 'width': 100, 'format': 'number'},
            {'key': 'total_units', 'label': 'Units', 'width': 100, 'format': 'number'},
            {'key': 'total_acres', 'label': 'Acres', 'width': 100, 'format': 'decimal'},
        ],
        'parcel_by_type': [
            {'key': 'type_code', 'label': 'Type', 'width': 120},
            {'key': 'count', 'label': 'Parcels', 'width': 80, 'format': 'number'},
            {'key': 'total_units', 'label': 'Units', 'width': 100, 'format': 'number'},
            {'key': 'total_acres', 'label': 'Acres', 'width': 100, 'format': 'decimal'},
        ],
        'container_summary': [
            {'key': 'level_name', 'label': 'Level', 'width': 150},
            {'key': 'count', 'label': 'Count', 'width': 100, 'format': 'number'},
        ],
        'area_list': [
            {'key': 'area_alias', 'label': 'Area', 'width': 150},
            {'key': 'phase_count', 'label': 'Phases', 'width': 80, 'format': 'number'},
            {'key': 'parcel_count', 'label': 'Parcels', 'width': 80, 'format': 'number'},
        ],
        'phase_list': [
            {'key': 'phase_name', 'label': 'Phase', 'width': 150},
            {'key': 'area_name', 'label': 'Area', 'width': 120},
            {'key': 'phase_status', 'label': 'Status', 'width': 100},
            {'key': 'parcel_count', 'label': 'Parcels', 'width': 80, 'format': 'number'},
        ],
    }
    return columns.get(query_type, [])
