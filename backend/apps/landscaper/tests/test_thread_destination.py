"""Thread destination endpoint — envelope validation + read/write round trip.

A thread's `last_destination` MOVES THE USER'S SCREEN when the thread is
reopened, which is why it lives behind its own named action rather than riding
the ordinary thread PATCH: a title rename must never be able to relocate
someone. These tests pin that boundary and the validation that keeps
unrestorable junk out of the column.

The rule the negative cases protect: a destination that cannot be acted on is
worse than no destination at all. A NULL destination means "reopen the
transcript and leave the screen alone", which is the correct outcome for about
nine threads in ten. A malformed destination instead makes reopen look broken.

Derivation (which tool result means which destination) is a front-end concern
and is covered by src/lib/landscaper/threadDestination.test.ts.

Session: LSCMD-THREADDEST-0728-TA1
"""

import json

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.landscaper.models import ChatThread

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="dest_tester", email="dest@example.com", password="x"
    )


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def thread(db, user):
    """An unassigned thread — no project, so no project-access gate to satisfy."""
    return ChatThread.objects.create(
        project=None, page_context="map", created_by=user
    )


def _url(thread):
    return f"/api/landscaper/threads/{thread.id}/destination/"


# ---------------------------------------------------------------------------
# Round trip
# ---------------------------------------------------------------------------

def test_absent_destination_reads_as_null(client, thread):
    """The common case. Must be a clean null, not a 404 — a thread with nothing
    to restore is normal, not an error."""
    res = client.get(_url(thread))
    assert res.status_code == 200
    assert res.data["success"] is True
    assert res.data["destination"] is None


def test_get_carries_page_context_for_the_legacy_fallback(client, thread):
    """Threads created before this feature have no destination but may have a
    usable page_context. The client applies that fallback, so the raw inputs
    have to ride along on the GET."""
    res = client.get(_url(thread))
    assert res.data["pageContext"] == "map"
    assert "projectId" in res.data


def test_artifact_destination_round_trips(client, thread):
    payload = {
        "kind": "artifact",
        "artifactId": 412,
        "tool": "get_budget_schedule",
        "label": "Budget",
        "at": "2026-07-28T12:00:00.000Z",
    }
    res = client.put(_url(thread), data=json.dumps(payload),
                     content_type="application/json")
    assert res.status_code == 200
    assert res.data["destination"] == payload

    thread.refresh_from_db()
    assert thread.last_destination["artifactId"] == 412

    assert client.get(_url(thread)).data["destination"] == payload


def test_screen_destination_round_trips(client, thread):
    """The reported case: a chat that changed an overlay records the MAP, and
    records no instruction to re-apply anything."""
    payload = {
        "kind": "screen",
        "route": "/w/projects/9/map",
        "screen": "map",
        "tool": "control_map_overlay",
        "at": "2026-07-28T12:00:00.000Z",
    }
    res = client.put(_url(thread), data=json.dumps(payload),
                     content_type="application/json")
    assert res.status_code == 200

    thread.refresh_from_db()
    assert thread.last_destination["route"] == "/w/projects/9/map"
    assert "overlay_command" not in thread.last_destination


def test_last_productive_turn_wins(client, thread):
    """PUT semantics are whole-value replacement, not merge. A later artifact
    must not inherit the earlier destination's route."""
    first = {"kind": "screen", "route": "/w/projects/9/map",
             "tool": "control_map_overlay", "at": "2026-07-28T12:00:00.000Z"}
    second = {"kind": "artifact", "artifactId": 77,
              "tool": "get_budget_schedule", "at": "2026-07-28T12:05:00.000Z"}

    client.put(_url(thread), data=json.dumps(first), content_type="application/json")
    client.put(_url(thread), data=json.dumps(second), content_type="application/json")

    thread.refresh_from_db()
    assert thread.last_destination["kind"] == "artifact"
    assert "route" not in thread.last_destination


def test_null_clears_the_destination(client, thread):
    client.put(
        _url(thread),
        data=json.dumps({"kind": "artifact", "artifactId": 5, "tool": "t",
                         "at": "2026-07-28T12:00:00.000Z"}),
        content_type="application/json",
    )
    res = client.put(_url(thread), data="null", content_type="application/json")
    assert res.status_code == 200
    assert res.data["destination"] is None

    thread.refresh_from_db()
    assert thread.last_destination is None


# ---------------------------------------------------------------------------
# Validation — keep unrestorable values out of the column
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "payload,reason",
    [
        ({"kind": "wormhole", "route": "/w"}, "unknown kind"),
        ({"route": "/w/projects/9/map"}, "missing kind"),
        ({"kind": "artifact"}, "artifact with no id"),
        ({"kind": "artifact", "artifactId": "412"}, "artifact id must be an int"),
        ({"kind": "screen"}, "screen with neither route nor folder"),
        ([1, 2, 3], "not an object"),
    ],
)
def test_unrestorable_payloads_are_rejected(client, thread, payload, reason):
    res = client.put(_url(thread), data=json.dumps(payload),
                     content_type="application/json")
    assert res.status_code == 400, reason
    thread.refresh_from_db()
    assert thread.last_destination is None, f"rejected payload was stored ({reason})"


def test_screen_accepts_folder_without_route(client, thread):
    """Studio navigates in place by folder/tab and has no route — it is a valid
    screen destination and must not be caught by the route check."""
    payload = {"kind": "screen", "folder": "budget", "tab": "grid",
               "tool": "navigate_to_screen", "at": "2026-07-28T12:00:00.000Z"}
    res = client.put(_url(thread), data=json.dumps(payload),
                     content_type="application/json")
    assert res.status_code == 200
    thread.refresh_from_db()
    assert thread.last_destination["folder"] == "budget"


# ---------------------------------------------------------------------------
# The write path stays narrow
# ---------------------------------------------------------------------------

def test_thread_patch_cannot_set_a_destination(client, thread):
    """A title rename must not be able to move the user's screen. The ordinary
    thread PATCH ignores destination entirely."""
    res = client.patch(
        f"/api/landscaper/threads/{thread.id}/",
        data=json.dumps({
            "title": "renamed",
            "lastDestination": {"kind": "artifact", "artifactId": 999,
                                "tool": "x", "at": "2026-07-28T12:00:00.000Z"},
        }),
        content_type="application/json",
    )
    assert res.status_code == 200
    thread.refresh_from_db()
    assert thread.title == "renamed"
    assert thread.last_destination is None


def test_requires_authentication(thread):
    res = APIClient().get(_url(thread))
    assert res.status_code in (401, 403)
