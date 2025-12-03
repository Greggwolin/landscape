# Ingestion Architecture: Builder & Redfin Data Integration

**Version:** 1.0
**Status:** Design / Alignment
**Authors:** Claude Code, GPT-5 (Codex)
**Date:** 2025-12-02

---

## 1. Scope & Goals

### 1.1 What We're Ingesting

| Data Type | Source(s) | Purpose |
|-----------|-----------|---------|
| **Builder Communities** | Lennar, NHS, builder_recon, future Zonda overlays | Benchmark new-home pricing by builder/community/product type |
| **Builder Plans** | Lennar, NHS | Track base prices, sqft, bed/bath by plan within communities |
| **Builder Inventory (QMI)** | Lennar, NHS | Quick-move-in homes with current pricing and availability |
| **Resale Closings** | Redfin CSV API, future MLS/recorder feeds | Comp analysis for napkin mode; finished lot value derivation |

### 1.2 Why This Matters

1. **Napkin Mode Pricing:** Resale closings (Redfin) provide market-based pricing for SFD product bands. Most 2023-2025 closings in growth markets are builder product anyway.

2. **Builder Benchmarks:** Direct builder data gives us:
   - Base price by plan (before lot premiums, options)
   - Price per sqft by product type
   - Community-level absorption signals (inventory count)
   - Geographic coverage by builder

3. **Land Valuation:** Combining resale $/SF with builder base prices lets us derive finished lot values (FLV) and residual land values.

### 1.3 Design Principles

- **Source-agnostic normalization:** All sources map to canonical schemas before storage
- **Idempotent writes:** Re-running ingestion for the same source/date overwrites cleanly
- **Graceful degradation:** Missing fields are NULL, not errors
- **Audit trail:** Every record tracks `source`, `source_id`, `ingested_at`

---

## 2. Canonical Schemas

### 2.1 bmk_builder_communities

Builder community benchmarks aggregated from Lennar, NHS, and multi-builder recon.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `SERIAL` | NO | Internal surrogate key |
| `source` | `VARCHAR(32)` | NO | Source system: `lennar`, `nhs`, `taylor_morrison`, etc. |
| `source_id` | `VARCHAR(64)` | NO | Source-specific ID (MD5 of URL or native ID) |
| `builder_name` | `VARCHAR(128)` | NO | Canonical builder name |
| `community_name` | `VARCHAR(256)` | NO | Community/subdivision name |
| `market_label` | `VARCHAR(64)` | YES | Metro market (e.g., "Phoenix, AZ") |
| `city` | `VARCHAR(64)` | YES | City name |
| `state` | `CHAR(2)` | YES | State abbreviation |
| `zip_code` | `VARCHAR(10)` | YES | ZIP code |
| `lat` | `DECIMAL(10,7)` | YES | Latitude (geocoded) |
| `lng` | `DECIMAL(10,7)` | YES | Longitude (geocoded) |
| `price_min` | `INTEGER` | YES | Minimum base price in community |
| `price_max` | `INTEGER` | YES | Maximum base price in community |
| `sqft_min` | `INTEGER` | YES | Minimum sqft in community |
| `sqft_max` | `INTEGER` | YES | Maximum sqft in community |
| `beds_min` | `SMALLINT` | YES | Minimum bedrooms |
| `beds_max` | `SMALLINT` | YES | Maximum bedrooms |
| `baths_min` | `DECIMAL(3,1)` | YES | Minimum bathrooms |
| `baths_max` | `DECIMAL(3,1)` | YES | Maximum bathrooms |
| `hoa_monthly` | `INTEGER` | YES | Monthly HOA fee |
| `product_types` | `VARCHAR(256)` | YES | Comma-separated: "SFD,TH,Condo" |
| `plan_count` | `SMALLINT` | YES | Number of plans in community |
| `inventory_count` | `SMALLINT` | YES | QMI/spec homes available |
| `source_url` | `TEXT` | YES | URL to source listing |
| `first_seen_at` | `TIMESTAMPTZ` | NO | First ingestion timestamp |
| `last_seen_at` | `TIMESTAMPTZ` | NO | Most recent ingestion timestamp |
| `ingested_at` | `TIMESTAMPTZ` | NO | Record write timestamp |

