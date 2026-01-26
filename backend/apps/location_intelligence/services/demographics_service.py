"""
Demographics service for ring demographic calculations.

Uses PostGIS spatial queries to calculate area-weighted demographics
for 1, 3, and 5-mile radius rings around a given point.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from django.db import connection
from loguru import logger


class DemographicsService:
    """Service for ring demographic calculations using PostGIS."""

    STANDARD_RADII = [1, 3, 5]  # Miles

    def get_ring_demographics(
        self,
        lat: float,
        lon: float,
        radii: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Get demographics for multiple ring radii around a point.

        Args:
            lat: Latitude of center point
            lon: Longitude of center point
            radii: List of radii in miles (default: [1, 3, 5])

        Returns:
            {
                "center": {"lat": 33.4484, "lon": -112.0740},
                "rings": [
                    {"radius_miles": 1, "population": 12450, ...},
                    {"radius_miles": 3, "population": 89200, ...},
                    {"radius_miles": 5, "population": 245000, ...}
                ],
                "source": "US Census ACS 2023 5-Year",
                "calculated_at": "2026-01-26T14:30:00Z"
            }
        """
        if radii is None:
            radii = self.STANDARD_RADII

        rings = []
        for radius in radii:
            ring_data = self._calculate_ring(lat, lon, radius)
            if ring_data:
                ring_data["radius_miles"] = radius
                rings.append(ring_data)

        return {
            "center": {"lat": lat, "lon": lon},
            "rings": rings,
            "source": "US Census ACS 2023 5-Year",
            "calculated_at": datetime.utcnow().isoformat() + "Z"
        }

    def _calculate_ring(
        self,
        lat: float,
        lon: float,
        radius_miles: float
    ) -> Optional[Dict[str, Any]]:
        """
        Calculate demographics for a single ring radius.

        Uses the PostGIS function location_intelligence.calculate_ring_demographics()
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        population,
                        households,
                        median_income,
                        median_age,
                        median_home_value,
                        median_gross_rent,
                        owner_occupied_pct,
                        block_groups_count,
                        total_land_area_sqmi
                    FROM location_intelligence.calculate_ring_demographics(%s, %s, %s)
                """, [lat, lon, radius_miles])

                row = cursor.fetchone()

                if row is None:
                    return None

                return {
                    "population": row[0],
                    "households": row[1],
                    "median_income": row[2],
                    "median_age": float(row[3]) if row[3] else None,
                    "median_home_value": row[4],
                    "median_gross_rent": row[5],
                    "owner_occupied_pct": float(row[6]) if row[6] else None,
                    "block_groups_included": row[7],
                    "total_land_area_sqmi": float(row[8]) if row[8] else None,
                }

        except Exception as e:
            logger.error(f"Error calculating ring demographics: {e}")
            return None

    def cache_project_demographics(
        self,
        project_id: int,
        lat: float,
        lon: float
    ) -> bool:
        """
        Calculate and cache ring demographics for a project.

        Stores results in location_intelligence.ring_demographics table.

        Args:
            project_id: Project ID
            lat: Project latitude
            lon: Project longitude

        Returns:
            True if successful, False otherwise
        """
        try:
            # Calculate demographics for all standard radii
            demographics = self.get_ring_demographics(lat, lon)

            if not demographics.get("rings"):
                logger.warning(f"No demographics calculated for project {project_id}")
                return False

            with connection.cursor() as cursor:
                # Delete existing cached data for this project
                cursor.execute("""
                    DELETE FROM location_intelligence.ring_demographics
                    WHERE project_id = %s
                """, [project_id])

                # Insert new cached data
                for ring in demographics["rings"]:
                    cursor.execute("""
                        INSERT INTO location_intelligence.ring_demographics (
                            project_id, center_lat, center_lon, radius_miles,
                            population, households, median_income, median_age,
                            median_home_value, median_gross_rent, owner_occupied_pct,
                            block_groups_included, total_land_area_sqmi,
                            calculation_method, calculated_at
                        )
                        VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s,
                            'area_weighted', NOW()
                        )
                    """, [
                        project_id, lat, lon, ring["radius_miles"],
                        ring.get("population"), ring.get("households"),
                        ring.get("median_income"), ring.get("median_age"),
                        ring.get("median_home_value"), ring.get("median_gross_rent"),
                        ring.get("owner_occupied_pct"),
                        ring.get("block_groups_included"), ring.get("total_land_area_sqmi"),
                    ])

            logger.info(f"Cached demographics for project {project_id} at ({lat}, {lon})")
            return True

        except Exception as e:
            logger.error(f"Error caching demographics for project {project_id}: {e}")
            return False

    def get_cached_demographics(
        self,
        project_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached demographics for a project.

        Args:
            project_id: Project ID

        Returns:
            Cached demographics dict or None if not found
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        center_lat, center_lon, radius_miles,
                        population, households, median_income, median_age,
                        median_home_value, median_gross_rent, owner_occupied_pct,
                        block_groups_included, total_land_area_sqmi, calculated_at
                    FROM location_intelligence.ring_demographics
                    WHERE project_id = %s
                    ORDER BY radius_miles
                """, [project_id])

                rows = cursor.fetchall()

                if not rows:
                    return None

                # Build response from cached data
                center_lat = rows[0][0]
                center_lon = rows[0][1]
                calculated_at = rows[0][12]

                rings = []
                for row in rows:
                    rings.append({
                        "radius_miles": float(row[2]),
                        "population": row[3],
                        "households": row[4],
                        "median_income": row[5],
                        "median_age": float(row[6]) if row[6] else None,
                        "median_home_value": row[7],
                        "median_gross_rent": row[8],
                        "owner_occupied_pct": float(row[9]) if row[9] else None,
                        "block_groups_included": row[10],
                        "total_land_area_sqmi": float(row[11]) if row[11] else None,
                    })

                return {
                    "center": {"lat": float(center_lat), "lon": float(center_lon)},
                    "rings": rings,
                    "source": "US Census ACS 2023 5-Year (cached)",
                    "calculated_at": calculated_at.isoformat() if calculated_at else None,
                    "cached": True
                }

        except Exception as e:
            logger.error(f"Error getting cached demographics for project {project_id}: {e}")
            return None

    def invalidate_cache(self, project_id: int) -> bool:
        """
        Clear cached demographics when project location changes.

        Args:
            project_id: Project ID

        Returns:
            True if successful
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    DELETE FROM location_intelligence.ring_demographics
                    WHERE project_id = %s
                """, [project_id])

                deleted = cursor.rowcount
                if deleted > 0:
                    logger.info(f"Invalidated {deleted} cached demographics for project {project_id}")

            return True

        except Exception as e:
            logger.error(f"Error invalidating cache for project {project_id}: {e}")
            return False

    def get_block_group_stats(self) -> Dict[str, Any]:
        """
        Get statistics about loaded block groups and demographics.

        Returns summary info for debugging/monitoring.
        """
        try:
            with connection.cursor() as cursor:
                # Count block groups by state
                cursor.execute("""
                    SELECT state_fips, COUNT(*)
                    FROM location_intelligence.block_groups
                    GROUP BY state_fips
                    ORDER BY state_fips
                """)
                bg_counts = dict(cursor.fetchall())

                # Count demographics records
                cursor.execute("""
                    SELECT COUNT(*) FROM location_intelligence.demographics_cache
                """)
                demo_count = cursor.fetchone()[0]

                # Get ACS vintage
                cursor.execute("""
                    SELECT DISTINCT acs_vintage
                    FROM location_intelligence.demographics_cache
                    LIMIT 1
                """)
                vintage_row = cursor.fetchone()
                vintage = vintage_row[0] if vintage_row else None

                return {
                    "block_groups": bg_counts,
                    "total_block_groups": sum(bg_counts.values()),
                    "demographics_loaded": demo_count,
                    "acs_vintage": vintage,
                }

        except Exception as e:
            logger.error(f"Error getting block group stats: {e}")
            return {"error": str(e)}
