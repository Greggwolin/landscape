'use client';

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Map, {
  Marker,
  MapLayerMouseEvent,
  MarkerDragEvent,
  MapRef,
  NavigationControl,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LandComparable, SalesComparable } from '@/types/valuation';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const PHOENIX_LOCATION = { latitude: 33.4484, longitude: -112.0740 };

interface AddComparableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  compType: 'land' | 'improved';
  projectId: number | string;
  subjectLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  existingComp?: LandComparable | SalesComparable;
}

type FormState = {
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: string;
  longitude: string;
  sale_date: string;
  sale_price: string;
  notes: string;
  land_area_sf: string;
  zoning: string;
  entitlements: string;
  year_built: string;
  units: string;
  building_sf: string;
  cap_rate: string;
  grm: string;
};

const parseNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
};

const formatCompactCurrency = (value: number | null): string => {
  if (value == null) return '';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: value >= 1000 ? 1 : 2,
  }).format(value);
};

const formatNumber = (value: number | null, digits = 2): string => {
  if (value == null) return '';
  return value.toFixed(digits);
};

const buildFormState = ({
  existingComp,
  compType,
  fallbackLocation,
}: {
  compType: 'land' | 'improved';
  existingComp?: LandComparable | SalesComparable;
  fallbackLocation: { latitude: number; longitude: number };
}): FormState => {
  const baseLat = existingComp?.latitude ?? fallbackLocation.latitude;
  const baseLng = existingComp?.longitude ?? fallbackLocation.longitude;

  return {
    property_name: existingComp?.property_name ?? '',
    address: existingComp?.address ?? '',
    city: existingComp?.city ?? '',
    state: existingComp?.state ?? '',
    zip: existingComp?.zip ?? '',
    latitude: baseLat?.toString() ?? fallbackLocation.latitude.toString(),
    longitude: baseLng?.toString() ?? fallbackLocation.longitude.toString(),
    sale_date: existingComp?.sale_date ?? '',
    sale_price: existingComp?.sale_price?.toString() ?? '',
    notes: existingComp?.notes ?? '',
    land_area_sf: (existingComp as LandComparable)?.land_area_sf?.toString() ?? '',
    zoning: (existingComp as LandComparable)?.zoning ?? '',
    entitlements: (existingComp as LandComparable)?.entitlements ?? '',
    year_built: (existingComp as SalesComparable)?.year_built?.toString() ?? '',
    units: (existingComp as SalesComparable)?.units?.toString() ?? '',
    building_sf: (existingComp as SalesComparable)?.building_sf?.toString() ?? '',
    cap_rate: (existingComp as SalesComparable)?.cap_rate?.toString() ?? '',
    grm: (existingComp as SalesComparable)?.grm?.toString() ?? '',
  };
};

