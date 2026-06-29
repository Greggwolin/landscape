"""Project-ownership authorization on GIS / map endpoints.

Closes the authenticated-but-not-authorized gap: a logged-in user must not be
able to read or mutate another user's project boundaries, site-plan overlays, or
drawn map features by changing the id in the request. Inaccessible project-scoped
resources return 404 (not 403) so existence isn't leaked across accounts; the
project owner and staff/superusers retain full access.

Session: KP-GISAUTH-0629
"""

import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import connection
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase

from apps.projects.models import Project

User = get_user_model()

VALID_CORNERS = [[-112.0, 33.6], [-111.9, 33.6], [-111.9, 33.5], [-112.0, 33.5]]


def _make_user(username, **extra):
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="TestPass123!",
        **extra,
    )


class UserCanAccessProjectHelperTests(TestCase):
    """Unit tests for the shared ownership helper."""

    @classmethod
    def setUpTestData(cls):
        cls.owner = _make_user("owner")
        cls.other = _make_user("other")
        cls.staff = _make_user("staff", is_staff=True)
        cls.superuser = _make_user("super", is_superuser=True)
        cls.project = Project.objects.create(project_name="Owned", created_by=cls.owner)

    def _request(self, user):
        request = APIRequestFactory().get("/")
        request.user = user
        return request

    def test_owner_is_allowed(self):
        from apps.projects.permissions import user_can_access_project
        self.assertTrue(user_can_access_project(self._request(self.owner), self.project.project_id))

    def test_non_owner_is_denied(self):
        from apps.projects.permissions import user_can_access_project
        self.assertFalse(user_can_access_project(self._request(self.other), self.project.project_id))

    def test_staff_override_allowed(self):
        from apps.projects.permissions import user_can_access_project
        self.assertTrue(user_can_access_project(self._request(self.staff), self.project.project_id))

    def test_superuser_override_allowed(self):
        from apps.projects.permissions import user_can_access_project
        self.assertTrue(user_can_access_project(self._request(self.superuser), self.project.project_id))

    def test_nonexistent_project_is_denied(self):
        from apps.projects.permissions import user_can_access_project
        self.assertFalse(user_can_access_project(self._request(self.owner), 999999))

    def test_anonymous_is_denied(self):
        from apps.projects.permissions import user_can_access_project
        self.assertFalse(user_can_access_project(self._request(AnonymousUser()), self.project.project_id))

    def test_garbage_project_id_is_denied(self):
        from apps.projects.permissions import user_can_access_project
        self.assertFalse(user_can_access_project(self._request(self.owner), "not-an-int"))


class _ProjectAuthFixture(APITestCase):
    """Two users, each owning a project, plus a staff user."""

    @classmethod
    def setUpTestData(cls):
        cls.owner = _make_user("owner")
        cls.other = _make_user("other")
        cls.staff = _make_user("staff", is_staff=True)
        cls.owner_project = Project.objects.create(
            project_name="Owner Project", created_by=cls.owner,
            gis_metadata={"type": "FeatureCollection", "features": []},
        )
        cls.other_project = Project.objects.create(
            project_name="Other Project", created_by=cls.other,
            gis_metadata={"type": "FeatureCollection", "features": []},
        )


