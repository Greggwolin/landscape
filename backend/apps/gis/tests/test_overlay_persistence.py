"""Drape-overlay persistence for warp_mode / scale / locked (SS14).

Exercises the raw-SQL ProjectOverlayViewSet create + partial_update paths against a
freshly-built ``tbl_project_overlay`` table (no FK, so no PostGIS needed). Verifies the
three SS14 fields round-trip on create, default correctly when omitted, and — the
important one — that a PATCH which omits them leaves the stored values untouched
(the same partial-update / no-wipe rule as SS13). Ownership denial is also asserted.

Session: LSCMD-SS-DRAPE-POLYGON-TPS-0724
"""

from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework import status
from rest_framework.test import APITestCase

from apps.projects.models import Project

User = get_user_model()

_CORNERS = [[-112.0, 33.51], [-111.98, 33.51], [-111.98, 33.49], [-112.0, 33.49]]


def _make_user(username, **extra):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com",
        password="TestPass123!", **extra,
    )


class _OverlayFixture(APITestCase):
    def setUp(self):
        self.owner = _make_user("ov_owner")
        self.other = _make_user("ov_other")
        self.project = Project.objects.create(project_name="Ov Owner", created_by=self.owner)
        with connection.cursor() as cursor:
            cursor.execute("CREATE SCHEMA IF NOT EXISTS landscape")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS landscape.tbl_project_overlay (
                    overlay_id       BIGSERIAL PRIMARY KEY,
                    project_id       INTEGER NOT NULL,
                    title            TEXT,
                    source_uri       TEXT NOT NULL,
                    corners          JSONB NOT NULL,
                    opacity          NUMERIC(4,3) NOT NULL DEFAULT 0.7,
                    rotation_deg     NUMERIC(6,2) NOT NULL DEFAULT 0,
                    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
                    source_doc_id    INTEGER,
                    source_page      INTEGER,
                    source_crop_bbox JSONB,
                    control_points   JSONB,
                    warp_mode        TEXT NOT NULL DEFAULT 'quad',
                    scale            NUMERIC(8,4) NOT NULL DEFAULT 1.0,
                    locked           BOOLEAN NOT NULL DEFAULT false
                )
                """
            )
            cursor.execute("TRUNCATE landscape.tbl_project_overlay RESTART IDENTITY")

    def _create(self, **overrides):
        body = {
            "source_uri": "https://example.test/plan.png",
            "corners": _CORNERS,
            "opacity": 0.6,
            "rotation_deg": 10,
        }
        body.update(overrides)
        return self.client.post(
            f"/api/projects/{self.project.project_id}/overlays/", body, format="json",
        )


class OverlayCreateDefaultsTests(_OverlayFixture):
    def test_create_defaults_quad_unscaled_unlocked(self):
        self.client.force_authenticate(self.owner)
        resp = self._create()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["warp_mode"], "quad")
        self.assertEqual(resp.data["scale"], 1.0)
        self.assertFalse(resp.data["locked"])

    def test_create_persists_tps_scale_lock(self):
        self.client.force_authenticate(self.owner)
        resp = self._create(warp_mode="tps", scale=1.5, locked=True)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["warp_mode"], "tps")
        self.assertEqual(resp.data["scale"], 1.5)
        self.assertTrue(resp.data["locked"])

    def test_create_rejects_bad_warp_mode(self):
        self.client.force_authenticate(self.owner)
        resp = self._create(warp_mode="bogus")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class OverlayPatchPreservesTests(_OverlayFixture):
    def _overlay_id(self):
        resp = self._create(warp_mode="tps", scale=1.25, locked=False)
        return resp.data["overlay_id"]

    def test_patch_locked_only_preserves_warp_and_scale(self):
        """The no-wipe rule: a PATCH touching only `locked` must not reset warp_mode/scale."""
        self.client.force_authenticate(self.owner)
        oid = self._overlay_id()
        resp = self.client.patch(f"/api/overlays/{oid}/", {"locked": True}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["locked"])
        self.assertEqual(resp.data["warp_mode"], "tps")   # preserved
        self.assertEqual(resp.data["scale"], 1.25)        # preserved
        self.assertEqual(resp.data["corners"], _CORNERS)  # preserved

    def test_patch_updates_warp_mode_and_scale(self):
        self.client.force_authenticate(self.owner)
        oid = self._overlay_id()
        resp = self.client.patch(
            f"/api/overlays/{oid}/", {"warp_mode": "quad", "scale": 2.0}, format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["warp_mode"], "quad")
        self.assertEqual(resp.data["scale"], 2.0)

    def test_non_owner_patch_is_404(self):
        self.client.force_authenticate(self.owner)
        oid = self._overlay_id()
        self.client.force_authenticate(self.other)
        resp = self.client.patch(f"/api/overlays/{oid}/", {"locked": True}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
