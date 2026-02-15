"""
Global Knowledge Retrieval Service

Provides Tier 2 context for Landscaper by searching across ALL projects,
ALL documents, and ALL platform knowledge — regardless of which project
the user is currently working in.

This complements the existing project-scoped (Tier 1) context by enabling
cross-project queries like "what were the per-unit rehab costs on the Peoria project?"
"""

import logging
import re
import time
from typing import Dict, Any, List, Optional

from django.db import connection

from .embedding_service import generate_embedding

logger = logging.getLogger(__name__)

# Token budget for global context (characters — roughly 4 chars per token)
MAX_GLOBAL_CONTEXT_CHARS = 12000  # ~3,000 tokens


def retrieve_global_context(
    query: str,
    current_project_id: Optional[int] = None,
    max_chars: int = MAX_GLOBAL_CONTEXT_CHARS,
) -> Dict[str, Any]:
    """
    Retrieve global knowledge across all projects and platform documents.

    Returns a dict with:
      - 'text': formatted context string for the system prompt
      - 'cross_project_refs': list of project names referenced
      - 'platform_chunks_used': count of platform knowledge chunks used
      - 'global_doc_chunks_used': count of cross-project doc chunks used
      - 'project_summaries_used': count of project summaries included
    """
    t0 = time.time()

    # Step 1: Detect cross-project signals in the query
    signals = _detect_cross_project_signals(query, current_project_id)

    sections = []
    meta = {
        'cross_project_refs': [],
        'platform_chunks_used': 0,
        'global_doc_chunks_used': 0,
        'project_summaries_used': 0,
    }
    chars_remaining = max_chars

    # Step 2: If specific projects are referenced, fetch their summaries
    if signals.get('referenced_projects'):
        summaries_text, summaries_used = _get_project_summaries(
            signals['referenced_projects'], current_project_id
        )
        if summaries_text:
            sections.append(summaries_text)
            chars_remaining -= len(summaries_text)
            meta['project_summaries_used'] = summaries_used
            meta['cross_project_refs'] = [
                p['name'] for p in signals['referenced_projects']
            ]

    # Step 3: Search cross-project document embeddings
    if chars_remaining > 1000:
        doc_text, doc_count = _search_global_embeddings(
            query, current_project_id,
            max_chars=min(chars_remaining // 2, 5000),
            top_k=5
        )
        if doc_text:
            sections.append(doc_text)
            chars_remaining -= len(doc_text)
            meta['global_doc_chunks_used'] = doc_count

    # Step 4: Search platform knowledge chunks
    if chars_remaining > 1000:
        pk_text, pk_count = _search_platform_knowledge(
            query,
            max_chars=min(chars_remaining, 4000),
            top_k=5
        )
        if pk_text:
            sections.append(pk_text)
            chars_remaining -= len(pk_text)
            meta['platform_chunks_used'] = pk_count

    # Step 5: If broad query (comparative, benchmark, across-all), add project inventory
    if signals.get('is_broad_query') and chars_remaining > 500:
        inventory_text = _get_project_inventory(current_project_id)
        if inventory_text:
            sections.append(inventory_text)
            chars_remaining -= len(inventory_text)

    elapsed = time.time() - t0
    logger.info(
        "[GLOBAL_KNOWLEDGE] Retrieved in %.2fs: %d project summaries, "
        "%d doc chunks, %d platform chunks, %d chars used",
        elapsed, meta['project_summaries_used'],
        meta['global_doc_chunks_used'], meta['platform_chunks_used'],
        max_chars - chars_remaining
    )
    print(
        f"[TIMING] global_knowledge: {elapsed:.2f}s "
        f"(projects={meta['project_summaries_used']}, "
        f"docs={meta['global_doc_chunks_used']}, "
        f"platform={meta['platform_chunks_used']})"
    )

    combined_text = "\n\n".join(sections) if sections else ""
    meta['text'] = combined_text
    return meta


# ─────────────────────────────────────────────
# Cross-Project Signal Detection
# ─────────────────────────────────────────────

def _detect_cross_project_signals(
    query: str, current_project_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Analyze the user's message for cross-project intent.

    Returns:
      - referenced_projects: list of {project_id, name} that were mentioned
      - is_broad_query: True if comparative or benchmark language detected
      - needs_global: True if any cross-project signal found
    """
    signals = {
        'referenced_projects': [],
        'is_broad_query': False,
        'needs_global': False,
    }
    query_lower = query.lower()

    # Detect comparative / benchmark / cross-project language
    broad_patterns = [
        r'compared?\s+to', r'vs\.?\s', r'versus',
        r'across\s+(?:all\s+)?projects?', r'other\s+projects?',
        r'all\s+(?:my\s+)?projects?', r'portfolio',
        r'industry\s+standard', r'benchmark', r'typical\s+(?:for|in)',
        r'what[\'s]*\s+(?:normal|average|standard|common)',
        r'how\s+(?:many|much)\s+projects?',
        r'which\s+project', r'best\s+project', r'worst\s+project',
        r'market\s+(?:data|trends?|research|conditions?|report)',
    ]
    for pattern in broad_patterns:
        if re.search(pattern, query_lower):
            signals['is_broad_query'] = True
            signals['needs_global'] = True
            break

    # Match mentioned project names against actual projects in the database
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT project_id, project_name
                FROM landscape.tbl_project
                WHERE is_active = true
            """)
            all_projects = cursor.fetchall()

        for pid, pname in all_projects:
            if pid == current_project_id:
                continue  # Skip current project (already in Tier 1)
            # Match if the project name (or a significant substring) appears in the query
            name_lower = pname.lower()
            # Try full name match first
            if name_lower in query_lower:
                signals['referenced_projects'].append({'project_id': pid, 'name': pname})
                signals['needs_global'] = True
                continue
            # Try matching first two words (e.g., "Peoria Meadows" from "Peoria Meadows MPC")
            words = name_lower.split()
            if len(words) >= 2:
                short_name = ' '.join(words[:2])
                if short_name in query_lower:
                    signals['referenced_projects'].append({'project_id': pid, 'name': pname})
                    signals['needs_global'] = True
                    continue
            # Try single-word match for distinctive project names (>5 chars)
            if len(words) >= 1 and len(words[0]) > 5 and words[0] in query_lower:
                signals['referenced_projects'].append({'project_id': pid, 'name': pname})
                signals['needs_global'] = True

    except Exception as e:
        logger.warning("Failed to match project names: %s", e)

    return signals


# ─────────────────────────────────────────────
# Data Retrieval Functions
# ─────────────────────────────────────────────

def _get_project_summaries(
    referenced_projects: List[Dict], current_project_id: Optional[int]
) -> tuple:
    """
    Get structured summaries for specifically referenced projects.
    Returns (formatted_text, count).
    """
    if not referenced_projects:
        return "", 0

    project_ids = [p['project_id'] for p in referenced_projects if p['project_id'] != current_project_id]
    if not project_ids:
        return "", 0

    try:
        with connection.cursor() as cursor:
            placeholders = ','.join(['%s'] * len(project_ids))

            # Get project basics + financials
            cursor.execute(f"""
                SELECT
                    p.project_id, p.project_name, p.project_type,
                    p.jurisdiction_city, p.jurisdiction_state,
                    p.acres_gross, p.target_units,
                    p.price_range_low, p.price_range_high,
                    (SELECT COUNT(*) FROM landscape.core_doc d WHERE d.project_id = p.project_id AND d.deleted_at IS NULL) as doc_count,
                    (SELECT SUM(amount) FROM landscape.tbl_budget_items WHERE project_id = p.project_id) as total_budget
                FROM landscape.tbl_project p
                WHERE p.project_id IN ({placeholders})
            """, project_ids)

            rows = cursor.fetchall()
            if not rows:
                return "", 0

            lines = ["CROSS-PROJECT DATA (referenced projects):"]
            for row in rows:
                pid, name, ptype, city, state = row[0], row[1], row[2], row[3], row[4]
                acres, units = row[5], row[6]
                price_low, price_high = row[7], row[8]
                doc_count, total_budget = row[9], row[10]

                lines.append(f"\n--- {name} ---")
                if ptype:
                    lines.append(f"  Type: {ptype}")
                if city and state:
                    lines.append(f"  Location: {city}, {state}")
                if acres:
                    lines.append(f"  Acres: {acres}")
                if units:
                    lines.append(f"  Target units/lots: {units}")
                if price_low and price_high:
                    lines.append(f"  Price range: ${price_low:,.0f} - ${price_high:,.0f}")
                if total_budget:
                    lines.append(f"  Total budget: ${float(total_budget):,.0f}")
                if doc_count:
                    lines.append(f"  Documents: {doc_count}")

                # Fetch key budget breakdown by activity
                cursor.execute("""
                    SELECT COALESCE(activity, 'Unassigned') as activity_name, SUM(amount) as total
                    FROM landscape.core_fin_fact_budget
                    WHERE project_id = %s AND amount IS NOT NULL
                    GROUP BY activity_name
                    ORDER BY total DESC
                    LIMIT 8
                """, [pid])
                budget_rows = cursor.fetchall()
                if budget_rows:
                    lines.append("  Budget breakdown:")
                    for brow in budget_rows:
                        lines.append(f"    {brow[0]}: ${float(brow[1]):,.0f}")

                # Fetch operating expenses if available
                cursor.execute("""
                    SELECT category_name, amount, amount_psf
                    FROM landscape.tbl_operating_expense
                    WHERE project_id = %s
                    ORDER BY amount DESC NULLS LAST
                    LIMIT 10
                """, [pid])
                opex_rows = cursor.fetchall()
                if opex_rows:
                    lines.append("  Operating expenses:")
                    for orow in opex_rows:
                        parts = [f"    {orow[0]}:"]
                        if orow[1]:
                            parts.append(f"${float(orow[1]):,.0f}/yr")
                        if orow[2]:
                            parts.append(f"(${float(orow[2]):,.2f}/SF)")
                        lines.append(" ".join(parts))

            return "\n".join(lines), len(rows)

    except Exception as e:
        logger.warning("Failed to get project summaries: %s", e)
        return "", 0


def _search_global_embeddings(
    query: str,
    current_project_id: Optional[int],
    max_chars: int = 5000,
    top_k: int = 5
) -> tuple:
    """
    Search document embeddings across ALL projects (excluding current).
    Returns (formatted_text, chunk_count).
    """
    try:
        query_embedding = generate_embedding(query)
        if not query_embedding:
            return "", 0

        with connection.cursor() as cursor:
            # Search all document chunks, excluding current project
            exclude_clause = ""
            params = [query_embedding, query_embedding, 0.6, query_embedding, top_k]
            if current_project_id:
                exclude_clause = "AND (d.project_id != %s OR d.project_id IS NULL)"
                params = [query_embedding, current_project_id, query_embedding, 0.6, query_embedding, top_k]

            sql = f"""
                SELECT
                    ke.content_text,
                    d.doc_name,
                    d.project_id,
                    p.project_name,
                    1 - (ke.embedding <=> %s::vector) as similarity
                FROM landscape.knowledge_embeddings ke
                JOIN landscape.core_doc d ON ke.source_id = d.doc_id
                LEFT JOIN landscape.tbl_project p ON d.project_id = p.project_id
                WHERE ke.source_type = 'document_chunk'
                  {exclude_clause}
                  AND 1 - (ke.embedding <=> %s::vector) >= %s
                ORDER BY ke.embedding <=> %s::vector
                LIMIT %s
            """

            cursor.execute(sql, params)
            rows = cursor.fetchall()

            if not rows:
                return "", 0

            lines = ["CROSS-PROJECT DOCUMENT EXCERPTS (from other projects):"]
            total_chars = len(lines[0])
            count = 0

            for row in rows:
                content, doc_name, proj_id, proj_name, sim = row
                source_label = f"{proj_name}" if proj_name else "Platform"
                entry = f"\n[From: {doc_name} ({source_label}), relevance: {sim:.0%}]\n{content[:800]}"

                if total_chars + len(entry) > max_chars:
                    break

                lines.append(entry)
                total_chars += len(entry)
                count += 1

            return "\n".join(lines) if count > 0 else "", count

    except Exception as e:
        logger.warning("Failed global embedding search: %s", e)
        return "", 0


def _search_platform_knowledge(
    query: str,
    max_chars: int = 4000,
    top_k: int = 5
) -> tuple:
    """
    Search platform knowledge chunks (reference books, industry docs).
    Returns (formatted_text, chunk_count).
    """
    try:
        query_embedding = generate_embedding(query)
        if not query_embedding:
            return "", 0

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    pkc.content,
                    pk.title,
                    pk.publisher,
                    pk.knowledge_domain,
                    1 - (pkc.embedding <=> %s::vector) as similarity
                FROM landscape.tbl_platform_knowledge_chunks pkc
                JOIN landscape.tbl_platform_knowledge pk ON pkc.document_id = pk.id
                WHERE pk.is_active = true
                  AND pkc.embedding IS NOT NULL
                  AND 1 - (pkc.embedding <=> %s::vector) >= %s
                ORDER BY pkc.embedding <=> %s::vector
                LIMIT %s
            """, [query_embedding, query_embedding, 0.55, query_embedding, top_k])

            rows = cursor.fetchall()
            if not rows:
                return "", 0

            lines = ["PLATFORM KNOWLEDGE (reference documents):"]
            total_chars = len(lines[0])
            count = 0

            for row in rows:
                content, title, publisher, domain, sim = row
                entry = f"\n[From: {title} ({publisher}), relevance: {sim:.0%}]\n{content[:800]}"

                if total_chars + len(entry) > max_chars:
                    break

                lines.append(entry)
                total_chars += len(entry)
                count += 1

            return "\n".join(lines) if count > 0 else "", count

    except Exception as e:
        logger.warning("Failed platform knowledge search: %s", e)
        return "", 0


def _get_project_inventory(current_project_id: Optional[int]) -> str:
    """
    Get a brief inventory of all user projects for broad queries.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT project_id, project_name, project_type,
                       jurisdiction_city, jurisdiction_state
                FROM landscape.tbl_project
                WHERE is_active = true
                ORDER BY project_name
            """)
            rows = cursor.fetchall()
            if not rows:
                return ""

            lines = ["ALL PROJECTS IN PORTFOLIO:"]
            for row in rows:
                pid, name, ptype, city, state = row
                marker = " (current)" if pid == current_project_id else ""
                loc = f" — {city}, {state}" if city and state else ""
                lines.append(f"  - {name} [{ptype or '?'}]{loc}{marker}")

            return "\n".join(lines)

    except Exception as e:
        logger.warning("Failed to get project inventory: %s", e)
        return ""
