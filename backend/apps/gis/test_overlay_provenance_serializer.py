"""ProjectOverlaySerializer provenance-field tests (Phase 1: extract + place).

Source-document provenance (source_doc_id / source_page / source_crop_bbox) is
optional so that legacy overlay POSTs (no provenance) keep validating, while
extracted-plan overlays can carry where the PNG came from.

Session: LSCMD-PLANEXTRACT-P1-0620-ot4
"""
from apps.gis.serializers import ProjectOverlaySerializer

CORNERS = [[-112.0, 33.6], [-111.9, 33.6], [-111.9, 33.5], [-112.0, 33.5]]


def test_legacy_payload_without_provenance_is_valid():
    s = ProjectOverlaySerializer(data={"source_uri": "https://x/y.png", "corners": CORNERS})
    assert s.is_valid(), s.errors
    assert "source_doc_id" not in s.validated_data
    assert "source_page" not in s.validated_data
    assert "source_crop_bbox" not in s.validated_data


def test_provenance_fields_are_accepted():
    s = ProjectOverlaySerializer(data={
        "source_uri": "https://x/y.png",
        "corners": CORNERS,
        "source_doc_id": 42,
        "source_page": 3,
        "source_crop_bbox": {"x0": 0, "y0": 0, "x1": 100, "y1": 200},
    })
    assert s.is_valid(), s.errors
    assert s.validated_data["source_doc_id"] == 42
    assert s.validated_data["source_page"] == 3
    assert s.validated_data["source_crop_bbox"] == {"x0": 0, "y0": 0, "x1": 100, "y1": 200}


def test_partial_update_with_provenance_only_is_valid():
    s = ProjectOverlaySerializer(data={"source_page": 5}, partial=True)
    assert s.is_valid(), s.errors
    assert s.validated_data == {"source_page": 5}
