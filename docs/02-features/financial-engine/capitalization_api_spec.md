# Capitalization Tab API Specification

**Session ID:** JW22  
**Date:** October 23, 2025  
**Status:** Ready for Backend Implementation

---

## ENDPOINT SUMMARY

### Debt Facilities
- `GET /api/capitalization/debt?projectId=11` - List all debt facilities
- `POST /api/capitalization/debt` - Create new debt facility
- `PATCH /api/capitalization/debt/:facility_id` - Update debt facility
- `DELETE /api/capitalization/debt/:facility_id` - Delete debt facility

### Equity Structure
- `GET /api/capitalization/equity?projectId=11` - List all equity tranches
- `POST /api/capitalization/equity` - Create new equity tranche
- `PATCH /api/capitalization/equity/:tranche_id` - Update equity tranche
- `DELETE /api/capitalization/equity/:tranche_id` - Delete equity tranche

### Waterfall Tiers
- `GET /api/capitalization/waterfall?projectId=11` - List all waterfall tiers
- `POST /api/capitalization/waterfall` - Create new waterfall tier
- `PATCH /api/capitalization/waterfall/:tier_id` - Update waterfall tier
- `DELETE /api/capitalization/waterfall/:tier_id` - Delete waterfall tier
- `PATCH /api/capitalization/waterfall/:tier_id/toggle` - Toggle tier active status

### Draw Schedule
- `GET /api/capitalization/draws?projectId=11` - List all draw schedule items
- `POST /api/capitalization/draws` - Create new draw
- `PATCH /api/capitalization/draws/:draw_id` - Update draw
- `DELETE /api/capitalization/draws/:draw_id` - Delete draw

### Summary Metrics
- `GET /api/capitalization/summary?projectId=11` - Get capitalization summary metrics

---

## DATABASE TABLES (Already Exist)