export function AddComparableModal({
  isOpen,
  onClose,
  onSave,
  compType,
  projectId,
  subjectLocation,
  existingComp,
}: AddComparableModalProps) {
  const fallbackLocation = useMemo(
    () => subjectLocation ?? PHOENIX_LOCATION,
    [subjectLocation]
  );

  const [formData, setFormData] = useState<FormState>(() =>
    buildFormState({ compType, existingComp, fallbackLocation })
  );

  const [markerLocation, setMarkerLocation] = useState(() => {
    const initialState = buildFormState({ compType, existingComp, fallbackLocation });
    return {
      lat: parseNumber(initialState.latitude) ?? fallbackLocation.latitude,
      lng: parseNumber(initialState.longitude) ?? fallbackLocation.longitude,
    };
  });

  const [mapKey, setMapKey] = useState(0);
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    setMapKey((prev) => prev + 1);
  }, [fallbackLocation]);

  useEffect(() => {
    if (!isOpen) return;
    const nextState = buildFormState({ compType, existingComp, fallbackLocation });
    setFormData(nextState);
    setMarkerLocation({
      lat: parseNumber(nextState.latitude) ?? fallbackLocation.latitude,
      lng: parseNumber(nextState.longitude) ?? fallbackLocation.longitude,
    });
  }, [isOpen, compType, existingComp, fallbackLocation]);

  const salePriceNumeric = parseNumber(formData.sale_price);
  const landAreaSfNumeric = parseNumber(formData.land_area_sf);
  const landAreaAcres = landAreaSfNumeric != null ? landAreaSfNumeric / 43560 : null;
  const landPricePerSf =
    salePriceNumeric != null && landAreaSfNumeric ? salePriceNumeric / landAreaSfNumeric : null;
  const landPricePerAcre =
    salePriceNumeric != null && landAreaAcres ? salePriceNumeric / landAreaAcres : null;

  const unitsNumeric = parseNumber(formData.units);
  const buildingSfNumeric = parseNumber(formData.building_sf);
  const pricePerUnit =
    salePriceNumeric != null && unitsNumeric ? salePriceNumeric / unitsNumeric : null;
  const improvedPricePerSf =
    salePriceNumeric != null && buildingSfNumeric ? salePriceNumeric / buildingSfNumeric : null;

  const handleMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const { lat, lng } = event.lngLat;
      setMarkerLocation({ lat, lng });
      setFormData((prev) => ({
        ...prev,
        latitude: lat.toString(),
        longitude: lng.toString(),
      }));
    },
    []
  );

  const handleMarkerDrag = useCallback((event: MarkerDragEvent) => {
    const { lat, lng } = event.lngLat;
    setMarkerLocation({ lat, lng });
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
    }));
  }, []);

  const handleCoordinateChange = (field: 'latitude' | 'longitude') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      const numeric = parseNumber(value);
      if (numeric != null) {
        setMarkerLocation((prev) => {
          const next = {
            ...prev,
            [field === 'latitude' ? 'lat' : 'lng']: numeric,
          };
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [
                field === 'longitude' ? numeric : next.lng,
                field === 'latitude' ? numeric : next.lat,
              ],
            });
          }
          return next;
        });
      }
    };

  const handleInputChange = (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      project_id: Number(projectId),
      property_name: formData.property_name || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      sale_date: formData.sale_date || null,
      sale_price: salePriceNumeric,
      latitude: parseNumber(formData.latitude),
      longitude: parseNumber(formData.longitude),
      notes: formData.notes || null,
    };

    if (compType === 'land') {
      payload.land_area_sf = landAreaSfNumeric;
      payload.zoning = formData.zoning || null;
      payload.entitlements = formData.entitlements || null;
      payload.price_per_sf = landPricePerSf;
      payload.price_per_acre = landPricePerAcre;
    } else {
      payload.year_built = parseNumber(formData.year_built);
      payload.units = unitsNumeric;
      payload.building_sf = buildingSfNumeric;
      payload.cap_rate = parseNumber(formData.cap_rate);
      payload.grm = parseNumber(formData.grm);
      payload.price_per_unit = pricePerUnit;
      payload.price_per_sf = improvedPricePerSf;
    }

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog" style={{ maxWidth: '600px' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Add {compType === 'land' ? 'Land' : 'Improved'} Comparable
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div style={{ height: 250, marginBottom: '1rem' }}>
                <Map
                  key={`map-${mapKey}`}
                  ref={mapRef}
                  mapStyle={MAP_STYLE}
                  initialViewState={{
                    latitude: markerLocation.lat,
                    longitude: markerLocation.lng,
                    zoom: 11,
                  }}
                  style={{ width: '100%', height: '100%' }}
                  onClick={handleMapClick}
                >
                  <NavigationControl position="bottom-right" />
                  <Marker
                    longitude={fallbackLocation.longitude}
                    latitude={fallbackLocation.latitude}
                    offset={[0, -10]}
                    captureScroll={false}
                  >
                    <div style={{ color: '#0d6efd', fontSize: 20 }}>★</div>
                  </Marker>
                  <Marker
                    longitude={markerLocation.lng}
                    latitude={markerLocation.lat}
                    draggable
                    onDragEnd={handleMarkerDrag}
                    offset={[0, -24]}
                    captureScroll={false}
                  >
                    <div style={{ fontSize: 28, color: '#dc3545' }}>📍</div>
                  </Marker>
                </Map>
              </div>

              <div className="row g-3 mb-3">
                <div className="col">
                  <label className="form-label">Latitude</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.latitude}
                    onChange={handleCoordinateChange('latitude')}
                  />
                </div>
                <div className="col">
                  <label className="form-label">Longitude</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.longitude}
                    onChange={handleCoordinateChange('longitude')}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label">Property Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.property_name}
                    onChange={handleInputChange('property_name')}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.address}
                    onChange={handleInputChange('address')}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.city}
                    onChange={handleInputChange('city')}
                  />
                </div>
                <div className="col-3">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.state}
                    onChange={handleInputChange('state')}
                  />
                </div>
                <div className="col-3">
                  <label className="form-label">Zip</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.zip}
                    onChange={handleInputChange('zip')}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label">Sale Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.sale_date}
                    onChange={handleInputChange('sale_date')}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label">Sale Price *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.sale_price}
                    onChange={handleInputChange('sale_price')}
                    min={0}
                    step="any"
                  />
                </div>
              </div>

              {compType === 'land' && (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label">Land Area (SF)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.land_area_sf}
                        onChange={handleInputChange('land_area_sf')}
                        min={0}
                        step="any"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Land Area (Acres)</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        readOnly
                        value={landAreaAcres != null ? formatNumber(landAreaAcres, 3) : ''}
                      />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label">Price/SF</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        readOnly
                        value={landPricePerSf != null ? formatNumber(landPricePerSf, 2) : ''}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Price/Acre</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        readOnly
                        value={landPricePerAcre != null ? formatCompactCurrency(landPricePerAcre) : ''}
                      />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label">Zoning</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.zoning}
                        onChange={handleInputChange('zoning')}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Entitlements</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.entitlements}
                        onChange={handleInputChange('entitlements')}
                      />
                    </div>
                  </div>
                </>
              )}

              {compType === 'improved' && (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label">Year Built</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.year_built}
                        onChange={handleInputChange('year_built')}
                        min={1800}
                        step={1}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Units</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.units}
                        onChange={handleInputChange('units')}
                        min={0}
                        step={1}
                      />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label">Building SF</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.building_sf}
                        onChange={handleInputChange('building_sf')}
                        min={0}
                        step="any"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Cap Rate (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.cap_rate}
                        onChange={handleInputChange('cap_rate')}
                        min={0}
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label">Price/Unit</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        readOnly
                        value={pricePerUnit != null ? formatCompactCurrency(pricePerUnit) : ''}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Price/SF</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        readOnly
                        value={improvedPricePerSf != null ? formatNumber(improvedPricePerSf, 2) : ''}
                      />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label">GRM</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.grm}
                        onChange={handleInputChange('grm')}
                        min={0}
                        step="any"
                      />
                    </div>
                    <div className="col-6" />
                  </div>
                </>
              )}

              <div className="mb-3">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange('notes')}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                Save Comparable
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