**Primary Key:** `(source, source_id)`
**Natural Key:** `(builder_name, community_name, market_label)` (for dedup/matching)

### 2.2 bmk_builder_plans

Individual floor plans within communities.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `SERIAL` | NO | Internal surrogate key |
| `source` | `VARCHAR(32)` | NO | Source system |
| `source_id` | `VARCHAR(64)` | NO | Source-specific plan ID |
| `community_source_id` | `VARCHAR(64)` | NO | FK to parent community |
| `plan_name` | `VARCHAR(128)` | NO | Plan/model name |
| `series_name` | `VARCHAR(64)` | YES | Series/collection name |
| `product_type` | `VARCHAR(32)` | YES | SFD, TH, Condo, etc. |
| `base_price` | `INTEGER` | YES | Starting price |
| `sqft_min` | `INTEGER` | YES | Minimum sqft |
| `sqft_max` | `INTEGER` | YES | Maximum sqft |
| `beds_min` | `SMALLINT` | YES | Bedrooms |
| `beds_max` | `SMALLINT` | YES | Bedrooms (if range) |
| `baths_min` | `DECIMAL(3,1)` | YES | Bathrooms |
| `baths_max` | `DECIMAL(3,1)` | YES | Bathrooms (if range) |
| `garage_spaces` | `SMALLINT` | YES | Garage capacity |
| `stories` | `SMALLINT` | YES | Number of stories |
| `source_url` | `TEXT` | YES | URL to plan page |
| `first_seen_at` | `TIMESTAMPTZ` | NO | First ingestion |
| `last_seen_at` | `TIMESTAMPTZ` | NO | Most recent ingestion |
| `ingested_at` | `TIMESTAMPTZ` | NO | Record write timestamp |

**Primary Key:** `(source, source_id)`

### 2.3 bmk_builder_inventory

Quick-move-in / spec homes (individual listings).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `SERIAL` | NO | Internal surrogate key |
| `source` | `VARCHAR(32)` | NO | Source system |
| `source_id` | `VARCHAR(64)` | NO | Source-specific listing ID |
| `community_source_id` | `VARCHAR(64)` | YES | FK to parent community |
| `plan_source_id` | `VARCHAR(64)` | YES | FK to plan (if known) |
| `address_line1` | `VARCHAR(256)` | YES | Street address |
| `city` | `VARCHAR(64)` | YES | City |
| `state` | `CHAR(2)` | YES | State |
| `zip_code` | `VARCHAR(10)` | YES | ZIP |
| `lat` | `DECIMAL(10,7)` | YES | Latitude |
| `lng` | `DECIMAL(10,7)` | YES | Longitude |
| `status` | `VARCHAR(32)` | YES | Available, Pending, Sold |
| `price_current` | `INTEGER` | YES | Current asking price |
| `price_original` | `INTEGER` | YES | Original list price |
| `sqft_actual` | `INTEGER` | YES | Actual sqft |
| `beds_actual` | `SMALLINT` | YES | Bedrooms |
| `baths_actual` | `DECIMAL(3,1)` | YES | Bathrooms |
| `lot_sqft` | `INTEGER` | YES | Lot size |
| `move_in_date` | `DATE` | YES | Expected/actual move-in |
| `source_url` | `TEXT` | YES | URL to listing |
| `first_seen_at` | `TIMESTAMPTZ` | NO | First ingestion |
| `last_seen_at` | `TIMESTAMPTZ` | NO | Most recent ingestion |
| `ingested_at` | `TIMESTAMPTZ` | NO | Record write timestamp |

**Primary Key:** `(source, source_id)`

### 2.4 bmk_resale_closings

