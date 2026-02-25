from dataclasses import dataclass
from typing import Optional, Dict


@dataclass(frozen=True)
class ParcelServiceConfig:
    url: str
    id_field: str
    owner_field: Optional[str]
    address_field: Optional[str]
    acres_field: Optional[str]
    use_code_field: Optional[str]
    use_desc_field: Optional[str]
    max_records: int = 2000


COUNTY_PARCEL_SERVICES: Dict[str, ParcelServiceConfig] = {
    "maricopa": ParcelServiceConfig(
        url="https://gis.mcassessor.maricopa.gov/arcgis/rest/services/MaricopaDynamicQueryService/MapServer/3",
        id_field="APN",
        owner_field="OWNER_NAME",
        address_field="PHYSICAL_ADDRESS",
        acres_field="LAND_SIZE",
        use_code_field=None,
        use_desc_field=None,
        max_records=2000,
    ),
    "pinal": ParcelServiceConfig(
        url="https://rogue.casagrandeaz.gov/arcgis/rest/services/Pinal_County/Pinal_County_Parcels/MapServer/0",
        id_field="PARCELID",
        owner_field="OWNERNME1",
        address_field="SITEADDRESS",
        acres_field="GROSSAC",
        use_code_field="USECD",
        use_desc_field="USEDSCRP",
        max_records=2000,
    ),
}


def normalize_county_code(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().lower()
    if normalized.endswith(" county"):
        normalized = normalized.replace(" county", "").strip()
    if normalized in COUNTY_PARCEL_SERVICES:
        return normalized
    return None
