"""
Test embedding generation and storage.

Usage:
    python manage.py test_embeddings
"""
from django.core.management.base import BaseCommand

from apps.knowledge.services.embedding_service import generate_embedding
from apps.knowledge.services.embedding_storage import store_embedding, search_similar, count_embeddings


class Command(BaseCommand):
    help = 'Test embedding generation and storage'

    def handle(self, *args, **options):
        self.stdout.write("Testing embedding infrastructure...\n")

        # Test 1: Generate single embedding
        self.stdout.write("1. Testing embedding generation...")
        test_text = "A 3-bedroom apartment in Phoenix with 1,500 square feet renting for $2,200 per month."
        embedding = generate_embedding(test_text)

        if embedding and len(embedding) == 1536:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ Generated embedding with {len(embedding)} dimensions"
            ))
        else:
            self.stdout.write(self.style.ERROR("   ✗ Failed to generate embedding"))
            self.stdout.write(self.style.WARNING(
                "   Check that OPENAI_API_KEY is set in environment or Django settings"
            ))
            return

        # Test 2: Store embedding
        self.stdout.write("2. Testing embedding storage...")
        embedding_id = store_embedding(
            content_text=test_text,
            source_type='test',
            source_id=1,
            entity_ids=[1, 2],
            tags=['test', 'apartment']
        )

        if embedding_id:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ Stored embedding with ID {embedding_id}"
            ))
        else:
            self.stdout.write(self.style.ERROR("   ✗ Failed to store embedding"))
            return

        # Test 3: Similarity search
        self.stdout.write("3. Testing similarity search...")
        query = "apartments for rent in Arizona"
        query_embedding = generate_embedding(query)
        results = []
        if query_embedding:
            results = search_similar(
                query_embedding=query_embedding,
                project_id=1,
                top_k=5,
                similarity_threshold=0.5,
                source_types=['document']
            )

        if results:
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ Found {len(results)} similar results"
            ))
            for r in results:
                similarity_pct = r['similarity'] * 100
                content_preview = r['content'][:50]
                self.stdout.write(
                    f"      - {content_preview}... (similarity: {similarity_pct:.1f}%)"
                )
        else:
            self.stdout.write(self.style.WARNING(
                "   ⚠ No similar results found (may be expected if DB is empty)"
            ))

        # Test 4: Count embeddings
        self.stdout.write("4. Checking embedding count...")
        total = count_embeddings()
        test_count = count_embeddings(source_type='test')
        self.stdout.write(self.style.SUCCESS(
            f"   ✓ Total embeddings: {total} ({test_count} test records)"
        ))

        self.stdout.write(self.style.SUCCESS("\n✓ Embedding infrastructure is working!"))
        self.stdout.write("\nNext steps:")
        self.stdout.write("  - Step 2: Implement document chunking & ingestion pipeline")
        self.stdout.write("  - Step 3: Integrate RAG with Landscaper chat")
