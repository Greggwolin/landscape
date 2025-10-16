# Landscape Financial Engine - Developer Guide
**Version:** 1.0
**Date:** 2025-10-13
**Status:** Production Ready

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- PostgreSQL client (psql)
- Neon account (for database)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/your-org/landscape.git
cd landscape

# 2. Install dependencies
pnpm install
# or
npm install

# 3. Set up environment variables
cp .env.example .env.local

# Edit .env.local and set:
# DATABASE_URL=postgresql://user:pass@host/land_v2
# NEON_PROJECT_ID=your-project-id
# NEON_API_KEY=your-api-key
```

### Database Setup

```bash
# Run migrations
pnpm db:migrate
# or
./scripts/run-migrations.sh main

# (Optional) Load test fixtures
./scripts/load-fixtures.sh main

# Verify setup
psql $DATABASE_URL -c "SELECT COUNT(*) FROM landscape.tbl_project"
```

### Development Server

```bash
# Start development server
pnpm dev
# or
npm run dev

# Open browser
open http://localhost:3000
```

---

## 📁 Project Structure

```
landscape/
├── .github/
│   └── workflows/              # CI/CD pipelines
│       ├── preview.yml         # PR preview environments
│       ├── cleanup.yml         # PR cleanup
│       ├── production.yml      # Production deployment
│       └── disaster-drill.yml  # Weekly DR tests
│
├── migrations/                 # Database migrations
│   ├── 001_financial_engine_schema.sql
│   ├── 002_dependencies_revenue_finance.sql
│   ├── 002a_fix_dependency_views.sql
│   └── 006_lease_management.sql
│
├── project-docs/              # Documentation
│   ├── DEVOPS_GUIDE.md       # DevOps handbook
│   ├── SCURVE_CALCULATION_ENGINE.md
│   ├── UI_COMPONENTS_PHASE4.md
│   ├── API_REFERENCE_PHASE2.md
│   └── TEST_FIXTURES.md
│
├── scripts/                   # Utility scripts
│   ├── neon-branch-create.sh
│   ├── neon-branch-delete.sh
│   ├── run-migrations.sh
│   ├── load-fixtures.sh
│   ├── rollback-production.sh
│   ├── setup-database-roles.sql
│   └── setup-monitoring.sql
│
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── dependencies/
│   │   │   ├── absorption/
│   │   │   ├── projects/
│   │   │   └── rent-roll/
│   │   │
│   │   ├── components/       # React components
│   │   │   ├── BudgetGridWithDependencies.tsx
│   │   │   ├── DependencyConfigPanel.tsx
│   │   │   └── TimelineVisualization.tsx
│   │   │
│   │   └── market/          # Market intelligence pages
│   │
│   ├── lib/
│   │   └── financial-engine/
│   │       ├── scurve.ts           # S-curve allocation
│   │       ├── lease-calculator.ts  # Lease revenue calc
│   │       └── lease-rollover.ts    # Lease rollover logic
│   │
│   └── types/
│       └── financial-engine.ts      # TypeScript types
│
├── tests/
│   ├── fixtures/             # Test data
│   │   ├── seed-test-data.sql
│   │   └── smoke-test-fixtures.sql
│   │
│   ├── lease-calculator.spec.ts
│   ├── lease-rollover.spec.ts
│   └── setup.ts
│
├── jest.config.ts            # Jest configuration
├── tsconfig.json             # TypeScript config
└── package.json
```

---

## 🔌 API Reference

### Dependencies

#### List Dependencies
```typescript
GET /api/dependencies?project_id={id}
GET /api/dependencies?dependent_item_id={id}&dependent_item_table={table}

Response: {
  success: boolean;
  data: Dependency[];
}
```

#### Create Dependency
```typescript
POST /api/dependencies
Body: {
  dependent_item_type: 'COST' | 'REVENUE' | 'FINANCING';
  dependent_item_table: string;
  dependent_item_id: number;
  trigger_item_type: 'COST' | 'REVENUE' | 'FINANCING';
  trigger_item_table: string;
  trigger_item_id: number;
  trigger_event: 'ABSOLUTE' | 'START' | 'COMPLETE' | 'PCT_COMPLETE';
  trigger_value?: number;
  offset_periods?: number;
  is_hard_dependency?: boolean;
}

