"""
Media Extraction Service — Phase 2
Extracts embedded images and renders page captures from PDF documents.
Stores results in core_doc_media and updates core_doc.media_scan_json.

Two operational modes:
  - scan_only (scan_document):  Detect images, populate media_scan_json, create 'pending' records
  - extract  (extract_media):   Actually extract images, store files, create 'extracted' records
"""
import json
import logging
import os
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import requests
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import connection
from PIL import Image

logger = logging.getLogger('landscape.media_extraction')

# Mime types that can be scanned for embedded media
SCANNABLE_MIME_TYPES = [
    'application/pdf',
]

# Image mime types that are themselves media assets
IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'image/bmp',
]


class MediaExtractionService:
    """
    Extracts embedded images and renders page captures from PDF documents.
    Stores results in core_doc_media and updates core_doc.media_scan_json.

    Two modes:
      - scan_only=True:  Detect images, populate media_scan_json, create 'pending' records
      - scan_only=False: Actually extract images, store files, create 'extracted' records
    """

    # Minimum dimensions to extract (skip tiny icons, bullets, decorations)
    MIN_WIDTH_PX = 100
    MIN_HEIGHT_PX = 100
    MIN_AREA_PX = 15000  # width * height threshold

    # Thumbnail settings
    THUMB_MAX_SIZE = (300, 300)
    THUMB_QUALITY = 85

    # Page capture DPI for full-page renders
    PAGE_CAPTURE_DPI = 150

    def __init__(self, media_root: str = None):
        """
        Args:
            media_root: Base directory for storing extracted media.
                        Defaults to settings.MEDIA_ROOT or BASE_DIR / 'media'
        """
        if media_root:
            self.media_root = Path(media_root)
        else:
            base = getattr(settings, 'MEDIA_ROOT', None)
            if base:
                self.media_root = Path(base) / 'media_assets'
            else:
                self.media_root = Path(settings.BASE_DIR) / 'media' / 'media_assets'

    # ------------------------------------------------------------------ #
    #  PUBLIC: scan_document
    # ------------------------------------------------------------------ #
    def scan_document(self, doc_id: int, file_path: str) -> dict:
        """
        Scan a PDF to detect all extractable media without actually extracting.

        Args:
            doc_id: core_doc.doc_id
            file_path: Storage URI or URL to the PDF file

        Returns:
            media_scan_json dict written to core_doc.media_scan_json

        Side effects:
            - Sets core_doc.media_scan_status = 'scanned'
            - Populates core_doc.media_scan_json with detection results
            - Creates core_doc_media records with status='pending'
        """
        t0 = time.time()
        logger.info(f"[doc_id={doc_id}] Starting media scan")

        # Fetch doc metadata
        doc_meta = self._get_doc_meta(doc_id)
        if not doc_meta:
            logger.error(f"[doc_id={doc_id}] Document not found")
            return {}

        project_id = doc_meta['project_id']
        mime_type = doc_meta['mime_type']

        # Handle non-PDF documents
        if mime_type not in SCANNABLE_MIME_TYPES:
            return self._handle_non_scannable(doc_id, mime_type, file_path, project_id)

        # Set status to scanning
        self._set_media_scan_status(doc_id, 'scanning')

        # Download file to temp location
        tmp_path = self._download_to_temp(file_path)
        if not tmp_path:
            self._set_media_scan_status(doc_id, 'error')
            return {}

        try:
            return self._scan_pdf(doc_id, tmp_path, project_id)
        except fitz.FileDataError:
            logger.error(f"[doc_id={doc_id}] Password-protected or corrupted PDF")
            self._set_media_scan_status(doc_id, 'error')
            self._update_scan_json(doc_id)
            return {}
        except Exception:
            logger.exception(f"[doc_id={doc_id}] Media scan failed")
            self._set_media_scan_status(doc_id, 'error')
            return {}
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            elapsed = time.time() - t0
            logger.info(f"[doc_id={doc_id}] Media scan completed in {elapsed:.2f}s")

    # ------------------------------------------------------------------ #
    #  PUBLIC: extract_media
    # ------------------------------------------------------------------ #
    def extract_media(self, doc_id: int, file_path: str,
                      media_ids: list[int] = None,
                      extract_all: bool = False) -> list[dict]:
        """
        Extract images from a PDF and store them to disk.

        Args:
            doc_id: core_doc.doc_id
            file_path: Storage URI or URL to the PDF file
            media_ids: Optional list of specific core_doc_media.media_id to extract.
            extract_all: If True and media_ids is None, extract all pending items.

        Returns:
            List of dicts with extraction results per item.
        """
        t0 = time.time()
        logger.info(f"[doc_id={doc_id}] Starting media extraction (media_ids={media_ids}, extract_all={extract_all})")

        doc_meta = self._get_doc_meta(doc_id)
        if not doc_meta:
            logger.error(f"[doc_id={doc_id}] Document not found")
            return []

        project_id = doc_meta['project_id']

        # Get pending media records
        pending = self._get_pending_media(doc_id, media_ids, extract_all)
        if not pending:
            logger.info(f"[doc_id={doc_id}] No pending media to extract")
            return []

        self._set_media_scan_status(doc_id, 'extracting')

        # Download file to temp
        tmp_path = self._download_to_temp(file_path)
        if not tmp_path:
            self._set_media_scan_status(doc_id, 'error')
            return []

        results = []
        try:
            doc = fitz.open(tmp_path)
            try:
                for record in pending:
                    try:
                        result = self._extract_single(doc, record, project_id, doc_id)
                        results.append(result)
                    except Exception:
                        logger.exception(
                            f"[doc_id={doc_id}] Failed to extract media_id={record['media_id']}"
                        )
                        results.append({
                            'media_id': record['media_id'],
                            'status': 'error',
                            'error': 'Extraction failed',
                        })
            finally:
                doc.close()
        except fitz.FileDataError:
            logger.error(f"[doc_id={doc_id}] Password-protected or corrupted PDF")
            self._set_media_scan_status(doc_id, 'error')
            return results
        except Exception:
            logger.exception(f"[doc_id={doc_id}] Media extraction failed")
            self._set_media_scan_status(doc_id, 'error')
            return results
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            elapsed = time.time() - t0
            logger.info(f"[doc_id={doc_id}] Media extraction completed in {elapsed:.2f}s — {len(results)} items")

        # Update scan json and status
        self._update_scan_json(doc_id)

        # Auto-classify extracted items using heuristic (fast, free)
        try:
            from .media_classification_service import MediaClassificationService
            classifier = MediaClassificationService()
            classify_result = classifier.classify_document_media(doc_id, strategy='heuristic')
            logger.info(
                f"[doc_id={doc_id}] Auto-classification complete: "
                f"{classify_result.get('total_classified', 0)} items classified"
            )
        except Exception:
            logger.exception(f"[doc_id={doc_id}] Auto-classification failed (non-blocking)")

        # Check if all items are now extracted/classified
        remaining = self._count_pending(doc_id)
        if remaining == 0:
            self._set_media_scan_status(doc_id, 'complete')
        else:
            self._set_media_scan_status(doc_id, 'scanned')

        return results

    # ------------------------------------------------------------------ #
    #  INTERNAL: _scan_pdf
    # ------------------------------------------------------------------ #
    def _scan_pdf(self, doc_id: int, tmp_path: str, project_id: int) -> dict:
        """Core scan logic for PDFs."""
        doc = fitz.open(tmp_path)
        try:
            total_pages = len(doc)
            file_size = os.path.getsize(tmp_path)

            embedded_images = []
            page_candidates = []
            seen_xrefs = {}  # xref -> first occurrence media info

            # Delete existing 'pending' records for re-scan (preserve extracted/verified)
            self._delete_pending_records(doc_id)

            for page_num in range(total_pages):
                page = doc[page_num]
                display_page = page_num + 1  # 1-indexed for user display

                if page_num % 25 == 0 and page_num > 0:
                    logger.info(f"[doc_id={doc_id}] Scanning page {display_page}/{total_pages}")

                # Check if page is a capture candidate
                is_candidate, reason = self._is_page_capture_candidate(page)

                if is_candidate:
                    page_rect = page.rect
                    page_candidates.append({
                        'page': display_page,
                        'reason': reason,
                        'width': int(page_rect.width),
                        'height': int(page_rect.height),
                    })
                    # Create pending record for page capture
                    self._create_pending_record(
                        doc_id=doc_id,
                        project_id=project_id,
                        source_page=display_page,
                        extraction_method='page_capture',
                        width_px=int(page_rect.width * self.PAGE_CAPTURE_DPI / 72),
                        height_px=int(page_rect.height * self.PAGE_CAPTURE_DPI / 72),
                        asset_name=f"Page {display_page} capture",
                    )

                # Enumerate embedded images on this page
                image_list = page.get_images(full=True)
                for img_idx, img_info in enumerate(image_list):
                    xref = img_info[0]

                    # Get image dimensions from the xref
                    try:
                        img_meta = doc.extract_image(xref)
                    except Exception:
                        continue

                    if not img_meta or not img_meta.get('image'):
                        continue

                    width = img_meta.get('width', 0)
                    height = img_meta.get('height', 0)
                    colorspace_name = img_meta.get('cs-name', 'unknown')
                    bpc = img_meta.get('bpc', 8)
                    img_size = len(img_meta.get('image', b''))

                    # Filter out small images
                    if width < self.MIN_WIDTH_PX or height < self.MIN_HEIGHT_PX:
                        continue
                    if width * height < self.MIN_AREA_PX:
                        continue

                    img_record = {
                        'page': display_page,
                        'index': img_idx,
                        'xref': xref,
                        'width': width,
                        'height': height,
                        'colorspace': colorspace_name,
                        'bpc': bpc,
                        'size_bytes': img_size,
                    }

                    # Deduplicate by xref
                    if xref in seen_xrefs:
                        # Same image on another page — record additional page in source_region
                        existing_media_id = seen_xrefs[xref]
                        self._add_page_to_source_region(existing_media_id, display_page)
                        continue

                    embedded_images.append(img_record)

                    # Create pending record
                    media_id = self._create_pending_record(
                        doc_id=doc_id,
                        project_id=project_id,
                        source_page=display_page,
                        extraction_method='embedded',
                        width_px=width,
                        height_px=height,
                        asset_name=f"Page {display_page} image {img_idx + 1}",
                        source_region={'xref': xref, 'index': img_idx, 'additional_pages': []},
                    )
                    if media_id:
                        seen_xrefs[xref] = media_id

            # Build scan_json
            scan_json = {
                'scan_version': 1,
                'scanned_at': datetime.now(timezone.utc).isoformat(),
                'total_detected': len(embedded_images) + len(page_candidates),
                'total_extracted': 0,
                'by_color': {},
                'by_type': {},
                'raw_scan': {
                    'embedded_images': embedded_images,
                    'page_candidates': page_candidates,
                    'total_pages': total_pages,
                    'file_size_bytes': file_size,
                },
            }

            # Write scan_json and update status
            self._write_scan_json(doc_id, scan_json)
            self._set_media_scan_status(doc_id, 'scanned')

            logger.info(
                f"[doc_id={doc_id}] Scan complete: {len(embedded_images)} embedded images, "
                f"{len(page_candidates)} page candidates across {total_pages} pages"
            )

            return scan_json

        finally:
            doc.close()

    # ------------------------------------------------------------------ #
    #  INTERNAL: _extract_single
    # ------------------------------------------------------------------ #
    def _extract_single(self, doc: fitz.Document, record: dict,
                        project_id: int, doc_id: int) -> dict:
        """Extract a single media item (embedded or page capture)."""
        media_id = record['media_id']
        method = record['extraction_method']
        page_num = record['source_page']  # 1-indexed

        if method == 'embedded':
            return self._extract_single_embedded(
                doc, page_num, record.get('source_region', {}),
                project_id, doc_id, media_id
            )
        elif method == 'page_capture':
            return self._render_page_capture(
                doc, page_num, project_id, doc_id, media_id
            )
        else:
            return {'media_id': media_id, 'status': 'error', 'error': f'Unknown method: {method}'}

    # ------------------------------------------------------------------ #
    #  INTERNAL: _extract_single_embedded
    # ------------------------------------------------------------------ #
    def _extract_single_embedded(self, doc: fitz.Document, page_num: int,
                                  source_region: dict,
                                  project_id: int, doc_id: int,
                                  media_id: int) -> dict:
        """Extract a single embedded image from a PDF."""
        xref = source_region.get('xref')
        if not xref:
            # Fallback: find image by page and index
            page = doc[page_num - 1]
            img_list = page.get_images(full=True)
            idx = source_region.get('index', 0)
            if idx >= len(img_list):
                return {'media_id': media_id, 'status': 'error', 'error': 'Image index out of range'}
            xref = img_list[idx][0]

        try:
            img_data = doc.extract_image(xref)
        except Exception as e:
            return {'media_id': media_id, 'status': 'error', 'error': str(e)}

        if not img_data or not img_data.get('image'):
            return {'media_id': media_id, 'status': 'error', 'error': 'No image data'}

        image_bytes = img_data['image']
        ext = img_data.get('ext', 'png')
        width = img_data.get('width', 0)
        height = img_data.get('height', 0)

        # Handle CMYK → RGB conversion if needed
        cs_name = img_data.get('cs-name', '')
        if cs_name.upper() in ('CMYK', 'DEVICECMYK', 'ICCBASED'):
            try:
                pix = fitz.Pixmap(doc, xref)
                if pix.n > 3:  # CMYK or similar
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                image_bytes = pix.tobytes('png')
                ext = 'png'
                width = pix.width
                height = pix.height
            except Exception:
                logger.warning(f"[media_id={media_id}] CMYK conversion failed, using raw bytes")

        mime_type = f'image/{ext}' if ext != 'jpeg' else 'image/jpeg'
        if ext == 'jpg':
            mime_type = 'image/jpeg'

        # Build output paths (relative to media_root)
        rel_dir = f"{project_id}/{doc_id}/embedded"
        output_dir = self.media_root / rel_dir
        output_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{media_id}.{ext}"
        output_path = output_dir / filename
        output_path.write_bytes(image_bytes)

        storage_uri = f"media_assets/{rel_dir}/{filename}"

        # Generate thumbnail
        thumb_rel_dir = f"{project_id}/{doc_id}/thumbnails"
        thumb_dir = self.media_root / thumb_rel_dir
        thumb_dir.mkdir(parents=True, exist_ok=True)
        thumb_filename = f"{media_id}_thumb.jpg"
        thumb_path = thumb_dir / thumb_filename
        self._generate_thumbnail(str(output_path), str(thumb_path))
        thumbnail_uri = f"media_assets/{thumb_rel_dir}/{thumb_filename}"

        file_size = len(image_bytes)

        # Update the record
        self._update_media_record(
            media_id=media_id,
            storage_uri=storage_uri,
            thumbnail_uri=thumbnail_uri,
            mime_type=mime_type,
            file_size_bytes=file_size,
            width_px=width,
            height_px=height,
            status='extracted',
        )

        logger.info(
            f"[media_id={media_id}] Extracted embedded image: {width}x{height}, {file_size} bytes"
        )

        return {
            'media_id': media_id,
            'status': 'extracted',
            'storage_uri': storage_uri,
            'thumbnail_uri': thumbnail_uri,
            'width_px': width,
            'height_px': height,
            'file_size_bytes': file_size,
            'mime_type': mime_type,
        }

    # ------------------------------------------------------------------ #
    #  INTERNAL: _render_page_capture
    # ------------------------------------------------------------------ #
    def _render_page_capture(self, doc: fitz.Document, page_num: int,
                              project_id: int, doc_id: int,
                              media_id: int, dpi: int = None) -> dict:
        """Render an entire PDF page as a high-res PNG image."""
        dpi = dpi or self.PAGE_CAPTURE_DPI
        page = doc[page_num - 1]  # Convert 1-indexed to 0-indexed

        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)

        # Convert to PNG bytes
        image_bytes = pix.tobytes('png')
        width = pix.width
        height = pix.height

        # Build output paths
        rel_dir = f"{project_id}/{doc_id}/pages"
        output_dir = self.media_root / rel_dir
        output_dir.mkdir(parents=True, exist_ok=True)

        filename = f"page_{page_num}.png"
        output_path = output_dir / filename
        output_path.write_bytes(image_bytes)

        storage_uri = f"media_assets/{rel_dir}/{filename}"

        # Generate thumbnail
        thumb_rel_dir = f"{project_id}/{doc_id}/thumbnails"
        thumb_dir = self.media_root / thumb_rel_dir
        thumb_dir.mkdir(parents=True, exist_ok=True)
        thumb_filename = f"{media_id}_thumb.jpg"
        thumb_path = thumb_dir / thumb_filename
        self._generate_thumbnail(str(output_path), str(thumb_path))
        thumbnail_uri = f"media_assets/{thumb_rel_dir}/{thumb_filename}"

        file_size = len(image_bytes)

        self._update_media_record(
            media_id=media_id,
            storage_uri=storage_uri,
            thumbnail_uri=thumbnail_uri,
            mime_type='image/png',
            file_size_bytes=file_size,
            width_px=width,
            height_px=height,
            dpi=dpi,
            status='extracted',
        )

        logger.info(
            f"[media_id={media_id}] Rendered page {page_num}: {width}x{height} @ {dpi}dpi, {file_size} bytes"
        )

        return {
            'media_id': media_id,
            'status': 'extracted',
            'storage_uri': storage_uri,
            'thumbnail_uri': thumbnail_uri,
            'width_px': width,
            'height_px': height,
            'file_size_bytes': file_size,
            'mime_type': 'image/png',
            'dpi': dpi,
        }

    # ------------------------------------------------------------------ #
    #  INTERNAL: _generate_thumbnail
    # ------------------------------------------------------------------ #
    def _generate_thumbnail(self, image_path: str, thumb_path: str) -> str:
        """Generate a JPEG thumbnail from an image file."""
        try:
            with Image.open(image_path) as img:
                img.thumbnail(self.THUMB_MAX_SIZE, Image.LANCZOS)
                # Convert to RGB if necessary (e.g., RGBA, P mode)
                if img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')
                img.save(thumb_path, 'JPEG', quality=self.THUMB_QUALITY)
            return thumb_path
        except Exception:
            logger.exception(f"Thumbnail generation failed for {image_path}")
            return ''

    # ------------------------------------------------------------------ #
    #  INTERNAL: _is_page_capture_candidate
    # ------------------------------------------------------------------ #
    def _is_page_capture_candidate(self, page: fitz.Page) -> tuple[bool, str]:
        """
        Determine if a page should be captured as a full-page render.

        Returns: (is_candidate, reason)
        """
        page_rect = page.rect
        page_area = page_rect.width * page_rect.height
        if page_area <= 0:
            return False, ''

        # Get all images on the page with their bounding boxes
        image_list = page.get_images(full=True)
        image_rects = []
        for img in image_list:
            xref = img[0]
            try:
                instances = page.get_image_rects(xref)
                image_rects.extend([r for r in instances if r and not r.is_empty])
            except Exception:
                continue

        # Calculate total image area
        total_image_area = sum(r.width * r.height for r in image_rects)
        image_coverage = total_image_area / page_area

        if image_coverage > 0.70:
            return True, 'high_image_coverage'

        # Check for vector-heavy pages (drawings/diagrams)
        try:
            drawings = page.get_drawings()
        except Exception:
            drawings = []

        text_blocks = page.get_text('blocks')
        text_area = sum(
            (b[2] - b[0]) * (b[3] - b[1])
            for b in text_blocks
            if len(b) > 6 and b[6] == 0  # type 0 = text block
        )
        text_coverage = text_area / page_area

        if len(drawings) > 50 and text_coverage < 0.15:
            return True, 'vector_content'

        # Check for composited images (multiple images covering most of page)
        if len(image_rects) >= 3 and image_coverage > 0.50:
            return True, 'composited'

        return False, ''

    # ------------------------------------------------------------------ #
    #  INTERNAL: _handle_non_scannable
    # ------------------------------------------------------------------ #
    def _handle_non_scannable(self, doc_id: int, mime_type: str,
                               file_path: str, project_id: int) -> dict:
        """Handle non-PDF documents."""
        if mime_type in IMAGE_MIME_TYPES:
            # Direct image upload — the file IS the media asset
            self._create_upload_media_record(doc_id, project_id, file_path, mime_type)
            self._set_media_scan_status(doc_id, 'complete')
            scan_json = {
                'scan_version': 1,
                'scanned_at': datetime.now(timezone.utc).isoformat(),
                'total_detected': 1,
                'total_extracted': 1,
                'by_color': {},
                'by_type': {},
                'raw_scan': {'note': 'Direct image upload'},
            }
            self._write_scan_json(doc_id, scan_json)
            logger.info(f"[doc_id={doc_id}] Direct image upload — created media record")
            return scan_json

        # Non-scannable document type
        self._set_media_scan_status(doc_id, 'not_applicable')
        logger.info(f"[doc_id={doc_id}] Non-scannable mime_type={mime_type}")
        return {}

    # ------------------------------------------------------------------ #
    #  DATABASE HELPERS
    # ------------------------------------------------------------------ #
    def _get_doc_meta(self, doc_id: int) -> Optional[dict]:
        """Fetch document metadata."""
        with connection.cursor() as c:
            c.execute("""
                SELECT doc_id, project_id, mime_type, storage_uri, doc_name
                FROM landscape.core_doc
                WHERE doc_id = %s AND deleted_at IS NULL
            """, [doc_id])
            row = c.fetchone()
        if not row:
            return None
        return {
            'doc_id': row[0],
            'project_id': row[1],
            'mime_type': row[2] or '',
            'storage_uri': row[3],
            'doc_name': row[4],
        }

    def _set_media_scan_status(self, doc_id: int, status: str):
        """Update media_scan_status on core_doc."""
        with connection.cursor() as c:
            c.execute("""
                UPDATE landscape.core_doc
                SET media_scan_status = %s, updated_at = NOW()
                WHERE doc_id = %s
            """, [status, doc_id])

    def _write_scan_json(self, doc_id: int, scan_json: dict):
        """Write media_scan_json on core_doc."""
        with connection.cursor() as c:
            c.execute("""
                UPDATE landscape.core_doc
                SET media_scan_json = %s::jsonb, updated_at = NOW()
                WHERE doc_id = %s
            """, [json.dumps(scan_json), doc_id])

    def _delete_pending_records(self, doc_id: int):
        """Delete pending (not yet extracted) media records for a re-scan."""
        with connection.cursor() as c:
            c.execute("""
                DELETE FROM landscape.core_doc_media
                WHERE doc_id = %s AND status = 'pending'
            """, [doc_id])
            count = c.rowcount
        if count > 0:
            logger.info(f"[doc_id={doc_id}] Deleted {count} existing pending records for re-scan")

    def _create_pending_record(self, doc_id: int, project_id: int,
                                source_page: int, extraction_method: str,
                                width_px: int = None, height_px: int = None,
                                asset_name: str = None,
                                source_region: dict = None) -> Optional[int]:
        """Create a core_doc_media record with status='pending'."""
        with connection.cursor() as c:
            c.execute("""
                INSERT INTO landscape.core_doc_media
                    (doc_id, project_id, source_page, extraction_method,
                     width_px, height_px, asset_name, source_region,
                     storage_uri, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, '', 'pending', NOW(), NOW())
                RETURNING media_id
            """, [
                doc_id, project_id, source_page, extraction_method,
                width_px, height_px, asset_name,
                json.dumps(source_region) if source_region else None,
            ])
            row = c.fetchone()
        return row[0] if row else None

    def _add_page_to_source_region(self, media_id: int, page_num: int):
        """Add an additional page reference to a deduplicated image's source_region."""
        with connection.cursor() as c:
            c.execute("""
                UPDATE landscape.core_doc_media
                SET source_region = jsonb_set(
                    COALESCE(source_region, '{}'),
                    '{additional_pages}',
                    COALESCE(source_region->'additional_pages', '[]'::jsonb) || %s::jsonb
                ),
                updated_at = NOW()
                WHERE media_id = %s
            """, [json.dumps(page_num), media_id])

    def _get_pending_media(self, doc_id: int, media_ids: list[int] = None,
                           extract_all: bool = False) -> list[dict]:
        """Get pending media records for extraction."""
        with connection.cursor() as c:
            if media_ids:
                placeholders = ', '.join(['%s'] * len(media_ids))
                c.execute(f"""
                    SELECT media_id, source_page, extraction_method, source_region
                    FROM landscape.core_doc_media
                    WHERE doc_id = %s AND media_id IN ({placeholders})
                      AND status = 'pending' AND deleted_at IS NULL
                    ORDER BY source_page, media_id
                """, [doc_id] + media_ids)
            elif extract_all:
                c.execute("""
                    SELECT media_id, source_page, extraction_method, source_region
                    FROM landscape.core_doc_media
                    WHERE doc_id = %s AND status = 'pending' AND deleted_at IS NULL
                    ORDER BY source_page, media_id
                """, [doc_id])
            else:
                return []

            rows = c.fetchall()

        return [
            {
                'media_id': r[0],
                'source_page': r[1],
                'extraction_method': r[2],
                'source_region': r[3] if isinstance(r[3], dict) else (json.loads(r[3]) if r[3] else {}),
            }
            for r in rows
        ]

    def _count_pending(self, doc_id: int) -> int:
        """Count remaining pending records."""
        with connection.cursor() as c:
            c.execute("""
                SELECT COUNT(*) FROM landscape.core_doc_media
                WHERE doc_id = %s AND status = 'pending' AND deleted_at IS NULL
            """, [doc_id])
            return c.fetchone()[0]

    def _update_media_record(self, media_id: int, **kwargs):
        """Update a core_doc_media record with extraction results."""
        set_parts = []
        params = []
        for key, val in kwargs.items():
            set_parts.append(f"{key} = %s")
            params.append(val)
        set_parts.append("updated_at = NOW()")
        params.append(media_id)

        with connection.cursor() as c:
            c.execute(f"""
                UPDATE landscape.core_doc_media
                SET {', '.join(set_parts)}
                WHERE media_id = %s
            """, params)

    def _create_upload_media_record(self, doc_id: int, project_id: int,
                                     file_path: str, mime_type: str):
        """Create a media record for a directly-uploaded image file."""
        # Determine dimensions by downloading and opening
        width, height, file_size = None, None, None
        tmp = self._download_to_temp(file_path)
        if tmp:
            try:
                with Image.open(tmp) as img:
                    width, height = img.size
                file_size = os.path.getsize(tmp)

                # Generate thumbnail
                thumb_rel_dir = f"{project_id}/{doc_id}/thumbnails"
                thumb_dir = self.media_root / thumb_rel_dir
                thumb_dir.mkdir(parents=True, exist_ok=True)

                # We'll need the media_id first, so create record, then update
            finally:
                os.unlink(tmp)

        with connection.cursor() as c:
            c.execute("""
                INSERT INTO landscape.core_doc_media
                    (doc_id, project_id, extraction_method, storage_uri,
                     mime_type, width_px, height_px, file_size_bytes,
                     asset_name, status, created_at, updated_at)
                VALUES (%s, %s, 'upload', %s, %s, %s, %s, %s, 'Uploaded image', 'extracted', NOW(), NOW())
                RETURNING media_id
            """, [doc_id, project_id, file_path, mime_type, width, height, file_size])
            row = c.fetchone()

        if row and tmp:
            media_id = row[0]
            # Generate thumbnail from re-download
            tmp2 = self._download_to_temp(file_path)
            if tmp2:
                try:
                    thumb_rel_dir = f"{project_id}/{doc_id}/thumbnails"
                    thumb_dir = self.media_root / thumb_rel_dir
                    thumb_dir.mkdir(parents=True, exist_ok=True)
                    thumb_filename = f"{media_id}_thumb.jpg"
                    thumb_path = thumb_dir / thumb_filename
                    self._generate_thumbnail(tmp2, str(thumb_path))
                    thumbnail_uri = f"media_assets/{thumb_rel_dir}/{thumb_filename}"
                    self._update_media_record(media_id=media_id, thumbnail_uri=thumbnail_uri)
                finally:
                    os.unlink(tmp2)

    def _update_scan_json(self, doc_id: int):
        """Rebuild media_scan_json from current core_doc_media records."""
        with connection.cursor() as c:
            c.execute("""
                SELECT
                    COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
                    COUNT(*) FILTER (WHERE status IN ('extracted', 'classified', 'verified') AND deleted_at IS NULL) AS extracted
                FROM landscape.core_doc_media
                WHERE doc_id = %s
            """, [doc_id])
            row = c.fetchone()

        total = row[0] if row else 0
        extracted = row[1] if row else 0

        # Read existing scan_json to preserve raw_scan data
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
            'total_detected': total,
            'total_extracted': extracted,
        }

        self._write_scan_json(doc_id, scan_json)

    # ------------------------------------------------------------------ #
    #  FILE HELPERS
    # ------------------------------------------------------------------ #
    def _download_to_temp(self, storage_uri: str) -> Optional[str]:
        """
        Download a file to a temp path. Handles both URLs and local storage paths.
        Returns the temp file path, or None on failure.
        """
        try:
            if storage_uri.startswith(('http://', 'https://')):
                # Remote URL — download via requests
                response = requests.get(storage_uri, timeout=120)
                response.raise_for_status()
                suffix = os.path.splitext(storage_uri)[-1] or '.pdf'
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(response.content)
                    return tmp.name
            else:
                # Local storage path — read via default_storage
                try:
                    with default_storage.open(storage_uri, 'rb') as f:
                        content = f.read()
                except FileNotFoundError:
                    # Try as absolute path
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
            logger.exception(f"Failed to download file: {storage_uri}")
            return None
