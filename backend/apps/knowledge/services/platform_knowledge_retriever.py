"""
Platform Knowledge Retriever - INTERNAL SERVICE ONLY

This service is called by Landscaper's context builder.
It has NO REST API endpoints and NO user-facing access.

Provides semantic search over foundational reference documents
(e.g., The Appraisal of Real Estate) to inform AI responses.
"""

import logging
import re
from typing import Optional, List, Dict, Any, Tuple

from django.db import connection

from .embedding_service import generate_embedding

logger = logging.getLogger(__name__)


# Known document sources and their aliases
SOURCE_PATTERNS = {
    'irem': ['irem', 'income expense', 'income/expense', 'i/e iq'],
    'appraisal': ['appraisal of real estate', 'appraisal institute', 'the appraisal'],
    'uspap': ['uspap', 'uniform standards'],
    'boma': ['boma'],
    'naa': ['naa', 'national apartment'],
}


def detect_document_reference(query: str) -> Tuple[Optional[str], Optional[int], List[str]]:
    """
    Parse user query for explicit document references.

    Returns:
        - source_hint: Detected source name (e.g., "irem", "appraisal")
        - year_hint: Detected year (e.g., 2023)
        - keywords: Document title keywords found

    Examples:
        "what does the 2023 IREM summary say about expenses"
        → source_hint="irem", year_hint=2023, keywords=["irem", "summary"]

        "explain cap rate calculation"
        → source_hint=None, year_hint=None, keywords=[]
    """
    query_lower = query.lower()

    # Detect source
    source_hint = None
    keywords = []
    for source, patterns in SOURCE_PATTERNS.items():
        for pattern in patterns:
            if pattern in query_lower:
                source_hint = source
                keywords.append(pattern)
                break
        if source_hint:
            break

    # Detect year (4-digit number between 2000-2030)
    year_match = re.search(r'\b(20[0-2][0-9])\b', query)
    year_hint = int(year_match.group(1)) if year_match else None

    # Detect document type keywords
    doc_type_keywords = ['summary', 'report', 'manual', 'guide', 'edition']
    for kw in doc_type_keywords:
        if kw in query_lower and kw not in keywords:
            keywords.append(kw)

    return source_hint, year_hint, keywords


