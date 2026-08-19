-- Create temp table

CREATE TEMP TABLE IF NOT EXISTS temp_chadron_rent_roll (
    unit_number VARCHAR(10),
    unit_type VARCHAR(50),
    sf INTEGER,
    current_monthly_rent DECIMAL(10,2),
    current_rent_psf DECIMAL(10,2),
    market_monthly_rent DECIMAL(10,2),
    market_rent_psf DECIMAL(10,2),
    status VARCHAR(20),
    is_section_8 BOOLEAN,
    notes TEXT
);


-- Insert data into temp table
INSERT INTO temp_chadron_rent_roll VALUES ('100', 'Commercial', 1101, 3303, 3.0, 3578, 3.25, 'occupied', FALSE, 'Commercial space');
INSERT INTO temp_chadron_rent_roll VALUES ('101', 'Commercial', 903, 2709, 3.0, 2935, 3.25, 'occupied', FALSE, 'Commercial space');
INSERT INTO temp_chadron_rent_roll VALUES ('102', 'Leasing Office', 446, 0, 0.0, 0, 0.0, 'occupied', FALSE, 'Leasing office');
INSERT INTO temp_chadron_rent_roll VALUES ('103', 'Commercial', 1305, 3915, 3.0, 4241, 3.25, 'occupied', FALSE, 'Commercial space');
INSERT INTO temp_chadron_rent_roll VALUES ('104', 'Commercial', 1355, 4397, 3.24, 4404, 3.25, 'occupied', FALSE, 'Mini Market');
INSERT INTO temp_chadron_rent_roll VALUES ('201', '3BR/2BA', 1307, NULL, NULL, 3850, 2.95, 'vacant', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('202', '3BR/2BA', 1280, 2790, 2.18, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('203', '1BR/1BA XL Patio', 750, 1700, 2.27, 2500, 3.33, 'occupied', FALSE, 'XL patio unit');
INSERT INTO temp_chadron_rent_roll VALUES ('204', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('205', '3BR/2BA XL Patio', 1280, 3000, 2.34, 3925, 3.07, 'occupied', TRUE, 'XL patio unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('206', '1BR/1BA', 750, 2000, 2.67, 2400, 3.2, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('207', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('208', '3BR/2BA', 1280, 2790, 2.18, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('209', '2BR/2BA XL Patio', 1035, 2200, 2.13, 3250, 3.14, 'occupied', FALSE, 'XL patio unit');
INSERT INTO temp_chadron_rent_roll VALUES ('210', '2BR/2BA', 1035, 2500, 2.42, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('211', '2BR/2BA XL Patio', 1035, 2200, 2.13, 3250, 3.14, 'occupied', FALSE, 'XL patio unit');
INSERT INTO temp_chadron_rent_roll VALUES ('212', '2BR/2BA', 1035, 2800, 2.71, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('213', '2BR/2BA XL Patio', 1035, 1716, 1.66, 3250, 3.14, 'occupied', TRUE, 'XL patio unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('214', '1BR/1BA', 750, 2063, 2.75, 2400, 3.2, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('215', '1BR/1BA XL Patio', 750, 1950, 2.6, 2500, 3.33, 'occupied', FALSE, 'XL patio unit');
INSERT INTO temp_chadron_rent_roll VALUES ('216', '2BR/2BA', 1035, 1700, 1.64, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('217', '3BR/2BA', 1280, 3000, 2.34, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('218', '3BR/2BA', 1280, 2339, 1.83, 3825, 2.99, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('219', '2BR/2BA XL Patio', 1035, 1791, 1.73, 3250, 3.14, 'occupied', TRUE, 'XL patio unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('220', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('221', '1BR/1BA XL Patio', 750, 1571, 2.09, 2500, 3.33, 'occupied', TRUE, 'XL patio unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('222', '1BR/1BA', 750, 1384, 1.85, 2400, 3.2, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('223', '2BR/2BA XL Patio', 1035, 1956, 1.89, 3250, 3.14, 'occupied', TRUE, 'XL patio unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('224', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('225', '2BR/2BA XL Patio', 1035, 1970, 1.9, 3250, 3.14, 'occupied', TRUE, 'XL patio unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('226', '2BR/2BA', 1035, 1700, 1.64, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('227', '2BR/2BA XL Patio', 1035, 2750, 2.66, 3250, 3.14, 'occupied', FALSE, 'XL patio unit');
INSERT INTO temp_chadron_rent_roll VALUES ('228', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('229', '2BR/2BA XL Patio', 1035, 1768, 1.71, 3250, 3.14, 'occupied', FALSE, 'XL patio unit');
INSERT INTO temp_chadron_rent_roll VALUES ('230', '3BR/2BA', 1280, 2790, 2.18, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('231', '3BR/2BA', 1280, 3000, 2.34, 3825, 2.99, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('232', '3BR/2BA', 1280, 2287, 1.79, 3825, 2.99, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('233', '3BR/2BA XL Patio', 1280, 2500, 1.95, 3925, 3.07, 'occupied', FALSE, 'XL patio unit');
INSERT INTO temp_chadron_rent_roll VALUES ('234', '2BR/2BA', 1035, 2500, 2.42, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('235', '3BR/2BA', 1307, 3295, 2.52, 3850, 2.95, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('236', '1BR/1BA', 850, 1517, 1.78, 2500, 2.94, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('301', '3BR/2BA', 1307, 2640, 2.02, 3850, 2.95, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('302', '3BR/2BA', 1280, 2339, 1.83, 3825, 2.99, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('303', '1BR/1BA', 750, 1384, 1.85, 2400, 3.2, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('304', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('305', '3BR/2BA', 1280, 2735, 2.14, 3825, 2.99, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('306', '1BR/1BA', 750, 1815, 2.42, 2400, 3.2, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('307', '2BR/2BA', 1035, 1870, 1.81, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('308', '3BR/2BA', 1280, 2640, 2.06, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('309', '2BR/2BA', 1035, 1791, 1.73, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('310', '2BR/2BA', 1035, 1700, 1.64, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('311', '2BR/2BA', 1035, 2300, 2.22, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('312', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('313', '2BR/2BA', 1035, 2400, 2.32, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('314', '1BR/1BA', 750, NULL, NULL, 2400, 3.2, 'vacant', FALSE, 'Balcony unit, vacant');
INSERT INTO temp_chadron_rent_roll VALUES ('315', '1BR/1BA', 750, 2100, 2.8, 2400, 3.2, 'occupied', FALSE, 'Manager unit');
INSERT INTO temp_chadron_rent_roll VALUES ('316', '2BR/2BA', 1035, 1775, 1.71, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('317', '3BR/2BA', 1280, 2516, 1.97, 3825, 2.99, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('318', '3BR/2BA', 1280, 2573, 2.01, 3825, 2.99, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('319', '2BR/2BA', 1035, 1700, 1.64, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('320', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('321', '1BR/1BA', 750, 1517, 2.02, 2400, 3.2, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('322', '1BR/1BA', 750, NULL, NULL, 2400, 3.2, 'vacant', FALSE, 'Balcony unit, vacant');
INSERT INTO temp_chadron_rent_roll VALUES ('323', '2BR/2BA', 1035, 2587, 2.5, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('324', '2BR/2BA', 1035, 1791, 1.73, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('325', '2BR/2BA', 1035, 2500, 2.42, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('326', '2BR/2BA', 1035, 1870, 1.81, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('327', '1BR/1BA', 750, 1768, 2.36, 2400, 3.2, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('328', '2BR/2BA', 1035, 2238, 2.16, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('329', '2BR/2BA', 1035, 1700, 1.64, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('330', '3BR/2BA', 1280, 3000, 2.34, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('331', '3BR/2BA', 1280, 2640, 2.06, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('332', '3BR/2BA', 1280, 2339, 1.83, 3825, 2.99, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('333', '3BR/2BA', 1280, 3000, 2.34, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('334', '2BR/2BA', 1035, 1700, 1.64, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('335', '3BR/2BA', 1307, 2875, 2.2, 3850, 2.95, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('336', '1BR/1BA', 850, 1384, 1.63, 2500, 2.94, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('401', '3BR/2BA', 1307, NULL, NULL, 3850, 2.95, 'vacant', FALSE, 'Balcony unit, vacant');
INSERT INTO temp_chadron_rent_roll VALUES ('402', '3BR/2BA Tower', 1280, 2926, 2.29, 3875, 3.03, 'occupied', FALSE, 'Tower unit with balcony');
INSERT INTO temp_chadron_rent_roll VALUES ('403', '1BR/1BA', 750, 1384, 1.85, 2400, 3.2, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('404', '2BR/2BA', 1035, 2300, 2.22, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('405', '3BR/2BA', 1280, 2640, 2.06, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('406', '1BR/1BA', 750, 1384, 1.85, 2400, 3.2, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('407', '2BR/2BA', 1035, 2170, 2.1, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('408', '3BR/2BA Tower', 1280, 2706, 2.11, 3875, 3.03, 'occupied', TRUE, 'Tower unit with balcony, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('409', '2BR/2BA', 1035, 1791, 1.73, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('410', '2BR/2BA', 1035, 1956, 1.89, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('411', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('412', '2BR/2BA', 1035, 1700, 1.64, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('413', '2BR/2BA', 1035, 2500, 2.42, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('414', '1BR/1BA', 750, 1384, 1.85, 2400, 3.2, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('415', '1BR/1BA', 750, 2000, 2.67, 2400, 3.2, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('416', '2BR/2BA', 1035, 2500, 2.42, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('417', '3BR/2BA', 1280, 2460, 1.92, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('418', '3BR/2BA', 1280, 2706, 2.11, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('419', '2BR/2BA', 1035, 2200, 2.13, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('420', '2BR/2BA', 1035, 2500, 2.42, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('421', '1BR/1BA', 750, 1384, 1.85, 2400, 3.2, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('422', '1BR/1BA', 750, 1600, 2.13, 2400, 3.2, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('423', '2BR/2BA', 1035, 2500, 2.42, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('424', '2BR/2BA', 1035, NULL, NULL, 3150, 3.04, 'vacant', FALSE, 'Balcony unit, vacant');
INSERT INTO temp_chadron_rent_roll VALUES ('425', '2BR/2BA', 1035, 2264, 2.19, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('426', '2BR/2BA', 1035, NULL, NULL, 3150, 3.04, 'vacant', FALSE, 'Balcony unit, vacant');
INSERT INTO temp_chadron_rent_roll VALUES ('427', '2BR/2BA', 1035, 1791, 1.73, 3150, 3.04, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('428', '2BR/2BA Tower', 1035, 2500, 2.42, 3200, 3.09, 'occupied', FALSE, 'Tower unit with balcony');
INSERT INTO temp_chadron_rent_roll VALUES ('429', '2BR/2BA', 1035, 2500, 2.42, 3150, 3.04, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('430', '3BR/2BA', 1280, 3000, 2.34, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('431', '3BR/2BA', 1280, 2660, 2.08, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('432', '3BR/2BA', 1280, 2339, 1.83, 3825, 2.99, 'occupied', TRUE, 'Balcony unit, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('433', '3BR/2BA', 1280, 3000, 2.34, 3825, 2.99, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('434', '2BR/2BA Tower', 1035, 1791, 1.73, 3200, 3.09, 'occupied', TRUE, 'Tower unit with balcony, Section 8');
INSERT INTO temp_chadron_rent_roll VALUES ('435', '3BR/2BA', 1307, 2985, 2.28, 3850, 2.95, 'occupied', FALSE, 'Balcony unit');
INSERT INTO temp_chadron_rent_roll VALUES ('436', '1BR/1BA', 850, 1384, 1.63, 2500, 2.94, 'occupied', TRUE, 'Balcony unit, Section 8');

-- Total units inserted: 113
