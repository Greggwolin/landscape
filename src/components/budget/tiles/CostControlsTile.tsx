/**
 * Cost Controls Tile
 *
 * Standard/Detail mode accordion for cost management and risk assessment
 * Includes: Confidence Level, Contingency %, Vendor, Notes
 */

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CFormFloating,
  CTooltip,
} from '@coreui/react';
import type { BudgetItem } from '@/types/budget';
import './cost-controls-tile.css';

interface Contact {
  contact_id: number;
  company_name: string;
  primary_contact_name?: string;
  email?: string;
  phone?: string;
}

interface CostControlsTileProps {
  item: BudgetItem;
  projectId: number;
  onFieldChange: (field: keyof BudgetItem, value: any) => Promise<void> | void;
}

const contingencyMap: Record<string, number> = {
  'high': 5.0,
  'medium': 10.0,
  'low': 15.0,
  'conceptual': 20.0,
};

export default function CostControlsTile({
  item,
  projectId,
  onFieldChange,
}: CostControlsTileProps) {
  const [contingencyPct, setContingencyPct] = useState<number>(item.contingency_pct || 10.0);
  const [confidenceLevel, setConfidenceLevel] = useState<string>(item.confidence_level || 'medium');
  const [vendorName, setVendorName] = useState<string>(item.vendor_name || '');
  const [vendorContactId, setVendorContactId] = useState<number | null>(item.vendor_contact_id || null);
  const [notes, setNotes] = useState<string>(item.notes || '');
  const [vendorSuggestions, setVendorSuggestions] = useState<Contact[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const vendorInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load vendors on mount
  useEffect(() => {
    fetch('/api/contacts?type=vendor')
      .then(res => res.json())
      .then(data => {
        const contacts = Array.isArray(data) ? data : (data.contacts || []);
        setVendorSuggestions(contacts);
      })
      .catch(err => {
        console.error('Failed to load vendors:', err);
      });
  }, []);

  // Calculate contingency amount for display
  const contingencyAmount = useMemo(() => {
    return (item.amount || 0) * (contingencyPct / 100);
  }, [item.amount, contingencyPct]);

  // Handle confidence level change with contingency auto-update
  const handleConfidenceLevelChange = (newLevel: string) => {
    setConfidenceLevel(newLevel);
    onFieldChange('confidence_level', newLevel);

    const suggestedContingency = contingencyMap[newLevel];
    const displayLevel = newLevel.charAt(0).toUpperCase() + newLevel.slice(1);

    // Show confirmation if user has manually set a different contingency
    if (contingencyPct !== suggestedContingency && contingencyPct !== 0 && contingencyPct !== (item.contingency_pct || 10.0)) {
      const confirmed = window.confirm(
        `Change contingency from ${contingencyPct}% to ${suggestedContingency}% (typical for ${displayLevel} confidence)?`
      );
      if (confirmed) {
        setContingencyPct(suggestedContingency);
        onFieldChange('contingency_pct', suggestedContingency);
      }
    } else {
      setContingencyPct(suggestedContingency);
      onFieldChange('contingency_pct', suggestedContingency);
    }
  };

  // Vendor autocomplete search
  const handleVendorSearch = async (query: string) => {
    setVendorName(query);

    if (query.length < 2) {
      setVendorSuggestions([]);
      setShowVendorDropdown(false);
      return;
    }

    try {
      const response = await fetch(`/api/contacts?type=vendor&search=${encodeURIComponent(query)}`);
      const data = await response.json();
      const contacts = Array.isArray(data) ? data : (data.contacts || []);
      setVendorSuggestions(contacts.slice(0, 10));
      setShowVendorDropdown(contacts.length > 0);
    } catch (error) {
      console.error('Failed to fetch vendor suggestions:', error);
      setVendorSuggestions([]);
      setShowVendorDropdown(false);
    }
  };

  const handleVendorSelect = (contact: Contact) => {
    setVendorName(contact.company_name);
    setVendorContactId(contact.contact_id);
    setShowVendorDropdown(false);

    // Immediately save vendor selection
    onFieldChange('vendor_contact_id', contact.contact_id);
    onFieldChange('vendor_name', contact.company_name);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        vendorInputRef.current &&
        !vendorInputRef.current.contains(event.target as Node)
      ) {
        setShowVendorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced save for contingency and notes
  useEffect(() => {
    const timer = setTimeout(() => {
      onFieldChange('contingency_pct', contingencyPct);
    }, 1000);

    return () => clearTimeout(timer);
  }, [contingencyPct]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFieldChange('notes', notes);
      // Save vendor name as free text if not linked to contact
      if (!vendorContactId && vendorName) {
        onFieldChange('vendor_name', vendorName);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, vendorName, vendorContactId]);

  const charCount = notes.length;
  const charCountClass = charCount > 950 ? 'text-danger' : charCount > 800 ? 'text-warning' : 'text-muted';

  return (
    <div className="cost-controls-tile" style={{ padding: '0.5rem 0.75rem' }}>
      {/* Row 1: Vendor, Contingency %, Confidence */}
      <div className="d-flex gap-2 mb-2">
        {/* Vendor dropdown */}
        <div style={{ flex: '1 1 40%', minWidth: '150px' }}>
          <CFormFloating>
            <CFormSelect
              id="vendorSelect"
              value={vendorContactId || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'add_new') {
                  setVendorContactId(null);
                  setVendorName('');
                } else if (value) {
                  const contact = vendorSuggestions.find(c => c.contact_id === parseInt(value));
                  if (contact) {
                    handleVendorSelect(contact);
                  }
                } else {
                  setVendorContactId(null);
                  setVendorName('');
                  onFieldChange('vendor_contact_id', null);
                  onFieldChange('vendor_name', '');
                }
              }}
            >
              <option value="">Select...</option>
              {vendorSuggestions.map((contact) => (
                <option key={contact.contact_id} value={contact.contact_id}>
                  {contact.company_name}
                </option>
              ))}
              <option value="add_new">+ Add New</option>
            </CFormSelect>
            <CFormLabel htmlFor="vendorSelect">Vendor</CFormLabel>
          </CFormFloating>
        </div>

        {/* Contingency % - centered */}
        <div style={{ flex: '0 0 100px' }}>
          <CFormFloating>
            <CFormInput
              type="text"
              id="contingencyPct"
              value={`${Math.round(contingencyPct)}%`}
              onChange={(e) => {
                const numValue = parseFloat(e.target.value.replace('%', '')) || 0;
                setContingencyPct(numValue);
              }}
              className="text-center"
            />
            <CFormLabel htmlFor="contingencyPct">Contin.</CFormLabel>
          </CFormFloating>
        </div>

        {/* Confidence Level */}
        <div style={{ flex: '1 1 30%', minWidth: '120px' }}>
          <CTooltip
            content={
              <div>
                <strong>High:</strong> Firm bids<br />
                <strong>Medium:</strong> Quotes<br />
                <strong>Low:</strong> Estimates<br />
                <strong>Concept:</strong> Feasibility
              </div>
            }
            placement="top"
          >
            <CFormFloating>
              <CFormSelect
                id="confidenceLevel"
                value={confidenceLevel}
                onChange={(e) => handleConfidenceLevelChange(e.target.value)}
              >
                <option value="high">High</option>
                <option value="medium">Med</option>
                <option value="low">Low</option>
                <option value="conceptual">Concept</option>
              </CFormSelect>
              <CFormLabel htmlFor="confidenceLevel">Confidence</CFormLabel>
            </CFormFloating>
          </CTooltip>
        </div>
      </div>

      {/* Row 2: Notes - spans from Vendor to Confidence */}
      <div>
        <CFormFloating>
          <CFormTextarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes..."
            style={{ minHeight: '50px' }}
            maxLength={1000}
          />
          <CFormLabel htmlFor="notes">Notes</CFormLabel>
        </CFormFloating>
        {charCount > 800 && (
          <div className={`text-end ${charCountClass}`} style={{ fontSize: '0.6rem', marginTop: '0.1rem' }}>
            {charCount}/1000
          </div>
        )}
      </div>
    </div>
  );
}
