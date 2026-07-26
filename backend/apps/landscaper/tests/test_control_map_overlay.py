"""control_map_overlay bridge tool — payload + validation coverage (SS16).

The tool is a thin bridge: it validates the chat instruction and returns a command
({action, target, params}) the FRONT-END drains to drive the shipped drape handlers.
It renders nothing and writes nothing, so these are fast pure-function tests (no DB).

Session: LSCMD-SS-DRAPE-TOOL-WIRE-0724
"""

from apps.landscaper.tools.map_tools import control_map_overlay
from apps.landscaper.tool_registry import UNIVERSAL_TOOLS
from apps.landscaper.tool_schemas import LANDSCAPER_TOOLS

PID = 17


def _cmd(resp):
    return resp["overlay_command"]


def test_registered_universal_and_schema():
    assert "control_map_overlay" in UNIVERSAL_TOOLS
    names = {t["name"] for t in LANDSCAPER_TOOLS}
    assert "control_map_overlay" in names


def test_unknown_action_rejected():
    resp = control_map_overlay({"action": "teleport"}, project_id=PID)
    assert resp["success"] is False
    assert "Unknown action" in resp["error"]


def test_requires_project():
    resp = control_map_overlay({"action": "save"}, project_id=None)
    assert resp["success"] is False


def test_drape_requires_source_uri():
    resp = control_map_overlay({"action": "drape", "target": "selected_parcels"}, project_id=PID)
    assert resp["success"] is False
    assert "source_uri" in resp["error"]
    assert "relay_hint" in resp


def test_drape_ok_defaults_fit_true_and_navigates():
    resp = control_map_overlay(
        {"action": "drape", "target": "selected_parcels", "source_uri": "https://x/plan.png"},
        project_id=PID,
    )
    assert resp["success"] is True
    assert resp["action"] == "control_map_overlay"
    assert resp["navigate_to"] == f"/w/projects/{PID}/map"
    cmd = _cmd(resp)
    assert cmd["action"] == "drape"
    assert cmd["target"] == "selected_parcels"
    assert cmd["params"]["source_uri"] == "https://x/plan.png"
    assert cmd["params"]["fit"] is True


def test_bad_target_falls_back_to_auto():
    resp = control_map_overlay(
        {"action": "fit", "target": "nonsense"}, project_id=PID,
    )
    assert _cmd(resp)["target"] == "auto"


def test_opacity_percent_normalized():
    assert _cmd(control_map_overlay({"action": "set_opacity", "opacity": 60}, project_id=PID))["params"]["opacity"] == 0.6
    assert _cmd(control_map_overlay({"action": "set_opacity", "opacity": 0.4}, project_id=PID))["params"]["opacity"] == 0.4
    assert control_map_overlay({"action": "set_opacity"}, project_id=PID)["success"] is False


def test_scale_needs_absolute_or_delta():
    assert control_map_overlay({"action": "scale"}, project_id=PID)["success"] is False
    assert _cmd(control_map_overlay({"action": "scale", "scale_delta": 1.25}, project_id=PID))["params"]["scale_delta"] == 1.25
    assert _cmd(control_map_overlay({"action": "scale", "scale": 2.0}, project_id=PID))["params"]["scale"] == 2.0


def test_rotate_needs_absolute_or_delta():
    assert control_map_overlay({"action": "rotate"}, project_id=PID)["success"] is False
    assert _cmd(control_map_overlay({"action": "rotate", "rotation_delta": 15}, project_id=PID))["params"]["rotation_delta"] == 15


def test_warp_mode_validated():
    assert control_map_overlay({"action": "set_warp_mode", "warp_mode": "spline"}, project_id=PID)["success"] is False
    assert _cmd(control_map_overlay({"action": "set_warp_mode", "warp_mode": "tps"}, project_id=PID))["params"]["warp_mode"] == "tps"


def test_nudge_needs_direction():
    assert control_map_overlay({"action": "nudge"}, project_id=PID)["success"] is False
    assert _cmd(control_map_overlay({"action": "nudge", "direction": "east"}, project_id=PID))["params"]["direction"] == "east"


def test_lock_unlock_carry_locked_flag():
    assert _cmd(control_map_overlay({"action": "lock"}, project_id=PID))["params"]["locked"] is True
    assert _cmd(control_map_overlay({"action": "unlock"}, project_id=PID))["params"]["locked"] is False


def test_fit_and_save_minimal():
    for a in ("fit", "save"):
        resp = control_map_overlay({"action": a}, project_id=PID)
        assert resp["success"] is True
        assert _cmd(resp)["action"] == a
