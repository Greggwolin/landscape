"""
Document Classifier Service - Auto-classifies documents for extraction.

Classifies documents into types based on content analysis:
- offering_memorandum (om): Investment offering documents
- rent_roll: Unit-level rent and lease data
- t12: Trailing 12-month operating statements
- appraisal: Property valuations
- comp_report: Rental/sales comparable analyses
- site_plan: Development site plans
- proforma: Financial projections
"""

import re
import logging
from enum import Enum
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from django.db import connection

logger = logging.getLogger(__name__)


class DocumentType(Enum):
    """Document type classifications."""
    OFFERING_MEMORANDUM = 'offering_memorandum'
    RENT_ROLL = 'rent_roll'
    T12 = 't12'
    APPRAISAL = 'appraisal'
    COMP_REPORT = 'comp_report'
    SITE_PLAN = 'site_plan'
    PROFORMA = 'proforma'
    UNKNOWN = 'unknown'

    @classmethod
    def from_string(cls, value: str) -> 'DocumentType':
        """Convert string to DocumentType."""
        mapping = {
            'om': cls.OFFERING_MEMORANDUM,
            'offering_memorandum': cls.OFFERING_MEMORANDUM,
            'rent_roll': cls.RENT_ROLL,
            'rentroll': cls.RENT_ROLL,
            't12': cls.T12,
            'trailing_12': cls.T12,
            'operating_statement': cls.T12,
            'appraisal': cls.APPRAISAL,
            'comp_report': cls.COMP_REPORT,
            'comps': cls.COMP_REPORT,
            'market_data': cls.COMP_REPORT,
            'site_plan': cls.SITE_PLAN,
            'proforma': cls.PROFORMA,
        }
        return mapping.get(value.lower(), cls.UNKNOWN)


# =============================================================================
# DOCUMENT PRIORITY SYSTEM FOR CONFLICT RESOLUTION
# =============================================================================
# When multiple documents contain conflicting values for the same field,
# the document with higher priority wins. Priority is field-dependent:
#
# For RENT/OCCUPANCY data: Rent Roll > T-12 > OM
#   - Rent rolls are updated monthly, most current source
#   - T-12 shows historical actuals
#   - OMs often have stale/optimistic marketing figures
#
# For EXPENSE data: T-12 > Appraisal > OM
#   - T-12 has actual historical expenses
#   - Appraisals verify expenses independently
#   - OMs may show "proforma" or "adjusted" expenses
#
# For PROPERTY DETAILS: Appraisal > OM > Rent Roll
#   - Appraisals verify physical details
#   - OMs have comprehensive property info
#   - Rent rolls are transaction-focused

DOCUMENT_PRIORITY_BY_FIELD_TYPE = {
    # Rent/income fields - Rent Roll is source of truth
    'rent': {
        DocumentType.RENT_ROLL: 1,      # Highest priority
        DocumentType.T12: 2,
        DocumentType.APPRAISAL: 3,
        DocumentType.OFFERING_MEMORANDUM: 4,
        DocumentType.PROFORMA: 5,
        DocumentType.UNKNOWN: 99,
    },
    # Occupancy fields - Rent Roll is source of truth
    'occupancy': {
        DocumentType.RENT_ROLL: 1,
        DocumentType.T12: 2,
        DocumentType.APPRAISAL: 3,
        DocumentType.OFFERING_MEMORANDUM: 4,
        DocumentType.UNKNOWN: 99,
    },
    # Unit/tenant data - Rent Roll is source of truth
    'unit': {
        DocumentType.RENT_ROLL: 1,
        DocumentType.OFFERING_MEMORANDUM: 2,
        DocumentType.APPRAISAL: 3,
        DocumentType.T12: 4,
        DocumentType.UNKNOWN: 99,
    },
    # Expense data - T-12 is source of truth
    'expense': {
        DocumentType.T12: 1,            # Highest priority for expenses
        DocumentType.APPRAISAL: 2,
        DocumentType.OFFERING_MEMORANDUM: 3,
        DocumentType.PROFORMA: 4,
        DocumentType.UNKNOWN: 99,
    },
    # Property details - Appraisal/OM are sources of truth
    'property': {
        DocumentType.APPRAISAL: 1,
        DocumentType.OFFERING_MEMORANDUM: 2,
        DocumentType.COMP_REPORT: 3,
        DocumentType.T12: 4,
        DocumentType.RENT_ROLL: 5,
        DocumentType.UNKNOWN: 99,
    },
    # Financing/loan data - OM is source of truth
    'financing': {
        DocumentType.OFFERING_MEMORANDUM: 1,
        DocumentType.APPRAISAL: 2,
        DocumentType.PROFORMA: 3,
        DocumentType.UNKNOWN: 99,
    },
    # Default priority if field type not specified
    'default': {
        DocumentType.RENT_ROLL: 1,
        DocumentType.T12: 2,
        DocumentType.APPRAISAL: 3,
        DocumentType.OFFERING_MEMORANDUM: 4,
        DocumentType.PROFORMA: 5,
        DocumentType.COMP_REPORT: 6,
        DocumentType.SITE_PLAN: 7,
        DocumentType.UNKNOWN: 99,
    },
}

