import { BasketConfig } from '@/types/assumptions';

export const basket1Config: BasketConfig = {
  basketId: 1,
  basketName: "The Deal",
  basketDescription: "What are you buying and when are you selling?",
  icon: "briefcase",
  tableName: "tbl_property_acquisition",

  fieldGroups: [
    {
      id: 'core_terms',
      label: 'Core Deal Terms',
      tier: 'napkin',
      fields: [
        'purchase_price',
        'acquisition_date',
        'hold_period_years',
        'exit_cap_rate',
        'sale_date'
      ]
    },
    {
      id: 'acquisition_details',
      label: 'Acquisition Details',
      tier: 'mid',
      fields: [
        'closing_costs_pct',
        'due_diligence_days',
        'earnest_money'
      ]
    },
    {
      id: 'disposition_details',
      label: 'Disposition Details',
      tier: 'mid',
      fields: [
        'sale_costs_pct',
        'broker_commission_pct'
      ]
    },
    {
      id: 'validation_metrics',
      label: 'Validation Metrics',
      description: 'Auto-calculated benchmarking metrics',
      tier: 'mid',
      fields: [
        'price_per_unit',
        'price_per_sf'
      ]
    },
    {
      id: 'itemized_costs',
      label: 'Itemized Acquisition Costs',
      tier: 'pro',
      collapsible: true,
      fields: [
        'legal_fees',
        'financing_fees',
        'third_party_reports'
      ]
    },
    {
      id: 'tax_treatment',
      label: 'Tax Treatment',
      tier: 'pro',
      collapsible: true,
      fields: [
        'depreciation_basis',
        'land_pct',
        'improvement_pct',
        'is_1031_exchange'
      ]
    }
  ],

  fields: [
    // ========================================
    // NAPKIN TIER (5 fields - always visible)
    // ========================================
    {
      key: 'purchase_price',
      label: 'Purchase Price',
      type: 'currency',
      tier: 'napkin',
      required: true,
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "How much are you paying for the property? This is the total acquisition price before closing costs.",
        mid: "Total purchase price per purchase agreement, excluding buyer-side transaction costs.",
        pro: "Gross acquisition price per PSA. Base for calculating closing costs, price per unit, and depreciation basis."
      }
    },
    {
      key: 'acquisition_date',
      label: 'When are you buying?',
      type: 'date',
      tier: 'napkin',
      required: true,
      helpText: {
        napkin: "What date will you close on the purchase? This sets the start of your cash flow analysis.",
        mid: "Anticipated closing date. Used as Period 0 for cash flow projections.",
        pro: "Closing date per purchase agreement or pro forma assumption. Sets T=0 for NPV and IRR calculations."
      }
    },
    {
      key: 'hold_period_years',
      label: 'How long will you hold it?',
      type: 'number',
      tier: 'napkin',
      required: true,
      format: { suffix: ' years', decimals: 1 },
      validation: { min: 1, max: 30 },
      helpText: {
        napkin: "How many years before you plan to sell? Typical hold periods are 5-10 years for apartments.",
        mid: "Investment hold period. Sets the terminal value calculation date for DCF analysis.",
        pro: "Hold period for DCF analysis (acquisition to disposition). Used to calculate sale date and terminal year NOI."
      }
    },
    {
      key: 'exit_cap_rate',
      label: 'Exit Cap Rate',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 2 },
      validation: { min: 2, max: 15 },
      helpText: {
        napkin: "What cap rate will you use to estimate the sale price? This is how buyers will value your property at exit. Lower cap rates mean higher sale prices.",
        mid: "Terminal/reversion cap rate for exit valuation. Applied to final year stabilized NOI to determine sale price (Exit Value = NOI / Cap Rate).",
        pro: "Exit cap rate applied to terminal year stabilized NOI. Typically 25-50 bps higher than entry cap due to property aging. Sensitivity analysis should test ±50 bps."
      }
    },
    {
      key: 'sale_date',
      label: 'When will you sell?',
      type: 'date',
      tier: 'napkin',
      required: false,
      autoCalc: (values) => {
        if (values.acquisition_date && values.hold_period_years) {
          const acqDate = new Date(values.acquisition_date);
          acqDate.setFullYear(acqDate.getFullYear() + Math.floor(values.hold_period_years));
          return acqDate.toISOString().split('T')[0];
        }
        return null;
      },
      dependsOn: ['acquisition_date', 'hold_period_years'],
      helpText: {
        napkin: "Expected sale date (auto-calculated from acquisition date + hold period).",
        mid: "Anticipated disposition date. Auto-calculated but can be overridden for specific exit strategies.",
        pro: "Pro forma sale date for DCF terminal value. Sets final period for cash flow projections and return calculations."
      }
    },

    // ========================================
    // MID TIER (7 additional fields)
    // ========================================
    {
      key: 'closing_costs_pct',
      label: 'Closing Costs',
      type: 'percentage',
      tier: 'mid',
      group: 'acquisition_details',
      format: { suffix: '%', decimals: 2 },
      validation: { min: 0, max: 5 },
      helpText: {
        napkin: "",
        mid: "Buyer closing costs as % of purchase price. Typical range: 1-3% depending on market and lender requirements.",
        pro: "Aggregate acquisition transaction costs as % of purchase price. Includes title, escrow, legal, lender fees. Excludes financing fees (tracked separately in Basket 4)."
      }
    },
    {
      key: 'due_diligence_days',
      label: 'Due Diligence Period',
      type: 'number',
      tier: 'mid',
      group: 'acquisition_details',
      format: { suffix: ' days', decimals: 0 },
      validation: { min: 0, max: 180 },
      helpText: {
        napkin: "",
        mid: "Number of days for due diligence/inspection period. Standard: 30-45 days for apartments.",
        pro: "Due diligence period per PSA (days from contract execution to inspection contingency removal). Includes time for property condition assessment, environmental, financials review."
      }
    },
    {
      key: 'earnest_money',
      label: 'Earnest Money',
      type: 'currency',
      tier: 'mid',
      group: 'acquisition_details',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Earnest money deposit (typical: 1-5% of purchase price). Shows commitment and may be at risk if deal doesn't close.",
        pro: "Initial earnest money deposit per PSA escrow terms. Credit toward purchase at closing. May have 'hard' vs 'soft' tranches with different refund provisions."
      }
    },
    {
      key: 'sale_costs_pct',
      label: 'Sale Costs',
      type: 'percentage',
      tier: 'mid',
      group: 'disposition_details',
      format: { suffix: '%', decimals: 2 },
      validation: { min: 0, max: 5 },
      helpText: {
        napkin: "",
        mid: "Seller closing costs as % of sale price (typical: 1-2%). Includes title, escrow, legal fees. Excludes broker commission.",
        pro: "Disposition transaction costs as % of gross sale price. Includes title insurance, escrow fees, legal fees, transfer taxes. Excludes broker commission (separate line item)."
      }
    },
    {
      key: 'broker_commission_pct',
      label: 'Broker Commission',
      type: 'percentage',
      tier: 'mid',
      group: 'disposition_details',
      format: { suffix: '%', decimals: 2 },
      validation: { min: 0, max: 6 },
      helpText: {
        napkin: "",
        mid: "Broker commission as % of sale price (typical: 2-3% for multifamily). May negotiate lower for larger assets.",
        pro: "Selling broker commission rate per listing agreement. Institutional multifamily typically 2-2.5%. May structure as tiered based on sale price hurdles."
      }
    },
    {
      key: 'price_per_unit',
      label: 'Price per Unit',
      type: 'currency',
      tier: 'mid',
      group: 'validation_metrics',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      autoCalc: (values) => {
        if (values.purchase_price && values.unit_count) {
          return Math.round(values.purchase_price / values.unit_count);
        }
        return null;
      },
      dependsOn: ['purchase_price', 'unit_count'],
      helpText: {
        napkin: "",
        mid: "Purchase price divided by number of units. Key benchmarking metric for multifamily comparables.",
        pro: "Per-unit acquisition basis (total purchase price / unit count). Compare to recent comps in submarket. Typical ranges: $100-500K depending on market, age, quality."
      }
    },
    {
      key: 'price_per_sf',
      label: 'Price per SF',
      type: 'currency',
      tier: 'mid',
      group: 'validation_metrics',
      format: { prefix: '$', decimals: 2 },
      autoCalc: (values) => {
        if (values.purchase_price && values.rentable_sf) {
          return (values.purchase_price / values.rentable_sf).toFixed(2);
        }
        return null;
      },
      dependsOn: ['purchase_price', 'rentable_sf'],
      helpText: {
        napkin: "",
        mid: "Purchase price divided by rentable square feet. Alternative benchmarking metric, especially useful for comparing different unit mixes.",
        pro: "Per-SF acquisition basis (total purchase price / rentable SF). Normalizes value across properties with varying unit sizes. Typical: $150-400/SF depending on market."
      }
    },

    // ========================================
    // PRO TIER (6 additional fields)
    // ========================================
    {
      key: 'legal_fees',
      label: 'Legal Fees',
      type: 'currency',
      tier: 'pro',
      group: 'itemized_costs',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Attorney fees for purchase agreement review, entity formation (LP/LLC), title review, closing coordination. Typical: $15-50K depending on deal complexity."
      }
    },
    {
      key: 'financing_fees',
      label: 'Financing Fees',
      type: 'currency',
      tier: 'pro',
      group: 'itemized_costs',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Loan origination fees, appraisal ($5-15K), environmental Phase I ($3-8K). Note: Ongoing lender fees tracked separately in Basket 4 (Financing)."
      }
    },
    {
      key: 'third_party_reports',
      label: 'Third-Party Reports',
      type: 'currency',
      tier: 'pro',
      group: 'itemized_costs',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Property condition assessment ($5-15K), survey ($2-8K), zoning report ($1-3K), market study ($5-10K). Costs vary by property size and market."
      }
    },
    {
      key: 'depreciation_basis',
      label: 'Depreciation Basis',
      type: 'currency',
      tier: 'pro',
      group: 'tax_treatment',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      autoCalc: (values) => {
        if (values.purchase_price && values.improvement_pct) {
          return Math.round(values.purchase_price * (values.improvement_pct / 100));
        }
        return null;
      },
      dependsOn: ['purchase_price', 'improvement_pct'],
      helpText: {
        napkin: "",
        mid: "",
        pro: "Depreciable basis = purchase price × improvement allocation %. Multifamily depreciates over 27.5 years straight-line. Land is non-depreciable."
      }
    },
    {
      key: 'land_pct',
      label: 'Land Allocation',
      type: 'percentage',
      tier: 'pro',
      group: 'tax_treatment',
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 50 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "% of purchase price allocated to land (non-depreciable). Typical: 15-25% for multifamily. Should align with county assessor allocation or appraisal."
      }
    },
    {
      key: 'improvement_pct',
      label: 'Improvement Allocation',
      type: 'percentage',
      tier: 'pro',
      group: 'tax_treatment',
      format: { suffix: '%', decimals: 1 },
      autoCalc: (values) => {
        if (values.land_pct !== undefined) {
          return (100 - values.land_pct).toFixed(1);
        }
        return null;
      },
      dependsOn: ['land_pct'],
      helpText: {
        napkin: "",
        mid: "",
        pro: "% of purchase price allocated to improvements (depreciable). Auto-calculated as 100% - land %. This is your depreciation basis."
      }
    },
    {
      key: 'is_1031_exchange',
      label: '1031 Exchange?',
      type: 'toggle',
      tier: 'pro',
      group: 'tax_treatment',
      helpText: {
        napkin: "",
        mid: "",
        pro: "Is this acquisition part of a Section 1031 like-kind exchange? Affects timing (45-day ID, 180-day close), escrow requirements, and tax deferral on prior sale."
      }
    }
  ]
};
