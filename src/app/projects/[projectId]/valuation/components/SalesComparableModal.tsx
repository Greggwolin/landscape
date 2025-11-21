/**
 * SalesComparableModal Component
 *
 * Modal for adding/editing sales comparables in the valuation system.
 * Adapts field labels and layout based on mode (multifamily vs land sales).
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CRow,
  CCol,
} from '@coreui/react';
import type { SalesComparable, SalesComparableForm } from '@/types/valuation';

interface SalesComparableModalProps {
  visible: boolean;
  comparable?: SalesComparable | null;
  projectId: number;
  mode?: 'multifamily' | 'land';
  onClose: () => void;
  onSave: (data: SalesComparableForm) => Promise<void>;
}

export function SalesComparableModal({
  visible,
  comparable,
  projectId,
  mode = 'multifamily',
  onClose,
  onSave,
}: SalesComparableModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [propertyType, setPropertyType] = useState<'Land' | 'Lots'>('Land');
  const [products, setProducts] = useState<Array<{
    product_id: number;
    product_name: string;
    code: string;
    lot_width: number | null;
    lot_depth: number | null;
    lot_area_sf: number | null;
  }>>([]);

  const isEditMode = !!comparable;
  const isLandMode = mode === 'land';

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && visible && !saving) {
        onClose();
      }
    };

    if (visible) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [visible, saving, onClose]);

  // Fetch products from land use taxonomy when modal opens in land mode
  useEffect(() => {
    if (visible && isLandMode) {
      fetch('/api/landuse/choices?type=products')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setProducts(data);
          }
        })
        .catch((error) => {
          console.error('Error fetching products:', error);
        });
    }
  }, [visible, isLandMode]);

  useEffect(() => {
    if (visible) {
      if (comparable) {
        // Edit mode - populate with existing data
        setFormData({
          sale_date: comparable.sale_date || '',
          address: comparable.address || '',
          city: comparable.city || '',
          county: '', // Not stored in current schema
          state: comparable.state || '',
          zip: comparable.zip || '',
          sale_price: comparable.sale_price || '',
          units: comparable.units || '',
          price_per_unit: comparable.price_per_unit || '',
          price_per_sf: comparable.price_per_sf || '',
          building_sf: comparable.building_sf || '',
          cap_rate: comparable.cap_rate || '',
          year_built: comparable.year_built || '',
          latitude: comparable.latitude || '',
          longitude: comparable.longitude || '',
          buyer: '', // Not stored in current schema
          seller: '', // Not stored in current schema
          notes: comparable.notes || '',
          property_name: comparable.property_name || '',
          grm: comparable.grm || '',
        });
      } else {
        // Add mode - reset form
        setFormData({
          sale_date: '',
          address: '',
          city: '',
          county: '',
          state: '',
          zip: '',
          sale_price: '',
          units: '',
          price_per_unit: '',
          price_per_sf: '',
          building_sf: '',
          cap_rate: '',
          year_built: '',
          latitude: '',
          longitude: '',
          buyer: '',
          seller: '',
          notes: '',
          property_name: '',
          grm: '',
        });
      }
      setErrors({});
    }
  }, [visible, comparable]);

  // Auto-calculate Price/Acre, Price/Lot, and Price/FF when Sale Price changes
  useEffect(() => {
    if (!isLandMode) return;

    const price = parseFloat(formData.sale_price);
    if (isNaN(price) || price <= 0) return;

    if (propertyType === 'Land' && formData.units) {
      const acres = parseFloat(formData.units);
      if (!isNaN(acres) && acres > 0) {
        setFormData((prev: any) => ({
          ...prev,
          price_per_unit: (price / acres).toFixed(2),
        }));
      }
    } else if (propertyType === 'Lots') {
      const updates: any = {};

      // Calculate Price/Lot
      if (formData.lot_count) {
        const lots = parseFloat(formData.lot_count);
        if (!isNaN(lots) && lots > 0) {
          updates.price_per_lot = (price / lots).toFixed(2);
        }
      }

      // Calculate Price/FF (Front Foot)
      if (formData.lot_frontage) {
        const frontage = parseFloat(formData.lot_frontage);
        if (!isNaN(frontage) && frontage > 0) {
          updates.price_per_ff = (price / frontage).toFixed(2);
        }
      }

      if (Object.keys(updates).length > 0) {
        setFormData((prev: any) => ({ ...prev, ...updates }));
      }
    }
  }, [formData.sale_price, formData.units, formData.lot_count, formData.lot_frontage, propertyType, isLandMode]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));

    // If changing product type (building_sf) and it has lot dimensions, extract frontage
    if (key === 'building_sf' && value && propertyType === 'Lots') {
      // First try to find the product in the products array
      const selectedProduct = products.find((p) => p.code === value);

      if (selectedProduct && selectedProduct.lot_width) {
        // Use the lot_width from the product data
        setFormData((prev: any) => ({ ...prev, lot_frontage: selectedProduct.lot_width.toString() }));
      } else {
        // Fallback: Extract frontage from product code like "50x115" or "SFD-50X100"
        const match = value.match(/(\d+)\s*[xX]\s*\d+/);
        if (match) {
          const frontage = match[1];
          setFormData((prev: any) => ({ ...prev, lot_frontage: frontage }));
        }
      }
    }

    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // For land mode, address is more important than property name
    if (isLandMode && !formData.address?.trim()) {
      newErrors.address = 'Property location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      const submitData: SalesComparableForm = {
        project_id: projectId,
        property_name: formData.property_name || formData.address || 'Untitled',
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,
        sale_date: formData.sale_date || null,
        sale_price: formData.sale_price ? Number(formData.sale_price) : null,
        units: formData.units ? Number(formData.units) : null,
        // For land mode, building_sf and cap_rate are text fields (entitlements/utilities)
        // For MF mode, they would be numeric, but we store as string to be flexible
        building_sf: formData.building_sf || null,
        price_per_unit: formData.price_per_unit ? Number(formData.price_per_unit) : null,
        price_per_sf: formData.price_per_sf ? Number(formData.price_per_sf) : null,
        cap_rate: formData.cap_rate || null,
        year_built: formData.year_built ? Number(formData.year_built) : null,
        grm: formData.grm ? Number(formData.grm) : null,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        notes: formData.notes || null,
      };

      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Failed to save comparable:', error);
      alert(`Error saving comparable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const renderLandLayout = () => (
    <>
      {/* Row 1: Sale Date, Property Type, Property Name */}
      <CRow className="g-3 mb-3">
        <CCol xs={12} md={2}>
          <CFormLabel htmlFor="sale_date">Sale Date</CFormLabel>
          <CFormInput
            type="date"
            id="sale_date"
            value={formData.sale_date || ''}
            onChange={(e) => handleChange('sale_date', e.target.value)}
          />
        </CCol>
        <CCol xs={12} md={2}>
          <CFormLabel htmlFor="property_type">Property Type</CFormLabel>
          <select
            id="property_type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as 'Land' | 'Lots')}
            className="form-select"
            style={{
              padding: '0.375rem 2.25rem 0.375rem 0.75rem',
              fontSize: '1rem',
              lineHeight: '1.5',
              color: 'var(--cui-body-color)',
              backgroundColor: 'var(--cui-body-bg)',
              border: '1px solid var(--cui-border-color)',
              borderRadius: '0.375rem',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '16px 12px',
            }}
          >
            <option value="Land">Land</option>
            <option value="Lots">Lots</option>
          </select>
        </CCol>
        <CCol xs={12} md={8}>
          <CFormLabel htmlFor="property_name">Property Name</CFormLabel>
          <CFormInput
            type="text"
            id="property_name"
            value={formData.property_name || ''}
            onChange={(e) => handleChange('property_name', e.target.value)}
            placeholder="Optional - descriptive name for this property"
          />
        </CCol>
      </CRow>

      {/* Row 2: Property Location */}
      <CRow className="g-3 mb-3">
        <CCol xs={12} md={5}>
          <CFormLabel htmlFor="address">
            Property Location <span className="text-danger">*</span>
          </CFormLabel>
          <CFormInput
            type="text"
            id="address"
            value={formData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="cross street, etc. (land wont have an official address)"
            invalid={!!errors.address}
            feedback={errors.address}
          />
        </CCol>
        <CCol xs={12} md={2}>
          <CFormLabel htmlFor="city">City</CFormLabel>
          <CFormInput
            type="text"
            id="city"
            value={formData.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </CCol>
        <CCol xs={12} md={2}>
          <CFormLabel htmlFor="county">County</CFormLabel>
          <CFormInput
            type="text"
            id="county"
            value={formData.county || ''}
            onChange={(e) => handleChange('county', e.target.value)}
          />
        </CCol>
        <CCol xs={6} md={1}>
          <CFormLabel htmlFor="state">State</CFormLabel>
          <CFormInput
            type="text"
            id="state"
            value={formData.state || ''}
            onChange={(e) => handleChange('state', e.target.value)}
            maxLength={2}
          />
        </CCol>
        <CCol xs={6} md={2}>
          <CFormLabel htmlFor="zip">Zip</CFormLabel>
          <CFormInput
            type="text"
            id="zip"
            value={formData.zip || ''}
            onChange={(e) => handleChange('zip', e.target.value)}
          />
        </CCol>
      </CRow>

      {/* Row 3: Financial & Property Data - Changes based on Property Type */}
      <CRow className="g-3 mb-3">
        <CCol xs={12} md={2}>
          <CFormLabel htmlFor="sale_price">Sale Price</CFormLabel>
          <CFormInput
            type="number"
            id="sale_price"
            value={formData.sale_price || ''}
            onChange={(e) => handleChange('sale_price', e.target.value)}
            step="0.01"
          />
        </CCol>

        {propertyType === 'Land' ? (
          <>
            {/* Land-specific fields */}
            <CCol xs={12} md={1}>
              <CFormLabel htmlFor="units">Acres</CFormLabel>
              <CFormInput
                type="number"
                id="units"
                value={formData.units || ''}
                onChange={(e) => handleChange('units', e.target.value)}
                step="0.01"
              />
            </CCol>
            <CCol xs={12} md={2}>
              <CFormLabel htmlFor="price_per_unit">Price / Acre</CFormLabel>
              <CFormInput
                type="number"
                id="price_per_unit"
                value={formData.price_per_unit || ''}
                onChange={(e) => handleChange('price_per_unit', e.target.value)}
                step="0.01"
                readOnly
                style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
                title="Calculated automatically from Sale Price ÷ Acres"
              />
            </CCol>
            <CCol xs={12} md={2}>
              <CFormLabel htmlFor="building_sf">Entitlements</CFormLabel>
              <CFormInput
                type="text"
                id="building_sf"
                value={formData.building_sf || ''}
                onChange={(e) => handleChange('building_sf', e.target.value)}
              />
            </CCol>
            <CCol xs={12} md={2}>
              <CFormLabel htmlFor="cap_rate">Utilities</CFormLabel>
              <CFormInput
                type="text"
                id="cap_rate"
                value={formData.cap_rate || ''}
                onChange={(e) => handleChange('cap_rate', e.target.value)}
              />
            </CCol>
          </>
        ) : (
          <>
            {/* Lots-specific fields */}
            <CCol xs={12} md={1}>
              <CFormLabel htmlFor="lot_count">Lots</CFormLabel>
              <CFormInput
                type="number"
                id="lot_count"
                value={formData.lot_count || ''}
                onChange={(e) => handleChange('lot_count', e.target.value)}
                step="1"
              />
            </CCol>
            <CCol xs={12} md={1}>
              <CFormLabel htmlFor="lot_frontage">Frontage</CFormLabel>
              <CFormInput
                type="number"
                id="lot_frontage"
                value={formData.lot_frontage || ''}
                onChange={(e) => handleChange('lot_frontage', e.target.value)}
                step="0.01"
                placeholder="ft"
              />
            </CCol>
            <CCol xs={12} md={1}>
              <CFormLabel htmlFor="price_per_lot">$/Lot</CFormLabel>
              <CFormInput
                type="number"
                id="price_per_lot"
                value={formData.price_per_lot || ''}
                onChange={(e) => handleChange('price_per_lot', e.target.value)}
                step="0.01"
                readOnly
                style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
                title="Calculated: Sale Price ÷ Lots"
              />
            </CCol>
            <CCol xs={12} md={1}>
              <CFormLabel htmlFor="price_per_ff">$/FF</CFormLabel>
              <CFormInput
                type="number"
                id="price_per_ff"
                value={formData.price_per_ff || ''}
                onChange={(e) => handleChange('price_per_ff', e.target.value)}
                step="0.01"
                readOnly
                style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
                title="Calculated: Sale Price ÷ Frontage"
              />
            </CCol>
            <CCol xs={12} md={2}>
              <CFormLabel htmlFor="building_sf">Product Type</CFormLabel>
              <select
                id="building_sf"
                value={formData.building_sf || ''}
                onChange={(e) => handleChange('building_sf', e.target.value)}
                className="form-select"
                style={{
                  padding: '0.375rem 2.25rem 0.375rem 0.75rem',
                  fontSize: '1rem',
                  lineHeight: '1.5',
                  color: 'var(--cui-body-color)',
                  backgroundColor: 'var(--cui-body-bg)',
                  border: '1px solid var(--cui-border-color)',
                  borderRadius: '0.375rem',
                }}
              >
                <option value="">Select...</option>
                {products.length > 0 ? (
                  products.map((product) => (
                    <option key={product.product_id} value={product.code}>
                      {product.product_name}
                      {product.lot_width && product.lot_depth
                        ? ` (${product.lot_width}' x ${product.lot_depth}')`
                        : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="SFD">SFD</option>
                    <option value="SFA">SFA</option>
                    <option value="TH">Townhome</option>
                    <option value="CONDO">Condo</option>
                  </>
                )}
              </select>
            </CCol>
          </>
        )}

        <CCol xs={6} md={1}>
          <CFormLabel htmlFor="latitude">Lat</CFormLabel>
          <CFormInput
            type="number"
            id="latitude"
            value={formData.latitude || ''}
            onChange={(e) => handleChange('latitude', e.target.value)}
            step="any"
          />
        </CCol>
        <CCol xs={6} md={2}>
          <CFormLabel htmlFor="longitude">Lon</CFormLabel>
          <CFormInput
            type="number"
            id="longitude"
            value={formData.longitude || ''}
            onChange={(e) => handleChange('longitude', e.target.value)}
            step="any"
          />
        </CCol>
      </CRow>

      {/* Row 4: Buyer & Seller */}
      <CRow className="g-3 mb-3">
        <CCol xs={12} md={6}>
          <CFormLabel htmlFor="buyer">Buyer</CFormLabel>
          <CFormInput
            type="text"
            id="buyer"
            value={formData.buyer || ''}
            onChange={(e) => handleChange('buyer', e.target.value)}
          />
        </CCol>
        <CCol xs={12} md={6}>
          <CFormLabel htmlFor="seller">Seller</CFormLabel>
          <CFormInput
            type="text"
            id="seller"
            value={formData.seller || ''}
            onChange={(e) => handleChange('seller', e.target.value)}
          />
        </CCol>
      </CRow>

      {/* Comments */}
      <CRow className="g-3">
        <CCol xs={12}>
          <CFormLabel htmlFor="notes">Comments</CFormLabel>
          <CFormTextarea
            id="notes"
            rows={4}
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
          />
        </CCol>
      </CRow>
    </>
  );

  const renderMultifamilyLayout = () => (
    <>
      {/* Property Identification */}
      <CRow className="g-3 mb-3">
        <CCol xs={12}>
          <h6 className="mb-3 text-secondary">Property Information</h6>
        </CCol>
        <CCol xs={12}>
          <CFormLabel htmlFor="property_name">
            Property Name <span className="text-danger">*</span>
          </CFormLabel>
          <CFormInput
            type="text"
            id="property_name"
            value={formData.property_name || ''}
            onChange={(e) => handleChange('property_name', e.target.value)}
          />
        </CCol>
        <CCol xs={12}>
          <CFormLabel htmlFor="address">Address</CFormLabel>
          <CFormInput
            type="text"
            id="address"
            value={formData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </CCol>
        <CCol xs={12} md={6}>
          <CFormLabel htmlFor="city">City</CFormLabel>
          <CFormInput
            type="text"
            id="city"
            value={formData.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </CCol>
        <CCol xs={12} md={3}>
          <CFormLabel htmlFor="state">State</CFormLabel>
          <CFormInput
            type="text"
            id="state"
            value={formData.state || ''}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder="CA"
          />
        </CCol>
        <CCol xs={12} md={3}>
          <CFormLabel htmlFor="zip">ZIP Code</CFormLabel>
          <CFormInput
            type="text"
            id="zip"
            value={formData.zip || ''}
            onChange={(e) => handleChange('zip', e.target.value)}
          />
        </CCol>
      </CRow>

      {/* Financial Metrics */}
      <CRow className="g-3 mb-3">
        <CCol xs={12}>
          <h6 className="mb-3 text-secondary">Financial Metrics</h6>
        </CCol>
        <CCol xs={12} md={6}>
          <CFormLabel htmlFor="sale_date">Sale Date</CFormLabel>
          <CFormInput
            type="date"
            id="sale_date"
            value={formData.sale_date || ''}
            onChange={(e) => handleChange('sale_date', e.target.value)}
          />
        </CCol>
        <CCol xs={12} md={6}>
          <CFormLabel htmlFor="sale_price">Sale Price ($)</CFormLabel>
          <CFormInput
            type="number"
            id="sale_price"
            value={formData.sale_price || ''}
            onChange={(e) => handleChange('sale_price', e.target.value)}
            step="0.01"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="units">Units</CFormLabel>
          <CFormInput
            type="number"
            id="units"
            value={formData.units || ''}
            onChange={(e) => handleChange('units', e.target.value)}
            step="1"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="building_sf">Building SF</CFormLabel>
          <CFormInput
            type="number"
            id="building_sf"
            value={formData.building_sf || ''}
            onChange={(e) => handleChange('building_sf', e.target.value)}
            step="1"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="year_built">Year Built</CFormLabel>
          <CFormInput
            type="number"
            id="year_built"
            value={formData.year_built || ''}
            onChange={(e) => handleChange('year_built', e.target.value)}
            step="1"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="price_per_unit">Price/Unit</CFormLabel>
          <CFormInput
            type="number"
            id="price_per_unit"
            value={formData.price_per_unit || ''}
            onChange={(e) => handleChange('price_per_unit', e.target.value)}
            step="0.01"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="price_per_sf">Price/SF</CFormLabel>
          <CFormInput
            type="number"
            id="price_per_sf"
            value={formData.price_per_sf || ''}
            onChange={(e) => handleChange('price_per_sf', e.target.value)}
            step="0.01"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="cap_rate">Cap Rate (%)</CFormLabel>
          <CFormInput
            type="number"
            id="cap_rate"
            value={formData.cap_rate || ''}
            onChange={(e) => handleChange('cap_rate', e.target.value)}
            step="0.01"
          />
        </CCol>
        <CCol xs={12} md={6}>
          <CFormLabel htmlFor="grm">GRM</CFormLabel>
          <CFormInput
            type="number"
            id="grm"
            value={formData.grm || ''}
            onChange={(e) => handleChange('grm', e.target.value)}
            step="0.01"
          />
        </CCol>
      </CRow>

      {/* Location Data */}
      <CRow className="g-3 mb-3">
        <CCol xs={12}>
          <h6 className="mb-3 text-secondary">Location Data</h6>
        </CCol>
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="latitude">Latitude</CFormLabel>
          <CFormInput
            type="number"
            id="latitude"
            value={formData.latitude || ''}
            onChange={(e) => handleChange('latitude', e.target.value)}
            step="any"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="longitude">Longitude</CFormLabel>
          <CFormInput
            type="number"
            id="longitude"
            value={formData.longitude || ''}
            onChange={(e) => handleChange('longitude', e.target.value)}
            step="any"
          />
        </CCol>
      </CRow>

      {/* Notes */}
      <CRow className="g-3">
        <CCol xs={12}>
          <h6 className="mb-3 text-secondary">Notes</h6>
        </CCol>
        <CCol xs={12}>
          <CFormLabel htmlFor="notes">Additional Notes</CFormLabel>
          <CFormTextarea
            id="notes"
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Enter any additional information about this comparable..."
          />
        </CCol>
      </CRow>
    </>
  );

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="xl"
      backdrop="static"
      scrollable
    >
      <CModalHeader closeButton>
        <CModalTitle>
          {isEditMode ? 'Edit' : 'Add'} {isLandMode ? 'Land' : 'Multifamily'} Comparable
        </CModalTitle>
      </CModalHeader>

      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          {isLandMode ? renderLandLayout() : renderMultifamilyLayout()}
        </CModalBody>

        <CModalFooter>
          <CButton
            color="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditMode ? 'Update Comparable' : 'Add Comparable'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