# Map field_key patterns to field types for priority lookup
FIELD_KEY_TO_TYPE = {
    # Rent-related fields
    'rent': 'rent',
    'market_rent': 'rent',
    'current_rent': 'rent',
    'gross_potential_rent': 'rent',
    'effective_gross_income': 'rent',
    'gpr': 'rent',
    'egi': 'rent',
    'noi': 'rent',
    'income': 'rent',
    # Occupancy fields
    'occupancy': 'occupancy',
    'vacancy': 'occupancy',
    'economic_occupancy': 'occupancy',
    'physical_occupancy': 'occupancy',
    # Unit/tenant fields
    'unit': 'unit',
    'tenant': 'unit',
    'lease': 'unit',
    'unit_count': 'unit',
    'total_units': 'unit',
    'unit_mix': 'unit',
    # Expense fields
    'expense': 'expense',
    'opex': 'expense',
    'operating_expense': 'expense',
    'tax': 'expense',
    'insurance': 'expense',
    'utilities': 'expense',
    'maintenance': 'expense',
    'management_fee': 'expense',
    'payroll': 'expense',
    # Property fields
    'property': 'property',
    'address': 'property',
    'city': 'property',
    'state': 'property',
    'zip': 'property',
    'year_built': 'property',
    'sf': 'property',
    'square_feet': 'property',
    'lot_size': 'property',
    'property_class': 'property',
    'property_type': 'property',
    # Financing fields
    'loan': 'financing',
    'debt': 'financing',
    'financing': 'financing',
    'mortgage': 'financing',
    'interest_rate': 'financing',
    'loan_balance': 'financing',
    'assumable': 'financing',
}


def get_field_type(field_key: str) -> str:
    """
    Determine the field type for a given field_key.
    Used to look up the appropriate document priority.
    """
    field_key_lower = field_key.lower()

    # Direct match
    if field_key_lower in FIELD_KEY_TO_TYPE:
        return FIELD_KEY_TO_TYPE[field_key_lower]

    # Partial match
    for pattern, field_type in FIELD_KEY_TO_TYPE.items():
        if pattern in field_key_lower:
            return field_type

    return 'default'


def get_document_priority(doc_type: DocumentType, field_key: str) -> int:
    """
    Get the priority of a document type for a specific field.
    Lower number = higher priority (wins in conflicts).

    Args:
        doc_type: The document type
        field_key: The field being extracted (determines priority rules)

    Returns:
        Priority number (1 = highest priority)
    """
    field_type = get_field_type(field_key)
    priority_map = DOCUMENT_PRIORITY_BY_FIELD_TYPE.get(
        field_type,
        DOCUMENT_PRIORITY_BY_FIELD_TYPE['default']
    )
    return priority_map.get(doc_type, 99)