Resale/closing transactions from Redfin (and future MLS/recorder feeds).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `SERIAL` | NO | Internal surrogate key |
| `source` | `VARCHAR(32)` | NO | Source: `redfin`, `mls`, `recorder` |
| `source_id` | `VARCHAR(64)` | NO | MLS# or source-specific ID |
| `address_line1` | `VARCHAR(256)` | YES | Street address |
| `city` | `VARCHAR(64)` | YES | City |
| `state` | `CHAR(2)` | YES | State |
| `zip_code` | `VARCHAR(10)` | YES | ZIP |
| `lat` | `DECIMAL(10,7)` | YES | Latitude |
| `lng` | `DECIMAL(10,7)` | YES | Longitude |
| `property_type` | `VARCHAR(32)` | YES | house, condo, townhouse |
| `sale_price` | `INTEGER` | NO | Closing price |
| `sale_date` | `DATE` | NO | Closing date |
| `list_price` | `INTEGER` | YES | Original list price |
| `list_date` | `DATE` | YES | Original list date |
| `days_on_market` | `SMALLINT` | YES | DOM |
| `sqft` | `INTEGER` | YES | Building sqft |
| `lot_sqft` | `INTEGER` | YES | Lot sqft |
| `price_per_sqft` | `INTEGER` | YES | Calculated $/SF |
| `year_built` | `SMALLINT` | YES | Year built |
| `beds` | `SMALLINT` | YES | Bedrooms |
| `baths` | `DECIMAL(3,1)` | YES | Bathrooms |
| `builder_name` | `VARCHAR(128)` | YES | Builder (if detectable) |
| `subdivision_name` | `VARCHAR(128)` | YES | Subdivision (if available) |
| `source_url` | `TEXT` | YES | Link to listing |
| `ingested_at` | `TIMESTAMPTZ` | NO | Record write timestamp |

**Primary Key:** `(source, source_id)`

> **Note:** Current-year closings for SFR in Phoenix are ~70% builder product. The `year_built` filter in Redfin queries (default: last 2 years) effectively captures mostly new construction.

---

## 3. Python Model Shapes

### 3.1 UnifiedCommunityBenchmark

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List

@dataclass
class UnifiedCommunityBenchmark:
    """Canonical community record for all builder sources."""

    # Identity
    source: str                          # 'lennar', 'nhs', 'taylor_morrison', etc.
    source_id: str                       # MD5 of URL or native ID

    # Builder & Community
    builder_name: str
    community_name: str
    market_label: Optional[str] = None   # 'Phoenix, AZ'

    # Location
    city: Optional[str] = None
    state: Optional[str] = None          # 2-letter
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    # Pricing (ranges)
    price_min: Optional[int] = None
    price_max: Optional[int] = None

    # Size (ranges)
    sqft_min: Optional[int] = None
    sqft_max: Optional[int] = None
    beds_min: Optional[int] = None
    beds_max: Optional[int] = None
    baths_min: Optional[float] = None
    baths_max: Optional[float] = None

    # Fees
    hoa_monthly: Optional[int] = None

    # Metadata
    product_types: List[str] = field(default_factory=list)  # ['SFD', 'TH']
    plan_count: Optional[int] = None
    inventory_count: Optional[int] = None
    source_url: Optional[str] = None

    # Timestamps
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
```

### 3.2 UnifiedPlanBenchmark

```python
@dataclass
class UnifiedPlanBenchmark:
    """Canonical plan record."""

    # Identity
    source: str
    source_id: str
    community_source_id: str             # Links to parent community

    # Plan details
    plan_name: str
    series_name: Optional[str] = None
    product_type: Optional[str] = None   # 'SFD', 'TH', 'Condo'

    # Pricing
    base_price: Optional[int] = None

    # Size
    sqft_min: Optional[int] = None
    sqft_max: Optional[int] = None
    beds_min: Optional[int] = None
    beds_max: Optional[int] = None
    baths_min: Optional[float] = None
    baths_max: Optional[float] = None
    garage_spaces: Optional[int] = None
    stories: Optional[int] = None

    # Metadata
    source_url: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
```

### 3.3 UnifiedInventoryListing

```python
@dataclass
class UnifiedInventoryListing:
    """Canonical QMI/spec home record."""

    # Identity
    source: str
    source_id: str
    community_source_id: Optional[str] = None
    plan_source_id: Optional[str] = None

    # Location
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    # Status & Pricing
    status: Optional[str] = None         # 'Available', 'Pending', 'Sold'
    price_current: Optional[int] = None
    price_original: Optional[int] = None

    # Physical
    sqft_actual: Optional[int] = None
    beds_actual: Optional[int] = None
    baths_actual: Optional[float] = None
    lot_sqft: Optional[int] = None

    # Dates
    move_in_date: Optional[str] = None   # ISO date or descriptive

    # Metadata
    source_url: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
