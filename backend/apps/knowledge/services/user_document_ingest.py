"""
User Document Ingestion Service

Chunks and embeds user-uploaded documents for semantic search.

This service is triggered when:
1. A document is uploaded to the DMS
2. Document extraction completes
3. Manual re-indexing is requested

Documents are chunked, embedded, and stored in tbl_user_document_chunks
for retrieval by UserKnowledgeRetriever.
"""

import logging
import re
from typing import Optional, List, Dict, Any

from django.db import connection

from .embedding_service import generate_embedding, generate_embeddings_batch

logger = logging.getLogger(__name__)

# Default chunking parameters
DEFAULT_CHUNK_SIZE = 400  # words per chunk
DEFAULT_CHUNK_OVERLAP = 50  # words overlap between chunks


def ingest_document(
    document_id: int,
    user_id: int,
    document_name: str,
    content: str,
    document_type: Optional[str] = None,
    project_id: Optional[int] = None,
    organization_id: Optional[int] = None,
    property_type: Optional[str] = None,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> Dict[str, Any]:
    """
    Ingest a document by chunking, embedding, and storing in the database.

    Args:
        document_id: ID from core_doc table
        user_id: Owner user ID
        document_name: Display name of document
        content: Full text content of document
        document_type: Type hint (rent_roll, t12, om, appraisal, etc.)
        project_id: Associated project ID
        organization_id: Associated org ID
        property_type: Property type hint for better retrieval
        chunk_size: Target words per chunk
        chunk_overlap: Overlap words between chunks

    Returns:
        Dict with ingestion results:
        - success: bool
        - chunks_created: int
        - error: str (if failed)
    """
    if not content or not content.strip():
        return {
            'success': False,
            'chunks_created': 0,
            'error': 'Empty document content'
        }

    try:
        # Clear any existing chunks for this document
        _clear_existing_chunks(document_id)

        # Chunk the content
        chunks = _chunk_text(content, chunk_size, chunk_overlap)
        logger.info(f"Created {len(chunks)} chunks for document {document_id}")

        if not chunks:
            return {
                'success': False,
                'chunks_created': 0,
                'error': 'No content chunks created'
            }

        # Generate embeddings in batch
        embeddings = generate_embeddings_batch([c['content'] for c in chunks])

        # Store chunks with embeddings
        chunks_created = 0
        for i, chunk in enumerate(chunks):
            embedding = embeddings[i] if i < len(embeddings) else None
            success = _store_chunk(
                document_id=document_id,
                user_id=user_id,
                document_name=document_name,
                document_type=document_type,
                project_id=project_id,
                organization_id=organization_id,
                property_type=property_type,
                chunk_index=i,
                content=chunk['content'],
                content_type=chunk.get('content_type', 'text'),
                page_number=chunk.get('page_number'),
                section_path=chunk.get('section_path'),
                token_count=chunk.get('token_count'),
                entities=chunk.get('entities', {}),
                embedding=embedding,
            )
            if success:
                chunks_created += 1

        logger.info(
            f"Document ingestion complete: {document_name} ({document_id}) - "
            f"{chunks_created} chunks stored"
        )

        return {
            'success': True,
            'chunks_created': chunks_created,
        }

    except Exception as e:
        logger.error(f"Document ingestion failed for {document_id}: {e}")
        return {
            'success': False,
            'chunks_created': 0,
            'error': str(e)
        }


def ingest_from_extraction(
    document_id: int,
    user_id: int,
    document_name: str,
    extracted_text: str,
    extracted_data: Optional[Dict[str, Any]] = None,
    document_type: Optional[str] = None,
    project_id: Optional[int] = None,
    organization_id: Optional[int] = None,
    property_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Ingest a document from DMS extraction results.

    This is called after document extraction completes.
    Uses both the raw text and structured data for better chunking.

    Args:
        document_id: ID from core_doc table
        user_id: Owner user ID
        document_name: Display name of document
        extracted_text: Raw text from extraction
        extracted_data: Structured data from extraction (optional)
        document_type: Detected document type
        project_id: Associated project ID
        organization_id: Associated org ID
        property_type: Detected property type

    Returns:
        Dict with ingestion results
    """
    # Combine extracted text with key data points
    content = extracted_text or ""

    # If we have structured data, append key summary
    if extracted_data:
        summary_parts = []

        # Rent roll summary
        if 'units' in extracted_data:
            units = extracted_data['units']
            if isinstance(units, list):
                summary_parts.append(f"Total units: {len(units)}")
                rents = [u.get('rent') for u in units if u.get('rent')]
                if rents:
                    avg_rent = sum(rents) / len(rents)
                    summary_parts.append(f"Average rent: ${avg_rent:,.0f}")

        # T-12 summary
        if 'income' in extracted_data or 'expenses' in extracted_data:
            income = extracted_data.get('income', {})
            expenses = extracted_data.get('expenses', {})
            if income.get('total'):
                summary_parts.append(f"Total income: ${income['total']:,.0f}")
            if expenses.get('total'):
                summary_parts.append(f"Total expenses: ${expenses['total']:,.0f}")

        # Property info
        if 'property' in extracted_data:
            prop = extracted_data['property']
            if prop.get('name'):
                summary_parts.append(f"Property: {prop['name']}")
            if prop.get('address'):
                summary_parts.append(f"Address: {prop['address']}")

        if summary_parts:
            content += "\n\n--- Extracted Summary ---\n" + "\n".join(summary_parts)

    return ingest_document(
        document_id=document_id,
        user_id=user_id,
        document_name=document_name,
        content=content,
        document_type=document_type,
        project_id=project_id,
        organization_id=organization_id,
        property_type=property_type,
    )


def _clear_existing_chunks(document_id: int) -> int:
    """Delete existing chunks for a document. Returns count deleted."""
    sql = """
        DELETE FROM landscape.tbl_user_document_chunks
        WHERE document_id = %s
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, [document_id])
            return cursor.rowcount
    except Exception as e:
        logger.warning(f"Failed to clear existing chunks: {e}")
        return 0


def _chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks.

    Returns list of chunk dicts with:
    - content: chunk text
    - content_type: 'text', 'table', 'list'
    - token_count: estimated tokens
    - page_number: extracted if present
    - section_path: extracted if present
    """
    # Clean up text
    text = text.replace('\x00', '').strip()

    # Try to detect page breaks and sections
    chunks = []
    current_page = None
    current_section = None

    # Split by page markers if present
    pages = _split_by_pages(text)

    for page_num, page_text in pages:
        if page_num:
            current_page = page_num

        # Split page into sections
        sections = _split_by_sections(page_text)

        for section_path, section_text in sections:
            if section_path:
                current_section = section_path

            # Chunk the section
            section_chunks = _chunk_section(section_text, chunk_size, overlap)

            for chunk_text, content_type in section_chunks:
                if chunk_text.strip():
                    token_count = len(chunk_text.split())
                    chunks.append({
                        'content': chunk_text,
                        'content_type': content_type,
                        'token_count': token_count,
                        'page_number': current_page,
                        'section_path': current_section,
                        'entities': _extract_entities(chunk_text),
                    })

    return chunks


def _split_by_pages(text: str) -> List[tuple]:
    """
    Split text by page markers.

    Returns list of (page_number, text) tuples.
    """
    # Common page patterns
    page_patterns = [
        r'\n---\s*Page\s+(\d+)\s*---\n',
        r'\[Page\s+(\d+)\]',
        r'\n\f',  # Form feed character
    ]

    # Try to find page breaks
    for pattern in page_patterns:
        matches = list(re.finditer(pattern, text, re.IGNORECASE))
        if matches:
            pages = []
            last_end = 0

            for match in matches:
                # Text before this page marker
                if last_end < match.start():
                    prev_page = pages[-1][0] if pages else None
                    pages.append((prev_page, text[last_end:match.start()]))

                # Get page number if captured
                try:
                    page_num = int(match.group(1))
                except (IndexError, ValueError):
                    page_num = len(pages) + 1

                last_end = match.end()

            # Remaining text
            if last_end < len(text):
                pages.append((page_num if matches else None, text[last_end:]))

            return pages

    # No page markers found
    return [(None, text)]


def _split_by_sections(text: str) -> List[tuple]:
    """
    Split text by section headers.

    Returns list of (section_path, text) tuples.
    """
    # Common section header patterns
    header_pattern = r'^(?:#{1,3}\s+|\d+\.\s+|[A-Z][A-Z\s]+:)(.+)$'

    lines = text.split('\n')
    sections = []
    current_section = None
    current_text = []

    for line in lines:
        header_match = re.match(header_pattern, line.strip())
        if header_match and len(line.strip()) < 100:
            # Save previous section
            if current_text:
                sections.append((current_section, '\n'.join(current_text)))

            current_section = line.strip()[:100]
            current_text = [line]
        else:
            current_text.append(line)

    # Save final section
    if current_text:
        sections.append((current_section, '\n'.join(current_text)))

    return sections if sections else [(None, text)]


def _chunk_section(
    text: str,
    chunk_size: int,
    overlap: int
) -> List[tuple]:
    """
    Chunk a section of text.

    Returns list of (chunk_text, content_type) tuples.
    """
    chunks = []

    # Detect if this is tabular data
    if _is_table(text):
        # Keep tables together, don't split
        chunks.append((text, 'table'))
        return chunks

    # Detect if this is a list
    if _is_list(text):
        chunks.append((text, 'list'))
        return chunks

    # Standard word-based chunking for prose
    words = text.split()

    if len(words) <= chunk_size:
        return [(text, 'text')]

    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunk_text = ' '.join(chunk_words)
        chunks.append((chunk_text, 'text'))
        i += chunk_size - overlap

    return chunks


def _is_table(text: str) -> bool:
    """Check if text appears to be tabular data."""
    lines = text.strip().split('\n')
    if len(lines) < 3:
        return False

    # Check for consistent delimiter patterns
    tab_count = sum(1 for line in lines if '\t' in line)
    pipe_count = sum(1 for line in lines if '|' in line)

    return tab_count > len(lines) * 0.5 or pipe_count > len(lines) * 0.5


def _is_list(text: str) -> bool:
    """Check if text is a list."""
    lines = text.strip().split('\n')
    if len(lines) < 3:
        return False

    list_markers = sum(
        1 for line in lines
        if re.match(r'^\s*[-•*]\s+', line) or re.match(r'^\s*\d+\.\s+', line)
    )
    return list_markers > len(lines) * 0.5


def _extract_entities(text: str) -> Dict[str, Any]:
    """Extract named entities from text for filtering."""
    entities = {}

    # Extract dollar amounts
    amounts = re.findall(r'\$[\d,]+(?:\.\d{2})?', text)
    if amounts:
        entities['amounts'] = amounts[:5]  # Keep top 5

    # Extract percentages
    percentages = re.findall(r'\d+\.?\d*\s*%', text)
    if percentages:
        entities['percentages'] = percentages[:5]

    # Extract dates
    dates = re.findall(r'\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}', text)
    if dates:
        entities['dates'] = dates[:5]

    # Extract addresses (simple pattern)
    addresses = re.findall(r'\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)', text)
    if addresses:
        entities['addresses'] = addresses[:3]

    return entities


def _store_chunk(
    document_id: int,
    user_id: int,
    document_name: str,
    document_type: Optional[str],
    project_id: Optional[int],
    organization_id: Optional[int],
    property_type: Optional[str],
    chunk_index: int,
    content: str,
    content_type: str,
    page_number: Optional[int],
    section_path: Optional[str],
    token_count: Optional[int],
    entities: Dict[str, Any],
    embedding: Optional[List[float]],
) -> bool:
    """Store a chunk in the database."""
    embedding_str = None
    if embedding:
        embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'

    sql = """
        INSERT INTO landscape.tbl_user_document_chunks (
            document_id, user_id, document_name, document_type,
            project_id, organization_id, property_type,
            chunk_index, content, content_type,
            page_number, section_path, token_count,
            entities_json, embedding
        ) VALUES (
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, %s::vector
        )
        ON CONFLICT (document_id, chunk_index) DO UPDATE SET
            content = EXCLUDED.content,
            content_type = EXCLUDED.content_type,
            page_number = EXCLUDED.page_number,
            section_path = EXCLUDED.section_path,
            token_count = EXCLUDED.token_count,
            entities_json = EXCLUDED.entities_json,
            embedding = EXCLUDED.embedding
    """

    params = [
        document_id, user_id, document_name, document_type,
        project_id, organization_id, property_type,
        chunk_index, content, content_type,
        page_number, section_path, token_count,
        entities, embedding_str
    ]

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            return True
    except Exception as e:
        logger.error(f"Failed to store chunk {chunk_index} for doc {document_id}: {e}")
        return False


def get_document_stats(user_id: int, organization_id: Optional[int] = None) -> Dict[str, Any]:
    """Get statistics about indexed documents."""
    user_filter = f"user_id = {user_id}"
    if organization_id:
        user_filter = f"(user_id = {user_id} OR organization_id = {organization_id})"

    sql = f"""
        SELECT
            COUNT(DISTINCT document_id) as document_count,
            COUNT(*) as chunk_count,
            SUM(token_count) as total_tokens,
            COUNT(DISTINCT document_type) as type_count
        FROM landscape.tbl_user_document_chunks
        WHERE {user_filter}
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql)
            row = cursor.fetchone()

        return {
            'document_count': row[0] or 0,
            'chunk_count': row[1] or 0,
            'total_tokens': row[2] or 0,
            'document_types': row[3] or 0,
        }
    except Exception as e:
        logger.error(f"Failed to get document stats: {e}")
        return {
            'document_count': 0,
            'chunk_count': 0,
            'total_tokens': 0,
            'document_types': 0,
        }