### tbl_debt_facility
```sql
CREATE TABLE tbl_debt_facility (
    debt_facility_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES tbl_project(project_id) NOT NULL,
    
    -- Basic fields (always visible)
    facility_name VARCHAR(200) NOT NULL,
    loan_amount NUMERIC(15,2) NOT NULL,
    interest_rate_pct NUMERIC(6,3) NOT NULL,
    amortization_years INTEGER,
    loan_term_years INTEGER NOT NULL,
    ltv_pct NUMERIC(5,2),
    dscr NUMERIC(5,3),
    
    -- Standard fields
    is_construction_loan BOOLEAN DEFAULT FALSE,
    guarantee_type VARCHAR(50), -- Recourse, Non-recourse, Carve-out
    
    -- Advanced fields
    loan_covenant_dscr_min NUMERIC(5,3),
    loan_covenant_ltv_max NUMERIC(5,2),
    prepayment_penalty_years INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### tbl_equity (Partner/Tranche table)
```sql
CREATE TABLE tbl_equity (
    partner_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES tbl_project(project_id) NOT NULL,
    
    -- Basic fields
    tranche_name VARCHAR(200) NOT NULL,
    partner_type VARCHAR(10) NOT NULL, -- LP or GP
    ownership_pct NUMERIC(5,2) NOT NULL,
    preferred_return_pct NUMERIC(6,3),
    capital_contributed NUMERIC(15,2),
    
    -- Standard fields
    promote_pct NUMERIC(5,2), -- GP promote percentage
    catch_up_pct NUMERIC(5,2), -- GP catch-up percentage
    
    -- Advanced fields
    irr_target_pct NUMERIC(6,3),
    equity_multiple_target NUMERIC(5,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### tbl_waterfall_tier (Needs to be created)
```sql
CREATE TABLE tbl_waterfall_tier (
    tier_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES tbl_project(project_id) NOT NULL,
    
    tier_number INTEGER NOT NULL,
    tier_name VARCHAR(200) NOT NULL,
    
    -- Threshold conditions
    irr_threshold_pct NUMERIC(6,3),
    equity_multiple_threshold NUMERIC(5,2),
    
    -- Distribution splits
    lp_split_pct NUMERIC(5,2) NOT NULL,
    gp_split_pct NUMERIC(5,2) NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_splits_total_100 CHECK (lp_split_pct + gp_split_pct = 100)
);

CREATE INDEX idx_waterfall_project ON tbl_waterfall_tier(project_id);
CREATE INDEX idx_waterfall_active ON tbl_waterfall_tier(project_id, is_active) WHERE is_active = TRUE;
```

### tbl_debt_draw_schedule (Needs to be created)
```sql
CREATE TABLE tbl_debt_draw_schedule (
    draw_id BIGSERIAL PRIMARY KEY,
    debt_facility_id BIGINT REFERENCES tbl_debt_facility(debt_facility_id) NOT NULL,
    project_id BIGINT REFERENCES tbl_project(project_id) NOT NULL,
    period_id BIGINT REFERENCES tbl_calculation_period(period_id),
    
    draw_amount NUMERIC(12,2) NOT NULL,
    draw_date DATE NOT NULL,
    draw_purpose VARCHAR(200),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_draw_facility ON tbl_debt_draw_schedule(debt_facility_id);
CREATE INDEX idx_draw_project ON tbl_debt_draw_schedule(project_id);
CREATE INDEX idx_draw_date ON tbl_debt_draw_schedule(draw_date);
```

---

## API ENDPOINT DETAILS

### GET /api/capitalization/debt
**Purpose:** Retrieve all debt facilities for a project

**Query Parameters:**
- `projectId` (required): Project ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "facility_id": 1,
      "project_id": 11,
      "facility_name": "Construction Loan",
      "loan_amount": 10500000,
      "interest_rate_pct": 5.75,
      "amortization_years": 30,
      "loan_term_years": 10,
      "ltv_pct": 70,
      "dscr": 1.25,
      "is_construction_loan": true,
      "guarantee_type": "Recourse",
      "loan_covenant_dscr_min": 1.20,
      "loan_covenant_ltv_max": 75,
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    }
  ]
}
```

---

### POST /api/capitalization/debt
**Purpose:** Create a new debt facility

**Request Body:**
```json
{
  "project_id": 11,
  "facility_name": "Permanent Loan",
  "loan_amount": 12000000,
  "interest_rate_pct": 4.50,
  "amortization_years": 30,
  "loan_term_years": 10,
  "ltv_pct": 65,
  "dscr": 1.30,
  "is_construction_loan": false,
  "guarantee_type": "Non-recourse"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "facility_id": 2,
    "project_id": 11,
    "facility_name": "Permanent Loan",
    ...
  },
  "message": "Debt facility created successfully"
}
```

---

### GET /api/capitalization/equity
**Purpose:** Retrieve all equity tranches for a project

**Query Parameters:**
- `projectId` (required): Project ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "tranche_id": 1,
      "project_id": 11,
      "tranche_name": "Limited Partner",
      "partner_type": "LP",
      "ownership_pct": 90,
      "preferred_return_pct": 8,
      "capital_contributed": 4500000,
      "irr_target_pct": 15,
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    },
    {
      "tranche_id": 2,
      "project_id": 11,
      "tranche_name": "General Partner",
      "partner_type": "GP",
      "ownership_pct": 10,
      "preferred_return_pct": 8,
      "capital_contributed": 0,
      "promote_pct": 20,
      "catch_up_pct": 50,
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    }
  ]
}
```

---

### GET /api/capitalization/waterfall
**Purpose:** Retrieve all waterfall tiers for a project

