"""
Entity-Fact Retriever - Query knowledge graph for Landscaper context.

This service retrieves knowledge from the Entity-Fact tables for injection
into the Landscaper system prompt. It provides structured context about
project assumptions with provenance information.

Usage:
    retriever = EntityFactRetriever(project_id=123)
    context = retriever.get_project_knowledge_context()
    # Returns formatted string for system prompt injection
"""

import logging
from typing import Optional, List, Dict, Any
from decimal import Decimal

from ..models import KnowledgeEntity, KnowledgeFact

logger = logging.getLogger(__name__)


class EntityFactRetriever:
    """
    Retrieve knowledge from Entity-Fact tables for Landscaper context.

    Queries knowledge_entities and knowledge_facts to build structured
    context for the AI system prompt.
    """

    def __init__(self, project_id: int):
        """
        Initialize the retriever.

        Args:
            project_id: The project to retrieve knowledge for
        """
        self.project_id = project_id

    def get_project_knowledge_context(self) -> str:
        """
        Build natural language context from Entity-Fact graph.

        Returns:
            Formatted text for system prompt injection, empty string if no data
        """
        # Get project entity
        project_entity = self._get_project_entity()
        if not project_entity:
            return ""

        # Get all current facts for this project
        facts = self._get_current_facts(project_entity.entity_id)

        if not facts:
            return ""

        # Group facts by category
        assumption_facts = [f for f in facts if f.predicate.startswith('has_assumption:')]
        relationship_facts = [f for f in facts if not f.predicate.startswith('has_assumption:')]

        sections = []

        # Format assumption facts
        if assumption_facts:
            sections.append(self._format_assumption_facts(assumption_facts))

        # Format relationship facts
        if relationship_facts:
            sections.append(self._format_relationship_facts(relationship_facts))

        return "\n\n".join(sections)

    def _get_project_entity(self) -> Optional[KnowledgeEntity]:
        """Get the project entity."""
        try:
            return KnowledgeEntity.objects.get(canonical_name=f"project:{self.project_id}")
        except KnowledgeEntity.DoesNotExist:
            return None

    def _get_current_facts(self, entity_id: int) -> List[KnowledgeFact]:
        """Get all current (non-superseded) facts for an entity."""
        return list(KnowledgeFact.objects.filter(
            subject_entity_id=entity_id,
            is_current=True
        ).select_related('object_entity').order_by('predicate'))

    def _format_assumption_facts(self, facts: List[KnowledgeFact]) -> str:
        """Format assumption facts as natural language."""
        lines = ["## Knowledge Graph - Project Assumptions"]
        lines.append("These values have been tracked with full provenance:\n")

        # Group by category for cleaner output
        categories = {}
        for fact in facts:
            key = fact.predicate.replace('has_assumption:', '')
            category = self._categorize_assumption(key)
            if category not in categories:
                categories[category] = []
            categories[category].append((key, fact))

        for category, items in sorted(categories.items()):
            lines.append(f"**{category}:**")
            for key, fact in items:
                value = fact.object_value
                formatted_value = self._format_value(key, value)

                # Add provenance info
                source_info = self._get_source_info(fact)
                lines.append(f"  - {self._format_key(key)}: {formatted_value}{source_info}")
            lines.append("")

        return "\n".join(lines)

    def _format_relationship_facts(self, facts: List[KnowledgeFact]) -> str:
        """Format relationship facts."""
        lines = ["## Entity Relationships"]

        for fact in facts:
            obj_display = fact.object_entity.canonical_name if fact.object_entity else fact.object_value
            lines.append(f"- {fact.predicate} → {obj_display}")

        return "\n".join(lines)

    def _categorize_assumption(self, key: str) -> str:
        """Categorize an assumption key."""
        key_lower = key.lower()

        if any(x in key_lower for x in ['rent', 'revenue', 'income', 'lease']):
            return "Revenue"
        elif any(x in key_lower for x in ['vacancy', 'occupancy', 'loss', 'collection']):
            return "Vacancy & Loss"
        elif any(x in key_lower for x in ['expense', 'opex', 'management', 'insurance', 'tax', 'utility']):
            return "Expenses"
        elif any(x in key_lower for x in ['cap_rate', 'discount', 'yield', 'irr', 'npv']):
            return "Valuation"
        elif any(x in key_lower for x in ['price', 'acquisition', 'purchase', 'sale']):
            return "Pricing"
        elif any(x in key_lower for x in ['growth', 'escalation', 'inflation']):
            return "Growth Rates"
        elif any(x in key_lower for x in ['ltv', 'loan', 'debt', 'interest', 'amortization', 'dscr']):
            return "Financing"
        else:
            return "Other"

    def _format_key(self, key: str) -> str:
        """Format an assumption key for display."""
        # Convert snake_case to Title Case
        return key.replace('_', ' ').title()

    def _format_value(self, key: str, value: str) -> str:
        """Format a value based on its type."""
        if not value:
            return "N/A"

        try:
            # Detect percentages
            if any(x in key.lower() for x in ['rate', 'pct', 'ratio', 'yield', 'growth']):
                num = float(value)
                # If value is already a decimal (0.05), convert to percentage
                if abs(num) < 1:
                    return f"{num * 100:.2f}%"
                else:
                    return f"{num:.2f}%"

            # Detect currency
            if any(x in key.lower() for x in ['price', 'rent', 'cost', 'income', 'expense', 'amount', 'noi']):
                num = float(value)
                if num >= 1000000:
                    return f"${num/1000000:.2f}M"
                elif num >= 1000:
                    return f"${num/1000:.1f}K"
                else:
                    return f"${num:,.2f}"

            # Default: return as-is
            return value

        except (ValueError, TypeError):
            return value

    def _get_source_info(self, fact: KnowledgeFact) -> str:
        """Get provenance information for a fact."""
        source_map = {
            'user_input': 'user-entered',
            'document_extract': 'extracted from document',
            'ai_inference': 'AI-suggested',
            'user_correction': 'user-corrected',
            'market_data': 'from market data',
            'calculation': 'calculated',
            'import': 'imported',
        }

        source_label = source_map.get(fact.source_type, fact.source_type)

        # Add confidence if not 100%
        confidence = float(fact.confidence_score) if fact.confidence_score else 1.0
        if confidence < 1.0:
            return f" ({source_label}, {confidence:.0%} confidence)"
        else:
            return f" ({source_label})"

    def get_fact_history(
        self,
        assumption_key: str,
        include_superseded: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get history of a specific assumption across versions.

        Useful for showing how a value changed over time.

        Args:
            assumption_key: The assumption field name
            include_superseded: Whether to include superseded versions

        Returns:
            List of fact dictionaries ordered by created_at desc
        """
        project_entity = self._get_project_entity()
        if not project_entity:
            return []

        predicate = f"has_assumption:{assumption_key}"

        query = KnowledgeFact.objects.filter(
            subject_entity_id=project_entity.entity_id,
            predicate=predicate
        )

        if not include_superseded:
            query = query.filter(is_current=True)

        facts = query.order_by('-created_at')

        return [
            {
                'fact_id': f.fact_id,
                'value': f.object_value,
                'source_type': f.source_type,
                'source_id': f.source_id,
                'confidence': float(f.confidence_score) if f.confidence_score else None,
                'is_current': f.is_current,
                'created_at': f.created_at.isoformat() if f.created_at else None,
                'superseded_by': f.superseded_by_id,
            }
            for f in facts
        ]

    def get_facts_summary(self) -> Dict[str, Any]:
        """
        Get a summary of facts for this project.

        Returns:
            Dict with count, categories, and recent facts
        """
        project_entity = self._get_project_entity()
        if not project_entity:
            return {'count': 0, 'categories': {}, 'recent': []}

        facts = self._get_current_facts(project_entity.entity_id)

        # Count by category
        categories = {}
        for fact in facts:
            if fact.predicate.startswith('has_assumption:'):
                key = fact.predicate.replace('has_assumption:', '')
                category = self._categorize_assumption(key)
                categories[category] = categories.get(category, 0) + 1

        # Get recent facts
        recent_facts = KnowledgeFact.objects.filter(
            subject_entity_id=project_entity.entity_id,
            is_current=True
        ).order_by('-created_at')[:5]

        recent = [
            {
                'predicate': f.predicate,
                'value': f.object_value,
                'source_type': f.source_type,
                'created_at': f.created_at.isoformat() if f.created_at else None,
            }
            for f in recent_facts
        ]

        return {
            'count': len(facts),
            'categories': categories,
            'recent': recent,
        }


def get_entity_fact_context(project_id: int) -> str:
    """
    Convenience function to get Entity-Fact context for a project.

    Args:
        project_id: The project ID

    Returns:
        Formatted context string for system prompt
    """
    retriever = EntityFactRetriever(project_id)
    return retriever.get_project_knowledge_context()
