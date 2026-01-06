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
    query_embedding: List[float],
    project_id: int,
    top_k: int = 5,
    similarity_threshold: float = 0.7,
    source_types: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Search for similar embeddings, scoped to a specific project.

    Args:
        query_embedding: Vector to search for
        project_id: Project to scope search to (REQUIRED)
        top_k: Number of results to return
        similarity_threshold: Minimum similarity score
        source_types: Optional list of source types to include.
            If None, defaults to ['document'].
            Use ['document', 'market_data', 'user_note'] to include others.

    Returns:
        List of matching chunks with similarity scores
    """
    if not query_embedding:
        return []

    if source_types is None:
        source_types = ['document']

    results = []

    with connection.cursor() as cursor:
        if 'document' in source_types:
            cursor.execute("""
                SELECT
                    ke.embedding_id,
                    ke.content_text,
                    ke.source_id,
                    ke.source_type,
                    d.doc_name,
                    1 - (ke.embedding <=> %s::vector) as similarity
                FROM landscape.knowledge_embeddings ke
                JOIN landscape.core_doc d ON ke.source_id = d.doc_id
                WHERE d.project_id = %s
                  AND ke.source_type = 'document_chunk'
                  AND 1 - (ke.embedding <=> %s::vector) >= %s
                ORDER BY ke.embedding <=> %s::vector
                LIMIT %s
            """, [
                query_embedding,
                project_id,
                query_embedding,
                similarity_threshold,
                query_embedding,
                top_k
            ])

            for row in cursor.fetchall():
                results.append({
                    'id': row[0],
                    'content': row[1],
                    'metadata': {},  # No metadata column in actual schema
                    'source_doc_id': row[2],
                    'source_type': row[3],
                    'filename': row[4],
                    'similarity': float(row[5])
                })

        non_doc_types = [t for t in source_types if t != 'document']
        if non_doc_types:
            cursor.execute("""
                SELECT
                    ke.id,
                    ke.content,
                    ke.metadata,
                    ke.source_doc_id,
                    ke.source_type,
                    NULL as filename,
                    1 - (ke.embedding <=> %s::vector) as similarity
                FROM landscape.knowledge_embeddings ke
                WHERE ke.source_type = ANY(%s)
                  AND (
                      %s::text = ANY(ke.entity_ids)
                      OR ('project:' || %s::text) = ANY(ke.entity_ids)
                      OR ke.metadata->>'project_id' = %s::text
                  )
                  AND 1 - (ke.embedding <=> %s::vector) >= %s
                ORDER BY ke.embedding <=> %s::vector
                LIMIT %s
            """, [
                query_embedding,
                non_doc_types,
                str(project_id),
                str(project_id),
                str(project_id),
                query_embedding,
                similarity_threshold,
                query_embedding,
                top_k
            ])

            for row in cursor.fetchall():
                results.append({
                    'id': row[0],
                    'content': row[1],
                    'metadata': row[2] or {},
                    'source_doc_id': row[3],
                    'source_type': row[4],
                    'filename': row[5],
                    'similarity': float(row[6])
                })

    results.sort(key=lambda x: x['similarity'], reverse=True)
    return results[:top_k]


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
