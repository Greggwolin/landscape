'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import ValuationSalesCompMap from '@/components/map/ValuationSalesCompMap';

interface FlyoutProps {
  data?: Record<string, unknown>;
}

type CompId = "1" | "2" | "3";

const COMPS = [
  { id: "1", name: "Comp 1", label: "Reveal Playa Vista" },
  { id: "2", name: "Comp 2", label: "Cobalt" },
  { id: "3", name: "Comp 3", label: "Atlas" },
] as const;

const BASE_ROWS = [
  { label: "Date", values: ["4/23/24", "2/15/24", "1/18/24"] },
  { label: "Name", values: ["Reveal Playa Vista", "Cobalt", "Atlas"] },
  { label: "Sale Price", values: ["$122.10M", "$67.70M", "$49.50M"] },
  { label: "Price/Unit", values: ["$570,561", "$501,481", "$386,719"], calculated: true },
  { label: "Price/SF", values: ["$554.15", "$494.74", "$627.79"], calculated: true },
  { label: "Location", values: ["10.2 mi NW", "11.4 mi NW", "6.2 mi N"] },
  { label: "Units", values: ["214", "135", "128"] },
  { label: "Building SF", values: ["220,337", "136,840", "78,848"] },
  { label: "Cap Rate", values: ["4.30%", "5.30%", "—"], warningIndex: 2 },
  { label: "Year Built", values: ["2003", "2019", "2022"] },
];

const TRANSACTION_ROWS = [
  { label: "Property Rights", values: ["—", "—", "—"] },
  { label: "Financing", values: ["—", "—", "—"] },
  { label: "Conditions of Sale", values: ["—", "—", "—"] },
  { label: "Market Conditions", values: ["+2%", "—", "—"], commentKey: "Market Conditions-1", positiveIndex: 0 },
  { label: "Other", values: ["—", "—", "—"] },
];

const PROPERTY_ROWS = [
  { label: "Location", values: ["+5%", "—", "—"], commentKey: "Location Adj-1", positiveIndex: 0 },
  { label: "Age / Condition", values: ["-12%", "-18%", "—"], negativeIndex: 0 },
  { label: "Economic", values: ["—", "—", "—"] },
  { label: "Deferred Maint", values: ["—", "—", "—"] },
  { label: "Other", values: ["—", "—", "—"] },
];

const COMMENTS: Record<string, string> = {
  "Market Conditions-1": "Sale occurred 9 months ago; market appreciated ~2% per CoStar index.",
  "Location Adj-1": "Subject has superior I-405 access and walkability to retail.",
};

const NARRATIVES: Record<CompId, string> = {
  "1": "Comparable 1: Reveal Playa Vista. Sale occurred April 2024 at $570,561/unit. Adjusted for market conditions and location to align with subject positioning.",
  "2": "Comparable 2: Cobalt. Sale occurred February 2024 at $501,481/unit. Adjustment reflects superior age/condition.",
  "3": "Comparable 3: Atlas. Sale occurred January 2024 at $386,719/unit. Pending cap rate confirmation.",
};

