'use client';

import React, { useState, useEffect } from 'react';
import { CFormSelect, CButton, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilSettings } from '@coreui/icons';
import useSWR from 'swr';
import { PicklistEditor, type PicklistValue } from './PicklistEditor';
import { PicklistItemModal } from './PicklistItemModal';

type PicklistTypeConfig = {
  value: string;
  label: string;
  hasParent: boolean;
  parentType?: string;
  listCode?: string; // For display config lookup
  usesLuTable?: boolean; // Uses lu_property_subtype instead of tbl_system_picklist
};

const PICKLIST_TYPES: PicklistTypeConfig[] = [
  { value: 'ANALYSIS_TYPE', label: 'Analysis Type', hasParent: false, listCode: 'analysis_type' },
  { value: 'PHASE_STATUS', label: 'Phase Status', hasParent: false, listCode: 'phase_status' },
  { value: 'OWNERSHIP_TYPE', label: 'Ownership Type', hasParent: false, listCode: 'ownership_type' },
  { value: 'PROPERTY_TYPE', label: 'Property Type', hasParent: false, listCode: 'property_type' },
  { value: 'PROPERTY_SUBTYPE', label: 'Property Subtype', hasParent: true, parentType: 'PROPERTY_TYPE', usesLuTable: true },
  { value: 'PROPERTY_CLASS', label: 'Property Class', hasParent: false, listCode: 'property_class' },
  { value: 'LEASE_STATUS', label: 'Lease Status', hasParent: false, listCode: 'lease_status' },
  { value: 'LEASE_TYPE', label: 'Lease Type', hasParent: false },
  { value: 'INFLATION_TYPE', label: 'Inflation Type', hasParent: false },
  { value: 'MARKET', label: 'Market', hasParent: false, listCode: 'market' }
];

const PROPERTY_TYPE_OPTIONS = [
  { code: 'MF', name: 'Multifamily' },
  { code: 'OFF', name: 'Office' },
  { code: 'RET', name: 'Retail' },
  { code: 'IND', name: 'Industrial' },
  { code: 'HTL', name: 'Hotel' },
  { code: 'LAND', name: 'Land' },
  { code: 'MXU', name: 'Mixed-Use' }
];

type DisplayFormat = 'code' | 'name' | 'code_name' | 'name_code';
type DisplayContext = 'dropdown' | 'grid' | 'report' | 'export';

const DISPLAY_FORMAT_OPTIONS: { value: DisplayFormat; label: string }[] = [
  { value: 'code', label: 'Code only' },
  { value: 'name', label: 'Name only' },
  { value: 'code_name', label: 'Code - Name' },
  { value: 'name_code', label: 'Name (Code)' }
];