Response: {
  success: boolean;
  data: Dependency;
}
```

#### Update Dependency
```typescript
PUT /api/dependencies/{id}
Body: Partial<Dependency>

Response: {
  success: boolean;
  data: Dependency;
}
```

#### Delete Dependency
```typescript
DELETE /api/dependencies/{id}

Response: {
  success: boolean;
  message: string;
}
```

### Timeline Calculation

#### Calculate Timeline (Execute)
```typescript
POST /api/projects/{projectId}/timeline/calculate
Body: {
  dry_run?: boolean;  // Default: false
}

Response: {
  success: boolean;
  data: {
    resolved_count: number;
    resolved: Record<number, number>;  // item_id -> start_period
    errors: string[];
    locked_items: number[];
  }
}
```

#### Preview Timeline (Dry Run)
```typescript
GET /api/projects/{projectId}/timeline/calculate

Response: {
  success: boolean;
  data: {
    preview: Array<{
      budget_item_id: number;
      description: string;
      current_start_period: number;
      calculated_start_period: number;
      will_change: boolean;
    }>;
    errors: string[];
  }
}
```

### Absorption Schedules

#### Create Absorption Schedule
```typescript
POST /api/absorption
Body: {
  project_id: number;
  revenue_stream_name: string;
  start_period?: number;
  periods_to_complete?: number;
  timing_method?: 'ABSOLUTE' | 'DEPENDENT' | 'MANUAL';
  units_per_period?: number;
  total_units?: number;
  base_price_per_unit?: number;
  price_escalation_pct?: number;
}

Response: {
  success: boolean;
  data: AbsorptionSchedule;
}
```

#### List Absorption Schedules
```typescript
GET /api/absorption?project_id={id}

Response: {
  success: boolean;
  data: AbsorptionSchedule[];
}
```

### Lease Management

#### Get Lease Expirations
```typescript
GET /api/rent-roll/expirations?project_id={id}&years={n}

Response: {
  success: boolean;
  data: Array<{
    rent_roll_id: number;
    tenant_name: string;
    lease_end_date: string;
    leased_sf: number;
    annual_rent: number;
    market_rent_psf_annual: number;
    mark_to_market_annual: number;
    expected_rollover_cost: number;
    expected_vacancy_loss: number;
  }>;
  summary: {
    total_sf: number;
    total_annual_rent: number;
    weighted_avg_mark_to_market: number;
    total_expected_rollover_cost: number;
  };
}
```

---

## 📊 Data Contracts

### Core Types

```typescript
// Dependency
interface Dependency {
  dependency_id: number;
  dependent_item_type: 'COST' | 'REVENUE' | 'FINANCING';
  dependent_item_table: string;
  dependent_item_id: number;
  trigger_item_type?: 'COST' | 'REVENUE' | 'FINANCING';
  trigger_item_table?: string;
  trigger_item_id?: number;
  trigger_event: 'ABSOLUTE' | 'START' | 'COMPLETE' | 'PCT_COMPLETE' | 'CUMULATIVE_AMOUNT';
  trigger_value?: number;
  offset_periods: number;
  is_hard_dependency: boolean;
}

// Budget Item
interface BudgetItem {
  budget_item_id: number;
  project_id: number;
  category: string;
  description: string;
  amount: number;
  timing_method: 'ABSOLUTE' | 'DEPENDENT' | 'MANUAL';
  start_period?: number;
  periods_to_complete?: number;
  s_curve_profile?: 'LINEAR' | 'FRONT_LOADED' | 'BACK_LOADED' | 'BELL_CURVE';
}

// Absorption Schedule
interface AbsorptionSchedule {
  absorption_id: number;
  project_id: number;
  revenue_stream_name: string;
  start_period?: number;
  periods_to_complete?: number;
  timing_method?: 'ABSOLUTE' | 'DEPENDENT' | 'MANUAL';
  units_per_period?: number;
  total_units?: number;
  base_price_per_unit?: number;
  price_escalation_pct?: number;
}

