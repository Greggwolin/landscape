import { BasketConfig } from '@/types/assumptions';

export const basket5Config: BasketConfig = {
  basketId: 5,
  basketName: "The Split",
  basketDescription: "Equity structure, preferred return, promote waterfall.",
  icon: "pie-chart",
  tableName: "tbl_equity_structure",
  relatedTables: ['tbl_waterfall_tier', 'tbl_capital_call'],

  fieldGroups: [
    {
      id: 'equity_basics',
      label: 'Equity Structure',
      tier: 'napkin',
      fields: [
        'lp_ownership_pct',
        'gp_ownership_pct',
        'preferred_return_pct'
      ]
    },
    {
      id: 'promote_structure',
      label: 'Promote Structure',
      tier: 'mid',
      fields: [
        'gp_promote_after_pref',
        'catch_up_pct'
      ]
    },
    {
      id: 'return_targets',
      label: 'Return Targets',
      tier: 'mid',
      collapsible: true,
      fields: [
        'equity_multiple_target',
        'irr_target_pct',
        'distribution_frequency'
      ]
    }
  ],

  fields: [
    // EQUITY BASICS - NAPKIN TIER
    {
      key: 'lp_ownership_pct',
      label: 'LP Ownership %',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 100 },
      helpText: {
        napkin: "What % does the Limited Partner (investor) own? Typical: 90-95% LP ownership with promote.",
        mid: "LP (Limited Partner) ownership percentage. Represents passive investor(s) providing capital. Typical: 90-95% with GP promote structure.",
        pro: "LP ownership % before promote. Standard structure: 90-95% LP / 5-10% GP with GP promote after pref. Higher LP % = lower GP promote % needed for alignment."
      }
    },
    {
      key: 'gp_ownership_pct',
      label: 'GP Ownership %',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 100 },
      helpText: {
        napkin: "What % does the General Partner (sponsor) own? Typical: 5-10% GP ownership plus promote.",
        mid: "GP (General Partner) ownership percentage. Sponsor/operator. Typical: 5-10% before promote. GP earns additional returns via promote after pref.",
        pro: "GP base ownership % (before promote). Standard: 5-10% GP with 20-30% promote after 8% pref. GP often co-invests 5-10% of total equity to align interests."
      }
    },
    {
      key: 'preferred_return_pct',
      label: 'Preferred Return',
      type: 'percentage',
      tier: 'napkin',
      required: true,
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 20 },
      helpText: {
        napkin: "What return does the LP get first before the GP earns promote? 8% is typical.",
        mid: "Preferred return (pref) to LP before GP participates in promote. 8% is market standard. Paid on invested capital.",
        pro: "Annual preferred return to LP (hurdle before GP promote). 8% typical for multifamily. 6-7% for core, 9-10% for value-add. Compounds if not paid currently."
      }
    },

    // PROMOTE STRUCTURE - MID TIER
    {
      key: 'gp_promote_after_pref',
      label: 'GP Promote %',
      type: 'percentage',
      tier: 'mid',
      group: 'promote_structure',
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 50 },
      helpText: {
        napkin: "",
        mid: "GP promote % after LP pref is achieved. Typical: 20-30% promote. Example: after 8% pref, remaining profits split 70/30 or 80/20 (LP/GP).",
        pro: "GP promote (carried interest) after LP achieves pref return. Standard: 20% promote (80/20 split LP/GP). Higher for value-add/riskier deals: 25-30% promote."
      }
    },
    {
      key: 'catch_up_pct',
      label: 'GP Catch-Up %',
      type: 'percentage',
      tier: 'mid',
      group: 'promote_structure',
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 100 },
      helpText: {
        napkin: "",
        mid: "GP catch-up % after pref (if applicable). Example: 100% catch-up means GP gets 100% of profits after pref until GP reaches target promote %.",
        pro: "GP catch-up provision: after LP pref, GP receives X% of distributions until achieving pro-rata share. Common: 100% catch-up until GP reaches 20% of total distributions."
      }
    },

    // RETURN TARGETS - MID TIER
    {
      key: 'equity_multiple_target',
      label: 'Equity Multiple Target',
      type: 'number',
      tier: 'mid',
      group: 'return_targets',
      format: { suffix: 'x', decimals: 2 },
      validation: { min: 1, max: 5 },
      helpText: {
        napkin: "",
        mid: "Target equity multiple (total returns / invested capital). Example: 2.0x = double your money. Typical multifamily: 1.8-2.5x over 5-7 years.",
        pro: "Equity multiple (MOIC) = Total Distributions / Total Invested Capital. Core: 1.5-1.8x. Core+: 1.8-2.2x. Value-add: 2.0-2.5x. Opportunistic: 2.5x+."
      }
    },
    {
      key: 'irr_target_pct',
      label: 'IRR Target',
      type: 'percentage',
      tier: 'mid',
      group: 'return_targets',
      format: { suffix: '%', decimals: 1 },
      validation: { min: 0, max: 40 },
      helpText: {
        napkin: "",
        mid: "Target internal rate of return (annualized). Typical multifamily: 12-18% IRR depending on risk profile.",
        pro: "IRR target (annualized return on invested capital). Core: 8-12%. Core+: 12-15%. Value-add: 15-20%. Opportunistic: 20%+. Levered IRR includes debt."
      }
    },
    {
      key: 'distribution_frequency',
      label: 'Distribution Frequency',
      type: 'dropdown',
      tier: 'mid',
      group: 'return_targets',
      options: [
        { value: 'Monthly', label: 'Monthly' },
        { value: 'Quarterly', label: 'Quarterly' },
        { value: 'Annual', label: 'Annual' },
        { value: 'At Exit', label: 'At Exit Only' }
      ],
      helpText: {
        napkin: "",
        mid: "How often are cash distributions paid to investors? Quarterly is most common for stabilized multifamily.",
        pro: "Distribution frequency: Quarterly most common for stabilized assets. Monthly for core. Annual or at-exit for value-add/development. Specified in LP Agreement."
      }
    }
  ]
};
