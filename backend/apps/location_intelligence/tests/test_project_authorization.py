"""Project-ownership authorization on Location-Intelligence map endpoints.

Covers the map-feature and project-demographics endpoints: a logged-in non-owner
must get 404 (not the resource, not 403) for another user's project. Project-keyed
routes are checked before any raw SQL runs, so their denial path needs neither the
raw-SQL tables nor PostGIS. The feature-detail route (keyed only by feature id)
resolves the owning project from the row first; those tests build the raw-SQL
``project_map_features`` table and are skipped where PostGIS is unavailable.

Session: KP-GISAUTH-0629
"""

import uuid

from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework import status
from rest_framework.test import APITestCase

from apps.projects.models import Project

User = get_user_model()


def _make_user(username, **extra):
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="TestPass123!",
        **extra,
    )


def _postgis_available():
    try:
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis")
        return True
    except Exception:
        return False


class _ProjectAuthFixture(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = _make_user("li_owner")
        cls.other = _make_user("li_other")
        cls.staff = _make_user("li_staff", is_staff=True)
        cls.owner_project = Project.objects.create(project_name="LI Owner", created_by=cls.owner)
        cls.other_project = Project.objects.create(project_name="LI Other", created_by=cls.other)


class MapFeatureProjectKeyedAuthTests(_ProjectAuthFixture):
    """list (by project_id) and create (project_id in body) — guard short-circuits."""

    def test_non_owner_list_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.get(f"/api/v1/map/features/{self.owner_project.project_id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_create_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.post(
            "/api/v1/map/features/",
            {
                "project_id": self.owner_project.project_id,
                "feature_type": "point",
                "category": "annotation",
                "label": "x",
                "geometry": {"type": "Point", "coordinates": [0, 0]},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class DemographicsAuthorizationTests(_ProjectAuthFixture):
    """get / cache / delete project demographics — guard short-circuits."""

    def _base(self, project_id):
        return f"/api/v1/location-intelligence/demographics/project/{project_id}/"

    def test_non_owner_get_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.get(self._base(self.owner_project.project_id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_cache_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.post(
            self._base(self.owner_project.project_id) + "cache/",
            {"lat": 33.5, "lon": -112.0}, format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_delete_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.delete(self._base(self.owner_project.project_id) + "delete/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class MapFeatureDetailDenialTests(_ProjectAuthFixture):
    """Feature-detail denial: the route resolves the owning project from the row,
    then 404s a non-owner BEFORE any PostGIS function runs. So these need no
    PostGIS — the table uses a generic geometry column and NULL geometry.
    """

    def setUp(self):
        with connection.cursor() as cursor:
            cursor.execute("CREATE SCHEMA IF NOT EXISTS location_intelligence")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS location_intelligence.project_map_features (
                    id           UUID PRIMARY KEY,
                    project_id   INTEGER NOT NULL,
                    feature_type TEXT,
                    category     TEXT,
                    geometry     BYTEA,
                    label        TEXT,
                    notes        TEXT,
                    style        JSONB,
                    linked_table TEXT,
                    linked_id    TEXT,
                    area_sqft    DOUBLE PRECISION,
                    area_acres   DOUBLE PRECISION,
                    perimeter_ft DOUBLE PRECISION,
                    length_ft    DOUBLE PRECISION,
                    created_by   INTEGER,
                    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        self.owner_feature_id = self._insert_feature(self.owner_project.project_id, self.owner.id)

    def _insert_feature(self, project_id, user_id):
        fid = uuid.uuid4()
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO location_intelligence.project_map_features "
                "(id, project_id, feature_type, category, label, created_by) "
                "VALUES (%s, %s, 'point', 'annotation', 'x', %s)",
                [str(fid), project_id, user_id],
            )
        return fid

    def test_non_owner_retrieve_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.get(f"/api/v1/map/features/{self.owner_feature_id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_update_is_404(self):
        self.client.force_authenticate(self.other)
        resp = self.client.patch(
            f"/api/v1/map/features/{self.owner_feature_id}/", {"label": "hijack"}, format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_owner_destroy_is_404_and_row_survives(self):
        self.client.force_authenticate(self.other)
        resp = self.client.delete(f"/api/v1/map/features/{self.owner_feature_id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT count(*) FROM location_intelligence.project_map_features WHERE id = %s",
                [str(self.owner_feature_id)],
            )
            self.assertEqual(cursor.fetchone()[0], 1)

    def test_missing_feature_is_404(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(f"/api/v1/map/features/{uuid.uuid4()}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class MapFeatureDetailOwnerAccessTests(_ProjectAuthFixture):
    """Feature-detail owner/staff success — the GET path renders geometry via
    ST_AsGeoJSON, so this needs PostGIS. Skipped where PostGIS is unavailable.
    """

    def setUp(self):
        if not _postgis_available():
            self.skipTest("PostGIS not available in the test database")
        with connection.cursor() as cursor:
            cursor.execute("CREATE SCHEMA IF NOT EXISTS location_intelligence")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS location_intelligence.project_map_features (
                    id           UUID PRIMARY KEY,
                    project_id   INTEGER NOT NULL,
                    feature_type TEXT,
                    category     TEXT,
                    geometry     geometry,
                    label        TEXT,
                    notes        TEXT,
                    style        JSONB,
                    linked_table TEXT,
                    linked_id    TEXT,
                    area_sqft    DOUBLE PRECISION,
                    area_acres   DOUBLE PRECISION,
                    perimeter_ft DOUBLE PRECISION,
                    length_ft    DOUBLE PRECISION,
                    created_by   INTEGER,
                    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        self.owner_feature_id = uuid.uuid4()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO location_intelligence.project_map_features
                    (id, project_id, feature_type, category, geometry, label, created_by)
                VALUES (%s, %s, 'point', 'annotation', ST_GeomFromGeoJSON(%s), 'x', %s)
                """,
                [str(self.owner_feature_id), self.owner_project.project_id,
                 '{"type":"Point","coordinates":[0,0]}', self.owner.id],
            )

    def test_owner_can_retrieve_feature(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get(f"/api/v1/map/features/{self.owner_feature_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_staff_can_retrieve_any_feature(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.get(f"/api/v1/map/features/{self.owner_feature_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
