"""
Embedding generation service using OpenAI ada-002.

Generates 1536-dimensional embeddings for semantic search.
"""
import os
from typing import List, Optional
from openai import OpenAI
from django.conf import settings

# Initialize OpenAI client - will be set lazily on first use
_client: Optional[OpenAI] = None

EMBEDDING_MODEL = "text-embedding-ada-002"
EMBEDDING_DIMENSIONS = 1536
MAX_TOKENS = 8191  # ada-002 token limit
MAX_CHARS = 30000  # Conservative char estimate (~4 chars per token)


def _get_client() -> OpenAI:
    """Get or create OpenAI client."""
    global _client
    if _client is None:
        api_key = None

        # First, try to read directly from backend/.env file (overrides system env)
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env')
        if os.path.exists(env_file):
            with open(env_file) as f:
                for line in f:
                    if line.strip().startswith('OPENAI_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        break

        # Fallback to system env or Django settings
        if not api_key:
            api_key = os.getenv('OPENAI_API_KEY') or getattr(settings, 'OPENAI_API_KEY', None)

        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY not found. Set it in backend/.env or environment."
            )
        _client = OpenAI(api_key=api_key)
    return _client


def generate_embedding(text: str) -> Optional[List[float]]:
    """
    Generate embedding vector for text using OpenAI ada-002.

    Args:
        text: Input text to embed (max ~8000 tokens)

    Returns:
        List of 1536 floats, or None if error
    """
    if not text or not text.strip():
        return None

    # Truncate if too long
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS]

    try:
        client = _get_client()
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding generation error: {e}")
        return None


def generate_embeddings_batch(texts: List[str]) -> List[Optional[List[float]]]:
    """
    Generate embeddings for multiple texts in one API call.

    More efficient than individual calls for bulk operations.

    Args:
        texts: List of input texts (max 2048 per batch for ada-002)

    Returns:
        List of embedding vectors (same order as input), None for empty/invalid
    """
    if not texts:
        return []

    # Filter empty texts, track indices
    valid_texts = []
    valid_indices = []
    for i, text in enumerate(texts):
        if text and text.strip():
            # Truncate if needed
            if len(text) > MAX_CHARS:
                text = text[:MAX_CHARS]
            valid_texts.append(text)
            valid_indices.append(i)

    if not valid_texts:
        return [None] * len(texts)

    try:
        client = _get_client()
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=valid_texts
        )

        # Map back to original indices
        results: List[Optional[List[float]]] = [None] * len(texts)
        for i, embedding_data in enumerate(response.data):
            original_index = valid_indices[i]
            results[original_index] = embedding_data.embedding

        return results

    except Exception as e:
        print(f"Batch embedding error: {e}")
        return [None] * len(texts)


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors.

    For testing purposes - actual similarity search uses pgvector operators.

    Args:
        vec1: First embedding vector
        vec2: Second embedding vector

    Returns:
        Cosine similarity score (0-1, higher = more similar)
    """
    import math

    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(b * b for b in vec2))

    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0

    return dot_product / (magnitude1 * magnitude2)
