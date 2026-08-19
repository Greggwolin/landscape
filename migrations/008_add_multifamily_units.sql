-- Migration 008: Add multifamily unit-level tracking
-- Description: Comprehensive unit-level tracking for multifamily properties including
--              units, leases, turns, and unit types with performance views

-- ============================================================================
-- TABLE 1: landscape.tbl_multifamily_unit
-- Purpose: Core unit inventory with physical characteristics and renovation tracking
-- ============================================================================

CREATE TABLE landscape.tbl_multifamily_unit (
    unit_id SERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id),
    unit_number VARCHAR(50) NOT NULL,
    building_name VARCHAR(100),
    unit_type VARCHAR(50) NOT NULL,
    bedrooms NUMERIC(3,1),
    bathrooms NUMERIC(3,1),
    square_feet INTEGER NOT NULL,
    market_rent NUMERIC(10,2),
    renovation_status VARCHAR(50) DEFAULT 'ORIGINAL',
    renovation_date DATE,
    renovation_cost NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_unit_project_number UNIQUE(project_id, unit_number),
    CONSTRAINT chk_unit_type CHECK (unit_type IN ('Studio', '1BR', '2BR', '3BR', '4BR', 'Penthouse')),
    CONSTRAINT chk_renovation_status CHECK (renovation_status IN ('ORIGINAL', 'RENOVATED', 'IN_PROGRESS', 'PLANNED'))
);

CREATE INDEX idx_multifamily_unit_project ON landscape.tbl_multifamily_unit(project_id);
CREATE INDEX idx_multifamily_unit_type ON landscape.tbl_multifamily_unit(unit_type);
CREATE INDEX idx_multifamily_unit_building ON landscape.tbl_multifamily_unit(building_name);
CREATE INDEX idx_multifamily_unit_renovation_status ON landscape.tbl_multifamily_unit(renovation_status);

COMMENT ON TABLE landscape.tbl_multifamily_unit IS 'Unit-level inventory for multifamily properties with physical characteristics and renovation tracking';
COMMENT ON COLUMN landscape.tbl_multifamily_unit.unit_number IS 'Unit identifier (e.g., 101, 2A, etc.)';
COMMENT ON COLUMN landscape.tbl_multifamily_unit.unit_type IS 'Bedroom configuration: Studio, 1BR, 2BR, 3BR, 4BR, Penthouse';
COMMENT ON COLUMN landscape.tbl_multifamily_unit.renovation_status IS 'Current renovation state: ORIGINAL, RENOVATED, IN_PROGRESS, PLANNED';

-- ============================================================================
-- TABLE 2: landscape.tbl_multifamily_lease
-- Purpose: Track individual leases with rent, concessions, and renewal data
-- ============================================================================

CREATE TABLE landscape.tbl_multifamily_lease (
    lease_id SERIAL PRIMARY KEY,
    unit_id BIGINT NOT NULL REFERENCES landscape.tbl_multifamily_unit(unit_id),
    resident_name VARCHAR(200),
    lease_start_date DATE NOT NULL,
    lease_end_date DATE NOT NULL,
    lease_term_months INTEGER NOT NULL,
    base_rent_monthly NUMERIC(10,2) NOT NULL,
    effective_rent_monthly NUMERIC(10,2),
    months_free_rent INTEGER DEFAULT 0,
    concession_amount NUMERIC(10,2) DEFAULT 0,
    security_deposit NUMERIC(10,2) DEFAULT 0,
    pet_rent_monthly NUMERIC(8,2) DEFAULT 0,
    parking_rent_monthly NUMERIC(8,2) DEFAULT 0,
    lease_status VARCHAR(50) DEFAULT 'ACTIVE',
    notice_date DATE,
    notice_to_vacate_days INTEGER,
    is_renewal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_lease_dates CHECK (lease_end_date > lease_start_date),
    CONSTRAINT chk_lease_status CHECK (lease_status IN ('ACTIVE', 'EXPIRED', 'NOTICE_GIVEN', 'MONTH_TO_MONTH', 'CANCELLED')),
    CONSTRAINT chk_months_free_rent CHECK (months_free_rent >= 0 AND months_free_rent <= lease_term_months)
);

