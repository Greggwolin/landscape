"""API views for GIS application."""

import json
from typing import Any, Dict, List, Optional

import requests
from django.db import connection
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from .serializers import GeoJSONSerializer, BoundarySerializer
from .parcel_services import COUNTY_PARCEL_SERVICES, normalize_county_code, ParcelServiceConfig

MAX_PARCEL_FEATURES = 5000


class GISViewSet(viewsets.ViewSet):
    """
    ViewSet for GIS operations.
    
    Endpoints:
    - GET /api/gis/boundaries/:project_id/ - Get project boundaries
    - POST /api/gis/boundaries/:project_id/ - Update project boundaries
    """
    
    @action(detail=False, methods=['get'], url_path='boundaries/(?P<project_id>[0-9]+)')
    def get_boundaries(self, request, project_id=None):
        """Get GIS boundaries for a project."""
        try:
            project = Project.objects.get(project_id=project_id)
            gis_metadata = project.gis_metadata or {}
            
            serializer = GeoJSONSerializer(gis_metadata)
            return Response({
                'project_id': project_id,
                'gis_metadata': serializer.data if gis_metadata else None
            })
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], url_path='boundaries/(?P<project_id>[0-9]+)')
    def update_boundaries(self, request, project_id=None):
        """Update GIS boundaries for a project."""
        try:
            project = Project.objects.get(project_id=project_id)
            
            # Validate and update gis_metadata
            serializer = GeoJSONSerializer(data=request.data)
            if serializer.is_valid():
                project.gis_metadata = serializer.validated_data
                project.save()
                
                return Response({
                    'project_id': project_id,
                    'gis_metadata': serializer.data,
                    'message': 'GIS metadata updated successfully'
                })
            else:
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )


def _build_arcgis_query_params(
    service: ParcelServiceConfig,
    *,
    where: str,
    bounds: Optional[List[float]] = None,
    result_offset: int = 0,
) -> Dict[str, Any]:
    params: Dict[str, Any] = {
        "f": "geojson",
        "where": where,
        "outFields": ",".join(
            [
                field
                for field in [
                    service.id_field,
                    service.owner_field,
                    service.address_field,
                    service.acres_field,
                    service.use_code_field,
                    service.use_desc_field,
                ]
                if field
            ]
        ),
        "returnGeometry": "true",
        "outSR": 4326,
        "resultRecordCount": service.max_records,
        "resultOffset": result_offset,
    }

    if bounds:
        params.update(
            {
                "geometry": ",".join([str(value) for value in bounds]),
                "geometryType": "esriGeometryEnvelope",
                "inSR": 4326,
                "spatialRel": "esriSpatialRelIntersects",
            }
        )

    return params


def _fetch_arcgis_geojson(
    service: ParcelServiceConfig,
    *,
    where: str,
    bounds: Optional[List[float]] = None,
) -> Dict[str, Any]:
    features: List[Dict[str, Any]] = []
    offset = 0
    page = 0
    max_pages = 20
    max_features = MAX_PARCEL_FEATURES

    while True:
        if len(features) >= max_features:
            break
        params = _build_arcgis_query_params(
            service,
            where=where,
            bounds=bounds,
            result_offset=offset,
        )

        response = requests.get(f"{service.url}/query", params=params, timeout=20)
        response.raise_for_status()
        payload = response.json()

        if payload.get("error"):
            raise RuntimeError(payload["error"].get("message", "ArcGIS query failed"))

        batch = payload.get("features", []) or []
        if batch:
            remaining = max_features - len(features)
            if remaining <= 0:
                break
            features.extend(batch[:remaining])
            if len(features) >= max_features:
                break

        if not payload.get("exceededTransferLimit") and len(batch) < service.max_records:
            break
        if len(batch) == 0:
            break

        offset += service.max_records
        page += 1
        if page >= max_pages:
            break

    return {"type": "FeatureCollection", "features": features}