// Lease
interface Lease {
  rent_roll_id: number;
  project_id: number;
  tenant_name: string;
  space_type: 'OFFICE' | 'RETAIL' | 'INDUSTRIAL' | 'MEDICAL' | 'FLEX' | 'OTHER';
  lease_start_date: Date;
  lease_end_date: Date;
  lease_term_months: number;
  leased_sf: number;
  base_rent_psf_annual: number;
  escalation_type: 'NONE' | 'FIXED_DOLLAR' | 'FIXED_PERCENT' | 'CPI' | 'STEPPED';
  escalation_value?: number;
  recovery_structure: 'GROSS' | 'NNN' | 'MODIFIED_GROSS' | 'INDUSTRIAL_GROSS';
  has_percentage_rent: boolean;
  percentage_rent_rate?: number;
  percentage_rent_breakpoint?: number;
}
```

---

## 🎯 Conventions

### Period Numbering
- Periods are integers starting at **P0**
- P0 = First period (month 0)
- P23 = Period 23 (month 23)
- Use 0-based indexing consistently

### Monetary Values
- All amounts: `NUMERIC(15,2)` (up to $9,999,999,999,999.99)
- Rates as decimals: `0.08` = 8%, `0.005` = 0.5%
- Currency symbol omitted in database

### Timing Methods
- **ABSOLUTE**: Explicit start_period set by user
- **DEPENDENT**: Calculated from dependencies
- **MANUAL**: User-locked, won't recalculate

### S-Curve Profiles
- **LINEAR**: Equal distribution across periods
- **FRONT_LOADED**: 60% first half, 40% second half
- **BACK_LOADED**: 40% first half, 60% second half
- **BELL_CURVE**: Normal distribution, peaks in middle

### Trigger Events
- **ABSOLUTE**: Trigger at specific period
- **START**: Trigger when item starts
- **COMPLETE**: Trigger when item completes
- **PCT_COMPLETE**: Trigger at % completion
- **CUMULATIVE_AMOUNT**: Trigger at $ amount

---

## 🧪 Testing

### Run Unit Tests
```bash
# All tests
pnpm test

# Specific test file
pnpm test lease-calculator

# With coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```

### Run Smoke Tests
```bash
# Data layer smoke test
psql $DATABASE_URL -f ./tests/data_layer_smoke_test.sql

# Fixture smoke test
psql $DATABASE_URL -f ./tests/fixtures/smoke-test-fixtures.sql
```

### Load Test Fixtures
```bash
# Load Peoria Lakes + Carney Power Center
./scripts/load-fixtures.sh main

# Verify
psql $DATABASE_URL -c "SELECT * FROM landscape.tbl_project WHERE project_id IN (7,8)"
```

---

## 🏗️ Development Workflows

### Creating a New Feature

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Write Tests First (TDD)**
   ```bash
   # Create test file
   touch tests/my-feature.spec.ts

   # Write failing tests
   pnpm test my-feature -- --watch
   ```

3. **Implement Feature**
   - Write implementation
   - Tests should pass
   - Add documentation

4. **Create Migration (if needed)**
   ```bash
   # Create migration file
   touch migrations/007_my_feature.sql

   # Run migration
   ./scripts/run-migrations.sh main
   ```

5. **Create PR**
   ```bash
   git add .
   git commit -m "feat: add my feature"
   git push origin feature/my-feature
   # Create PR on GitHub
   ```

6. **Preview Environment**
   - GitHub Actions automatically creates Neon branch
   - Runs migrations
   - Deploys to Vercel preview
   - Comments PR with preview URL

### Adding a New API Endpoint

1. **Create Route File**
   ```typescript
   // src/app/api/my-endpoint/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { sql } from '@neondatabase/serverless';

   export async function GET(request: NextRequest) {
     try {
       const result = await sql`SELECT * FROM landscape.tbl_my_table`;
       return NextResponse.json({ success: true, data: result });
     } catch (error) {
       return NextResponse.json(
         { success: false, error: error.message },
         { status: 500 }
       );
     }
   }
   ```

2. **Add TypeScript Types**
   ```typescript
   // src/types/financial-engine.ts
   export interface MyType {
     id: number;
     name: string;
   }
   ```

3. **Write Tests**
   ```typescript
   // tests/my-endpoint.spec.ts
   import { GET } from '@/app/api/my-endpoint/route';

   describe('My Endpoint', () => {
     it('should return data', async () => {
       const response = await GET(new NextRequest('http://localhost:3000/api/my-endpoint'));
       const data = await response.json();
       expect(data.success).toBe(true);
     });
   });
   ```

4. **Update API Documentation**
   - Add endpoint to this file
   - Add to API_REFERENCE_PHASE2.md

### Adding a Database Migration

