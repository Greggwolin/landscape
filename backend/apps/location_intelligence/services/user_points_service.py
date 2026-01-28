"""
User-added map points service.

Manages user-created map markers for comps, amenities, POIs, and custom points.
"""
import json
from typing import Optional, List, Dict, Any
from django.db import connection
from loguru import logger


VALID_CATEGORIES = [
    'comp_sale',
    'comp_rent',
    'competitor',
    'amenity',
    'poi',
    'infrastructure',
    'custom',
]


def create_user_point(
    lat: float,
    lon: float,
    category: str,
    label: str,
    project_id: Optional[int] = None,
    user_id: Optional[int] = None,
    scope: str = 'project',
    address: Optional[str] = None,
    poi_name: Optional[str] = None,
    custom_category: Optional[str] = None,
    notes: Optional[str] = None,
    attributes: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Create a new user map point.

    Args:
        lat: Latitude
        lon: Longitude
        category: Point category (comp_sale, comp_rent, competitor, amenity, poi, infrastructure, custom)
        label: User-provided label
        project_id: Associated project ID (optional if global)
        user_id: User who created the point
        scope: 'project' or 'global'
        address: Reverse geocoded address
        poi_name: POI name if clicked on a business
        custom_category: Custom category name if category='custom'
        notes: User notes
        attributes: Additional structured data (price, units, etc.)

    Returns:
        Created point as dict with id
    """
    if category not in VALID_CATEGORIES:
        raise ValueError(f"Invalid category: {category}. Must be one of {VALID_CATEGORIES}")

    sql = """
        INSERT INTO location_intelligence.project_map_points (
            project_id, created_by, scope, lat, lon, address, poi_name,
            category, custom_category, label, notes, attributes, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
        )
        RETURNING id, created_at
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [
            project_id,
            user_id,
            scope,
            lat,
            lon,
            address,
            poi_name,
            category,
            custom_category,
            label,
            notes,
            json.dumps(attributes) if attributes else None,
        ])
        row = cursor.fetchone()

    point = {
        'id': str(row[0]),
        'project_id': project_id,
        'created_by': user_id,
        'scope': scope,
        'lat': lat,
        'lon': lon,
        'address': address,
        'poi_name': poi_name,
        'category': category,
        'custom_category': custom_category,
        'label': label,
        'notes': notes,
        'attributes': attributes,
        'created_at': row[1].isoformat() if row[1] else None,
    }

    # Notify Landscaper about the new point
    _notify_landscaper(point)

    return point