**Query Parameters:**
- `projectId` (required): Project ID
- `active_only` (optional): Boolean to filter only active tiers

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "tier_id": 1,
      "project_id": 11,
      "tier_number": 1,
      "tier_name": "Return of Capital",
      "irr_threshold_pct": null,
      "equity_multiple_threshold": null,
      "lp_split_pct": 90,
      "gp_split_pct": 10,
      "is_active": true,
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    },
    {
      "tier_id": 2,
      "project_id": 11,
      "tier_number": 2,
      "tier_name": "Preferred Return (8%)",
      "irr_threshold_pct": 8,
      "equity_multiple_threshold": null,
      "lp_split_pct": 90,
      "gp_split_pct": 10,
      "is_active": true,
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    },
    {
      "tier_id": 3,
      "project_id": 11,
      "tier_number": 3,
      "tier_name": "GP Catch-Up",
      "irr_threshold_pct": 10,
      "equity_multiple_threshold": null,
      "lp_split_pct": 50,
      "gp_split_pct": 50,
      "is_active": false,
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    },
    {
      "tier_id": 4,
      "project_id": 11,
      "tier_number": 4,
      "tier_name": "Promote (80/20 Split)",
      "irr_threshold_pct": 15,
      "equity_multiple_threshold": null,
      "lp_split_pct": 80,
      "gp_split_pct": 20,
      "is_active": true,
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    }
  ]
}
```

---

### GET /api/capitalization/draws
**Purpose:** Retrieve draw schedule for a debt facility

**Query Parameters:**
- `projectId` (required): Project ID
- `facility_id` (optional): Filter by specific debt facility

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "draw_id": 1,
      "debt_facility_id": 1,
      "project_id": 11,
      "period_id": 1,
      "period_name": "Month 1",
      "draw_amount": 2000000,
      "draw_purpose": "Acquisition",
      "draw_date": "2025-01-15",
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    },
    {
      "draw_id": 2,
      "debt_facility_id": 1,
      "project_id": 11,
      "period_id": 3,
      "period_name": "Month 3",
      "draw_amount": 1500000,
      "draw_purpose": "Renovations",
      "draw_date": "2025-03-15",
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    }
  ],
  "summary": {
    "total_commitment": 10500000,
    "total_drawn": 3500000,
    "remaining_capacity": 7000000
  }
}
```

---

### GET /api/capitalization/summary
**Purpose:** Get high-level capitalization metrics for a project

**Query Parameters:**
- `projectId` (required): Project ID

**Response:**
```json
{
  "success": true,
  "data": {
    "project_id": 11,
    "total_capitalization": 15000000,
    "total_debt": 10500000,
    "total_equity": 4500000,
    "leverage_ratio_pct": 70,
    "debt_facilities_count": 1,
    "equity_tranches_count": 2,
    "waterfall_tiers_count": 4,
    "waterfall_active_tiers_count": 3,
    "weighted_avg_interest_rate": 5.75,
    "blended_ltv": 70,
    "preferred_return_pct": 8,
    "gp_promote_pct": 20
  }
}
```

---

## CALCULATION LOGIC

### Leverage Ratio
```
Leverage Ratio = (Total Debt / Total Capitalization) × 100
```

### Weighted Average Interest Rate
```
Weighted Avg Rate = Σ(Loan Amount × Interest Rate) / Total Debt
```

### Cumulative Draws
```
For each draw in schedule:
  Cumulative Draw[i] = Σ(Draw Amount[0..i])
```

### Waterfall Distribution (simplified)
```
1. Return of Capital: Return LP + GP capital contributed (90/10 split)
2. Preferred Return: Pay 8% annual return on unreturned capital (90/10 split)
3. GP Catch-Up: Pay GP until they reach 20% of total distributions (50/50 split)
4. Promote: Remaining distributions split 80/20 (LP/GP)
```

---

## VALIDATION RULES

### Debt Facility
- `loan_amount` > 0
- `interest_rate_pct` > 0 and < 20
- `loan_term_years` > 0
- `ltv_pct` between 0 and 100
- `dscr` > 0

### Equity Tranche
- `ownership_pct` between 0 and 100
- Sum of all ownership_pct for project = 100
- `preferred_return_pct` >= 0
- `capital_contributed` >= 0

### Waterfall Tier
- `lp_split_pct` + `gp_split_pct` = 100
- `tier_number` must be sequential
- Cannot delete tier if referenced by distributions

### Draw Schedule
- `draw_amount` > 0
- `draw_date` must be valid date
- Sum of all draws cannot exceed loan_amount

---

## MIGRATION SCRIPT

