"""
Store and retrieve embeddings from PostgreSQL with pgvector.

Provides high-level functions for:
- Storing content with auto-generated embeddings
- Similarity search using cosine distance
"""
from typing import List, Optional, Dict, Any
from django.db import connection

from ..models import KnowledgeEmbedding
from .embedding_service import generate_embedding


def store_embedding(
    content_text: str,
    source_type: str,
    source_id: int,
    entity_ids: Optional[List[int]] = None,
    tags: Optional[List[str]] = None
) -> Optional[int]:
    """
    Generate and store embedding for content.

    Args:
        content_text: Text to embed
        source_type: Type of source ('document', 'fact', 'entity', 'interaction')
        source_id: ID of source record
        entity_ids: Related entity IDs for filtering
        tags: Tags for filtering

    Returns:
        embedding_id if successful, None otherwise
    """
    embedding_vector = generate_embedding(content_text)

    if embedding_vector is None:
        print(f"Failed to generate embedding for source {source_type}:{source_id}")
        return None

    try:
        record = KnowledgeEmbedding.objects.create(
            content_text=content_text,
            embedding=embedding_vector,
            source_type=source_type,
            source_id=source_id,
            entity_ids=entity_ids or [],
            tags=tags or []
        )
        return record.embedding_id
    except Exception as e:
        print(f"Error storing embedding: {e}")
        return None


def search_similar(
    query_text: str,
    limit: int = 10,
    source_type_filter: Optional[str] = None,
    similarity_threshold: float = 0.7
) -> List[Dict[str, Any]]:
    """
    Find similar content using vector similarity search.

    Uses pgvector's cosine distance operator (<=>).

    Args:
        query_text: Text to search for
        limit: Max results to return
        source_type_filter: Only search this source type (e.g., 'document')
        similarity_threshold: Minimum similarity score (0-1)

    Returns:
        List of dicts: {embedding_id, content_text, source_type, source_id,
                        entity_ids, tags, similarity}
    """
    query_embedding = generate_embedding(query_text)

    if query_embedding is None:
        return []

    # Convert to string format for SQL
    embedding_str = '[' + ','.join(str(x) for x in query_embedding) + ']'

    # Build the query with optional source_type filter
    where_clause = ""
    params = [embedding_str, embedding_str, similarity_threshold, embedding_str, limit]

    if source_type_filter:
        where_clause = "AND source_type = %s"
        params = [embedding_str, embedding_str, similarity_threshold, source_type_filter, embedding_str, limit]

    sql = f"""
        SELECT
            embedding_id,
            content_text,
            source_type,
            source_id,
            entity_ids,
            tags,
            1 - (embedding <=> %s::vector) as similarity
        FROM landscape.knowledge_embeddings
        WHERE embedding IS NOT NULL
          AND 1 - (embedding <=> %s::vector) >= %s
          {where_clause}
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)

            columns = ['embedding_id', 'content_text', 'source_type', 'source_id',
                       'entity_ids', 'tags', 'similarity']
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))

            return results
    except Exception as e:
        print(f"Similarity search error: {e}")
        return []


def search_similar_by_vector(
    embedding_vector: List[float],
    limit: int = 10,
    source_type_filter: Optional[str] = None,
    similarity_threshold: float = 0.7
) -> List[Dict[str, Any]]:
    """
    Find similar content using a pre-computed embedding vector.

    Useful when you already have an embedding and don't need to regenerate it.

    Args:
        embedding_vector: Pre-computed 1536-dimensional embedding
        limit: Max results to return
        source_type_filter: Only search this source type
        similarity_threshold: Minimum similarity score (0-1)

    Returns:
        List of similar content dicts
    """
    if not embedding_vector or len(embedding_vector) != 1536:
        return []

    embedding_str = '[' + ','.join(str(x) for x in embedding_vector) + ']'

    where_clause = ""
    params = [embedding_str, embedding_str, similarity_threshold, embedding_str, limit]

    if source_type_filter:
        where_clause = "AND source_type = %s"
        params = [embedding_str, embedding_str, similarity_threshold, source_type_filter, embedding_str, limit]

    sql = f"""
        SELECT
            embedding_id,
            content_text,
            source_type,
            source_id,
            entity_ids,
            tags,
            1 - (embedding <=> %s::vector) as similarity
        FROM landscape.knowledge_embeddings
        WHERE embedding IS NOT NULL
          AND 1 - (embedding <=> %s::vector) >= %s
          {where_clause}
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)

            columns = ['embedding_id', 'content_text', 'source_type', 'source_id',
                       'entity_ids', 'tags', 'similarity']
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))

            return results
    except Exception as e:
        print(f"Similarity search error: {e}")
        return []


def get_embedding_by_id(embedding_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieve a specific embedding record by ID.

    Args:
        embedding_id: The embedding_id to look up

    Returns:
        Dict with embedding data, or None if not found
    """
    try:
        record = KnowledgeEmbedding.objects.get(embedding_id=embedding_id)
        return {
            'embedding_id': record.embedding_id,
            'content_text': record.content_text,
            'source_type': record.source_type,
            'source_id': record.source_id,
            'entity_ids': record.entity_ids,
            'tags': record.tags,
            'embedding': record.embedding,
            'created_at': record.created_at
        }
    except KnowledgeEmbedding.DoesNotExist:
        return None


def delete_embedding(embedding_id: int) -> bool:
    """
    Delete an embedding record.

    Args:
        embedding_id: The embedding_id to delete

    Returns:
        True if deleted, False if not found
    """
    try:
        record = KnowledgeEmbedding.objects.get(embedding_id=embedding_id)
        record.delete()
        return True
    except KnowledgeEmbedding.DoesNotExist:
        return False


def count_embeddings(source_type: Optional[str] = None) -> int:
    """
    Count total embeddings, optionally filtered by source type.

    Args:
        source_type: Filter by this source type

    Returns:
        Count of embeddings
    """
    qs = KnowledgeEmbedding.objects.all()
    if source_type:
        qs = qs.filter(source_type=source_type)
    return qs.count()