class GisBoundaryAuthorizationTests(_ProjectAuthFixture):
    """GISViewSet.get_boundaries / update_boundaries (tbl_project.gis_metadata)."""

    def _url(self, project_id):
        return f"/api/gis/boundaries/{project_id}/"

    # --- read ---------------------------------------------------------------
    def test_owner_can_read_boundaries(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(self._url(self.owner_project.project_id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_non_owner_read_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.get(self._url(self.owner_project.project_id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_can_read_any_boundaries(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.get(self._url(self.owner_project.project_id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_anonymous_read_is_denied(self):
        resp = self.client.get(self._url(self.owner_project.project_id))
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    # --- write --------------------------------------------------------------
    # NOTE: POST update_boundaries is a PRE-EXISTING dead route. The two @action
    # methods share the same url_path, so get_boundaries (GET) shadows
    # update_boundaries (POST) in the router and POST resolves to a 405 for
    # everyone. No frontend caller hits it (writes go through boundary_set /
    # parcel_ingest, covered below). We pin the 405 here rather than "fix" a dead
    # endpoint — that routing bug is out of scope for this authorization change.
    # The ownership guard is still added to update_boundaries defensively, in case
    # the route is ever made reachable. Boundary WRITE denial is asserted on the
    # reachable paths (parcel_ingest / boundary_set) in ParcelEndpointAuthorizationTests.
    def test_post_boundaries_is_shadowed_405(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.post(
            self._url(self.owner_project.project_id),
            {"type": "FeatureCollection", "features": []}, format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class ParcelEndpointAuthorizationTests(_ProjectAuthFixture):
    """parcel_ingest / boundary_set reject non-owners before touching raw SQL."""

    def test_non_owner_parcel_ingest_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.post(
            "/api/gis/parcel-ingest/",
            {"projectId": self.owner_project.project_id,
             "parcels": [{"parcelId": "1", "geom": {"type": "Point", "coordinates": [0, 0]}}]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_boundary_set_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.post(
            "/api/gis/boundary-set/",
            {"projectId": self.owner_project.project_id,
             "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [0, 0]]]}},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class OverlayAuthorizationTests(_ProjectAuthFixture):
    """ProjectOverlayViewSet — project-keyed and overlay-id-keyed routes.

    tbl_project_overlay is a raw-SQL table (no Django model), so it is created
    here for the test DB. It has no geometry column, so no PostGIS is required.
    """

    def setUp(self):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS landscape.tbl_project_overlay (
                    overlay_id       BIGSERIAL PRIMARY KEY,
                    project_id       INTEGER NOT NULL,
                    title            TEXT,
                    source_uri       TEXT NOT NULL,
                    corners          JSONB NOT NULL,
                    opacity          NUMERIC(4, 3) NOT NULL DEFAULT 0.7,
                    rotation_deg     NUMERIC(6, 2) NOT NULL DEFAULT 0,
                    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
                    source_doc_id    BIGINT,
                    source_page      INTEGER,
                    source_crop_bbox JSONB,
                    control_points   JSONB
                )
                """
            )
        self.owner_overlay_id = self._insert_overlay(self.owner_project.project_id)
        self.other_overlay_id = self._insert_overlay(self.other_project.project_id)

    def _insert_overlay(self, project_id):
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO landscape.tbl_project_overlay "
                "(project_id, title, source_uri, corners) "
                "VALUES (%s, %s, %s, %s::jsonb) RETURNING overlay_id",
                [project_id, "t", "https://x/y.png", json.dumps(VALID_CORNERS)],
            )
            return cursor.fetchone()[0]

    # --- project-keyed: list / create ---------------------------------------
    def test_owner_can_list_overlays(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(f"/api/projects/{self.owner_project.project_id}/overlays/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_non_owner_list_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.get(f"/api/projects/{self.owner_project.project_id}/overlays/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_create_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.post(
            f"/api/projects/{self.owner_project.project_id}/overlays/",
            {"source_uri": "https://x/z.png", "corners": VALID_CORNERS}, format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # --- overlay-id-keyed: retrieve / update / destroy ----------------------
    def test_owner_can_retrieve_overlay(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(f"/api/overlays/{self.owner_overlay_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_non_owner_retrieve_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.get(f"/api/overlays/{self.owner_overlay_id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_update_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.patch(
            f"/api/overlays/{self.owner_overlay_id}/", {"opacity": 0.5}, format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_destroy_is_404_and_row_survives(self):
        self.client.force_authenticate(self.other)
        resp = self.client.delete(f"/api/overlays/{self.owner_overlay_id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT count(*) FROM landscape.tbl_project_overlay WHERE overlay_id = %s",
                [self.owner_overlay_id],
            )
            self.assertEqual(cursor.fetchone()[0], 1)

    def test_staff_can_retrieve_any_overlay(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.get(f"/api/overlays/{self.owner_overlay_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_missing_overlay_is_404(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get("/api/overlays/987654/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
