"""Source registry normalization, matching, and count refresh helpers."""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

from django.db.models import Count, Max

from ..models import KnowledgeSource, PlatformKnowledge

SOURCE_TYPE_VALUES = {
    'publisher',
    'brokerage',
    'government',
    'academic',
    'trade_association',
    'data_provider',
    'other',
}

_COMMON_SUFFIXES = {
    'inc',
    'incorporated',
    'llc',
    'group',
    'international',
    'intl',
    'corp',
    'corporation',
    'co',
    'company',
    'ltd',
    'limited',
}


def _clean_text(value: str) -> str:
    text = (value or '').strip().lower()
    text = text.replace('&', ' and ')
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize_source_name(value: str) -> str:
    """Normalize source names for dedupe/matching across alias variants."""
    normalized = _clean_text(value)
    if not normalized:
        return ''

    tokens = normalized.split()
    while len(tokens) > 1 and tokens[-1] in _COMMON_SUFFIXES:
        tokens.pop()

    return ' '.join(tokens)


def _normalized_variants(value: str) -> List[str]:
    norm = normalize_source_name(value)
    if not norm:
        return []

    variants = {norm}
    if ' and ' in norm:
        variants.add(norm.replace(' and ', ' '))
    return sorted(variants)


def _candidate_values(source: KnowledgeSource) -> List[Tuple[str, str]]:
    values: List[Tuple[str, str]] = [('source_name', source.source_name)]
    for alias in source.aliases or []:
        if isinstance(alias, str) and alias.strip():
            values.append(('alias', alias.strip()))
    return values


def _score_match(input_norm: str, candidate_norm: str) -> float:
    if not input_norm or not candidate_norm:
        return 0.0
    if input_norm == candidate_norm:
        return 1.0

    input_tokens = set(input_norm.split())
    cand_tokens = set(candidate_norm.split())
    if not input_tokens or not cand_tokens:
        return 0.0

    intersection = input_tokens & cand_tokens
    token_recall = len(intersection) / len(input_tokens)
    token_precision = len(intersection) / len(cand_tokens)
    token_jaccard = len(intersection) / len(input_tokens | cand_tokens)

    ratio = SequenceMatcher(None, input_norm, candidate_norm).ratio()

    score = max(ratio, token_jaccard, token_recall * 0.9, token_precision * 0.85)

    if input_norm in candidate_norm or candidate_norm in input_norm:
        score = max(score, 0.9)

    if input_tokens == cand_tokens:
        score = max(score, 0.97)

    return min(score, 1.0)


def _serialize_match(
    *,
    matched: bool,
    source: Optional[KnowledgeSource],
    confidence: float,
    match_type: str,
    matched_value: Optional[str],
    create_name: Optional[str],
) -> Dict[str, Any]:
    return {
        'matched': matched,
        'source': source,
        'confidence': round(confidence, 4),
        'match_type': match_type,
        'matched_value': matched_value,
        'create_suggestion': ({'name': create_name} if create_name else None),
    }


def match_source_name(name: str, min_confidence: float = 0.82) -> Dict[str, Any]:
    """
    Match a free-text source name to canonical source registry entries.

    Matching strategy:
    1. exact normalized source_name/alias
    2. fuzzy normalized match across source_name + aliases
    3. return create suggestion when confidence is below threshold
    """
    raw_name = (name or '').strip()
    if not raw_name:
        return _serialize_match(
            matched=False,
            source=None,
            confidence=0.0,
            match_type='none',
            matched_value=None,
            create_name=None,
        )

    source_rows = list(KnowledgeSource.objects.filter(is_active=True).order_by('source_name'))
    if not source_rows:
        return _serialize_match(
            matched=False,
            source=None,
            confidence=0.0,
            match_type='none',
            matched_value=None,
            create_name=raw_name,
        )

    input_variants = _normalized_variants(raw_name)

    # Pass 1: exact normalized match
    for source in source_rows:
        for value_kind, value in _candidate_values(source):
            candidate_variants = _normalized_variants(value)
            for in_norm in input_variants:
                if in_norm and in_norm in candidate_variants:
                    return _serialize_match(
                        matched=True,
                        source=source,
                        confidence=1.0 if value_kind == 'source_name' else 0.98,
                        match_type='source_exact' if value_kind == 'source_name' else 'alias_exact',
                        matched_value=value,
                        create_name=None,
                    )

    # Pass 2: fuzzy
    best: Dict[str, Any] = {
        'score': 0.0,
        'source': None,
        'value_kind': None,
        'value': None,
    }
    for source in source_rows:
        for value_kind, value in _candidate_values(source):
            candidate_variants = _normalized_variants(value)
            for in_norm in input_variants:
                for cand_norm in candidate_variants:
                    score = _score_match(in_norm, cand_norm)
                    if score > best['score']:
                        best = {
                            'score': score,
                            'source': source,
                            'value_kind': value_kind,
                            'value': value,
                        }

    best_source = best['source']
    best_score = float(best['score'])
    if best_source and best_score >= min_confidence:
        value_kind = str(best['value_kind'])
        match_type = 'source_fuzzy' if value_kind == 'source_name' else 'alias_fuzzy'
        return _serialize_match(
            matched=True,
            source=best_source,
            confidence=best_score,
            match_type=match_type,
            matched_value=best.get('value'),
            create_name=None,
        )

    return _serialize_match(
        matched=False,
        source=None,
        confidence=best_score,
        match_type='no_match',
        matched_value=None,
        create_name=raw_name,
    )


def search_sources(query: str, limit: int = 100) -> List[KnowledgeSource]:
    """Search source_name + aliases with case-insensitive local matching."""
    q = (query or '').strip()
    base_qs = KnowledgeSource.objects.filter(is_active=True).order_by('source_name')
    if not q:
        return list(base_qs[:limit])

    q_lower = q.lower()
    q_norm = normalize_source_name(q)

    ranked: List[Tuple[float, str, KnowledgeSource]] = []
    for source in base_qs:
        best_score = 0.0
        best_label = source.source_name.lower()

        if q_lower in source.source_name.lower():
            best_score = max(best_score, 1.0)

        for alias in source.aliases or []:
            if not isinstance(alias, str):
                continue
            alias_lower = alias.lower()
            if q_lower in alias_lower:
                best_score = max(best_score, 0.98)

        source_norm = normalize_source_name(source.source_name)
        if q_norm and source_norm:
            best_score = max(best_score, _score_match(q_norm, source_norm))

        for alias in source.aliases or []:
            if not isinstance(alias, str):
                continue
            alias_norm = normalize_source_name(alias)
            if q_norm and alias_norm:
                best_score = max(best_score, _score_match(q_norm, alias_norm))

        if best_score >= 0.65:
            ranked.append((best_score, best_label, source))

    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [item[2] for item in ranked[:limit]]


def refresh_source_document_counts() -> int:
    """Recompute source document counts from platform knowledge truth table."""
    KnowledgeSource.objects.all().update(document_count=0)

    counts = (
        PlatformKnowledge.objects.filter(source_id__isnull=False)
        .values('source_id')
        .annotate(document_count=Count('id'), last_seen=Max('updated_at'))
    )

    updated = 0
    for row in counts:
        source_id = row['source_id']
        doc_count = row['document_count'] or 0
        last_seen = row['last_seen']
        updated += KnowledgeSource.objects.filter(id=source_id).update(
            document_count=doc_count,
            last_seen_at=last_seen,
        )

    return updated
