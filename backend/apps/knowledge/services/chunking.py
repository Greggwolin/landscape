"""
Chunk text into semantic units for embedding.
Uses sentence-aware chunking with overlap.
"""
import re
from typing import List, Dict, Any


# Target chunk size (tokens ≈ chars/4)
DEFAULT_CHUNK_SIZE = 1500  # ~375 tokens
DEFAULT_CHUNK_OVERLAP = 200  # ~50 tokens overlap
MIN_CHUNK_SIZE = 100  # Don't create tiny chunks


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    metadata: Dict[str, Any] = None
) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks, respecting sentence boundaries.

    Args:
        text: Full document text
        chunk_size: Target characters per chunk
        chunk_overlap: Characters to overlap between chunks
        metadata: Additional metadata to attach to each chunk

    Returns:
        List of chunk dicts with 'content', 'chunk_index', 'char_start', 'char_end', + metadata
    """
    if not text or not text.strip():
        return []

    # Clean text
    text = _clean_text(text)

    if len(text) <= chunk_size:
        # Document fits in one chunk
        return [{
            'content': text,
            'chunk_index': 0,
            'char_start': 0,
            'char_end': len(text),
            'total_chunks': 1,
            **(metadata or {})
        }]

    # Split into sentences
    sentences = _split_sentences(text)

    chunks = []
    current_chunk = []
    current_length = 0
    char_position = 0
    chunk_start = 0

    for sentence in sentences:
        sentence_length = len(sentence)

        # If adding this sentence exceeds chunk size and we have content
        if current_length + sentence_length > chunk_size and current_chunk:
            # Save current chunk
            chunk_text_content = ' '.join(current_chunk)
            chunks.append({
                'content': chunk_text_content,
                'chunk_index': len(chunks),
                'char_start': chunk_start,
                'char_end': char_position,
                **(metadata or {})
            })

            # Start new chunk with overlap
            overlap_sentences = _get_overlap_sentences(current_chunk, chunk_overlap)
            current_chunk = overlap_sentences + [sentence]
            current_length = sum(len(s) for s in current_chunk)
            chunk_start = char_position - sum(len(s) for s in overlap_sentences)
        else:
            current_chunk.append(sentence)
            current_length += sentence_length

        char_position += sentence_length + 1  # +1 for space

    # Don't forget the last chunk
    if current_chunk:
        chunk_text_content = ' '.join(current_chunk)
        if len(chunk_text_content) >= MIN_CHUNK_SIZE:
            chunks.append({
                'content': chunk_text_content,
                'chunk_index': len(chunks),
                'char_start': chunk_start,
                'char_end': len(text),
                **(metadata or {})
            })

    # Add total count to all chunks
    total = len(chunks)
    for chunk in chunks:
        chunk['total_chunks'] = total

    return chunks


def _clean_text(text: str) -> str:
    """Clean and normalize text, preserving table formatting."""
    # Extract [TABLE]...[/TABLE] blocks before cleaning
    table_placeholder = '\x00TABLE_{}\x00'
    table_blocks = []
    table_pattern = re.compile(r'\[TABLE[^\]]*\].*?\[/TABLE\]', re.DOTALL)

    def _save_table(match):
        idx = len(table_blocks)
        # Clean up table block: collapse excessive blank lines but keep structure
        block = match.group(0)
        block = re.sub(r'\n{3,}', '\n', block)
        table_blocks.append(block)
        return table_placeholder.format(idx)

    text = table_pattern.sub(_save_table, text)

    # Normalize whitespace in non-table text
    text = re.sub(r'\s+', ' ', text)
    # Remove excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Restore table blocks
    for idx, block in enumerate(table_blocks):
        text = text.replace(table_placeholder.format(idx), '\n' + block + '\n')

    return text.strip()


def _split_sentences(text: str) -> List[str]:
    """Split text into sentences."""
    # Simple sentence splitting on . ! ? followed by space and capital
    # More sophisticated: use nltk or spacy
    pattern = r'(?<=[.!?])\s+(?=[A-Z])'
    sentences = re.split(pattern, text)
    return [s.strip() for s in sentences if s.strip()]


def _get_overlap_sentences(sentences: List[str], target_overlap: int) -> List[str]:
    """Get sentences from end that fit within overlap target."""
    overlap = []
    total_length = 0

    for sentence in reversed(sentences):
        if total_length + len(sentence) <= target_overlap:
            overlap.insert(0, sentence)
            total_length += len(sentence)
        else:
            break

    return overlap


def chunk_document_with_sections(
    text: str,
    doc_name: str = None,
    doc_type: str = None,
    project_id: int = None
) -> List[Dict[str, Any]]:
    """
    Convenience wrapper that adds document context to chunks.

    Args:
        text: Document text
        doc_name: Original filename
        doc_type: Document type (e.g., 'contract', 'permit')
        project_id: Associated project ID

    Returns:
        List of chunks with document metadata
    """
    metadata = {
        'doc_name': doc_name,
        'doc_type': doc_type,
        'project_id': project_id
    }

    # Filter None values
    metadata = {k: v for k, v in metadata.items() if v is not None}

    return chunk_text(text, metadata=metadata)
