"""
Excel Model Audit service.

Ported from the Cowork `excel-model-audit` skill to a server-side module
that Landscaper can invoke on any uploaded .xlsx/.xlsm workbook.

Pipeline (phased — implemented incrementally):
  Phase 0:  classify         -> flat / assumption-heavy / full-model
  Phase 1:  structural       -> sheet inventory, named ranges, external refs
  Phase 2:  formula_integ    -> error cells, broken refs, range consistency (2e)
  Phase 2f: impact_trace     -> BFS forward from errors to headline outputs
                                 (IRR, EM, DSCR, net CF, etc.) — auto for full_model
  Phase 3:  assumptions      -> labeled inputs with Sheet!Cell refs -> staging
  Phase 4:  waterfall_class  -> classify waterfall structure (pref/catchup/etc.)
  Phase 5:  replication      -> Python re-compute waterfall + debt, compare
  Phase 6:  sources_uses     -> S&U balance check
  Phase 7:  trust_score      -> aggregate findings -> 0-100 score

Implemented so far: Phases 0, 1, 2, 2f, 3, 4. Phases 5-7 land in follow-on turns.
"""

from .loader import load_workbook_from_doc, cleanup, UnsupportedFileError
from .classifier import classify, Tier
from .structural_scan import scan as structural_scan
from .formula_integrity import check as formula_integrity_check
from .assumption_extractor import extract as extract_assumptions
from .impact_tracer import run_impact_analysis, detect_sinks, trace as trace_impact
from .waterfall_classifier import classify as classify_waterfall
from .sources_uses import verify as verify_sources_uses
from .trust_score import compute as compute_trust_score
from .persistence import upsert_audit_phase

__all__ = [
    "load_workbook_from_doc",
    "cleanup",
    "UnsupportedFileError",
    "classify",
    "Tier",
    "structural_scan",
    "formula_integrity_check",
    "extract_assumptions",
    "run_impact_analysis",
    "detect_sinks",
    "trace_impact",
    "classify_waterfall",
    "verify_sources_uses",
    "compute_trust_score",
    "upsert_audit_phase",
]
