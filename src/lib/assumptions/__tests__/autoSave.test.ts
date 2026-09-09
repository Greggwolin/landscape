/**
 * Loading the Investment Assumptions page must persist nothing.
 *
 * The page debounces a save ~1s after its state changes, and a page load IS a
 * state change: the fetched payload lands in state, then auto-calculated fields
 * (sale_date, improvement_pct, depreciation_basis) fire their onChange on mount
 * as soon as their dependencies are present. Nothing about that sequence
 * involves a person, so none of it may reach the save endpoint.
 *
 * These exercise the gate the page consults (`shouldAutoSaveAssumptions`) and
 * the rule that arms it (`armsAutoSave`), replaying the real event order.
 */

import {
  armsAutoSave,
  shouldAutoSaveAssumptions,
  type AssumptionValues,
  type ChangeOrigin
} from '../autoSave';

/**
 * What the server used to hand back for a project with no acquisition record —
 * a full set of deal terms nobody had chosen. Kept verbatim: the gate must hold
 * even against a payload this convincingly complete.
 */
const INVENTED_SERVER_PAYLOAD: AssumptionValues = {
  project_id: 7,
  purchase_price: null,
  acquisition_date: null,
  hold_period_years: 7.0,
  exit_cap_rate: 0.055,
  closing_costs_pct: 0.015,
  due_diligence_days: 30,
  sale_costs_pct: 0.015,
  broker_commission_pct: 0.025,
  land_pct: 20.0,
  improvement_pct: 80.0,
  is_1031_exchange: false
};

/** What the server returns now: shape without figures. */
const EMPTY_SERVER_PAYLOAD: AssumptionValues = {
  project_id: 7,
  purchase_price: null,
  acquisition_date: null,
  hold_period_years: null,
  exit_cap_rate: null,
  closing_costs_pct: null,
  due_diligence_days: null,
  sale_costs_pct: null,
  broker_commission_pct: null,
  land_pct: null,
  improvement_pct: null
};

/** Minimal stand-in for the page's per-basket state + armed flag. */
function makeBasket(loaded: AssumptionValues) {
  let values: AssumptionValues = { ...loaded };
  let userEdited = false;

  return {
    change(key: string, value: AssumptionValues[string], origin: ChangeOrigin) {
      values = { ...values, [key]: value };
      if (armsAutoSave(origin)) userEdited = true;
    },
    wouldSave() {
      return shouldAutoSaveAssumptions({ values, userEdited });
    },
    get values() {
      return values;
    }
  };
}

describe('assumptions auto-save arming', () => {
  it('does not save on a bare page load', () => {
    const basket = makeBasket(EMPTY_SERVER_PAYLOAD);
    expect(basket.wouldSave()).toBe(false);
  });

  it('does not save a full set of server-invented deal terms', () => {
    // The exact defect: the payload looks complete, the debounce fires, and
    // seven terms nobody chose become the project's own.
    const basket = makeBasket(INVENTED_SERVER_PAYLOAD);
    expect(basket.wouldSave()).toBe(false);
  });

  it('is not armed by auto-calculated fields firing on mount', () => {
    const basket = makeBasket(INVENTED_SERVER_PAYLOAD);

    // improvement_pct autoCalcs from land_pct, depreciation_basis from
    // purchase_price x improvement_pct — both emit on mount.
    basket.change('improvement_pct', 80.0, 'derived');
    basket.change('sale_date', '2033-01-01', 'derived');

    expect(basket.wouldSave()).toBe(false);
  });

  it('saves once a person edits a field', () => {
    const basket = makeBasket(EMPTY_SERVER_PAYLOAD);
    expect(basket.wouldSave()).toBe(false);

    basket.change('purchase_price', 2500000, 'user');

    expect(basket.wouldSave()).toBe(true);
  });

  it('carries derived values along once a person has armed the save', () => {
    const basket = makeBasket(EMPTY_SERVER_PAYLOAD);

    basket.change('land_pct', 25.0, 'user');
    basket.change('improvement_pct', 75.0, 'derived');

    expect(basket.wouldSave()).toBe(true);
    expect(basket.values.improvement_pct).toBe(75.0);
  });

  it('treats only a user change as arming', () => {
    expect(armsAutoSave('user')).toBe(true);
    expect(armsAutoSave('derived')).toBe(false);
  });

  it('will not fire on an empty state even when armed', () => {
    expect(shouldAutoSaveAssumptions({ values: {}, userEdited: true })).toBe(false);
  });
});
