# Claude Code Implementation Prompt: CPI Auto-Sync to Global Inflation Rate

**Date**: November 3, 2025  
**Session ID**: OQ04  
**Priority**: MEDIUM - Infrastructure enhancement

---

## EXECUTIVE SUMMARY

Implement automated synchronization of trailing 12-month CPI inflation rate from existing `market_data` table to `tbl_project_settings.global_inflation_rate`. This provides a constantly-updated "source of truth" baseline inflation rate while preserving analyst ability to create custom growth rate assumptions.

**Key Innovation**: Leverage existing market data infrastructure (already ingesting BLS CPI-U) rather than building parallel system. Simple bridge job connects market intelligence to project assumptions.

**Strategic Value**: Positions Landscape as data-driven platform with live market benchmarks. Global CPI baseline auto-updates monthly; analysts override when warranted but always see current market context.

---

## PROJECT CONTEXT

**Repository**: https://github.com/Greggwolin/landscape  
**Database**: Neon PostgreSQL (landscape + public schemas)  
**Tech Stack**: React/Next.js, Node.js, PostgreSQL, Vercel hosting

**What's Already Built**:
- ✅ `public.market_data` table with CPIAUCSL time series (BLS Consumer Price Index - All Urban)
- ✅ `/api/market/series` endpoint fetches CPI data
- ✅ `/market` page displays CPI tiles with live visualization
- ✅ `landscape.tbl_project_settings.global_inflation_rate` field (default: 0.03)
- ✅ `landscape.tbl_assumptionrule` for custom growth rate assumptions
- ✅ GrowthRates.tsx component (Materio theme, expandable assumptions cards)

**What's NOT Built** (The Gap This Prompt Closes):
- ❌ Sync job that calculates T-12 CPI from market_data
- ❌ Auto-update mechanism for global_inflation_rate
- ❌ Project-level control flag (use auto-CPI vs manual override)
- ❌ UI display of CPI baseline in GrowthRates component
- ❌ API endpoint for CPI baseline metadata

---

## IMPLEMENTATION REQUIREMENTS

### 1. DATABASE SCHEMA ADDITIONS

**Purpose**: Add project-level control for CPI auto-sync behavior

```sql
-- Add to landscape.tbl_project_settings
ALTER TABLE landscape.tbl_project_settings 
ADD COLUMN IF NOT EXISTS use_auto_cpi BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_cpi_sync_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS cpi_series_id VARCHAR(50) DEFAULT 'CPIAUCSL';

COMMENT ON COLUMN tbl_project_settings.use_auto_cpi IS 
  'When true, global_inflation_rate syncs automatically from market_data CPI on monthly schedule';
  
COMMENT ON COLUMN tbl_project_settings.last_cpi_sync_date IS 
  'Timestamp of most recent CPI sync - tracks data currency';

COMMENT ON COLUMN tbl_project_settings.cpi_series_id IS 
  'Which BLS series to use for auto-sync (default CPIAUCSL = CPI-U Seasonally Adjusted)';
```

**Create view for CPI calculation**:

```sql
-- Reusable view for current T-12 CPI inflation rate
CREATE OR REPLACE VIEW landscape.v_current_cpi_inflation AS
WITH ranked_cpi AS (
  SELECT 
    series_id,
    observation_date,
    value as index_value,
    LAG(value, 12) OVER (PARTITION BY series_id ORDER BY observation_date) as prior_year_value,
    ROW_NUMBER() OVER (PARTITION BY series_id ORDER BY observation_date DESC) as rn
  FROM public.market_data
  WHERE series_id = 'CPIAUCSL'
    AND observation_date >= CURRENT_DATE - INTERVAL '13 months'
)
SELECT 
  series_id,
  observation_date as latest_observation_date,
  index_value as current_index,
  prior_year_value,
  ROUND(
    ((index_value / NULLIF(prior_year_value, 0)) - 1) * 100, 
    2
  ) as trailing_12mo_pct_change,
  ROUND(
    ((index_value / NULLIF(prior_year_value, 0)) - 1), 
    4
  ) as trailing_12mo_decimal
FROM ranked_cpi
WHERE rn = 1 
  AND prior_year_value IS NOT NULL;

COMMENT ON VIEW landscape.v_current_cpi_inflation IS 
  'Calculates trailing 12-month CPI inflation rate from market_data. Returns single row with current rate.';
```

