#!/usr/bin/env node

/**
 * Load Scottsdale Promenade tenant roster with correct schema
 * Bypasses SQL file schema issues by using direct inserts
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function loadScottsdaleData() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Step 1: Clean up existing data
    console.log('🧹 Cleaning up existing Scottsdale data...');
    await client.query(`
      DELETE FROM landscape.tbl_cre_base_rent WHERE lease_id IN (SELECT lease_id FROM landscape.tbl_cre_lease WHERE cre_property_id = 3);
      DELETE FROM landscape.tbl_cre_rent_escalation WHERE lease_id IN (SELECT lease_id FROM landscape.tbl_cre_lease WHERE cre_property_id = 3);
      DELETE FROM landscape.tbl_cre_percentage_rent WHERE lease_id IN (SELECT lease_id FROM landscape.tbl_cre_lease WHERE cre_property_id = 3);
      DELETE FROM landscape.tbl_cre_expense_recovery WHERE lease_id IN (SELECT lease_id FROM landscape.tbl_cre_lease WHERE cre_property_id = 3);
      DELETE FROM landscape.tbl_cre_tenant_improvement WHERE lease_id IN (SELECT lease_id FROM landscape.tbl_cre_lease WHERE cre_property_id = 3);
      DELETE FROM landscape.tbl_cre_leasing_commission WHERE lease_id IN (SELECT lease_id FROM landscape.tbl_cre_lease WHERE cre_property_id = 3);
      DELETE FROM landscape.tbl_cre_lease WHERE cre_property_id = 3;
      DELETE FROM landscape.tbl_cre_tenant WHERE tenant_id >= 1000;
      DELETE FROM landscape.tbl_cre_space WHERE cre_property_id = 3;
    `);

    // Step 2: Update property
    console.log('📝 Updating property record...');
    await client.query(`
      UPDATE landscape.tbl_cre_property
      SET total_building_sf = 528452, rentable_sf = 528452, number_of_units = 41
      WHERE cre_property_id = 3
    `);

    // Step 3: Load spaces
    console.log('🏢 Loading 41 spaces...');
    await client.query(`
      INSERT INTO landscape.tbl_cre_space (cre_property_id, space_number, usable_sf, rentable_sf, space_type, space_status) VALUES
      (3, 'PAD2', 133120, 133120, 'Power Center Anchor', 'Leased'),
      (3, 'MAJ4', 34922, 34922, 'Major Anchor', 'Leased'),
      (3, 'MAJ7', 34565, 34565, 'Major Anchor', 'Leased'),
      (3, 'MAJ1', 25200, 25200, 'Major Anchor', 'Leased'),
      (3, 'MAJ6', 23925, 23925, 'Major Anchor', 'Leased'),
      (3, 'MAJ10', 23656, 23656, 'Entertainment Anchor', 'Leased'),
      (3, 'MAJ9', 19444, 19444, 'Major Anchor', 'Leased'),
      (3, 'MAJ3', 18390, 18390, 'Major Anchor', 'Leased'),
      (3, 'MAJ5', 13000, 13000, 'Major Anchor', 'Leased'),
      (3, '13', 12604, 12604, 'Restaurant - Full Service', 'Leased'),
      (3, '7', 12500, 12500, 'Restaurant - Full Service', 'Leased'),
      (3, 'MAJ8A', 11008, 11008, 'Major In-Line', 'Leased'),
      (3, 'MAJ2', 10630, 10630, 'Major In-Line', 'Leased'),
      (3, 'E115', 10334, 10334, 'In-Line Retail', 'Leased'),
      (3, '12', 10000, 10000, 'Grocery - Specialty', 'Leased'),
      (3, '3', 8695, 8695, 'Restaurant - Full Service', 'Leased'),
      (3, '14', 8650, 8650, 'Restaurant - Full Service', 'Leased'),
      (3, 'PAD8', 7350, 7350, 'Pad Site - Restaurant', 'Leased'),
      (3, '9', 7150, 7150, 'In-Line Retail', 'Leased'),
      (3, '5A2/5', 6105, 6105, 'In-Line Retail', 'Leased'),
      (3, 'MAJ8B', 5980, 5980, 'In-Line Retail', 'Leased'),
      (3, '5B2', 5000, 5000, 'In-Line Retail', 'Available'),
      (3, 'F107', 4784, 4784, 'In-Line Retail', 'Available'),
      (3, 'C4109', 4504, 4504, 'In-Line Retail', 'Leased'),
      (3, 'F115', 4500, 4500, 'In-Line Retail', 'Leased'),
      (3, '4', 4447, 4447, 'Bank Branch', 'Leased'),
      (3, 'D109', 4340, 4340, 'Fitness', 'Leased'),
      (3, '16A', 4334, 4334, 'Telecommunications', 'Leased'),
      (3, '11', 4186, 4186, 'Restaurant - Casual', 'Leased'),
      (3, '5A1', 4007, 4007, 'Restaurant - Bakery/Cafe', 'Leased'),
      (3, '10', 4000, 4000, 'Restaurant - QSR', 'Leased'),
      (3, 'F111', 4000, 4000, 'In-Line Retail', 'Leased'),
      (3, 'E107', 3836, 3836, 'Restaurant - Casual', 'Leased'),
      (3, 'D115', 3558, 3558, 'Personal Services', 'Leased'),
      (3, '101', 3500, 3500, 'Restaurant - Casual', 'Leased'),
      (3, 'A8', 3000, 3000, 'In-Line Retail', 'Available'),
      (3, '17A', 3000, 3000, 'Restaurant - Fast Casual', 'Leased'),
      (3, '15A', 2869, 2869, 'Restaurant - Fast Casual', 'Leased'),
      (3, '16D', 2800, 2800, 'Restaurant - Fast Casual', 'Leased'),
      (3, '17B', 2685, 2685, 'Dental Office', 'Leased'),
      (3, '104', 2640, 2640, 'Music School', 'Leased')
    `);

    // Step 4: Load tenants
    console.log('👥 Loading 39 tenants...');
    await client.query(`
      INSERT INTO landscape.tbl_cre_tenant (tenant_id, tenant_name, tenant_legal_name, industry, business_type, credit_rating, creditworthiness, annual_revenue, years_in_business) VALUES
      (1000, 'Living Spaces', 'Living Spaces Inc.', 'Furniture', 'Retail', 'BB', 'Good', 500000000, 20),
      (1001, 'Nordstrom Rack', 'Nordstrom Inc.', 'Department Store', 'Retail', 'BBB', 'Excellent', 15500000000, 122),
      (1002, 'Saks Off 5th', 'Saks Fifth Avenue', 'Luxury Retail', 'Retail', 'BB+', 'Good', 3000000000, 98),
      (1003, 'Michaels', 'Michaels Stores Inc.', 'Arts & Crafts', 'Retail', 'B', 'Average', 5300000000, 50),
      (1004, 'PetSmart', 'PetSmart Inc.', 'Pet Supply', 'Retail', 'BB', 'Good', 7800000000, 37),
      (1005, 'Ulta Salon', 'Ulta Beauty Inc.', 'Beauty', 'Retail', 'BBB-', 'Excellent', 10200000000, 35),
      (1006, 'Old Navy', 'Gap Inc.', 'Apparel', 'Retail', 'BBB-', 'Good', 15600000000, 30),
      (1007, 'Five Below', 'Five Below Inc.', 'Value Retail', 'Retail', 'BB+', 'Good', 3400000000, 22),
      (1008, 'Trader Joe''s', 'Trader Joe''s Company', 'Grocery - Specialty', 'Retail', 'A-', 'Excellent', 16500000000, 56),
      (1009, 'Tilly''s', 'Tillys Inc.', 'Apparel', 'Retail', 'B+', 'Average', 700000000, 40),
      (1010, 'Skechers USA', 'Skechers USA Inc.', 'Footwear', 'Retail', 'BB', 'Good', 8000000000, 32),
      (1011, 'Bank of America', 'Bank of America Corp.', 'Banking', 'Financial Services', 'A-', 'Excellent', 95000000000, 240),
      (1012, 'Maggiano''s Little Italy', NULL, 'Italian Restaurant', 'Full Service Restaurant', 'BB', 'Good', 450000000, 28),
      (1013, 'Corner Bakery', NULL, 'Bakery Cafe', 'Fast Casual Restaurant', 'B+', 'Good', 125000000, 32),
      (1014, 'Cooper''s Hawk Winery', NULL, 'Winery Restaurant', 'Full Service Restaurant', 'BB+', 'Good', 400000000, 23),
      (1015, 'Benihana', NULL, 'Japanese Restaurant', 'Full Service Restaurant', 'B', 'Average', 75000000, 58),
      (1016, 'The Capital Grille', NULL, 'Steakhouse', 'Full Service Restaurant', 'BBB-', 'Excellent', 600000000, 29),
      (1017, 'Buffalo Wild Wings', NULL, 'Sports Bar', 'Casual Dining', 'BB+', 'Good', 2000000000, 42),
      (1018, 'In-N-Out Burger', NULL, 'Burger Restaurant', 'Quick Service', 'A-', 'Excellent', 1000000000, 76),
      (1019, 'Blaze Pizza', NULL, 'Pizza', 'Fast Casual', 'B+', 'Good', 350000000, 15),
      (1020, 'First Watch', NULL, 'Breakfast & Brunch', 'Casual Dining', 'BB', 'Good', 800000000, 43),
      (1021, 'Painted Tree Marketplace', NULL, 'Consignment/Boutique', 'Specialty Retail', NULL, 'Average', NULL, 8),
      (1022, 'Cost Plus World Market', NULL, 'Home Decor', 'Specialty Retail', NULL, 'Average', NULL, 58),
      (1023, 'Putting World', NULL, 'Entertainment', 'Recreation', NULL, 'Average', NULL, 12),
      (1024, 'Robbins Brothers', NULL, 'Jewelry', 'Specialty Retail', NULL, 'Good', NULL, 45),
      (1025, 'Men''s Wearhouse', NULL, 'Apparel', 'Retail', NULL, 'Average', NULL, 50),
      (1026, 'Carter''s', NULL, 'Children''s Apparel', 'Retail', NULL, 'Good', NULL, 157),
      (1027, 'Jos. A. Bank', NULL, 'Men''s Apparel', 'Retail', NULL, 'Average', NULL, 115),
      (1028, 'Anytime Fitness', NULL, 'Fitness', 'Health Club', NULL, 'Good', NULL, 22),
      (1029, 'Verizon Wireless', NULL, 'Telecommunications', 'Retail', NULL, 'Excellent', NULL, 40),
      (1030, 'World of Rugs', NULL, 'Home Furnishings', 'Specialty Retail', NULL, 'Average', NULL, 25),
      (1031, 'Ideal Image', NULL, 'Medical Aesthetics', 'Personal Services', NULL, 'Good', NULL, 20),
      (1032, 'Peachtree Dental', NULL, 'Dental', 'Healthcare', NULL, 'Average', NULL, 8),
      (1033, 'Bach to Rock', NULL, 'Music Education', 'Education Services', NULL, 'Average', NULL, 18),
      (1034, 'Someburros', NULL, 'Mexican Food', 'Casual Dining', NULL, 'Good', NULL, 40),
      (1035, 'Paris Baguette', NULL, 'Bakery Cafe', 'Fast Casual', NULL, 'Good', NULL, 35),
      (1036, 'Picazzo''s Healthy Italian', NULL, 'Italian Restaurant', 'Casual Dining', NULL, 'Average', NULL, 20),
      (1037, 'The Original Chop Shop Co.', NULL, 'Health Food', 'Fast Casual', NULL, 'Average', NULL, 8),
      (1038, 'Modern Market', NULL, 'Farm-to-Table', 'Fast Casual', NULL, 'Good', NULL, 14)
    `);

    console.log('📋 Creating 5 sample leases with full details...\n');

    // Get space IDs
    const { rows: spaces } = await client.query(`
      SELECT space_id, space_number FROM landscape.tbl_cre_space
      WHERE cre_property_id = 3 AND space_number IN ('PAD2', 'MAJ4', 'MAJ7', '12', '7')
    `);

    const spaceMap = {};
    spaces.forEach(s => { spaceMap[s.space_number] = s.space_id; });

    // LEASE 1: Living Spaces
    await client.query(`
      INSERT INTO landscape.tbl_cre_lease (
        cre_property_id, space_id, tenant_id,
        lease_number, lease_type, lease_status,
        lease_execution_date, lease_commencement_date, lease_expiration_date,
        lease_term_months, leased_sf, number_of_options, option_term_months,
        security_deposit_amount, exclusive_use_clause, co_tenancy_clause
      ) VALUES (
        3, $1, 1000,
        'LVSP-2020-001', 'NNN', 'Active',
        '2020-08-15', '2021-01-01', '2036-12-31',
        192, 133120, 2, 60, 250000,
        'Exclusive furniture retail rights within center',
        'If occupancy drops below 80%, rent reduces 20% until stabilized'
      )
    `, [spaceMap['PAD2']]);

    const lease1 = await client.query(`SELECT lease_id FROM landscape.tbl_cre_lease WHERE lease_number = 'LVSP-2020-001'`);
    const lease1Id = lease1.rows[0].lease_id;

    await client.query(`
      INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual, period_number) VALUES
      ($1, '2021-01-01', '2025-12-31', 1331200, 10.00, 1),
      ($1, '2026-01-01', '2030-12-31', 1464320, 11.00, 2),
      ($1, '2031-01-01', '2036-12-31', 1597440, 12.00, 3)
    `, [lease1Id]);

    await client.query(`
      INSERT INTO landscape.tbl_cre_rent_escalation (lease_id, escalation_type, escalation_pct, escalation_frequency)
      VALUES ($1, 'Fixed Percentage', 2.00, 'Every 5 Years')
    `, [lease1Id]);

    await client.query(`
      INSERT INTO landscape.tbl_cre_expense_recovery (lease_id, recovery_structure, property_tax_recovery_pct, insurance_recovery_pct, cam_recovery_pct)
      VALUES ($1, 'Triple Net (NNN)', 100.0, 100.0, 100.0)
    `, [lease1Id]);

    // LEASE 2: Painted Tree
    await client.query(`
      INSERT INTO landscape.tbl_cre_lease (
        cre_property_id, space_id, tenant_id,
        lease_number, lease_type, lease_status,
        lease_execution_date, lease_commencement_date, lease_expiration_date,
        lease_term_months, leased_sf, number_of_options
      ) VALUES (
        3, $1, 1021,
        'PTMP-2022-002', 'Modified Gross', 'Active',
        '2022-03-01', '2022-06-01', '2032-05-31',
        120, 34922, 1
      )
    `, [spaceMap['MAJ4']]);

    const lease2 = await client.query(`SELECT lease_id FROM landscape.tbl_cre_lease WHERE lease_number = 'PTMP-2022-002'`);
    const lease2Id = lease2.rows[0].lease_id;

    await client.query(`
      INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual, period_number) VALUES
      ($1, '2022-06-01', '2027-05-31', 558752, 16.00, 1),
      ($1, '2027-06-01', '2032-05-31', 628476, 18.00, 2)
    `, [lease2Id]);

    await client.query(`
      INSERT INTO landscape.tbl_cre_rent_escalation (lease_id, escalation_type, escalation_frequency, cpi_index, cpi_floor_pct, cpi_cap_pct)
      VALUES ($1, 'CPI', 'Annual', 'CPI-U', 2.00, 4.00)
    `, [lease2Id]);

    // LEASE 3: Nordstrom Rack
    await client.query(`
      INSERT INTO landscape.tbl_cre_lease (
        cre_property_id, space_id, tenant_id,
        lease_number, lease_type, lease_status,
        lease_execution_date, lease_commencement_date, lease_expiration_date,
        lease_term_months, leased_sf, number_of_options, option_term_months,
        security_deposit_months, exclusive_use_clause
      ) VALUES (
        3, $1, 1001,
        'NORD-2019-003', 'NNN', 'Active',
        '2019-05-10', '2019-09-01', '2034-08-31',
        180, 34565, 3, 60, 2.0,
        'Exclusive off-price department store use'
      )
    `, [spaceMap['MAJ7']]);

    const lease3 = await client.query(`SELECT lease_id FROM landscape.tbl_cre_lease WHERE lease_number = 'NORD-2019-003'`);
    const lease3Id = lease3.rows[0].lease_id;

    await client.query(`
      INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual, period_number) VALUES
      ($1, '2019-09-01', '2024-08-31', 449345, 13.00, 1),
      ($1, '2024-09-01', '2029-08-31', 484007, 14.00, 2),
      ($1, '2029-09-01', '2034-08-31', 518670, 15.00, 3)
    `, [lease3Id]);

    // LEASE 4: Trader Joe's
    await client.query(`
      INSERT INTO landscape.tbl_cre_lease (
        cre_property_id, space_id, tenant_id,
        lease_number, lease_type, lease_status,
        lease_execution_date, lease_commencement_date, lease_expiration_date,
        lease_term_months, leased_sf, number_of_options
      ) VALUES (
        3, $1, 1008,
        'TJS-2023-016', 'NNN', 'Active',
        '2023-01-15', '2023-04-01', '2038-03-31',
        180, 10000, 2
      )
    `, [spaceMap['12']]);

    const lease4 = await client.query(`SELECT lease_id FROM landscape.tbl_cre_lease WHERE lease_number = 'TJS-2023-016'`);
    const lease4Id = lease4.rows[0].lease_id;

    await client.query(`
      INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual, period_number) VALUES
      ($1, '2023-04-01', '2028-03-31', 350000, 35.00, 1),
      ($1, '2028-04-01', '2033-03-31', 380000, 38.00, 2),
      ($1, '2033-04-01', '2038-03-31', 410000, 41.00, 3)
    `, [lease4Id]);

    // LEASE 5: Cooper's Hawk
    await client.query(`
      INSERT INTO landscape.tbl_cre_lease (
        cre_property_id, space_id, tenant_id,
        lease_number, lease_type, lease_status,
        lease_execution_date, lease_commencement_date, lease_expiration_date,
        lease_term_months, leased_sf, number_of_options, expansion_rights
      ) VALUES (
        3, $1, 1014,
        'COOP-2021-011', 'NNN', 'Active',
        '2021-07-01', '2021-10-01', '2031-09-30',
        120, 12500, 2, true
      )
    `, [spaceMap['7']]);

    const lease5 = await client.query(`SELECT lease_id FROM landscape.tbl_cre_lease WHERE lease_number = 'COOP-2021-011'`);
    const lease5Id = lease5.rows[0].lease_id;

    await client.query(`
      INSERT INTO landscape.tbl_cre_base_rent (lease_id, period_start_date, period_end_date, base_rent_annual, base_rent_psf_annual, period_number) VALUES
      ($1, '2021-10-01', '2026-09-30', 500000, 40.00, 1),
      ($1, '2026-10-01', '2031-09-30', 550000, 44.00, 2)
    `, [lease5Id]);

    await client.query(`
      INSERT INTO landscape.tbl_cre_percentage_rent (lease_id, breakpoint_amount, percentage_rate, reporting_frequency, prior_year_sales)
      VALUES ($1, 8000000, 5.000, 'Annual', 12500000)
    `, [lease5Id]);

    // Validation
    console.log('\n📊 Validation Results:');

    const gla = await client.query(`SELECT SUM(rentable_sf) as total FROM landscape.tbl_cre_space WHERE cre_property_id = 3`);
    console.log(`   Total GLA: ${Number(gla.rows[0].total).toLocaleString()} SF`);

    const occ = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE space_status = 'Leased') as leased,
        COUNT(*) FILTER (WHERE space_status = 'Available') as vacant,
        COUNT(*) as total,
        ROUND((SUM(rentable_sf) FILTER (WHERE space_status = 'Leased')::numeric / SUM(rentable_sf) * 100), 1) as occ_pct
      FROM landscape.tbl_cre_space
      WHERE cre_property_id = 3
    `);
    console.log(`   Spaces: ${occ.rows[0].leased} leased, ${occ.rows[0].vacant} vacant (${occ.rows[0].occ_pct}% occupied)`);

    const leases = await client.query(`SELECT COUNT(*) as cnt FROM landscape.tbl_cre_lease WHERE cre_property_id = 3`);
    console.log(`   Leases: ${leases.rows[0].cnt}`);

    const tenants = await client.query(`SELECT COUNT(*) as cnt FROM landscape.tbl_cre_tenant WHERE tenant_id >= 1000`);
    console.log(`   Tenants: ${tenants.rows[0].cnt}`);

    console.log('\n✅ Scottsdale Promenade data loaded successfully!');
    console.log('   View at: /properties/3/analysis\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

loadScottsdaleData();