CREATE INDEX idx_multifamily_lease_unit ON landscape.tbl_multifamily_lease(unit_id);
CREATE INDEX idx_multifamily_lease_status ON landscape.tbl_multifamily_lease(lease_status);
CREATE INDEX idx_multifamily_lease_start_date ON landscape.tbl_multifamily_lease(lease_start_date);
CREATE INDEX idx_multifamily_lease_end_date ON landscape.tbl_multifamily_lease(lease_end_date);
CREATE INDEX idx_multifamily_lease_notice_date ON landscape.tbl_multifamily_lease(notice_date) WHERE notice_date IS NOT NULL;
CREATE INDEX idx_multifamily_lease_is_renewal ON landscape.tbl_multifamily_lease(is_renewal);

COMMENT ON TABLE landscape.tbl_multifamily_lease IS 'Individual lease agreements with rent terms, concessions, and renewal tracking';
COMMENT ON COLUMN landscape.tbl_multifamily_lease.effective_rent_monthly IS 'Base rent adjusted for concessions and free months';
COMMENT ON COLUMN landscape.tbl_multifamily_lease.months_free_rent IS 'Number of months with zero rent during lease term';
COMMENT ON COLUMN landscape.tbl_multifamily_lease.lease_status IS 'ACTIVE, EXPIRED, NOTICE_GIVEN, MONTH_TO_MONTH, CANCELLED';

-- ============================================================================
-- TABLE 3: landscape.tbl_multifamily_turn
-- Purpose: Track unit turns with make-ready timeline and costs
-- ============================================================================

CREATE TABLE landscape.tbl_multifamily_turn (
    turn_id SERIAL PRIMARY KEY,
    unit_id BIGINT NOT NULL REFERENCES landscape.tbl_multifamily_unit(unit_id),
    move_out_date DATE NOT NULL,
    make_ready_complete_date DATE,
    next_move_in_date DATE,
    total_vacant_days INTEGER,
    cleaning_cost NUMERIC(10,2) DEFAULT 0,
    painting_cost NUMERIC(10,2) DEFAULT 0,
    carpet_flooring_cost NUMERIC(10,2) DEFAULT 0,
    appliance_cost NUMERIC(10,2) DEFAULT 0,
    other_cost NUMERIC(10,2) DEFAULT 0,
    total_make_ready_cost NUMERIC(10,2) GENERATED ALWAYS AS (
        COALESCE(cleaning_cost, 0) +
        COALESCE(painting_cost, 0) +
        COALESCE(carpet_flooring_cost, 0) +
        COALESCE(appliance_cost, 0) +
        COALESCE(other_cost, 0)
    ) STORED,
    turn_status VARCHAR(50) DEFAULT 'VACANT',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_turn_status CHECK (turn_status IN ('VACANT', 'MAKE_READY', 'READY', 'LEASED')),
    CONSTRAINT chk_make_ready_date CHECK (make_ready_complete_date IS NULL OR make_ready_complete_date >= move_out_date),
    CONSTRAINT chk_move_in_date CHECK (next_move_in_date IS NULL OR next_move_in_date >= move_out_date)
);

CREATE INDEX idx_multifamily_turn_unit ON landscape.tbl_multifamily_turn(unit_id);
CREATE INDEX idx_multifamily_turn_status ON landscape.tbl_multifamily_turn(turn_status);
CREATE INDEX idx_multifamily_turn_move_out ON landscape.tbl_multifamily_turn(move_out_date);
CREATE INDEX idx_multifamily_turn_make_ready_complete ON landscape.tbl_multifamily_turn(make_ready_complete_date);

COMMENT ON TABLE landscape.tbl_multifamily_turn IS 'Unit turn tracking with make-ready timeline and cost breakdown';
COMMENT ON COLUMN landscape.tbl_multifamily_turn.total_vacant_days IS 'Days from move-out to next move-in';
COMMENT ON COLUMN landscape.tbl_multifamily_turn.total_make_ready_cost IS 'Sum of all make-ready costs (computed column)';
COMMENT ON COLUMN landscape.tbl_multifamily_turn.turn_status IS 'VACANT, MAKE_READY, READY, LEASED';

-- ============================================================================
-- TABLE 4: landscape.tbl_multifamily_unit_type
-- Purpose: Unit type master data with pricing and unit count
-- ============================================================================

CREATE TABLE landscape.tbl_multifamily_unit_type (
    unit_type_id SERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id),
    unit_type_code VARCHAR(50) NOT NULL,
    bedrooms NUMERIC(3,1) NOT NULL,
    bathrooms NUMERIC(3,1) NOT NULL,
    avg_square_feet INTEGER NOT NULL,
    current_market_rent NUMERIC(10,2) NOT NULL,
    total_units INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_unit_type_project_code UNIQUE(project_id, unit_type_code),
    CONSTRAINT chk_avg_square_feet CHECK (avg_square_feet > 0),
    CONSTRAINT chk_total_units CHECK (total_units > 0)
);

