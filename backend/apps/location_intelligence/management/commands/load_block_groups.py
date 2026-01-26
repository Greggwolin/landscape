"""
Django management command to load Census block group boundaries and demographics.

Downloads TIGER/Line shapefiles for block group boundaries and fetches
ACS 5-year demographic estimates via the Census API.

Usage:
    python manage.py load_block_groups --states=06,04
    python manage.py load_block_groups --states=06  # California only
    python manage.py load_block_groups --states=04 --skip-boundaries  # Demographics only
"""

import os
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Optional, List
from urllib.request import urlretrieve

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from decouple import config

# State FIPS to name mapping
STATE_NAMES = {
    "04": "Arizona",
    "06": "California",
}

# TIGER/Line shapefile URL pattern
TIGER_URL_PATTERN = "https://www2.census.gov/geo/tiger/TIGER2023/BG/tl_2023_{state_fips}_bg.zip"


class Command(BaseCommand):
    help = "Load Census block group boundaries and ACS demographics into location_intelligence schema"

    def add_arguments(self, parser):
        parser.add_argument(
            "--states",
            type=str,
            required=True,
            help="Comma-separated list of state FIPS codes (e.g., 06,04 for CA and AZ)",
        )
        parser.add_argument(
            "--skip-boundaries",
            action="store_true",
            help="Skip loading boundary geometries (only load demographics)",
        )
        parser.add_argument(
            "--skip-demographics",
            action="store_true",
            help="Skip loading demographics (only load boundaries)",
        )
        parser.add_argument(
            "--year",
            type=int,
            default=2023,
            help="ACS 5-year vintage year (default: 2023)",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=1000,
            help="Batch size for database inserts (default: 1000)",
        )

    def handle(self, *args, **options):
        states = [s.strip() for s in options["states"].split(",")]
        skip_boundaries = options["skip_boundaries"]
        skip_demographics = options["skip_demographics"]
        year = options["year"]
        batch_size = options["batch_size"]

        # Validate state FIPS codes
        for state_fips in states:
            if state_fips not in STATE_NAMES:
                raise CommandError(
                    f"Unknown state FIPS code: {state_fips}. "
                    f"Supported states: {', '.join(STATE_NAMES.keys())}"
                )

        self.stdout.write(self.style.NOTICE(
            f"Loading block groups for states: {', '.join(STATE_NAMES[s] for s in states)}"
        ))

        # Verify schema exists
        self._verify_schema()

        # Load boundaries for each state
        if not skip_boundaries:
            for state_fips in states:
                self._load_state_boundaries(state_fips, batch_size)

        # Load demographics for each state
        if not skip_demographics:
            for state_fips in states:
                self._load_state_demographics(state_fips, year, batch_size)

        self.stdout.write(self.style.SUCCESS("Block group loading complete!"))

    def _verify_schema(self):
        """Verify the location_intelligence schema and tables exist."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = 'location_intelligence'
                )
            """)
            if not cursor.fetchone()[0]:
                raise CommandError(
                    "Schema 'location_intelligence' does not exist. "
                    "Run the migration first: 20260126_create_location_intelligence_schema.sql"
                )

            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'location_intelligence'
                    AND table_name = 'block_groups'
                )
            """)
            if not cursor.fetchone()[0]:
                raise CommandError(
                    "Table 'location_intelligence.block_groups' does not exist. "
                    "Run the migration first."
                )

        self.stdout.write(self.style.SUCCESS("Schema verification passed"))

    def _load_state_boundaries(self, state_fips: str, batch_size: int):
        """Download and load block group boundaries for a state."""
        state_name = STATE_NAMES[state_fips]
        self.stdout.write(f"Loading boundaries for {state_name} ({state_fips})...")

        # Check if geopandas is available
        try:
            import geopandas as gpd
            from shapely import wkb
        except ImportError:
            raise CommandError(
                "geopandas is required for loading boundaries. "
                "Install with: pip install geopandas fiona shapely pyproj"
            )

        # Download shapefile
        url = TIGER_URL_PATTERN.format(state_fips=state_fips)
        self.stdout.write(f"  Downloading from {url}...")

        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = Path(tmpdir) / f"tl_2023_{state_fips}_bg.zip"

            try:
                urlretrieve(url, zip_path)
            except Exception as e:
                raise CommandError(f"Failed to download shapefile: {e}")

            # Extract shapefile
            self.stdout.write("  Extracting shapefile...")
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(tmpdir)

            # Find the .shp file
            shp_files = list(Path(tmpdir).glob("*.shp"))
            if not shp_files:
                raise CommandError("No .shp file found in downloaded archive")

            shp_path = shp_files[0]

            # Read shapefile with geopandas
            self.stdout.write("  Reading shapefile...")
            gdf = gpd.read_file(shp_path)

            # Ensure CRS is WGS84 (EPSG:4326)
            if gdf.crs and gdf.crs.to_epsg() != 4326:
                self.stdout.write("  Reprojecting to EPSG:4326...")
                gdf = gdf.to_crs(epsg=4326)

            total_rows = len(gdf)
            self.stdout.write(f"  Found {total_rows} block groups")

            # Insert in batches
            inserted = 0
            batch = []

            for idx, row in gdf.iterrows():
                geoid = row.get("GEOID", "")
                if len(geoid) != 12:
                    continue

                # Parse GEOID components
                state = geoid[:2]
                county = geoid[2:5]
                tract = geoid[5:11]
                bg = geoid[11:12]

                # Get geometry as WKB hex
                geom = row.geometry
                if geom is None or geom.is_empty:
                    continue

                # Convert to MultiPolygon if needed
                if geom.geom_type == "Polygon":
                    from shapely.geometry import MultiPolygon
                    geom = MultiPolygon([geom])

                geom_wkb = geom.wkb_hex

                batch.append({
                    "geoid": geoid,
                    "state_fips": state,
                    "county_fips": county,
                    "tract_code": tract,
                    "bg_code": bg,
                    "state_name": row.get("NAMELSAD", ""),
                    "county_name": "",  # Not in TIGER BG file
                    "land_area_sqm": float(row.get("ALAND", 0) or 0),
                    "water_area_sqm": float(row.get("AWATER", 0) or 0),
                    "geom_wkb": geom_wkb,
                })

                if len(batch) >= batch_size:
                    self._insert_boundary_batch(batch)
                    inserted += len(batch)
                    self.stdout.write(f"  Inserted {inserted}/{total_rows} block groups...")
                    batch = []

            # Insert remaining batch
            if batch:
                self._insert_boundary_batch(batch)
                inserted += len(batch)

            self.stdout.write(self.style.SUCCESS(
                f"  Loaded {inserted} block groups for {state_name}"
            ))

    def _insert_boundary_batch(self, batch: List[dict]):
        """Insert a batch of block group boundaries."""
        if not batch:
            return

        with connection.cursor() as cursor:
            # Use INSERT ... ON CONFLICT for upsert
            for row in batch:
                cursor.execute("""
                    INSERT INTO location_intelligence.block_groups (
                        geoid, state_fips, county_fips, tract_code, bg_code,
                        state_name, county_name, land_area_sqm, water_area_sqm,
                        geometry, updated_at
                    )
                    VALUES (
                        %(geoid)s, %(state_fips)s, %(county_fips)s, %(tract_code)s, %(bg_code)s,
                        %(state_name)s, %(county_name)s, %(land_area_sqm)s, %(water_area_sqm)s,
                        ST_GeomFromWKB(decode(%(geom_wkb)s, 'hex'), 4326), NOW()
                    )
                    ON CONFLICT (geoid) DO UPDATE SET
                        state_name = EXCLUDED.state_name,
                        land_area_sqm = EXCLUDED.land_area_sqm,
                        water_area_sqm = EXCLUDED.water_area_sqm,
                        geometry = EXCLUDED.geometry,
                        updated_at = NOW()
                """, row)

    def _load_state_demographics(self, state_fips: str, year: int, batch_size: int):
        """Load ACS demographics for all block groups in a state."""
        state_name = STATE_NAMES[state_fips]
        self.stdout.write(f"Loading demographics for {state_name} ({state_fips})...")

        # Get Census API key
        census_api_key = config("CENSUS_API_KEY", default=None)
        if not census_api_key:
            self.stdout.write(self.style.WARNING(
                "  CENSUS_API_KEY not set. API calls may be rate-limited."
            ))

        # Import the Census client
        try:
            # Add market_ingest to path if needed
            market_ingest_path = Path(settings.BASE_DIR).parent / "services" / "market_ingest_py"
            if str(market_ingest_path) not in sys.path:
                sys.path.insert(0, str(market_ingest_path))

            from market_ingest.census_client import BlockGroupDemographicsClient
        except ImportError as e:
            raise CommandError(f"Failed to import Census client: {e}")

        # Initialize client
        client = BlockGroupDemographicsClient(api_key=census_api_key, year=year)

        # Fetch all block groups for the state (county by county)
        self.stdout.write("  Fetching demographics from Census API...")
        all_demographics = client.fetch_state_block_groups(state_fips)

        if not all_demographics:
            self.stdout.write(self.style.WARNING(f"  No demographics returned for {state_name}"))
            return

        self.stdout.write(f"  Received demographics for {len(all_demographics)} block groups")

        # Insert in batches
        inserted = 0
        batch = []
        vintage = f"{year}_5yr"

        for demo in all_demographics:
            batch.append({
                "geoid": demo.geoid,
                "total_population": demo.total_population,
                "median_age": demo.median_age,
                "total_households": demo.total_households,
                "avg_household_size": demo.avg_household_size,
                "median_household_income": demo.median_household_income,
                "per_capita_income": demo.per_capita_income,
                "total_housing_units": demo.total_housing_units,
                "median_home_value": demo.median_home_value,
                "median_gross_rent": demo.median_gross_rent,
                "owner_occupied_pct": demo.owner_occupied_pct,
                "employed_population": demo.employed_population,
                "unemployment_rate": demo.unemployment_rate,
                "acs_vintage": vintage,
            })

            if len(batch) >= batch_size:
                self._insert_demographics_batch(batch)
                inserted += len(batch)
                self.stdout.write(f"  Inserted {inserted}/{len(all_demographics)} demographics...")
                batch = []

        # Insert remaining batch
        if batch:
            self._insert_demographics_batch(batch)
            inserted += len(batch)

        # Calculate population density for all block groups in this state
        self._calculate_population_density(state_fips)

        self.stdout.write(self.style.SUCCESS(
            f"  Loaded demographics for {inserted} block groups in {state_name}"
        ))

    def _insert_demographics_batch(self, batch: List[dict]):
        """Insert a batch of demographics records."""
        if not batch:
            return

        with connection.cursor() as cursor:
            for row in batch:
                cursor.execute("""
                    INSERT INTO location_intelligence.demographics_cache (
                        geoid, total_population, median_age, total_households,
                        avg_household_size, median_household_income, per_capita_income,
                        total_housing_units, median_home_value, median_gross_rent,
                        owner_occupied_pct, employed_population, unemployment_rate,
                        acs_vintage, fetched_at
                    )
                    VALUES (
                        %(geoid)s, %(total_population)s, %(median_age)s, %(total_households)s,
                        %(avg_household_size)s, %(median_household_income)s, %(per_capita_income)s,
                        %(total_housing_units)s, %(median_home_value)s, %(median_gross_rent)s,
                        %(owner_occupied_pct)s, %(employed_population)s, %(unemployment_rate)s,
                        %(acs_vintage)s, NOW()
                    )
                    ON CONFLICT (geoid) DO UPDATE SET
                        total_population = EXCLUDED.total_population,
                        median_age = EXCLUDED.median_age,
                        total_households = EXCLUDED.total_households,
                        avg_household_size = EXCLUDED.avg_household_size,
                        median_household_income = EXCLUDED.median_household_income,
                        per_capita_income = EXCLUDED.per_capita_income,
                        total_housing_units = EXCLUDED.total_housing_units,
                        median_home_value = EXCLUDED.median_home_value,
                        median_gross_rent = EXCLUDED.median_gross_rent,
                        owner_occupied_pct = EXCLUDED.owner_occupied_pct,
                        employed_population = EXCLUDED.employed_population,
                        unemployment_rate = EXCLUDED.unemployment_rate,
                        acs_vintage = EXCLUDED.acs_vintage,
                        fetched_at = NOW()
                """, row)

    def _calculate_population_density(self, state_fips: str):
        """Calculate population density for block groups in a state."""
        self.stdout.write(f"  Calculating population density...")

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE location_intelligence.demographics_cache dc
                SET population_density_sqmi = CASE
                    WHEN bg.land_area_sqm > 0 THEN
                        dc.total_population / (bg.land_area_sqm / 2589988.11)
                    ELSE NULL
                END
                FROM location_intelligence.block_groups bg
                WHERE dc.geoid = bg.geoid
                AND bg.state_fips = %s
            """, [state_fips])

            self.stdout.write(f"  Updated population density for {cursor.rowcount} block groups")
