'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CSpinner,
  CBadge,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilSearch,
  cilUser,
  cilBuilding,
  cilInstitution,
  cilMoney,
  cilPeople,
  cilX,
} from '@coreui/icons';
import { searchContacts } from '@/lib/api/contacts';
import type { ContactTypeaheadItem, ContactType } from '@/types/contacts';

interface ContactTypeaheadProps {
  value?: ContactTypeaheadItem | null;
  onChange: (contact: ContactTypeaheadItem | null) => void;
  placeholder?: string;
  filterTypes?: ContactType[];
  cabinetId?: number;
  disabled?: boolean;
  excludeIds?: number[];
  size?: 'sm' | 'lg';
}

const CONTACT_TYPE_ICONS: Record<ContactType, (string | string[])[]> = {
  Person: cilUser,
  Company: cilBuilding,
  Entity: cilInstitution,
  Fund: cilMoney,
  Government: cilInstitution,
  Other: cilPeople,
};

const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  Person: 'primary',
  Company: 'success',
  Entity: 'warning',
  Fund: 'info',
  Government: 'secondary',
  Other: 'dark',
};

export default function ContactTypeahead({
  value,
  onChange,
  placeholder = 'Search contacts...',
  filterTypes,
  cabinetId,
  disabled = false,
  excludeIds = [],
  size,
}: ContactTypeaheadProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContactTypeaheadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const contacts = await searchContacts(query, {
          type: filterTypes,
          cabinet_id: cabinetId,
        });
        // Filter out excluded IDs
        const filtered = contacts.filter((c) => !excludeIds.includes(c.contact_id));
        setResults(filtered);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error searching contacts:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filterTypes, cabinetId, excludeIds]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (contact: ContactTypeaheadItem) => {
      onChange(contact);
      setQuery('');
      setResults([]);
      setShowDropdown(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  const handleClear = () => {
    onChange(null);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // If a contact is selected, show it
  if (value) {
    return (
      <div ref={containerRef}>
        <CInputGroup size={size}>
          <CInputGroupText>
            <CIcon
              icon={CONTACT_TYPE_ICONS[value.contact_type]}
              className={`text-${CONTACT_TYPE_COLORS[value.contact_type]}`}
            />
          </CInputGroupText>
          <CFormInput
            value={value.display_name || value.name}
            readOnly
            disabled={disabled}
            className="bg-light"
          />
          {!disabled && (
            <CInputGroupText
              style={{ cursor: 'pointer' }}
              onClick={handleClear}
              title="Clear selection"
            >
              <CIcon icon={cilX} />
            </CInputGroupText>
          )}
        </CInputGroup>
        {value.company_name && (
          <small className="text-muted d-block mt-1">
            {value.company_name}
          </small>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <CInputGroup size={size}>
        <CInputGroupText>
          {loading ? <CSpinner size="sm" /> : <CIcon icon={cilSearch} />}
        </CInputGroupText>
        <CFormInput
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (results.length > 0) {
              setShowDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
      </CInputGroup>

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1050,
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: 'var(--cui-body-bg)',
            border: '1px solid var(--cui-border-color)',
            borderRadius: '0.375rem',
            boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
            marginTop: '2px',
          }}
        >
          {results.length === 0 ? (
            <div className="text-center text-muted py-3">
              {loading ? 'Searching...' : query.length < 2 ? 'Type at least 2 characters' : 'No contacts found'}
            </div>
          ) : (
            <CListGroup flush>
              {results.map((contact, index) => (
                <CListGroupItem
                  key={contact.contact_id}
                  onClick={() => handleSelect(contact)}
                  className={`d-flex align-items-center gap-2 ${
                    index === highlightedIndex ? 'bg-primary bg-opacity-10' : ''
                  }`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <CBadge
                    color={CONTACT_TYPE_COLORS[contact.contact_type]}
                    className="p-2"
                  >
                    <CIcon
                      icon={CONTACT_TYPE_ICONS[contact.contact_type]}
                      size="sm"
                    />
                  </CBadge>
                  <div className="flex-grow-1">
                    <div className="fw-semibold">
                      {contact.display_name || contact.name}
                    </div>
                    {contact.company_name && (
                      <small className="text-muted">{contact.company_name}</small>
                    )}
                  </div>
                  <CBadge color="secondary" shape="rounded-pill">
                    {contact.contact_type}
                  </CBadge>
                </CListGroupItem>
              ))}
            </CListGroup>
          )}
        </div>
      )}
    </div>
  );
}
