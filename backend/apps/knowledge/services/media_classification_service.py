"""
Media Classification Service — Phase 3
Classifies extracted media assets from DMS documents into a 14-type taxonomy.

Two classification strategies:
  - AI vision (primary): Send thumbnail to Claude vision API for accurate classification
  - Heuristic (fallback): Use image metadata + page context for fast, free classification

After classification, populates:
  - core_doc_media.classification_id  (FK to lu_media_classification)
  - core_doc_media.ai_classification  (raw AI output string)
  - core_doc_media.ai_confidence      (0.0 - 1.0)
  - core_doc_media.suggested_action   (from lu_media_classification.default_action)
  - core_doc_media.status             = 'classified'
  - core_doc.media_scan_json          (by_color and by_type breakdowns)
"""
import base64
import json
import logging
import os
import tempfile
import time
from typing import Optional

import requests
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import connection

logger = logging.getLogger('landscape.media_extraction')

# ---------------------------------------------------------------------------
#  AI CLASSIFICATION PROMPT
# ---------------------------------------------------------------------------
CLASSIFICATION_PROMPT = """You are classifying an image extracted from a commercial real estate document.

Classify this image into exactly ONE of these categories:

VISUAL ASSETS (images worth keeping):
- property_photo: Exterior or interior photograph of a real property
- aerial_photo: Aerial or drone photograph
- site_plan: Site plan, plat map, or lot layout drawing
- floor_plan: Unit or building floor plan
- rendering: Architectural rendering or conceptual illustration
- before_after: Before-and-after comparison photo

MAPS (images with extractable location data):
- aerial_map: Annotated aerial/satellite map with overlays (retailer logos, callouts, roads)
- zoning_map: Zoning designation map with color-coded zones
- location_map: General location or submarket context map
- planning_map: Master planning area map with parcel labels and density data

DATA VISUALIZATIONS (images containing structured data):
- chart: Financial chart, bar graph, pie chart, line graph, or data table rendered as image
- infographic: Data-rich visual summary with statistics, icons, and metrics

OTHER:
- logo: Company logo, brokerage logo, or branding element
- other: None of the above

Respond with ONLY a JSON object:
{"classification": "<code>", "confidence": 0.XX, "reasoning": "<brief explanation>"}

Do not include any other text."""

VALID_CODES = {
    'property_photo', 'aerial_photo', 'site_plan', 'floor_plan',
    'aerial_map', 'zoning_map', 'location_map', 'planning_map',
    'chart', 'infographic', 'rendering', 'before_after', 'logo', 'other',
}


