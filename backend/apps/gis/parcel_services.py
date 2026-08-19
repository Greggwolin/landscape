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
    # Pinal County publishes no parcel service of its own; what exists are
    # municipal extracts, and they do not cover the same ground — so the one
    # chosen here decides which projects can see their parcel at all.
    #
    # This pointed at Casa Grande's server
    # (rogue.casagrandeaz.gov/.../Pinal_County_Parcels) until 2026-08-14.
    # Despite the name that layer is Casa Grande's own area of interest:
    # 60,428 parcels covering roughly lat 32.76–33.02, whose northern edge
    # stops about a mile SOUTH of Red Valley Ranch. Measured, not inferred —
    # the service was healthy and answering, and returned zero features at the
    # project's coordinates and zero for its APN in every spelling. The
    # parcels were never going to appear.
    #
    # The City of Maricopa's extract does cover it: 33,843 parcels including
    # 502070010 — CRESCENT BAY LAND FUND 1 LLC, RED VALLEY RANCH PHASE 1,
    # geometry measuring 164.9 acres against the 164.47 stored on the project.
    # Re-measured on the swap: 2 features in an envelope at the site, against
    # 0 from the old service.
    #
    # It is a FeatureServer rather than a MapServer; the /query API is
    # identical and _fetch_arcgis_geojson needs no change (verified live).
    #
    # It publishes NO acreage column — acres_field is None and area is
    # computed from the geometry instead (see _acres_from_geometry).
    #
    # Its ids carry no hyphens (502070010) while projects store 502-07-001-0.
    # Anything matching on it must go through apn_candidates().
    "pinal": ParcelServiceConfig(
        url="https://services7.arcgis.com/MlfUGd2UJYefAS7v/arcgis/rest/services/County_Tax_Parcels/FeatureServer/0",
        id_field="parcel_number",
        owner_field="owner_name",
        address_field="site_address",
        acres_field=None,
        use_code_field=None,
        use_desc_field=None,
        max_records=2000,
    ),
}


def normalize_apn(value: Optional[str]) -> str:
    """A parcel number reduced to something comparable across publishers.

    The same parcel is written 502-07-001-0 in our records and 502070010 by
    the City of Maricopa. Compared as typed they silently fail to match, which
    reads on screen exactly like "the county has no record of this parcel".

    Mirrors ``normalizeApn`` in src/lib/gis/countyServices.ts — keep the two in
    step.
    """
    if not value:
        return ""
    return "".join(ch for ch in str(value) if ch.isalnum()).upper()


def apn_candidates(value: Optional[str]) -> list:
    """Every spelling of an APN worth asking a county service about.

    ArcGIS SQL has no portable way to strip punctuation in a WHERE clause, so
    rather than normalising on their side we ask for each plausible spelling
    on ours: the value as given and its normalised form. Verified against the
    live service — `parcel_number = '502-07-001-0'` returns 0 rows and
    `IN ('502-07-001-0','502070010')` returns exactly 1.
    """
    raw = (value or "").strip()
    if not raw:
        return []
    out = [raw]
    normalized = normalize_apn(raw)
    if normalized and normalized not in out:
        out.append(normalized)
    return out


def normalize_county_code(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().lower()
    if normalized.endswith(" county"):
        normalized = normalized.replace(" county", "").strip()
    if normalized in COUNTY_PARCEL_SERVICES:
        return normalized
    return None
