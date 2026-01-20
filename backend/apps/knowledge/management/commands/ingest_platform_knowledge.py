"""
Platform Knowledge Ingestion Command

Usage:
    python manage.py ingest_platform_knowledge \\
        --file "reference/docs/Appraisal of Real Estate 14th Edition.pdf" \\
        --key appraisal-of-real-estate-14 \\
        --config reference/configs/appraisal_of_real_estate_14.json

This command is for developer/admin use only.
It has no web interface and requires direct server access.
"""

import json
import hashlib
import logging
from pathlib import Path
from typing import List, Optional

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

from apps.knowledge.services.embedding_service import generate_embedding
from apps.knowledge.models import (
    PlatformKnowledge,
    PlatformKnowledgeChapter,
    PlatformKnowledgeChunk
)

logger = logging.getLogger(__name__)

# Try to import pdfplumber, but handle if not installed
try:
    import pdfplumber
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logger.warning("pdfplumber not installed. Install with: pip install pdfplumber")


class Command(BaseCommand):
    help = 'Ingest a document into Platform Knowledge (developer use only)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            required=True,
            help='Path to PDF file'
        )
        parser.add_argument(
            '--key',
            required=True,
            help='Unique document key (e.g., appraisal-of-real-estate-14)'
        )
        parser.add_argument(
            '--config',
            required=True,
            help='Path to chapter config JSON'
        )
        parser.add_argument(
            '--chunk-size',
            type=int,
            default=300,
            help='Target words per chunk (default: 300, max ~400 for embedding models)'
        )
        parser.add_argument(
            '--chunk-overlap',
            type=int,
            default=30,
            help='Overlap words between chunks (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Parse without saving to database'
        )
        parser.add_argument(
            '--skip-embeddings',
            action='store_true',
            help='Skip embedding generation (for testing)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-ingestion even if document exists with same hash'
        )

    def handle(self, *args, **options):
        if not PDF_SUPPORT:
            self.stderr.write(self.style.ERROR(
                "pdfplumber is required. Install with: pip install pdfplumber"
            ))
            return

        file_path = Path(options['file'])
        config_path = Path(options['config'])

        if not file_path.exists():
            self.stderr.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        if not config_path.exists():
            self.stderr.write(self.style.ERROR(f"Config not found: {config_path}"))
            return

        # Load chapter configuration
        with open(config_path) as f:
            config = json.load(f)

        self.stdout.write(f"Ingesting: {config['title']}")
        self.stdout.write(f"  Edition: {config.get('edition', 'N/A')}")
        self.stdout.write(f"  Chapters: {len(config['chapters'])}")

        # Calculate file hash
        file_hash = self._hash_file(file_path)
        self.stdout.write(f"  File hash: {file_hash[:16]}...")

        # Check if already ingested
        existing = PlatformKnowledge.objects.filter(
            document_key=options['key']
        ).first()

        if existing and existing.file_hash == file_hash and not options['force']:
            self.stdout.write(self.style.WARNING(
                "Document already ingested with same hash. Use --force to re-ingest."
            ))
            return

        if options['dry_run']:
            self.stdout.write(self.style.WARNING("\nDRY RUN - would ingest:"))
            self.stdout.write(f"  Key: {options['key']}")
            self.stdout.write(f"  Title: {config['title']}")
            self.stdout.write(f"  Chapters: {len(config['chapters'])}")

            # Count pages per chapter
            for ch in config['chapters']:
                pages = ch['page_end'] - ch['page_start'] + 1
                self.stdout.write(f"    Ch {ch['chapter_number']}: {ch['title'][:40]}... ({pages} pages)")

            return

        # Create or update document record
        doc, created = PlatformKnowledge.objects.update_or_create(
            document_key=options['key'],
            defaults={
                'title': config['title'],
                'subtitle': config.get('subtitle'),
                'edition': config.get('edition'),
                'publisher': config.get('publisher'),
                'publication_year': config.get('publication_year'),
                'isbn': config.get('isbn'),
                'knowledge_domain': config['knowledge_domain'],
                'property_types': config.get('property_types', []),
                'description': config.get('description'),
                'total_chapters': len(config['chapters']),
                'total_pages': config.get('total_pages'),
                'file_path': str(file_path.absolute()),
                'file_hash': file_hash,
                'file_size_bytes': file_path.stat().st_size,
                'ingestion_status': 'processing'
            }
        )

        action = "Created" if created else "Updated"
        self.stdout.write(f"{action} document record: {doc.id}")

        # Clear existing chunks if re-ingesting
        if not created:
            old_chunk_count = doc.chunks.count()
            old_chapter_count = doc.chapters.count()
            doc.chunks.all().delete()
            doc.chapters.all().delete()
            self.stdout.write(f"  Cleared {old_chapter_count} chapters, {old_chunk_count} chunks")

        # Extract and process
        try:
            self._process_document(
                doc,
                file_path,
                config['chapters'],
                options['chunk_size'],
                options['chunk_overlap'],
                skip_embeddings=options['skip_embeddings']
            )

            doc.ingestion_status = 'indexed'
            doc.last_indexed_at = timezone.now()
            doc.chunk_count = doc.chunks.count()
            doc.save()

            self.stdout.write(self.style.SUCCESS(
                f"\nSuccessfully ingested {doc.chunk_count} chunks from {doc.total_chapters} chapters"
            ))

        except Exception as e:
            doc.ingestion_status = 'failed'
            doc.save()
            self.stderr.write(self.style.ERROR(f"Ingestion failed: {e}"))
            raise

    def _hash_file(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of file."""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

    def _process_document(
        self,
        doc: PlatformKnowledge,
        file_path: Path,
        chapters_config: list,
        chunk_size: int,
        chunk_overlap: int,
        skip_embeddings: bool = False
    ):
        """Extract text, create chapters, chunk, and embed."""
        chunk_index = 0
        total_tokens = 0

        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            self.stdout.write(f"  PDF has {total_pages} pages")
            doc.page_count = total_pages
            doc.save(update_fields=['page_count'])

            for ch_config in chapters_config:
                ch_num = ch_config['chapter_number']
                ch_title = ch_config['title']
                page_start = ch_config['page_start']
                page_end = ch_config['page_end']

                self.stdout.write(
                    f"\n  Processing Chapter {ch_num}: {ch_title[:40]}..."
                )
                self.stdout.write(f"    Pages {page_start}-{page_end}")

                # Create chapter record
                chapter = PlatformKnowledgeChapter.objects.create(
                    document=doc,
                    chapter_number=ch_num,
                    chapter_title=ch_title,
                    page_start=page_start,
                    page_end=page_end,
                    topics=ch_config.get('topics', []),
                    property_types=ch_config.get('property_types', []),
                    applies_to=ch_config.get('applies_to', [])
                )

                # Extract chapter text
                chapter_text = ""
                for page_num in range(page_start - 1, min(page_end, total_pages)):
                    if page_num < len(pdf.pages):
                        page = pdf.pages[page_num]
                        page_text = page.extract_text() or ""
                        chapter_text += page_text + "\n\n"

                if not chapter_text.strip():
                    self.stdout.write(self.style.WARNING(
                        f"    No text extracted for chapter {ch_num}"
                    ))
                    continue

                # Chunk the text
                chunks = self._chunk_text(chapter_text, chunk_size, chunk_overlap)
                self.stdout.write(f"    Created {len(chunks)} chunks")

                # Create chunk records with embeddings
                chunk_ids = []
                for i, chunk_text in enumerate(chunks):
                    # Estimate page number
                    pages_in_chapter = page_end - page_start + 1
                    page_offset = int((i / max(len(chunks), 1)) * pages_in_chapter)
                    estimated_page = page_start + page_offset

                    # Count tokens (rough estimate)
                    token_count = len(chunk_text.split())
                    total_tokens += token_count

                    # Generate embedding
                    embedding = None
                    if not skip_embeddings:
                        embedding = generate_embedding(chunk_text)
                        if not embedding:
                            self.stdout.write(self.style.WARNING(
                                f"    Failed to generate embedding for chunk {chunk_index}"
                            ))

                    # Create chunk record
                    chunk = PlatformKnowledgeChunk.objects.create(
                        document=doc,
                        chapter=chapter,
                        chunk_index=chunk_index,
                        content=chunk_text,
                        content_type='text',
                        page_number=estimated_page,
                        section_path=f"Chapter {ch_num}: {ch_title}",
                        token_count=token_count
                    )

                    # Store embedding using raw SQL (pgvector)
                    if embedding:
                        self._store_embedding(chunk.id, embedding)

                    chunk_ids.append(chunk.id)
                    chunk_index += 1

                    # Progress indicator
                    if (i + 1) % 10 == 0:
                        self.stdout.write(f"      Processed {i + 1}/{len(chunks)} chunks...")

                # Update chapter with chunk IDs
                chapter.chunk_ids = chunk_ids
                chapter.save()

        self.stdout.write(f"\n  Total chunks: {chunk_index}")
        self.stdout.write(f"  Total tokens: {total_tokens:,}")

    def _chunk_text(
        self,
        text: str,
        chunk_size: int,
        overlap: int
    ) -> List[str]:
        """
        Split text into overlapping chunks.

        Uses word-based chunking with overlap for context continuity.
        """
        # Clean up text
        text = text.replace('\x00', '').strip()
        words = text.split()

        if len(words) <= chunk_size:
            return [text] if text.strip() else []

        chunks = []
        i = 0

        while i < len(words):
            chunk_words = words[i:i + chunk_size]
            chunk = ' '.join(chunk_words)

            # Only add non-empty chunks
            if chunk.strip():
                chunks.append(chunk)

            # Move forward by (chunk_size - overlap)
            i += chunk_size - overlap

        return chunks

    def _store_embedding(self, chunk_id: int, embedding: List[float]) -> bool:
        """Store embedding using raw SQL for pgvector compatibility."""
        try:
            # Convert embedding to pgvector format: '[0.1,0.2,...]'
            embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE landscape.tbl_platform_knowledge_chunks
                    SET embedding = %s::vector
                    WHERE id = %s
                    """,
                    [embedding_str, chunk_id]
                )
            return True

        except Exception as e:
            logger.error(f"Failed to store embedding for chunk {chunk_id}: {e}")
            return False
