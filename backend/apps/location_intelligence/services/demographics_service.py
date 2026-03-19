"""
Demographics service for ring demographic calculations.

Uses PostGIS spatial queries to calculate area-weighted demographics
for 1, 3, and 5-mile radius rings around a given point.
"""

import threading
from datetime import datetime
from typing import Optional, List, Dict, Any
from django.db import connection
from loguru import logger


# US state abbreviation to FIPS code mapping
STATE_ABBREV_TO_FIPS = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06",
    "CO": "08", "CT": "09", "DE": "10", "DC": "11", "FL": "12",
    "GA": "13", "HI": "15", "ID": "16", "IL": "17", "IN": "18",
    "IA": "19", "KS": "20", "KY": "21", "LA": "22", "ME": "23",
    "MD": "24", "MA": "25", "MI": "26", "MN": "27", "MS": "28",
    "MO": "29", "MT": "30", "NE": "31", "NV": "32", "NH": "33",
    "NJ": "34", "NM": "35", "NY": "36", "NC": "37", "ND": "38",
    "OH": "39", "OK": "40", "OR": "41", "PA": "42", "RI": "44",
    "SC": "45", "SD": "46", "TN": "47", "TX": "48", "UT": "49",
    "VT": "50", "VA": "51", "WA": "53", "WV": "54", "WI": "55",
    "WY": "56",
}