```

### 3.4 UnifiedResaleClosing

```python
@dataclass
class UnifiedResaleClosing:
    """Canonical resale/closing record from Redfin or MLS."""

    # Identity
    source: str                          # 'redfin', 'mls', 'recorder'
    source_id: str                       # MLS# or generated ID

    # Location
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    # Transaction
    property_type: Optional[str] = None  # 'house', 'condo', 'townhouse'
    sale_price: int                      # Required
    sale_date: str                       # ISO date, required
    list_price: Optional[int] = None
    list_date: Optional[str] = None
    days_on_market: Optional[int] = None

    # Physical
    sqft: Optional[int] = None
    lot_sqft: Optional[int] = None
    price_per_sqft: Optional[int] = None
    year_built: Optional[int] = None
    beds: Optional[int] = None
    baths: Optional[float] = None

    # Builder info (if detectable)
    builder_name: Optional[str] = None
    subdivision_name: Optional[str] = None

    # Metadata
    source_url: Optional[str] = None
    distance_miles: Optional[float] = None  # From search center (runtime only)
```

---

## 4. Source Mapping

### 4.1 Redfin → UnifiedResaleClosing

| Redfin Field (SfComp) | Unified Field | Transform |
|-----------------------|---------------|-----------|
| `mlsId` | `source_id` | Direct |
| `address` | `address_line1` | Direct |
| `city` | `city` | Direct |
| `state` | `state` | Direct |
| `zip` | `zip_code` | Direct |
| `lat` | `lat` | Direct |
| `lng` | `lng` | Direct |
| (inferred from query) | `property_type` | Map from query param |
| `salePrice` | `sale_price` | Direct |
| `saleDate` | `sale_date` | ISO format |
| `sqft` | `sqft` | Direct |
| `lotSqft` | `lot_sqft` | Direct |
| `pricePerSqft` | `price_per_sqft` | Direct |
| `yearBuilt` | `year_built` | Direct |
| `beds` | `beds` | Direct |
| `baths` | `baths` | Direct |
| `url` | `source_url` | Direct |
| `distanceMiles` | `distance_miles` | Runtime only, not persisted |
| — | `source` | Hardcode `'redfin'` |
| — | `builder_name` | NULL (not available from Redfin) |
| — | `subdivision_name` | NULL (not available) |

### 4.2 Lennar → UnifiedCommunityBenchmark

| Lennar Field (Community) | Unified Field | Transform |
|--------------------------|---------------|-----------|
| `community_id` | `source_id` | Direct |
| `source_system` | `source` | Direct (`'lennar'`) |
| `builder_name` | `builder_name` | Direct |
| `name` | `community_name` | Direct |
| `market_label` | `market_label` | Direct |
| `city` | `city` | Direct |
| `state` | `state` | Direct |
| `url` | `source_url` | Direct |
| `price_min` | `price_min` | Cast to int |
| `price_max` | `price_max` | Cast to int |
| `sqft_min` | `sqft_min` | Cast to int |
| `sqft_max` | `sqft_max` | Cast to int |
| `beds_min` | `beds_min` | Cast to int |
| `beds_max` | `beds_max` | Cast to int |
| `baths_min` | `baths_min` | Direct |
| `baths_max` | `baths_max` | Direct |
| `product_types` | `product_types` | Direct |
| `first_seen_at` | `first_seen_at` | Parse ISO |
| `last_seen_at` | `last_seen_at` | Parse ISO |
| — | `lat`, `lng` | Geocode from city/state |
| — | `zip_code` | NULL (not captured) |
| — | `hoa_monthly` | NULL (not captured) |

### 4.3 Lennar → UnifiedPlanBenchmark

| Lennar Field (Plan) | Unified Field | Transform |
|---------------------|---------------|-----------|
| `plan_id` | `source_id` | Direct |
| `community_id` | `community_source_id` | Direct |
| `name` | `plan_name` | Direct |
| `series_name` | `series_name` | Direct |
| `product_type` | `product_type` | Direct |
| `base_price` | `base_price` | Cast to int |
| `sqft_min` | `sqft_min` | Cast to int |
| `sqft_max` | `sqft_max` | Cast to int |
| `beds_min` | `beds_min` | Cast to int |
| `baths_min` | `baths_min` | Direct |
| `garage_spaces` | `garage_spaces` | Cast to int |
| `url` | `source_url` | Direct |
| — | `source` | Hardcode `'lennar'` |

### 4.4 Lennar → UnifiedInventoryListing

| Lennar Field (Listing) | Unified Field | Transform |
|------------------------|---------------|-----------|
| `listing_id` | `source_id` | Direct |
| `community_id` | `community_source_id` | Direct |
| `plan_id` | `plan_source_id` | Direct |
| `address_line1` | `address_line1` | Direct |
| `city` | `city` | Direct |
| `state` | `state` | Direct |
| `zip_code` | `zip_code` | Direct |
| `status` | `status` | Direct |
| `price_current` | `price_current` | Cast to int |
| `sqft_actual` | `sqft_actual` | Cast to int |
| `beds_actual` | `beds_actual` | Cast to int |
| `baths_actual` | `baths_actual` | Direct |
| `quick_move_in_date` | `move_in_date` | Direct (string) |
| `url` | `source_url` | Direct |
| — | `source` | Hardcode `'lennar'` |
| — | `lat`, `lng` | Geocode from address |

### 4.5 NHS Recon → (Pattern Only)

NHS Recon is a **reconnaissance tool**, not a production miner. Its output (`field_matrix`, `mapping_to_landscape_schema`) informs whether NHS is worth building a full adapter for.

If NHS proves viable, the mapping would follow the same pattern as Lennar:
- `PageSample` with `page_type='community'` → `UnifiedCommunityBenchmark`
- `PageSample` with `page_type='plan'` → `UnifiedPlanBenchmark`
- `PageSample` with `page_type='listing'` → `UnifiedInventoryListing`

### 4.6 Builder Recon → (Meta Only)

Builder Recon produces `BuilderRecon` objects with coverage metadata, not entity data. It orchestrates per-builder adapters and produces intersection datasets.

**Not mapped to benchmark tables.** Used for:
- Prioritizing which builders to implement next
- Identifying common fields across builders
- Legal/robots assessment before building adapters

---

## 5. Refactor Plan

### Phase 1: Extract Shared Infrastructure

| Step | Description | Owner |
|------|-------------|-------|
| 1.1 | Create `backend/tools/common/__init__.py` | Claude |
| 1.2 | Create `backend/tools/common/http_client.py` - unified HttpClient with configurable timeout, retries, delay, User-Agent, redirect behavior | Codex |
| 1.3 | Create `backend/tools/common/robots.py` - unified RobotsInfo dataclass and `fetch_robots()` | Codex |
| 1.4 | Create `backend/tools/common/logging_setup.py` - standardized logging config | Codex |
| 1.5 | Create `backend/tools/common/config_base.py` - base config dataclass with common fields | Codex |

### Phase 2: Refactor Existing Tools

| Step | Description | Owner |
|------|-------------|-------|
| 2.1 | Update `lennar_offerings` to import from `common.http_client`, `common.robots` | Codex |
| 2.2 | Update `nhs_recon` to import from `common.http_client`, `common.robots` | Codex |
| 2.3 | Update `builder_recon` to import from `common.http_client`, `common.robots` | Codex |
| 2.4 | Delete duplicate `http_client.py` and `robots.py` from each tool directory | Codex |
| 2.5 | Remove subprocess coupling in `builder_recon/adapters.py` - call `LennarSampler` directly | Codex |

### Phase 3: Unified Models & Adapters

| Step | Description | Owner |
|------|-------------|-------|
| 3.1 | Create `backend/tools/common/models.py` with `UnifiedCommunityBenchmark`, `UnifiedPlanBenchmark`, `UnifiedInventoryListing`, `UnifiedResaleClosing` | Claude |
| 3.2 | Create `backend/tools/common/adapters/redfin_adapter.py` - `SfComp` → `UnifiedResaleClosing` | Claude |
| 3.3 | Create `backend/tools/common/adapters/lennar_adapter.py` - Lennar schemas → Unified models | Codex |
| 3.4 | Create `backend/tools/common/adapters/nhs_adapter.py` (stub for future) | Codex |

### Phase 4: Persistence Layer

| Step | Description | Owner |
|------|-------------|-------|
| 4.1 | Create Neon migration for `bmk_builder_communities` table | Claude |
| 4.2 | Create Neon migration for `bmk_builder_plans` table | Claude |
| 4.3 | Create Neon migration for `bmk_builder_inventory` table | Claude |
| 4.4 | Create Neon migration for `bmk_resale_closings` table | Claude |
| 4.5 | Create `backend/tools/common/persistence.py` with `upsert_community()`, `upsert_plan()`, `upsert_inventory()`, `upsert_closing()` | Claude |
| 4.6 | Add `--persist` flag to CLI tools to write to Neon | Codex |

### Phase 5: Geocoding (Optional)

| Step | Description | Owner |
|------|-------------|-------|
| 5.1 | Create `backend/tools/common/geocoding.py` with Nominatim or Google Maps integration | Codex |
| 5.2 | Add geocoding step to Lennar adapter (city/state → lat/lng) | Codex |
| 5.3 | Add geocoding step to inventory adapter (address → lat/lng) | Codex |

---

## 6. Division of Labor

### 6.1 Claude Code (Me)

**Best for:**
- Architecture decisions and schema design
- Integration with existing frontend (napkin mode, maps)
- Database migrations and persistence layer
- Redfin adapter (I built the original integration)
- Code review and consistency enforcement
- Fixing subtle bugs that require deep context

**Example prompts for Claude:**
- "Wire the Lennar adapter output into the napkin mode pricing table"
- "Create the Neon migration for bmk_builder_communities"
- "The map isn't showing builder communities - debug and fix"
- "Review Codex's changes to http_client.py for consistency"

### 6.2 Codex (GPT-5)

**Best for:**
- Bulk scaffolding (creating new files, boilerplate)
- Extracting shared modules from existing code
- Adding new builder adapters (Taylor Morrison, Meritage, etc.)
- Mechanical refactors (update imports, rename fields)
- Testing against live sites
- Parallel exploration of multiple builders

**Example prompts for Codex:**
- "Extract the shared HttpClient from the three tool directories into backend/tools/common/http_client.py"
- "Create a Taylor Morrison adapter following the Lennar pattern"
- "Update all tools to use the new common.robots module"
- "Add the --persist flag to lennar_offerings CLI"

### 6.3 Non-Technical User (You)

**Best for:**
- Priority decisions (which builder next? more coverage or cleaner code?)
- Reviewing output quality (do the prices look right?)
- Providing domain knowledge (what fields matter for land valuation?)
- Coordinating between Claude and Codex
- Testing the UI and reporting issues

**Example tasks:**
- "Run the Lennar miner and tell me if the Phoenix communities look correct"
- "Look at the napkin mode pricing - does the Redfin data make sense?"
- "Decide: should we add Taylor Morrison next or focus on Zonda integration?"

### 6.4 Coordination Protocol

1. **Claude owns:** `backend/tools/common/models.py`, `backend/tools/common/persistence.py`, all Neon migrations, frontend integration

2. **Codex owns:** `backend/tools/common/http_client.py`, `backend/tools/common/robots.py`, individual builder adapters, CLI tools

3. **Shared files:** When both need to touch the same file, Claude reviews Codex's changes before merge

4. **Branch strategy:**
   - `main` - stable
   - `feature/ingestion-architecture` - this refactor
   - Codex works in `feature/ingestion-architecture` or sub-branches
   - Claude merges and resolves conflicts

---

## 7. Draft DDL for Neon Tables

### 7.1 bmk_builder_communities

```sql
CREATE TABLE IF NOT EXISTS landscape.bmk_builder_communities (
    id SERIAL PRIMARY KEY,
    source VARCHAR(32) NOT NULL,
    source_id VARCHAR(64) NOT NULL,
    builder_name VARCHAR(128) NOT NULL,
    community_name VARCHAR(256) NOT NULL,
    market_label VARCHAR(64),
    city VARCHAR(64),
    state CHAR(2),
    zip_code VARCHAR(10),
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    price_min INTEGER,
    price_max INTEGER,
    sqft_min INTEGER,
    sqft_max INTEGER,
    beds_min SMALLINT,
    beds_max SMALLINT,
    baths_min DECIMAL(3, 1),
    baths_max DECIMAL(3, 1),
    hoa_monthly INTEGER,
    product_types VARCHAR(256),
    plan_count SMALLINT,
    inventory_count SMALLINT,
    source_url TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (source, source_id)
);

