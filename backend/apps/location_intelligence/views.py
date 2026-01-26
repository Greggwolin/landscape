"""API views for Location Intelligence."""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

from .services.demographics_service import DemographicsService
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
    return Response(stats)
