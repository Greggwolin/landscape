"""
Tests for Landscaper database query layer.

Tests the query builder, intent detection, and RAG context integration.
"""
import pytest
from unittest.mock import patch, MagicMock

from apps.knowledge.services.query_builder import (
    detect_query_intent,
    execute_project_query,
    format_query_results,
    QUERY_TEMPLATES,
    get_available_queries,
)
from apps.knowledge.services.schema_context import (
    get_project_schema_context,
)
from apps.knowledge.services.rag_retrieval import (
    RAGContext,
    retrieve_rag_context,
)


class TestIntentDetection:
    """Test natural language to query template mapping."""

    def test_parcel_count_patterns(self):
        """Test various ways to ask about parcel counts."""
        assert detect_query_intent("How many parcels are in this project?") == 'parcel_count'
        assert detect_query_intent("What's the parcel count?") == 'parcel_count'
        assert detect_query_intent("How many lots does this project have?") == 'parcel_count'
        assert detect_query_intent("Total number of parcels") == 'parcel_count'

    def test_container_patterns(self):
        """Test container/hierarchy questions."""
        assert detect_query_intent("How many areas are there?") == 'container_summary'
        assert detect_query_intent("What's the project structure?") == 'container_summary'
        assert detect_query_intent("Show me the container hierarchy") == 'container_summary'
        assert detect_query_intent("List all phases") == 'container_summary'

    def test_budget_patterns(self):
        """Test budget-related questions."""
        assert detect_query_intent("What's the total budget?") == 'budget_total'
        assert detect_query_intent("How much is the development cost?") == 'budget_total'
        assert detect_query_intent("Show budget breakdown by category") == 'budget_by_category'
        assert detect_query_intent("What are the acquisition costs?") == 'budget_by_activity'

    def test_pricing_patterns(self):
        """Test land use pricing questions."""
        assert detect_query_intent("What's the price per lot?") == 'land_use_pricing'
        assert detect_query_intent("Show me land use pricing") == 'land_use_pricing'
        assert detect_query_intent("What are the pricing assumptions?") == 'land_use_pricing'

    def test_project_details_patterns(self):
        """Test project overview questions."""
        assert detect_query_intent("Tell me about this project") == 'project_details'
        assert detect_query_intent("What is this project?") == 'project_details'
        assert detect_query_intent("Project overview") == 'project_details'

    def test_no_match_returns_none(self):
        """Test that unmatched questions return None."""
        assert detect_query_intent("What's the weather like?") is None
        assert detect_query_intent("Hello") is None
        assert detect_query_intent("random question about nothing") is None


class TestQueryTemplates:
    """Test query template structure and availability."""

    def test_all_templates_have_required_fields(self):
        """Verify all templates have query and description."""
        for key, template in QUERY_TEMPLATES.items():
            assert 'query' in template, f"Template {key} missing 'query'"
            assert 'description' in template, f"Template {key} missing 'description'"
            assert '%s' in template['query'], f"Template {key} missing project_id placeholder"

    def test_get_available_queries(self):
        """Test the list of available queries."""
        queries = get_available_queries()
        assert len(queries) > 0
        assert all('key' in q and 'description' in q for q in queries)


class TestFormatQueryResults:
    """Test query result formatting."""

    def test_format_parcel_count(self):
        """Test parcel count formatting."""
        results = {
            'query_type': 'parcel_count',
            'rows': [{'count': 42}],
            'row_count': 1
        }
        formatted = format_query_results(results)
        assert '42' in formatted
        assert 'parcel' in formatted.lower()

    def test_format_budget_total(self):
        """Test budget total formatting."""
        results = {
            'query_type': 'budget_total',
            'rows': [{'total_budget': 15000000, 'line_items': 150}],
            'row_count': 1
        }
        formatted = format_query_results(results)
        assert '15,000,000' in formatted
        assert '150' in formatted

    def test_format_empty_results(self):
        """Test empty result handling."""
        results = {
            'query_type': 'parcel_count',
            'description': 'Count of parcels',
            'rows': [],
            'row_count': 0
        }
        formatted = format_query_results(results)
        assert 'no data' in formatted.lower() or 'no results' in formatted.lower()

    def test_format_error_results(self):
        """Test error handling in formatting."""
        results = {
            'error': 'Database connection failed',
            'query_type': 'parcel_count',
            'rows': [],
            'row_count': 0
        }
        formatted = format_query_results(results)
        assert 'error' in formatted.lower()


