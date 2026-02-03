// ========= VERSION: v1.0 — 2025-09-06 =========
// Summary: Fixes build errors by (1) aligning file paths, (2) adding
// proper TypeScript types to MarketAssumptions, and (3) syncing
// Navigation prop types with page.tsx state union.

// ================================
// A) app/components/Market/MarketAssumptions.tsx
// (Create this exact path and filename)
// ================================

"use client";
import React, { useState } from "react";
import { X } from "lucide-react";
import { SemanticButton } from '@/components/ui/landscape';

// ---- Types ----
interface MarketFactor {
  id: number;
  name: string;
  value: number;
  unit: string;
  dvl: string;
  enabled: boolean;
}

interface GrowthRate {
  id: number;
  name: string;
  value: number;
  detail?: boolean;
}

interface CostItem {
  id: number;
  name: string;
  amount: number | "";
  unit: string;
  dvl: string;
  enabled: boolean;
}

interface ProjectCosts {
  planningEngineering: CostItem[];
  development: CostItem[];
  ownership: CostItem[];
  carryCosts: CostItem[];
}

type SectionKey = keyof ProjectCosts;

type InflationOption = "Global" | "Custom 1" | "Custom 2" | "Custom 3" | "D";

type UomOption = "$/SF" | "$/FF" | "$/Unit" | "$/Acre" | "Ann/Qtr/Mo" | "Lot" | "$/DU";

interface LandUsePricingRow {
  id: number;
  code: string;
  description: string;
  price: number;
  uom: UomOption;
  inflationRate: Exclude<InflationOption, "D"> | "D";
}

