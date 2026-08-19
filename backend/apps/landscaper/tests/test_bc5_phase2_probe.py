"""BC5 Phase 2 proof: deliberate failing assertion to confirm Backend Tests
goes red in CI. Reverted in the same session -- see
docs/audits/CHECK-INVENTORY-2026-08-19.md."""


def test_bc5_deliberately_fails():
    assert 1 == 2
