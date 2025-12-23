# Lynn Villa Multi-Scenario Parser Proof

## Source
- PDF: `Lynn Villas OM 2025_FINAL FOR MARKETING.pdf`
- Path: `reference/multifam/Lynn Villas OM 2025_FINAL FOR MARKETING.pdf`
- Size: 5,934,980 bytes
- SHA256: `635e7074506478b8cbbb73baf373d20d0068f11f868eae895f4cad5a5eb4b4ee`
- Operating statement pages parsed: page 26 (1-based); screenshot saved at `docs/opex/screenshots/lynn_villa_operating_statement_page26.png`

## Scenario headers detected
- T3_ANNUALIZED  (header text: “Dec 2024 - T3 Annualized”)
- CURRENT_PRO_FORMA  (header text: “Current Rent Roll Pro forma”)
- POST_RENO_PRO_FORMA  (header text: “Post-Reno Market Rent Pro Forma”)

## First 20 labels (pivoted)
- operating: 2024.0, None, None
- scheduled market rent: 1875128.0, 2045450.0, 2045450.0
- plus: rehab value add income: 0.0, 0.0, 1024150.0
- less: loss to lease: 0.0, 0.0, -46044.0
- subtotal gross potential rent (gpr): 1875128.0, 2045450.0, 3023556.0
- less: physical vacancy: 0.0, -61363.0, -90707.0
- less: employee unit: -26400.0, -25200.0, -34800.0
- less: bad debt: 0.0, 0.0, -7559.0
- net rental income: 1848728.0, 1958886.0, 2890490.0
- economic occupancy: 98.59, 95.77, 95.6
- effective rent: 1.86, 2.03, 3.0
- plus: late charges income: 340.0, 809.0, 9.0
- plus: laundry vending: 16608.0, 23158.0, 23853.0
- plus: rubs income: 0.0, 144539.0, 148875.0
- subtotal other income: 16948.0, 168506.0, 173561.0
- effective gross income (egi): 1865676.0, 2127392.0, 3064051.0
- operating expenses: 12.0, None, None
- apartment prep/turnover: 51328.0, 32246.0, 32246.0
- administrative: 15830.0, 15830.0, 15830.0
- contracted services (pool service, pest control, landscaping): 39432.0, 39432.0, 39432.0

## Missing/partial rows
- Rows missing any scenario amount: 5
- Labels missing at least one scenario: ['operating', 'operating expenses', 'expense ratio (% of egi)', 'replacement reserves', '62']

## Outputs
- Parsed JSON: `docs/opex/lynn_villa_scenarios_parsed.json`
- Parsed CSV: `docs/opex/lynn_villa_scenarios_parsed.csv`
- Screenshot: `docs/opex/screenshots/lynn_villa_operating_statement_page26.png`
