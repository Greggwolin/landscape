# Landscaper Market Data Ingestion Spec

Date: December 2, 2025  
Session ID: PL54  
Status: Draft Specification  
Priority: Medium — Future Enhancement

---

## Problem Statement

Landscape currently matches Redfin comps to product types using static lot size bands:

| Product | Static Band |
|---------|-------------|
| 45' | 4,500-5,500 SF |
| 50' | 5,000-6,500 SF |
| 60' | 7,000-9,000 SF |

In markets like Phoenix, actual lot sizes differ because builders use specific depths (115' and 120'):
- 45x115 = 5,175 SF (not 4,500)
- 50x120 = 6,000 SF
- 60x120 = 7,200 SF

Static bands cause:
1. Misclassified comps (a 5,400 SF lot may be a 45' product but falls outside 4,500-5,500)
2. Thin comp counts (narrow bands exclude valid comps)
3. Inaccurate pricing (bad comps lead to bad medians and FLVs)

---

## Solution Overview

Landscaper ingests market data documents (Zonda exports, builder surveys, MLS extracts) and:

1. Recognizes structured market data
2. Extracts product × lot size distributions
3. Calibrates lot bands to actual market patterns
4. Persists the results as regional market knowledge
5. Applies calibrated bands to projects in that region

---

## Document Recognition

### Supported Document Types

| Source | Format | Key Columns |
|--------|--------|-------------|
| Zonda | XLSX | Project, Builder, MPC, LotWidth, Product, PriceAvg, Units Sold, lat, lng |
| RCLCO | PDF/XLSX | Similar structure, different column names |
| MLS Extract | CSV | Address, LotSize, SalePrice, SaleDate |
| Builder Survey | XLSX | Community, Product, LotWidth, LotDepth, BasePrice |

### Recognition Logic

When a user uploads a document, Landscaper:

```
1. Check file extension (.xlsx, .csv, .pdf)
2. If spreadsheet:
   - Read column headers
   - Score against known schemas:
     - Zonda: ["Project", "Builder", "LotWidth", "Product", "PriceAvg"] -> 5/5 match
     - MLS: ["Address", "LotSize", "SalePrice"] -> 3/3 match
   - If score > 80%, classify as known type
3. If PDF:
   - OCR + table extraction
   - Same header matching
4. If unrecognized:
   - Treat as generic document (RAG only, no structured extraction)
```

### User Confirmation

Before processing, Landscaper confirms:

> "This looks like a Zonda market export with 706 active subdivisions in Phoenix. I can extract product and pricing data to calibrate your lot size bands. Proceed?"  
> [Yes, extract market data] · [No, just store as reference]

---

## Extraction Pipeline

### Step 1: Parse Raw Data

```python
# Zonda schema
RawSubdivision:
  project_name: str
  builder: str
  mpc: str | None          # Master Planned Community
  lot_width: int           # 40, 45, 50, 55, 60, etc.
  product_code: str        # "45x115", "50x120"
  units_sold: int
  units_remaining: int
  price_avg: float
  lat: float
  lng: float
```

### Step 2: Compute Derived Fields

```python
# Parse product code -> lot SF
def parse_product(code: str) -> tuple[int, int, int]:
    """Returns (width, depth, lot_sf)"""
    match = re.match(r'(\\d+)x(\\d+)', code)
    if match:
        w, d = int(match.group(1)), int(match.group(2))
        return (w, d, w * d)
    return (None, None, None)

# Assign submarket based on coordinates
def assign_submarket(lat: float, lng: float) -> str:
    """Returns submarket name based on coordinates"""
    # Use predefined polygon boundaries or reverse geocoding
    # Examples: "Surprise", "Peoria", "Gilbert", "Buckeye"
    ...
```

### Step 3: Aggregate by Product Width

```python
# Group by lot_width, compute stats
ProductBandStats:
  lot_width: int           # 45
  subdivision_count: int   # 128
  total_units_sold: int    # 3,400
  common_products: dict    # {"45x115": 63, "45x120": 35, "45x110": 11}
  lot_sf_min: int          # 3,600
  lot_sf_max: int          # 6,660
  lot_sf_median: int       # 5,175
  lot_sf_p25: int          # 4,950
  lot_sf_p75: int          # 5,400
  price_avg_median: float  # 425000.00
  price_avg_range: tuple   # (310000.00, 580000.00)
```

### Step 4: Generate Calibrated Bands

```python
def calibrate_band(stats: ProductBandStats) -> LotBand:
    """Generate calibrated band from market data"""
    # Use IQR (25th-75th percentile) as core range
    # Extend slightly to capture edge cases
    buffer = (stats.lot_sf_p75 - stats.lot_sf_p25) * 0.15

    return LotBand(
        width=stats.lot_width,
        min_sf=int(stats.lot_sf_p25 - buffer),
        max_sf=int(stats.lot_sf_p75 + buffer),
        median_sf=stats.lot_sf_median,
        sample_size=stats.subdivision_count,
        common_depths=[115, 120, 110],  # from common_products
    )
```

---

## Calibrated Bands — Phoenix Example

Based on 706 Zonda subdivisions:

| Product | Static Band | Calibrated Band | Median | Sample |
|---------|-------------|-----------------|--------|--------|
| 40' | 3,500-4,500 | 3,800-4,800 | 4,600 | 38 |
| 45' | 4,500-5,500 | 4,700-5,600 | 5,175 | 128 |
| 50' | 5,000-6,500 | 5,500-6,300 | 6,000 | 123 |
| 55' | 6,000-7,500 | 6,200-7,100 | 6,600 | 54 |
| 60' | 7,000-9,000 | 6,800-7,700 | 7,200 | 63 |
| 65' | 8,000-10,500 | 7,600-8,600 | 8,125 | 31 |
| 70' | 9,500-12,000 | 8,200-9,300 | 8,750 | 42 |

Calibrated bands are tighter because they are based on actual product offerings, not theoretical ranges.

---

## Persistence Architecture

### Market Knowledge Store

```sql
-- Regional market knowledge (not project-specific)
CREATE TABLE landscaper.market_band_calibration (
  id SERIAL PRIMARY KEY,
  region_code VARCHAR(50) NOT NULL,        -- "PHX", "TUC", "LAS"
  region_name VARCHAR(100),                -- "Phoenix Metro"
  submarket VARCHAR(100),                  -- NULL = metro-wide, or "Surprise", "Peoria"
  scope VARCHAR(20) NOT NULL DEFAULT 'user', -- "user", "org", "global"
  owner_user_id INT REFERENCES tbl_user(id),
  owner_org_id INT REFERENCES tbl_organization(id),
  lot_width INT NOT NULL,                  -- 45
  min_sf INT NOT NULL,                     -- 4700
  max_sf INT NOT NULL,                     -- 5600
  median_sf INT NOT NULL,                  -- 5175
  sample_size INT,                         -- 128
  common_depths INT[],                     -- [115, 120, 110]
  source_document_id INT REFERENCES tbl_document(id),
  source_date DATE,                        -- 2025-12-01
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (region_code, submarket, lot_width, scope, owner_user_id, owner_org_id)
);

-- Pricing benchmarks by product and submarket
CREATE TABLE landscaper.market_pricing_benchmark (
  id SERIAL PRIMARY KEY,
  region_code VARCHAR(50) NOT NULL,
  submarket VARCHAR(100),                  -- "Surprise", "Peoria", "Gilbert"
  lot_width INT NOT NULL,
  price_median NUMERIC(12,2),
  price_p25 NUMERIC(12,2),
  price_p75 NUMERIC(12,2),
  absorption_monthly NUMERIC(6,2),         -- lots/month
  sample_size INT,
  source_document_id INT REFERENCES tbl_document(id),
  source_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (region_code, submarket, lot_width)
);
```

### Region Assignment

```python
def get_region_for_project(lat: float, lng: float) -> str:
    """Assign project to a market region"""
    # Phoenix metro bounding box (approximate)
    if 33.0 < lat < 34.0 and -113.0 < lng < -111.0:
        return "PHX"
    # Tucson
    if 31.8 < lat < 32.5 and -111.5 < lng < -110.5:
        return "TUC"
    # Las Vegas
    if 35.8 < lat < 36.5 and -115.5 < lng < -114.8:
        return "LAS"
    # Default: use state
    return reverse_geocode_state(lat, lng)
```

---

## Application to Projects

### Band Selection Priority

When calculating product bands for a project:

```
1. User override (per-project settings) -> highest priority
2. Calibrated band (from market data for this region)
3. Static default band -> fallback
```

### API Endpoint

```typescript
// GET /api/landscaper/product-bands?lat=33.5&lng=-112.1

type ProductBandResponse = {
  region_code: string;
  region_name: string;
  calibration_date: string;
  calibration_source: string;
  bands: Array<{
    width: number;
    min_sf: number;
    max_sf: number;
    median_sf: number;
    sample_size: number;
  }>;
};

// Example response
const response: ProductBandResponse = {
  region_code: "PHX",
  region_name: "Phoenix Metro",
  calibration_date: "2025-12-01",
  calibration_source: "Zonda Market Export (706 subdivisions)",
  bands: [
    { width: 40, min_sf: 3800, max_sf: 4800, median_sf: 4600, sample_size: 38 },
    { width: 45, min_sf: 4700, max_sf: 5600, median_sf: 5175, sample_size: 128 },
    { width: 50, min_sf: 5500, max_sf: 6300, median_sf: 6000, sample_size: 123 },
  ],
};
```

### Frontend Integration

```typescript
// Fetch calibrated bands for project location
const { data: calibration } = useQuery(
  ['productBands', lat, lng],
  () => fetchProductBands(lat, lng)
);

// Use calibrated bands if available, else defaults
const bands = calibration?.bands ?? DEFAULT_SFD_PRODUCTS;

// Show calibration indicator
{calibration && (
  <div className="small text-muted mb-2">
    Bands calibrated from {calibration.calibration_source}
  </div>
)}
```

---

## User Experience

### Upload Flow

1. User uploads Zonda export to Documents (or drops on Landscaper).
2. Landscaper recognizes format:
   - "I see this is a Zonda market export with 706 active Phoenix subdivisions. Should I use this to calibrate your lot size bands and pricing benchmarks?"
3. User confirms and selects scope:
   - "Who should have access to this calibration?"
   - [Just me] · [My organization] · [Share globally]
4. Landscaper processes and reports:
   - "Done! I have calibrated lot bands for 7 product types based on 706 subdivisions. Key findings:
     - 45' lots are typically 5,175 SF (45x115 is most common)
     - 50' lots are typically 6,000 SF (50x120 is most common)
     - Average absorption is 3.2 lots/month across all products
     This calibration will apply to all Phoenix metro projects."
5. On any Phoenix project, Napkin mode uses calibrated bands automatically.
6. Optional: User can narrow calibration to submarket:
   - "Want me to narrow to just Surprise/Peoria? I found 128 subdivisions within 10 miles of your site."
   - [Yes, use local data] · [No, keep metro-wide]

### Calibration Indicator

SFD Pricing Panel header example:

```
---------------------------------------------------------------
| SFD Product Pricing          [33 comps] [8 Products]        |
| Bands calibrated from Zonda (Dec 2025) · 706 subdivisions   |
---------------------------------------------------------------
```

### Stale Data Warning

If calibration is older than 6 months:

> "Lot band calibration is from June 2024. Upload a fresh Zonda export for current market data."

---

## Additional Intelligence from Zonda

Beyond lot bands, Landscaper can extract:

### 1) Absorption Benchmarks

```python
# Monthly absorption = Units Sold / months since community opened
# Zonda does not have open date, but can estimate from total sold

AbsorptionBenchmark:
  submarket: str
  lot_width: int
  monthly_rate_median: float   # 2.8 lots/month
  monthly_rate_range: tuple    # (1.2, 5.4)
```

User question: "What is typical absorption for 50' lots in Surprise?"

Landscaper: "Based on 45 active 50' communities in Surprise, median absorption is 2.8 lots/month. Top performers hit 4-5/month. Conservative estimate for new entry would be 2.0-2.5/month."

### 2) Competitive Positioning

```python
# Projects within X miles of subject site
def find_competitors(lat, lng, radius_miles=5, lot_width=None):
    """Returns nearby competing subdivisions"""
    ...
```

User question: "Who is my competition if I build 45' product at [location]?"

Landscaper: "Within 5 miles, there are 8 active 45' communities:
- Parkside (Taylor Morrison): $427k avg, 175 remaining
- Cross Creek Ranch (Oakwood): $309k avg, 193 remaining
- ... [list continues]
Total competitive supply: 892 lots. At current absorption, about 18 months of inventory."

### 3) Builder Intelligence

```python
# Market share by builder
def builder_market_share(region, lot_width=None):
    """Returns builder ranking by units sold"""
    ...
```

User question: "Which builders should I target as lot buyers?"

Landscaper: "For 50' product in Phoenix, top buyers by volume:
1. Lennar (412 lots sold)
2. Pulte (287 lots sold)
3. Meritage (245 lots sold)
Regionals to consider: Taylor Morrison, Ashton Woods — they pay premium for finished lots in strong locations."

---

## Implementation Phases

### Phase 1: Manual Calibration
- User uploads Zonda
- Landscaper extracts and shows calibrated bands
- User manually applies to project (copy values)
- No persistence

### Phase 2: Persistent Regional Knowledge
- Add `market_band_calibration` table
- Auto-apply calibrated bands to projects in region
- Show calibration source in UI

### Phase 3: Full Market Intelligence
- Absorption benchmarks
- Competitor analysis
- Builder intelligence
- Pricing trend analysis

### Phase 4: Auto-Refresh
- Prompt user when calibration is stale
- Integration with Zonda API (if available)
- Scheduled market data updates

---

## Resolved Questions

1. Regional boundaries: Metro-wide by default. User can optionally filter to submarket (for example, narrow to Surprise/Peoria within 10 miles). Landscaper prompts with this option after initial calibration.
2. Multi-source reconciliation: Most recent upload takes priority. If multiple sources show conflicting data, favor the one with larger sample size or more recent date.
3. User vs. org knowledge: User chooses at setup:
   - Personal: calibration applies only to this user's projects
   - Organization: shared across team members
   - Global: contributed to community benchmarks (future)
4. Zonda API: No API available. Always manual upload. Consider quarterly refresh reminders.

---

Spec Version: 1.0  
Created By: Gregg + Claude (PL54)  
Status: Draft — awaiting review
