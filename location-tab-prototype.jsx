import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Users, DollarSign, Briefcase, AlertTriangle, MapPin, Building2, Globe, BarChart3, Activity, Info, Send, Bot, Minimize2, Maximize2, ExternalLink, RefreshCw, X, Clock, CheckCircle, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";

// ─── Theme ───────────────────────────────────────────────────────────────────
const colors = {
  bg: "#1a1d23",
  surface: "#22262e",
  surfaceAlt: "#282c35",
  border: "#333842",
  borderLight: "#3a3f4a",
  text: "#e4e7eb",
  textMuted: "#8b919a",
  textDim: "#6b7280",
  accent: "#4f8ef7",
  accentDim: "#3a6fd8",
  green: "#34d399",
  greenDim: "rgba(52,211,153,0.12)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.12)",
  amber: "#fbbf24",
  amberDim: "rgba(251,191,36,0.12)",
  purple: "#a78bfa",
  landscaper: "#1e2128",
  landscaperBorder: "#2a2e37",
};

// ─── Mock Data ───────────────────────────────────────────────────────────────
const indicatorData = [
  {
    label: "Population",
    icon: Users,
    rows: [
      { geo: "United States", value: "334.9M", yoy: "+0.5%", trend: "up" },
      { geo: "California", value: "39.1M", yoy: "+0.2%", trend: "up" },
      { geo: "LA-Long Beach MSA", value: "13.2M", yoy: "+0.1%", trend: "up" },
      { geo: "LA County", value: "9.86M", yoy: "-0.1%", trend: "down" },
      { geo: "Hawthorne", value: "87,423", yoy: "+0.8%", trend: "up" },
    ],
  },
  {
    label: "Median HH Income",
    icon: DollarSign,
    rows: [
      { geo: "United States", value: "$77,719", yoy: "+3.1%", trend: "up" },
      { geo: "California", value: "$91,905", yoy: "+2.8%", trend: "up" },
      { geo: "LA-Long Beach MSA", value: "$84,673", yoy: "+2.4%", trend: "up" },
      { geo: "LA County", value: "$80,912", yoy: "+2.1%", trend: "up" },
      { geo: "Hawthorne", value: "$72,415", yoy: "+3.6%", trend: "up" },
    ],
  },
  {
    label: "Employment",
    icon: Briefcase,
    rows: [
      { geo: "United States", value: "161.5M", yoy: "+1.8%", trend: "up" },
      { geo: "California", value: "18.9M", yoy: "+1.4%", trend: "up" },
      { geo: "LA-Long Beach MSA", value: "6.31M", yoy: "+1.1%", trend: "up" },
      { geo: "LA County", value: "4.72M", yoy: "+0.9%", trend: "up" },
      { geo: "Hawthorne", value: "42,316", yoy: "+1.5%", trend: "up" },
    ],
  },
  {
    label: "Unemployment Rate",
    icon: Activity,
    rows: [
      { geo: "United States", value: "4.0%", yoy: "-0.2pp", trend: "down" },
      { geo: "California", value: "5.3%", yoy: "-0.4pp", trend: "down" },
      { geo: "LA-Long Beach MSA", value: "5.1%", yoy: "-0.3pp", trend: "down" },
      { geo: "LA County", value: "5.4%", yoy: "-0.2pp", trend: "down" },
      { geo: "Hawthorne", value: "5.8%", yoy: "-0.5pp", trend: "down", badge: "TRACT" },
    ],
  },
];

const accordionSections = [
  {
    id: "macro",
    title: "Macro Economy",
    subtitle: "United States & California",
    icon: Globe,
    color: colors.accent,
    lastUpdated: "Feb 15, 2026",
    content: {
      summary: "The U.S. economy continues to expand at a moderate pace with GDP growth estimated at 2.3% for 2025. Inflation has moderated to 2.8% but remains above the Fed's 2% target, keeping interest rates elevated.",
      bullets: [
        { label: "GDP Growth", value: "2.3%", status: "neutral" },
        { label: "CPI", value: "2.8%", status: "caution" },
        { label: "Fed Funds", value: "4.50–4.75%", status: "caution" },
        { label: "10-Yr Treasury", value: "4.35%", status: "neutral" },
        { label: "30-Yr Mortgage", value: "6.72%", status: "caution" },
      ],
      narrative: "California's economy is recovering from post-pandemic tech layoffs. State unemployment at 5.3% runs above the national average, driven by cost-of-living pressures and outmigration. Housing affordability remains the structural challenge.",
      conclusion: "National environment is a mild headwind for multifamily: elevated rates compress returns, but moderating inflation and steady employment support occupancy fundamentals.",
    }
  },
  {
    id: "msa",
    title: "Metropolitan Area",
    subtitle: "Los Angeles-Long Beach-Anaheim MSA",
    icon: Building2,
    color: colors.purple,
    showMap: true,
    mapLabel: "LA-Long Beach MSA",
    lastUpdated: "Feb 15, 2026",
    content: {
      summary: "The LA metro is the nation's 2nd largest MSA with 13.2M residents and a $1.1T GDP. The 2028 Olympics are driving significant infrastructure investment and development activity.",
      bullets: [
        { label: "MSA Population", value: "13.2M", status: "neutral" },
        { label: "MSA GDP", value: "$1.1T", status: "good" },
        { label: "Unemployment", value: "5.1%", status: "caution" },
        { label: "Job Growth", value: "+1.1%", status: "good" },
        { label: "MF Vacancy", value: "5.8%", status: "neutral" },
        { label: "Avg MF Rent", value: "$2,145", status: "neutral" },
      ],
      narrative: "LA's multifamily market is stabilizing. Rent growth has moderated to 2.4% YoY, with South Bay submarkets outperforming. New construction deliveries peaked in 2024 and are declining, which should tighten vacancy through 2026–27.",
      conclusion: "MSA conditions are neutral to slightly positive for multifamily. Declining new supply combined with steady employment growth should support occupancy and moderate rent increases through the projection period.",
    }
  },
  {
    id: "local",
    title: "City & Neighborhood",
    subtitle: "Hawthorne, CA 90250",
    icon: MapPin,
    color: colors.green,
    showMap: true,
    mapLabel: "Hawthorne, CA 90250",
    lastUpdated: "Feb 15, 2026",
    content: {
      summary: "Hawthorne is a 6-sq-mi city in LA's South Bay, between LAX and the I-405/I-105 interchange. Significant economic transformation driven by SpaceX's headquarters.",
      bullets: [
        { label: "Population", value: "87,423", status: "good" },
        { label: "Med. HH Inc.", value: "$72,415", status: "neutral" },
        { label: "Poverty Rate", value: "15.5%", status: "caution" },
        { label: "Top Employer", value: "SpaceX", status: "good" },
        { label: "MF Rent (2BR)", value: "$2,050", status: "neutral" },
        { label: "Walk Score", value: "72", status: "good" },
      ],
      industries: [
        { name: "Aerospace & Space Tech", pct: 28, note: "SpaceX + 25 aviation firms" },
        { name: "Logistics & Warehousing", pct: 22, note: "LAX + port proximity" },
        { name: "Healthcare & Social", pct: 18, note: "Largest resident sector" },
        { name: "Retail & Services", pct: 15, note: "Working-class consumer base" },
        { name: "Other", pct: 17, note: "Gov, education, tech" },
      ],
      risks: [
        "SpaceX HQ relocation risk — anchor employer dependence",
        "Housing affordability vs. LA metro cost structure",
        "Industrial land constraints — built-out footprint",
      ],
      outlook: "Transitioning from legacy aerospace into 'New Space + advanced mobility' node. Archer Aviation's 2025 airport lease reinforces trajectory. MF demand supported by aerospace workforce growth and constrained housing supply.",
      conclusion: "Local conditions are supportive for multifamily. Aerospace-driven employment, constrained housing supply, and improving neighborhood trajectory support occupancy and moderate rent growth. Primary risk remains anchor employer concentration.",
    }
  },
];

