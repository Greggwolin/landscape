import { BasketConfig } from '@/types/assumptions';

export const basket4Config: BasketConfig = {
  basketId: 4,
  basketName: "The Financing",
  basketDescription: "Debt structure, rates, terms, and covenants.",
  icon: "credit-card",
  tableName: "tbl_loan",
  relatedTables: ['tbl_debt_draw_schedule'],

  fieldGroups: [
    {
      id: 'loan_basics',
      label: 'Loan Basics',
      tier: 'napkin',
      fields: [
        'loan_amount',
        'interest_rate_pct',
        'amortization_years',
        'loan_term_years'
      ]
    },
    {
      id: 'loan_metrics',
      label: 'Loan Metrics',
      tier: 'mid',
      fields: [
        'ltv_pct',
        'dscr',
        'interest_only_years'
      ]
    },
    {
      id: 'loan_fees',
      label: 'Loan Fees',
      tier: 'mid',
      collapsible: true,
      fields: [
        'origination_fee_pct',
        'lender_legal_fees',
        'third_party_reports'
      ]
    },
    {
      id: 'rate_structure',
      label: 'Rate Structure',
      tier: 'mid',
      collapsible: true,
      fields: [
        'rate_type',
        'index_spread_bps'
      ]
    },
    {
      id: 'prepayment',
      label: 'Prepayment & Exit',
      tier: 'pro',
      collapsible: true,
      fields: [
        'prepayment_penalty_structure',
        'prepayment_penalty_years'
      ]
    },
    {
      id: 'guarantees',
      label: 'Guarantees & Recourse',
      tier: 'pro',
      collapsible: true,
      fields: [
        'guarantee_type',
        'guarantor_name'
      ]
    },
    {
      id: 'covenants',
      label: 'Loan Covenants',
      tier: 'pro',
      collapsible: true,
      fields: [
        'loan_covenant_dscr_min',
        'loan_covenant_ltv_max'
      ]
    },
    {
      id: 'reserves',
      label: 'Lender Reserves',
      tier: 'pro',
      collapsible: true,
      fields: [
        'replacement_reserve_per_unit',
        'tax_insurance_escrow_months'
      ]
    },
    {
      id: 'other_terms',
      label: 'Other Terms',
      tier: 'pro',
      collapsible: true,
      fields: [
        'commitment_fee_pct',
        'extension_option_years',
        'extension_fee_bps'
      ]
    }
  ],

  fields: [
    // LOAN BASICS - NAPKIN TIER
    {
      key: 'loan_amount',
      label: 'Loan Amount',
      type: 'currency',
      tier: 'napkin',
      required: true,
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "How much are you borrowing? This is your total loan amount.",
        mid: "Total loan commitment. Typical multifamily LTV: 65-75% for permanent financing.",
        pro: "Total loan commitment per term sheet. Distinguish initial funding vs total commitment for construction/value-add deals."
      }
    },
    {
      key: 'interest_rate_pct',
      label: 'Interest Rate',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 2 },
      validation: { min: 0, max: 15 },
      helpText: {
        napkin: "What's your interest rate? This is the annual rate you'll pay on the loan.",
        mid: "Annual interest rate. For floating rate, enter all-in rate (index + spread). Typical: 4-7% depending on market conditions.",
        pro: "Annual interest rate per loan docs. For fixed rate: rate quoted. For floating: SOFR/LIBOR + spread. Confirm rate lock vs float."
      }
    },
    {
      key: 'amortization_years',
      label: 'Amortization Period',
      type: 'number',
      tier: 'napkin',
      required: true,
      format: { suffix: ' years', decimals: 0 },
      validation: { min: 0, max: 40 },
      helpText: {
        napkin: "How many years to pay off the loan? 30 years is typical for multifamily. Longer amortization = lower payment.",
        mid: "Amortization schedule (years to full payoff). 30-year typical for stabilized multifamily. May be IO (interest-only) initially.",
        pro: "Amortization term per loan docs. 30-year amortization most common for multifamily agency loans. Shorter amortization reduces proceeds but builds equity faster."
      }
    },
    {
      key: 'loan_term_years',
      label: 'Loan Term',
      type: 'number',
      tier: 'napkin',
      required: true,
      format: { suffix: ' years', decimals: 0 },
      validation: { min: 1, max: 30 },
      helpText: {
        napkin: "How many years until the loan matures? 5-10 years is typical. You'll need to pay off or refinance at maturity.",
        mid: "Loan maturity term. Common: 5/7/10 years. Loan matures before amortization complete → balloon payment at maturity.",
        pro: "Loan term to maturity per commitment. Shorter than amortization → balloon payment at maturity. Match term to expected hold period to avoid refinance risk."
      }
    },

    // LOAN METRICS - MID TIER
    {
      key: 'ltv_pct',
      label: 'Loan-to-Value (LTV)',
      type: 'percentage',
      tier: 'mid',
      group: 'loan_metrics',
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 100 },
      helpText: {
        napkin: "",
        mid: "Loan amount as % of property value. Typical multifamily: 65-75% LTV. Lower LTV = more equity required but less leverage risk.",
        pro: "LTV = Loan Amount / Purchase Price (or Appraised Value). Standard stabilized multifamily: 70-75%. Value-add/lease-up: 65-70%. Agency allows up to 80% with strong metrics."
      }
    },
    {
      key: 'dscr',
      label: 'Debt Service Coverage Ratio',
      type: 'number',
      tier: 'mid',
      group: 'loan_metrics',
      format: { suffix: 'x', decimals: 2 },
      validation: { min: 0, max: 5 },
      helpText: {
        napkin: "",
        mid: "NOI divided by annual debt service. Measures ability to service debt. Lenders require minimum 1.20-1.25x DSCR.",
        pro: "DSCR = NOI / Annual Debt Service. Minimum covenant typically 1.20-1.25x. Calculate using T-12 NOI (stabilized). Higher DSCR = more debt capacity."
      }
    },
    {
      key: 'interest_only_years',
      label: 'Interest-Only Period',
      type: 'number',
      tier: 'mid',
      group: 'loan_metrics',
      format: { suffix: ' years', decimals: 0 },
      validation: { min: 0, max: 10 },
      helpText: {
        napkin: "",
        mid: "Years with interest-only payments (no principal amortization). Typical: 1-3 years IO for value-add deals. Improves early cashflow.",
        pro: "Interest-only period (years before amortization begins). Common for bridge/value-add loans. Agency loans typically fully amortizing. IO improves Year 1-3 cashflow but increases refi risk."
      }
    },

    // LOAN FEES - MID TIER
    {
      key: 'origination_fee_pct',
      label: 'Origination Fee',
      type: 'percentage',
      tier: 'mid',
      group: 'loan_fees',
      format: { suffix: '%', decimals: 2 },
      validation: { min: 0, max: 5 },
      helpText: {
        napkin: "",
        mid: "Loan origination fee as % of loan amount. Typical: 0.50-1.50%. Paid at closing.",
        pro: "Loan origination/placement fee as % of loan amount. Agency: 0.50-1.00%. Banks: 0.75-1.50%. Paid upfront at closing. May be financed into loan."
      }
    },
    {
      key: 'lender_legal_fees',
      label: 'Lender Legal Fees',
      type: 'currency',
      tier: 'mid',
      group: 'loan_fees',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Lender's legal fees (borrower-paid). $10-30K typical depending on loan complexity.",
        pro: "Lender's attorney fees for loan documentation, due diligence, closing. Borrower typically pays. $15-50K depending on deal size and complexity."
      }
    },
    {
      key: 'third_party_reports',
      label: 'Third-Party Reports',
      type: 'currency',
      tier: 'mid',
      group: 'loan_fees',
      format: { prefix: '$', decimals: 0, thousandsSeparator: true },
      helpText: {
        napkin: "",
        mid: "Lender-required reports: appraisal, environmental Phase I, property condition assessment. $15-40K total.",
        pro: "Third-party reports for lender: appraisal ($8-20K), Phase I environmental ($3-8K), PCA ($5-15K), seismic/engineering (if required). Borrower pays."
      }
    },

    // RATE STRUCTURE - MID TIER
    {
      key: 'rate_type',
      label: 'Rate Type',
      type: 'dropdown',
      tier: 'mid',
      group: 'rate_structure',
      options: [
        { value: 'Fixed', label: 'Fixed Rate' },
        { value: 'Floating', label: 'Floating Rate' },
        { value: 'Hybrid', label: 'Hybrid (Fixed then Floating)' }
      ],
      helpText: {
        napkin: "",
        mid: "Fixed rate: rate locked for loan term. Floating rate: adjusts with index (SOFR). Hybrid: fixed for initial period, then floats.",
        pro: "Rate structure: (1) Fixed = locked rate for term, (2) Floating = SOFR/LIBOR + spread with periodic adjustments, (3) Hybrid = fixed for 3-5 years then float."
      }
    },
    {
      key: 'index_spread_bps',
      label: 'Index Spread (if floating)',
      type: 'number',
      tier: 'mid',
      group: 'rate_structure',
      format: { suffix: ' bps', decimals: 0 },
      validation: { min: 0, max: 1000 },
      helpText: {
        napkin: "",
        mid: "Spread over index for floating rate loans (in basis points). Example: SOFR + 250 bps. 100 bps = 1.00%.",
        pro: "Spread over benchmark index (SOFR, Term SOFR, LIBOR legacy). Expressed in basis points (bps). Typical multifamily: 200-300 bps depending on leverage and property quality."
      }
    },

    // PREPAYMENT - PRO TIER
    {
      key: 'prepayment_penalty_structure',
      label: 'Prepayment Penalty Structure',
      type: 'text',
      tier: 'pro',
      group: 'prepayment',
      helpText: {
        napkin: "",
        mid: "",
        pro: "Prepayment penalty structure: (1) Defeasance (agency standard), (2) Yield Maintenance, (3) Declining Step-Down (e.g., 5-4-3-2-1), (4) None. Critical for exit planning."
      }
    },
    {
      key: 'prepayment_penalty_years',
      label: 'Prepayment Lockout Period',
      type: 'number',
      tier: 'pro',
      group: 'prepayment',
      format: { suffix: ' years', decimals: 0 },
      validation: { min: 0, max: 10 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Years with prepayment lockout or penalty. Agency loans: defeasance required entire term. Bank loans: step-down or YM for 2-5 years. Bridge: minimal prepayment penalty."
      }
    },

    // GUARANTEES - PRO TIER
    {
      key: 'guarantee_type',
      label: 'Guarantee Type',
      type: 'dropdown',
      tier: 'pro',
      group: 'guarantees',
      options: [
        { value: 'Non-Recourse', label: 'Non-Recourse' },
        { value: 'Carve-Out', label: 'Non-Recourse with Carve-Outs' },
        { value: 'Full Recourse', label: 'Full Recourse' },
        { value: 'Partial Recourse', label: 'Partial Recourse' }
      ],
      helpText: {
        napkin: "",
        mid: "",
        pro: "Guarantee structure: (1) Non-Recourse = lender can only pursue property collateral, (2) Carve-Out = non-recourse except for bad acts (fraud, bankruptcy, environmental), (3) Full Recourse = personal guarantee for entire loan."
      }
    },
    {
      key: 'guarantor_name',
      label: 'Guarantor Name',
      type: 'text',
      tier: 'pro',
      group: 'guarantees',
      helpText: {
        napkin: "",
        mid: "",
        pro: "Name of individual or entity providing guarantee. Key sponsor/borrower. Lender will underwrite guarantor's liquidity and net worth."
      }
    },

    // COVENANTS - PRO TIER
    {
      key: 'loan_covenant_dscr_min',
      label: 'Minimum DSCR Covenant',
      type: 'number',
      tier: 'pro',
      group: 'covenants',
      format: { suffix: 'x', decimals: 2 },
      validation: { min: 0, max: 3 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Minimum DSCR required by lender (ongoing covenant). Typical: 1.20-1.25x. Tested quarterly or annually. Breach may trigger cash sweep or default."
      }
    },
    {
      key: 'loan_covenant_ltv_max',
      label: 'Maximum LTV Covenant',
      type: 'percentage',
      tier: 'pro',
      group: 'covenants',
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 100 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Maximum LTV allowed (ongoing covenant). Less common for stabilized loans. More common for floating-rate/value-add. Breach may require equity cure or paydown."
      }
    },

    // RESERVES - PRO TIER
    {
      key: 'replacement_reserve_per_unit',
      label: 'Replacement Reserve per Unit',
      type: 'currency',
      tier: 'pro',
      group: 'reserves',
      format: { prefix: '$', decimals: 0 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Monthly replacement reserve deposit per unit required by lender. Typical: $250-350/unit/year ($20-30/unit/month). Held by lender, released for approved CapEx."
      }
    },
    {
      key: 'tax_insurance_escrow_months',
      label: 'Tax & Insurance Escrow',
      type: 'number',
      tier: 'pro',
      group: 'reserves',
      format: { suffix: ' months', decimals: 0 },
      validation: { min: 0, max: 12 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Months of property tax and insurance escrowed with lender. Typical: 3-6 months upfront. Lender pays taxes/insurance from escrow account."
      }
    },

    // OTHER TERMS - PRO TIER
    {
      key: 'commitment_fee_pct',
      label: 'Commitment Fee',
      type: 'percentage',
      tier: 'pro',
      group: 'other_terms',
      format: { suffix: '%', decimals: 2 },
      validation: { min: 0, max: 2 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Upfront commitment fee for loan (% of commitment). Common for construction/bridge loans. 0.25-1.00% typical. Separate from origination fee."
      }
    },
    {
      key: 'extension_option_years',
      label: 'Extension Option',
      type: 'number',
      tier: 'pro',
      group: 'other_terms',
      format: { suffix: ' years', decimals: 0 },
      validation: { min: 0, max: 5 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Number of years available via extension option. Common for bridge/value-add loans: 2+1 (two years with one year extension). Subject to performance conditions."
      }
    },
    {
      key: 'extension_fee_bps',
      label: 'Extension Fee',
      type: 'number',
      tier: 'pro',
      group: 'other_terms',
      format: { suffix: ' bps', decimals: 0 },
      validation: { min: 0, max: 100 },
      helpText: {
        napkin: "",
        mid: "",
        pro: "Fee to exercise extension option (basis points of loan balance). Typical: 25-50 bps. Paid at extension exercise. May require performance criteria (min DSCR, max LTC)."
      }
    }
  ]
};
