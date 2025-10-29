"""
Django management command to process document extraction queue.
"""

from django.core.management.base import BaseCommand
from services.extraction.extraction_worker import process_extraction_queue


class Command(BaseCommand):
    help = 'Process queued document extractions'

    def handle(self, *args, **options):
        self.stdout.write('Processing extraction queue...')
        process_extraction_queue()
        self.stdout.write(self.style.SUCCESS('Queue processing complete'))