// ─── Detail Flyout Content (Tier 1 — National) ──────────────────────────────
const tier1DetailBlocks = [
  {
    title: "GDP & Economic Growth",
    metrics: [
      { label: "GDP Growth (Annualized)", value: "2.3%", prior: "2.1%", direction: "up" },
      { label: "Expansion Phase", value: "Month 22", prior: null, direction: "neutral" },
    ],
    narrative: "The U.S. economy expanded at an annualized rate of 2.3% in Q4 2025, modestly above the prior quarter's 2.1% pace. Consumer spending remains the primary growth engine, supported by a resilient labor market. Business fixed investment showed signs of acceleration, particularly in technology and semiconductor manufacturing. Near-term outlook: consensus expects 1.8–2.2% growth through 2026, with downside risks from trade policy uncertainty and geopolitical tensions.",
  },
  {
    title: "Employment & Labor Markets",
    metrics: [
      { label: "Unemployment Rate", value: "4.0%", prior: "4.2%", direction: "down" },
      { label: "Monthly Payroll Change", value: "+187K", prior: "+152K", direction: "up" },
      { label: "Labor Force Participation", value: "62.6%", prior: "62.5%", direction: "up" },
    ],
    narrative: "The labor market remains historically tight. Nonfarm payrolls added an average of 187K jobs monthly over the trailing quarter, concentrated in healthcare (+52K), government (+38K), and leisure/hospitality (+29K). Technology sector layoffs have moderated. The quits rate at 2.3% suggests workers retain moderate bargaining power. For real estate: employment stability supports housing demand and consumer-facing retail, but wage growth at 4.1% YoY continues to pressure operating costs for property owners.",
  },
  {
    title: "Inflation & Monetary Policy",
    metrics: [
      { label: "CPI (Headline)", value: "2.8%", prior: "3.1%", direction: "down" },
      { label: "CPI (Core)", value: "3.2%", prior: "3.4%", direction: "down" },
      { label: "Fed Funds Rate", value: "4.50–4.75%", prior: "4.75–5.00%", direction: "down" },
      { label: "10-Year Treasury", value: "4.35%", prior: "4.52%", direction: "down" },
    ],
    narrative: "Inflation continues its decelerating trend but remains above the Fed's 2% target. The FOMC reduced the target rate by 25bp in January 2026, bringing cumulative cuts to 75bp from the cycle peak. Market pricing implies one additional 25bp cut by mid-2026. For real estate: the declining rate trajectory provides marginal relief on financing costs, but the \"higher for longer\" regime means cap rate expansion pressure persists. Refinancing risk remains elevated for assets acquired at 2021–22 valuations.",
  },
  {
    title: "Capital Markets & Financing",
    metrics: [
      { label: "30-Yr Mortgage", value: "6.72%", prior: "6.89%", direction: "down" },
      { label: "SOFR", value: "4.33%", prior: "4.58%", direction: "down" },
      { label: "CMBS IG Spread", value: "+185bp", prior: "+198bp", direction: "down" },
    ],
    narrative: "Debt capital availability is improving gradually. Agency lenders (Fannie, Freddie) remain active in multifamily, with spreads narrowing 15–20bp since Q3 2025. CMBS issuance recovered to $82B in 2025, though still below 2021 peaks. Bank lending remains constrained by CRE concentration limits. For multifamily specifically: agency debt at 5.8–6.2% is available for stabilized assets with strong sponsorship. Construction lending remains selective, favoring markets with demonstrated absorption.",
  },
  {
    title: "Housing Market Fundamentals",
    metrics: [
      { label: "Housing Starts (Ann.)", value: "1.42M", prior: "1.38M", direction: "up" },
      { label: "Existing Home Sales (Ann.)", value: "4.15M", prior: "3.92M", direction: "up" },
      { label: "Months of Supply", value: "3.8", prior: "4.1", direction: "down" },
      { label: "Median Home Price", value: "$412,300", prior: "$398,500", direction: "up" },
    ],
    narrative: "The for-sale housing market shows early signs of thawing as mortgage rates ease below 7%. The persistent supply shortage (3.8 months vs. 6-month equilibrium) continues to support pricing. New construction is responding but remains below demographic replacement levels. For multifamily: the affordability gap between homeownership and renting continues to widen, supporting renter demand by necessity. Homeownership rates for under-35 households have declined to 37.4%.",
  },
  {
    title: "Demographic Trends",
    metrics: [
      { label: "Population Growth", value: "+0.5%", prior: "+0.5%", direction: "neutral" },
      { label: "Sun Belt Net Migration", value: "+1.2M/yr", prior: "+1.1M/yr", direction: "up" },
      { label: "HH Formation (25–34)", value: "+580K/yr", prior: "+540K/yr", direction: "up" },
    ],
    narrative: "Population growth continues to be driven by international immigration (+1.1M net) rather than natural increase. Domestic migration patterns favor Sun Belt metros, with Phoenix, Dallas, and Tampa leading net gains. Millennial (born 1981–96) household formation has peaked; Gen Z (born 1997–2012) is now the primary driver of new renter demand, with a preference for urban-adjacent locations with transit access and lifestyle amenities.",
  },
];

