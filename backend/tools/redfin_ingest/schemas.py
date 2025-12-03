"""Raw Redfin data types.

These schemas mirror the structure of Redfin CSV data before normalization
to unified models.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class RedfinComp:
    """Raw sold comparable from Redfin CSV.

    Mirrors the TypeScript RedfinComp interface from src/lib/redfinClient.ts
    for consistency across the stack.

    Attributes:
        mls_id: MLS listing ID (unique per source).
        address: Street address.
        city: City name.
        state: State abbreviation.
        zip_code: ZIP code.
        price: Sale price in dollars.
        sqft: Living area square footage.
        price_per_sqft: Price per square foot (derived).
        lot_size: Lot size in square feet.
        year_built: Year the property was built.
        beds: Number of bedrooms.
        baths: Number of bathrooms.
        sold_date: Sale date in ISO format.
        latitude: Property latitude.
        longitude: Property longitude.
        distance_miles: Distance from search center.
        url: Redfin listing URL.
    """

    mls_id: str
    address: str
    city: str
    state: str
    zip_code: str
    price: int
    sqft: Optional[int]
    price_per_sqft: Optional[int]
    lot_size: Optional[int]
    year_built: Optional[int]
    beds: Optional[int]
    baths: Optional[float]
    sold_date: str  # ISO format
    latitude: float
    longitude: float
    distance_miles: float
    url: Optional[str]