CREATE INDEX idx_multifamily_unit_type_project ON landscape.tbl_multifamily_unit_type(project_id);
CREATE INDEX idx_multifamily_unit_type_code ON landscape.tbl_multifamily_unit_type(unit_type_code);

COMMENT ON TABLE landscape.tbl_multifamily_unit_type IS 'Unit type master data with average characteristics and market rent';
COMMENT ON COLUMN landscape.tbl_multifamily_unit_type.unit_type_code IS 'Standard unit type code (Studio, 1BR, 2BR, etc.)';
COMMENT ON COLUMN landscape.tbl_multifamily_unit_type.current_market_rent IS 'Current market rent for this unit type';

-- ============================================================================
-- VIEW 1: vw_multifamily_unit_status
-- Purpose: Current occupancy status with loss-to-lease calculation
-- ============================================================================

CREATE OR REPLACE VIEW landscape.vw_multifamily_unit_status AS
SELECT
    u.unit_id,
    u.project_id,
    u.unit_number,
    u.building_name,
    u.unit_type,
    u.bedrooms,
    u.bathrooms,
    u.square_feet,
    u.market_rent,
    u.renovation_status,
    l.lease_id,
    l.resident_name,
    l.lease_start_date,
    l.lease_end_date,
    l.base_rent_monthly,
    l.effective_rent_monthly,
    l.lease_status,
    l.is_renewal,
    CASE
        WHEN l.lease_id IS NULL THEN 'VACANT'
        WHEN l.lease_status = 'ACTIVE' AND l.lease_end_date >= CURRENT_DATE THEN 'OCCUPIED'
        WHEN l.lease_status = 'NOTICE_GIVEN' THEN 'NOTICE'
        WHEN l.lease_status = 'EXPIRED' OR l.lease_end_date < CURRENT_DATE THEN 'EXPIRED'
        ELSE 'VACANT'
    END AS occupancy_status,
    CASE
        WHEN l.lease_id IS NOT NULL AND u.market_rent IS NOT NULL
        THEN u.market_rent - COALESCE(l.effective_rent_monthly, l.base_rent_monthly)
        ELSE 0
    END AS loss_to_lease,
    CASE
        WHEN l.lease_id IS NOT NULL AND u.market_rent IS NOT NULL AND u.market_rent > 0
        THEN ROUND(((u.market_rent - COALESCE(l.effective_rent_monthly, l.base_rent_monthly)) / u.market_rent * 100), 2)
        ELSE 0
    END AS loss_to_lease_pct,
    CASE
        WHEN l.lease_end_date IS NOT NULL
        THEN l.lease_end_date - CURRENT_DATE
        ELSE NULL
    END AS days_until_expiration
FROM landscape.tbl_multifamily_unit u
LEFT JOIN LATERAL (
    SELECT *
    FROM landscape.tbl_multifamily_lease
    WHERE unit_id = u.unit_id
    AND lease_status IN ('ACTIVE', 'NOTICE_GIVEN', 'MONTH_TO_MONTH')
    ORDER BY lease_start_date DESC
    LIMIT 1
) l ON true;

COMMENT ON VIEW landscape.vw_multifamily_unit_status IS 'Current unit occupancy status with loss-to-lease calculation';

-- ============================================================================
-- VIEW 2: vw_multifamily_lease_expirations
-- Purpose: Leases expiring in next 12 months for proactive renewal planning
-- ============================================================================

CREATE OR REPLACE VIEW landscape.vw_multifamily_lease_expirations AS
SELECT
    l.lease_id,
    l.unit_id,
    u.unit_number,
    u.building_name,
    u.unit_type,
    u.project_id,
    p.project_name,
    l.resident_name,
    l.lease_start_date,
    l.lease_end_date,
    l.lease_term_months,
    l.base_rent_monthly,
    l.effective_rent_monthly,
    l.lease_status,
    l.notice_date,
    l.notice_to_vacate_days,
    l.is_renewal,
    l.lease_end_date - CURRENT_DATE AS days_until_expiration,
    CASE
        WHEN l.lease_end_date - CURRENT_DATE <= 30 THEN 'IMMEDIATE'
        WHEN l.lease_end_date - CURRENT_DATE <= 60 THEN 'URGENT'
        WHEN l.lease_end_date - CURRENT_DATE <= 90 THEN 'SOON'
        ELSE 'FUTURE'
    END AS expiration_priority,
    u.market_rent,
    u.market_rent - COALESCE(l.effective_rent_monthly, l.base_rent_monthly) AS potential_rent_increase,
    CASE
        WHEN l.notice_date IS NOT NULL THEN 'NOTICE_RECEIVED'
        WHEN l.lease_end_date - CURRENT_DATE <= 60 THEN 'RENEWAL_WINDOW'
        ELSE 'MONITORING'
    END AS renewal_status