class MediaClassificationService:
    """
    Classifies media assets extracted from DMS documents.

    Two strategies:
      - AI vision (primary): Send thumbnail to Claude vision API
      - Heuristic (fallback): Use image metadata + page context

    After classification, sets:
      - core_doc_media.classification_id (FK to lookup)
      - core_doc_media.ai_classification (raw AI output)
      - core_doc_media.ai_confidence (0.0 - 1.0)
      - core_doc_media.suggested_action (from lu_media_classification.default_action)
      - core_doc_media.status = 'classified'
    """

    # Cost control: max items to classify via AI vision per document
    AI_VISION_BATCH_LIMIT = 50

    # Confidence threshold below which we fall back to heuristic
    MIN_AI_CONFIDENCE = 0.60

    # Claude model for vision classification (Sonnet for cost efficiency)
    CLAUDE_MODEL = "claude-sonnet-4-20250514"

    def __init__(self):
        self._classification_cache: Optional[dict] = None  # Lazy-loaded

    # ------------------------------------------------------------------ #
    #  PUBLIC: classify_document_media
    # ------------------------------------------------------------------ #
    def classify_document_media(self, doc_id: int,
                                 strategy: str = 'auto') -> dict:
        """
        Classify all unclassified media assets for a document.

        Args:
            doc_id: core_doc.doc_id
            strategy: 'ai_vision', 'heuristic', or 'auto'
                      'auto' uses AI vision for first AI_VISION_BATCH_LIMIT items,
                      heuristic for the rest and for any AI failures.

        Returns:
            Summary dict with classification breakdown.
        """
        t0 = time.time()
        logger.info(f"[doc_id={doc_id}] Starting classification (strategy={strategy})")

        # Load classification taxonomy
        taxonomy = self._load_taxonomy()

        # Get unclassified media records
        items = self._get_unclassified_media(doc_id)
        if not items:
            logger.info(f"[doc_id={doc_id}] No unclassified media to process")
            return {'doc_id': doc_id, 'total_classified': 0}

        self._set_media_scan_status(doc_id, 'classifying')

        # Get page context for all items (doc type, total pages)
        doc_context = self._get_doc_context(doc_id)

        # Sort: page_captures first (more likely maps/plans), then embedded
        items.sort(key=lambda x: (0 if x['extraction_method'] == 'page_capture' else 1, x['source_page'] or 0))

        summary = {
            'doc_id': doc_id,
            'total_classified': 0,
            'by_strategy': {'ai_vision': 0, 'heuristic': 0},
            'by_type': {},
            'by_action': {'save_image': 0, 'extract_data': 0, 'both': 0, 'ignore': 0},
        }

        ai_count = 0
        for item in items:
            code = None
            confidence = 0.0
            used_strategy = 'heuristic'

            if strategy in ('ai_vision', 'auto') and ai_count < self.AI_VISION_BATCH_LIMIT:
                # Try AI vision
                code, confidence = self._classify_ai_vision(item, doc_context)
                if code and confidence >= self.MIN_AI_CONFIDENCE:
                    used_strategy = 'ai_vision'
                    ai_count += 1
                else:
                    # AI failed or low confidence — fall back to heuristic
                    code, confidence = self._classify_heuristic(item, doc_context)
                    used_strategy = 'heuristic'
            else:
                # Heuristic only
                code, confidence = self._classify_heuristic(item, doc_context)

            # Validate code
            if code not in VALID_CODES:
                code = 'other'
                confidence = min(confidence, 0.30)

            # Look up classification_id and default_action
            class_info = taxonomy.get(code, taxonomy.get('other'))
            classification_id = class_info['classification_id']
            suggested_action = class_info['default_action']

            # Update the media record
            self._update_classification(
                media_id=item['media_id'],
                classification_id=classification_id,
                ai_classification=code,
                ai_confidence=round(confidence, 4),
                suggested_action=suggested_action,
            )

            # Track summary
            summary['total_classified'] += 1
            summary['by_strategy'][used_strategy] += 1
            summary['by_type'][code] = summary['by_type'].get(code, 0) + 1
            if suggested_action in summary['by_action']:
                summary['by_action'][suggested_action] += 1

            logger.info(
                f"[media_id={item['media_id']}] Classified as '{code}' "
                f"(confidence={confidence:.2f}, strategy={used_strategy}, action={suggested_action})"
            )

        # Update scan json with classification breakdowns
        self._update_scan_json_classified(doc_id)

        # Update status
        self._set_media_scan_status(doc_id, 'classified')

        elapsed = time.time() - t0
        logger.info(
            f"[doc_id={doc_id}] Classification complete in {elapsed:.2f}s — "
            f"{summary['total_classified']} items "
            f"(ai={summary['by_strategy']['ai_vision']}, heuristic={summary['by_strategy']['heuristic']})"
        )

        return summary

    # ------------------------------------------------------------------ #
    #  AI VISION CLASSIFICATION
    # ------------------------------------------------------------------ #
    def _classify_ai_vision(self, item: dict,
                             doc_context: dict) -> tuple[Optional[str], float]:
        """
        Classify a single image using Claude vision API.

        Uses the thumbnail for speed/cost. Falls back to (None, 0.0) on error.
        """
        image_path = item.get('thumbnail_uri') or item.get('storage_uri')
        if not image_path:
            return None, 0.0

        try:
            # Load image data
            image_data = self._load_image_data(image_path)
            if not image_data:
                return None, 0.0

            # Get Anthropic client
            client = self._get_anthropic_client()
            if not client:
                logger.warning("Anthropic client not available, skipping AI vision")
                return None, 0.0

            # Determine media type
            if image_path.endswith(('.jpg', '.jpeg')):
                media_type = 'image/jpeg'
            else:
                media_type = 'image/png'

            # Build prompt with page context
            prompt = CLASSIFICATION_PROMPT
            if doc_context:
                context_parts = []
                if doc_context.get('doc_type'):
                    context_parts.append(f"- Document type: {doc_context['doc_type']}")
                if item.get('source_page'):
                    context_parts.append(
                        f"- Page number: {item['source_page']} of {doc_context.get('total_pages', 'unknown')}"
                    )
                if item.get('extraction_method'):
                    context_parts.append(f"- Extraction method: {item['extraction_method']}")
                nearby = doc_context.get('page_texts', {}).get(item.get('source_page'))
                if nearby:
                    context_parts.append(f"- Surrounding text snippet: {nearby[:200]}")
                if context_parts:
                    prompt += "\n\nAdditional context:\n" + "\n".join(context_parts)

            # Call Claude vision
            image_b64 = base64.standard_b64encode(image_data).decode('utf-8')

            response = client.messages.create(
                model=self.CLAUDE_MODEL,
                max_tokens=256,
                messages=[{
                    'role': 'user',
                    'content': [
                        {
                            'type': 'image',
                            'source': {
                                'type': 'base64',
                                'media_type': media_type,
                                'data': image_b64,
                            },
                        },
                        {
                            'type': 'text',
                            'text': prompt,
                        },
                    ],
                }],
            )

            # Parse response
            result_text = response.content[0].text.strip()

            # Handle potential markdown code block wrapping
            if result_text.startswith('```'):
                lines = result_text.split('\n')
                result_text = '\n'.join(
                    line for line in lines
                    if not line.strip().startswith('```')
                ).strip()

            result = json.loads(result_text)
            code = result.get('classification', 'other')
            confidence = float(result.get('confidence', 0.5))

            if code not in VALID_CODES:
                code = 'other'
                confidence = min(confidence, 0.30)

            return code, confidence

        except json.JSONDecodeError:
            logger.warning(f"[media_id={item['media_id']}] AI vision returned non-JSON response")
            return None, 0.0
        except Exception:
            logger.exception(f"[media_id={item['media_id']}] AI vision classification failed")
            return None, 0.0

    # ------------------------------------------------------------------ #
    #  HEURISTIC CLASSIFICATION
    # ------------------------------------------------------------------ #
    def _classify_heuristic(self, item: dict,
                             doc_context: dict) -> tuple[str, float]:
        """
        Classify using image metadata and page context.

        Heuristics applied in priority order:
        1. Very small images → logo
        2. Page captures → maps/plans
        3. Panoramic aspect ratio → aerial photo
        4. Square-ish large images → property photo or rendering
        5. Text keyword matching → specific types
        6. Fallback → other
        """
        width = item.get('width_px') or 0
        height = item.get('height_px') or 0
        method = item.get('extraction_method', '')
        file_size = item.get('file_size_bytes') or 0
        page_num = item.get('source_page')

        # Get nearby text for keyword matching
        nearby_text = ''
        if doc_context and page_num:
            nearby_text = doc_context.get('page_texts', {}).get(page_num, '')

        # Rule 1: Very small images are likely logos/icons
        if width < 200 and height < 200:
            return 'logo', 0.65

        # Rule 2: Page captures with strong keyword signals → maps or plans
        # Only match when specific keywords are present; unmatched page captures
        # fall through to Rules 3-6 for dimension/content-based classification
        if method == 'page_capture':
            text_lower = nearby_text.lower() if nearby_text else ''
            if any(kw in text_lower for kw in ['zoning', 'zone', 'cr-', 'cb-', 'mu-', 'r-1', 'r-2', 'c-1', 'c-2']):
                return 'zoning_map', 0.60
            if any(kw in text_lower for kw in ['site plan', 'plat', 'parcel', 'lot layout']):
                return 'site_plan', 0.60
            if any(kw in text_lower for kw in ['floor plan', 'floorplan', 'unit plan', 'unit layout']):
                return 'floor_plan', 0.60
            if any(kw in text_lower for kw in ['chart', 'graph', 'trend', 'historical', 'comparison', 'summary']):
                return 'chart', 0.50
            if any(kw in text_lower for kw in ['master plan', 'planning area', 'land use plan', 'density']):
                return 'planning_map', 0.55
            # No strong keyword match — fall through to dimension-based rules

        # Rule 3: Very wide/panoramic images are likely aerial photos
        if width > 1000 and height > 0 and (width / height) > 2.5:
            return 'aerial_photo', 0.55

        # Rule 4: Square-ish large images — distinguish photos from graphics
        if width > 400 and height > 400:
            aspect = width / max(height, 1)
            if 0.6 < aspect < 1.7:
                # Check file size per pixel — photos are larger per pixel than graphics
                area = max(width * height, 1)
                bytes_per_pixel = file_size / area if file_size else 0
                if bytes_per_pixel > 0.5:
                    return 'property_photo', 0.55
                else:
                    return 'rendering', 0.40

        # Rule 5: Text-keyword matching from surrounding content
        if nearby_text:
            text_lower = nearby_text.lower()
            if any(kw in text_lower for kw in ['floor plan', 'floorplan', 'unit plan', 'layout']):
                return 'floor_plan', 0.60
            if any(kw in text_lower for kw in ['before', 'after', 'renovation', 'rehab']):
                return 'before_after', 0.50
            if any(kw in text_lower for kw in ['chart', 'graph', 'trend', 'historical']):
                return 'chart', 0.55
            if any(kw in text_lower for kw in ['render', 'concept', 'proposed', 'architect']):
                return 'rendering', 0.50
            if any(kw in text_lower for kw in ['site plan', 'plat', 'master plan']):
                return 'site_plan', 0.55
            if any(kw in text_lower for kw in ['aerial', 'drone', 'bird']):
                return 'aerial_photo', 0.50
            if any(kw in text_lower for kw in ['zoning', 'zone map']):
                return 'zoning_map', 0.50
            if any(kw in text_lower for kw in ['location', 'submarket', 'vicinity']):
                return 'location_map', 0.50

        # Rule 6: Medium-sized images with no context — likely property photos
        if width > 300 and height > 200:
            return 'property_photo', 0.35

        # Rule 7: Fallback
        return 'other', 0.30

    # ------------------------------------------------------------------ #
    #  PAGE CONTEXT
    # ------------------------------------------------------------------ #
    def _get_doc_context(self, doc_id: int) -> dict:
        """
        Gather document-level context for classification.

        Returns:
            {
                "doc_type": str,
                "total_pages": int,
                "page_texts": {1: "first 300 chars of page 1 text", ...}
            }
        """
        context = {'doc_type': None, 'total_pages': 0, 'page_texts': {}}

        # Get doc metadata
        with connection.cursor() as c:
            c.execute("""
                SELECT doc_type, storage_uri, mime_type,
                       media_scan_json->'raw_scan'->>'total_pages' as total_pages
                FROM landscape.core_doc
                WHERE doc_id = %s AND deleted_at IS NULL
            """, [doc_id])
            row = c.fetchone()

        if not row:
            return context

        context['doc_type'] = row[0]
        storage_uri = row[1]
        mime_type = row[2]
        context['total_pages'] = int(row[3]) if row[3] else 0

        # Extract page text from PDF for keyword matching
        if mime_type == 'application/pdf' and storage_uri:
            context['page_texts'] = self._extract_page_texts(storage_uri)

        return context

    def _extract_page_texts(self, storage_uri: str) -> dict[int, str]:
        """
        Extract first 300 chars of text from each page of a PDF.
        Used for keyword-based heuristic classification.
        """
        import fitz

        page_texts = {}
        tmp_path = self._download_to_temp(storage_uri)
        if not tmp_path:
            return page_texts

        try:
            doc = fitz.open(tmp_path)
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text().strip()
                if text:
                    page_texts[page_num + 1] = text[:300]  # 1-indexed
            doc.close()
        except Exception:
            logger.exception("Failed to extract page texts for classification context")
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        return page_texts

    # ------------------------------------------------------------------ #
    #  SCAN JSON UPDATE (post-classification)
    # ------------------------------------------------------------------ #
    def _update_scan_json_classified(self, doc_id: int):
        """
        Rebuild core_doc.media_scan_json with full classification data.

        Populates by_color and by_type sections now that classification is done.
        """
        with connection.cursor() as c:
            c.execute("""
                SELECT
                    lc.classification_code,
                    lc.badge_color,
                    lc.content_intent,
                    lc.default_action,
                    m.status,
                    m.suggested_action,
                    m.source_page,
                    COUNT(*) as cnt
                FROM landscape.core_doc_media m
                LEFT JOIN landscape.lu_media_classification lc
                    ON m.classification_id = lc.classification_id
                WHERE m.doc_id = %s AND m.deleted_at IS NULL
                GROUP BY lc.classification_code, lc.badge_color, lc.content_intent,
                         lc.default_action, m.status, m.suggested_action, m.source_page
            """, [doc_id])
            rows = c.fetchall()

        # Build by_color aggregation
        by_color = {}
        by_type = {}
        total_detected = 0
        total_extracted = 0

        for row in rows:
            code = row[0] or 'other'
            color = row[1] or 'secondary'
            content_intent = row[2]
            default_action = row[3]
            status = row[4]
            suggested_action = row[5]
            page = row[6]
            count = row[7]

            total_detected += count
            if status in ('extracted', 'classified', 'verified'):
                total_extracted += count

            # by_color
            if color not in by_color:
                by_color[color] = {
                    'detected': 0, 'extracted': 0,
                    'action_save': 0, 'action_extract': 0, 'action_ignore': 0,
                }
            by_color[color]['detected'] += count
            if status in ('extracted', 'classified', 'verified'):
                by_color[color]['extracted'] += count
            if suggested_action == 'save_image':
                by_color[color]['action_save'] += count
            elif suggested_action == 'extract_data':
                by_color[color]['action_extract'] += count
            elif suggested_action == 'ignore':
                by_color[color]['action_ignore'] += count

            # by_type
            if code not in by_type:
                by_type[code] = {
                    'detected': 0, 'extracted': 0,
                    'pages': [],
                    'suggested_action': default_action or suggested_action,
                }
            by_type[code]['detected'] += count
            if status in ('extracted', 'classified', 'verified'):
                by_type[code]['extracted'] += count
            if page and page not in by_type[code]['pages']:
                by_type[code]['pages'].append(page)

        # Sort page lists
        for info in by_type.values():
            info['pages'].sort()

        # Read existing scan_json to preserve raw_scan
        with connection.cursor() as c:
            c.execute("""
                SELECT media_scan_json FROM landscape.core_doc
                WHERE doc_id = %s
            """, [doc_id])
            existing = c.fetchone()

        existing_json = {}
        if existing and existing[0]:
            existing_json = existing[0] if isinstance(existing[0], dict) else json.loads(existing[0])

        scan_json = {
            **existing_json,
            'total_detected': total_detected,
            'total_extracted': total_extracted,
            'by_color': by_color,
            'by_type': by_type,
        }

        with connection.cursor() as c:
            c.execute("""
                UPDATE landscape.core_doc
                SET media_scan_json = %s::jsonb, updated_at = NOW()
                WHERE doc_id = %s
            """, [json.dumps(scan_json), doc_id])

    # ------------------------------------------------------------------ #
    #  DATABASE HELPERS
    # ------------------------------------------------------------------ #
    def _load_taxonomy(self) -> dict:
        """Load and cache the lu_media_classification lookup table."""
        if self._classification_cache:
            return self._classification_cache

        with connection.cursor() as c:
            c.execute("""
                SELECT classification_id, classification_code, classification_name,
                       badge_color, content_intent, default_action
                FROM landscape.lu_media_classification
                WHERE is_active = true
                ORDER BY sort_order
            """)
            rows = c.fetchall()

        self._classification_cache = {
            row[1]: {
                'classification_id': row[0],
                'classification_code': row[1],
                'classification_name': row[2],
                'badge_color': row[3],
                'content_intent': row[4],
                'default_action': row[5],
            }
            for row in rows
        }
        return self._classification_cache

    def _get_unclassified_media(self, doc_id: int) -> list[dict]:
        """Get media records that haven't been classified yet."""
        with connection.cursor() as c:
            c.execute("""
                SELECT media_id, source_page, extraction_method,
                       width_px, height_px, file_size_bytes,
                       storage_uri, thumbnail_uri, source_region, status
                FROM landscape.core_doc_media
                WHERE doc_id = %s
                  AND classification_id IS NULL
                  AND status != 'rejected'
                  AND deleted_at IS NULL
                ORDER BY source_page, media_id
            """, [doc_id])
            rows = c.fetchall()

        return [
            {
                'media_id': r[0],
                'source_page': r[1],
                'extraction_method': r[2],
                'width_px': r[3],
                'height_px': r[4],
                'file_size_bytes': r[5],
                'storage_uri': r[6],
                'thumbnail_uri': r[7],
                'source_region': r[8] if isinstance(r[8], dict) else (json.loads(r[8]) if r[8] else {}),
                'status': r[9],
            }
            for r in rows
        ]

    def _update_classification(self, media_id: int, classification_id: int,
                                ai_classification: str, ai_confidence: float,
                                suggested_action: str):
        """Update a core_doc_media record with classification results."""
        with connection.cursor() as c:
            c.execute("""
                UPDATE landscape.core_doc_media
                SET classification_id = %s,
                    ai_classification = %s,
                    ai_confidence = %s,
                    suggested_action = %s,
                    status = 'classified',
                    updated_at = NOW()
                WHERE media_id = %s
            """, [classification_id, ai_classification, ai_confidence,
                  suggested_action, media_id])

    def _set_media_scan_status(self, doc_id: int, status: str):
        """Update media_scan_status on core_doc."""
        with connection.cursor() as c:
            c.execute("""
                UPDATE landscape.core_doc
                SET media_scan_status = %s, updated_at = NOW()
                WHERE doc_id = %s
            """, [status, doc_id])

    # ------------------------------------------------------------------ #
    #  FILE / IMAGE HELPERS
    # ------------------------------------------------------------------ #
    def _load_image_data(self, uri: str) -> Optional[bytes]:
        """Load image bytes from a storage URI or local path."""
        try:
            if uri.startswith(('http://', 'https://')):
                resp = requests.get(uri, timeout=30)
                resp.raise_for_status()
                return resp.content

            # Try as relative path from media root
            media_root = getattr(settings, 'MEDIA_ROOT', None)
            if not media_root:
                media_root = str(settings.BASE_DIR / 'media')

            # uri might be like "media_assets/42/78/thumbnails/3_thumb.jpg"
            full_path = os.path.join(media_root, uri)
            if os.path.exists(full_path):
                with open(full_path, 'rb') as f:
                    return f.read()

            # Try via default_storage
            try:
                with default_storage.open(uri, 'rb') as f:
                    return f.read()
            except FileNotFoundError:
                pass

            # Try as absolute path
            if os.path.exists(uri):
                with open(uri, 'rb') as f:
                    return f.read()

            logger.warning(f"Image not found: {uri}")
            return None
        except Exception:
            logger.exception(f"Failed to load image: {uri}")
            return None

    def _download_to_temp(self, storage_uri: str) -> Optional[str]:
        """Download a file to a temp path. Handles URLs and local storage."""
        try:
            if storage_uri.startswith(('http://', 'https://')):
                response = requests.get(storage_uri, timeout=120)
                response.raise_for_status()
                suffix = os.path.splitext(storage_uri)[-1] or '.pdf'
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(response.content)
                    return tmp.name
            else:
                try:
                    with default_storage.open(storage_uri, 'rb') as f:
                        content = f.read()
                except FileNotFoundError:
                    if os.path.exists(storage_uri):
                        with open(storage_uri, 'rb') as f:
                            content = f.read()
                    else:
                        logger.error(f"File not found: {storage_uri}")
                        return None

                suffix = os.path.splitext(storage_uri)[-1] or '.pdf'
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(content)
                    return tmp.name
        except Exception:
            logger.exception(f"Failed to download: {storage_uri}")
            return None

    def _get_anthropic_client(self):
        """
        Get Anthropic client following the same pattern as ai_handler.py.
        Returns None if API key not configured.
        """
        try:
            import anthropic
        except ImportError:
            logger.warning("anthropic package not installed")
            return None

        api_key = None

        # Read from .env files (same pattern as ai_handler._get_anthropic_client)
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        repo_root = os.path.dirname(backend_root)
        env_candidates = [
            os.path.join(backend_root, '.env'),
            os.path.join(repo_root, '.env'),
        ]

        for env_file in env_candidates:
            if not os.path.exists(env_file):
                continue
            try:
                with open(env_file) as f:
                    for line in f:
                        if line.strip().startswith('ANTHROPIC_API_KEY='):
                            api_key = line.split('=', 1)[1].strip()
                            break
            except Exception:
                continue
            if api_key:
                break

        # Fallback to env var or settings
        if not api_key:
            api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)

        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not configured, AI vision unavailable")
            return None

        try:
            return anthropic.Anthropic(api_key=api_key, timeout=60)
        except TypeError:
            return anthropic.Anthropic(api_key=api_key)
        except Exception as e:
            logger.error(f"Failed to create Anthropic client: {e}")
            return None
