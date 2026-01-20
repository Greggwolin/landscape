"""
User Knowledge Retriever - Entity-Fact based.

Provides assumption stats and comparable facts derived from
knowledge_entities and knowledge_facts (no legacy flat tables).
"""

import logging
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

from django.db.models import Q

from ..models import KnowledgeEntity, KnowledgeFact

logger = logging.getLogger(__name__)


@dataclass
class AssumptionStats:
    """Statistics for a specific assumption across a user's projects."""
    predicate: str
    count: int
    avg_value: Optional[float]
    min_value: Optional[float]
    max_value: Optional[float]
    recent_facts: List[Dict[str, Any]]


@dataclass
class UserKnowledgeResult:
    """A single piece of user knowledge from Entity-Fact tables."""
    source_type: str
    content: str
    relevance_score: float
    fact_id: Optional[int]
    entity_id: int
    metadata: Dict[str, Any]


class UserKnowledgeRetriever:
    """
    Retrieve relevant knowledge from the user's Entity-Fact graph.

    This replaces the legacy flat-table retriever.
    """

    def __init__(self, organization_id: Optional[int] = None, user_id: Optional[int] = None):
        self.organization_id = organization_id
        self.user_id = user_id

    def get_assumption_stats(
        self,
        predicate: str,
        property_type: Optional[str] = None,
        msa: Optional[str] = None,
        submarket: Optional[str] = None,
        min_count: int = 3,
    ) -> Optional[AssumptionStats]:
        """Get statistical summary of historical assumptions for a predicate."""
        entity_filter = Q(entity_type='project')

        if property_type:
            entity_filter &= (
                Q(metadata__project_type_code=property_type) |
                Q(metadata__property_type=property_type)
            )
        if msa:
            entity_filter &= Q(metadata__msa__icontains=msa)
        if submarket:
            entity_filter &= Q(metadata__submarket__icontains=submarket)

        project_entities = KnowledgeEntity.objects.filter(entity_filter)
        if not project_entities.exists():
            return None

        full_predicate = f"has_assumption:{predicate}"
        facts = KnowledgeFact.objects.filter(
            subject_entity__in=project_entities,
            predicate=full_predicate,
            is_current=True,
        ).select_related('subject_entity')

        if facts.count() < min_count:
            return None

        values: List[float] = []
        for fact in facts:
            try:
                values.append(float(fact.object_value))
            except (TypeError, ValueError):
                continue

        if len(values) < min_count:
            return None

        recent_facts = facts.order_by('-created_at')[:5]
        recent_list = []
        for fact in recent_facts:
            entity = fact.subject_entity
            recent_list.append({
                'value': float(fact.object_value) if fact.object_value else None,
                'project': entity.metadata.get('project_name') or entity.canonical_name,
                'property_type': entity.metadata.get('project_type_code') or entity.metadata.get('property_type'),
                'geography': entity.metadata.get('submarket') or entity.metadata.get('msa'),
                'date': fact.created_at.isoformat() if fact.created_at else None,
                'source': fact.source_type,
                'confidence': float(fact.confidence_score) if fact.confidence_score else None,
            })

        return AssumptionStats(
            predicate=predicate,
            count=len(values),
            avg_value=sum(values) / len(values),
            min_value=min(values),
            max_value=max(values),
            recent_facts=recent_list,
        )

    def get_comparison_table(
        self,
        current_values: Dict[str, Any],
        property_type: str,
        msa: Optional[str] = None,
    ) -> Dict[str, Dict[str, Any]]:
        """Compare current values against historical assumptions."""
        comparison: Dict[str, Dict[str, Any]] = {}

        for predicate, current_value in current_values.items():
            if current_value is None:
                continue

            stats = self.get_assumption_stats(
                predicate=predicate,
                property_type=property_type,
                msa=msa,
            )

            if stats:
                deviation_pct = None
                if stats.avg_value and stats.avg_value != 0:
                    deviation_pct = ((current_value - stats.avg_value) / stats.avg_value) * 100

                comparison[predicate] = {
                    'current': current_value,
                    'user_avg': stats.avg_value,
                    'user_min': stats.min_value,
                    'user_max': stats.max_value,
                    'user_count': stats.count,
                    'deviation_pct': deviation_pct,
                    'flag': self._get_deviation_flag(deviation_pct),
                    'recent': stats.recent_facts[:3],
                }
            else:
                comparison[predicate] = {
                    'current': current_value,
                    'user_avg': None,
                    'user_count': 0,
                    'flag': 'no_history',
                }

        return comparison

    def get_comparable_facts(
        self,
        comp_type: str,
        property_type: Optional[str] = None,
        msa: Optional[str] = None,
        limit: int = 10,
    ) -> List[UserKnowledgeResult]:
        """Get comparable property facts from the knowledge graph."""
        entity_filter = Q(entity_type='property')
        if property_type:
            entity_filter &= Q(metadata__property_type=property_type)
        if msa:
            entity_filter &= (
                Q(metadata__msa__icontains=msa) |
                Q(metadata__city__icontains=msa)
            )

        property_entities = KnowledgeEntity.objects.filter(entity_filter)
        if not property_entities.exists():
            return []

        predicate_filter = {
            'sale': ['sale_price', 'price_per_unit', 'sale_cap_rate'],
            'rent': ['asking_rent', 'effective_rent', 'rent_per_sf'],
            'expense': ['expenses_per_unit', 'expense_ratio'],
        }.get(comp_type, [])

        if not predicate_filter:
            return []

        facts = KnowledgeFact.objects.filter(
            subject_entity__in=property_entities,
            predicate__in=predicate_filter,
            is_current=True,
        ).select_related('subject_entity').order_by('-created_at')[:limit]

        results: List[UserKnowledgeResult] = []
        for fact in facts:
            entity = fact.subject_entity
            content = self._format_comp_fact(entity, fact, comp_type)
            results.append(UserKnowledgeResult(
                source_type='comparable',
                content=content,
                relevance_score=float(fact.confidence_score) if fact.confidence_score else 0.85,
                fact_id=fact.fact_id,
                entity_id=entity.entity_id,
                metadata={
                    'property_name': entity.canonical_name,
                    'address': entity.metadata.get('address'),
                    'city': entity.metadata.get('city'),
                    'state': entity.metadata.get('state'),
                    'property_type': entity.metadata.get('property_type'),
                    'predicate': fact.predicate,
                    'value': fact.object_value,
                    'source': fact.source_type,
                    'confidence': float(fact.confidence_score) if fact.confidence_score else None,
                },
            ))

        return results

    def format_for_prompt(
        self,
        assumption_stats: Dict[str, AssumptionStats],
        comparables: Optional[List[UserKnowledgeResult]] = None,
    ) -> str:
        """Format user knowledge for injection into system prompt."""
        lines: List[str] = []

        if assumption_stats:
            lines.append("From your previous projects:")
            for predicate, stats in assumption_stats.items():
                if not stats:
                    continue
                label = predicate.replace('_', ' ').title()

                if any(x in predicate for x in ['rate', 'ratio', 'pct']):
                    avg_str = f"{stats.avg_value * 100:.1f}%"
                    range_str = f"{stats.min_value * 100:.1f}%-{stats.max_value * 100:.1f}%"
                else:
                    avg_str = f"{stats.avg_value:,.2f}"
                    range_str = f"{stats.min_value:,.2f}-{stats.max_value:,.2f}"

                lines.append(f"  • {label}: avg {avg_str} (range: {range_str}, n={stats.count})")

                for recent in stats.recent_facts[:2]:
                    proj = recent.get('project') or 'Unknown'
                    geo = recent.get('geography') or ''
                    if any(x in predicate for x in ['rate', 'ratio', 'pct']):
                        val = f"{recent['value'] * 100:.1f}%" if recent.get('value') is not None else "—"
                    else:
                        val = f"{recent['value']:,.2f}" if recent.get('value') is not None else "—"
                    lines.append(f"    - {proj} ({geo}): {val}")

            lines.append("")

        if comparables:
            lines.append("From your comparable database:")
            for comp in comparables[:5]:
                lines.append(f"  • {comp.content}")
            lines.append("")

        return "\n".join(lines)

    def format_comparison_for_prompt(self, comparison: Dict[str, Dict[str, Any]]) -> str:
        """Format comparison table for system prompt."""
        if not comparison:
            return ""

        lines = ["Comparison to your historical assumptions:"]
        lines.append("| Metric | Current | Your Avg | Range | Status |")
        lines.append("|--------|---------|----------|-------|--------|")

        for predicate, data in comparison.items():
            current = data.get('current')
            avg = data.get('user_avg')
            min_val = data.get('user_min')
            max_val = data.get('user_max')
            flag = data.get('flag', 'unknown')

            is_pct = any(x in predicate for x in ['rate', 'ratio', 'pct'])
            if is_pct:
                current_str = f"{current * 100:.1f}%" if current is not None else "—"
                avg_str = f"{avg * 100:.1f}%" if avg is not None else "—"
                range_str = (
                    f"{min_val * 100:.1f}-{max_val * 100:.1f}%"
                    if min_val is not None and max_val is not None else "—"
                )
            else:
                current_str = f"${current:,.0f}" if current is not None else "—"
                avg_str = f"${avg:,.0f}" if avg is not None else "—"
                range_str = (
                    f"${min_val:,.0f}-${max_val:,.0f}"
                    if min_val is not None and max_val is not None else "—"
                )

            flag_emoji = {
                'normal': '✓',
                'slight_deviation': '↕',
                'notable_deviation': '⚠',
                'significant_deviation': '⚠⚠',
                'no_history': '—',
            }.get(flag, '?')

            label = predicate.replace('_', ' ').title()
            lines.append(f"| {label} | {current_str} | {avg_str} | {range_str} | {flag_emoji} |")

        return "\n".join(lines)

    def _format_comp_fact(
        self,
        entity: KnowledgeEntity,
        fact: KnowledgeFact,
        comp_type: str,
    ) -> str:
        """Format a comparable fact as a human-readable string."""
        name = entity.canonical_name
        city = entity.metadata.get('city', '')
        state = entity.metadata.get('state', '')
        location = f"{city}, {state}" if city else ''

        predicate = fact.predicate
        value = fact.object_value

        if value is None:
            value = "—"
        else:
            try:
                if any(x in predicate for x in ['price', 'expense', 'rent']):
                    value = f"${float(value):,.0f}"
                elif any(x in predicate for x in ['cap_rate', 'ratio']):
                    value = f"{float(value) * 100:.2f}%"
            except (ValueError, TypeError):
                pass

        return f"{name} ({location}): {predicate} = {value}"

    def _get_deviation_flag(self, deviation_pct: Optional[float]) -> str:
        if deviation_pct is None:
            return 'unknown'
        abs_dev = abs(deviation_pct)
        if abs_dev <= 5:
            return 'normal'
        if abs_dev <= 15:
            return 'slight_deviation'
        if abs_dev <= 30:
            return 'notable_deviation'
        return 'significant_deviation'


_retriever: Optional[UserKnowledgeRetriever] = None


def get_user_knowledge_retriever(
    organization_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> UserKnowledgeRetriever:
    """Singleton helper to reuse retriever instances."""
    global _retriever
    if _retriever is None:
        _retriever = UserKnowledgeRetriever(organization_id=organization_id, user_id=user_id)
    return _retriever