```sql
-- Migration: Create tbl_waterfall_tier and tbl_debt_draw_schedule
-- Date: 2025-10-23

BEGIN;

CREATE TABLE tbl_waterfall_tier (
    tier_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES tbl_project(project_id) NOT NULL,
    
    tier_number INTEGER NOT NULL,
    tier_name VARCHAR(200) NOT NULL,
    
    irr_threshold_pct NUMERIC(6,3),
    equity_multiple_threshold NUMERIC(5,2),
    
    lp_split_pct NUMERIC(5,2) NOT NULL,
    gp_split_pct NUMERIC(5,2) NOT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_splits_total_100 CHECK (lp_split_pct + gp_split_pct = 100)
);

CREATE INDEX idx_waterfall_project ON tbl_waterfall_tier(project_id);
CREATE INDEX idx_waterfall_active ON tbl_waterfall_tier(project_id, is_active) WHERE is_active = TRUE;

CREATE TABLE tbl_debt_draw_schedule (
    draw_id BIGSERIAL PRIMARY KEY,
    debt_facility_id BIGINT REFERENCES tbl_debt_facility(debt_facility_id) NOT NULL,
    project_id BIGINT REFERENCES tbl_project(project_id) NOT NULL,
    period_id BIGINT REFERENCES tbl_calculation_period(period_id),
    
    draw_amount NUMERIC(12,2) NOT NULL,
    draw_date DATE NOT NULL,
    draw_purpose VARCHAR(200),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_draw_facility ON tbl_debt_draw_schedule(debt_facility_id);
CREATE INDEX idx_draw_project ON tbl_debt_draw_schedule(project_id);
CREATE INDEX idx_draw_date ON tbl_debt_draw_schedule(draw_date);

-- Insert default waterfall tiers for Project 11
INSERT INTO tbl_waterfall_tier (project_id, tier_number, tier_name, lp_split_pct, gp_split_pct, is_active)
VALUES 
  (11, 1, 'Return of Capital', 90, 10, true),
  (11, 2, 'Preferred Return (8%)', 90, 10, true),
  (11, 3, 'GP Catch-Up', 50, 50, false),
  (11, 4, 'Promote (80/20 Split)', 80, 20, true);

UPDATE tbl_waterfall_tier 
SET irr_threshold_pct = 8 
WHERE project_id = 11 AND tier_number = 2;

UPDATE tbl_waterfall_tier 
SET irr_threshold_pct = 10 
WHERE project_id = 11 AND tier_number = 3;

UPDATE tbl_waterfall_tier 
SET irr_threshold_pct = 15 
WHERE project_id = 11 AND tier_number = 4;

-- Insert sample draw schedule for Project 11
INSERT INTO tbl_debt_draw_schedule (debt_facility_id, project_id, draw_amount, draw_date, draw_purpose)
VALUES 
  (1, 11, 2000000, '2025-01-15', 'Acquisition'),
  (1, 11, 1500000, '2025-03-15', 'Renovations'),
  (1, 11, 1000000, '2025-06-15', 'Lease-up');

COMMIT;
```

---

## TESTING CHECKLIST

- [ ] GET all debt facilities returns correct data
- [ ] POST new debt facility with validation
- [ ] PATCH debt facility updates correctly
- [ ] DELETE debt facility cascades to draw schedule
- [ ] GET equity tranches with ownership totals
- [ ] POST equity validates ownership % totals 100
- [ ] GET waterfall tiers ordered by tier_number
- [ ] PATCH waterfall tier toggle active status
- [ ] GET draw schedule with cumulative amounts
- [ ] POST draw validates against loan commitment
- [ ] GET summary calculates metrics correctly
- [ ] Mode switching shows/hides appropriate fields

---

## NEXT STEPS

1. Run migration script to create `tbl_waterfall_tier` and `tbl_debt_draw_schedule`
2. Implement API endpoints in Express/Node.js
3. Connect React component to live endpoints
4. Add form validation and error handling
5. Implement CRUD operations for all entities
6. Add calculation engine for waterfall distributions
7. Integrate with cash flow engine for interest calculations

**Session ID:** JW22