# Track background loading jobs: {state_fips: "loading"|"complete"|"error"}
_loading_jobs: Dict[str, str] = {}


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

    def get_state_coverage(self, state_abbrev: str) -> Dict[str, Any]:
        """
        Check if block group + demographics data is loaded for a state.

        Args:
            state_abbrev: Two-letter state abbreviation (e.g., "ID", "TX")

        Returns:
            {"state": "ID", "fips": "16", "loaded": True/False,
             "block_groups": 1284, "demographics": 1284, "status": "complete"|"not_loaded"|"loading"}
        """
        abbrev = state_abbrev.upper().strip()
        fips = STATE_ABBREV_TO_FIPS.get(abbrev)
        if not fips:
            return {"error": f"Unknown state abbreviation: {state_abbrev}"}

        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT COUNT(*) FROM location_intelligence.block_groups
                    WHERE state_fips = %s
                """, [fips])
                bg_count = cursor.fetchone()[0]

                cursor.execute("""
                    SELECT COUNT(*) FROM location_intelligence.demographics_cache
                    WHERE geoid LIKE %s
                """, [f"{fips}%"])
                demo_count = cursor.fetchone()[0]

            # Check if a background job is running
            job_status = _loading_jobs.get(fips, None)
            if job_status == "loading":
                status = "loading"
            elif bg_count > 0 and demo_count > 0:
                status = "complete"
            else:
                status = "not_loaded"

            return {
                "state": abbrev,
                "fips": fips,
                "loaded": bg_count > 0 and demo_count > 0,
                "block_groups": bg_count,
                "demographics": demo_count,
                "status": status,
            }

        except Exception as e:
            logger.error(f"Error checking state coverage for {abbrev}: {e}")
            return {"state": abbrev, "fips": fips, "error": str(e)}

    def trigger_state_load(self, state_abbrev: str) -> Dict[str, Any]:
        """
        Trigger background loading of block group + demographics data for a state.

        Args:
            state_abbrev: Two-letter state abbreviation

        Returns:
            {"status": "started"|"already_loading"|"already_loaded", ...}
        """
        abbrev = state_abbrev.upper().strip()
        fips = STATE_ABBREV_TO_FIPS.get(abbrev)
        if not fips:
            return {"error": f"Unknown state abbreviation: {state_abbrev}"}

        # Check if already loading
        if _loading_jobs.get(fips) == "loading":
            return {"status": "already_loading", "state": abbrev, "fips": fips}

        # Check if already loaded
        coverage = self.get_state_coverage(abbrev)
        if coverage.get("loaded"):
            return {"status": "already_loaded", "state": abbrev, "fips": fips,
                    "block_groups": coverage["block_groups"],
                    "demographics": coverage["demographics"]}

        # Start background loading thread
        _loading_jobs[fips] = "loading"

        def _run_load():
            try:
                from django.core.management import call_command
                logger.info(f"Starting background load for {abbrev} (FIPS {fips})")
                call_command("load_block_groups", states=fips)
                _loading_jobs[fips] = "complete"
                logger.info(f"Background load complete for {abbrev} (FIPS {fips})")

                # Invalidate cached ring demographics for projects in this state
                self._invalidate_state_project_caches(fips)

            except Exception as e:
                _loading_jobs[fips] = "error"
                logger.error(f"Background load failed for {abbrev} (FIPS {fips}): {e}")

        thread = threading.Thread(target=_run_load, daemon=True)
        thread.start()

        return {"status": "started", "state": abbrev, "fips": fips}

    def _invalidate_state_project_caches(self, state_fips: str):
        """
        Clear cached ring demographics for all projects in a given state.
        Called after new block group data is loaded so stale caches don't persist.
        """
        try:
            with connection.cursor() as cursor:
                # Find projects in this state and clear their ring caches
                cursor.execute("""
                    DELETE FROM location_intelligence.ring_demographics
                    WHERE project_id IN (
                        SELECT project_id FROM landscape.tbl_project
                        WHERE state = (
                            SELECT CASE %s
                                WHEN '01' THEN 'AL' WHEN '02' THEN 'AK' WHEN '04' THEN 'AZ'
                                WHEN '05' THEN 'AR' WHEN '06' THEN 'CA' WHEN '08' THEN 'CO'
                                WHEN '09' THEN 'CT' WHEN '10' THEN 'DE' WHEN '11' THEN 'DC'
                                WHEN '12' THEN 'FL' WHEN '13' THEN 'GA' WHEN '15' THEN 'HI'
                                WHEN '16' THEN 'ID' WHEN '17' THEN 'IL' WHEN '18' THEN 'IN'
                                WHEN '19' THEN 'IA' WHEN '20' THEN 'KS' WHEN '21' THEN 'KY'
                                WHEN '22' THEN 'LA' WHEN '23' THEN 'ME' WHEN '24' THEN 'MD'
                                WHEN '25' THEN 'MA' WHEN '26' THEN 'MI' WHEN '27' THEN 'MN'
                                WHEN '28' THEN 'MS' WHEN '29' THEN 'MO' WHEN '30' THEN 'MT'
                                WHEN '31' THEN 'NE' WHEN '32' THEN 'NV' WHEN '33' THEN 'NH'
                                WHEN '34' THEN 'NJ' WHEN '35' THEN 'NM' WHEN '36' THEN 'NY'
                                WHEN '37' THEN 'NC' WHEN '38' THEN 'ND' WHEN '39' THEN 'OH'
                                WHEN '40' THEN 'OK' WHEN '41' THEN 'OR' WHEN '42' THEN 'PA'
                                WHEN '44' THEN 'RI' WHEN '45' THEN 'SC' WHEN '46' THEN 'SD'
                                WHEN '47' THEN 'TN' WHEN '48' THEN 'TX' WHEN '49' THEN 'UT'
                                WHEN '50' THEN 'VT' WHEN '51' THEN 'VA' WHEN '53' THEN 'WA'
                                WHEN '54' THEN 'WV' WHEN '55' THEN 'WI' WHEN '56' THEN 'WY'
                            END
                        )
                    )
                """, [state_fips])
                deleted = cursor.rowcount
                if deleted > 0:
                    logger.info(f"Invalidated {deleted} cached ring rows for state FIPS {state_fips}")

        except Exception as e:
            logger.error(f"Error invalidating state project caches for {state_fips}: {e}")

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
