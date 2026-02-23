/**
 * Market Analysis Generation API
 *
 * Generates AI-powered economic analysis for the Location sub-tab's
 * T1/T2/T3 accordion sections. Analysis framework follows the
 * Appraisal Institute's methodology (The Appraisal of Real Estate,
 * 14th Edition — Chapters 10, 11, and 15).
 *
 * POST /api/market/analysis
 * Body: { tier, project, geoTargets, indicators }
 * Returns: { summary, sections: [{ title, content }], generatedAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IndicatorRow {
  geoLevel: string;
  geoName: string;
  value: string;
  change: string;
  direction: string;
}

interface IndicatorPayload {
  label: string;
  rows: IndicatorRow[];
}

interface GeoTarget {
  geo_id: string;
  geo_level: string;
  geo_name: string;
}

interface AnalysisRequest {
  tier: 't1' | 't2' | 't3';
  project: {
    name: string;
    type_code: string;
    property_type?: string;
    property_subtype?: string;
    city: string;
    state: string;
  };
  geoTargets: GeoTarget[];
  indicators: IndicatorPayload[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier frameworks — based on Appraisal of Real Estate 14th Ed
// ─────────────────────────────────────────────────────────────────────────────

const TIER_FRAMEWORKS: Record<string, { title: string; geoLevels: string[]; sections: string[]; guidance: string }> = {
  t1: {
    title: 'National & State Economy',
    geoLevels: ['US', 'STATE'],
    sections: [
      'Economic Cycle & Growth',
      'Inflation & Monetary Policy',
      'Capital Markets & Lending',
      'National Housing Market',
      'State Economic Conditions',
      'Implications for Subject Property',
    ],
    guidance: `Analyze the macro economy following Chapter 10 of The Appraisal of Real Estate (14th Ed).
Cover: (1) where we are in the business/real estate cycle, (2) inflation trends and Fed policy direction,
(3) interest rate environment and mortgage market conditions, (4) national housing indicators
(starts, permits, home prices via S&P/Case-Shiller and FHFA HPI), (5) state-level employment,
population, and income trends, and (6) what these macro conditions mean for the subject property type.
Reference specific data provided. If a data point shows YoY decline, note it and explain implications.`,
  },
  t2: {
    title: 'Metropolitan Statistical Area (MSA)',
    geoLevels: ['MSA', 'COUNTY'],
    sections: [
      'Economic Base & Employment',
      'Demographic Trends',
      'Income & Purchasing Power',
      'Regional Housing Market',
      'Infrastructure & Development',
      'Market Cycle Position',
    ],
    guidance: `Analyze the regional/metro economy following Chapter 11 (Neighborhoods, Districts, and
Market Areas) and Chapter 15 (Market Analysis) of The Appraisal of Real Estate (14th Ed).
Apply the four forces framework at the metro level: (1) economic forces — major employers,
industry diversification, job growth by sector, (2) demographic forces — population growth,
net migration, household formation, age distribution, (3) governmental forces — regional
planning, tax environment, infrastructure investment, (4) environmental/geographic forces —
transportation networks, natural amenities, development constraints.
Also cover supply/demand dynamics: construction pipeline, vacancy trends, absorption rates.
Reference the specific MSA and county data provided.`,
  },
  t3: {
    title: 'City & Neighborhood',
    geoLevels: ['CITY', 'COUNTY'],
    sections: [
      'Local Demographics & Social Forces',
      'Economic Forces & Property Market',
      'Governmental & Regulatory Influences',
      'Environmental & Locational Factors',
      'Neighborhood Life Cycle',
      'Competitive Position & Outlook',
    ],
    guidance: `Analyze the city and immediate neighborhood following Chapter 11's neighborhood analysis
framework from The Appraisal of Real Estate (14th Ed). Apply the four forces at the local level:
(1) Social forces — population density, household composition, community character, schools,
crime trends, (2) Economic forces — local property values, rent levels, vacancy rates, commercial
activity, income levels, (3) Governmental forces — zoning and land use regulations, property
tax rates, building codes, planned public improvements, environmental regulations,
(4) Environmental forces — topography, lot patterns, street layout, proximity to employment,
transportation, amenities, and any nuisances.
Assess the neighborhood life cycle stage (growth, stability, decline, or revitalization).
Conclude with how these forces affect the subject property's competitive position and
market capture potential within the submarket.`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────────────────────

function buildAnalysisPrompt(req: AnalysisRequest): { system: string; user: string } {
  const framework = TIER_FRAMEWORKS[req.tier];
  if (!framework) throw new Error(`Unknown tier: ${req.tier}`);

  const propertyTypeLabel =
    req.project.property_subtype ||
    req.project.property_type ||
    ({
      LAND: 'Land Development',
      MF: 'Multifamily',
      OFF: 'Office',
      RET: 'Retail',
      IND: 'Industrial',
      HTL: 'Hotel',
      MXU: 'Mixed Use',
    } as Record<string, string>)[req.project.type_code] ||
    'Real Estate';

  // Format indicator data as context
  const relevantLevels = new Set(framework.geoLevels);
  const dataLines: string[] = [];

  for (const ind of req.indicators) {
    const relevantRows = ind.rows.filter(
      (r) => relevantLevels.has(r.geoLevel) || r.geoLevel === 'US'
    );
    if (relevantRows.length === 0) continue;

    dataLines.push(`\n${ind.label}:`);
    for (const row of relevantRows) {
      dataLines.push(
        `  ${row.geoName} (${row.geoLevel}): ${row.value}  YoY: ${row.change} (${row.direction})`
      );
    }
  }

  // Geo context
  const geoLines = req.geoTargets
    .map((g) => `  ${g.geo_level}: ${g.geo_name} (${g.geo_id})`)
    .join('\n');

  const system = `You are a senior MAI-designated real estate appraiser writing the economic analysis
section of a commercial appraisal report. Follow the analytical framework from
The Appraisal of Real Estate (14th Edition, Appraisal Institute).

Writing style:
- Professional, analytical tone appropriate for institutional lenders and investors
- Each section should be 2-3 concise paragraphs (4-8 sentences each)
- Reference specific data values when available (include the numbers)
- When data shows notable trends (large YoY changes), highlight and explain implications
- Where data is unavailable or shows "—", provide qualitative analysis based on general market knowledge but note the data gap
- Do NOT use bullet points or lists — write in flowing analytical prose
- Do NOT include headers or markdown formatting in the content text — just paragraphs
- The summary should be 2-3 paragraphs providing an executive overview

You MUST respond with valid JSON matching this exact structure:
{
  "summary": "2-3 paragraph executive summary of the analysis",
  "sections": [
    {"title": "Section Title", "content": "2-3 paragraphs of analytical prose"}
  ]
}

Include exactly ${framework.sections.length} sections with these titles: ${framework.sections.map((s) => `"${s}"`).join(', ')}`;

  const user = `Generate the "${framework.title}" analysis (Tier ${req.tier.toUpperCase()}) for:

Project: ${req.project.name}
Property Type: ${propertyTypeLabel}
Location: ${req.project.city}, ${req.project.state}

Geographic Hierarchy:
${geoLines}

Market Data (latest values with year-over-year change):
${dataLines.join('\n') || '  No quantitative data available — provide qualitative analysis.'}

Analytical Framework:
${framework.guidance}

Respond with JSON only — no markdown fences, no explanation outside the JSON.`;

  return { system, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();

    if (!body.tier || !TIER_FRAMEWORKS[body.tier]) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be t1, t2, or t3.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { system, user } = buildAnalysisPrompt(body);

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: user }],
    });

    // Extract text content
    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from AI' },
        { status: 500 }
      );
    }

    // Parse JSON response
    let analysis;
    try {
      // Strip any markdown fences if present
      let raw = textBlock.text.trim();
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      analysis = JSON.parse(raw);
    } catch {
      // If JSON parsing fails, wrap the raw text as a summary
      analysis = {
        summary: textBlock.text,
        sections: [],
      };
    }

    return NextResponse.json({
      tier: body.tier,
      title: TIER_FRAMEWORKS[body.tier].title,
      summary: analysis.summary || '',
      sections: analysis.sections || [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Market analysis generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis generation failed' },
      { status: 500 }
    );
  }
}