def _normalize_feature_collection(
    county_code: str,
    service: ParcelServiceConfig,
    fc: Dict[str, Any],
) -> Dict[str, Any]:
    features: List[Dict[str, Any]] = []
    for index, feature in enumerate(fc.get("features", []) or []):
        props = feature.get("properties") or {}
        parcel_id = props.get(service.id_field)
        if parcel_id is None or parcel_id == "":
            parcel_id = props.get("OBJECTID") or props.get("ObjectID") or props.get("OBJECTID_1")
        if parcel_id is None or parcel_id == "":
            parcel_id = feature.get("id")
        if parcel_id is None or parcel_id == "":
            parcel_id = f"parcel-{index}"

        parcel_id_str = str(parcel_id)
        normalized_props = {
            **props,
            "parcel_id": parcel_id_str,
            "county": county_code,
            "owner": props.get(service.owner_field),
            "address": props.get(service.address_field),
            "acres": props.get(service.acres_field),
            "use_code": props.get(service.use_code_field),
            "use_desc": props.get(service.use_desc_field),
        }

        features.append(
            {
                "type": "Feature",
                "id": parcel_id_str,
                "geometry": feature.get("geometry"),
                "properties": normalized_props,
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "county": county_code,
            "count": len(features),
        },
    }


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def parcel_query(request):
    county_raw = request.data.get("county")
    county_code = normalize_county_code(county_raw)
    if not county_code:
        return Response(
            {"error": "Unsupported or missing county"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    service = COUNTY_PARCEL_SERVICES[county_code]
    bounds = request.data.get("bounds")
    parcel_id = request.data.get("id") or request.data.get("parcelId")

    if bounds:
        if isinstance(bounds, list) and len(bounds) == 2:
            bounds = [*bounds[0], *bounds[1]]
        if not isinstance(bounds, list) or len(bounds) != 4:
            return Response(
                {"error": "bounds must be [minLng, minLat, maxLng, maxLat]"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            bounds = [float(value) for value in bounds]
        except (TypeError, ValueError):
            return Response(
                {"error": "bounds must be numeric"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if not bounds and not parcel_id:
        return Response(
            {"error": "Provide either bounds or id"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    where_clause = "1=1"
    if parcel_id:
        safe_id = str(parcel_id).replace("'", "''")
        where_clause = f"{service.id_field} = '{safe_id}'"

    try:
        fc = _fetch_arcgis_geojson(service, where=where_clause, bounds=bounds)
        normalized = _normalize_feature_collection(county_code, service, fc)
        return Response(normalized)
    except Exception as error:
        return Response(
            {"error": f"Parcel query failed: {str(error)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def parcel_ingest(request):
    project_id = request.data.get("projectId") or request.data.get("project_id")
    parcels = request.data.get("parcels") or request.data.get("features")
    source = request.data.get("source") or "county_parcel_feed"

    if not project_id or not parcels:
        return Response(
            {"error": "projectId and parcels are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    normalized_features: List[Dict[str, Any]] = []
    for parcel in parcels:
        if not isinstance(parcel, dict):
            continue
        props = parcel.get("properties") or {}
        parcel_id = (
            parcel.get("parcelId")
            or parcel.get("parcel_id")
            or parcel.get("id")
            or props.get("PARCELID")
            or props.get("APN")
        )
        geom = parcel.get("geom") or parcel.get("geometry")
        if not parcel_id or not geom:
            continue

        props = {**props, "PARCELID": str(parcel_id), "APN": str(parcel_id)}
        normalized_features.append(
            {
                "parcelId": str(parcel_id),
                "geom": geom,
                "properties": props,
            }
        )

    if not normalized_features:
        return Response(
            {"error": "No valid parcels provided"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT landscape.ingest_tax_parcel_selection(%s, %s, %s::jsonb)",
                [int(project_id), source, json.dumps(normalized_features)],
            )

            cursor.execute(
                """
                SELECT
                    ST_Area(geom) / 4046.8564224 as acres,
                    ST_AsGeoJSON(geom) as boundary_geom,
                    source,
                    created_at
                FROM landscape.gis_project_boundary
                WHERE project_id = %s
                """,
                [int(project_id)],
            )
            boundary_row = cursor.fetchone()

        boundary = None
        if boundary_row:
            boundary = {
                "acres": float(boundary_row[0]) if boundary_row[0] is not None else None,
                "geometry": json.loads(boundary_row[1]) if boundary_row[1] else None,
                "source": boundary_row[2],
                "created_at": boundary_row[3],
            }

        return Response(
            {
                "success": True,
                "project_id": int(project_id),
                "parcels_processed": len(normalized_features),
                "boundary": boundary,
            }
        )
    except Exception as error:
        return Response(
            {"error": f"Failed to ingest parcels: {str(error)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
