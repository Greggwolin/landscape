'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilChevronTop } from '@coreui/icons';
import { formatMoney } from '@/utils/formatters/number';

interface Props {
  projectId: number;
  defaultExpanded?: boolean;
}

interface AcquisitionHeader {
  purchase_price: number | null;
  acquisition_date: string | null;
}

interface ProjectData {
  acres_gross: number | null;
}

const apiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

const parseNumber = (value: string): number | null =>
  value === '' || Number.isNaN(Number(value)) ? null : Number(value);

export default function NapkinAcquisitionAccordion({ projectId, defaultExpanded = false }: Props) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [assumptions, setAssumptions] = useState<AcquisitionHeader | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for formatted display
  const [displayValue, setDisplayValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Calculate price per acre
  const pricePerAcre = useMemo(() => {
    if (!assumptions?.purchase_price || !projectData?.acres_gross) return null;
    return assumptions.purchase_price / projectData.acres_gross;
  }, [assumptions?.purchase_price, projectData?.acres_gross]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both acquisition assumptions and project data in parallel
      const [assumptionsRes, projectRes] = await Promise.all([
        fetch(`${apiUrl}/api/projects/${projectId}/assumptions/acquisition/`),
        fetch(`/api/projects/${projectId}`),
      ]);

      if (!assumptionsRes.ok) throw new Error(`Failed to load acquisition assumptions (${assumptionsRes.status})`);
      const assumptionsJson = await assumptionsRes.json();
      setAssumptions(assumptionsJson as AcquisitionHeader);

      if (projectRes.ok) {
        const projectJson = await projectRes.json();
        setProjectData({ acres_gross: projectJson.acres_gross ?? null });
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load acquisition inputs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  useEffect(() => {
    if (assumptions?.purchase_price && !isEditing) {
      setDisplayValue(formatMoney(assumptions.purchase_price));
    } else if (!assumptions?.purchase_price && !isEditing) {
      setDisplayValue('');
    }
  }, [assumptions?.purchase_price, isEditing]);

  const saveAssumptions = async (patch?: Partial<AcquisitionHeader>) => {
    if (!assumptions) return;
    setSaving(true);
    setError(null);
    const payload = {
      ...assumptions,
      ...patch,
      project_id: projectId,
    };
    try {
      const res = await fetch(`${apiUrl}/api/projects/${projectId}/assumptions/acquisition/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const json = await res.json();
      setAssumptions(json as AcquisitionHeader);
    } catch (err) {
      console.error(err);
      setError('Unable to save acquisition inputs');
    } finally {
      setSaving(false);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow user to type raw numbers
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setDisplayValue(raw);
    setAssumptions((prev) =>
      prev ? { ...prev, purchase_price: parseNumber(raw) } : prev
    );
  };

  const handlePriceFocus = () => {
    setIsEditing(true);
    // Show raw number for editing
    if (assumptions?.purchase_price) {
      setDisplayValue(String(assumptions.purchase_price));
    }
  };

  const handlePriceBlur = () => {
    setIsEditing(false);
    saveAssumptions();
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAssumptions((prev) =>
      prev ? { ...prev, acquisition_date: e.target.value || null } : prev
    );
  };

  return (
    <CCard>
      <CCardHeader
        className="d-flex justify-content-between align-items-center py-2"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="fw-semibold">Acquisition</span>
        <div className="d-flex align-items-center gap-2">
          {saving && <CSpinner size="sm" />}
          <CIcon icon={isOpen ? cilChevronTop : cilChevronBottom} size="lg" />
        </div>
      </CCardHeader>
      {isOpen && (
        <CCardBody className="py-3">
          {loading ? (
            <div className="d-flex align-items-center text-muted">
              <CSpinner size="sm" className="me-2" /> Loading...
            </div>
          ) : error ? (
            <div className="alert alert-danger py-2 mb-0">{error}</div>
          ) : assumptions ? (
            <CRow className="g-3">
              <CCol xs={4}>
                <CFormLabel className="small text-muted mb-1">Purchase Price</CFormLabel>
                <CFormInput
                  type="text"
                  inputMode="numeric"
                  value={isEditing ? displayValue : (assumptions.purchase_price ? formatMoney(assumptions.purchase_price) : '')}
                  onChange={handlePriceChange}
                  onFocus={handlePriceFocus}
                  onBlur={handlePriceBlur}
                  placeholder="$0"
                  style={{ maxWidth: '160px' }}
                />
              </CCol>
              <CCol xs={4}>
                <CFormLabel className="small text-muted mb-1">Price / Acre</CFormLabel>
                <div
                  className="form-control-plaintext fw-semibold"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {pricePerAcre ? formatMoney(pricePerAcre) : '—'}
                </div>
              </CCol>
              <CCol xs={4}>
                <CFormLabel className="small text-muted mb-1">Close Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={assumptions.acquisition_date ?? ''}
                  onChange={handleDateChange}
                  onBlur={() => saveAssumptions()}
                  style={{ maxWidth: '140px' }}
                />
              </CCol>
            </CRow>
          ) : null}
        </CCardBody>
      )}
    </CCard>
  );
}