-- Indexes
CREATE INDEX idx_bmk_communities_builder ON landscape.bmk_builder_communities (builder_name);
CREATE INDEX idx_bmk_communities_market ON landscape.bmk_builder_communities (market_label);
CREATE INDEX idx_bmk_communities_city_state ON landscape.bmk_builder_communities (city, state);
CREATE INDEX idx_bmk_communities_geo ON landscape.bmk_builder_communities (lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX idx_bmk_communities_last_seen ON landscape.bmk_builder_communities (last_seen_at);
```

### 7.2 bmk_builder_plans

```sql
CREATE TABLE IF NOT EXISTS landscape.bmk_builder_plans (
    id SERIAL PRIMARY KEY,
    source VARCHAR(32) NOT NULL,
    source_id VARCHAR(64) NOT NULL,
    community_source_id VARCHAR(64) NOT NULL,
    plan_name VARCHAR(128) NOT NULL,
    series_name VARCHAR(64),
    product_type VARCHAR(32),
    base_price INTEGER,
    sqft_min INTEGER,
    sqft_max INTEGER,
    beds_min SMALLINT,
    beds_max SMALLINT,
    baths_min DECIMAL(3, 1),
    baths_max DECIMAL(3, 1),
    garage_spaces SMALLINT,
    stories SMALLINT,
    source_url TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (source, source_id)
);

-- Indexes
CREATE INDEX idx_bmk_plans_community ON landscape.bmk_builder_plans (source, community_source_id);
CREATE INDEX idx_bmk_plans_product_type ON landscape.bmk_builder_plans (product_type);
CREATE INDEX idx_bmk_plans_base_price ON landscape.bmk_builder_plans (base_price) WHERE base_price IS NOT NULL;
```

### 7.3 bmk_builder_inventory

```sql
CREATE TABLE IF NOT EXISTS landscape.bmk_builder_inventory (
    id SERIAL PRIMARY KEY,
    source VARCHAR(32) NOT NULL,
    source_id VARCHAR(64) NOT NULL,
    community_source_id VARCHAR(64),
    plan_source_id VARCHAR(64),
    address_line1 VARCHAR(256),
    city VARCHAR(64),
    state CHAR(2),
    zip_code VARCHAR(10),
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    status VARCHAR(32),
    price_current INTEGER,
    price_original INTEGER,
    sqft_actual INTEGER,
    beds_actual SMALLINT,
    baths_actual DECIMAL(3, 1),
    lot_sqft INTEGER,
    move_in_date DATE,
    source_url TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (source, source_id)
);

-- Indexes
CREATE INDEX idx_bmk_inventory_community ON landscape.bmk_builder_inventory (source, community_source_id);
CREATE INDEX idx_bmk_inventory_status ON landscape.bmk_builder_inventory (status);
CREATE INDEX idx_bmk_inventory_price ON landscape.bmk_builder_inventory (price_current) WHERE price_current IS NOT NULL;
CREATE INDEX idx_bmk_inventory_geo ON landscape.bmk_builder_inventory (lat, lng) WHERE lat IS NOT NULL;
```

### 7.4 bmk_resale_closings

```sql
CREATE TABLE IF NOT EXISTS landscape.bmk_resale_closings (
    id SERIAL PRIMARY KEY,
    source VARCHAR(32) NOT NULL,
    source_id VARCHAR(64) NOT NULL,
    address_line1 VARCHAR(256),
    city VARCHAR(64),
    state CHAR(2),
    zip_code VARCHAR(10),
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    property_type VARCHAR(32),
    sale_price INTEGER NOT NULL,
    sale_date DATE NOT NULL,
    list_price INTEGER,
    list_date DATE,
    days_on_market SMALLINT,
    sqft INTEGER,
    lot_sqft INTEGER,
    price_per_sqft INTEGER,
    year_built SMALLINT,
    beds SMALLINT,
    baths DECIMAL(3, 1),
    builder_name VARCHAR(128),
    subdivision_name VARCHAR(128),
    source_url TEXT,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (source, source_id)
);

-- Indexes
CREATE INDEX idx_bmk_closings_sale_date ON landscape.bmk_resale_closings (sale_date);
CREATE INDEX idx_bmk_closings_city_state ON landscape.bmk_resale_closings (city, state);
CREATE INDEX idx_bmk_closings_geo ON landscape.bmk_resale_closings (lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX idx_bmk_closings_year_built ON landscape.bmk_resale_closings (year_built) WHERE year_built IS NOT NULL;
CREATE INDEX idx_bmk_closings_property_type ON landscape.bmk_resale_closings (property_type);
CREATE INDEX idx_bmk_closings_price_sqft ON landscape.bmk_resale_closings (price_per_sqft) WHERE price_per_sqft IS NOT NULL;
```

---

## 8. Next Steps

1. **Review this document** - Confirm schemas and refactor plan make sense
2. **Create feature branch** - `git checkout -b feature/ingestion-architecture`
3. **Phase 1 first** - Extract shared infrastructure before touching existing tools
4. **Test incrementally** - Each phase should leave tools functional
5. **Migrate data last** - Only persist to Neon after adapters are stable

---

## Appendix A: File Structure After Refactor

```
backend/tools/
├── common/
│   ├── __init__.py
│   ├── http_client.py          # Shared HttpClient
│   ├── robots.py               # Shared RobotsInfo + fetch_robots
│   ├── logging_setup.py        # Standardized logging
│   ├── config_base.py          # Base config dataclass
│   ├── models.py               # Unified dataclasses
│   ├── persistence.py          # Neon write layer
│   ├── geocoding.py            # Lat/lng enrichment
│   └── adapters/
│       ├── __init__.py
│       ├── redfin_adapter.py   # SfComp → UnifiedResaleClosing
│       ├── lennar_adapter.py   # Lennar → Unified models
│       └── nhs_adapter.py      # NHS → Unified models (stub)
│
├── builder_matrix/
│   └── top20_builders_phx.json
│
├── builder_recon/
│   ├── __init__.py
│   ├── config.py               # Uses common.config_base
│   ├── schemas.py              # BuilderRecon, ReconReport
│   ├── loader.py
│   ├── adapters.py             # Calls LennarSampler directly
│   ├── analysis.py
│   ├── runner.py
│   └── run_builder_recon.py
│
├── lennar_offerings/
│   ├── __init__.py
│   ├── config.py               # Uses common.config_base
│   ├── schemas.py              # Lennar-specific (kept for parser)
│   ├── parser.py
│   ├── analysis.py
│   ├── sampler.py              # Uses common.http_client
│   └── run_lennar_offerings.py
│
└── nhs_recon/
    ├── __init__.py
    ├── config.py               # Uses common.config_base
    ├── schemas.py
    ├── parser.py
    ├── analysis.py
    ├── sampler.py              # Uses common.http_client
    └── run_nhs_recon.py
```

---

## Appendix B: Migration Sequence

| Order | Migration | Description |
|-------|-----------|-------------|
| 1 | `001_create_bmk_builder_communities.sql` | Communities table + indexes |
| 2 | `002_create_bmk_builder_plans.sql` | Plans table + indexes |
| 3 | `003_create_bmk_builder_inventory.sql` | Inventory table + indexes |
| 4 | `004_create_bmk_resale_closings.sql` | Closings table + indexes |

All tables in `landscape` schema. No foreign keys initially (soft references via `source` + `source_id`).