export default function SalesComparisonFlyout({ data: _data }: FlyoutProps) {
  const params = useParams();
  const projectId = Number(params.projectId);
  const tableRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState('520px');
  const [transactionOpen, setTransactionOpen] = useState(true);
  const [propertyOpen, setPropertyOpen] = useState(true);
  const [commentKey, setCommentKey] = useState<string | null>(null);
  const [activeNarrative, setActiveNarrative] = useState<CompId | null>(null);

  const commentText = useMemo(() => (commentKey ? COMMENTS[commentKey] : ""), [commentKey]);

  useEffect(() => {
    const node = tableRef.current;
    if (!node) return;

    const updateHeight = () => {
      const nextHeight = `${node.offsetHeight}px`;
      setMapHeight(nextHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="sales-flyout">
      <div className="sales-flyout-toolbar">
        <div className="sales-flyout-title-group">
          <span className="sales-flyout-icon">✓</span>
          <div>
            <div className="sales-flyout-title">Sales Comparison Approach</div>
            <div className="sales-flyout-subtitle">3 comparables • Extracted from OM</div>
          </div>
        </div>
        <div className="sales-flyout-actions">
          <button className="btn btn-primary btn-sm" type="button">
            + Add Comp
          </button>
          <button className="btn btn-landscaper btn-sm" type="button">
            Ask Landscaper
          </button>
        </div>
      </div>

      <div className="sales-flyout-content">
        <div className="sales-table-map">
          <div className="sales-table-area">
            <div className="sales-table-wrapper" ref={tableRef}>
              <table className="sales-comp-table">
                <thead>
                  <tr>
                    <th>Comparable Sale +</th>
                    {COMPS.map((comp) => (
                      <th key={comp.id} className="comp-col">
                        <div className="comp-header-cell">
                          <div className="comp-actions">
                            <button className="comp-action-btn" type="button">
                              ✎
                            </button>
                            <button className="comp-action-btn delete" type="button">
                              🗑
                            </button>
                          </div>
                          <span className="comp-name">{comp.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BASE_ROWS.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {row.values.map((value, index) => (
                        <td
                          key={`${row.label}-${index}`}
                          className={`comp-col ${row.calculated ? "cell-calculated" : ""} ${
                            row.warningIndex === index ? "cell-warning" : ""
                          }`}
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}

                  <tr className="section-accordion">
                    <td>
                      <button
                        type="button"
                        className="section-toggle"
                        onClick={() => setTransactionOpen((prev) => !prev)}
                        aria-expanded={transactionOpen}
                      >
                        <span className="chevron">{transactionOpen ? "▼" : "▶"}</span>
                        Transaction Adj
                      </button>
                    </td>
                    <td className="comp-col cell-positive">+2%</td>
                    <td className="comp-col">0%</td>
                    <td className="comp-col">0%</td>
                  </tr>
                  {transactionOpen &&
                    TRANSACTION_ROWS.map((row) => (
                      <tr key={`transaction-${row.label}`} className="adjustment-row">
                        <td>{row.label}</td>
                        {row.values.map((value, index) => (
                          <td
                            key={`${row.label}-${index}`}
                            className={`comp-col ${
                              row.positiveIndex === index ? "cell-positive" : ""
                            }`}
                          >
                            <div className="cell-with-comment">
                              <span>{value}</span>
                              {row.commentKey && index === 0 ? (
                                <button
                                  type="button"
                                  className="comment-chip"
                                  onClick={() => setCommentKey(row.commentKey || null)}
                                >
                                  💬
                                </button>
                              ) : null}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}

                  <tr className="section-accordion">
                    <td>
                      <button
                        type="button"
                        className="section-toggle"
                        onClick={() => setPropertyOpen((prev) => !prev)}
                        aria-expanded={propertyOpen}
                      >
                        <span className="chevron">{propertyOpen ? "▼" : "▶"}</span>
                        Property Adj
                      </button>
                    </td>
                    <td className="comp-col cell-negative">-7%</td>
                    <td className="comp-col cell-negative">-18%</td>
                    <td className="comp-col">0%</td>
                  </tr>
                  {propertyOpen &&
                    PROPERTY_ROWS.map((row) => (
                      <tr key={`property-${row.label}`} className="adjustment-row">
                        <td>{row.label}</td>
                        {row.values.map((value, index) => (
                          <td
                            key={`${row.label}-${index}`}
                            className={`comp-col ${
                              row.positiveIndex === index ? "cell-positive" : ""
                            } ${row.negativeIndex === index ? "cell-negative" : ""}`}
                          >
                            <div className="cell-with-comment">
                              <span>{value}</span>
                              {row.commentKey && index === 0 ? (
                                <button
                                  type="button"
                                  className="comment-chip"
                                  onClick={() => setCommentKey(row.commentKey || null)}
                                >
                                  💬
                                </button>
                              ) : null}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}

                  <tr className="total-row">
                    <td>Total Adjustments</td>
                    <td className="comp-col cell-negative">-5%</td>
                    <td className="comp-col cell-negative">-18%</td>
                    <td className="comp-col">0%</td>
                  </tr>
                  <tr className="result-row">
                    <td>Adjusted $/Unit</td>
                    {(["1", "2", "3"] as CompId[]).map((compId) => (
                      <td key={`adjusted-${compId}`} className="comp-col">
                        <div className="adjusted-cell">
                          <button
                            className="narrative-btn"
                            type="button"
                            onClick={() => setActiveNarrative(compId)}
                          >
                            📝
                          </button>
                          <span className="cell-positive">
                            {compId === "1" ? "$399,000" : compId === "2" ? "$411,000" : "$387,000"}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="indicated-row">
                    <td>Indicated Value</td>
                    <td className="comp-col" colSpan={3}>
                      <span className="indicated-value-cell">$45,100,000</span>
                      <span className="indicated-calc">avg $/unit × 113 units</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="sales-map-panel">
            {Number.isNaN(projectId) ? (
              <div className="sales-map-fallback">Map unavailable</div>
            ) : (
              <ValuationSalesCompMap
                projectId={projectId.toString()}
                styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
                height={mapHeight}
              />
            )}
          </div>

          <div className={`sales-comment-panel ${commentKey ? "open" : ""}`}>
            <div className="sales-comment-header">
              <span className="sales-comment-title">Comment</span>
              <button
                className="btn btn-ghost-secondary btn-sm"
                type="button"
                onClick={() => setCommentKey(null)}
              >
                ✕
              </button>
            </div>
            <div className="sales-comment-body">
              <div>
                <div className="comment-field-label">Field</div>
                <div className="comment-field-name">{commentKey || "—"}</div>
                <div className="comment-field-value">{commentText || "—"}</div>
              </div>
              <div className="comment-textarea-wrapper">
                <div className="comment-field-label">Commentary</div>
                <textarea
                  className="comment-textarea"
                  placeholder="Explain this adjustment..."
                  defaultValue={commentText}
                />
              </div>
              <div className="comment-hint">
                <span className="comment-hint-icon">L</span>
                Used in narrative
              </div>
            </div>
          </div>
        </div>

        {activeNarrative ? (
          <div className="narrative-modal">
            <div className="narrative-content" role="dialog" aria-modal="true">
              <div className="narrative-header">
                <div className="narrative-title">
                  <span className="narrative-title-icon">L</span>
                  <span>{`Comp ${activeNarrative} Narrative`}</span>
                </div>
                <button
                  className="btn btn-ghost-secondary btn-sm"
                  type="button"
                  onClick={() => setActiveNarrative(null)}
                >
                  ✕
                </button>
              </div>
              <div className="narrative-body">{NARRATIVES[activeNarrative]}</div>
              <div className="narrative-footer">
                <span className="narrative-footer-label">Generated by Landscaper</span>
                <div className="narrative-actions">
                  <button className="btn btn-ghost-secondary btn-sm" type="button">
                    Copy
                  </button>
                  <button className="btn btn-primary btn-sm" type="button">
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
