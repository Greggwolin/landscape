"""
Platform Documentation Ingestion Command

Ingests Markdown documentation files into Platform Knowledge for Landscaper AI context.
Designed for Alpha help content, feature documentation, and platform guides.

Usage:
    python manage.py ingest_platform_docs \\
        --file docs/00_overview/IMPLEMENTATION_STATUS.md \\
        --key alpha-implementation-status \\
        --title "Alpha Implementation Status"

    python manage.py ingest_platform_docs \\
        --directory docs/00_overview/status/ \\
        --key-prefix alpha-status

This command chunks Markdown by ## headers and encodes metadata in section_path:
    Format: {property_type}/{page_name}/{content_type}/{section_title}
    Example: MF/property/alpha_help/What You Can Do

Section path enables filtered retrieval:
    - By property type: section_path LIKE 'MF/%'
    - By page: section_path LIKE '%/property/%'
    - By content type: section_path LIKE '%/alpha_help/%'
"""

import hashlib
import logging
import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple

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


# Page name detection patterns for Alpha documentation
PAGE_PATTERNS = {
    # MF workspace pages
    'project_home': ['project home', 'home tab', 'dashboard'],
    'property': ['property tab', 'details', 'rent roll', 'market'],
    'operations': ['operations tab', 'operating statement', 'p&l', 'rental income', 'vacancy', 'opex'],
    'valuation': ['valuation tab', 'sales comparison', 'cost approach', 'income approach', 'dcf', 'direct cap'],
    'capitalization': ['capitalization tab', 'capital tab', 'equity', 'debt', 'waterfall'],
    'reports': ['reports tab', 'export', 'summary'],
    'documents': ['documents tab', 'dms', 'document management', 'upload'],
    'map': ['map tab', 'gis', 'location', 'demographics'],
    # Land dev workspace pages
    'budget': ['budget tab', 'schedule', 'sales', 'draws', 'cost categories'],
    'feasibility': ['feasibility tab', 'cash flow', 'returns', 'sensitivity', 'irr'],
    'land_use': ['land use', 'parcels', 'product types', 'lot widths'],
    # General
    'landscaper': ['landscaper', 'ai assistant', 'chat'],
    'benchmarks': ['benchmarks', 'growth rates', 'transaction costs', 'absorption'],
    'general': ['general', 'overview', 'guidelines'],
}

# Content type detection patterns
CONTENT_TYPE_PATTERNS = {
    'alpha_help': ['what you can do', 'alpha help', 'features', 'tips'],
    'deflection': ['coming soon', 'should deflect', 'not yet', 'planned', "what's coming"],
    'tester_notes': ['alpha tester', 'test focus', 'known limitation', 'known issues'],
    'landscaper_context': ['landscaper context', 'can help with', 'should deflect'],
    'technical': ['technical details', 'api', 'database', 'implementation'],
}

# Property type detection
PROPERTY_TYPE_PATTERNS = {
    'MF': ['multifamily', 'mf ', 'mf/', 'mf)', 'rent roll', 'units', 'leases', 'income property'],
    'LAND_DEV': ['land dev', 'land development', 'parcels', 'phases', 'lots', 'absorption', 'feasibility'],
    'BOTH': ['general', 'overview', 'all property', 'landscaper guidelines'],
}


