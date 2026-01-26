"""
Embedding Service for Landscaper Chat Messages.

Provides:
- Embedding generation for chat messages using OpenAI
- Storage of embeddings for cross-thread RAG
- Vector similarity search for relevant past conversations
"""

import logging
from typing import Optional, List, Dict, Any
from uuid import UUID

from django.db import connection
from openai import OpenAI
from decouple import config

from ..models import ChatEmbedding, ThreadMessage, ChatThread

logger = logging.getLogger(__name__)

# OpenAI embedding model
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


def get_openai_client() -> OpenAI:
    """Get configured OpenAI client."""
    return OpenAI(api_key=config('OPENAI_API_KEY'))


class EmbeddingService:
    """Service for managing chat message embeddings."""

    @staticmethod
    def generate_embedding(text: str) -> Optional[List[float]]:
        """
        Generate an embedding vector for text using OpenAI.

        Args:
            text: Text to embed

        Returns:
            List of floats (1536 dimensions), or None on failure
        """
        try:
            client = get_openai_client()

            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text
            )

            embedding = response.data[0].embedding
            logger.debug(f"Generated embedding with {len(embedding)} dimensions")
            return embedding

        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    @staticmethod
    def embed_message(message: ThreadMessage) -> Optional[ChatEmbedding]:
        """
        Generate and store embedding for a chat message.

        Combines role + content for better retrieval context.

        Args:
            message: ThreadMessage instance to embed

        Returns:
            ChatEmbedding instance, or None on failure
        """
        try:
            # Combine role and content for richer embedding
            text = f"{message.role}: {message.content}"

            embedding = EmbeddingService.generate_embedding(text)
            if not embedding:
                return None

            # Get project_id from thread (denormalized for faster queries)
            thread = message.thread
            project_id = thread.project_id

            # Use raw SQL to insert with vector type
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO landscape.landscaper_chat_embedding
                    (id, message_id, thread_id, project_id, embedding, created_at)
                    VALUES (gen_random_uuid(), %s, %s, %s, %s::vector, NOW())
                    RETURNING id
                """, [str(message.id), str(thread.id), project_id, embedding])

                result = cursor.fetchone()
                embedding_id = result[0] if result else None

            if embedding_id:
                logger.info(f"Created embedding {embedding_id} for message {message.id}")
                # Return a ChatEmbedding instance (though the vector field isn't populated)
                return ChatEmbedding.objects.get(id=embedding_id)

            return None

        except Exception as e:
            logger.error(f"Failed to embed message {message.id}: {e}")
            return None

    @staticmethod
    def embed_message_async(message_id: UUID) -> None:
        """
        Embed a message asynchronously (for background processing).

        Args:
            message_id: Message UUID to embed
        """
        try:
            message = ThreadMessage.objects.select_related('thread').get(id=message_id)
            EmbeddingService.embed_message(message)
        except ThreadMessage.DoesNotExist:
            logger.warning(f"Message {message_id} not found for embedding")
        except Exception as e:
            logger.error(f"Error embedding message {message_id}: {e}")

    @staticmethod
    def search_similar_messages(
        query: str,
        project_id: int,
        limit: int = 5,
        similarity_threshold: float = 0.7,
        exclude_thread_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar past chat messages using vector similarity.

        Args:
            query: Search query text
            project_id: Project ID to search within
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score (0-1)
            exclude_thread_id: Optional thread ID to exclude from results

        Returns:
            List of dicts with message content, role, thread info, and score
        """
        try:
            # Generate embedding for query
            query_embedding = EmbeddingService.generate_embedding(query)
            if not query_embedding:
                return []

            # Build SQL with optional thread exclusion
            exclude_clause = ""
            params = [query_embedding, project_id, query_embedding, similarity_threshold, limit]

            if exclude_thread_id:
                exclude_clause = "AND e.thread_id != %s"
                params = [query_embedding, project_id, str(exclude_thread_id), query_embedding, similarity_threshold, limit]

            with connection.cursor() as cursor:
                sql = f"""
                    SELECT
                        m.content,
                        m.role,
                        m.created_at,
                        t.id as thread_id,
                        t.title as thread_title,
                        t.page_context,
                        1 - (e.embedding <=> %s::vector) as similarity
                    FROM landscape.landscaper_chat_embedding e
                    JOIN landscape.landscaper_thread_message m ON m.id = e.message_id
                    JOIN landscape.landscaper_chat_thread t ON t.id = e.thread_id
                    WHERE e.project_id = %s
                    {exclude_clause}
                    AND 1 - (e.embedding <=> %s::vector) >= %s
                    ORDER BY e.embedding <=> %s::vector
                    LIMIT %s
                """

                # Adjust params based on exclude_clause
                if exclude_thread_id:
                    cursor.execute(sql, [
                        query_embedding, project_id, str(exclude_thread_id),
                        query_embedding, similarity_threshold,
                        query_embedding, limit
                    ])
                else:
                    cursor.execute(sql.replace(exclude_clause, ""), [
                        query_embedding, project_id,
                        query_embedding, similarity_threshold,
                        query_embedding, limit
                    ])

                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]

            logger.debug(f"Found {len(results)} similar messages for query")
            return results

        except Exception as e:
            logger.error(f"Failed to search similar messages: {e}")
            return []

    @staticmethod
    def get_thread_context_for_rag(
        query: str,
        project_id: int,
        current_thread_id: Optional[UUID] = None,
        max_results: int = 5
    ) -> str:
        """
        Get formatted context from past conversations for RAG injection.

        Args:
            query: Current user query
            project_id: Project ID
            current_thread_id: Current thread to exclude from results
            max_results: Maximum number of past messages to include

        Returns:
            Formatted context string for system prompt injection
        """
        results = EmbeddingService.search_similar_messages(
            query=query,
            project_id=project_id,
            limit=max_results,
            similarity_threshold=0.65,
            exclude_thread_id=current_thread_id
        )

        if not results:
            return ""

        context_parts = [
            "\n<past_conversations>",
            "Relevant excerpts from previous conversations in this project:\n"
        ]

        for r in results:
            thread_title = r.get('thread_title') or r.get('page_context', 'Unknown')
            similarity = r.get('similarity', 0)
            context_parts.append(
                f"[{thread_title} - {r['page_context']} context, {similarity:.0%} relevant]"
            )
            context_parts.append(f"{r['role']}: {r['content'][:300]}")
            context_parts.append("")  # blank line

        context_parts.append("</past_conversations>")

        return "\n".join(context_parts)
