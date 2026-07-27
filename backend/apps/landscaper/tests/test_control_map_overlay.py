"""control_map_overlay — validation + server-side apply/persist coverage (SS18).

SS16 shipped this as a pure bridge: it returned an overlay_command the front-end
drained and wrote nothing. That was the silent-success defect — a chat "set opacity
to 30%" narrated "Done" while the command was dropped whenever the map/editor was
not open.

SS18 splits the tool in two:
  * PERSIST actions (opacity/scale/rotate/warp-mode/lock/unlock) apply AND save to
    tbl_project_overlay here, ownership-checked, and return applied=True ONLY when
    the UPDATE lands (cur.rowcount > 0). They take effect even off the map page.
  * GEOMETRIC actions (drape/fit/nudge/save) stay interactive — they open the map
    and return applied=False; the reply must say "opened the map", never "done".

Session: LSCMD-SS-DRAPECHAT-FIX-0724
"""

from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest

from apps.landscaper.tools import map_tools
from apps.landscaper.tools.map_tools import control_map_overlay
from apps.landscaper.tool_registry import UNIVERSAL_TOOLS
from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS

PID = 17
UID = 42  # a project owner


def _row(overlay_id=1, title="Site Plan", opacity=0.7, rot=0.0, scale=1.0,
         warp="quad", locked=False, cp=0):
    """A saved-overlay row in the exact shape _fetch_project_overlays returns:
    (overlay_id, title, opacity, rotation_deg, scale, warp_mode, locked, cp_count)."""
    return (overlay_id, title, opacity, rot, scale, warp, locked, cp)


@contextmanager
def _persist_env(overlays, rowcount=1, can_write=True):
    """Stub the three DB seams a persist action touches: ownership, the overlay
    fetch, and the UPDATE cursor (its rowcount decides applied)."""
    cur = MagicMock()
    cur.rowcount = rowcount
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cur
    conn.cursor.return_value.__exit__.return_value = False
    with patch.object(map_tools, "_user_can_write_project", return_value=can_write), \
         patch.object(map_tools, "_fetch_project_overlays", return_value=overlays), \
         patch.object(map_tools, "connection", conn):
        yield cur


def _cmd(resp):
    return resp["overlay_command"]


# ---- registration + guards (no DB) --------------------------------------------

def test_registered_universal_and_schema():
    assert "control_map_overlay" in UNIVERSAL_TOOLS
    assert "control_map_overlay" in {t["name"] for t in LANDSCAPER_TOOLS}


def test_unknown_action_rejected():
    resp = control_map_overlay({"action": "teleport"}, project_id=PID)
    assert resp["success"] is False and resp["applied"] is False
    assert "Unknown action" in resp["error"]


def test_requires_project():
    resp = control_map_overlay({"action": "save"}, project_id=None)
    assert resp["success"] is False and resp["applied"] is False


# ---- geometric actions: applied is ALWAYS False (interactive) -----------------

def test_drape_requires_source_uri():
    resp = control_map_overlay({"action": "drape", "target": "selected_parcels"}, project_id=PID)
    assert resp["success"] is False and resp["applied"] is False
    assert resp["error"] == "drape_needs_source"
    assert "relay_hint" in resp


def test_drape_opens_map_not_applied():
    resp = control_map_overlay(
        {"action": "drape", "target": "selected_parcels", "source_uri": "https://x/plan.png"},
        project_id=PID,
    )
    assert resp["success"] is True
    assert resp["applied"] is False                       # interactive — never "done"
    assert resp["action_required"] == "map_placement"
    assert resp["navigate_to"] == f"/w/projects/{PID}/map"
    cmd = _cmd(resp)
    assert cmd["action"] == "drape"
    assert cmd["target"] == "selected_parcels"
    assert cmd["params"]["source_uri"] == "https://x/plan.png"
    assert cmd["params"]["fit"] is True


def test_bad_target_falls_back_to_auto():
    assert _cmd(control_map_overlay({"action": "fit", "target": "nonsense"}, project_id=PID))["target"] == "auto"


def test_nudge_needs_direction():
    resp = control_map_overlay({"action": "nudge"}, project_id=PID)
    assert resp["success"] is False and resp["applied"] is False


def test_fit_and_save_are_interactive():
    for a in ("fit", "save"):
        resp = control_map_overlay({"action": a}, project_id=PID)
        assert resp["success"] is True and resp["applied"] is False
        assert _cmd(resp)["action"] == a


# ---- persist actions: ownership + real write confirmation ---------------------

def test_persist_forbidden_without_ownership():
    # No user / not an owner -> denied; must NOT report success.
    resp = control_map_overlay({"action": "set_opacity", "opacity": 30}, project_id=PID, user_id=None)
    assert resp["success"] is False and resp["applied"] is False
    assert resp["error"] == "forbidden"


