'use client';

import React, { useMemo, useState } from 'react';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';

type ToolCategory = 'Skills' | 'Analysis' | 'Reports' | 'Data Source' | 'Document' | 'Custom';

interface Tool {
  name: string;
  category: ToolCategory;
  status: 'active' | 'draft';
  desc: string;
  meta: string;
}

const TOOLS: Tool[] = [
  { name: 'Excel Model Audit', category: 'Document', status: 'active', desc: 'Auto-audit Excel models on ingestion. Formula integrity, CRE validation, trust scoring.', meta: 'Auto-trigger' },
  { name: 'DCF / Cash Flow Engine', category: 'Analysis', status: 'active', desc: 'Discounted cash flow modeling with validated IRR, NPV, and DSCR calculations.', meta: 'On demand' },
  { name: 'Waterfall Distribution', category: 'Analysis', status: 'active', desc: 'Tiered promote allocation, pref return, LP/GP splits. Validated against known models.', meta: 'On demand' },
  { name: 'FRED Market Data', category: 'Data Source', status: 'active', desc: 'Treasury yields, SOFR, employment, GDP. Auto-pulls on schedule.', meta: 'Weekly' },
  { name: 'USPAP Narrative Report', category: 'Reports', status: 'active', desc: 'Generate USPAP-compliant appraisal reports from conversational inputs.', meta: 'On demand' },
  { name: 'Municipal Data Discovery', category: 'Data Source', status: 'active', desc: 'Auto-discover available APIs from City/County/State for project location.', meta: 'On project create' },
  { name: 'Rent Comp Extractor', category: 'Skills', status: 'active', desc: 'Parse rent comp PDFs and CSVs into structured comp sets with adjustments.', meta: 'On demand' },
  { name: 'Sales Comp Extractor', category: 'Skills', status: 'active', desc: 'Extract sale price, cap rate, and property attributes from comp documents.', meta: 'On demand' },
  { name: 'Budget vs. Actual', category: 'Reports', status: 'active', desc: 'Variance analysis with drill-down by category, phase, and time period.', meta: 'On demand' },
  { name: 'Loan Scenario Builder', category: 'Analysis', status: 'active', desc: 'Compare bridge, perm, and construction loan scenarios. Sensitivity tables.', meta: 'On demand' },
  { name: 'OCR / Scan Recognition', category: 'Document', status: 'draft', desc: 'Detect scanned PDFs and add text layer via OCRmyPDF preprocessing.', meta: 'Preview' },
  { name: 'Portfolio Rollup', category: 'Reports', status: 'draft', desc: 'Fund-level cash flow stacking with waterfall across multiple deals.', meta: 'Beta' },
];

const TABS: Array<'All' | ToolCategory> = ['All', 'Skills', 'Analysis', 'Reports', 'Data Source', 'Document', 'Custom'];

export default function WrapperToolsPage() {
  const [active, setActive] = useState<'All' | ToolCategory>('All');

  const filtered = useMemo(
    () => (active === 'All' ? TOOLS : TOOLS.filter((t) => t.category === active)),
    [active]
  );

  return (
    <RightContentPanel title="Tools" subtitle={`(${TOOLS.length})`}>
      <div className="w-admin-tabs-bar">
        {TABS.map((t) => (
          <button
            key={t}
            className={`w-admin-tab-pill${active === t ? ' active' : ''}`}
            onClick={() => setActive(t)}
          >
            {t === 'Data Source' ? 'Data Sources' : t}
          </button>
        ))}
      </div>
      <div className="w-proto-grid">
        {filtered.map((tool) => (
          <div key={tool.name} className="w-proto-card">
            <div className="w-pc-head">
              <div className="w-pc-name">{tool.name}</div>
              <div className="w-pc-tags">
                <span className="w-pc-cat">{tool.category}</span>
                <span className={`w-pc-status ${tool.status}`}>
                  {tool.status === 'active' ? 'Active' : 'Draft'}
                </span>
              </div>
            </div>
            <div className="w-pc-desc">{tool.desc}</div>
            <div className="w-pc-meta">
              <span>{tool.meta}</span>
            </div>
          </div>
        ))}
      </div>
    </RightContentPanel>
  );
}
