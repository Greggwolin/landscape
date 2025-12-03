"""Redfin CSV API client.

Python port of src/lib/redfinClient.ts for fetching sold home comparables
from Redfin's public Stingray API.
"""

from __future__ import annotations

import csv
import io
import logging
import math
import re
from datetime import datetime
from typing import List, Optional

from ..common import HttpClient
from .config import RedfinConfig
from .schemas import RedfinComp


logger = logging.getLogger(__name__)

# Redfin API defaults
DEFAULT_BASE_URL = "https://www.redfin.com/stingray"

# Month name to index mapping for parsing Redfin date format
MONTH_NAMES = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}


def calculate_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two lat/lng points using Haversine formula.

    Args:
        lat1: First point latitude.
        lon1: First point longitude.
        lat2: Second point latitude.
        lon2: Second point longitude.

    Returns:
        Distance in miles.
    """
    R = 3958.8  # Earth's radius in miles
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def generate_bounding_box_poly(center_lat: float, center_lng: float, radius_miles: float) -> str:
    """Generate a bounding box polygon for Redfin GIS query.

    Args:
        center_lat: Center latitude.
        center_lng: Center longitude.
        radius_miles: Radius in miles.

    Returns:
        Polygon string in Redfin format: "lng+lat,lng+lat,..." (closed polygon).
    """
    # Approximate degrees per mile at this latitude
    lat_deg_per_mile = 1 / 69.0
    lng_deg_per_mile = 1 / (69.0 * math.cos(math.radians(center_lat)))

    lat_offset = radius_miles * lat_deg_per_mile
    lng_offset = radius_miles * lng_deg_per_mile

    north = center_lat + lat_offset
    south = center_lat - lat_offset
    east = center_lng + lng_offset
    west = center_lng - lng_offset

    # Redfin expects polygon as: lng lat,lng lat,lng lat,lng lat (closed polygon)
    # Using + instead of space for URL encoding
    return (
        f"{west:.3f}+{north:.3f},{east:.3f}+{north:.3f},"
        f"{east:.3f}+{south:.3f},{west:.3f}+{south:.3f},{west:.3f}+{north:.3f}"
    )


def get_property_type_param(property_type: str) -> str:
    """Map property type to Redfin uipt parameter.

    Args:
        property_type: One of 'house', 'condo', 'townhouse', 'attached', 'all'.

    Returns:
        Redfin uipt parameter value.
    """
    mapping = {
        "house": "1",
        "condo": "2",
        "townhouse": "3",
        "attached": "2,3",  # Condo + Townhouse combined
        "all": "1,2,3,4,5,6,7,8",
    }
    return mapping.get(property_type, "1,2,3,4,5,6,7,8")


def parse_redfin_date(date_str: str) -> Optional[str]:
    """Parse Redfin CSV date format (e.g., "September-25-2025") to ISO format.

    Args:
        date_str: Date string in "Month-DD-YYYY" format.

    Returns:
        ISO format date string, or None if parsing fails.
    """
    if not date_str or not date_str.strip():
        return None

    try:
        # Format: "Month-DD-YYYY"
        parts = date_str.split("-")
        if len(parts) != 3:
            return None

        month = MONTH_NAMES.get(parts[0])
        day = int(parts[1])
        year = int(parts[2])

        if month is None:
            return None

        dt = datetime(year, month, day)
        return dt.isoformat()
    except (ValueError, TypeError):
        return None


def parse_csv_line(line: str) -> List[str]:
    """Parse CSV line, handling quoted fields.

    Args:
        line: Raw CSV line.

    Returns:
        List of field values.
    """
    result = []
    current = ""
    in_quotes = False

    i = 0
    while i < len(line):
        char = line[i]

        if char == '"':
            if in_quotes and i + 1 < len(line) and line[i + 1] == '"':
                current += '"'
                i += 1
            else:
                in_quotes = not in_quotes
        elif char == "," and not in_quotes:
            result.append(current.strip())
            current = ""
        else:
            current += char
        i += 1

    result.append(current.strip())
    return result


class RedfinClient:
    """Client for fetching sold comps from Redfin CSV API.

    Uses the common HttpClient for requests with rate limiting and retries.
    """

    def __init__(self, config: RedfinConfig, http_client: Optional[HttpClient] = None) -> None:
        """Initialize Redfin client.

        Args:
            config: Redfin configuration.
            http_client: Optional pre-configured HTTP client.
        """
        self.config = config
        self.http_client = http_client or HttpClient(
            user_agent=config.user_agent,
            request_delay_seconds=config.request_delay_seconds,
            timeout=config.timeout_seconds,
        )
        self.request_count = 0

    def fetch_comps(self) -> List[RedfinComp]:
        """Fetch sold comparables from Redfin.

        Returns:
            List of RedfinComp objects.
        """
        base_url = DEFAULT_BASE_URL
        poly = generate_bounding_box_poly(
            self.config.center_lat,
            self.config.center_lng,
            self.config.radius_miles,
        )
        uipt = get_property_type_param(self.config.property_type)

        # Build CSV endpoint URL - matches the TypeScript client exactly
        url = (
            f"{base_url}/api/gis-csv"
            f"?al=1"
            f"&num_homes={self.config.max_results}"
            f"&sold_within_days={self.config.sold_within_days}"
            f"&status=9"  # Sold status
            f"&uipt={uipt}"
            f"&v=8"
            f"&poly={poly}"
        )

        logger.info("Fetching Redfin CSV from: %s", url)

        response = self.http_client.get(url)
        self.request_count = self.http_client.request_count

        if response is None:
            logger.warning("Redfin request returned None")
            return []

        if response.status_code != 200:
            logger.error("Redfin API error: %d %s", response.status_code, response.reason_phrase)
            return []

        csv_text = response.text

        if not csv_text or not csv_text.strip():
            logger.warning("Redfin returned empty response")
            return []

        # Check if response is HTML error page
        if "<!DOCTYPE" in csv_text or "<html" in csv_text:
            logger.warning("Redfin returned HTML instead of CSV - may be rate limited")
            return []

        return self._parse_csv(csv_text)

    def _parse_csv(self, csv_text: str) -> List[RedfinComp]:
        """Parse Redfin CSV response into RedfinComp objects.

        Args:
            csv_text: Raw CSV text from Redfin.

        Returns:
            List of RedfinComp objects.
        """
        lines = csv_text.split("\n")
        if len(lines) < 2:
            return []

        # Skip header and disclaimer line (first 2 lines)
        data_lines = [line for line in lines[2:] if line.strip()]
        comps = []

        for line in data_lines:
            try:
                fields = parse_csv_line(line)
                if len(fields) < 27:
                    continue

                # CSV columns (0-indexed):
                # 0: SALE TYPE, 1: SOLD DATE, 2: PROPERTY TYPE, 3: ADDRESS, 4: CITY
                # 5: STATE, 6: ZIP, 7: PRICE, 8: BEDS, 9: BATHS, 10: LOCATION
                # 11: SQUARE FEET, 12: LOT SIZE, 13: YEAR BUILT, 14: DAYS ON MARKET
                # 15: $/SQUARE FEET, 16: HOA/MONTH, 17: STATUS, 18-19: OPEN HOUSE
                # 20: URL, 21: SOURCE, 22: MLS#, 23: FAVORITE, 24: INTERESTED
                # 25: LATITUDE, 26: LONGITUDE

                sale_type = fields[0]
                if sale_type != "PAST SALE":
                    continue  # Only include sold properties

                sold_date_str = fields[1]
                sold_date = parse_redfin_date(sold_date_str)
                if not sold_date:
                    continue

                try:
                    price = int(float(fields[7]))
                except (ValueError, TypeError):
                    continue
                if price <= 0:
                    continue

                try:
                    lat = float(fields[25])
                    lng = float(fields[26])
                except (ValueError, TypeError):
                    continue

                sqft = self._parse_int(fields[11])
                lot_size = self._parse_int(fields[12])
                year_built = self._parse_int(fields[13])
                beds = self._parse_int(fields[8])
                baths = self._parse_float(fields[9])
                price_per_sqft = int(price / sqft) if sqft and sqft > 0 else None

                # Filter by year built
                if self.config.min_year_built and year_built:
                    if year_built < self.config.min_year_built:
                        continue
                if self.config.max_year_built and year_built:
                    if year_built > self.config.max_year_built:
                        continue

                # Calculate distance from center
                distance_miles = round(
                    calculate_distance_miles(
                        self.config.center_lat,
                        self.config.center_lng,
                        lat,
                        lng,
                    ),
                    2,
                )

                # Filter by radius (CSV might return properties outside the bounding box)
                if distance_miles > self.config.radius_miles:
                    continue

                # MLS ID with fallback
                mls_id = fields[22] if fields[22] else f"redfin-{hash(f'{lat}{lng}{price}{sold_date}')}"
                url = fields[20] if fields[20] else None

                comps.append(RedfinComp(
                    mls_id=mls_id,
                    address=fields[3] or "",
                    city=fields[4] or "",
                    state=fields[5] or "",
                    zip_code=fields[6] or "",
                    price=price,
                    sqft=sqft,
                    price_per_sqft=price_per_sqft,
                    lot_size=lot_size,
                    year_built=year_built,
                    beds=beds,
                    baths=baths,
                    sold_date=sold_date,
                    latitude=lat,
                    longitude=lng,
                    distance_miles=distance_miles,
                    url=url,
                ))

            except Exception as e:
                logger.debug("Failed to parse Redfin CSV line: %s", e)
                continue

        # Sort by distance from center
        comps.sort(key=lambda c: c.distance_miles)

        logger.info("Parsed %d comps from Redfin CSV", len(comps))
        return comps

    @staticmethod
    def _parse_int(value: str) -> Optional[int]:
        """Parse string to int, returning None on failure."""
        if not value or not value.strip():
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _parse_float(value: str) -> Optional[float]:
        """Parse string to float, returning None on failure."""
        if not value or not value.strip():
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def close(self) -> None:
        """Close the HTTP client."""
        self.http_client.close()

    def __enter__(self) -> "RedfinClient":
        return self

    def __exit__(self, *args) -> None:
        self.close()