class TestRAGContext:
    """Test RAGContext class functionality."""

    def test_has_db_answer(self):
        """Test database answer detection."""
        ctx = RAGContext()
        assert ctx.has_db_answer() is False

        ctx.db_query_result = "The project has 42 parcels."
        assert ctx.has_db_answer() is True

    def test_has_document_context(self):
        """Test document context detection."""
        ctx = RAGContext()
        assert ctx.has_document_context() is False

        ctx.document_chunks = [{'content': 'test', 'doc_name': 'test.pdf'}]
        assert ctx.has_document_context() is True

    def test_citation_hint_priority(self):
        """Test citation hint follows priority: DB > docs > general."""
        ctx = RAGContext()

        # No sources
        assert 'general' in ctx.get_citation_hint().lower()

        # Only documents
        ctx.document_chunks = [{'doc_name': 'market_study.pdf'}]
        assert 'market_study.pdf' in ctx.get_citation_hint()

        # DB takes priority
        ctx.db_query_result = "Database result"
        assert 'project data' in ctx.get_citation_hint().lower()

    def test_to_prompt_sections_priority(self):
        """Test that prompt sections respect priority."""
        ctx = RAGContext()
        ctx.db_query_result = "DB result"
        ctx.schema_context = "Schema context"
        ctx.document_chunks = [{'content': 'doc content', 'doc_name': 'test.pdf'}]

        sections = ctx.to_prompt_sections()

        assert 'db_query_result' in sections
        assert 'schema_context' in sections
        assert 'document_knowledge' in sections


class TestQueryExecution:
    """Test query execution with mocked database."""

    @patch('apps.knowledge.services.query_builder.connection')
    def test_execute_project_query_success(self, mock_connection):
        """Test successful query execution."""
        mock_cursor = MagicMock()
        mock_cursor.description = [('count',)]
        mock_cursor.fetchall.return_value = [(42,)]
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

        result = execute_project_query(project_id=1, template_key='parcel_count')

        assert result['query_type'] == 'parcel_count'
        assert result['row_count'] == 1
        assert result['rows'][0]['count'] == 42
        assert 'error' not in result

    @patch('apps.knowledge.services.query_builder.connection')
    def test_execute_project_query_error(self, mock_connection):
        """Test query execution error handling."""
        mock_connection.cursor.return_value.__enter__.side_effect = Exception("DB error")

        result = execute_project_query(project_id=1, template_key='parcel_count')

        assert 'error' in result
        assert result['row_count'] == 0

    def test_execute_unknown_template(self):
        """Test handling of unknown template key."""
        result = execute_project_query(project_id=1, template_key='nonexistent_query')

        assert 'error' in result
        assert 'Unknown query type' in result['error']


class TestSchemaContext:
    """Test schema context generation."""

    @patch('apps.knowledge.services.schema_context.connection')
    def test_get_project_schema_context(self, mock_connection):
        """Test schema context generation."""
        mock_cursor = MagicMock()

        # Mock project info query
        mock_cursor.fetchone.side_effect = [
            ('Test Project', 'SFD', 'development', 100.5, '123 Main St', 'Phoenix', 'Maricopa', 'AZ', 500, 80000, 120000, 'napkin'),
            None,  # container summary
            None,  # parcel summary
            None,  # budget summary
            None,  # pricing summary
        ]
        mock_cursor.fetchall.return_value = []
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

        context = get_project_schema_context(1)

        assert 'Test Project' in context
        assert 'PROJECT DATABASE' in context


class TestIntegration:
    """Integration tests for the full flow."""

    @patch('apps.knowledge.services.rag_retrieval.search_similar')
    @patch('apps.knowledge.services.rag_retrieval.get_project_schema_context')
    @patch('apps.knowledge.services.rag_retrieval.execute_project_query')
    @patch('apps.knowledge.services.rag_retrieval.detect_query_intent')
    def test_retrieve_context_db_first(
        self,
        mock_detect,
        mock_execute,
        mock_schema,
        mock_search
    ):
        """Test that DB queries are tried first."""
        mock_detect.return_value = 'parcel_count'
        mock_execute.return_value = {
            'query_type': 'parcel_count',
            'rows': [{'count': 42}],
            'row_count': 1
        }
        mock_schema.return_value = "Schema context"
        mock_search.return_value = []

        context = retrieve_rag_context(
            query="How many parcels?",
            project_id=1
        )

        assert context.db_query_type == 'parcel_count'
        assert context.db_query_result is not None
        assert 'database' in context.sources_used

    @patch('apps.knowledge.services.rag_retrieval.search_similar')
    @patch('apps.knowledge.services.rag_retrieval.get_project_schema_context')
    @patch('apps.knowledge.services.rag_retrieval.detect_query_intent')
    def test_retrieve_context_falls_back_to_rag(
        self,
        mock_detect,
        mock_schema,
        mock_search
    ):
        """Test fallback to RAG when no DB match."""
        mock_detect.return_value = None  # No DB match
        mock_schema.return_value = "Schema context"
        mock_search.return_value = [
            {'content_text': 'Document content', 'source_id': 1, 'source_type': 'document_chunk'}
        ]

        context = retrieve_rag_context(
            query="What does the market study say?",
            project_id=1
        )

        assert context.db_query_type is None
        assert len(context.document_chunks) > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
