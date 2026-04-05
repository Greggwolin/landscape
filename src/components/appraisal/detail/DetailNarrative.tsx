/**
 * DetailNarrative
 *
 * Narrative flyout for location/market T1/T2/T3 tiers.
 * AI-generated analysis with per-tier regeneration.
 *
 * @version 1.1
 * @created 2026-04-05
 * @updated 2026-04-05 — Inline styles → CSS classes
 */

'use client';

import React, { useState } from 'react';

interface Props {
  onClose: () => void;
}

interface NarrativeTier {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  timestamp: string;
  text: string;
}

const TIERS: NarrativeTier[] = [
  {
    id: 't1',
    badge: 'T1',
    badgeColor: 'var(--cui-warning)',
    title: 'National & State Economy',
    timestamp: 'Updated Apr 2, 2026',
    text: 'As of April 2, 2026, the U.S. economy exhibits late-cycle characteristics with modest population growth of 0.9% and employment expansion slowing to 0.1%. California shows economic divergence with employment declining 0.1% despite population growth of 0.6%, though median household income surged 11.9% to $100.6k.',
  },
  {
    id: 't2',
    badge: 'T2',
    badgeColor: 'var(--cui-primary)',
    title: 'Metropolitan Statistical Area (MSA)',
    timestamp: 'Updated Apr 2, 2026',
    text: 'The Los Angeles-Long Beach-Anaheim MSA (12.93M population) shows mixed signals with marginal employment decline of 0.1% offset by Los Angeles County employment growth of 1.1%. The multifamily market remains tight with 4.8% vacancy and positive absorption of 4,200 units.',
  },
  {
    id: 't3',
    badge: 'T3',
    badgeColor: 'var(--cui-success)',
    title: 'City & Neighborhood',
    timestamp: 'Updated Apr 2, 2026',
    text: 'Hawthorne (158.4k population, +1.8% growth) benefits from proximity to aerospace and technology employers in the South Bay submarket. Median household income of $72.4k trails the county median of $76.4k but shows positive momentum at +2.8% growth.',
  },
];

export function DetailNarrative({ onClose }: Props) {
  const [openTiers, setOpenTiers] = useState<Record<string, boolean>>({ t1: true, t2: false, t3: false });

  const toggleTier = (id: string) => {
    setOpenTiers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      {/* Header */}
      <div className="dp-hdr">
        <div className="dp-hdr-top">
          <div className="dp-hdr-title">Location & Market Narrative</div>
          <button className="dp-hdr-close" onClick={onClose}>✕</button>
        </div>
        <div className="dp-hdr-meta">AI-generated analysis · Hawthorne, CA</div>
        <div className="nar-generate-row">
          <button className="appraisal-outline-btn md">⟳ Generate All</button>
        </div>
      </div>

      {/* Body — narrative tiers */}
      <div className="dp-body">
        {TIERS.map((tier) => (
          <div key={tier.id} className="nar-tier">
            {/* Tier header */}
            <div className="nar-tier-header" onClick={() => toggleTier(tier.id)}>
              <span
                className="nar-tier-badge"
                style={{
                  background: `color-mix(in srgb, ${tier.badgeColor} 15%, transparent)`,
                  color: tier.badgeColor,
                }}
              >
                {tier.badge}
              </span>
              <span className="nar-tier-title">{tier.title}</span>
              <span className="nar-tier-timestamp">{tier.timestamp}</span>
              <span className={`nar-tier-chevron ${openTiers[tier.id] ? 'open' : 'closed'}`}>▾</span>
            </div>

            {/* Tier body */}
            {openTiers[tier.id] && (
              <div className="nar-tier-body">
                <div className="nar-tier-text">{tier.text}</div>
                <button className="appraisal-outline-btn">⟳ Update</button>
              </div>
            )}
          </div>
        ))}

        {/* Chat hint */}
        <div className="dp-chat-hint">
          <strong>Try:</strong> &ldquo;Regenerate the MSA section&rdquo; · &ldquo;Add a paragraph about rent control&rdquo;
        </div>
      </div>

      {/* Footer */}
      <div className="dp-footer">
        <button className="dp-btn primary" onClick={onClose}>Done</button>
      </div>
    </>
  );
}