**Test the view**:
```sql
-- Should return current T-12 CPI rate
SELECT * FROM landscape.v_current_cpi_inflation;

-- Expected output example:
-- series_id | latest_observation_date | current_index | prior_year_value | trailing_12mo_pct_change | trailing_12mo_decimal
-- CPIAUCSL  | 2025-10-01             | 318.7         | 311.2            | 2.41                     | 0.0241
```

---

### 2. API ENDPOINTS

#### 2.1 GET /api/assumptions/cpi-baseline

**Purpose**: Fetch current CPI baseline for UI display

**File**: `src/app/api/assumptions/cpi-baseline/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await sql`
      SELECT 
        series_id,
        latest_observation_date,
        trailing_12mo_pct_change as rate_pct,
        trailing_12mo_decimal as rate_decimal
      FROM landscape.v_current_cpi_inflation
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No CPI data available. Market data may not be populated.' },
        { status: 404 }
      );
    }

    const cpiData = result[0];

    return NextResponse.json({
      rate: cpiData.rate_pct,
      rateDecimal: cpiData.rate_decimal,
      asOf: cpiData.latest_observation_date,
      source: 'BLS CPI-U (CPIAUCSL)',
      seriesId: cpiData.series_id,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching CPI baseline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CPI baseline', details: error.message },
      { status: 500 }
    );
  }
}
```

**Response Schema**:
```typescript
interface CPIBaselineResponse {
  rate: number;           // Percentage (e.g., 2.41)
  rateDecimal: number;    // Decimal (e.g., 0.0241)
  asOf: string;           // ISO date string
  source: string;         // "BLS CPI-U (CPIAUCSL)"
  seriesId: string;       // "CPIAUCSL"
  updatedAt: string;      // ISO timestamp
}
```

#### 2.2 POST /api/cron/sync-cpi-to-settings

**Purpose**: Automated job to sync CPI to project settings (called by Vercel Cron)

**File**: `src/app/api/cron/sync-cpi-to-settings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Verify authorization (Vercel Cron secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get current T-12 CPI rate from view
    const cpiResult = await sql`
      SELECT 
        trailing_12mo_decimal as rate,
        latest_observation_date as observation_date
      FROM landscape.v_current_cpi_inflation
    `;

    if (cpiResult.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No CPI data available',
          message: 'market_data table may not have sufficient historical CPI data (need 13+ months)'
        },
        { status: 400 }
      );
    }

    const { rate, observation_date } = cpiResult[0];

    // 2. Update all projects where use_auto_cpi = true
    const updateResult = await sql`
      UPDATE landscape.tbl_project_settings
      SET 
        global_inflation_rate = ${rate},
        last_cpi_sync_date = NOW(),
        updated_at = NOW()
      WHERE use_auto_cpi = true
      RETURNING project_id, global_inflation_rate
    `;

    const projectCount = updateResult.length;

    // 3. Log sync event (optional: add audit table if needed)
    console.log(`[CPI Sync] Updated ${projectCount} projects to ${(rate * 100).toFixed(2)}% (${observation_date})`);

    return NextResponse.json({
      success: true,
      rate: (rate * 100).toFixed(2), // Return as percentage
      rateDecimal: rate,
      asOf: observation_date,
      projectsUpdated: projectCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CPI Sync] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'CPI sync failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Support POST method as well (for manual triggers from UI)
export async function POST(request: NextRequest) {
  return GET(request);
}
```

---

### 3. VERCEL CRON CONFIGURATION

**Purpose**: Schedule monthly CPI sync automatically

**File**: `vercel.json` (in project root)

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-cpi-to-settings",
      "schedule": "0 12 15 * *"
    }
  ]
}
```

**Schedule Explanation**:
- `0 12 15 * *` = 12:00 PM UTC on the 15th of every month
- BLS releases CPI data mid-month for previous month
- Running on 15th ensures latest data is available

**Environment Variable Required**:
```env
# Add to .env.local and Vercel environment variables
CRON_SECRET=your-secure-random-string-here
```

**Generate secret**:
```bash
# Use openssl or any secure random generator
openssl rand -base64 32
```

---

### 4. UI ENHANCEMENTS - GrowthRates Component

**Purpose**: Display CPI baseline and allow one-click adoption

**File**: `src/app/components/GrowthRates.tsx`

#### 4.1 Add CPI Baseline State

```typescript
// Add to component state
const [cpiBaseline, setCpiBaseline] = useState<{
  rate: number;
  rateDecimal: number;
  asOf: string;
  source: string;
  loading: boolean;
  error: string | null;
}>({
  rate: 0,
  rateDecimal: 0,
  asOf: '',
  source: '',
  loading: true,
  error: null
});
```

#### 4.2 Fetch CPI on Mount

```typescript
// Add useEffect to fetch CPI baseline
useEffect(() => {
  const fetchCPIBaseline = async () => {
    try {
      const response = await fetch('/api/assumptions/cpi-baseline');
      if (!response.ok) {
        throw new Error('Failed to fetch CPI baseline');
      }
      const data = await response.json();
      setCpiBaseline({
        rate: data.rate,
        rateDecimal: data.rateDecimal,
        asOf: data.asOf,
        source: data.source,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching CPI baseline:', error);
      setCpiBaseline(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  fetchCPIBaseline();
}, []);
```

#### 4.3 Add CPI Baseline Card Component

```tsx
// Add above growth rate assumption cards
const CPIBaselineCard = () => {
  if (cpiBaseline.loading) {
    return (
      <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Loading CPI baseline...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (cpiBaseline.error) {
    return (
      <Card sx={{ mb: 3, bgcolor: 'error.lighter', borderColor: 'error.main' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <WarningIcon color="error" />
            <Typography variant="body2" color="error.main">
              Unable to load CPI baseline: {cpiBaseline.error}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3, bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.main' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
              Market Baseline (Auto-Updated Monthly)
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}>
              <Typography variant="h3" color="info.main" sx={{ fontWeight: 700 }}>
                {cpiBaseline.rate.toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                trailing 12-month
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              As of {new Date(cpiBaseline.asOf).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })} • {cpiBaseline.source}
            </Typography>
          </Box>
          
          <Stack spacing={1} alignItems="flex-end">
            <Tooltip title="Apply this rate to all Development Costs assumptions">
              <Button 
                variant="outlined" 
                color="info"
                size="small"
                onClick={() => handleApplyCPIBaseline('development_costs')}
                startIcon={<TrendingUpIcon />}
              >
                Use for Dev Costs
              </Button>
            </Tooltip>
            <Tooltip title="View detailed CPI trends on Market page">
              <Button 
                variant="text" 
                color="info"
                size="small"
                onClick={() => router.push('/market')}
                endIcon={<OpenInNewIcon />}
              >
                View Market Data
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
```

#### 4.4 Add Handler for "Use CPI" Button

```typescript
const handleApplyCPIBaseline = (assumptionCategory: string) => {
  // Find the assumption to update
  const targetAssumption = assumptions.find(a => 
    a.name.toLowerCase().includes(assumptionCategory.replace('_', ' '))
  );

  if (!targetAssumption) return;

  // Update global rate to CPI baseline
  const updatedAssumptions = assumptions.map(assumption => {
    if (assumption.id === targetAssumption.id) {
      return {
        ...assumption,
        globalRate: `${cpiBaseline.rate.toFixed(2)}%`,
        // Optionally update all steps to use this rate
        steps: assumption.steps.map(step => ({
          ...step,
          rate: `${cpiBaseline.rate.toFixed(2)}%`
        }))
      };
    }
    return assumption;
  });

  setAssumptions(updatedAssumptions);

  // Persist to database
  handleSaveGrowthRates(updatedAssumptions);

  // Show success feedback
  setSnackbar({
    open: true,
    message: `Applied CPI baseline (${cpiBaseline.rate.toFixed(2)}%) to ${targetAssumption.name}`,
    severity: 'success'
  });
};
```

#### 4.5 Render in Component

```tsx
return (
  <ThemeProvider theme={materioTheme}>
    <Stack spacing={3} sx={{ p: 3 }}>
      {/* Page Header */}
      <Typography variant="h4">Growth Rates & Inflation</Typography>
      
      {/* CPI Baseline Card - NEW */}
      <CPIBaselineCard />
      
      {/* Existing Growth Rate Cards */}
      {assumptions.map(assumption => (
        <GrowthRateCard key={assumption.id} assumption={assumption} />
      ))}
      
      {/* Existing Land Pricing Card */}
      <LandPricingCard />
    </Stack>
  </ThemeProvider>
);
```

---

### 5. TESTING & VALIDATION

#### 5.1 Manual Test CPI Fetch

```bash
# Test CPI baseline API
curl http://localhost:3000/api/assumptions/cpi-baseline

# Expected response:
# {
#   "rate": 2.41,
#   "rateDecimal": 0.0241,
#   "asOf": "2025-10-01T00:00:00.000Z",
#   "source": "BLS CPI-U (CPIAUCSL)",
#   "seriesId": "CPIAUCSL",
#   "updatedAt": "2025-11-03T..."
# }
```

#### 5.2 Manual Trigger Sync Job

```bash
# Test cron endpoint (use your actual CRON_SECRET)
curl -X GET http://localhost:3000/api/cron/sync-cpi-to-settings \
  -H "Authorization: Bearer your-cron-secret-here"

# Expected response:
# {
#   "success": true,
#   "rate": "2.41",
#   "rateDecimal": 0.0241,
#   "asOf": "2025-10-01T00:00:00.000Z",
#   "projectsUpdated": 12,
#   "timestamp": "2025-11-03T..."
# }
```

#### 5.3 Verify Database Updates

```sql
-- Check project settings after sync
SELECT 
  project_id,
  global_inflation_rate,
  last_cpi_sync_date,
  use_auto_cpi
FROM landscape.tbl_project_settings
ORDER BY project_id;

-- Verify CPI view calculation
SELECT * FROM landscape.v_current_cpi_inflation;
```

#### 5.4 UI Testing Checklist

- [ ] CPI baseline card displays on /growthrates page
- [ ] Rate matches value from API endpoint
- [ ] "Use for Dev Costs" button updates assumption
- [ ] Save persists updated rate to database
- [ ] "View Market Data" link navigates to /market page
- [ ] Loading state displays briefly on mount
- [ ] Error state displays if API fails
- [ ] CPI baseline updates after manual cron trigger

---

### 6. DEPLOYMENT CHECKLIST

#### 6.1 Environment Variables

```bash
# Add to Vercel project settings
CRON_SECRET=<your-secure-random-string>
```

#### 6.2 Database Migration

```sql
-- Run against Neon database
ALTER TABLE landscape.tbl_project_settings 
ADD COLUMN IF NOT EXISTS use_auto_cpi BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_cpi_sync_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS cpi_series_id VARCHAR(50) DEFAULT 'CPIAUCSL';

-- Create view
CREATE OR REPLACE VIEW landscape.v_current_cpi_inflation AS
-- (full SQL from section 1)
```

#### 6.3 Vercel Cron Configuration

- [ ] Add `vercel.json` to project root
- [ ] Verify cron schedule syntax
- [ ] Deploy to production
- [ ] Check Vercel dashboard → Project → Cron Jobs tab
- [ ] Verify job appears with correct schedule

#### 6.4 Initial Data Backfill

```bash
# Trigger first sync manually after deployment
curl -X POST https://landscape.app/api/cron/sync-cpi-to-settings \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## ACCEPTANCE CRITERIA

### Must Have
- [x] Database view `v_current_cpi_inflation` calculates T-12 rate from market_data
- [x] API endpoint `/api/assumptions/cpi-baseline` returns current CPI
- [x] Cron endpoint `/api/cron/sync-cpi-to-settings` updates project settings
- [x] Vercel Cron job configured to run monthly (15th at 12pm UTC)
- [x] GrowthRates UI displays CPI baseline card with current rate
- [x] "Use CPI" button applies baseline to assumptions
- [x] Project settings flag `use_auto_cpi` controls sync behavior
- [x] All projects with `use_auto_cpi=true` update on cron run

### Should Have
- [ ] Error handling for missing/insufficient CPI data
- [ ] Loading states during API calls
- [ ] Success/error snackbar notifications
- [ ] Link from CPI card to /market page for details
- [ ] Audit log of CPI sync events (optional enhancement)

### Edge Cases
- [x] Handle insufficient historical data (< 13 months CPI)
- [x] Prevent division by zero in rate calculation
- [x] Verify cron authorization (reject unauthorized calls)
- [x] Handle projects with `use_auto_cpi=false` (skip updates)
- [x] Graceful degradation if market_data is empty

---

## FUTURE ENHANCEMENTS

### Phase 2: Multi-Series Support
- Allow projects to choose CPI series (CPIAUCSL vs CPIAUCNS vs Core CPI)
- Support regional CPI (West, Midwest, South, Northeast)
- Store series selection in `tbl_project_settings.cpi_series_id`

### Phase 3: Historical Tracking
- Add `landscape.tbl_cpi_sync_history` audit table
- Track sync events, rates applied, projects affected
- Enable "revert to previous baseline" functionality

### Phase 4: Advanced Controls
- Per-project sync frequency (monthly vs quarterly)
- Manual override protection (flag assumptions as "locked")
- Notification system when CPI changes significantly (> 0.5% delta)

---

## CODEX IMPLEMENTATION NOTES

### File Creation Order
1. Database migration SQL (run against Neon first)
2. `/api/assumptions/cpi-baseline/route.ts`
3. `/api/cron/sync-cpi-to-settings/route.ts`
4. Update `GrowthRates.tsx` with CPI baseline card
5. Add `vercel.json` cron configuration

### Testing Strategy
- Unit test CPI view SQL (verify T-12 calculation logic)
- Integration test API endpoints (mock market_data rows)
- E2E test full sync flow (trigger cron → verify DB updates)
- UI test CPI baseline card rendering and interactions

### Migration Safety
- Use `ADD COLUMN IF NOT EXISTS` for idempotency
- Default `use_auto_cpi=true` for new projects
- Existing projects opt-in (manual column update if needed)
- View creation is `OR REPLACE` safe

### Performance Considerations
- CPI view query is efficient (LAG window function, limited to 13 months)
- Cron job updates only projects with `use_auto_cpi=true` (indexed filter)
- API endpoint returns cached view result (no complex calculations)

---

## REFERENCES

**Related Project Files**:
- `src/app/market/page.tsx` - Existing CPI visualization
- `src/app/api/market/series/route.ts` - Market data API
- `public.market_data` table - Source of CPI time series
- `landscape.tbl_project_settings` - Target for sync
- `landscape.tbl_assumptionrule` - Custom growth rate assumptions

**External Documentation**:
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [BLS CPI-U Series (CPIAUCSL)](https://fred.stlouisfed.org/series/CPIAUCSL)
- [PostgreSQL Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html)

---

**Session ID**: OQ04  
**Implementation Target**: November 2025  
**Estimated Effort**: 4-6 hours (database + API + UI + testing)