# Maps DocumentType to CSV evidence_types values
DOCTYPE_TO_EVIDENCE = {
    DocumentType.OFFERING_MEMORANDUM: 'offering_memorandum',
    DocumentType.RENT_ROLL: 'rent_roll',
    DocumentType.T12: 't12',
    DocumentType.APPRAISAL: 'appraisal',
    DocumentType.COMP_REPORT: 'comp_report',
    DocumentType.SITE_PLAN: 'site_plan',
    DocumentType.PROFORMA: 'proforma',
}

# Maps CSV evidence_types to DocumentType
EVIDENCE_TO_DOCTYPE = {v: k for k, v in DOCTYPE_TO_EVIDENCE.items()}

# Maps internal classification types to common template doc_types
# This allows AI classification to map to user-defined template doc_types
DOCTYPE_TO_TEMPLATE_MAPPING = {
    'offering_memorandum': ['Property Data', 'Diligence', 'Operations'],
    'rent_roll': ['Property Data', 'Operations', 'Leases'],
    't12': ['Property Data', 'Operations', 'Accounting'],
    'appraisal': ['Property Data', 'Diligence', 'Reports, Studies'],
    'comp_report': ['Market Data', 'Property Data', 'Reports, Studies'],
    'site_plan': ['Entitlements', 'Diligence', 'Sets'],
    'proforma': ['Property Data', 'Diligence', 'Operations'],
    'unknown': ['Property Data', 'Other', 'general'],
}


@dataclass
class ClassificationResult:
    """Result of document classification."""
    doc_type: DocumentType
    confidence: float
    evidence_type: str  # CSV evidence_types value
    matched_patterns: List[str]
    doc_id: int
    doc_name: str