// =====================================
// Component
// =====================================
const MarketAssumptions: React.FC = () => {
  const [marketFactors, setMarketFactors] = useState<MarketFactor[]>([
    { id: 1, name: "Housing Demand", value: 500, unit: "Units / Year, Mo or Qtr", dvl: "DVL", enabled: true },
    { id: 2, name: "Contingency", value: 10.0, unit: "Detail", dvl: "Allow for up to 5 user-named contingency rates", enabled: true },
    { id: 3, name: "Commissions", value: 3.0, unit: "Net / Gross", dvl: "Detail", enabled: true },
    { id: 4, name: "Other / COS", value: 1.0, unit: "Net / Gross", dvl: "boolean", enabled: true },
    { id: 5, name: "Other", value: 1.0, unit: "Net / Gross", dvl: "boolean", enabled: false },
    { id: 6, name: "Other", value: 1.0, unit: "Net / Gross", dvl: "boolean", enabled: false },
    { id: 7, name: "Other", value: 1.0, unit: "Net / Gross", dvl: "boolean", enabled: false },
  ]);

  const [growthRates, setGrowthRates] = useState<GrowthRate[]>([
    { id: 1, name: "Prices / Revenue", value: 3.0, detail: true },
    { id: 2, name: "Direct Project Costs", value: 3.0, detail: true },
  ]);

  const [projectCosts, setProjectCosts] = useState<ProjectCosts>({
    planningEngineering: [
      { id: 1, name: "Entitlement Cost", amount: 250, unit: "$/FF", dvl: "DVL", enabled: true },
      { id: 2, name: "Engineering Cost", amount: 1750, unit: "Lot", dvl: "DVL", enabled: true },
      ...Array.from({ length: 8 }, (_, i) => ({ id: i + 3, name: "", amount: "" as const, unit: "$/FF", dvl: "DVL", enabled: false })),
    ],
    development: [
      { id: 1, name: "Project Costs (Offsite)", amount: 100, unit: "$/FF", dvl: "DVL", enabled: true },
      { id: 2, name: "Project Costs (Onsite)", amount: 200, unit: "$/FF", dvl: "DVL", enabled: true },
      { id: 3, name: "Subdivision Development Cost", amount: 1300, unit: "$/FF", dvl: "DVL", enabled: true },
      { id: 4, name: "Other 1", amount: "", unit: "$/FF", dvl: "DVL", enabled: false },
      ...Array.from({ length: 6 }, (_, i) => ({ id: i + 5, name: "", amount: "" as const, unit: "$/FF", dvl: "DVL", enabled: false })),
    ],
    ownership: [
      { id: 1, name: "Management Fees", amount: 300000, unit: "Ann/Qtr/Mo", dvl: "DVL", enabled: true },
      { id: 2, name: "General & Administrative", amount: 50000, unit: "Ann/Qtr/Mo", dvl: "DVL", enabled: true },
      { id: 3, name: "Legal & Accounting", amount: 10000, unit: "Ann/Qtr/Mo", dvl: "DVL", enabled: true },
      { id: 4, name: "Other", amount: "", unit: "Ann/Qtr/Mo", dvl: "DVL", enabled: false },
      ...Array.from({ length: 6 }, (_, i) => ({ id: i + 5, name: "", amount: "" as const, unit: "Ann/Qtr/Mo", dvl: "DVL", enabled: false })),
    ],
    carryCosts: [
      { id: 1, name: "Property Tax", amount: 50, unit: "$/Acre", dvl: "DVL", enabled: true },
      { id: 2, name: "Insurance", amount: 20, unit: "$/Acre", dvl: "DVL", enabled: true },
      { id: 3, name: "Other 1", amount: "", unit: "$/Acre", dvl: "DVL", enabled: false },
      { id: 4, name: "Other 2", amount: "", unit: "$/Acre", dvl: "DVL", enabled: false },
      ...Array.from({ length: 6 }, (_, i) => ({ id: i + 5, name: "", amount: "" as const, unit: "$/Acre", dvl: "DVL", enabled: false })),
    ],
  });

  const [landUsePricing, setLandUsePricing] = useState<LandUsePricingRow[]>([
    { id: 1, code: "C", description: "Commercial", price: 10, uom: "$/SF", inflationRate: "Global" },
    { id: 2, code: "HDR", description: "High Density Residential", price: 25000, uom: "$/Unit", inflationRate: "Global" },
    { id: 3, code: "MDR", description: "Medium Density Residential", price: 2400, uom: "$/FF", inflationRate: "Global" },
    { id: 4, code: "MHDR", description: "Medium-High Density Residential", price: 50000, uom: "$/Unit", inflationRate: "Custom 1" },
    { id: 5, code: "MLDR", description: "Medium-Low Density Residential", price: 2200, uom: "$/FF", inflationRate: "Custom 2" },
    { id: 6, code: "MU", description: "Mixed Use", price: 10, uom: "$/SF", inflationRate: "Global" },
    { id: 7, code: "OS", description: "Open Space", price: 0, uom: "$/Acre", inflationRate: "Global" },
  ]);

  const [showCommissionDetail, setShowCommissionDetail] = useState<boolean>(false);
  const [showGrowthDetail, setShowGrowthDetail] = useState<boolean>(false);
  const [selectedGrowthRate, setSelectedGrowthRate] = useState<number | string | null>(null);

  const inflationOptions: Exclude<InflationOption, "D">[] = ["Global", "Custom 1", "Custom 2", "Custom 3"];
  const uomOptions: UomOption[] = ["$/SF", "$/FF", "$/Unit", "$/Acre", "$/DU"];

  // ---- Updaters ----
  const updateProjectCost = (
    section: SectionKey,
    id: number,
    field: keyof CostItem,
    value: string | number | boolean
  ) => {
    setProjectCosts((prev) => ({
      ...prev,
      [section]: prev[section].map((item) =>
        item.id === id ? { ...item, [field]: value as never } : item
      ),
    }));
  };

  const renderCostSection = (title: string, section: CostItem[], sectionKey: SectionKey) => (
    <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="flex text-xs text-slate-300 mt-1">
          <div className="w-1/2">Item</div>
          <div className="w-1/4 text-center">Amount</div>
          <div className="w-1/4 text-center">Unit</div>
        </div>
      </div>
      <div className="p-2 space-y-1">
        {section.filter((it) => it.enabled || it.name).map((item) => (
          <div key={item.id} className="flex items-center text-xs space-x-2">
            <div className="w-1/2">
              <input
                type="text"
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                placeholder="Item name"
                value={item.name}
                onChange={(e) => updateProjectCost(sectionKey, item.id, "name", e.target.value)}
              />
            </div>
            <div className="w-1/4">
              <input
                type="number"
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
                value={item.amount === "" ? "" : Number(item.amount)}
                onChange={(e) => updateProjectCost(sectionKey, item.id, "amount", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="w-1/4">
              <select
                className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                value={item.unit}
                onChange={(e) => updateProjectCost(sectionKey, item.id, "unit", e.target.value)}
              >
                <option value="$/FF">$/FF</option>
                <option value="$/SF">$/SF</option>
                <option value="$/Unit">$/Unit</option>
                <option value="$/Acre">$/Acre</option>
                <option value="Ann/Qtr/Mo">Ann/Qtr/Mo</option>
                <option value="Lot">Lot</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4 bg-slate-900 min-h-screen text-white">
      {/* Market Factors */}
      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
        <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
          <h2 className="text-sm font-semibold text-white">Market Factors</h2>
        </div>
        <div className="bg-slate-700 px-3 py-1 border-b border-slate-600">
          <h3 className="text-xs font-medium text-slate-300">Other Market Factors</h3>
        </div>
        <div className="p-2 space-y-1">
          {marketFactors.filter((f) => f.enabled).map((item) => (
            <div key={item.id} className="flex items-center text-xs space-x-2">
              <div className="w-1/3 text-white">{item.name}</div>
              <div className="w-1/6">
                <input
                  type="number"
                  step={0.1}
                  className="w-full bg-yellow-100 border border-slate-600 rounded px-2 py-1 text-slate-800 text-xs text-center"
                  value={item.value}
                  onChange={(e) =>
                    setMarketFactors((prev) =>
                      prev.map((f) =>
                        f.id === item.id ? { ...f, value: parseFloat(e.target.value) || 0 } : f
                      )
                    )
                  }
                />
              </div>
              <div className="w-1/4 text-blue-400">
                {item.name === "Commissions" ? (
                  <button onClick={() => setShowCommissionDetail(true)} className="text-blue-400 hover:text-blue-300 underline">
                    {item.unit}
                  </button>
                ) : (
                  item.unit
                )}
              </div>
              <div className="w-1/4 text-slate-400 text-xs">{item.dvl}</div>
            </div>
          ))}
        </div>

        <div className="bg-slate-700 px-3 py-1 border-b border-slate-600 border-t">
          <h3 className="text-xs font-medium text-slate-300">Growth Rates</h3>
        </div>
        <div className="p-2 space-y-1">
          {growthRates.map((g) => (
            <div key={g.id} className="flex items-center text-xs space-x-2">
              <div className="w-1/3 text-white">{g.name}</div>
              <div className="w-1/6">
                <input
                  type="number"
                  step={0.1}
                  className="w-full bg-yellow-100 border border-slate-600 rounded px-2 py-1 text-slate-800 text-xs text-center"
                  value={g.value}
                  onChange={(e) =>
                    setGrowthRates((prev) =>
                      prev.map((r) => (r.id === g.id ? { ...r, value: parseFloat(e.target.value) || 0 } : r))
                    )
                  }
                />
              </div>
              <div className="w-1/4">
                <button
                  onClick={() => {
                    setSelectedGrowthRate(g.id);
                    setShowGrowthDetail(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                >
                  Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderCostSection("Project Costs - Planning and Engineering", projectCosts.planningEngineering, "planningEngineering")}
        {renderCostSection("Project Development Costs", projectCosts.development, "development")}
        {renderCostSection("Ownership Cost", projectCosts.ownership, "ownership")}
        {renderCostSection("Project Carry Cost Annual", projectCosts.carryCosts, "carryCosts")}
      </div>

      {/* Land Use Pricing */}
      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
        <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
          <h2 className="text-sm font-semibold text-white">Current Land Pricing</h2>
          <div className="flex text-xs text-slate-300 mt-1">
            <div className="w-1/6">LU Code</div>
            <div className="w-2/6">Description</div>
            <div className="w-1/6 text-center">$/Unit</div>
            <div className="w-1/6 text-center">UOM</div>
            <div className="w-1/6 text-center">Inflate</div>
          </div>
        </div>
        <div className="p-2 space-y-1">
          {landUsePricing.map((lu) => (
            <div key={lu.id} className="flex items-center text-xs space-x-2">
              <div className="w-1/6">
                <input
                  type="text"
                  className="w-full bg-blue-900 border border-slate-600 rounded px-2 py-1 text-white text-xs font-medium"
                  value={lu.code}
                  onChange={(e) => setLandUsePricing((prev) => prev.map((r) => (r.id === lu.id ? { ...r, code: e.target.value } : r)))}
                />
              </div>
              <div className="w-2/6">
                <input
                  type="text"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                  value={lu.description}
                  onChange={(e) => setLandUsePricing((prev) => prev.map((r) => (r.id === lu.id ? { ...r, description: e.target.value } : r)))}
                />
              </div>
              <div className="w-1/6">
                <input
                  type="number"
                  className="w-full bg-yellow-100 border border-slate-600 rounded px-2 py-1 text-slate-800 text-xs text-center"
                  value={lu.price}
                  onChange={(e) => setLandUsePricing((prev) => prev.map((r) => (r.id === lu.id ? { ...r, price: parseFloat(e.target.value) || 0 } : r)))}
                />
              </div>
              <div className="w-1/6">
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                  value={lu.uom}
                  onChange={(e) => setLandUsePricing((prev) => prev.map((r) => (r.id === lu.id ? { ...r, uom: e.target.value as UomOption } : r)))}
                >
                  {uomOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-1/6">
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
                  value={lu.inflationRate}
                  onChange={(e) => {
                    const val = e.target.value as InflationOption;
                    if (val === "D") {
                      setSelectedGrowthRate(`lu_${lu.id}`);
                      setShowGrowthDetail(true);
                    } else {
                      setLandUsePricing((prev) => prev.map((r) => (r.id === lu.id ? { ...r, inflationRate: val } : r)));
                    }
                  }}
                >
                  {inflationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  <option value="D">D</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCommissionDetail && <CommissionDetailModal onClose={() => setShowCommissionDetail(false)} />}
      {showGrowthDetail && <GrowthRateDetailModal onClose={() => setShowGrowthDetail(false)} rateId={selectedGrowthRate} />}
    </div>
  );
};

// =================== Modals ===================
interface ModalBaseProps { onClose: () => void }

const CommissionDetailModal: React.FC<ModalBaseProps> = ({ onClose }) => {
  const [commissionRates, setCommissionRates] = useState(
    [
      { id: 1, landUse: "MDR", rate: 3.0, basis: "Net" },
      { id: 2, landUse: "HDR", rate: 3.5, basis: "Net" },
      { id: 3, landUse: "C", rate: 4.0, basis: "Gross" },
      { id: 4, landUse: "MU", rate: 3.5, basis: "Net" },
    ] as { id: number; landUse: string; rate: number; basis: "Net" | "Gross" }[]
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-2xl mx-4">
        <div className="px-4 py-3 border-b border-gray-600 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Commission Rates by Land Use</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            <div className="flex text-xs text-slate-300 pb-2 border-b border-slate-600">
              <div className="w-1/3">Land Use</div>
              <div className="w-1/3 text-center">Rate (%)</div>
              <div className="w-1/3 text-center">Basis</div>
            </div>
            {commissionRates.map((rate) => (
              <div key={rate.id} className="flex items-center space-x-2">
                <div className="w-1/3">
                  <input
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    value={rate.landUse}
                    onChange={(e) => setCommissionRates((prev) => prev.map((r) => (r.id === rate.id ? { ...r, landUse: e.target.value } : r)))}
                  />
                </div>
                <div className="w-1/3">
                  <input
                    type="number"
                    step={0.1}
                    className="w-full bg-yellow-100 border border-slate-600 rounded px-2 py-1 text-slate-800 text-sm text-center"
                    value={rate.rate}
                    onChange={(e) => setCommissionRates((prev) => prev.map((r) => (r.id === rate.id ? { ...r, rate: parseFloat(e.target.value) || 0 } : r)))}
                  />
                </div>
                <div className="w-1/3">
                  <select
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    value={rate.basis}
                    onChange={(e) => setCommissionRates((prev) => prev.map((r) => (r.id === rate.id ? { ...r, basis: e.target.value as "Net" | "Gross" } : r)))}
                  >
                    <option value="Net">Net</option>
                    <option value="Gross">Gross</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-600 flex justify-end space-x-3">
          <SemanticButton intent="primary-action" size="sm" onClick={onClose}>Save & Close</SemanticButton>
        </div>
      </div>
    </div>
  );
};

interface GrowthRateModalProps extends ModalBaseProps { rateId: number | string | null }

const GrowthRateDetailModal: React.FC<GrowthRateModalProps> = ({ onClose }) => {
  const [steps, setSteps] = useState(
    [
      { id: 1, fromPeriod: 1, rate: 2.0, periods: 16, thruPeriod: 16 },
      { id: 2, fromPeriod: 17, rate: 3.0, periods: 24, thruPeriod: 40 },
      { id: 3, fromPeriod: 41, rate: 2.5, periods: 20, thruPeriod: 44 },
      { id: 4, fromPeriod: 45, rate: 2.0, periods: "E" as const, thruPeriod: 180 },
      { id: 5, fromPeriod: "" as unknown as number, rate: "" as unknown as number, periods: "" as const, thruPeriod: 180 },
    ] as { id: number; fromPeriod: number; rate: number; periods: number | "E" | ""; thruPeriod: number }[]
  );

  const updateStep = (id: number, field: keyof (typeof steps)[number], value: number | string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-2xl mx-4">
        <div className="px-4 py-3 border-b border-slate-600 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Custom Growth Rate</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-slate-700 rounded p-3">
            <div className="flex text-xs text-slate-300 pb-2 border-b border-slate-600 mb-2">
              <div className="w-1/6">Step</div>
              <div className="w-1/6">From Period</div>
              <div className="w-1/6">Rate</div>
              <div className="w-1/6">Periods</div>
              <div className="w-1/6">Thru Period</div>
            </div>
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-2 mb-1">
                <div className="w-1/6 text-white text-sm font-medium">{index + 1}</div>
                <div className="w-1/6">
                  <input
                    type="number"
                    className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                    value={step.fromPeriod}
                    onChange={(e) => updateStep(step.id, "fromPeriod", Number(e.target.value))}
                  />
                </div>
                <div className="w-1/6">
                  <div className="flex items-center">
                    <input
                      type="number"
                      step={0.1}
                      className="w-full bg-yellow-100 border border-slate-500 rounded px-2 py-1 text-slate-800 text-sm font-medium"
                      value={step.rate}
                      onChange={(e) => updateStep(step.id, "rate", Number(e.target.value))}
                    />
                    <span className="ml-1 text-blue-400 text-sm font-medium">%</span>
                  </div>
                </div>
                <div className="w-1/6">
                  <input
                    type="text"
                    className="w-full bg-yellow-100 border border-slate-500 rounded px-2 py-1 text-slate-800 text-sm font-medium"
                    value={String(step.periods)}
                    onChange={(e) => updateStep(step.id, "periods", e.target.value)}
                  />
                </div>
                <div className="w-1/6 text-slate-300 text-sm">{step.thruPeriod}</div>
              </div>
            ))}
            <div className="mt-3 text-xs text-slate-400">E = End of Analysis</div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-600 flex justify-end space-x-3">
          <SemanticButton intent="secondary-action" size="sm" onClick={onClose}>Cancel</SemanticButton>
          <SemanticButton intent="primary-action" size="sm" onClick={onClose}>Save / Update</SemanticButton>
        </div>
      </div>
    </div>
  );
};

export default MarketAssumptions;

// ================================
// B) app/page.tsx — import path + types synced
// ================================

// NOTE: Ensure this import matches the file path created above.
// import MarketAssumptions from "./components/Market/MarketAssumptions";

// Also ensure your state union matches Navigation props, e.g.:
// const [activeView, setActiveView] = useState<"overview" | "planning" | "budget" | "market">("overview");

// ================================
// C) app/components/Navigation.tsx — prop types
// ================================

// Replace the existing interface with this to accept the union + Dispatch:
/*
import React from "react";

interface NavigationProps {
  activeView: "overview" | "planning" | "budget" | "market" | "revenue" | "finance" | "reports";
  setActiveView: React.Dispatch<React.SetStateAction<"overview" | "planning" | "budget" | "market" | "revenue" | "finance" | "reports">>;
}
*/

// No runtime changes needed elsewhere; consumers call setActiveView("market") etc.