def get_user_points(
    project_id: Optional[int] = None,
    user_id: Optional[int] = None,
    include_global: bool = True,
    categories: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Get user map points.

    Args:
        project_id: Filter by project (also includes global points if include_global=True)
        user_id: Filter by user
        include_global: Include global points in results
        categories: Filter by categories

    Returns:
        List of point dicts
    """
    conditions = []
    params = []

    if project_id is not None:
        if include_global:
            conditions.append("(project_id = %s OR scope = 'global')")
        else:
            conditions.append("project_id = %s")
        params.append(project_id)

    if user_id is not None:
        conditions.append("created_by = %s")
        params.append(user_id)

    if categories:
        placeholders = ', '.join(['%s'] * len(categories))
        conditions.append(f"category IN ({placeholders})")
        params.extend(categories)

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    sql = f"""
        SELECT
            id, project_id, created_by, scope, lat, lon, address, poi_name,
            category, custom_category, label, notes, attributes,
            created_at, updated_at, ingested_at, knowledge_ref
        FROM location_intelligence.project_map_points
        {where_clause}
        ORDER BY created_at DESC
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        columns = [col[0] for col in cursor.description]
        results = []
        for row in cursor.fetchall():
            point = dict(zip(columns, row))
            point['id'] = str(point['id'])
            if point.get('knowledge_ref'):
                point['knowledge_ref'] = str(point['knowledge_ref'])
            if point.get('attributes') and isinstance(point['attributes'], str):
                try:
                    point['attributes'] = json.loads(point['attributes'])
                except json.JSONDecodeError:
                    point['attributes'] = {}
            # Convert timestamps to ISO format
            if point.get('created_at'):
                point['created_at'] = point['created_at'].isoformat()
            if point.get('updated_at'):
                point['updated_at'] = point['updated_at'].isoformat()
            if point.get('ingested_at'):
                point['ingested_at'] = point['ingested_at'].isoformat()
            results.append(point)

    return results


def get_user_point(point_id: str, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Get a single user map point by ID.

    Args:
        point_id: Point UUID
        user_id: If provided, only return if user owns the point

    Returns:
        Point dict or None if not found
    """
    conditions = ["id = %s"]
    params = [point_id]

    if user_id is not None:
        conditions.append("created_by = %s")
        params.append(user_id)

    sql = f"""
        SELECT
            id, project_id, created_by, scope, lat, lon, address, poi_name,
            category, custom_category, label, notes, attributes,
            created_at, updated_at, ingested_at, knowledge_ref
        FROM location_intelligence.project_map_points
        WHERE {" AND ".join(conditions)}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        row = cursor.fetchone()

        if not row:
            return None

        columns = [col[0] for col in cursor.description]
        point = dict(zip(columns, row))
        point['id'] = str(point['id'])
        if point.get('knowledge_ref'):
            point['knowledge_ref'] = str(point['knowledge_ref'])
        if point.get('attributes') and isinstance(point['attributes'], str):
            try:
                point['attributes'] = json.loads(point['attributes'])
            except json.JSONDecodeError:
                point['attributes'] = {}
        if point.get('created_at'):
            point['created_at'] = point['created_at'].isoformat()
        if point.get('updated_at'):
            point['updated_at'] = point['updated_at'].isoformat()
        if point.get('ingested_at'):
            point['ingested_at'] = point['ingested_at'].isoformat()

        return point


def update_user_point(
    point_id: str,
    user_id: Optional[int] = None,
    **updates
) -> Optional[Dict[str, Any]]:
    """
    Update a user map point.

    Args:
        point_id: Point UUID
        user_id: If provided, only update if user owns the point
        **updates: Fields to update (label, notes, attributes, etc.)

    Returns:
        Updated point dict or None if not found
    """
    allowed_fields = {'label', 'notes', 'attributes', 'address', 'custom_category'}
    update_fields = {k: v for k, v in updates.items() if k in allowed_fields}

    if not update_fields:
        return get_user_point(point_id, user_id)

    set_clauses = []
    params = []

    for field, value in update_fields.items():
        if field == 'attributes':
            set_clauses.append(f"{field} = %s")
            params.append(json.dumps(value) if value else None)
        else:
            set_clauses.append(f"{field} = %s")
            params.append(value)

    set_clauses.append("updated_at = NOW()")

    conditions = ["id = %s"]
    params.append(point_id)

    if user_id is not None:
        conditions.append("created_by = %s")
        params.append(user_id)

    sql = f"""
        UPDATE location_intelligence.project_map_points
        SET {", ".join(set_clauses)}
        WHERE {" AND ".join(conditions)}
        RETURNING id
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        if cursor.rowcount == 0:
            return None

    return get_user_point(point_id, user_id)


def delete_user_point(point_id: str, user_id: Optional[int] = None) -> bool:
    """
    Delete a user map point.

    Args:
        point_id: Point UUID
        user_id: If provided, only delete if user owns the point

    Returns:
        True if deleted, False if not found
    """
    conditions = ["id = %s"]
    params = [point_id]

    if user_id is not None:
        conditions.append("created_by = %s")
        params.append(user_id)

    sql = f"""
        DELETE FROM location_intelligence.project_map_points
        WHERE {" AND ".join(conditions)}
        RETURNING id
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        return cursor.rowcount > 0


def _notify_landscaper(point: Dict[str, Any]):
    """
    Notify Landscaper AI about a new user point.

    This creates a knowledge base entry for the point.
    """
    # TODO: Implement Landscaper integration
    # For now, just log the event
    logger.info(
        f"User point added: {point['category']} - {point['label']} "
        f"at ({point['lat']}, {point['lon']})"
    )

    # Future implementation:
    # 1. Create knowledge base entry
    # 2. Update point with knowledge_ref
    # 3. Mark ingested_at timestamp
