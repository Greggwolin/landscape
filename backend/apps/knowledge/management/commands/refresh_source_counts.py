from django.core.management.base import BaseCommand

from apps.knowledge.services.source_registry_service import refresh_source_document_counts


class Command(BaseCommand):
    help = 'Recompute tbl_knowledge_source.document_count from tbl_platform_knowledge truth data.'

    def handle(self, *args, **options):
        updated = refresh_source_document_counts()
        self.stdout.write(self.style.SUCCESS(f'Refreshed source counts for {updated} source records.'))
