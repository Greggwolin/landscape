"""
Process queued documents through the RAG pipeline.

Usage:
    # Process one batch (default 5 documents)
    python manage.py process_documents

    # Process more documents per batch
    python manage.py process_documents --batch-size 10

    # Run continuously (poll every 5 seconds)
    python manage.py process_documents --continuous

    # Run continuously with custom interval
    python manage.py process_documents --continuous --interval 3

For production, set up as a cron job or run with supervisor/systemd:
    # Cron (every minute):
    * * * * * cd /path/to/backend && ./venv/bin/python manage.py process_documents

    # Systemd service for continuous mode:
    ExecStart=/path/to/venv/bin/python manage.py process_documents --continuous
"""
import time
import signal
import sys
from django.core.management.base import BaseCommand
from apps.knowledge.services.document_processor import process_queue, get_queue_stats


class Command(BaseCommand):
    help = 'Process documents in the queue (extract → chunk → embed)'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.should_stop = False

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=5,
            help='Number of documents to process per batch (default: 5)'
        )
        parser.add_argument(
            '--continuous',
            action='store_true',
            help='Run continuously, polling for new documents'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=5,
            help='Seconds between polls in continuous mode (default: 5)'
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show queue statistics and exit'
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        continuous = options['continuous']
        interval = options['interval']
        show_stats = options['stats']

        # Show stats only
        if show_stats:
            self._show_stats()
            return

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

        if continuous:
            self._run_continuous(batch_size, interval)
        else:
            self._run_once(batch_size)

    def _handle_signal(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self.stdout.write("\nReceived shutdown signal, finishing current batch...")
        self.should_stop = True

    def _show_stats(self):
        """Display current queue statistics."""
        stats = get_queue_stats()

        self.stdout.write("\nDocument Processing Queue Statistics")
        self.stdout.write("=" * 40)
        self.stdout.write(f"  Queued:     {stats['queued']}")
        self.stdout.write(f"  Processing: {stats['processing']}")
        self.stdout.write(f"  Completed:  {stats['completed']}")
        self.stdout.write(f"  Failed:     {stats['failed']}")
        self.stdout.write("=" * 40)

        total_pending = stats['queued'] + stats['processing']
        if total_pending > 0:
            self.stdout.write(
                self.style.WARNING(f"\n{total_pending} documents pending processing")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS("\nNo documents pending")
            )

    def _run_once(self, batch_size: int):
        """Process one batch of documents."""
        self.stdout.write(f"Processing up to {batch_size} documents...")

        results = process_queue(max_items=batch_size)

        if results['processed'] == 0:
            self.stdout.write(self.style.SUCCESS("No documents to process"))
            return

        self.stdout.write(f"\nProcessed {results['processed']} document(s):")
        self.stdout.write(f"  Succeeded: {results['succeeded']}")
        self.stdout.write(f"  Failed:    {results['failed']}")

        # Show details
        for detail in results['details']:
            if detail['success']:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✓ doc_id={detail['doc_id']}: "
                        f"{detail.get('embeddings_created', 0)} embeddings created"
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"  ✗ doc_id={detail['doc_id']}: {detail.get('error', 'Unknown error')}"
                    )
                )

    def _run_continuous(self, batch_size: int, interval: int):
        """Run continuously, polling for new documents."""
        self.stdout.write(self.style.HTTP_INFO("Starting continuous document processing..."))
        self.stdout.write(f"  Batch size: {batch_size}")
        self.stdout.write(f"  Poll interval: {interval}s")
        self.stdout.write("  Press Ctrl+C to stop\n")

        total_processed = 0
        total_succeeded = 0
        total_failed = 0

        try:
            while not self.should_stop:
                results = process_queue(max_items=batch_size)

                if results['processed'] > 0:
                    total_processed += results['processed']
                    total_succeeded += results['succeeded']
                    total_failed += results['failed']

                    self.stdout.write(
                        f"[{time.strftime('%H:%M:%S')}] "
                        f"Processed {results['processed']} docs: "
                        f"{results['succeeded']} succeeded, {results['failed']} failed "
                        f"(total: {total_processed})"
                    )

                if self.should_stop:
                    break

                time.sleep(interval)

        except KeyboardInterrupt:
            pass

        # Final summary
        self.stdout.write("\n" + "=" * 40)
        self.stdout.write("Session Summary:")
        self.stdout.write(f"  Total processed: {total_processed}")
        self.stdout.write(f"  Succeeded:       {total_succeeded}")
        self.stdout.write(f"  Failed:          {total_failed}")
        self.stdout.write("=" * 40)

        if total_failed > 0:
            self.stdout.write(
                self.style.WARNING(
                    f"\n{total_failed} documents failed. "
                    "Check logs for details or use --stats to see queue status."
                )
            )
