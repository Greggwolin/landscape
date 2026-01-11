"""
Backfill embeddings for all existing documents in core_doc.
"""
from django.core.management.base import BaseCommand
from django.db import connection

from apps.knowledge.services.document_ingestion import ingest_documents_batch


class Command(BaseCommand):
    help = 'Backfill embeddings for existing documents in core_doc'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of documents to process'
        )
        parser.add_argument(
            '--project-id',
            type=int,
            default=None,
            help='Only process documents from this project'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-process documents that already have embeddings'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be processed without doing it'
        )

    def handle(self, *args, **options):
        self.stdout.write("Fetching documents from core_doc...\n")

        # Query core_doc for documents with storage_uri
        query = """
            SELECT
                doc_id,
                storage_uri,
                mime_type,
                doc_name,
                doc_type,
                project_id
            FROM landscape.core_doc
            WHERE storage_uri IS NOT NULL
              AND storage_uri != ''
              AND (status IS NULL OR status != 'archived')
        """

        params = []

        if options['project_id']:
            query += " AND project_id = %s"
            params.append(options['project_id'])

        query += " ORDER BY doc_id"

        if options['limit']:
            query += " LIMIT %s"
            params.append(options['limit'])

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            documents = [dict(zip(columns, row)) for row in cursor.fetchall()]

        self.stdout.write(f"Found {len(documents)} documents to process\n")

        if not documents:
            self.stdout.write(self.style.WARNING("No documents found"))
            return

        if options['dry_run']:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] Would process:"))
            for doc in documents[:10]:
                self.stdout.write(f"  - {doc['doc_id']}: {doc['doc_name']} ({doc['mime_type']})")
            if len(documents) > 10:
                self.stdout.write(f"  ... and {len(documents) - 10} more")
            return

        # Progress callback
        def progress(current, total, result):
            status = "✓" if result.success else "✗"
            detail = f"{result.embeddings_created} embeddings" if result.success and 'skipped' not in (result.error or '') else (result.error or 'unknown')
            self.stdout.write(f"  [{current}/{total}] {status} doc_id={result.doc_id}: {detail}")

        self.stdout.write("\nProcessing documents...\n")

        results = ingest_documents_batch(
            documents=documents,
            skip_if_exists=not options['force'],
            progress_callback=progress
        )

        # Summary
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("Backfill complete!"))
        self.stdout.write(f"  Total documents: {results['total']}")
        self.stdout.write(f"  Successful: {results['successful']}")
        self.stdout.write(f"  Skipped (already processed): {results['skipped']}")
        self.stdout.write(f"  Failed: {results['failed']}")
        self.stdout.write(f"  Total chunks created: {results['total_chunks']}")
        self.stdout.write(f"  Total embeddings created: {results['total_embeddings']}")

        if results['errors']:
            self.stdout.write(self.style.WARNING(f"\nErrors ({len(results['errors'])}):"))
            for err in results['errors'][:5]:
                self.stdout.write(f"  - doc_id {err['doc_id']}: {err['error']}")
            if len(results['errors']) > 5:
                self.stdout.write(f"  ... and {len(results['errors']) - 5} more")