# Classification patterns - regex patterns with weights
CLASSIFICATION_PATTERNS = {
    DocumentType.OFFERING_MEMORANDUM: [
        (r'offering\s+memorandum', 0.95, 'Title: Offering Memorandum'),
        (r'confidential\s+offering', 0.90, 'Confidential offering header'),
        (r'investment\s+summary', 0.80, 'Investment summary section'),
        (r'property\s+overview', 0.70, 'Property overview section'),
        (r'financial\s+overview', 0.70, 'Financial overview section'),
        (r'investment\s+highlights', 0.75, 'Investment highlights'),
        (r'executive\s+summary', 0.65, 'Executive summary'),
        (r'offering\s+price', 0.85, 'Offering price mentioned'),
        (r'cap\s*rate.*analysis', 0.75, 'Cap rate analysis'),
        (r'acquisition\s+opportunity', 0.80, 'Acquisition opportunity'),
        (r'marketed\s+by', 0.70, 'Marketing attribution'),
        (r'exclusively\s+listed', 0.75, 'Exclusive listing'),
    ],
    DocumentType.RENT_ROLL: [
        (r'rent\s+roll', 0.95, 'Title: Rent Roll'),
        (r'unit\s+number.*tenant', 0.85, 'Unit/tenant columns'),
        (r'lease\s+start.*lease\s+end', 0.90, 'Lease date columns'),
        (r'monthly\s+rent.*unit', 0.80, 'Rent by unit'),
        (r'move[\s-]?in\s+date', 0.75, 'Move-in dates'),
        (r'tenant\s+name', 0.70, 'Tenant name column'),
        (r'occupied.*vacant', 0.75, 'Occupancy status'),
        (r'current\s+rent.*market\s+rent', 0.85, 'Rent comparison'),
        (r'sq\s*ft.*rent', 0.70, 'SF and rent columns'),
        (r'lease\s+expiration', 0.80, 'Lease expiration'),
        (r'delinquency', 0.75, 'Delinquency data'),
    ],
    DocumentType.T12: [
        (r'trailing\s+12', 0.95, 'Title: Trailing 12'),
        (r't-?12\s+statement', 0.95, 'T12 statement'),
        (r'operating\s+statement', 0.80, 'Operating statement'),
        (r'income\s+statement', 0.75, 'Income statement'),
        (r'month\s+1.*month\s+12', 0.85, 'Monthly columns'),
        (r'jan.*feb.*mar.*apr', 0.80, 'Monthly breakdown'),
        (r'ytd\s+actual', 0.85, 'YTD actuals'),
        (r'total\s+income.*total\s+expense', 0.80, 'Income/expense totals'),
        (r'net\s+operating\s+income', 0.85, 'NOI calculation'),
        (r'effective\s+gross\s+income', 0.80, 'EGI calculation'),
        (r'vacancy\s+loss', 0.75, 'Vacancy loss'),
        (r'other\s+income', 0.70, 'Other income'),
    ],
    DocumentType.APPRAISAL: [
        (r'appraisal\s+report', 0.95, 'Title: Appraisal Report'),
        (r'market\s+value', 0.85, 'Market value opinion'),
        (r'income\s+approach', 0.80, 'Income approach'),
        (r'sales\s+comparison\s+approach', 0.85, 'Sales comparison'),
        (r'cost\s+approach', 0.75, 'Cost approach'),
        (r'as[\s-]?is\s+value', 0.80, 'As-is value'),
        (r'stabilized\s+value', 0.80, 'Stabilized value'),
        (r'highest\s+and\s+best\s+use', 0.85, 'HBU analysis'),
        (r'reconciliation', 0.70, 'Value reconciliation'),
        (r'mai\s+designation', 0.75, 'MAI appraiser'),
        (r'uspap', 0.80, 'USPAP compliance'),
    ],
    DocumentType.COMP_REPORT: [
        (r'comparable\s+properties', 0.90, 'Comparable properties'),
        (r'rental\s+comp', 0.90, 'Rental comps'),
        (r'sales\s+comp', 0.85, 'Sales comps'),
        (r'market\s+survey', 0.85, 'Market survey'),
        (r'competitive\s+set', 0.80, 'Competitive set'),
        (r'subject\s+property.*comp', 0.80, 'Subject vs comps'),
        (r'distance.*miles', 0.70, 'Distance metrics'),
        (r'average\s+rent.*occupancy', 0.80, 'Rent/occupancy summary'),
        (r'price\s+per\s+(unit|sf)', 0.75, 'Price per unit/sf'),
        (r'year\s+built.*total\s+units', 0.75, 'Property details'),
        (r'costar|axio|realpage', 0.80, 'Data source'),
    ],
    DocumentType.SITE_PLAN: [
        (r'site\s+plan', 0.95, 'Site plan title'),
        (r'development\s+plan', 0.85, 'Development plan'),
        (r'lot\s+layout', 0.80, 'Lot layout'),
        (r'building\s+footprint', 0.80, 'Building footprint'),
        (r'setback', 0.75, 'Setback info'),
        (r'zoning.*lot\s+coverage', 0.80, 'Zoning/coverage'),
        (r'parking\s+ratio', 0.75, 'Parking ratio'),
        (r'landscape\s+plan', 0.70, 'Landscape plan'),
        (r'civil\s+engineering', 0.75, 'Civil engineering'),
        (r'scale:?\s*\d', 0.70, 'Scale notation'),
    ],
    DocumentType.PROFORMA: [
        (r'pro\s*forma', 0.95, 'Proforma title'),
        (r'projected.*cash\s+flow', 0.90, 'Projected cash flow'),
        (r'year\s+1.*year\s+5', 0.85, 'Multi-year projection'),
        (r'irr.*projection', 0.85, 'IRR projection'),
        (r'equity\s+multiple', 0.80, 'Equity multiple'),
        (r'reversion', 0.80, 'Reversion value'),
        (r'disposition\s+proceeds', 0.80, 'Disposition analysis'),
        (r'stabilized\s+noi', 0.80, 'Stabilized NOI'),
        (r'investor\s+returns', 0.80, 'Investor returns'),
        (r'cash[\s-]?on[\s-]?cash', 0.75, 'CoC returns'),
        (r'waterfall', 0.75, 'Waterfall distribution'),
    ],
}