const tier1Conclusion = "The national macroeconomic environment presents a mixed but marginally improving backdrop for multifamily real estate. Employment stability and demographic-driven renter demand provide a solid foundation, while the moderating rate cycle offers gradual relief on financing costs. However, the \"higher for longer\" interest rate regime continues to compress returns relative to the 2019–21 cycle, requiring disciplined underwriting. On balance, the national environment is a mild headwind for new investment but supportive for existing stabilized assets.";

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const c = status === "good" ? colors.green : status === "caution" ? colors.amber : colors.textMuted;
  return <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: c, marginRight: 5, flexShrink: 0 }} />;
}

function TrendBadge({ yoy, trend }) {
  const isDown = trend === "down";
  const Icon = isDown ? TrendingDown : TrendingUp;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      fontSize: 10, fontWeight: 500, padding: "1px 5px", borderRadius: 3,
      background: isDown ? colors.redDim : colors.greenDim,
      color: isDown ? colors.red : colors.green, whiteSpace: "nowrap",
    }}>
      <Icon size={9} />
      {yoy}
    </span>
  );
}

function FallbackBadge({ text }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      fontSize: 9, fontWeight: 500, padding: "1px 4px", borderRadius: 3,
      background: colors.amberDim, color: colors.amber, whiteSpace: "nowrap",
    }}>
      <AlertTriangle size={8} />
      {text}
    </span>
  );
}

