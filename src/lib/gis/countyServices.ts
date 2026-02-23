export const COUNTY_PARCEL_SERVICES = {
  maricopa: {
    url: 'https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0',
    idField: 'APN',
    ownerField: 'OWNER_NAME',
    addressField: 'PHYSICAL_ADDRESS',
    acresField: 'LAND_SIZE',
    useCodeField: '',
    useDescField: '',
  },
  pinal: {
    url: 'https://rogue.casagrandeaz.gov/arcgis/rest/services/Pinal_County/Pinal_County_Parcels/MapServer/0',
    idField: 'PARCELID',
    ownerField: 'OWNERNME1',
    addressField: 'SITEADDRESS',
    acresField: 'GROSSAC',
    useCodeField: 'USECD',
    useDescField: 'USEDSCRP',
  },
} as const;

export type CountyCode = keyof typeof COUNTY_PARCEL_SERVICES;