def get_valid_doc_types_for_project(project_id: int) -> List[str]:
    """
    Get valid doc_type options from the project's template.

    Args:
        project_id: The project ID

    Returns:
        List of valid doc_type strings from the template
    """
    with connection.cursor() as cursor:
        # First try project-specific template
        cursor.execute("""
            SELECT doc_type_options
            FROM landscape.dms_templates
            WHERE project_id = %s
            ORDER BY is_default DESC, updated_at DESC
            LIMIT 1
        """, [project_id])
        row = cursor.fetchone()

        if row and row[0]:
            return row[0]

        # Try to get project type and match template by name
        cursor.execute("""
            SELECT project_type FROM landscape.tbl_project WHERE project_id = %s
        """, [project_id])
        row = cursor.fetchone()
        project_type = row[0] if row else None

        if project_type:
            # Map project_type codes to template names
            template_name_map = {
                'MF': 'Commercial / Multifam',
                'OFF': 'Commercial / Multifam',
                'RET': 'Commercial / Multifam',
                'IND': 'Commercial / Multifam',
                'LAND': 'Land Development',
                'MXU': 'Land Development',
            }
            template_name = template_name_map.get(project_type)

            if template_name:
                cursor.execute("""
                    SELECT doc_type_options
                    FROM landscape.dms_templates
                    WHERE template_name = %s
                    ORDER BY is_default DESC, updated_at DESC
                    LIMIT 1
                """, [template_name])
                row = cursor.fetchone()
                if row and row[0]:
                    return row[0]

        # Fallback to default template
        cursor.execute("""
            SELECT doc_type_options
            FROM landscape.dms_templates
            WHERE is_default = true
            ORDER BY updated_at DESC
            LIMIT 1
        """)
        row = cursor.fetchone()
        if row and row[0]:
            return row[0]

        # Ultimate fallback
        return ['Property Data', 'Diligence', 'Agreements', 'Correspondence', 'Other']


def map_to_valid_doc_type(internal_type: str, valid_types: List[str]) -> str:
    """
    Map an internal classification type to a valid template doc_type.

    Args:
        internal_type: The internal classification (e.g., 'offering_memorandum')
        valid_types: List of valid doc_types from the template

    Returns:
        A valid doc_type string from the template
    """
    # First check if internal_type is already valid (case-insensitive)
    valid_lower = {t.lower(): t for t in valid_types}
    if internal_type.lower() in valid_lower:
        return valid_lower[internal_type.lower()]

    # Get preferred mappings for this internal type
    preferred = DOCTYPE_TO_TEMPLATE_MAPPING.get(internal_type, ['Property Data', 'Other'])

    # Find first preferred that's in valid_types (case-insensitive)
    for pref in preferred:
        if pref.lower() in valid_lower:
            return valid_lower[pref.lower()]

    # If no match, return first valid type or default
    return valid_types[0] if valid_types else 'Property Data'