function IndicatorCard({ data }) {
  const Icon = data.icon;
  return (
    <div style={{
      background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: 6, padding: 10, marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 4,
          background: "rgba(79,142,247,0.1)", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={11} color={colors.accent} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{data.label}</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} style={{
              borderBottom: i < data.rows.length - 1 ? `1px solid ${colors.border}` : "none",
            }}>
              <td style={{
                padding: "3px 0", color: i === data.rows.length - 1 ? colors.text : colors.textMuted,
                fontWeight: i === data.rows.length - 1 ? 500 : 400, fontSize: 10,
              }}>
                {row.geo}
              </td>
              <td style={{ padding: "3px 0", textAlign: "right", color: colors.text, fontWeight: 500, fontVariantNumeric: "tabular-nums", fontSize: 10 }}>
                {row.value}
              </td>
              <td style={{ padding: "3px 0", textAlign: "right", whiteSpace: "nowrap" }}>
                <TrendBadge yoy={row.yoy} trend={row.trend} />
                {row.badge && <>{" "}<FallbackBadge text={row.badge} /></>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndustryBar({ name, pct, note }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
        <span style={{ color: colors.text }}>{name}</span>
        <span style={{ color: colors.textMuted }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: colors.surfaceAlt, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: colors.accent, borderRadius: 3 }} />
      </div>
      {note && <div style={{ fontSize: 9, color: colors.textDim, marginTop: 1 }}>{note}</div>}
    </div>
  );
}

function MockMap({ label, height = 160 }) {
  return (
    <div style={{
      height, background: colors.surfaceAlt, border: `1px solid ${colors.border}`,
      borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.06 }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 16} x2="100%" y2={i * 16} stroke={colors.text} strokeWidth="1" />
        ))}
        {Array.from({ length: 25 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 24} y1="0" x2={i * 24} y2="100%" stroke={colors.text} strokeWidth="1" />
        ))}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, zIndex: 1 }}>
        <MapPin size={18} color={colors.accent} />
        <span style={{ fontSize: 10, color: colors.textMuted, background: "rgba(26,29,35,0.8)", padding: "2px 6px", borderRadius: 3 }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Accordion (Summary View) ────────────────────────────────────────────────

function AccordionSection({ section, isOpen, onToggle, onDetail }) {
  const Icon = section.icon;
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  const c = section.content;

  return (
    <div style={{
      background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: 6, marginBottom: 8, overflow: "hidden",
    }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "8px 10px", display: "flex", alignItems: "center", gap: 8,
        background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <Chevron size={12} color={colors.textMuted} />
        <div style={{
          width: 24, height: 24, borderRadius: 5, flexShrink: 0,
          background: `${section.color}18`, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={12} color={section.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{section.title}</div>
          <div style={{ fontSize: 10, color: colors.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{section.subtitle}</div>
        </div>
        <span style={{ fontSize: 9, color: colors.textDim, whiteSpace: "nowrap" }}>{section.lastUpdated}</span>
      </button>

      {isOpen && (
        <div style={{ padding: "0 10px 10px 10px" }}>
          <p style={{ fontSize: 11, lineHeight: 1.55, color: colors.textMuted, margin: "0 0 8px 0" }}>
            {c.summary}
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 4, marginBottom: 8,
          }}>
            {c.bullets.map((b, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "4px 6px", background: colors.surfaceAlt,
                borderRadius: 4, fontSize: 10,
              }}>
                <StatusDot status={b.status} />
                <span style={{ color: colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</span>
                <span style={{ marginLeft: "auto", color: colors.text, fontWeight: 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{b.value}</span>
              </div>
            ))}
          </div>
          {c.narrative && (
            <p style={{ fontSize: 11, lineHeight: 1.55, color: colors.textMuted, margin: "0 0 8px 0" }}>
              {c.narrative}
            </p>
          )}
          {/* Conclusion callout */}
          {c.conclusion && (
            <div style={{
              padding: 8, background: "rgba(79,142,247,0.06)", borderRadius: 5,
              borderLeft: `3px solid ${section.color}`, marginBottom: 8,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: section.color, marginBottom: 3 }}>Conclusion</div>
              <div style={{ fontSize: 11, lineHeight: 1.55, color: colors.textMuted }}>{c.conclusion}</div>
            </div>
          )}
          {c.industries && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: colors.text, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Employment by Industry
              </div>
              {c.industries.map((ind, i) => <IndustryBar key={i} {...ind} />)}
            </div>
          )}
          {c.risks && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: colors.amber, marginBottom: 4, display: "flex", alignItems: "center", gap: 3 }}>
                <AlertTriangle size={10} /> Key Risks
              </div>
              {c.risks.map((r, i) => (
                <div key={i} style={{ fontSize: 10, color: colors.textMuted, padding: "2px 0 2px 10px", borderLeft: `2px solid ${colors.border}`, marginBottom: 2 }}>
                  {r}
                </div>
              ))}
            </div>
          )}
          {section.showMap && <MockMap label={section.mapLabel} height={120} />}
          {/* View Detail button */}
          <button onClick={(e) => { e.stopPropagation(); onDetail(); }} style={{
            display: "flex", alignItems: "center", gap: 5, marginTop: 8,
            padding: "6px 12px", borderRadius: 5, fontSize: 10, fontWeight: 600,
            background: "rgba(79,142,247,0.1)", color: colors.accent,
            border: `1px solid rgba(79,142,247,0.2)`, cursor: "pointer",
            width: "100%", justifyContent: "center",
          }}>
            <FileText size={11} />
            View Full Analysis
            <ExternalLink size={9} style={{ marginLeft: 2 }} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Detail Flyout ───────────────────────────────────────────────────────────

function DetailFlyout({ section, onClose }) {
  const Icon = section.icon;
  const blocks = tier1DetailBlocks; // For prototype, always show Tier 1 content
  const conclusion = tier1Conclusion;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setRefreshed(true); }, 2000);
  };

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      background: colors.bg, zIndex: 50, display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Flyout header */}
      <div style={{
        padding: "10px 16px", background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4, color: colors.textMuted, fontSize: 11,
          padding: "4px 8px", borderRadius: 4,
        }}>
          <ChevronLeft size={14} />
          Back
        </button>
        <div style={{ width: 1, height: 20, background: colors.border }} />
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: `${section.color}18`, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={14} color={section.color} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{section.title}</div>
          <div style={{ fontSize: 10, color: colors.textMuted }}>{section.subtitle}</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Refresh controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {refreshed && (
            <span style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 3,
              background: colors.greenDim, color: colors.green,
              display: "flex", alignItems: "center", gap: 3,
            }}>
              <CheckCircle size={9} /> 3 metrics updated
            </span>
          )}
          <span style={{ fontSize: 9, color: colors.textDim, display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={9} /> {section.lastUpdated}
          </span>
          <button onClick={handleRefresh} disabled={refreshing} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600,
            background: refreshing ? colors.surfaceAlt : "rgba(79,142,247,0.1)",
            color: refreshing ? colors.textDim : colors.accent,
            border: `1px solid ${refreshing ? colors.border : "rgba(79,142,247,0.2)"}`,
            cursor: refreshing ? "not-allowed" : "pointer",
          }}>
            <RefreshCw size={10} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            {refreshing ? "Refreshing..." : "Refresh Analysis"}
          </button>
        </div>
      </div>

      {/* Flyout body — scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {blocks.map((block, bi) => (
            <div key={bi} style={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: 8, padding: 16, marginBottom: 12,
            }}>
              {/* Block header */}
              <div style={{
                fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 12,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 5, fontSize: 10, fontWeight: 700,
                  background: `${section.color}18`, color: section.color,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {bi + 1}
                </span>
                {block.title}
              </div>

              {/* Stat callouts */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 8, marginBottom: 12,
              }}>
                {block.metrics.map((m, mi) => (
                  <div key={mi} style={{
                    padding: "10px 12px", background: colors.surfaceAlt,
                    borderRadius: 6, border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontVariantNumeric: "tabular-nums" }}>
                        {m.value}
                      </span>
                      {m.prior && (
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 10, color: colors.textDim, textDecoration: "line-through" }}>{m.prior}</span>
                          {m.direction === "up" ? (
                            <ArrowUpRight size={11} color={colors.green} />
                          ) : m.direction === "down" ? (
                            <ArrowDownRight size={11} color={colors.red} />
                          ) : null}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Narrative */}
              <p style={{ fontSize: 12, lineHeight: 1.7, color: colors.textMuted, margin: 0 }}>
                {block.narrative}
              </p>
            </div>
          ))}

          {/* Conclusion block — full width, visually distinct */}
          <div style={{
            background: `${section.color}08`, border: `1px solid ${section.color}30`,
            borderLeft: `4px solid ${section.color}`,
            borderRadius: 8, padding: 20, marginBottom: 12,
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: section.color, marginBottom: 8,
              textTransform: "uppercase", letterSpacing: "0.04em",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 5, fontSize: 10, fontWeight: 700,
                background: `${section.color}25`, color: section.color,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                7
              </span>
              Macro Conclusion
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.75, color: colors.text, margin: 0, fontWeight: 400 }}>
              {conclusion}
            </p>
          </div>
        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Landscaper Panel ────────────────────────────────────────────────────────

function LandscaperPanel({ collapsed, onToggle, detailTier, activeTab }) {
  const width = collapsed ? 52 : 280;

  if (collapsed) {
    return (
      <div style={{
        width, minWidth: width, height: "100%",
        background: colors.landscaper, borderRight: `1px solid ${colors.landscaperBorder}`,
        display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10,
      }}>
        <button onClick={onToggle} style={{
          width: 36, height: 36, borderRadius: 8, border: `1px solid ${colors.border}`,
          background: colors.surface, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Maximize2 size={14} color={colors.accent} />
        </button>
        <div style={{
          writingMode: "vertical-rl", textOrientation: "mixed",
          fontSize: 11, color: colors.textDim, marginTop: 16, letterSpacing: "0.05em",
        }}>
          LANDSCAPER
        </div>
      </div>
    );
  }

  // Context-aware messages based on active view
  const locationMessages = [
    { role: "assistant", text: "I've cached the economic profile for Hawthorne, CA based on the project location. The Location tab is now populated with macro, MSA, and neighborhood analysis." },
    { role: "user", text: "What's the biggest risk for multifamily in this submarket?" },
    { role: "assistant", text: "The primary risk is anchor employer concentration. SpaceX employs ~6,000 locally — if they relocate HQ (which has been discussed), it would impact both employment and the local service economy. Secondary risk: median HH income of $72K puts rent-to-income ratios above 30% at current market rents." },
  ];

  const detailMessages = [
    { role: "assistant", text: "You're viewing the full National Economic Overview. I can adjust the tone, update specific sections, or discuss implications for your underwriting." },
    { role: "user", text: "The inflation narrative feels too optimistic. Make it more conservative." },
    { role: "assistant", text: "Updated. I've revised Block 3 (Inflation & Monetary Policy) to emphasize sticky core inflation at 3.2%, the risk of a Fed pause, and the possibility that rates stay elevated through 2026. The conclusion now reflects this as a moderate headwind rather than neutral." },
    { role: "user", text: "How does the employment data affect our cap rate assumption?" },
    { role: "assistant", text: "Strong employment (4.0% unemployment, +187K monthly payrolls) supports occupancy fundamentals, which argues against cap rate expansion beyond 25–50bp from current levels. However, wage growth at 4.1% pressures operating margins. Net effect: employment data supports a cap rate in the 5.25–5.75% range for stabilized South Bay multifamily, which is consistent with your current 5.50% assumption." },
  ];

  const marketMessages = [
    { role: "assistant", text: "I've researched the South Bay multifamily rental market for you. Found 7 competitive properties within a 2-mile radius. Vacancy is trending down and absorption is outpacing deliveries — favorable for the subject." },
    { role: "user", text: "That Inglewood Station comp at 88.5% occupancy — is that a concern?" },
    { role: "assistant", text: "Not really. Inglewood Station is a 2024 delivery still in lease-up (340 units, 10 months since TCO). An 88.5% occupancy rate at month 10 implies ~115 units leased per month — which is a healthy pace for Class A at that price point ($2,475 avg). They should stabilize around 94–95% by month 14–16. If anything, their absorption pace validates market depth." },
    { role: "user", text: "Should we be worried about the pipeline? 2,100 units is still a lot." },
    { role: "assistant", text: "Context matters: 2,100 under construction is down 39% from 3,450 a year ago. At the trailing absorption rate of 1,580 units/year, that pipeline represents ~16 months of demand. And deliveries will be spread over 18–24 months. No projects over 200 units have broken ground within 2 miles in 6 months. I'd characterize pipeline risk as LOW for your hold period." },
  ];

  const messages = detailTier ? detailMessages : activeTab === "market" ? marketMessages : locationMessages;
  const contextLabel = detailTier
    ? `Viewing: ${detailTier.title} — Full Analysis`
    : activeTab === "market"
    ? "Context: Property → Market"
    : "Context: Property → Location";

  return (
    <div style={{
      width, minWidth: width, height: "100%",
      background: colors.landscaper, borderRight: `1px solid ${colors.landscaperBorder}`,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "8px 10px", borderBottom: `1px solid ${colors.landscaperBorder}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Bot size={16} color={colors.accent} />
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.text, flex: 1 }}>Landscaper</span>
        <button onClick={onToggle} style={{
          background: "transparent", border: "none", cursor: "pointer", padding: 2,
        }}>
          <Minimize2 size={12} color={colors.textDim} />
        </button>
      </div>

      <div style={{
        padding: "6px 10px", background: detailTier ? "rgba(167,139,250,0.06)" : "rgba(79,142,247,0.06)",
        borderBottom: `1px solid ${colors.landscaperBorder}`,
        fontSize: 10, color: detailTier ? colors.purple : colors.accent,
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {detailTier ? <FileText size={10} /> : <MapPin size={10} />}
        {contextLabel}
      </div>

      {/* Quick actions — context-aware */}
      {(detailTier || activeTab === "market") && (
        <div style={{
          padding: "6px 8px", borderBottom: `1px solid ${colors.landscaperBorder}`,
          display: "flex", flexWrap: "wrap", gap: 4,
        }}>
          {(detailTier
            ? ["More conservative", "More aggressive", "Add data sources", "Simplify language"]
            : ["Add comp", "Expand radius", "Refresh data", "Adjust positioning"]
          ).map((action) => (
            <button key={action} style={{
              padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 500,
              background: colors.surfaceAlt, color: colors.textMuted,
              border: `1px solid ${colors.border}`, cursor: "pointer",
            }}>
              {action}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            padding: "8px 10px", borderRadius: 8, fontSize: 11, lineHeight: 1.5,
            background: msg.role === "user" ? "rgba(79,142,247,0.1)" : colors.surfaceAlt,
            color: colors.textMuted, alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "95%",
            border: msg.role === "user" ? `1px solid rgba(79,142,247,0.2)` : `1px solid ${colors.border}`,
          }}>
            {msg.text}
          </div>
        ))}
      </div>

      <div style={{
        padding: 8, borderTop: `1px solid ${colors.landscaperBorder}`,
        display: "flex", gap: 6,
      }}>
        <input
          placeholder={detailTier ? "Discuss or adjust this analysis..." : activeTab === "market" ? "Ask about comps, pipeline, demand..." : "Ask about this location..."}
          style={{
            flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11,
            background: colors.surfaceAlt, border: `1px solid ${colors.border}`,
            color: colors.text, outline: "none",
          }}
        />
        <button style={{
          width: 28, height: 28, borderRadius: 6, border: "none",
          background: colors.accent, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Send size={11} color="#fff" />
        </button>
      </div>
    </div>
  );
}

// ─── Tab Bars ────────────────────────────────────────────────────────────────

function FolderTabBar({ active, onSelect }) {
  const folders = [
    { id: "home", label: "Project", color: "#6366f1" },
    { id: "property", label: "Property", color: "#4f8ef7" },
    { id: "operations", label: "Operations", color: "#f59e0b" },
    { id: "valuation", label: "Valuation", color: "#10b981" },
    { id: "capital", label: "Capitalization", color: "#8b5cf6" },
    { id: "reports", label: "Reports", color: "#ec4899" },
    { id: "documents", label: "Documents", color: "#64748b" },
    { id: "map", label: "Map", color: "#06b6d4" },
  ];
  return (
    <div style={{
      display: "flex", gap: 0, background: colors.surface,
      borderBottom: `1px solid ${colors.border}`, paddingLeft: 2,
    }}>
      {folders.map(f => (
        <button key={f.id} onClick={() => onSelect(f.id)} style={{
          padding: "7px 14px", fontSize: 11, fontWeight: active === f.id ? 600 : 400,
          color: active === f.id ? colors.text : colors.textMuted,
          background: active === f.id ? colors.bg : "transparent",
          border: "none", cursor: "pointer", position: "relative",
          borderTop: active === f.id ? `2px solid ${f.color}` : "2px solid transparent",
          borderRight: `1px solid ${colors.border}`,
        }}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

function SubTabBar({ tabs, active, onSelect }) {
  return (
    <div style={{
      display: "flex", gap: 0, borderBottom: `1px solid ${colors.border}`,
      paddingLeft: 4, background: colors.surface,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: "6px 12px", fontSize: 11, fontWeight: active === t.id ? 600 : 400,
          color: active === t.id ? colors.accent : colors.textMuted,
          background: "transparent", border: "none", cursor: "pointer",
          borderBottom: active === t.id ? `2px solid ${colors.accent}` : "2px solid transparent",
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Market Tab Data ─────────────────────────────────────────────────────────

const marketKPIs = [
  { label: "Submarket Vacancy", value: "5.8%", prior: "6.2%", direction: "down", status: "good", note: "Below 5-yr avg of 6.1%" },
  { label: "Avg Asking Rent", value: "$2,145/mo", prior: "$2,095/mo", direction: "up", status: "good", note: "+2.4% YoY" },
  { label: "Avg Rent PSF", value: "$2.68", prior: "$2.62", direction: "up", status: "neutral", note: "" },
  { label: "12-Mo Rent Growth", value: "+2.4%", prior: "+1.8%", direction: "up", status: "good", note: "Accelerating" },
  { label: "Units Delivered (12mo)", value: "1,240", prior: "1,890", direction: "down", status: "good", note: "Supply tapering" },
  { label: "Under Construction", value: "2,100", prior: "3,450", direction: "down", status: "good", note: "Pipeline shrinking" },
  { label: "Net Absorption (12mo)", value: "1,580 units", prior: "1,320 units", direction: "up", status: "good", note: "Demand > supply" },
];

const competitiveSet = [
  { name: "Avalon Hawthorne", address: "12400 Hawthorne Blvd", year: 2019, units: 216, mix: "S/1/2/3", avgRent: "$2,285", occ: "94.8%", dist: "0.3 mi" },
  { name: "The Wren", address: "4880 W 118th Pl", year: 2021, units: 148, mix: "S/1/2", avgRent: "$2,410", occ: "96.1%", dist: "0.5 mi" },
  { name: "South Bay Palms", address: "13200 Crenshaw Blvd", year: 2005, units: 312, mix: "1/2/3", avgRent: "$1,945", occ: "97.2%", dist: "0.8 mi" },
  { name: "Lido at South Bay", address: "14025 Cerise Ave", year: 2023, units: 185, mix: "S/1/2", avgRent: "$2,520", occ: "91.3%", dist: "1.1 mi" },
  { name: "Prairie Pointe", address: "3950 W Rosecrans", year: 2017, units: 264, mix: "1/2/3", avgRent: "$2,110", occ: "95.5%", dist: "1.3 mi" },
  { name: "Park Landing", address: "11900 Aviation Blvd", year: 2020, units: 198, mix: "S/1/2", avgRent: "$2,350", occ: "93.8%", dist: "1.6 mi" },
  { name: "Inglewood Station", address: "222 E Regent St", year: 2024, units: 340, mix: "S/1/2/3", avgRent: "$2,475", occ: "88.5%", dist: "2.0 mi" },
];

const marketNarratives = [
  {
    num: 1,
    title: "Demand Drivers",
    text: "Multifamily demand in the South Bay submarket is driven by three converging forces: (1) sustained aerospace employment growth anchored by SpaceX and related firms, generating high-wage renter demand; (2) homeownership affordability barriers, with median home prices at $820K pushing households into the rental pool — ownership costs run 2.4x equivalent rental costs; and (3) in-migration from higher-cost Westside neighborhoods seeking relative affordability while maintaining proximity to LAX corridor employment. Renter household formation in the 25–34 cohort is running at +3.2% annually in the submarket, above the MSA average of +2.1%.",
  },
  {
    num: 2,
    title: "Vacancy & Absorption Trends",
    text: "Submarket vacancy at 5.8% is below the 5-year average of 6.1% and trending downward. Net absorption of 1,580 units over the trailing 12 months exceeded new deliveries of 1,240 units, producing positive demand pressure. Class A product (built after 2018) is stabilizing at 93–95% occupancy within 12–14 months of delivery. Class B/C product maintains higher occupancy (96–98%) but at lower rent points. The lease-up at Inglewood Station (340 units, 2024 delivery) at 88.5% occupancy after 10 months suggests the market can absorb new product, albeit at a measured pace.",
  },
  {
    num: 3,
    title: "Rent Trends",
    text: "Asking rents are growing at +2.4% YoY across the submarket, accelerating from +1.8% in the prior period. Effective rents trail asking rents by approximately 3–5% due to concession activity concentrated in newer Class A product (typically 4–6 weeks free on 12-month leases). The Class A/B rent spread has narrowed to ~$350/month from ~$420 twelve months ago, suggesting tenants are increasingly willing to pay premium for newer product. Subject positioning at $2,050–$2,200/month for 2BR units places it in the Class B+ segment, slightly below the competitive set average.",
  },
  {
    num: 4,
    title: "Supply Pipeline Risk",
    text: "The construction pipeline is contracting meaningfully: 2,100 units under construction vs. 3,450 twelve months ago, a 39% decline reflecting elevated construction costs and tighter lending standards. Projected deliveries for 2026–27 total approximately 1,800 units across the South Bay, below the trailing 3-year average of 2,200 annual deliveries. No projects exceeding 200 units have broken ground within a 2-mile radius of the subject in the past 6 months. Risk assessment: LOW — the supply pipeline does not threaten the subject's occupancy or rent trajectory over the projection period.",
  },
  {
    num: 5,
    title: "Submarket Positioning",
    text: "The subject property (Hawthorne Apartments, 156 units, 2018 vintage) competes in the Class B+/A- segment of the South Bay market. Relative to the competitive set, the subject offers: comparable unit finishes to 2017–2019 vintage peers, a 0.3–1.3 mile proximity advantage over most competitors to the SpaceX campus, and a rent point approximately 5–8% below newer Class A product. Primary competitive disadvantage is amenity package relative to 2021+ deliveries (The Wren, Lido). The subject's positioning supports a rent premium of $50–100/month over Class B peers and a discount of $150–250 vs. new Class A.",
  },
];

const marketConclusion = "The Hawthorne submarket is well-positioned for multifamily investment. Demand fundamentals are strong: employment growth, affordability-driven renter demand, and declining new supply create a favorable supply-demand balance. Current submarket vacancy at 5.8% and accelerating rent growth of +2.4% support the subject's projected occupancy of 95% and annual rent growth assumption of 2.5%. The contracting pipeline reduces the risk of supply-driven vacancy pressure over the 5-year projection period. Primary risk remains concentration in the aerospace sector, though diversification into logistics, healthcare, and advanced manufacturing provides partial mitigation.";

// ─── Market Tab Component ────────────────────────────────────────────────────

function MarketTabContent() {
  const [expandedNarrative, setExpandedNarrative] = useState(null);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 12 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: colors.textMuted,
            textTransform: "uppercase", letterSpacing: "0.04em",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <BarChart3 size={10} />
            Multifamily Rental Market Analysis
          </div>
          <span style={{
            fontSize: 9, padding: "1px 5px",
            background: "rgba(79,142,247,0.1)", color: colors.accent,
            borderRadius: 3, fontWeight: 500,
          }}>
            South Bay Submarket · Hawthorne
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 9, color: colors.textDim, display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={9} /> Last researched: Feb 18, 2026
          </span>
        </div>

        {/* KPI Row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
          gap: 8, marginBottom: 16,
        }}>
          {marketKPIs.map((kpi, i) => (
            <div key={i} style={{
              padding: "10px 10px 8px", background: colors.surface,
              borderRadius: 6, border: `1px solid ${colors.border}`,
            }}>
              <div style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kpi.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, fontVariantNumeric: "tabular-nums" }}>
                  {kpi.value}
                </span>
                {kpi.direction === "up" ? (
                  <ArrowUpRight size={10} color={colors.green} />
                ) : kpi.direction === "down" ? (
                  <ArrowDownRight size={10} color={kpi.status === "good" ? colors.green : colors.red} />
                ) : null}
              </div>
              {kpi.note && (
                <div style={{ fontSize: 9, color: kpi.status === "good" ? colors.green : colors.textDim }}>
                  {kpi.note}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Competitive Rental Supply Table */}
        <div style={{
          background: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: 6, marginBottom: 16, overflow: "hidden",
        }}>
          <div style={{
            padding: "8px 12px", borderBottom: `1px solid ${colors.border}`,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Building2 size={11} color={colors.accent} />
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>Competitive Rental Supply</span>
            <span style={{ fontSize: 9, color: colors.textMuted }}>7 properties within 2-mile radius</span>
          </div>
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {["Property", "Year", "Units", "Mix", "Avg Rent", "Occ.", "Dist."].map(h => (
                    <th key={h} style={{
                      padding: "6px 8px", textAlign: h === "Property" ? "left" : "right",
                      color: colors.textMuted, fontWeight: 600, fontSize: 9,
                      textTransform: "uppercase", letterSpacing: "0.03em",
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {competitiveSet.map((comp, i) => (
                  <tr key={i} style={{
                    borderBottom: i < competitiveSet.length - 1 ? `1px solid ${colors.border}` : "none",
                    background: i % 2 === 0 ? "transparent" : colors.surfaceAlt,
                  }}>
                    <td style={{ padding: "6px 8px", color: colors.text, fontWeight: 500, whiteSpace: "nowrap" }}>{comp.name}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: colors.textMuted, fontVariantNumeric: "tabular-nums" }}>{comp.year}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: colors.text, fontVariantNumeric: "tabular-nums" }}>{comp.units}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: colors.textDim, fontSize: 9 }}>{comp.mix}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: colors.text, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{comp.avgRent}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      <span style={{
                        color: parseFloat(comp.occ) >= 95 ? colors.green : parseFloat(comp.occ) >= 92 ? colors.amber : colors.red,
                        fontWeight: 500,
                      }}>
                        {comp.occ}
                      </span>
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: colors.textMuted, fontVariantNumeric: "tabular-nums" }}>{comp.dist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Competitive Supply Map — existing MapClient component */}
          <div style={{
            height: 200, background: colors.surfaceAlt, borderTop: `1px solid ${colors.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            color: colors.textMuted, fontSize: 11,
          }}>
            <MapPin size={14} color={colors.accent} />
            <span>Map — 7 comps + subject (popups: address, all floorplans)</span>
          </div>
          {/* Subject row */}
          <div style={{
            padding: "6px 12px", borderTop: `2px solid ${colors.accent}`,
            background: "rgba(79,142,247,0.04)", display: "flex", alignItems: "center", gap: 8, fontSize: 10,
          }}>
            <MapPin size={10} color={colors.accent} />
            <span style={{ fontWeight: 600, color: colors.accent }}>Subject — Hawthorne Apartments</span>
            <span style={{ color: colors.textMuted }}>2018 · 156 units · S/1/2/3</span>
            <span style={{ marginLeft: "auto", color: colors.text, fontWeight: 500 }}>$2,145 avg</span>
            <span style={{ color: colors.green, fontWeight: 500 }}>95.2%</span>
          </div>
        </div>

        {/* Narrative Blocks — two-column layout */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 8, marginBottom: 12,
        }}>
          {marketNarratives.map((block) => (
            <div key={block.num} style={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: 6, padding: 12,
              gridColumn: block.num === 5 ? "1 / -1" : undefined, // positioning block spans full
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 4, fontSize: 9, fontWeight: 700,
                  background: "rgba(79,142,247,0.12)", color: colors.accent,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  {block.num}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{block.title}</span>
              </div>
              <p style={{
                fontSize: 11, lineHeight: 1.6, color: colors.textMuted, margin: 0,
                display: expandedNarrative === block.num ? "block" : "-webkit-box",
                WebkitLineClamp: expandedNarrative === block.num ? undefined : 4,
                WebkitBoxOrient: "vertical",
                overflow: expandedNarrative === block.num ? "visible" : "hidden",
              }}>
                {block.text}
              </p>
              {block.text.length > 200 && (
                <button onClick={() => setExpandedNarrative(expandedNarrative === block.num ? null : block.num)} style={{
                  background: "transparent", border: "none", color: colors.accent,
                  fontSize: 10, cursor: "pointer", padding: "4px 0 0", fontWeight: 500,
                }}>
                  {expandedNarrative === block.num ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Demand Conclusion */}
        <div style={{
          background: "rgba(52,211,153,0.04)", border: `1px solid rgba(52,211,153,0.2)`,
          borderLeft: `4px solid ${colors.green}`,
          borderRadius: 6, padding: 16, marginBottom: 16,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: colors.green, marginBottom: 6,
            textTransform: "uppercase", letterSpacing: "0.04em",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 4, fontSize: 9, fontWeight: 700,
              background: "rgba(52,211,153,0.15)", color: colors.green,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              6
            </span>
            Demand Conclusion
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.7, color: colors.text, margin: 0 }}>
            {marketConclusion}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function LocationTabPrototype() {
  const [openAccordion, setOpenAccordion] = useState("local");
  const [activeSubTab, setActiveSubTab] = useState("location");
  const [landscaperCollapsed, setLandscaperCollapsed] = useState(false);
  const [activeFolder, setActiveFolder] = useState("property");
  const [detailSection, setDetailSection] = useState(null); // which tier flyout is open

  const prevLandscaperState = useState(false); // track pre-flyout state

  const handleOpenDetail = (section) => {
    prevLandscaperState[1](landscaperCollapsed);
    setLandscaperCollapsed(true); // auto-collapse on detail open
    setDetailSection(section);
  };

  const handleCloseDetail = () => {
    setLandscaperCollapsed(prevLandscaperState[0]); // restore prior state
    setDetailSection(null);
  };

  const subTabs = [
    { id: "location", label: "Location" },
    { id: "market", label: "Market" },
    { id: "property-details", label: "Property Details" },
    { id: "rent-roll", label: "Rent Roll" },
    { id: "acquisition", label: "Acquisition" },
  ];

  return (
    <div style={{
      background: colors.bg, height: "100vh", color: colors.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex", overflow: "hidden",
    }}>
      {/* ─── Landscaper Panel ─── */}
      <LandscaperPanel
        collapsed={landscaperCollapsed}
        onToggle={() => setLandscaperCollapsed(!landscaperCollapsed)}
        detailTier={detailSection}
        activeTab={activeSubTab}
      />

      {/* ─── Main Content Area ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, position: "relative" }}>
        {/* Project header */}
        <div style={{
          padding: "6px 12px", background: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Hawthorne Apartments</span>
          <span style={{ fontSize: 11, color: colors.textMuted }}>Project 17 · Multifamily</span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: colors.textDim }}>
            <MapPin size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
            Hawthorne, CA 90250
          </span>
        </div>

        {/* Folder tabs (Row 1) */}
        <FolderTabBar active={activeFolder} onSelect={setActiveFolder} />

        {/* Sub-tabs (Row 2) */}
        <SubTabBar tabs={subTabs} active={activeSubTab} onSelect={setActiveSubTab} />

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {activeSubTab === "location" ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 300px) 1fr",
              gap: 12, padding: 12, height: "100%", overflow: "hidden",
            }}>
              {/* ─── LEFT: Indicators ─── */}
              <div style={{ overflowY: "auto", minWidth: 0 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, color: colors.textMuted,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  marginBottom: 6, display: "flex", alignItems: "center", gap: 4,
                }}>
                  <BarChart3 size={10} />
                  Economic Indicators
                </div>
                <div style={{ fontSize: 9, color: colors.textDim, marginBottom: 8 }}>
                  ACS / FRED / BLS · Dec 2024
                </div>
                {indicatorData.map((d, i) => <IndicatorCard key={i} data={d} />)}
              </div>

              {/* ─── RIGHT: Analysis ─── */}
              <div style={{ overflowY: "auto", minWidth: 0 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, color: colors.textMuted,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  marginBottom: 6, display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Info size={10} />
                  Economic Profile & Analysis
                  <span style={{
                    marginLeft: "auto", fontSize: 9, padding: "1px 5px",
                    background: "rgba(79,142,247,0.1)", color: colors.accent,
                    borderRadius: 3, fontWeight: 500, textTransform: "none", letterSpacing: 0,
                  }}>
                    AI-Generated · Cached
                  </span>
                </div>
                {accordionSections.map((section) => (
                  <AccordionSection
                    key={section.id}
                    section={section}
                    isOpen={openAccordion === section.id}
                    onToggle={() => setOpenAccordion(openAccordion === section.id ? "" : section.id)}
                    onDetail={() => handleOpenDetail(section)}
                  />
                ))}
              </div>
            </div>
          ) : activeSubTab === "market" ? (
            <MarketTabContent />
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "100%", color: colors.textDim, fontSize: 12,
            }}>
              {activeSubTab === "property-details" ? "Property Details (current Details tab)" :
               activeSubTab === "rent-roll" ? "Rent Roll (current tab)" :
               "Acquisition (current tab)"}
            </div>
          )}

          {/* ─── Detail Flyout (overlays content area) ─── */}
          {detailSection && (
            <DetailFlyout section={detailSection} onClose={handleCloseDetail} />
          )}
        </div>
      </div>
    </div>
  );
}