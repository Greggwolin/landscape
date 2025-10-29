import { multifamilyOpExFields } from '@/config/opex/multifamily-fields';
import { PropertyMetrics, OpExDefaults } from '@/types/opex';

export function generateOpExDefaults(metrics: PropertyMetrics): OpExDefaults {
  const defaults: OpExDefaults = {};

  const { units, rentableSF, purchasePrice, effectiveGrossIncome, city, state } = metrics;

  // Geographic adjustment factors
  const geoAdjustments = getGeographicAdjustments(city, state);

  multifamilyOpExFields.forEach(field => {
    let value = 0;

    switch (field.key) {
      case 'property_taxes':
        value = (purchasePrice || 0) * 0.013 * geoAdjustments.property_taxes;
        break;

      case 'insurance':
        value = units * 420 * geoAdjustments.insurance;
        break;

      case 'utilities_combined':
        value = units * 1043 * geoAdjustments.utilities;
        break;

      case 'water_sewer':
        value = units * 422 * geoAdjustments.water_sewer;
        break;

      case 'gas_electric':
        value = rentableSF * 0.89 * geoAdjustments.gas_electric;
        break;

      case 'repairs_maintenance':
        // Adjust for property class and age
        const baseR_M = 1289;
        const ageAdjustment = metrics.yearBuilt && metrics.yearBuilt < 2000 ? 1.15 : 1.0;
        value = units * baseR_M * ageAdjustment;
        break;

      case 'property_management':
        value = 0.030; // Store as percentage, not dollar amount
        break;

      case 'landscaping':
        value = rentableSF * 0.21 * geoAdjustments.landscaping;
        break;

      case 'trash_removal':
        value = units * 315;
        break;

      case 'pest_control':
        value = units * 45;
        break;

      case 'pool_amenity_service':
        value = metrics.hasPool ? units * 154 : 0;
        break;

      case 'onsite_payroll':
        // Scale by unit count
        const staffingLevel = getStaffingLevel(units);
        value = units * staffingLevel;
        break;

      case 'administrative':
        value = rentableSF * 0.14;
        break;

      case 'marketing_advertising':
        value = units * 150;
        break;

      case 'unit_turnover':
        // 35% turnover assumption at $295/turn
        value = units * 0.35 * 295;
        break;

      case 'reserves_capex':
        value = units * 250;
        break;

      case 'other_operating':
        // Sum of subcategories if in basic mode
        const subcategories = ['landscaping', 'trash_removal', 'pest_control',
          'pool_amenity_service', 'administrative', 'marketing_advertising'];
        value = subcategories.reduce((sum, key) => {
          const subField = multifamilyOpExFields.find(f => f.key === key);
          if (!subField) return sum;

          let subValue = 0;
          switch (key) {
            case 'landscaping':
              subValue = rentableSF * 0.21 * geoAdjustments.landscaping;
              break;
            case 'trash_removal':
              subValue = units * 315;
              break;
            case 'pest_control':
              subValue = units * 45;
              break;
            case 'pool_amenity_service':
              subValue = metrics.hasPool ? units * 154 : 0;
              break;
            case 'administrative':
              subValue = rentableSF * 0.14;
              break;
            case 'marketing_advertising':
              subValue = units * 150;
              break;
          }
          return sum + subValue;
        }, 0);
        break;

      default:
        // For advanced tier detail fields, use benchmarks if available
        if (field.benchmarks?.perUnit) {
          value = units * field.benchmarks.perUnit.median;
        } else if (field.benchmarks?.perSF) {
          value = rentableSF * field.benchmarks.perSF.median;
        }
    }

    defaults[field.key] = {
      annualAmount: Math.round(value),
      perUnit: units > 0 ? Math.round(value / units) : 0,
      perSF: rentableSF > 0 ? Math.round((value / rentableSF) * 100) / 100 : 0,
      escalationRate: field.defaultEscalation || 0.03
    };
  });

  return defaults;
}

function getGeographicAdjustments(city?: string, state?: string): Record<string, number> {
  // Phoenix, Arizona adjustments (relative to national median)
  if (city?.toLowerCase().includes('phoenix') || state?.toLowerCase() === 'arizona') {
    return {
      property_taxes: 1.05,      // 5% above national avg
      insurance: 0.95,            // 5% below (no flood/hurricane)
      utilities: 1.15,            // 15% above
      water_sewer: 1.20,          // 20% above (desert climate)
      gas_electric: 1.25,         // 25% above (AC-heavy)
      landscaping: 0.85           // 15% below (xeriscaping)
    };
  }

  // Default: no adjustments
  return {
    property_taxes: 1.0,
    insurance: 1.0,
    utilities: 1.0,
    water_sewer: 1.0,
    gas_electric: 1.0,
    landscaping: 1.0
  };
}

function getStaffingLevel(units: number): number {
  // Staffing cost per unit based on property size
  if (units < 50) return 575;        // Minimal staff
  if (units < 100) return 550;       // Small property
  if (units < 200) return 525;       // Medium property
  return 500;                        // Large property (economies of scale)
}