class DocumentClassifier:
    """Classifies documents based on content analysis."""

    def __init__(self, project_id: Optional[int] = None):
        self.project_id = project_id
        self._valid_doc_types: Optional[List[str]] = None

    def _get_valid_doc_types(self, project_id: Optional[int] = None) -> List[str]:
        """Get and cache valid doc_types for the project."""
        pid = project_id or self.project_id
        if not pid:
            return ['Property Data', 'Diligence', 'Other']

        if self._valid_doc_types is None:
            self._valid_doc_types = get_valid_doc_types_for_project(pid)
        return self._valid_doc_types

    def classify_document(self, doc_id: int) -> ClassificationResult:
        """
        Classify a single document by analyzing its content.

        Args:
            doc_id: The document ID to classify

        Returns:
            ClassificationResult with type, confidence, and evidence
        """
        # Get document info and content
        doc_info = self._get_document_info(doc_id)
        if not doc_info:
            return ClassificationResult(
                doc_type=DocumentType.UNKNOWN,
                confidence=0.0,
                evidence_type='unknown',
                matched_patterns=[],
                doc_id=doc_id,
                doc_name='Unknown'
            )

        doc_name = doc_info['doc_name']
        content = doc_info['content']

        # Set project_id from document if not already set
        if not self.project_id and doc_info.get('project_id'):
            self.project_id = doc_info['project_id']

        # First check filename for hints
        filename_type = self._classify_by_filename(doc_name)
        if filename_type and filename_type != DocumentType.UNKNOWN:
            # Boost confidence if filename matches content
            content_result = self._classify_by_content(content)
            if content_result[0] == filename_type:
                internal_type = DOCTYPE_TO_EVIDENCE.get(filename_type, 'unknown')
                # Map to valid template doc_type if we have project context
                if self.project_id:
                    valid_types = self._get_valid_doc_types()
                    mapped_type = map_to_valid_doc_type(internal_type, valid_types)
                else:
                    mapped_type = internal_type

                return ClassificationResult(
                    doc_type=filename_type,
                    confidence=min(0.98, content_result[1] + 0.1),
                    evidence_type=mapped_type,  # Use mapped type
                    matched_patterns=content_result[2],
                    doc_id=doc_id,
                    doc_name=doc_name
                )

        # Classify by content
        doc_type, confidence, patterns = self._classify_by_content(content)
        internal_type = DOCTYPE_TO_EVIDENCE.get(doc_type, 'unknown')

        # Map to valid template doc_type if we have project context
        if self.project_id:
            valid_types = self._get_valid_doc_types()
            mapped_type = map_to_valid_doc_type(internal_type, valid_types)
        else:
            mapped_type = internal_type

        return ClassificationResult(
            doc_type=doc_type,
            confidence=confidence,
            evidence_type=mapped_type,  # Use mapped type
            matched_patterns=patterns,
            doc_id=doc_id,
            doc_name=doc_name
        )

    def classify_project_documents(self, project_id: Optional[int] = None) -> List[ClassificationResult]:
        """
        Classify all documents for a project.

        Args:
            project_id: Override project_id if needed

        Returns:
            List of ClassificationResult for each document
        """
        pid = project_id or self.project_id
        if not pid:
            raise ValueError("project_id is required")

        doc_ids = self._get_project_document_ids(pid)
        results = []

        for doc_id in doc_ids:
            result = self.classify_document(doc_id)
            results.append(result)

        return results

    def _get_document_info(self, doc_id: int) -> Optional[Dict]:
        """Get document info and concatenated content."""
        with connection.cursor() as cursor:
            # Get doc info
            cursor.execute("""
                SELECT doc_id, doc_name, project_id
                FROM landscape.core_doc
                WHERE doc_id = %s
            """, [doc_id])
            row = cursor.fetchone()
            if not row:
                return None

            doc_info = {
                'doc_id': row[0],
                'doc_name': row[1],
                'project_id': row[2],
            }

            # Get content from embeddings
            cursor.execute("""
                SELECT content_text
                FROM landscape.knowledge_embeddings
                WHERE source_id = %s AND source_type = 'document_chunk'
                ORDER BY embedding_id
                LIMIT 50
            """, [doc_id])

            chunks = cursor.fetchall()
            content = "\n".join(chunk[0] for chunk in chunks if chunk[0])

            # If no embeddings, try to get from raw text
            if not content:
                cursor.execute("""
                    SELECT COALESCE(extracted_text, '')
                    FROM landscape.core_doc
                    WHERE doc_id = %s
                """, [doc_id])
                row = cursor.fetchone()
                content = row[0] if row and row[0] else ''

            doc_info['content'] = content
            return doc_info

    def _get_project_document_ids(self, project_id: int) -> List[int]:
        """Get all document IDs for a project."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT doc_id
                FROM landscape.core_doc
                WHERE project_id = %s
                ORDER BY doc_id
            """, [project_id])
            return [row[0] for row in cursor.fetchall()]

    def _classify_by_filename(self, filename: str) -> Optional[DocumentType]:
        """Quick classification based on filename patterns."""
        lower_name = filename.lower()

        patterns = {
            DocumentType.RENT_ROLL: [r'rent\s*roll', r'rentroll', r'rr\d+', r'delinquency'],
            DocumentType.T12: [r't-?12', r'trailing', r'operating\s*statement'],
            DocumentType.OFFERING_MEMORANDUM: [r'\bom\b', r'offering\s*memo', r'investment\s*memo'],
            DocumentType.APPRAISAL: [r'appraisal', r'valuation'],
            DocumentType.COMP_REPORT: [r'comp', r'survey', r'market\s*data'],
            DocumentType.SITE_PLAN: [r'site\s*plan', r'civil', r'plat'],
            DocumentType.PROFORMA: [r'proforma', r'pro\s*forma', r'projection'],
        }

        for doc_type, type_patterns in patterns.items():
            for pattern in type_patterns:
                if re.search(pattern, lower_name):
                    return doc_type

        return None

    def _classify_by_content(self, content: str) -> Tuple[DocumentType, float, List[str]]:
        """Classify document by content analysis."""
        if not content:
            return DocumentType.UNKNOWN, 0.0, []

        lower_content = content.lower()
        scores: Dict[DocumentType, float] = {}
        matched: Dict[DocumentType, List[str]] = {}

        for doc_type, patterns in CLASSIFICATION_PATTERNS.items():
            scores[doc_type] = 0.0
            matched[doc_type] = []

            for pattern, weight, description in patterns:
                if re.search(pattern, lower_content):
                    # Diminishing returns for multiple matches
                    current_score = scores[doc_type]
                    bonus = weight * (1 - current_score * 0.3)
                    scores[doc_type] = min(0.98, current_score + bonus)
                    matched[doc_type].append(description)

        if not scores:
            return DocumentType.UNKNOWN, 0.0, []

        # Get the best match
        best_type = max(scores.keys(), key=lambda k: scores[k])
        best_score = scores[best_type]

        # Only return if confidence is above threshold
        if best_score < 0.3:
            return DocumentType.UNKNOWN, best_score, matched.get(best_type, [])

        return best_type, best_score, matched.get(best_type, [])

    def update_document_classification(
        self,
        doc_id: int,
        doc_type: DocumentType,
        project_id: Optional[int] = None
    ) -> bool:
        """
        Update the document's classification in the database.

        Maps internal classification type to a valid template doc_type
        before saving to ensure only valid doc_types are used.

        Args:
            doc_id: Document ID
            doc_type: Classified document type (internal)
            project_id: Optional project ID to look up valid doc_types

        Returns:
            True if updated successfully
        """
        internal_type = DOCTYPE_TO_EVIDENCE.get(doc_type, 'unknown')

        # Get valid doc_types for the project
        pid = project_id or self.project_id
        if pid:
            valid_types = self._get_valid_doc_types(pid)
            # Map internal type to a valid template doc_type
            final_doc_type = map_to_valid_doc_type(internal_type, valid_types)
            logger.info(
                f"Mapped internal type '{internal_type}' to template doc_type "
                f"'{final_doc_type}' for doc_id={doc_id}"
            )
        else:
            # No project context - use internal type (legacy behavior)
            final_doc_type = internal_type
            logger.warning(
                f"No project_id for doc_id={doc_id}, using internal type '{internal_type}' "
                f"(may not match template)"
            )

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE landscape.core_doc
                SET doc_type = %s,
                    updated_at = NOW()
                WHERE doc_id = %s
            """, [final_doc_type, doc_id])

            return cursor.rowcount > 0


# Convenience functions
def classify_document(doc_id: int) -> ClassificationResult:
    """Classify a single document."""
    classifier = DocumentClassifier()
    return classifier.classify_document(doc_id)


def classify_project_documents(project_id: int) -> List[ClassificationResult]:
    """Classify all documents for a project."""
    classifier = DocumentClassifier(project_id)
    return classifier.classify_project_documents()


def get_document_type_for_extraction(doc_id: int) -> str:
    """Get the evidence_type string for a document (for registry lookup)."""
    result = classify_document(doc_id)
    return result.evidence_type
