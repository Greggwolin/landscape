BEGIN;

-- ============================================================================
-- PART 1: Create UOM Calculation Registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS landscape.tbl_uom_calculation_formulas (
  formula_id          SERIAL PRIMARY KEY,
  uom_code            VARCHAR(10) NOT NULL UNIQUE,
  formula_name        VARCHAR(50) NOT NULL,
  formula_expression  TEXT NOT NULL,
  required_fields     TEXT[] NOT NULL,
  description         TEXT,

  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_uom_formulas_code ON landscape.tbl_uom_calculation_formulas(uom_code);

-- Seed formula data
INSERT INTO landscape.tbl_uom_calculation_formulas
  (uom_code, formula_name, formula_expression, required_fields, description)
VALUES
  ('FF', 'Front Foot', 'lot_width * units * inflated_price',
   ARRAY['lot_width', 'units'],
   'Residential lots priced by front footage: lot width × unit count × price per front foot'),

  ('EA', 'Per Unit/Lot', 'units * inflated_price',
   ARRAY['units'],
   'Residential lots or units priced individually: unit count × price per unit'),

  ('SF', 'Square Foot', 'acres * 43560 * inflated_price',
   ARRAY['acres'],
   'Commercial property priced per square foot: acres × 43,560 SF/acre × price per SF'),

  ('AC', 'Acre', 'acres * inflated_price',
   ARRAY['acres'],
   'Land priced per acre: acres × price per acre'),

  ('UN', 'Unit (Multifamily)', 'units * inflated_price',
   ARRAY['units'],
   'Multifamily units priced individually: unit count × price per unit'),

  ('$$$', 'Lump Sum', 'inflated_price',
   ARRAY[]::TEXT[],
   'Lump sum price: single total price regardless of size')
ON CONFLICT (uom_code) DO NOTHING;

-- ============================================================================
-- PART 2: Add Comments
-- ============================================================================

COMMENT ON TABLE landscape.tbl_uom_calculation_formulas IS
  'Registry of calculation formulas for different units of measure';

COMMENT ON COLUMN landscape.tbl_uom_calculation_formulas.formula_expression IS
  'Python expression evaluated with variables: lot_width, units, acres, inflated_price';

COMMENT ON COLUMN landscape.tbl_uom_calculation_formulas.required_fields IS
  'Array of parcel fields that must be non-null for this formula to work';

COMMIT;
