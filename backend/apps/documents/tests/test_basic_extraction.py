"""Basic tests for DMS extraction system."""

import pytest
import tempfile
import os
from pathlib import Path

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from apps.documents.testing.generators import (
    RentRollGenerator,
    OperatingStatementGenerator,
    ParcelTableGenerator
)
from apps.documents.extractors import (
    RentRollExtractor,
    OperatingExtractor,
    ParcelTableExtractor
)


class TestRentRollExtraction:
    """Test rent roll generation and extraction"""

    def test_institutional_pdf_generation(self):
        """Test institutional tier PDF generation"""
        generator = RentRollGenerator(tier='institutional', seed=42)

        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            pdf_path = tmp.name

        try:
            units_data = generator.generate_pdf(
                pdf_path,
                units_count=50,
                vacancy_rate=0.05,
                property_name="Test Property"
            )

            assert len(units_data) == 50
            assert os.path.exists(pdf_path)
            assert os.path.getsize(pdf_path) > 0

            # Check vacancy rate approximately matches
            vacant_count = sum(1 for u in units_data if u['status'] == 'Vacant')
            actual_vacancy = vacant_count / 50
            assert abs(actual_vacancy - 0.05) < 0.10  # Within 10%

        finally:
            if os.path.exists(pdf_path):
                os.unlink(pdf_path)

    def test_institutional_excel_generation(self):
        """Test institutional tier Excel generation"""
        generator = RentRollGenerator(tier='institutional', seed=42)

        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            excel_path = tmp.name

        try:
            units_data = generator.generate_excel(
                excel_path,
                units_count=50,
                vacancy_rate=0.05
            )

            assert len(units_data) == 50
            assert os.path.exists(excel_path)
            assert os.path.getsize(excel_path) > 0

        finally:
            if os.path.exists(excel_path):
                os.unlink(excel_path)

    def test_rentroll_excel_extraction(self):
        """Test rent roll extraction from Excel"""
        generator = RentRollGenerator(tier='institutional', seed=42)

        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            excel_path = tmp.name

        try:
            units_data = generator.generate_excel(excel_path, units_count=50)

            extractor = RentRollExtractor()
            result = extractor.extract(excel_path)

            assert result['metadata']['units_count'] == 50
            assert len(result['data']) == 50
            assert 'confidence_scores' in result
            assert 'validation_warnings' in result

            # Check average confidence
            if result['confidence_scores']:
                avg_confidence = sum(
                    sum(scores.values()) / len(scores) if scores else 0
                    for scores in result['confidence_scores']
                ) / len(result['confidence_scores'])

                assert avg_confidence >= 0.80  # Should be high for institutional

        finally:
            if os.path.exists(excel_path):
                os.unlink(excel_path)


class TestOperatingStatementExtraction:
    """Test operating statement generation and extraction"""

    def test_institutional_pdf_generation(self):
        """Test institutional tier operating statement PDF"""
        generator = OperatingStatementGenerator(tier='institutional', seed=42)

        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            pdf_path = tmp.name

        try:
            operating_data = generator.generate_pdf(
                pdf_path,
                units=200,
                property_name="Test Property"
            )

            assert 'revenue' in operating_data
            assert 'expenses' in operating_data
            assert 'noi' in operating_data
            assert operating_data['units'] == 200
            assert os.path.exists(pdf_path)

        finally:
            if os.path.exists(pdf_path):
                os.unlink(pdf_path)

    def test_operating_excel_extraction(self):
        """Test operating statement extraction from Excel"""
        generator = OperatingStatementGenerator(tier='institutional', seed=42)

        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            excel_path = tmp.name

        try:
            operating_data = generator.generate_excel(excel_path, units=200)

            extractor = OperatingExtractor()
            result = extractor.extract(excel_path)

            assert 'data' in result
            assert 'confidence_scores' in result
            assert len(result['data']) > 0

        finally:
            if os.path.exists(excel_path):
                os.unlink(excel_path)


class TestParcelTableExtraction:
    """Test parcel table generation and extraction"""

    def test_institutional_pdf_generation(self):
        """Test institutional tier parcel table PDF"""
        generator = ParcelTableGenerator(tier='institutional', seed=42)

        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            pdf_path = tmp.name

        try:
            parcel_data = generator.generate_pdf(
                pdf_path,
                parcel_count=20,
                property_name="Test MPC"
            )

            assert len(parcel_data) == 20
            assert os.path.exists(pdf_path)

        finally:
            if os.path.exists(pdf_path):
                os.unlink(pdf_path)

    def test_parcel_excel_extraction(self):
        """Test parcel table extraction from Excel"""
        generator = ParcelTableGenerator(tier='institutional', seed=42)

        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            excel_path = tmp.name

        try:
            parcel_data = generator.generate_excel(excel_path, parcel_count=20)

            extractor = ParcelTableExtractor()
            result = extractor.extract(excel_path)

            assert result['metadata']['parcels_count'] == 20
            assert len(result['data']) == 20

        finally:
            if os.path.exists(excel_path):
                os.unlink(excel_path)


class TestMultipleTiers:
    """Test extraction across all document tiers"""

    @pytest.mark.parametrize("tier,expected_confidence", [
        ("institutional", 0.85),
        ("regional", 0.70),
        ("owner_generated", 0.60),
    ])
    def test_rentroll_tiers(self, tier, expected_confidence):
        """Test rent roll extraction quality across tiers"""
        generator = RentRollGenerator(tier=tier, seed=42)

        with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
            excel_path = tmp.name

        try:
            generator.generate_excel(excel_path, units_count=30)

            extractor = RentRollExtractor()
            result = extractor.extract(excel_path)

            if result['confidence_scores']:
                avg_confidence = sum(
                    sum(scores.values()) / len(scores) if scores else 0
                    for scores in result['confidence_scores']
                ) / len(result['confidence_scores'])

                # Confidence should meet tier expectations
                assert avg_confidence >= expected_confidence * 0.8  # Allow 20% margin

        finally:
            if os.path.exists(excel_path):
                os.unlink(excel_path)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