class Command(BaseCommand):
    help = 'Ingest Markdown documentation into Platform Knowledge for Alpha help'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            help='Path to single Markdown file'
        )
        parser.add_argument(
            '--directory',
            help='Path to directory containing Markdown files'
        )
        parser.add_argument(
            '--key',
            help='Document key for single file (required with --file)'
        )
        parser.add_argument(
            '--key-prefix',
            default='alpha-docs',
            help='Prefix for document keys when using --directory'
        )
        parser.add_argument(
            '--title',
            help='Document title (defaults to filename)'
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
        parser.add_argument(
            '--chunk-size',
            type=int,
            default=400,
            help='Max words per chunk (default: 400)'
        )
        parser.add_argument(
            '--category',
            default='alpha_docs',
            help='Chunk category stored in tbl_platform_knowledge_chunks (default: alpha_docs)'
        )

    def handle(self, *args, **options):
        if not options['file'] and not options['directory']:
            self.stderr.write(self.style.ERROR(
                "Must specify either --file or --directory"
            ))
            return

        if options['file']:
            if not options['key']:
                self.stderr.write(self.style.ERROR(
                    "--key is required when using --file"
                ))
                return
            self._ingest_file(
                Path(options['file']),
                options['key'],
                options.get('title'),
                options
            )
        else:
            self._ingest_directory(
                Path(options['directory']),
                options['key_prefix'],
                options
            )

    def _ingest_directory(self, directory: Path, key_prefix: str, options: dict):
        """Ingest all Markdown files in a directory."""
        if not directory.exists():
            self.stderr.write(self.style.ERROR(f"Directory not found: {directory}"))
            return

        md_files = list(directory.glob('*.md'))
        if not md_files:
            self.stderr.write(self.style.WARNING(f"No .md files found in {directory}"))
            return

        self.stdout.write(f"Found {len(md_files)} Markdown files in {directory}")

        for md_file in md_files:
            # Generate key from filename
            key = f"{key_prefix}-{md_file.stem.lower().replace('_', '-')}"
            self._ingest_file(md_file, key, None, options)

    def _ingest_file(
        self,
        file_path: Path,
        document_key: str,
        title: Optional[str],
        options: dict
    ):
        """Ingest a single Markdown file."""
        if not file_path.exists():
            self.stderr.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"Ingesting: {file_path.name}")

        # Read file content
        content = file_path.read_text(encoding='utf-8')

        # Calculate hash
        file_hash = hashlib.sha256(content.encode()).hexdigest()
        self.stdout.write(f"  File hash: {file_hash[:16]}...")

        # Check for existing document
        existing = PlatformKnowledge.objects.filter(document_key=document_key).first()
        if existing and existing.file_hash == file_hash and not options['force']:
            self.stdout.write(self.style.WARNING(
                f"  Document already ingested with same hash. Use --force to re-ingest."
            ))
            return

        # Extract title from first # header if not provided
        if not title:
            title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            title = title_match.group(1) if title_match else file_path.stem

        # Parse sections
        sections = self._parse_markdown_sections(content, file_path.name)
        self.stdout.write(f"  Found {len(sections)} sections")

        if options['dry_run']:
            self.stdout.write(self.style.WARNING("\nDRY RUN - would ingest:"))
            self.stdout.write(f"  Key: {document_key}")
            self.stdout.write(f"  Title: {title}")
            self.stdout.write(f"  Sections: {len(sections)}")
            for section in sections[:10]:
                self.stdout.write(
                    f"    [{section['property_type']}/{section['page_name']}/{section['content_type']}] "
                    f"{section['title'][:40]}..."
                )
            if len(sections) > 10:
                self.stdout.write(f"    ... and {len(sections) - 10} more")
            return

        # Create or update document record
        doc, created = PlatformKnowledge.objects.update_or_create(
            document_key=document_key,
            defaults={
                'title': title,
                'subtitle': 'Alpha Testing Documentation',
                'publisher': 'Landscape',
                'publication_year': 2026,
                'knowledge_domain': 'alpha_help',
                'property_types': ['MF', 'LAND_DEV'],
                'description': f'Alpha testing documentation extracted from {file_path.name}',
                'total_chapters': len(sections),
                'file_path': str(file_path.absolute()),
                'file_hash': file_hash,
                'file_size_bytes': file_path.stat().st_size,
                'ingestion_status': 'processing'
            }
        )

        action = "Created" if created else "Updated"
        self.stdout.write(f"  {action} document record: {doc.id}")

        # Clear existing chunks if re-ingesting
        if not created:
            old_chunk_count = doc.chunks.count()
            old_chapter_count = doc.chapters.count()
            doc.chunks.all().delete()
            doc.chapters.all().delete()
            self.stdout.write(f"  Cleared {old_chapter_count} chapters, {old_chunk_count} chunks")

        # Process sections
        try:
            self._process_sections(
                doc,
                sections,
                options['chunk_size'],
                skip_embeddings=options['skip_embeddings'],
                category=options['category']
            )

            doc.ingestion_status = 'indexed'
            doc.last_indexed_at = timezone.now()
            doc.chunk_count = doc.chunks.count()
            doc.save()

            self.stdout.write(self.style.SUCCESS(
                f"  Successfully ingested {doc.chunk_count} chunks from {len(sections)} sections"
            ))

        except Exception as e:
            doc.ingestion_status = 'failed'
            doc.save()
            self.stderr.write(self.style.ERROR(f"  Ingestion failed: {e}"))
            raise

    def _parse_markdown_sections(
        self,
        content: str,
        source_filename: str
    ) -> List[Dict]:
        """
        Parse Markdown into sections based on ## headers.

        Returns list of section dicts with:
        - title: Section title
        - content: Section content
        - page_name: Detected page name
        - property_type: MF, LAND_DEV, or BOTH
        - content_type: alpha_help, deflection, tester_notes, etc.
        """
        sections = []

        # Split by ## headers (level 2)
        # Pattern: ## followed by text, captures the header and content until next ##
        pattern = r'^##\s+(.+?)$\n(.*?)(?=^##\s+|\Z)'
        matches = re.findall(pattern, content, re.MULTILINE | re.DOTALL)

        # Track current context from parent headers
        current_page = 'general'
        current_property_type = 'BOTH'

        for header, body in matches:
            header = header.strip()
            body = body.strip()

            if not body:
                continue

            # Detect page name
            page_name = self._detect_page_name(header, body)
            if page_name != 'general':
                current_page = page_name

            # Detect property type
            property_type = self._detect_property_type(header, body)
            if property_type != 'BOTH':
                current_property_type = property_type

            # Detect content type
            content_type = self._detect_content_type(header, body)

            # Also process ### subsections within this section
            subsections = self._parse_subsections(body, current_page, current_property_type, source_filename)

            if subsections:
                sections.extend(subsections)
            else:
                sections.append({
                    'title': header,
                    'content': body,
                    'page_name': current_page,
                    'property_type': current_property_type,
                    'content_type': content_type,
                    'source_file': source_filename
                })

        # If no ## sections found, treat entire content as one section
        if not sections:
            sections.append({
                'title': 'Overview',
                'content': content,
                'page_name': 'general',
                'property_type': 'BOTH',
                'content_type': 'alpha_help',
                'source_file': source_filename
            })

        return sections

    def _parse_subsections(
        self,
        content: str,
        parent_page: str,
        parent_property_type: str,
        source_filename: str
    ) -> List[Dict]:
        """Parse ### level subsections within a section."""
        subsections = []

        # Pattern for ### headers
        pattern = r'^###\s+(.+?)$\n(.*?)(?=^###\s+|\Z)'
        matches = re.findall(pattern, content, re.MULTILINE | re.DOTALL)

        for header, body in matches:
            header = header.strip()
            body = body.strip()

            if not body or len(body) < 50:  # Skip very short subsections
                continue

            # Detect content type from subsection header
            content_type = self._detect_content_type(header, body)

            # Check for property type override
            property_type = self._detect_property_type(header, body)
            if property_type == 'BOTH':
                property_type = parent_property_type

            subsections.append({
                'title': header,
                'content': body,
                'page_name': parent_page,
                'property_type': property_type,
                'content_type': content_type,
                'source_file': source_filename
            })

        return subsections

    def _detect_page_name(self, header: str, content: str) -> str:
        """Detect which workspace page this section relates to."""
        combined = f"{header} {content[:500]}".lower()

        for page_name, patterns in PAGE_PATTERNS.items():
            for pattern in patterns:
                if pattern in combined:
                    return page_name

        return 'general'

    def _detect_property_type(self, header: str, content: str) -> str:
        """Detect property type: MF, LAND_DEV, or BOTH."""
        combined = f"{header} {content[:500]}".lower()

        # Check for explicit mentions
        for prop_type, patterns in PROPERTY_TYPE_PATTERNS.items():
            for pattern in patterns:
                if pattern in combined:
                    return prop_type

        return 'BOTH'

    def _detect_content_type(self, header: str, content: str) -> str:
        """Detect content type: alpha_help, deflection, tester_notes, etc."""
        combined = f"{header} {content[:300]}".lower()

        for content_type, patterns in CONTENT_TYPE_PATTERNS.items():
            for pattern in patterns:
                if pattern in combined:
                    return content_type

        return 'alpha_help'

    def _process_sections(
        self,
        doc: PlatformKnowledge,
        sections: List[Dict],
        chunk_size: int,
        skip_embeddings: bool = False,
        category: str = 'alpha_docs'
    ):
        """Create chapter and chunk records for each section."""
        chunk_index = 0
        total_tokens = 0

        for section_num, section in enumerate(sections, 1):
            # Create chapter record for the section
            chapter = PlatformKnowledgeChapter.objects.create(
                document=doc,
                chapter_number=section_num,
                chapter_title=section['title'],
                topics=[section['content_type'], section['page_name']],
                property_types=[section['property_type']] if section['property_type'] != 'BOTH' else ['MF', 'LAND_DEV'],
                applies_to=['alpha_help', 'user_assistance']
            )

            # Chunk the section content
            chunks = self._chunk_text(section['content'], chunk_size)

            chunk_ids = []
            for i, chunk_text in enumerate(chunks):
                token_count = len(chunk_text.split())
                total_tokens += token_count

                # Build section_path for filtered retrieval
                # Format: {property_type}/{page_name}/{content_type}/{section_title}
                section_path = (
                    f"{section['property_type']}/"
                    f"{section['page_name']}/"
                    f"{section['content_type']}/"
                    f"{section['title'][:50]}"
                )

                metadata = {
                    'source_doc': section.get('source_file') or doc.file_path or doc.title,
                    'page_name': section['page_name'],
                    'property_type': section['property_type'],
                    'content_type': section['content_type'],
                    'section_title': section['title'],
                    'last_updated': timezone.now().isoformat(),
                }

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
                    section_path=section_path,
                    token_count=token_count,
                    category=category,
                    metadata=metadata
                )

                # Store embedding using raw SQL (pgvector)
                if embedding:
                    self._store_embedding(chunk.id, embedding)

                chunk_ids.append(chunk.id)
                chunk_index += 1

            # Update chapter with chunk IDs
            chapter.chunk_ids = chunk_ids
            chapter.save()

            # Progress indicator
            if section_num % 10 == 0:
                self.stdout.write(f"    Processed {section_num}/{len(sections)} sections...")

        self.stdout.write(f"  Total chunks: {chunk_index}")
        self.stdout.write(f"  Total tokens: {total_tokens:,}")

    def _chunk_text(self, text: str, max_words: int) -> List[str]:
        """
        Split text into chunks, preferring paragraph boundaries.
        """
        # Clean up text
        text = text.replace('\x00', '').strip()

        # If text is short enough, return as single chunk
        words = text.split()
        if len(words) <= max_words:
            return [text] if text.strip() else []

        # Split by paragraphs first
        paragraphs = re.split(r'\n\s*\n', text)

        chunks = []
        current_chunk = []
        current_word_count = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            para_words = len(para.split())

            # If paragraph alone exceeds max, split it
            if para_words > max_words:
                # Flush current chunk
                if current_chunk:
                    chunks.append('\n\n'.join(current_chunk))
                    current_chunk = []
                    current_word_count = 0

                # Split paragraph by words
                words = para.split()
                for i in range(0, len(words), max_words):
                    chunk_words = words[i:i + max_words]
                    chunks.append(' '.join(chunk_words))

            # If adding paragraph would exceed max, start new chunk
            elif current_word_count + para_words > max_words:
                if current_chunk:
                    chunks.append('\n\n'.join(current_chunk))
                current_chunk = [para]
                current_word_count = para_words

            else:
                current_chunk.append(para)
                current_word_count += para_words

        # Don't forget the last chunk
        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))

        return [c for c in chunks if c.strip()]

    def _store_embedding(self, chunk_id: int, embedding: List[float]) -> bool:
        """Store embedding using raw SQL for pgvector compatibility."""
        try:
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
