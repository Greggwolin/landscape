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
import { getAuthHeaders } from '@/lib/authHeaders';
import {
  contingencyAmountOf,
  editDraft,
  formatContingencyInput,
  initDraft,
  markSaved,
  parseContingencyInput,
  saveIntent,
  type FieldDraft,
} from './costControlsSave';
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

/**
 * Contingency percentages that are typical for each confidence level. These are
 * offered to the estimator, never applied on their behalf — picking a
 * confidence level says nothing about what buffer this line should carry.
 */
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
  // Drafts open on the stored value and stay untouched until a person edits
  // them. An unset contingency stays unset — the tile supplies no number of its
  // own, and saves nothing at all until something is actually changed.
  const [contingency, setContingency] = useState<FieldDraft<number | null>>(() =>
    initDraft(item.contingency_pct ?? null),
  );
  const [confidenceLevel, setConfidenceLevel] = useState<string>(item.confidence_level || '');
  const [vendor, setVendor] = useState<FieldDraft<string>>(() => initDraft(item.vendor_name || ''));
  const [vendorContactId, setVendorContactId] = useState<number | null>(item.vendor_contact_id || null);
  const [notes, setNotes] = useState<FieldDraft<string>>(() => initDraft(item.notes || ''));
  const [vendorSuggestions, setVendorSuggestions] = useState<Contact[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const vendorInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load vendors on mount
  useEffect(() => {
    fetch('/api/contacts?type=vendor', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        const contacts = Array.isArray(data) ? data : (data.contacts || []);
        setVendorSuggestions(contacts);
      })
      .catch(err => {
        console.error('Failed to load vendors:', err);
      });
  }, []);

  // Contingency amount for display. Null — not $0 — while no contingency has
  // been set, so nothing downstream reads an unset buffer as a decision.
  const contingencyAmount = useMemo(
    () => contingencyAmountOf(item.amount, contingency.value),
    [item.amount, contingency.value],
  );

  // Confidence level is the user's own field. Picking one OFFERS the typical
  // contingency for that level; it never writes a contingency by itself.
  const handleConfidenceLevelChange = (newLevel: string) => {
    setConfidenceLevel(newLevel);
    onFieldChange('confidence_level', newLevel || null);

    const suggestedContingency = contingencyMap[newLevel];
    if (suggestedContingency === undefined) return;
    if (contingency.value === suggestedContingency) return;

    const displayLevel = newLevel.charAt(0).toUpperCase() + newLevel.slice(1);
    const currentLabel =
      contingency.value === null ? 'not set' : `${contingency.value}%`;

    const confirmed = window.confirm(
      `Contingency is ${currentLabel}. Set it to ${suggestedContingency}% ` +
        `(typical for ${displayLevel} confidence)? Cancel leaves it as it is.`
    );
    if (confirmed) {
      setContingency(draft => editDraft(draft, suggestedContingency));
    }
  };

  // Vendor autocomplete search
  const handleVendorSearch = async (query: string) => {
    setVendor(draft => editDraft(draft, query));

    if (query.length < 2) {
      setVendorSuggestions([]);
      setShowVendorDropdown(false);
      return;
    }

    try {
      const response = await fetch(`/api/contacts?type=vendor&search=${encodeURIComponent(query)}`, { headers: getAuthHeaders() });
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
    // Picking a vendor is a deliberate act, so it saves straight away — and the
    // draft is marked saved so the debounce does not write it a second time.
    setVendor(draft => markSaved(editDraft(draft, contact.company_name), contact.company_name));
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

  // Debounced save for contingency. saveIntent is false on mount and false
  // whenever the control matches what is stored, so opening a line — or typing
  // a value and undoing it — writes nothing. A contingency the user genuinely
  // set to 0 is a decision and does save.
  useEffect(() => {
    const intent = saveIntent(contingency);
    if (!intent.save) return;

    const timer = setTimeout(() => {
      onFieldChange('contingency_pct', intent.value);
      setContingency(draft => markSaved(draft, intent.value));
    }, 1000);

    return () => clearTimeout(timer);
  }, [contingency]);

  // Debounced save for notes, gated the same way.
  useEffect(() => {
    const intent = saveIntent(notes);
    if (!intent.save) return;

    const timer = setTimeout(() => {
      onFieldChange('notes', intent.value);
      setNotes(draft => markSaved(draft, intent.value));
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes]);

  // Debounced save for a vendor typed as free text (one picked from the list is
  // saved on selection). Untouched drafts never reach here.
  useEffect(() => {
    const intent = saveIntent(vendor);
    if (!intent.save || vendorContactId) return;

    const timer = setTimeout(() => {
      onFieldChange('vendor_name', intent.value);
      setVendor(draft => markSaved(draft, intent.value));
    }, 1000);

    return () => clearTimeout(timer);
  }, [vendor, vendorContactId]);

  const charCount = notes.value.length;
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
                  setVendor(draft => editDraft(draft, ''));
                } else if (value) {
                  const contact = vendorSuggestions.find(c => c.contact_id === parseInt(value));
                  if (contact) {
                    handleVendorSelect(contact);
                  }
                } else {
                  setVendorContactId(null);
                  setVendor(draft => markSaved(editDraft(draft, ''), ''));
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
              value={formatContingencyInput(contingency.value)}
              placeholder="Not set"
              onChange={(e) => {
                // An empty field means not set — never 0, and never a value of
                // the app's own choosing.
                const next = parseContingencyInput(e.target.value);
                setContingency(draft => editDraft(draft, next));
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
                <option value="">Not set</option>
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
            value={notes.value}
            onChange={(e) => setNotes(draft => editDraft(draft, e.target.value))}
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
