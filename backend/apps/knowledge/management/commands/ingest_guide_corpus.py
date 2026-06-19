"""
Ingest the in-app User Guide into the Landscaper reference brain.

Reads backend/data/guide_corpus.json (produced by
scripts/guide/export-guide-corpus.ts) and loads each (chapter, section,
ui_path) record into tbl_platform_knowledge_chunks as a single
'Landscape User Guide' document. Once loaded, the existing help-panel chat
(get_help_response) and project Landscaper (query_platform_knowledge) retrieve
it automatically — answers become grounded in the verified guide text.

Each chunk carries metadata: chapter_id (e.g. 'UW'), section_id (e.g. 'UW.6'),
ui_path ('shared' | 'chat' | 'classic'). ui_path lets retrieval prefer the
steps for the user's current interface; chapter_id lets the chat surface the
matching chapter in the right panel.

Usage:
    python manage.py ingest_guide_corpus
    python manage.py ingest_guide_corpus --dry-run
    python manage.py ingest_guide_corpus --clear-existing   # default: replaces guide rows
    python manage.py ingest_guide_corpus --corpus /path/to/guide_corpus.json
"""

import json
import logging
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection

from apps.knowledge.services.embedding_service import generate_embedding

logger = logging.getLogger(__name__)

DOCUMENT_KEY = "landscape_user_guide"
DOCUMENT_TITLE = "Landscape User Guide"
KNOWLEDGE_DOMAIN = "user_guide"
CHUNK_CATEGORY = "user_guide"
EMBEDDING_MODEL = "text-embedding-3-small"


def _default_corpus_path() -> str:
    # settings.BASE_DIR points at the backend/ directory.
    candidates = [
        os.path.join(str(settings.BASE_DIR), "data", "guide_corpus.json"),
        os.path.join(str(settings.BASE_DIR), "..", "backend", "data", "guide_corpus.json"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]


class Command(BaseCommand):
    help = "Ingest the in-app User Guide into the platform-knowledge reference corpus"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Print records without ingesting")
        parser.add_argument("--clear-existing", action="store_true",
                            help="Remove existing guide document/chunks before ingesting "
                                 "(this command always replaces guide rows regardless)")
        parser.add_argument("--corpus", type=str, default=None,
                            help="Path to guide_corpus.json (defaults to backend/data/)")

    def handle(self, *args, **options):
        corpus_path = options["corpus"] or _default_corpus_path()
        if not os.path.exists(corpus_path):
            self.stderr.write(
                f"Corpus not found at {corpus_path}. Run the export first:\n"
                f"  npx ts-node --transpile-only "
                f"--compiler-options '{{\"module\":\"commonjs\",\"moduleResolution\":\"node\"}}' "
                f"scripts/guide/export-guide-corpus.ts"
            )
            return

        with open(corpus_path, "r", encoding="utf-8") as fh:
            payload = json.load(fh)
        records = payload.get("records", [])

        if options["dry_run"]:
            self.stdout.write(f"\nDRY RUN — {len(records)} records in {corpus_path}:\n")
            for r in records:
                self.stdout.write(
                    f"  [guide/{r['chapter_id']}/{r['section_id']}/{r['ui_path']}] "
                    f"{r['section_title']}"
                )
            return

        # Always replace existing guide rows so re-ingest stays idempotent.
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM landscape.tbl_platform_knowledge_chunks
                WHERE document_id IN (
                    SELECT id FROM landscape.tbl_platform_knowledge
                    WHERE document_key = %s
                )
            """, [DOCUMENT_KEY])
            cursor.execute("""
                DELETE FROM landscape.tbl_platform_knowledge
                WHERE document_key = %s
            """, [DOCUMENT_KEY])

        doc_id = self._create_document(len(records))
        self.stdout.write(f"Using document ID: {doc_id}")

        success, failed = 0, 0
        for idx, r in enumerate(records):
            try:
                full_text = r["text"]
                embedding = generate_embedding(full_text)
                if not embedding:
                    self.stderr.write(f"  ! {r['section_id']}/{r['ui_path']}: embedding failed, skipping")
                    failed += 1
                    continue
                embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
                section_path = f"guide/{r['chapter_id']}/{r['section_id']}/{r['ui_path']}"
                metadata = {
                    "chapter_id": r["chapter_id"],
                    "chapter_number": r["chapter_number"],
                    "chapter_title": r["chapter_title"],
                    "section_id": r["section_id"],
                    "section_title": r["section_title"],
                    "group": r["group"],
                    "ui_path": r["ui_path"],
                    "source": "user_guide",
                }

                with connection.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO landscape.tbl_platform_knowledge_chunks
                        (document_id, chunk_index, content, content_type, section_path,
                         embedding, embedding_model, token_count, category, metadata, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s::vector, %s, %s, %s, %s, NOW())
                    """, [
                        doc_id,
                        idx,
                        full_text,
                        r["ui_path"],            # content_type carries ui_path for quick filtering
                        section_path,
                        embedding_str,
                        EMBEDDING_MODEL,
                        len(full_text.split()),
                        CHUNK_CATEGORY,
                        json.dumps(metadata),
                    ])
                success += 1
            except Exception as e:  # noqa: BLE001
                failed += 1
                self.stderr.write(f"  x {r.get('section_id')}/{r.get('ui_path')}: {e}")

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE landscape.tbl_platform_knowledge
                SET chunk_count = %s, ingestion_status = 'completed',
                    last_indexed_at = NOW(), updated_at = NOW()
                WHERE id = %s
            """, [success, doc_id])

        self.stdout.write(f"\nIngestion complete: {success} succeeded, {failed} failed")

        # Coverage by ui_path
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT metadata->>'ui_path' AS ui_path, COUNT(*)
                FROM landscape.tbl_platform_knowledge_chunks
                WHERE document_id = %s GROUP BY 1 ORDER BY 1
            """, [doc_id])
            for ui_path, count in cursor.fetchall():
                self.stdout.write(f"  {str(ui_path):10s} {count}")

    def _create_document(self, total_records: int) -> int:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.tbl_platform_knowledge
                (document_key, title, knowledge_domain, property_types,
                 description, ingestion_status, is_active,
                 metadata, created_at, updated_at, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE, %s, NOW(), NOW(), %s)
                RETURNING id
            """, [
                DOCUMENT_KEY,
                DOCUMENT_TITLE,
                KNOWLEDGE_DOMAIN,
                json.dumps(["BOTH"]),  # property_types is jsonb (match ingest_help_training_content)
                "The in-app Landscape User Guide — chapter/section content with "
                "shared concept text plus chat-first and classic-tabbed navigation "
                "paths, tagged by ui_path for interface-aware retrieval.",
                "ingesting",
                json.dumps({
                    "source": "user_guide",
                    "record_count": total_records,
                    "created_by": "ingest_guide_corpus",
                }),
                "system",
            ])
            doc_id = cursor.fetchone()[0]
            self.stdout.write(f"Created document '{DOCUMENT_KEY}' with id={doc_id}")
            return doc_id