class PlatformKnowledgeRetriever:
    """
    Landscaper's interface to foundational knowledge.

    INTERNAL USE ONLY - Never expose via API endpoints.

    Usage (internal only):
        retriever = PlatformKnowledgeRetriever()
        chunks = retriever.retrieve(
            query="How do you value a hotel property?",
            property_type="hotel",
            max_chunks=10
        )
    """

    def __init__(self, embedding_model: str = "text-embedding-ada-002"):
        self.embedding_model = embedding_model

    def retrieve(
        self,
        query: str,
        property_type: Optional[str] = None,
        knowledge_domain: Optional[str] = None,
        applies_to: Optional[str] = None,
        max_chunks: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant chunks from platform knowledge.

        Now includes document-aware filtering: if user references a specific
        document (e.g., "IREM 2023"), chunks from that document are prioritized.

        Args:
            query: Natural language query
            property_type: Filter by property type (e.g., 'hotel', 'multifamily')
            knowledge_domain: Filter by domain (e.g., 'valuation', 'cost')
            applies_to: Filter by task type (e.g., 'extraction', 'validation')
            max_chunks: Maximum chunks to return
            similarity_threshold: Minimum cosine similarity (0-1)

        Returns:
            List of chunk dictionaries with content and metadata
        """
        # Step 1: Detect document reference in query
        source_hint, year_hint, keywords = detect_document_reference(query)
        doc_filter_applied = source_hint is not None or year_hint is not None

        if doc_filter_applied:
            logger.info(f"[RETRIEVAL] Document reference detected: source={source_hint}, year={year_hint}, keywords={keywords}")
        else:
            logger.info(f"[RETRIEVAL] No document reference detected, searching full corpus")

        # Generate query embedding
        query_embedding = generate_embedding(query)
        if not query_embedding:
            logger.warning("Failed to generate embedding for query")
            return []

        # Convert embedding to pgvector string format: '[0.1,0.2,...]'
        embedding_str = '[' + ','.join(str(x) for x in query_embedding) + ']'

        # Build SQL query with filters
        # pgvector uses <=> for cosine distance (1 - similarity)
        # So we filter where distance < (1 - threshold)
        max_distance = 1 - similarity_threshold

        # Build filter conditions - these go in the WHERE clause
        filters = ["pk.is_active = TRUE", "c.embedding IS NOT NULL"]
        filter_params: List[Any] = []

        # Step 2: Add document-specific filters if reference detected
        # Note: %% is used in LIKE patterns because cursor.execute() uses % for parameter substitution
        if source_hint:
            # Map source hint to SQL filter on publisher or title
            source_filter_map = {
                'irem': "(LOWER(pk.publisher) LIKE '%%irem%%' OR LOWER(pk.title) LIKE '%%irem%%')",
                'appraisal': "(LOWER(pk.publisher) LIKE '%%appraisal%%' OR LOWER(pk.title) LIKE '%%appraisal%%')",
                'uspap': "(LOWER(pk.publisher) LIKE '%%uspap%%' OR LOWER(pk.title) LIKE '%%uspap%%')",
                'boma': "(LOWER(pk.publisher) LIKE '%%boma%%' OR LOWER(pk.title) LIKE '%%boma%%')",
                'naa': "(LOWER(pk.publisher) LIKE '%%naa%%' OR LOWER(pk.title) LIKE '%%naa%%' OR LOWER(pk.title) LIKE '%%national apartment%%')",
            }
            if source_hint in source_filter_map:
                filters.append(source_filter_map[source_hint])

        if year_hint:
            # Filter by publication year or year in title
            filters.append(f"(pk.publication_year = {year_hint} OR pk.title LIKE '%%{year_hint}%%')")

        if property_type:
            filters.append("""
                (
                    ch.property_types @> %s::jsonb
                    OR pk.property_types @> %s::jsonb
                )
            """)
            prop_json = f'["{property_type}"]'
            filter_params.extend([prop_json, prop_json])

        if knowledge_domain:
            filters.append("pk.knowledge_domain = %s")
            filter_params.append(knowledge_domain)

        if applies_to:
            filters.append("ch.applies_to @> %s::jsonb")
            filter_params.append(f'["{applies_to}"]')

        where_clause = " AND ".join(filters)

        sql = f"""
            SELECT
                c.id AS chunk_id,
                c.content,
                c.content_type,
                c.page_number,
                c.section_path,
                c.token_count,
                pk.document_key,
                pk.title AS document_title,
                pk.edition,
                pk.publisher,
                pk.publication_year,
                ch.chapter_number,
                ch.chapter_title,
                ch.topics,
                ch.property_types AS chapter_property_types,
                ch.applies_to,
                (c.embedding <=> %s::vector) AS distance
            FROM landscape.tbl_platform_knowledge_chunks c
            JOIN landscape.tbl_platform_knowledge pk ON c.document_id = pk.id
            LEFT JOIN landscape.tbl_platform_knowledge_chapters ch ON c.chapter_id = ch.id
            WHERE {where_clause}
                AND (c.embedding <=> %s::vector) < %s
            ORDER BY distance ASC
            LIMIT %s
        """

        # Build params in order:
        # 1. embedding (SELECT)
        # 2. filter params (WHERE filters)
        # 3. embedding (WHERE distance)
        # 4. max_distance (WHERE distance threshold)
        # 5. max_chunks (LIMIT)
        full_params = [embedding_str] + filter_params + [embedding_str, max_distance, max_chunks]

        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, full_params)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()

            results = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                similarity = 1 - row_dict['distance']

                results.append({
                    'content': row_dict['content'],
                    'content_type': row_dict['content_type'],
                    'similarity': round(similarity, 4),
                    'source': {
                        'document_key': row_dict['document_key'],
                        'document_title': row_dict['document_title'],
                        'edition': row_dict['edition'],
                        'publisher': row_dict['publisher'],
                        'publication_year': row_dict['publication_year'],
                        'chapter_number': row_dict['chapter_number'],
                        'chapter_title': row_dict['chapter_title'],
                        'page': row_dict['page_number'],
                        'section_path': row_dict['section_path']
                    },
                    'metadata': {
                        'topics': row_dict['topics'] or [],
                        'property_types': row_dict['chapter_property_types'] or [],
                        'applies_to': row_dict['applies_to'] or [],
                        'token_count': row_dict['token_count'],
                        'filtered_by_document': doc_filter_applied
                    }
                })

            if doc_filter_applied:
                logger.info(f"[RETRIEVAL] Document-filtered search: {len(results)} chunks (source={source_hint}, year={year_hint})")
            else:
                logger.info(f"[RETRIEVAL] Full corpus search: {len(results)} chunks for query '{query[:50]}...'")

            # Step 3: If document filter returned no results, fall back to full corpus
            if doc_filter_applied and len(results) == 0:
                logger.info("[RETRIEVAL] Document filter returned no results, falling back to full corpus search")
                # Recursive call without document filtering
                return self._retrieve_full_corpus(
                    query_embedding, embedding_str, max_distance, max_chunks,
                    property_type, knowledge_domain, applies_to, filter_params
                )

            return results

        except Exception as e:
            logger.error(f"Platform knowledge retrieval failed: {e}")
            return []

    def _retrieve_full_corpus(
        self,
        query_embedding: List[float],
        embedding_str: str,
        max_distance: float,
        max_chunks: int,
        property_type: Optional[str],
        knowledge_domain: Optional[str],
        applies_to: Optional[str],
        base_filter_params: List[Any]
    ) -> List[Dict[str, Any]]:
        """Fallback to full corpus search without document filtering."""
        filters = ["pk.is_active = TRUE", "c.embedding IS NOT NULL"]
        filter_params: List[Any] = []

        if property_type:
            filters.append("""
                (
                    ch.property_types @> %s::jsonb
                    OR pk.property_types @> %s::jsonb
                )
            """)
            prop_json = f'["{property_type}"]'
            filter_params.extend([prop_json, prop_json])

        if knowledge_domain:
            filters.append("pk.knowledge_domain = %s")
            filter_params.append(knowledge_domain)

        if applies_to:
            filters.append("ch.applies_to @> %s::jsonb")
            filter_params.append(f'["{applies_to}"]')

        where_clause = " AND ".join(filters)

        sql = f"""
            SELECT
                c.id AS chunk_id,
                c.content,
                c.content_type,
                c.page_number,
                c.section_path,
                c.token_count,
                pk.document_key,
                pk.title AS document_title,
                pk.edition,
                pk.publisher,
                pk.publication_year,
                ch.chapter_number,
                ch.chapter_title,
                ch.topics,
                ch.property_types AS chapter_property_types,
                ch.applies_to,
                (c.embedding <=> %s::vector) AS distance
            FROM landscape.tbl_platform_knowledge_chunks c
            JOIN landscape.tbl_platform_knowledge pk ON c.document_id = pk.id
            LEFT JOIN landscape.tbl_platform_knowledge_chapters ch ON c.chapter_id = ch.id
            WHERE {where_clause}
                AND (c.embedding <=> %s::vector) < %s
            ORDER BY distance ASC
            LIMIT %s
        """

        full_params = [embedding_str] + filter_params + [embedding_str, max_distance, max_chunks]

        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, full_params)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()

            results = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                similarity = 1 - row_dict['distance']

                results.append({
                    'content': row_dict['content'],
                    'content_type': row_dict['content_type'],
                    'similarity': round(similarity, 4),
                    'source': {
                        'document_key': row_dict['document_key'],
                        'document_title': row_dict['document_title'],
                        'edition': row_dict['edition'],
                        'publisher': row_dict['publisher'],
                        'publication_year': row_dict['publication_year'],
                        'chapter_number': row_dict['chapter_number'],
                        'chapter_title': row_dict['chapter_title'],
                        'page': row_dict['page_number'],
                        'section_path': row_dict['section_path']
                    },
                    'metadata': {
                        'topics': row_dict['topics'] or [],
                        'property_types': row_dict['chapter_property_types'] or [],
                        'applies_to': row_dict['applies_to'] or [],
                        'token_count': row_dict['token_count'],
                        'filtered_by_document': False
                    }
                })

            logger.info(f"[RETRIEVAL] Fallback full corpus search: {len(results)} chunks")
            return results

        except Exception as e:
            logger.error(f"Platform knowledge fallback retrieval failed: {e}")
            return []

    def get_chapter_context(
        self,
        document_key: str,
        chapter_number: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get full chapter summary and key concepts.
        Used when Landscaper needs broad context vs. specific chunks.
        """
        sql = """
            SELECT
                pk.title AS document_title,
                ch.chapter_number,
                ch.chapter_title,
                ch.summary,
                ch.key_concepts,
                ch.topics,
                ch.property_types,
                ch.applies_to,
                ch.page_start,
                ch.page_end
            FROM landscape.tbl_platform_knowledge_chapters ch
            JOIN landscape.tbl_platform_knowledge pk ON ch.document_id = pk.id
            WHERE pk.document_key = %s AND ch.chapter_number = %s
        """

        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, [document_key, chapter_number])
                row = cursor.fetchone()

            if not row:
                return None

            columns = [col[0] for col in cursor.description]
            row_dict = dict(zip(columns, row))

            return {
                'document_title': row_dict['document_title'],
                'chapter_number': row_dict['chapter_number'],
                'chapter_title': row_dict['chapter_title'],
                'summary': row_dict['summary'],
                'key_concepts': row_dict['key_concepts'] or {},
                'topics': row_dict['topics'] or [],
                'property_types': row_dict['property_types'] or [],
                'applies_to': row_dict['applies_to'] or [],
                'page_range': f"{row_dict['page_start']}-{row_dict['page_end']}"
            }

        except Exception as e:
            logger.error(f"Failed to get chapter context: {e}")
            return None

    def list_chapters(
        self,
        document_key: str,
        property_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List all chapters in a document, optionally filtered by property type.
        """
        sql = """
            SELECT
                ch.chapter_number,
                ch.chapter_title,
                ch.topics,
                ch.property_types,
                ch.page_start,
                ch.page_end
            FROM landscape.tbl_platform_knowledge_chapters ch
            JOIN landscape.tbl_platform_knowledge pk ON ch.document_id = pk.id
            WHERE pk.document_key = %s
        """
        params: List[Any] = [document_key]

        if property_type:
            sql += " AND ch.property_types @> %s::jsonb"
            params.append(f'["{property_type}"]')

        sql += " ORDER BY ch.chapter_number"

        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()

            return [
                {
                    'chapter_number': row[0],
                    'chapter_title': row[1],
                    'topics': row[2] or [],
                    'property_types': row[3] or [],
                    'page_range': f"{row[4]}-{row[5]}"
                }
                for row in rows
            ]

        except Exception as e:
            logger.error(f"Failed to list chapters: {e}")
            return []

    def retrieve_for_document(
        self,
        query: str,
        document_key: str,
        max_chunks: int = 10,
        similarity_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Retrieve chunks from a specific platform knowledge document.

        This is used for document-scoped chat where the user wants to
        ask questions about a specific document.

        Args:
            query: Natural language query
            document_key: The document_key to scope the search to
            max_chunks: Maximum chunks to return
            similarity_threshold: Minimum cosine similarity (0-1)

        Returns:
            List of chunk dictionaries with content and metadata
        """
        # Generate query embedding
        query_embedding = generate_embedding(query)
        if not query_embedding:
            logger.warning("Failed to generate embedding for query")
            return []

        embedding_str = '[' + ','.join(str(x) for x in query_embedding) + ']'
        max_distance = 1 - similarity_threshold

        sql = """
            SELECT
                c.id AS chunk_id,
                c.content,
                c.content_type,
                c.page_number,
                c.section_path,
                c.token_count,
                pk.document_key,
                pk.title AS document_title,
                pk.edition,
                pk.publisher,
                pk.publication_year,
                ch.chapter_number,
                ch.chapter_title,
                ch.topics,
                ch.property_types AS chapter_property_types,
                (c.embedding <=> %s::vector) AS distance
            FROM landscape.tbl_platform_knowledge_chunks c
            JOIN landscape.tbl_platform_knowledge pk ON c.document_id = pk.id
            LEFT JOIN landscape.tbl_platform_knowledge_chapters ch ON c.chapter_id = ch.id
            WHERE pk.document_key = %s
                AND pk.is_active = TRUE
                AND c.embedding IS NOT NULL
                AND (c.embedding <=> %s::vector) < %s
            ORDER BY distance ASC
            LIMIT %s
        """

        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, [embedding_str, document_key, embedding_str, max_distance, max_chunks])
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()

            results = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                similarity = 1 - row_dict['distance']

                results.append({
                    'content': row_dict['content'],
                    'content_type': row_dict['content_type'],
                    'similarity': round(similarity, 4),
                    'source': {
                        'document_key': row_dict['document_key'],
                        'document_title': row_dict['document_title'],
                        'edition': row_dict['edition'],
                        'publisher': row_dict['publisher'],
                        'publication_year': row_dict['publication_year'],
                        'chapter_number': row_dict['chapter_number'],
                        'chapter_title': row_dict['chapter_title'],
                        'page': row_dict['page_number'],
                        'section_path': row_dict['section_path']
                    },
                    'metadata': {
                        'topics': row_dict['topics'] or [],
                        'property_types': row_dict['chapter_property_types'] or [],
                        'token_count': row_dict['token_count']
                    }
                })

            logger.info(f"[RETRIEVAL] Document-scoped search for '{document_key}': {len(results)} chunks")
            return results

        except Exception as e:
            logger.error(f"Document-scoped retrieval failed: {e}")
            return []

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about platform knowledge corpus."""
        sql = """
            SELECT
                COUNT(DISTINCT pk.id) AS document_count,
                COUNT(DISTINCT ch.id) AS chapter_count,
                COUNT(c.id) AS chunk_count,
                SUM(c.token_count) AS total_tokens
            FROM landscape.tbl_platform_knowledge pk
            LEFT JOIN landscape.tbl_platform_knowledge_chapters ch ON ch.document_id = pk.id
            LEFT JOIN landscape.tbl_platform_knowledge_chunks c ON c.document_id = pk.id
            WHERE pk.is_active = TRUE
        """

        try:
            with connection.cursor() as cursor:
                cursor.execute(sql)
                row = cursor.fetchone()

            return {
                'document_count': row[0] or 0,
                'chapter_count': row[1] or 0,
                'chunk_count': row[2] or 0,
                'total_tokens': row[3] or 0
            }

        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
            return {
                'document_count': 0,
                'chapter_count': 0,
                'chunk_count': 0,
                'total_tokens': 0
            }


# Singleton instance for import convenience
_retriever: Optional[PlatformKnowledgeRetriever] = None


def get_platform_knowledge_retriever() -> PlatformKnowledgeRetriever:
    """Get singleton retriever instance."""
    global _retriever
    if _retriever is None:
        _retriever = PlatformKnowledgeRetriever()
    return _retriever
