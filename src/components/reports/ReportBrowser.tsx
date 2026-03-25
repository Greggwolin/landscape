'use client';

import React, { useState, useMemo } from 'react';
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilChevronRight } from '@coreui/icons';
import type { ReportDefinition } from '@/types/report-definitions';
import { REPORT_CATEGORIES, READINESS_CONFIG } from '@/types/report-definitions';

interface ReportBrowserProps {
  definitions: ReportDefinition[];
  selectedCode: string | null;
  onSelect: (reportCode: string) => void;
}

export default function ReportBrowser({ definitions, selectedCode, onSelect }: ReportBrowserProps) {
  // Group definitions by category
  const grouped = useMemo(() => {
    const groups: Record<string, ReportDefinition[]> = {};
    for (const def of definitions) {
      const cat = def.report_category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(def);
    }
    // Sort categories by their configured order
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      const orderA = REPORT_CATEGORIES[a]?.order ?? 99;
      const orderB = REPORT_CATEGORIES[b]?.order ?? 99;
      return orderA - orderB;
    });
    return sorted;
  }, [definitions]);

  // All categories start expanded
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div style={{
      width: '320px',
      minWidth: '320px',
      borderRight: '1px solid var(--cui-border-color)',
      overflowY: 'auto',
      background: 'var(--cui-body-bg)',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--cui-border-color)',
        fontWeight: 600,
        fontSize: '0.9rem',
        color: 'var(--cui-body-color)',
      }}>
        Reports ({definitions.length})
      </div>

      {grouped.map(([category, reports]) => {
        const catConfig = REPORT_CATEGORIES[category] || { label: category, order: 99 };
        const isOpen = !collapsed[category];

        return (
          <div key={category}>
            {/* Category header */}
            <div
              onClick={() => toggleCategory(category)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--cui-border-color)',
                background: 'var(--cui-tertiary-bg)',
                userSelect: 'none',
              }}
            >
              <span style={{
                fontWeight: 600,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--cui-secondary-color)',
              }}>
                {catConfig.label}
                <span style={{
                  marginLeft: '6px',
                  fontWeight: 400,
                  fontSize: '0.75rem',
                }}>
                  ({reports.length})
                </span>
              </span>
              <CIcon
                icon={isOpen ? cilChevronBottom : cilChevronRight}
                size="sm"
                style={{ color: 'var(--cui-secondary-color)' }}
              />
            </div>

            {/* Report items — CSS show/hide instead of CCollapse to avoid animation timing bug */}
            <div style={{ display: isOpen ? 'block' : 'none' }}>
              {reports.map(report => {
                const isSelected = report.report_code === selectedCode;
                const readiness = READINESS_CONFIG[report.data_readiness] || READINESS_CONFIG.not_ready;

                return (
                  <div
                    key={report.report_code}
                    onClick={() => onSelect(report.report_code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 16px 8px 24px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--cui-border-color)',
                      background: isSelected
                        ? 'var(--cui-primary-bg-subtle)'
                        : 'transparent',
                      borderLeft: isSelected
                        ? '3px solid var(--cui-primary)'
                        : '3px solid transparent',
                    }}
                    title={report.description}
                  >
                    <span style={{
                      fontSize: '0.85rem',
                      color: 'var(--cui-body-color)',
                      fontWeight: isSelected ? 600 : 400,
                    }}>
                      {report.report_name}
                    </span>
                    <span
                      className={`badge bg-${readiness.color}`}
                      style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                    >
                      {readiness.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
