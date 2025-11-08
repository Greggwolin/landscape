"""OCR integration modules for image-based PDF processing."""

from .tesseract_ocr import TesseractOCR, OCRQualityChecker
from .ocr_cache import OCRCache

__all__ = ['TesseractOCR', 'OCRQualityChecker', 'OCRCache']
