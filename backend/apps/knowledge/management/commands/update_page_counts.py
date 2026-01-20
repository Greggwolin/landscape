import os
from django.core.management.base import BaseCommand

from apps.knowledge.models import PlatformKnowledge

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False


class Command(BaseCommand):
    help = 'Update page counts for existing platform knowledge documents'

    def handle(self, *args, **options):
        if not HAS_PYMUPDF:
            self.stderr.write(self.style.ERROR(
                "PyMuPDF (fitz) is required. Install with: pip install PyMuPDF"
            ))
            return

        docs = PlatformKnowledge.objects.filter(page_count__isnull=True)
        updated = 0

        for doc in docs:
            if not doc.file_path:
                continue
            if not doc.file_path.lower().endswith('.pdf'):
                continue
            if not os.path.exists(doc.file_path):
                self.stdout.write(f"  {doc.title}: file not found")
                continue

            try:
                with fitz.open(doc.file_path) as pdf:
                    doc.page_count = len(pdf)
                doc.save(update_fields=['page_count'])
                updated += 1
                self.stdout.write(f"  {doc.title}: {doc.page_count} pages")
            except Exception as exc:
                self.stdout.write(f"  {doc.title}: Error - {exc}")

        self.stdout.write(f"\nUpdated {updated} documents")