FROM landscape.tbl_multifamily_lease l
JOIN landscape.tbl_multifamily_unit u ON l.unit_id = u.unit_id
JOIN landscape.tbl_project p ON u.project_id = p.project_id
WHERE l.lease_status IN ('ACTIVE', 'NOTICE_GIVEN', 'MONTH_TO_MONTH')
AND l.lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '12 months'
ORDER BY l.lease_end_date ASC;

COMMENT ON VIEW landscape.vw_multifamily_lease_expirations IS 'Leases expiring in next 12 months with renewal priority and status';

-- ============================================================================
-- VIEW 3: vw_multifamily_turn_metrics
-- Purpose: Average turn days and costs by unit type for benchmarking
-- ============================================================================

CREATE OR REPLACE VIEW landscape.vw_multifamily_turn_metrics AS
SELECT
    u.project_id,
    p.project_name,
    u.unit_type,
    COUNT(t.turn_id) AS total_turns,
    COUNT(CASE WHEN t.turn_status = 'LEASED' THEN 1 END) AS completed_turns,
    ROUND(AVG(t.total_vacant_days), 1) AS avg_vacant_days,
    ROUND(AVG(t.total_make_ready_cost), 2) AS avg_make_ready_cost,
    ROUND(AVG(t.cleaning_cost), 2) AS avg_cleaning_cost,
    ROUND(AVG(t.painting_cost), 2) AS avg_painting_cost,
    ROUND(AVG(t.carpet_flooring_cost), 2) AS avg_flooring_cost,
    ROUND(AVG(t.appliance_cost), 2) AS avg_appliance_cost,
    MIN(t.move_out_date) AS first_turn_date,
    MAX(t.move_out_date) AS last_turn_date,
    ROUND(AVG(CASE
        WHEN t.make_ready_complete_date IS NOT NULL
        THEN t.make_ready_complete_date - t.move_out_date
    END), 1) AS avg_make_ready_days,
    ROUND(AVG(CASE
        WHEN t.next_move_in_date IS NOT NULL
        THEN t.next_move_in_date - t.move_out_date
    END), 1) AS avg_total_turn_days
FROM landscape.tbl_multifamily_turn t
JOIN landscape.tbl_multifamily_unit u ON t.unit_id = u.unit_id
JOIN landscape.tbl_project p ON u.project_id = p.project_id
GROUP BY u.project_id, p.project_name, u.unit_type
ORDER BY u.project_id, u.unit_type;

COMMENT ON VIEW landscape.vw_multifamily_turn_metrics IS 'Average turn days and costs by unit type for performance benchmarking';

-- ============================================================================
-- VIEW 4: vw_multifamily_occupancy_summary
-- Purpose: Physical and economic occupancy by project and unit type
-- ============================================================================

CREATE OR REPLACE VIEW landscape.vw_multifamily_occupancy_summary AS
SELECT
    u.project_id,
    p.project_name,
    u.unit_type,
    COUNT(u.unit_id) AS total_units,
    COUNT(l.lease_id) AS occupied_units,
    COUNT(u.unit_id) - COUNT(l.lease_id) AS vacant_units,
    ROUND((COUNT(l.lease_id)::NUMERIC / NULLIF(COUNT(u.unit_id), 0) * 100), 2) AS physical_occupancy_pct,
    SUM(u.market_rent) AS total_market_rent,
    SUM(COALESCE(l.effective_rent_monthly, l.base_rent_monthly, 0)) AS total_actual_rent,
    ROUND((SUM(COALESCE(l.effective_rent_monthly, l.base_rent_monthly, 0)) / NULLIF(SUM(u.market_rent), 0) * 100), 2) AS economic_occupancy_pct,
    SUM(u.market_rent) - SUM(COALESCE(l.effective_rent_monthly, l.base_rent_monthly, 0)) AS total_loss_to_lease,
    ROUND(AVG(u.market_rent), 2) AS avg_market_rent,
    ROUND(AVG(COALESCE(l.effective_rent_monthly, l.base_rent_monthly)), 2) AS avg_actual_rent,
    COUNT(CASE WHEN u.renovation_status = 'RENOVATED' THEN 1 END) AS renovated_units,
    COUNT(CASE WHEN l.is_renewal = true THEN 1 END) AS renewal_leases,
    ROUND((COUNT(CASE WHEN l.is_renewal = true THEN 1 END)::NUMERIC / NULLIF(COUNT(l.lease_id), 0) * 100), 2) AS renewal_rate_pct
