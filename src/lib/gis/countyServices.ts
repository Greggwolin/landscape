export const COUNTY_PARCEL_SERVICES = {
  maricopa: {
    url: 'https://gis.mcassessor.maricopa.gov/arcgis/rest/services/MaricopaDynamicQueryService/MapServer/3',
    idField: 'APN',
    ownerField: 'OWNER_NAME',
    addressField: 'PHYSICAL_ADDRESS',
    acresField: 'LAND_SIZE',
    useCodeField: '',
    useDescField: '',
  },
  // Pinal County has no public parcel service of its own. What is published
  // are municipal extracts, and they do not cover the same ground — so the
  // one chosen here decides which projects can see their parcel at all.
  //
  // This was previously pointed at Casa Grande's server
  // (rogue.casagrandeaz.gov/.../Pinal_County_Parcels). Despite the name that
  // layer is Casa Grande's own area of interest: 60,428 parcels covering
  // roughly lat 32.76–33.02, and its northern edge stops about a mile SOUTH
  // of Red Valley Ranch. Measured 2026-08-14 — the service was healthy and
  // answering, and returned zero features at the project's coordinates and
  // zero for its APN, which is why the parcels never appeared.
  //
  // The City of Maricopa's extract does cover it: 33,843 parcels, including
  // APN 502070010 — CRESCENT BAY LAND FUND 1 LLC, subdivision RED VALLEY
  // RANCH PHASE 1, "NE OF SEC 3-5S-4E 160.00 AC", geometry measuring 164.9
  // acres against the 164.47 already stored for the project.
  //
  // Note the id field carries no hyphens (502070010), while the project
  // stores its APN as 502-07-001-0. Anything matching on it must normalise —
  // see `normalizeApn`.
  pinal: {
    url: 'https://services7.arcgis.com/MlfUGd2UJYefAS7v/arcgis/rest/services/County_Tax_Parcels/FeatureServer/0',
    idField: 'parcel_number',
    ownerField: 'owner_name',
    addressField: 'site_address',
    // This extract publishes no acreage column; area comes from the geometry.
    acresField: '',
    useCodeField: '',
    useDescField: '',
  },
} as const;

export type CountyCode = keyof typeof COUNTY_PARCEL_SERVICES;

/**
 * Parcel numbers as counties publish them, reduced to something comparable.
 *
 * The same parcel is written 502-07-001-0 in our own records, 502070010 by
 * the City of Maricopa, and 502-07-001-0 again by Maricopa County. Comparing
 * them as typed silently fails to match, which reads on screen exactly like
 * "the county has no record of this parcel".
 */
export function normalizeApn(apn: string | null | undefined): string {
  return (apn ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/** Whether two parcel numbers refer to the same parcel, however written. */
export function sameApn(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeApn(a);
  return left.length > 0 && left === normalizeApn(b);
}