const DISPLAY_CONTEXTS: DisplayContext[] = ['dropdown', 'grid', 'report', 'export'];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SystemPicklistsAccordion() {
  const [selectedType, setSelectedType] = useState<string>('ANALYSIS_TYPE');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PicklistValue | null>(null);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [displayConfigs, setDisplayConfigs] = useState<Record<DisplayContext, DisplayFormat>>({
    dropdown: 'name',
    grid: 'name',
    report: 'name',
    export: 'code'
  });
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('');

  const typeConfig = PICKLIST_TYPES.find((t) => t.value === selectedType);
  const apiType = selectedType.toLowerCase().replace(/_/g, '-');
  const listCode = typeConfig?.listCode;

  // Fetch picklist values
  const { data, isLoading, mutate } = useSWR(
    typeConfig?.usesLuTable
      ? `/api/picklists/property-subtypes${propertyTypeFilter ? `?property_type=${propertyTypeFilter}` : ''}`
      : `/api/admin/picklists/${apiType}`,
    fetcher
  );

  // Fetch parent data for hierarchical picklists
  const { data: parentData } = useSWR(
    typeConfig?.hasParent && typeConfig.parentType && !typeConfig.usesLuTable
      ? `/api/admin/picklists/${typeConfig.parentType.toLowerCase().replace(/_/g, '-')}`
      : null,
    fetcher
  );

  // Fetch display config for current picklist
  const { data: displayConfigData, mutate: mutateDisplayConfig } = useSWR(
    listCode ? `/api/admin/picklist-display?list_code=${listCode}` : null,
    fetcher
  );

  // Update display configs when data changes
  useEffect(() => {
    if (displayConfigData?.configs) {
      setDisplayConfigs({
        dropdown: displayConfigData.configs.dropdown || 'name',
        grid: displayConfigData.configs.grid || 'name',
        report: displayConfigData.configs.report || 'name',
        export: displayConfigData.configs.export || 'code'
      });
    }
  }, [displayConfigData]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
    setEditingItem(null);
    setShowDisplaySettings(false);
    setPropertyTypeFilter('');
  };

  const handlePropertyTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPropertyTypeFilter(e.target.value);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowAddModal(true);
  };

  const handleEdit = (item: PicklistValue) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleSave = async (formData: Record<string, unknown>) => {
    if (typeConfig?.usesLuTable) {
      // Handle property subtype saves
      const method = editingItem ? 'PUT' : 'POST';
      const payload = editingItem
        ? { subtype_id: editingItem.picklist_id, ...formData }
        : { property_type_code: propertyTypeFilter || formData.parent_code, ...formData };

      await fetch('/api/picklists/property-subtypes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem
        ? `/api/admin/picklists/${apiType}/${editingItem.picklist_id}`
        : `/api/admin/picklists/${apiType}`;

      const payload = editingItem ? { ...formData, code: editingItem.code } : formData;

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    await mutate();
    setShowAddModal(false);
    setEditingItem(null);
  };

  const handleToggleActive = async (item: PicklistValue) => {
    if (typeConfig?.usesLuTable) {
      await fetch('/api/picklists/property-subtypes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtype_id: item.picklist_id, is_active: !item.is_active })
      });
    } else {
      await fetch(`/api/admin/picklists/${apiType}/${item.picklist_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active })
      });
    }
    await mutate();
  };

  const handleDisplayFormatChange = async (context: DisplayContext, format: DisplayFormat) => {
    if (!listCode) return;

    // Optimistic update
    setDisplayConfigs((prev) => ({ ...prev, [context]: format }));

    await fetch('/api/admin/picklist-display', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_code: listCode, context, display_format: format })
    });

    await mutateDisplayConfig();
  };

  // Transform lu_property_subtype data to match PicklistValue format
  const getPicklistValues = (): PicklistValue[] => {
    if (typeConfig?.usesLuTable && data?.subtypes) {
      return data.subtypes.map((s: { id: number; code: string; name: string; propertyType: string; sortOrder: number }) => ({
        picklist_id: s.id,
        picklist_type: 'PROPERTY_SUBTYPE',
        code: s.code,
        name: s.name,
        parent_code: s.propertyType,
        sort_order: s.sortOrder,
        is_active: true
      }));
    }
    return data?.values || [];
  };

  return (
    <div className="p-0">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <label className="text-muted small me-2">Picklist Type:</label>
          <CFormSelect
            value={selectedType}
            onChange={handleTypeChange}
            style={{ width: '200px' }}
            size="sm"
          >
            {PICKLIST_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </CFormSelect>

          {/* Property Type filter for subtypes */}
          {selectedType === 'PROPERTY_SUBTYPE' && (
            <div className="d-flex align-items-center gap-2 ms-3">
              <label className="text-muted small">Filter by:</label>
              <CFormSelect
                value={propertyTypeFilter}
                onChange={handlePropertyTypeFilterChange}
                style={{ width: '150px' }}
                size="sm"
              >
                <option value="">All Types</option>
                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </CFormSelect>
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-2">
          {listCode && (
            <CButton
              color={showDisplaySettings ? 'primary' : 'secondary'}
              variant="ghost"
              size="sm"
              onClick={() => setShowDisplaySettings(!showDisplaySettings)}
              title="Display Settings"
            >
              <CIcon icon={cilSettings} />
            </CButton>
          )}
          <CButton color="primary" size="sm" onClick={handleAdd}>
            <CIcon icon={cilPlus} className="me-1" />
            Add {typeConfig?.label.replace(/s$/, '')}
          </CButton>
        </div>
      </div>

      {/* Display Settings Panel */}
      {showDisplaySettings && listCode && (
        <div className="mb-3 p-3 border rounded bg-body-secondary">
          <h6 className="text-sm font-medium mb-3">Display Settings</h6>
          <div className="row g-3">
            {DISPLAY_CONTEXTS.map((context) => (
              <div key={context} className="col-3">
                <label className="form-label text-xs text-muted text-capitalize">
                  {context}
                </label>
                <CFormSelect
                  size="sm"
                  value={displayConfigs[context]}
                  onChange={(e) =>
                    handleDisplayFormatChange(context, e.target.value as DisplayFormat)
                  }
                >
                  {DISPLAY_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <CSpinner size="sm" />
        </div>
      ) : (
        <PicklistEditor
          values={getPicklistValues()}
          hasParent={typeConfig?.hasParent || false}
          parentOptions={
            typeConfig?.usesLuTable
              ? PROPERTY_TYPE_OPTIONS.map((o) => ({ code: o.code, name: o.name }))
              : parentData?.values || []
          }
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
        />
      )}

      <PicklistItemModal
        show={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        editingItem={editingItem}
        picklistType={selectedType}
        typeLabel={typeConfig?.label || ''}
        hasParent={typeConfig?.hasParent || false}
        parentOptions={
          typeConfig?.usesLuTable
            ? PROPERTY_TYPE_OPTIONS.map((o) => ({ code: o.code, name: o.name }))
            : parentData?.values || []
        }
        defaultParentCode={propertyTypeFilter}
      />
    </div>
  );
}