1. **Create Migration File**
   ```bash
   # migrations/007_add_my_table.sql
   CREATE TABLE landscape.tbl_my_table (
     id BIGSERIAL PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Rollback:
   -- DROP TABLE landscape.tbl_my_table;
   ```

2. **Test Locally**
   ```bash
   ./scripts/run-migrations.sh main
   ```

3. **Verify**
   ```bash
   psql $DATABASE_URL -c "\d landscape.tbl_my_table"
   ```

4. **Commit**
   ```bash
   git add migrations/007_add_my_table.sql
   git commit -m "feat: add my_table for feature X"
   ```

---

## 🔍 Debugging

### Enable Query Logging
```sql
-- Show slow queries
SELECT * FROM landscape.vw_slow_queries;

-- Show top queries by time
SELECT * FROM landscape.vw_top_queries_by_time;

-- Show active queries
SELECT * FROM landscape.get_active_queries();
```

### Check Dependency Resolution
```sql
-- View all dependencies for a project
SELECT
  d.dependency_id,
  b1.description AS dependent_item,
  b2.description AS trigger_item,
  d.trigger_event,
  d.offset_periods
FROM landscape.tbl_item_dependency d
JOIN landscape.tbl_budget_items b1 ON d.dependent_item_id = b1.budget_item_id
LEFT JOIN landscape.tbl_budget_items b2 ON d.trigger_item_id = b2.budget_item_id
WHERE b1.project_id = 7;
```

### Check Timeline Calculation
```sql
-- View calculated start periods
SELECT
  budget_item_id,
  description,
  timing_method,
  start_period,
  periods_to_complete
FROM landscape.tbl_budget_items
WHERE project_id = 7
ORDER BY start_period;
```

### Monitor SLO Metrics
```sql
-- Check SLO status
SELECT * FROM landscape.vw_slo_metrics;

-- Check cache hit ratio
SELECT * FROM landscape.get_cache_hit_ratio();
```

---

## 📚 Additional Resources

### Documentation
- [DevOps Guide](project-docs/DEVOPS_GUIDE.md) - CI/CD, deployment, monitoring
- [S-Curve Engine](project-docs/SCURVE_CALCULATION_ENGINE.md) - Timing distribution
- [UI Components](project-docs/UI_COMPONENTS_PHASE4.md) - React components
- [API Reference](project-docs/API_REFERENCE_PHASE2.md) - Complete API docs
- [Test Fixtures](project-docs/TEST_FIXTURES.md) - Test data guide

### External Links
- [Neon Documentation](https://neon.tech/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Material-UI Documentation](https://mui.com/material-ui/getting-started/)

### Support
- GitHub Issues: https://github.com/your-org/landscape/issues
- Internal Wiki: (link to your wiki)
- On-call: Check PagerDuty

---

## 🎓 Onboarding Checklist

### Day 1: Setup
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Set up environment variables
- [ ] Run migrations
- [ ] Load fixtures
- [ ] Start dev server
- [ ] Access http://localhost:3000

### Day 2: Explore
- [ ] Review project structure
- [ ] Read S-Curve documentation
- [ ] Explore UI components
- [ ] Test API endpoints with Postman/curl
- [ ] Run unit tests

### Day 3: Hands-On
- [ ] Load Peoria Lakes fixtures
- [ ] Calculate timeline via API
- [ ] View results in UI
- [ ] Modify a budget item
- [ ] Recalculate timeline

### Week 2: First Contribution
- [ ] Pick a starter issue
- [ ] Create feature branch
- [ ] Write tests
- [ ] Implement feature
- [ ] Create PR
- [ ] Address code review feedback

---

## 🐛 Common Issues

### Issue: "DATABASE_URL not set"
**Solution:** Copy `.env.example` to `.env.local` and set DATABASE_URL

### Issue: "Migration already applied"
**Solution:** Check `landscape._migrations` table for applied migrations

### Issue: "Module not found"
**Solution:** Run `pnpm install` to install dependencies

### Issue: "Port 3000 already in use"
**Solution:** Kill existing process or use different port
```bash
lsof -ti:3000 | xargs kill
# or
PORT=3001 pnpm dev
```

### Issue: "Cannot connect to database"
**Solution:** Verify DATABASE_URL is correct and Neon instance is running

---

*Last Updated: 2025-10-13*
*Maintained by: Engineering Team*
*Questions? Slack: #landscape-dev*