def test_persist_no_saved_overlay():
    with _persist_env(overlays=[]):
        resp = control_map_overlay({"action": "set_opacity", "opacity": 30}, project_id=PID, user_id=UID)
    assert resp["applied"] is False
    assert resp["error"] == "no_saved_overlay"


def test_multi_overlay_asks_which():
    with _persist_env(overlays=[_row(1, "A"), _row(2, "B")]):
        resp = control_map_overlay({"action": "lock"}, project_id=PID, user_id=UID)
    assert resp["applied"] is False
    assert resp["needs_disambiguation"] is True
    assert {o["overlay_id"] for o in resp["overlays"]} == {1, 2}


def test_overlay_id_selects_target():
    with _persist_env(overlays=[_row(1, "A"), _row(2, "B", locked=False)]):
        resp = control_map_overlay({"action": "lock", "overlay_id": 2}, project_id=PID, user_id=UID)
    assert resp["applied"] is True
    assert resp["overlay_id"] == 2


def test_opacity_applies_and_persists():
    with _persist_env(overlays=[_row(opacity=0.7)]) as cur:
        resp = control_map_overlay({"action": "set_opacity", "opacity": 30}, project_id=PID, user_id=UID)
    assert resp["success"] is True and resp["applied"] is True
    assert resp["changed"] == {"opacity": 0.3}            # 30% -> 0.3
    assert "30%" in resp["message"]
    assert cur.execute.called                             # the UPDATE actually ran


def test_opacity_percent_normalized():
    for given, stored in ((60, 0.6), (0.4, 0.4)):
        with _persist_env(overlays=[_row()]):
            resp = control_map_overlay({"action": "set_opacity", "opacity": given}, project_id=PID, user_id=UID)
        assert resp["changed"]["opacity"] == stored


def test_opacity_needs_value():
    with _persist_env(overlays=[_row()]):
        resp = control_map_overlay({"action": "set_opacity"}, project_id=PID, user_id=UID)
    assert resp["applied"] is False and resp["error"] == "bad_opacity"


def test_write_failed_is_not_reported_as_done():
    # rowcount 0 -> the write did not land -> applied MUST be False. Core §15.2 guard.
    with _persist_env(overlays=[_row()], rowcount=0):
        resp = control_map_overlay({"action": "set_opacity", "opacity": 30}, project_id=PID, user_id=UID)
    assert resp["success"] is False and resp["applied"] is False
    assert resp["error"] == "write_failed"


def test_scale_absolute_and_delta():
    with _persist_env(overlays=[_row(scale=1.0)]):
        assert control_map_overlay({"action": "scale"}, project_id=PID, user_id=UID)["applied"] is False
    with _persist_env(overlays=[_row(scale=2.0)]):
        resp = control_map_overlay({"action": "scale", "scale_delta": 1.25}, project_id=PID, user_id=UID)
    assert resp["applied"] is True
    assert resp["changed"]["scale"] == pytest.approx(2.5)  # 2.0 * 1.25


def test_rotate_absolute_and_delta():
    with _persist_env(overlays=[_row(rot=10.0)]):
        resp = control_map_overlay({"action": "rotate", "rotation_delta": 15}, project_id=PID, user_id=UID)
    assert resp["applied"] is True
    assert resp["changed"]["rotation_deg"] == pytest.approx(25.0)


def test_warp_mode_validated_and_needs_control_points():
    with _persist_env(overlays=[_row()]):
        assert control_map_overlay(
            {"action": "set_warp_mode", "warp_mode": "spline"}, project_id=PID, user_id=UID
        )["applied"] is False
    with _persist_env(overlays=[_row(cp=1)]):
        resp = control_map_overlay({"action": "set_warp_mode", "warp_mode": "tps"}, project_id=PID, user_id=UID)
    assert resp["applied"] is False and resp["error"] == "tps_needs_control_points"
    with _persist_env(overlays=[_row(cp=4)]):
        resp = control_map_overlay({"action": "set_warp_mode", "warp_mode": "tps"}, project_id=PID, user_id=UID)
    assert resp["applied"] is True and resp["changed"]["warp_mode"] == "tps"


def test_lock_unlock_persist():
    with _persist_env(overlays=[_row(locked=False)]):
        resp = control_map_overlay({"action": "lock"}, project_id=PID, user_id=UID)
    assert resp["applied"] is True and resp["changed"]["locked"] is True
    with _persist_env(overlays=[_row(locked=True)]):
        resp = control_map_overlay({"action": "unlock"}, project_id=PID, user_id=UID)
    assert resp["applied"] is True and resp["changed"]["locked"] is False
