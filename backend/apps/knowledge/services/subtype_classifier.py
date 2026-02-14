"""
Document Subtype Classifier - Classifies documents into property/document subtypes.

This classifier works alongside the main DocumentClassifier:
- DocumentClassifier determines WHAT the document is (OM, Rent Roll, T12, etc.)
- DocumentSubtypeClassifier determines WHAT KIND of property it describes
  (garden-style multifamily, student housing, affordable/LIHTC, etc.)

The subtype classification drives:
1. Specialized extraction prompts (priority_fields, special_instructions)
2. Auto-tagging documents with subtype tags for user visibility
3. Subtype-specific field emphasis during AI extraction

Subtypes are stored in ai_document_subtypes and loaded dynamically.
"""

import re
import logging
from typing import Optional, Tuple, List, Dict
from dataclasses import dataclass
from django.db import connection

logger = logging.getLogger(__name__)


@dataclass
class SubtypeResult:
    """Result of subtype classification."""
    subtype_code: Optional[str]
    subtype_name: Optional[str]
    confidence: float
    matched_patterns: List[str]
    priority_fields: List[str]
    special_instructions: Optional[str]


class DocumentSubtypeClassifier:
    """
    Classifies documents into property subtypes based on content pattern matching.

    Loads subtype definitions from ai_document_subtypes table and matches
    content against detection_patterns using case-insensitive search.
    """

    def __init__(self):
        self._subtypes: Optional[List[Dict]] = None

    def _load_subtypes(self) -> List[Dict]:
        """Load active subtypes from database, cached per instance."""
        if self._subtypes is not None:
            return self._subtypes

        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT subtype_id, subtype_code, subtype_name, property_type,
                           detection_patterns, priority_fields, skip_fields,
                           special_instructions
                    FROM landscape.ai_document_subtypes
                    WHERE is_active = TRUE
                    ORDER BY subtype_code
                """)
                columns = [col[0] for col in cursor.description]
                self._subtypes = [dict(zip(columns, row)) for row in cursor.fetchall()]
        except Exception as e:
            logger.warning(f"Failed to load subtypes from database: {e}")
            self._subtypes = []

        return self._subtypes

    def classify(
        self,
        content: str,
        property_type: Optional[str] = None
    ) -> SubtypeResult:
        """
        Classify document content into a subtype.

        Args:
            content: Document text content to analyze
            property_type: Optional property type filter (e.g., 'multifamily', 'land')

        Returns:
            SubtypeResult with the best matching subtype, or empty result if no match
        """
        if not content:
            return SubtypeResult(
                subtype_code=None,
                subtype_name=None,
                confidence=0.0,
                matched_patterns=[],
                priority_fields=[],
                special_instructions=None,
            )

        subtypes = self._load_subtypes()
        content_lower = content.lower()

        best_match: Optional[Dict] = None
        best_score = 0.0
        best_patterns: List[str] = []

        for subtype in subtypes:
            # Filter by property type if specified
            if property_type and subtype['property_type'] != property_type:
                continue

            patterns = subtype.get('detection_patterns', [])
            if isinstance(patterns, str):
                import json
                try:
                    patterns = json.loads(patterns)
                except (json.JSONDecodeError, TypeError):
                    patterns = []

            if not patterns:
                continue

            # Count pattern matches
            matched = []
            for pattern in patterns:
                pattern_lower = pattern.lower()
                # Use word boundary matching for short patterns to avoid false positives
                if len(pattern_lower) <= 4:
                    if re.search(r'\b' + re.escape(pattern_lower) + r'\b', content_lower):
                        matched.append(pattern)
                else:
                    if pattern_lower in content_lower:
                        matched.append(pattern)

            if not matched:
                continue

            # Score: ratio of matched patterns to total patterns, weighted by match count
            match_ratio = len(matched) / len(patterns)
            # Bonus for more absolute matches (up to 0.2 bonus)
            count_bonus = min(len(matched) * 0.05, 0.2)
            score = match_ratio + count_bonus

            if score > best_score:
                best_score = score
                best_match = subtype
                best_patterns = matched

        if best_match is None or best_score < 0.15:
            return SubtypeResult(
                subtype_code=None,
                subtype_name=None,
                confidence=0.0,
                matched_patterns=[],
                priority_fields=[],
                special_instructions=None,
            )

        # Normalize confidence to 0.0-1.0 range
        confidence = min(best_score, 1.0)

        priority_fields = best_match.get('priority_fields', [])
        if isinstance(priority_fields, str):
            import json
            try:
                priority_fields = json.loads(priority_fields)
            except (json.JSONDecodeError, TypeError):
                priority_fields = []

        return SubtypeResult(
            subtype_code=best_match['subtype_code'],
            subtype_name=best_match['subtype_name'],
            confidence=confidence,
            matched_patterns=best_patterns,
            priority_fields=priority_fields,
            special_instructions=best_match.get('special_instructions'),
        )

    def classify_document(self, doc_id: int, property_type: Optional[str] = None) -> SubtypeResult:
        """
        Classify a document by its ID — fetches content from the database.

        Args:
            doc_id: Document ID in core_doc table
            property_type: Optional property type filter

        Returns:
            SubtypeResult
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT raw_content
                    FROM landscape.core_doc
                    WHERE doc_id = %s AND deleted_at IS NULL
                    LIMIT 1
                """, [doc_id])
                row = cursor.fetchone()

            if not row or not row[0]:
                return SubtypeResult(
                    subtype_code=None,
                    subtype_name=None,
                    confidence=0.0,
                    matched_patterns=[],
                    priority_fields=[],
                    special_instructions=None,
                )

            # Use first 50K characters for classification (sufficient for pattern matching)
            content = str(row[0])[:50000]
            return self.classify(content, property_type)

        except Exception as e:
            logger.error(f"Error classifying document {doc_id}: {e}")
            return SubtypeResult(
                subtype_code=None,
                subtype_name=None,
                confidence=0.0,
                matched_patterns=[],
                priority_fields=[],
                special_instructions=None,
            )