FROM landscape.tbl_multifamily_unit u
JOIN landscape.tbl_project p ON u.project_id = p.project_id
LEFT JOIN LATERAL (
    SELECT *
    FROM landscape.tbl_multifamily_lease
    WHERE unit_id = u.unit_id
    AND lease_status IN ('ACTIVE', 'NOTICE_GIVEN', 'MONTH_TO_MONTH')
    ORDER BY lease_start_date DESC
    LIMIT 1
) l ON true
GROUP BY u.project_id, p.project_name, u.unit_type
ORDER BY u.project_id, u.unit_type;

COMMENT ON VIEW landscape.vw_multifamily_occupancy_summary IS 'Physical and economic occupancy summary by project and unit type';

-- ============================================================================
-- Add rollback project-level summary view
-- ============================================================================

CREATE OR REPLACE VIEW landscape.vw_multifamily_project_summary AS
SELECT
    u.project_id,
    p.project_name,
    COUNT(DISTINCT u.unit_id) AS total_units,
    COUNT(DISTINCT CASE WHEN l.lease_id IS NOT NULL THEN u.unit_id END) AS occupied_units,
    ROUND((COUNT(DISTINCT CASE WHEN l.lease_id IS NOT NULL THEN u.unit_id END)::NUMERIC /
           NULLIF(COUNT(DISTINCT u.unit_id), 0) * 100), 2) AS physical_occupancy_pct,
    SUM(u.market_rent) AS total_market_rent_potential,
    SUM(COALESCE(l.effective_rent_monthly, l.base_rent_monthly, 0)) AS total_actual_rent,
    SUM(u.market_rent) - SUM(COALESCE(l.effective_rent_monthly, l.base_rent_monthly, 0)) AS total_loss_to_lease,
    COUNT(DISTINCT u.unit_type) AS unit_type_count,
    COUNT(DISTINCT CASE WHEN u.renovation_status = 'RENOVATED' THEN u.unit_id END) AS renovated_units,
    COUNT(DISTINCT t.turn_id) AS total_turns_ytd,
    ROUND(AVG(t.total_make_ready_cost), 2) AS avg_turn_cost,
    ROUND(AVG(t.total_vacant_days), 1) AS avg_turn_days
FROM landscape.tbl_multifamily_unit u
JOIN landscape.tbl_project p ON u.project_id = p.project_id
LEFT JOIN LATERAL (
    SELECT *
    FROM landscape.tbl_multifamily_lease
    WHERE unit_id = u.unit_id
    AND lease_status IN ('ACTIVE', 'NOTICE_GIVEN', 'MONTH_TO_MONTH')
    ORDER BY lease_start_date DESC
    LIMIT 1
) l ON true
LEFT JOIN landscape.tbl_multifamily_turn t ON u.unit_id = t.unit_id
    AND t.move_out_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY u.project_id, p.project_name
ORDER BY u.project_id;

COMMENT ON VIEW landscape.vw_multifamily_project_summary IS 'Project-level multifamily performance summary with occupancy and turn metrics';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON landscape.tbl_multifamily_unit TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON landscape.tbl_multifamily_lease TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON landscape.tbl_multifamily_turn TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON landscape.tbl_multifamily_unit_type TO PUBLIC;
GRANT USAGE ON SEQUENCE landscape.tbl_multifamily_unit_unit_id_seq TO PUBLIC;
GRANT USAGE ON SEQUENCE landscape.tbl_multifamily_lease_lease_id_seq TO PUBLIC;
GRANT USAGE ON SEQUENCE landscape.tbl_multifamily_turn_turn_id_seq TO PUBLIC;
GRANT USAGE ON SEQUENCE landscape.tbl_multifamily_unit_type_unit_type_id_seq TO PUBLIC;
GRANT SELECT ON landscape.vw_multifamily_unit_status TO PUBLIC;
GRANT SELECT ON landscape.vw_multifamily_lease_expirations TO PUBLIC;
GRANT SELECT ON landscape.vw_multifamily_turn_metrics TO PUBLIC;
GRANT SELECT ON landscape.vw_multifamily_occupancy_summary TO PUBLIC;
GRANT SELECT ON landscape.vw_multifamily_project_summary TO PUBLIC;
