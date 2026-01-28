"""API views for Location Intelligence."""

import json

from django.db import connection
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

from .services.demographics_service import DemographicsService
from .services.poi_service import get_pois_with_cache, get_poi_stats
from .services.geocode_service import reverse_geocode
from .services.user_points_service import (
    create_user_point,
    get_user_points,
    get_user_point,
    update_user_point,
    delete_user_point,
    VALID_CATEGORIES,
)
from .serializers import DemographicsResponseSerializer, BlockGroupStatsSerializer


demographics_service = DemographicsService()


@extend_schema(
    summary="Get ring demographics for coordinates",
    description="""
    Calculate area-weighted demographics for 1, 3, and 5-mile radius rings
    around a given latitude/longitude point.

    Uses Census ACS 5-Year estimates and PostGIS spatial queries for
    accurate area-weighted aggregation of block group demographics.
    """,
    parameters=[
        OpenApiParameter(
            name="lat",
            type=float,
            location=OpenApiParameter.QUERY,
            required=True,
            description="Latitude of center point"
        ),
        OpenApiParameter(
            name="lon",
            type=float,
            location=OpenApiParameter.QUERY,
            required=True,
            description="Longitude of center point"
        ),
        OpenApiParameter(
            name="radius",
            type=str,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Comma-separated radii in miles (default: 1,3,5)"
        ),
    ],
    responses={
        200: DemographicsResponseSerializer,
        400: OpenApiExample(
            "Bad Request",
            value={"error": "lat and lon are required query parameters"}
        )
    },
    tags=["Location Intelligence"]
)
@api_view(["GET"])
def get_demographics(request):
    """
    GET /api/v1/location-intelligence/demographics/

    Calculate ring demographics for a given latitude/longitude.

    Query params:
        lat: Latitude (required)
        lon: Longitude (required)
        radius: Comma-separated radii in miles (optional, default: 1,3,5)
    """
    lat = request.query_params.get("lat")
    lon = request.query_params.get("lon")
    radius_param = request.query_params.get("radius")

    # Validate required params
    if not lat or not lon:
        return Response(
            {"error": "lat and lon are required query parameters"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        return Response(
            {"error": "lat and lon must be valid numbers"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate coordinate ranges
    if not (-90 <= lat <= 90):
        return Response(
            {"error": "lat must be between -90 and 90"},
            status=status.HTTP_400_BAD_REQUEST
        )
    if not (-180 <= lon <= 180):
        return Response(
            {"error": "lon must be between -180 and 180"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Parse optional radii
    radii = None
    if radius_param:
        try:
            radii = [float(r.strip()) for r in radius_param.split(",")]
            # Validate radii values
            for r in radii:
                if r not in [1, 3, 5]:
                    return Response(
                        {"error": "radius values must be 1, 3, or 5"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except ValueError:
            return Response(
                {"error": "radius must be comma-separated numbers (1, 3, 5)"},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Calculate demographics
    result = demographics_service.get_ring_demographics(lat, lon, radii)

    return Response(result)


@extend_schema(
    summary="Get cached ring demographics for a project",
    description="""
    Retrieve cached ring demographics for a project.
    Returns demographics that were previously calculated and stored.
    """,
    responses={
        200: DemographicsResponseSerializer,
        404: OpenApiExample(
            "Not Found",
            value={"error": "No cached demographics for this project"}
        )
    },
    tags=["Location Intelligence"]
)
@api_view(["GET"])
def get_project_demographics(request, project_id):
    """
    GET /api/v1/location-intelligence/demographics/project/{project_id}/

    Get cached ring demographics for a project.
    """
    try:
        project_id = int(project_id)
    except ValueError:
        return Response(
            {"error": "Invalid project_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    result = demographics_service.get_cached_demographics(project_id)

    if result is None:
        return Response(
            {"error": "No cached demographics for this project"},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response(result)


@extend_schema(
    summary="Cache ring demographics for a project",
    description="""
    Calculate and cache ring demographics for a project location.
    Requires lat and lon in the request body.
    """,
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "lat": {"type": "number", "description": "Project latitude"},
                "lon": {"type": "number", "description": "Project longitude"}
            },
            "required": ["lat", "lon"]
        }
    },
    responses={
        201: DemographicsResponseSerializer,
        400: OpenApiExample(
            "Bad Request",
            value={"error": "lat and lon are required"}
        )
    },
    tags=["Location Intelligence"]
)
@api_view(["POST"])
def cache_project_demographics(request, project_id):
    """
    POST /api/v1/location-intelligence/demographics/project/{project_id}/

    Calculate and cache ring demographics for a project.
    """
    try:
        project_id = int(project_id)
    except ValueError:
        return Response(
            {"error": "Invalid project_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    lat = request.data.get("lat")
    lon = request.data.get("lon")

    if lat is None or lon is None:
        return Response(
            {"error": "lat and lon are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        return Response(
            {"error": "lat and lon must be valid numbers"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Cache the demographics
    success = demographics_service.cache_project_demographics(project_id, lat, lon)

    if not success:
        return Response(
            {"error": "Failed to calculate demographics"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Return the cached result
    result = demographics_service.get_cached_demographics(project_id)
    return Response(result, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Delete cached demographics for a project",
    description="Clear cached ring demographics when project location changes.",
    responses={
        204: None,
        400: OpenApiExample(
            "Bad Request",
            value={"error": "Invalid project_id"}
        )
    },
    tags=["Location Intelligence"]
)
@api_view(["DELETE"])
def delete_project_demographics(request, project_id):
    """
    DELETE /api/v1/location-intelligence/demographics/project/{project_id}/

    Delete cached ring demographics for a project.
    """
    try:
        project_id = int(project_id)
    except ValueError:
        return Response(
            {"error": "Invalid project_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    demographics_service.invalidate_cache(project_id)
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    summary="Get block group statistics",
    description="Get statistics about loaded block groups and demographics data.",
    responses={200: BlockGroupStatsSerializer},
    tags=["Location Intelligence"]
)
@api_view(["GET"])
@permission_classes([AllowAny])
def get_stats(request):
    """
    GET /api/v1/location-intelligence/stats/

    Get statistics about loaded block groups and demographics.
    """
    stats = demographics_service.get_block_group_stats()

    # Add POI stats
    poi_stats = get_poi_stats()
    stats['poi_cache'] = poi_stats

    return Response(stats)


# =============================================================================
# POI ENDPOINTS
# =============================================================================

@extend_schema(
    summary="Get nearby POIs",
    description="""
    Query OpenStreetMap for Points of Interest within a radius.

    Results are cached for 30 days. Use refresh=true to bypass cache.

    Categories: hospital, grocery, school, university, transit, park
    """,
    parameters=[
        OpenApiParameter(
            name="lat",
            type=float,
            location=OpenApiParameter.QUERY,
            required=True,
            description="Center latitude"
        ),
        OpenApiParameter(
            name="lon",
            type=float,
            location=OpenApiParameter.QUERY,
            required=True,
            description="Center longitude"
        ),
        OpenApiParameter(
            name="radius",
            type=float,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Radius in miles (default: 5)"
        ),
        OpenApiParameter(
            name="categories",
            type=str,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Comma-separated category list"
        ),
        OpenApiParameter(
            name="refresh",
            type=bool,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Set to true to bypass cache"
        ),
    ],
    tags=["Location Intelligence - POIs"]
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_pois(request):
    """
    GET /api/v1/location-intelligence/pois/

    Get nearby Points of Interest from OpenStreetMap.

    Query params:
        lat: Center latitude (required)
        lon: Center longitude (required)
        radius: Radius in miles (default: 5)
        categories: Comma-separated category list (optional)
        refresh: If 'true', bypass cache
    """
    lat = request.query_params.get("lat")
    lon = request.query_params.get("lon")

    if not lat or not lon:
        return Response(
            {"error": "lat and lon are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        return Response(
            {"error": "lat and lon must be numbers"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate coordinate ranges
    if not (-90 <= lat <= 90):
        return Response(
            {"error": "lat must be between -90 and 90"},
            status=status.HTTP_400_BAD_REQUEST
        )
    if not (-180 <= lon <= 180):
        return Response(
            {"error": "lon must be between -180 and 180"},
            status=status.HTTP_400_BAD_REQUEST
        )

    radius = float(request.query_params.get("radius", 5))
    categories_param = request.query_params.get("categories")
    categories = [c.strip() for c in categories_param.split(",")] if categories_param else None
    force_refresh = request.query_params.get("refresh", "").lower() == "true"

    result = get_pois_with_cache(
        lat=lat,
        lon=lon,
        radius_miles=radius,
        categories=categories,
        force_refresh=force_refresh,
    )

    return Response(result)


# =============================================================================
# REVERSE GEOCODING ENDPOINTS
# =============================================================================

@extend_schema(
    summary="Reverse geocode coordinates",
    description="""
    Convert coordinates to a human-readable address using OpenStreetMap Nominatim.

    Rate limited to 1 request per second per OSM policy.
    """,
    parameters=[
        OpenApiParameter(
            name="lat",
            type=float,
            location=OpenApiParameter.QUERY,
            required=True,
            description="Latitude"
        ),
        OpenApiParameter(
            name="lon",
            type=float,
            location=OpenApiParameter.QUERY,
            required=True,
            description="Longitude"
        ),
    ],
    tags=["Location Intelligence - Geocoding"]
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_reverse_geocode(request):
    """
    GET /api/v1/location-intelligence/reverse-geocode/

    Reverse geocode coordinates to an address.

    Query params:
        lat: Latitude (required)
        lon: Longitude (required)
    """
    lat = request.query_params.get("lat")
    lon = request.query_params.get("lon")

    if not lat or not lon:
        return Response(
            {"error": "lat and lon are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        return Response(
            {"error": "lat and lon must be numbers"},
            status=status.HTTP_400_BAD_REQUEST
        )

    result = reverse_geocode(lat, lon)
    return Response(result)


# =============================================================================
# USER MAP POINTS ENDPOINTS
# =============================================================================

@extend_schema(
    summary="Get user map points",
    description="""
    Get user-created map points (comps, amenities, custom markers).

    Can filter by project, and optionally include global points.
    """,
    parameters=[
        OpenApiParameter(
            name="project_id",
            type=int,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Filter by project ID"
        ),
        OpenApiParameter(
            name="include_global",
            type=bool,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Include global points (default: true)"
        ),
        OpenApiParameter(
            name="categories",
            type=str,
            location=OpenApiParameter.QUERY,
            required=False,
            description="Comma-separated category filter"
        ),
    ],
    tags=["Location Intelligence - User Points"]
)
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def user_points_list(request):
    """
    GET /api/v1/location-intelligence/points/
    POST /api/v1/location-intelligence/points/

    List or create user map points.
    """
    if request.method == "GET":
        project_id = request.query_params.get("project_id")
        if project_id:
            try:
                project_id = int(project_id)
            except ValueError:
                return Response(
                    {"error": "Invalid project_id"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        include_global = request.query_params.get("include_global", "true").lower() == "true"
        categories_param = request.query_params.get("categories")
        categories = [c.strip() for c in categories_param.split(",")] if categories_param else None

        points = get_user_points(
            project_id=project_id,
            user_id=request.user.id,
            include_global=include_global,
            categories=categories,
        )

        return Response({"points": points, "count": len(points)})

    # POST - create new point
    data = request.data

    required_fields = ["lat", "lon", "category", "label"]
    for field in required_fields:
        if field not in data:
            return Response(
                {"error": f"{field} is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

    if data["category"] not in VALID_CATEGORIES:
        return Response(
            {"error": f"category must be one of: {VALID_CATEGORIES}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(data["lat"])
        lon = float(data["lon"])
    except (ValueError, TypeError):
        return Response(
            {"error": "lat and lon must be valid numbers"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        point = create_user_point(
            lat=lat,
            lon=lon,
            category=data["category"],
            label=data["label"],
            project_id=data.get("project_id"),
            user_id=request.user.id,
            scope=data.get("scope", "project"),
            address=data.get("address"),
            poi_name=data.get("poi_name"),
            custom_category=data.get("custom_category"),
            notes=data.get("notes"),
            attributes=data.get("attributes"),
        )

        return Response(point, status=status.HTTP_201_CREATED)

    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to create point: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    summary="Get, update, or delete a user map point",
    description="Manage a specific user map point by ID.",
    tags=["Location Intelligence - User Points"]
)
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def user_point_detail(request, point_id):
    """
    GET/PATCH/DELETE /api/v1/location-intelligence/points/{point_id}/

    Get, update, or delete a user map point.
    """
    if request.method == "GET":
        point = get_user_point(str(point_id), user_id=request.user.id)
        if not point:
            return Response(
                {"error": "Point not found or not owned by user"},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(point)

    if request.method == "PATCH":
        point = update_user_point(
            str(point_id),
            user_id=request.user.id,
            **request.data
        )
        if not point:
            return Response(
                {"error": "Point not found or not owned by user"},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(point)

    # DELETE
    deleted = delete_user_point(str(point_id), user_id=request.user.id)

    if deleted:
        return Response(status=status.HTTP_204_NO_CONTENT)
    else:
        return Response(
            {"error": "Point not found or not owned by user"},
            status=status.HTTP_404_NOT_FOUND
        )


# =============================================================================
# MAP FEATURES ENDPOINTS (for draw tools)
# =============================================================================

VALID_FEATURE_TYPES = ['point', 'line', 'polygon', 'linestring', 'measurement']
VALID_FEATURE_CATEGORIES = [
    'boundary', 'trade_area', 'land_sale', 'building_sale',
    'annotation', 'measurement', 'custom'
]


@extend_schema(
    summary="List map features for a project",
    description="""
    Get all user-drawn map features (points, lines, polygons) for a project.
    Returns GeoJSON geometry and metadata for each feature.
    """,
    parameters=[
        OpenApiParameter(
            name="project_id",
            type=int,
            location=OpenApiParameter.PATH,
            required=True,
            description="Project ID"
        ),
    ],
    tags=["Map Features"]
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def map_features_list(request, project_id):
    """
    GET /api/v1/map/features/{project_id}/

    List all map features for a project.
    """
    try:
        project_id = int(project_id)
    except ValueError:
        return Response(
            {"error": "Invalid project_id"},
            status=status.HTTP_400_BAD_REQUEST
        )

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                id, project_id, feature_type, category,
                ST_AsGeoJSON(geometry)::json as geometry,
                label, notes, style,
                linked_table, linked_id,
                area_sqft, area_acres, perimeter_ft, length_ft,
                created_by, created_at, updated_at
            FROM location_intelligence.project_map_features
            WHERE project_id = %s
            ORDER BY created_at DESC
        """, [project_id])

        columns = [col[0] for col in cursor.description]
        features = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Convert UUIDs to strings and format dates
        for f in features:
            f['id'] = str(f['id'])
            if f['created_at']:
                f['created_at'] = f['created_at'].isoformat()
            if f['updated_at']:
                f['updated_at'] = f['updated_at'].isoformat()

    return Response({'features': features, 'count': len(features)})


@extend_schema(
    summary="Create a map feature",
    description="""
    Create a new map feature (point, line, or polygon) for a project.

    Supports all GeoJSON geometry types. Measurements (area, length, perimeter)
    should be calculated client-side and included in the request.
    """,
    tags=["Map Features"]
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def map_features_create(request):
    """
    POST /api/v1/map/features/

    Create a new map feature.
    """
    data = request.data

    # Validate required fields
    required_fields = ['project_id', 'feature_type', 'geometry', 'label', 'category']
    for field in required_fields:
        if field not in data:
            return Response(
                {"error": f"{field} is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Validate feature_type
    feature_type = data['feature_type'].lower()
    if feature_type not in VALID_FEATURE_TYPES:
        return Response(
            {"error": f"feature_type must be one of: {VALID_FEATURE_TYPES}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Normalize linestring to line
    if feature_type == 'linestring':
        feature_type = 'line'

    # Validate category
    category = data['category'].lower() if data.get('category') else 'annotation'
    if category not in VALID_FEATURE_CATEGORIES:
        return Response(
            {"error": f"category must be one of: {VALID_FEATURE_CATEGORIES}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate geometry is a dict
    geometry = data['geometry']
    if not isinstance(geometry, dict):
        return Response(
            {"error": "geometry must be a GeoJSON geometry object"},
            status=status.HTTP_400_BAD_REQUEST
        )

    geometry_json = json.dumps(geometry)

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO location_intelligence.project_map_features (
                    project_id, feature_type, category, geometry,
                    label, notes, style, linked_table, linked_id,
                    area_sqft, area_acres, perimeter_ft, length_ft,
                    created_by
                ) VALUES (
                    %s, %s, %s, ST_GeomFromGeoJSON(%s),
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s
                )
                RETURNING id, created_at, updated_at
            """, [
                data['project_id'],
                feature_type,
                category,
                geometry_json,
                data['label'],
                data.get('notes'),
                json.dumps(data.get('style')) if data.get('style') else None,
                data.get('linked_table'),
                data.get('linked_id'),
                data.get('area_sqft'),
                data.get('area_acres'),
                data.get('perimeter_ft'),
                data.get('length_ft'),
                request.user.id,
            ])

            row = cursor.fetchone()

        return Response({
            'id': str(row[0]),
            'project_id': data['project_id'],
            'feature_type': feature_type,
            'category': category,
            'geometry': geometry,
            'label': data['label'],
            'notes': data.get('notes'),
            'style': data.get('style'),
            'linked_table': data.get('linked_table'),
            'linked_id': data.get('linked_id'),
            'area_sqft': data.get('area_sqft'),
            'area_acres': data.get('area_acres'),
            'perimeter_ft': data.get('perimeter_ft'),
            'length_ft': data.get('length_ft'),
            'created_by': request.user.id,
            'created_at': row[1].isoformat() if row[1] else None,
            'updated_at': row[2].isoformat() if row[2] else None,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {"error": f"Failed to create feature: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@extend_schema(
    summary="Get, update, or delete a map feature",
    description="Manage a specific map feature by ID.",
    tags=["Map Features"]
)
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def map_feature_detail(request, feature_id):
    """
    GET/PATCH/DELETE /api/v1/map/features/{feature_id}/

    Get, update, or delete a map feature.
    """
    if request.method == "GET":
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    id, project_id, feature_type, category,
                    ST_AsGeoJSON(geometry)::json as geometry,
                    label, notes, style,
                    linked_table, linked_id,
                    area_sqft, area_acres, perimeter_ft, length_ft,
                    created_by, created_at, updated_at
                FROM location_intelligence.project_map_features
                WHERE id = %s
            """, [str(feature_id)])

            row = cursor.fetchone()

            if not row:
                return Response(
                    {"error": "Feature not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            columns = [col[0] for col in cursor.description]
            feature = dict(zip(columns, row))
            feature['id'] = str(feature['id'])
            if feature['created_at']:
                feature['created_at'] = feature['created_at'].isoformat()
            if feature['updated_at']:
                feature['updated_at'] = feature['updated_at'].isoformat()

        return Response(feature)

    if request.method == "PATCH":
        data = request.data

        # Build dynamic update query
        update_fields = []
        params = []

        updateable = [
            'label', 'notes', 'category', 'linked_table', 'linked_id',
            'area_sqft', 'area_acres', 'perimeter_ft', 'length_ft'
        ]

        for field in updateable:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])

        if 'style' in data:
            update_fields.append("style = %s")
            params.append(json.dumps(data['style']) if data['style'] else None)

        if not update_fields:
            return Response(
                {"error": "No fields to update"},
                status=status.HTTP_400_BAD_REQUEST
            )

        params.append(str(feature_id))

        with connection.cursor() as cursor:
            cursor.execute(f"""
                UPDATE location_intelligence.project_map_features
                SET {', '.join(update_fields)}, updated_at = NOW()
                WHERE id = %s
                RETURNING id, project_id, feature_type, category,
                    ST_AsGeoJSON(geometry)::json as geometry,
                    label, notes, style, linked_table, linked_id,
                    area_sqft, area_acres, perimeter_ft, length_ft,
                    created_by, created_at, updated_at
            """, params)

            row = cursor.fetchone()

            if not row:
                return Response(
                    {"error": "Feature not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            columns = [col[0] for col in cursor.description]
            feature = dict(zip(columns, row))
            feature['id'] = str(feature['id'])
            if feature['created_at']:
                feature['created_at'] = feature['created_at'].isoformat()
            if feature['updated_at']:
                feature['updated_at'] = feature['updated_at'].isoformat()

        return Response(feature)

    # DELETE
    with connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM location_intelligence.project_map_features
            WHERE id = %s
            RETURNING id
        """, [str(feature_id)])

        if cursor.rowcount == 0:
            return Response(
                {"error": "Feature not found"},
                status=status.HTTP_404_NOT_FOUND
            )

    return Response(status=status.HTTP_204_NO_CONTENT)
