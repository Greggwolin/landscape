-- ============================================================================
-- MIGRATION 012: Create MSA Lookup Table
-- ============================================================================
-- Purpose: Create Metropolitan Statistical Area (MSA) lookup table for project location
-- Date: 2025-10-31
-- ============================================================================

BEGIN;

-- Step 1: Create tbl_msa lookup table
CREATE TABLE IF NOT EXISTS landscape.tbl_msa (
  msa_id SERIAL PRIMARY KEY,
  msa_name VARCHAR(200) NOT NULL,
  msa_code VARCHAR(10),
  state_abbreviation VARCHAR(2) NOT NULL,
  primary_city VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE landscape.tbl_msa IS 'Metropolitan Statistical Area lookup table for project locations';
COMMENT ON COLUMN landscape.tbl_msa.msa_name IS 'Full MSA name (e.g., "Phoenix-Mesa-Chandler, AZ")';
COMMENT ON COLUMN landscape.tbl_msa.msa_code IS 'Official CBSA code from US Census Bureau';
COMMENT ON COLUMN landscape.tbl_msa.state_abbreviation IS 'Two-letter state code';
COMMENT ON COLUMN landscape.tbl_msa.primary_city IS 'Primary city in the MSA';
COMMENT ON COLUMN landscape.tbl_msa.is_active IS 'Whether this MSA is available for selection';
COMMENT ON COLUMN landscape.tbl_msa.display_order IS 'Order for displaying in dropdowns';

-- Step 2: Add msa_id foreign key to tbl_project if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'landscape'
    AND table_name = 'tbl_project'
    AND column_name = 'msa_id'
  ) THEN
    ALTER TABLE landscape.tbl_project
    ADD COLUMN msa_id INTEGER;

    COMMENT ON COLUMN landscape.tbl_project.msa_id IS 'References tbl_msa for project market/MSA';
  END IF;
END $$;

-- Step 3: Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tbl_project_msa_id_fkey'
  ) THEN
    ALTER TABLE landscape.tbl_project
    ADD CONSTRAINT tbl_project_msa_id_fkey
    FOREIGN KEY (msa_id) REFERENCES landscape.tbl_msa(msa_id);
  END IF;
END $$;

-- Step 4: Insert top 40 US MSAs by population
INSERT INTO landscape.tbl_msa (msa_name, msa_code, state_abbreviation, primary_city, display_order) VALUES
('New York-Newark-Jersey City, NY-NJ-PA', '35620', 'NY', 'New York', 1),
('Los Angeles-Long Beach-Anaheim, CA', '31080', 'CA', 'Los Angeles', 2),
('Chicago-Naperville-Elgin, IL-IN-WI', '16980', 'IL', 'Chicago', 3),
('Dallas-Fort Worth-Arlington, TX', '19100', 'TX', 'Dallas', 4),
('Houston-The Woodlands-Sugar Land, TX', '26420', 'TX', 'Houston', 5),
('Washington-Arlington-Alexandria, DC-VA-MD-WV', '47900', 'DC', 'Washington', 6),
('Philadelphia-Camden-Wilmington, PA-NJ-DE-MD', '37980', 'PA', 'Philadelphia', 7),
('Miami-Fort Lauderdale-Pompano Beach, FL', '33100', 'FL', 'Miami', 8),
('Atlanta-Sandy Springs-Alpharetta, GA', '12060', 'GA', 'Atlanta', 9),
('Phoenix-Mesa-Chandler, AZ', '38060', 'AZ', 'Phoenix', 10),
('Boston-Cambridge-Newton, MA-NH', '14460', 'MA', 'Boston', 11),
('San Francisco-Oakland-Berkeley, CA', '41860', 'CA', 'San Francisco', 12),
('Riverside-San Bernardino-Ontario, CA', '40140', 'CA', 'Riverside', 13),
('Detroit-Warren-Dearborn, MI', '19820', 'MI', 'Detroit', 14),
('Seattle-Tacoma-Bellevue, WA', '42660', 'WA', 'Seattle', 15),
('Minneapolis-St. Paul-Bloomington, MN-WI', '33460', 'MN', 'Minneapolis', 16),
('San Diego-Chula Vista-Carlsbad, CA', '41740', 'CA', 'San Diego', 17),
('Tampa-St. Petersburg-Clearwater, FL', '45300', 'FL', 'Tampa', 18),
('Denver-Aurora-Lakewood, CO', '19740', 'CO', 'Denver', 19),
('St. Louis, MO-IL', '41180', 'MO', 'St. Louis', 20),
('Baltimore-Columbia-Towson, MD', '12580', 'MD', 'Baltimore', 21),
('Charlotte-Concord-Gastonia, NC-SC', '16740', 'NC', 'Charlotte', 22),
('Orlando-Kissimmee-Sanford, FL', '36740', 'FL', 'Orlando', 23),
('San Antonio-New Braunfels, TX', '41700', 'TX', 'San Antonio', 24),
('Portland-Vancouver-Hillsboro, OR-WA', '38900', 'OR', 'Portland', 25),
('Sacramento-Roseville-Folsom, CA', '40900', 'CA', 'Sacramento', 26),
('Pittsburgh, PA', '38300', 'PA', 'Pittsburgh', 27),
('Las Vegas-Henderson-Paradise, NV', '29820', 'NV', 'Las Vegas', 28),
('Austin-Round Rock-Georgetown, TX', '12420', 'TX', 'Austin', 29),
('Cincinnati, OH-KY-IN', '17140', 'OH', 'Cincinnati', 30),
('Kansas City, MO-KS', '28140', 'MO', 'Kansas City', 31),
('Columbus, OH', '18140', 'OH', 'Columbus', 32),
('Indianapolis-Carmel-Anderson, IN', '26900', 'IN', 'Indianapolis', 33),
('Cleveland-Elyria, OH', '17460', 'OH', 'Cleveland', 34),
('San Jose-Sunnyvale-Santa Clara, CA', '41940', 'CA', 'San Jose', 35),
('Nashville-Davidson--Murfreesboro--Franklin, TN', '34980', 'TN', 'Nashville', 36),
('Virginia Beach-Norfolk-Newport News, VA-NC', '47260', 'VA', 'Virginia Beach', 37),
('Providence-Warwick, RI-MA', '39300', 'RI', 'Providence', 38),
('Milwaukee-Waukesha, WI', '33340', 'WI', 'Milwaukee', 39),
('Jacksonville, FL', '27260', 'FL', 'Jacksonville', 40)
ON CONFLICT DO NOTHING;

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_msa_active_display_order
ON landscape.tbl_msa(is_active, display_order)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_project_msa_id
ON landscape.tbl_project(msa_id);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify MSAs inserted
SELECT COUNT(*) as msa_count FROM landscape.tbl_msa;

-- Show sample MSAs
SELECT msa_id, msa_name, state_abbreviation, primary_city
FROM landscape.tbl_msa
ORDER BY display_order
LIMIT 10;

-- Verify foreign key constraint
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'tbl_project'
  AND kcu.column_name = 'msa_id';
