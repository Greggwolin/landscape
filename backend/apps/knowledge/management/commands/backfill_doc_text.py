"""
Backfill core_doc_text for existing documents that have real storage URLs.

Extracts text from documents stored in UploadThing (utfs.io) and stores
the extracted text in core_doc_text.  This enables:
  - Document chat Quick Actions (Summarize, Key Points, Extract Data, Q&A)
  - Full-text fallback when embeddings are unavailable
  - Text search across all documents

Usage:
    python manage.py backfill_doc_text              # All docs with real URLs
    python manage.py backfill_doc_text --limit 10   # First 10 only
    python manage.py backfill_doc_text --force       # Re-extract even if text exists
    python manage.py backfill_doc_text --dry-run     # Preview only
"""

from django.core.management.base import BaseCommand
from django.db import connection

from apps.knowledge.services.text_extraction import extract_text_from_url


class Command(BaseCommand):
    help = 'Backfill core_doc_text for documents with real storage URLs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit', type=int, default=None,
            help='Maximum number of documents to process',
        )
        parser.add_argument(
            '--project-id', type=int, default=None,
            help='Only process documents from this project',
        )
        parser.add_argument(
            '--force', action='store_true',
            help='Re-extract text even if core_doc_text already has an entry',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Show what would be processed without executing',
        )

    def handle(self, *args, **options):
        self.stdout.write("Querying documents with real storage URLs...\n")

        query = """
            SELECT d.doc_id, d.doc_name, d.storage_uri, d.mime_type
            FROM landscape.core_doc d
            WHERE d.deleted_at IS NULL
              AND d.storage_uri IS NOT NULL
              AND d.storage_uri LIKE 'http%%'
              AND d.storage_uri NOT LIKE '%%placeholder.local%%'
        """
        params = []

        if not options['force']:
            query += """
              AND NOT EXISTS (
                SELECT 1 FROM landscape.core_doc_text t
                WHERE t.doc_id = d.doc_id
                  AND t.extracted_text IS NOT NULL
                  AND LENGTH(t.extracted_text) > 0
              )
            """

        if options['project_id']:
            query += " AND d.project_id = %s"
            params.append(options['project_id'])

        query += " ORDER BY d.doc_id"

        if options['limit']:
            query += " LIMIT %s"
            params.append(options['limit'])

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            docs = cursor.fetchall()

        self.stdout.write(f"Found {len(docs)} documents to process\n")

        if not docs:
            self.stdout.write(self.style.WARNING("No documents need text extraction."))
            return

        if options['dry_run']:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] Would extract text for:"))
            for doc_id, doc_name, storage_uri, mime_type in docs[:15]:
                self.stdout.write(f"  doc_id={doc_id}: {doc_name} ({mime_type or 'unknown'})")
            if len(docs) > 15:
                self.stdout.write(f"  ... and {len(docs) - 15} more")
            return

        success_count = 0
        fail_count = 0
        total_words = 0

        for i, (doc_id, doc_name, storage_uri, mime_type) in enumerate(docs, 1):
            try:
                text, error = extract_text_from_url(storage_uri, mime_type)

                if error or not text or len(text.strip()) == 0:
                    self.stdout.write(
                        f"  [{i}/{len(docs)}] SKIP doc_id={doc_id}: "
                        f"{error or 'no text extracted'}"
                    )
                    fail_count += 1
                    continue

                word_count = len(text.split())
                total_words += word_count

                with connection.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO landscape.core_doc_text
                            (doc_id, extracted_text, word_count, extraction_method, extracted_at, updated_at)
                        VALUES (%s, %s, %s, 'backfill', NOW(), NOW())
                        ON CONFLICT (doc_id)
                        DO UPDATE SET
                            extracted_text = EXCLUDED.extracted_text,
                            word_count = EXCLUDED.word_count,
                            extraction_method = 'backfill',
                            updated_at = NOW()
                    """, [doc_id, text, word_count])

                success_count += 1
                self.stdout.write(
                    f"  [{i}/{len(docs)}] OK  doc_id={doc_id}: "
                    f"{word_count} words from {doc_name}"
                )

            except Exception as e:
                fail_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"  [{i}/{len(docs)}] ERR doc_id={doc_id}: {e}"
                    )
                )

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("Backfill complete!"))
        self.stdout.write(f"  Processed: {success_count + fail_count}")
        self.stdout.write(f"  Successful: {success_count}")
        self.stdout.write(f"  Failed/Skipped: {fail_count}")
        self.stdout.write(f"  Total words extracted: {total_words:,}")
