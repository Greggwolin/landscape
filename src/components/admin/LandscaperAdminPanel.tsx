'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles, History, MessageSquare, Settings2, BookOpen } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LandscapeButton, SemanticBadge } from '@/components/ui/landscape';

// Dynamically import components to avoid SSR issues
const ExtractionMappingAdmin = dynamic(
  () => import('@/components/admin/ExtractionMappingAdmin').then((mod) => mod.ExtractionMappingAdmin),
  { ssr: false }
);

const KnowledgeLibraryPanel = dynamic(
  () => import('@/components/admin/knowledge-library/KnowledgeLibraryPanel'),
  { ssr: false }
);

interface LandscaperSection {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

const LANDSCAPER_SECTIONS: LandscaperSection[] = [
  {
    key: 'knowledge_library',
    label: 'Knowledge Library',
    description: 'Search, browse, and manage Landscaper\u2019s document knowledge base',
    icon: <BookOpen size={18} />,
    available: true
  },
  {
    key: 'extraction_mappings',
    label: 'AI Extraction Mappings',
    description: 'Configure field mappings for AI document extraction',
    icon: <Sparkles size={18} />,
    available: true
  },
  {
    key: 'model_config',
    label: 'Model Configuration',
    description: 'Configure AI model settings and parameters',
    icon: <Settings2 size={18} />,
    available: false
  },
  {
    key: 'extraction_history',
    label: 'Extraction History / Logs',
    description: 'View extraction activity and audit logs',
    icon: <History size={18} />,
    available: false
  },
  {
    key: 'training_feedback',
    label: 'Training Feedback',
    description: 'Review and provide feedback on AI extractions',
    icon: <MessageSquare size={18} />,
    available: false
  }
];

export default function LandscaperAdminPanel() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (key: string, available: boolean) => {
    if (!available) return;
    setExpandedSection(expandedSection === key ? null : key);
  };

  return (
    <div className="space-y-4">
      <div style={{ backgroundColor: 'var(--cui-card-bg)', borderColor: 'var(--cui-border-color)' }} className="rounded-lg shadow-sm border">
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
          <div className="d-flex align-items-center gap-3">
            <img
              src="/landscaper-icon.svg"
              alt="Landscaper"
              style={{ width: 24, height: 24 }}
            />
            <h2 className="h5 mb-0" style={{ color: 'var(--cui-body-color)' }}>Landscaper Configuration</h2>
          </div>
          <p className="text-sm mb-0 mt-2" style={{ color: 'var(--cui-secondary-color)' }}>
            Configure AI assistant behavior, document extraction, and learning settings
          </p>
        </div>

        {/* Landscaper Sections Accordion */}
        <div className="divide-y" style={{ borderColor: 'var(--cui-border-color)' }}>
          {LANDSCAPER_SECTIONS.map(section => {
            const isExpanded = expandedSection === section.key;
            const isDisabled = !section.available;

            return (
              <div key={section.key}>
                <LandscapeButton
                  onClick={() => toggleSection(section.key, section.available)}
                  variant="ghost"
                  color="secondary"
                  disabled={isDisabled}
                  className="d-flex w-100 align-items-center justify-content-between px-4 py-3"
                  style={{
                    color: isDisabled ? 'var(--cui-secondary-color)' : 'var(--cui-body-color)',
                    backgroundColor: isExpanded ? 'var(--cui-tertiary-bg)' : 'transparent',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    borderRadius: 0,
                    opacity: isDisabled ? 0.6 : 1
                  }}
                >
                  <div className="d-flex align-items-center gap-3 flex-grow-1">
                    <span style={{ color: isDisabled ? 'var(--cui-secondary-color)' : 'var(--cui-primary)' }}>
                      {section.icon}
                    </span>
                    <div className="d-flex flex-column align-items-start">
                      <span className="fw-semibold">
                        {section.label}
                        {isDisabled && (
                          <SemanticBadge
                            intent="status"
                            value="coming soon"
                            className="ms-2"
                            style={{ fontSize: '0.65rem', fontWeight: 400 }}
                          >
                            Coming Soon
                          </SemanticBadge>
                        )}
                        <span className="text-sm ms-2" style={{ color: 'var(--cui-secondary-color)', fontWeight: 400 }}>
                          — {section.description}
                        </span>
                      </span>
                    </div>
                  </div>
                  {!isDisabled && (
                    isExpanded ? (
                      <ChevronDown size={20} style={{ color: 'var(--cui-body-color)' }} />
                    ) : (
                      <ChevronRight size={20} style={{ color: 'var(--cui-body-color)' }} />
                    )
                  )}
                </LandscapeButton>

                {isExpanded && section.available && (
                  <div className="p-4" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
                    {section.key === 'extraction_mappings' && <ExtractionMappingAdmin />}
                    {section.key === 'knowledge_library' && <KnowledgeLibraryPanel />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
